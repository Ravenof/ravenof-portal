'use client'

// ── Reakcijos grandinės sluoksnis (Reaction Chain VFX) ───────────────────────
// Aprobuotas vizualas: ravenof-fx-preview-reaction-chain.html (2026-07-25).
// Vienas <canvas> + vienas requestAnimationFrame ciklas; pozicijos – dinaminės
// (viewport CSS px iš kortų getBoundingClientRect), tad veikia bet kurioje
// lentos vietoje, abiem pusėms ir bet kokiu board scale.
//
// SVARBIAUSIA: `play()` grąžina Promise, kuris išsisprendžia TIK tada, kai
// LEIDŽIAMA taikyti žaidimo būseną (po „parodymo" fazės). Tai vienintelis
// autoritetinis signalas – jokių atskirų setTimeout'ų gameplay pusėje.
// `cancel()` / unmount promise'ą irgi išsprendžia, kad kovos eilė niekada
// neužstrigtų (žr. HANDOFF-BATTLECRY-REACTION.md, Part 3/4).
//
// Naudojimas (tėve):
//   const chain = useRef<ReactionChainHandle>(null)
//   <ReactionChainLayer ref={chain} />
//   await chain.current?.play({ from, to, variant: 'shadow' })

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import {
  REACTION_CHAIN_PHASES as PH,
  REACTION_CHAIN_GATE_MS,
  REACTION_CHAIN_TOTAL_MS,
  REACTION_CHAIN_REDUCED_GATE_MS,
} from '@/lib/game/timing'

export type ReactionChainVariant = 'shadow' | 'infernal'
export type ReactionChainPhase = 'detect' | 'chain' | 'wrap' | 'showcase' | 'effect'

export type ReactionChainPlayOpts = {
  /** Reakcijos kortos centras (viewport CSS px). */
  from: { x: number; y: number }
  /** Reakciją suaktyvinusios kortos centras (viewport CSS px). */
  to: { x: number; y: number }
  /** Taikinio kortos dydis – kilpoms ir rėmo švytėjimui (default 70×96 kaip etalone). */
  targetSize?: { w: number; h: number }
  variant?: ReactionChainVariant
  /** Sumažinto judesio režimas (prefers-reduced-motion). */
  reduced?: boolean
  /** Fazių pranešimai tėvui (showcase paleidimui, garsams). */
  onPhase?: (p: ReactionChainPhase) => void
  /** Lentos purtymas – perduodam esamam BattleFxLayer (nedubliuojam mechanikos). */
  onShake?: (kind: 'soft' | 'hard') => void
}

export type ReactionChainHandle = {
  /** Paleidžia animaciją. Promise = „dabar galima taikyti gameplay būseną". */
  play: (o: ReactionChainPlayOpts) => Promise<void>
  /** Nutraukia (promise vis tiek išsisprendžia – eilė nesustoja). */
  cancel: () => void
  busy: () => boolean
}

type Particle = { x: number; y: number; vx: number; vy: number; life: number; dk: number; c: string; r: number; g?: number }
type Run = {
  opts: ReactionChainPlayOpts
  t0: number
  gateMs: number
  totalMs: number
  resolved: boolean
  resolve: () => void
  phase: ReactionChainPhase | null
  shattered: boolean
  lut: { x: number; y: number; s: number }[]
  ctrl: { x: number; y: number }
}

const VAR: Record<ReactionChainVariant, { metal: string; metalD: string; glow: string; glow2: string; ember: string; impact: string }> = {
  shadow:   { metal: '#8b93a7', metalD: '#232733', glow: '#8b5cf6', glow2: '#a78bfa', ember: '#c4b5fd', impact: '#ddd6fe' },
  infernal: { metal: '#a78f7a', metalD: '#33231f', glow: '#ef4444', glow2: '#fb923c', ember: '#fdba74', impact: '#fecaca' },
}

const LUT_N = 200
const LINK_SPACING = 15      // px tarp grandžių (arc-length)
const WRAP_LINKS = 26        // grandžių kilpoje
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export const ReactionChainLayer = forwardRef<ReactionChainHandle>(function ReactionChainLayer(_props, ref) {
  const cvs = useRef<HTMLCanvasElement | null>(null)
  const raf = useRef(0)
  const dprRef = useRef(1)
  const runRef = useRef<Run | null>(null)
  const partsRef = useRef<Particle[]>([])

  // ── geometrija ──
  const buildLut = (from: { x: number; y: number }, to: { x: number; y: number }, ctrl: { x: number; y: number }) => {
    const lut: { x: number; y: number; s: number }[] = []
    let px = from.x, py = from.y, acc = 0
    for (let i = 0; i <= LUT_N; i++) {
      const t = i / LUT_N, a = 1 - t
      const x = a * a * from.x + 2 * a * t * ctrl.x + t * t * to.x
      const y = a * a * from.y + 2 * a * t * ctrl.y + t * t * to.y
      acc += Math.hypot(x - px, y - py)
      lut.push({ x, y, s: acc })
      px = x; py = y
    }
    return lut
  }
  const ptAt = (lut: Run['lut'], fr: number) => {
    const S = lut[LUT_N].s * Math.max(0, Math.min(1, fr))
    let lo = 0, hi = LUT_N
    while (lo < hi) { const m = (lo + hi) >> 1; if (lut[m].s < S) lo = m + 1; else hi = m }
    const i = Math.max(1, lo), a = lut[i - 1], b = lut[i]
    const k = (S - a.s) / Math.max(0.001, b.s - a.s)
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x) }
  }

  // ── piešimas ──
  const link = (ctx: CanvasRenderingContext2D, C: typeof VAR.shadow, x: number, y: number, ang: number, i: number, alpha: number) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = alpha
    if (i % 2 === 0) {
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, 0, 7)
      ctx.lineWidth = 3.2; ctx.strokeStyle = C.metalD; ctx.stroke()
      ctx.lineWidth = 1.4; ctx.strokeStyle = C.metal; ctx.stroke()
    } else {
      ctx.beginPath(); ctx.roundRect(-5, -1.6, 10, 3.2, 1.6); ctx.fillStyle = C.metalD; ctx.fill()
      ctx.beginPath(); ctx.roundRect(-5, -1.6, 10, 1.4, 1); ctx.fillStyle = C.metal; ctx.globalAlpha = alpha * 0.8; ctx.fill()
    }
    ctx.restore()
  }
  const arrowHead = (ctx: CanvasRenderingContext2D, C: typeof VAR.shadow, x: number, y: number, ang: number) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang)
    ctx.shadowColor = C.glow; ctx.shadowBlur = 16
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-4, -7); ctx.lineTo(0, -2.4); ctx.lineTo(-9, -4)
    ctx.lineTo(-9, 4); ctx.lineTo(0, 2.4); ctx.lineTo(-4, 7); ctx.closePath()
    const g = ctx.createLinearGradient(-9, 0, 16, 0)
    g.addColorStop(0, C.metalD); g.addColorStop(0.6, C.metal); g.addColorStop(1, '#e8e4f5')
    ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0
    ctx.lineWidth = 0.8; ctx.strokeStyle = C.glow2; ctx.stroke(); ctx.restore()
  }
  const ellipsePt = (cx: number, cy: number, rx: number, ry: number, rot: number, a: number) => {
    const c = Math.cos(rot), s = Math.sin(rot), ex = rx * Math.cos(a), ey = ry * Math.sin(a)
    return { x: cx + ex * c - ey * s, y: cy + ex * s + ey * c, ang: rot + a + Math.PI / 2 }
  }
  /** Dvi apsivijimo kilpos aplink taikinio kortą (mastelis pagal kortos plotį). */
  const wrapLinks = (to: { x: number; y: number }, size: { w: number; h: number }, k1: number, k2: number) => {
    const sc = size.w / 70
    const out: { x: number; y: number; ang: number; i: number }[] = []
    const es = [
      { rx: 52 * sc, ry: 24 * sc, rot: -0.32, cy: to.y - 12 * sc, k: k1 },
      { rx: 55 * sc, ry: 22 * sc, rot: 0.26, cy: to.y + 16 * sc, k: k2 },
    ]
    es.forEach((e, ei) => {
      const lim = Math.floor(WRAP_LINKS * e.k)
      for (let i = 0; i < lim; i++) {
        const a = -Math.PI / 2 + (i / WRAP_LINKS) * Math.PI * 2
        const p = ellipsePt(to.x, e.cy, e.rx, e.ry, e.rot, a)
        out.push({ ...p, i: i + ei })
      }
    })
    return out
  }

  const finishRun = useCallback((run: Run | null) => {
    if (!run || run.resolved) return
    run.resolved = true
    run.resolve()
  }, [])

  // ── rAF ciklas ──
  useEffect(() => {
    const c = cvs.current
    if (!c) return
    const resize = () => {
      const D = Math.min(window.devicePixelRatio || 1, 2); dprRef.current = D
      c.width = Math.floor(window.innerWidth * D); c.height = Math.floor(window.innerHeight * D)
    }
    resize(); window.addEventListener('resize', resize)

    const ctx = c.getContext('2d')
    const frame = (now: number) => {
      raf.current = requestAnimationFrame(frame)
      if (!ctx) return
      const D = dprRef.current
      ctx.setTransform(D, 0, 0, D, 0, 0)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      const run = runRef.current
      const parts = partsRef.current
      if (!run && parts.length === 0) return

      if (run) {
        const C = VAR[run.opts.variant ?? 'shadow']
        const size = run.opts.targetSize ?? { w: 70, h: 96 }
        const to = run.opts.to, from = run.opts.from
        const t = now - run.t0
        const reduced = !!run.opts.reduced
        // fazių ribos (reduced: be skrydžio)
        const b = reduced
          ? [0, PH.detect, PH.detect, PH.detect + 250, run.gateMs, run.totalMs]
          : [0, PH.detect, PH.detect + PH.chain, PH.detect + PH.chain + PH.wrap, run.gateMs, run.totalMs]

        // P0 – rune flare nuo reakcijos kortos
        if (t < b[1] + 120) {
          const k = Math.min(1, Math.max(0, (t - 40) / 280))
          if (k > 0) {
            ctx.save(); ctx.globalAlpha = (1 - k) * 0.9
            ctx.beginPath(); ctx.arc(from.x, from.y, 10 + k * 34, 0, 7)
            ctx.strokeStyle = C.glow2; ctx.lineWidth = 2
            ctx.shadowColor = C.glow; ctx.shadowBlur = 12; ctx.stroke(); ctx.restore()
          }
        }
        // P1 – skrydis
        if (!reduced && t >= b[1] && t < b[2]) {
          const k = easeOutCubic((t - b[1]) / PH.chain)
          const step = LINK_SPACING / run.lut[LUT_N].s
          let i = 0
          for (let s = 0; s <= k; s += step, i++) {
            const p = ptAt(run.lut, s)
            const rel = k > 0 ? s / k : 0
            const sway = Math.sin(now * 0.02 + i * 1.1) * 5 * (1 - rel)
            link(ctx, C, p.x + Math.cos(p.ang + Math.PI / 2) * sway, p.y + Math.sin(p.ang + Math.PI / 2) * sway, p.ang, i, 0.55 + 0.45 * rel)
          }
          const head = ptAt(run.lut, k)
          arrowHead(ctx, C, head.x, head.y, head.ang)
          if (Math.random() < 0.85) parts.push({ x: head.x, y: head.y, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, life: 0.8, dk: 0.05, c: C.ember, r: 1.3 })
        }
        // P2/P3 – apsivijimas + susiveržimas (kilpos lieka per showcase)
        if (t >= b[2] && t < b[4]) {
          const wrapDur = reduced ? 250 : PH.wrap
          const k = Math.min(1, (t - b[2]) / wrapDur)
          if (!reduced) {
            const pull = Math.min(1, k * 1.8)
            if (pull < 1) {
              const step = LINK_SPACING / run.lut[LUT_N].s
              let i = 0
              for (let s = pull; s <= 1; s += step, i++) { const p = ptAt(run.lut, s); link(ctx, C, p.x, p.y, p.ang, i, 1 - pull * 0.6) }
            }
          }
          const k1 = Math.min(1, k / 0.55), k2 = Math.max(0, Math.min(1, (k - 0.3) / 0.65))
          const sc = k > 0.72 ? 1 + 0.12 * (1 - Math.min(1, (k - 0.72) / 0.28)) : 1.12
          ctx.save(); ctx.translate(to.x, 0); ctx.scale(sc, 1); ctx.translate(-to.x, 0)
          wrapLinks(to, size, k1, k2).forEach((p) => link(ctx, C, p.x, p.y, p.ang, p.i, 0.95))
          ctx.restore()
          ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now * 0.008)
          ctx.beginPath(); ctx.roundRect(to.x - size.w / 2 - 3, to.y - size.h / 2 - 3, size.w + 6, size.h + 6, 8)
          ctx.strokeStyle = C.glow; ctx.lineWidth = 1.6; ctx.shadowColor = C.glow; ctx.shadowBlur = 16; ctx.stroke(); ctx.restore()
        }
        // P4 – sudužimas (jau PO to, kai būsena pritaikyta)
        if (t >= b[4]) {
          if (!run.shattered) {
            run.shattered = true
            wrapLinks(to, size, 1, 1).forEach((p) => {
              const a = Math.atan2(p.y - to.y, p.x - to.x)
              parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * (1 + Math.random() * 2), vy: Math.sin(a) * (1 + Math.random() * 2) - 0.8, life: 1, dk: 0.018, c: C.metal, r: 1.6, g: 0.12 })
            })
            for (let i = 0; i < 26; i++) {
              const a = Math.random() * 7, v = 1.5 + Math.random() * 3.5
              parts.push({ x: to.x, y: to.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, dk: 0.02 + Math.random() * 0.02, c: Math.random() < 0.5 ? C.impact : C.glow2, r: 1 + Math.random() * 2.5 })
            }
            run.opts.onShake?.('hard')
          }
          const k = (t - b[4]) / PH.effect
          if (k < 0.5) {
            ctx.save(); ctx.globalAlpha = 1 - k * 2
            ctx.beginPath(); ctx.arc(to.x, to.y, 10 + k * 130, 0, 7)
            ctx.strokeStyle = C.impact; ctx.lineWidth = 3 * (1 - k)
            ctx.shadowColor = C.glow; ctx.shadowBlur = 20; ctx.stroke(); ctx.restore()
          }
        }

        // fazių pranešimai + vartų signalas
        const ph: ReactionChainPhase = t < b[1] ? 'detect' : t < b[2] ? 'chain' : t < b[3] ? 'wrap' : t < b[4] ? 'showcase' : 'effect'
        if (ph !== run.phase) {
          run.phase = ph
          run.opts.onPhase?.(ph)
          if (ph === 'wrap') run.opts.onShake?.('soft')
        }
        if (t >= run.gateMs) finishRun(run)          // ← vienintelis autoritetinis signalas
        if (t >= run.totalMs) runRef.current = null
      }

      // dalelės
      partsRef.current = parts.filter((p) => p.life > 0)
      for (const p of partsRef.current) {
        p.x += p.vx; p.y += p.vy
        if (p.g) p.vy += p.g
        p.life -= p.dk
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.restore()
      }
    }
    raf.current = requestAnimationFrame(frame)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf.current)
      finishRun(runRef.current)   // unmount – eilė NIEKADA nelieka užrakinta
      runRef.current = null
    }
  }, [finishRun])

  useImperativeHandle(ref, () => ({
    play: (o: ReactionChainPlayOpts) => {
      finishRun(runRef.current)   // niekada nepersidengia: ankstesnis užbaigiamas
      const reduced = !!o.reduced
      const gateMs = reduced ? REACTION_CHAIN_REDUCED_GATE_MS : REACTION_CHAIN_GATE_MS
      const totalMs = reduced ? REACTION_CHAIN_REDUCED_GATE_MS + 400 : REACTION_CHAIN_TOTAL_MS
      const dx = o.to.x - o.from.x, dy = o.to.y - o.from.y
      const L = Math.max(1, Math.hypot(dx, dy))
      let nx = -dy / L, ny = dx / L
      if (nx < 0) { nx = -nx; ny = -ny }                      // lankas visada į ekrano vidų
      const bow = Math.min(120, L * 0.42)
      const ctrl = { x: (o.from.x + o.to.x) / 2 + nx * bow, y: (o.from.y + o.to.y) / 2 + ny * bow }
      return new Promise<void>((resolve) => {
        runRef.current = {
          opts: o, t0: performance.now(), gateMs, totalMs, resolved: false, resolve,
          phase: null, shattered: false, ctrl, lut: buildLut(o.from, o.to, ctrl),
        }
      })
    },
    cancel: () => { finishRun(runRef.current); runRef.current = null; partsRef.current = [] },
    busy: () => !!runRef.current,
  }))

  return <canvas ref={cvs} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 128, pointerEvents: 'none', width: '100%', height: '100%' }} />
})
