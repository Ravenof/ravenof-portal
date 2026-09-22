'use client'

// ── Scenų FX sluoksnis: ŽMK skrydis + Kovos šūksnis / Paskutinis noras / Trigeris ──
// Aprobuotas vizualas: ravenof-fx-preview-zmk-keywords.html (2026-09-22).
// Planas: ZMK-IR-RAKTAZODZIU-FX-PLANAS.md.
//
// Šis sluoksnis, kaip ir ReactionChainLayer, turi GAMEPLAY VARTUS: `playKeyword` /
// `playZmk` grąžina Promise, kuris išsisprendžia tuo momentu, kai LEIDŽIAMA
// taikyti žaidimo būseną (raktažodis – po antspaudo ant taikinio; ŽMK – smūgio
// momentu po apsivertimo). Visa, kas vyksta po to (ŽMK rezultatas kabo 2,5 s,
// juostelė gęsta), yra dekoratyvu ir kovos nestabdo. `cancel()`/unmount vis
// tiek išsprendžia visus laukiančius Promise – eilė niekada neužstringa.
//
// Technika (kaip kituose kovos sluoksniuose): vienas <canvas>, vienas rAF (sukasi
// tik kol yra darbų), koordinatės – viewport CSS px iš DOM rect'ų su gyvu
// `track()` getter'iu (ką tik iškviesta korta dar juda), jokio shadowBlur/filter,
// dalelių biudžetas pagal įrenginį, reduced-motion → trumpas blyksnis.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { KEYWORD_FX, KEYWORD_FX_COMPACT_SCALE, KEYWORD_FX_REDUCED_MS, ZMK_DRAW } from '@/lib/game/timing'
import { playBattleSound } from '@/lib/game/soundManager'

export type SceneKeywordKind = 'battlecry' | 'lastwish' | 'trigger'
export type SceneBox = { x: number; y: number; w: number; h: number; track?: () => { x: number; y: number; w: number; h: number } | null }

export type SceneKeywordOpts = {
  kind: SceneKeywordKind
  from: SceneBox
  targets: SceneBox[]
  /** Juostelės tekstas (jau išverstas): antraštė + kortos vardas. */
  title: string
  cardName: string
  compact?: boolean
  reduced?: boolean
  tempo?: number
}

export type SceneZmkDrawOpts = {
  /** ŽMK kaladė, iš kurios kyla korta. */
  pile: SceneBox
  target: SceneBox
  value: string
  /** Pranašumas/nepalankumas: dvi kortos, `picked` lieka, kita subyra. */
  pair?: [string, string]
  picked?: string
  faceUrl: (v: string) => string | null
}
export type SceneZmkOpts = {
  draws: SceneZmkDrawOpts[]
  backUrl: string
  reduced?: boolean
  tempo?: number
}

export type SceneFxHandle = {
  playKeyword: (o: SceneKeywordOpts) => Promise<void>
  playZmk: (o: SceneZmkOpts) => Promise<void>
  cancel: () => void
  busy: () => boolean
}

// ── matematika ───────────────────────────────────────────────────────────────
const TAU = Math.PI * 2
const cl = (t: number) => Math.max(0, Math.min(1, t))
const eo = (t: number) => 1 - Math.pow(1 - t, 3)
const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const eb = (t: number) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
type P2 = { x: number; y: number }
const bez = (p0: P2, p1: P2, p2: P2, t: number): P2 => {
  const a = 1 - t
  return { x: a * a * p0.x + 2 * a * t * p1.x + t * t * p2.x, y: a * a * p0.y + 2 * a * t * p1.y + t * t * p2.y }
}
const hexA = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }

type Palette = { main: string; soft: string; hot: string }
const PAL: Record<SceneKeywordKind, Palette> = {
  battlecry: { main: '#f0b429', soft: '#ffd97a', hot: '#fff6dd' },
  lastwish: { main: '#a78bfa', soft: '#c4b5fd', hot: '#efe9ff' },
  trigger: { main: '#38bdf8', soft: '#7dd3fc', hot: '#e0f2fe' },
}
const ZCOL: Record<string, string> = { '+0': '#e8dcb5', '+1': '#4ade80', '+2': '#4ade80', '-1': '#f87171', '-2': '#f87171', x2: '#ff6a3d', x0: '#9aa0ad' }
const zcol = (v: string) => ZCOL[v] ?? '#e8dcb5'

type Particle = { x: number; y: number; vx: number; vy: number; l: number; d: number; r: number; c: string; g: number; line?: boolean }
type Box = { x: number; y: number; w: number; h: number }

/** Dalelių biudžetas pagal įrenginį (tas pats principas kaip PackOpen / KeywordFx). */
function fxBudget(): number {
  if (typeof window === 'undefined') return 0
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const mem = nav.deviceMemory ?? 4
  if (cores <= 4 || mem <= 3) return 0.45
  if (cores <= 6) return 0.7
  return 1
}

type Job = {
  t0: number
  resolveAt: number
  endAt: number
  resolve: () => void
  resolved: boolean
  draw: (t: number, now: number) => void
}

const imgCache = new Map<string, HTMLImageElement>()
function img(url: string | null): HTMLImageElement | null {
  if (!url) return null
  let im = imgCache.get(url)
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = url; imgCache.set(url, im) }
  return im.complete && im.naturalWidth > 0 ? im : null
}
/** Iš anksto pakrauna ŽMK kortas (kad pirmas flip'as nebūtų tuščias). */
export function preloadSceneImages(urls: (string | null | undefined)[]) {
  for (const u of urls) if (u) img(u)
}

export const SceneFxLayer = forwardRef<SceneFxHandle>(function SceneFxLayer(_props, ref) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const jobs = useRef<Job[]>([])
  const parts = useRef<Particle[]>([])
  const rafRef = useRef(0)
  const tickRef = useRef<(() => void) | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const budget = useRef(1)

  const boxOf = (b: SceneBox): Box => b.track?.() ?? b
  const spawn = (n: number, f: () => Particle) => { n = Math.round(n * budget.current); for (let i = 0; i < n; i++) parts.current.push(f()) }
  const kick = () => { if (!rafRef.current && tickRef.current) rafRef.current = requestAnimationFrame(tickRef.current) }
  const addJob = (j: Omit<Job, 'resolved'>) => { jobs.current.push({ ...j, resolved: false }); kick() }

  // ── piešimo pagalbininkai (be shadowBlur: švytėjimas = radialinis gradientas) ──
  const glow = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, a: number) => {
    if (r <= 0 || a <= 0) return
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, hexA(c, a)); g.addColorStop(0.5, hexA(c, a * 0.35)); g.addColorStop(1, hexA(c, 0))
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
  }
  const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  }
  const ring = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, a: number, lw: number) => {
    ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1
  }
  const runeRing = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, P: Palette, a: number) => {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot * TAU)
    ctx.strokeStyle = P.soft; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke()
    ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.arc(0, 0, r - 7, 0, TAU); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = P.hot
    for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; ctx.save(); ctx.translate(Math.cos(ang) * r, Math.sin(ang) * r); ctx.rotate(ang); ctx.fillRect(-2, -4, 4, 8); ctx.restore() }
    ctx.restore()
    glow(ctx, x, y, r, P.main, 0.18 * a)
  }
  const cardOutline = (ctx: CanvasRenderingContext2D, b: Box, c: string, a: number, scale = 1) => {
    if (a <= 0) return
    const w = b.w * scale, h = b.h * scale
    glow(ctx, b.x, b.y, Math.max(w, h) * 0.75, c, 0.35 * a)
    ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = 2; rr(ctx, b.x - w / 2, b.y - h / 2, w, h, 7); ctx.stroke(); ctx.globalAlpha = 1
  }
  const sealMark = (ctx: CanvasRenderingContext2D, kind: SceneKeywordKind, tg: Box, P: Palette, u: number, now: number) => {
    const s = eb(Math.min(1, u * 1.4))
    ctx.save(); ctx.translate(tg.x, tg.y - tg.h / 2 - 6); ctx.scale(s, s); ctx.globalAlpha = Math.min(1, u * 3)
    if (kind === 'battlecry') {
      glow(ctx, 0, 0, 26, P.main, 0.55); ctx.strokeStyle = P.hot; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke()
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.lineTo(Math.cos(a) * 19, Math.sin(a) * 19) } ctx.stroke()
      ctx.fillStyle = P.hot; ctx.font = 'bold 12px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('!', 0, 4)
    } else if (kind === 'lastwish') {
      glow(ctx, 0, 0, 26, P.main, 0.55); ctx.fillStyle = P.hot
      ctx.beginPath(); ctx.ellipse(0, -2, 5, 10 + Math.sin(now / 60) * 1.5, 0, 0, TAU); ctx.fill()
      ctx.strokeStyle = P.soft; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.stroke()
    } else {
      runeRing(ctx, 0, 0, 17, now / 700, P, 1)
    }
    ctx.restore()
  }
  const ribbon = (ctx: CanvasRenderingContext2D, x: number, y: number, P: Palette, title: string, name: string, a: number, s: number) => {
    if (a <= 0) return
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s)
    ctx.font = '900 10px system-ui, sans-serif'; const lw = ctx.measureText(title).width
    ctx.font = '700 10px Georgia, serif'; const nw = ctx.measureText(name).width
    const w = Math.max(110, lw + nw + 44), vw = sizeRef.current.w
    // neišeiti už ekrano
    const half = w / 2, dx = Math.max(8 + half - x, Math.min(0, vw - 8 - half - x))
    ctx.translate(dx, 0)
    ctx.fillStyle = 'rgba(8,6,12,0.94)'; rr(ctx, -half, -11, w, 22, 6); ctx.fill()
    ctx.strokeStyle = P.main; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = P.main; ctx.fillRect(-half, -11, 4, 22)
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = P.soft; ctx.font = '900 10px system-ui, sans-serif'; ctx.fillText(title, -half + 12, 4)
    ctx.fillStyle = '#e8dcb5'; ctx.font = '700 10px Georgia, serif'; ctx.fillText('· ' + name, -half + 12 + lw + 5, 4)
    ctx.restore()
  }

  // ── RAKTAŽODŽIO SCENA: paskelbimas prie šaltinio → kelias → antspaudas ant taikinio ──
  const playKeyword = useCallback((o: SceneKeywordOpts): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !ctxRef.current) { resolve(); return }
      const tempo = o.tempo ?? 1
      const P = PAL[o.kind]
      const now0 = performance.now()
      if (o.reduced) {
        // Reduced-motion: trumpas blyksnis ant šaltinio ir taikinių, be kelio.
        const D = KEYWORD_FX_REDUCED_MS
        addJob({
          t0: now0, resolveAt: now0 + D, endAt: now0 + D, resolve,
          draw: (t) => {
            const ctx = ctxRef.current!; const u = cl(t / D); const a = Math.sin(u * Math.PI)
            cardOutline(ctx, boxOf(o.from), P.main, a)
            for (const tg of o.targets) cardOutline(ctx, boxOf(tg), P.main, a)
          },
        })
        return
      }
      const sc = (o.compact ? KEYWORD_FX_COMPACT_SCALE : 1) * tempo
      const ann = KEYWORD_FX.announceMs * sc, trav = KEYWORD_FX.travelMs * sc, seal = KEYWORD_FX.sealMs * sc
      const linger = KEYWORD_FX.ribbonLingerMs * tempo
      const ta = ann, tt = ann + trav, ts = tt + seal
      const sealed = new Set<number>()
      let announced = false
      if (o.kind === 'battlecry') playBattleSound('summon', 0.25)
      else if (o.kind === 'lastwish') playBattleSound('curse', 0.25)
      else playBattleSound('spellCast', 0.3)
      addJob({
        t0: now0, resolveAt: now0 + ts, endAt: now0 + ts + linger, resolve,
        draw: (t, now) => {
          const ctx = ctxRef.current!
          const src = boxOf(o.from)
          // juostelė prie šaltinio (visą sceną + linger)
          if (!o.compact) {
            const age = t, life = ts + linger
            const a = age < 160 ? eo(age / 160) : age > life - linger ? cl((life - age) / linger) : 1
            const s = age < 220 ? eb(cl(age / 220)) : 1
            ribbon(ctx, src.x, src.y - src.h / 2 - 18, P, o.title, o.cardName, a, s)
          }
          if (t < ta) {
            // A. PASKELBIMAS prie šaltinio
            const u = t / ta
            cardOutline(ctx, src, P.main, Math.min(1, u * 3) * (1 - u * 0.3), 1 + Math.sin(Math.min(1, u * 1.6) * Math.PI) * 0.05)
            if (o.kind === 'battlecry') {
              for (let i = 0; i < 3; i++) {
                const w = cl((u * 1.3 - i * 0.18) / 0.7); if (w <= 0 || w >= 1) continue
                ctx.globalAlpha = (1 - w) * 0.7; ctx.strokeStyle = P.soft; ctx.lineWidth = 2.5 * (1 - w) + 0.5
                ctx.beginPath(); ctx.ellipse(src.x, src.y, src.w * 0.5 + w * 70, src.h * 0.5 + w * 46, 0, 0, TAU); ctx.stroke()
              }
              ctx.globalAlpha = 1
              if (u < 0.5 && Math.random() < 0.6 * budget.current) parts.current.push({ x: src.x + rnd(-src.w / 2, src.w / 2), y: src.y + rnd(-src.h / 2, src.h / 2), vx: rnd(-10, 10), vy: rnd(-90, -40), l: 0.6, d: 0.6, r: 1.6, c: P.soft, g: 0 })
              if (!announced) { announced = true }
            } else if (o.kind === 'lastwish') {
              const y0 = src.y - src.h * 0.15 - u * 40
              glow(ctx, src.x, y0, 26 + Math.sin(now / 70) * 3, P.main, 0.5); glow(ctx, src.x, y0 - 6, 10, P.hot, 0.6)
              ctx.fillStyle = P.hot; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(src.x, y0, 5, 9 + Math.sin(now / 50) * 2, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
              if (Math.random() < 0.8 * budget.current) parts.current.push({ x: src.x + rnd(-14, 14), y: y0 + rnd(0, 20), vx: rnd(-12, 12), vy: rnd(-70, -30), l: 0.9, d: 0.9, r: rnd(1, 2.2), c: P.soft, g: 0 })
            } else {
              runeRing(ctx, src.x, src.y, Math.max(src.w, src.h) * 0.62 + (1 - eo(u)) * 20, now / 900, P, Math.min(1, u * 3))
            }
          } else if (t < tt) {
            // B. KELIAS šaltinis → taikinys (kometa su uodega; trigeriui – runų žaibas)
            const u = eio((t - ta) / trav)
            cardOutline(ctx, src, P.main, 0.6 * (1 - u))
            for (const tgb of o.targets) {
              const tg = boxOf(tgb)
              const p0 = { x: src.x, y: src.y }, p2 = { x: tg.x, y: tg.y }
              const mx = (p0.x + p2.x) / 2, my = (p0.y + p2.y) / 2, dx = p2.x - p0.x, dy = p2.y - p0.y, L = Math.hypot(dx, dy) || 1
              let nx = -dy / L, ny = dx / L; if (nx < 0) { nx = -nx; ny = -ny }
              const c1 = { x: mx + nx * 70, y: my + ny * 70 }
              const p = bez(p0, c1, p2, u)
              for (let i = 1; i <= 14; i++) {
                const q = bez(p0, c1, p2, Math.max(0, u - i * 0.016))
                ctx.globalAlpha = (1 - i / 14) * 0.8; ctx.fillStyle = i < 4 ? P.hot : P.soft
                ctx.beginPath(); ctx.arc(q.x, q.y, (1 - i / 14) * 5 + 1, 0, TAU); ctx.fill()
              }
              ctx.globalAlpha = 1
              if (o.kind === 'battlecry') {
                glow(ctx, p.x, p.y, 22, P.main, 0.7); ctx.fillStyle = P.hot; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill()
                spawn(2, () => ({ x: p.x, y: p.y, vx: rnd(-40, 40), vy: rnd(-40, 40), l: 0.35, d: 0.35, r: 1.8, c: P.soft, g: 0 }))
              } else if (o.kind === 'lastwish') {
                glow(ctx, p.x, p.y, 24, P.main, 0.6); ctx.fillStyle = P.hot; ctx.globalAlpha = 0.9
                ctx.beginPath(); ctx.ellipse(p.x, p.y, 5, 9, Math.atan2(dy, dx) + Math.PI / 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
                spawn(2, () => ({ x: p.x + rnd(-4, 4), y: p.y + rnd(-4, 4), vx: rnd(-15, 15), vy: rnd(-40, -10), l: 0.7, d: 0.7, r: 1.6, c: P.soft, g: 0 }))
              } else {
                ctx.strokeStyle = P.hot; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(p0.x, p0.y)
                const N = 10
                for (let i = 1; i <= N; i++) { const q = bez(p0, c1, p2, u * i / N); ctx.lineTo(q.x + (i < N ? rnd(-6, 6) : 0), q.y + (i < N ? rnd(-6, 6) : 0)) }
                ctx.stroke(); ctx.globalAlpha = 1; glow(ctx, p.x, p.y, 18, P.main, 0.7)
              }
            }
          } else {
            // C. ANTSPAUDAS ant taikinio (būsena dar netaikoma iki resolveAt)
            const u = cl((t - tt) / seal)
            o.targets.forEach((tgb, i) => {
              const tg = boxOf(tgb)
              cardOutline(ctx, tg, P.main, t < ts ? Math.min(1, u * 2.5) : cl(1 - (t - ts) / linger))
              if (!sealed.has(i)) {
                sealed.add(i)
                spawn(16, () => { const a = rnd(0, TAU), s = rnd(50, 150); return { x: tg.x, y: tg.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 0.5, d: 0.5, r: 2, c: P.soft, g: 0 } })
              }
              if (t < ts + linger * 0.5) sealMark(ctx, o.kind, tg, P, Math.min(1, u), now)
            })
          }
        },
      })
    })
  }, [])

  // ── ŽMK SCENA: kyla nuo kaladės → lankas → flip → SMŪGIS (resolve) → kabo → gęsta ──
  const playZmk = useCallback((o: SceneZmkOpts): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !ctxRef.current || o.draws.length === 0) { resolve(); return }
      const tempo = o.tempo ?? 1
      const Z = ZMK_DRAW
      const now0 = performance.now()
      // vienas „skrydžio įrašas" kiekvienai kortai (pair → dvi kortos tam pačiam taikiniui)
      type Fly = { d: SceneZmkDrawOpts; value: string; stagger: number; dx: number; loser: boolean; revealed: boolean; hit: boolean }
      const flies: Fly[] = []
      const perTarget = new Map<SceneBox, number>()
      o.draws.forEach((d, i) => {
        const vals = d.pair ? d.pair : [d.value]
        const n = perTarget.get(d.target) ?? 0
        vals.forEach((v, k) => {
          const idx = n + k
          flies.push({ d, value: v, stagger: (i + k) * Z.fanStaggerMs * tempo, dx: idx === 0 ? 0 : (idx % 2 ? 1 : -1) * Math.ceil(idx / 2), loser: !!d.pair && v !== (d.picked ?? d.value) && (d.pair[0] === d.pair[1] ? k === 1 : true), revealed: false, hit: false })
        })
        perTarget.set(d.target, n + vals.length)
      })
      const lastStagger = Math.max(...flies.map((f) => f.stagger))
      if (o.reduced) {
        const D = Z.reducedMs
        addJob({
          t0: now0, resolveAt: now0 + D * 0.7, endAt: now0 + D + Z.holdMs * 0.5, resolve,
          draw: (t) => {
            const ctx = ctxRef.current!
            for (const f of flies) {
              const tg = boxOf(f.d.target); const zw = Math.max(40, Math.min(60, tg.w * 0.62)), zh = zw * 72 / 52
              const dest = { x: tg.x + f.dx * zw * 0.7, y: Math.max(40 + zh / 2, tg.y - tg.h / 2 - zh * 0.55) }
              const u = cl(t / D), a = t > D + Z.holdMs * 0.3 ? cl(1 - (t - D - Z.holdMs * 0.3) / (Z.holdMs * 0.2)) : 1
              drawZmkCard(ctx, dest.x, dest.y, zw, zh, u > 0.5 ? img(f.d.faceUrl(f.value)) : img(o.backUrl), u > 0.5 ? zcol(f.value) : '#8b6d2f', Math.abs(Math.cos(u * Math.PI)), 1, 0, a, u > 0.5 ? f.value : null, f.loser && u > 0.5)
            }
          },
        })
        return
      }
      const tl = Z.liftMs * tempo, tf = tl + Z.flightMs * tempo, tp = tf + Z.flipMs * tempo
      const ti = tp + Z.impactDelayMs * tempo, th = tp + Z.holdMs * tempo, te = th + Z.fadeMs * tempo
      playBattleSound('draw', 0.35)
      addJob({
        t0: now0, resolveAt: now0 + ti + lastStagger, endAt: now0 + te + lastStagger, resolve,
        draw: (t0, now) => {
          const ctx = ctxRef.current!
          for (const f of flies) {
            const t = t0 - f.stagger; if (t < 0 || t >= te) continue
            const pile = boxOf(f.d.pile), tg = boxOf(f.d.target)
            const zw = Math.max(40, Math.min(60, tg.w * 0.62)), zh = zw * 72 / 52
            const dest = { x: tg.x + f.dx * zw * 0.7, y: Math.max(40 + zh / 2, tg.y - tg.h / 2 - zh * 0.55) }
            let x: number, y: number, rot = 0, sx = 1, face = false, alpha = 1, scale = 1
            const col = zcol(f.value)
            if (t < tl) {
              const k = eo(t / tl); x = pile.x; y = pile.y - k * 22; scale = 0.85 + 0.15 * k
              if (t < 40) spawn(6, () => ({ x: pile.x + rnd(-20, 20), y: pile.y - 30, vx: rnd(-40, 40), vy: rnd(-120, -40), l: 0.5, d: 0.5, r: 1.8, c: '#ffd97a', g: 0 }))
            } else if (t < tf) {
              const k = eio((t - tl) / (tf - tl))
              const p0 = { x: pile.x, y: pile.y - 22 }, mx = (p0.x + dest.x) / 2, my = Math.max(30, Math.min(p0.y, dest.y) - 70)
              const p = bez(p0, { x: mx, y: my }, dest, k)
              x = p.x; y = p.y; rot = (1 - k) * -0.35 + Math.sin(k * Math.PI) * 0.18; scale = 1 + Math.sin(k * Math.PI) * 0.22
              if (Math.random() < 0.9 * budget.current) parts.current.push({ x: p.x + rnd(-8, 8), y: p.y + rnd(-10, 10), vx: rnd(-30, 30), vy: rnd(-30, 30), l: 0.45, d: 0.45, r: rnd(1, 2.4), c: Math.random() < 0.5 ? '#ffd97a' : '#fff6dd', g: 0 })
            } else if (t < tp) {
              const k = (t - tf) / (tp - tf); x = dest.x; y = dest.y; sx = Math.abs(Math.cos(k * Math.PI)); face = k > 0.5
              if (k >= 0.5 && !f.revealed) {
                f.revealed = true
                playBattleSound('zmkFlip', 0.5)
                spawn(14, () => { const a = rnd(0, TAU), s = rnd(60, 180); return { x: dest.x, y: dest.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 0.5, d: 0.5, r: 2, c: col, g: 0 } })
              }
            } else if (t < th) {
              x = dest.x; y = dest.y; face = true
              if (f.loser) alpha = cl(1 - (t - tp - 400 * tempo) / (300 * tempo))
              if (f.value === 'x2' && !f.loser) glow(ctx, dest.x, dest.y, 70 + Math.sin(now / 60) * 6, '#ff6a3d', 0.45)
              if (f.value === 'x0' && !f.loser) alpha *= 0.85
            } else {
              x = dest.x; y = dest.y; face = true; alpha = 1 - (t - th) / (te - th); scale = 1 - (t - th) / (te - th) * 0.2
              if (f.loser) alpha = 0
            }
            if (alpha <= 0) continue
            if (face && t >= tp) ring(ctx, x, y, zw * 0.9 * (1 + cl((t - tp) / 300)), col, 0.5 * (1 - cl((t - tp) / 300)), 2)
            drawZmkCard(ctx, x, y, zw, zh, face ? img(f.d.faceUrl(f.value)) : img(o.backUrl), face ? col : '#8b6d2f', sx, scale, rot, alpha, face && t >= tp ? f.value : null, f.loser && face, face && t >= tp ? cl((t - tp) / (200 * tempo)) : 1)
          }
        },
      })
    })
  }, [])

  function drawZmkCard(ctx: CanvasRenderingContext2D, x: number, y: number, zw: number, zh: number, im: HTMLImageElement | null, col: string, sx: number, scale: number, rot: number, alpha: number, badge: string | null, loser: boolean, badgeK = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(Math.max(0.02, sx) * scale, scale)
    glow(ctx, 0, 0, zw * 1.1, col, 0.3)
    ctx.fillStyle = '#120e1c'; rr(ctx, -zw / 2, -zh / 2, zw, zh, 5); ctx.fill()
    if (im) { ctx.save(); rr(ctx, -zw / 2, -zh / 2, zw, zh, 5); ctx.clip(); ctx.drawImage(im, -zw / 2, -zh / 2, zw, zh); ctx.restore() }
    else if (badge) { ctx.fillStyle = '#f3ead3'; ctx.font = `900 ${Math.round(zw * 0.38)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.fillText(badge.replace('x', '×'), 0, zh * 0.12) }
    if (loser || badge === 'x0') { ctx.fillStyle = 'rgba(20,20,26,0.55)'; rr(ctx, -zw / 2, -zh / 2, zw, zh, 5); ctx.fill() }
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(ctx, -zw / 2, -zh / 2, zw, zh, 5); ctx.stroke()
    ctx.restore()
    if (badge && !loser) {
      const s = eb(badgeK)
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y + zh / 2 * scale + 13); ctx.scale(s, s)
      const txt = badge.replace('x', '×'), w = 34
      ctx.font = '900 12px Georgia, serif'
      ctx.fillStyle = 'rgba(8,6,12,0.94)'; rr(ctx, -w / 2, -9, w, 18, 4); ctx.fill()
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(txt, 0, 4)
      ctx.restore()
    }
  }

  const cancel = useCallback(() => {
    for (const j of jobs.current) if (!j.resolved) { j.resolved = true; j.resolve() }
    jobs.current = []; parts.current = []
  }, [])

  useImperativeHandle(ref, () => ({
    playKeyword, playZmk, cancel,
    busy: () => jobs.current.some((j) => !j.resolved),
  }), [playKeyword, playZmk, cancel])

  useEffect(() => {
    budget.current = fxBudget()
    const cv = cvRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctxRef.current = ctx
    const resize = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      sizeRef.current = { w: vw, h: vh }
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize(); window.addEventListener('resize', resize)
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const { w: vw, h: vh } = sizeRef.current
      ctx.clearRect(0, 0, vw, vh)
      const J = jobs.current
      for (const j of J) {
        const t = now - j.t0
        try { j.draw(t, now) } catch (err) { console.error('[SceneFx] draw', err) }
        if (!j.resolved && now >= j.resolveAt) { j.resolved = true; j.resolve() }
      }
      jobs.current = J.filter((j) => now < j.endAt)
      // dalelės (lighter režimu, be sprite'ų – paprastas arc/segment)
      ctx.globalCompositeOperation = 'lighter'
      const P = parts.current
      let w2 = 0
      for (let i = 0; i < P.length; i++) {
        const q = P[i]
        q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; q.l -= dt
        if (q.l <= 0 || q.x < -60 || q.x > vw + 60 || q.y > vh + 60) continue
        P[w2++] = q
        const a = cl(q.l / q.d); ctx.globalAlpha = a
        if (q.line) { ctx.strokeStyle = q.c; ctx.lineWidth = q.r; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04); ctx.stroke() }
        else { ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.3, q.r * a), 0, TAU); ctx.fill() }
      }
      P.length = w2
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
      if (jobs.current.length === 0 && P.length === 0) { ctx.clearRect(0, 0, vw, vh); rafRef.current = 0; return }
      rafRef.current = requestAnimationFrame(tick)
    }
    tickRef.current = tick
    const PP = parts.current
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0; tickRef.current = null; PP.length = 0
      for (const j of jobs.current) if (!j.resolved) { j.resolved = true; j.resolve() }
      jobs.current = []
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={cvRef} aria-hidden className="fixed inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 129 }} />
})
