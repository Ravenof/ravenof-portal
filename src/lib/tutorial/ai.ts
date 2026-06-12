// ── Tutorial AI oponentas ─────────────────────────────────────────────────────
// Euristinis AI, žaidžiantis pagal taisykles: iškviečia padarus, naudoja
// burtus/artefaktus/reakcijas, aukoja Čempionui, atakuoja gerbdamas
// Pasišaipymą, išmeta kortą dėl aukso. UI kviečia aiNextAction() kas ~900ms,
// kol grąžinama null – tada baigiamas ėjimas.

import {
  GameState, TutCard, BoardUnit, TargetRef, P, other,
  playCard, attack, discardForGold, useChampionAbility,
  canUnitAttack, legalTargets, effectiveAtk, canAfford,
} from './engine'

export type AiAction =
  | { kind: 'play'; cardName: string }
  | { kind: 'attack'; cardName: string }
  | { kind: 'ability' }
  | { kind: 'discardGold'; cardName: string }
  | null

/** Atlieka VIENĄ geriausią AI veiksmą (mutuoja state). null – nebėra ką daryti. */
export function aiNextAction(g: GameState): AiAction {
  if (g.winner || g.active !== 'ai') return null
  const me = P(g, 'ai')
  const foe = P(g, 'you')

  // 1) Čempiono gebėjimas (jei yra ir nepanaudotas)
  const champ = me.units.find((u) => u?.isChampion && !u.abilityUsed && !u.statuses.silenced && !u.statuses.frozen && !u.statuses.stunned)
  if (champ) {
    const target = bestAbilityTarget(g)
    const r = useChampionAbility(g, 'ai', { target })
    if (r.ok) return { kind: 'ability' }
  }

  // 2) Atakos – pirmiausia naudinga prekyba, tada veidas
  for (const u of me.units) {
    if (!u) continue
    if (!canUnitAttack(g, 'ai', u).ok) continue
    const target = pickAttackTarget(g, u)
    if (target) {
      const r = attack(g, 'ai', u.uid, target)
      if (r.ok) return { kind: 'attack', cardName: u.card.name }
    }
  }

  // 3) Kortų žaidimas – brangiausias įperkamas padaras pirmiausia
  const playable = me.hand
    .filter((c) => canAfford(g, 'ai', c) && c.type !== 'curse')
    .sort((a, b) => b.gold - a.gold)

  for (const c of playable) {
    if (c.type === 'unit') {
      if (me.units.some((u) => u === null)) {
        const target = c.keywords.includes('battlecry') && c.effect?.targeted ? bestDamageTarget(g, c.effect.damage ?? 1) : undefined
        const r = playCard(g, 'ai', c.uid, { target })
        if (r.ok) return { kind: 'play', cardName: c.name }
      }
    } else if (c.type === 'spell') {
      const target = goodSpellTarget(g, c)
      if (target !== 'skip') {
        const r = playCard(g, 'ai', c.uid, { target: target ?? undefined })
        if (r.ok) return { kind: 'play', cardName: c.name }
      }
    } else if (c.type === 'artifact') {
      if (me.artifacts.some((a) => a === null)) {
        const r = playCard(g, 'ai', c.uid)
        if (r.ok) return { kind: 'play', cardName: c.name }
      }
    } else if (c.type === 'reaction') {
      if (me.reactions.some((x) => x === null) && me.gold >= c.gold + 100) {
        const r = playCard(g, 'ai', c.uid)
        if (r.ok) return { kind: 'play', cardName: c.name }
      }
    } else if (c.type === 'field') {
      if (!g.field || g.field.owner === 'you') {
        const r = playCard(g, 'ai', c.uid)
        if (r.ok) return { kind: 'play', cardName: c.name }
      }
    } else if (c.type === 'champion') {
      const sac = cheapestSacrifice(me.units)
      const hasChamp = me.units.some((u) => u?.isChampion)
      // iškviesti tik jei yra ką aukoti ir lauke >= 2 padarai (kad neliktų tuščio stalo)
      if (sac && (hasChamp || me.units.filter((u) => u && !u.isChampion).length >= 2)) {
        const r = playCard(g, 'ai', c.uid, { sacrificeUid: sac.uid })
        if (r.ok) return { kind: 'play', cardName: c.name }
      }
    }
  }

  // 4) Išmesti pigiausią nereikalingą kortą dėl aukso, jei tai atrakina žaidimą
  if (!me.discardedForGold && me.hand.length > 2) {
    const cheapestUnplayable = [...me.hand].sort((a, b) => a.gold - b.gold)[0]
    const wouldEnable = me.hand.some((c) => c.uid !== cheapestUnplayable.uid && c.gold === me.gold + 100 && c.type !== 'curse')
    if (wouldEnable) {
      const r = discardForGold(g, 'ai', cheapestUnplayable.uid)
      if (r.ok) {
        // iškart bandome žaisti atrakintą kortą kitame žingsnyje
        return { kind: 'discardGold', cardName: cheapestUnplayable.name }
      }
    }
  }

  void foe
  return null
}

// ── Taikinių parinkimas ───────────────────────────────────────────────────────

function pickAttackTarget(g: GameState, u: BoardUnit): TargetRef | null {
  const targets = legalTargets(g, 'ai')
  if (targets.length === 0) return null
  const atk = effectiveAtk(g, u)
  const foe = P(g, 'you')

  const unitTargets = targets.filter((t) => t.kind === 'unit') as Extract<TargetRef, { kind: 'unit' }>[]
  // Pasišaipymas priverstinis – legalTargets jau atfiltravo
  const tauntForced = unitTargets.length > 0 && targets.every((t) => t.kind === 'unit')

  // Mirtinas smūgis į veidą?
  const canFace = targets.some((t) => t.kind === 'player')
  if (canFace && atk >= foe.hp) return { kind: 'player', side: 'you' }

  // Naudinga prekyba: nužudo priešo padarą ir pats išgyvena (tikėtina žala be ŽMK)
  let best: { t: TargetRef; score: number } | null = null
  for (const t of unitTargets) {
    const def = foe.units.find((x) => x?.uid === t.uid)
    if (!def) continue
    const defAtk = def.isChampion ? 0 : effectiveAtk(g, def)
    const kills = atk >= def.hp
    const survives = def.statuses.frozen || defAtk < u.hp
    let score = 0
    if (kills && survives) score = 100 + defAtk * 5 - u.atk
    else if (kills) score = 50 + defAtk * 5
    else if (def.isChampion) score = 30
    else score = defAtk >= u.hp ? -10 : 5
    if (def.card.keywords.includes('taunt')) score += 8
    if (!best || score > best.score) best = { t, score }
  }
  if (tauntForced) return best?.t ?? unitTargets[0]
  // Jei nėra geros prekybos – muša veidą
  if (best && best.score >= 50) return best.t
  if (canFace) return { kind: 'player', side: 'you' }
  return best?.t ?? targets[0]
}

function bestDamageTarget(g: GameState, dmg: number): TargetRef | undefined {
  const foe = P(g, 'you')
  const killable = foe.units
    .filter((u): u is BoardUnit => !!u && !u.stealth && u.hp <= dmg)
    .sort((a, b) => effectiveAtk(g, b) - effectiveAtk(g, a))[0]
  if (killable) return { kind: 'unit', side: 'you', uid: killable.uid }
  const strongest = foe.units
    .filter((u): u is BoardUnit => !!u && !u.stealth)
    .sort((a, b) => effectiveAtk(g, b) - effectiveAtk(g, a))[0]
  if (strongest) return { kind: 'unit', side: 'you', uid: strongest.uid }
  return { kind: 'player', side: 'you' }
}

function bestAbilityTarget(g: GameState): TargetRef | undefined {
  const me = P(g, 'ai')
  const champ = me.units.find((u) => u?.isChampion)
  const e = champ?.card.effect
  if (e?.heal) {
    const hurt = me.units.filter((u): u is BoardUnit => !!u && u.hp < u.maxHp).sort((a, b) => a.hp - b.hp)[0]
    if (hurt) return { kind: 'unit', side: 'ai', uid: hurt.uid }
    return { kind: 'player', side: 'ai' }
  }
  return bestDamageTarget(g, e?.damage ?? 1)
}

/** 'skip' – burtas dabar nenaudingas, geriau palaikyti. */
function goodSpellTarget(g: GameState, c: TutCard): TargetRef | null | 'skip' {
  const e = c.effect
  if (!e) return null // efektas neatpažintas – žaidžiam šiaip (tutorial)
  const me = P(g, 'ai')
  const foe = P(g, 'you')
  if (e.damage) {
    if (e.aoe) return foe.units.some((u) => u) ? null : 'skip'
    const t = bestDamageTarget(g, e.damage)
    return t ?? 'skip'
  }
  if (e.heal) {
    const hurtUnit = me.units.find((u) => u && u.hp < u.maxHp)
    if (hurtUnit) return { kind: 'unit', side: 'ai', uid: hurtUnit.uid }
    if (me.hp < me.maxHp - 3) return { kind: 'player', side: 'ai' }
    return 'skip'
  }
  if (e.buffAtk || e.buffHp) {
    const mine = me.units.filter((u): u is BoardUnit => !!u && !u.isChampion).sort((a, b) => b.atk - a.atk)[0]
    return mine ? { kind: 'unit', side: 'ai', uid: mine.uid } : 'skip'
  }
  if (e.status) {
    const strongest = foe.units.filter((u): u is BoardUnit => !!u && !u.stealth).sort((a, b) => effectiveAtk(g, b) - effectiveAtk(g, a))[0]
    return strongest ? { kind: 'unit', side: 'you', uid: strongest.uid } : 'skip'
  }
  return null // draw / gold – visada gerai
}

function cheapestSacrifice(units: (BoardUnit | null)[]): BoardUnit | null {
  const c = units
    .filter((u): u is BoardUnit => !!u && !u.isChampion)
    .sort((a, b) => (a.atk + a.hp) - (b.atk + b.hp))[0]
  return c ?? null
}

export { other }
