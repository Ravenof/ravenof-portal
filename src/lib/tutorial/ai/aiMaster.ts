// ── „Didmeistrio" DI (hard) – paieška per SIMULIACIJĄ, ne vien euristikos ─────
// 2026-09-19. Iki šiol visi lygiai buvo godūs (vienas geriausiai įvertintas veiksmas
// per kartą, be „kas bus po to"). Didmeistris planuoja VISĄ ėjimą: beam search per
// tikrą variklį (playCard/attack/useChampionAbility ant būsenos klonų), kiekvieną
// ėjimo pabaigą vertina ĮSKAITANT priešo atsakomąjį ėjimą (greedy simuliacija) ir
// renkasi seką, po kurios pozicija geriausia. Žaidėjų statistika (300 kovų vs botą:
// 85 % pergalių, likę ~36 HP) rodė, kad senas DI nespaudžia ir prasikeičia – čia
// vertinama tempo, veido žala, kortų pranašumas ir išgyvenimas vienoje funkcijoje.
//
// Sąžiningumas: simuliacijai ŽMK kaladės permaišomos (DI nežino tikros eilės), o
// priešo ranka simuliacijoje paslepiama – vietoj jos „tipiniai" padarai pagal jo auksą.
// Determinizmas: simuliacija sukasi su seed'intu RNG, tikras RNG grąžinamas atgal.
// Saugikliai: laiko biudžetas (~600 ms), klaidos atveju → null (greedy fallback).

import type { GameState, Side, TargetRef, BoardUnit } from '../engine'
import {
  P, other, cloneState, swapPerspective, playCard, attack, useChampionAbility, discardForGold,
  endTurn, beginTurn, canUnitAttack, legalTargets, canAfford, effectiveAtk,
  resolveSummonChoice, resolveChoice, resolveCopyEffect, resolvePeekDiscard, flushSummonChain,
} from '../engine'
import { getRng, setRng, mulberry32, rng } from '@/lib/game/rng'
import { generateLegalActions, type ActionDescriptor } from './aiActions'
import { DIFFICULTY_WEIGHTS, aiLog } from './aiTypes'
import { analyzeCard, keywordValue, unitThreatBonus } from './aiCardRole'

const BEAM = 6            // kiek geriausių pozicijų nešam į kitą gylį
const MAX_DEPTH = 7       // veiksmų per ėjimą (žaidimas retai turi daugiau)
const REPLY_STEPS = 8     // priešo atsako greedy žingsniai
const BUDGET_MS = 600

type Node = { g: GameState; seq: ActionDescriptor[]; h: number }

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

// ── Statinis pozicijos vertinimas iš `me` perspektyvos ───────────────────────
function unitWorth(g: GameState, u: BoardUnit): number {
  let v = effectiveAtk(g, u) * 1.5 + Math.max(0, u.hp) * 1.0 + keywordValue(u) * 1.2 + unitThreatBonus(g, u) * 0.6
  if (u.isChampion) v += 8 + u.phase * 4
  const st = u.statuses
  if (st.frozen) v -= 2; if (st.stunned) v -= 2; if (st.silenced) v -= 2.5; if (st.poisoned) v -= 1.5; if (st.burning) v -= 1.5
  return v
}

export function evaluatePosition(g: GameState, me: Side): number {
  const foeSide = other(me)
  if (g.winner === me) return 1_000_000
  if (g.winner === foeSide) return -1_000_000
  const my = P(g, me), foe = P(g, foeSide)
  // Svoriai kalibruoti self-play'umi (2026-09-19): HP skirtumas ~1/HP, spaudimas žemiau 15 HP,
  // lenta su mažėjančia grąža nuo 3-io padaro (0.75). Veido žala NETURI persverti lentos –
  // kitaip DI rush'ina ir prasikeičia (senos statistikos pamoka).
  let s = (my.hp - foe.hp) * 1
  s += Math.max(0, 15 - foe.hp) * 2
  s -= Math.max(0, 15 - my.hp) * 2
  // Lentos vertė su mažėjančia grąža (4-5 padarai = AoE rizika, o auksas/kortos riboti)
  const myUnits = my.units.filter((u): u is BoardUnit => !!u).map((u) => unitWorth(g, u)).sort((a, b) => b - a)
  const foeUnits = foe.units.filter((u): u is BoardUnit => !!u).map((u) => unitWorth(g, u)).sort((a, b) => b - a)
  const dr = 0.75
  myUnits.forEach((v, i) => { s += v * 1 * Math.pow(dr, Math.max(0, i - 2)) })
  foeUnits.forEach((v, i) => { s -= v * 1.15 * Math.pow(dr, Math.max(0, i - 2)) })
  s += Math.min(my.hand.length, 8) * 1.6 - Math.min(foe.hand.length, 8) * 1.4
  for (const a of my.artifacts) if (a) s += 3.5 + a.hp * 0.2
  for (const a of foe.artifacts) if (a) s -= 3.5 + a.hp * 0.2
  if (g.field) s += g.field.owner === me ? 2 : -2
  s += my.reactions.filter(Boolean).length * 1.2 - foe.reactions.filter(Boolean).length * 1.0
  if (my.deck.length === 0) s -= 6
  if (foe.deck.length === 0) s += 4
  return s
}

// ── Pagalbinės ───────────────────────────────────────────────────────────────
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t }
}

/** Laukiančius pasirinkimus (iškvietimas, tutor, kopija, peržiūra) išsprendžiam automatiškai. */
function settle(g: GameState): void {
  for (let i = 0; i < 4; i++) {
    let did = false
    if (g.summonChain?.length) { flushSummonChain(g); did = true }
    if (g.pendingSummon) { const ps = g.pendingSummon; resolveSummonChoice(g, ps.options.slice(0, ps.choose).map((o) => o.card.uid)); did = true }
    if (g.pendingChoice) { resolveChoice(g, 0); did = true }
    if (g.pendingCopy) { const pc = g.pendingCopy; if (pc.options[0]) resolveCopyEffect(g, pc.options[0].card.uid); else g.pendingCopy = null; did = true }
    if (g.pendingPeek) { const pp = g.pendingPeek; resolvePeekDiscard(g, pp.cards.slice(0, pp.choose).map((c) => c.uid)); did = true }
    if (!did) break
  }
}

function applyDesc(g: GameState, d: ActionDescriptor, side: Side): boolean {
  let ok = false
  if (d.type === 'ability') ok = useChampionAbility(g, side, d.skillIndex, { target: d.target, targets: d.targets }).ok
  else if (d.type === 'play') ok = playCard(g, side, d.uid, d.opts).ok
  else if (d.type === 'attack') ok = attack(g, side, d.uid, d.target).ok
  else if (d.type === 'discardGold') ok = discardForGold(g, side, d.uid).ok
  if (ok) settle(g)
  return ok
}

function descKey(d: ActionDescriptor): string {
  if (d.type === 'attack') return `a:${d.uid}>${d.target.kind}:${'uid' in d.target ? d.target.uid : d.target.side}`
  if (d.type === 'play') return `p:${d.uid}>${JSON.stringify(d.opts ?? {})}`
  if (d.type === 'ability') return `c:${d.skillIndex}>${JSON.stringify(d.target ?? d.targets ?? null)}`
  return `d:${d.uid}`
}

/** Pozicijos parašas (permutacijų dedup'ui). */
function sig(g: GameState): string {
  const p = (s: Side) => { const x = P(g, s); return `${x.hp}|${x.gold}|${x.hand.map((c) => c.uid).sort().join(',')}|${x.units.map((u) => u ? `${u.uid}:${u.hp}:${u.atk}:${u.attacksUsed}:${u.abilityUsed ? 1 : 0}:${Object.keys(u.statuses).sort().join('.')}` : '-').join(',')}|${x.artifacts.map((a) => a ? `${a.uid}:${a.hp}` : '-').join(',')}` }
  return p('ai') + '#' + p('you') + '#' + (g.field?.card.uid ?? '')
}

/** Visi verti bandymo veiksmai: bazinis greedy sąrašas + VISOS atakų/burtų taikinių alternatyvos. */
function candidates(g: GameState): ActionDescriptor[] {
  const w = DIFFICULTY_WEIGHTS.hard
  const me = P(g, 'ai'), foe = P(g, 'you')
  const out: ActionDescriptor[] = generateLegalActions(g, w).map((a) => a.descriptor)
  for (const u of me.units) {
    if (!u || u.isChampion || !canUnitAttack(g, 'ai', u).ok) continue
    for (const t of legalTargets(g, 'ai', u)) out.push({ type: 'attack', uid: u.uid, cardName: u.card.name, target: t })
  }
  for (const c of me.hand) {
    if (c.type === 'curse' || !canAfford(g, 'ai', c)) continue
    const a = analyzeCard(c)
    if (!a.needsTarget) continue
    if (a.targetsEnemyUnit || a.dmgEnemy > 0 || a.destroy || a.status) {
      for (const u of foe.units) if (u) out.push({ type: 'play', uid: c.uid, cardName: c.name, opts: { target: { kind: 'unit', side: 'you', uid: u.uid } as TargetRef } })
    }
    if (a.canHitFace) out.push({ type: 'play', uid: c.uid, cardName: c.name, opts: { target: { kind: 'player', side: 'you' } as TargetRef } })
    if (a.targetsOwnUnit || a.buffAtk > 0 || a.buffHp > 0 || a.heal > 0) {
      for (const u of me.units) if (u) out.push({ type: 'play', uid: c.uid, cardName: c.name, opts: { target: { kind: 'unit', side: 'ai', uid: u.uid } as TargetRef } })
    }
  }
  const seen = new Set<string>()
  return out.filter((d) => { const k = descKey(d); if (seen.has(k)) return false; seen.add(k); return true })
}

/** Godus ėjimas už `side`-ą duotoje būsenoje (būsena turi būti to side'o perspektyvoje: jis = 'ai'). */
function greedyTurn(m: GameState, steps: number): void {
  const w = DIFFICULTY_WEIGHTS.normal
  for (let i = 0; i < steps && !m.winner; i++) {
    const acts = generateLegalActions(m, w).sort((a, b) => b.score - a.score)
    let did = false
    for (const a of acts) { if (a.score <= 0) break; if (applyDesc(m, a.descriptor, 'ai')) { did = true; break } }
    if (!did) break
  }
}

/** Nežinomos rankos modelis: N „tipinių" padarų pagal to ėjimo auksą (kad atsakas turėtų ir vystymąsi, ne tik atakas). */
function syntheticHand(p: GameState['ai'], n: number): typeof p.hand {
  const gold = Math.min(1000, Math.max(100, (p.turnNumber + 1) * 100))
  const out: typeof p.hand = []
  for (let i = 0; i < n; i++) {
    const g = i === 0 ? gold : Math.max(100, gold - 200 * i)
    const stat = Math.max(1, Math.round(g / 100))
    out.push({ id: `~hidden${i}`, uid: `~hidden-${i}-${p.turnNumber}`, name: '~', image: null, gold: g, attack: stat, health: stat, type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff', effect: null, gameplay: null, mappings: [] })
  }
  return out
}

/**
 * Lapo vertinimas 3 pusėjimais: (1) baigiam ėjimą, (2) priešas atsako godžiai (jo tikra
 * ranka paslėpta – vietoj jos tipiniai padarai pagal auksą), (3) mes atsakom godžiai
 * (kad matytųsi paruoštas lethal / tempo), tada statinis vertinimas iš DI perspektyvos.
 */
function leafValue(g: GameState): number {
  const c = cloneState(g)
  const me = P(c, 'ai')
  const affordable = me.hand.filter((x) => x.type !== 'curse' && canAfford(c, 'ai', x)).length
  const waste = affordable > 0 ? Math.min(3, affordable) * 1.2 : 0
  endTurn(c)
  if (c.winner === 'ai') return 1_000_000
  if (c.winner === 'you') return -1_000_000
  // (2) priešo ėjimas
  const m = swapPerspective(c)           // m.ai = žaidėjas
  beginTurn(m)
  const hidden = m.ai.hand.length
  m.ai.hand = syntheticHand(m.ai, Math.min(2, Math.max(1, hidden)))
  greedyTurn(m, REPLY_STEPS)
  if (m.winner === 'ai') return -1_000_000 + 1
  if (m.winner === 'you') return 1_000_000 - 1
  // nežinomų kortų „burn" prognozė
  m.you.hp -= Math.min(3, Math.round(hidden * 0.5))
  if (m.you.hp <= 0) return -1_000_000 + 2
  // (3) mūsų kitas ėjimas (godžiai) – ar pozicija „auga"
  endTurn(m)
  const m2 = swapPerspective(m)          // m2.ai = mes
  beginTurn(m2)
  greedyTurn(m2, REPLY_STEPS)
  if (m2.winner === 'ai') return 500_000
  if (m2.winner === 'you') return -500_000
  const vAfterReply = evaluatePosition(m, 'you')
  const vNext = evaluatePosition(m2, 'ai')
  return vAfterReply * 0.6 + vNext * 0.4 - waste
}

// ── Viešas planuotojas ───────────────────────────────────────────────────────
export type MasterPlan = { seq: ActionDescriptor[]; value: number; explored: number; ms: number }

export function planMasterTurn(g0: GameState, budgetMs = BUDGET_MS): MasterPlan | null {
  if (g0.winner || g0.active !== 'ai') return null
  const t0 = now()
  const realRng = getRng()
  setRng(mulberry32((g0.globalTurn * 7919 + P(g0, 'ai').gold + P(g0, 'you').hp * 31) >>> 0))
  try {
    const root = cloneState(g0)
    shuffleInPlace(root.you.zmk); shuffleInPlace(root.ai.zmk)   // ŽMK eilės nežinom
    let best: { seq: ActionDescriptor[]; v: number } = { seq: [], v: leafValue(root) }
    let beam: Node[] = [{ g: root, seq: [], h: 0 }]
    const seen = new Set<string>([sig(root)])
    let explored = 0
    for (let depth = 0; depth < MAX_DEPTH && beam.length; depth++) {
      const next: Node[] = []
      for (const node of beam) {
        if (now() - t0 > budgetMs) break
        for (const d of candidates(node.g)) {
          if (now() - t0 > budgetMs) break
          const c = cloneState(node.g)
          if (!applyDesc(c, d, 'ai')) continue
          explored++
          if (c.winner === 'ai') return { seq: [...node.seq, d], value: 1_000_000, explored, ms: now() - t0 }
          if (c.winner) continue
          const k = sig(c)
          if (seen.has(k)) continue
          seen.add(k)
          next.push({ g: c, seq: [...node.seq, d], h: evaluatePosition(c, 'ai') })
        }
      }
      if (!next.length) break
      next.sort((a, b) => b.h - a.h)
      beam = next.slice(0, BEAM)
      for (const n of beam) {
        if (now() - t0 > budgetMs * 1.4) break
        const v = leafValue(n.g)
        if (v > best.v) best = { seq: n.seq, v }
      }
    }
    return { seq: best.seq, value: best.v, explored, ms: now() - t0 }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[AI master] planavimo klaida – grįžtam prie greedy:', err)
    return null
  } finally {
    setRng(realRng)
  }
}

export function logPlan(p: MasterPlan): void {
  aiLog({ master: true, value: Math.round(p.value * 10) / 10, explored: p.explored, ms: Math.round(p.ms), plan: p.seq.map((d) => d.type === 'attack' ? `atk ${d.cardName}→${d.target.kind}` : d.type === 'play' ? `play ${d.cardName}` : d.type) })
}
