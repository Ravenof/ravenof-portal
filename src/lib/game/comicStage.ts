// ── comicStage — komikso intarpo variklis (iškvietimų „Kirtis") ───────────────
// Aštrių kampų kadrai (DOM + clip-path, komponuoja GPU) + vienas canvas greičio
// linijoms, pjūviui, žybsniams ir dalelėms. Vienas rAF, be alokacijų kadre.
// Tik kosmetika – žaidimo būsenos nekeičia. Peržiūra, iš kurios perkelta:
// ravenof-comic-preview-personazai.html (projekto aplanko šaknyje).
// Keturi iškvietimo šablonai, personažų vizualų rinkiniai (kit) ir čempiono gebėjimų intarpai.
// Garsai kol kas sintetiniai (WebAudio) – failų dar nėra.

import { getSfxVolume } from '@/lib/settings'
import { isUiSoundEnabled } from '@/lib/ui-sound'

export type ComicLevel = 'full' | 'medium' | 'short' | 'static'
export type ComicFocus = [number, number]
/** Pilno iškvietimo intarpo išdėstymas. */
export type ComicTemplate = 'zaibas' | 'sukes' | 'plysys' | 'kryzius'
/** Personažo vizualų rinkinys: pjūvio forma, aplinkos dalelės, smūgio ir išėjimo efektai. */
export type ComicKit = 'grave' | 'arcane' | 'storm' | 'holy' | 'inferno'
/** summon – iškvietimas; skill – 1/2 gebėjimas (vienas kadras); ult – 3 gebėjimas už auksą. */
export type ComicKind = 'summon' | 'skill' | 'ult'
export const COMIC_TEMPLATES: { value: ComicTemplate; label: string }[] = [
  { value: 'zaibas', label: 'Žaibas – akys, veiksmas, herojus dešinėje' },
  { value: 'sukes', label: 'Šukės – trys statūs kadrai, herojus centre' },
  { value: 'plysys', label: 'Plyšys – herojus pirmas kairėje, du kadrai dešinėje' },
  { value: 'kryzius', label: 'Kryžius – X pjūvis, herojus centre' },
]
export const COMIC_KITS: { value: ComicKit; label: string }[] = [
  { value: 'grave', label: 'Kapai – plunksnos ir rūkas, kadrai nugrimzta' },
  { value: 'arcane', label: 'Arkana – žaibuotas pjūvis, spyglių žiedas, kadrai susitraukia į tuštumą' },
  { value: 'storm', label: 'Audra – kibirkštys, žaibo smūgis, kadrai išsilaksto' },
  { value: 'holy', label: 'Šventas – plunksnos ir šviesos stulpas, kadrai pakyla' },
  { value: 'inferno', label: 'Pragaras – kylančios žarijos, liepsnų žiedas, kadrai sudega' },
]
export type ComicSpec = {
  level: ComicLevel
  /** Numatyta – 'summon'. */
  kind?: ComicKind
  /** Tik pilnam iškvietimo lygiui. Numatyta – 'zaibas'. */
  template?: ComicTemplate
  /** Tik iškvietimui. */
  kit?: ComicKit
  closeup?: string
  action?: string
  hero?: string
  /** Gebėjimo kadro paveikslėlis (kind 'skill' / 'ult'). */
  image?: string
  imageFocus?: ComicFocus
  /** Gebėjimo kadras įlekia iš šios pusės (1 gebėjimas – iš dešinės, 2 – iš kairės). */
  side?: 'left' | 'right'
  /** Švelnus smūgio garsas (2 gebėjimas). */
  soft?: boolean
  /** Pakartotinis gebėjimas toje pačioje kovoje – trumpa versija be pavadinimo. */
  rep?: boolean
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
const FULL_TIMES: Record<ComicTemplate, { heroAt: number; exitAt: number }> = {
  zaibas: COMIC_TIMES.full,
  sukes: { heroAt: 1100, exitAt: 1845 },
  plysys: { heroAt: 350, exitAt: 2100 },
  kryzius: { heroAt: 1170, exitAt: 1915 },
}
/** Laiko gairės konkrečiam intarpui (herojaus / gebėjimo kadro smūgis ir išslydimo pradžia). */
export function comicTimes(s: Pick<ComicSpec, 'level' | 'kind' | 'template' | 'rep'>): { heroAt: number; exitAt: number } {
  if (s.kind === 'skill') return s.rep ? { heroAt: 150, exitAt: 360 } : { heroAt: 280, exitAt: 740 }
  if (s.kind === 'ult') return s.rep ? { heroAt: 340, exitAt: 870 } : { heroAt: 810, exitAt: 1610 }
  if (s.level === 'full') return FULL_TIMES[s.template ?? 'zaibas']
  return COMIC_TIMES[s.level]
}
/** Kiek trunka kadrų išslydimas po exitAt (be personažo išėjimo efekto). */
export const COMIC_EXIT_MS = 340
/** Kiek intarpo sluoksnis dar gyvas po exitAt – personažo išėjimo efektai trunka ilgiau. */
export function comicExitMs(s: Pick<ComicSpec, 'kind' | 'kit' | 'level'>): number {
  if ((s.kind ?? 'summon') !== 'summon' || s.level === 'static') return COMIC_EXIT_MS
  return s.kit === 'arcane' ? 680 : s.kit === 'holy' ? 720 : s.kit === 'grave' ? 380 : s.kit === 'inferno' ? 520 : COMIC_EXIT_MS
}

type Pt = [number, number]
type Panel = { el: HTMLDivElement; img: HTMLImageElement; fl: HTMLDivElement; box: [number, number, number, number]; g1: boolean; x: number; y: number; s: number; rot: number; a: number; f: number; z: number; ix: number; iy: number }
type Tw = { o: Record<string, number>; k: string; to: number; t0: number; dur: number; ease: (p: number) => number; from: number | null }

const ZIG: Pt[] = [[0, 50], [40, 45], [34, 60], [100, 53]]
const FLAT: Pt[] = [[0, 52], [100, 49]]
const POLY: Record<string, Pt[]> = {
  A: [[3, 12], [97, 5], [97, 50.5], [35.6, 57.2], [41.2, 42.6], [3, 47.2]],
  B: [[3, 52.6], [38.4, 48], [32.4, 63.2], [97, 56], [97, 93], [3, 96]],
  Wd: [[3, 50], [97, 20], [97, 82]],
  Hr: [[62, 3], [98, 5], [96, 98], [57, 95]],
  // gebėjimai
  S1: [[3, 40], [97, 20], [97, 82], [3, 60]],
  S2: [[3, 20], [97, 40], [97, 60], [3, 82]],
  Ey: [[3, 8], [97, 3], [97, 27], [3, 36]],
  Ul: [[3, 40], [97, 31], [97, 97], [3, 94]],
  // Šukės
  ShL: [[3, 6], [33, 3], [28, 97], [2, 93]],
  ShR: [[67, 4], [98, 7], [97, 94], [72, 97]],
  ShC: [[32, 2], [68, 5], [71, 98], [28, 96]],
  // Plyšys
  PlH: [[4, 4], [50, 2], [46, 98], [2, 95]],
  PlE: [[54, 6], [97, 3], [97, 43], [51, 48]],
  PlA: [[51, 52], [97, 47], [97, 96], [49, 93]],
  // Kryžius
  KrT: [[6, 3], [94, 3], [50, 46]],
  KrB: [[6, 97], [94, 97], [50, 54]],
  KrH: [[40, 3], [62, 5], [72, 50], [60, 97], [38, 95], [28, 50]],
}
const EXIT_DIR: Record<string, Record<string, number>> = {
  A: { x: -140, rot: -6 }, B: { x: 140, rot: 5 }, Wd: { x: -140, rot: -4 }, Hr: { y: 130, rot: 4 },
  S1: { x: -140, rot: -4 }, S2: { x: 140, rot: 4 }, Ey: { x: 140, rot: 3 }, Ul: { y: 130, rot: -3 },
  ShL: { y: -130 }, ShR: { y: 130 }, ShC: { s: 1.8 }, PlH: { x: -140, rot: -5 }, PlE: { x: 140, rot: 4 }, PlA: { x: 140, rot: -4 },
  KrT: { y: -130 }, KrB: { y: 130 }, KrH: { s: 0.12, y: 21 },
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
  coin() { const x = audio(); if (!x) return; const { a, out } = x, t = a.currentTime
    for (const [f, d] of [[2637, 0], [3520, 0.07], [4186, 0.14]]) { const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = f; env(g, t + d, 0.002, 0.28, 0.16); chain(out, o, g); o.start(t + d); o.stop(t + d + 0.4) } },
  chime() { const x = audio(); if (!x) return; const { a, out } = x, t = a.currentTime
    for (const [f, d, v] of [[660, 0, 0.2], [990, 0.06, 0.14], [1320, 0.12, 0.09]]) { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; env(g, t + d, 0.01, 0.7, v); chain(out, o, g); o.start(t + d); o.stop(t + d + 0.9) } },
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
  const kind: ComicKind = spec.kind ?? 'summon'
  const lvl = spec.level
  const tpl: ComicTemplate = spec.template ?? 'zaibas'
  const kit: ComicKit | undefined = kind === 'summon' && lvl !== 'static' ? spec.kit : undefined
  const rep = !!spec.rep
  const jag = kit === 'arcane' || kit === 'storm'
  const posBr = (kind === 'summon' && lvl === 'full' && tpl === 'kryzius') || (kind === 'skill' && spec.side === 'left')
  const sx = (xp: number) => OX + xp * SW / 100, sy = (yp: number) => OY + yp * SH / 100
  root.textContent = ''
  const mkDiv = (css: string, parent: HTMLElement) => { const d = document.createElement('div'); d.style.cssText = css; parent.appendChild(d); return d }
  const dimEl = mkDiv('position:absolute;inset:0;background:#030504;opacity:0', root)
  const world = mkDiv(`position:absolute;left:${OX}px;top:${OY}px;width:${SW}px;height:${SH}px;will-change:transform`, root)
  const g1 = mkDiv('position:absolute;inset:0;transform-origin:0 50%;will-change:transform', world)
  const topEl = mkDiv('position:absolute;inset:0', world)
  const titleEl = mkDiv(`position:absolute;${posBr ? 'right:3%;transform-origin:100% 100%' : 'left:3%;transform-origin:0 100%'};bottom:5%;opacity:0;white-space:nowrap;font-family:var(--rvn-font-display),Georgia,serif;font-weight:800;color:#f3f7f0;background:#040404;padding:.12em .9em .2em .7em;clip-path:polygon(2.5% 0,100% 10%,97% 100%,0 88%);font-size:${SW * (kind === 'skill' ? 0.027 : 0.038)}px;text-shadow:0 0 .35em rgba(${rgb},.75)`, world)
  titleEl.textContent = spec.title
  const cv = document.createElement('canvas')
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR)
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'
  root.appendChild(cv)
  const ctx = cv.getContext('2d')

  const BW = Math.max(3, SW * 0.0045)
  const P: Record<string, Panel> = {}
  const add = (k: string, parent: HTMLElement, src: string | undefined, focus: ComicFocus) => {
    if (!src) return
    const poly = POLY[k]
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
    P[k] = { el, img, fl, box: [x0, y0, w, h], g1: parent === g1, x: 0, y: 0, s: 1, rot: 0, a: 0, f: 0, z: 1.2, ix: 0, iy: 0 }
  }
  const fc = spec.focus ?? {}
  const fC: ComicFocus = fc.closeup ?? [50, 50], fA: ComicFocus = fc.action ?? [55, 62], fH: ComicFocus = fc.hero ?? [48, 30]
  if (kind === 'skill') {
    add(spec.side === 'left' ? 'S2' : 'S1', topEl, spec.image, spec.imageFocus ?? [50, 50])
  } else if (kind === 'ult') {
    if (!rep) add('Ey', topEl, spec.closeup, fC)
    add('Ul', topEl, spec.image, spec.imageFocus ?? [50, 35])
  } else if (lvl === 'full') {
    if (tpl === 'sukes') { add('ShL', topEl, spec.closeup, fC); add('ShR', topEl, spec.action, fA); add('ShC', topEl, spec.hero, fH) }
    else if (tpl === 'plysys') { add('PlH', topEl, spec.hero, fH); add('PlE', topEl, spec.closeup, fC); add('PlA', topEl, spec.action, fA) }
    else if (tpl === 'kryzius') { add('KrT', topEl, spec.closeup, fC); add('KrB', topEl, spec.action, fA); add('KrH', topEl, spec.hero, fH) }
    else { add('A', g1, spec.closeup, fC); add('B', g1, spec.action, fA); add('Hr', topEl, spec.hero, fH) }
  } else if (lvl === 'medium') {
    add('Wd', g1, spec.closeup, fC); add('Hr', topEl, spec.hero, fH)
  } else if (lvl === 'short') {
    if (spec.closeup) add('Wd', g1, spec.closeup, fC); else add('Wd', g1, spec.hero, fH)
  } else {
    if (spec.hero) add('Hr', topEl, spec.hero, fH); else add('Hr', topEl, spec.closeup, fC)
  }
  const PK = Object.keys(P), PL = PK.map((k) => P[k])

  const G = { s: 1 }, D = { a: 0 }, Ti = { a: 0, s: 1 }, SHK = { m: 0 }, FL = { a: 0 }, LN = { a: 0, cx: 50, cy: 50 }
  let T = 0, last = 0, hold = 0, run = true, exiting = false, finished = false, raf = 0, amb = 0
  const t0wall = performance.now()
  let Q: { t: number; fn: () => void }[] = []
  let TW: Tw[] = []
  const parts: { x: number; y: number; vx: number; vy: number; l: number; m: number; r: number; c?: string }[] = []
  const slashes: { pts: Pt[]; t0: number; dur: number; fade: number }[] = []
  const rings: { x: number; y: number; r1: number; t0: number; dur: number; col?: string }[] = []
  const bolts: { a: Pt; b: Pt; t0: number; life: number; w: number; n?: number }[] = []
  const thorns: { x: number; y: number; t0: number; dur: number }[] = []
  const feathers: { col?: string; x: number; y: number; vx: number; vy: number; rot: number; vr: number; l: number; m: number; len: number }[] = []
  const mists: { x: number; y: number; vy: number; l: number; m: number; r: number }[] = []
  const voids: { t0: number; dur: number }[] = []
  const pillars: { x: number; y: number; t0: number; dur: number }[] = []
  const flares: { x: number; y: number; t0: number; dur: number; seed: number }[] = []
  /** Žarija: kyla aukštyn, šiek tiek plaukia į šoną. */
  const ember = (x: number, y: number, up: number, life: number) => { parts.push({ x, y, vx: (Math.random() - 0.5) * 0.12 * SW / 1000, vy: -up * SW / 1000, l: 0, m: life, r: (2 + 4.4 * Math.random()) * SW / 1000, c: Math.random() < 0.35 ? '255,225,150' : '255,150,50' }) }

  const at = (ms: number, fn: () => void) => { Q.push({ t: T + ms, fn }) }
  const tw = (o: object, props: Record<string, number>, dur: number, ease: (p: number) => number = eo, delay = 0) => {
    const oo = o as Record<string, number>, t0 = T + delay
    for (const k in props) { TW = TW.filter((w) => !(w.o === oo && w.k === k && w.t0 <= t0)); TW.push({ o: oo, k, to: props[k], t0, dur, ease, from: null }) }
  }
  const shake = (m: number) => { SHK.m = Math.max(SHK.m, m) }
  const flash = (a: number, d: number) => { FL.a = low ? a * 0.6 : a; tw(FL, { a: 0 }, d, lin) }
  const slash = (pts: Pt[], dur: number, fade: number) => { slashes.push({ pts, t0: T, dur, fade }) }
  const ring = (xp: number, yp: number, r1: number, dur: number, col?: string) => { rings.push({ x: sx(xp), y: sy(yp), r1: r1 * SW / 100, t0: T, dur, col }) }
  const burst = (xp: number, yp: number, n: number, pow: number) => {
    if (low) n = Math.round(n / 3)
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = (0.15 + Math.random() * 0.75) * pow * SW / 1000
      parts.push({ x: sx(xp), y: sy(yp), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.05 * SW / 1000, l: 0, m: 500 + Math.random() * 700, r: (1.2 + Math.random() * 2.6) * SW / 1000 }) }
  }
  const rnd = (s: number) => { let x = s | 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000 } }
  const jagPts = (a: Pt, b: Pt, n: number, amp: number, r: () => number): Pt[] => {
    const o: Pt[] = [a], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1
    for (let q = 1; q <= n; q++) { const t = q / n, off = q < n ? (r() - 0.5) * amp : 0; o.push([a[0] + dx * t - dy / L * off, a[1] + dy * t + dx / L * off]) }
    return o
  }
  const mkFeather = (x: number, y: number, vx: number, vy: number, m: number, col?: string) => {
    feathers.push({ col, x, y, vx, vy, rot: Math.random() * 6.283, vr: (Math.random() - 0.5) * 0.008, l: 0, m, len: SW * (0.012 + 0.014 * Math.random()) })
  }
  const featherCol = () => (Math.random() < 0.5 ? '#0b0a09' : '#e9dfc6')

  // ── Personažo vizualai: smūgis ──
  const kitSlam = (bx: number, by: number) => {
    if (!kit) return
    const x = sx(bx), y = sy(by)
    if (kit === 'arcane') {
      thorns.push({ x, y, t0: T, dur: 750 })
      for (let i = 0; i < 5; i++) { const a = Math.random() * 6.283, r = SW * (0.1 + 0.12 * Math.random()); bolts.push({ a: [x, y], b: [x + Math.cos(a) * r, y + Math.sin(a) * r], t0: T, life: 260, w: 1.4 }) }
    } else if (kit === 'storm') {
      bolts.push({ a: [x + (Math.random() - 0.5) * SW * 0.08, -10], b: [x, y], t0: T, life: 340, w: 3.2, n: 9 })
      bolts.push({ a: [x - SW * 0.06, -10], b: [x + SW * 0.03, y + SH * 0.22], t0: T + 70, life: 260, w: 1.8, n: 8 })
      ring(bx, by, 16, 600, '120,255,90'); ring(bx, by, 9, 800, '120,255,90'); S.zap()
    } else if (kit === 'inferno') {
      flares.push({ x, y, t0: T, dur: 800, seed: (Math.random() * 1e6) | 0 }); ring(bx, by, 22, 650, '255,170,60'); ring(bx, by, 12, 850, '255,120,40')
      for (let i = 0; i < (low ? 12 : 36); i++) { const a = Math.random() * 6.283, r = SW * 0.06 * Math.random(); ember(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.25 + 0.5 * Math.random(), 800 + Math.random() * 700) }
    } else if (kit === 'holy') {
      ring(bx, by, 24, 750); ring(bx, by, 13, 950); pillars.push({ x, y, t0: T, dur: 900 })
      for (let i = 0; i < (low ? 8 : 20); i++) { const a = Math.random() * 6.283, v = (0.2 + 0.45 * Math.random()) * SW / 1000; mkFeather(x, y, Math.cos(a) * v, Math.sin(a) * v, 900 + Math.random() * 600, featherCol()) }
    } else {
      for (let i = 0; i < (low ? 10 : 28); i++) { const a = Math.random() * 6.283, v = (0.2 + 0.5 * Math.random()) * SW / 1000; mkFeather(x, y, Math.cos(a) * v, Math.sin(a) * v, 900 + Math.random() * 600) }
    }
  }
  // ── Personažo vizualai: aplinka, kol kadrai ekrane ──
  const ambient = (dt: number) => {
    if (!kit || dt <= 0 || exiting || D.a < 0.3) return
    amb -= dt; if (amb > 0) return
    if (kit === 'grave') {
      amb = 70; mkFeather(Math.random() * VW * 1.1, -20, (-0.05 - 0.1 * Math.random()) * SW / 1000, (0.22 + 0.3 * Math.random()) * SW / 1000, 1500 + Math.random() * 600)
      if (!low) mists.push({ x: Math.random() * VW, y: VH * 1.05, vy: -(0.05 + 0.06 * Math.random()) * SW / 1000, l: 0, m: 1900, r: SW * (0.09 + 0.08 * Math.random()) })
      return
    }
    if (kit === 'inferno') {
      amb = 40; for (let i = 0; i < (low ? 2 : 6); i++) ember(Math.random() * VW, VH * (0.55 + 0.5 * Math.random()), 0.16 + 0.3 * Math.random(), 1200 + Math.random() * 900)
      return
    }
    if (kit === 'holy') {
      amb = 85; mkFeather(Math.random() * VW * 1.1, -20, (-0.04 - 0.08 * Math.random()) * SW / 1000, (0.2 + 0.25 * Math.random()) * SW / 1000, 1600 + Math.random() * 600, featherCol())
      if (!low) for (let i = 0; i < 2; i++) parts.push({ x: Math.random() * VW, y: VH * (0.55 + 0.5 * Math.random()), vx: (Math.random() - 0.5) * 0.02 * SW / 1000, vy: -(0.05 + 0.07 * Math.random()) * SW / 1000, l: 0, m: 1300 + Math.random() * 700, r: (0.9 + 1.6 * Math.random()) * SW / 1000 })
      return
    }
    amb = kit === 'storm' ? 55 : 95; if (low) return
    const vis = PL.filter((p) => p.a > 0.9 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && !(p.g1 && G.s < 0.99)); if (!vis.length) return
    const p = vis[(Math.random() * vis.length) | 0], b = p.box, e = (Math.random() * 4) | 0, t = Math.random()
    const px = sx(b[0] + (e < 2 ? t * b[2] : (e === 2 ? 0 : b[2]))), py = sy(b[1] + (e < 2 ? (e === 0 ? 0 : b[3]) : t * b[3]))
    const a = Math.random() * 6.283, r = SW * (0.025 + 0.045 * Math.random())
    bolts.push({ a: [px, py], b: [px + Math.cos(a) * r, py + Math.sin(a) * r], t0: T, life: 130, w: 1 })
  }

  const enter = (p: Panel | undefined, fx: number, fy: number) => { if (!p) return; p.a = 1; p.x = fx; p.y = fy; p.z = 1.2; tw(p, { x: 0, y: 0 }, 210, eo); at(150, () => { p.f = 1; tw(p, { f: 0 }, 240); shake(9) }) }
  const zoom = (p: Panel | undefined, props: Record<string, number>, dur: number) => { if (p) tw(p, props, dur, lin) }
  const heroSlam = (t: number) => {
    const h = P.Hr; if (!h) return
    at(t, () => { tw(G, { s: 0.58 }, 170); tw(LN, { a: 0 }, 120); h.a = 1; h.y = -125; h.s = 1.35; h.rot = 5; h.z = 1.18; tw(h, { y: 0, s: 1, rot: 0 }, 190, ei); S.whoosh() })
    at(t + 190, () => { hold = 95; h.f = 1; tw(h, { f: 0 }, 260); shake(20); flash(0.45, 300); burst(77, 55, 70, 1); kitSlam(77, 55); S.bell(); S.stab(); S.hit(90, 1)
      h.s = 1.06; tw(h, { s: 1 }, 260, eob); tw(h, { z: 1.04 }, 900, lin); LN.cx = 77; LN.cy = 45; LN.a = 0.55; tw(LN, { a: 0.22 }, 500, lin)
      Ti.a = 1; Ti.s = 2.2; tw(Ti, { s: 1 }, 160, ei) })
  }
  /** Herojaus kadro smūgis centre (Šukės, Kryžius). */
  const slamFx = (h: Panel | undefined, bx: number, by: number) => {
    hold = 95; shake(20); flash(0.45, 300); burst(bx, by, 70, 1); kitSlam(bx, by); S.bell(); S.stab(); S.hit(90, 1)
    if (h) { h.f = 1; tw(h, { f: 0 }, 260); h.s = 1.06; tw(h, { s: 1 }, 260, eob); tw(h, { z: 1.04 }, 900, lin) }
    LN.cx = bx; LN.cy = by; LN.a = 0.55; tw(LN, { a: 0.22 }, 500, lin); Ti.a = 1; Ti.s = 2.2; tw(Ti, { s: 1 }, 160, ei)
  }
  const drop = (p: Panel | undefined, fy: number, cx: number, fr: number) => {
    if (p) { p.a = 1; p.y = fy; p.z = 1.2; tw(p, { y: 0 }, 220, eo); at(160, () => { p.f = 1; tw(p, { f: 0 }, 240); shake(10) }); tw(p, { z: 1.08 }, 1600, lin) }
    S.whoosh(); S.hit(fr, 0.75); LN.cx = cx; LN.cy = 50; tw(LN, { a: 0.45 }, 80)
  }
  const cleanup = () => { run = false; if (raf) cancelAnimationFrame(raf); root.removeEventListener('pointerdown', onTap); root.textContent = '' }
  const finish = () => { if (finished) return; finished = true; cleanup(); onDone() }
  const exit = () => {
    if (exiting) return
    exiting = true; Q = []
    tw(LN, { a: 0 }, 100); tw(Ti, { a: 0 }, 160)
    for (const k of PK) {
      const p = P[k]; if (p.a <= 0) continue
      const b = p.box, gs = p.g1 ? G.s : 1, cx = (b[0] + b[2] / 2) * gs, cy = p.g1 ? 50 + (b[1] + b[3] / 2 - 50) * gs : b[1] + b[3] / 2
      if (kit === 'arcane') { tw(p, { x: (50 - cx) / gs, y: (50 - cy) / gs, s: 0.04, rot: (cx < 50 ? -1 : 1) * 50 }, 270, ei); tw(p, { a: 0 }, 40, lin, 250) }
      else if (kit === 'storm') {
        const dx = cx - 50, dy = cy - 50, L = Math.hypot(dx, dy)
        if (L < 4) tw(p, { y: -150, rot: (Math.random() - 0.5) * 30 }, 280, ei); else tw(p, { x: dx / L * 150, y: dy / L * 150, rot: (Math.random() - 0.5) * 60, s: 0.8 }, 280, ei)
        tw(p, { a: 0 }, 60, lin, 240)
      }
      else if (kit === 'holy') { tw(p, { y: p.y - 42 }, 320, ei); tw(p, { a: 0 }, 220, lin, 80) }
      else if (kit === 'grave') { tw(p, { y: p.y + 38, rot: (Math.random() - 0.5) * 10 }, 300, ei); tw(p, { a: 0 }, 220, lin, 80) }
      else if (kit === 'inferno') {
        // Kadras įkaista iki baltumo, susitraukia ir virsta žarijomis.
        p.fl.style.background = 'linear-gradient(0deg,#ff7a1a,#ffd98a 60%,#fff6dc)'; p.f = 0.15; tw(p, { f: 0.95 }, 200, ei); tw(p, { s: 0.94, y: p.y - 6, rot: (Math.random() - 0.5) * 4 }, 300, ei); tw(p, { a: 0 }, 140, lin, 190)
        const n = low ? 8 : 26
        at(150, () => { for (let i = 0; i < n; i++) ember(sx(cx - b[2] * gs / 2 + Math.random() * b[2] * gs), sy(cy - b[3] * gs / 2 + Math.random() * b[3] * gs), 0.3 + 0.6 * Math.random(), 500 + Math.random() * 500) })
      }
      else { tw(p, EXIT_DIR[k] ?? { y: 130 }, 260, ei); tw(p, { a: 0 }, 60, lin, 230) }
    }
    if (kit === 'arcane') at(250, () => { voids.push({ t0: T, dur: 420 }); flash(0.3, 200); burst(50, 50, 50, 1.1); S.hit(60, 1) })
    if (kit === 'holy') {
      flash(0.28, 260); pillars.push({ x: VW / 2, y: OY + SH * 0.72, t0: T, dur: 700 })
      for (let i = 0; i < (low ? 10 : 30); i++) parts.push({ x: Math.random() * VW, y: VH * (0.3 + 0.7 * Math.random()), vx: 0, vy: -(0.15 + 0.2 * Math.random()) * SW / 1000, l: 0, m: 700 + Math.random() * 500, r: (1 + 2 * Math.random()) * SW / 1000 })
    }
    if (kit === 'inferno') { at(170, () => { flash(0.32, 240); S.hit(70, 0.8) }) }
    if (kit === 'storm') { flash(0.5, 220); S.zap(); bolts.push({ a: [VW * 0.5, -10], b: [VW * 0.5, OY + SH * 0.72], t0: T, life: 280, w: 3, n: 9 }) }
    tw(D, { a: 0 }, 300, lin, 40)
    at(comicExitMs(spec), finish)
  }
  function onTap() { if (!exiting && performance.now() - t0wall > 400) exit() }
  root.addEventListener('pointerdown', onTap)
  const titleIn = (s: number, d: number) => { Ti.a = 1; Ti.s = s; tw(Ti, { s: 1 }, d, ei) }

  // ── Scenarijai ──
  if (kind === 'skill') {
    const p = P.S1 ?? P.S2, from = spec.side === 'left' ? -115 : 115
    tw(D, { a: rep ? 0.6 : 0.8 }, 90); slash(FLAT, 90, 200); S.zap()
    at(rep ? 0 : 90, () => { enter(p, from, 0); S.whoosh(); LN.cx = 50; LN.cy = 50; tw(LN, { a: 0.45 }, 80); zoom(p, { z: 1.08 }, 700) })
    at(rep ? 150 : 280, () => { hold = rep ? 30 : 60; flash(spec.soft ? 0.18 : 0.3, 220); if (spec.soft) S.chime(); else S.hit(120, 0.9); if (!rep) titleIn(1.6, 140) })
    at(rep ? 330 : 680, exit)
  } else if (kind === 'ult') {
    tw(D, { a: 0.88 }, 110); slash([[0, 18], [100, 82]], 130, 300); S.zap(); S.coin()
    at(70, () => { slash([[0, 82], [100, 18]], 130, 300); S.zap() })
    if (!rep) { S.riser(0.75); at(200, () => { enter(P.Ey, -115, 0); S.whoosh(); S.hit(160, 0.7); LN.cx = 50; LN.cy = 20; tw(LN, { a: 0.5 }, 80); zoom(P.Ey, { z: 1.06 }, 1400) }) }
    const t = rep ? 150 : 620
    at(t, () => { const u = P.Ul; tw(LN, { a: 0 }, 100); if (u) { u.a = 1; u.y = 125; u.s = 1.3; u.rot = -4; u.z = 1.16; tw(u, { y: 0, s: 1, rot: 0 }, 190, ei) } S.whoosh() })
    at(t + 190, () => { const u = P.Ul; hold = 110; shake(24); flash(0.5, 340); burst(50, 62, 90, 1.2); S.bell(); S.stab(); S.hit(80, 1); S.coin()
      if (u) { u.f = 1; tw(u, { f: 0 }, 280); u.s = 1.05; tw(u, { s: 1 }, 260, eob); tw(u, { z: 1.03 }, 900, lin) }
      LN.cx = 50; LN.cy = 62; LN.a = 0.6; tw(LN, { a: 0.25 }, 500, lin); titleIn(2.4, 170) })
    at(rep ? 760 : 1500, exit)
  } else if (lvl === 'full' && tpl === 'sukes') {
    S.riser(1.05); tw(D, { a: 0.86 }, 140); slash([[31, 0], [36, 48], [27, 58], [30, 100]], 140, 260); S.zap()
    at(60, () => slash([[70, 100], [64, 52], [73, 42], [69, 0]], 140, 260))
    at(150, () => drop(P.ShL, -125, 18, 150)); at(480, () => drop(P.ShR, 125, 84, 190))
    at(900, () => { const h = P.ShC; tw(LN, { a: 0 }, 100); if (h) { h.a = 1; h.s = 0.25; h.rot = -8; h.z = 1.15; tw(h, { s: 1, rot: 0 }, 200, ei) } S.whoosh() })
    at(1100, () => slamFx(P.ShC, 50, 50)); at(1750, exit)
  } else if (lvl === 'full' && tpl === 'plysys') {
    S.riser(0.35); tw(D, { a: 0.86 }, 140); slash([[30, 0], [26, 46], [33, 56], [28, 100]], 150, 280); S.zap()
    at(150, () => { const h = P.PlH; if (h) { h.a = 1; h.s = 1.7; h.z = 1.2; tw(h, { s: 1 }, 200, ei) } S.whoosh() })
    at(350, () => { const h = P.PlH; hold = 80; shake(16); flash(0.35, 260); S.hit(90, 1); burst(27, 50, 40, 0.9); kitSlam(27, 50)
      if (h) { h.f = 1; tw(h, { f: 0 }, 260); tw(h, { z: 1.05 }, 1600, lin) } LN.cx = 27; LN.cy = 45; tw(LN, { a: 0.5 }, 80) })
    at(800, () => { enter(P.PlE, 115, 0); zoom(P.PlE, { z: 1.08 }, 1200); S.whoosh(); S.hit(170, 0.7); LN.cx = 75; LN.cy = 25 })
    at(1080, () => { enter(P.PlA, 115, 0); zoom(P.PlA, { z: 1.06 }, 1000); S.whoosh(); S.hit(200, 0.8); LN.cy = 72 })
    at(1400, () => { hold = 70; shake(14); flash(0.3, 260); S.bell(); S.stab(); titleIn(2.2, 160); tw(LN, { a: 0.2 }, 400, lin) })
    at(1950, exit)
  } else if (lvl === 'full' && tpl === 'kryzius') {
    S.riser(0.95); tw(D, { a: 0.88 }, 130); slash([[0, 6], [100, 94]], 130, 300); S.zap()
    at(70, () => { slash([[0, 94], [100, 6]], 130, 300); S.zap() })
    at(200, () => { const a = P.KrT, b = P.KrB
      if (a) { a.a = 1; a.y = -110; a.z = 1.22; a.iy = -15; tw(a, { y: 0 }, 200, ei) }
      if (b) { b.a = 1; b.y = 110; b.z = 1.22; b.iy = 12; tw(b, { y: 0 }, 200, ei) } S.whoosh() })
    at(400, () => { hold = 70; shake(16); flash(0.35, 260); S.hit(140, 0.9); burst(50, 50, 40, 0.8)
      for (const p of [P.KrT, P.KrB]) if (p) { p.f = 1; tw(p, { f: 0 }, 240); tw(p, { z: 1.16 }, 1400, lin) }
      LN.cx = 50; LN.cy = 50; tw(LN, { a: 0.5 }, 80) })
    at(900, () => { if (P.KrT) tw(P.KrT, { y: -5 }, 160); if (P.KrB) tw(P.KrB, { y: 5 }, 160); tw(LN, { a: 0 }, 100)
      const h = P.KrH; if (h) { h.a = 1; h.s = 0.2; h.rot = -14; h.z = 1.15; tw(h, { s: 1, rot: 0 }, 200, ei) } S.whoosh() })
    at(1100, () => slamFx(P.KrH, 50, 50)); at(1750, exit)
  } else if (lvl === 'full') {
    S.riser(1.25); tw(D, { a: 0.86 }, 140); slash(ZIG, 150, 280); S.zap()
    at(150, () => { enter(P.A, 115, 0); zoom(P.A, { z: 1.06 }, 1800); S.whoosh(); S.hit(150, 0.7); LN.cx = 50; LN.cy = 28; tw(LN, { a: 0.5 }, 80) })
    at(600, () => { enter(P.B, -115, 0); zoom(P.B, { z: 1.05, ix: -1.5 }, 1500); S.whoosh(); S.hit(190, 0.8); LN.cy = 72 })
    heroSlam(1100); at(1900, exit)
  } else if (lvl === 'medium') {
    S.riser(0.75); tw(D, { a: 0.86 }, 120); slash(FLAT, 120, 240); S.zap()
    at(120, () => { enter(P.Wd, 115, 0); zoom(P.Wd, { z: 1.08 }, 1000); S.whoosh(); S.hit(150, 0.7); LN.cx = 50; LN.cy = 50; tw(LN, { a: 0.5 }, 80) })
    heroSlam(560); at(1150, exit)
  } else if (lvl === 'short') {
    tw(D, { a: 0.8 }, 90); slash(FLAT, 100, 220); S.zap()
    at(100, () => { enter(P.Wd, 115, 0); zoom(P.Wd, { z: 1.1 }, 600); S.whoosh(); LN.cx = 50; LN.cy = 50; tw(LN, { a: 0.5 }, 80) })
    at(300, () => { hold = 60; flash(0.3, 220); S.hit(110, 0.9); S.bell() })
    at(650, exit)
  } else {
    tw(D, { a: 0.8 }, 160); if (P.Hr) { P.Hr.z = 1; tw(P.Hr, { a: 1 }, 180, lin) } Ti.a = 1
    at(COMIC_TIMES.static.exitAt, exit)
  }

  let mistSprite: HTMLCanvasElement | null = null
  const getMist = () => {
    if (mistSprite) return mistSprite
    const c = document.createElement('canvas'); c.width = c.height = 128
    const g = c.getContext('2d')
    if (g) { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 128, 128) }
    mistSprite = c; return c
  }
  const drawKit = (c: CanvasRenderingContext2D, dt: number) => {
    if (mists.length) { const sp = getMist()
      for (let i = mists.length - 1; i >= 0; i--) { const m = mists[i]; m.l += dt; if (m.l >= m.m) { mists.splice(i, 1); continue } m.y += m.vy * dt; c.globalAlpha = Math.sin(Math.PI * m.l / m.m) * 0.35; c.drawImage(sp, m.x - m.r, m.y - m.r, m.r * 2, m.r * 2) }
      c.globalAlpha = 1 }
    for (let i = feathers.length - 1; i >= 0; i--) { const f = feathers[i]; f.l += dt; if (f.l >= f.m) { feathers.splice(i, 1); continue }
      f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt
      c.save(); c.translate(f.x, f.y); c.rotate(f.rot); c.globalAlpha = Math.min(1, (1 - f.l / f.m) * 3); c.fillStyle = f.col || '#070908'
      c.beginPath(); c.moveTo(-f.len, 0); c.quadraticCurveTo(0, -f.len * 0.34, f.len, 0); c.quadraticCurveTo(0, f.len * 0.34, -f.len, 0); c.fill()
      c.strokeStyle = `rgba(${rgb},.4)`; c.lineWidth = 1; c.stroke(); c.restore() }
    for (let i = bolts.length - 1; i >= 0; i--) { const b = bolts[i], e = T - b.t0; if (e < 0) continue; if (e > b.life) { bolts.splice(i, 1); continue }
      const r = rnd(Math.floor(T / 40) * 17 + i * 13 + 3), d = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]), pts = jagPts(b.a, b.b, b.n || 4, d * 0.22, r), al = 1 - e / b.life
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let j = 1; j < pts.length; j++) c.lineTo(pts[j][0], pts[j][1]); c.lineJoin = 'miter'
      c.strokeStyle = `rgba(${rgb},${0.45 * al})`; c.lineWidth = SW * 0.006 * b.w; c.stroke(); c.strokeStyle = `rgba(255,255,255,${al})`; c.lineWidth = SW * 0.0018 * b.w; c.stroke() }
    for (let i = thorns.length - 1; i >= 0; i--) { const t = thorns[i], p = (T - t.t0) / t.dur; if (p >= 1) { thorns.splice(i, 1); continue }
      const R = SW * (0.05 + 0.17 * eo(p)), r = rnd(Math.floor(T / 60) * 11 + 7), N = 16
      c.beginPath(); for (let j = 0; j <= 2 * N; j++) { const a = j / (2 * N) * 6.283 + T * 0.0015, rr = R * (j % 2 ? 1.18 + 0.1 * r() : 1); const px = t.x + Math.cos(a) * rr, py = t.y + Math.sin(a) * rr; if (j) c.lineTo(px, py); else c.moveTo(px, py) }
      c.closePath(); c.strokeStyle = `rgba(${rgb},${(1 - p) * 0.4})`; c.lineWidth = SW * 0.008; c.stroke(); c.strokeStyle = `rgba(240,225,255,${(1 - p) * 0.9})`; c.lineWidth = SW * 0.002; c.stroke() }
    if (pillars.length) { c.globalCompositeOperation = 'lighter'
      for (let i = pillars.length - 1; i >= 0; i--) { const q = pillars[i], p = (T - q.t0) / q.dur; if (p >= 1) { pillars.splice(i, 1); continue }
        const al = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85, w = SW * (0.11 - 0.04 * p)
        c.fillStyle = `rgba(${rgb},${0.16 * al})`; c.fillRect(q.x - w, 0, w * 2, q.y); c.fillStyle = `rgba(${rgb},${0.22 * al})`; c.fillRect(q.x - w * 0.5, 0, w, q.y); c.fillStyle = `rgba(255,255,255,${0.3 * al})`; c.fillRect(q.x - w * 0.14, 0, w * 0.28, q.y) }
      c.globalCompositeOperation = 'source-over' }
    if (flares.length) { c.globalCompositeOperation = 'lighter'
      for (let i = flares.length - 1; i >= 0; i--) { const f = flares[i], p = (T - f.t0) / f.dur; if (p >= 1) { flares.splice(i, 1); continue }
        // Liepsnų liežuviai aplink smūgio tašką: auga, mirga, gęsta.
        const r = rnd(f.seed + Math.floor(T / 80) * 13), N = 13, R0 = SW * 0.028, al = (1 - p) * (1 - p), grow = 0.4 + 0.6 * eo(Math.min(1, p * 5))
        const gl = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, SW * 0.2 * (0.5 + grow * 0.5)); gl.addColorStop(0, `rgba(255,170,60,${0.55 * al})`); gl.addColorStop(1, 'rgba(255,90,20,0)')
        c.fillStyle = gl; c.beginPath(); c.arc(f.x, f.y, SW * 0.2, 0, 6.283); c.fill()
        for (let j = 0; j < N; j++) {
          const a = j / N * 6.283 + (r() - 0.5) * 0.3, len = SW * (0.1 + 0.17 * r()) * grow, w = 0.3 + 0.22 * r(), bend = (r() - 0.5) * len * 0.7
          const ca = Math.cos(a), sa = Math.sin(a), lift = len * 0.3
          const tongue = (k: number, col: string) => {
            const L = len * k, ww = w * k
            const x0 = f.x + Math.cos(a - ww) * R0, y0 = f.y + Math.sin(a - ww) * R0, x1 = f.x + Math.cos(a + ww) * R0, y1 = f.y + Math.sin(a + ww) * R0
            const tx = f.x + ca * (R0 + L) - sa * bend * k, ty = f.y + sa * (R0 + L) + ca * bend * k - lift * k
            const mx = f.x + ca * (R0 + L * 0.5), my = f.y + sa * (R0 + L * 0.5) - lift * k * 0.3
            c.fillStyle = col; c.beginPath(); c.moveTo(x0, y0)
            c.quadraticCurveTo(mx - sa * L * 0.28, my + ca * L * 0.28, tx, ty); c.quadraticCurveTo(mx + sa * L * 0.28, my - ca * L * 0.28, x1, y1); c.closePath(); c.fill()
          }
          tongue(1, `rgba(255,95,25,${0.55 * al})`); tongue(0.62, `rgba(255,190,80,${0.6 * al})`); tongue(0.32, `rgba(255,245,200,${0.6 * al})`)
        } }
      c.globalCompositeOperation = 'source-over' }
    for (let i = voids.length - 1; i >= 0; i--) { const v = voids[i], p = (T - v.t0) / v.dur; if (p >= 1) { voids.splice(i, 1); continue }
      c.fillStyle = `rgba(0,0,0,${1 - p})`; c.beginPath(); c.arc(VW / 2, VH / 2, Math.max(0, SW * 0.09 * (1 - p)), 0, 6.283); c.fill()
      c.strokeStyle = `rgba(${rgb},${1 - p})`; c.lineWidth = SW * 0.005 * (1 - p) + 1; c.beginPath(); c.arc(VW / 2, VH / 2, SW * (0.03 + 0.22 * eo(p)), 0, 6.283); c.stroke() }
  }
  const draw = (dt: number) => {
    if (!ctx) return
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, VW, VH)
    if (LN.a > 0.01 && !low) {
      const r = rnd(Math.floor(T / 55) * 7919 + 13), cx = sx(LN.cx), cy = sy(LN.cy), R = Math.hypot(VW, VH) * 0.62
      ctx.fillStyle = `rgba(240,244,250,${LN.a})`; ctx.beginPath()
      for (let i = 0; i < 46; i++) { const a = r() * 6.283, r0 = R * (0.42 + r() * 0.3), w = 0.004 + r() * 0.013
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a - w) * R * 1.3, cy + Math.sin(a - w) * R * 1.3); ctx.lineTo(cx + Math.cos(a + w) * R * 1.3, cy + Math.sin(a + w) * R * 1.3) }
      ctx.fill()
    }
    for (let i = slashes.length - 1; i >= 0; i--) {
      const s = slashes[i], e = T - s.t0, p = Math.min(1, e / s.dur), al = e < s.dur ? 1 : 1 - (e - s.dur) / s.fade
      if (al <= 0) { slashes.splice(i, 1); continue }
      // Pjūvis eina per visą ekraną: kraštiniai taškai – ekrano kraštuose, viduriniai – scenos koordinatėse.
      let pts: Pt[] = s.pts.map(([x, y]) => [x <= 0 ? 0 : x >= 100 ? VW : sx(x), y <= 0 ? 0 : y >= 100 ? VH : sy(y)])
      if (jag) { const rr = rnd(Math.floor(T / 45) * 31 + i * 7 + 5), o: Pt[] = [pts[0]]; for (let j = 1; j < pts.length; j++) o.push(...jagPts(pts[j - 1], pts[j], 6, SW * 0.035, rr).slice(1)); pts = o }
      let tot = 0; const seg: number[] = []
      for (let j = 1; j < pts.length; j++) { const l = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); seg.push(l); tot += l }
      let left = tot * p; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
      for (let j = 1; j < pts.length && left > 0; j++) { const l = seg[j - 1], k = Math.min(1, left / l); ctx.lineTo(pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * k, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * k); left -= l }
      ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.strokeStyle = `rgba(${rgb},${0.4 * al})`; ctx.lineWidth = SW * 0.016; ctx.stroke()
      ctx.strokeStyle = `rgba(250,255,252,${al})`; ctx.lineWidth = SW * 0.0045; ctx.stroke()
    }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i], p = (T - r.t0) / r.dur; if (p >= 1) { rings.splice(i, 1); continue }
      ctx.strokeStyle = `rgba(${r.col || rgb},${(1 - p) * 0.8})`; ctx.lineWidth = SW * 0.006 * (1 - p) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0, eo(p) * r.r1), 0, 6.283); ctx.stroke() }
    if (parts.length) {
      ctx.globalCompositeOperation = 'lighter'
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.l += dt
        if (q.l >= q.m) { parts[i] = parts[parts.length - 1]; parts.pop(); continue }
        const dk = Math.pow(0.985, dt / 16.7); q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= dk; q.vy *= dk; const k = 1 - q.l / q.m
        ctx.fillStyle = `rgba(${q.c ?? rgb},${k * 0.9})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (0.5 + k * 0.5), 0, 6.283); ctx.fill() }
      ctx.globalCompositeOperation = 'source-over'
    }
    if (kit) drawKit(ctx, dt)
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
    ambient(dt)
    draw(dt)
    raf = requestAnimationFrame(frame)
  }
  last = performance.now(); raf = requestAnimationFrame(frame)
  return { destroy: () => { if (!finished) { finished = true; cleanup() } } }
}
