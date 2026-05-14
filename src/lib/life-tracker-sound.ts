// ── Audio Context (Web Audio API fallback synths) ─────────────────────────────
let _audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      _audioCtx = new Ctor()
    }
    return _audioCtx
  } catch {
    return null
  }
}

function withCtx(fn: (ctx: AudioContext) => void): void {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'running') {
    fn(ctx)
  } else {
    ctx.resume().then(() => fn(ctx)).catch(() => {})
  }
}

function beep(freq: number, endFreq: number, type: OscillatorType, duration: number, gainVal: number, startOffset = 0): void {
  withCtx((ctx) => {
    try {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset)
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + startOffset + duration)
      gain.gain.setValueAtTime(gainVal, ctx.currentTime + startOffset)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration)
      osc.start(ctx.currentTime + startOffset)
      osc.stop(ctx.currentTime + startOffset + duration)
    } catch { /* ignore */ }
  })
}

// ── MP3 Cache ─────────────────────────────────────────────────────────────────
const audioCache = new Map<string, HTMLAudioElement>()

function getCachedAudio(src: string, volume = 0.5): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  try {
    let audio = audioCache.get(src)
    if (!audio) {
      audio = new Audio(src)
      audio.preload = 'auto'
      audio.volume = volume
      audioCache.set(src, audio)
    }
    return audio
  } catch {
    return null
  }
}

function playCachedSound(src: string, volume = 0.5, fallback?: () => void): void {
  const audio = getCachedAudio(src, volume)
  if (!audio) { fallback?.(); return }
  audio.volume = volume
  audio.currentTime = 0
  void audio.play().catch(() => { fallback?.() })
}

// ── Sound paths ───────────────────────────────────────────────────────────────
const DAMAGE_SOUNDS = [
  '/sounds/damage-1.mp3',
  '/sounds/damage-2.mp3',
  '/sounds/damage-3.mp3',
  '/sounds/damage-4.mp3',
  '/sounds/damage-5.mp3',
]

const HEAL_SOUNDS = [
  '/sounds/heal-1.mp3',
  '/sounds/heal-2.mp3',
  '/sounds/heal-3.mp3',
  '/sounds/heal-4.mp3',
  '/sounds/heal-5.mp3',
]

const COIN_SOUNDS = [
  '/sounds/coin-1.mp3',
  '/sounds/coin-2.mp3',
  '/sounds/coin-3.mp3',
]

// ── Synth fallbacks ───────────────────────────────────────────────────────────
const DAMAGE_SYNTHS: Array<() => void> = [
  () => beep(220, 80,  'sawtooth', 0.20, 0.30),
  () => beep(180, 55,  'sawtooth', 0.25, 0.35),
  () => beep(260, 70,  'square',   0.18, 0.28),
  () => beep(300, 90,  'sawtooth', 0.15, 0.30),
  () => beep(200, 50,  'sawtooth', 0.22, 0.40),
]

const HEAL_SYNTHS: Array<() => void> = [
  () => beep(440, 660, 'sine',     0.18, 0.20),
  () => beep(520, 780, 'sine',     0.16, 0.18),
  () => beep(392, 523, 'sine',     0.20, 0.22),
  () => beep(480, 720, 'sine',     0.14, 0.18),
  () => beep(350, 700, 'triangle', 0.22, 0.20),
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Preload ───────────────────────────────────────────────────────────────────
export function preloadLifeTrackerSounds(): void {
  if (typeof window === 'undefined') return
  const all = [...DAMAGE_SOUNDS, ...HEAL_SOUNDS, ...COIN_SOUNDS,
                '/sounds/sword-clash.mp3', '/sounds/applause.mp3']
  for (const src of all) {
    getCachedAudio(src, 0.5)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export function playDamageSound(): void {
  const idx = Math.floor(Math.random() * DAMAGE_SOUNDS.length)
  playCachedSound(DAMAGE_SOUNDS[idx], 0.6, DAMAGE_SYNTHS[idx])
}

export function playHealSound(): void {
  const idx = Math.floor(Math.random() * HEAL_SOUNDS.length)
  playCachedSound(HEAL_SOUNDS[idx], 0.6, HEAL_SYNTHS[idx])
}

export function playCoinSound(): void {
  playCachedSound(pickRandom(COIN_SOUNDS), 0.45, () => {
    beep(800, 1200, 'sine', 0.06, 0.12)
  })
}

export function playTurnSound(): void {
  beep(350, 350, 'sine', 0.08, 0.1)
}

export function playSwordClashSound(): void {
  playCachedSound('/sounds/sword-clash.mp3', 0.7, () => {
    beep(300, 150, 'sawtooth', 0.12, 0.35)
    beep(250, 100, 'square',   0.10, 0.28, 0.05)
  })
}

export function playWinSound(): void {
  playCachedSound('/sounds/applause.mp3', 0.7, () => {
    beep(523, 659, 'sine', 0.15, 0.18)
    beep(659, 784, 'sine', 0.15, 0.16, 0.18)
    beep(784, 1047,'sine', 0.20, 0.20, 0.36)
  })
}
