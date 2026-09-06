// ── Content pack eksportas ───────────────────────────────────────────────────
// Kortos, frakcijos, retumai, tipai, raktažodžiai, ŽMK, starter kaladės → JSON
// (apps/digital/media/content/*.json + content-version.json). Naudojama:
//   • versijavimui/diff'ui (git'e matosi balanso pakeitimai),
//   • Node PvP serveriui (apps/server) – kortų pool'as be DB užklausų partijos metu,
//   • ateityje – pirmo paleidimo offline fallback'ui.
// Paleidimas (Windows, .env.local): node tools/export-content.mjs
import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) { console.error('Trūksta NEXT_PUBLIC_SUPABASE_URL / ANON_KEY'); process.exit(1) }
const sb = createClient(url, key)
const OUT = 'apps/digital/media/content'
mkdirSync(OUT, { recursive: true })

const CARD_SEL = `id, card_number, name, status, image_url, gold_cost, attack, health, effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay, faction_id, card_type_id, rarity_id, card_type:card_types ( id, name, icon_url ), rarity:rarities ( id, name, color_hex, copy_limit ), faction:factions ( id, name, slug, color_hex, icon_url ), card_keywords ( keyword:keywords ( id, name ) )`

async function all(table, sel = '*', order = null) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(sel).range(from, from + 999)
    if (order) q = q.order(order)
    const { data, error } = await q
    if (error) { console.error(table, error.message); process.exit(1) }
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

const pack = {
  cards: await all('cards', CARD_SEL, 'card_number'),
  factions: await all('factions', '*', 'sort_order'),
  rarities: await all('rarities'),
  card_types: await all('card_types'),
  keywords: await all('keywords'),
  zmk_cards: await all('zmk_cards', '*', 'sort_order'),
}
for (const [name, rows] of Object.entries(pack)) {
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(rows, null, 1))
  console.log(`✓ ${name}.json – ${rows.length}`)
}
const hash = createHash('sha256').update(JSON.stringify(pack)).digest('hex').slice(0, 12)
writeFileSync(`${OUT}/content-version.json`, JSON.stringify({ version: hash, generatedAt: new Date().toISOString(), counts: Object.fromEntries(Object.entries(pack).map(([k, v]) => [k, v.length])) }, null, 2))
console.log(`✓ content-version.json – ${hash}`)
