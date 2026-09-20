'use client'

// ── Raktažodžių FX sluoksnis (Kovos šūksnis · Paskutinis noras · Trigeris) ───
// Aprobuotas vizualas: ravenof-fx-preview-keywords.html (2026-09-20).
//
// Kokybės kartelė — reakcijų grandinė (ReactionChainLayer): anticipacija →
// veiksmas → ANTSPAUDAS (raktažodis + kortos vardas) → nukreipimas į taikinį →
// efektas. Skirtumas nuo reakcijų: šis sluoksnis NEVARTOJA gameplay vartų —
// jis dekoratyvus, tad kovos eilė niekada negali jame užstrigti.
//
// Technika kaip SummonBurst/ReactionChainLayer: VIENAS <canvas> + VIENAS rAF,
// radialiniai gradientai, BE ctx.shadowBlur (telefone brangu). Pozicijos —
// viewport CSS px, perduodamos iš TutorialGame (getBoundingClientRect).

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { KEYWORD_FX, KEYWORD_FX_COMPACT_SCALE, KEYWORD_FX_REDUCED_MS } from '@/lib/game/timing'
import { prefersReducedMotion } from '@/lib/game/tactile'

export type KeywordFxKind = 'battlecry' | 'lastwish' | 'trigger'

export type KeywordFxPlayOpts = {
  kind: KeywordFxKind
  /** Šaltinio kortos centras (viewport CSS px). */
  from: { x: number; y: number }
  /** Taikinys (jei žinomas) – į jį eina „nukreipimo" fazė. */
  to?: { x: number; y: number } | null
  /** Kortos vardas antspaudui. */
  cardName?: string
  /** Antraštė antspaude (jau išversta). */
  title?: string
  /** Kompaktas: antras ir vėlesni tos pačios kovos kartai – be antspaudo. */
  compact?: boolean
}

export type KeywordFxHandle = {
  play: (o: KeywordFxPlayOpts) => void
  clear: () => void
  busy: () => boolean
}

const TAU = Math.PI * 2
const cl = (t: number) => Math.max(0, Math.min(1, t))
const eo = (t: number) => 1 - Math.pow(1 - t, 3)
const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const eb = (t: number) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

type Palette = { main: string; soft: string; hot: string }
const PAL: Record<KeywordFxKind, Palette> = {
  battlecry: { main: '#f0b429', soft: '#ffd97a', hot: '#fff6dd' },
  lastwish: { main: '#a78bfa', soft: '#c4b5fd', hot: '#e9e1ff' },
  trigger: { main: '#38bdf8', soft: '#7dd3fc', hot: '#e0f2fe' },
}

type Particle = { x: number; y: number; vx: number; vy: number; l: number; d: number; r: number; c: string; g: number; line: boolean }
type Job = KeywordFxPlayOpts & { t0: number; ph: { n: string; d: number }[]; total: number; lastPhase: number }

/** Dalelių biudžetas pagal įrenginį (tas pats principas kaip PackOpen). */
function fxBudget(): number {
  if (typeof window === 'undefined') return 0
  if (prefersReducedMotion()) return 0
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const mem = nav.deviceMemory ?? 4
  if (cores <= 4 || mem <= 3) return 0.45
  if (cores <= 6) return 0.7
  return 1
}

function phasesFor(kind: KeywordFxKind, compact: boolean) {
  const k = KEYWORD_FX[kind]
  const s = compact ? KEYWORD_FX_COMPACT_SCALE : 1
  const out: { n: string; d: number }[] = [
    { n: 'anticipate', d: Math.round(k.anticipateMs * s) },
    { n: 'act', d: Math.round(k.actMs * s) },
    // kompakte antspaudo NĖRA (tik pirmas kartas per kovą gauna „parodymą")
    { n: 'seal', d: compact ? 0 : k.sealMs },
    { n: 'direct', d: Math.round(k.directMs * s) },
  ]
  if (k.effectMs > 0) out.push({ n: 'effect', d: Math.round(k.effectMs * s) })
  return out.filter((p) => p.d > 0)
}

export const KeywordFxLayer = forwardRef<KeywordFxHandle>(function KeywordFxLayer(_props, ref) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const jobs = useRef<Job[]>([])
  const parts = useRef<Particle[]>([])
  const rafRef = useRef(0)
  const tickRef = useRef<(() => void) | null>(null)
  const budget = useRef(1)

  const play = useCallback((o: KeywordFxPlayOpts) => {
    if (typeof window === 'undefined') return
    const reduced = prefersReducedMotion()
    const compact = !!o.compact || reduced
    const ph = reduced ? [{ n: 'act', d: KEYWORD_FX_REDUCED_MS }] : phasesFor(o.kind, compact)
    const total = ph.reduce((a, p) => a + p.d, 0)
    // daugiausiai 2 vienu metu – chaoso prevencija (kaip status VFX eilėje)
    if (jobs.current.length >= 2) jobs.current.shift()
    jobs.current.push({ ...o, compact, t0: performance.now(), ph, total, lastPhase: -1 })
    if (!rafRef.current && tickRef.current) rafRef.current = requestAnimationFrame(tickRef.current)
  }, [])

  useImperativeHandle(ref, () => ({
    play,
    clear: () => { jobs.current = []; parts.current = [] },
    busy: () => jobs.current.length > 0,
  }), [play])

  useEffect(() => {
    budget.current = fxBudget()
    const cv = cvRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let vw = window.innerWidth, vh = window.innerHeight
    const resize = () => {
      vw = window.innerWidth; vh = window.innerHeight
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize(); window.addEventListener('resize', resize)

    const sprites = new Map<string, HTMLCanvasElement>()
    const spriteFor = (c: string) => {
      let sp = sprites.get(c)
      if (!sp) {
        sp = document.createElement('canvas'); sp.width = sp.height = 24
        const sc = sp.getContext('2d')
        if (sc) {
          const g = sc.createRadialGradient(12, 12, 0, 12, 12, 12)
          g.addColorStop(0, c); g.addColorStop(0.45, c); g.addColorStop(1, 'rgba(0,0,0,0)')
          sc.globalAlpha = 1; sc.fillStyle = g; sc.fillRect(0, 0, 24, 24)
        }
        sprites.set(c, sp)
      }
      return sp
    }

    const emit = (x: number, y: number, n: number, o: { a0?: number; spread?: number; sp?: number; up?: number; d?: number; r?: number; c?: string; g?: number; line?: boolean }) => {
      const b = budget.current
      if (b <= 0) return
      const count = Math.max(1, Math.round(n * b))
      for (let i = 0; i < count; i++) {
        const a = (o.a0 ?? 0) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2)
        const sp = (o.sp ?? 2) * rnd(0.4, 1.4)
        parts.current.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up ?? 0), l: 1,
          d: (o.d ?? 0.025) * rnd(0.7, 1.3), r: (o.r ?? 2.4) * rnd(0.5, 1.4),
          c: o.c ?? '#ffd97a', g: o.g ?? 0.03, line: !!o.line,
        })
      }
      if (parts.current.length > 220) parts.current.splice(0, parts.current.length - 220)
    }

    const glow = (x: number, y: number, r: number, c: string, a: number) => {
      const rr = Math.max(0.2, r)
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr)
      g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = a; ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
    }
    const ring = (x: number, y: number, r: number, w: number, c: string, a: number, from?: number, to?: number) => {
      ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = Math.max(0.4, w)
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), from ?? 0, to ?? TAU); ctx.stroke(); ctx.globalAlpha = 1
    }
    const runeRing = (x: number, y: number, r: number, rot: number, a: number, c: string, n = 8) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a
      ctx.strokeStyle = c; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke()
      ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r * 0.76, 0, TAU); ctx.stroke()
      for (let i = 0; i < n; i++) {
        ctx.save(); ctx.rotate((i / n) * TAU)
        ctx.beginPath(); ctx.moveTo(r * 0.82, -4); ctx.lineTo(r * 0.94, 0); ctx.lineTo(r * 0.82, 4)
        ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore()
      }
      ctx.restore(); ctx.globalAlpha = 1
    }
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath(); ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
    }
    /** Antspaudas – „parodymo" fazė: raktažodis + kortos vardas gotiškame rėme. */
    const seal = (x0: number, y0: number, k: number, title: string, name: string, p: Palette) => {
      const w = Math.min(280, vw - 40), h = 74
      const x = Math.max(w / 2 + 12, Math.min(vw - w / 2 - 12, x0))
      const y = Math.max(58, Math.min(vh - 58, y0))
      const s = lerp(0.82, 1, eb(cl(k * 1.6)))
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = cl(k * 2)
      ctx.fillStyle = 'rgba(8,5,14,.92)'; rr(-w / 2, -h / 2, w, h, 6); ctx.fill()
      ctx.strokeStyle = p.main; ctx.lineWidth = 1.6; rr(-w / 2, -h / 2, w, h, 6); ctx.stroke()
      ctx.strokeStyle = p.soft; ctx.lineWidth = 1; rr(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4); ctx.stroke()
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        ctx.beginPath(); ctx.moveTo(sx * (w / 2 - 4), sy * (h / 2 - 14))
        ctx.lineTo(sx * (w / 2 - 4), sy * (h / 2 - 4)); ctx.lineTo(sx * (w / 2 - 14), sy * (h / 2 - 4))
        ctx.strokeStyle = p.main; ctx.lineWidth = 2; ctx.stroke()
      }
      ctx.textAlign = 'center'
      ctx.fillStyle = p.main; ctx.font = '700 10px var(--rvn-font-display), Georgia, serif'
      ctx.fillText(title.toUpperCase(), 0, -8)
      ctx.fillStyle = '#f3ead3'; ctx.font = '700 17px Georgia, serif'
      ctx.fillText(name, 0, 16)
      ctx.restore(); ctx.globalAlpha = 1
    }

    // ── scenų piešimas ─────────────────────────────────────────────────────
    const drawJob = (j: Job, now: number) => {
      const el = now - j.t0
      let acc = 0, i = 0, k = 0
      for (; i < j.ph.length; i++) { if (el < acc + j.ph[i].d) { k = (el - acc) / j.ph[i].d; break } acc += j.ph[i].d }
      if (i >= j.ph.length) return false
      const first = i !== j.lastPhase; j.lastPhase = i
      const p = PAL[j.kind]
      const s = j.from, tg = j.to ?? { x: s.x, y: s.y - 120 }
      const ang = Math.atan2(tg.y - s.y, tg.x - s.x)
      const name = j.ph[i].n

      if (name === 'anticipate') {
        const kk = eo(k)
        glow(s.x, s.y, 56 * kk, p.soft, 0.32 * kk)
        runeRing(s.x, s.y + 34, lerp(8, 34, kk), now / 700, kk * 0.7, p.main, j.kind === 'trigger' ? 8 : 6)
        if (Math.random() < 0.6) { const a = rnd(0, TAU), r = rnd(38, 68); emit(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, 1, { sp: 0.1, c: p.soft, d: 0.035, g: 0 }) }
        for (const q of parts.current) { const dx = s.x - q.x, dy = s.y - q.y, d = Math.hypot(dx, dy) || 1; q.vx += (dx / d) * 0.45; q.vy += (dy / d) * 0.45 }
      } else if (name === 'act') {
        if (j.kind === 'battlecry') {
          glow(s.x, s.y, 90, p.soft, 0.42 * (1 - k))
          for (let w = 0; w < 3; w++) {
            const kk = cl((k - w * 0.16) * 1.7); if (kk <= 0) continue
            ring(s.x, s.y, lerp(24, 210, eo(kk)), 3.2 - w, w ? p.main : p.hot, (1 - kk) * 0.85, ang - 0.75, ang + 0.75)
          }
          if (first) emit(s.x, s.y, 22, { a0: ang, spread: 1.3, sp: 5, c: p.soft, d: 0.03, line: true })
        } else if (j.kind === 'lastwish') {
          // vėlė kyla nuo mirusios kortos
          const kk = eio(k)
          const sx = lerp(s.x, (s.x + tg.x) / 2, kk), sy = lerp(s.y, Math.min(s.y, tg.y) - 70, kk)
          glow(sx, sy, 26, p.soft, 0.7)
          ctx.fillStyle = p.hot; ctx.beginPath(); ctx.arc(sx, sy, 5.5, 0, TAU); ctx.fill()
          if (Math.random() < 0.9) emit(sx + rnd(-4, 4), sy + rnd(-4, 4), 1, { sp: 0.35, c: p.soft, d: 0.028, r: 2.4, g: -0.008 })
          if (first) emit(s.x, s.y + 30, 16, { sp: 1.4, c: '#6b7280', d: 0.03, up: 0.2, g: 0.02 })
        } else {
          runeRing(s.x, s.y + 34, 38, now / 240, 1, p.soft, 8)
          const kk = eo(k)
          for (let i2 = 0; i2 < 3; i2++) {
            const a = -Math.PI / 2 + (i2 - 1) * 0.55, r = lerp(10, 66, kk)
            const x = s.x + Math.cos(a) * r, y = s.y + 34 + Math.sin(a) * r
            ctx.globalAlpha = 1 - kk; ctx.strokeStyle = p.soft; ctx.lineWidth = 2
            ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1
          }
          if (first) emit(s.x, s.y + 34, 16, { sp: 2.6, c: p.soft, d: 0.03, up: 1.2 })
        }
      } else if (name === 'seal') {
        // pritemdymas tik antspaudo fazėje (ir tik pirmą kartą per kovą)
        ctx.fillStyle = 'rgba(5,3,10,' + 0.5 * cl(k * 3) * (k > 0.85 ? (1 - k) / 0.15 : 1) + ')'
        ctx.fillRect(0, 0, vw, vh)
        glow(s.x, s.y, 110, p.soft, 0.34)
        runeRing(s.x, s.y + 34, 34, now / 500, 0.5, p.main, j.kind === 'trigger' ? 8 : 6)
        const kk = k < 0.85 ? k / 0.85 : 1 - (k - 0.85) / 0.15
        seal(s.x, s.y - 96, kk, j.title ?? '', j.cardName ?? '', p)
      } else if (name === 'direct') {
        const kk = eio(k)
        if (j.kind === 'battlecry') {
          const x = lerp(s.x, tg.x, kk), y = lerp(s.y, tg.y, kk)
          ctx.save(); ctx.translate(x, y); ctx.rotate(ang)
          const grd = ctx.createLinearGradient(-70, 0, 26, 0)
          grd.addColorStop(0, 'rgba(240,180,41,0)'); grd.addColorStop(0.6, p.soft); grd.addColorStop(1, p.hot)
          ctx.globalAlpha = 0.9; ctx.fillStyle = grd
          ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-70, -7); ctx.lineTo(-70, 7); ctx.closePath(); ctx.fill()
          ctx.globalAlpha = 1; ctx.restore()
          emit(x, y, 2, { sp: 1.2, c: p.soft, d: 0.05, r: 2 })
        } else if (j.kind === 'lastwish') {
          const c = { x: (s.x + tg.x) / 2, y: Math.min(s.y, tg.y) - 70 }
          const a = 1 - kk
          const x = a * a * c.x + 2 * a * kk * c.x + kk * kk * tg.x
          const y = a * a * c.y + 2 * a * kk * c.y + kk * kk * tg.y
          glow(x, y, 26, p.soft, 0.75)
          ctx.fillStyle = p.hot; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, TAU); ctx.fill()
          emit(x, y, 1, { sp: 0.4, c: p.soft, d: 0.04, r: 2.2, g: -0.005 })
        } else {
          const c = { x: (s.x + tg.x) / 2, y: Math.min(s.y, tg.y) - 60 }
          const a = 1 - kk
          const x = a * a * s.x + 2 * a * kk * c.x + kk * kk * tg.x
          const y = a * a * s.y + 2 * a * kk * c.y + kk * kk * tg.y
          ctx.save(); ctx.translate(x, y); ctx.rotate(now / 160)
          ctx.strokeStyle = p.soft; ctx.lineWidth = 2.4
          ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0); ctx.closePath(); ctx.stroke()
          glow(0, 0, 22, p.soft, 0.6); ctx.restore()
          emit(x, y, 1, { sp: 0.5, c: p.soft, d: 0.05, r: 2 })
        }
      } else { // effect
        if (first) { emit(tg.x, tg.y, 26, { sp: 4, c: p.main, d: 0.026, line: true }); emit(tg.x, tg.y, 12, { sp: 2, c: p.hot, d: 0.02 }) }
        ring(tg.x, tg.y, lerp(8, 78, eo(k)), 4 - k * 3, p.soft, 1 - k)
      }
      return true
    }

    const tick = () => {
      const now = performance.now()
      ctx.clearRect(0, 0, vw, vh)
      jobs.current = jobs.current.filter((j) => drawJob(j, now))
      // dalelės
      ctx.globalCompositeOperation = 'lighter'
      const P = parts.current
      let w2 = 0
      for (let i = 0; i < P.length; i++) {
        const q = P[i]
        q.x += q.vx; q.y += q.vy; q.vy += q.g; q.vx *= 0.985; q.l -= q.d
        if (q.l <= 0 || q.x < -60 || q.x > vw + 60 || q.y > vh + 60) continue
        P[w2++] = q
        ctx.globalAlpha = cl(q.l)
        if (q.line) {
          ctx.strokeStyle = q.c; ctx.lineWidth = Math.max(0.6, q.r * 0.7)
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 4, q.y - q.vy * 4); ctx.stroke()
        } else {
          const r = Math.max(1, q.r * q.l * 2.2)
          ctx.drawImage(spriteFor(q.c), q.x - r, q.y - r, r * 2, r * 2)
        }
      }
      P.length = w2
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'

      if (jobs.current.length === 0 && P.length === 0) { rafRef.current = 0; return }
      rafRef.current = requestAnimationFrame(tick)
    }
    tickRef.current = tick

    const PP = parts.current
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0; tickRef.current = null; PP.length = 0; jobs.current = []
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={cvRef} aria-hidden className="fixed inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 129 }} />
})
