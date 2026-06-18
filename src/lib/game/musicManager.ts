// ── Fono muzikos variklis (kovos + main menu) ─────────────────────────────────
// Tas pats principas kaip voiceManager (lazy, mažas resursas, paiso garso jungiklio),
// BET muzika ilga (kelių minučių) → naudojam HTMLAudio STREAMING, o NE Web Audio
// dekoduotus buferius. Dekoduotas 5 min stereo trekas užimtų ~50 MB RAM; streaming'as
// laiko atmintyje tik mažą buferį, tad net 5 kovos trekai praktiškai nieko nekainuoja.
//
//   • Kovos muzika: 6 trekai, grojami atsitiktine tvarka (be pasikartojimo iš eilės),
//     vienas po kito → nuolatinė variacija.
//   • Main menu: viena tema, looping.
//   • Crossfade tarp trekų/režimų (be staigaus nutrūkimo).
//   • Lazy: parsisiunčiamas TIK tuo metu reikalingas trekas (kiti 4 neliečiami).
//   • Vienu metu gyvas tik 1–2 audio elementai (crossfade metu).
//   • Paiso globalaus garso jungiklio (isUiSoundEnabled / subscribeUiSound).
//   • Autoplay block apsauga: jei naršyklė neleidžia groti be gesto — paleidžiam
//     po pirmo vartotojo paspaudimo.
//
// Failai (įkelk į public/sounds/music/):
//   menu-theme.mp3, battle-1.mp3 … battle-5.mp3

import { isUiSoundEnabled, subscribeUiSound } from '@/lib/ui-sound'

const MENU_TRACK = '/sounds/music/menu-theme.mp3'
const BATTLE_TRACKS = [1, 2, 3, 4, 5, 6].map((n) => `/sounds/music/battle-${n}.mp3`)

const MUSIC_VOLUME = 0.32   // muzika tylesnė už SFX
const FADE_MS = 1100
const FADE_STEPS = 22

type Mode = 'none' | 'menu' | 'battle'

let mode: Mode = 'none'
let current: HTMLAudioElement | null = null
let lastBattleIdx = -1
let unlocked = false
let subbed = false

function fade(el: HTMLAudioElement, to: number, ms: number, onDone?: () => void): void {
  const from = el.volume
  const steps = FADE_STEPS
  const dt = ms / steps
  let i = 0
  const tick = () => {
    i++
    const v = from + (to - from) * (i / steps)
    try { el.volume = Math.max(0, Math.min(1, v)) } catch { /* */ }
    if (i < steps) {
      window.setTimeout(tick, dt)
    } else {
      onDone?.()
    }
  }
  window.setTimeout(tick, dt)
}

function stopEl(el: HTMLAudioElement | null): void {
  if (!el) return
  fade(el, 0, FADE_MS, () => { try { el.pause(); el.src = '' } catch { /* */ } })
}

function makeEl(src: string, loop: boolean): HTMLAudioElement {
  const a = new Audio(src)
  a.loop = loop
  a.preload = 'auto'
  a.volume = 0
  return a
}

function tryPlay(el: HTMLAudioElement): void {
  const p = el.play()
  if (p) {
    p.then(() => { unlocked = true }).catch(() => {
      // autoplay užblokuotas — paleidžiam po pirmo gesto
      if (!unlocked) armGestureUnlock()
    })
  }
}

function armGestureUnlock(): void {
  if (typeof window === 'undefined') return
  const handler = () => {
    unlocked = true
    window.removeEventListener('pointerdown', handler)
    window.removeEventListener('keydown', handler)
    if (current && isUiSoundEnabled()) tryPlay(current)
  }
  window.addEventListener('pointerdown', handler, { once: true })
  window.addEventListener('keydown', handler, { once: true })
}

function pickBattle(): string {
  if (BATTLE_TRACKS.length === 1) return BATTLE_TRACKS[0]
  let idx = Math.floor(Math.random() * BATTLE_TRACKS.length)
  for (let i = 0; i < 3 && idx === lastBattleIdx; i++) {
    idx = Math.floor(Math.random() * BATTLE_TRACKS.length)
  }
  lastBattleIdx = idx
  return BATTLE_TRACKS[idx]
}

function ensureSub(): void {
  if (subbed) return
  subbed = true
  subscribeUiSound((enabled) => {
    if (!enabled) {
      if (current) { try { current.pause() } catch { /* */ } }
    } else if (mode !== 'none' && current) {
      tryPlay(current)
      fade(current, MUSIC_VOLUME, FADE_MS)
    }
  })
}

function startTrack(src: string, loop: boolean, onEnded?: () => void): void {
  const prev = current
  const el = makeEl(src, loop)
  current = el
  if (onEnded) {
    el.addEventListener('ended', onEnded)
    // jei trekas neuzsikrovė (404/klaida) — nepakimba, pereina prie kito
    el.addEventListener('error', () => { if (current === el) onEnded() })
  }
  stopEl(prev)
  if (isUiSoundEnabled()) {
    tryPlay(el)
    fade(el, MUSIC_VOLUME, FADE_MS)
  }
}

function playNextBattle(): void {
  if (mode !== 'battle') return
  startTrack(pickBattle(), false, playNextBattle)
}

/** Paleidžia main menu temą (looping). Saugu kviesti kelis kartus. */
export function startMenuMusic(): void {
  if (typeof window === 'undefined') return
  ensureSub()
  if (mode === 'menu' && current) return
  mode = 'menu'
  startTrack(MENU_TRACK, true)
}

/** Paleidžia kovos muziką — atsitiktinis trekas, po jo automatiškai kitas. */
export function startBattleMusic(): void {
  if (typeof window === 'undefined') return
  ensureSub()
  if (mode === 'battle' && current) return
  mode = 'battle'
  startTrack(pickBattle(), false, playNextBattle)
}

/** Visiškai sustabdo muziką (fade out). */
export function stopMusic(): void {
  mode = 'none'
  stopEl(current)
  current = null
}
