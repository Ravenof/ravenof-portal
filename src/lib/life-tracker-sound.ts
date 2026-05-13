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

function beep(
  freq: number,
  endFreq: number,
  type: OscillatorType,
  duration: number,
  gainVal: number,
  startOffset = 0,
): void {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
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
  } catch {
    // ignore audio errors
  }
}

type SoundVariant = {
  mp3: string
  synth: () => void
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function playVariant(variant: SoundVariant): void {
  if (typeof window === 'undefined') return
  try {
    const audio = new Audio(variant.mp3)
    audio.volume = 0.6
    audio.play().catch(() => {
      // MP3 not found — fall back to synthetic
      variant.synth()
    })
  } catch {
    variant.synth()
  }
}

// ── 5 damage variants (MP3 + synthetic fallback) ─────────────────────────────
const DAMAGE_VARIANTS: SoundVariant[] = [
  { mp3: '/sounds/damage-1.mp3', synth: () => beep(220, 80,  'sawtooth', 0.20, 0.30) },
  { mp3: '/sounds/damage-2.mp3', synth: () => beep(180, 55,  'sawtooth', 0.25, 0.35) },
  { mp3: '/sounds/damage-3.mp3', synth: () => beep(260, 70,  'square',   0.18, 0.28) },
  { mp3: '/sounds/damage-4.mp3', synth: () => beep(300, 90,  'sawtooth', 0.15, 0.30) },
  { mp3: '/sounds/damage-5.mp3', synth: () => beep(200, 50,  'sawtooth', 0.22, 0.40) },
]

// ── 5 heal variants (MP3 + synthetic fallback) ───────────────────────────────
const HEAL_VARIANTS: SoundVariant[] = [
  { mp3: '/sounds/heal-1.mp3', synth: () => beep(440, 660, 'sine',     0.18, 0.20) },
  { mp3: '/sounds/heal-2.mp3', synth: () => beep(520, 780, 'sine',     0.16, 0.18) },
  { mp3: '/sounds/heal-3.mp3', synth: () => beep(392, 523, 'sine',     0.20, 0.22) },
  { mp3: '/sounds/heal-4.mp3', synth: () => beep(480, 720, 'sine',     0.14, 0.18) },
  { mp3: '/sounds/heal-5.mp3', synth: () => beep(350, 700, 'triangle', 0.22, 0.20) },
]

export function playDamageSound(): void {
  playVariant(pickRandom(DAMAGE_VARIANTS))
}

export function playHealSound(): void {
  playVariant(pickRandom(HEAL_VARIANTS))
}

export function playTurnSound(): void {
  beep(350, 350, 'sine', 0.08, 0.1)
}

function playMp3(src: string): void {
  if (typeof window === 'undefined') return
  try {
    const audio = new Audio(src)
    audio.volume = 0.7
    audio.play().catch(() => {})
  } catch {
    // ignore
  }
}

/** Sword clash sound — uses /sounds/sword-clash.mp3 */
export function playSwordClashSound(): void {
  playMp3('/sounds/sword-clash.mp3')
}

/** Victory applause — uses /sounds/applause.mp3 */
export function playWinSound(): void {
  playMp3('/sounds/applause.mp3')
}
