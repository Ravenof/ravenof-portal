// ═══════════════════════════════════════════════════════════════════════════
// fxStage — vienas canvas, vienas rAF, fiksuotas dalelių pool'as.
//  • SUMMON: 30 iškvietimo choreografijų, kuriose juda PATI korta (DOM elementas
//    valdomas per nepriklausomas `translate`/`scale`/`rotate` savybes – ne
//    `transform`, kurį valdo framer-motion; žr. game-feel taisyklę Nr. 1).
//  • PROJ + IMP: skrydis iš šaltinio ir smūgis ant taikinio (visada ta pati seka).
//  • Žemės sluoksnis (plyšiai, praraja, nudegimas) piešiamas tame pačiame canvas'e,
//    bet su iškirptomis kortų vietomis – atrodo PO kortomis be layout pakeitimų.
//  • Našumas: sprite cache (vienas gradientas vienai spalvai → drawImage), swap-remove
//    pool'as be alokacijų kadre, rAF miega kai nėra efektų. LOW: dalelės ×0.5, DPR 1.
// Koordinatės: kiekviena scena turi virtualią erdvę (korta 84×~116 ties X,Y), kuri
// mastelio `k` pagalba atvaizduojama į tikrą kortos vietą ekrane.
// ═══════════════════════════════════════════════════════════════════════════
import { summonLandMs, type FxProjId, type FxImpactId, type SummonFxId } from './fxCatalog'

type Pt = { x: number; y: number }
type Ease = (t: number) => number
export type FxHooks = { shake?: (mag: number) => void; land?: (power: number) => void }

type VCard = {
  x: number; y: number; px: number; py: number; vw: number; vh: number
  root: HTMLElement | null; el: HTMLElement | null; ov: HTMLElement | null; img: HTMLImageElement | null
  ox: number; oy: number; s: number; sx: number; sy: number; rot: number; alpha: number
  tint: string; tintA: number; hidden: boolean; bV: number; bY: number; sh: number; wx: number; wy: number
  written: boolean; isS: boolean
}
type Scene = { cx: number; cy: number; k: number; S: VCard; cards: VCard[]; row: VCard[]; busy: boolean; hooks?: FxHooks; top: number; left: number; right: number; rowL: number; rowR: number; zRoot: HTMLElement | null }
type Part = { x: number; y: number; vx: number; vy: number; t: number; max: number; s: number; c: string; k: number; g: number; dr: number; rot: number; vr: number; sc: Scene | null }

const TAU = Math.PI * 2, X = 480, Y = 372, CW = 84
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(a: T[]): T => a[(Math.random() * a.length) | 0]
const cl = (t: number) => Math.max(0, Math.min(1, t))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const eo: Ease = (t) => 1 - Math.pow(1 - t, 3)
const ei: Ease = (t) => t * t * t
const lin: Ease = (t) => t
const eob: Ease = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
const FIRE = ['#ff7a1a', '#ffb347', '#ff4a1a', '#ffd27a']

// ── modulio būsena ───────────────────────────────────────────────────────────
let cv: HTMLCanvasElement | null = null
let ctx!: CanvasRenderingContext2D
let D = 1, LOW = false, MAXP = 700
let time = 0, freeze = 0, live = true, running = false, last = 0
const P: Part[] = []
let pN = 0
type QItem = { at: number; fn: () => void; sc: Scene }
type FxItem = { t0: number; dur: number; fn: (p: number) => void; layer: 0 | 1; sc: Scene }
type TwItem = { o: VCard; k: keyof VCard; a: number; b: number; t0: number; dur: number; ease: Ease; sc: Scene }
const Q: QItem[] = [], FX: FxItem[] = [], TW: TwItem[] = [], SCENES: Scene[] = []
const PENDING = new Map<HTMLElement, HTMLElement>()   // iškvietimai, laukiantys išdėstymo nusistovėjimo (root → paslėptas [data-lunge])
// „dabartinė" scena – nustatoma prieš kviečiant bet kurį efekto callback'ą
let cur!: Scene
let S!: VCard, CH = 116, TOP = -20

function enter(sc: Scene) { cur = sc; S = sc.S; CH = sc.S.vh; TOP = sc.top }

// ── sprite'ai ────────────────────────────────────────────────────────────────
const sprC = new Map<string, HTMLCanvasElement>()
function spr(c: string): HTMLCanvasElement {
  let s = sprC.get(c); if (s) return s
  s = document.createElement('canvas'); s.width = s.height = 64
  const g = s.getContext('2d')!
  const n = parseInt(c.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.4, `rgba(${r},${gg},${b},.45)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`)
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); sprC.set(c, s); return s
}
function glow(x: number, y: number, r: number, c: string, a: number) { if (r <= 0 || a <= 0) return; ctx.globalAlpha = a > 1 ? 1 : a; ctx.drawImage(spr(c), x - r, y - r, r * 2, r * 2) }
function dark(x: number, y: number, r: number, a: number, c = '#000000') { ctx.globalCompositeOperation = 'source-over'; glow(x, y, r, c, a); ctx.globalCompositeOperation = 'lighter' }

// ── dalelės ──────────────────────────────────────────────────────────────────
let lowSkip = false
function pt(x: number, y: number, vx: number, vy: number, max: number, s: number, c: string, k = 0, g = 0, dr = 1) {
  if (pN >= MAXP) return
  if (LOW) { lowSkip = !lowSkip; if (lowSkip || k === 2) return }
  let p = P[pN]
  if (!p) { p = { x: 0, y: 0, vx: 0, vy: 0, t: 0, max: 0, s: 0, c: '', k: 0, g: 0, dr: 1, rot: 0, vr: 0, sc: null }; P[pN] = p }
  pN++
  p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.t = 0; p.max = max; p.s = s; p.c = c; p.k = k; p.g = g; p.dr = dr; p.rot = rnd(0, TAU); p.vr = rnd(-0.3, 0.3); p.sc = cur
}
type BurstO = { v: [number, number]; life: [number, number]; size: [number, number]; colors: string[]; a0?: number; spread?: number; jx?: number; jy?: number; up?: number; k?: number; g?: number; dr?: number }
function burst(x: number, y: number, n: number, o: BurstO) {
  for (let i = 0; i < n; i++) {
    const a = (o.a0 ?? 0) + Math.random() * (o.spread ?? TAU), v = rnd(o.v[0], o.v[1])
    pt(x + (o.jx ? rnd(-o.jx, o.jx) : 0), y + (o.jy ? rnd(-o.jy, o.jy) : 0), Math.cos(a) * v, Math.sin(a) * v + (o.up || 0), rnd(o.life[0], o.life[1]), rnd(o.size[0], o.size[1]), pick(o.colors), o.k || 0, o.g || 0, o.dr ?? 0.94)
  }
}

// ── laikas / eilė ────────────────────────────────────────────────────────────
const at = (ms: number, fn: () => void) => { Q.push({ at: time + ms, fn, sc: cur }) }
const fx = (dur: number, fn: (p: number) => void, layer: 0 | 1 = 1) => { FX.push({ t0: time, dur, fn, layer, sc: cur }) }
function tw(o: VCard, props: Partial<Record<keyof VCard, number>>, dur: number, ease: Ease = eo) {
  for (const key in props) {
    const k = key as keyof VCard
    for (let i = TW.length - 1; i >= 0; i--) if (TW[i].o === o && TW[i].k === k) TW.splice(i, 1)
    TW.push({ o, k, a: o[k] as number, b: props[k] as number, t0: time, dur, ease, sc: cur })
  }
}
const shake = (m: number) => { try { cur.hooks?.shake?.(m) } catch { /* */ } }
const hitstop = (ms: number) => { freeze = Math.max(freeze, LOW ? Math.min(ms, 40) : ms) }

// ── kortos ───────────────────────────────────────────────────────────────────
const show = (o: Partial<VCard>) => { S.hidden = false; Object.assign(S, o) }
const tint = (c: VCard, col: string, a: number, dur: number) => { c.tint = col; c.tintA = a; tw(c, { tintA: 0 }, dur, lin) }
const knock = (c: VCard, v: number) => { c.bV += v }
const cshake = (c: VCard, m: number) => { c.sh = Math.max(c.sh, m) }
function perim(c: VCard, pad = 0): [number, number, number, number] {
  const w = c.vw / 2 + pad, h = c.vh / 2 + pad, t = Math.random() * (w + h) * 4
  let x: number, y: number, nx = 0, ny = 0
  if (t < w * 2) { x = -w + t; y = -h; ny = -1 } else if (t < w * 2 + h * 2) { x = w; y = -h + t - w * 2; nx = 1 } else if (t < w * 4 + h * 2) { x = w - (t - w * 2 - h * 2); y = h; ny = 1 } else { x = -w; y = h - (t - w * 4 - h * 2); nx = -1 }
  return [c.x + x, c.y + y, nx, ny]
}
function neighbors(power: number) {
  for (const c of cur.cards) {
    const dx = c.x - S.x, dy = c.y - S.y, d = Math.hypot(dx, dy); if (d > 300) continue
    const k = power * (1 - d / 340)
    at(d * 0.25, () => { knock(c, (dy < -50 ? -1 : 1) * k * 0.5); cshake(c, k * 0.5) })
  }
}
/** Kortos vaizdas (art) klonams: ketvirčiai, šleifai. `f*` – šaltinio dalis 0..1. */
function face(c: VCard, dx: number, dy: number, dw: number, dh: number, fx0 = 0, fy0 = 0, fw = 1, fh = 1) {
  const im = c.img
  if (im && im.complete && im.naturalWidth > 0) {
    // cover-crop: paveikslėlio dalis, atitinkanti kortos proporcijas
    const ar = c.vw / c.vh, iw = im.naturalWidth, ih = im.naturalHeight
    let sw = iw, sh = iw / ar; if (sh > ih) { sh = ih; sw = ih * ar }
    const sx0 = (iw - sw) / 2, sy0 = (ih - sh) / 2
    try { ctx.drawImage(im, sx0 + sw * fx0, sy0 + sh * fy0, sw * fw, sh * fh, dx, dy, dw, dh); return } catch { /* */ }
  }
  ctx.fillStyle = '#2a2233'; ctx.fillRect(dx, dy, dw, dh); ctx.strokeStyle = '#b89648'; ctx.lineWidth = 1.5; ctx.strokeRect(dx, dy, dw, dh)
}

// ── primityvai ───────────────────────────────────────────────────────────────
const ring = (x: number, y: number, r0: number, r1: number, dur: number, c: string, th = 6, a = 0.9) => fx(dur, (p) => { const e = eo(p); ctx.globalAlpha = (1 - p) * a; ctx.strokeStyle = c; ctx.lineWidth = Math.max(0.5, th * (1 - p)); ctx.beginPath(); ctx.arc(x, y, lerp(r0, r1, e), 0, TAU); ctx.stroke() })
const pop = (x: number, y: number, r: number, c: string, dur: number, a = 1) => fx(dur, (p) => glow(x, y, r * (0.55 + 0.45 * eo(p)), c, (1 - p) * a))
const flash = (c: string, a: number, dur: number) => fx(dur, (p) => { ctx.globalAlpha = (1 - p) * a * (LOW ? 0.6 : 1); ctx.fillStyle = c; ctx.fillRect(-4000, -4000, 9000, 9000) })
const dim = (a: number, dur: number) => fx(dur, (p) => { ctx.globalAlpha = a * Math.min(1, p / 0.15, (1 - p) / 0.3); ctx.fillStyle = '#04020a'; ctx.fillRect(-4000, -4000, 9000, 9000) }, 0)
function boltPts(x1: number, y1: number, x2: number, y2: number, j: number): number[] { const n = Math.max(4, (Math.hypot(x2 - x1, y2 - y1) / 22) | 0), a = [x1, y1]; for (let i = 1; i < n; i++) { const t = i / n; a.push(lerp(x1, x2, t) + rnd(-j, j), lerp(y1, y2, t) + rnd(-j, j)) } a.push(x2, y2); return a }
function drawBolt(a: number[], c: string, w: number, al: number) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; for (const [lw, col, k] of [[w * 3.2, c, 0.3], [w, '#ffffff', 1]] as [number, string, number][]) { ctx.globalAlpha = al * k; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) ctx.lineTo(a[i], a[i + 1]); ctx.stroke() } }
function bolt(x1: number, y1: number, x2: number, y2: number, dur: number, c: string, w = 2.4, j = 12) { let pts: number[] = [], t = -99; fx(dur, (p) => { if (time - t > 45) { pts = boltPts(x1, y1, x2, y2, j); t = time } drawBolt(pts, c, w, 1 - p * p) }) }
function bez(f: Pt, t: Pt, arc: number, p: number): [number, number] { const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2, dx = t.x - f.x, dy = t.y - f.y, l = Math.hypot(dx, dy) || 1, cx = mx - dy / l * arc, cy = my + dx / l * arc, q = 1 - p; return [q * q * f.x + 2 * q * p * cx + p * p * t.x, q * q * f.y + 2 * q * p * cy + p * p * t.y] }
const dust = (n: number, v: [number, number] = [1.2, 4]) => { for (let i = 0; i < n; i++) { const [x, y, nx, ny] = perim(S, 0), s = rnd(v[0], v[1]); pt(x, y, nx * s + rnd(-0.5, 0.5), ny * s + rnd(-0.5, 0.5), rnd(450, 850), rnd(13, 24), '#8a7b6a', 2, 0, 0.93) } }
const land = (pw: number, stop: number) => { hitstop(stop); shake(pw); neighbors(pw); try { cur.hooks?.land?.(pw) } catch { /* */ } }

// ── SKRYDŽIAI ────────────────────────────────────────────────────────────────
type ProjDef = { col: string; base: number; go: (f: Pt, t: Pt, T: number, col: string) => number }
function motes(f: Pt, t: Pt, c: string, T: number): number {
  const dx = t.x - f.x, dy = t.y - f.y, l = Math.hypot(dx, dy) || 1
  fx(T, (p) => { for (let i = 0; i < 6; i++) { const q = cl(p * 1.5 - i * 0.085); if (q <= 0 || q >= 1) continue; let [x, y] = bez(f, t, -40, eo(q) * 0.5 + q * 0.5); const w = Math.sin(q * TAU + i * 1.3) * 13 * (1 - q); x += -dy / l * w; y += dx / l * w; glow(x, y, 10, c, 0.85); glow(x, y, 4, '#ffffff', 1); if (live && Math.random() < 0.35) pt(x, y, rnd(-0.3, 0.3), rnd(-0.3, 0.3), 260, rnd(2, 3.5), c) } })
  return T * 0.77
}
/** `go` grąžina, po kiek ms skrydis PASIEKIA taikinį (≤ T). */
const PROJ: Record<FxProjId, ProjDef> = {
  fireball: { col: '#ff7a1a', base: 380, go(f, t, T) { fx(T, (p) => { const e = p * (0.45 + 0.55 * p), [x, y] = bez(f, t, -46, e)
    if (live) { pt(x, y, rnd(-0.6, 0.6), rnd(-0.6, 0.6), rnd(200, 420), rnd(5, 10), pick(FIRE)); pt(x, y, rnd(-0.4, 0.4), rnd(-0.4, 0.4), rnd(150, 300), rnd(3, 6), '#ffd27a'); if (Math.random() < 0.3) pt(x, y, rnd(-0.3, 0.3), -0.4, 500, 9, '#1c1410', 2) }
    glow(x, y, 26, '#ff7a1a', 0.9); glow(x, y, 11, '#fff3d0', 1) }); return T } },
  ice: { col: '#9fdcff', base: 290, go(f, t, T) { const an = Math.atan2(t.y - f.y, t.x - f.x), c = Math.cos(an), s = Math.sin(an); fx(T, (p) => { const [x, y] = bez(f, t, -10, p * p * 0.5 + p * 0.5)
    if (live && Math.random() < 0.8) pt(x, y, rnd(-0.4, 0.4), rnd(0.1, 0.8), rnd(220, 420), rnd(2, 4), '#ffffff'); glow(x, y, 20, '#9fdcff', 0.7)
    ctx.globalAlpha = 1; ctx.fillStyle = '#eaf8ff'; ctx.beginPath(); ctx.moveTo(x + c * 15, y + s * 15); ctx.lineTo(x - s * 4.5, y + c * 4.5); ctx.lineTo(x - c * 13, y - s * 13); ctx.lineTo(x + s * 4.5, y - c * 4.5); ctx.fill() }); return T } },
  lightning: { col: '#bcd4ff', base: 220, go(f, t, T) { bolt(f.x, f.y, t.x, t.y, Math.max(220, T), '#9fc4ff', 2.6, 14); pop(f.x, f.y, 30, '#bcd4ff', 160); return Math.min(60, T) } },
  poison: { col: '#84cc16', base: 460, go(f, t, T) { fx(T, (p) => { const [x, y] = bez(f, t, -110, p), r = 15 + Math.sin(time / 40) * 3
    if (live && Math.random() < 0.7) pt(x, y, rnd(-0.3, 0.3), rnd(0.4, 1.2), rnd(260, 480), rnd(3, 6), pick(['#84cc16', '#4d7c0f']), 0, 0.12)
    glow(x, y, r + 8, '#4d7c0f', 0.8); glow(x, y, r, '#84cc16', 0.9); glow(x, y, 6, '#e6ff9a', 1) }); return T } },
  shadow: { col: '#a855f7', base: 420, go(f, t, T) { const dx = t.x - f.x, dy = t.y - f.y, l = Math.hypot(dx, dy) || 1; fx(T, (p) => { const e = p * p * 0.6 + p * 0.4; let [x, y] = bez(f, t, 30, e); const w = Math.sin(e * TAU * 2) * 11 * (1 - e); x += -dy / l * w; y += dx / l * w
    if (live) { pt(x, y, rnd(-0.3, 0.3), rnd(-0.3, 0.3), rnd(300, 520), rnd(8, 13), '#140a1e', 2); pt(x, y, rnd(-0.5, 0.5), rnd(-0.5, 0.5), rnd(180, 360), rnd(3, 6), '#a855f7') }
    glow(x, y, 22, '#a855f7', 0.85); dark(x, y, 11, 0.95) }); return T } },
  holy: { col: '#ffe08a', base: 340, go(f, t, T) { fx(Math.max(T, 340), (p) => { const g = cl(p / 0.35), a = p > 0.6 ? (1 - p) / 0.4 : 1, x = lerp(f.x, t.x, g), y = lerp(f.y, t.y, g); ctx.lineCap = 'round'
    ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(x, y); ctx.stroke()
    ctx.globalAlpha = a; ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(x, y); ctx.stroke(); glow(x, y, 20, '#ffe08a', a)
    if (live && Math.random() < 0.6) { const q = Math.random() * g; pt(lerp(f.x, t.x, q), lerp(f.y, t.y, q), rnd(-0.8, 0.8), rnd(-0.8, 0.8), 300, rnd(2, 4), '#fff4c2') } }); return Math.max(T, 340) * 0.35 } },
  arrow: { col: '#e8e0c8', base: 230, go(f, t, T) { let px = f.x, py = f.y; fx(T, (p) => { const [x, y] = bez(f, t, -16, p), an = Math.atan2(y - py, x - px) || 0; px = x; py = y
    ctx.lineCap = 'round'; ctx.globalAlpha = 0.25; ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(an) * 46, y - Math.sin(an) * 46); ctx.stroke()
    ctx.globalAlpha = 1; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(an) * 24, y - Math.sin(an) * 24); ctx.stroke(); glow(x, y, 7, '#ffffff', 0.9) }); return T } },
  healWisp: { col: '#5ef0c0', base: 520, go(f, t, T) { return motes(f, t, '#5ef0c0', T) } },
  goldMotes: { col: '#ffd24a', base: 520, go(f, t, T) { return motes(f, t, '#ffd24a', T) } },
  orb: { col: '#d4af37', base: 380, go(f, t, T, col) { fx(T, (p) => { const e = p * (0.45 + 0.55 * p), [x, y] = bez(f, t, -40, e)
    if (live) pt(x, y, rnd(-0.6, 0.6), rnd(-0.6, 0.6), rnd(200, 400), rnd(4, 8), col)
    glow(x, y, 24, col, 0.9); glow(x, y, 9, '#ffffff', 1) }); return T } },
}

// ── SMŪGIAI (`light` – statusams: be ilgos liekanos, ją piešia CardStatusVfxLayer) ──
function implode(c: VCard, col: string, then: () => void) { for (let i = 0; i < 18; i++) { const a = rnd(0, TAU); pt(c.x + Math.cos(a) * 72, c.y + Math.sin(a) * 72, -Math.cos(a) * 5.6, -Math.sin(a) * 5.6, 200, rnd(4, 7), col, 0, 0, 1) } at(200, then) }
const IMP: Record<FxImpactId, (c: VCard, light: boolean, col: string) => void> = {
  fireBurst(c, light) { burst(c.x, c.y, 26, { v: [2, 7.5], life: [250, 600], size: [5, 12], colors: FIRE, dr: 0.92 }); burst(c.x, c.y, 6, { v: [0.5, 2], life: [500, 900], size: [12, 20], colors: ['#1c1410'], k: 2, up: -0.6 })
    ring(c.x, c.y, 12, 86, 360, '#ff9a3a', 8); pop(c.x, c.y, 95, '#ffb060', 260); tint(c, '#ff8a2a', 0.7, 520)
    if (!light) fx(650, () => { if (live && Math.random() < 0.5) { const [x, y] = perim(c, -6); pt(x, y, rnd(-0.3, 0.3), -rnd(0.8, 2), rnd(300, 600), rnd(2, 4), '#ffb347') } }) },
  iceShatter(c) { burst(c.x, c.y, 16, { v: [3, 8.5], life: [300, 620], size: [6, 11], colors: ['#e8f8ff', '#9fdcff'], k: 1, dr: 0.9 }); burst(c.x, c.y, 12, { v: [1, 4], life: [300, 500], size: [2, 4], colors: ['#ffffff'] })
    ring(c.x, c.y, 10, 80, 380, '#cfeeff', 6); pop(c.x, c.y, 70, '#9fdcff', 240); tint(c, '#bfe9ff', 0.6, 900) },
  freeze(c, light) { burst(c.x, c.y, 10, { v: [2, 6], life: [300, 600], size: [5, 9], colors: ['#e8f8ff', '#9fdcff'], k: 1, dr: 0.9 }); ring(c.x, c.y, 10, 74, 380, '#cfeeff', 5); tint(c, '#8fd3ff', 0.7, light ? 520 : 1700)
    if (light) return
    fx(1700, (p) => { const g = eob(cl(p / 0.12)), a = p > 0.8 ? (1 - p) / 0.2 : 1; ctx.globalAlpha = a * 0.9; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = c.x + sx * c.vw / 2, y = c.y + c.bY + sy * c.vh / 2
      ctx.fillStyle = '#dff4ff'; ctx.beginPath(); ctx.moveTo(x + sx * 4, y + sy * 4); ctx.lineTo(x - sx * 22 * g, y + sy * 2); ctx.lineTo(x - sx * 9 * g, y - sy * 9 * g); ctx.lineTo(x + sx * 2, y - sy * 26 * g); ctx.fill() }
      if (live && Math.random() < 0.25) { const [x, y] = perim(c, 2); pt(x, y, rnd(-0.2, 0.2), rnd(0.1, 0.5), 500, rnd(2, 3.5), '#ffffff') } }) },
  shock(c) { burst(c.x, c.y, 16, { v: [3, 9], life: [120, 300], size: [2, 4.5], colors: ['#fff6b0', '#bcd4ff'] }); tint(c, '#ffffff', 0.85, 220); cshake(c, 7); pop(c.x, c.y, 70, '#bcd4ff', 200)
    let pts: number[][] = [], t = -99; fx(460, (p) => { if (time - t > 55) { t = time; pts = [0, 1, 2].map(() => { const a = perim(c, 0), b = perim(c, 0); return boltPts(a[0], a[1], b[0], b[1], 7) }) } for (const q of pts) drawBolt(q, '#9fc4ff', 1.5, 1 - p) }) },
  poisonSplash(c, light) { burst(c.x, c.y, 18, { v: [2, 6], life: [350, 650], size: [3, 7], colors: ['#84cc16', '#bef264', '#4d7c0f'], g: 0.22, up: -2 }); ring(c.x, c.y, 8, 60, 320, '#84cc16', 5); tint(c, '#84cc16', 0.45, light ? 500 : 900)
    if (!light) fx(900, () => { if (live && Math.random() < 0.4) pt(c.x + rnd(-34, 34), c.y + rnd(-30, 48), rnd(-0.2, 0.2), -rnd(0.3, 0.9), rnd(500, 900), rnd(9, 16), '#3f6212') }) },
  shadowImplode(c) { implode(c, '#a855f7', () => { ring(c.x, c.y, 8, 84, 380, '#a855f7', 7); pop(c.x, c.y, 80, '#7c3aed', 260); burst(c.x, c.y, 8, { v: [0.8, 2.5], life: [500, 900], size: [12, 20], colors: ['#140a1e'], k: 2 }); tint(c, '#1a0a2a', 0.75, 650) }) },
  seal(c, light) { const T = light ? 760 : 1150
    fx(T, (p) => { const s = p < 0.16 ? lerp(1.8, 1, ei(p / 0.16)) : 1, a = p < 0.16 ? p / 0.16 : p > 0.75 ? (1 - p) / 0.25 : 1, y = c.y + c.bY; ctx.globalAlpha = a; ctx.strokeStyle = '#c4a5ff'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(c.x, y, 30 * s, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x, y, 23 * s, 0, TAU); ctx.stroke(); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; const d = 13 * s
      ctx.beginPath(); ctx.moveTo(c.x - d, y - d); ctx.lineTo(c.x + d, y + d); ctx.moveTo(c.x + d, y - d); ctx.lineTo(c.x - d, y + d); ctx.stroke(); glow(c.x, y, 44 * s, '#7c3aed', a * 0.35) })
    at(T * 0.16, () => { cshake(c, 6); knock(c, 3); shake(4); burst(c.x, c.y, 10, { v: [1, 3.5], life: [400, 800], size: [10, 18], colors: ['#140a1e'], k: 2 }); ring(c.x, c.y, 26, 70, 300, '#a855f7', 4) }); tint(c, '#2a1040', 0.55, T) },
  holyFlare(c) { pop(c.x, c.y, 110, '#ffe08a', 320); fx(420, (p) => { ctx.globalAlpha = 1 - p; const w = 34 * (1 - p * 0.5); ctx.drawImage(spr('#fff4c2'), c.x - w, c.y - 150, w * 2, 300); ctx.drawImage(spr('#fff4c2'), c.x - 110, c.y - w * 0.6, 220, w * 1.2) })
    burst(c.x, c.y, 14, { v: [0.6, 2.4], life: [400, 800], size: [2.5, 5], colors: ['#fff4c2', '#ffe08a'], up: -1.2, jx: 30, jy: 40 }); tint(c, '#fff1b8', 0.6, 520) },
  arrowHit(c) { burst(c.x, c.y, 10, { v: [2, 6], life: [140, 300], size: [2, 4], colors: ['#fff0c8', '#e8e0c8'] }); ring(c.x, c.y, 4, 34, 220, '#e8e0c8', 3); tint(c, '#ffffff', 0.5, 160) },
  bloom(c) { ring(c.x, c.y, 14, 78, 520, '#5ef0c0', 6, 0.7); pop(c.x, c.y, 84, '#5ef0c0', 420, 0.6); tint(c, '#5ef0c0', 0.45, 750); tw(c, { s: 1.08 }, 110); at(110, () => tw(c, { s: 1 }, 280, eob))
    fx(600, () => { if (live && Math.random() < 0.55) pt(c.x + rnd(-36, 36), c.y + rnd(-20, 54), rnd(-0.15, 0.15), -rnd(0.9, 2.2), rnd(400, 700), rnd(2.5, 5), pick(['#5ef0c0', '#d5fff0'])) }) },
  surge(c) { for (let i = 0; i < 14; i++) pt(c.x + rnd(-40, 40), c.y + 56, 0, -rnd(4, 8.5), rnd(260, 420), rnd(3, 5.5), pick(['#ffd24a', '#fff1b8']), 0, 0, 0.97)
    pop(c.x, c.y, 90, '#ffd24a', 320, 0.8); ring(c.x, c.y, 20, 72, 340, '#ffd24a', 4); tint(c, '#ffd24a', 0.5, 620); tw(c, { s: 1.15 }, 120); at(120, () => tw(c, { s: 1 }, 300, eob)) },
  dome(c, light) { const T = light ? 700 : 1150; tint(c, '#6ec3ff', 0.3, T); pop(c.x, c.y, 90, '#6ec3ff', 300, 0.7); fx(T, (p) => { const g = eob(cl(p / 0.18)), a = p > 0.75 ? (1 - p) / 0.25 : 1, y = c.y + c.bY; glow(c.x, y, 78 * g, '#2f7fd0', 0.28 * a)
    ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(c.x, y, Math.max(0, 56 * g), Math.max(0, 72 * g), 0, 0, TAU); ctx.stroke()
    const s = p * 9; ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(c.x, y, Math.max(0, 56 * g), Math.max(0, 72 * g), 0, s, s + 0.7); ctx.stroke() }) },
  orbHit(c, _l, col) { burst(c.x, c.y, 18, { v: [2, 7], life: [220, 520], size: [4, 9], colors: [col, '#ffffff'], dr: 0.92 }); ring(c.x, c.y, 10, 78, 340, col, 7); pop(c.x, c.y, 80, col, 240); tint(c, col, 0.5, 400) },
}

// ── IŠKVIETIMAI: juda pati korta (S). Visi efektai radialūs iš kortos perimetro – korta guli plokščiai. ──
const SUM: Record<SummonFxId, () => void> = {
  meteor() { S.hidden = true; const f = { x: X + 440, y: Y - 432 }, t = { x: X, y: Y }
    fx(2600, (p) => { const a = p < 0.2 ? p / 0.2 : p > 0.6 ? (1 - p) / 0.4 : 1; dark(X, Y, 90, 0.5 * a); glow(X, Y, 70, '#ff5a1a', 0.35 * a) }, 0)
    fx(520, (p) => { const e = ei(p) * 0.7 + p * 0.3, x = lerp(f.x, t.x, e), y = lerp(f.y, t.y, e), r = lerp(46, 30, p); if (live) { for (let i = 0; i < 3; i++) pt(x + rnd(-8, 8), y + rnd(-8, 8), rnd(0.5, 2), -rnd(0.5, 2), rnd(250, 500), rnd(7, 14), pick(FIRE)); pt(x, y, 1, -1, 700, 16, '#1c1410', 2) }
      glow(x, y, r * 1.6, '#ff5a1a', 0.8); glow(x, y, r, '#ffb347', 1); glow(x, y, r * 0.45, '#fff3d0', 1) })
    at(520, () => { show({ s: 1.3 }); tw(S, { s: 1 }, 300, eob); tint(S, '#ffb060', 0.95, 800); land(16, 95); flash('#ffd9a0', 0.38, 240); ring(X, Y, 20, 170, 460, '#ff9a3a', 12); ring(X, Y, 10, 110, 620, '#ffd27a', 5); pop(X, Y, 160, '#ffb060', 320)
      burst(X, Y, 44, { v: [3, 11], life: [300, 750], size: [6, 14], colors: FIRE, dr: 0.92 }); burst(X, Y, 12, { v: [2, 7], life: [500, 900], size: [5, 10], colors: ['#2a1c14', '#5a2a14'], k: 3, g: 0.25, dr: 0.97 }); dust(14, [2, 5])
      fx(1000, () => { if (live && Math.random() < 0.7) { const [x, y] = perim(S, 4); pt(x, y, rnd(-0.3, 0.3), -rnd(0.8, 2.2), rnd(350, 700), rnd(2, 4.5), pick(FIRE)) } }) }) },
  frostNova() { S.hidden = true
    fx(520, () => { if (live) for (let i = 0; i < 2; i++) { const a = rnd(0, TAU), r = rnd(120, 170); pt(X + Math.cos(a) * r, Y + Math.sin(a) * r, -Math.cos(a) * r / 15, -Math.sin(a) * r / 15, 250, rnd(3, 7), pick(['#cfeeff', '#ffffff', '#9fdcff']), 0, 0, 1) } })
    fx(2400, (p) => { const a = p < 0.2 ? p / 0.2 : p > 0.7 ? (1 - p) / 0.3 : 1; ctx.globalCompositeOperation = 'lighter'; glow(X, Y, 150 * Math.min(1, p * 4), '#9fdcff', 0.22 * a) }, 0)
    at(250, () => { show({ alpha: 0, s: 0.55 }); tw(S, { alpha: 1, s: 1 }, 270, eob); S.tint = '#eaf8ff'; S.tintA = 1 })
    at(520, () => { land(9, 70); tint(S, '#eaf8ff', 1, 650); flash('#cfeeff', 0.26, 220); ring(X, Y, 20, 270, 520, '#dff4ff', 14); ring(X, Y, 10, 180, 700, '#9fdcff', 5)
      burst(X, Y, 30, { v: [5, 13], life: [350, 700], size: [6, 12], colors: ['#e8f8ff', '#9fdcff'], k: 1, dr: 0.9 }); burst(X, Y, 20, { v: [2, 7], life: [300, 600], size: [2, 4], colors: ['#ffffff'] })
      for (const c of cur.cards) if (Math.hypot(c.x - X, c.y - Y) < 260) at(120, () => tint(c, '#bfe9ff', 0.6, 1300))
      const sp = [...Array(14)].map((_, i) => ({ a: i / 14 * TAU + rnd(-0.1, 0.1), l: rnd(18, 34), r: rnd(64, 84) }))
      fx(1900, (p) => { const g = eob(cl(p / 0.1)), a = p > 0.75 ? (1 - p) / 0.25 : 1; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.9; ctx.fillStyle = '#dff4ff'; for (const q of sp) { const c = Math.cos(q.a), s = Math.sin(q.a), bx = X + c * q.r, by = Y + s * q.r; ctx.beginPath(); ctx.moveTo(bx - s * 5, by + c * 5); ctx.lineTo(bx + c * q.l * g, by + s * q.l * g); ctx.lineTo(bx + s * 5, by - c * 5); ctx.fill() }
        if (live && Math.random() < 0.3) pt(X + rnd(-120, 120), Y + rnd(-110, 90), rnd(-0.2, 0.2), rnd(0.2, 0.6), 700, rnd(1.5, 3), '#ffffff') }, 0) }) },
  heroLanding() { show({ s: 2.7, alpha: 0, rot: -0.12 }); tw(S, { s: 1, rot: 0 }, 380, ei); tw(S, { alpha: 1 }, 120)
    fx(380, (p) => { dark(X, Y, lerp(140, 62, p), lerp(0.15, 0.7, p)) }, 0)
    at(380, () => { land(20, 115); flash('#ffffff', 0.3, 200); S.sx = 1.16; S.sy = 0.86; tw(S, { sx: 1, sy: 1 }, 340, eob); tint(S, '#ffffff', 0.6, 260); ring(X, Y, 30, 210, 480, '#ffe9b8', 12); ring(X, Y, 20, 120, 640, '#d8b25a', 4); dust(30, [2, 6.5])
      for (let i = 0; i < 18; i++) { const [x, y, nx, ny] = perim(S, 2), s = rnd(3, 9); pt(x, y, nx * s + rnd(-1, 1), ny * s + rnd(-1, 1) - 1.5, rnd(450, 900), rnd(4, 9), pick(['#4a4038', '#2a2420', '#6b5a48']), 3, 0.28, 0.97) }
      const cr = [...Array(11)].map((_, i) => { const a = i / 11 * TAU + rnd(-0.2, 0.2), L = rnd(70, 150); let x = X + Math.cos(a) * 50, y = Y + Math.sin(a) * 62; const p = [x, y]; for (let k = 1; k <= 4; k++) { x += Math.cos(a + rnd(-0.5, 0.5)) * L / 4; y += Math.sin(a + rnd(-0.5, 0.5)) * L / 4; p.push(x, y) } return p })
      fx(2600, (p) => { const g = cl(p / 0.05), a = p > 0.6 ? (1 - p) / 0.4 : 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (const pass of [0, 1]) { ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over'; ctx.strokeStyle = pass ? '#ffb347' : '#050308'; ctx.lineWidth = pass ? 2.2 : 5.5; ctx.globalAlpha = a * (pass ? Math.max(0, 1 - p * 1.6) : 0.9)
        for (const q of cr) { ctx.beginPath(); ctx.moveTo(q[0], q[1]); const n = Math.max(1, Math.ceil(4 * g)); for (let k = 1; k <= n; k++) ctx.lineTo(q[k * 2], q[k * 2 + 1]); ctx.stroke() } } }, 0) }) },
  hellRise() { S.hidden = true; dim(0.4, 2300)
    fx(1650, (p) => { const o = p < 0.2 ? eo(p / 0.2) : p > 0.78 ? 1 - ei((p - 0.78) / 0.22) : 1, w = (CW / 2 + 16) * o, h = (CH / 2 + 16) * o; if (o <= 0.01) return; ctx.globalCompositeOperation = 'lighter'; glow(X, Y, 120 * o, '#ff3a1a', 0.42 + Math.sin(time / 60) * 0.08)
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#050103'; ctx.beginPath(); ctx.rect(X - w, Y - h, w * 2, h * 2); ctx.fill(); ctx.strokeStyle = '#ff5a1a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.9; ctx.stroke(); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1; ctx.stroke()
      ctx.globalCompositeOperation = 'lighter'; glow(X, Y, 60 * o, '#7a1010', 0.6) }, 0)
    fx(1500, () => { if (!live) return; for (let i = 0; i < 3; i++) { const [x, y, nx, ny] = perim(S, 14); pt(x, y, nx * rnd(0.2, 1.6), ny * rnd(0.2, 1.6) - rnd(0.6, 2), rnd(280, 600), rnd(7, 16), pick(['#ff4a1a', '#ff7a1a', '#ffb347'])) }
      if (Math.random() < 0.25) { const [x, y] = perim(S, 10); pt(x, y, rnd(-0.3, 0.3), -rnd(0.5, 1.2), 800, rnd(12, 18), '#150808', 2) } if (Math.random() < 0.12) shake(3) })
    at(380, () => { show({ s: 0.5, alpha: 0, rot: 0.1 }); S.tint = '#000000'; S.tintA = 1; tw(S, { alpha: 1 }, 200); tw(S, { s: 1.1, rot: 0 }, 820, eo); tw(S, { tintA: 0 }, 900, ei) })
    at(1000, () => { S.tint = '#ff3a1a'; S.tintA = 0.6; tw(S, { tintA: 0 }, 600, lin) })
    at(1250, () => { tw(S, { s: 1 }, 220, ei) })
    at(1470, () => { land(12, 70); flash('#ff5a2a', 0.2, 200); ring(X, Y, 30, 190, 460, '#ff5a1a', 10); dust(12)
      for (let i = 0; i < 34; i++) { const [x, y, nx, ny] = perim(S, 0), s = rnd(2, 8); pt(x, y, nx * s, ny * s - rnd(0, 2), rnd(350, 800), rnd(3, 7), pick(FIRE), 0, 0.05, 0.94) } }) },
  thunder() { S.hidden = true; dim(0.5, 1700)
    at(180, () => bolt(X - 120, TOP, X - 70, Y - 250, 110, '#9fc4ff', 1.4, 10)); at(300, () => bolt(X + 140, TOP, X + 60, Y - 280, 110, '#9fc4ff', 1.4, 10))
    at(470, () => { bolt(X + rnd(-60, 60), TOP, X, Y - 20, 260, '#bcd4ff', 5, 20); bolt(X + rnd(-90, 90), TOP, X, Y - 20, 200, '#9fc4ff', 2.4, 26)
      show({ s: 1.18 }); tw(S, { s: 1 }, 320, eob); tint(S, '#ffffff', 1, 560); land(14, 85); flash('#e6efff', 0.5, 260); ring(X, Y, 20, 200, 420, '#bcd4ff', 9); pop(X, Y, 170, '#bcd4ff', 300)
      burst(X, Y, 34, { v: [4, 13], life: [150, 420], size: [2, 5], colors: ['#fff6b0', '#bcd4ff', '#ffffff'], dr: 0.9 }); dust(10)
      let pts: number[][] = [], t = -99; fx(900, (p) => { if (time - t > 60) { t = time; pts = [0, 1, 2, 3].map(() => { const a = perim(S, 0), b = perim(S, rnd(0, 26)); return boltPts(a[0], a[1], b[0], b[1], 8) }) } for (const q of pts) drawBolt(q, '#9fc4ff', 1.4, (1 - p) * 0.9) })
      fx(1600, (p) => { dark(X, Y, 100, 0.4 * (1 - p)) }, 0) }) },
  shadowStep() { S.hidden = true; dim(0.35, 1700)
    fx(750, (p) => { if (!live) return; for (let i = 0; i < 2; i++) { const a = rnd(0, TAU), r = lerp(130, 60, p); pt(X + Math.cos(a) * r, Y + Math.sin(a) * r, -Math.cos(a) * r / 22 - Math.sin(a) * 3.2, -Math.sin(a) * r / 22 + Math.cos(a) * 3.2, 380, rnd(12, 20), '#120818', 2, 0, 0.97) }
      const a = rnd(0, TAU); pt(X + Math.cos(a) * 110, Y + Math.sin(a) * 110, -Math.cos(a) * 5 - Math.sin(a) * 3, -Math.sin(a) * 5 + Math.cos(a) * 3, 330, rnd(3, 6), '#a855f7', 0, 0, 0.98) })
    at(360, () => { show({ alpha: 0, s: 0.9 }); S.tint = '#07030c'; S.tintA = 1; tw(S, { alpha: 1 }, 360); tw(S, { s: 1 }, 420, eo); tw(S, { tintA: 0 }, 820, ei) })
    at(800, () => { shake(4); neighbors(4); ring(X, Y, 40, 150, 520, '#a855f7', 5, 0.7); pop(X, Y, 120, '#7c3aed', 380, 0.5)
      for (let i = 0; i < 16; i++) { const [x, y, nx, ny] = perim(S, 0); pt(x, y, nx * rnd(1, 3), ny * rnd(1, 3), rnd(500, 900), rnd(12, 20), '#120818', 2, 0, 0.95) } }) },
  holyDescent() { S.hidden = true
    fx(1900, (p) => { const a = p < 0.15 ? p / 0.15 : p > 0.7 ? (1 - p) / 0.3 : 1; glow(X, Y, 170, '#ffe08a', 0.3 * a); ctx.fillStyle = '#fff4c2'; for (let i = 0; i < 10; i++) { const an = i / 10 * TAU + time / 2600, w = 0.07 + 0.03 * Math.sin(i * 2.1), L = 180 + 30 * Math.sin(time / 300 + i)
      ctx.globalAlpha = a * 0.13; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(an - w) * L, Y + Math.sin(an - w) * L); ctx.lineTo(X + Math.cos(an + w) * L, Y + Math.sin(an + w) * L); ctx.fill() }
      if (live && Math.random() < 0.5) { const an = rnd(0, TAU), r = rnd(20, 130); pt(X + Math.cos(an) * r, Y + Math.sin(an) * r, 0, -rnd(0.3, 1), rnd(500, 900), rnd(2, 4), '#fff4c2') } })
    at(200, () => { show({ alpha: 0, s: 1.7 }); S.tint = '#fff4c2'; S.tintA = 0.9; tw(S, { alpha: 1 }, 320); tw(S, { s: 1 }, 900, eo); tw(S, { tintA: 0 }, 1100, ei) })
    at(1080, () => { try { cur.hooks?.land?.(3) } catch { /* */ } ring(X, Y, 40, 190, 700, '#ffe08a', 6, 0.8); ring(X, Y, 30, 120, 900, '#fff4c2', 3, 0.7); burst(X, Y, 22, { v: [1, 4], life: [500, 900], size: [2.5, 5], colors: ['#fff4c2', '#ffe08a'], jx: 40, jy: 56 })
      for (const c of cur.row) at(140, () => { tint(c, '#ffe08a', 0.35, 900); knock(c, -2) }) }) },
  graveBurst() { S.hidden = true
    fx(2300, (p) => { const a = p < 0.1 ? p / 0.1 : p > 0.7 ? (1 - p) / 0.3 : 1; dark(X, Y, 96, 0.6 * a, '#0a0806'); glow(X, Y, lerp(30, 80, cl(p * 4)), '#5ef0c0', (0.25 + 0.1 * Math.sin(time / 70)) * a) }, 0)
    fx(520, () => { if (!live) return; if (Math.random() < 0.5) { const [x, y, nx, ny] = perim(S, -14); pt(x, y, nx * rnd(0.5, 2), ny * rnd(0.5, 2) - 1, rnd(300, 500), rnd(3, 6), pick(['#3a2c20', '#52402e']), 3, 0.2, 0.97) } if (Math.random() < 0.2) shake(3) })
    at(520, () => { show({ s: 0.6, rot: -0.08 }); S.tint = '#0c1a14'; S.tintA = 0.9; tw(S, { s: 1, rot: 0 }, 400, eob); tw(S, { tintA: 0 }, 600, lin); land(12, 65); ring(X, Y, 20, 170, 460, '#5ef0c0', 8); pop(X, Y, 130, '#5ef0c0', 320, 0.7); dust(18, [2, 5])
      for (let i = 0; i < 24; i++) { const [x, y, nx, ny] = perim(S, 0), s = rnd(3, 8); pt(x, y, nx * s + rnd(-1, 1), ny * s - rnd(0, 2.5), rnd(500, 950), rnd(4, 9), pick(['#3a2c20', '#52402e', '#d8d0b8']), 3, 0.3, 0.97) }
      fx(1200, () => { if (live && Math.random() < 0.4) pt(X + rnd(-50, 50), Y + rnd(-40, 60), rnd(-0.5, 0.5), -rnd(0.8, 2), rnd(600, 1000), rnd(4, 8), pick(['#5ef0c0', '#aef5dd']), 0, -0.01, 0.99) }) }) },
  portal() { S.hidden = true
    fx(1900, (p) => { const g = eo(cl(p / 0.3)), a = p > 0.75 ? (1 - p) / 0.25 : 1, r = 80; ctx.globalCompositeOperation = 'lighter'; glow(X, Y, r * 1.3 * g, '#4c1d95', 0.55 * a); ctx.globalAlpha = a; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, r, -1.57, -1.57 + TAU * g); ctx.stroke()
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X, Y, r - 11, 1.57, 1.57 - TAU * g, true); ctx.stroke(); for (const d of [1, -1]) { ctx.beginPath(); for (let i = 0; i <= 3; i++) { const an = i / 3 * TAU + d * time / 700 + (d < 0 ? 1 : 0), px = X + Math.cos(an) * (r - 11) * g, py = Y + Math.sin(an) * (r - 11) * g; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py) } ctx.stroke() }
      for (let i = 0; i < 8; i++) { if (i / 8 > g) break; const an = i / 8 * TAU - time / 900; glow(X + Math.cos(an) * (r - 5), Y + Math.sin(an) * (r - 5), 8, '#e9d5ff', a) } }, 0)
    at(600, () => { show({ s: 0.05, rot: -2.4 }); S.tint = '#c4b5fd'; S.tintA = 1; tw(S, { s: 1, rot: 0 }, 520, eob); tw(S, { tintA: 0 }, 700, lin) })
    at(1120, () => { land(7, 50); ring(X, Y, 60, 170, 420, '#a78bfa', 6); burst(X, Y, 26, { v: [2, 7], life: [300, 650], size: [2.5, 5], colors: ['#c4b5fd', '#a78bfa', '#ffffff'] }) }) },
  tornado() { S.hidden = true
    fx(1300, (p) => { const a = Math.min(1, p * 5, (1 - p) * 4); if (live) for (let i = 0; i < 3; i++) { const an = rnd(0, TAU), r = lerp(150, 34, p) * rnd(0.6, 1), c = Math.cos(an), s = Math.sin(an); pt(X + c * r, Y + s * r, -s * 6.5 - c * 1.4, c * 6.5 - s * 1.4, 260, rnd(2, 4), pick(['#d8f5ec', '#9fe8d0']), 0, 0, 0.98) }
      ctx.strokeStyle = '#9fe8d0'; ctx.lineCap = 'round'; for (let i = 0; i < 6; i++) { const r = (34 + i * 22) * (1.15 - p * 0.4), st = time / (70 + i * 9) + i * 1.9; ctx.globalAlpha = a * (0.55 - i * 0.06); ctx.lineWidth = 3.5 - i * 0.4; ctx.beginPath(); ctx.arc(X, Y, r, st, st + 1.3); ctx.stroke() } })
    at(250, () => { show({ s: 0.3, rot: TAU * 3, alpha: 0 }); tw(S, { alpha: 1 }, 300); tw(S, { s: 1, rot: 0 }, 950, eo) })
    at(1200, () => { land(8, 40); ring(X, Y, 40, 200, 480, '#d8f5ec', 7, 0.7); for (let i = 0; i < 26; i++) { const an = rnd(0, TAU), c = Math.cos(an), s = Math.sin(an); pt(X + c * 50, Y + s * 60, c * rnd(3, 8) - s * 3, s * rnd(3, 8) + c * 3, rnd(300, 600), rnd(10, 18), '#8a9a94', 2, 0, 0.93) } }) },
  vines() { S.hidden = true
    const V = [...Array(7)].map((_, i) => { const a = i / 7 * TAU + rnd(-0.2, 0.2), f = { x: X + Math.cos(a) * 210, y: Y + Math.sin(a) * 190 }, t = { x: X + Math.cos(a + 0.5) * 26, y: Y + Math.sin(a + 0.5) * 34 }; return { f, t, arc: rnd(-70, 70) } })
    fx(2100, (p) => { const g = eo(cl(p / 0.33)) * (p > 0.72 ? 1 - ei((p - 0.72) / 0.28) : 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (const [col, lw] of [['#1c3d18', 10], ['#6fbf4a', 3.5]] as [string, number][]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.globalAlpha = 1
      for (const v of V) { ctx.beginPath(); for (let k = 0; k <= 14; k++) { const u = k / 14 * g, [x, y] = bez(v.f, v.t, v.arc, u), xx = x + Math.sin(u * 14 + time / 300) * 4; if (k) ctx.lineTo(xx, y); else ctx.moveTo(xx, y) } ctx.stroke() } }
      ctx.globalCompositeOperation = 'lighter'; for (const v of V) { const [x, y] = bez(v.f, v.t, v.arc, g); glow(x, y, 9, '#bef264', 0.7) } }, 0)
    at(700, () => { show({ s: 0 }); S.tint = '#6fbf4a'; S.tintA = 0.85; tw(S, { s: 1 }, 520, eob); tw(S, { tintA: 0 }, 800, lin) })
    at(1180, () => { land(6, 40); ring(X, Y, 40, 150, 460, '#6fbf4a', 6); burst(X, Y, 28, { v: [2, 6.5], life: [500, 950], size: [5, 9], colors: ['#6fbf4a', '#bef264', '#2f6b2a'], k: 1, g: 0.06, dr: 0.93 }) }) },
  bloodRitual() { S.hidden = true; dim(0.4, 2100)
    const R = [0, 2, 4, 1, 3, 0].map((i) => [X + Math.cos(i / 5 * TAU - 1.57) * 88, Y + Math.sin(i / 5 * TAU - 1.57) * 88])
    fx(2100, (p) => { const g = cl(p / 0.34) * 5, a = p > 0.75 ? (1 - p) / 0.25 : 1; ctx.globalCompositeOperation = 'lighter'; glow(X, Y, 120, '#7a0010', 0.5 * a); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#ff3a4a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(R[0][0], R[0][1])
      for (let k = 1; k <= 5; k++) { const q = cl(g - (k - 1)); if (q <= 0) break; ctx.lineTo(lerp(R[k - 1][0], R[k][0], q), lerp(R[k - 1][1], R[k][1], q)) } ctx.stroke(); ctx.beginPath(); ctx.arc(X, Y, 96, 0, TAU * cl(p / 0.34)); ctx.stroke()
      if (p > 0.34) { ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 5; k++) { glow(R[k][0], R[k][1], 13 + Math.sin(time / 50 + k) * 3, '#ff7a1a', a); if (live && Math.random() < 0.3) pt(R[k][0], R[k][1], rnd(-0.2, 0.2), -rnd(0.6, 1.6), 300, rnd(3, 5), '#ffb347') } } }, 0)
    at(760, () => { show({ alpha: 0 }); S.tint = '#7a0010'; S.tintA = 1; tw(S, { alpha: 1 }, 400) })
    for (const t of [1000, 1230]) at(t, () => { tw(S, { s: 1.1 }, 90); at(90, () => tw(S, { s: 1 }, 140, ei)); shake(3); ring(X, Y, 50, 110, 300, '#ff3a4a', 3, 0.5) })
    at(1480, () => { tw(S, { tintA: 0 }, 500, lin); land(10, 70); flash('#ff2a3a', 0.16, 220); ring(X, Y, 40, 190, 460, '#ff3a4a', 9); burst(X, Y, 34, { v: [2, 8], life: [450, 850], size: [3, 7], colors: ['#ff3a4a', '#b00020', '#ff7a8a'], g: 0.28, up: -3, dr: 0.97 }) }) },
  clockwork() { S.hidden = true; const Qd: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    fx(1000, (p) => { ctx.globalCompositeOperation = 'source-over'; Qd.forEach(([dx, dy], i) => { const q = cl((p - i * 0.13) / 0.45), o = (1 - eo(q)) * 240; if (q <= 0) return; ctx.globalAlpha = cl(q * 5)
      face(S, X + (dx < 0 ? -CW / 2 : 0) + dx * o, Y + (dy < 0 ? -CH / 2 : 0) + dy * o, CW / 2, CH / 2, dx < 0 ? 0 : 0.5, dy < 0 ? 0 : 0.5, 0.5, 0.5) }) })
    Qd.forEach(([dx, dy], i) => at(130 * i + 450, () => { shake(3.5); burst(X + dx * 6, Y + dy * 8, 9, { v: [2, 7], life: [120, 300], size: [2, 4], colors: ['#ffe89a', '#ffffff'] }) }))
    fx(2300, (p) => { const g = eob(cl((p - 0.3) / 0.15)), a = p < 0.3 ? 0 : p > 0.75 ? (1 - p) / 0.25 : 1, r = 86 * g, n = 14, rot = time / 500; if (a <= 0 || r <= 0) return; ctx.globalAlpha = a * 0.8; ctx.strokeStyle = '#d8b25a'; ctx.lineWidth = 3; ctx.beginPath()
      for (let i = 0; i < n * 4; i++) { const an = i / (n * 4) * TAU + rot, rr = r + ((i >> 1) % 2 ? 10 : 0), px = X + Math.cos(an) * rr, py = Y + Math.sin(an) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py) } ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(X, Y, Math.max(0, r - 12), 0, TAU); ctx.stroke() }, 0)
    at(1000, () => { show({}); tint(S, '#ffe89a', 0.8, 450); land(8, 45); tw(S, { s: 1.08 }, 80); at(80, () => tw(S, { s: 1 }, 220, eob)); burst(X, Y, 22, { v: [3, 9], life: [150, 380], size: [2, 4.5], colors: ['#ffe89a', '#ffffff', '#ffb347'] }) }) },
  mirror() { S.hidden = true
    for (let i = 0; i < 30; i++) { const a = rnd(0, TAU), r = rnd(190, 260), T = rnd(380, 460), v = r / (T / 16.67); pt(X + Math.cos(a) * r, Y + Math.sin(a) * r, -Math.cos(a) * v, -Math.sin(a) * v, T, rnd(7, 14), pick(['#eaf4ff', '#9fc4ff', '#ffffff']), 1, 0, 1) }
    at(450, () => { show({ s: 1.14 }); tw(S, { s: 1 }, 260, eob); tint(S, '#eaf4ff', 1, 520); land(6, 60); ring(X, Y, 50, 150, 360, '#eaf4ff', 3)
      const L = [...Array(7)].map(() => { const a = perim(S, 0); return [X + rnd(-10, 10), Y + rnd(-10, 10), a[0], a[1]] }); fx(420, (p) => { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.globalAlpha = 1 - p; ctx.beginPath(); for (const l of L) { ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]) } ctx.stroke() })
      at(180, () => fx(650, (p) => { ctx.save(); ctx.beginPath(); ctx.rect(X - CW / 2, Y - CH / 2, CW, CH); ctx.clip(); const x = lerp(X - 110, X + 110, p); ctx.globalAlpha = 0.75 * Math.sin(p * Math.PI); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, Y - 70); ctx.lineTo(x + 26, Y - 70); ctx.lineTo(x - 14, Y + 70); ctx.lineTo(x - 40, Y + 70); ctx.fill(); ctx.restore() })) }) },
  sandWipe() { S.hidden = true
    fx(1500, (p) => { if (live && p < 0.85) for (let i = 0; i < 4; i++) pt(X + rnd(-280, 220), Y + rnd(-80, 80), rnd(7, 12), rnd(-0.5, 0.5), rnd(240, 440), rnd(1.5, 3.5), pick(['#e8c98a', '#c9a25a', '#fff0c8']), 0, 0, 1) })
    at(300, () => { show({ wx: 0 }); tw(S, { wx: 1 }, 800, lin); tint(S, '#e8c98a', 0.7, 1100); fx(800, (p) => { const x = X - CW / 2 + CW * p; glow(x, Y, 34, '#e8c98a', 0.5); if (live) for (let i = 0; i < 2; i++) pt(x, Y + rnd(-58, 58), rnd(2, 6), rnd(-1, 1), rnd(200, 400), rnd(2, 4), '#fff0c8') }) })
    at(1150, () => { try { cur.hooks?.land?.(3) } catch { /* */ } neighbors(3); ring(X, Y, 50, 140, 500, '#e8c98a', 4, 0.6); for (let i = 0; i < 14; i++) pt(X + rnd(-40, 40), Y + rnd(-50, 50), rnd(1, 4), rnd(-0.5, 0.5), rnd(400, 800), rnd(12, 20), '#a08a60', 2, 0, 0.95) }) },
  tidal() { S.hidden = true; const x0 = cur.rowL, x1 = cur.rowR, hh = CH * 0.85
    fx(900, (p) => { const x = lerp(x0, x1, p), a = Math.min(1, p * 6, (1 - p) * 5); ctx.globalCompositeOperation = 'source-over'; const g = ctx.createLinearGradient(x - 220, 0, x, 0); g.addColorStop(0, 'rgba(30,95,165,0)'); g.addColorStop(1, 'rgba(60,140,220,.42)'); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - 220, Y - hh, 220, hh * 2)
      ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 9; i++) { const y = Y - hh + i * hh / 4; glow(x + Math.sin(time / 90 + i) * 9, y, 20, '#dff4ff', 0.75 * a) } if (live) for (let i = 0; i < 2; i++) pt(x, Y + rnd(-hh, hh), rnd(1, 4), -rnd(0.5, 2.5), rnd(250, 450), rnd(2, 4), '#ffffff', 0, 0.14) })
    for (const c of cur.row) at(cl((c.x - x0) / (x1 - x0)) * 900, () => { knock(c, 5); tint(c, '#3c8cdc', 0.4, 700); tw(c, { rot: 0.09 }, 200); at(200, () => tw(c, { rot: -0.05 }, 260)); at(460, () => tw(c, { rot: 0 }, 260)) })
    at(cl((X - x0) / (x1 - x0)) * 900, () => { show({ alpha: 0, ox: -46, rot: -0.22 }); tw(S, { alpha: 1 }, 160); tw(S, { ox: 0 }, 520, eo); tw(S, { rot: 0.12 }, 280); at(280, () => tw(S, { rot: -0.06 }, 280)); at(560, () => tw(S, { rot: 0 }, 300)); tint(S, '#3c8cdc', 0.6, 900)
      at(520, () => { try { cur.hooks?.land?.(4) } catch { /* */ } })
      burst(X, Y, 34, { v: [2, 7], life: [400, 800], size: [3, 6], colors: ['#bfe9ff', '#ffffff', '#7cc4ff'], g: 0.3, up: -4, dr: 0.98, jx: 30 }); for (const d of [0, 200, 400]) at(d, () => ring(X, Y, 30, 150, 700, '#bfe9ff', 3, 0.6)) }) },
  dragonBreath() { S.hidden = true; const o = { x: X - 350, y: Y - 60 }, an = Math.atan2(Y - o.y, X - o.x)
    fx(2600, (p) => { const a = p < 0.1 ? p / 0.1 : 1 - p; ctx.save(); ctx.translate((o.x + X) / 2, (o.y + Y) / 2); ctx.rotate(an); ctx.scale(3.4, 0.5); glow(0, 0, 60, '#000000', 0.6 * a); ctx.restore() }, 0)
    fx(820, () => { if (!live) return; shake(2.5); for (let i = 0; i < 5; i++) { const a = an + rnd(-0.2, 0.2), v = rnd(10, 15); pt(o.x, o.y, Math.cos(a) * v, Math.sin(a) * v, rnd(330, 480), rnd(8, 18), pick(FIRE), 0, 0, 0.985) } })
    at(280, () => { show({ alpha: 0 }); S.tint = '#fff3d0'; S.tintA = 1; tw(S, { alpha: 1 }, 260) })
    at(840, () => { S.tint = '#ff5a1a'; S.tintA = 0.95; tw(S, { tintA: 0 }, 1100, eo); try { cur.hooks?.land?.(5) } catch { /* */ } neighbors(5); ring(X, Y, 40, 150, 460, '#ff9a3a', 5); fx(1100, () => { if (live && Math.random() < 0.5) { const [x, y] = perim(S, -4); pt(x, y, rnd(-0.3, 0.3), -rnd(0.6, 1.6), rnd(600, 1000), rnd(10, 18), '#9a9aa2', 2) } }) }) },
  starfall() { S.hidden = true; dim(0.4, 1900)
    const C = ([[-52, -66], [10, -84], [58, -40], [40, 30], [-14, 74], [-62, 20]] as [number, number][]).map(([x, y]) => [X + x, Y + y])
    C.forEach(([x, y], i) => at(i * 125, () => { fx(170, (p) => { const e = ei(p), sx = lerp(x + 130, x, e), sy = lerp(y - 220, y, e); ctx.strokeStyle = '#dbe6ff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 26, sy - 44); ctx.stroke(); glow(sx, sy, 10, '#ffffff', 1) })
      at(170, () => { shake(2); pop(x, y, 30, '#dbe6ff', 220); burst(x, y, 6, { v: [1, 4], life: [200, 400], size: [2, 3.5], colors: ['#ffffff', '#bcd4ff'] }) }) }))
    fx(1500, (p) => { const t = p * 1500, a = t > 1200 ? (1500 - t) / 300 : 1; C.forEach(([x, y], i) => { if (t < i * 125 + 170) return; glow(x, y, 8 + Math.sin(time / 90 + i * 2) * 3, '#ffffff', a); glow(x, y, 20, '#9fc4ff', 0.4 * a) })
      const g = cl((t - 800) / 380) * 6; ctx.strokeStyle = '#bcd4ff'; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.8 * a; ctx.beginPath(); ctx.moveTo(C[0][0], C[0][1]); for (let k = 1; k <= 6; k++) { const q = cl(g - (k - 1)); if (q <= 0) break; const A0 = C[k - 1], B = C[k % 6]; ctx.lineTo(lerp(A0[0], B[0], q), lerp(A0[1], B[1], q)) } ctx.stroke() })
    at(1260, () => { show({ alpha: 0, s: 1.06 }); tw(S, { alpha: 1 }, 200); tw(S, { s: 1 }, 300); tint(S, '#dbe6ff', 1, 650); land(5, 40); flash('#dbe6ff', 0.14, 200); ring(X, Y, 50, 170, 520, '#dbe6ff', 4); burst(X, Y, 26, { v: [0.6, 3.5], life: [500, 1000], size: [2, 4], colors: ['#ffffff', '#bcd4ff'], jx: 40, jy: 56, dr: 0.97 }) }) },
  voidRift() { S.hidden = true
    fx(1500, (p) => { const h = eo(cl(p / 0.12)) * (p > 0.85 ? 1 - ei((p - 0.85) / 0.15) : 1) * 100, w = eo(cl((p - 0.1) / 0.2)) * (p > 0.7 ? 1 - eo(cl((p - 0.7) / 0.2)) : 1) * 48 + 1.5; if (h < 1) return
      ctx.globalCompositeOperation = 'lighter'; glow(X, Y, h * 1.2, '#7c3aed', 0.4); ctx.globalCompositeOperation = 'source-over'; ctx.beginPath(); ctx.moveTo(X, Y - h); ctx.quadraticCurveTo(X + w, Y, X, Y + h); ctx.quadraticCurveTo(X - w, Y, X, Y - h); ctx.fillStyle = '#020006'; ctx.globalAlpha = 1; ctx.fill(); ctx.strokeStyle = '#c4a5ff'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.stroke()
      if (live && p < 0.7 && p > 0.1) { ctx.globalCompositeOperation = 'lighter'; const a = rnd(0, TAU), r = rnd(130, 190); pt(X + Math.cos(a) * r, Y + Math.sin(a) * r, -Math.cos(a) * r / 17, -Math.sin(a) * r / 17, 270, rnd(2, 4), pick(['#ffffff', '#c4a5ff']), 0, 0, 1) } }, 0)
    at(520, () => { show({ sx: 0.04, sy: 1.4 }); S.tint = '#000000'; S.tintA = 1; tw(S, { sx: 1, sy: 1 }, 380, eob); tw(S, { tintA: 0 }, 650, lin)
      fx(520, (p) => { for (const d of [-1, 1]) { ctx.globalAlpha = 0.4 * (1 - p); face(S, X - CW / 2 + d * 26 * (1 - p) * S.sx, Y - CH / 2, CW, CH) } }) })
    at(1280, () => { land(9, 60); flash('#7c3aed', 0.14, 200); ring(X, Y, 10, 180, 380, '#c4a5ff', 5); fx(260, (p) => { ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, Y - 120 * (1 - p)); ctx.lineTo(X, Y + 120 * (1 - p)); ctx.stroke() }) }) },
  swordRing() { S.hidden = true; const N = 6, R = 84
    fx(1750, (p) => { const t = p * 1750; for (let i = 0; i < N; i++) { const l = t - i * 110; if (l < 0) continue; const an = i / N * TAU - 1.57, k = l < 150 ? l / 150 : 1, out = t > 1050 ? ei((t - 1050) / 700) * 420 : 0, z = lerp(3, 1, ei(k)), a = (l < 150 ? k : 1) * (t > 1050 ? 1 - (t - 1050) / 700 : 1),
        cx = X + Math.cos(an) * (R + out), cy = Y + Math.sin(an) * (R + out), c = Math.cos(an), s = Math.sin(an), L = 38 * z, w = 6 * z; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = '#dfe6f0'; ctx.beginPath()
      ctx.moveTo(cx - c * L * 0.6, cy - s * L * 0.6); ctx.lineTo(cx - s * w, cy + c * w); ctx.lineTo(cx + c * L * 0.5, cy + s * L * 0.5); ctx.lineTo(cx + s * w, cy - c * w); ctx.fill(); ctx.strokeStyle = '#d8b25a'; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(cx + c * L * 0.5 - s * w * 1.8, cy + s * L * 0.5 + c * w * 1.8); ctx.lineTo(cx + c * L * 0.5 + s * w * 1.8, cy + s * L * 0.5 - c * w * 1.8); ctx.stroke()
      if (t > 760 && t < 1000) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin((t - 760) / 240 * Math.PI) * 0.8; ctx.strokeStyle = '#fff4c2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - c * L * 0.6, cy - s * L * 0.6); ctx.lineTo(X, Y); ctx.stroke() } } })
    for (let i = 0; i < N; i++) at(i * 110 + 150, () => { const an = i / N * TAU - 1.57, x = X + Math.cos(an) * (R - 22), y = Y + Math.sin(an) * (R - 22); shake(3.5); burst(x, y, 6, { v: [2, 5], life: [120, 260], size: [2, 3.5], colors: ['#ffffff', '#ffe89a'] }); ring(x, y, 3, 22, 220, '#dfe6f0', 2) })
    at(930, () => { show({ alpha: 0, s: 0.88 }); tw(S, { alpha: 1 }, 140); tw(S, { s: 1 }, 260, eob); tint(S, '#ffffff', 1, 520); land(10, 60); flash('#ffffff', 0.2, 180); ring(X, Y, 30, 180, 440, '#ffe89a', 7) }) },
  ambush() { const far = Math.min(540, Math.max(260, cur.right - X + 120)); show({ ox: far, rot: 0.28, sx: 1.3, sy: 0.82 }); tw(S, { ox: 0 }, 270, ei)
    fx(460, () => { if (S.ox < 3) return; for (let k = 1; k <= 5; k++) { ctx.globalAlpha = 0.34 - k * 0.06; face(S, X + S.ox + k * 36 - CW / 2, Y - CH / 2, CW, CH) } if (live) pt(X + S.ox + 40, Y + rnd(-40, 50), rnd(2, 5), rnd(-0.5, 0.5), 300, rnd(10, 16), '#8a7b6a', 2) })
    at(270, () => { tw(S, { rot: 0, sx: 1, sy: 1 }, 300, eob); land(11, 65); dust(14, [2, 5]); burst(X, Y, 12, { v: [3, 8], life: [300, 600], size: [4, 7], colors: ['#d4af37', '#ffe89a'], k: 1, g: 0.25, dr: 0.96 })
      fx(480, (p) => { const g = eo(cl(p / 0.25)), a = p > 0.4 ? (1 - p) / 0.6 : 1; ctx.lineCap = 'round'; for (const d of [1, -1]) for (const [lw, c] of [[9, '#d4af37'], [3, '#ffffff']] as [number, string][]) { ctx.globalAlpha = a * (lw > 4 ? 0.4 : 1); ctx.strokeStyle = c; ctx.lineWidth = lw * (1 - p * 0.6); ctx.beginPath(); ctx.moveTo(X - d * 110, Y - 100); ctx.lineTo(X - d * 110 + d * 220 * g, Y - 100 + 200 * g); ctx.stroke() } }) }) },
  bomb() { S.hidden = true
    fx(1000, (p) => { const z = 1 + Math.pow(Math.sin(p * p * 22), 2) * 0.16 * (0.4 + p), r = 24 * z; dark(X, Y + 8, 40, 0.6); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#14141a'; ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#4a4a58'; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(X - 8 * z, Y - 9 * z, 5 * z, 0, TAU); ctx.fill(); const L = 1 - p, fx0 = X + 10 * z, fy0 = Y - r + 2, ex = fx0 + 34 * L, ey = fy0 - 30 * L; ctx.globalAlpha = 1; ctx.strokeStyle = '#c9a25a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(fx0, fy0); ctx.quadraticCurveTo(fx0 + 6 * L, fy0 - 30 * L, ex, ey); ctx.stroke()
      ctx.globalCompositeOperation = 'lighter'; glow(ex, ey, 12, '#ffd24a', 1); glow(X, Y, r * 2, '#ff3a1a', p * p * 0.6); if (live) pt(ex, ey, rnd(-2, 2), rnd(-2.5, 0.5), rnd(120, 260), rnd(1.5, 3), '#ffe89a', 0, 0.1) })
    at(1000, () => { show({ rot: 0.4, s: 1.18 }); S.tint = '#14100c'; S.tintA = 0.9; tw(S, { s: 1 }, 500, eob); tw(S, { rot: -0.14 }, 260); at(260, () => tw(S, { rot: 0.06 }, 240)); at(500, () => tw(S, { rot: 0 }, 240)); tw(S, { tintA: 0 }, 1500, ei)
      land(17, 95); flash('#ffe9a0', 0.36, 220); ring(X, Y, 20, 190, 420, '#ffb347', 11); burst(X, Y, 22, { v: [3, 10], life: [250, 550], size: [6, 13], colors: FIRE, dr: 0.92 })
      burst(X, Y, 30, { v: [1, 6], life: [900, 1600], size: [20, 36], colors: ['#5a5a62', '#3a3a42', '#77777f'], k: 2, dr: 0.93 }); burst(X, Y, 12, { v: [3, 9], life: [500, 900], size: [4, 8], colors: ['#2a2420', '#6b5a48'], k: 3, g: 0.3, dr: 0.97 })
      for (const c of cur.cards) if (Math.hypot(c.x - X, c.y - Y) < 170) at(100, () => tint(c, '#14100c', 0.45, 1300)) }) },
  warDrums() { S.hidden = true
    const arcs = (r1: number, c: string, lw: number) => fx(420, (p) => { ctx.strokeStyle = c; ctx.lineWidth = lw * (1 - p); ctx.lineCap = 'round'; ctx.globalAlpha = 1 - p; const r = lerp(56, r1, eo(p)); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(X, Y, r, k * 1.5708 + 0.35, k * 1.5708 + 1.22); ctx.stroke() } })
    ;[0.5, 0.7, 0.88].forEach((z, i) => at(i * 330, () => { show({ s: z, alpha: 0.45 + i * 0.25, sx: 1.16, sy: 0.86 }); S.tint = '#000000'; S.tintA = 0.6 - i * 0.2; tw(S, { sx: 1, sy: 1 }, 220, eob); shake(4 + i * 2.5); arcs(120 + i * 20, '#ffd24a', 6); neighbors(3 + i * 2) }))
    at(990, () => { show({ s: 1, alpha: 1, sx: 1.2, sy: 0.84 }); tw(S, { sx: 1, sy: 1 }, 320, eob); tint(S, '#ffd24a', 0.7, 500); land(16, 90); flash('#ffd9a0', 0.2, 200); arcs(230, '#fff1b8', 11); ring(X, Y, 40, 170, 460, '#ffd24a', 6); dust(22, [2, 6]) }) },
  chains() { show({ alpha: 0 }); S.tint = '#0a0810'; S.tintA = 0.9; tw(S, { alpha: 1 }, 300)
    const K = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][]).map(([dx, dy]) => ({ ax: X + dx * CW / 2, ay: Y + dy * CH / 2, bx: X + dx * 300, by: Y + dy * 230 }))
    fx(1250, (p) => { const a = Math.min(1, p * 5), j = p * p * 3.5; ctx.strokeStyle = '#9aa4b4'; ctx.lineWidth = 2.2; for (const k of K) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; const n = 22, an = Math.atan2(k.by - k.ay, k.bx - k.ax)
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, x = lerp(k.ax, k.bx, u) + rnd(-j, j), y = lerp(k.ay, k.by, u) + rnd(-j, j); ctx.beginPath(); ctx.ellipse(x, y, 7.5, i % 2 ? 2.2 : 4.2, an, 0, TAU); ctx.stroke() } ctx.globalCompositeOperation = 'lighter'; glow(k.ax, k.ay, 10 + p * 10, '#ff7a1a', p) } })
    ;[420, 640, 840, 1000, 1130].forEach((t, i) => at(t, () => { cshake(S, 3 + i * 1.3); tw(S, { s: 1.03 + i * 0.012 }, 70); at(70, () => tw(S, { s: 1 }, 110)) }))
    at(1250, () => { tw(S, { tintA: 0 }, 320, lin); S.s = 1.2; tw(S, { s: 1 }, 320, eob); land(13, 75); flash('#ffffff', 0.2, 180); ring(X, Y, 40, 200, 440, '#dfe6f0', 8)
      for (const k of K) for (let i = 0; i < 9; i++) { const u = i / 9, dx = k.bx - k.ax, dy = k.by - k.ay, l = Math.hypot(dx, dy); pt(lerp(k.ax, k.bx, u), lerp(k.ay, k.by, u), dx / l * rnd(2, 7) + rnd(-2, 2), dy / l * rnd(2, 7) + rnd(-2, 2), rnd(400, 800), rnd(4, 7), pick(['#9aa4b4', '#dfe6f0']), 1, 0.25, 0.97) } }) },
  thread() { const drop = Math.min(430, Y - TOP + 60); show({ oy: -drop }); tw(S, { oy: -34 }, 760, eo)
    fx(900, (p) => { const k = (1 - p) * (1 - p); S.rot = Math.sin(time / 125) * 0.24 * k; S.ox = -Math.sin(time / 125) * 52 * k; ctx.strokeStyle = '#e6e6f0'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(X, TOP); ctx.lineTo(X + S.ox + Math.sin(S.rot) * CH / 2, Y + S.oy - CH / 2); ctx.stroke() })
    at(900, () => { S.rot = 0; S.ox = 0; tw(S, { oy: 0 }, 130, ei); fx(300, (p) => { ctx.strokeStyle = '#e6e6f0'; ctx.lineWidth = 1.2; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.moveTo(X, TOP); ctx.quadraticCurveTo(X + 40 * p, (TOP + Y) / 2 - 80 * p, X + 10, Y - 120 - 260 * p); ctx.stroke() }) })
    at(1030, () => { land(9, 50); dust(12); S.sx = 1.1; S.sy = 0.9; tw(S, { sx: 1, sy: 1 }, 260, eob)
      const sp = [...Array(9)].map((_, i) => i / 9 * TAU + rnd(-0.15, 0.15)); fx(2200, (p) => { const g = eo(cl(p / 0.12)), a = (p > 0.6 ? (1 - p) / 0.4 : 1) * 0.4; ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#e6e6f0'; ctx.lineWidth = 1; ctx.globalAlpha = a; ctx.beginPath()
        for (const an of sp) { ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(an) * 150 * g, Y + Math.sin(an) * 150 * g) } for (const r of [62, 98, 134]) { for (let i = 0; i <= 9; i++) { const an = sp[i % 9], rr = r * g * (i % 2 ? 0.94 : 1), px = X + Math.cos(an) * rr, py = Y + Math.sin(an) * rr; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py) } } ctx.stroke() }, 0) }) },
  scroll() { S.hidden = true
    const bar = (y: number, a: number) => { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.fillStyle = '#e8d8a8'; ctx.fillRect(X - CW / 2 - 7, y - 6, CW + 14, 12); ctx.fillStyle = '#8a6a3a'; for (const d of [-1, 1]) ctx.fillRect(X + d * (CW / 2 + 5) - 4, y - 8, 8, 16) }
    fx(1250, (p) => { const t = p * 1250, y0 = Y - CH / 2; if (t < 250) { const e = eo(t / 250); bar(y0 - 60 * (1 - e), e) } else { const a = t > 1000 ? (1250 - t) / 250 : 1; bar(y0 + CH * S.wy, a); if (live && t < 950 && Math.random() < 0.7) { ctx.globalCompositeOperation = 'lighter'; pt(X + rnd(-CW / 2, CW / 2), y0 + CH * S.wy, rnd(-0.4, 0.4), rnd(-0.8, 0.2), rnd(300, 600), rnd(2, 3.5), pick(['#c4b5fd', '#ffffff'])) } } })
    at(250, () => { show({ wy: 0 }); tw(S, { wy: 1 }, 700, eo); tint(S, '#e8d8a8', 0.75, 1100) })
    at(980, () => { try { cur.hooks?.land?.(3) } catch { /* */ } neighbors(3); ring(X, Y, 50, 150, 520, '#c4b5fd', 3, 0.7); burst(X, Y, 18, { v: [0.6, 3], life: [500, 900], size: [2, 4], colors: ['#c4b5fd', '#ffffff'], jx: 40, jy: 56, up: -0.6 }) }) },
  phoenix() { S.hidden = true
    fx(520, (p) => { dark(X, Y, 70, 0.6); if (live && Math.random() < 0.6) pt(X + rnd(-34, 34), Y + rnd(-20, 40), rnd(-0.2, 0.2), -rnd(0.3, 1), 700, rnd(8, 14), '#6a625e', 2); glow(X, Y, 40 * p, '#ff7a1a', 0.5 * p) }, 0)
    fx(950, (p) => { if (!live) return; const sp = cl(p * 2.4), fo = p > 0.8 ? (1 - p) / 0.2 : 1; for (const d of [-1, 1]) for (let i = 0; i < 5; i++) { if (Math.random() > fo) continue; const u = Math.random() * sp, x = X + d * (28 + u * 165), y = Y + 20 - Math.sin(u * 2.3) * 105 + u * 34
      pt(x, y, d * rnd(0.2, 1.2), rnd(0.4, 1.8) * (u + 0.2), rnd(260, 520), rnd(5, 12) * (1.1 - u * 0.5), pick(FIRE), 0, 0, 0.97) } })
    at(520, () => { show({ alpha: 0, s: 0.7, oy: 34 }); S.tint = '#ffd27a'; S.tintA = 1; tw(S, { alpha: 1 }, 260); tw(S, { s: 1.06, oy: -10 }, 620, eo); tw(S, { tintA: 0 }, 1100, ei) })
    at(1240, () => { tw(S, { s: 1, oy: 0 }, 200, ei) })
    at(1440, () => { land(7, 50); ring(X, Y, 40, 190, 480, '#ff9a3a', 7); for (const d of [-1, 1]) burst(X + d * 50, Y - 30, 16, { a0: d > 0 ? -1 : Math.PI - 0.2, spread: 1.2, v: [3, 9], life: [600, 1100], size: [5, 9], colors: FIRE, k: 1, g: 0.07, dr: 0.95 }) }) },
  eclipse() { S.hidden = true; dim(0.55, 1900)
    const rays: [number, number][] = [...Array(18)].map((_, i) => [i / 18 * TAU + rnd(-0.1, 0.1), rnd(60, 130)])
    fx(1750, (p) => { const a = p > 0.78 ? (1 - p) / 0.22 : Math.min(1, p * 6), m = eo(cl(p / 0.45)), tot = cl((p - 0.4) / 0.1) * a; ctx.globalCompositeOperation = 'lighter'; glow(X, Y, 95, '#ffd24a', 0.6 * a); glow(X, Y, 46, '#fff4c2', a)
      if (tot > 0) { ctx.strokeStyle = '#fff4c2'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; for (const [an, l] of rays) { ctx.globalAlpha = tot * (0.35 + 0.3 * Math.sin(time / 70 + an * 7)); ctx.beginPath(); ctx.moveTo(X + Math.cos(an) * 42, Y + Math.sin(an) * 42); ctx.lineTo(X + Math.cos(an) * (42 + l), Y + Math.sin(an) * (42 + l)); ctx.stroke() }
        ctx.globalAlpha = tot; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, 41, 0, TAU); ctx.stroke() }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.fillStyle = '#030208'; ctx.beginPath(); ctx.arc(X - 120 * (1 - m), Y - 30 * (1 - m), 39, 0, TAU); ctx.fill() }, 0)
    at(1250, () => { show({ alpha: 0 }); S.tint = '#030208'; S.tintA = 1; tw(S, { alpha: 1 }, 260) })
    at(1560, () => { tw(S, { tintA: 0 }, 520, lin); land(4, 40); pop(X + 38, Y - 52, 60, '#ffffff', 420); ring(X, Y, 44, 170, 560, '#ffd24a', 3, 0.8) }) },
  swamp() { S.hidden = true
    fx(2300, (p) => { const a = p < 0.15 ? p / 0.15 : p > 0.72 ? (1 - p) / 0.28 : 1, r = 120 * eo(cl(p / 0.2)); dark(X, Y, r, 0.75 * a, '#0a1406'); ctx.globalCompositeOperation = 'lighter'; glow(X, Y, r * 0.9, '#4d7c0f', 0.75 * a) }, 0)
    for (let i = 0; i < 16; i++) at(80 + i * 75, () => { const x = X + rnd(-70, 70), y = Y + rnd(-62, 62), R = rnd(8, 16); fx(380, (p) => { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#bef264'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(x, y, R * eo(p), 0, TAU); ctx.stroke(); glow(x - R * 0.3 * p, y - R * 0.3 * p, 3, '#ffffff', 0.8) }, 0)
      at(380, () => burst(x, y, 5, { v: [1, 3], life: [200, 400], size: [2, 3.5], colors: ['#bef264', '#84cc16'], g: 0.15, up: -1.5 })) })
    at(650, () => { show({ alpha: 0, s: 0.84, oy: 16 }); S.tint = '#3f6212'; S.tintA = 0.95; tw(S, { alpha: 1 }, 360); tw(S, { s: 1, oy: 0 }, 720, eo); tw(S, { tintA: 0 }, 1300, ei)
      fx(1500, (p) => { if (live && Math.random() < 0.5 * (1 - p)) pt(S.x + rnd(-40, 40), S.y + S.oy + CH / 2 - 4, 0, rnd(0.2, 1), rnd(400, 700), rnd(2.5, 5), pick(['#84cc16', '#4d7c0f']), 0, 0.12) }) })
    at(1380, () => { try { cur.hooks?.land?.(4) } catch { /* */ } neighbors(4); ring(X, Y, 50, 160, 600, '#84cc16', 4, 0.6); for (let i = 0; i < 12; i++) pt(X + rnd(-60, 60), Y + rnd(-60, 60), rnd(-0.4, 0.4), -rnd(0.2, 0.7), rnd(800, 1300), rnd(14, 24), '#3f6212') }) },
  bats() { S.hidden = true; dim(0.3, 1700)
    const B = [...Array(LOW ? 16 : 28)].map(() => ({ a: rnd(0, TAU), b: rnd(0, TAU), tx: rnd(-36, 36), ty: rnd(-50, 50), ph: rnd(0, 9), r: rnd(300, 430) }))
    fx(1700, (p) => { const t = p * 1700; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#1c1026'; ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 0.8; ctx.globalAlpha = 1; for (const q of B) { let x: number, y: number
      if (t < 650) { const e = eo(t / 650); x = lerp(X + Math.cos(q.a) * q.r, X + q.tx, e) + Math.sin(t / 60 + q.ph) * 10 * (1 - e); y = lerp(Y + Math.sin(q.a) * q.r, Y + q.ty, e) }
      else if (t < 900) { x = X + q.tx + Math.sin(t / 50 + q.ph) * 4; y = Y + q.ty + Math.cos(t / 45 + q.ph) * 4 } else { const e = ei((t - 900) / 800); x = X + q.tx + Math.cos(q.b) * e * 480; y = Y + q.ty + Math.sin(q.b) * e * 480 }
      const f = Math.sin(time / 36 + q.ph) * 6, w = 10; ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x - w, y - f); ctx.lineTo(x - w * 0.5, y + 3); ctx.lineTo(x, y + 5); ctx.lineTo(x + w * 0.5, y + 3); ctx.lineTo(x + w, y - f); ctx.closePath(); ctx.fill(); ctx.stroke() } })
    at(660, () => { show({ alpha: 0 }); S.tint = '#07030c'; S.tintA = 1; tw(S, { alpha: 1 }, 200) })
    at(900, () => { tw(S, { tintA: 0 }, 520, lin); land(5, 30); ring(X, Y, 40, 170, 480, '#a855f7', 4, 0.7); pop(X, Y, 110, '#7c3aed', 320, 0.45) }) },
}

// ═══════════════════════════════════════════════════════════════════════════
// Vykdymas: canvas, scenos, DOM kortų adapteris, kadras
// ═══════════════════════════════════════════════════════════════════════════
function isLow(): boolean {
  try { if (localStorage.getItem('rvn-vfx-quality') === 'low') return true } catch { /* */ }
  return window.innerWidth < 820 || (navigator.hardwareConcurrency || 8) <= 4
}
function reducedMotion(): boolean { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } }

function resize() {
  if (!cv) return
  D = Math.min(window.devicePixelRatio || 1, LOW ? 1 : 2)
  cv.width = Math.round(window.innerWidth * D); cv.height = Math.round(window.innerHeight * D)
}
let resizeBound = false
function ensureCanvas(root?: HTMLElement | null): boolean {
  if (typeof document === 'undefined') return false
  const host = root ?? document.querySelector<HTMLElement>('[data-fx-root]') ?? document.body
  if (cv && cv.isConnected && cv.parentElement === host) return true
  hardReset()
  const el = document.createElement('canvas')
  el.setAttribute('aria-hidden', 'true'); el.dataset.fxStage = '1'
  Object.assign(el.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '127', pointerEvents: 'none' })
  const c = el.getContext('2d'); if (!c) return false
  host.appendChild(el); cv = el; ctx = c
  LOW = isLow(); MAXP = LOW ? 350 : 700
  resize()
  if (!resizeBound) { resizeBound = true; window.addEventListener('resize', resize) }
  return true
}

function measure(root: HTMLElement): { px: number; py: number; w: number; h: number } {
  const r = root.getBoundingClientRect()
  let px = r.left + r.width / 2, py = r.top + r.height / 2
  const w = root.offsetWidth || r.width, h = root.offsetHeight || r.height
  // framer-motion įėjimo spyruoklė (y/scale) dar gali būti aktyvi – atimam jos poslinkį,
  // kad efektas būtų ties GALUTINE kortos vieta, ne ties tarpine.
  try { const tr = getComputedStyle(root).transform; if (tr && tr !== 'none') { const m = new DOMMatrixReadOnly(tr); px -= m.e; py -= m.f } } catch { /* */ }
  return { px, py, w, h }
}
function mkCard(root: HTMLElement | null, sc: { cx: number; cy: number; k: number }, isS: boolean, at?: Pt): VCard {
  const m = root ? measure(root) : { px: at?.x ?? sc.cx, py: at?.y ?? sc.cy, w: CW * sc.k, h: 116 * sc.k }
  const el = root ? (root.querySelector<HTMLElement>('[data-lunge]') ?? root) : null
  return {
    x: X + (m.px - sc.cx) / sc.k, y: Y + (m.py - sc.cy) / sc.k, px: m.px, py: m.py, vw: m.w / sc.k, vh: m.h / sc.k,
    root, el, ov: null, img: root ? root.querySelector('img') : null,
    ox: 0, oy: 0, s: 1, sx: 1, sy: 1, rot: 0, alpha: 1, tint: '#ffffff', tintA: 0, hidden: false, bV: 0, bY: 0, sh: 0, wx: 1, wy: 1,
    written: false, isS,
  }
}
function isDefault(c: VCard): boolean {
  return !c.hidden && c.ox === 0 && c.oy === 0 && c.bY === 0 && c.sh === 0 && c.s === 1 && c.sx === 1 && c.sy === 1 && c.rot === 0 && c.alpha === 1 && c.tintA <= 0.01 && c.wx >= 1 && c.wy >= 1
}
function clearCard(c: VCard) {
  const st = c.el?.style; if (!st) return
  st.removeProperty('translate'); st.removeProperty('scale'); st.removeProperty('rotate'); st.removeProperty('opacity'); st.removeProperty('clip-path'); st.removeProperty('will-change')
  if (c.ov) { c.ov.remove(); c.ov = null }
  c.written = false
}
function applyCard(c: VCard, k: number) {
  const el = c.el; if (!el) return
  if (isDefault(c)) { if (c.written) clearCard(c); return }
  const st = el.style
  const jx = c.sh > 0.2 ? rnd(-c.sh, c.sh) : 0, jy = c.sh > 0.2 ? rnd(-c.sh, c.sh) : 0
  if (!c.written) { c.written = true; st.setProperty('will-change', 'translate, scale, rotate, opacity') }
  st.setProperty('translate', `${((c.ox + jx) * k).toFixed(1)}px ${((c.oy + c.bY + jy) * k).toFixed(1)}px`)
  st.setProperty('scale', `${(c.s * c.sx).toFixed(3)} ${(c.s * c.sy).toFixed(3)}`)
  st.setProperty('rotate', `${c.rot.toFixed(3)}rad`)
  st.setProperty('opacity', c.hidden ? '0' : c.alpha.toFixed(2))
  if (c.wx < 1 || c.wy < 1) st.setProperty('clip-path', `inset(0 ${((1 - c.wx) * 100).toFixed(1)}% ${((1 - c.wy) * 100).toFixed(1)}% 0)`); else st.removeProperty('clip-path')
  if (c.tintA > 0.01) {
    if (!c.ov) {
      const ov = document.createElement('div'); ov.setAttribute('aria-hidden', 'true'); ov.dataset.fxTint = '1'
      Object.assign(ov.style, { position: 'absolute', inset: '0', borderRadius: '8px', pointerEvents: 'none', zIndex: '40' })
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
      el.appendChild(ov); c.ov = ov
    }
    c.ov.style.background = c.tint; c.ov.style.opacity = c.tintA.toFixed(2)
  } else if (c.ov) c.ov.style.opacity = '0'
}

function makeScene(center: Pt, k: number, sRoot: HTMLElement | null, hooks: FxHooks | undefined, withNeighbors: boolean, host: ParentNode): Scene {
  const base = { cx: center.x, cy: center.y, k }
  const Sc = mkCard(sRoot, base, true, center)
  // S visada tiksliai ties X,Y (apvalinimo paklaidos nesikaupia)
  Sc.x = X; Sc.y = Y
  const cards: VCard[] = []
  if (withNeighbors) host.querySelectorAll<HTMLElement>('[data-unit-uid]').forEach((el) => { if (el !== sRoot) cards.push(mkCard(el, base, false)) })
  const row = cards.filter((c) => Math.abs(c.y - Y) < Sc.vh * 0.5)
  const left = X + (0 - center.x) / k, right = X + (window.innerWidth - center.x) / k
  const xs = [X, ...row.map((c) => c.x)]
  const sc: Scene = {
    cx: center.x, cy: center.y, k, S: Sc, cards, row, busy: true, hooks,
    top: Y + (0 - center.y) / k - 20, left, right,
    rowL: Math.max(left, Math.min(...xs) - 200), rowR: Math.min(right, Math.max(...xs) + 200), zRoot: null,
  }
  SCENES.push(sc)
  return sc
}
function finalize(sc: Scene) {
  const stillUsed = (el: HTMLElement | null) => !!el && SCENES.some((o) => o !== sc && (o.S.el === el || o.cards.some((c) => c.el === el)))
  for (const c of [sc.S, ...sc.cards]) { if (c.written || c.ov) { if (stillUsed(c.el)) { c.ov?.remove(); c.ov = null } else clearCard(c) } }
  if (sc.zRoot) { sc.zRoot.style.removeProperty('z-index'); sc.zRoot = null }
}
function hardReset() {
  for (const sc of SCENES) finalize(sc)
  PENDING.forEach((l) => l.style.removeProperty('opacity')); PENDING.clear()
  SCENES.length = 0; Q.length = 0; FX.length = 0; TW.length = 0; pN = 0; freeze = 0; running = false
  if (cv) { try { cv.remove() } catch { /* */ } cv = null }
}

function sceneXf(sc: Scene) { ctx.setTransform(D * sc.k, 0, 0, D * sc.k, D * (sc.cx - X * sc.k), D * (sc.cy - Y * sc.k)) }
function runFx(layer: 0 | 1) {
  for (let i = 0; i < FX.length; i++) {
    const f = FX[i]; if (f.layer !== layer) continue
    enter(f.sc); f.sc.busy = true; sceneXf(f.sc)
    ctx.globalCompositeOperation = layer ? 'lighter' : 'source-over'; ctx.globalAlpha = 1
    try { f.fn(cl((time - f.t0) / f.dur)) } catch (e) { f.dur = 0; console.error('[fxStage]', e) }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
}
function tri(p: Part, x: number, y: number, s: number, a: number) {
  const c = Math.cos(p.rot), n = Math.sin(p.rot); ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.beginPath()
  ctx.moveTo(x + c * s, y + n * s); ctx.lineTo(x - n * s * 0.45, y + c * s * 0.45); ctx.lineTo(x - c * s * 0.6 + n * s * 0.3, y - n * s * 0.6 - c * s * 0.3); ctx.fill()
}

function tick(now: number) {
  if (!cv || !cv.isConnected) { hardReset(); return }
  const raw = Math.min(50, now - last); last = now
  let dt = raw; if (freeze > 0) { freeze -= raw; dt = 0 }
  live = dt > 0; time += dt
  const f = dt / 16.67
  for (const sc of SCENES) sc.busy = false
  for (let i = 0; i < Q.length;) {
    if (Q[i].at <= time) { const q = Q.splice(i, 1)[0]; enter(q.sc); q.sc.busy = true; try { q.fn() } catch (e) { console.error('[fxStage]', e) } }
    else { Q[i].sc.busy = true; i++ }
  }
  for (let i = TW.length - 1; i >= 0; i--) { const w = TW[i], p = cl((time - w.t0) / w.dur); (w.o[w.k] as number) = lerp(w.a, w.b, w.ease(p)); w.sc.busy = true; if (p >= 1) TW.splice(i, 1) }
  if (live) for (const sc of SCENES) for (const c of sc.cards.length ? [sc.S, ...sc.cards] : [sc.S]) {
    if (c.bV === 0 && c.bY === 0 && c.sh === 0) continue
    c.bV += -c.bY * 0.2 * f; c.bV *= Math.pow(0.76, f); c.bY += c.bV * f; c.sh *= Math.pow(0.84, f)
    if (Math.abs(c.bY) > 0.05 || Math.abs(c.bV) > 0.05 || c.sh > 0.2) sc.busy = true; else { c.bY = 0; c.bV = 0; c.sh = 0 }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1
  ctx.clearRect(0, 0, cv.width, cv.height)
  // 1) žemės sluoksnis, tada iškerpam kortų vietas – atrodo PO kortomis
  let ground = false
  for (let i = 0; i < FX.length; i++) if (FX[i].layer === 0) { ground = true; break }
  if (ground) {
    runFx(0)
    ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1; ctx.fillStyle = '#000'
    for (const sc of SCENES) for (const c of [sc.S, ...sc.cards]) {
      if (!c.el || c.hidden || c.alpha < 0.6 || c.wx < 1 || c.wy < 1) continue
      const w = c.vw * sc.k * c.s * c.sx, h = c.vh * sc.k * c.s * c.sy
      ctx.setTransform(D, 0, 0, D, D * (c.px + c.ox * sc.k), D * (c.py + (c.oy + c.bY) * sc.k)); if (c.rot) ctx.rotate(c.rot)
      ctx.beginPath(); if (typeof ctx.roundRect === 'function') ctx.roundRect(-w / 2, -h / 2, w, h, 7 * sc.k); else ctx.rect(-w / 2, -h / 2, w, h); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }
  // 2) dalelės: tamsios (dūmai, nuolaužos) vienu praėjimu, švytinčios kitu
  ctx.setTransform(D, 0, 0, D, 0, 0)
  for (let i = 0; i < pN;) { const p = P[i]; if (live) { p.t += dt; const d = Math.pow(p.dr, f); p.vx *= d; p.vy = p.vy * d + p.g * f; p.x += p.vx * f; p.y += p.vy * f; p.rot += p.vr * f } if (p.t >= p.max || !p.sc) { P[i] = P[--pN]; P[pN] = p } else { p.sc.busy = true; i++ } }
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over'
    for (let i = 0; i < pN; i++) {
      const p = P[i], sc = p.sc!, e = p.t / p.max
      if (pass === 0 ? (p.k !== 2 && p.k !== 3) : (p.k !== 0 && p.k !== 1)) continue
      const x = (p.x - X) * sc.k + sc.cx, y = (p.y - Y) * sc.k + sc.cy
      if (p.k === 2) { const r = p.s * (1 + e * 1.3) * sc.k; ctx.globalAlpha = (1 - e) * 0.5; ctx.drawImage(spr(p.c), x - r, y - r, r * 2, r * 2) }
      else if (p.k === 3) tri(p, x, y, p.s * sc.k, e > 0.7 ? (1 - e) / 0.3 : 1)
      else if (p.k === 0) { const r = p.s * (1 - e * 0.5) * sc.k; ctx.globalAlpha = 1 - e; ctx.drawImage(spr(p.c), x - r, y - r, r * 2, r * 2) }
      else tri(p, x, y, p.s * sc.k, 1 - e)
    }
  }
  // 3) viršutinis sluoksnis
  runFx(1)
  for (let i = FX.length - 1; i >= 0; i--) if (time - FX[i].t0 >= FX[i].dur) FX.splice(i, 1)
  // 4) kortų DOM
  for (const sc of SCENES) { applyCard(sc.S, sc.k); for (const c of sc.cards) if (c.written || !isDefault(c)) applyCard(c, sc.k) }
  for (let i = SCENES.length - 1; i >= 0; i--) if (!SCENES[i].busy) { finalize(SCENES[i]); SCENES.splice(i, 1) }
  if (SCENES.length || Q.length || FX.length || pN > 0 || freeze > 0) requestAnimationFrame(tick)
  else { running = false; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height) }
}
function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick) } }

// ── planavimas: kada skrydis pasiekia taikinį ────────────────────────────────
function plan(proj: FxProjId, hitAt?: number): { delay: number; T: number } {
  const base = PROJ[proj].base
  if (hitAt == null) return { delay: 0, T: base }
  if (proj === 'lightning') return { delay: Math.max(0, hitAt - 60), T: 220 }
  if (proj === 'holy') return { delay: Math.max(0, hitAt - 119), T: 340 }
  if (proj === 'healWisp' || proj === 'goldMotes') { const T = Math.max(300, Math.min(700, hitAt / 0.77)); return { delay: Math.max(0, hitAt - T * 0.77), T } }
  // Skrydis ne ilgesnis už bazinį – likęs laikas iki smūgio atitenka užtaisymui ant šaltinio.
  const T = Math.max(200, Math.min(base, hitAt)); return { delay: Math.max(0, hitAt - T), T }
}
function defaultK(host: ParentNode): number { const u = host.querySelector<HTMLElement>('[data-unit-uid]'); const w = u?.offsetWidth ?? 0; return w > 20 ? w / CW : 1 }

export type FlyOpts = {
  /** Po kiek ms (nuo dabar) smūgis TURI įvykti – skrydis pats susiplanuoja startą. Nenurodžius: užtaisymas + bazinė trukmė. */
  hitAt?: number
  /** Užtaisymas ant šaltinio prieš skrydį (jei yra laiko iki starto arba `hitAt` nenurodytas). */
  cast?: boolean
  sourceEl?: HTMLElement | null
  targetEl?: HTMLElement | null
  impact?: FxImpactId | null
  /** Statusams: smūgis be ilgos liekanos (nuolatinį vaizdą piešia CardStatusVfxLayer). */
  light?: boolean
  color?: string
  hooks?: FxHooks
  root?: HTMLElement | null
  onHit?: () => void
}

export const fxStage = {
  /** Ar FX variklis gali groti (naršyklė, ne reduced-motion). */
  available(): boolean { return typeof window !== 'undefined' && !reducedMotion() },

  /**
   * Iškvietimo choreografija ant TIKROS kortos. `el` – padaro konteineris ([data-unit-uid]).
   * Grąžina trukmę iki nusileidimo (ms) arba 0, jei efektas negrojamas.
   */
  summon(id: SummonFxId, el: HTMLElement, o: { hooks?: FxHooks; root?: HTMLElement | null } = {}): number {
    const def = SUM[id]; if (!def || !this.available() || !ensureCanvas(o.root)) return 0
    if (PENDING.has(el) || SCENES.some((x) => x.zRoot === el)) return 0   // ta pati korta jau groja (dvigubas kvietimas)
    // Korta paslepiama IŠKART, o scena startuoja tik nusistovėjus išdėstymui: ką tik įdėjus padarą
    // eilė dar 1–2 kadrus persicentruoja, ir per anksti išmatuotas centras būtų pasislinkęs.
    const lunge = el.querySelector<HTMLElement>('[data-lunge]') ?? el
    lunge.style.setProperty('opacity', '0'); PENDING.set(el, lunge)
    let lastPos = NaN, stable = 0, n = 0
    const start = () => {
      if (PENDING.get(el) !== lunge) return               // sustabdyta (stop) arba pakeista
      if (!el.isConnected) { PENDING.delete(el); return }
      const pos = el.offsetLeft * 100000 + el.offsetTop; n++
      if (pos === lastPos) stable++; else { stable = 0; lastPos = pos }
      if (stable < 2 && n < 14) { requestAnimationFrame(start); return }
      PENDING.delete(el)
      if (!ensureCanvas(o.root)) { lunge.style.removeProperty('opacity'); return }
      const m = measure(el)
      const sc = makeScene({ x: m.px, y: m.py }, m.w / CW, el, o.hooks, true, cv!.parentElement ?? document)
      sc.zRoot = el; el.style.zIndex = '46'
      enter(sc)
      try { def() } catch (e) { console.error('[fxStage] summon', id, e); S.hidden = false }
      sc.S.written = true                                 // opacity jau parašyta – applyCard/clearCard ją perims
      applyCard(sc.S, sc.k)
      if (isDefault(sc.S)) clearCard(sc.S)
      kick()
    }
    requestAnimationFrame(start)
    return summonLandMs(id) + 60
  },

  /** Skrydis iš `from` į `to` (ekrano px) + smūgis. Grąžina, po kiek ms įvyks smūgis. */
  fly(proj: FxProjId, from: Pt, to: Pt, o: FlyOpts = {}): number {
    const def = PROJ[proj]; if (!def || !this.available() || !ensureCanvas(o.root)) return 0
    const host = cv!.parentElement ?? document
    const tm = o.targetEl ? measure(o.targetEl) : null
    const k = tm ? tm.w / CW : defaultK(host)
    const sc = makeScene(tm ? { x: tm.px, y: tm.py } : to, k, o.targetEl ?? null, o.hooks, false, host)
    enter(sc)
    const f = { x: X + (from.x - sc.cx) / k, y: Y + (from.y - sc.cy) / k }, t = { x: X, y: Y }
    const col = o.color ?? def.col
    const pl = plan(proj, o.hitAt)
    if (o.cast && o.hitAt == null) pl.delay = 210
    let src: VCard | null = null
    if (o.cast && pl.delay >= 120) {
      const cd = Math.min(210, pl.delay), wait = pl.delay - cd
      at(wait, () => {
        if (o.sourceEl && o.sourceEl !== o.targetEl) { src = mkCard(o.sourceEl, sc, false); sc.cards.push(src); tw(src, { oy: -8, s: 1.07 }, cd * 0.8) }
        for (let i = 0; i < 14; i++) { const a = rnd(0, TAU), v = 58 / (cd / 16.67); pt(f.x + Math.cos(a) * 58, f.y + Math.sin(a) * 58, -Math.cos(a) * v, -Math.sin(a) * v, cd * 0.85, rnd(3, 5.5), col, 0, 0, 1) }
        fx(cd, (p) => { glow(f.x, f.y, 24 * p, col, 0.8); glow(f.x, f.y, 9 * p, '#ffffff', 0.9) })
      })
    }
    let hit = pl.delay + pl.T
    const launch = () => {
      if (src) { tw(src, { oy: 0, s: 1 }, 200, eob); knock(src, 4) }
      pop(f.x, f.y, 40, col, 150)
      const h = def.go(f, t, pl.T, col)
      at(h, () => { if (o.impact) IMP[o.impact](sc.S, !!o.light, col); try { o.onHit?.() } catch (e) { console.error('[fxStage]', e) } })
    }
    hit = pl.delay + (proj === 'lightning' ? Math.min(60, pl.T) : proj === 'holy' ? Math.max(pl.T, 340) * 0.35 : (proj === 'healWisp' || proj === 'goldMotes') ? pl.T * 0.77 : pl.T)
    if (pl.delay > 0) at(pl.delay, launch); else launch()
    kick()
    return Math.round(hit)
  },

  /** Tik smūgis (kai skrydį piešia kita sistema arba jo nereikia). */
  impact(id: FxImpactId, to: Pt, o: { targetEl?: HTMLElement | null; light?: boolean; color?: string; hooks?: FxHooks; root?: HTMLElement | null } = {}): void {
    const def = IMP[id]; if (!def || !this.available() || !ensureCanvas(o.root)) return
    const host = cv!.parentElement ?? document
    const tm = o.targetEl ? measure(o.targetEl) : null
    const sc = makeScene(tm ? { x: tm.px, y: tm.py } : to, tm ? tm.w / CW : defaultK(host), o.targetEl ?? null, o.hooks, false, host)
    enter(sc); def(sc.S, !!o.light, o.color ?? '#d4af37'); kick()
  },

  projColor(proj: FxProjId): string { return PROJ[proj]?.col ?? '#d4af37' },
  /** Įgyvendintų efektų sąrašai (testams: katalogas ir variklis privalo sutapti). */
  ids(): { summons: string[]; projectiles: string[]; impacts: string[] } { return { summons: Object.keys(SUM), projectiles: Object.keys(PROJ), impacts: Object.keys(IMP) } },
  /** Viską sustabdo ir išvalo (kovos ekrano uždarymas). */
  stop(): void { hardReset() },
  /** Testams / HUD. */
  stats(): { particles: number; scenes: number; running: boolean; low: boolean } { return { particles: pN, scenes: SCENES.length, running, low: LOW } },
}
