// ════════════════════════════════════════════════════════════════════════════
//  Ravenof — esamų Storage paveikslų konvertavimas į WebP + ilgas cache
//  Sumažina Supabase „Cached Egress" (x3 PNG ~2–4 MB → WebP ~120–180 KB).
//
//  Ką daro: pereina DB lentelių image_url stulpelius (cards, card_packs), kurie
//  rodo į `card-images` bucket'ą, parsisiunčia originalą, sharp → WebP (≤900 px,
//  q82), įkelia NAUJU vardu su cacheControl=1 metai, atnaujina image_url.
//  Senų failų netrina (galima rankiniu būdu vėliau). Idempotentiška: praleidžia
//  jau .webp ir pakankamai mažus.
//
//  Naudojimas (Windows cmd, ravenof-portal kataloge):
//    npm i -D sharp                              (vienkartinis)
//    set SUPABASE_URL=https://xxxx.supabase.co
//    set SUPABASE_SERVICE_ROLE_KEY=eyJ...        (Service role, NE anon!)
//    node tools/optimize-media.mjs               (DRY-RUN — tik ataskaita)
//    node tools/optimize-media.mjs --fix         (realiai konvertuoja + įrašo)
//
//  Flag'ai: --fix (vykdyti), --limit=N (tik pirmi N), --table=cards
//  SAUGU: be --fix nieko nekeičia. Service key naudojamas TIK lokaliai (tu paleidi).
// ════════════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('❌ Trūksta SUPABASE_URL arba SUPABASE_SERVICE_ROLE_KEY (env).')
  process.exit(1)
}

const FIX = process.argv.includes('--fix')
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1]) || Infinity
const ONLY_TABLE = (process.argv.find((a) => a.startsWith('--table=')) || '').split('=')[1] || null

const BUCKET = 'card-images'
const MAX_W = 900
const QUALITY = 82
const OBJ = `/storage/v1/object/public/${BUCKET}/`

const TARGETS = [
  { table: 'cards', col: 'image_url', id: 'id' },
  { table: 'card_packs', col: 'image_url', id: 'id' },
].filter((t) => !ONLY_TABLE || t.table === ONLY_TABLE)

let sharp
try { sharp = (await import('sharp')).default } catch {
  console.error('❌ Trūksta „sharp". Paleisk: npm i -D sharp'); process.exit(1)
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } })
const fmt = (b) => (b / 1024).toFixed(0) + ' KB'

let totalOld = 0, totalNew = 0, converted = 0, skipped = 0, failed = 0

for (const t of TARGETS) {
  const { data: rows, error } = await sb.from(t.table).select(`${t.id}, ${t.col}`)
  if (error) { console.error(`⚠️  ${t.table}: ${error.message}`); continue }
  console.log(`\n── ${t.table} (${rows.length} įrašų) ──`)
  let n = 0
  for (const row of rows) {
    if (n >= LIMIT) break
    const url = row[t.col]
    if (!url || typeof url !== 'string') { continue }
    const i = url.indexOf(OBJ)
    if (i < 0) { continue }                 // ne šio bucket'o
    const path = url.slice(i + OBJ.length).split('?')[0]
    if (path.toLowerCase().endsWith('.webp')) { skipped++; continue }  // jau webp

    n++
    try {
      const { data: blob, error: dErr } = await sb.storage.from(BUCKET).download(path)
      if (dErr || !blob) { console.log(`  ⚠️  ${path}: nepavyko parsiųsti`); failed++; continue }
      const inBuf = Buffer.from(await blob.arrayBuffer())
      const out = await sharp(inBuf).resize({ width: MAX_W, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer()
      totalOld += inBuf.length; totalNew += out.length
      const pct = Math.round((1 - out.length / inBuf.length) * 100)
      const newPath = path.replace(/\.[^./]+$/, '') + '.webp'
      console.log(`  ${pct >= 0 ? '↓' : '↑'} ${path}  ${fmt(inBuf.length)} → ${fmt(out.length)} (${pct}%)`)

      if (FIX) {
        const { error: uErr } = await sb.storage.from(BUCKET).upload(newPath, out, { upsert: true, contentType: 'image/webp', cacheControl: '31536000' })
        if (uErr) { console.log(`     ⚠️ upload: ${uErr.message}`); failed++; continue }
        const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(newPath)
        const { error: updErr } = await sb.from(t.table).update({ [t.col]: pub.publicUrl }).eq(t.id, row[t.id])
        if (updErr) { console.log(`     ⚠️ DB update: ${updErr.message}`); failed++; continue }
      }
      converted++
    } catch (e) { console.log(`  ⚠️  ${path}: ${e.message}`); failed++ }
  }
}

console.log('\n════════════════ SANTRAUKA ════════════════')
console.log(`Mode:        ${FIX ? 'FIX (įrašyta)' : 'DRY-RUN (nieko nekeista)'}`)
console.log(`Konvertuota: ${converted}   Praleista(webp): ${skipped}   Klaidos: ${failed}`)
console.log(`Dydis:       ${fmt(totalOld)} → ${fmt(totalNew)}  (sutaupyta ${totalOld ? Math.round((1 - totalNew / totalOld) * 100) : 0}%)`)
if (!FIX && converted) console.log('\n👉 Jei tinka — paleisk dar kartą su  --fix')
