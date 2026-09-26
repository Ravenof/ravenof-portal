// Turnyro tinklelio testas: atsitiktiniai rezultatai per visą double elimination.
// Paleidimas: npx tsx scripts/simulate-tournament-bracket.ts  (npm run tourney:test)
import { buildBracket, matchCount, type TourneySize } from '../src/lib/tournament/bracket'

let pass = 0, fail = 0
const check = (n: string, c: boolean, x = '') => { if (c) pass++; else { fail++; console.log('  ✗', n, x) } }

function run(size: TourneySize, seed: number) {
  let s = seed
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 }
  const specs = buildBracket(size)
  const byKey = new Map(specs.map((m) => [m.key, m]))
  const slots = new Map<string, { a: number | null; b: number | null }>(specs.map((m) => [m.key, { a: m.seedA ?? null, b: m.seedB ?? null }]))
  const done = new Set<string>()
  const place = new Map<number, number>()
  const losses = new Map<number, number>()
  const meetings = new Map<string, number>()
  let played = 0, guard = 0
  while (guard++ < 200) {
    const ready = specs.filter((m) => !done.has(m.key) && m.key !== 'GF2' && slots.get(m.key)!.a != null && slots.get(m.key)!.b != null)
    const gf2 = slots.get('GF2')!
    if (ready.length === 0 && !(gf2.a != null && gf2.b != null && !done.has('GF2'))) break
    const m = ready[0] ?? byKey.get('GF2')!
    const sl = slots.get(m.key)!
    const a = sl.a!, b = sl.b!
    const pk = [a, b].sort().join('-'); meetings.set(pk, (meetings.get(pk) ?? 0) + 1)
    const w = rnd() < 0.5 ? a : b, l = w === a ? b : a
    done.add(m.key); played++
    losses.set(l, (losses.get(l) ?? 0) + 1)
    if (m.key === 'GF1') {
      if (w === a) { place.set(a, 1); place.set(b, 2) }
      else { slots.set('GF2', { a, b }) }
      continue
    }
    if (m.key === 'GF2') { place.set(w, 1); place.set(l, 2); continue }
    if (m.winTo) { const t = slots.get(m.winTo.key)!; check(`${m.key} win slot free`, t[m.winTo.slot] == null); t[m.winTo.slot] = w }
    if (m.loseTo) { const t = slots.get(m.loseTo.key)!; check(`${m.key} lose slot free`, t[m.loseTo.slot] == null); t[m.loseTo.slot] = l }
    else place.set(l, m.loserPlace!)
  }
  const mc = matchCount(size)
  check(`${size}: kovų skaičius ${played}`, played >= mc.min && played <= mc.max, String(played))
  check(`${size}: visi turi vietą`, place.size === size, String(place.size))
  const places = [...place.values()].sort((x, y) => x - y)
  check(`${size}: 1 ir 2 vieta unikalios`, places.filter((p) => p === 1).length === 1 && places.filter((p) => p === 2).length === 1)
  for (const [p, n] of losses) if (place.get(p) !== 1) check(`${size}: iškritęs turi 2 pralaimėjimus`, n === 2, `${p}:${n}`)
  const maxMeet = Math.max(...meetings.values())
  check(`${size}: ne daugiau 3 susitikimų`, maxMeet <= 3, String(maxMeet))
  return { played, places }
}

for (const size of [4, 8, 16] as TourneySize[]) {
  const specs = buildBracket(size)
  check(`${size}: šablonas ${specs.length} kovų`, specs.length === 2 * size - 1)
  for (let i = 1; i <= 300; i++) run(size, i * 7919)
  const r = run(size, 42)
  console.log(`  ${size}: pvz. ${r.played} kovos, vietos ${r.places.join(',')}`)
}
console.log(`\n${pass} ok, ${fail} fail`)
if (fail) process.exit(1)
