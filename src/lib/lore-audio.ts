'use client'

// ── Lore Atlas audio grotuvas ──────────────────────────────────────────────────
// Vienas takelis vienu metu, švelnus fade in/out, lazy kūrimas (jokio preload
// puslapio užkrovimo metu). Paiso globalaus garso nustatymo (ui-sound).
//
// playLoreTrack(url, { loop }) — pradeda (arba pakeičia) takelį su fade
// stopLoreTrack()              — sustabdo su fade out
// subscribeLoreTrack(cb)       — kas dabar groja (UI indikatoriui)

import { isUiSoundEnabled, subscribeUiSound } from '@/lib/ui-sound'

type NowPlaying = { url: string; loop: boolean } | null

let _audio: HTMLAudioElement | null = null
let _fadeTimer: ReturnType<typeof setInterval> | null = null
let _now: NowPlaying = null
const _listeners = new Set<(now: NowPlaying) => void>()

const TARGET_VOLUME = 0.45
const FADE_MS = 800
const FADE_STEP_MS = 50

function notify() { _listeners.forEach((cb) => cb(_now)) }

export function subscribeLoreTrack(cb: (now: NowPlaying) => void): () => void {
  _listeners.add(cb)
  cb(_now)
  return () => { _listeners.delete(cb) }
}

export function getLoreTrack(): NowPlaying { return _now }

function clearFade() {
  if (_fadeTimer) { clearInterval(_fadeTimer); _fadeTimer = null }
}

function fadeTo(audio: HTMLAudioElement, target: number, onDone?: () => void) {
  clearFade()
  const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS))
  const delta = (target - audio.volume) / steps
  let n = 0
  _fadeTimer = setInterval(() => {
    n++
    audio.volume = Math.min(1, Math.max(0, audio.volume + delta))
    if (n >= steps) {
      audio.volume = target
      clearFade()
      onDone?.()
    }
  }, FADE_STEP_MS)
}

/** Sustabdo dabartinį takelį su fade out. */
export function stopLoreTrack(): void {
  const audio = _audio
  if (!audio || audio.paused) {
    _now = null
    notify()
    return
  }
  _now = null
  notify()
  fadeTo(audio, 0, () => {
    audio.pause()
    audio.src = ''
  })
}

/** Groja takelį. Jei jau groja tas pats URL — nieko nedaro. */
export function playLoreTrack(url: string, opts: { loop?: boolean } = {}): void {
  if (typeof window === 'undefined' || !url) return
  if (!isUiSoundEnabled()) return
  if (_now?.url === url) return

  const loop = opts.loop ?? false

  const start = () => {
    if (!_audio) {
      _audio = new Audio()
      _audio.preload = 'none'
    }
    const audio = _audio
    audio.src = url
    audio.loop = loop
    audio.volume = 0
    _now = { url, loop }
    notify()
    audio.play().then(() => {
      fadeTo(audio, TARGET_VOLUME)
    }).catch(() => {
      // Autoplay užblokuotas (nebuvo user gesture) — tyliai, indikatorius leis paleisti ranka
      _now = null
      notify()
    })
    audio.onended = () => {
      if (!loop) { _now = null; notify() }
    }
  }

  // Jei kažkas groja — fade out, tada naujas
  if (_audio && !_audio.paused) {
    const prev = _audio
    fadeTo(prev, 0, () => { prev.pause(); start() })
  } else {
    start()
  }
}

// Globalus mute → sustabdyti ir lore takelį
if (typeof window !== 'undefined') {
  subscribeUiSound((enabled) => {
    if (!enabled) stopLoreTrack()
  })
}
