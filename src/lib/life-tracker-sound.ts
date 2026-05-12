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
) {
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

export function playDamageSound(): void {
  beep(220, 80, 'sawtooth', 0.2, 0.3)
}

export function playHealSound(): void {
  beep(440, 660, 'sine', 0.18, 0.2)
}

export function playTurnSound(): void {
  beep(350, 350, 'sine', 0.08, 0.1)
}

/** Metallic sword-clash: layered sawtooth + square bursts with quick decay */
export function playSwordClashSound(): void {
  const ctx = getCtx()
  if (!ctx) return
  // Layer 1: sharp metallic high note
  beep(1200, 400, 'sawtooth', 0.12, 0.4)
  // Layer 2: mid crunch
  beep(600, 200, 'square', 0.15, 0.35)
  // Layer 3: impact thud
  beep(180, 60, 'sawtooth', 0.18, 0.5)
  // Layer 4: brief ring-out shimmer
  beep(2400, 800, 'sine', 0.25, 0.15)
}

/** Victory fanfare: ascending C-E-G-C arpeggio (sine, 4 notes) */
export function playWinSound(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  const gap = 0.13
  notes.forEach((freq, i) => {
    beep(freq, freq, 'sine', 0.35, 0.28, i * gap)
  })
}
