// ── Globalus portalo UI garso variklis ────────────────────────────────────────
// FILE-FIRST: kiekvienas garsas pirmiausia bando paleisti mp3 iš /public/sounds/ui/
// (su atsitiktiniais variantais, pvz. card-place-1.mp3 / -2 / -3). Jei failo nėra –
// fallback į sintezuotą Web Audio garsą (kad veiktų ir be assetų). Įkėlus mp3 failus,
// kodo keisti nereikia. Synth lieka tik kaip atsarga.
//
// Naudojimas: import { playCardPick, isUiSoundEnabled, toggleUiSound } from '@/lib/ui-sound'

const STORAGE_KEY = 'ravenof-sound-enabled'

// ── Būsena ────────────────────────────────────────────────────────────────────
let _enabled: boolean | null = null
const _listeners = new Set<(enabled: boolean) => void>()

function readStored(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw === null ? true : raw === '1'
  } catch {
    return true
  }
}

export function isUiSoundEnabled(): boolean {
  if (_enabled === null) _enabled = readStored()
  return _enabled
}

export function setUiSoundEnabled(value: boolean): void {
  _enabled = value
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch { /* tyliai */ }
  _listeners.forEach((cb) => cb(value))
}

export function toggleUiSound(): boolean {
  const next = !isUiSoundEnabled()
  setUiSoundEnabled(next)
  return next
}

/** Prenumerata — grąžina unsubscribe funkciją. */
export function subscribeUiSound(cb: (enabled: boolean) => void): () => void {
  _listeners.add(cb)
  return () => { _listeners.delete(cb) }
}

// ── FILE-FIRST mp3 sluoksnis ──────────────────────────────────────────────────
// Kiekvienam efektui galima padėti kelis variantų failus; grojamas atsitiktinis.
// Failo nesant – iškart pereinama prie synth fallback (ir tas URL pažymimas „dead",
// kad nebebandytume). Vienas HTMLAudio elementas per URL (pakartotinis naudojimas).

const sfxDead = new Set<string>()
const sfxPool = new Map<string, HTMLAudioElement>()
const sfxLast = new Map<string, string>()

/** Bando groti random mp3 variantą; jei nepavyksta/nėra – sintezuotas fallback. */
function sfx(candidates: string[], volume: number, synth: () => void): void {
  if (typeof window === 'undefined' || !isUiSoundEnabled()) return
  const live = candidates.filter((u) => !sfxDead.has(u))
  if (live.length === 0) { synth(); return }

  const setKey = candidates[0]
  let url = live[Math.floor(Math.random() * live.length)]
  if (live.length > 1) {
    const last = sfxLast.get(setKey)
    for (let i = 0; i < 3 && url === last; i++) url = live[Math.floor(Math.random() * live.length)]
  }
  sfxLast.set(setKey, url)

  try {
    let a = sfxPool.get(url)
    if (!a) {
      a = new Audio(url)
      a.preload = 'auto'
      a.addEventListener('error', () => { sfxDead.add(url); sfxPool.delete(url) })
      sfxPool.set(url, a)
    }
    a.volume = volume
    a.currentTime = 0
    const p = a.play()
    if (p) p.catch(() => { if (!sfxDead.has(url)) { sfxDead.add(url); synth() } })
  } catch {
    sfxDead.add(url)
    synth()
  }
}

// Variantų manifestas — įkelk atitinkamus failus į public/sounds/ui/ (žr. README).
const UI = '/sounds/ui'
const SFX = {
  hover:     [`${UI}/hover-1.mp3`, `${UI}/hover-2.mp3`],
  cardPick:  [`${UI}/card-pick-1.mp3`, `${UI}/card-pick-2.mp3`, `${UI}/card-pick-3.mp3`],
  cardPlace: [`${UI}/card-place-1.mp3`, `${UI}/card-place-2.mp3`, `${UI}/card-place-3.mp3`],
  cardFlip:  [`${UI}/card-flip-1.mp3`, `${UI}/card-flip-2.mp3`],
  uiClick:   [`${UI}/ui-click-1.mp3`, `${UI}/ui-click-2.mp3`],
  success:   [`${UI}/success.mp3`],
  error:     [`${UI}/error.mp3`],
  mapZoom:   [`${UI}/map-zoom.mp3`],
  panelOpen: [`${UI}/panel-open.mp3`],
  discovery: [`${UI}/discovery.mp3`],
  shuffle:   [`${UI}/shuffle-1.mp3`, `${UI}/shuffle-2.mp3`],
  cardDraw:  [`${UI}/card-draw-1.mp3`, `${UI}/card-draw-2.mp3`, `${UI}/card-draw-3.mp3`],
}

// ── Audio kontekstas (synth fallback) ─────────────────────────────────────────
let _ctx: AudioContext | null = null
let _noiseBuffer: AudioBuffer | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_ctx) {
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      _ctx = new Ctor()
    }
    return _ctx
  } catch {
    return null
  }
}

function withCtx(fn: (ctx: AudioContext) => void): void {
  if (!isUiSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'running') {
    fn(ctx)
  } else {
    ctx.resume().then(() => fn(ctx)).catch(() => {})
  }
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!_noiseBuffer) {
    const len = Math.floor(ctx.sampleRate * 0.5)
    _noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = _noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  return _noiseBuffer
}

// ── Sintezės primityvai (fallback) ────────────────────────────────────────────

function tone(
  freq: number, endFreq: number, type: OscillatorType,
  duration: number, gainVal: number, startOffset = 0,
): void {
  withCtx((ctx) => {
    try {
      const t0 = ctx.currentTime + startOffset
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, t0)
      osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + duration)
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(gainVal, t0 + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
      osc.start(t0)
      osc.stop(t0 + duration + 0.02)
    } catch { /* tyliai */ }
  })
}

function swish(
  duration: number, fromFreq: number, toFreq: number, gainVal: number, startOffset = 0,
): void {
  withCtx((ctx) => {
    try {
      const t0 = ctx.currentTime + startOffset
      const src = ctx.createBufferSource()
      src.buffer = getNoiseBuffer(ctx)
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.Q.value = 1.2
      filter.frequency.setValueAtTime(fromFreq, t0)
      filter.frequency.exponentialRampToValueAtTime(toFreq, t0 + duration)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(gainVal, t0 + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
      src.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      src.start(t0)
      src.stop(t0 + duration + 0.02)
    } catch { /* tyliai */ }
  })
}

// Synth fallback'ai (privatūs)
function _synthHover(): void { tone(1900, 2100, 'triangle', 0.025, 0.04) }
function _synthPick(): void { swish(0.12, 600, 2600, 0.22) }
function _synthPlace(): void { swish(0.09, 2000, 500, 0.18); tone(150, 90, 'sine', 0.07, 0.22, 0.02) }
function _synthFlip(): void { swish(0.18, 500, 3500, 0.26) }
function _synthClick(): void { tone(900, 700, 'square', 0.035, 0.06) }
function _synthSuccess(): void { tone(523, 659, 'sine', 0.12, 0.14); tone(659, 880, 'sine', 0.14, 0.12, 0.1) }
function _synthError(): void { tone(180, 110, 'sawtooth', 0.16, 0.16) }
function _synthMapZoom(): void { swish(0.1, 400, 900, 0.06) }
function _synthPanelOpen(): void { swish(0.14, 700, 2200, 0.12) }
function _synthDiscovery(): void { tone(523, 784, 'sine', 0.18, 0.14); tone(784, 1047, 'sine', 0.22, 0.12, 0.14); swish(0.3, 1500, 4000, 0.08, 0.05) }
function _synthShuffle(): void {
  swish(0.07, 900, 2200, 0.14); swish(0.07, 700, 1900, 0.13, 0.08)
  swish(0.07, 1000, 2400, 0.14, 0.16); swish(0.07, 800, 2000, 0.12, 0.24); swish(0.12, 600, 1600, 0.16, 0.34)
}
function _synthDraw(): void { swish(0.13, 800, 3000, 0.2); tone(1200, 1600, 'triangle', 0.04, 0.05, 0.06) }

// ── Viešas API — file-first su synth fallback ─────────────────────────────────

let _lastHover = 0
let _lastZoom = 0

/** Subtilus „tik" užvedus pelę ant kortos (throttled). */
export function playCardHover(): void {
  const now = Date.now()
  if (now - _lastHover < 90) return
  _lastHover = now
  sfx(SFX.hover, 0.3, _synthHover)
}

/** Kortos paėmimas. */
export function playCardPick(): void { sfx(SFX.cardPick, 0.5, _synthPick) }

/** Kortos padėjimas. */
export function playCardPlace(): void { sfx(SFX.cardPlace, 0.55, _synthPlace) }

/** Kortos apvertimas. */
export function playCardFlip(): void { sfx(SFX.cardFlip, 0.5, _synthFlip) }

/** Bendras UI paspaudimas. */
export function playUiClick(): void { sfx(SFX.uiClick, 0.4, _synthClick) }

/** Sėkmė. */
export function playSuccess(): void { sfx(SFX.success, 0.5, _synthSuccess) }

/** Klaida. */
export function playError(): void { sfx(SFX.error, 0.5, _synthError) }

/** Žemėlapio zoom (throttled). */
export function playMapZoom(): void {
  const now = Date.now()
  if (now - _lastZoom < 160) return
  _lastZoom = now
  sfx(SFX.mapZoom, 0.35, _synthMapZoom)
}

/** Panelės/markerio atidarymas. */
export function playPanelOpen(): void { sfx(SFX.panelOpen, 0.45, _synthPanelOpen) }

/** Lokacijos atradimas. */
export function playDiscovery(): void { sfx(SFX.discovery, 0.5, _synthDiscovery) }

/** Kaladės maišymas. */
export function playShuffle(): void { sfx(SFX.shuffle, 0.5, _synthShuffle) }

/** Kortos traukimas. */
export function playCardDraw(): void { sfx(SFX.cardDraw, 0.5, _synthDraw) }
