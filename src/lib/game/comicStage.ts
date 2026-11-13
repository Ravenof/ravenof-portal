// ── comicStage — komikso intarpo variklis (iškvietimų „Kirtis") ───────────────
// Aštrių kampų kadrai (DOM + clip-path, komponuoja GPU) + vienas canvas greičio
// linijoms, pjūviui, žybsniams ir dalelėms. Vienas rAF, be alokacijų kadre.
// Tik kosmetika – žaidimo būsenos nekeičia. Peržiūra, iš kurios perkelta:
// ravenof-comic-preview-vaela.html (projekto aplanko šaknyje).
// Garsai kol kas sintetiniai (WebAudio) – failų dar nėra.

import { getSfxVolume } from '@/lib/settings'
import { isUiSoundEnabled } from '@/lib/ui-sound'

export type ComicLevel = 'full' | 'medium' | 'short' | 'static'
export type ComicFocus = [number, number]
export type ComicSpec = {
  level: ComicLevel
  closeup?: string
  action?: string
  hero?: string
  title: string
  /** Frakcijos švytėjimo spalva „r,g,b". */
  rgb: string
  focus?: { closeup?: ComicFocus; action?: ComicFocus; hero?: ComicFocus }
}

/** Sieninio laiko (ms) gairės: kada trenkiasi herojaus kadras ir kada kadrai pradeda išslysti. */
export const COMIC_TIMES: Record<ComicLevel, { heroAt: number; exitAt: number }> = {
  full: { heroAt: 1290, exitAt: 1995 },
  medium: { heroAt: 750, exitAt: 1245 },
  short: { heroAt: 300, exitAt: 710 },
  static: { heroAt: 0, exitAt: 620 },
}
/** Kiek trunka kadrų išslydimas po exitAt. */
export const COMIC_EXIT_MS = 340

type Pt = [number, number]
type Panel = { el: HTMLDivElement; img: HTMLImageElement; fl: HTMLDivElement; x: number; y: number; s: number; rot: number; a: number; f: number; z: number; ix: number; iy: number }
type Tw = { o: Record<string, number>; k: string; to: number; t0: number; dur: number; ease: (p: number) => number; from: number | null }

const ZIG: Pt[] = [[0, 50], [40, 45], [34, 60], [100, 53]]
const FLAT: Pt[] = [[0, 52], [100, 49]]
const POLY: Record<'A' | 'B' | 'Wd' | 'Hr', Pt[]> = {
  A: [[3, 12], [97, 5], [97, 50.5], [35.6, 57.2], [41.2, 42.6], [3, 47.2]],
  B: [[3, 52.6], [38.4, 48], [32.4, 63.2], [97, 56], [97, 93], [3, 96]],
  Wd: [[3, 50], [97, 20], [97, 82]],
  Hr: [[62, 3], [98, 5], [96, 98], [57, 95]],
}

const eo = (p: number) => 1 - Math.pow(1 - p, 3)
const ei = (p: number) => p * p * p
const lin = (p: number) => p
const eob = (p: number) => { const c = 2.2; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2) }

function isLow(): boolean {
  try { const q = localStorage.getItem('rvn-vfx-quality'); if (q === 'low') return true; if (q === 'high') return false } catch { /* */ }
  const n = navigator as Navigator & { deviceMemory?: number }
  return (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 4
}

// ── Sintetiniai garsai (laikini) ──────────────────────────────────────────────
let AC: AudioContext | null = null
let MG: GainNode | null = null
function audio(): { a: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined' || !isUiSoundEnabled()) return null
  const vol = getSfxVolume()
  if (vol <= 0.001) return null
  try {
    if (!AC) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      AC = new Ctor(); MG = AC.createGain(); MG.connect(AC.destination)
    }
    if (AC.state === 'suspended') void AC.resume()
    MG!.gain.value = 0.7 * vol
    return { a: AC, out: MG! }
  } catch { return null }
}
function nz(a: AudioContext, d: number): AudioBufferSourceNode {
  const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * d)), a.sampleRate), c = b.getChannelData(0)
  for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1
  const s = a.createBufferSource(); s.buffer = b; return s
}
function env(g: GainNode, t: number, at: number, d: number, v: number) {
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + at); g.gain.exponentialRampToValueAtTime(0.0001, t + at + d)
}
function chain(out: AudioNode, ...n: AudioNode[]) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); n[n.length - 1].connect(out) }
const S = {
  zap() { const x = audio(); if (!x) return; const { a, out } = x, t = a.currentTime
    const n = nz(a, 0.2), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'highpass'; f.frequency.value = 2500; env(g, t, 0.005, 0.16, 0.5); chain(out, n, f, g); n.start(t)
    const o = a.createOscillator(), g2 = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(2200, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.14); env(g2, t, 0.004, 0.15, 0.22); chain(out, o, g2); o.start(t); o.stop(t + 0.2) },
  whoosh() { const x = audio(); if (!x) return; const { a, out } = x, t = a.currentTime
    const n = nz(a, 0.4), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.28); env(g, t, 0.12, 0.22, 0.4); chain(out, n, f, g); n.start(t) },
  hit(fr: number, v: number) { const x = audio(); if (!x) return; const { a, out } = x, t = a.currentTime
    const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(fr * 1.6, t); o.frequency.exponentialRampToValueAtTime(fr * 0.35, t + 0.22); env(g, t, 0.004, 0.3, v); chain(out, o, g); o.start(t); o.stop(t + 0.4)
    const n = nz(a, 0.08), f = a.createBiquadFilter(), g2 = a.createGain(); f.type = 'lowpass'; f.frequency.value = 1800; env(g2, t, 0.002, 0.06, 0.35 * v); chain(out, n, f, g2); n.start(t) },
  bell() { const x = audio(); if (!x) return; const { a, out } = x, t = a.currentTime
    for (const [m, v, d] of [[1, 0.5, 2.2], [2.76, 0.22, 1.6], [5.4, 0.1, 1], [8.9, 0.05, 0.6]]) { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 98 * m; env(g, t, 0.004, d, v); chain(out, o, g); o.start(t); o.stop(t + d + 0.1) } },
  stab() { const x = audio(); if (!x) return; const { a, out } = x, t = a.currentTime
    const f = a.createBiquadFilter(), g = a.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(420, t + 1.2); env(g, t, 0.012, 1.4, 0.16); f.connect(g); g.connect(out)
    for (const fr of [73.4, 110, 174.6, 293.7]) for (const dt of [-6, 6]) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + 1.6) } },
  riser(d: number) { const x = audio(); if (!x) return; const { a, out } = x, t = a.currentTime
    const n = nz(a, d + 0.1), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(1800, t + d)
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2, t + d); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.06); chain(out, n, f, g); n.start(t) },
}

/**
 * Sugroja intarpą `root` elemente (turi dengti visą ekraną). `onDone` – kai kadrai išslydo.
 * Bakstelėjimas po 0,4 s praleidžia. `destroy()` nutraukia be `onDone`.
 */
export function playComic(root: HTMLElement, spec: ComicSpec, onDone: () => void): { destroy: () => void } {
  const low = isLow()
  const VW = root.clientWidth || window.innerWidth, VH = root.clientHeight || window.innerHeight
  const SW = Math.min(VW, VH * 16 / 9), SH = SW * 9 / 16, OX = (VW - SW) / 2, OY = (VH - SH) / 2
  const DPR = low ? 1 : Math.min(2, window.devicePixelRatio || 1)
  const rgb = spec.rgb
  root.textContent = ''
  const mkDiv = (css: string, parent: HTMLElement) => { const d = document.createElement('div'); d.style.cssText = css; parent.appendChild(d); return d }
  const dimEl = mkDiv('position:absolute;inset:0;background:#030504;opacity:0', root)
  const world = mkDiv(`position:absolute;left:${OX}px;top:${OY}px;width:${SW}px;height:${SH}px;will-change:transform`, root)
  const g1 = mkDiv('position:absolute;inset:0;transform-origin:0 50%;will-change:transform', world)
  const topEl = mkDiv('position:absolute;inset:0', world)
  const titleEl = mkDiv(`position:absolute;left:3%;bottom:5%;opacity:0;transform-origin:0 100%;white-space:nowrap;font-family:var(--rvn-font-display),Georgia,serif;font-weight:800;color:#f3f7f0;background:#040404;padding:.12em .9em .2em .7em;clip-path:polygon(2.5% 0,100% 10%,97% 100%,0 88%);font-size:${SW * 0.038}px;text-shadow:0 0 .35em rgba(${rgb},.75)`, world)
  titleEl.textContent = spec.title
  const cv = document.createElement('canvas')
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR)
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'
  root.appendChild(cv)
  const ctx = cv.getContext('2d')

  const BW = Math.max(3, SW * 0.0045)
  const mk = (parent: HTMLElement, src: string, poly: Pt[], focus: ComicFocus): Panel => {
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1])
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0
    const cp = 'polygon(' + poly.map(([x, y]) => ((x - x0) / w * 100).toFixed(2) + '% ' + ((y - y0) / h * 100).toFixed(2) + '%').join(',') + ')'
    const el = mkDiv(`position:absolute;left:${x0}%;top:${y0}%;width:${w}%;height:${h}%;opacity:0;will-change:transform${low ? '' : `;filter:drop-shadow(0 0 ${(SW * 0.009).toFixed(1)}px rgba(${rgb},.5))`}`, parent)
    mkDiv(`position:absolute;inset:0;background:#040404;clip-path:${cp}`, el)
    const pic = mkDiv(`position:absolute;inset:${BW}px;overflow:hidden;background:#000;clip-path:${cp}`, el)
    const img = document.createElement('img'); img.draggable = false; img.alt = ''; img.decoding = 'async'
    img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${focus[0]}% ${focus[1]}%;will-change:transform`
    img.src = src; pic.appendChild(img)
    const fl = mkDiv(`position:absolute;inset:0;background:#fff;opacity:0;clip-path:${cp}`, el)
    return { el, img, fl, x: 0, y: 0, s: 1, rot: 0, a: 0, f: 0, z: 1.2, ix: 0, iy: 0 }
  }
  const fc = spec.focus ?? {}
  const P: { A?: Panel; B?: Panel; Wd?: Panel; Hr?: Panel } = {}
  const lvl = spec.level
  if (lvl === 'full') {
    if (spec.closeup) P.A = mk(g1, spec.closeup, POLY.A, fc.closeup ?? [50, 50])
    if (spec.action) P.B = mk(g1, spec.action, POLY.B, fc.action ?? [55, 62])
    if (spec.hero) P.Hr = mk(topEl, spec.hero, POLY.Hr, fc.hero ?? [48, 30])
  } else if (lvl === 'medium') {
    if (spec.closeup) P.Wd = mk(g1, spec.closeup, POLY.Wd, fc.closeup ?? [50, 50])
    if (spec.hero) P.Hr = mk(topEl, spec.hero, POLY.Hr, fc.hero ?? [48, 30])
  } else if (lvl === 'short') {
    const src = spec.closeup ?? spec.hero
    if (src) P.Wd = mk(g1, src, POLY.Wd, spec.closeup ? (fc.closeup ?? [50, 50]) : (fc.hero ?? [48, 30]))
  } else {
    const src = spec.hero ?? spec.closeup
    if (src) P.Hr = mk(topEl, src, POLY.Hr, spec.hero ? (fc.hero ?? [48, 30]) : (fc.closeup ?? [50, 50]))
  }
  const PL = Object.values(P) as Panel[]

  const G = { s: 1 }, D = { a: 0 }, Ti = { a: 0, s: 1 }, SHK = { m: 0 }, FL = { a: 0 }, LN = { a: 0, cx: 50, cy: 50 }
  let T = 0, last = 0, hold = 0, run = true, exiting = false, finished = false, raf = 0
  const t0wall = performance.now()
  let Q: { t: number; fn: () => void }[] = []
  let TW: Tw[] = []
  const parts: { x: number; y: number; vx: number; vy: number; l: number; m: number; r: number }[] = []
  const slashes: { pts: Pt[]; t0: number; dur: number; fade: number }[] = []

  const at = (ms: number, fn: () => void) => { Q.push({ t: T + ms, fn }) }
  const tw = (o: object, props: Record<string, number>, dur: number, ease: (p: number) => number = eo, delay = 0) => {
    const oo = o as Record<string, number>, t0 = T + delay
    for (const k in props) { TW = TW.filter((w) => !(w.o === oo && w.k === k && w.t0 <= t0)); TW.push({ o: oo, k, to: props[k], t0, dur, ease, from: null }) }
  }
  const shake = (m: number) => { SHK.m = Math.max(SHK.m, m) }
  const flash = (a: number, d: number) => { FL.a = low ? a * 0.6 : a; tw(FL, { a: 0 }, d, lin) }
  const slash = (pts: Pt[], dur: number, fade: number) => { slashes.push({ pts, t0: T, dur, fade }) }
  const burst = (xp: number, yp: number, n: number, pow: number) => {
    if (low) n = Math.round(n / 3)
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = (0.15 + Math.random() * 0.75) * pow * SW / 1000
      parts.push({ x: OX + xp * SW / 100, y: OY + yp * SH / 100, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.05 * SW / 1000, l: 0, m: 500 + Math.random() * 700, r: (1.2 + Math.random() * 2.6) * SW / 1000 }) }
  }
  const enter = (p: Panel, fx: number, fy: number) => { p.a = 1; p.x = fx; p.y = fy; p.z = 1.2; tw(p, { x: 0, y: 0 }, 210, eo); at(150, () => { p.f = 1; tw(p, { f: 0 }, 240); shake(9) }) }
  const heroSlam = (t: number) => {
    const h = P.Hr; if (!h) return
    at(t, () => { tw(G, { s: 0.58 }, 170); tw(LN, { a: 0 }, 120); h.a = 1; h.y = -125; h.s = 1.35; h.rot = 5; h.z = 1.18; tw(h, { y: 0, s: 1, rot: 0 }, 190, ei); S.whoosh() })
    at(t + 190, () => { hold = 95; h.f = 1; tw(h, { f: 0 }, 260); shake(20); flash(0.45, 300); burst(77, 55, 70, 1); S.bell(); S.stab(); S.hit(90, 1)
      h.s = 1.06; tw(h, { s: 1 }, 260, eob); tw(h, { z: 1.04 }, 900, lin); LN.cx = 77; LN.cy = 45; LN.a = 0.55; tw(LN, { a: 0.22 }, 500, lin)
      Ti.a = 1; Ti.s = 2.2; tw(Ti, { s: 1 }, 160, ei) })
  }
  const cleanup = () => { run = false; if (raf) cancelAnimationFrame(raf); root.removeEventListener('pointerdown', onTap); root.textContent = '' }
  const finish = () => { if (finished) return; finished = true; cleanup(); onDone() }
  const exit = () => {
    if (exiting) return
    exiting = true; Q = []
    tw(LN, { a: 0 }, 100); tw(Ti, { a: 0 }, 160)
    const dir: Record<string, Record<string, number>> = { A: { x: -140, rot: -6 }, B: { x: 140, rot: 5 }, Wd: { x: -140, rot: -4 }, Hr: { y: 130, rot: 4 } }
    for (const k of Object.keys(P) as (keyof typeof P)[]) { const p = P[k]; if (p && p.a > 0) { tw(p, dir[k], 260, ei); tw(p, { a: 0 }, 60, lin, 230) } }
    tw(D, { a: 0 }, 300, lin, 40)
    at(COMIC_EXIT_MS, finish)
  }
  function onTap() { if (!exiting && performance.now() - t0wall > 400) exit() }
  root.addEventListener('pointerdown', onTap)

  // ── Scenarijai ──
  if (lvl === 'full') {
    S.riser(1.25); tw(D, { a: 0.86 }, 140); slash(ZIG, 150, 280); S.zap()
    at(150, () => { if (P.A) { enter(P.A, 115, 0); tw(P.A, { z: 1.06 }, 1800, lin) } S.whoosh(); S.hit(150, 0.7); LN.cx = 50; LN.cy = 28; tw(LN, { a: 0.5 }, 80) })
    at(600, () => { if (P.B) { enter(P.B, -115, 0); tw(P.B, { z: 1.05, ix: -1.5 }, 1500, lin) } S.whoosh(); S.hit(190, 0.8); LN.cy = 72 })
    heroSlam(1100); at(1900, exit)
  } else if (lvl === 'medium') {
    S.riser(0.75); tw(D, { a: 0.86 }, 120); slash(FLAT, 120, 240); S.zap()
    at(120, () => { if (P.Wd) { enter(P.Wd, 115, 0); tw(P.Wd, { z: 1.08 }, 1000, lin) } S.whoosh(); S.hit(150, 0.7); LN.cx = 50; LN.cy = 50; tw(LN, { a: 0.5 }, 80) })
    heroSlam(560); at(1150, exit)
  } else if (lvl === 'short') {
    tw(D, { a: 0.8 }, 90); slash(FLAT, 100, 220); S.zap()
    at(100, () => { if (P.Wd) { enter(P.Wd, 115, 0); tw(P.Wd, { z: 1.1 }, 600, lin) } S.whoosh(); LN.cx = 50; LN.cy = 50; tw(LN, { a: 0.5 }, 80) })
    at(300, () => { hold = 60; flash(0.3, 220); S.hit(110, 0.9); S.bell() })
    at(650, exit)
  } else {
    tw(D, { a: 0.8 }, 160); if (P.Hr) { P.Hr.z = 1; tw(P.Hr, { a: 1 }, 180, lin) } Ti.a = 1
    at(COMIC_TIMES.static.exitAt, exit)
  }

  const rnd = (s: number) => { let x = s | 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000 } }
  const draw = (dt: number) => {
    if (!ctx) return
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, VW, VH)
    if (LN.a > 0.01 && !low) {
      const r = rnd(Math.floor(T / 55) * 7919 + 13), cx = OX + LN.cx * SW / 100, cy = OY + LN.cy * SH / 100, R = Math.hypot(VW, VH) * 0.62
      ctx.fillStyle = `rgba(232,255,240,${LN.a})`; ctx.beginPath()
      for (let i = 0; i < 46; i++) { const a = r() * 6.283, r0 = R * (0.42 + r() * 0.3), w = 0.004 + r() * 0.013
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a - w) * R * 1.3, cy + Math.sin(a - w) * R * 1.3); ctx.lineTo(cx + Math.cos(a + w) * R * 1.3, cy + Math.sin(a + w) * R * 1.3) }
      ctx.fill()
    }
    for (let i = slashes.length - 1; i >= 0; i--) {
      const s = slashes[i], e = T - s.t0, p = Math.min(1, e / s.dur), al = e < s.dur ? 1 : 1 - (e - s.dur) / s.fade
      if (al <= 0) { slashes.splice(i, 1); continue }
      const pts = s.pts.map(([x, y]) => [x * VW / 100, OY + y * SH / 100]); let tot = 0; const seg: number[] = []
      for (let j = 1; j < pts.length; j++) { const l = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); seg.push(l); tot += l }
      let left = tot * p; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
      for (let j = 1; j < pts.length && left > 0; j++) { const l = seg[j - 1], k = Math.min(1, left / l); ctx.lineTo(pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * k, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * k); left -= l }
      ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.strokeStyle = `rgba(${rgb},${0.4 * al})`; ctx.lineWidth = SW * 0.016; ctx.stroke()
      ctx.strokeStyle = `rgba(250,255,252,${al})`; ctx.lineWidth = SW * 0.0045; ctx.stroke()
    }
    if (parts.length) {
      ctx.globalCompositeOperation = 'lighter'
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.l += dt
        if (q.l >= q.m) { parts[i] = parts[parts.length - 1]; parts.pop(); continue }
        const dk = Math.pow(0.985, dt / 16.7); q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= dk; q.vy *= dk; const k = 1 - q.l / q.m
        ctx.fillStyle = `rgba(${rgb},${k * 0.9})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (0.5 + k * 0.5), 0, 6.283); ctx.fill() }
      ctx.globalCompositeOperation = 'source-over'
    }
    if (FL.a > 0.005) { ctx.fillStyle = `rgba(${rgb},${FL.a * 0.35})`; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = `rgba(255,255,255,${FL.a * 0.75})`; ctx.fillRect(0, 0, VW, VH) }
  }
  const frame = (now: number) => {
    if (!run) return
    const rdt = Math.min(100, now - last); last = now
    let dt = rdt; if (hold > 0) { hold -= dt; dt = 0 } T += dt
    Q.sort((a, b) => a.t - b.t)
    while (run && Q.length && Q[0].t <= T) { Q.shift()!.fn() }
    if (!run) return
    for (let i = TW.length - 1; i >= 0; i--) { const w = TW[i]; if (T < w.t0) continue; if (w.from === null) w.from = w.o[w.k]
      const p = w.dur <= 0 ? 1 : Math.min(1, (T - w.t0) / w.dur); w.o[w.k] = w.from + (w.to - w.from) * w.ease(p); if (p >= 1) TW.splice(i, 1) }
    for (const p of PL) { const e = p.el.style; e.opacity = String(p.a); if (p.a <= 0) continue
      e.transform = `translate(${p.x * SW / 100}px,${p.y * SH / 100}px) rotate(${p.rot}deg) scale(${p.s})`
      p.img.style.transform = `translate(${p.ix}%,${p.iy}%) scale(${p.z})`; p.fl.style.opacity = String(p.f) }
    g1.style.transform = `scale(${G.s})`; dimEl.style.opacity = String(D.a)
    titleEl.style.opacity = String(Ti.a); titleEl.style.transform = `rotate(-3deg) scale(${Ti.s})`
    if (SHK.m > 0.3) { const m = SHK.m * SW / 1000; world.style.transform = `translate(${(Math.random() * 2 - 1) * m}px,${(Math.random() * 2 - 1) * m}px)`; if (dt > 0) SHK.m *= Math.pow(0.86, dt / 16.7) } else if (SHK.m !== 0) { SHK.m = 0; world.style.transform = '' }
    draw(dt)
    raf = requestAnimationFrame(frame)
  }
  last = performance.now(); raf = requestAnimationFrame(frame)
  return { destroy: () => { if (!finished) { finished = true; cleanup() } } }
}
