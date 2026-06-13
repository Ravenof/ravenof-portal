// ── Battle sound manager ──────────────────────────────────────────────────────
// Failas-pirma sistema: jei /public/sounds/battle/<key>.mp3 egzistuoja – grojam
// jį; jei ne (404 / klaida) – fallback į sintezuotą ui-sound garsą. Vėliau
// užtenka įkelti mp3 failus į public/sounds/battle/ ir jie bus naudojami
// automatiškai, kodo keisti nereikia.
//
// Laukiami failai (placeholder struktūra):
//   public/sounds/battle/attack.mp3
//   public/sounds/battle/spell-cast.mp3
//   public/sounds/battle/impact.mp3
//   public/sounds/battle/draw.mp3
//   public/sounds/battle/curse.mp3
//   public/sounds/battle/field.mp3
//   public/sounds/battle/heal.mp3
//   public/sounds/battle/freeze.mp3
//   public/sounds/battle/death.mp3
//   public/sounds/battle/summon.mp3
//   public/sounds/battle/zmk-flip.mp3
//   public/sounds/battle/champion-skill.mp3

import {
  isUiSoundEnabled, playCardPick, playCardPlace, playCardFlip, playCardDraw,
  playError, playSuccess, playUiClick, playDiscovery, playShuffle,
} from '@/lib/ui-sound'
import type { BattleSoundType } from './types'

const FILES: Record<BattleSoundType, string> = {
  attack:        'attack.mp3',
  spellCast:     'spell-cast.mp3',
  impact:        'impact.mp3',
  draw:          'draw.mp3',
  curse:         'curse.mp3',
  field:         'field.mp3',
  heal:          'heal.mp3',
  freeze:        'freeze.mp3',
  death:         'death.mp3',
  summon:        'summon.mp3',
  zmkFlip:       'zmk-flip.mp3',
  championSkill: 'champion-skill.mp3',
}

// Sintezuoti fallback'ai (kol nėra mp3 assetų)
const SYNTH_FALLBACK: Record<BattleSoundType, () => void> = {
  attack:        playCardPick,
  spellCast:     playCardFlip,
  impact:        playError,
  draw:          playCardDraw,
  curse:         playError,
  field:         playDiscovery,
  heal:          playSuccess,
  freeze:        playUiClick,
  death:         playCardPlace,
  summon:        playCardPlace,
  zmkFlip:       playCardFlip,
  championSkill: playDiscovery,
}

// failo būsena: undefined = nebandyta, true = yra, false = nėra (naudojam synth)
const fileAvailable: Partial<Record<BattleSoundType, boolean>> = {}
const audioCache: Partial<Record<BattleSoundType, HTMLAudioElement>> = {}

export function playBattleSound(key: BattleSoundType, volume = 0.5): void {
  if (typeof window === 'undefined' || !isUiSoundEnabled()) return
  if (fileAvailable[key] === false) { SYNTH_FALLBACK[key]?.(); return }
  try {
    let a = audioCache[key]
    if (!a) {
      a = new Audio(`/sounds/battle/${FILES[key]}`)
      a.preload = 'auto'
      audioCache[key] = a
      a.addEventListener('error', () => {
        fileAvailable[key] = false
        delete audioCache[key]
      })
    }
    a.volume = volume
    a.currentTime = 0
    const p = a.play()
    if (p) p.then(() => { fileAvailable[key] = true }).catch(() => {
      // autoplay block arba failo nėra – fallback
      if (fileAvailable[key] !== true) { fileAvailable[key] = false; SYNTH_FALLBACK[key]?.() }
    })
  } catch {
    SYNTH_FALLBACK[key]?.()
  }
}

export { playShuffle }
