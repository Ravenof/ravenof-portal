// ── Battle sound manager ──────────────────────────────────────────────────────
// FILE-FIRST su variantais: kiekvienam mūšio garsui galima padėti vieną arba kelis
// failus public/sounds/battle/ (pvz. attack.mp3 ARBA attack-1.mp3 / attack-2.mp3 / …).
// Grojamas atsitiktinis esamas variantas; jei nė vieno failo nėra – sintezuotas
// fallback iš ui-sound. Įkėlus mp3, kodo keisti nereikia.
//
// Laukiami failai (kiekvienam – base ARBA -1..-3 variantai):
//   attack, spell-cast, impact, draw, curse, field, heal, freeze, death, summon,
//   zmk-flip, champion-skill   →  public/sounds/battle/<vardas>(-N).mp3

import {
  isUiSoundEnabled, playCardPick, playCardPlace, playCardFlip, playCardDraw,
  playError, playSuccess, playUiClick, playDiscovery, playShuffle,
} from '@/lib/ui-sound'
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
}

// Kandidatų sąrašas: base + iki 3 variantų. Random pick tarp esamų.
function candidates(key: BattleSoundType): string[] {
  const b = BASE[key]
  return [
    `/sounds/battle/${b}.mp3`,
    `/sounds/battle/${b}-1.mp3`,
    `/sounds/battle/${b}-2.mp3`,
    `/sounds/battle/${b}-3.mp3`,
    `/sounds/battle/${b}-4.mp3`,
    `/sounds/battle/${b}-5.mp3`,
    `/sounds/battle/${b}-6.mp3`,
  ]
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

const dead = new Set<string>()                      // 404/klaida – nebebandom
const pool = new Map<string, HTMLAudioElement>()    // url -> elementas
const lastByKey = new Map<BattleSoundType, string>()

export function playBattleSound(key: BattleSoundType, volume = 0.5): void {
  if (typeof window === 'undefined' || !isUiSoundEnabled()) return

  const live = candidates(key).filter((u) => !dead.has(u))
  if (live.length === 0) { SYNTH_FALLBACK[key]?.(); return }

  let url = live[Math.floor(Math.random() * live.length)]
  if (live.length > 1) {
    const last = lastByKey.get(key)
    for (let i = 0; i < 3 && url === last; i++) url = live[Math.floor(Math.random() * live.length)]
  }
  lastByKey.set(key, url)

  try {
    let a = pool.get(url)
    if (!a) {
      a = new Audio(url)
      a.preload = 'auto'
      a.addEventListener('error', () => { dead.add(url); pool.delete(url) })
      pool.set(url, a)
    }
    a.volume = volume
    a.currentTime = 0
    const p = a.play()
    if (p) p.catch(() => { if (!dead.has(url)) { dead.add(url); SYNTH_FALLBACK[key]?.() } })
  } catch {
    dead.add(url)
    SYNTH_FALLBACK[key]?.()
  }
}

export { playShuffle }
