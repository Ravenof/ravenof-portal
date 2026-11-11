// ── Battle sound manager ──────────────────────────────────────────────────────
// FILE-FIRST su variantais: kiekvienam mūšio garsui galima padėti vieną arba kelis
// failus public/sounds/battle/ (pvz. attack.mp3 ARBA attack-1.mp3 / attack-2.mp3 / …).
// Grojamas atsitiktinis ESAMAS variantas (sąrašas – iš soundManifest.json, žr.
// tools/gen-sound-manifest.mjs). Jei rakto failų nėra:
//   1) grojamas `FALLBACK_KEY` rakto failas (naujas raktas skamba kaip iki šiol, kol
//      jam neįkeltas savas garsas), o jei ir to nėra –
//   2) sintezuotas fallback iš ui-sound.
// Įkėlus mp3 nurodytu vardu ir paleidus `npm run sounds:manifest`, kodo keisti nereikia.
//
// Failų vardai: žr. BASE žemiau → public/sounds/battle/<vardas>(-N).mp3
// (reakcijų grandinė – public/sounds/reaction/).

import {
  isUiSoundEnabled, playCardPick, playCardPlace, playCardFlip, playCardDraw,
  playError, playSuccess, playUiClick, playDiscovery, playShuffle, playImpact,
  playReactionLaunch, playReactionImpact, playReactionTighten, playReactionShatter,
  playZmkCrit, playZmkFizzle,
  synthBuff, synthDebuff, synthGold, synthPuff, synthTurnStart, synthTurnStartEnemy, synthTurnEnd,
  synthReturnHand, synthShieldUp, synthShieldBreak, synthStatusBurn, synthStatusPoison,
  synthStatusStun, synthStatusSilence, synthFatigue,
} from '@/lib/ui-sound'
import { isSfxDead, playSfxUrl, preloadSfx, sfxVariants } from '@/lib/sfxPlayer'
import type { BattleSoundType } from './types'

// Bazinis failo vardas kiekvienam tipui
const BASE: Record<BattleSoundType, string> = {
  attack:        'attack',
  spellCast:     'spell-cast',
  impact:        'impact',
  draw:          'draw',
  curse:         'curse',
  field:         'field',
  heal:          'heal',
  freeze:        'freeze',
  death:         'death',
  summon:        'summon',
  zmkFlip:       'zmk-flip',
  championSkill: 'champion-skill',
  explosion:     'explosion',
  // Reakcijų grandinė gyvena atskirame kataloge (žr. REACTION_KEYS).
  reactionLaunch:  'launch',
  reactionImpact:  'impact',
  reactionTighten: 'tighten',
  reactionShatter: 'shatter',
  zmkCrit:       'zmk-crit',
  zmkFizzle:     'zmk-fizzle',
  // ── 757: įvykiai, kurie iki šiol buvo tylūs arba skolinosi svetimą garsą ──
  puff:           'puff',              // 0 žalos smūgis (skydas, imunitetas, ŽMK ×0)
  buff:           'buff',
  debuff:         'debuff',
  gold:           'gold',
  turnStart:      'turn-start',
  turnStartEnemy: 'turn-start-enemy',
  turnEnd:        'turn-end',
  returnHand:     'return-hand',
  shieldUp:       'shield-up',
  shieldBreak:    'shield-break',
  statusBurn:     'status-burn',
  statusPoison:   'status-poison',
  statusStun:     'status-stun',
  statusSilence:  'status-silence',
  reactionSet:    'reaction-set',
  battlecrySting: 'battlecry-sting',
  lastwishSting:  'lastwish-sting',
  triggerSting:   'trigger-sting',
  fatigue:        'fatigue',
}

/** Garsai, kurių failai guli `public/sounds/reaction/`, o ne `battle/`. */
const REACTION_KEYS = new Set<BattleSoundType>(['reactionLaunch', 'reactionImpact', 'reactionTighten', 'reactionShatter'])

/**
 * Kol naujam raktui neįkeltas savas failas – skamba šio rakto failas (taip, kaip
 * tas įvykis skambėjo iki 757). Raktai be įrašo čia iškart krenta į sintezę.
 */
const FALLBACK_KEY: Partial<Record<BattleSoundType, BattleSoundType>> = {
  shieldBreak: 'freeze',
  statusBurn: 'impact',
  statusStun: 'impact',
  statusPoison: 'curse',
  statusSilence: 'curse',
  reactionSet: 'impact',
  battlecrySting: 'summon',
  lastwishSting: 'curse',
  triggerSting: 'spellCast',
  fatigue: 'impact',
}

// Sintezuoti fallback'ai (kol nėra mp3 assetų)
const SYNTH_FALLBACK: Record<BattleSoundType, () => void> = {
  attack:        playCardPick,
  spellCast:     playCardFlip,
  impact:        playImpact,
  draw:          playCardDraw,
  curse:         playError,
  field:         playDiscovery,
  heal:          playSuccess,
  freeze:        playUiClick,
  death:         playCardPlace,
  summon:        playCardPlace,
  zmkFlip:       playCardFlip,
  championSkill: playDiscovery,
  explosion:     playImpact,
  reactionLaunch:  playReactionLaunch,
  reactionImpact:  playReactionImpact,
  reactionTighten: playReactionTighten,
  reactionShatter: playReactionShatter,
  zmkCrit:       playZmkCrit,
  zmkFizzle:     playZmkFizzle,
  puff:           synthPuff,
  buff:           synthBuff,
  debuff:         synthDebuff,
  gold:           synthGold,
  turnStart:      synthTurnStart,
  turnStartEnemy: synthTurnStartEnemy,
  turnEnd:        synthTurnEnd,
  returnHand:     synthReturnHand,
  shieldUp:       synthShieldUp,
  shieldBreak:    synthShieldBreak,
  statusBurn:     synthStatusBurn,
  statusPoison:   synthStatusPoison,
  statusStun:     synthStatusStun,
  statusSilence:  synthStatusSilence,
  reactionSet:    playImpact,
  battlecrySting: playCardPlace,
  lastwishSting:  playError,
  triggerSting:   playCardFlip,
  fatigue:        synthFatigue,
}

/** Raktai be aukščio variacijos (melodiniai / „signaliniai" – pitch pokytis skambėtų netiksliai). */
const NO_PITCH = new Set<BattleSoundType>(['turnStart', 'turnStartEnemy', 'championSkill', 'battlecrySting', 'lastwishSting', 'zmkCrit'])
/** Min. tarpas tarp to paties rakto grojimų – kad AoE nesusilietų į vieną „sienos" garsą. */
const MIN_GAP_MS = 45

const variantsCache = new Map<BattleSoundType, string[]>()
function ownVariants(key: BattleSoundType): string[] {
  let v = variantsCache.get(key)
  if (!v) { v = sfxVariants(REACTION_KEYS.has(key) ? 'reaction' : 'battle', BASE[key]); variantsCache.set(key, v) }
  return v
}
/** Esami failai raktui: savi, o jei jų nėra – FALLBACK_KEY rakto. */
function liveVariants(key: BattleSoundType): string[] {
  const own = ownVariants(key).filter((u) => !isSfxDead(u))
  if (own.length > 0) return own
  const fb = FALLBACK_KEY[key]
  return fb ? ownVariants(fb).filter((u) => !isSfxDead(u)) : []
}

const lastByKey = new Map<BattleSoundType, string>()
const lastAt = new Map<BattleSoundType, number>()
let preloaded = false

export function playBattleSound(key: BattleSoundType, volume = 0.5): void {
  if (typeof window === 'undefined' || !isUiSoundEnabled()) return
  if (!(key in BASE)) return

  // Pirmas kovos garsas → fone dekoduojam visus kovos failus (kiti gros be vėlavimo ir galės persidengti).
  if (!preloaded) {
    preloaded = true
    window.setTimeout(() => { for (const k of Object.keys(BASE) as BattleSoundType[]) preloadSfx(ownVariants(k)) }, 400)
  }

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (now - (lastAt.get(key) ?? -1e9) < MIN_GAP_MS) return
  lastAt.set(key, now)

  const live = liveVariants(key)
  if (live.length === 0) { SYNTH_FALLBACK[key]?.(); return }

  let url = live[Math.floor(Math.random() * live.length)]
  if (live.length > 1) {
    const last = lastByKey.get(key)
    for (let i = 0; i < 3 && url === last; i++) url = live[Math.floor(Math.random() * live.length)]
  }
  lastByKey.set(key, url)
  playSfxUrl(url, volume, { pitchJitter: NO_PITCH.has(key) ? 0 : 0.05, onFail: () => SYNTH_FALLBACK[key]?.() })
}

/** Ar raktas turi SAVO failą (ne fallback / sintezę) – diagnostikai ir testams. */
export function battleSoundHasOwnFile(key: BattleSoundType): boolean { return ownVariants(key).length > 0 }
export const BATTLE_SOUND_FILES: Readonly<Record<BattleSoundType, string>> = BASE

export { playShuffle }
