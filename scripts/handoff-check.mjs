#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  Profile/Progression handoff patikra (offline):
//   • ar public/ravenof-ui/ turi visus manifestuose nurodytus failus
//   • ar TS registrai atitinka CSV manifestus (50 rangų / 70 pasiekimų)
//   • ar kategorijų sumos = 8/10/12/10/10/10/6/4
//   • ar seed'as migracijoje turi visas 70 eilučių
//   • ar „pending" pasiekimai NETURI badge failo (draudžiama pakaitinė ikona)
//  Vykdymas: node scripts/handoff-check.mjs   (npm run handoff:check)
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
let errors = 0, warns = 0
const err = (m) => { errors++; console.log('  ✗', m) }
const warn = (m) => { warns++; console.log('  !', m) }
const ok = (m) => console.log('  ✓', m)
const exists = (p) => fs.existsSync(path.join(ROOT, p))

const ranksTs = fs.readFileSync(path.join(ROOT, 'src/lib/profile/ranks.ts'), 'utf8')
const achTs = fs.readFileSync(path.join(ROOT, 'src/lib/profile/achievements.ts'), 'utf8')

console.log('\n── Rangai ──')
const rankRows = [...ranksTs.matchAll(/\{ order: (\d+), rank: (\d+), nameLt: '([^']*)', badgeFile: '([^']+)' \}/g)]
if (rankRows.length !== 50) err(`registre ${rankRows.length} rangų, laukta 50`); else ok('50 rangų registre')
let missBadge = 0
for (const [, order, rank, , file] of rankRows) {
  if (!exists(`public/ravenof-ui/ranks/badges/${file}`)) { err(`trūksta rango ženklo: ${file} (rangas ${rank})`); missBadge++ }
  void order
}
if (!missBadge) ok('visi 50 rango ženklų yra public/ravenof-ui/ranks/badges/')
for (const tier of ['bronze', 'silver', 'gold']) {
  if (!exists(`public/ravenof-ui/ranks/frames/${tier}-frame.webp`)) err(`trūksta pakopos rėmo: ${tier}-frame.webp`)
}
if (['bronze','silver','gold'].every((t) => exists(`public/ravenof-ui/ranks/frames/${t}-frame.webp`))) ok('3 pakopų rėmai yra')
const orders = rankRows.map((r) => +r[1])
const rankNums = rankRows.map((r) => +r[2])
if (orders.join() !== [...orders].sort((a, b) => a - b).join()) err('progresijos eilė ne iš eilės')
if (rankNums[0] !== 50 || rankNums[rankNums.length - 1] !== 1) err('progresija turi eiti 50 → 1')
else ok('progresija 50 (įėjimas) → 1 (aukščiausias)')

console.log('\n── Pasiekimai ──')
const achRows = [...achTs.matchAll(/\{ id: (\d+), code: '([^']+)', category: '([^']+)', nameLt: '([^']*)', requirementLt: '([^']*)', badgeFile: (null|'[^']+'), status: '([^']+)' \}/g)]
  .map((m) => ({ id: +m[1], code: m[2], cat: m[3], name: m[4], req: m[5], file: m[6] === 'null' ? null : m[6].slice(1, -1), status: m[7] }))
if (achRows.length !== 70) err(`registre ${achRows.length} pasiekimų, laukta 70`); else ok('70 pasiekimų registre')

const EXPECT = { start: 8, combat: 10, tactics: 12, decks: 10, collection: 10, ranked: 10, daily: 6, community: 4 }
const got = {}
for (const r of achRows) got[r.cat] = (got[r.cat] ?? 0) + 1
let catBad = 0
for (const [k, v] of Object.entries(EXPECT)) if (got[k] !== v) { err(`kategorija ${k}: ${got[k] ?? 0}, laukta ${v}`); catBad++ }
if (!catBad) ok('kategorijų sumos 8/10/12/10/10/10/6/4')

let missAch = 0, badPending = 0
for (const r of achRows) {
  if (r.status === 'generated') {
    if (!r.file) { err(`${r.code}: status=generated, bet nėra badge failo`); missAch++ }
    else if (!exists(`public/ravenof-ui/achievements/${r.file}`)) { err(`trūksta pasiekimo ženklo: ${r.file} (${r.code})`); missAch++ }
    if (!r.req) err(`${r.code}: tuščia sąlyga (requirementLt)`)
  } else if (r.file) { err(`${r.code}: status=pending, bet priskirtas badge failas (draudžiama pakaitinė ikona)`); badPending++ }
}
if (!missAch) ok(`visi ${achRows.filter((r) => r.status === 'generated').length} generated ženklai yra public/ravenof-ui/achievements/`)
if (!badPending) {
  const pend = achRows.filter((r) => r.status === 'pending')
  if (pend.length) warn(`${pend.length} pasiekimų badge'ai dar negeneruoti (art blocker): ${pend.map((r) => r.id).join(', ')}`)
}

console.log('\n── DB seed'.replace("'", '') + ' ──')
const seedPath = 'supabase/migrations/20260851_achievements_v2.sql'
if (!exists(seedPath)) err(`nėra migracijos ${seedPath}`)
else {
  const sql = fs.readFileSync(path.join(ROOT, seedPath), 'utf8')
  const seedRows = (sql.match(/\(\s*'ach_\d\d'/g) ?? []).length
  if (seedRows !== 70) err(`migracijos seed'e ${seedRows} eilučių, laukta 70`); else ok('migracijos seed: 70 pasiekimų')
  for (const r of achRows.slice(0, 5)) if (!sql.includes(`'${r.code}'`)) err(`seed'e nėra ${r.code}`)
}

console.log(`\n──────────────\n  KLAIDOS: ${errors} · ĮSPĖJIMAI: ${warns}\n──────────────`)
process.exit(errors ? 1 : 0)
