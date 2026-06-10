// ── Globalus portalo UI garso variklis ────────────────────────────────────────
// Web Audio sintezatoriai (be failų) + globalus įjungimo/išjungimo nustatymas.
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

// ── Audio kontekstas ──────────────────────────────────────────────────────────
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

// ── Sintezės primityvai ───────────────────────────────────────────────────────

/** Tonas su dažnio slinktimi ir gain envelope. */
function tone(
  freq: number,
  endFreq: number,
  type: OscillatorType,
  duration: number,
  gainVal: number,
  startOffset = 0
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

/** „Popieriaus švilpesys" — filtruotas triukšmas (kortos paėmimas/padėjimas). */
function swish(
  duration: number,
  fromFreq: number,
  toFreq: number,
  gainVal: number,
  startOffset = 0
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

// ── Viešas API — portalo garsai ───────────────────────────────────────────────

let _lastHover = 0

/** Subtilus „tik" užvedus pelę ant kortos (throttled). */
export function playCardHover(): void {
  const now = Date.now()
  if (now - _lastHover < 90) return
  _lastHover = now
  tone(1900, 2100, 'triangle', 0.025, 0.04)
}

/** Kortos paėmimas — popierius kyla aukštyn. */
export function playCardPick(): void {
  swish(0.12, 600, 2600, 0.22)
}

/** Kortos padėjimas — švilpesys žemyn + minkštas „tump". */
export function playCardPlace(): void {
  swish(0.09, 2000, 500, 0.18)
  tone(150, 90, 'sine', 0.07, 0.22, 0.02)
}

/** Kortos apvertimas — greitas platus švilpesys. */
export function playCardFlip(): void {
  swish(0.18, 500, 3500, 0.26)
}

/** Bendras UI paspaudimas. */
export function playUiClick(): void {
  tone(900, 700, 'square', 0.035, 0.06)
}

/** Sėkmė — du kylantys tonai. */
export function playSuccess(): void {
  tone(523, 659, 'sine', 0.12, 0.14)
  tone(659, 880, 'sine', 0.14, 0.12, 0.1)
}

/** Klaida — žemas burzgesys. */
export function playError(): void {
  tone(180, 110, 'sawtooth', 0.16, 0.16)
}
