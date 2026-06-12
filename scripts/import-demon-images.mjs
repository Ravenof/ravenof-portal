// Ravenof – demonų kortų paveikslėlių importas
// Paleidimas: import-demon-images.bat (arba: node scripts/import-demon-images.mjs)
// Prisijungia kaip admin (RLS), įkelia WebP į card-images bucket ir atnaujina cards.image_url.
// CURSE kortos: jei DB nėra kortos tokiu pavadinimu – sukuria naują (active).

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import readline from 'node:readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const IMG_DIR = join(ROOT, 'card-images-import')

// --- .env.local ---
const env = {}
for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL || !KEY) { console.error('Nerasti Supabase raktai .env.local'); process.exit(1) }

// --- klausimai ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise(r => rl.question(q, r))

const supabase = createClient(URL, KEY)

const email = await ask('Admin el. paštas: ')
const password = await ask('Slaptažodis: ')

const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
if (authErr) { console.error('Prisijungti nepavyko:', authErr.message); process.exit(1) }
console.log('Prisijungta kaip', auth.user.email)

// --- pagalbinės lentelės ---
const { data: factions } = await supabase.from('factions').select('id,slug')
const demonFaction = factions.find(f => f.slug === 'demonu-orda')
const { data: types } = await supabase.from('card_types').select('id,name')
const curseType = types.find(t => t.name === 'Prakeiksmas')

// --- failai ---
const files = readdirSync(IMG_DIR).filter(f => f.endsWith('.webp')).sort()
const deFiles = files.filter(f => f.startsWith('DE-'))
const curseFiles = files.filter(f => f.startsWith('CURSE-'))
const curseMeta = JSON.parse(readFileSync(join(__dirname, 'curse-cards.json'), 'utf8'))

// --- esamos kortos ---
const { data: cards, error: cardsErr } = await supabase
  .from('cards').select('id,card_number,name,image_url')
if (cardsErr) { console.error('Nepavyko gauti kortų:', cardsErr.message); process.exit(1) }
const byNumber = new Map(cards.filter(c => c.card_number).map(c => [c.card_number, c]))
const byName = new Map(cards.map(c => [c.name.toLowerCase().replace(/\s+/g, ' ').trim(), c]))

// --- planas ---
const plan = []
for (const f of deFiles) {
  const num = f.replace('.webp', '')
  const card = byNumber.get(num)
  plan.push(card
    ? { action: 'update', file: f, card }
    : { action: 'SKIP (nerasta DB)', file: f })
}
for (const f of curseFiles) {
  const meta = curseMeta.find(m => m.file === f)
  if (!meta) { plan.push({ action: 'SKIP (nėra meta)', file: f }); continue }
  const existing = byName.get(meta.name.toLowerCase())
  plan.push(existing
    ? { action: 'update', file: f, card: existing }
    : { action: 'create', file: f, meta })
}

console.log('\n--- PLANAS ---')
for (const p of plan) {
  const target = p.card ? `${p.card.card_number ?? ''} ${p.card.name}` : (p.meta ? `NAUJA: ${p.meta.name}` : '')
  console.log(`${p.action.padEnd(18)} ${p.file}  ->  ${target}`)
}
const updates = plan.filter(p => p.action === 'update').length
const creates = plan.filter(p => p.action === 'create').length
const skips = plan.length - updates - creates
console.log(`\nAtnaujinimai: ${updates}, naujos kortos: ${creates}, praleista: ${skips}`)

const ok = await ask('\nTęsti? (y/n): ')
rl.close()
if (ok.trim().toLowerCase() !== 'y') { console.log('Atšaukta.'); process.exit(0) }

// --- vykdymas ---
async function uploadImage(folder, file) {
  const buf = readFileSync(join(IMG_DIR, file))
  const path = `cards/${folder}/${Date.now()}-${file.toLowerCase()}`
  const { error } = await supabase.storage.from('card-images')
    .upload(path, buf, { contentType: 'image/webp' })
  if (error) throw new Error(`upload ${file}: ${error.message}`)
  return supabase.storage.from('card-images').getPublicUrl(path).data.publicUrl
}

let done = 0, failed = 0
// rasti laisvą CU-xxx numerį
let cuN = 0
for (const c of cards) {
  const m = c.card_number?.match(/^CU-(\d+)$/)
  if (m) cuN = Math.max(cuN, parseInt(m[1]))
}

for (const p of plan) {
  try {
    if (p.action === 'update') {
      const folder = p.card.card_number ?? p.card.id
      const url = await uploadImage(folder, p.file)
      const { error } = await supabase.from('cards')
        .update({ image_url: url }).eq('id', p.card.id)
      if (error) throw new Error(error.message)
      console.log('OK atnaujinta:', p.card.name)
    } else if (p.action === 'create') {
      cuN += 1
      const number = `CU-${String(cuN).padStart(3, '0')}`
      const url = await uploadImage(number, p.file)
      const { error } = await supabase.from('cards').insert({
        card_number: number,
        name: p.meta.name,
        faction_id: demonFaction?.id ?? null,
        card_type_id: curseType?.id ?? null,
        rarity_id: null,
        gold_cost: null,
        effect_text: p.meta.effect_text,
        image_url: url,
        status: 'active',
      })
      if (error) throw new Error(error.message)
      console.log('OK sukurta:', number, p.meta.name)
    } else { continue }
    done += 1
  } catch (e) {
    failed += 1
    console.error('KLAIDA', p.file, '-', e.message)
  }
}
console.log(`\nBaigta. Pavyko: ${done}, klaidų: ${failed}.`)
