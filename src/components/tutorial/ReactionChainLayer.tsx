'use client'

// ── Reakcijos grandinės sluoksnis (Reaction Chain VFX) ───────────────────────
// Aprobuotas vizualas: ravenof-fx-preview-reaction-chain.html (2026-07-25).
// Vienas <canvas> + vienas requestAnimationFrame ciklas; pozicijos – dinaminės
// (viewport CSS px iš kortų getBoundingClientRect), tad veikia bet kurioje
// lentos vietoje, abiem pusėms ir bet kokiu board scale.
//
// KELI TAIKINIAI: kiekvienas paveiktas taikinys (padaras, artefaktas ar žaidėjo
// avataras) gauna SAVO atskirą grandinę su savo trajektorija ir apsivijimu.
// Grandinės startuoja su nedideliu poslinkiu (stagger), bet niekada nesijungia
// į vieną „išsibarsčiusią" – kilpų mastelis ribojamas kortos dydžiu, kad
// zonos dydžio fallback'as nesukurtų per visą lentą išsidriekusių grandžių.
//
// SVARBIAUSIA: `play()` grąžina Promise, kuris išsisprendžia TIK tada, kai
// LEIDŽIAMA taikyti žaidimo būseną (po „parodymo" fazės). Tai vienintelis
// autoritetinis signalas – jokių atskirų setTimeout'ų gameplay pusėje.
// `cancel()` / unmount promise'ą irgi išsprendžia, kad kovos eilė niekada
// neužstrigtų (žr. HANDOFF-BATTLECRY-REACTION.md, Part 3/4).

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { playBattleSound } from '@/lib/game/soundManager'
import { duckMusic } from '@/lib/game/musicManager'
import {
  REACTION_CHAIN_PHASES as PH,
  REACTION_CHAIN_PHASES_COMPACT as PH_C,
  REACTION_CHAIN_GATE_MS,
  REACTION_CHAIN_GATE_COMPACT_MS,
  REACTION_CHAIN_PHASES,
  REACTION_CHAIN_REDUCED_GATE_MS,
} from '@/lib/game/timing'

export type ReactionChainVariant = 'shadow' | 'infernal'
export type ReactionChainPhase = 'detect' | 'chain' | 'wrap' | 'showcase' | 'effect'

/** Vienas grandinės taikinys – kortos/avataro centras ir (nebūtinai) dydis. */
export type ReactionChainTarget = { x: number; y: number; w?: number; h?: number }

export type ReactionChainPlayOpts = {
  /** Reakcijos kortos centras (viewport CSS px). */
  from: { x: number; y: number }
  /** VISI paveikti taikiniai – kiekvienam piešiama atskira grandinė. */
  targets: ReactionChainTarget[]
  variant?: ReactionChainVariant
  /** Sumažinto judesio režimas (prefers-reduced-motion). */
  reduced?: boolean
  /**
   * Kompresuotas variantas (game-feel fazė 3): antra ir vėlesnės tos pačios
   * kovos reakcijos. Fazių EILIŠKUMAS nekinta — trumpėja tik trukmės.
   */
  compact?: boolean
  /** Fazių pranešimai tėvui (showcase paleidimui, garsams). */
  onPhase?: (p: ReactionChainPhase) => void
  /** Lentos purtymas – per esamą BattleFxLayer (nedubliuojam mechanikos). */
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
type Strand = {
  to: { x: number; y: number }
  size: { w: number; h: number }
  stagger: number
  lut: { x: number; y: number; s: number }[]
  shattered: boolean
}
type Run = {
  opts: ReactionChainPlayOpts
  t0: number
  gateMs: number
  totalMs: number
  resolved: boolean
  resolve: () => void
  phase: ReactionChainPhase | null
  strands: Strand[]
}

const VAR: Record<ReactionChainVariant, { metal: string; metalD: string; glow: string; glow2: string; ember: string; impact: string }> = {
  shadow:   { metal: '#8b93a7', metalD: '#232733', glow: '#8b5cf6', glow2: '#a78bfa', ember: '#c4b5fd', impact: '#ddd6fe' },
  infernal: { metal: '#a78f7a', metalD: '#33231f', glow: '#ef4444', glow2: '#fb923c', ember: '#fdba74', impact: '#fecaca' },
}

const LUT_N = 200
const LINK_SPACING = 15      // px tarp grandžių (arc-length)
const WRAP_LINKS = 26        // grandžių kilpoje
const STAGGER_MS = 80        // poslinkis tarp kelių taikinių grandinių
const STAGGER_MAX_MS = 240   // bendra riba, kad seka neišsitęstų
// Kilpų mastelis ribojamas KORTOS dydžiu: zonos dydžio fallback'as niekada
// nesukuria per visą lentą išsibarsčiusių grandžių (bug fix 2026-07-26).
const MIN_W = 44, MAX_W = 170, MIN_H = 58, MAX_H = 230
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
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
  const ptAt = (lut: Strand['lut'], fr: number) => {
    const S = lut[LUT_N].s * clamp(fr, 0, 1)
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
  /** Dvi apsivijimo kilpos aplink KONKRETŲ taikinį (mastelis – iš kortos pločio). */
  const wrapLinks = (st: Strand, k1: number, k2: number) => {
    const sc = st.size.w / 70
    const out: { x: number; y: number; ang: number; i: number }[] = []
    const es = [
      { rx: 52 * sc, ry: 24 * sc, rot: -0.32, cy: st.to.y - 12 * sc, k: k1 },
      { rx: 55 * sc, ry: 22 * sc, rot: 0.26, cy: st.to.y + 16 * sc, k: k2 },
    ]
    es.forEach((e, ei) => {
      const lim = Math.floor(WRAP_LINKS * e.k)
      for (let i = 0; i < lim; i++) {
        const a = -Math.PI / 2 + (i / WRAP_LINKS) * Math.PI * 2
        const p = ellipsePt(st.to.x, e.cy, e.rx, e.ry, e.rot, a)
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
        const from = run.opts.from
        const t = now - run.t0
        const reduced = !!run.opts.reduced
        const F = run.opts.compact ? PH_C : PH   // fazių trukmės šiam paleidimui
        const wrapDur = reduced ? 250 : F.wrap
        const chainDur = reduced ? 0 : F.chain

        // P0 – rune flare nuo reakcijos kortos (bendras visoms grandinėms)
        if (t < F.detect + 120) {
          const k = clamp((t - 40) / 280, 0, 1)
          if (k > 0) {
            ctx.save(); ctx.globalAlpha = (1 - k) * 0.9
            ctx.beginPath(); ctx.arc(from.x, from.y, 10 + k * 34, 0, 7)
            ctx.strokeStyle = C.glow2; ctx.lineWidth = 2
            ctx.shadowColor = C.glow; ctx.shadowBlur = 12; ctx.stroke(); ctx.restore()
          }
        }

        // Kiekvienas taikinys – SAVO grandinė (savo laikas su poslinkiu)
        for (const st of run.strands) {
          const tl = t - st.stagger
          if (tl < 0) continue
          const bChain = F.detect
          const bWrap = F.detect + chainDur
          const bEffect = bWrap + wrapDur + F.showcase

          // P1 – skrydis
          if (!reduced && tl >= bChain && tl < bWrap) {
            const k = easeOutCubic((tl - bChain) / chainDur)
            const step = LINK_SPACING / st.lut[LUT_N].s
            let i = 0
            for (let s = 0; s <= k; s += step, i++) {
              const p = ptAt(st.lut, s)
              const rel = k > 0 ? s / k : 0
              const sway = Math.sin(now * 0.02 + i * 1.1) * 5 * (1 - rel)
              link(ctx, C, p.x + Math.cos(p.ang + Math.PI / 2) * sway, p.y + Math.sin(p.ang + Math.PI / 2) * sway, p.ang, i, 0.55 + 0.45 * rel)
            }
            const head = ptAt(st.lut, k)
            arrowHead(ctx, C, head.x, head.y, head.ang)
            if (Math.random() < 0.6) parts.push({ x: head.x, y: head.y, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, life: 0.8, dk: 0.05, c: C.ember, r: 1.3 })
          }
          // P2/P3 – apsivijimas + susiveržimas (kilpos lieka per showcase)
          if (tl >= bWrap && tl < bEffect) {
            const k = Math.min(1, (tl - bWrap) / wrapDur)
            if (!reduced) {
              const pull = Math.min(1, k * 1.8)
              if (pull < 1) {
                const step = LINK_SPACING / st.lut[LUT_N].s
                let i = 0
                for (let s = pull; s <= 1; s += step, i++) { const p = ptAt(st.lut, s); link(ctx, C, p.x, p.y, p.ang, i, 1 - pull * 0.6) }
              }
            }
            const k1 = Math.min(1, k / 0.55), k2 = clamp((k - 0.3) / 0.65, 0, 1)
            const sc = k > 0.72 ? 1 + 0.12 * (1 - Math.min(1, (k - 0.72) / 0.28)) : 1.12
            ctx.save(); ctx.translate(st.to.x, 0); ctx.scale(sc, 1); ctx.translate(-st.to.x, 0)
            wrapLinks(st, k1, k2).forEach((p) => link(ctx, C, p.x, p.y, p.ang, p.i, 0.95))
            ctx.restore()
            ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now * 0.008)
            ctx.beginPath(); ctx.roundRect(st.to.x - st.size.w / 2 - 3, st.to.y - st.size.h / 2 - 3, st.size.w + 6, st.size.h + 6, 8)
            ctx.strokeStyle = C.glow; ctx.lineWidth = 1.6; ctx.shadowColor = C.glow; ctx.shadowBlur = 16; ctx.stroke(); ctx.restore()
          }
          // P4 – sudužimas (jau PO to, kai būsena pritaikyta)
          if (tl >= bEffect) {
            if (!st.shattered) {
              st.shattered = true
              wrapLinks(st, 1, 1).forEach((p) => {
                const a = Math.atan2(p.y - st.to.y, p.x - st.to.x)
                parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * (1 + Math.random() * 2), vy: Math.sin(a) * (1 + Math.random() * 2) - 0.8, life: 1, dk: 0.018, c: C.metal, r: 1.6, g: 0.12 })
              })
              const burst = run.strands.length > 3 ? 14 : 26
              for (let i = 0; i < burst; i++) {
                const a = Math.random() * 7, v = 1.5 + Math.random() * 3.5
                parts.push({ x: st.to.x, y: st.to.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, dk: 0.02 + Math.random() * 0.02, c: Math.random() < 0.5 ? C.impact : C.glow2, r: 1 + Math.random() * 2.5 })
              }
            }
            const k = (tl - bEffect) / F.effect
            if (k < 0.5) {
              ctx.save(); ctx.globalAlpha = 1 - k * 2
              ctx.beginPath(); ctx.arc(st.to.x, st.to.y, 10 + k * 130, 0, 7)
              ctx.strokeStyle = C.impact; ctx.lineWidth = 3 * (1 - k)
              ctx.shadowColor = C.glow; ctx.shadowBlur = 20; ctx.stroke(); ctx.restore()
            }
          }
        }

        // fazių pranešimai (pagal pirmą grandinę) + vartų signalas
        const b1 = F.detect, b2 = F.detect + chainDur, b3 = b2 + wrapDur
        const ph: ReactionChainPhase = t < b1 ? 'detect' : t < b2 ? 'chain' : t < b3 ? 'wrap' : t < run.gateMs ? 'showcase' : 'effect'
        if (ph !== run.phase) {
          run.phase = ph
          run.opts.onPhase?.(ph)
          // Garsai — TIK čia (vienas taškas), file-first + synth fallback.
          if (ph === 'detect') playBattleSound('reactionLaunch', 0.45)
          if (ph === 'wrap') { playBattleSound('reactionTighten', 0.4); playBattleSound('reactionImpact', 0.5); run.opts.onShake?.('soft') }
          if (ph === 'effect') {
            // Mix dramaturgija: muzika trumpam pasitraukia, kad shatter turėtų vietos.
            duckMusic()
            playBattleSound('reactionShatter', 0.55)
            run.opts.onShake?.('hard')
          }
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
      const list = (o.targets ?? []).filter(Boolean)
      const targets = list.length > 0 ? list : [{ x: o.from.x, y: o.from.y }]
      const strands: Strand[] = targets.map((tg, i) => {
        const size = {
          w: clamp(tg.w ?? 70, MIN_W, MAX_W),
          h: clamp(tg.h ?? 96, MIN_H, MAX_H),
        }
        const dx = tg.x - o.from.x, dy = tg.y - o.from.y
        const L = Math.max(1, Math.hypot(dx, dy))
        let nx = -dy / L, ny = dx / L
        if (nx < 0) { nx = -nx; ny = -ny }                    // lankas visada į ekrano vidų
        // kelių grandinių lankai skiriasi, kad nesusilietų į vieną „kamuolį"
        const bowBase = Math.min(120, L * 0.42)
        const bow = targets.length > 1 ? bowBase * (0.6 + 0.5 * ((i % 3) / 2)) : bowBase
        const ctrl = { x: (o.from.x + tg.x) / 2 + nx * bow, y: (o.from.y + tg.y) / 2 + ny * bow }
        return {
          to: { x: tg.x, y: tg.y }, size,
          stagger: Math.min(i * STAGGER_MS, STAGGER_MAX_MS),
          lut: buildLut(o.from, { x: tg.x, y: tg.y }, ctrl),
          shattered: false,
        }
      })
      const maxStagger = strands.reduce((m, s) => Math.max(m, s.stagger), 0)
      const F = o.compact ? PH_C : REACTION_CHAIN_PHASES
      const fullGate = o.compact ? REACTION_CHAIN_GATE_COMPACT_MS : REACTION_CHAIN_GATE_MS
      const gateMs = (reduced ? REACTION_CHAIN_REDUCED_GATE_MS : fullGate) + maxStagger
      const totalMs = gateMs + (reduced ? 400 : F.effect)
      return new Promise<void>((resolve) => {
        runRef.current = { opts: o, t0: performance.now(), gateMs, totalMs, resolved: false, resolve, phase: null, strands }
      })
    },
    cancel: () => { finishRun(runRef.current); runRef.current = null; partsRef.current = [] },
    busy: () => !!runRef.current,
  }))

  return <canvas ref={cvs} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 128, pointerEvents: 'none', width: '100%', height: '100%' }} />
})
