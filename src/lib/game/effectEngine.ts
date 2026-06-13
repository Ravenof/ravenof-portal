// ── Effect engine ─────────────────────────────────────────────────────────────
// Vykdo admin sumapintus EffectMapping'us. Žaidimo būsenos primityvus gauna
// per GameApi (dependency injection iš engine.ts) – jokių ciklinių importų.
// Nežinomi / nesumapinti efektai praleidžiami su warning log'u (necrashina).

import type { EffectMapping, EffectType } from './types'
import { resolveTargets, autoPickTarget, isMultiTarget, type ResolvedTarget } from './targetResolver'
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
  returnUnitToHand(g: GameState, owner: Side, u: BoardUnit): void
  summonFromZone(g: GameState, s: Side, zone: 'hand' | 'deck' | 'discard'): void
  activateCurses(g: GameState, target: Side, count: number, srcName: string, depth: number): void
  drawZmkVisual(g: GameState, s: Side): void
  log(g: GameState, e: GameEvent): void
}

export type ApplyCtx = {
  sourceName: string
  sourceUid?: string
  chosenTarget?: ResolvedTarget
  depth: number          // rekursijos apsauga follow-up trigger'iams
}

const MAX_DEPTH = 4

const HARM_EFFECTS: EffectType[] = ['damage', 'destroy', 'silence', 'freeze', 'stun', 'poison', 'burn', 'debuffAttack', 'debuffHealth', 'discard', 'loseGold', 'moveToGraveyard']

export function effectIntent(e: EffectType): 'harm' | 'help' {
  return HARM_EFFECTS.includes(e) ? 'harm' : 'help'
}

/** Ar mapping'ui reikia žaidėjo pasirinkti taikinį UI'juje? */
export function mappingNeedsSelection(m: EffectMapping): boolean {
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
  const v = m.value ?? 1

  // taikinių parinkimas
  let targets: ResolvedTarget[]
  if (ctx.chosenTarget && !isMultiTarget(m.target)) {
    targets = [ctx.chosenTarget]
  } else {
    const all = resolveTargets(g, caster, m.target)
    if (isMultiTarget(m.target)) targets = all
    else {
      const picked = autoPickTarget(g, caster, all, effectIntent(m.effect), m.allowRandomTarget)
      targets = picked ? [picked] : []
    }
  }
  if (targets.length === 0 && !['drawCards', 'gainGold', 'loseGold', 'discard', 'triggerCurse', 'triggerZmk', 'summonFromHand', 'summonFromDeck', 'summonFromGraveyard'].includes(m.effect)) {
    api.log(g, { t: 'blocked', side: caster, msg: `„${ctx.sourceName}": nėra galiojančio taikinio – efekto dalis neįvyksta.` })
    return false
  }

  const foe: Side = caster === 'you' ? 'ai' : 'you'
  let applied = true

  switch (m.effect) {
    case 'damage': {
      const useZmk = m.triggersZmk !== false
      for (const t of targets) {
        if (t.kind === 'player') api.dealToPlayer(g, t.side, v, caster, useZmk)
        else if (t.kind === 'artifact') {
          const p = t.side === 'you' ? g.you : g.ai
          const a = p.artifacts.find((x) => x?.uid === t.uid)
          if (a) api.dealToArtifact(g, a, t.side, v, caster)
        } else {
          const f = findUnit(g, t)
          if (f) api.dealToUnit(g, f.u, f.owner, v, caster, useZmk)
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
    case 'summonFromHand': api.summonFromZone(g, caster, 'hand'); break
    case 'summonFromDeck': api.summonFromZone(g, caster, 'deck'); break
    case 'summonFromGraveyard': case 'revive': api.summonFromZone(g, caster, 'discard'); break
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
