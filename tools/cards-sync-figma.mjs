#!/usr/bin/env node
/**
 * ── Figma kortų PNG → žaidimas ─────────────────────────────────────────────────
 * Ima store-media/cards-figma-export/ (manifest.json + lt/NNN.png + en/NNN.png, kuriuos
 * sukūrė tools/figma-cards-plugin + tools/figma-card-sink.mjs) ir:
 *   • suporuoja kiekvieną Figma kortą su DB korta (cards):
 *       1) card_number == "<frakcija>/<Figma rėmelio vardas>" (kai rėmelio vardas unikalus)
 *       2) pagal LT vardą (čempionų fazės – pagal champion_phase)
 *   • --apply: PNG → WebP, įkelia į Storage card-images/cards/v2/<id>-<lt|en>.webp,
 *     atnaujina cards.image_url (LT) ir card_assets (EN, asset_type=image).
 * Be --apply – tik ataskaita (store-media/cards-figma-export/report.csv).
 *   node tools/cards-sync-figma.mjs            # peržiūra
 *   node tools/cards-sync-figma.mjs --apply    # įkelti
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = resolve(root, 'store-media/cards-figma-export')
const env = (n) => { try { const m = readFileSync(resolve(root, '.env.local'), 'utf8').match(new RegExp('^' + n + '=(.*)$', 'm')); return m ? m[1].trim() : null } catch { return null } }
const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || env('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || env('SUPABASE_SERVICE_ROLE_KEY')
const APPLY = process.argv.includes('--apply')
if (!URL_BASE || !SERVICE) { console.error('KLAIDA: .env.local reikia NEXT_PUBLIC_SUPABASE_URL ir SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
if (!existsSync(resolve(DIR, 'manifest.json'))) { console.error('KLAIDA: nėra ' + DIR + '\\manifest.json – pirma eksportuok iš Figma plugin\'o'); process.exit(1) }
const db = createClient(URL_BASE, SERVICE, { auth: { persistSession: false } })
const manifest = JSON.parse(readFileSync(resolve(DIR, 'manifest.json'), 'utf8'))

const norm = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim()

const cards = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('cards').select('id,name,card_number,champion_phase,image_url').range(from, from + 999)
  if (error) throw error
  cards.push(...data); if (data.length < 1000) break
}
const byNumber = new Map(cards.map((c) => [c.card_number, c]))
const used = new Set()
const frameCount = {}
for (const e of manifest.cards) { const k = e.faction + '/' + e.frame; frameCount[k] = (frameCount[k] || 0) + 1 }

const rows = []
for (const e of manifest.cards) {
  let hit = null, how = ''
  const key = e.faction + '/' + e.frame
  if (frameCount[key] === 1 && byNumber.has(key) && !used.has(byNumber.get(key).id)) { hit = byNumber.get(key); how = 'card_number' }
  if (!hit) {
    let cand = cards.filter((c) => !used.has(c.id) && norm(c.name) === norm(e.lt.name))
    const ph = /CHAMPIOIN_Phase_(\d)/.exec(e.frame)
    if (ph && cand.length > 1) cand = cand.filter((c) => String(c.champion_phase) === ph[1])
    if (cand.length > 1) { const pref = cand.filter((c) => String(c.card_number || '').startsWith(e.faction + '/')); if (pref.length) cand = pref }
    if (cand.length >= 1) { hit = cand.sort((a, b) => String(a.card_number).localeCompare(String(b.card_number), 'lt', { numeric: true }))[0]; how = cand.length > 1 ? 'vardas (keli – paimtas pirmas)' : 'vardas' }
  }
  if (hit) used.add(hit.id)
  rows.push({ n: e.n, faction: e.faction, frame: e.frame, figma_lt: e.lt.name, figma_en: e.en?.name ?? '', db_id: hit?.id ?? '', db_name: hit?.name ?? '', db_number: hit?.card_number ?? '', match: hit ? how : 'NERASTA', e })
}
const cell = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
const cols = ['n', 'faction', 'frame', 'figma_lt', 'figma_en', 'db_name', 'db_number', 'match']
writeFileSync(resolve(DIR, 'report.csv'), '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n'))
const notInFigma = cards.filter((c) => !used.has(c.id) && !/^(TUT-|BASE-)/.test(String(c.card_number)))
writeFileSync(resolve(DIR, 'db-not-in-figma.csv'), '﻿' + ['name,card_number', ...notInFigma.map((c) => cell(c.name) + ',' + cell(c.card_number))].join('\n'))
const miss = rows.filter((r) => !r.db_id), amb = rows.filter((r) => r.match.startsWith('vardas (keli'))
console.log(`Figma kortų: ${rows.length} | suporuota: ${rows.length - miss.length} | nerasta DB: ${miss.length} | dviprasmiškos: ${amb.length} | DB kortų be Figma: ${notInFigma.length}`)
for (const r of miss.slice(0, 40)) console.log('  NERASTA', r.n, r.faction, r.frame, '|', r.figma_lt)
for (const r of amb.slice(0, 20)) console.log('  KELIOS', r.n, r.figma_lt, '→', r.db_number)
console.log('Ataskaita:', resolve(DIR, 'report.csv'), '| DB be Figma:', resolve(DIR, 'db-not-in-figma.csv'))
if (!APPLY) { console.log('\nTai buvo peržiūra. Įkelti: node tools/cards-sync-figma.mjs --apply'); process.exit(0) }

const V = Date.now().toString(36)
let ok = 0, fail = 0
for (const r of rows.filter((x) => x.db_id)) {
  for (const lang of ['lt', 'en']) {
    const f = r.e[lang]?.file; if (!f || !existsSync(resolve(DIR, f))) continue
    try {
      const webp = await sharp(resolve(DIR, f)).webp({ quality: 88 }).toBuffer()
      const path = `cards/v2/${r.db_id}-${lang}.webp`
      const up = await db.storage.from('card-images').upload(path, webp, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' })
      if (up.error) throw up.error
      const url = `${URL_BASE}/storage/v1/object/public/card-images/${path}?v=${V}`
      if (lang === 'lt') { const { error } = await db.from('cards').update({ image_url: url }).eq('id', r.db_id); if (error) throw error }
      else { const { error } = await db.from('card_assets').upsert({ card_id: r.db_id, locale: 'en', asset_type: 'image', url, updated_at: new Date().toISOString() }, { onConflict: 'card_id,locale,asset_type' }); if (error) throw error }
      ok++
    } catch (err) { fail++; console.error('  KLAIDA', r.n, lang, r.figma_lt, err.message || err) }
  }
  if ((ok + fail) % 50 === 0) console.log('  įkelta', ok, 'klaidų', fail)
}
console.log(`Baigta: įkelta ${ok} vaizdų, klaidų ${fail}.`)
