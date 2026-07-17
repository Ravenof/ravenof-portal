// ── Effect engine ─────────────────────────────────────────────────────────────
// Vykdo admin sumapintus EffectMapping'us. Žaidimo būsenos primityvus gauna
// per GameApi (dependency injection iš engine.ts) – jokių ciklinių importų.
// Nežinomi / nesumapinti efektai praleidžiami su warning log'u (necrashina).

import type { EffectMapping, EffectType } from './types'
import { resolveTargets, resolveMappingTargets, autoPickTarget, isMultiTarget, evalCondition, metric, pickBySelect, pickNBySelect, autoPickN, filterWounded, filterSubtype, filterFaction, type ResolvedTarget } from './targetResolver'
import type { GameState, Side, BoardUnit, BoardArtifact, TutCard, TutStatus, GameEvent } from '@/lib/tutorial/engine'
import { t as tGlobal } from '@/lib/i18n/core'

export type GameApi = {
  dealToUnit(g: GameState, target: BoardUnit, owner: Side, base: number, actor: Side, useZmk?: boolean, overflow?: boolean): void
  dealToPlayer(g: GameState, target: Side, base: number, actor: Side, useZmk?: boolean): void
  dealToArtifact(g: GameState, target: BoardArtifact, owner: Side, base: number, actor: Side): void
  healUnit(g: GameState, owner: Side, u: BoardUnit, n: number): void
  healPlayer(g: GameState, s: Side, n: number): void
  drawCards(g: GameState, s: Side, n: number): void
  drawAdvanced(g: GameState, s: Side, opts: { count: number; fromGraveyard?: boolean; cardType?: string; keep?: number }): void
  reviveCards(g: GameState, s: Side, cards: TutCard[]): void
  discardCards(g: GameState, s: Side, n: number): void
  killUnit(g: GameState, owner: Side, u: BoardUnit): void
  destroyArtifact(g: GameState, owner: Side, uid: string): void
  applyStatus(g: GameState, owner: Side, u: BoardUnit, st: TutStatus): void
  buffUnit(g: GameState, owner: Side, u: BoardUnit, atk: number, hp: number, duration?: 'permanent' | 'endOfTurn' | 'untilNextTurn' | 'thisAttack'): void
  gainGold(g: GameState, s: Side, n: number, srcName: string): void
  loseGold(g: GameState, s: Side, n: number, srcName: string): void
  scheduleGoldPenalty(g: GameState, s: Side, n: number, srcName: string): void
  counterCurrentSpell(g: GameState, srcName: string): void
  returnUnitToHand(g: GameState, owner: Side, u: BoardUnit): void
  summonFromZone(g: GameState, s: Side, zone: 'hand' | 'deck' | 'discard', opts?: { costMax?: number; subtype?: string; factionId?: number; count?: number }): void
  activateCurses(g: GameState, target: Side, count: number, srcName: string, depth: number): void
  drawZmkVisual(g: GameState, s: Side): void
  removeZmkCard(g: GameState, s: Side, value: string, count: number): void
  setSpellDiscount(g: GameState, s: Side, n: number): void
  setTurnCostDiscount(g: GameState, s: Side, amount: number, floor: number): void
  addCardCostMod(g: GameState, s: Side, delta: number, cardType: string | null): void
  buffSpellDamage(g: GameState, s: Side, n: number): void
  tutorToHand(g: GameState, s: Side, opts: { zone?: 'deck' | 'discard' | 'both'; spellType?: string; cardType?: string; choose?: boolean }): void
  chooseEffect(g: GameState, caster: Side, sourceName: string, branches: EffectMapping[][], labels: string[], chooser?: Side): void
  millDeck(g: GameState, s: Side, n: number): void
  returnGraveyardToDeck(g: GameState, s: Side, n: number): void
  peekDiscard(g: GameState, victim: Side, peekCount: number, choose: number, caster: Side): void
  revealDeck(g: GameState, whoseDeck: Side, count: number, caster: Side): void
  summonAdvanced(g: GameState, s: Side, opts: { zones?: ('hand' | 'deck' | 'discard')[]; costMin?: number; costMax?: number; subtype?: string; factionId?: number; count?: number; choose?: boolean; names?: string }): void
  copyEffectFromGraveyard(g: GameState, s: Side, sourceUid: string | undefined, sourceName: string, fromSide: 'own' | 'enemy' | 'any'): void
  activateGraveyardLastwish(g: GameState, s: Side, sourceUid: string | undefined, sourceName: string, fromSide: 'own' | 'enemy' | 'any', repeatOnDeath: boolean): void
  takeControlUnit(g: GameState, newOwner: Side, owner: Side, u: BoardUnit, duration: 'permanent' | 'endOfTurn' | 'untilNextTurn', srcName: string): void
  forceCurseActivation(g: GameState, victim: Side, count: number, srcName: string): void
  effectiveAtk(g: GameState, u: BoardUnit): number
  log(g: GameState, e: GameEvent): void
}

export type ApplyCtx = {
  sourceName: string
  sourceUid?: string
  chosenTarget?: ResolvedTarget
  chosenTargets?: ResolvedTarget[]   // rankinis kelių taikinių parinkimas (1/N)
  depth: number          // rekursijos apsauga follow-up trigger'iams
  chainDamage?: number       // #3: padaryta žala ankstesniame grandinės efekte
  chainDestroyedHp?: number  // #4: sunaikintų taikinių HP suma ankstesniame efekte
  chainDestroyedCards?: TutCard[]  // #1: ankstesniame efekte sunaikintos kortos (prikėlimui)
  allMappings?: EffectMapping[]  // pilnas šaltinio kortos mapping sąrašas (onDestroy „kill kreditui")
}

// onDestroy kreditas: kol vykdomas šaltinio efektas, jo sukeltos žūtys kredituojamos jam.
// killUnit (engine) pabaigoje iššauna kredituoto šaltinio onDestroy mapping'us.
export type KillCredit = { side: Side; uid?: string; name: string; mappings: EffectMapping[]; depth: number }

const MAX_DEPTH = 4
// Globali kaskados riba: apsaugo nuo begalinės rekursijos, kai trigger'iai (pvz.
// onDeath/onAnyDeath) iškviečiami su depth=0 (debuff→mirtis→deathrattle→debuff…).
const MAX_CASCADE = 200

const HARM_EFFECTS: EffectType[] = ['damage', 'destroy', 'silence', 'freeze', 'stun', 'poison', 'burn', 'debuffAttack', 'debuffHealth', 'discard', 'loseGold', 'loseGoldNextTurn', 'moveToGraveyard', 'takeControl']

// Efektai, kuriems NIEKADA nereikia rankinio taikinio (sužaidžiami iškart, be pasirinkimo).
const NO_SELECT_EFFECTS = new Set<EffectType>([
  'drawCards', 'drawUntilHand', 'gainGold', 'loseGold', 'discard', 'triggerCurse', 'triggerZmk', 'removeZmkCard',
  'mill', 'returnGraveyardToDeck', 'peekDiscard', 'revealOwnDeck', 'revealEnemyDeck',
  'selfToEnemyHand', 'selfToOwnHand', 'resurrectSelf', 'summonAdvanced', 'summonFromHand', 'summonFromDeck',
  'summonFromGraveyard', 'revive', 'chooseEffect', 'tutorToHand', 'spellDiscount', 'cardCostMod', 'buffSpellDamage',
  'coinFlip', 'loseGoldNextTurn', 'copyEffectFromGraveyard', 'forceCurseActivation',
  'activateLastwishFromGraveyard', 'turnCostDiscount',
])

export function effectIntent(e: EffectType): 'harm' | 'help' {
  return HARM_EFFECTS.includes(e) ? 'harm' : 'help'
}

/** Ar mapping'ui reikia žaidėjo pasirinkti taikinį UI'juje? */
export function mappingNeedsSelection(m: EffectMapping): boolean {
  if (m.target === 'castSpell' || (m.targetTypes?.includes('castSpell') ?? false)) return false
  if (NO_SELECT_EFFECTS.has(m.effect)) return false
  if (m.targetTypes && m.targetTypes.length > 0) return !m.applyToAllTypes && m.requiresSelection !== false
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
    api.log(g, { t: 'blocked', side: caster, key: 'battleLog.chainTooDeep', params: { src: ctx.sourceName } })
    return false
  }
  // Globali kaskados apsauga (depth=0 reset'ai per killUnit→onDeath neapsaugo nuo ciklų).
  const gg = g as unknown as { __fxCascade?: number; __fxProjectile?: string }
  if ((gg.__fxCascade ?? 0) > MAX_CASCADE) {
    api.log(g, { t: 'blocked', side: caster, key: 'battleLog.chainTooLong', params: { src: ctx.sourceName } })
    return false
  }
  gg.__fxCascade = (gg.__fxCascade ?? 0) + 1
  // Elemento perdavimas FX'ui: žalos log'ai per šį efektą gaus m.projectile (battlecry/čempionas/burtas).
  const prevProj = gg.__fxProjectile
  if (m.projectile && m.projectile !== 'none') gg.__fxProjectile = m.projectile
  // onDestroy kreditas: jei šaltinio korta turi onDestroy mapping'ų, jos efektų sukeltos
  // žūtys (dealToUnit/killUnit viduje) kredituojamos šiam šaltiniui (žr. engine killUnit).
  const gk = g as unknown as { __killCredit?: KillCredit }
  const prevKc = gk.__killCredit
  if (m.trigger !== 'onDestroy' && ctx.allMappings?.some((x) => x.trigger === 'onDestroy')) {
    gk.__killCredit = { side: caster, uid: ctx.sourceUid, name: ctx.sourceName, mappings: ctx.allMappings, depth: ctx.depth }
  }
  try {
    return applyMappingInner(api, g, caster, m, ctx)
  } finally {
    gg.__fxCascade = (gg.__fxCascade ?? 1) - 1
    gg.__fxProjectile = prevProj
    gk.__killCredit = prevKc
  }
}

function applyMappingInner(api: GameApi, g: GameState, caster: Side, m: EffectMapping, ctx: ApplyCtx): boolean {
  // Sąlyga: jei netenkinama – mapping praleidžiamas tyliai (naudojama fallback porai).
  if (m.condition && !evalCondition(g, caster, m.condition)) return false

  // Taikinys „dabar žaidžiamas burtas" (castSpell): nutildo/atšaukia žaidžiamą burtą.
  if (m.target === 'castSpell' || (m.targetTypes?.includes('castSpell') ?? false)) {
    if (g.rollContext?.kind === 'spell') api.counterCurrentSpell(g, ctx.sourceName)
    else api.log(g, { t: 'blocked', side: caster, key: 'battleLog.noSpellToCounter', params: { src: ctx.sourceName } })
    return true
  }

  // Reikšmė: dinaminė (base + perEach * metrika) arba fiksuota.
  const dvs = m.dynamicValue?.source
  const dvMetric = dvs === 'lastDamageDealt' ? (ctx.chainDamage ?? 0)
    : dvs === 'destroyedTargetsHp' ? (ctx.chainDestroyedHp ?? 0)
    : (dvs ? metric(g, caster, dvs) : 0)
  const v = m.dynamicValue
    ? Math.max(0, Math.round(m.dynamicValue.base + m.dynamicValue.perEach * dvMetric))
    : (m.value ?? 1)

  // taikinių parinkimas
  let targets: ResolvedTarget[]
  if (m.targetSummoned) {
    const uid = (g as unknown as { __lastSummonedUid?: string }).__lastSummonedUid
    let t: ResolvedTarget | null = null
    if (uid) for (const sd of ['you', 'ai'] as Side[]) { const pp = sd === 'you' ? g.you : g.ai; if (pp.units.some((x) => x?.uid === uid)) { t = { kind: 'unit', side: sd, uid }; break } }
    targets = t ? [t] : []
  } else if (m.target === 'selfUnit') {
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
    const aoe = hasTypes ? !!m.applyToAllTypes : isMultiTarget(m.target)  // union: AoE tik jei aiškiai pasirinkta, kitaip – 1 taikinys (ARBA)
    if (ctx.chosenTargets && ctx.chosenTargets.length > 0 && !aoe) {
      targets = ctx.chosenTargets
    } else if (ctx.chosenTarget && !aoe) {
      targets = [ctx.chosenTarget]
    } else {
      let all = hasTypes ? resolveMappingTargets(g, caster, m) : resolveTargets(g, caster, m.target)
      if (m.targetWoundedOnly) all = filterWounded(g, all)
      if (m.targetSubtype) all = filterSubtype(g, all, m.targetSubtype)
      if (m.targetFaction) all = filterFaction(g, all, m.targetFaction)
      if (aoe) targets = all
      else {
        const n = Math.max(1, m.hitCount ?? 1)
        if (m.targetSelect) targets = pickNBySelect(g, all, m.targetSelect, n)
        else targets = autoPickN(g, caster, all, effectIntent(m.effect), n, m.allowRandomTarget)
      }
    }
  }
  if (targets.length === 0 && !['drawCards', 'drawUntilHand', 'gainGold', 'loseGold', 'discard', 'triggerCurse', 'triggerZmk', 'removeZmkCard', 'mill', 'returnGraveyardToDeck', 'peekDiscard', 'revealOwnDeck', 'revealEnemyDeck', 'selfToEnemyHand', 'selfToOwnHand', 'resurrectSelf', 'summonAdvanced', 'summonFromHand', 'summonFromDeck', 'summonFromGraveyard', 'chooseEffect', 'tutorToHand', 'spellDiscount', 'cardCostMod', 'buffSpellDamage', 'coinFlip', 'loseGoldNextTurn', 'reflectToAttacker', 'forceCurseActivation', 'activateLastwishFromGraveyard', 'turnCostDiscount'].includes(m.effect)) {
    api.log(g, { t: 'blocked', side: caster, key: 'battleLog.noValidTarget', params: { src: ctx.sourceName } })
    return false
  }

  const foe: Side = caster === 'you' ? 'ai' : 'you'
  let applied = true
  let chainDamage = 0        // #3
  let chainDestroyedHp = 0   // #4
  const chainDestroyedCards: TutCard[] = []  // #1

  switch (m.effect) {
    case 'damage': {
      const useZmk = m.triggersZmk !== false
      // Burtų žalos priedas dabar TIK pasyvi aura (auraSpellDamage – kol kūrinys kovos lauke),
      // pridedama dealToUnit/dealToPlayer per spellAuraBonusFor. Jokio nuolatinio kaupiamo priedo.
      const dv = v
      for (const t of targets) {
        if (t.kind === 'player') { api.dealToPlayer(g, t.side, dv, caster, useZmk); chainDamage += dv }
        else if (t.kind === 'artifact') {
          const p = t.side === 'you' ? g.you : g.ai
          const a = p.artifacts.find((x) => x?.uid === t.uid)
          if (a) { api.dealToArtifact(g, a, t.side, dv, caster); chainDamage += dv }
        } else {
          const f = findUnit(g, t)
          if (f) { api.dealToUnit(g, f.u, f.owner, dv, caster, useZmk, !!m.overflowToPlayer); chainDamage += dv }
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
        if (t.kind === 'unit') { const f = findUnit(g, t); if (f) { chainDestroyedHp += Math.max(0, f.u.hp); chainDestroyedCards.push(f.u.card); api.killUnit(g, f.owner, f.u) } }
        else if (t.kind === 'artifact') api.destroyArtifact(g, t.side, t.uid)
      }
      break
    case 'cleanse': {
      // Vienkartinis būsenų nuėmimas (pvz. „kibiras vandens" nuima Degantį).
      // cleanseStatuses tuščias => visos NEIGIAMOS (frozen/burning/poisoned/stunned/silenced).
      const NEG: TutStatus[] = ['frozen', 'burning', 'poisoned', 'stunned', 'silenced']
      const pick: TutStatus[] = (m.cleanseStatuses && m.cleanseStatuses.length > 0 ? m.cleanseStatuses : NEG) as TutStatus[]
      for (const t of targets) {
        const f = findUnit(g, t)
        if (!f) continue
        const removed: string[] = []
        for (const st of pick) {
          if (f.u.statuses[st] != null) {
            delete f.u.statuses[st]; removed.push(tGlobal(`statusEffects.${st}.name`))
            // Status VFX: kiekvienai nuimtai būsenai atskiras destroy įvykis
            api.log(g, { t: 'status', side: f.owner, cardName: f.u.card.name, statusEvt: 'destroy', statusId: st, src: { side: f.owner, uid: f.u.uid }, key: 'battleLog.statusCleansedOne', params: { status: `$t:statusEffects.${st}.name` } })
          }
        }
        if (removed.length > 0) api.log(g, { t: 'status', side: f.owner, cardName: f.u.card.name, key: 'battleLog.statusCleansed', params: { card: f.u.card.name, statuses: removed.join(', ') } })
        else api.log(g, { t: 'status', side: f.owner, cardName: f.u.card.name, key: 'battleLog.statusCleanseNone', params: { card: f.u.card.name } })
      }
      break
    }
    case 'silence': case 'freeze': case 'stun': case 'poison': case 'burn': {
      const map: Record<string, TutStatus> = { silence: 'silenced', freeze: 'frozen', stun: 'stunned', poison: 'poisoned', burn: 'burning' }
      for (const t of targets) { const f = findUnit(g, t); if (f) api.applyStatus(g, f.owner, f.u, map[m.effect]) }
      break
    }
    case 'taunt': case 'stealth': case 'shield': case 'sprint':
      for (const t of targets) {
        const f = findUnit(g, t)
        if (!f) continue
        if (m.effect === 'shield') f.u.shield = true
        else if (m.effect === 'stealth') f.u.stealth = true
        else if (m.effect === 'sprint') { if (!f.u.card.keywords.includes('sprint')) f.u.card.keywords.push('sprint') }
        else if (!f.u.card.keywords.includes('taunt')) f.u.card.keywords.push('taunt')
        api.log(g, { t: 'buff', side: f.owner, cardName: f.u.card.name, statusEvt: 'apply', statusId: m.effect, src: { side: f.owner, uid: f.u.uid }, key: 'battleLog.keywordGained', params: { card: f.u.card.name, keyword: `$t:statusEffects.${m.effect}.name` } })
      }
      break
    case 'buffAttack':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.buffUnit(g, f.owner, f.u, v, 0, m.buffDuration) }
      break
    case 'buffHealth':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.buffUnit(g, f.owner, f.u, 0, v, m.buffDuration) }
      break
    case 'debuffAttack':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.buffUnit(g, f.owner, f.u, -v, 0) }
      break
    case 'debuffHealth':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.buffUnit(g, f.owner, f.u, 0, -v) }
      break
    case 'drawCards': {
      const sides: Side[] = m.drawAppliesTo === 'opponent' ? [foe] : m.drawAppliesTo === 'both' ? [caster, foe] : [caster]
      for (const sd of sides) {
        if (m.drawFromGraveyard || m.drawCardType || m.drawKeep != null) api.drawAdvanced(g, sd, { count: v, fromGraveyard: m.drawFromGraveyard, cardType: m.drawCardType, keep: m.drawKeep })
        else api.drawCards(g, sd, v)
      }
      break
    }
    case 'drawUntilHand': {
      const sides: Side[] = m.drawAppliesTo === 'opponent' ? [foe] : m.drawAppliesTo === 'both' ? [caster, foe] : [caster]
      for (const sd of sides) { const h = (sd === 'you' ? g.you : g.ai).hand.length; const need = Math.max(0, v - h); if (need > 0) api.drawCards(g, sd, need) }
      break
    }
    case 'discard': api.discardCards(g, targets[0]?.kind === 'player' ? targets[0].side : foe, v); break
    case 'gainGold': api.gainGold(g, m.goldAppliesTo === 'opponent' ? foe : m.goldAppliesTo === 'caster' ? caster : (targets[0]?.kind === 'player' ? targets[0].side : caster), v, ctx.sourceName); break
    case 'loseGold': api.loseGold(g, m.goldAppliesTo === 'caster' ? caster : m.goldAppliesTo === 'opponent' ? foe : (targets[0]?.kind === 'player' ? targets[0].side : foe), v, ctx.sourceName); break
    case 'cardCostMod': api.addCardCostMod(g, m.costModAppliesTo === 'opponent' ? foe : caster, m.costModDelta ?? v, (m.costModCardType && m.costModCardType !== 'any') ? m.costModCardType : null); break
    case 'summonFromHand': m.summonChoose ? api.summonAdvanced(g, caster, { zones: ['hand'], costMax: m.summonCostMax, subtype: m.summonSubtype, factionId: m.summonFaction, count: m.summonCount, choose: true }) : api.summonFromZone(g, caster, 'hand', { costMax: m.summonCostMax, subtype: m.summonSubtype, factionId: m.summonFaction, count: m.summonCount }); break
    case 'summonFromDeck': m.summonChoose ? api.summonAdvanced(g, caster, { zones: ['deck'], costMax: m.summonCostMax, subtype: m.summonSubtype, factionId: m.summonFaction, count: m.summonCount, choose: true }) : api.summonFromZone(g, caster, 'deck', { costMax: m.summonCostMax, subtype: m.summonSubtype, factionId: m.summonFaction, count: m.summonCount }); break
    case 'summonFromGraveyard': case 'revive': {
      const reviveSide: Side = m.reviveToSide === 'enemy' ? foe : caster
      if (m.reviveDestroyedTarget) api.reviveCards(g, reviveSide, ctx.chainDestroyedCards ?? [])
      else if (m.summonChoose) api.summonAdvanced(g, caster, { zones: ['discard'], costMax: m.summonCostMax, subtype: m.summonSubtype, factionId: m.summonFaction, count: m.summonCount, choose: true })
      else api.summonFromZone(g, caster, 'discard', { costMax: m.summonCostMax, subtype: m.summonSubtype, factionId: m.summonFaction, count: m.summonCount })
      break
    }
    case 'mill': api.millDeck(g, targets[0]?.kind === 'player' ? targets[0].side : caster, v); break
    case 'returnGraveyardToDeck': api.returnGraveyardToDeck(g, targets[0]?.kind === 'player' ? targets[0].side : caster, v); break
    case 'peekDiscard': api.peekDiscard(g, targets[0]?.kind === 'player' ? targets[0].side : foe, m.peekCount ?? v * 2, v, caster); break
    case 'revealOwnDeck': api.revealDeck(g, caster, v, caster); break
    case 'revealEnemyDeck': api.revealDeck(g, foe, v, caster); break
    case 'summonAdvanced': api.summonAdvanced(g, caster, { zones: m.summonZones, costMin: m.summonCostMin, costMax: m.summonCostMax, subtype: m.summonSubtype, factionId: m.summonFaction, count: m.summonCount, choose: m.summonChoose, names: m.summonNames }); break
    case 'selfToEnemyHand': case 'selfToOwnHand': break  // apdorojama killUnit (onDeath reroute)
    case 'resurrectSelf': break  // apdorojama killUnit (prisikėlimas vietoje mirties)
    case 'returnToHand':
      for (const t of targets) { const f = findUnit(g, t); if (f) api.returnUnitToHand(g, f.owner, f.u) }
      break
    case 'moveToGraveyard':
      for (const t of targets) { const f = findUnit(g, t); if (f) { chainDestroyedHp += Math.max(0, f.u.hp); chainDestroyedCards.push(f.u.card); api.killUnit(g, f.owner, f.u) } }
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
      api.log(g, { t: 'coin', side: caster, coin: green ? 'green' : 'red', key: green ? 'battleLog.coin.green' : 'battleLog.coin.red' })
      const branch = green ? (m.coinGreen ?? []) : (m.coinRed ?? [])
      for (const nm of branch) {
        applyMapping(api, g, caster, nm, { ...ctx, depth: ctx.depth + 1 })
        if (g.winner) break
      }
      break
    }
    case 'chooseEffect': {
      const opts = m.chooseOne ?? []
      if (opts.length > 0) {
        const chooser: Side = m.chooseBy === 'opponent' ? (caster === 'you' ? 'ai' : 'you') : caster
        api.chooseEffect(g, caster, ctx.sourceName, opts.map((x) => x.mappings), opts.map((x) => x.label), chooser)
      }
      break
    }
    case 'tutorToHand': api.tutorToHand(g, caster, { zone: m.tutorZone, spellType: m.tutorSpellType, cardType: m.tutorCardType, choose: m.tutorChoose }); break
    case 'copyEffectFromGraveyard': api.copyEffectFromGraveyard(g, caster, ctx.sourceUid, ctx.sourceName, m.copyFromSide ?? 'any'); break
    case 'activateLastwishFromGraveyard': api.activateGraveyardLastwish(g, caster, ctx.sourceUid, ctx.sourceName, m.copyFromSide ?? 'any', m.glwRepeatOnDeath !== false); break
    case 'turnCostDiscount': api.setTurnCostDiscount(g, m.costModAppliesTo === 'opponent' ? foe : caster, v, Math.max(0, m.costFloor ?? 0)); break
    case 'reflectToAttacker': {
      // onAttacked reakcijai (su „efektas į atakuotoją" / useAttackTarget): sunaikina puolantį padarą
      // ir atspindi jo ATK į jo žaidėją.
      const atkRef = ctx.chosenTarget
      if (atkRef && atkRef.kind === 'unit') {
        const f = findUnit(g, atkRef)
        if (f) {
          const refl = api.effectiveAtk(g, f.u)
          if (refl > 0) api.dealToPlayer(g, f.owner, refl, caster, false)
          api.killUnit(g, f.owner, f.u)
        }
      } else {
        api.log(g, { t: 'blocked', side: caster, key: 'battleLog.noAttacker', params: { src: ctx.sourceName } })
      }
      break
    }
    case 'forceCurseActivation': {
      // Priverstinė prakeiksmo aktyvacija iš kaladės (default – priešininko).
      const who: Side = targets[0]?.kind === 'player' ? targets[0].side : foe
      api.forceCurseActivation(g, who, v, ctx.sourceName)
      break
    }
    case 'takeControl':
      // Perimti priešo padarą: perkeliamas į kerėtojo pusę. Trukmė – buffDuration
      // (permanent / endOfTurn / untilNextTurn; grąžinimą tvarko engine ėjimo ribose).
      for (const t of targets) {
        const f = findUnit(g, t)
        if (f) api.takeControlUnit(g, caster, f.owner, f.u, (m.buffDuration === 'thisAttack' ? 'permanent' : m.buffDuration) ?? 'permanent', ctx.sourceName)
      }
      break
    case 'spellDiscount': api.setSpellDiscount(g, caster, v); break
    case 'buffSpellDamage': api.buffSpellDamage(g, caster, v); break
    default:
      api.log(g, { t: 'blocked', side: caster, key: 'battleLog.unsupportedEffect', params: { effect: m.effect, src: ctx.sourceName } })
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
        chainDamage,
        chainDestroyedHp,
        chainDestroyedCards,
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
  if (!ctx.allMappings) ctx = { ...ctx, allMappings: mappings }
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
