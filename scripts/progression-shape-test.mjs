#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  Regresija 2026-07-25: „Application error: a client-side exception".
//  Kai DB grąžina SENOS formos atsakymą (masyvą iš `returns setof`), UI
//  nulūždavo. Šie testai fiksuoja, kad tokia forma virsta klaida, o ne griūtimi.
//  Vykdymas: node --experimental-strip-types scripts/progression-shape-test.mjs
//  (npm run progression:test:shape)
// ════════════════════════════════════════════════════════════════════════════
import { asObject, requireArray, SHAPE_ERROR } from '../src/lib/progression/shape.ts'

// triukšmą apie netinkamą formą testuose slopinam
console.warn = () => {}

let pass = 0, fail = 0
const check = (name, fn) => {
  try { fn(); pass++; console.log('   ✓', name) }
  catch (e) { fail++; console.log('   ✗', name, '→', e.message) }
}
const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: laukta ${JSON.stringify(b)}, gauta ${JSON.stringify(a)}`) }

console.log('── progression: atsakymo formos apsauga ──')

check('senos funkcijos MASYVAS → klaida, ne griūtis', () => {
  eq(asObject('rvn_get_daily_quests_v2', [{ id: 1, difficulty: 'easy' }]), { error: SHAPE_ERROR }, 'rezultatas')
})

check('primityvas → klaida', () => {
  eq(asObject('x', 42), { error: SHAPE_ERROR }, 'skaičius')
  eq(asObject('x', 'labas'), { error: SHAPE_ERROR }, 'tekstas')
})

check('null → null (nėra duomenų, bet ir nėra klaidos)', () => {
  eq(asObject('x', null), null, 'null')
  eq(asObject('x', undefined), null, 'undefined')
})

check('teisingas objektas praleidžiamas nepakeistas', () => {
  const ok = { quests: [], allCompleted: false }
  eq(asObject('x', ok), ok, 'objektas')
})

check('serverio klaida praleidžiama nepakeista', () => {
  eq(requireArray('x', { error: 'no_auth' }, 'quests'), { error: 'no_auth' }, 'klaida')
})

check('trūkstamas masyvo laukas → klaida', () => {
  eq(requireArray('x', { allCompleted: true }, 'quests'), { error: SHAPE_ERROR }, 'nėra quests')
  eq(requireArray('x', { quests: 'ne masyvas' }, 'quests'), { error: SHAPE_ERROR }, 'ne masyvas')
})

check('esamas masyvo laukas praleidžiamas', () => {
  const ok = { quests: [{ id: 1 }] }
  eq(requireArray('x', ok, 'quests'), ok, 'praeina')
})

check('null praleidžiamas', () => {
  eq(requireArray('x', null, 'quests'), null, 'null')
})

console.log(`\n════ formos apsauga: ${pass} praėjo · ${fail} krito ════`)
process.exit(fail ? 1 : 0)
