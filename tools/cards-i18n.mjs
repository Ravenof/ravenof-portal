#!/usr/bin/env node
/**
 * ── Ravenof kortų vertimų įrankis (Fazė 6) ─────────────────────────────────
 *
 * EKSPORTAS (LT tekstai → CSV/JSON vertimui):
 *   node tools/cards-i18n.mjs export --locale en --out tools/cards-en.csv
 *   node tools/cards-i18n.mjs export --locale en --format json --only-missing
 *
 * IMPORTAS (užpildytas failas → card_translations):
 *   node tools/cards-i18n.mjs import --locale en --in tools/cards-en.csv
 *   node tools/cards-i18n.mjs import --locale en --in ... --status draft --dry
 *
 * VAIZDAI (EN kortų PNG → card_assets):
 *   node tools/cards-i18n.mjs images --locale en --in tools/cards-en-images.csv
 *   (CSV stulpeliai: card_id,url  arba  card_number,url)
 *
 * BŪSENA:
 *   node tools/cards-i18n.mjs status --locale en
 *
 * Rašymui reikia SUPABASE_SERVICE_ROLE_KEY (.env.local). Skaitymui užtenka anon.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envLocal = (name) => {
  try {
    const m = readFileSync(resolve(root, '.env.local'), 'utf8').match(new RegExp('^' + name + '=(.*)$', 'm'))
    return m ? m[1].trim() : null
  } catch { return null }
}
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || envLocal('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || envLocal('SUPABASE_SERVICE_ROLE_KEY')
const ANON = envLocal('NEXT_PUBLIC_SUPABASE_ANON_KEY') || envLocal('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
const badService = SERVICE && (SERVICE.startsWith('sb_publishable_') || SERVICE === ANON)
const KEY = (!SERVICE || badService) ? ANON : SERVICE
const CAN_WRITE = !!SERVICE && !badService
if (!URL_BASE || !KEY) { console.error('KLAIDA: trūksta NEXT_PUBLIC_SUPABASE_URL / raktų (.env.local).'); process.exit(1) }
const db = createClient(URL_BASE, KEY, { auth: { persistSession: false } })

// ── argumentai ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const cmd = argv[0]
const arg = (name, def = null) => {
  const i = argv.indexOf('--' + name)
  return i === -1 ? def : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true)
}
const LOCALE = String(arg('locale', 'en'))
const DRY = argv.includes('--dry')
const ONLY_MISSING = argv.includes('--only-missing')
const FIELDS = ['name', 'description', 'effect_text', 'flavor_text']

// ── CSV (RFC4180: kabutės, kableliai, nauji eilučių simboliai) ──────────────
const csvCell = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
const toCsv = (rows, cols) =>
  [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n'

function parseCsv(text) {
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (ch !== '\r') cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  const head = rows.shift() ?? []
  return rows.filter((r) => r.some((c) => c !== '')).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])))
}

async function fetchAll(table, select, filter) {
  const out = []
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select(select).range(from, from + 999)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if ((data?.length ?? 0) < 1000) break
  }
  return out
}

// ── komandos ────────────────────────────────────────────────────────────────
async function cmdExport() {
  const cards = await fetchAll('cards', 'id, card_number, name, description, effect_text, status')
  const tr = await fetchAll('card_translations', 'card_id, name, description, effect_text, flavor_text', (q) => q.eq('locale', LOCALE))
  const byId = new Map(tr.map((t) => [t.card_id, t]))

  let rows = cards
    .filter((c) => c.status !== 'archived')
    .map((c) => {
      const t = byId.get(c.id) ?? {}
      return {
        card_id: c.id, card_number: c.card_number ?? '',
        name_lt: c.name ?? '', description_lt: c.description ?? '', effect_text_lt: c.effect_text ?? '',
        name: t.name ?? '', description: t.description ?? '', effect_text: t.effect_text ?? '', flavor_text: t.flavor_text ?? '',
      }
    })
  if (ONLY_MISSING) rows = rows.filter((r) => !r.name || !r.effect_text)

  const format = String(arg('format', 'csv'))
  const cols = ['card_id', 'card_number', 'name_lt', 'description_lt', 'effect_text_lt', 'name', 'description', 'effect_text', 'flavor_text']
  const out = String(arg('out', `tools/cards-${LOCALE}.${format === 'json' ? 'json' : 'csv'}`))
  const body = format === 'json' ? JSON.stringify(rows, null, 2) + '\n' : toCsv(rows, cols)
  writeFileSync(resolve(root, out), body, 'utf8')
  console.log(`Eksportuota ${rows.length} kortų → ${out}`)
  console.log(`Užpildyk stulpelius: name, description, effect_text, flavor_text (${LOCALE}). Tada: node tools/cards-i18n.mjs import --locale ${LOCALE} --in ${out}`)
}

async function cmdImport() {
  const file = String(arg('in', `tools/cards-${LOCALE}.csv`))
  const raw = readFileSync(resolve(root, file), 'utf8')
  const rows = file.endsWith('.json') ? JSON.parse(raw) : parseCsv(raw)
  const status = String(arg('status', 'approved'))
  if (!['draft', 'review', 'approved'].includes(status)) { console.error('--status turi būti draft|review|approved'); process.exit(1) }

  const payload = []
  const problems = []
  for (const r of rows) {
    if (!r.card_id) { problems.push(`praleista (nėra card_id): ${r.card_number ?? '?'}`); continue }
    const has = FIELDS.some((f) => (r[f] ?? '').trim() !== '')
    if (!has) continue                                  // neišverstos eilutės praleidžiam
    // sveiko proto patikros
    if ((r.name ?? '').length > 120) problems.push(`per ilgas name: ${r.card_number || r.card_id}`)
    if (/[ąčęėįšųūž]/i.test(r.name ?? '') && LOCALE === 'en') problems.push(`ĮTARTINA: EN name su LT raidėmis – ${r.card_number || r.card_id}: „${r.name}"`)
    payload.push({
      card_id: r.card_id, locale: LOCALE, status,
      name: (r.name ?? '').trim() || null,
      description: (r.description ?? '').trim() || null,
      effect_text: (r.effect_text ?? '').trim() || null,
      flavor_text: (r.flavor_text ?? '').trim() || null,
    })
  }
  problems.forEach((p) => console.warn('⚠', p))
  console.log(`Importui paruošta: ${payload.length} eilutės (locale=${LOCALE}, status=${status})`)
  if (DRY) { console.log('--dry: nieko nerašau.'); return }
  if (!CAN_WRITE) { console.error('KLAIDA: rašymui reikia SUPABASE_SERVICE_ROLE_KEY (.env.local).'); process.exit(1) }

  for (let i = 0; i < payload.length; i += 200) {
    const chunk = payload.slice(i, i + 200)
    const { error } = await db.from('card_translations').upsert(chunk, { onConflict: 'card_id,locale' })
    if (error) { console.error('KLAIDA rašant:', error.message); process.exit(1) }
    console.log(`  įrašyta ${Math.min(i + 200, payload.length)}/${payload.length}`)
  }
  console.log('✓ Importas baigtas.')
}

async function cmdImages() {
  const file = String(arg('in', `tools/cards-${LOCALE}-images.csv`))
  const rows = parseCsv(readFileSync(resolve(root, file), 'utf8'))
  const cards = await fetchAll('cards', 'id, card_number')
  const byNumber = new Map(cards.map((c) => [String(c.card_number), c.id]))

  const payload = []
  for (const r of rows) {
    const id = r.card_id || byNumber.get(String(r.card_number))
    if (!id || !r.url) continue
    payload.push({ card_id: id, locale: LOCALE, asset_type: 'image', url: r.url.trim() })
  }
  console.log(`Vaizdų įrašų: ${payload.length}`)
  if (DRY) { console.log('--dry: nieko nerašau.'); return }
  if (!CAN_WRITE) { console.error('KLAIDA: rašymui reikia SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1) }
  for (let i = 0; i < payload.length; i += 200) {
    const { error } = await db.from('card_assets').upsert(payload.slice(i, i + 200), { onConflict: 'card_id,locale,asset_type' })
    if (error) { console.error('KLAIDA:', error.message); process.exit(1) }
  }
  console.log('✓ Vaizdai įrašyti.')
}

async function cmdStatus() {
  const cards = await fetchAll('cards', 'id, status')
  const active = cards.filter((c) => c.status !== 'archived')
  const tr = await fetchAll('card_translations', 'card_id, name, effect_text, status', (q) => q.eq('locale', LOCALE))
  const as = await fetchAll('card_assets', 'card_id', (q) => q.eq('locale', LOCALE).eq('asset_type', 'image'))
  const full = tr.filter((t) => t.name && t.effect_text)
  const approved = full.filter((t) => t.status === 'approved')
  const pct = (n) => active.length ? Math.round((n / active.length) * 100) : 0
  console.log(`Kortos (aktyvios):        ${active.length}`)
  console.log(`Vertimai (${LOCALE}) yra:       ${tr.length} (${pct(tr.length)}%)`)
  console.log(`  pilni (name+effect):    ${full.length} (${pct(full.length)}%)`)
  console.log(`  approved:               ${approved.length} (${pct(approved.length)}%)`)
  console.log(`Lokalizuoti vaizdai:      ${as.length} (${pct(as.length)}%)`)
}

const CMDS = { export: cmdExport, import: cmdImport, images: cmdImages, status: cmdStatus }
if (!CMDS[cmd]) {
  console.log('Naudojimas: node tools/cards-i18n.mjs <export|import|images|status> [--locale en] [--in|--out file] [--format csv|json] [--only-missing] [--status draft|review|approved] [--dry]')
  process.exit(cmd ? 1 : 0)
}
CMDS[cmd]().catch((e) => { console.error('KLAIDA:', e.message); process.exit(1) })
