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
) {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration)
    gain.gain.setValueAtTime(gainVal, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
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
