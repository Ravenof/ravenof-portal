// ── Effect engine ─────────────────────────────────────────────────────────────
// Vykdo admin sumapintus EffectMapping'us. Žaidimo būsenos primityvus gauna
// per GameApi (dependency injection iš engine.ts) – jokių ciklinių importų.
// Nežinomi / nesumapinti efektai praleidžiami su warning log'u (necrashina).

import type { EffectMapping, EffectType } from './types'
import { resolveTargets, resolveMappingTargets, autoPickTarget, isMultiTarget, evalCondition, metric, pickBySelect, pickNBySelect, autoPickN, filterWounded, filterSubtype, type ResolvedTarget } from './targetResolver'
import type { GameState, Side, BoardUnit, BoardArtifact, TutCard, TutStatus, GameEvent } from '@/lib/tutorial/engine'

export type GameApi = {
  dealToUnit(g: GameState, target: BoardUnit, owner: Side, base: number, actor: Side, useZmk?: boolean): void
  dealToPlayer(g: GameState, target: Side, base: number, actor: Side, useZmk?: boolean): void
  dealToArtifact(g: GameState, target: BoardArtifact, owner: Side, base: number, actor: Side): void
  healUnit(g: GameState, owner: Side, u: BoardUnit, n: number): void
  healPlayer(g: GameState, s: Side, n: number): void
  drawCards(g: GameState, s: Side, n: number): void
  discardCards(g: GameState, s: Side, n: number): void
  killUnit(g: GameState, owner: Side, u: BoardUnit): void
  destroyArtifact(g: GameState, owner: Side, uid: string): void
  applyStatus(g: GameState, owner: Side, u: BoardUnit, st: TutStatus): void
  buffUnit(g: GameState, owner: Side, u: BoardUnit, atk: number, hp: number): void
  gainGold(g: GameState, s: Side, n: number, srcName: string): void
  loseGold(g: GameState, s: Side, n: number, srcName: string): void
  scheduleGoldPenalty(g: GameState, s: Side, n: number, srcName: string): void
  counterCurrentSpell(g: GameState, srcName: string): void
  returnUnitToHand(g: GameState, owner: Side, u: BoardUnit): void
  summonFromZone(g: GameState, s: Side, zone: 'hand' | 'deck' | 'discard', opts?: { costMax?: number; subtype?: string; count?: number }): void
  activateCurses(g: GameState, target: Side, count: number, srcName: string, depth: number): void
  drawZmkVisual(g: GameState, s: Side): void
  removeZmkCard(g: GameState, s: Side, value: string, count: number): void
  setSpellDiscount(g: GameState, s: Side, n: number): void
  buffSpellDamage(g: GameState, s: Side, n: number): void
  tutorToHand(g: GameState, s: Side, opts: { zone?: 'deck' | 'discard' | 'both'; spellType?: string; choose?: boolean }): void
  chooseEffect(g: GameState, caster: Side, sourceName: string, branches: EffectMapping[][], labels: string[]): void
  millDeck(g: GameState, s: Side, n: number): void
  returnGraveyardToDeck(g: GameState, s: Side, n: number): void
  peekDiscard(g: GameState, victim: Side, peekCount: number, choose: number, caster: Side): void
  revealDeck(g: GameState, whoseDeck: Side, count: number, caster: Side): void
  summonAdvanced(g: GameState, s: Side, opts: { zones?: ('hand' | 'deck' | 'discard')[]; costMin?: number; costMax?: number; subtype?: string; count?: number; choose?: boolean; names?: string }): void
  log(g: GameState, e: GameEvent): void
}

export type ApplyCtx = {
  sourceName: string
  sourceUid?: string
  chosenTarget?: ResolvedTarget
  chosenTargets?: ResolvedTarget[]   // rankinis kelių taikinių parinkimas (1/N)
  depth: number          // rekursijos apsauga follow-up trigger'iams
}

const MAX_DEPTH = 4

const HARM_EFFECTS: EffectType[] = ['damage', 'destroy', 'silence', 'freeze', 'stun', 'poison', 'burn', 'debuffAttack', 'debuffHealth', 'discard', 'loseGold', 'loseGoldNextTurn', 'moveToGraveyard']

// Efektai, kuriems NIEKADA nereikia rankinio taikinio (sužaidžiami iškart, be pasirinkimo).
const NO_SELECT_EFFECTS = new Set<EffectType>([
  'drawCards', 'gainGold', 'loseGold', 'discard', 'triggerCurse', 'triggerZmk', 'removeZmkCard',
  'mill', 'returnGraveyardToDeck', 'peekDiscard', 'revealOwnDeck', 'revealEnemyDeck',
  'selfToEnemyHand', 'selfToOwnHand', 'summonAdvanced', 'summonFromHand', 'summonFromDeck',
  'summonFromGraveyard', 'revive', 'chooseEffect', 'tutorToHand', 'spellDiscount', 'buffSpellDamage',
  'coinFlip', 'loseGoldNextTurn',
])

export function effectIntent(e: EffectType): 'harm' | 'help' {
  return HARM_EFFECTS.includes(e) ? 'harm' : 'help'
}

/** Ar mapping'ui reikia žaidėjo pasirinkti taikinį UI'juje? */
export function mappingNeedsSelection(m: EffectMapping): boolean {
  if (m.target === 'castSpell' || (m.targetTypes?.includes('castSpell') ?? false)) return false
  if (NO_SELECT_EFFECTS.has(m.effect)) return false
  if (m.targetTypes && m.targetTypes.length > 0) return m.requiresSelection !== false
  if (isMultiTarget(m.target)) return false
  if (m.requiresSelection === false) return false
  if (m.requiresSelection === true) return true
  // default: pavieniai harm efektai į priešo/bet kuriuos taikinius – renkamasi
  return effectIntent(m.effect) === 'harm' && ['enemyUnit', 'anyUnit', 'anyPlayer', 'enemyArtifact', 'anyArtifact', 'anyChampion', 'enemyChampion'].includes(m.target)
}

function findUnit(g: GameState, t: ResolvedTarget): { u: BoardUnit; owner: Side } | null {
  if (t.kind !== 'unit') return null
  const p = t.side === 'you' ? g.you : g.ai
  const u = p.units.find((x) => x?.uid === t.uid)
  return u ? { u, owner: t.side } : null
}

/**
 * Pritaiko vieną EffectMapping. Grąžina true jei efektas įvyko.
 * Nežinomas efektas → warning log, false (žaidimas tęsiasi).
 */
export function applyMapping(api: GameApi, g: GameState, caster: Side, m: EffectMapping, ctx: ApplyCtx): boolean {
  if (ctx.depth > MAX_DEPTH) {
    api.log(g, { t: 'blocked', side: caster, msg: `⚠ Efektų grandinė per gili – „${ctx.sourceName}" follow-up praleistas.` })
    return false
  }
  // Sąlyga: jei netenkinama – mapping praleidžiamas tyliai (naudojama fallback porai).
  if (m.condition && !evalCondition(g, caster, m.condition)) return false

  // Taikinys „dabar žaidžiamas burtas" (castSpell): nutildo/atšaukia žaidžiamą burtą.
  if (m.target === 'castSpell' || (m.targetTypes?.includes('castSpell') ?? false)) {
    if (g.rollContext?.kind === 'spell') api.counterCurrentSpell(g, ctx.sourceName)
    else api.log(g, { t: 'blocked', side: caster, msg: `„${ctx.sourceName}": nėra žaidžiamo burto, kurį būtų galima nutildyti.` })
    return true
  }

  // Reikšmė: dinaminė (base + perEach * metrika) arba fiksuota.
  const v = m.dynamicValue
    ? Math.max(0, Math.round(m.dynamicValue.base + m.dynamicValue.perEach * metric(g, caster, m.dynamicValue.source)))
    : (m.value ?? 1)

  // taikinių parinkimas
  let targets: ResolvedTarget[]
  if (m.target === 'selfUnit') {
    let t: ResolvedTarget | null = null
    if (ctx.sourceUid) {
      for (const sd of ['you', 'ai'] as Side[]) {
        const pp = sd === 'you' ? g.you : g.ai
        if (pp.units.some((x) => x?.uid === ctx.sourceUid)) { t = { kind: 'unit', side: sd, uid: ctx.sourceUid }; break }
      }
    }
    targets = t ? [t] : []
  } else {
    const hasTypes = !!m.targetTypes && m.targetTypes.length > 0
    const aoe = hasTypes ? false : isMultiTarget(m.target)
    if (ctx.chosenTargets && ctx.chosenTargets.length > 0 && !aoe) {
      targets = ctx.chosenTargets
    } else if (ctx.chosenTarget && !aoe) {
      targets = [ctx.chosenTarget]
    } else {
      let all = hasTypes ? resolveMappingTargets(g, caster, m) : resolveTargets(g, caster, m.target)
      if (m.targetWoundedOnly) all = filterWounded(g, all)
      if (m.targetSubtype) all = filterSubtype(g, all, m.targetSubtype)
      if (aoe) targets = all
      else {
        const n = Math.max(1, m.hitCount ?? 1)
        if (m.targetSelect) targets = pickNBySelect(g, all, m.targetSelect, n)
        else targets = autoPickN(g, caster, all, effectIntent(m.effect), n, m.allowRandomTarget)
      }
    }
  }
  if (targets.length === 0 && !['drawCards', 'gainGold', 'loseGold', 'discard', 'triggerCurse', 'triggerZmk', 'removeZmkCard', 'mill', 'returnGraveyardToDeck', 'peekDiscard', 'revealOwnDeck', 'revealEnemyDeck', 'selfToEnemyHand', 'selfToOwnHand', 'summonAdvanced', 'summonFromHand', 'summonFromDeck', 'summonFromGraveyard', 'chooseEffect', 'tutorToHand', 'spellDiscount', 'buffSpellDamage', 'coinFlip', 'loseGoldNextTurn'].includes(m.effect)) {
    api.log(g, { t: 'blocked', side: caster, msg: `„${ctx.sourceName}": nėra galiojančio taikinio – efekto dalis neįvyksta.` })
    return false
  }

  const foe: Side = caster === 'you' ? 'ai' : 'you'
  let applied = true

  switch (m.effect) {
    case 'damage': {
      const useZmk = m.triggersZmk !== false
      // Burtų žalos priedas (charakterio onCast trigger'is): pridedamas tik burto kontekste.
      const spellBonus = (g.rollContext?.kind === 'spell' && g.rollContext.actor === caster)
        ? (caster === 'you' ? g.you : g.ai).spellDamageBonus : 0
      const dv = v + spellBonus
      for (const t of targets) {
        if (t.kind === 'player') api.dealToPlayer(g, t.side, dv, caster, useZmk)
        else if (t.kind === 'artifact') {
          const p = t.side === 'you' ? g.you : g.ai
          const a = p.artifacts.find((x) => x?.uid === t.uid)
          if (a) api.dealToArtifact(g, a, t.side, dv, caster)
        } else {
          const f = findUnit(g, t)
          if (f) api.dealToUnit(g, f.u, f.owner, dv, caster, useZmk)
        }
      }
      break
    }
    case 'heal':
      for (const t of targets) {
        if (t.kind === 'player') api.healPlayer(g, t.side, v)
        else { const f = findUnit(g, t); if (f) api.healUnit(g, f.owner, f.u, v) }
      }
      break
    case 'destroy':
      for (const t of targets) {
        if (t.kind === 'unit') { const f = findUnit(g, t); if (f) api.killUnit(g, f.owner, f.u) }
        else if (t.kind === 'artifact') api.destroyArtifact(g, t.side, t.uid)
      }
      break
    case 'silence': case 'freeze': case 'stun': case 'poison': case 'burn': {
      const map: Record<string, TutStatus> = { silence: 'silenced', freeze: 'frozen', stun: 'stunned', poison: 'poisoned', burn: 'burning' }
      for (const t of targets) { const f = findUnit(g, t); if (f) api.applyStatus(g, f.owner, f.u, map[m.effect]) }
      break
    }
    case 'taunt': case 'stealth': case 'shield':
      for (const t of targets) {
        const f = findUnit(g, t)
        if (!f) continue
        if (m.effect === 'shield') f.u.shield = true
        else if (m.effect === 'stealth') f.u.stealth = true
        else if (!f.u.card.keywords.includes('taunt')) f.u.card.keywords.push('taunt')
        api.log(g, { t: 'buff', side: f.owner, cardName: f.u.card.name, msg: `„${f.u.card.name}" gauna ${m.effect === 'shield' ? '✦★ Magiškąjį skydą' : m.effect === 'stealth' ? '◑ Sėlinimą' : '⊙ Pasišaipymą'}.` })
      }
      break
    case 'buffAttack':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.buffUnit(g, f.owner, f.u, v, 0) }
      break
    case 'buffHealth':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.buffUnit(g, f.owner, f.u, 0, v) }
      break
    case 'debuffAttack':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.buffUnit(g, f.owner, f.u, -v, 0) }
      break
    case 'debuffHealth':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.buffUnit(g, f.owner, f.u, 0, -v) }
      break
    case 'drawCards': api.drawCards(g, caster, v); break
    case 'discard': api.discardCards(g, targets[0]?.kind === 'player' ? targets[0].side : foe, v); break
    case 'gainGold': api.gainGold(g, targets[0]?.kind === 'player' ? targets[0].side : caster, v, ctx.sourceName); break
    case 'loseGold': api.loseGold(g, targets[0]?.kind === 'player' ? targets[0].side : foe, v, ctx.sourceName); break
    case 'summonFromHand': api.summonFromZone(g, caster, 'hand', { costMax: m.summonCostMax, subtype: m.summonSubtype, count: m.summonCount }); break
    case 'summonFromDeck': api.summonFromZone(g, caster, 'deck', { costMax: m.summonCostMax, subtype: m.summonSubtype, count: m.summonCount }); break
    case 'summonFromGraveyard': case 'revive': api.summonFromZone(g, caster, 'discard', { costMax: m.summonCostMax, subtype: m.summonSubtype, count: m.summonCount }); break
    case 'mill': api.millDeck(g, targets[0]?.kind === 'player' ? targets[0].side : caster, v); break
    case 'returnGraveyardToDeck': api.returnGraveyardToDeck(g, targets[0]?.kind === 'player' ? targets[0].side : caster, v); break
    case 'peekDiscard': api.peekDiscard(g, targets[0]?.kind === 'player' ? targets[0].side : foe, m.peekCount ?? v * 2, v, caster); break
    case 'revealOwnDeck': api.revealDeck(g, caster, v, caster); break
    case 'revealEnemyDeck': api.revealDeck(g, foe, v, caster); break
    case 'summonAdvanced': api.summonAdvanced(g, caster, { zones: m.summonZones, costMin: m.summonCostMin, costMax: m.summonCostMax, subtype: m.summonSubtype, count: m.summonCount, choose: m.summonChoose, names: m.summonNames }); break
    case 'selfToEnemyHand': case 'selfToOwnHand': break  // apdorojama killUnit (onDeath reroute)
    case 'returnToHand':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.returnUnitToHand(g, f.owner, f.u) }
      break
    case 'moveToGraveyard':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.killUnit(g, f.owner, f.u) }
      break
    case 'triggerCurse': {
      const tc = m.triggersCurse ?? { count: v, appliesTo: 'opponent' as const }
      const who = resolveCurseTarget(g, caster, tc.appliesTo, ctx.chosenTarget, tc.allowRandomTarget)
      api.activateCurses(g, who, tc.count ?? v, ctx.sourceName, ctx.depth + 1)
      break
    }
    case 'triggerZmk': api.drawZmkVisual(g, caster); break
    case 'removeZmkCard': {
      const who: Side = m.zmkAppliesTo === 'opponent' ? foe : caster
      api.removeZmkCard(g, who, m.zmkValue ?? '-2', v)
      break
    }
    case 'loseGoldNextTurn': api.scheduleGoldPenalty(g, targets[0]?.kind === 'player' ? targets[0].side : foe, v, ctx.sourceName); break
    case 'coinFlip': {
      const green = Math.random() < 0.5
      api.log(g, { t: 'coin', side: caster, coin: green ? 'green' : 'red', msg: green ? '🪙 Monetos metimas: ŽALIA!' : '🪙 Monetos metimas: RAUDONA!' })
      const branch = green ? (m.coinGreen ?? []) : (m.coinRed ?? [])
      for (const nm of branch) {
        applyMapping(api, g, caster, nm, { ...ctx, depth: ctx.depth + 1 })
        if (g.winner) break
      }
      break
    }
    case 'chooseEffect': {
      const opts = m.chooseOne ?? []
      if (opts.length > 0) api.chooseEffect(g, caster, ctx.sourceName, opts.map((x) => x.mappings), opts.map((x) => x.label))
      break
    }
    case 'tutorToHand': api.tutorToHand(g, caster, { zone: m.tutorZone, spellType: m.tutorSpellType, choose: m.tutorChoose }); break
    case 'spellDiscount': api.setSpellDiscount(g, caster, v); break
    case 'buffSpellDamage': api.buffSpellDamage(g, caster, v); break
    default:
      api.log(g, { t: 'blocked', side: caster, msg: `⚠ Nepalaikomas efektas „${m.effect}" („${ctx.sourceName}") – praleidžiama.` })
      applied = false
  }

  // follow-up: curse trigger ant bet kurio efekto (jei sumapinta)
  if (applied && m.effect !== 'triggerCurse' && m.triggersCurse) {
    const tc = m.triggersCurse
    const who = resolveCurseTarget(g, caster, tc.appliesTo, ctx.chosenTarget, tc.allowRandomTarget)
    api.activateCurses(g, who, tc.count, ctx.sourceName, ctx.depth + 1)
  }
  // follow-up grandinė: „tada padaryk ir X".
  // onlyIfTargetDied – tik jei pagrindinio efekto (pavienis) taikinys žuvo (Kamuolinis žaibas).
  // sameTarget – naudoti tą patį taikinį; kitaip taikinys atsirenkamas savarankiškai.
  if (applied && m.then && m.then.length > 0 && !g.winner) {
    const singleUnit = (targets.length === 1 && targets[0].kind === 'unit') ? targets[0] : null
    const lastTargetDied = singleUnit ? !findUnit(g, singleUnit) : false
    for (const next of m.then) {
      if (next.onlyIfTargetDied && !lastTargetDied) continue
      const keep = !!next.sameTarget
      applyMapping(api, g, caster, next, {
        ...ctx,
        chosenTarget: keep ? ctx.chosenTarget : undefined,
        chosenTargets: keep ? ctx.chosenTargets : undefined,
        depth: ctx.depth + 1,
      })
      if (g.winner) break
    }
  }
  return applied
}

function resolveCurseTarget(g: GameState, caster: Side, appliesTo: string, chosen?: ResolvedTarget, allowRandom?: boolean): Side {
  const foe: Side = caster === 'you' ? 'ai' : 'you'
  switch (appliesTo) {
    case 'caster': return caster
    case 'opponent': return foe
    case 'targetOwner': return chosen && chosen.kind !== 'field' ? chosen.side : foe
    case 'chosenTarget': return chosen && chosen.kind !== 'field' ? chosen.side : foe
    case 'random': return allowRandom ? (Math.random() < 0.5 ? caster : foe) : foe
    default: return foe
  }
}

/** Pritaiko mapping'ų sąrašą pagal trigger'į (efektų eilė – iš eilės). */
export function applyMappings(api: GameApi, g: GameState, caster: Side, mappings: EffectMapping[], trigger: string, ctx: ApplyCtx): void {
  for (const m of mappings) {
    if (m.trigger !== trigger) continue
    applyMapping(api, g, caster, m, ctx)
    if (g.winner) return
  }
}

/** Kortos mapping'ai: admin gameplay > fallback iš teksto parserio. */
export function cardMappings(card: TutCard): EffectMapping[] {
  return card.mappings ?? []
}
