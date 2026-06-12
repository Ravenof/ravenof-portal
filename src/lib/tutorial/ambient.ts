// ── Dark fantasy ambient muzika tutorial režimui ─────────────────────────────
// Viskas sintezuojama Web Audio (jokių failų), kaip ir ui-sound.ts.
// Sluoksniai: žemas dronas, lėtai kvėpuojantys minoriniai pad akordai,
// retkarčiais – tolimas varpas ir vėjo ošimas. Paiso globalaus
// ravenof-sound-enabled jungiklio (subscribeUiSound).

import { isUiSoundEnabled, subscribeUiSound } from '@/lib/ui-sound'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let running = false
let timers: ReturnType<typeof setTimeout>[] = []
let unsubscribe: (() => void) | null = null
let nodes: AudioNode[] = []

const VOLUME = 0.16

function ac(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Minorinė tamsi progresija (A minor pasaulis): a – F – d – E
const CHORDS: number[][] = [
  [110.0, 130.81, 164.81],   // A2 C3 E3  (a-moll)
  [87.31, 130.81, 174.61],   // F2 C3 F3  (F-dur)
  [73.42, 110.0, 146.83],    // D2 A2 D3  (d-moll)
  [82.41, 123.47, 164.81],   // E2 B2 E3  (E)
]

function schedule(fn: () => void, ms: number) {
  const t = setTimeout(() => { if (running) fn() }, ms)
  timers.push(t)
}

// ── Sluoksniai ────────────────────────────────────────────────────────────────

function startDrone(c: AudioContext, out: GainNode) {
  const g = c.createGain()
  g.gain.value = 0.5
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 220
  lp.Q.value = 0.7
  for (const [freq, detune] of [[55, 0], [55, 6], [110, -4]] as const) {
    const o = c.createOscillator()
    o.type = freq === 110 ? 'triangle' : 'sawtooth'
    o.frequency.value = freq
    o.detune.value = detune
    o.connect(lp)
    o.start()
    nodes.push(o)
  }
  // lėtas filtro kvėpavimas
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.05
  const lfoGain = c.createGain()
  lfoGain.gain.value = 90
  lfo.connect(lfoGain).connect(lp.frequency)
  lfo.start()
  nodes.push(lfo)
  lp.connect(g).connect(out)
  nodes.push(lp, g)
}

function padChord(c: AudioContext, out: GainNode, freqs: number[], durS: number) {
  const g = c.createGain()
  const now = c.currentTime
  g.gain.setValueAtTime(0.0001, now)
  g.gain.linearRampToValueAtTime(0.32, now + durS * 0.4)
  g.gain.linearRampToValueAtTime(0.0001, now + durS)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 900
  for (const f of freqs) {
    for (const det of [-5, 4]) {
      const o = c.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f * 2 // oktava aukščiau drono
      o.detune.value = det
      o.connect(lp)
      o.start(now)
      o.stop(now + durS + 0.1)
    }
  }
  lp.connect(g).connect(out)
}

function padLoop(c: AudioContext, out: GainNode, i = 0) {
  if (!running) return
  const durS = 14 + Math.random() * 6
  padChord(c, out, CHORDS[i % CHORDS.length], durS)
  schedule(() => padLoop(c, out, i + 1), (durS - 4) * 1000)
}

function bell(c: AudioContext, out: GainNode) {
  const base = [220, 261.63, 329.63, 440][Math.floor(Math.random() * 4)]
  const now = c.currentTime
  const g = c.createGain()
  g.gain.setValueAtTime(0.12, now)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 6)
  for (const [mult, amp] of [[1, 1], [2.76, 0.4], [5.4, 0.18]] as const) {
    const o = c.createOscillator()
    o.type = 'sine'
    o.frequency.value = base * mult
    const og = c.createGain()
    og.gain.value = amp
    o.connect(og).connect(g)
    o.start(now)
    o.stop(now + 6.2)
  }
  g.connect(out)
}

function bellLoop(c: AudioContext, out: GainNode) {
  if (!running) return
  bell(c, out)
  schedule(() => bellLoop(c, out), 14000 + Math.random() * 22000)
}

function startWind(c: AudioContext, out: GainNode) {
  const len = c.sampleRate * 4
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3
  }
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 320
  bp.Q.value = 0.5
  const g = c.createGain()
  g.gain.value = 0.10
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.07
  const lfoG = c.createGain()
  lfoG.gain.value = 0.05
  lfo.connect(lfoG).connect(g.gain)
  src.connect(bp).connect(g).connect(out)
  src.start()
  lfo.start()
  nodes.push(src, lfo, bp, g)
}

// ── Viešas API ────────────────────────────────────────────────────────────────

/** Paleidžia ambient. Grąžina stop funkciją. */
export function startAmbient(): () => void {
  if (running) return stopAmbient
  running = true
  const c = ac()
  master = c.createGain()
  master.gain.setValueAtTime(0.0001, c.currentTime)
  master.gain.linearRampToValueAtTime(isUiSoundEnabled() ? VOLUME : 0.0001, c.currentTime + 3)
  master.connect(c.destination)

  startDrone(c, master)
  startWind(c, master)
  padLoop(c, master)
  schedule(() => { if (running && master) bellLoop(c, master) }, 6000)

  // globalus garso jungiklis tildo/grąžina muziką
  unsubscribe = subscribeUiSound((enabled) => {
    if (!master || !ctx) return
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.linearRampToValueAtTime(enabled ? VOLUME : 0.0001, ctx.currentTime + 0.8)
  })
  return stopAmbient
}

export function stopAmbient(): void {
  if (!running) return
  running = false
  timers.forEach(clearTimeout)
  timers = []
  unsubscribe?.()
  unsubscribe = null
  if (master && ctx) {
    const m = master
    m.gain.cancelScheduledValues(ctx.currentTime)
    m.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2)
    const toStop = [...nodes]
    setTimeout(() => {
      for (const n of toStop) {
        try { (n as OscillatorNode).stop?.() } catch { /* jau sustojo */ }
        try { n.disconnect() } catch { /* tyliai */ }
      }
      try { m.disconnect() } catch { /* tyliai */ }
    }, 1400)
  }
  nodes = []
  master = null
}
