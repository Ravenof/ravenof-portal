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
import { drawCurseDemon } from './curseDemonFx'
import { summonLandMs, skillCastMs, type FxProjId, type FxImpactId, type SummonFxId, type SkillFxId } from './fxCatalog'

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
type Scene = { cx: number; cy: number; k: number; S: VCard; cards: VCard[]; row: VCard[]; busy: boolean; hooks?: FxHooks; top: number; left: number; right: number; rowL: number; rowR: number; zRoot: HTMLElement | null; foe: Pt; me: Pt }
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
// Ekrano px → canvas px: canvas'as gali būti pasislinkęs ar sumastelintas kartu su protėviu (lentos purtymas,
// transform ant kovos šaknies). BS/BX/BY perskaičiuojami kiekvieną kadrą iš tikro canvas'o rect'o.
let BS = 1, BX = 0, BY = 0
let time = 0, freeze = 0, live = true, running = false, last = 0
const P: Part[] = []
let pN = 0
type QItem = { at: number; fn: () => void; sc: Scene }
type FxItem = { t0: number; dur: number; fn: (p: number) => void; layer: 0 | 1; sc: Scene }
type TwItem = { o: VCard; k: keyof VCard; a: number; b: number; t0: number; dur: number; ease: Ease; sc: Scene }
const Q: QItem[] = [], FX: FxItem[] = [], TW: TwItem[] = [], SCENES: Scene[] = []
const OLD_IMGS = new Set<HTMLElement>()   // fazės virsmo senos kortos uždangos (išvalomos ir per stop)
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
// ── flipbook'ai ir tekstūrų sprite'ai ────────────────────────────────────────
// Ugnies/dūmų kadrų juostos vietoj vien procedūrinių dalelių. Simuliuoti šaltiniai perdaryti į pieštą stilių
// (tonų pakopos, kietas siluetas, sava paletė – žr. fx-src/stylize.py projekto aplanke). Šaltiniai CC0:
// Unity Labs „VFX Image Sequences" ir Kenney „Particle Pack" – žr. public/digital/fx/README.md.
// PILOTAS: kol `BOOKS_ON` išjungtas (numatyta), žaidime groja senieji efektai. Įjungiama /dev/fx.
type Book = { c: number; r: number; im: HTMLImageElement | null; ok: boolean }
const bk = (c = 1, r = 1): Book => ({ c, r, im: null, ok: false })
const BK: Record<string, Book> = {
  explosion: bk(5, 5), mist: bk(5, 5), flame: bk(16, 4),
  scorch: bk(), star: bk(), halo: bk(), ray: bk(), shock: bk(),
}
let BOOKS_ON = false
const tintC = new Map<string, HTMLCanvasElement>()
function bkLoad(k: string) {
  const b = BK[k]; if (!b || b.im || typeof Image === 'undefined') return
  const im = new Image(); im.decoding = 'async'; im.onload = () => { b.ok = true }; im.src = `/digital/fx/${k}.webp`; b.im = im
}
/** Paveikslas (arba nuspalvinta jo kopija). null – dar neįkeltas. */
function bkSrc(k: string, col?: string): CanvasImageSource | null {
  const b = BK[k]; if (!b) return null
  if (!b.im) bkLoad(k)
  if (!b.ok || !b.im) return null
  if (!col) return b.im
  const key = k + col; let c = tintC.get(key); if (c) return c
  c = document.createElement('canvas'); c.width = b.im.naturalWidth; c.height = b.im.naturalHeight
  const g = c.getContext('2d')!
  g.drawImage(b.im, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height)
  g.globalCompositeOperation = 'destination-in'; g.drawImage(b.im, 0, 0)
  tintC.set(key, c); return c
}
type BkO = { tint?: string; add?: boolean; rot?: number; a?: number; h?: number; step?: number }
/** `step` – rodyti tik kas N-tą kadrą („ant dvejetų“: judesys atrodo pieštas ranka, ne nufilmuotas). */
/** Vienas kadras: `f` 0..1 per visą juostą, `w` – plotis scenos vienetais (aukštis pagal kadro proporcijas arba `h`). */
function bkDraw(k: string, f: number, x: number, y: number, w: number, o: BkO = {}) {
  const b = BK[k], src = bkSrc(k, o.tint), a = o.a ?? 1; if (!src || !b.im || a <= 0 || w <= 0) return
  const n = b.c * b.r, st = o.step ?? 1, i = Math.min(n - 1, Math.max(0, (((f * n) / st) | 0) * st)), W = b.im.naturalWidth / b.c, H = b.im.naturalHeight / b.r, h = o.h ?? w * H / W
  ctx.globalCompositeOperation = o.add ? 'lighter' : 'source-over'; ctx.globalAlpha = a > 1 ? 1 : a
  if (o.rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot); ctx.drawImage(src, (i % b.c) * W, ((i / b.c) | 0) * H, W, H, -w / 2, -h / 2, w, h); ctx.restore() }
  else ctx.drawImage(src, (i % b.c) * W, ((i / b.c) | 0) * H, W, H, x - w / 2, y - h / 2, w, h)
}
type BookO = BkO & { grow?: number; fade?: number; loop?: number; layer?: 0 | 1; rise?: number }
/** Nugroja visą juostą per `dur` ms. grow – kiek paauga, fade – nuo kurios dalies gęsta, loop – kiek kartų prasukti. */
const book = (k: string, x: number, y: number, w: number, dur: number, o: BookO = {}) => fx(dur, (p) => {
  const a = (o.a ?? 1) * (o.fade != null && p > o.fade ? (1 - p) / (1 - o.fade) : 1)
  bkDraw(k, o.loop ? (p * o.loop) % 1 : p, x, y - (o.rise ?? 0) * p, w * (1 + (o.grow ?? 0) * eo(p)), { ...o, a, h: o.h != null ? o.h * (1 + (o.grow ?? 0) * eo(p)) : undefined })
}, o.layer ?? 1)
/** Trumpas tekstūros žybsnis (auga ir gęsta). */
const stamp = (k: string, x: number, y: number, w0: number, w1: number, dur: number, tint: string, a = 1, rot = 0, layer: 0 | 1 = 1) => fx(dur, (p) => bkDraw(k, 0, x, y, lerp(w0, w1, eo(p)), { tint, add: true, a: (1 - p) * a, rot }), layer)
const booksReady = (...ks: string[]) => BOOKS_ON && ks.every((k) => !!bkSrc(k))

// Naujos (flipbook) trijų efektų versijos – pilotas.
function fireBurstB(c: VCard, light: boolean) {
  stamp('scorch', c.x, c.y, 90, 250, 190, '#ffd9a0', 1, rnd(0, TAU))
  pop(c.x, c.y, 120, '#ffb060', 220)
  book('explosion', c.x, c.y - 8, light ? 170 : 230, light ? 520 : 680, { grow: 0.22, fade: 0.8, step: 2 })
  stamp('shock', c.x, c.y, 40, 260, 320, '#ffcf8a', 0.7)
  burst(c.x, c.y, light ? 10 : 20, { v: [3, 9], life: [300, 650], size: [2, 4.5], colors: ['#ffe2a8', '#ffb347', '#ff7a1a'], g: 0.16, dr: 0.94 })
  tint(c, '#ff8a2a', 0.75, 560); cshake(c, light ? 3 : 6)
  if (!light) { const y = c.y + c.vh * 0.2, h = c.vh * 1.15
    for (const dx of [-0.26, 0.04, 0.3]) at(120 + (dx + 0.3) * 200, () => book('flame', c.x + dx * c.vw, y, h * 0.5, 950, { loop: 1.6, fade: 0.6, a: 0.95, h, step: 5 })) }
}
function iceShatterB(c: VCard) {
  stamp('star', c.x, c.y, 80, 300, 240, '#e8f8ff', 1, 0.4)
  stamp('shock', c.x, c.y, 30, 230, 360, '#bfe9ff', 0.8)
  book('mist', c.x, c.y, 190, 600, { tint: '#cfeeff', grow: 0.3, fade: 0.45, a: 0.95, step: 2 })
  burst(c.x, c.y, 14, { v: [3, 8.5], life: [320, 640], size: [5, 10], colors: ['#e8f8ff', '#9fdcff'], k: 1, dr: 0.9, g: 0.1 })
  burst(c.x, c.y, 14, { v: [1, 4.5], life: [350, 700], size: [1.5, 3.5], colors: ['#ffffff', '#dff4ff'] })
  fx(900, (p) => glow(c.x, c.y, 80, '#9fdcff', 0.3 * (1 - p)), 0)
  tint(c, '#bfe9ff', 0.65, 900); cshake(c, 4)
}
function holyDescentB() {
  S.hidden = true
  const RY = [-0.62, -0.3, 0, 0.27, 0.58].map((d, i) => ({ d, w: 120 + (i % 2) * 50, ph: i * 1.7 }))
  fx(1900, (p) => { const a = p < 0.15 ? p / 0.15 : p > 0.7 ? (1 - p) / 0.3 : 1; ctx.globalCompositeOperation = 'lighter'; glow(X, Y, 170, '#ffe08a', 0.28 * a)
    bkDraw('halo', 0, X, Y, 300 + 20 * Math.sin(time / 400), { tint: '#ffe9a8', add: true, a: 0.5 * a, rot: time / 2400 })
    for (const r of RY) bkDraw('ray', 0, X + r.d * CW * 1.5, Y - 150, r.w, { tint: '#fff1c0', add: true, a: a * (0.5 + 0.25 * Math.sin(time / 260 + r.ph)), h: 560 })
    if (live && Math.random() < 0.5) { const an = rnd(0, TAU), r = rnd(20, 130); pt(X + Math.cos(an) * r, Y + Math.sin(an) * r, 0, -rnd(0.3, 1), rnd(500, 900), rnd(2, 4), '#fff4c2') } })
  at(200, () => { show({ alpha: 0, s: 1.7 }); S.tint = '#fff4c2'; S.tintA = 0.9; tw(S, { alpha: 1 }, 320); tw(S, { s: 1 }, 900, eo); tw(S, { tintA: 0 }, 1100, ei) })
  at(1080, () => { try { cur.hooks?.land?.(3) } catch { /* */ }
    stamp('star', X, Y, 120, 420, 380, '#fff4c2', 1); stamp('shock', X, Y, 60, 420, 620, '#ffe08a', 0.8); stamp('halo', X, Y, 160, 380, 900, '#ffe08a', 0.6)
    book('mist', X, Y + CH * 0.2, 230, 1000, { tint: '#ffdf8a', add: true, grow: 0.5, fade: 0.4, a: 0.6, rise: 30, step: 2 })
    burst(X, Y, 22, { v: [1, 4], life: [500, 900], size: [2.5, 5], colors: ['#fff4c2', '#ffe08a'], jx: 40, jy: 56 })
    for (const c of cur.row) at(140, () => { tint(c, '#ffe08a', 0.35, 900); knock(c, -2) }) })
}

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
function domeFx(c: VCard, light: boolean, dc: string) { const T = light ? 700 : 1150; tint(c, dc, 0.3, T); pop(c.x, c.y, 90, dc, 300, 0.7); fx(T, (p) => { const g = eob(cl(p / 0.18)), a = p > 0.75 ? (1 - p) / 0.25 : 1, y = c.y + c.bY; glow(c.x, y, 78 * g, '#2f7fd0', 0.28 * a)
    ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = dc; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(c.x, y, Math.max(0, 56 * g), Math.max(0, 72 * g), 0, 0, TAU); ctx.stroke()
    const s = p * 9; ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(c.x, y, Math.max(0, 56 * g), Math.max(0, 72 * g), 0, s, s + 0.7); ctx.stroke() }) }
const IMP: Record<FxImpactId, (c: VCard, light: boolean, col: string) => void> = {
  fireBurst(c, light) { if (booksReady('explosion', 'scorch', 'shock', 'flame')) { fireBurstB(c, light); return }
    burst(c.x, c.y, 26, { v: [2, 7.5], life: [250, 600], size: [5, 12], colors: FIRE, dr: 0.92 }); burst(c.x, c.y, 6, { v: [0.5, 2], life: [500, 900], size: [12, 20], colors: ['#1c1410'], k: 2, up: -0.6 })
    ring(c.x, c.y, 12, 86, 360, '#ff9a3a', 8); pop(c.x, c.y, 95, '#ffb060', 260); tint(c, '#ff8a2a', 0.7, 520)
    if (!light) fx(650, () => { if (live && Math.random() < 0.5) { const [x, y] = perim(c, -6); pt(x, y, rnd(-0.3, 0.3), -rnd(0.8, 2), rnd(300, 600), rnd(2, 4), '#ffb347') } }) },
  iceShatter(c) { if (booksReady('mist', 'star', 'shock')) { iceShatterB(c); return }
    burst(c.x, c.y, 16, { v: [3, 8.5], life: [300, 620], size: [6, 11], colors: ['#e8f8ff', '#9fdcff'], k: 1, dr: 0.9 }); burst(c.x, c.y, 12, { v: [1, 4], life: [300, 500], size: [2, 4], colors: ['#ffffff'] })
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
  dome(c, light) { domeFx(c, light, '#6ec3ff') },
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
  holyDescent() { if (booksReady('mist', 'star', 'shock', 'halo', 'ray')) { holyDescentB(); return }
    S.hidden = true
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
// ČEMPIONŲ GEBĖJIMAI: užtaisymo spektaklis ant čempiono (S) + savas smūgis taikiniui.
// cur.foe / cur.me – priešo ir savo avataro taškai (virtualiose koordinatėse).
// STILIUS (kaip iškvietimų): šviesa, dalelės, dūmai, žemės švytėjimas. Jokių pieštų
// ikonų ar kontūrų – formos susidaro iš švytėjimo masių ir dalelių. Linijos tik
// organiškos (žaibas, žemės plyšys).
// ═══════════════════════════════════════════════════════════════════════════
export type StrikeKind = 'damage' | 'heal' | 'status' | 'buff' | 'debuff'
type StrikeDef = { base: number; hitFrac: number; go: (f: Pt, t: Pt, T: number, col: string) => void; imp: (c: VCard, light: boolean, col: string) => void }

/** Minkštas šviesos spindulys (ištemptas sprite) – be kietų kraštų. */
function softBeam(x1: number, y1: number, x2: number, y2: number, w: number, c: string, a: number) {
  if (a <= 0 || w <= 0) return
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy); if (l < 1) return
  ctx.save(); ctx.translate((x1 + x2) / 2, (y1 + y2) / 2); ctx.rotate(Math.atan2(dy, dx)); ctx.globalAlpha = a > 1 ? 1 : a
  ctx.drawImage(spr(c), -l / 2 - w * 0.4, -w, l + w * 0.8, w * 2); ctx.restore()
}
const pillar = (x: number, y: number, h: number, w: number, c: string, a: number) => softBeam(x, y - h, x, y + w * 0.3, w, c, a)
/** Žemės švytėjimo bala (po kortomis). */
const pool = (x: number, y: number, r: number, dur: number, c: string, a = 0.6, darkA = 0.5) => fx(dur, (p) => { const e = Math.min(1, p / 0.15, (1 - p) / 0.35), g = eo(cl(p / 0.2)); if (darkA > 0) dark(x, y, r * g, darkA * e); ctx.globalCompositeOperation = 'lighter'; glow(x, y, r * g, c, a * e * (0.85 + 0.15 * Math.sin(time / 80))) }, 0)
/** Dalelių sūkurys aplink tašką (traukia į vidų ir sukasi). */
const swirl = (x: number, y: number, r0: number, r1: number, dur: number, cols: string[], per = 2, spin = 4.5, size: [number, number] = [3, 6]) => fx(dur, (p) => { if (!live) return; for (let i = 0; i < per; i++) { const an = rnd(0, TAU), r = lerp(r0, r1, p) * rnd(0.75, 1), c = Math.cos(an), s = Math.sin(an); pt(x + c * r, y + s * r, -s * spin - c * r / 26, c * spin - s * r / 26, rnd(260, 420), rnd(size[0], size[1]), pick(cols), 0, 0, 0.98) } })
/** Kylančios kibirkštys / sielos nuo kortos. */
const rise = (c: VCard, dur: number, cols: string[], rate = 0.5, size: [number, number] = [2.5, 5], speed: [number, number] = [0.8, 2.2]) => fx(dur, () => { if (live && Math.random() < rate) { const [x, y] = perim(c, -6); pt(x, y, rnd(-0.3, 0.3), -rnd(speed[0], speed[1]), rnd(400, 800), rnd(size[0], size[1]), pick(cols)) } })
const smoke = (x: number, y: number, n: number, col: string, v: [number, number] = [0.8, 3], size: [number, number] = [14, 24], life: [number, number] = [600, 1100]) => burst(x, y, n, { v, life, size, colors: [col], k: 2, dr: 0.94 })
const champRise = (sc: number, up: number, T: number) => { tw(S, { s: sc, oy: -up }, T * 0.45); at(T, () => tw(S, { s: 1, oy: 0 }, 300, eob)) }
const foeDir = () => (cur.foe.y < Y ? -1 : 1)
/** Kometa: ryški šerdis + ilga dalelių uodega (bendra skrydžio forma). */
function comet(f: Pt, t: Pt, T: number, o: { arc?: number; wob?: number; core: string; cols: string[]; smokeCol?: string; r?: number; ease?: (p: number) => number; per?: number }) {
  const dx = t.x - f.x, dy = t.y - f.y, l = Math.hypot(dx, dy) || 1, r = o.r ?? 20
  fx(T, (p) => { const e = o.ease ? o.ease(p) : p * (0.45 + 0.55 * p); let [x, y] = bez(f, t, o.arc ?? -40, e); if (o.wob) { const w = Math.sin(e * TAU * 1.5) * o.wob * (1 - e); x += -dy / l * w; y += dx / l * w }
    if (live) { for (let i = 0; i < (o.per ?? 2); i++) pt(x + rnd(-3, 3), y + rnd(-3, 3), rnd(-0.6, 0.6), rnd(-0.6, 0.6), rnd(220, 480), rnd(r * 0.22, r * 0.5), pick(o.cols)); if (o.smokeCol && Math.random() < 0.6) pt(x, y, rnd(-0.3, 0.3), rnd(-0.4, 0.2), rnd(400, 700), rnd(r * 0.5, r * 0.8), o.smokeCol, 2) }
    glow(x, y, r * 1.5, o.cols[0], 0.85); glow(x, y, r * 0.75, o.core, 1); glow(x, y, r * 0.3, '#ffffff', 1) })
}

const STRIKE: Record<string, StrikeDef> = {
  // Prazaras: sielos kometa – žalsvas švytėjimas su juodų dūmų uodega
  soul: { base: 540, hitFrac: 1,
    go(f, t, T) { comet(f, t, T, { arc: -70, wob: 16, core: '#aef5dd', cols: ['#5ef0c0', '#1a6b52', '#aef5dd'], smokeCol: '#07120c', r: 22, per: 3 }) },
    imp(c, light) { implode(c, '#5ef0c0', () => { flash('#5ef0c0', 0.08, 160); pop(c.x, c.y, 120, '#5ef0c0', 320); ring(c.x, c.y, 10, 100, 420, '#5ef0c0', 8); smoke(c.x, c.y, 10, '#07120c'); burst(c.x, c.y, 22, { v: [2, 7], life: [300, 650], size: [3, 7], colors: ['#5ef0c0', '#aef5dd', '#1a6b52'], dr: 0.93 })
      fx(520, (p) => pillar(c.x, c.y + 30, 170 * eo(p), 26 * (1 - p * 0.6), '#5ef0c0', (1 - p) * 0.8)); tint(c, '#0c2a1c', 0.8, 700); cshake(c, 6); if (!light) { rise(c, 900, ['#5ef0c0', '#aef5dd'], 0.6); shake(5) } }) } },
  // Galdrianas: šviesos ietis iš dangaus
  lightLance: { base: 460, hitFrac: 0.6,
    go(_f, t, T) { fx(T, (p) => { const g = cl(p / 0.6), a = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1, y1 = lerp(TOP, t.y, ei(g)), hit = p > 0.6
      softBeam(t.x, TOP, t.x, y1, hit ? 46 * a + 8 : 10, '#ffe08a', 0.85 * a); softBeam(t.x, TOP, t.x, y1, hit ? 16 * a + 3 : 4, '#ffffff', a); glow(t.x, y1, hit ? 70 * a : 26, '#fff4c2', a)
      if (live) for (let i = 0; i < 2; i++) pt(t.x + rnd(-12, 12), lerp(TOP, y1, Math.random()), rnd(-0.8, 0.8), rnd(0.5, 2.5), rnd(260, 460), rnd(2, 4.5), pick(['#fff4c2', '#ffe08a'])) }) },
    imp(c, light) { flash('#fff4c2', light ? 0.06 : 0.14, 180); pop(c.x, c.y, 150, '#ffe08a', 340); ring(c.x, c.y, 14, 130, 440, '#ffe08a', 10); ring(c.x, c.y, 8, 80, 600, '#fff4c2', 4)
      burst(c.x, c.y, 24, { v: [3, 10], life: [280, 620], size: [3, 7], colors: ['#fff4c2', '#ffe08a', '#ffffff'], dr: 0.92 }); burst(c.x, c.y, 10, { v: [3, 8], life: [400, 800], size: [5, 9], colors: ['#fff8e0', '#ffe08a'], k: 1, g: 0.08, dr: 0.94 })
      fx(700, (p) => glow(c.x, c.y, 110, '#ffe08a', (1 - p) * 0.4), 0); tint(c, '#fff1b8', 0.85, 520); cshake(c, 6); if (!light) { shake(7); hitstop(50); rise(c, 700, ['#fff4c2', '#ffe08a'], 0.6) } } },
  // Galdrianas: šviesos malonė (gydymas) – auksinių žiežirbų srovė
  grace: { base: 560, hitFrac: 0.8,
    go(f, t, T) { motes(f, t, '#ffe08a', T); motes({ x: f.x + 12, y: f.y - 10 }, t, '#fff4c2', T) },
    imp(c) { fx(620, (p) => pillar(c.x, c.y + 40, 190 * eo(p), 34 * (1 - p * 0.5), '#ffe08a', (1 - p) * 0.75)); ring(c.x, c.y, 14, 90, 560, '#ffe08a', 7, 0.8); pop(c.x, c.y, 100, '#fff1b8', 460, 0.7); tint(c, '#fff1b8', 0.55, 800); tw(c, { s: 1.09 }, 110); at(110, () => tw(c, { s: 1 }, 280, eob))
      rise(c, 800, ['#fff4c2', '#ffe08a', '#ffffff'], 0.7, [2.5, 5.5], [1, 2.6]); burst(c.x, c.y, 10, { v: [0.6, 2.4], life: [600, 1000], size: [5, 8], colors: ['#fff8e0', '#ffe08a'], k: 1, up: -1.4, jx: 34, jy: 44, dr: 0.97 }) } },
  // Skydas: šviesa nusileidžia iš viršaus ir apgaubia kortą
  aegis: { base: 480, hitFrac: 0.7,
    go(_f, t, T, col) { fx(T, (p) => { const g = cl(p / 0.7), a = Math.min(1, p * 4) * (p > 0.8 ? (1 - p) / 0.2 : 1), y = lerp(t.y - 240, t.y, eo(g)); pillar(t.x, y, 160, 22, col, 0.7 * a); glow(t.x, y, 34, col, a); glow(t.x, y, 13, '#ffffff', a)
      if (live) for (let i = 0; i < 2; i++) pt(t.x + rnd(-10, 10), y - rnd(0, 60), rnd(-0.5, 0.5), rnd(0.2, 1.2), rnd(260, 480), rnd(2, 4.5), pick([col, '#ffffff'])) }) },
    imp(c, light, col) { domeFx(c, light, col); pop(c.x, c.y, 130, col, 320, 0.8); ring(c.x, c.y, 20, 100, 420, col, 6); fx(light ? 600 : 1000, () => { if (live && Math.random() < 0.6) { const an = rnd(0, TAU); pt(c.x + Math.cos(an) * 56, c.y + Math.sin(an) * 70, -Math.sin(an) * 1.6, Math.cos(an) * 1.6, rnd(300, 600), rnd(2, 4), pick([col, '#ffffff'])) } })
      burst(c.x, c.y, 14, { v: [1.5, 5], life: [300, 650], size: [2.5, 5], colors: [col, '#ffffff'] }); knock(c, 3) } },
  // Zertahul'as: pragaro ugnies kamuolys su juoda šerdimi
  hellbolt: { base: 420, hitFrac: 1,
    go(f, t, T) { fx(T, (p) => { const e = p * (0.4 + 0.6 * p), [x0, y0] = bez(f, t, 40, e), x = x0 + rnd(-3, 3), y = y0 + rnd(-3, 3)
      if (live) { for (let i = 0; i < 3; i++) pt(x, y, rnd(-0.9, 0.9), rnd(-0.9, 0.9), rnd(240, 500), rnd(6, 13), pick(['#ff2a1a', '#ff7a1a', '#7a0010'])); pt(x, y, rnd(-0.3, 0.3), rnd(-0.3, 0.3), 520, rnd(11, 17), '#150406', 2) }
      glow(x, y, 40, '#ff2a1a', 0.9); dark(x, y, 15, 0.95); glow(x, y, 7, '#ffb347', 1) }) },
    imp(c, light) { flash('#ff2a1a', light ? 0.05 : 0.12, 180); pop(c.x, c.y, 140, '#ff5a1a', 300); ring(c.x, c.y, 10, 110, 400, '#ff2a1a', 10); burst(c.x, c.y, 30, { v: [2, 9], life: [260, 640], size: [6, 13], colors: ['#ff2a1a', '#ff7a1a', '#ffb347', '#7a0010'], dr: 0.92 }); smoke(c.x, c.y, 10, '#150406')
      fx(1400, (p) => { dark(c.x, c.y, 96, 0.45 * (1 - p)); ctx.globalCompositeOperation = 'lighter'; glow(c.x, c.y, 70, '#7a0010', 0.5 * (1 - p)) }, 0); tint(c, '#ff3a1a', 0.75, 560); cshake(c, 7); if (!light) { shake(8); hitstop(50); rise(c, 900, ['#ff4a1a', '#ffb347'], 0.6) } } },
  // Lisarijus: tuštumos ietis – minkštas violetinis spindulys su juoda šerdimi
  voidLance: { base: 340, hitFrac: 0.3,
    go(f, t, T) { fx(T, (p) => { const g = cl(p / 0.3), a = p > 0.3 ? 1 - (p - 0.3) / 0.7 : 1, x = lerp(f.x, t.x, g), y = lerp(f.y, t.y, g)
      softBeam(f.x, f.y, x, y, 34 * a + 4, '#7c3aed', 0.8 * a); softBeam(f.x, f.y, x, y, 16 * a + 2, '#c4a5ff', a); ctx.globalCompositeOperation = 'source-over'; softBeam(f.x, f.y, x, y, 7 * a + 1, '#000000', a); ctx.globalCompositeOperation = 'lighter'; glow(x, y, 40 * a, '#a855f7', a)
      if (live) for (let i = 0; i < 2; i++) { const q = Math.random() * g; pt(lerp(f.x, t.x, q), lerp(f.y, t.y, q), rnd(-1.4, 1.4), rnd(-1.4, 1.4), rnd(260, 420), rnd(2, 5), pick(['#c4a5ff', '#ffffff', '#7c3aed'])) } }) },
    imp(c, light) { implode(c, '#c4a5ff', () => { flash('#7c3aed', 0.1, 160); ring(c.x, c.y, 8, 120, 420, '#a855f7', 10); pop(c.x, c.y, 130, '#7c3aed', 300); smoke(c.x, c.y, 8, '#0a0414'); burst(c.x, c.y, 22, { v: [3, 9], life: [220, 520], size: [2.5, 6], colors: ['#c4a5ff', '#ffffff', '#a855f7'], dr: 0.92 }); tint(c, '#1a0a2a', 0.85, 700) })
      IMP.shock(c, light, '#a855f7'); if (!light) { shake(7); hitstop(50) } } },
  // Lisarijus: arkaninė apsauga
  arcWard: { base: 520, hitFrac: 0.8,
    go(f, t, T) { motes(f, t, '#a78bfa', T); motes({ x: f.x + 10, y: f.y - 8 }, t, '#7cc4ff', T) },
    imp(c, light) { domeFx(c, light, '#a78bfa'); pop(c.x, c.y, 120, '#7cc4ff', 340, 0.8); ring(c.x, c.y, 16, 96, 440, '#a78bfa', 6); tw(c, { s: 1.07 }, 110); at(110, () => tw(c, { s: 1 }, 280, eob))
      fx(light ? 700 : 1100, (p) => { const a = p > 0.7 ? (1 - p) / 0.3 : 1; for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + time / 420, r = 58; glow(c.x + Math.cos(an) * r, c.y + c.bY + Math.sin(an) * r * 1.2, 7, i % 2 ? '#7cc4ff' : '#c4b5fd', a) } }); rise(c, 700, ['#c4b5fd', '#7cc4ff'], 0.5) } },
  // Lisarijus: ledo ietis iš viršaus
  iceSpear: { base: 380, hitFrac: 1,
    go(_f, t, T) { const f0 = { x: t.x - 150, y: Math.max(TOP, t.y - 420) }, an = Math.atan2(t.y - f0.y, t.x - f0.x), c = Math.cos(an), s = Math.sin(an); fx(T, (p) => { const e = ei(p) * 0.6 + p * 0.4, x = lerp(f0.x, t.x, e), y = lerp(f0.y, t.y, e)
      if (live) for (let i = 0; i < 2; i++) pt(x - c * 14, y - s * 14, rnd(-0.5, 0.5), rnd(-0.2, 0.7), rnd(240, 460), rnd(2, 4.5), pick(['#ffffff', '#cfeeff']))
      softBeam(x - c * 70, y - s * 70, x, y, 12, '#9fdcff', 0.6); glow(x, y, 30, '#9fdcff', 0.8); ctx.globalAlpha = 1; ctx.fillStyle = '#eaf8ff'; ctx.beginPath(); ctx.moveTo(x + c * 26, y + s * 26); ctx.lineTo(x - s * 6, y + c * 6); ctx.lineTo(x - c * 30, y - s * 30); ctx.lineTo(x + s * 6, y - c * 6); ctx.fill() }) },
    imp(c, light) { IMP.iceShatter(c, light, '#9fdcff'); IMP.freeze(c, true, '#9fdcff'); pop(c.x, c.y, 120, '#cfeeff', 280); fx(1200, (p) => glow(c.x, c.y, 100, '#9fdcff', 0.35 * (1 - p)), 0); cshake(c, 6); if (!light) shake(4) } },
  // Juodasmakris: patrankos sviedinys
  cannon: { base: 360, hitFrac: 1,
    go(f, t, T) { pop(f.x, f.y, 60, '#ffd27a', 150); smoke(f.x, f.y, 5, '#4a4a52', [1, 3], [14, 22], [500, 900]); fx(T, (p) => { const [x, y] = bez(f, t, -50, p)
      if (live) { pt(x, y, rnd(-0.3, 0.3), rnd(-0.5, 0.1), rnd(320, 560), rnd(8, 14), '#4a4a52', 2); pt(x, y, rnd(-0.6, 0.6), rnd(-0.6, 0.6), rnd(120, 260), rnd(2, 4), '#ffb347') }
      glow(x, y, 20, '#ff7a1a', 0.7); dark(x, y, 10, 1); glow(x - 3, y - 3, 4, '#ffffff', 0.6) }) },
    imp(c) { flash('#ffd27a', 0.07, 120); burst(c.x, c.y, 22, { v: [3, 10], life: [200, 500], size: [5, 12], colors: FIRE, dr: 0.92 }); smoke(c.x, c.y, 9, '#4a4a52', [1, 4.5], [16, 28], [650, 1150]); burst(c.x, c.y, 7, { v: [3, 9], life: [400, 800], size: [4, 7], colors: ['#2a2420', '#6b5a48'], k: 3, g: 0.3, dr: 0.97 })
      ring(c.x, c.y, 10, 100, 340, '#ffb347', 9); pop(c.x, c.y, 110, '#ffd27a', 220); tint(c, '#ffb060', 0.7, 380); shake(6); cshake(c, 7); knock(c, -5) } },
  // Juodasmakris: „Pirmyn!" – auksas ir vėjas
  rally: { base: 480, hitFrac: 0.8,
    go(f, t, T) { motes(f, t, '#ffd24a', T); motes({ x: f.x - 8, y: f.y + 6 }, t, '#5fd0c0', T) },
    imp(c) { IMP.surge(c, false, '#ffd24a'); fx(560, (p) => pillar(c.x, c.y + 50, 150 * eo(p), 30 * (1 - p * 0.5), '#ffd24a', (1 - p) * 0.6)); fx(520, () => { if (live) for (let i = 0; i < 2; i++) pt(c.x - 60, c.y + rnd(-55, 55), rnd(9, 15), 0, rnd(140, 240), rnd(2, 3.5), pick(['#d8f5ec', '#5fd0c0', '#ffffff']), 0, 0, 1) }) } },
  // Golemas: žemės plyšys nubėga iki taikinio ir išmuša uolos smaigalius
  rockSpike: { base: 460, hitFrac: 0.75,
    go(f, t, T) { const n = 9, P0: number[] = []; for (let i = 0; i <= n; i++) { const u = i / n; P0.push(lerp(f.x, t.x, u) + (i && i < n ? rnd(-12, 12) : 0), lerp(f.y, t.y, u) + (i && i < n ? rnd(-12, 12) : 0)) }
      fx(T + 900, (p) => { const tt = p * (T + 900), g = cl(tt / (T * 0.75)), a = tt > T + 400 ? 1 - (tt - T - 400) / 500 : 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        for (const pass of [0, 1]) { ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over'; ctx.strokeStyle = pass ? '#7cc4ff' : '#050308'; ctx.lineWidth = pass ? 2 : 5.5; ctx.globalAlpha = a * (pass ? Math.max(0, 1 - tt / (T + 300)) : 0.9); ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); const k = Math.max(1, Math.ceil(n * g)); for (let i = 1; i <= k; i++) ctx.lineTo(P0[i * 2], P0[i * 2 + 1]); ctx.stroke() }
        const k = Math.min(n, Math.ceil(n * g)); if (g < 1) { ctx.globalCompositeOperation = 'lighter'; glow(P0[k * 2], P0[k * 2 + 1], 26, '#7cc4ff', 0.7) }
        if (live && g < 1) { pt(P0[k * 2], P0[k * 2 + 1], rnd(-1.5, 1.5), -rnd(1, 3.5), 420, rnd(3, 7), pick(['#4a4038', '#6b5a48']), 3, 0.25, 0.97); pt(P0[k * 2], P0[k * 2 + 1], rnd(-1, 1), rnd(-1, 0), 500, rnd(10, 16), '#8a7b6a', 2) } }, 0) },
    imp(c, light) { const sp = [...Array(8)].map((_, i) => ({ a: i / 8 * TAU + rnd(-0.2, 0.2), l: rnd(28, 50), r: rnd(30, 52), w: rnd(7, 11) }))
      fx(light ? 800 : 1200, (p) => { const g = eob(cl(p / 0.1)), a = p > 0.7 ? (1 - p) / 0.3 : 1; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; for (const q of sp) { const cs = Math.cos(q.a), sn = Math.sin(q.a), bx = c.x + cs * q.r, by = c.y + sn * q.r, tx = bx + cs * q.l * g, ty = by + sn * q.l * g
        ctx.fillStyle = '#2a2730'; ctx.beginPath(); ctx.moveTo(bx - sn * q.w, by + cs * q.w); ctx.lineTo(tx, ty); ctx.lineTo(bx + sn * q.w, by - cs * q.w); ctx.fill(); ctx.fillStyle = '#5a5664'; ctx.beginPath(); ctx.moveTo(bx - sn * q.w, by + cs * q.w); ctx.lineTo(tx, ty); ctx.lineTo(bx, by); ctx.fill() } })
      flash('#ffffff', light ? 0.04 : 0.1, 140); pop(c.x, c.y, 110, '#7cc4ff', 260, 0.6); ring(c.x, c.y, 16, 120, 420, '#d8d0c0', 9)
      for (let i = 0; i < 18; i++) { const [x, y, nx, ny] = perim(c, 0), s = rnd(1.5, 5); pt(x, y, nx * s, ny * s, rnd(450, 900), rnd(14, 24), '#8a7b6a', 2, 0, 0.93) }
      burst(c.x, c.y, 14, { v: [3, 9], life: [400, 850], size: [4, 9], colors: ['#4a4038', '#2a2420', '#6b5a48'], k: 3, g: 0.3, dr: 0.97 }); tint(c, '#ffffff', 0.6, 220); knock(c, -9); cshake(c, 8); shake(9); if (!light) hitstop(60) } },
  // Golemas: riedulys iš viršaus
  boulder: { base: 440, hitFrac: 1,
    go(_f, t, T) { fx(T, (p) => { dark(t.x, t.y, lerp(130, 62, p), lerp(0.1, 0.7, p)) }, 0); const V = [...Array(9)].map((_, i) => ({ a: i / 9 * TAU, r: rnd(0.82, 1.05) }))
      fx(T, (p) => { const z = lerp(4.4, 1.1, ei(p)), r = 30 * z, y = t.y - (1 - ei(p)) * 70, rot = p * 1.6; ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, p * 3)
        const path = (k: number, ox: number, oy: number) => { ctx.beginPath(); V.forEach((v, i) => { const px = t.x + ox + Math.cos(v.a + rot) * r * v.r * k, py = y + oy + Math.sin(v.a + rot) * r * v.r * k; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py) }); ctx.closePath(); ctx.fill() }
        ctx.fillStyle = '#1c1a20'; path(1, 0, 0); ctx.fillStyle = '#3a3742'; path(0.78, -r * 0.1, -r * 0.12); ctx.fillStyle = '#56525e'; path(0.42, -r * 0.24, -r * 0.26)
        ctx.globalCompositeOperation = 'lighter'; if (live && p > 0.3) pt(t.x + rnd(-r, r) * 0.6, y - r, rnd(-0.5, 0.5), -rnd(1, 3), 380, rnd(10, 18) , '#8a7b6a', 2) }) },
    imp(c) { hitstop(100); shake(16); flash('#ffffff', 0.2, 170); ring(c.x, c.y, 20, 190, 480, '#d8d0c0', 13); ring(c.x, c.y, 12, 110, 640, '#8a7b6a', 5); for (let i = 0; i < 30; i++) { const [x, y, nx, ny] = perim(c, 0), s = rnd(2, 7); pt(x, y, nx * s + rnd(-0.5, 0.5), ny * s + rnd(-0.5, 0.5), rnd(450, 950), rnd(15, 28), '#8a7b6a', 2, 0, 0.93) }
      burst(c.x, c.y, 24, { v: [3, 11], life: [450, 1000], size: [5, 12], colors: ['#3a3640', '#2a2420', '#6b5a48'], k: 3, g: 0.3, dr: 0.97 }); fx(1800, (p) => dark(c.x, c.y, 110, 0.5 * (1 - p)), 0); tint(c, '#ffffff', 0.8, 240); cshake(c, 10) } },
  // Golemas: akmens šerdies gydymas
  stoneMend: { base: 500, hitFrac: 0.8, go(f, t, T) { motes(f, t, '#7cc4ff', T) }, imp(c) { fx(600, (p) => pillar(c.x, c.y + 40, 170 * eo(p), 30 * (1 - p * 0.5), '#7cc4ff', (1 - p) * 0.7)); ring(c.x, c.y, 14, 90, 520, '#7cc4ff', 7, 0.8); pop(c.x, c.y, 110, '#7cc4ff', 420, 0.7); tint(c, '#7cc4ff', 0.5, 750); tw(c, { s: 1.08 }, 110); at(110, () => tw(c, { s: 1 }, 280, eob)); rise(c, 800, ['#7cc4ff', '#cfe6ff'], 0.6) } },
  // Skrag'as: liepsnosvaidžio srautas
  flame: { base: 640, hitFrac: 0.45,
    go(f, t, T) { const an = Math.atan2(t.y - f.y, t.x - f.x), d = Math.hypot(t.x - f.x, t.y - f.y); fx(T, (p) => { if (p > 0.85) return; softBeam(f.x, f.y, f.x + Math.cos(an) * d * Math.min(1, p * 3), f.y + Math.sin(an) * d * Math.min(1, p * 3), 30, '#ff7a1a', 0.35); glow(f.x, f.y, 34, '#ffb347', 0.9)
      if (!live) return; for (let i = 0; i < 5; i++) { const a = an + rnd(-0.13, 0.13), life = rnd(260, 380), v = d / (life / 16.67) * rnd(0.95, 1.15); pt(f.x, f.y, Math.cos(a) * v, Math.sin(a) * v, life, rnd(8, 18), pick(FIRE), 0, 0, 1) } if (Math.random() < 0.35) pt(f.x, f.y, Math.cos(an) * 3, Math.sin(an) * 3 - 0.6, 750, rnd(13, 20), '#2a1c14', 2) }) },
    imp(c, light) { IMP.fireBurst(c, light, '#ff7a1a'); pop(c.x, c.y, 130, '#ffb347', 300); fx(700, () => { if (live) for (let i = 0; i < 2; i++) { const [x, y] = perim(c, -4); pt(x, y, rnd(-0.4, 0.4), -rnd(1, 2.8), rnd(300, 560), rnd(5, 11), pick(FIRE)) } }); fx(1500, (p) => { dark(c.x, c.y, 90, 0.4 * (1 - p)) }, 0); cshake(c, 6); if (!light) shake(4) } },
  // Skrag'as: dagtis (buff'as goblinams)
  fuse: { base: 440, hitFrac: 1,
    go(f, t, T) { fx(T, (p) => { const [x, y0] = bez(f, t, -30, p), y = y0 - Math.abs(Math.sin(p * Math.PI * 3)) * 14; if (live) for (let i = 0; i < 3; i++) pt(x, y, rnd(-1.8, 1.8), rnd(-2.4, 0.6), rnd(140, 320), rnd(1.5, 3.4), pick(['#ffe89a', '#ffb347', '#ffffff']), 0, 0.12); glow(x, y, 16, '#ffb347', 1); glow(x, y, 6, '#ffffff', 1) }) },
    imp(c) { for (let i = 0; i < 16; i++) pt(c.x + rnd(-40, 40), c.y + 56, 0, -rnd(4, 8.5), rnd(260, 420), rnd(3, 5.5), pick(['#ff9a3a', '#ffe89a']), 0, 0, 0.97); fx(520, (p) => pillar(c.x, c.y + 50, 150 * eo(p), 30 * (1 - p * 0.5), '#ff9a3a', (1 - p) * 0.6)); pop(c.x, c.y, 110, '#ff9a3a', 320, 0.8); ring(c.x, c.y, 20, 80, 340, '#ff9a3a', 5); tint(c, '#ff9a3a', 0.55, 620); tw(c, { s: 1.15 }, 120); at(120, () => tw(c, { s: 1 }, 300, eob)); burst(c.x, c.y, 14, { v: [2, 7], life: [150, 340], size: [1.5, 3.2], colors: ['#ffe89a', '#ffffff'], g: 0.15 }) } },
  // Skrag'as: bomba iš viršaus
  bomb: { base: 460, hitFrac: 1,
    go(_f, t, T) { const f0 = { x: t.x + rnd(-60, 60), y: Math.max(TOP, t.y - 440) }; fx(T, (p) => { const e = ei(p) * 0.5 + p * 0.5, x = lerp(f0.x, t.x, e), y = lerp(f0.y, t.y, e); glow(x, y, 18, '#ff7a1a', 0.5); dark(x, y, 12, 1); glow(x - 3, y - 4, 4, '#ffffff', 0.5)
      const an = p * 9, sx = x + Math.cos(an) * 13, sy = y + Math.sin(an) * 13; glow(sx, sy, 9, '#ffd24a', 1); if (live) { pt(sx, sy, rnd(-1.5, 1.5), rnd(-1.5, 1.5), rnd(120, 260), rnd(1.5, 3), '#ffe89a'); if (Math.random() < 0.5) pt(x, y, 0, -0.5, 420, rnd(8, 12), '#3a3a42', 2) } }); fx(T, (p) => { dark(t.x, t.y, lerp(70, 36, p), lerp(0.05, 0.55, p)) }, 0) },
    imp(c) { hitstop(45); shake(10); flash('#ffd27a', 0.1, 140); burst(c.x, c.y, 26, { v: [3, 11], life: [220, 560], size: [6, 14], colors: FIRE, dr: 0.92 }); smoke(c.x, c.y, 14, '#4a4a52', [1, 5.5], [18, 34], [800, 1500]); burst(c.x, c.y, 9, { v: [3, 9], life: [450, 850], size: [4, 8], colors: ['#2a2420', '#6b5a48'], k: 3, g: 0.3, dr: 0.97 })
      ring(c.x, c.y, 14, 140, 400, '#ffb347', 11); pop(c.x, c.y, 150, '#ffd27a', 280); fx(1600, (p) => dark(c.x, c.y, 100, 0.45 * (1 - p)), 0); tint(c, '#14100c', 0.65, 900); cshake(c, 9) } },
}

type SkillDef = { cast: () => void; strikes?: Partial<Record<StrikeKind, string>>; col?: string; summon?: SummonFxId }
const NECRO = ['#5ef0c0', '#1a6b52', '#aef5dd'], HOLY = ['#fff4c2', '#ffe08a', '#ffffff'], HELL = ['#ff2a1a', '#ff7a1a', '#ffb347', '#7a0010'], VOID = ['#c4a5ff', '#a855f7', '#ffffff']
const SKILL: Record<SkillFxId, SkillDef> = {
  // ── PRAZARAS (Mirties maršas) ──
  prazar1: { col: '#5ef0c0', strikes: { damage: 'soul', status: 'soul', debuff: 'soul' }, cast() { dim(0.4, 1400); champRise(1.1, 6, 700); tint(S, '#0c2a1c', 0.55, 950)
    pool(X, Y, 150, 1500, '#1a6b52', 0.7); swirl(X, Y, 130, 34, 760, NECRO, 3, 5); rise(S, 900, NECRO, 0.9, [3, 6], [1.2, 3])
    fx(760, (p) => { const y = Y - CH * 0.62; glow(X, y, 20 + p * 46, '#5ef0c0', 0.5 + p * 0.4); glow(X, y, 8 + p * 16, '#eafff6', p); if (live && Math.random() < 0.5) pt(X + rnd(-30, 30), Y + rnd(-10, 50), rnd(-0.3, 0.3), -rnd(0.4, 1.2), 700, rnd(12, 20), '#07120c', 2) })
    at(700, () => { flash('#5ef0c0', 0.1, 180); ring(X, Y, 30, 190, 440, '#5ef0c0', 8); pop(X, Y - CH * 0.62, 130, '#5ef0c0', 280); shake(6) }) } },
  prazar2: { col: '#5ef0c0', summon: 'graveBurst', cast() { dim(0.4, 1500); champRise(1.08, 4, 800); tint(S, '#0c2a1c', 0.45, 950); pool(X, Y, 170, 1800, '#1a6b52', 0.7)
    const cr = [...Array(9)].map((_, i) => { const a = i / 9 * TAU + rnd(-0.2, 0.2), L = rnd(70, 140); let x = X + Math.cos(a) * 46, y = Y + Math.sin(a) * 60; const p = [x, y]; for (let k = 1; k <= 4; k++) { x += Math.cos(a + rnd(-0.5, 0.5)) * L / 4; y += Math.sin(a + rnd(-0.5, 0.5)) * L / 4; p.push(x, y) } return p })
    fx(1900, (p) => { const g = cl(p / 0.25), a = p > 0.6 ? (1 - p) / 0.4 : 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (const pass of [0, 1]) { ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over'; ctx.strokeStyle = pass ? '#5ef0c0' : '#030806'; ctx.lineWidth = pass ? 2.2 : 5.5; ctx.globalAlpha = a * (pass ? 0.85 : 0.9)
      for (const q of cr) { ctx.beginPath(); ctx.moveTo(q[0], q[1]); const n = Math.max(1, Math.ceil(4 * g)); for (let k = 1; k <= n; k++) ctx.lineTo(q[k * 2], q[k * 2 + 1]); ctx.stroke() } } }, 0)
    fx(950, (p) => { const a = Math.sin(p * Math.PI); pillar(X, Y + 50, Y - TOP + 50, 46, '#5ef0c0', a * 0.8); pillar(X, Y + 50, Y - TOP + 50, 16, '#eafff6', a * 0.9); if (live) pt(X + rnd(-70, 70), Y + rnd(-30, 60), Math.sin(time / 90) * 0.6, -rnd(1, 3), rnd(500, 900), rnd(4, 8), pick(NECRO), 0, -0.01, 0.99) })
    at(800, () => { flash('#5ef0c0', 0.1, 200); ring(X, Y, 30, 200, 460, '#5ef0c0', 9); shake(7) }) } },
  prazar3: { col: '#5ef0c0', summon: 'graveBurst', strikes: { status: 'aegis' }, cast() { dim(0.6, 2000); champRise(1.14, 8, 1000); tint(S, '#0c2a1c', 0.65, 1150); pool(X, Y, 260, 2100, '#1a6b52', 0.75, 0.6)
    swirl(X, Y, 220, 60, 1000, NECRO, 3, 6); rise(S, 1200, NECRO, 1, [3, 7], [1.5, 3.5])
    const PL: [number, number][] = [[-160, -40], [160, -40], [-95, 85], [95, 85]]
    PL.forEach(([dx, dy], i) => at(180 + i * 150, () => { const x = X + dx, y = Y + dy; shake(7); fx(620, (p) => { const a = Math.sin(p * Math.PI); pillar(x, y + 20, 300 * eo(p), 36, '#5ef0c0', a * 0.85); pillar(x, y + 20, 300 * eo(p), 12, '#eafff6', a); glow(x, y, 70, '#5ef0c0', a * 0.7) })
      fx(1400, (p) => { dark(x, y, 60, 0.5 * (1 - p)); ctx.globalCompositeOperation = 'lighter'; glow(x, y, 44, '#1a6b52', 0.6 * (1 - p)) }, 0)
      burst(x, y, 12, { v: [2, 8], life: [450, 900], size: [4, 9], colors: ['#3a2c20', '#52402e'], k: 3, g: 0.3, dr: 0.97, up: -2.5 }); burst(x, y, 14, { v: [1, 5], life: [400, 850], size: [3, 7], colors: NECRO, up: -2 }); smoke(x, y, 5, '#07120c') }))
    at(1000, () => { flash('#5ef0c0', 0.22, 260); ring(X, Y, 40, 320, 600, '#5ef0c0', 13); ring(X, Y, 30, 200, 760, '#aef5dd', 5); hitstop(80); shake(13) }) } },
  // ── GALDRIANAS (Inkvizicija) ──
  gald1: { col: '#ffe08a', strikes: { damage: 'lightLance', status: 'lightLance', heal: 'grace', buff: 'grace' }, cast() { champRise(1.1, 6, 700); tint(S, '#fff1b8', 0.45, 850); pool(X, Y, 130, 1200, '#ffe08a', 0.45, 0)
    fx(850, (p) => { if (!live) return; const sp = cl(p * 2.2), fo = p > 0.8 ? (1 - p) / 0.2 : 1; for (const d of [-1, 1]) for (let i = 0; i < 4; i++) { if (Math.random() > fo) continue; const u = Math.random() * sp, x = X + d * (30 + u * 160), y = Y + 10 - Math.sin(u * 2.2) * 110 + u * 30
      if (i % 2) pt(x, y, d * rnd(0.1, 0.8), rnd(0.3, 1.2), rnd(300, 560), rnd(5, 10) * (1.1 - u * 0.4), pick(['#fff8e0', '#ffe08a']), 1, 0.02, 0.97); else pt(x, y, d * rnd(0.1, 0.6), rnd(0.1, 0.8), rnd(260, 480), rnd(6, 13) * (1.1 - u * 0.5), pick(HOLY)) } })
    fx(900, (p) => { const a = Math.min(1, p * 4, (1 - p) * 3), y = Y - CH * 0.62; glow(X, y, 60, '#ffe08a', a * 0.6); for (let i = 0; i < 9; i++) { const an = i / 9 * TAU + time / 500; glow(X + Math.cos(an) * 32, y + Math.sin(an) * 10, 7, '#fff4c2', a) } })
    at(700, () => { ring(X, Y, 30, 170, 440, '#ffe08a', 7); pop(X, Y, 150, '#fff4c2', 300, 0.7) }) } },
  gald2: { col: '#ffe08a', strikes: { status: 'aegis', buff: 'aegis' }, cast() { champRise(1.08, 4, 650); tint(S, '#fff1b8', 0.4, 850); pool(X, Y, 150, 1300, '#ffe08a', 0.5, 0)
    fx(1000, (p) => { const g = eo(cl(p / 0.3)), a = p > 0.65 ? (1 - p) / 0.35 : 1; for (let i = 0; i < 10; i++) { const an = i / 10 * TAU + time / 2200, L = (120 + 30 * Math.sin(time / 260 + i * 1.7)) * g; softBeam(X, Y, X + Math.cos(an) * L, Y + Math.sin(an) * L, 14, i % 2 ? '#fff4c2' : '#ffe08a', 0.5 * a) } glow(X, Y, 90 * g, '#fff4c2', 0.5 * a) })
    rise(S, 800, HOLY, 0.8); at(250, () => ring(X, Y, 30, 150, 500, '#ffe08a', 6)); at(520, () => ring(X, Y, 30, 190, 560, '#fff4c2', 4, 0.7)) } },
  gald3: { col: '#ffe08a', strikes: { heal: 'grace', status: 'aegis', buff: 'grace' }, cast() { dim(0.35, 1900); champRise(1.15, 10, 1000); tint(S, '#fff1b8', 0.65, 1150); pool(X, Y, 300, 2000, '#ffe08a', 0.5, 0)
    fx(1150, (p) => { const a = Math.sin(p * Math.PI); pillar(X, Y + 60, Y - TOP + 60, 90, '#ffe08a', a * 0.75); pillar(X, Y + 60, Y - TOP + 60, 40, '#fff4c2', a * 0.9); pillar(X, Y + 60, Y - TOP + 60, 14, '#ffffff', a)
      for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + time / 2600, L = 260 * a; softBeam(X, Y, X + Math.cos(an) * L, Y + Math.sin(an) * L, 18, '#fff4c2', 0.3 * a) } })
    fx(1600, (p) => { if (live && p < 0.75) for (let i = 0; i < 3; i++) { const x = X + rnd(-380, 380), y = Y + rnd(-230, 40); if (i) pt(x, y, rnd(-0.3, 0.3), rnd(0.8, 2.2), rnd(600, 1100), rnd(2.5, 5), pick(HOLY)); else pt(x, y, rnd(-0.4, 0.4), rnd(1, 2.4), rnd(600, 1100), rnd(5, 9), pick(['#fff8e0', '#ffe08a']), 1, 0, 0.99) } })
    at(650, () => { flash('#fff4c2', 0.26, 320); ring(X, Y, 40, 540, 900, '#ffe08a', 15, 0.8); ring(X, Y, 30, 320, 700, '#fff4c2', 6); hitstop(60); shake(7) }) } },
  // ── ZERTAHUL'AS (Demonų orda) ──
  zert1: { col: '#ff2a1a', strikes: { damage: 'hellbolt' }, cast() { dim(0.4, 1500); champRise(1.1, 5, 800); tint(S, '#7a0010', 0.55, 950); pool(X, Y, 160, 1500, '#7a0010', 0.8)
    swirl(X, Y, 120, 40, 800, HELL, 3, 5, [3, 7]); rise(S, 900, ['#ff4a1a', '#ffb347'], 0.8, [3, 6], [1, 2.6])
    const foe = cur.foe; for (const d of [-1, 1]) { const f0 = { x: X + d * 30, y: Y - 20 }; fx(800, (p) => { const e = eo(cl((p - 0.15) / 0.85)), [x, y] = bez(f0, foe, d * 120, e), a = Math.min(1, p * 5)
      if (live) { pt(x, y, rnd(-0.4, 0.4), rnd(-0.4, 0.4), rnd(400, 700), rnd(12, 18), '#0a0410', 2); for (let i = 0; i < 2; i++) pt(x, y, rnd(-0.7, 0.7), rnd(-0.7, 0.7), rnd(240, 460), rnd(3, 7), pick(['#a855f7', '#ff2a1a', '#7c3aed'])) }
      glow(x, y, 34, '#a855f7', 0.8 * a); dark(x, y, 16, a); glow(x, y, 6, '#ff5a4a', a) }) }
    at(800, () => { flash('#7c3aed', 0.1, 180); pop(foe.x, foe.y, 120, '#a855f7', 340); ring(foe.x, foe.y, 10, 110, 400, '#a855f7', 8); smoke(foe.x, foe.y, 14, '#0a0410', [1, 4.5]); burst(foe.x, foe.y, 20, { v: [2, 7], life: [300, 650], size: [3, 7], colors: ['#a855f7', '#ff2a1a', '#c4a5ff'] }); shake(6) }) } },
  zert2: { col: '#ff2a1a', summon: 'hellRise', cast() { dim(0.4, 1500); champRise(1.08, 4, 700); tint(S, '#7a0010', 0.5, 850); pool(X, Y, 130, 1300, '#7a0010', 0.7)
    for (const d of [-1, 1]) { const hx = X + d * 124, hy = Y + 20; fx(1400, (p) => { const o = p < 0.25 ? eo(p / 0.25) : p > 0.75 ? 1 - ei((p - 0.75) / 0.25) : 1; if (o <= 0.01) return; ctx.globalCompositeOperation = 'lighter'; glow(hx, hy, 90 * o, '#ff3a1a', 0.55 + 0.1 * Math.sin(time / 60)); glow(hx, hy, 56 * o, '#ffb347', 0.5); dark(hx, hy, 46 * o, 1); dark(hx, hy, 30 * o, 1) }, 0)
      fx(1200, () => { if (!live) return; for (let i = 0; i < 3; i++) { const an = rnd(0, TAU); pt(hx + Math.cos(an) * 34, hy + Math.sin(an) * 24, rnd(-0.4, 0.4), -rnd(1, 3.2), rnd(280, 600), rnd(6, 14), pick(HELL)) } if (Math.random() < 0.3) pt(hx, hy, rnd(-0.3, 0.3), -1, 800, rnd(12, 18), '#150406', 2); if (Math.random() < 0.15) shake(3) }) }
    rise(S, 900, ['#ff4a1a', '#ffb347'], 0.7); at(700, () => { ring(X, Y, 30, 210, 460, '#ff5a1a', 8); flash('#ff3a1a', 0.08, 180) }) } },
  zert3: { col: '#ff2a1a', cast() { dim(0.55, 1800); champRise(1.12, 6, 950); tint(S, '#7a0010', 0.6, 1050); pool(X, Y, 170, 1600, '#7a0010', 0.8); const foe = cur.foe
    swirl(X, Y, 110, 30, 500, HELL, 3, 6, [3, 7])
    for (let i = -1; i <= 1; i++) at(140 + (i + 1) * 100, () => { shake(4); pop(X, Y, 70, '#ff5a1a', 160); comet({ x: X + i * 22, y: Y - 10 }, foe, 360, { arc: i * 90, core: '#ffd27a', cols: HELL, smokeCol: '#150406', r: 24, per: 4, ease: (p) => p * p }) })
    at(620, () => { flash('#ff2a1a', 0.2, 240); hitstop(70); shake(11); pop(foe.x, foe.y, 190, '#ff5a1a', 380); ring(foe.x, foe.y, 10, 150, 440, '#ff3a2a', 10); ring(foe.x, foe.y, 6, 90, 620, '#ffb347', 4)
      burst(foe.x, foe.y, 40, { v: [2, 10], life: [300, 750], size: [5, 13], colors: HELL, dr: 0.92 }); smoke(foe.x, foe.y, 14, '#150406', [1, 5]); burst(foe.x, foe.y, 16, { v: [2, 7], life: [700, 1300], size: [4, 8], colors: ['#1a0a08', '#3a1a12', '#ff7a1a'], k: 3, g: 0.12, dr: 0.96, up: -2 })
      fx(1200, () => { if (live && Math.random() < 0.8) pt(foe.x + rnd(-60, 60), foe.y + rnd(-30, 30), rnd(-0.4, 0.4), -rnd(1, 3), rnd(300, 600), rnd(4, 9), pick(HELL)) }) }) } },
  // ── LISARIJUS (Mistikos melodija) ──
  lisa1: { col: '#a855f7', strikes: { damage: 'voidLance', status: 'voidLance', debuff: 'voidLance' }, cast() { dim(0.4, 1400); champRise(1.1, 5, 750); tint(S, '#1a0a2a', 0.55, 900); pool(X, Y, 150, 1300, '#4c1d95', 0.7)
    let pts: number[][] = [], t0 = -99
    fx(750, (p) => { const r = 10 + p * 30, y = Y - 14; glow(X, y, r * 3.2, '#7c3aed', 0.75); glow(X, y, r * 1.7, '#c4a5ff', 0.6); dark(X, y, r * 1.15, 1); dark(X, y, r * 0.8, 1)
      if (time - t0 > 60) { t0 = time; pts = [0, 1, 2, 3].map(() => { const a = perim(S, 14); return boltPts(X, y, a[0], a[1], 9) }) } for (const q of pts) drawBolt(q, '#a855f7', 1.4, 0.9)
      if (live) for (let i = 0; i < 2; i++) { const an = rnd(0, TAU), rr = rnd(90, 150); pt(X + Math.cos(an) * rr, y + Math.sin(an) * rr, -Math.cos(an) * rr / 14, -Math.sin(an) * rr / 14, 230, rnd(2, 5), pick(VOID), 0, 0, 1) } })
    at(750, () => { knock(S, foeDir() * -7); flash('#7c3aed', 0.1, 160); ring(X, Y, 20, 170, 400, '#a855f7', 8); pop(X, Y - 14, 150, '#c4a5ff', 240); shake(6) }) } },
  lisa2: { col: '#a78bfa', strikes: { heal: 'arcWard', status: 'arcWard', buff: 'arcWard' }, cast() { champRise(1.08, 4, 650); tint(S, '#a78bfa', 0.35, 850); pool(X, Y, 150, 1300, '#4c1d95', 0.6, 0.2)
    fx(1050, (p) => { const g = eo(cl(p / 0.3)), a = p > 0.7 ? (1 - p) / 0.3 : 1; for (let i = 0; i < 3; i++) { const r = (60 + i * 22) * g, dir = i % 2 ? -1 : 1, n = 7 + i * 3; for (let k = 0; k < n; k++) { const an = k / n * TAU + dir * time / (520 + i * 160); glow(X + Math.cos(an) * r, Y + Math.sin(an) * r, 8 - i * 1.5, i === 1 ? '#7cc4ff' : '#c4b5fd', a * (0.95 - i * 0.2)) } } glow(X, Y, 130 * g, '#7c3aed', 0.3 * a) })
    swirl(X, Y, 110, 50, 700, ['#c4b5fd', '#7cc4ff', '#ffffff'], 2, 3.5, [2, 4.5]); at(600, () => ring(X, Y, 30, 160, 460, '#a78bfa', 6)) } },
  lisa3: { col: '#9fdcff', strikes: { damage: 'iceSpear', status: 'iceSpear' }, cast() { dim(0.55, 2200); champRise(1.14, 8, 1000); tint(S, '#bfe9ff', 0.55, 1150); const ry = Y + foeDir() * CH * 1.85, oy = Y - CH * 0.7; pool(X, Y, 150, 1500, '#9fdcff', 0.5, 0.2)
    fx(2000, (p) => { const a = Math.min(1, p * 5, (1 - p) * 3); ctx.globalAlpha = a * 0.6; ctx.drawImage(spr('#9fdcff'), X - 480, ry - CH, 960, CH * 2); ctx.globalAlpha = a * 0.3; ctx.drawImage(spr('#ffffff'), X - 380, ry - CH * 0.6, 760, CH * 1.2)
      if (live) for (let i = 0; i < 6; i++) pt(X + rnd(-500, 300), ry + rnd(-CH * 0.9, CH * 0.9), rnd(10, 18), rnd(-0.6, 1.4), rnd(240, 460), i % 3 ? rnd(1.5, 3.5) : rnd(6, 11), i % 3 ? '#ffffff' : pick(['#cfeeff', '#9fdcff']), 0, 0, 1) })
    fx(950, (p) => { const r = 14 + p * 30; glow(X, oy, r * 3, '#9fdcff', 0.8); glow(X, oy, r * 1.3, '#eaf8ff', 0.9); glow(X, oy, r * 0.5, '#ffffff', 1); if (live) { const an = rnd(0, TAU); pt(X + Math.cos(an) * (r + 10), oy + Math.sin(an) * (r + 10), -Math.sin(an) * 3, Math.cos(an) * 3, 260, rnd(5, 9), pick(['#e8f8ff', '#9fdcff']), 1, 0, 0.97) } })
    at(950, () => { flash('#cfeeff', 0.24, 260); ring(X, oy, 20, 300, 540, '#dff4ff', 12); ring(X, oy, 10, 180, 700, '#9fdcff', 5); burst(X, oy, 30, { v: [4, 12], life: [300, 650], size: [6, 12], colors: ['#e8f8ff', '#9fdcff'], k: 1, dr: 0.9 }); hitstop(60); shake(7) }) } },
  // ── JUODASMAKRIS (Plėšikų naktis) ──
  juod1: { col: '#ffd24a', cast() { champRise(1.08, 4, 850); const foe = cur.foe, me = cur.me; pool(foe.x, foe.y, 110, 900, '#7a1010', 0.6, 0.4); pool(me.x, me.y, 120, 1500, '#ffd24a', 0.5, 0)
    at(120, () => { ring(foe.x, foe.y, 10, 110, 420, '#ff5a4a', 7); smoke(foe.x, foe.y, 6, '#1a0a0a'); shake(4) })
    for (let i = 0; i < 18; i++) at(i * 38, () => { const arc = rnd(-130, 130); fx(540, (p) => { const [x, y] = bez(foe, me, arc, eo(p) * 0.4 + p * 0.6), tw0 = 0.6 + 0.4 * Math.abs(Math.sin(time / 50 + i)); glow(x, y, 16, '#ffd24a', 0.8); glow(x, y, 7 * tw0, '#fff4c2', 1); if (live && Math.random() < 0.5) pt(x, y, rnd(-0.4, 0.4), rnd(-0.4, 0.4), 260, rnd(2, 3.5), '#ffe89a') }); at(540, () => burst(me.x, me.y, 4, { v: [1, 5], life: [200, 420], size: [2, 4], colors: ['#ffe89a', '#ffffff'] })) })
    at(900, () => { flash('#ffd24a', 0.1, 200); pop(me.x, me.y, 150, '#ffd24a', 400); ring(me.x, me.y, 10, 130, 460, '#ffd24a', 9); burst(me.x, me.y, 24, { v: [2, 8], life: [300, 700], size: [2.5, 5], colors: ['#ffe89a', '#ffd24a', '#ffffff'], g: 0.1, up: -1.5 }) }) } },
  juod2: { col: '#ffd24a', strikes: { buff: 'rally', status: 'rally' }, cast() { const d = foeDir(); tw(S, { oy: d * 18, s: 1.1 }, 220, eo); at(260, () => tw(S, { oy: 0, s: 1 }, 380, eob)); pool(X, Y, 150, 1100, '#5fd0c0', 0.45, 0)
    at(220, () => { shake(7); flash('#5fd0c0', 0.08, 160); ring(X, Y, 30, 280, 540, '#5fd0c0', 10, 0.8); ring(X, Y, 20, 170, 440, '#ffd24a', 6); pop(X, Y, 150, '#ffd24a', 280, 0.7); dust(14, [2, 5]) })
    fx(850, (p) => { if (live && p < 0.8) for (let i = 0; i < 4; i++) pt(X + rnd(-300, 300), Y - d * rnd(-40, 40), 0, d * rnd(9, 16), rnd(180, 320), rnd(2, 3.5), pick(['#d8f5ec', '#5fd0c0', '#ffffff']), 0, 0, 1) }) } },
  juod3: { col: '#ffb347', strikes: { damage: 'cannon' }, cast() { dim(0.45, 2700); tint(S, '#ffb060', 0.35, 800); pool(X, Y, 150, 2400, '#ff7a1a', 0.35)
    for (let i = 0; i < 5; i++) at(i * 140, () => { const d = i % 2 ? 1 : -1, mx = X + d * 46, my = Y + foeDir() * 34; flash('#ffd27a', 0.06, 100); pop(mx, my, 90, '#ffd27a', 170); glow(mx, my, 40, '#ffffff', 1); smoke(mx, my, 6, '#4a4a52', [1, 4.5], [16, 28], [600, 1100]); burst(mx, my, 10, { v: [2, 8], life: [120, 300], size: [2, 4.5], colors: ['#ffe89a', '#ffffff', '#ffb347'] }); knock(S, -foeDir() * 6); shake(6) }) } },
  // ── DORIANOS GOLEMAS (Šviesos pulkas) ──
  golem1: { col: '#7cc4ff', strikes: { damage: 'rockSpike', status: 'rockSpike', debuff: 'rockSpike' }, cast() { tw(S, { oy: -22, s: 1.15 }, 360, eo); at(380, () => tw(S, { oy: 0, s: 1 }, 110, ei)); fx(480, (p) => { dark(X, Y, lerp(120, 70, p), lerp(0.1, 0.6, p)) }, 0)
    at(490, () => { S.sx = 1.15; S.sy = 0.85; tw(S, { sx: 1, sy: 1 }, 320, eob); hitstop(90); shake(15); flash('#ffffff', 0.18, 170); ring(X, Y, 30, 250, 500, '#d8d0c0', 12); ring(X, Y, 20, 140, 660, '#7cc4ff', 4); dust(30, [2, 6.5]); pop(X, Y, 140, '#7cc4ff', 260, 0.5)
      burst(X, Y, 18, { v: [3, 10], life: [450, 950], size: [4, 10], colors: ['#3a3640', '#2a2420', '#6b5a48'], k: 3, g: 0.3, dr: 0.97 }); fx(1800, (p) => { dark(X, Y, 110, 0.4 * (1 - p)) }, 0) }) } },
  golem2: { col: '#7cc4ff', cast() { tint(S, '#7cc4ff', 0.4, 1300); pool(X, Y, 150, 1600, '#7cc4ff', 0.5, 0.3); champRise(1.06, 3, 800)
    fx(600, () => { if (!live) return; for (let i = 0; i < 3; i++) { const an = rnd(0, TAU), r = rnd(160, 240), T = rnd(260, 380), v = (r - 60) / (T / 16.67); pt(X + Math.cos(an) * r, Y + Math.sin(an) * r, -Math.cos(an) * v, -Math.sin(an) * v, T, rnd(6, 13), pick(['#3a3640', '#56525e', '#2a2730']), 3, 0, 1) } if (Math.random() < 0.4) { const an = rnd(0, TAU); pt(X + Math.cos(an) * 200, Y + Math.sin(an) * 200, -Math.cos(an) * 5, -Math.sin(an) * 5, 400, rnd(12, 18), '#8a7b6a', 2) } })
    fx(1500, (p) => { const g = eo(cl(p / 0.4)), a = p > 0.75 ? (1 - p) / 0.25 : 1; glow(X, Y, 110 * g, '#7cc4ff', (0.35 + 0.15 * Math.sin(time / 90)) * a); glow(X, Y - CH * 0.1, 26 * g, '#eaf6ff', 0.8 * a) })
    at(640, () => { shake(9); hitstop(60); flash('#7cc4ff', 0.12, 180); ring(X, Y, 50, 190, 420, '#7cc4ff', 9); domeFx(S, false, '#7cc4ff'); dust(16); for (let i = 0; i < 22; i++) { const [x, y, nx, ny] = perim(S, 10); pt(x, y, nx * rnd(2, 7), ny * rnd(2, 7), rnd(160, 360), rnd(2, 4.5), pick(['#ffffff', '#7cc4ff'])) } }) } },
  golem3: { col: '#7cc4ff', strikes: { damage: 'boulder', heal: 'stoneMend' }, cast() { dim(0.5, 2100); tw(S, { s: 1.16, oy: -8 }, 700, eo); at(900, () => tw(S, { s: 1, oy: 0 }, 260, eob)); tint(S, '#7cc4ff', 0.35, 1050); pool(X, Y, 180, 1700, '#7cc4ff', 0.4, 0.4)
    fx(900, (p) => { if (live) { for (let i = 0; i < 2; i++) pt(X + rnd(-190, 190), Y + rnd(-60, 100), rnd(-0.2, 0.2), -rnd(0.6, 2.6) * (0.4 + p), rnd(500, 950), rnd(4, 10), pick(['#3a3640', '#2a2420', '#6b5a48']), 3, -0.02, 0.99); if (Math.random() < 0.4) pt(X + rnd(-150, 150), Y + rnd(0, 90), 0, -0.6, 800, rnd(12, 20), '#8a7b6a', 2); if (Math.random() < 0.25) shake(2 + p * 5) }
      for (const d of [-1, 1]) { glow(X + d * 12, Y - CH * 0.22, 10 + p * 12, '#7cc4ff', 0.9); glow(X + d * 12, Y - CH * 0.22, 4 + p * 4, '#ffffff', 1) } })
    at(820, () => { flash('#7cc4ff', 0.18, 220); ring(X, Y, 30, 280, 500, '#7cc4ff', 10); pop(X, Y, 170, '#7cc4ff', 300, 0.6); hitstop(50) }) } },
  // ── SKRAG'AS (Vryhioko gauja) ──
  skrag1: { col: '#ff7a1a', strikes: { damage: 'flame', status: 'flame' }, cast() { tint(S, '#ff8a2a', 0.4, 850); pool(X, Y, 140, 1300, '#ff5a1a', 0.5)
    fx(700, (p) => { if (!live) return; cshake(S, 2 + p * 4); for (const d of [-1, 1]) { for (let i = 0; i < 2; i++) pt(X + d * (CW / 2 - 6), Y - CH * 0.3, d * rnd(0.5, 2.4), -rnd(3, 8), rnd(200, 420), rnd(6, 13), pick(FIRE), 0, 0, 0.97); if (Math.random() < 0.4) pt(X + d * (CW / 2 - 6), Y - CH * 0.35, d * 0.5, -1.5, 850, rnd(13, 20), '#2a1c14', 2) }
      pt(X + rnd(-30, 30), Y + rnd(-40, 40), rnd(-3.5, 3.5), rnd(-3.5, 1), rnd(140, 320), rnd(1.5, 3.2), '#ffe89a', 0, 0.15) })
    fx(700, (p) => glow(X, Y + foeDir() * 36, 20 + p * 40, '#ffb347', 0.4 + p * 0.5))
    at(700, () => { knock(S, -foeDir() * 8); flash('#ffb347', 0.08, 140); pop(X, Y + foeDir() * 40, 110, '#ffd27a', 220); shake(6) }) } },
  skrag2: { col: '#ff9a3a', strikes: { buff: 'fuse', debuff: 'fuse', damage: 'fuse' }, cast() { champRise(1.1, 5, 650); pool(X, Y, 150, 1200, '#ff7a1a', 0.45)
    fx(750, () => { if (live) for (let i = 0; i < 5; i++) pt(X + rnd(-8, 8), Y - CH * 0.45, rnd(-4.5, 4.5), -rnd(4, 10), rnd(400, 850), rnd(1.5, 3.8), pick(['#ffe89a', '#ffb347', '#ffffff']), 0, 0.28, 0.99) }); fx(750, (p) => glow(X, Y - CH * 0.45, 30 + 10 * Math.sin(time / 40), '#ffd27a', 0.9 * (1 - p * 0.4)))
    at(120, () => { ring(X, Y, 40, 190, 440, '#ff9a3a', 8); shake(5); smoke(X, Y - CH * 0.4, 4, '#3a2a22') }); at(420, () => { ring(X, Y, 40, 260, 520, '#ffd27a', 6, 0.8); pop(X, Y, 150, '#ff9a3a', 280, 0.6); shake(7) }) } },
  skrag3: { col: '#ff7a1a', strikes: { damage: 'bomb' }, cast() { dim(0.5, 2700); tint(S, '#ff8a2a', 0.35, 950); pool(X, Y, 150, 2300, '#ff5a1a', 0.4)
    for (let i = 0; i < 8; i++) at(i * 85, () => { const x0 = X + rnd(-24, 24), dx = rnd(-110, 110); cshake(S, 6); pop(x0, Y - CH * 0.4, 60, '#ffd27a', 150); smoke(x0, Y - CH * 0.4, 3, '#4a4a52', [1, 3], [12, 20], [500, 800]); burst(x0, Y - CH * 0.4, 5, { v: [2, 6], life: [120, 260], size: [2, 3.5], colors: ['#ffe89a', '#ffffff'] })
      fx(440, (p) => { const x = x0 + dx * p, y = lerp(Y - CH * 0.45, TOP - 30, eo(p)); glow(x, y, 16, '#ff7a1a', 0.5); dark(x, y, 10, 1); glow(x, y - 12, 9, '#ffd24a', 1); if (live) { pt(x, y - 12, rnd(-1, 1), rnd(0, 2), 220, rnd(1.5, 3), '#ffe89a'); pt(x, y, 0, 0.5, 380, rnd(7, 11), '#3a3a42', 2) } }) })
    at(820, () => shake(5)) } },
}

// ── ČEMPIONO FAZĖS KEITIMAS: energija susitraukia į kortą → akinantis virsmas → frakcijos banga ──
// Kortos vaizdas (nauja fazė) pasikeičia baltos blykstės momentu (`swap`), todėl perėjimas nematomas.
type EvolveDef = { cols: string[]; core: string; pool: string; extra: (m: number) => void }
const EVOLVE: Record<string, EvolveDef> = {
  prazar: { cols: NECRO, core: '#aef5dd', pool: '#1a6b52', extra(m) { smoke(X, Y, 14 * m, '#07120c', [1, 5]); for (let i = 0; i < 10 * m; i++) { const an = -Math.PI / 2 + rnd(-1.3, 1.3), v = rnd(4, 9); pt(X, Y, Math.cos(an) * v, Math.sin(an) * v, rnd(600, 1000), rnd(8, 14), pick(NECRO), 0, -0.02, 0.97) }
    for (const d of [-1, 1]) fx(700, (p) => { const a = Math.sin(p * Math.PI); pillar(X + d * 70, Y + 40, 260 * eo(p) * m, 26, '#5ef0c0', a * 0.7) }) } },
  gald: { cols: HOLY, core: '#ffffff', pool: '#ffe08a', extra(m) { fx(900, (p) => { const a = 1 - p; for (let i = 0; i < 12; i++) { const an = i / 12 * TAU + time / 2400, L = 240 * m * eo(cl(p * 3)); softBeam(X, Y, X + Math.cos(an) * L, Y + Math.sin(an) * L, 16, i % 2 ? '#fff4c2' : '#ffe08a', 0.45 * a) } })
    fx(700, (p) => { if (!live) return; const sp = cl(p * 2.4); for (const d of [-1, 1]) for (let i = 0; i < 4; i++) { const u = Math.random() * sp, x = X + d * (30 + u * 180 * m), y = Y + 10 - Math.sin(u * 2.2) * 120 * m + u * 30; pt(x, y, d * rnd(0.2, 1.2), rnd(0.3, 1.4), rnd(400, 800), rnd(5, 10), pick(['#fff8e0', '#ffe08a']), i % 2 ? 1 : 0, 0.02, 0.97) } }) } },
  zert: { cols: HELL, core: '#ffd27a', pool: '#7a0010', extra(m) { smoke(X, Y, 12 * m, '#150406', [1, 5]); fx(1100, () => { if (live) for (let i = 0; i < 3; i++) { const [x, y, nx, ny] = perim(S, 12); pt(x, y, nx * rnd(0.3, 1.8), ny * rnd(0.3, 1.8) - rnd(0.8, 2.6), rnd(300, 640), rnd(7, 16) * m, pick(HELL)) } })
    fx(1900, (p) => { dark(X, Y, 130 * m, 0.5 * (1 - p)); ctx.globalCompositeOperation = 'lighter'; glow(X, Y, 100 * m, '#ff3a1a', 0.5 * (1 - p)) }, 0) } },
  lisa: { cols: VOID, core: '#eadcff', pool: '#4c1d95', extra(m) { let pts: number[][] = [], t0 = -99; fx(800, (p) => { if (time - t0 > 55) { t0 = time; pts = [0, 1, 2, 3, 4].map(() => { const a = perim(S, 0), b = perim(S, rnd(20, 70 * m)); return boltPts(a[0], a[1], b[0], b[1], 9) }) } for (const q of pts) drawBolt(q, '#a855f7', 1.6, (1 - p) * 0.9) })
    fx(700, (p) => { for (let i = 0; i < 10; i++) { const an = i / 10 * TAU + time / 300, r = lerp(40, 150 * m, eo(p)); glow(X + Math.cos(an) * r, Y + Math.sin(an) * r, 9, i % 2 ? '#7cc4ff' : '#c4b5fd', 1 - p) } }) } },
  juod: { cols: ['#7cc4ff', '#bfe9ff', '#ffffff', '#ffd24a'], core: '#eaf6ff', pool: '#1e5fa5', extra(m) { for (const d of [0, 180, 360]) at(d, () => ring(X, Y, 30, 230 * m, 720, '#bfe9ff', 5, 0.7))
    burst(X, Y, 44 * m, { v: [3, 10], life: [450, 900], size: [3, 7], colors: ['#bfe9ff', '#ffffff', '#7cc4ff'], g: 0.3, up: -5, dr: 0.98, jx: 30 }); burst(X, Y, 16, { v: [2, 7], life: [300, 700], size: [2.5, 5], colors: ['#ffd24a', '#ffe89a'], g: 0.1, up: -2 }) } },
  golem: { cols: ['#7cc4ff', '#cfe6ff', '#ffffff'], core: '#eaf6ff', pool: '#7cc4ff', extra(m) { for (let i = 0; i < 30 * m; i++) { const [x, y, nx, ny] = perim(S, 0), s = rnd(3, 11); pt(x, y, nx * s + rnd(-1, 1), ny * s + rnd(-1, 1) - 1.5, rnd(500, 1000), rnd(5, 12), pick(['#3a3640', '#2a2420', '#56525e']), 3, 0.3, 0.97) }
    dust(26 * m, [2, 7]); fx(1100, (p) => glow(X, Y, 120 * m, '#7cc4ff', (0.4 + 0.2 * Math.sin(time / 70)) * (1 - p))) } },
  skrag: { cols: FIRE, core: '#fff3d0', pool: '#ff5a1a', extra(m) { smoke(X, Y, 18 * m, '#4a4a52', [1, 6], [18, 34], [800, 1500]); burst(X, Y, 12 * m, { v: [3, 10], life: [500, 900], size: [4, 8], colors: ['#2a2420', '#6b5a48'], k: 3, g: 0.3, dr: 0.97 })
    fx(800, () => { if (live) for (let i = 0; i < 4; i++) pt(X + rnd(-10, 10), Y - CH * 0.4, rnd(-5, 5), -rnd(4, 11), rnd(400, 850), rnd(1.5, 3.8), pick(['#ffe89a', '#ffb347', '#ffffff']), 0, 0.28, 0.99) }) } },
}
function evolveCast(key: string, phase: number): number {
  const d = EVOLVE[key] ?? EVOLVE.gald, m = phase >= 3 ? 1.35 : 1, swap = phase >= 3 ? 900 : 760
  dim(0.5 * (m > 1 ? 1.15 : 1), swap + 1300); pool(X, Y, 180 * m, swap + 1500, d.pool, 0.7, 0.4)
  swirl(X, Y, 190 * m, 30, swap, d.cols, m > 1 ? 4 : 3, 6.5, [3, 7]); rise(S, swap, d.cols, 0.9, [3, 6], [1.2, 3])
  tw(S, { s: 1.12, oy: -8 }, swap * 0.8, eo); tint(S, d.core, 0, 1); S.tint = d.core; tw(S, { tintA: 0.75 }, swap, ei)
  fx(swap, (p) => { cshake(S, 1 + p * 5); glow(X, Y, 60 + p * 90 * m, d.cols[0], 0.3 + p * 0.5); glow(X, Y, 20 + p * 50, d.core, p * 0.9) })
  at(swap, () => {
    hitstop(90 * m); flash(d.core, 0.32 * m, 300); S.tint = '#ffffff'; S.tintA = 1; tw(S, { tintA: 0 }, 750, eo); S.s = 1.32; tw(S, { s: 1, oy: 0 }, 460, eob)
    shake(14 * m); neighbors(10 * m); try { cur.hooks?.land?.(14 * m) } catch { /* */ }
    ring(X, Y, 30, 300 * m, 560, d.cols[0], 14); ring(X, Y, 20, 190 * m, 760, d.core, 6); pop(X, Y, 220 * m, d.core, 360)
    fx(620, (p) => { const a = Math.sin(p * Math.PI); pillar(X, Y + 60, (Y - TOP + 60), 70 * m, d.cols[0], a * 0.8); pillar(X, Y + 60, (Y - TOP + 60), 24 * m, d.core, a) })
    burst(X, Y, 46 * m, { v: [3, 12], life: [300, 800], size: [4, 10], colors: d.cols, dr: 0.92 }); burst(X, Y, 14 * m, { v: [4, 11], life: [400, 800], size: [5, 10], colors: [d.cols[0], d.core], k: 1, dr: 0.92 })
    d.extra(m); rise(S, 1300, d.cols, 1, [3, 6], [1, 2.8])
    if (m > 1) at(260, () => { flash(d.core, 0.14, 200); ring(X, Y, 40, 420, 700, d.core, 9, 0.8); shake(9); pop(X, Y, 260, d.cols[0], 320, 0.6) })
  })
  return swap
}

// ═══════════════════════════════════════════════════════════════════════════
// Vykdymas: canvas, scenos, DOM kortų adapteris, kadras
// ═══════════════════════════════════════════════════════════════════════════
function isLow(): boolean {
  try { const q = localStorage.getItem('rvn-vfx-quality'); if (q === 'low') return true; if (q === 'high') return false } catch { /* */ }
  return window.innerWidth < 820 || (navigator.hardwareConcurrency || 8) <= 4
}
function reducedMotion(): boolean { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } }

function resize() {
  if (!cv) return
  D = Math.min(window.devicePixelRatio || 1, LOW ? 1 : 2)
  cv.width = Math.round((cv.clientWidth || window.innerWidth) * D); cv.height = Math.round((cv.clientHeight || window.innerHeight) * D)
}
function syncCanvasSpace() {
  if (!cv) return
  const cw = cv.clientWidth || window.innerWidth, ch = cv.clientHeight || window.innerHeight
  if (Math.abs(cv.width - Math.round(cw * D)) > 1 || Math.abs(cv.height - Math.round(ch * D)) > 1) resize()
  const r = cv.getBoundingClientRect(), sx = r.width > 0 ? r.width / cw : 1
  BS = D / (sx || 1); BX = -r.left * BS; BY = -r.top * BS
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
  let w = r.width, h = r.height
  // framer-motion įėjimo spyruoklė (y/scale) dar gali būti aktyvi – atimam jos poslinkį ir mastelį,
  // kad efektas būtų ties GALUTINE kortos vieta ir dydžiu. Dydis imamas iš ekrano rect'o (ne offsetWidth),
  // todėl teisingas ir tada, kai kuris nors protėvis turi scale / zoom.
  try { const tr = getComputedStyle(root).transform; if (tr && tr !== 'none') { const m = new DOMMatrixReadOnly(tr); const sx = Math.hypot(m.a, m.b) || 1, sy = Math.hypot(m.c, m.d) || 1; px -= m.e; py -= m.f; w /= sx; h /= sy } } catch { /* */ }
  if (w < 4 || h < 4) { w = root.offsetWidth || w; h = root.offsetHeight || h }
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
    foe: { x: X, y: Y - 260 }, me: { x: X, y: Y + 200 },
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
  OLD_IMGS.forEach((im) => im.remove()); OLD_IMGS.clear()
  SCENES.length = 0; Q.length = 0; FX.length = 0; TW.length = 0; pN = 0; freeze = 0; running = false
  if (cv) { try { cv.remove() } catch { /* */ } cv = null }
}

function sceneXf(sc: Scene) { ctx.setTransform(BS * sc.k, 0, 0, BS * sc.k, BS * (sc.cx - X * sc.k) + BX, BS * (sc.cy - Y * sc.k) + BY) }
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
  // GYVAS SEKIMAS: scenos centras kiekvieną kadrą persimatuojamas pagal tikrą kortos vietą. Eilė gali
  // persicentruoti, ranka susitraukti, lenta purtytis – efektas visada lieka ANT kortos, ne ten, kur ji buvo.
  syncCanvasSpace()
  for (const sc of SCENES) { const r0 = sc.S.root; if (!r0 || !r0.isConnected) continue; const m = measure(r0); if (m.w < 4) continue; sc.cx = m.px; sc.cy = m.py; sc.S.px = m.px; sc.S.py = m.py }
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
      ctx.setTransform(BS, 0, 0, BS, BS * (c.px + c.ox * sc.k) + BX, BS * (c.py + (c.oy + c.bY) * sc.k) + BY); if (c.rot) ctx.rotate(c.rot)
      ctx.beginPath(); if (typeof ctx.roundRect === 'function') ctx.roundRect(-w / 2, -h / 2, w, h, 7 * sc.k); else ctx.rect(-w / 2, -h / 2, w, h); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }
  // 2) dalelės: tamsios (dūmai, nuolaužos) vienu praėjimu, švytinčios kitu
  ctx.setTransform(BS, 0, 0, BS, BX, BY)
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
    // v4: taikinys – korta → pilna smūgio choreografija (užtaisymas, skrydis, smūgis, pasekmės)
    if (V4 && o.targetEl && PROJ_TO_STRIKE[proj]) { const h4 = playStrike(PROJ_TO_STRIKE[proj], from, o.targetEl, { sourceEl: o.cast === false ? null : o.sourceEl, light: o.light, color: proj === 'orb' ? o.color : undefined, hooks: o.hooks, root: o.root, hitAt: o.hitAt, impact: o.impact, onHit: o.onHit }); if (h4 > 0) return h4 }
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

  /**
   * Čempiono gebėjimo užtaisymo spektaklis ant čempiono kortos. `foe`/`me` – avatarų taškai (ekrano px).
   * Grąžina, po kiek ms gali prasidėti smūgiai į taikinius (0 – negrojama).
   */
  skillCast(id: SkillFxId, el: HTMLElement, o: { foe?: Pt | null; me?: Pt | null; hooks?: FxHooks; root?: HTMLElement | null } = {}): number {
    const def = SKILL[id]; if (!def || !this.available() || !ensureCanvas(o.root)) return 0
    const m = measure(el), k = m.w / CW
    const sc = makeScene({ x: m.px, y: m.py }, k, el, o.hooks, true, cv!.parentElement ?? document)
    if (o.foe) sc.foe = { x: X + (o.foe.x - sc.cx) / k, y: Y + (o.foe.y - sc.cy) / k }
    if (o.me) sc.me = { x: X + (o.me.x - sc.cx) / k, y: Y + (o.me.y - sc.cy) / k }
    sc.zRoot = el; el.style.zIndex = '46'
    enter(sc)
    try { def.cast() } catch (e) { console.error('[fxStage] skill', id, e) }
    kick()
    return skillCastMs(id)
  },
  /**
   * Čempiono fazės keitimo virsmas. `champKey` – iš fxCatalog.championKey(); `phase` – NAUJA fazė (2 arba 3).
   * Grąžina, po kiek ms įvyksta blykstė (tuo momentu saugu pakeisti kortos vaizdą); 0 – negrojama.
   */
  evolve(champKey: string, phase: number, el: HTMLElement, o: { hooks?: FxHooks; root?: HTMLElement | null; oldImage?: string | null } = {}): number {
    if (!this.available() || !ensureCanvas(o.root)) return 0
    if (SCENES.some((x) => x.zRoot === el)) return 0
    const m = measure(el)
    const sc = makeScene({ x: m.px, y: m.py }, m.w / CW, el, o.hooks, true, cv!.parentElement ?? document)
    sc.zRoot = el; el.style.zIndex = '46'
    enter(sc)
    let swap = 0
    try { swap = evolveCast(champKey, phase) } catch (e) { console.error('[fxStage] evolve', champKey, e) }
    // Variklio būsena jau rodo NAUJOS fazės kortą – iki blykstės ją uždengia senos fazės vaizdas.
    if (swap > 0 && o.oldImage && sc.S.el) {
      const host = sc.S.el, im = document.createElement('img')
      im.src = o.oldImage; im.alt = ''; im.setAttribute('aria-hidden', 'true'); im.dataset.fxOld = '1'
      Object.assign(im.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', pointerEvents: 'none', zIndex: '39' })
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative'
      host.appendChild(im); OLD_IMGS.add(im)
      at(swap, () => { im.remove(); OLD_IMGS.delete(im) })
    }
    kick()
    return swap
  },
  /** Gebėjimo smūgis vienam taikiniui (keičia įprastą skrydį). 0 – šis gebėjimas tokiam efektui savo smūgio neturi. */
  skillStrike(id: SkillFxId, kind: StrikeKind, from: Pt, to: Pt, o: FlyOpts = {}): number {
    const def = SKILL[id], sk = def?.strikes?.[kind], st = sk ? STRIKE[sk] : undefined
    if (!def || !st || !this.available() || !ensureCanvas(o.root)) return 0
    const host = cv!.parentElement ?? document
    const tm = o.targetEl ? measure(o.targetEl) : null
    const k = tm ? tm.w / CW : defaultK(host)
    const sc = makeScene(tm ? { x: tm.px, y: tm.py } : to, k, o.targetEl ?? null, o.hooks, false, host)
    enter(sc)
    const f = { x: X + (from.x - sc.cx) / k, y: Y + (from.y - sc.cy) / k }, t = { x: X, y: Y }
    const col = o.color ?? def.col ?? '#d4af37'
    const T = o.hitAt != null ? Math.max(180, Math.min(st.base, o.hitAt / st.hitFrac)) : st.base
    const delay = o.hitAt != null ? Math.max(0, o.hitAt - T * st.hitFrac) : 0
    const launch = () => { st.go(f, t, T, col); at(T * st.hitFrac, () => { st.imp(sc.S, !!o.light, col); try { o.onHit?.() } catch (e) { console.error('[fxStage]', e) } }) }
    if (delay > 0) at(delay, launch); else launch()
    kick()
    return Math.round(delay + T * st.hitFrac)
  },
  skillKinds(id: SkillFxId): StrikeKind[] { return Object.keys(SKILL[id]?.strikes ?? {}) as StrikeKind[] },
  skillHasStrike(id: SkillFxId, kind: StrikeKind): boolean { const sk = SKILL[id]?.strikes?.[kind]; return !!sk && !!STRIKE[sk] },
  /** Iškvietimo choreografija gebėjimo iškviestiems padarams (zombiai, impai). */
  skillSummonFx(id: SkillFxId): SummonFxId | null { return SKILL[id]?.summon ?? null },
  projColor(proj: FxProjId): string { return PROJ[proj]?.col ?? '#d4af37' },
  /** Įgyvendintų efektų sąrašai (testams: katalogas ir variklis privalo sutapti). */
  ids(): { summons: string[]; projectiles: string[]; impacts: string[]; skills: string[]; strikes: string[]; skillStrikeRefs: string[]; evolves: string[] } { return { evolves: Object.keys(EVOLVE), summons: Object.keys(SUM), projectiles: Object.keys(PROJ), impacts: Object.keys(IMP), skills: Object.keys(SKILL), strikes: Object.keys(STRIKE), skillStrikeRefs: Object.values(SKILL).flatMap((d) => Object.values(d.strikes ?? {})) } },
  /**
   * Flipbook efektų pilotas: įjungia/išjungia naujas (tekstūrines) fireBurst, iceShatter ir holyDescent versijas
   * ir pradeda krauti tekstūras (bet kuris kvietimas su argumentu). Kol neįkelta, groja senoji versija. Grąžina būseną.
   */
  books(on?: boolean): { on: boolean; ready: boolean } {
    if (on != null) { BOOKS_ON = on; for (const k in BK) bkLoad(k) }   // kraunam ir išjungus – kad įjungus grotų iškart
    return { on: BOOKS_ON, ready: Object.values(BK).every((b) => b.ok) }
  },
  /** Viską sustabdo ir išvalo (kovos ekrano uždarymas). */
  stop(): void { hardReset() },
  /** Testams / HUD. */
  stats(): { particles: number; scenes: number; running: boolean; low: boolean } { return { particles: pN, scenes: SCENES.length, running, low: LOW } },
}
// ══ AoE choreografijos (v4 peržiūra) ═════════════════════════════════════════
export type FxAoeId = 'firestorm' | 'blizzard' | 'chain' | 'toxic' | 'void' | 'radiance' | 'bloom' | 'reap'
type Zone = { T: VCard[]; x0: number; x1: number; w: number; cx: number; y: number; h: number }
const hitT = (z: Zone, t: VCard, sweep: number) => sweep * cl((t.x - z.x0) / z.w)
function lightWave(z: Zone, c1: string, c2: string, hot: string): number {
  fx(1700, (p) => { const a = Math.min(1, p / 0.15, (1 - p) / 0.45); ctx.globalCompositeOperation = 'lighter'; glow(z.cx, z.y, z.w * 0.7, c1, 0.3 * a) }, 0)
  fx(560, (p) => { const x = lerp(z.x0 - 80, z.x1 + 80, eo(p)), a = Math.min(1, p * 6, (1 - p) * 4); ctx.globalCompositeOperation = 'lighter'; softBeam(x, z.y - z.h * 0.9, x, z.y + z.h * 0.9, 90, c1, 0.5 * a); softBeam(x, z.y - z.h * 0.8, x, z.y + z.h * 0.8, 30, hot, 0.7 * a)
    if (live) for (let i = 0; i < 2; i++) pt(x, z.y + rnd(-z.h * 0.6, z.h * 0.6), -rnd(0.5, 2), -rnd(0.3, 1.2), rnd(400, 800), rnd(2, 4), pick([c2, c1])) })
  for (const t of z.T) at(hitT(z, t, 480) + 60, () => {
    fx(1050, (p) => { const g = eo(cl(p / 0.18)), a = p > 0.55 ? (1 - p) / 0.45 : 1; ctx.globalCompositeOperation = 'lighter'
      const y0 = Math.max(TOP, t.y - t.vh * 1.55); softBeam(t.x, y0, t.x, t.y + t.vh * 0.5, t.vw * 1.25 * g, c1, 0.4 * a); softBeam(t.x, y0, t.x, t.y + t.vh * 0.5, t.vw * 0.55 * g, hot, 0.55 * a)
      glow(t.x, t.y + t.vh * 0.5, t.vw * 0.9, c1, 0.7 * a); glow(t.x, t.y, t.vh * 0.8, c2, 0.35 * a) }, 0)
    pop(t.x, t.y, 110, c2, 380); tint(t, c2, 0.7, 1000); tw(t, { oy: -9, s: 1.06 }, 240); at(420, () => tw(t, { oy: 0, s: 1 }, 380, eob))
    rise(t, 1000, [c2, c1, '#ffffff'], 0.7, [2, 4.5], [1, 2.6]) })
  at(540, () => flash(c1, 0.12, 320)); return 540
}
const AOE: Record<FxAoeId, (z: Zone) => number> = {
  firestorm(z) { const SW = 520; dim(0.5, 1700)
    fx(1700, (p) => { const a = Math.min(1, p / 0.12, (1 - p) / 0.5); ctx.globalCompositeOperation = 'lighter'; glow(z.cx, z.y + z.h * 0.45, z.w * 0.62, '#ff5a1a', 0.5 * a); glow(z.cx, z.y + z.h * 0.5, z.w * 0.4, '#ffb347', 0.35 * a * (0.8 + 0.2 * Math.sin(time / 70))) }, 0)
    fx(SW + 180, (p) => { const q = cl(p * (SW + 180) / SW), x = lerp(z.x0 - 30, z.x1 + 30, q * q * (3 - 2 * q)), a = p > 0.8 ? (1 - p) / 0.2 : Math.min(1, p * 8), H = z.h * 1.7, base = z.y + z.h * 0.55
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 9; i++) { const u = i / 8, w = (58 - u * 34) * (0.85 + 0.3 * Math.sin(time / 45 + i * 1.9)), yy = base - u * H, lean = -u * u * 46 + Math.sin(time / 90 + i) * 8
        glow(x + lean, yy, w * 1.5, '#ff4a1a', 0.5 * a * (1 - u * 0.5)); glow(x + lean, yy, w, '#ffb347', 0.75 * a * (1 - u * 0.6)); if (u < 0.6) glow(x + lean * 0.6, yy, w * 0.5, '#fff3c8', 0.9 * a * (1 - u)) }
      if (live) { for (let i = 0; i < 4; i++) pt(x + rnd(-20, 10), base - rnd(0, H * 0.8), -rnd(1, 4), -rnd(1.5, 5), rnd(350, 800), rnd(3, 8), pick(FIRE), 0, -0.03, 0.96)
        pt(x - rnd(10, 50), base - rnd(0, H * 0.5), -rnd(0.2, 1), -rnd(0.6, 1.6), rnd(700, 1200), rnd(16, 30), '#1c1410', 2)
        pt(x - rnd(0, 30), base + rnd(-6, 6), rnd(-0.5, 0.5), -rnd(0.3, 1.2), rnd(500, 900), rnd(8, 16), pick(['#ff7a1a', '#ff4a1a'])) } })
    for (const t of z.T) at(hitT(z, t, SW), () => { pop(t.x, t.y, 120, '#ffb060', 300)
      burst(t.x, t.y, 18, { v: [2, 8], life: [300, 700], size: [4, 10], colors: FIRE, dr: 0.92, up: -1.2 }); burst(t.x, t.y + t.vh * 0.3, 10, { v: [1, 3], life: [600, 1000], size: [2, 4], colors: ['#ffe2a8'], up: -2.5 })
      fx(520, (p) => { ctx.globalCompositeOperation = 'lighter'; const a = 1 - p, r = t.vh * (0.5 + p * 0.9); for (let i = 0; i < 5; i++) { const u = i / 4; glow(t.x + Math.sin(time / 60 + i) * 6, t.y + t.vh * 0.4 - u * r, 40 - u * 22, i < 2 ? '#fff3c8' : '#ff7a1a', a * (1 - u * 0.5)) } })
      tint(t, '#ff8a2a', 0.85, 700); knock(t, 5); cshake(t, 7); rise(t, 900, ['#ff7a1a', '#ffb347'], 0.6) })
    at(SW, () => { flash('#ff9a3a', 0.22, 280); shake(9); hitstop(60) }); return SW },
  blizzard(z) { dim(0.45, 1800)
    fx(1800, (p) => { const a = Math.min(1, p / 0.15, (1 - p) / 0.45); ctx.globalCompositeOperation = 'lighter'; glow(z.cx, z.y, z.w * 0.7, '#3d8fd9', 0.35 * a); glow(z.cx, z.y + z.h * 0.45, z.w * 0.5, '#cfeeff', 0.25 * a) }, 0)
    fx(900, (p) => { if (!live) return; const n = p < 0.7 ? 5 : 2; for (let i = 0; i < n; i++) { const x = rnd(z.x0 - 120, z.x1 + 40), y = z.y - z.h * rnd(0.9, 1.5); pt(x, y, rnd(5, 9), rnd(6, 10), rnd(260, 420), rnd(2, 4.5), pick(['#ffffff', '#cfeeff', '#9fdcff']), 0, 0, 1); if (i < 2) pt(x, y, rnd(4, 7), rnd(5, 8), rnd(300, 480), rnd(5, 9), '#e8f8ff', 1, 0, 1) } })
    fx(620, (p) => { const e = eo(p), a = (1 - p) * 0.8; ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const an = i / 26 * TAU + 0.3; glow(z.cx + Math.cos(an) * z.w * 0.62 * e, z.y + z.h * 0.4 + Math.sin(an) * z.h * 0.38 * e, 16 + 10 * Math.sin(i * 2.3), '#cfeeff', a) } }, 0)
    z.T.forEach((t, i) => at(430 + i * 70, () => {
      const SP = [...Array(5)].map((_, k) => ({ dx: (k - 2) * t.vw * 0.21 + rnd(-4, 4), h: t.vh * rnd(0.55, 1.05) * (k === 2 ? 1.15 : 1), w: rnd(9, 15), lean: (k - 2) * 0.09 + rnd(-0.04, 0.04) }))
      fx(1250, (p) => { const g = eob(cl(p / 0.11)), a = p > 0.7 ? (1 - p) / 0.3 : 1, by = t.y + t.vh * 0.52
        for (const s of SP) { const tx = t.x + s.dx + s.lean * s.h * g, ty = by - s.h * g
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a * 0.92; ctx.fillStyle = '#9fdcff'
          ctx.beginPath(); ctx.moveTo(t.x + s.dx - s.w, by); ctx.lineTo(tx, ty); ctx.lineTo(t.x + s.dx + s.w, by); ctx.fill()
          ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(t.x + s.dx - s.w * 0.25, by); ctx.lineTo(tx, ty); ctx.lineTo(t.x + s.dx + s.w * 0.15, by); ctx.fill()
          ctx.globalCompositeOperation = 'lighter'; glow(tx, ty, 12, '#ffffff', a * 0.8) } })
      pop(t.x, t.y, 110, '#dff4ff', 280); burst(t.x, t.y + t.vh * 0.3, 14, { v: [3, 8], life: [320, 640], size: [5, 9], colors: ['#e8f8ff', '#9fdcff'], k: 1, dr: 0.9, up: -2 }); burst(t.x, t.y, 12, { v: [1, 4], life: [400, 800], size: [1.5, 3.5], colors: ['#ffffff'] })
      tint(t, '#bfe9ff', 0.8, 1300); knock(t, 4); cshake(t, 6)
      at(900, () => burst(t.x, t.y + t.vh * 0.2, 10, { v: [1, 4], life: [400, 700], size: [4, 8], colors: ['#cfeeff', '#ffffff'], k: 1, g: 0.2, dr: 0.95 })) }))
    at(620, () => { flash('#dff4ff', 0.2, 260); shake(7); hitstop(55) }); return 620 },
  chain(z) { dim(0.6, 1500)
    fx(1300, (p) => { const a = Math.min(1, p / 0.1, (1 - p) / 0.4); dark(z.cx, TOP + 40, z.w * 0.7, 0.6 * a); ctx.globalCompositeOperation = 'lighter'; glow(z.cx + Math.sin(time / 130) * 40, TOP + 50, z.w * 0.45, '#5b7cff', (0.25 + 0.2 * Math.random()) * a) }, 0)
    const strike = (t: VCard, big: boolean) => { const sx = t.x + rnd(-60, 60); bolt(sx, TOP, t.x, t.y - t.vh * 0.2, big ? 320 : 200, '#9fc4ff', big ? 4 : 2.6, big ? 20 : 14); if (big) bolt(sx + rnd(-30, 30), TOP, t.x, t.y, 260, '#e8f0ff', 2, 26)
      pop(t.x, t.y, big ? 150 : 90, '#cfe0ff', big ? 320 : 200); burst(t.x, t.y, big ? 18 : 8, { v: [3, 10], life: [150, 380], size: [2, 4], colors: ['#ffffff', '#9fc4ff', '#ffe89a'], dr: 0.9 }); tint(t, '#cfe0ff', big ? 0.9 : 0.5, big ? 600 : 250); cshake(t, big ? 8 : 4); if (big) knock(t, 5) }
    z.T.forEach((t, i) => at(120 + i * 95, () => strike(t, false)))
    const D = 120 + z.T.length * 95, H = Math.max(560, D + 60)
    for (let i = 0; i + 1 < z.T.length; i++) at(D - 60 + i * 40, () => bolt(z.T[i].x, z.T[i].y, z.T[i + 1].x, z.T[i + 1].y, 380, '#9fc4ff', 2.2, 10))
    at(H, () => { for (const t of z.T) strike(t, true); flash('#e8f0ff', 0.4, 240); shake(11); hitstop(75)
      fx(700, () => { if (live && Math.random() < 0.6) { const t = pick(z.T), [x, y] = perim(t, 2); pt(x, y, rnd(-2, 2), rnd(-2, 2), rnd(120, 260), rnd(1.5, 3), pick(['#ffffff', '#9fc4ff'])) } }) }); return H },
  toxic(z) { dim(0.4, 1900)
    fx(1900, (p) => { const a = Math.min(1, p / 0.2, (1 - p) / 0.4), g = eo(cl(p / 0.3)); dark(z.cx, z.y + z.h * 0.4, z.w * 0.6 * g, 0.5 * a, '#0a1406'); ctx.globalCompositeOperation = 'lighter'; glow(z.cx, z.y + z.h * 0.4, z.w * 0.62 * g, '#4d7c0f', 0.6 * a); glow(z.cx, z.y + z.h * 0.3, z.w * 0.4 * g, '#bef264', 0.18 * a * (0.8 + 0.2 * Math.sin(time / 110))) }, 0)
    fx(1100, (p) => { if (!live) return; const q = eo(p); for (const d of [-1, 1]) { const x = d < 0 ? lerp(z.x0 - 60, z.cx, q) : lerp(z.x1 + 60, z.cx, q); pt(x + rnd(-20, 20), z.y + rnd(-z.h * 0.3, z.h * 0.55), -d * rnd(0.3, 1.4), -rnd(0.1, 0.7), rnd(900, 1500), rnd(22, 40), pick(['#3f6212', '#4d7c0f', '#1a2e05']), 2); if (Math.random() < 0.5) pt(x, z.y + rnd(-z.h * 0.4, z.h * 0.5), rnd(-0.4, 0.4), -rnd(0.5, 1.5), rnd(500, 900), rnd(3, 6), '#bef264') } })
    z.T.forEach((t, i) => at(520 + i * 60, () => { pop(t.x, t.y, 100, '#bef264', 300); burst(t.x, t.y + t.vh * 0.35, 16, { v: [2, 7], life: [400, 800], size: [3, 7], colors: ['#bef264', '#84cc16', '#4d7c0f'], a0: -Math.PI, spread: Math.PI, g: 0.25, dr: 0.96 }); tint(t, '#84cc16', 0.75, 1200); cshake(t, 5); knock(t, 3)
      fx(1100, () => { if (live && Math.random() < 0.35) { const [x, y] = perim(t, -8); pt(x, y, rnd(-0.2, 0.2), rnd(0.4, 1.4), rnd(400, 700), rnd(3, 5), '#84cc16', 0, 0.12) } }) }))
    at(600, () => { flash('#84cc16', 0.14, 300); shake(5) }); return 600 },
  void(z) { dim(0.6, 1700)
    fx(1700, (p) => { const a = Math.min(1, p / 0.15, (1 - p) / 0.35), g = eo(cl(p / 0.25)); dark(z.cx, z.y + z.h * 0.35, z.w * 0.66 * g, 0.85 * a); ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 54; i++) { const an = i / 54 * TAU + time / 1400; glow(z.cx + Math.cos(an) * z.w * 0.6 * g, z.y + z.h * 0.35 + Math.sin(an) * z.h * 0.62 * g, 14 + 8 * Math.sin(i * 1.7 + time / 200), i % 3 ? '#7c3aed' : '#c4a5ff', 0.7 * a) } }, 0)
    for (const t of z.T) { const TD = [...Array(4)].map((_, k) => ({ dx: (k - 1.5) * t.vw * 0.36, ph: rnd(0, TAU), h: t.vh * rnd(0.8, 1.15) }))
      fx(1250, (p) => { const g = eo(cl(p / 0.45)), a = p > 0.75 ? (1 - p) / 0.25 : 1, by = t.y + t.vh * 0.6
        for (const d of TD) { let px = t.x + d.dx, py = by; for (let s = 1; s <= 9; s++) { const u = s / 9; if (u > g) break; const x = t.x + d.dx * (1 - u * 0.75) + Math.sin(time / 170 + d.ph + u * 5) * 9 * u, y = by - d.h * u
            ctx.globalCompositeOperation = 'source-over'; softBeam(px, py, x, y, 9 * (1 - u) + 2.5, '#07030c', a); ctx.globalCompositeOperation = 'lighter'; softBeam(px, py, x, y, 4 * (1 - u) + 1, '#7c3aed', a * 0.6); px = x; py = y } } }) }
    fx(650, () => { if (!live) return; for (let i = 0; i < 2; i++) { const t = pick(z.T), an = rnd(0, TAU), r = rnd(90, 150); pt(t.x + Math.cos(an) * r, t.y + Math.sin(an) * r, -Math.cos(an) * r / 16, -Math.sin(an) * r / 16, 260, rnd(2, 4), pick(['#c4a5ff', '#ffffff']), 0, 0, 1) } })
    z.T.forEach((t, i) => at(640 + i * 50, () => { fx(420, (p) => { dark(t.x, t.y, 90 * (1 - p * 0.5), 0.9 * (1 - p)); ctx.globalCompositeOperation = 'lighter'; glow(t.x, t.y, 120 * (1 - p), '#7c3aed', 0.8 * (1 - p)) })
      burst(t.x, t.y, 14, { v: [2, 6], life: [300, 600], size: [2.5, 5], colors: ['#a855f7', '#c4a5ff', '#1c1026'] }); tint(t, '#3b0764', 0.85, 1100); knock(t, -4); cshake(t, 6) }))
    at(700, () => { flash('#7c3aed', 0.2, 300); shake(7); hitstop(50) }); return 700 },
  radiance: (z) => lightWave(z, '#ffe08a', '#fff4c2', '#fff8dc'),
  bloom: (z) => lightWave(z, '#5ef0c0', '#d1fae5', '#f0fff8'),
  reap(z) { dim(0.7, 1700)
    fx(1500, (p) => { const a = Math.min(1, p / 0.12, (1 - p) / 0.4); dark(z.cx, z.y, z.w * 0.7, 0.6 * a); ctx.globalCompositeOperation = 'lighter'; glow(z.cx, z.y + z.h * 0.5, z.w * 0.5, '#3b0764', 0.6 * a) }, 0)
    fx(380, (p) => { const q = eo(p), x = lerp(z.x0 - 60, z.x1 + 60, q), a = Math.min(1, p * 8, (1 - p) * 3), y = z.y - Math.sin(q * Math.PI) * 18; ctx.globalCompositeOperation = 'source-over'; softBeam(x - 150, y + 10, x, y, 26, '#000000', a); ctx.globalCompositeOperation = 'lighter'; softBeam(x - 120, y + 8, x, y, 10, '#c4a5ff', a); glow(x, y, 26, '#ffffff', a) })
    for (const t of z.T) at(hitT(z, t, 330) + 40, () => { cshake(t, 8); knock(t, 6); tint(t, '#000000', 0.8, 900); pop(t.x, t.y, 90, '#c4a5ff', 220)
      at(160, () => { const sway = rnd(0, TAU); fx(900, (p) => { const e = ei(p), y = t.y - e * (t.y - TOP) * 0.75, x = t.x + Math.sin(sway + p * 7) * 14 * (1 - p), a = p < 0.15 ? p / 0.15 : 1 - p * p; ctx.globalCompositeOperation = 'lighter'; softBeam(x, y + 70 * (0.4 + p), x, y, 16, '#a78bfa', 0.5 * a); glow(x, y, 20, '#e9d5ff', a); glow(x, y, 9, '#ffffff', a) })
        burst(t.x, t.y, 10, { v: [0.5, 2.5], life: [500, 900], size: [2, 4], colors: ['#c4a5ff', '#e9d5ff'], up: -2 }) }) })
    at(360, () => { flash('#1a0b2e', 0.45, 260); shake(9); hitstop(70) }); return 380 },
}
/** AoE choreografija per taikinių eilę. Grąžina, po kiek ms įvyksta pagrindinis smūgis (skaičiams / statusams). */
export function playAoe(id: FxAoeId, els: HTMLElement[], o: { hooks?: FxHooks; root?: HTMLElement | null } = {}): number {
  const def = AOE[id]; if (!def || !els.length || !fxStage.available() || !ensureCanvas(o.root)) return 0
  const host = cv!.parentElement ?? document
  const ms = els.map(measure), k = ms[0].w / CW
  const xs = ms.map((m) => m.px), cy = ms.reduce((s, m) => s + m.py, 0) / ms.length
  const sc = makeScene({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: cy }, k, null, o.hooks, true, host)
  enter(sc)
  const set = new Set<HTMLElement | null>(els), T = sc.cards.filter((c) => set.has(c.root)).sort((a, b) => a.x - b.x)
  if (!T.length) return 0
  const x0 = T[0].x - T[0].vw / 2 - 24, x1 = T[T.length - 1].x + T[T.length - 1].vw / 2 + 24
  let hit = 0
  try { hit = def({ T, x0, x1, w: x1 - x0, cx: (x0 + x1) / 2, y: Y, h: T[0].vh }) } catch (e) { console.error('[fxStage] aoe', id, e) }
  kick(); return Math.round(hit)
}

// ══ Vieno taikinio smūgiai (v4 peržiūra): užtaisymas → skrydis → smūgis → pasekmės ═════════════
export type FxStrikeId = 'fire' | 'ice' | 'lightning' | 'poison' | 'shadow' | 'holy' | 'arrow' | 'heal' | 'buff' | 'orb'
// C4 – užtaisymo trukmė, TS – skrydžio laiko mastelis; playStrike juos trumpam pakeičia, kai smūgis turi įvykti anksčiau (hitAt).
let C4 = 230, TS = 1
function cast4(f: Pt, src: VCard | null, col: string, hot = '#ffffff', ms = C4) {
  if (src) { tw(src, { oy: -8, s: 1.07 }, ms * 0.8); at(ms, () => { tw(src, { oy: 0, s: 1 }, 220, eob); knock(src, 4) }) }
  for (let i = 0; i < 16; i++) { const a = rnd(0, TAU), r = rnd(40, 70), v = r / (ms / 16.67); pt(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, -Math.cos(a) * v, -Math.sin(a) * v, ms * 0.9, rnd(3, 5.5), col, 0, 0, 1) }
  fx(ms, (p) => { ctx.globalCompositeOperation = 'lighter'; glow(f.x, f.y, 30 * p + 6, col, 0.8 * p); glow(f.x, f.y, 11 * p, hot, 0.95) })
  at(ms, () => pop(f.x, f.y, 46, col, 160))
}
const fly4 = (f: Pt, t: Pt, arc: number, T: number, ease: Ease, draw: (x: number, y: number, an: number, p: number) => void) => { let px = f.x, py = f.y; fx(T, (p) => { const [x, y] = bez(f, t, arc, ease(p)); const an = (x === px && y === py) ? Math.atan2(t.y - f.y, t.x - f.x) : Math.atan2(y - py, x - px); draw(x, y, an, p); px = x; py = y }) }
const dotRing = (x: number, y: number, r: number, dur: number, col: string, n = 22) => fx(dur, (p) => { ctx.globalCompositeOperation = 'lighter'; const e = eo(p); for (let i = 0; i < n; i++) { const an = i / n * TAU; glow(x + Math.cos(an) * r * e, y + Math.sin(an) * r * e, 13 * (1 - p) + 3, col, (1 - p) * 0.8) } })
function stream4(f: Pt, c: VCard, src: VCard | null, c1: string, c2: string, surge: boolean): number {
  const T = 560 * TS, D = 180; cast4(f, src, c1, c2, D)
  at(D, () => { const dx = c.x - f.x, dy = c.y - f.y, l = Math.hypot(dx, dy) || 1
    fx(T, (p) => { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) { const q = cl(p * 1.35 - j * 0.03); if (q <= 0 || q >= 1) continue; let [x, y] = bez(f, c, -30, q); const w = Math.sin(q * TAU * 1.5 + i * TAU / 3) * 16 * Math.sin(q * Math.PI); x += -dy / l * w; y += dx / l * w; glow(x, y, 9 - j, j ? c1 : c2, 0.9 - j * 0.11) } }) })
  const H = Math.round(D + T * 0.75)
  at(H, () => { fx(900, (p) => { const a = p > 0.5 ? (1 - p) / 0.5 : 1, g = eo(cl(p / 0.3)); ctx.globalCompositeOperation = 'lighter'; glow(c.x, c.y, c.vh * 0.9 * g, c1, 0.5 * a); glow(c.x, c.y + c.vh * 0.45, c.vw * 0.8, c2, 0.5 * a)
      if (surge) { softBeam(c.x, c.y + c.vh * 0.55, c.x, c.y - c.vh * (0.4 + 0.9 * g), c.vw * 0.95, c1, 0.45 * a); softBeam(c.x, c.y + c.vh * 0.55, c.x, c.y - c.vh * (0.3 + 0.8 * g), c.vw * 0.4, '#ffffff', 0.5 * a) } }, 0)
    pop(c.x, c.y, 100, c2, 360); tint(c, c1, 0.6, 800); tw(c, { oy: -7, s: surge ? 1.1 : 1.05 }, 220); at(360, () => tw(c, { oy: 0, s: 1 }, 340, eob)); rise(c, 1000, [c1, c2, '#ffffff'], 0.75, [2, 4.5], [1, 2.6]); if (surge) dotRing(c.x, c.y, 90, 420, c1, 18) })
  return H
}
const STRIKE4: Record<FxStrikeId, (f: Pt, c: VCard, src: VCard | null, light: boolean, col?: string) => number> = {
  fire(f, c, src, light) { const T = 400 * TS; cast4(f, src, '#ff7a1a', '#fff3c8')
    at(C4, () => fly4(f, c, -54, T, (p) => p * (0.4 + 0.6 * p), (x, y, an) => { ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 5; i++) { const d = i * 9; glow(x - Math.cos(an) * d, y - Math.sin(an) * d, 26 - i * 4, i ? '#ff4a1a' : '#ffb347', 0.8 - i * 0.14) } glow(x, y, 12, '#fff3c8', 1)
      if (live) { pt(x, y, -Math.cos(an) * rnd(0.5, 2) + rnd(-0.6, 0.6), -Math.sin(an) * rnd(0.5, 2) + rnd(-0.6, 0.6), rnd(250, 500), rnd(4, 9), pick(FIRE), 0, -0.02, 0.95); if (Math.random() < 0.5) pt(x, y, rnd(-0.3, 0.3), -rnd(0.3, 0.9), rnd(500, 800), rnd(10, 18), '#1c1410', 2) } }))
    at(C4 + T, () => { pop(c.x, c.y, 135, '#ffb060', 320); burst(c.x, c.y, 24, { v: [2, 9], life: [300, 700], size: [4, 11], colors: FIRE, dr: 0.92 }); burst(c.x, c.y, 6, { v: [0.5, 2], life: [600, 1000], size: [14, 22], colors: ['#1c1410'], k: 2, up: -0.7 })
      fx(560, (p) => { ctx.globalCompositeOperation = 'lighter'; const a = 1 - p, r = c.vh * (0.5 + p); for (let i = 0; i < 6; i++) { const u = i / 5; glow(c.x + Math.sin(time / 55 + i) * 7, c.y + c.vh * 0.4 - u * r, 44 - u * 24, i < 2 ? '#fff3c8' : '#ff7a1a', a * (1 - u * 0.5)) } })
      dotRing(c.x, c.y, 110, 380, '#ffb347'); tint(c, '#ff8a2a', 0.9, 650); knock(c, 6); cshake(c, light ? 4 : 8); if (!light) { shake(7); hitstop(55); rise(c, 1000, ['#ff7a1a', '#ffb347'], 0.65) } })
    return C4 + T },
  ice(f, c, src, light) { const T = 300 * TS; cast4(f, src, '#9fdcff')
    at(C4, () => fly4(f, c, -10, T, (p) => p * p, (x, y, an) => { const cs = Math.cos(an), sn = Math.sin(an); ctx.globalCompositeOperation = 'lighter'; softBeam(x - cs * 70, y - sn * 70, x, y, 16, '#3d8fd9', 0.7); softBeam(x - cs * 44, y - sn * 44, x + cs * 10, y + sn * 10, 8, '#dff4ff', 1); glow(x + cs * 8, y + sn * 8, 10, '#ffffff', 1)
      if (live) { pt(x, y, rnd(-0.8, 0.8), rnd(-0.8, 0.8), rnd(250, 450), rnd(1.5, 3.5), '#ffffff'); if (Math.random() < 0.4) pt(x, y, rnd(-1, 1), rnd(0.2, 1.2), rnd(300, 500), rnd(4, 7), '#cfeeff', 1, 0.08) } }))
    at(C4 + T, () => { const SP = [...Array(9)].map((_, i) => ({ a: i / 9 * TAU + rnd(-0.2, 0.2), l: rnd(46, 92), w: rnd(6, 11) }))
      fx(light ? 800 : 1300, (p) => { const g = eob(cl(p / 0.1)), a = p > 0.7 ? (1 - p) / 0.3 : 1
        for (const s of SP) { const cs = Math.cos(s.a), sn = Math.sin(s.a), bx = c.x + cs * 14, by = c.y + sn * 14, tx = c.x + cs * (14 + s.l * g), ty = c.y + sn * (14 + s.l * g)
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a * 0.9; ctx.fillStyle = '#9fdcff'
          ctx.beginPath(); ctx.moveTo(bx - sn * s.w, by + cs * s.w); ctx.lineTo(tx, ty); ctx.lineTo(bx + sn * s.w, by - cs * s.w); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; glow(tx, ty, 9, '#ffffff', a * 0.8) } })
      pop(c.x, c.y, 120, '#dff4ff', 280); burst(c.x, c.y, 16, { v: [3, 9], life: [300, 620], size: [5, 10], colors: ['#e8f8ff', '#9fdcff'], k: 1, dr: 0.9 }); burst(c.x, c.y, 14, { v: [1, 4], life: [400, 800], size: [1.5, 3.5], colors: ['#ffffff'] })
      tint(c, '#bfe9ff', 0.85, light ? 700 : 1400); knock(c, 5); cshake(c, light ? 4 : 7); if (!light) { shake(5); hitstop(45) } })
    return C4 + T },
  lightning(f, c, src, light) { const D = 200; let lastArc = 0
    if (src) { tw(src, { s: 1.06 }, D * 0.8); at(D, () => tw(src, { s: 1 }, 200, eob)) }
    fx(D, () => { ctx.globalCompositeOperation = 'lighter'; glow(f.x, f.y, 26, '#5b7cff', 0.5 + 0.4 * Math.random()); glow(f.x, f.y, 9, '#ffffff', 0.9) })
    for (let i = 0; i < 4; i++) at(i * 45, () => { const a = rnd(0, TAU); bolt(f.x, f.y, f.x + Math.cos(a) * rnd(24, 44), f.y + Math.sin(a) * rnd(24, 44), 70, '#9fc4ff', 1.4, 5) })
    at(D, () => { bolt(f.x, f.y, c.x, c.y, 300, '#9fc4ff', 3.4, 16); bolt(f.x, f.y, c.x, c.y, 240, '#e8f0ff', 1.8, 26); bolt(c.x + rnd(-50, 50), TOP, c.x, c.y - c.vh * 0.3, 260, '#9fc4ff', 2.6, 18)
      pop(c.x, c.y, 140, '#cfe0ff', 300); burst(c.x, c.y, 18, { v: [3, 11], life: [150, 380], size: [2, 4], colors: ['#ffffff', '#9fc4ff', '#ffe89a'], dr: 0.9 }); tint(c, '#cfe0ff', 0.95, 500); knock(c, 5); cshake(c, light ? 5 : 9)
      if (!light) { flash('#e8f0ff', 0.25, 200); shake(8); hitstop(60) }
      const n = light ? 5 : 9; for (let i = 0; i < n; i++) at(120 + i * 90 + rnd(0, 40), () => { const [x1, y1] = perim(c, 2); const a = rnd(0, TAU), r = rnd(20, 46); bolt(x1, y1, x1 + Math.cos(a) * r, y1 + Math.sin(a) * r, 90, '#9fc4ff', 1.3, 5); pt(x1, y1, rnd(-2, 2), rnd(-2, 2), 200, 2.5, '#ffffff') }); void lastArc; lastArc = 0 })
    return D + 40 },
  poison(f, c, src, light) { const T = 520 * TS; cast4(f, src, '#84cc16', '#eaffb0')
    at(C4, () => fly4(f, c, -120, T, lin, (x, y) => { const wob = 1 + 0.18 * Math.sin(time / 40); ctx.globalCompositeOperation = 'lighter'; glow(x, y, 24 * wob, '#4d7c0f', 0.9); glow(x, y, 15 / wob, '#bef264', 0.95); glow(x - 4, y - 5, 5, '#ffffff', 0.8)
      if (live && Math.random() < 0.7) pt(x + rnd(-6, 6), y, rnd(-0.3, 0.3), rnd(0.5, 2), rnd(350, 600), rnd(3, 6), pick(['#84cc16', '#bef264']), 0, 0.15) }))
    at(C4 + T, () => { pop(c.x, c.y, 110, '#bef264', 300); burst(c.x, c.y, 22, { v: [2, 8], life: [400, 800], size: [3, 8], colors: ['#bef264', '#84cc16', '#4d7c0f'], a0: -Math.PI, spread: Math.PI, g: 0.3, dr: 0.96 }); burst(c.x, c.y, 8, { v: [0.5, 1.5], life: [800, 1300], size: [18, 30], colors: ['#3f6212', '#1a2e05'], k: 2, up: -0.4 })
      pool(c.x, c.y + c.vh * 0.45, c.vw * 0.9, light ? 900 : 1500, '#4d7c0f', 0.6, 0.5); tint(c, '#84cc16', 0.8, light ? 700 : 1200); knock(c, 4); cshake(c, 5)
      fx(light ? 700 : 1200, () => { if (live && Math.random() < 0.4) { const [x, y] = perim(c, -8); pt(x, y, rnd(-0.2, 0.2), rnd(0.4, 1.4), rnd(400, 700), rnd(3, 5), '#84cc16', 0, 0.12) } }); if (!light) shake(4) })
    return C4 + T },
  shadow(f, c, src, light) { const T = 440 * TS; cast4(f, src, '#7c3aed', '#c4a5ff')
    at(C4, () => fly4(f, c, 60, T, (p) => p * p * (3 - 2 * p), (x, y, an, p) => { const sw = Math.sin(p * 14) * 12 * (1 - p), ox = -Math.sin(an) * sw, oy = Math.cos(an) * sw
      dark(x + ox, y + oy, 30, 0.9); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const a2 = time / 90 + i / 6 * TAU; glow(x + ox + Math.cos(a2) * 17, y + oy + Math.sin(a2) * 17, 7, i % 2 ? '#a855f7' : '#c4a5ff', 0.9) } glow(x + ox, y + oy, 34, '#7c3aed', 0.45)
      if (live) pt(x + ox, y + oy, rnd(-0.4, 0.4), rnd(-0.4, 0.4), rnd(400, 700), rnd(10, 18), '#12081f', 2) }))
    at(C4 + T, () => { fx(460, (p) => { dark(c.x, c.y, 110 * (1 - p * 0.6), 0.95 * (1 - p)); ctx.globalCompositeOperation = 'lighter'; glow(c.x, c.y, 140 * (1 - p), '#7c3aed', 0.8 * (1 - p)) })
      for (let i = 0; i < 18; i++) { const a = rnd(0, TAU), r = rnd(80, 130); pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, -Math.cos(a) * r / 15, -Math.sin(a) * r / 15, 250, rnd(2.5, 5), pick(['#c4a5ff', '#a855f7']), 0, 0, 1) }
      at(240, () => burst(c.x, c.y, 16, { v: [2, 7], life: [300, 650], size: [2.5, 5.5], colors: ['#a855f7', '#c4a5ff', '#1c1026'] }))
      tint(c, '#3b0764', 0.9, light ? 700 : 1200); knock(c, -5); cshake(c, light ? 4 : 7); if (!light) { shake(6); hitstop(50) } })
    return C4 + T },
  holy(f, c, src, light) { const D = 260; cast4(f, src, '#ffe08a', '#ffffff', D)
    at(D, () => { fx(420, (p) => { const g = cl(p / 0.25), a = p > 0.5 ? (1 - p) / 0.5 : 1, x = lerp(f.x, c.x, g), y = lerp(f.y, c.y, g); ctx.globalCompositeOperation = 'lighter'; softBeam(f.x, f.y, x, y, 22 * a + 3, '#ffe08a', 0.7 * a); softBeam(f.x, f.y, x, y, 9 * a + 1, '#ffffff', a); glow(x, y, 30 * a, '#fff4c2', a) })
      at(105, () => { fx(900, (p) => { const g = eo(cl(p / 0.15)), a = p > 0.5 ? (1 - p) / 0.5 : 1, y0 = Math.max(TOP, c.y - c.vh * 1.55); ctx.globalCompositeOperation = 'lighter'; softBeam(c.x, y0, c.x, c.y + c.vh * 0.5, c.vw * 1.2 * g, '#ffe08a', 0.45 * a); softBeam(c.x, y0, c.x, c.y + c.vh * 0.5, c.vw * 0.5 * g, '#fff8dc', 0.6 * a); glow(c.x, c.y, c.vh * 0.85, '#fff4c2', 0.4 * a) }, 0)
        pop(c.x, c.y, 130, '#fff4c2', 380); burst(c.x, c.y, 16, { v: [1, 5], life: [400, 800], size: [2, 4.5], colors: ['#fff4c2', '#ffe08a', '#ffffff'] }); tint(c, '#fff4c2', 0.85, 800); cshake(c, light ? 2 : 5); rise(c, light ? 600 : 1000, ['#fff4c2', '#ffe08a'], 0.6); if (!light) flash('#ffe08a', 0.1, 260) }) })
    return D + 105 },
  arrow(f, c, src, light) { const D = 160, T = 190, an0 = Math.atan2(c.y - f.y, c.x - f.x)
    if (src) { tw(src, { ox: -Math.cos(an0) * 7, oy: -Math.sin(an0) * 7 }, D); at(D, () => tw(src, { ox: 0, oy: 0 }, 160, eob)) }
    at(D, () => fly4(f, c, -14, T, lin, (x, y, an) => { const cs = Math.cos(an), sn = Math.sin(an); ctx.globalCompositeOperation = 'lighter'; softBeam(x - cs * 90, y - sn * 90, x, y, 7, '#e8e0c8', 0.5); softBeam(x - cs * 34, y - sn * 34, x + cs * 6, y + sn * 6, 4, '#ffffff', 1); glow(x + cs * 6, y + sn * 6, 6, '#ffffff', 1) }))
    at(D + T, () => { pop(c.x, c.y, 70, '#fff4d6', 180); burst(c.x, c.y, 14, { v: [3, 10], life: [160, 380], size: [1.5, 3.5], colors: ['#ffffff', '#ffe89a', '#e8e0c8'], a0: an0 + Math.PI - 0.7, spread: 1.4, dr: 0.9 }); burst(c.x, c.y, 5, { v: [0.5, 2], life: [400, 700], size: [10, 16], colors: ['#8a7b6a'], k: 2 })
      tw(c, { ox: Math.cos(an0) * 9, oy: Math.sin(an0) * 9 }, 60); at(70, () => tw(c, { ox: 0, oy: 0 }, 260, eob)); tint(c, '#ffffff', 0.6, 220); cshake(c, light ? 3 : 6); if (!light) { shake(4); hitstop(40) } })
    return D + T },
  heal: (f, c, src) => stream4(f, c, src, '#5ef0c0', '#d1fae5', false),
  buff: (f, c, src) => stream4(f, c, src, '#ffd24a', '#fff4c2', true),
  orb(f, c, src, light, col = '#d4af37') { const T = 400 * TS; cast4(f, src, col)
    at(C4, () => fly4(f, c, -40, T, (p) => p * (0.45 + 0.55 * p), (x, y, an) => { ctx.globalCompositeOperation = 'lighter'; softBeam(x - Math.cos(an) * 50, y - Math.sin(an) * 50, x, y, 12, col, 0.6); glow(x, y, 26, col, 0.7); glow(x, y, 11, '#ffffff', 1); for (let i = 0; i < 3; i++) { const a2 = time / 70 + i * TAU / 3; glow(x + Math.cos(a2) * 15, y + Math.sin(a2) * 15, 5, '#ffffff', 0.9) } if (live) pt(x, y, rnd(-0.5, 0.5), rnd(-0.5, 0.5), rnd(250, 450), rnd(3, 6), col) }))
    at(C4 + T, () => { pop(c.x, c.y, 120, col, 300); pop(c.x, c.y, 60, '#ffffff', 200); burst(c.x, c.y, 20, { v: [2, 8], life: [300, 650], size: [3, 7], colors: [col, '#ffffff'], dr: 0.92 }); dotRing(c.x, c.y, 100, 360, col, 20)
      tint(c, col, 0.8, 500); knock(c, 5); cshake(c, light ? 4 : 7); if (!light) { shake(5); hitstop(45) } })
    return C4 + T },
}
const NOM4: Record<FxStrikeId, number> = { fire: 630, ice: 530, lightning: 240, poison: 750, shadow: 670, holy: 365, arrow: 350, heal: 600, buff: 600, orb: 630 }
/** Senojo skrydžio id → v4 smūgis (fxStage.fly nukreipia čia, kai taikinys – korta). */
const PROJ_TO_STRIKE: Record<FxProjId, FxStrikeId> = { fireball: 'fire', ice: 'ice', lightning: 'lightning', poison: 'poison', shadow: 'shadow', holy: 'holy', arrow: 'arrow', healWisp: 'heal', goldMotes: 'buff', orb: 'orb' }
let V4 = true
/** v4 efektų jungiklis (numatyta įjungta). Išjungus – grįžta v3 skrydžiai ir smūgiai. */
export function fxV4(on?: boolean): boolean { if (on != null) V4 = on; return V4 }
/**
 * Pilnas vieno taikinio smūgis: užtaisymas → skrydis → smūgis → pasekmės. Grąžina, po kiek ms įvyksta smūgis.
 * `hitAt` – kada smūgis TURI įvykti: jei vėliau nei įprasta, startas atidedamas; jei anksčiau – trumpinamas užtaisymas ir skrydis.
 * `impact` – statuso ženklas po smūgio (tik freeze / seal / dome – kiti smūgiai jau įeina į choreografiją).
 */
export function playStrike(id: FxStrikeId, from: Pt, targetEl: HTMLElement, o: { sourceEl?: HTMLElement | null; light?: boolean; color?: string; hooks?: FxHooks; root?: HTMLElement | null; hitAt?: number; impact?: FxImpactId | null; onHit?: () => void } = {}): number {
  const def = STRIKE4[id]; if (!def || !fxStage.available() || !ensureCanvas(o.root)) return 0
  const host = cv!.parentElement ?? document, tm = measure(targetEl), k = tm.w / CW
  const sc = makeScene({ x: tm.px, y: tm.py }, k, targetEl, o.hooks, false, host)
  enter(sc)
  const f = { x: X + (from.x - sc.cx) / k, y: Y + (from.y - sc.cy) / k }
  let src: VCard | null = null
  if (o.sourceEl && o.sourceEl !== targetEl) { src = mkCard(o.sourceEl, sc, false); sc.cards.push(src) }
  const nom = NOM4[id]; let delay = 0, c4 = 230, ts = 1
  if (o.hitAt != null) { if (o.hitAt >= nom) delay = o.hitAt - nom; else if (nom > 400) { c4 = Math.max(90, Math.min(230, o.hitAt * 0.35)); ts = Math.max(0.45, (o.hitAt - c4) / (nom - 230)) } }
  let hit = nom
  const run = () => {
    C4 = c4; TS = ts
    try { hit = def(f, sc.S, src, !!o.light, o.color) } catch (e) { console.error('[fxStage] strike', id, e) } finally { C4 = 230; TS = 1 }
    at(hit, () => { const im = o.impact; if (im === 'freeze' || im === 'seal' || im === 'dome') { try { IMP[im](sc.S, true, o.color ?? '#d4af37') } catch { /* */ } } try { o.onHit?.() } catch (e) { console.error('[fxStage]', e) } })
  }
  if (delay > 0) at(delay, run); else run()
  kick(); return Math.round(delay + hit)
}

// ══ Nuolatiniai statusai, reakcija, prakeiksmas (v4 peržiūra) ════════════════
export type FxStatusId = 'burning' | 'frozen' | 'stunned' | 'poisoned' | 'silenced' | 'blessed' | 'shield' | 'taunt' | 'sprint' | 'stealth' | 'cantAttack' | 'immortal'
/** Taškas kortos perimetre pagal t∈[0,1) + išorinė normalė. */
function perimAt(c: VCard, t: number, pad = 0): [number, number, number, number] {
  const w = c.vw + pad * 2, h = c.vh + pad * 2, P4 = (w + h) * 2; let d = ((t % 1) + 1) % 1 * P4
  if (d < w) return [c.x - w / 2 + d, c.y - h / 2, 0, -1]; d -= w
  if (d < h) return [c.x + w / 2, c.y - h / 2 + d, 1, 0]; d -= h
  if (d < w) return [c.x + w / 2 - d, c.y + h / 2, 0, 1]; d -= w
  return [c.x - w / 2, c.y + h / 2 - d, -1, 0]
}
const STATUS4: Record<FxStatusId, (c: VCard, a: number, sd: number[]) => void> = {
  burning(c, a) { const by = c.y + c.vh * 0.5; ctx.globalCompositeOperation = 'lighter'
    glow(c.x, by, c.vw * 0.85, '#ff5a1a', 0.3 * a * (0.8 + 0.2 * Math.sin(time / 70)))
    for (let i = 0; i < 7; i++) { const u = i / 6, x = c.x + (u - 0.5) * c.vw, h = c.vh * (0.3 + 0.16 * Math.sin(time / 130 + i * 2.1) + 0.1 * Math.sin(time / 53 + i)); for (let j = 0; j < 4; j++) { const v = j / 3; glow(x + Math.sin(time / 90 + i + j) * 4 * v, by - h * v, 15 - v * 8, j < 1 ? '#fff3c8' : j < 2 ? '#ffb347' : '#ff4a1a', a * (0.75 - v * 0.45)) } }
    if (live && Math.random() < 0.35 * a) pt(c.x + rnd(-c.vw / 2, c.vw / 2), by - rnd(0, c.vh * 0.3), rnd(-0.3, 0.3), -rnd(0.8, 2.2), rnd(400, 800), rnd(2, 4.5), pick(FIRE)) },
  frozen(c, a, sd) { const hs = (i: number, k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233 + sd[0] * 37.7) * 43758.5453; return v - Math.floor(v) }
    ctx.globalCompositeOperation = 'lighter'; glow(c.x, c.y, c.vh * 0.78, '#3d8fd9', 0.24 * a)
    // šerkšno pluta palei kraštus (tankesnė kampuose) – minkšti kristalų sankaupos, be pieštų smaigalių
    for (let i = 0; i < 54; i++) { const corner = i < 20, t = corner ? (Math.floor(hs(i, 1) * 4) + (hs(i, 2) - 0.5) * 0.34 * (c.vw / (c.vw + c.vh))) / 4 + 0.0001 : hs(i, 1), [bx, by, nx, ny] = perimAt(c, t + (corner ? 0 : 0), -1), d = hs(i, 3) * hs(i, 3) * (corner ? 20 : 12)
      glow(bx - nx * d, by - ny * d, 5 + hs(i, 4) * (corner ? 11 : 7), hs(i, 5) > 0.5 ? '#ffffff' : '#bfe6ff', a * (0.3 + 0.3 * hs(i, 6))) }
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = c.x + sx * c.vw / 2, y = c.y + sy * c.vh / 2; glow(x, y, 24, '#bfe6ff', 0.45 * a); glow(x, y, 11, '#ffffff', 0.5 * a) }
    // žibantys kristalėliai
    for (let i = 0; i < 9; i++) { const x = c.x + (hs(i, 7) - 0.5) * c.vw * 0.95, y = c.y + (hs(i, 8) - 0.5) * c.vh * 0.95, k = Math.pow(Math.max(0, Math.sin(time / 300 + i * 2.4)), 6); if (k < 0.02) continue
      glow(x, y, 8 * k, '#ffffff', a * k); softBeam(x - 11 * k, y, x + 11 * k, y, 2.2, '#ffffff', a * k); softBeam(x, y - 11 * k, x, y + 11 * k, 2.2, '#ffffff', a * k) }
    const gx = c.x - c.vw + ((time / 9) % (c.vw * 4)); if (gx < c.x + c.vw / 2 + 20) softBeam(gx - 14, c.y + c.vh / 2, gx + 14, c.y - c.vh / 2, 11, '#ffffff', 0.3 * a)
    if (live && Math.random() < 0.12 * a) pt(c.x + rnd(-c.vw / 2, c.vw / 2), c.y + c.vh / 2, rnd(-0.2, 0.2), rnd(0.2, 0.6), rnd(700, 1200), rnd(10, 18), '#cfeeff', 2)
    if (live && Math.random() < 0.15 * a) pt(c.x + rnd(-c.vw / 2, c.vw / 2), c.y - c.vh / 2, rnd(-0.2, 0.2), rnd(0.3, 0.9), rnd(600, 1000), rnd(1.5, 3), '#ffffff') },
  stunned(c, a) { const oy = c.y - c.vh * 0.5 - 9; ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { const an = time / 240 + i * TAU / 3 - j * 0.22, x = c.x + Math.cos(an) * c.vw * 0.38, y = oy + Math.sin(an) * 7; glow(x, y, 9 - j * 2, '#ffe89a', a * (1 - j * 0.24)); if (!j) glow(x, y, 4, '#ffffff', a) }
    glow(c.x, oy, c.vw * 0.5, '#ffd24a', 0.18 * a)
    if (live && Math.random() < 0.05 * a) { const [x, y] = perim(c, 2), an = rnd(0, TAU), r = rnd(12, 26); at(0, () => bolt(x, y, x + Math.cos(an) * r, y + Math.sin(an) * r, 90, '#ffe89a', 1.2, 4)) } },
  poisoned(c, a) { const by = c.y + c.vh * 0.5; ctx.globalCompositeOperation = 'lighter'; glow(c.x, by, c.vw * 0.75, '#4d7c0f', 0.4 * a); glow(c.x, c.y, c.vh * 0.7, '#84cc16', 0.14 * a * (0.7 + 0.3 * Math.sin(time / 260)))
    if (live && Math.random() < 0.22 * a) pt(c.x + rnd(-c.vw / 2, c.vw / 2), by - 2, 0, rnd(0.3, 0.9), rnd(500, 800), rnd(3, 5), '#84cc16', 0, 0.1)
    if (live && Math.random() < 0.18 * a) pt(c.x + rnd(-c.vw / 2, c.vw / 2), by - rnd(4, c.vh * 0.5), rnd(-0.15, 0.15), -rnd(0.4, 1), rnd(500, 900), rnd(2.5, 5), '#bef264')
    if (live && Math.random() < 0.06 * a) pt(c.x + rnd(-c.vw / 2, c.vw / 2), by, rnd(-0.2, 0.2), -rnd(0.2, 0.5), rnd(900, 1400), rnd(14, 22), '#3f6212', 2) },
  silenced(c, a) { const hw = c.vw / 2 + 7; ctx.globalCompositeOperation = 'source-over'; softBeam(c.x - hw, c.y, c.x + hw, c.y, 24, '#07030c', 0.9 * a)
    ctx.globalCompositeOperation = 'lighter'; for (const d of [-10, 10]) softBeam(c.x - hw, c.y + d, c.x + hw, c.y + d, 3, '#a855f7', 0.7 * a)
    const gx = c.x + Math.sin(time / 420) * hw * 0.9; glow(gx, c.y - 10, 9, '#c4a5ff', 0.9 * a); glow(c.x - (gx - c.x), c.y + 10, 9, '#c4a5ff', 0.9 * a); glow(c.x, c.y, c.vw * 0.7, '#3b0764', 0.3 * a)
    if (live && Math.random() < 0.12 * a) { const an = rnd(0, TAU), r = rnd(50, 80); pt(c.x + Math.cos(an) * r, c.y + Math.sin(an) * r * 0.5, -Math.cos(an) * r / 30, -Math.sin(an) * r / 60, 480, rnd(2, 3.5), '#c4a5ff', 0, 0, 1) } },
  blessed(c, a) { const oy = c.y - c.vh * 0.5 - 10; ctx.globalCompositeOperation = 'lighter'; softBeam(c.x, c.y - c.vh * 1.15, c.x, c.y - c.vh * 0.2, c.vw * 0.8, '#ffe08a', 0.16 * a)
    for (let i = 0; i < 16; i++) { const an = i / 16 * TAU + time / 1500; glow(c.x + Math.cos(an) * c.vw * 0.33, oy + Math.sin(an) * 6, 6, '#fff4c2', a * (0.65 + 0.3 * Math.sin(time / 200 + i))) } glow(c.x, oy, c.vw * 0.45, '#ffe08a', 0.3 * a); glow(c.x, c.y, c.vh * 0.7, '#fff4c2', 0.1 * a)
    if (live && Math.random() < 0.18 * a) pt(c.x + rnd(-c.vw / 2, c.vw / 2), c.y + rnd(-c.vh * 0.2, c.vh * 0.5), 0, -rnd(0.4, 1.1), rnd(700, 1100), rnd(2, 3.5), pick(['#fff4c2', '#ffe08a'])) },
  shield(c, a) { ctx.globalCompositeOperation = 'lighter'; glow(c.x, c.y, c.vh * 0.8, '#6ec3ff', 0.16 * a); glow(c.x - c.vw * 0.3, c.y - c.vh * 0.4, c.vw * 0.5, '#dff4ff', 0.16 * a)
    for (const d of [1, -1]) for (let i = 0; i < 22; i++) { const an = i / 22 * TAU + d * time / 1300, tilt = d * 0.5, ex = Math.cos(an) * c.vw * 0.72, ey = Math.sin(an) * c.vh * 0.64, x = c.x + ex * Math.cos(tilt) - ey * Math.sin(tilt) * 0.25, y = c.y + ey + ex * Math.sin(tilt) * 0.2; glow(x, y, 6.5, i % 4 ? '#6ec3ff' : '#ffffff', a * (0.35 + 0.5 * Math.max(0, Math.sin(an * 2 + time / 500)))) } },
  taunt(c, a) { const s = (time / 950) % 1; ctx.globalCompositeOperation = 'lighter'; glow(c.x, c.y, c.vh * 0.75, '#b91c1c', 0.2 * a)
    for (let i = 0; i < 26; i++) { const [x, y, nx, ny] = perimAt(c, i / 26, 3); glow(x, y, 7, i % 2 ? '#ff4a4a' : '#ffb347', 0.55 * a); glow(x + nx * s * 20, y + ny * s * 20, 9 * (1 - s) + 2, '#ff7a1a', (1 - s) * 0.8 * a) } },
  sprint(c, a, sd) { ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 5; i++) { const u = (time / (360 + sd[i] * 240) + sd[i + 5]) % 1, y = c.y + (sd[i] - 0.5) * c.vh * 0.95, x = c.x - c.vw + u * c.vw * 2, k = Math.sin(u * Math.PI); softBeam(x - 34, y, x, y, 3.5, '#dff4ff', 0.75 * a * k); glow(x, y, 4, '#ffffff', a * k) }
    glow(c.x - c.vw * 0.5, c.y, c.vw * 0.5, '#9fdcff', 0.12 * a) },
  stealth(c, a) { dark(c.x + Math.sin(time / 700) * c.vw * 0.4, c.y + Math.cos(time / 900) * c.vh * 0.3, 60, 0.4 * a); dark(c.x - Math.sin(time / 800) * c.vw * 0.4, c.y - Math.cos(time / 600) * c.vh * 0.3, 50, 0.35 * a)
    ctx.globalCompositeOperation = 'lighter'; glow(c.x, c.y, c.vh * 0.7, '#4c1d95', 0.14 * a)
    if (live && Math.random() < 0.2 * a) { const [x, y] = perim(c, 0); pt(x, y, rnd(-0.4, 0.4), -rnd(0.1, 0.6), rnd(800, 1300), rnd(14, 24), pick(['#12081f', '#1c1026']), 2) } },
  cantAttack(c, a) { const hw = c.vw / 2 + 5, hh = c.vh / 2 + 5
    for (const d of [1, -1]) { ctx.globalCompositeOperation = 'source-over'; softBeam(c.x - hw, c.y - d * hh, c.x + hw, c.y + d * hh, 8, '#0c0c12', 0.9 * a)
      ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 15; i++) { const u = i / 14, x = c.x + (u - 0.5) * hw * 2, y = c.y + d * (u - 0.5) * hh * 2; glow(x, y, i % 2 ? 6 : 4, i % 2 ? '#cfd6e4' : '#8a93a6', 0.85 * a) } }
    ctx.globalCompositeOperation = 'lighter'; glow(c.x, c.y, 13 + Math.sin(time / 300) * 2, '#ff7a1a', 0.8 * a); glow(c.x, c.y, 6, '#fff3c8', a) },
  immortal(c, a) { ctx.globalCompositeOperation = 'lighter'; glow(c.x, c.y, c.vh * 0.8, '#ffe08a', 0.22 * a)
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + time / 3000, L = c.vh * (0.85 + 0.12 * Math.sin(time / 400 + i * 2)); softBeam(c.x + Math.cos(an) * 20, c.y + Math.sin(an) * 20, c.x + Math.cos(an) * L, c.y + Math.sin(an) * L, 14, '#ffe08a', 0.16 * a) }
    for (let i = 0; i < 5; i++) { const x = c.x + (i - 2) * c.vw * 0.17, y = c.y - c.vh * 0.5 - 9 - (i % 2 ? 0 : 7) - (i === 2 ? 4 : 0); glow(x, y, 6, '#ffe08a', a * (0.7 + 0.3 * Math.sin(time / 180 + i * 1.3))); glow(x, y, 2.5, '#ffffff', a) } },
}
const sceneOn = (targetEl: HTMLElement, o: { hooks?: FxHooks; root?: HTMLElement | null }): Scene | null => {
  if (!fxStage.available() || !ensureCanvas(o.root)) return null
  const host = cv!.parentElement ?? document, tm = measure(targetEl); const sc = makeScene({ x: tm.px, y: tm.py }, tm.w / CW, targetEl, o.hooks, false, host); enter(sc); return sc
}
/** Nuolatinis statuso vaizdas ant kortos (peržiūroje – `dur` ms; žaidime gyvuotų, kol statusas uždėtas). */
export function playStatus(id: FxStatusId, el: HTMLElement, dur = 5000, o: { root?: HTMLElement | null } = {}): void {
  const sc = sceneOn(el, o); if (!sc || !STATUS4[id]) return
  const c = sc.S, sd = [...Array(12)].map(() => Math.random())
  const TINT: Partial<Record<FxStatusId, [string, number]>> = { burning: ['#ff7a1a', 0.22], frozen: ['#8fd3ff', 0.5], poisoned: ['#84cc16', 0.25], silenced: ['#3b0764', 0.35], stunned: ['#ffe89a', 0.15], immortal: ['#ffe08a', 0.2] }
  const tn = TINT[id]; if (tn) { c.tint = tn[0]; tw(c, { tintA: tn[1] }, 350); at(dur - 350, () => tw(c, { tintA: 0 }, 350)) }
  if (id === 'stealth') { tw(c, { alpha: 0.45 }, 400); at(dur - 400, () => tw(c, { alpha: 1 }, 400)) }
  fx(dur, (p) => STATUS4[id](c, Math.min(1, p * dur / 350, (1 - p) * dur / 350), sd), id === 'shield' || id === 'immortal' || id === 'blessed' ? 0 : 1)
  kick()
}

// ══ Reakcija (grandinės) ir prakeiksmas (besijuokiantis demonas) – v4 ════════
function link4(x: number, y: number, an: number, i: number, a: number, hot = 0) {
  if (a <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.rotate(an); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a > 1 ? 1 : a
  ctx.lineWidth = 4.6; ctx.strokeStyle = '#07050c'; ctx.beginPath(); ctx.ellipse(0, 0, 7.5, i % 2 ? 2.4 : 4.4, 0, 0, TAU); ctx.stroke()
  ctx.lineWidth = 2.1; ctx.strokeStyle = i % 2 ? '#b4bccd' : '#7f889c'; ctx.stroke(); ctx.restore()
  if (hot > 0) { ctx.globalCompositeOperation = 'lighter'; glow(x, y, 8, '#c4a5ff', hot * a) }
}
/** Reakcija: grandinė su antgaliu išlekia iš reakcijos kortos, apsiveja taikinį, susiveržia ir sutrūksta. */
export function playReaction(from: Pt, targetEl: HTMLElement, o: { sourceEl?: HTMLElement | null; hooks?: FxHooks; root?: HTMLElement | null } = {}): number {
  const sc = sceneOn(targetEl, o); if (!sc) return 0
  const c = sc.S, f = { x: X + (from.x - sc.cx) / sc.k, y: Y + (from.y - sc.cy) / sc.k }
  let src: VCard | null = null; if (o.sourceEl && o.sourceEl !== targetEl) { src = mkCard(o.sourceEl, sc, false); sc.cards.push(src) }
  const T0 = 200, T1 = 520, T2 = 480, HOLD = 260, H = T0 + T1 + T2 + HOLD
  const len = Math.hypot(c.x - f.x, c.y - f.y) || 1, N = Math.max(8, Math.round(len / 12)), ARC = -Math.min(70, len * 0.22)
  const pathPt = (q: number, arc: number, sway: number, i: number): [number, number] => { const [x, y] = bez(f, c, arc, q), w = Math.sin(time / 120 + i * 0.6) * 4 * sway * Math.sin(q * Math.PI); return [x - (c.y - f.y) / len * w, y + (c.x - f.x) / len * w] }
  // P0 – aptikimas
  dim(0.55, H + 500); hitstop(90); flash('#c4a5ff', 0.14, 180)
  if (src) { const s = src; tw(s, { s: 1.16 }, 100); at(150, () => tw(s, { s: 1 }, 260, eob)); tint(s, '#c4a5ff', 0.85, 450) }
  dotRing(f.x, f.y, 110, 360, '#a855f7', 22); dotRing(f.x, f.y, 60, 280, '#ffffff', 14); burst(f.x, f.y, 14, { v: [2, 8], life: [200, 450], size: [2, 4], colors: ['#ffffff', '#c4a5ff'], dr: 0.9 })
  // P1–P3 – grandinė (skrydis → įtempta → sutrūksta)
  fx(H - T0, (p) => { const t = p * (H - T0), head = t < T1 ? eo(t / T1) : 1, tight = eo(cl((t - T1 - 300) / 180)), arc = ARC * (1 - tight), sway = 1 - tight
    for (let i = N; i >= 0; i--) { const q = head - i / N; if (q < 0) continue; const [x, y] = pathPt(q, arc, sway, i), [x2, y2] = pathPt(Math.min(1, q + 0.02), arc, sway, i); link4(x, y, Math.atan2(y2 - y, x2 - x), i, 1, t < T1 && i < 3 ? 0.9 : 0.15) }
    if (t < T1) { const [x, y] = pathPt(head, arc, sway, 0), [xb, yb] = pathPt(Math.max(0, head - 0.03), arc, sway, 0), an = Math.atan2(y - yb, x - xb), cs = Math.cos(an), sn = Math.sin(an)
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#dfe6f0'; ctx.strokeStyle = '#07050c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + cs * 16, y + sn * 16); ctx.lineTo(x - cs * 6 - sn * 8, y - sn * 6 + cs * 8); ctx.lineTo(x - cs * 2, y - sn * 2); ctx.lineTo(x - cs * 6 + sn * 8, y - sn * 6 - cs * 8); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.globalCompositeOperation = 'lighter'; glow(x + cs * 8, y + sn * 8, 14, '#c4a5ff', 0.9); glow(x + cs * 12, y + sn * 12, 5, '#ffffff', 1); if (live) pt(x, y, rnd(-0.6, 0.6), rnd(-0.6, 0.6), rnd(200, 400), rnd(2, 4), pick(['#c4a5ff', '#ffffff'])) }
    // apsivijimas: dvi kilpos aplink kortą
    const g = eo(cl((t - T1) / 300)); if (g > 0) { const shr = 1 - 0.2 * tight
      for (const L of [-1, 1]) for (let i = 0; i < 20; i++) { const u = i / 20; if (u > g) break; const an = -Math.PI / 2 + L * u * TAU, rx = (c.vw * 0.5 + 12) * shr, ex = Math.cos(an) * rx, ey = Math.sin(an) * 11, tl = L * 0.2
        link4(c.x + ex * Math.cos(tl) - ey * Math.sin(tl), c.y + L * c.vh * 0.17 + ex * Math.sin(tl) + ey * Math.cos(tl), an + Math.PI / 2 + tl, i, Math.sin(an) > 0 ? 1 : 0.4, 0.2 + 0.5 * tight) } } })
  at(T0 + T1, () => { pop(c.x, c.y, 80, '#c4a5ff', 200); cshake(c, 4); knock(c, 3) })
  at(T0 + T1 + 300, () => { tw(c, { sx: 0.93, sy: 0.97 }, 180, eob); cshake(c, 6); shake(5); tint(c, '#3b0764', 0.5, 600) })
  // P4 – sutrūksta + kontrsmūgis
  at(H, () => { tw(c, { sx: 1, sy: 1 }, 220, eob)
    for (let i = 0; i <= N; i += 1) { const [x, y] = pathPt(i / N, 0, 0, i); pt(x, y, rnd(-3, 3), rnd(-4, 1), rnd(350, 700), rnd(4, 7), pick(['#b4bccd', '#7f889c']), 1, 0.25, 0.96); if (i % 2) pt(x, y, rnd(-2, 2), rnd(-2, 2), rnd(200, 400), rnd(2, 4), '#c4a5ff') }
    burst(c.x, c.y, 18, { v: [3, 9], life: [350, 700], size: [4, 8], colors: ['#b4bccd', '#7f889c', '#dfe6f0'], k: 1, g: 0.25, dr: 0.95 }); burst(c.x, c.y, 16, { v: [2, 9], life: [200, 450], size: [2, 4.5], colors: ['#ffffff', '#c4a5ff'], dr: 0.9 })
    pop(c.x, c.y, 135, '#c4a5ff', 280); dotRing(c.x, c.y, 115, 360, '#a855f7'); flash('#c4a5ff', 0.2, 220); tint(c, '#ffffff', 0.85, 300); knock(c, 7); cshake(c, 9); shake(9); hitstop(65) })
  kick(); return H
}
/** Prakeiksmas: plyšys ir nagai → iš dūmų išnyra besijuokiantis demonas → įspaudas. */
export function playCurse(targetEl: HTMLElement, o: { hooks?: FxHooks; root?: HTMLElement | null } = {}): number {
  const sc = sceneOn(targetEl, o); if (!sc) return 0
  const c = sc.S, by = c.y + c.vh * 0.6, RISE = 650, DEM = 2500, END = RISE + DEM
  dim(0.74, END + 300)
  fx(END, (p) => { const a = Math.min(1, p / 0.1, (1 - p) / 0.2), g = eo(cl(p / 0.15)); dark(c.x, by, c.vw * 1.6 * g, 0.9 * a); ctx.globalCompositeOperation = 'lighter'; glow(c.x, by, c.vw * 1.1 * g, '#7a0010', 0.6 * a)
    for (let i = 0; i < 38; i++) { const an = i / 38 * TAU - time / 1100; glow(c.x + Math.cos(an) * c.vw * 1.45 * g, by + Math.sin(an) * c.vh * 0.3 * g, 12 + 7 * Math.sin(i * 1.9 + time / 160), i % 3 ? '#b91c1c' : '#ff5a4a', 0.75 * a) } }, 0)
  const TD = [...Array(5)].map((_, k) => ({ dx: (k - 2) * c.vw * 0.42, ph: rnd(0, TAU), h: c.vh * rnd(1.0, 1.25) }))
  fx(END - 200, (p) => { const t = p * (END - 200), g = eo(cl(t / 500)), close = eo(cl((t - 450) / 260)), a = t > END - 600 ? Math.max(0, (END - 200 - t) / 400) : 1
    for (const d of TD) { let px = c.x + d.dx, py = by; for (let s = 1; s <= 10; s++) { const u = s / 10; if (u > g) break; const x = c.x + d.dx * (1 - u * u * 0.85 * close) + Math.sin(time / 190 + d.ph + u * 4) * 7 * u * (1 - close * 0.6), y = by - d.h * u
        ctx.globalCompositeOperation = 'source-over'; softBeam(px, py, x, y, 11 * (1 - u) + 3, '#0a0206', a); ctx.globalCompositeOperation = 'lighter'; softBeam(px, py, x, y, 4 * (1 - u) + 1, '#dc2626', a * 0.65); if (s === 10) glow(x, y, 7, '#ff5a4a', a); px = x; py = y } } }, 0)
  fx(END - 300, () => { if (live && Math.random() < 0.5) pt(c.x + rnd(-c.vw, c.vw), by + rnd(-6, 6), rnd(-0.3, 0.3), -rnd(0.6, 2), rnd(500, 900), rnd(2, 4.5), pick(['#ff5a4a', '#b91c1c'])) })
  at(300, () => cshake(c, 4)); at(520, () => { cshake(c, 6); tint(c, '#000000', 0.55, DEM) })
  // besijuokiantis demonas (tas pats veidas kaip dabar žaidime), didesnis ir su juoko smūgiais
  at(RISE, () => { flash('#3b0008', 0.4, 260); shake(8); hitstop(60)
    const it = { to: { x: 0, y: 0 }, rect: { x: 0, y: 0, w: 0, h: 0 }, dur: DEM }
    fx(DEM, (p) => { const k = BS * sc.k, px = BS * sc.cx + BX, py = BS * (sc.cy - c.vh * 0.12 * sc.k) + BY, w = c.vw * 1.7 * k, h = c.vh * 1.7 * k
      it.to.x = px; it.to.y = py; it.rect.x = px - w / 2; it.rect.y = py - h / 2; it.rect.w = w; it.rect.h = h
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; try { drawCurseDemon(ctx, it, p, BS, performance.now()) } finally { ctx.restore() } })
    for (const ms of [520, 800, 1080, 1360, 1640]) at(ms, () => { shake(4); cshake(c, 5); burst(c.x, c.y - c.vh * 0.1, 6, { v: [2, 6], life: [300, 600], size: [2, 4], colors: ['#ff7a1a', '#ff5a4a'], up: -1 }) }) })
  at(END - 250, () => { fx(420, (p) => { dark(c.x, c.y, 120 * (1 - p * 0.5), 0.95 * (1 - p)); ctx.globalCompositeOperation = 'lighter'; glow(c.x, c.y, 150 * (1 - p), '#dc2626', 0.9 * (1 - p)) })
    flash('#3b0008', 0.45, 300); shake(10); hitstop(80); burst(c.x, c.y, 22, { v: [2, 8], life: [400, 800], size: [3, 6], colors: ['#ff5a4a', '#b91c1c', '#1a0206'] }); tint(c, '#7a0010', 0.95, 1200); knock(c, -6); cshake(c, 9); rise(c, 1000, ['#ff5a4a', '#b91c1c'], 0.6) })
  kick(); return END - 250
}
