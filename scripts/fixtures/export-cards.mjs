// ── Eksportuoja VISAS kortas iš Supabase į fixtures/cards.json ───────────────
// Paleidimas (Windows, kur yra .env.local ir tinklas): npm run fixtures:export-cards
// Tas pats SELECT kaip scenarioCards.SEL + card_number/status filtravimui.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) { console.error('Trūksta NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (.env.local)'); process.exit(1) }

const SEL = `id, name, card_number, status, image_url, gold_cost, attack, health, effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay, card_type:card_types ( name ), rarity:rarities ( name, color_hex ), faction:factions ( id, name, color_hex ), card_keywords ( keyword:keywords ( name ) )`
const sb = createClient(url, key)
const all = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('cards').select(SEL).order('card_number').range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  all.push(...(data ?? []))
  if (!data || data.length < 1000) break
}
mkdirSync('fixtures', { recursive: true })
writeFileSync('fixtures/cards.json', JSON.stringify(all, null, 1))
console.log(`✓ fixtures/cards.json – ${all.length} kortų`)
