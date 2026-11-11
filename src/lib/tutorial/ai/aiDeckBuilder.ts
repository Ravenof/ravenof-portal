// ── DI kaladės statytojas (lygis „Sunkus“) ───────────────────────────────────
// Kai varžovas žaidžia ne paruošta kalade (atsitiktinė ar pasirinkta frakcija), Sunkus DI nebeima atsitiktinių
// kortų: iš frakcijos + universalių kortų susistato kaladę pagal STRATEGIJĄ:
//   1) įvertina kiekvienos kortos galią (statai pagal kainą, raktažodžiai, efektai, kurie realiai sukonfigūruoti);
//   2) pasirenka archetipą (agresija / vidurys / kontrolė) pagal tai, kam frakcija turi geriausias kortas;
//   3) sudeda sinergijų paketus: kortos, kurios kviečia ar stiprina kitas pagal vardą, potipį ar frakciją,
//      dedamos kartu su savo partneriais; kortos be partnerių – nubaudžiamos;
//   4) laikosi aukso kreivės ir tipų kvotų, kopijų limitų pagal retumą; įdeda vieną čempiono liniją (visos fazės).
import type { TutCard } from '../engine'
import type { EffectMapping } from '@/lib/game/types'
import { analyzeCard } from './aiCardRole'
import { rng } from '@/lib/game/rng'

type Card = Omit<TutCard, 'uid'>
export type DeckArchetype = 'aggro' | 'midrange' | 'control'
export type DeckPlan = { archetype: DeckArchetype; tribe: string | null; champion: string | null; cards: TutCard[] }

const KW: Record<string, number> = { sprint: 1.6, taunt: 1.4, shield: 1.6, stealth: 1.0, battlecry: 0.4, lastwish: 0.4 }
const CURVE: Record<DeckArchetype, [number, number, number, number]> = {   // dalys: ≤200, 300–400, 500–600, 700+
  aggro: [0.38, 0.38, 0.18, 0.06], midrange: [0.28, 0.34, 0.25, 0.13], control: [0.22, 0.30, 0.28, 0.20],
}
const bucket = (gold: number) => (gold <= 200 ? 0 : gold <= 400 ? 1 : gold <= 600 ? 2 : 3)
const copyLimit = (c: Card) => (/epi|legend/i.test(c.rarityName ?? '') ? 1 : 2)
const allMaps = (c: Card): EffectMapping[] => { const out: EffectMapping[] = []; const walk = (ms?: EffectMapping[]) => { for (const m of ms ?? []) { if (!m) continue; out.push(m); walk(m.then as EffectMapping[] | undefined) } }; walk(c.mappings as EffectMapping[] | undefined); return out }
const names = (s?: string | null) => (s ?? '').split(/[,;]/).map((x) => x.trim()).filter(Boolean)

/** Kortos, kurias ši korta mini pagal vardą (kviečia, ieško, sinergija). */
function partnersOf(c: Card): string[] {
  const out = new Set<string>()
  for (const m of allMaps(c)) for (const n of names((m as { summonNames?: string }).summonNames)) out.add(n)
  const syn = (c.gameplay as { synergy?: { withNames?: string } } | null)?.synergy
  for (const n of names(syn?.withNames)) out.add(n)
  out.delete(c.name)
  return [...out]
}
/** Potipiai, kuriuos ši korta apdovanoja (trigeris, aura ar iškvietimas pagal potipį). */
function tribesOf(c: Card): string[] {
  const out = new Set<string>()
  for (const m of allMaps(c)) { const x = m as { triggerSubtype?: string; summonSubtype?: string }; if (x.triggerSubtype) out.add(x.triggerSubtype.toUpperCase()); if (x.summonSubtype) out.add(x.summonSubtype.toUpperCase()) }
  const aura = (c.gameplay as { passiveAura?: { auraSubtype?: string } } | null)?.passiveAura
  if (aura?.auraSubtype) out.add(aura.auraSubtype.toUpperCase())
  return [...out]
}

/** Bazinė kortos galia (nepriklauso nuo archetipo) ir jos sudedamosios archetipo svoriams. */
function rate(c: Card) {
  const a = analyzeCard(c as TutCard), cost = Math.max(1, (c.gold ?? 100) / 100)
  const kw = (c.keywords ?? []).reduce((s, k) => s + (KW[k] ?? 0), 0)
  const body = c.type === 'unit' ? (c.attack ?? 0) + (c.health ?? 0) * 0.9 + kw : 0
  const removal = Math.min(a.dmgEnemy, 8) * 0.9 * Math.min(2, a.hitCount) + (a.destroy ? 5 : 0) + (a.status ? 1.6 : 0) + (a.freezeStun ? 1 : 0)
  const sweep = a.aoeDmg * 1.8
  const value = a.draw * 1.6 + a.gainGold * 0.008 + (a.summon ? 2.5 : 0) + a.buffAtk * 0.7 + a.buffHp * 0.6
  const sustain = a.heal * 0.35
  const face = a.canHitFace ? Math.min(a.dmgEnemy, 8) * 0.5 : 0
  const fx = removal + sweep + value + sustain
  // efektas aprašytas tekste, bet nesukonfigūruotas – žaidime jis nieko nedaro
  const dead = (!c.mappings || c.mappings.length === 0) && !!(c.effectText ?? '').trim() && !c.effect && c.type !== 'unit'
  const passive = c.gameplay && (c.gameplay as { passiveAura?: unknown }).passiveAura ? 2 : 0
  let power = c.type === 'unit' ? (body * 1.15 + fx + passive) / (cost + 0.6) : (fx + passive + (c.type === 'artifact' ? 2 : 0) + (c.type === 'field' ? 2 : 0) + (c.type === 'reaction' ? 1.5 : 0)) / (cost * 0.55 + 0.6)
  if (dead) power -= 2.5
  return { a, cost, body, removal, sweep, value, sustain, face, power, sprint: (c.keywords ?? []).includes('sprint'), taunt: (c.keywords ?? []).includes('taunt') }
}

function archScore(c: Card, r: ReturnType<typeof rate>, arch: DeckArchetype): number {
  let s = r.power
  if (arch === 'aggro') s += (c.type === 'unit' ? (c.attack ?? 0) * 0.25 : 0) + (r.sprint ? 1.2 : 0) + r.face * 0.6 + (r.cost <= 3 ? 0.8 : r.cost >= 6 ? -1.2 : 0) - r.sustain * 0.3
  else if (arch === 'control') s += r.removal * 0.22 + r.sweep * 0.3 + r.sustain * 0.5 + (r.taunt ? 1 : 0) + r.a.draw * 0.6 + (c.type === 'unit' && r.cost >= 6 ? 0.8 : 0)
  else s += r.value * 0.2 + r.removal * 0.1 + (c.type === 'unit' && r.cost >= 3 && r.cost <= 5 ? 0.6 : 0)
  return s
}

/** Sustato kaladę. `size` – kortų skaičius (30–40). Tas pats baseinas kaskart gali duoti kitą archetipą, bet visada nuoseklią kaladę. */
export function planStrategicDeck(poolIn: Card[], size = 32): DeckPlan {
  const seen = new Set<string>()
  const pool = poolIn.filter((c) => c.type !== 'curse' && !seen.has(c.id) && (seen.add(c.id), true))
  if (pool.length === 0) return { archetype: 'midrange', tribe: null, champion: null, cards: [] }
  const R = new Map<string, ReturnType<typeof rate>>(); for (const c of pool) R.set(c.id, rate(c))
  const byName = new Map<string, Card>(); for (const c of pool) byName.set(c.name, c)
  const main = pool.filter((c) => c.type !== 'champion')

  // archetipas: kuriam frakcija turi stipriausią 24 kortų branduolį (su trupučiu atsitiktinumo – kad varžovas nebūtų visada tas pats)
  const archs: DeckArchetype[] = ['aggro', 'midrange', 'control']
  const strength = archs.map((ar) => main.map((c) => archScore(c, R.get(c.id)!, ar)).sort((x, y) => y - x).slice(0, 24).reduce((s, v) => s + v, 0) * (ar === 'aggro' ? 0.95 : 1) * (0.9 + rng() * 0.2))
  const archetype = archs[strength.indexOf(Math.max(...strength))]

  // potipio gentis: jei yra ≥2 apdovanojančios kortos ir ≥5 nariai
  const tribeCount = new Map<string, number>()
  for (const c of main) for (const tr of tribesOf(c)) tribeCount.set(tr, (tribeCount.get(tr) ?? 0) + 1)
  let tribe: string | null = null, tribeBest = 1
  for (const [tr, n] of tribeCount) { const members = main.filter((c) => (c.subtype ?? '').toUpperCase() === tr).length; if (n > tribeBest && members >= 5) { tribe = tr; tribeBest = n } }

  const score = new Map<string, number>()
  for (const c of main) {
    let s = archScore(c, R.get(c.id)!, archetype)
    const partners = partnersOf(c)
    if (partners.length) { const have = partners.filter((n) => byName.has(n)).length; s += have > 0 ? 1.2 : -3 }   // be partnerių korta – tuščia
    if (tribe) { if ((c.subtype ?? '').toUpperCase() === tribe) s += 1.3; if (tribesOf(c).includes(tribe)) s += 2 }
    else if (tribesOf(c).length) s -= 1.5
    score.set(c.id, s)
  }
  // partneriai, kuriuos mini aukštai įvertintos kortos, pakeliami (kombinacija turi atsirasti kaladėje visa)
  const ranked0 = [...main].sort((x, y) => score.get(y.id)! - score.get(x.id)!)
  for (const c of ranked0.slice(0, Math.ceil(size * 0.9))) for (const n of partnersOf(c)) { const p = byName.get(n); if (p && p.type !== 'champion') score.set(p.id, (score.get(p.id) ?? 0) + 2.2) }

  // kvotos
  const unitsMin = Math.round(size * (archetype === 'control' ? 0.5 : archetype === 'aggro' ? 0.66 : 0.6))
  const cap: Record<string, number> = { artifact: 2, field: 1, reaction: archetype === 'control' ? 4 : 3, spell: size - unitsMin }
  const curve = CURVE[archetype].map((p) => Math.round(p * size))
  const picked: Card[] = [], count = new Map<string, number>(), typeN: Record<string, number> = {}, curveN = [0, 0, 0, 0]
  const add = (c: Card) => { picked.push(c); count.set(c.id, (count.get(c.id) ?? 0) + 1); typeN[c.type] = (typeN[c.type] ?? 0) + 1; curveN[bucket(c.gold ?? 100)]++ }

  // čempionas: geriausia pilna linija (yra 1 fazė); po vieną kiekvienos fazės kortą
  const fam = new Map<string, Card[]>()
  for (const c of pool) if (c.type === 'champion' && c.championGroup) fam.set(c.championGroup, [...(fam.get(c.championGroup) ?? []), c])
  let champion: string | null = null, champBest = -1
  for (const [g, list] of fam) { if (!list.some((c) => (c.championPhase ?? 1) === 1)) continue; const v = list.length * 3 + list.reduce((s, c) => s + R.get(c.id)!.power, 0) + rng(); if (v > champBest) { champBest = v; champion = g } }
  if (champion) for (const c of (fam.get(champion) ?? []).sort((x, y) => (x.championPhase ?? 1) - (y.championPhase ?? 1))) if (!count.has(c.id)) add(c)

  const ranked = [...main].sort((x, y) => score.get(y.id)! - score.get(x.id)!)
  const room = (c: Card, strict: boolean) => {
    if ((count.get(c.id) ?? 0) >= copyLimit(c)) return false
    if (c.type !== 'unit' && (typeN[c.type] ?? 0) >= (cap[c.type] ?? 2)) return false
    const nonUnits = picked.filter((p) => p.type !== 'unit' && p.type !== 'champion').length
    if (c.type !== 'unit' && nonUnits >= size - unitsMin) return false
    if (strict && curveN[bucket(c.gold ?? 100)] >= curve[bucket(c.gold ?? 100)]) return false
    return true
  }
  // 1) pagal kreivę: geriausios kortos po vieną kopiją, tada antros kopijos; 2) likutis be kreivės
  for (const strict of [true, false]) for (let copy = 0; copy < 2 && picked.length < size; copy++) for (const c of ranked) {
    if (picked.length >= size) break
    if ((count.get(c.id) ?? 0) !== copy) continue
    if ((score.get(c.id) ?? 0) < 0.4 && strict) continue
    if (room(c, strict)) add(c)
  }
  // jei baseinas labai mažas – leidžiam viršyti kopijų limitą, kad kaladė būtų žaidžiama
  for (let i = 0; picked.length < 30 && ranked.length > 0 && i < 200; i++) add(ranked[i % ranked.length])
  return { archetype, tribe, champion, cards: picked.map((c, i) => ({ ...c, uid: `${c.id}-ai-${i}` }) as TutCard) }
}

export function buildStrategicDeck(pool: Card[], size = 32): TutCard[] { return planStrategicDeck(pool, size).cards }
