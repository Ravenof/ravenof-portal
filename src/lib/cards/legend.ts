// ════════════════════════════════════════════════════════════════════════════
// Kortos legenda šalia padidintos kortos (playtest 2026-09-19/20).
// Rodo TIK: kortos tipą + raktažodžius + trigger'ius + efektų tipų ženkliukus
// (tie patys 🔥❄️⚡… ženkliukai, kurie spausdinami ant kortų – žr. /rules/effects/*.png).
// Kaina / puolimas / gyvybės NErodomi (Donatas: perteklinė info).
// Viskas išvedama iš gameplay konfigo (effectMappings, championSkillConfig,
// artifactEffectConfig, fieldEffectConfig, passiveAura, synergy, keywords).
// ════════════════════════════════════════════════════════════════════════════
import type { TutCard } from '@/lib/tutorial/engine'
import { TRIGGER_TYPES, type EffectMapping, type EffectType, type TriggerType, type SpellType } from '@/lib/game/types'

export type LegendEntry = {
  k: string
  name: string
  tip: string
  /** ikona iš ICON_BASE (raktažodžiai) */
  icon?: string
  /** pilnas kelias (efektų tipų ženkliukai /rules/effects/*.png) */
  img?: string
  /** emoji fallback, kai nėra paveiksliuko */
  emoji?: string
}

type T = (key: string, opts?: Record<string, string | number | boolean | null | undefined>) => string

/** Efektų tipų ženkliukai (kaip ant spausdintų kortų). */
export type FxGlyph = 'fire' | 'ice' | 'lightning' | 'heal' | 'buff' | 'necro' | 'debuff' | 'poison' | 'artifact' | 'trigger' | 'synergy' | 'utility' | 'stun' | 'silence' | 'coinflip'
const FX_IMG: Partial<Record<FxGlyph, string>> = {
  fire: 'fire', ice: 'ice', lightning: 'lightning', buff: 'buff', necro: 'necro', debuff: 'debuff', poison: 'poison',
  artifact: 'artifact', trigger: 'trigger', synergy: 'synergy', utility: 'utility', stun: 'stun', silence: 'silence', coinflip: 'coinflip',
}
const FX_EMOJI: Record<FxGlyph, string> = {
  fire: '🔥', ice: '❄️', lightning: '⚡', heal: '💚', buff: '⬆️', necro: '☠️', debuff: '⬇️', poison: '☣️',
  artifact: '⭐', trigger: '🔔', synergy: '🔗', utility: '🔧', stun: '💫', silence: '🔇', coinflip: '🪙',
}

const SPELL_FX: Record<SpellType, FxGlyph | null> = {
  fire: 'fire', ice: 'ice', lightning: 'lightning', necromancy: 'necro', buff: 'buff', debuff: 'debuff', functional: 'utility',
}

function effectFx(e: EffectType): FxGlyph | null {
  switch (e) {
    case 'burn': return 'fire'
    case 'freeze': return 'ice'
    case 'poison': return 'poison'
    case 'stun': return 'stun'
    case 'silence': return 'silence'
    case 'heal': case 'revive': case 'resurrectSelf': case 'cleanse': return 'heal'
    case 'buffAttack': case 'buffHealth': case 'shield': case 'taunt': case 'stealth': case 'sprint': case 'buffSpellDamage': return 'buff'
    case 'debuffAttack': case 'debuffHealth': return 'debuff'
    case 'destroy': case 'summonFromGraveyard': case 'mill': case 'moveToGraveyard': case 'returnGraveyardToDeck':
    case 'copyEffectFromGraveyard': case 'castEffectFromGraveyard': case 'activateLastwishFromGraveyard':
    case 'triggerCurse': case 'forceCurseActivation': return 'necro'
    case 'coinFlip': return 'coinflip'
    case 'drawCards': case 'drawUntilHand': case 'discard': case 'peekDiscard': case 'returnToHand': case 'tutorToHand':
    case 'selfToOwnHand': case 'selfToEnemyHand': case 'summonFromHand': case 'summonFromDeck': case 'summonAdvanced':
    case 'revealOwnDeck': case 'revealEnemyDeck': case 'triggerZmk': case 'removeZmkCard': case 'remapZmkValue':
    case 'discardHandAndDraw': case 'arrangeEnemyDeckTop': case 'gainGold': case 'loseGold': case 'loseGoldNextTurn':
    case 'gainGoldNextTurn': case 'spellDiscount': case 'cardCostMod': case 'turnCostDiscount': case 'chooseEffect':
    case 'takeControl': return 'utility'
    default: return null // damage, reflectToAttacker – tipą rodo burto spellType arba nieko
  }
}

/** Trigger'iai, kurie kortai yra „savaime suprantami" – jų atskirai nerodom. */
function isDefaultTrigger(c: TutCard, tr: TriggerType): boolean {
  if (c.type === 'spell' || c.type === 'curse') return tr === 'onCast' || tr === 'onPlay' || tr === 'onCurseDrawn'
  if (c.type === 'reaction') return tr === 'onCast' || tr === 'onPlay'
  if (c.type === 'artifact') return tr === 'onPlay' || tr === 'onArtifactActivated' || tr === 'onTurnStart'
  if (c.type === 'field') return tr === 'onFieldEnter' || tr === 'onPlay'
  if (c.type === 'champion') return tr === 'onChampionSkill'
  return false
}

const KW_ICON: Record<string, string> = { taunt: 'taunt', shield: 'shield_magic', stealth: 'stealth', sprint: 'sprint' }

/**
 * Sudaro legendos įrašus. `t` – i18n (battle namespace raktai perduodami pilnu keliu),
 * `statusName/statusTooltip` – raktažodžių (taunt/shield/…) vertimai iš statusEffects.
 */
export function cardLegend(c: TutCard, t: T, statusName: (k: string) => string, statusTooltip: (k: string) => string, iconBase: string): LegendEntry[] {
  const out: LegendEntry[] = []
  const seen = new Set<string>()
  const push = (e: LegendEntry) => { if (!seen.has(e.k)) { seen.add(e.k); out.push(e) } }

  // 1) Tipas
  push({ k: 'type', name: t('battle.game.legend.typeName'), tip: t(`battle.game.legend.type.${c.type}`) })

  // 2) Statiniai raktažodžiai
  const kws = new Set<string>([...c.keywords, ...((c.gameplay?.keywords ?? []) as string[])])
  for (const k of ['taunt', 'shield', 'stealth', 'sprint']) if (kws.has(k)) push({ k, name: statusName(k), tip: statusTooltip(k), icon: iconBase + KW_ICON[k] + '.webp' })

  // 3) Visi mapping'ai (padaras/burtas + čempiono gebėjimai + artefaktas + laukas)
  const gp = c.gameplay
  const all: EffectMapping[] = [
    ...(c.mappings ?? []),
    ...(gp?.championSkillConfig?.mappings ?? []),
    ...(gp?.championSkillConfig?.skills ?? []).flatMap((s) => s.mappings ?? []),
    ...(gp?.artifactEffectConfig?.mappings ?? []),
    ...(gp?.fieldEffectConfig?.triggers ?? []),
  ]

  // 3a) Trigger'iai
  const triggers = Array.from(new Set(all.map((m) => m.trigger)))
  for (const tr of triggers) {
    if (c.type === 'unit' && (tr === 'onSummon' || tr === 'onPlay')) { push({ k: 'battlecry', name: statusName('battlecry'), tip: statusTooltip('battlecry'), emoji: '📣' }); continue }
    if (c.type === 'unit' && tr === 'onDeath') { push({ k: 'lastwish', name: statusName('lastwish'), tip: statusTooltip('lastwish'), emoji: '🕯️' }); continue }
    if (tr === 'custom' || isDefaultTrigger(c, tr)) continue
    const key = `battle.game.legend.trigger.${tr}`
    const name = t(key)
    const fallback = TRIGGER_TYPES.find((x) => x.value === tr)?.label ?? tr
    push({ k: `tr:${tr}`, name: name && name !== key ? name : fallback, tip: t('battle.game.legend.fx.trigger.tip'), img: `/rules/effects/${FX_IMG.trigger}.png`, emoji: FX_EMOJI.trigger })
  }

  // 3b) Efektų tipų ženkliukai
  const fx = new Set<FxGlyph>()
  if (gp?.spellType && SPELL_FX[gp.spellType]) fx.add(SPELL_FX[gp.spellType]!)
  for (const m of all) { const g = effectFx(m.effect); if (g) fx.add(g) }
  if (gp?.synergy && (gp.synergy.withNames || gp.synergy.withFaction)) fx.add('synergy')
  if (c.type === 'unit' && all.some((m) => m.trigger === 'onAnyArtifact' || m.trigger === 'onArtifactActivated')) fx.add('artifact')
  fx.delete('trigger') // trigger'iai jau surašyti atskirai
  for (const g of fx) push({ k: `fx:${g}`, name: t(`battle.game.legend.fx.${g}.name`), tip: t(`battle.game.legend.fx.${g}.tip`), img: FX_IMG[g] ? `/rules/effects/${FX_IMG[g]}.png` : undefined, emoji: FX_EMOJI[g] })

  // 4) Pasyvai (aura / papildomos atakos / kiti nuolatiniai)
  const pa = gp?.passiveAura
  if (pa && (pa.auraAttack || pa.auraHealth || pa.enemyUnitDamageHealsOwner)) push({ k: 'aura', name: t('battle.game.legend.aura.name'), tip: t('battle.game.legend.aura.tip'), emoji: '✨' })
  if (gp?.extraAttacks || gp?.secondAttackOnKill || gp?.secondAttackVsShield) push({ k: 'multiAttack', name: t('battle.game.legend.multiAttack.name'), tip: t('battle.game.legend.multiAttack.tip'), emoji: '⚔️' })
  if (gp?.ignoreTaunt) push({ k: 'ignoreTaunt', name: t('battle.game.legend.ignoreTaunt.name'), tip: t('battle.game.legend.ignoreTaunt.tip'), emoji: '👁️' })
  if (gp?.retreatAtHp) push({ k: 'retreat', name: t('battle.game.legend.retreat.name'), tip: t('battle.game.legend.retreat.tip', { hp: gp.retreatAtHp }), emoji: '↩️' })
  if (gp?.attackRestriction) push({ k: 'attackRestriction', name: t('battle.game.legend.attackRestriction.name'), tip: t(`battle.game.legend.attackRestriction.${gp.attackRestriction}`), emoji: '🎯' })

  return out
}
