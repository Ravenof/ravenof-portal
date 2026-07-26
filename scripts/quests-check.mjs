#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  Dienos užduočių banko patikra (offline, be DB):
//   • ar visi šablonų i18n raktai egzistuoja LT ir EN (su daugiskaitos formomis)
//   • ar kiekvienas objective_type turi progreso apdorojimą SQL'e
//   • ar bankas subalansuotas (easy/medium/hard) ir be dublikatų
//  Vykdymas: node scripts/quests-check.mjs   (npm run quests:check)
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const MIGR_DIR = path.join(ROOT, 'supabase', 'migrations')
const POOL = path.join(MIGR_DIR, '20260848_daily_quests_pool50.sql')

let errors = 0, warnings = 0
const err = (m) => { errors++; console.log('  ✗', m) }
const warn = (m) => { warnings++; console.log('  !', m) }
const ok = (m) => console.log('  ✓', m)

const sql = fs.readFileSync(POOL, 'utf8')

// ── šablonų eilutės iš INSERT bloko ──
const rowRe = /\('([a-z0-9_]+)',\s*'(easy|medium|hard)','([a-z_]+)',\s*(\d+),\s*(null|'[a-z]+'),\s*(true|false),\s*(true|false),\s*(true|false),\s*'([a-z_]+)',\s*(\d+),\s*'([^']+)','([^']+)'\)/g
const rows = [...sql.matchAll(rowRe)].map((m) => ({
  code: m[1], difficulty: m[2], objective: m[3], target: +m[4],
  mode: m[5] === 'null' ? null : m[5].replace(/'/g, ''),
  conflict: m[9], weight: +m[10], titleKey: m[11], descKey: m[12],
}))

console.log(`\n── Šablonai (${POOL.split(path.sep).pop()}) ──`)
if (rows.length !== 50) err(`rasta ${rows.length} šablonų, laukta 50`)
else ok('50 šablonų')

const byDiff = rows.reduce((a, r) => (a[r.difficulty] = (a[r.difficulty] ?? 0) + 1, a), {})
console.log(`  · pasiskirstymas: easy=${byDiff.easy ?? 0} medium=${byDiff.medium ?? 0} hard=${byDiff.hard ?? 0}`)
for (const d of ['easy', 'medium', 'hard']) if (!byDiff[d]) err(`nėra nė vieno ${d} šablono`)

const dup = rows.map((r) => r.code).filter((c, i, a) => a.indexOf(c) !== i)
if (dup.length) err(`dubliuoti kodai: ${[...new Set(dup)].join(', ')}`); else ok('kodai unikalūs')

for (const r of rows) {
  if (r.target <= 0) err(`${r.code}: target_value turi būti > 0`)
  if (r.weight <= 0) err(`${r.code}: weight turi būti > 0`)
}

// ── i18n raktai ──
const load = (loc, ns) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'locales', loc, `${ns}.json`), 'utf8'))
const dig = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
const locales = { lt: load('lt', 'quests'), en: load('en', 'quests') }

const resolveKey = (locObj, key) => {
  // 'quests.v2.playMatch.desc' → be 'quests.' prefikso (namespace = failas)
  const rel = key.replace(/^quests\./, '')
  const direct = dig(locObj, rel)
  if (typeof direct === 'string') return true
  // daugiskaitos formos: *_one / *_other (LT dar few/many)
  const parent = rel.split('.').slice(0, -1).join('.')
  const leaf = rel.split('.').slice(-1)[0]
  const node = dig(locObj, parent)
  if (node && typeof node === 'object') {
    const hasOne = typeof node[`${leaf}_one`] === 'string'
    const hasOther = typeof node[`${leaf}_other`] === 'string'
    return hasOne && hasOther
  }
  return false
}

console.log('\n── i18n raktai (LT + EN) ──')
let missing = 0
for (const r of rows) {
  for (const key of [r.titleKey, r.descKey]) {
    for (const [loc, obj] of Object.entries(locales)) {
      if (!resolveKey(obj, key)) { err(`${loc}: trūksta rakto ${key} (${r.code})`); missing++ }
    }
  }
}
if (!missing) ok(`visi ${rows.length * 2} raktai rasti abiejose kalbose`)

// LT daugiskaitos pilnumas (one/few/other)
for (const r of rows) {
  const rel = r.descKey.replace(/^quests\./, '')
  const parent = rel.split('.').slice(0, -1).join('.')
  const leaf = rel.split('.').slice(-1)[0]
  const node = dig(locales.lt, parent)
  if (node && typeof node === 'object' && typeof node[leaf] !== 'string') {
    for (const suf of ['_one', '_few', '_other']) {
      if (typeof node[`${leaf}${suf}`] !== 'string') warn(`LT ${r.descKey}${suf} nėra (daugiskaita gali skambėti negrabiai)`)
    }
  }
}

// ── objective_type padengimas SQL'e ──
console.log('\n── Progreso padengimas ──')
const allSql = fs.readdirSync(MIGR_DIR).filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(MIGR_DIR, f), 'utf8')).join('\n')
const handled = new Set([...allSql.matchAll(/rvn__quests_(?:set_)?progress\(\s*[A-Za-z_.]+,\s*'([a-z_]+)'/g)].map((m) => m[1]))
const objectives = [...new Set(rows.map((r) => r.objective))]
let uncovered = 0
for (const o of objectives) {
  if (!handled.has(o)) { err(`objective_type '${o}' niekur neapdorojamas (nėra rvn__quests_progress kvietimo)`); uncovered++ }
}
if (!uncovered) ok(`visi ${objectives.length} tipai turi progreso kvietimą`)

// ── kliento telemetrija atitinka SQL laukus ──
console.log('\n── Kliento telemetrija ──')
const statsTs = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'game', 'matchStats.ts'), 'utf8')
const sqlFields = [...new Set([...sql.matchAll(/p_stats->>'([A-Za-z]+)'/g)].map((m) => m[1]))]
let missField = 0
for (const f of sqlFields) {
  if (!new RegExp(`\\b${f}\\b`).test(statsTs)) { err(`matchStats.ts neskaičiuoja lauko '${f}', kurio laukia SQL`); missField++ }
}
if (!missField) ok(`visi ${sqlFields.length} p_stats laukai skaičiuojami kliente`)

console.log(`\n──────────────\n  KLAIDOS: ${errors} · ĮSPĖJIMAI: ${warnings}\n──────────────`)
process.exit(errors ? 1 : 0)
