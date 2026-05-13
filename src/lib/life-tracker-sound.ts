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
    // Resume if suspended (browser autoplay policy)
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(() => {})
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 5 damage synth variants
const DAMAGE_SYNTHS: Array<() => void> = [
  () => beep(220, 80,  'sawtooth', 0.20, 0.30),
  () => beep(180, 55,  'sawtooth', 0.25, 0.35),
  () => beep(260, 70,  'square',   0.18, 0.28),
  () => beep(300, 90,  'sawtooth', 0.15, 0.30),
  () => beep(200, 50,  'sawtooth', 0.22, 0.40),
]

// 5 heal synth variants
const HEAL_SYNTHS: Array<() => void> = [
  () => beep(440, 660, 'sine',     0.18, 0.20),
  () => beep(520, 780, 'sine',     0.16, 0.18),
  () => beep(392, 523, 'sine',     0.20, 0.22),
  () => beep(480, 720, 'sine',     0.14, 0.18),
  () => beep(350, 700, 'triangle', 0.22, 0.20),
]

export function playDamageSound(): void {
  pickRandom(DAMAGE_SYNTHS)()
}

export function playHealSound(): void {
  pickRandom(HEAL_SYNTHS)()
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

/** Sword clash sound */
export function playSwordClashSound(): void {
  playMp3('/sounds/sword-clash.mp3')
}

/** Victory applause */
export function playWinSound(): void {
  playMp3('/sounds/applause.mp3')
}
