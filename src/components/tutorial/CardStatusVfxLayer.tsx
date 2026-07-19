'use client'

// ══════════════════════════════════════════════════════════════════════════════
// CardStatusVfxLayer — vieningas kortos būsenų VFX sluoksnis.
//  • IDLE: deklaratyviai iš aktyvių statusų (max 2 pagal prioritetą; subtilu,
//    GPU-friendly: tik transform/opacity, jokių gyvų blur animacijų).
//  • ONE-SHOT: apply/trigger/remove/destroy iš statusVfx bus (seq dedup —
//    rerender/tab switch/board move NIEKADA nepergroja animacijos).
//  • Inkaruota prie kortos konteinerio (absolute) — juda/keičia dydį kartu.
//  • Reduced-motion: visos one-shot → trumpas border flash + fade; idle statiška.
//  • Quality: low = be dalelių; medium = mažiau dalelių; high = pilna.
// z-tvarka: art(0) < vfx idle(5) < vfx one-shot(6) < stat juosta(10) < ikonos(30)
// ══════════════════════════════════════════════════════════════════════════════
import { memo, useEffect, useRef, useState } from 'react'
import {
  STATUS_VFX_REGISTRY, subscribeStatusVfx, getVfxQuality, prefersReducedMotion,
  type VfxStatusId, type StatusAnimationEvent,
} from '@/lib/game/statusVfx'

const IDLE_LIMIT = 2   // max vienu metu rodomi idle efektai (vizualinis chaosas draudžiamas)

type Shot = { key: string; statusId: VfxStatusId; type: StatusAnimationEvent['type'] }

let cssInjected = false
function VfxCss() {
  const [ok, setOk] = useState(false)
  useEffect(() => { if (!cssInjected) { cssInjected = true; setOk(true) } }, [])
  if (!ok) return null
  return (
    <style id="rvn-svfx-css">{`
      .rvnSvfx, .rvnSvfx * { pointer-events: none; }
      .rvnSvfx { position: absolute; inset: 0; border-radius: 8px; }
      /* ── IDLE ── */
      @keyframes svfxPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.7; } }
      @keyframes svfxFlicker { 0%,100% { opacity: 0.5; transform: scaleY(1); } 40% { opacity: 0.75; transform: scaleY(1.12); } 70% { opacity: 0.45; transform: scaleY(0.94); } }
      @keyframes svfxRise { 0% { transform: translateY(6px) scale(0.7); opacity: 0; } 25% { opacity: 0.8; } 100% { transform: translateY(-26px) scale(1.1); opacity: 0; } }
      @keyframes svfxOrbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes svfxShimmer { 0%,100% { opacity: 0.25; } 50% { opacity: 0.55; } }
      @keyframes svfxSheen { 0% { transform: translateX(-60%); } 100% { transform: translateX(160%); } }
      /* ── ONE-SHOT ── */
      @keyframes svfxRing { 0% { transform: scale(0.35); opacity: 0.95; } 70% { opacity: 0.6; } 100% { transform: scale(1.18); opacity: 0; } }
      @keyframes svfxFlash { 0% { opacity: 0; } 18% { opacity: 0.9; } 100% { opacity: 0; } }
      @keyframes svfxRipple { 0% { transform: scale(0.5); opacity: 0.9; } 100% { transform: scale(1.35); opacity: 0; } }
      @keyframes svfxShard { 0% { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.4); opacity: 0; } }
      @keyframes svfxSweep { 0% { transform: translateX(-105%); opacity: 0.9; } 100% { transform: translateX(105%); opacity: 0; } }
      @keyframes svfxBeam { 0% { transform: translateY(-110%); opacity: 0; } 30% { opacity: 0.85; } 100% { transform: translateY(10%); opacity: 0; } }
      @keyframes svfxShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 60% { transform: translateX(3px); } 80% { transform: translateX(-1.5px); } }
      @keyframes svfxUp { 0% { transform: translateY(0); opacity: 0.85; } 100% { transform: translateY(-30px); opacity: 0; } }
      @keyframes svfxInward { 0% { transform: scale(1.3); opacity: 0.85; } 100% { transform: scale(0.7); opacity: 0; } }
      @keyframes svfxCrack { 0% { opacity: 0; transform: scale(0.6); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.05); } }
      @keyframes svfxBreath { 0%,100% { transform: scale(1); opacity: 0.55; } 50% { transform: scale(1.035); opacity: 0.85; } }
      @keyframes svfxIdleRipple { 0% { transform: scale(0.92); opacity: 0.5; } 70% { opacity: 0.12; } 100% { transform: scale(1.16); opacity: 0; } }
      @keyframes svfxFlame { 0%,100% { transform: scaleY(1); opacity: 0.75; } 30% { transform: scaleY(1.28) translateY(-1px); opacity: 0.95; } 60% { transform: scaleY(0.82); opacity: 0.6; } }
      @keyframes svfxSnow { 0% { transform: translateY(-4px) translateX(0); opacity: 0; } 30% { opacity: 0.9; } 100% { transform: translateY(24px) translateX(4px); opacity: 0; } }
      @keyframes svfxFume { 0% { transform: translateY(6px) scale(0.7); opacity: 0; } 30% { opacity: 0.55; } 100% { transform: translateY(-30px) scale(1.3); opacity: 0; } }
      @keyframes svfxTwitch { 0%,88%,100% { transform: translate(0,0); } 90% { transform: translate(-2px,1px); } 93% { transform: translate(2px,-1px); } 96% { transform: translate(-1px,0); } }
      @keyframes svfxSpinOut { 0% { transform: rotate(0deg) scale(1); opacity: 1; } 100% { transform: rotate(280deg) scale(0.25); opacity: 0; } }
      @keyframes svfxRingIn { 0% { transform: scale(1.35); opacity: 0.9; } 100% { transform: scale(1); opacity: 0; } }
      @media (prefers-reduced-motion: reduce) {
        .rvnSvfx [data-anim] { animation: svfxFlash 0.35s ease-out both !important; }
        .rvnSvfx [data-idle] { animation: none !important; }
      }
    `}</style>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// IDLE CANVAS — „AAA flow" gyvos būsenos (per-kortos canvas + rAF particle sim).
// Kiekvienas statusas turi painter'į; canvas dengia kortą su užlaida efektams
// už kraštų. DOM sluoksniai lieka tik statinei bazei (tint/rėmas/varvekliai).
// quality 'low' arba reduced-motion → canvas nepaleidžiamas (lieka DOM bazė).
// ══════════════════════════════════════════════════════════════════════════════
const TAU = Math.PI * 2
const RD = (a: number, b: number) => a + Math.random() * (b - a)
function cglow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) {
  if (r <= 0 || a <= 0) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color); g.addColorStop(1, 'transparent')
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
}
function cstar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rot: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a1 = i / 5 * TAU - Math.PI / 2, a2 = a1 + TAU / 10
    ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r)
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45)
  }
  ctx.closePath(); ctx.fill(); ctx.restore()
}
type PaintCtx = { ctx: CanvasRenderingContext2D; w: number; h: number; now: number; st: Record<string, unknown>; D: number; hi: boolean }
type FirePart = { x: number; y: number; vx: number; vy: number; l: number; ml: number; s: number; ph: number }
type Mote = { x: number; y: number; v: number; ph: number }
type Blob2 = { x: number; y: number; s: number; v: number; ph: number; c: number; l: number }
type Suck = { a: number; r: number; v: number }

const IDLE_PAINTERS: Partial<Record<VfxStatusId, (p: PaintCtx) => void>> = {
  burning: ({ ctx, w, h, now, st, D, hi }) => {
    ctx.globalCompositeOperation = 'lighter'
    const px = 7 * D, py = 9 * D, cw = w - 2 * px, base = h - py - 2 * D
    // liepsnos kūnas: banguojantys sluoksniuoti blob'ai per visą apačią
    const n = hi ? 7 : 5
    for (let i = 0; i < n; i++) {
      const fx = px + (i + 0.5) / n * cw
      const ph = Math.sin(now / 95 + i * 1.7) * 0.5 + 0.5
      const ph2 = Math.sin(now / 63 + i * 2.9) * 0.5 + 0.5
      const fh = (0.13 + 0.1 * ph + 0.04 * ph2) * h
      cglow(ctx, fx, base - fh * 0.22, fh * 0.8, 'rgba(255,61,0,1)', 0.3)
      cglow(ctx, fx + Math.sin(now / 150 + i) * 2.4 * D, base - fh * 0.5, fh * 0.48, 'rgba(255,138,26,1)', 0.42)
      cglow(ctx, fx + Math.sin(now / 105 + i * 2) * 2 * D, base - fh * 0.72, fh * 0.28, 'rgba(255,209,102,1)', 0.5)
      if (ph > 0.55) cglow(ctx, fx, base - fh * 0.86, fh * 0.15, 'rgba(255,247,205,1)', 0.6 * ph)
    }
    // kylančios kibirkštys su vėjo svyravimu
    const parts = (st.p ??= []) as FirePart[]
    if (parts.length < (hi ? 20 : 12) && Math.random() < 0.55) parts.push({ x: px + Math.random() * cw, y: base, vx: RD(-0.2, 0.2) * D, vy: -RD(0.7, 1.8) * D, l: 0, ml: RD(500, 1100), s: RD(1.1, 2.4) * D, ph: RD(0, TAU) })
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k]; p.l += 16.7; p.x += p.vx + Math.sin(now / 140 + p.ph) * 0.45 * D; p.y += p.vy
      const e = p.l / p.ml
      if (e >= 1) { parts.splice(k, 1); continue }
      cglow(ctx, p.x, p.y, p.s * 2.2, `hsla(${20 + (1 - e) * 35},100%,${60 + 20 * (1 - e)}%,1)`, (1 - e) * 0.85)
    }
    ctx.globalCompositeOperation = 'source-over'
  },
  shield: ({ ctx, w, h, now, st, D, hi }) => {
    ctx.globalCompositeOperation = 'lighter'
    const t = '#6ec3ff', cx = w / 2, cy = h / 2
    const rx = w / 2 - 4 * D, ry = h / 2 - 4 * D
    // superelipsės perimetras — energijos mazgai bėga aplink kortą su uodegomis
    const per = (u: number) => {
      const a = u * TAU
      const ex = Math.pow(Math.abs(Math.cos(a)), 0.62) * Math.sign(Math.cos(a))
      const ey = Math.pow(Math.abs(Math.sin(a)), 0.62) * Math.sign(Math.sin(a))
      return { x: cx + ex * rx, y: cy + ey * ry }
    }
    for (const dir of [0, 0.5]) {
      const u = ((now / 2400) + dir) % 1
      for (let k = 0; k < 7; k++) {
        const p = per((u - k * 0.011 + 1) % 1)
        cglow(ctx, p.x, p.y, (8 - k) * 1.5 * D, t, 0.4 - k * 0.05)
        if (k < 3) cglow(ctx, p.x, p.y, (5 - k) * 1.1 * D, '#eaf6ff', 0.55 - k * 0.14)
      }
    }
    // kvėpuojantis kupolo švytėjimas
    const br = Math.sin(now / 650) * 0.5 + 0.5
    cglow(ctx, cx, cy * 0.9, Math.max(w, h) * 0.55, t, 0.05 + br * 0.05)
    // energijos motai viduje
    const motes = (st.m ??= Array.from({ length: hi ? 5 : 3 }, () => ({ x: RD(8 * D, w - 8 * D), y: RD(10 * D, h - 10 * D), v: RD(0.15, 0.38), ph: RD(0, TAU) }))) as Mote[]
    for (const m of motes) {
      m.y -= m.v * D
      if (m.y < 10 * D) { m.y = h - 10 * D; m.x = RD(8 * D, w - 8 * D) }
      cglow(ctx, m.x + Math.sin(now / 480 + m.ph) * 3 * D, m.y, 1.9 * D, '#dff1ff', 0.5)
    }
    ctx.globalCompositeOperation = 'source-over'
  },
  frozen: ({ ctx, w, h, now, st, D, hi }) => {
    ctx.globalCompositeOperation = 'lighter'
    const t = '#7dd3fc', px = 7 * D, py = 9 * D, cw = w - 2 * px, ch = h - 2 * py
    // šviesos refrakcija: pasvirusi juosta lėtai slenka per ledą
    const u = ((now / 3200) % 1.3) - 0.15
    ctx.save(); ctx.translate(px + cw * 0.5, py + ch * u); ctx.rotate(-0.45)
    const g = ctx.createLinearGradient(0, -13 * D, 0, 13 * D)
    g.addColorStop(0, 'transparent'); g.addColorStop(0.5, 'rgba(232,249,255,0.32)'); g.addColorStop(1, 'transparent')
    ctx.fillStyle = g; ctx.fillRect(-cw, -13 * D, cw * 2, 26 * D)
    ctx.restore()
    // mirksintys kristalų blizgesiai su kryžiaus flare
    const tw = (st.tw ??= Array.from({ length: hi ? 7 : 5 }, () => ({ x: RD(px, px + cw), y: RD(py, py + ch), v: 0, ph: RD(0, TAU) }))) as Mote[]
    for (const s of tw) {
      const a = Math.max(0, Math.sin(now / 380 + s.ph))
      cglow(ctx, s.x, s.y, 4 * D, '#ffffff', a * 0.7)
      if (a > 0.85) {
        ctx.globalAlpha = (a - 0.85) / 0.15 * 0.6; ctx.fillStyle = '#ffffff'
        ctx.fillRect(s.x - 4.5 * D, s.y - 0.6 * D, 9 * D, 1.2 * D)
        ctx.fillRect(s.x - 0.6 * D, s.y - 4.5 * D, 1.2 * D, 9 * D)
        ctx.globalAlpha = 1
      }
    }
    // dreifuojančios snaigės
    const sn = (st.sn ??= Array.from({ length: hi ? 6 : 4 }, () => ({ x: RD(px, px + cw), y: RD(py, py + ch), v: RD(0.18, 0.45), ph: RD(0, TAU) }))) as Mote[]
    for (const s of sn) {
      s.y += s.v * D; s.x += Math.sin(now / 700 + s.ph) * 0.32 * D
      if (s.y > py + ch) { s.y = py; s.x = RD(px, px + cw) }
      cglow(ctx, s.x, s.y, 1.7 * D, '#e0f2fe', 0.85)
    }
    // šalčio garas prie apačios
    cglow(ctx, w / 2, h - py, cw * 0.45, t, 0.05 + (Math.sin(now / 900) * 0.5 + 0.5) * 0.05)
    ctx.globalCompositeOperation = 'source-over'
  },
  poisoned: ({ ctx, w, h, now, st, D, hi }) => {
    ctx.globalCompositeOperation = 'lighter'
    const px = 7 * D, py = 9 * D, cw = w - 2 * px, ch = h - 2 * py, base = h - py
    // besisukantys dūmų kamuoliai kyla banguodami
    const blobs = (st.b ??= Array.from({ length: hi ? 7 : 5 }, (_, i) => ({ x: RD(px, px + cw), y: base - RD(0, ch * 0.25), s: RD(8, 16) * D, v: RD(0.1, 0.28), ph: RD(0, TAU), c: i % 3 === 1 ? 1 : 0, l: RD(0, 0.8) }))) as Blob2[]
    for (const b of blobs) {
      b.y -= b.v * D; b.l += 0.0042; b.x += Math.sin(now / 850 + b.ph) * 0.38 * D
      if (b.y < py + ch * 0.3 || b.l > 1) { b.y = base - RD(0, 6 * D); b.x = RD(px, px + cw); b.l = 0 }
      const a = Math.sin(Math.min(1, b.l) * Math.PI)
      const col = b.c ? 'rgba(167,139,250,1)' : 'rgba(74,222,128,1)'
      cglow(ctx, b.x, b.y, b.s * 1.6, col, a * 0.15)
      cglow(ctx, b.x + Math.cos(now / 560 + b.ph) * b.s * 0.4, b.y + Math.sin(now / 560 + b.ph) * b.s * 0.24, b.s * 0.85, col, a * 0.2)
    }
    // burbulai su trūkimu
    const bb = (st.bb ??= []) as FirePart[]
    if (bb.length < 4 && Math.random() < 0.045) bb.push({ x: RD(px + 6 * D, px + cw - 6 * D), y: base - 4 * D, vx: 0, vy: -RD(0.35, 0.7) * D, l: 0, ml: 1000, s: RD(1.8, 3) * D, ph: 0 })
    for (let k = bb.length - 1; k >= 0; k--) {
      const b = bb[k]; b.y += b.vy; b.l += 20
      const e = b.l / b.ml
      if (e >= 1) { bb.splice(k, 1); continue }
      ctx.globalAlpha = (1 - e) * 0.8; ctx.strokeStyle = '#b9f3cf'; ctx.lineWidth = 1 * D
      ctx.beginPath(); ctx.arc(b.x, b.y, b.s * (1 + e * 0.6), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1
    }
    ctx.globalCompositeOperation = 'source-over'
  },
  silenced: ({ ctx, w, h, now, st, D }) => {
    ctx.globalCompositeOperation = 'lighter'
    const t = '#a78bfa', cx = w / 2, cy = h / 2, rx = w * 0.34, ry = h * 0.3
    // runų žiedas su uodegomis (lėta orbita)
    for (let g2 = 0; g2 < 6; g2++) {
      const a = now / 3800 * TAU + g2 / 6 * TAU
      for (let k = 0; k < 4; k++) {
        const a2 = a - k * 0.07
        cglow(ctx, cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry, (4.5 - k) * 1.25 * D, t, 0.45 - k * 0.1)
      }
    }
    // magija čiulpiama Į VIDŲ — dalelės iš kraštų į sigilą
    const suck = (st.p ??= []) as Suck[]
    if (suck.length < 6 && Math.random() < 0.12) suck.push({ a: RD(0, TAU), r: 1, v: RD(0.005, 0.011) })
    for (let k = suck.length - 1; k >= 0; k--) {
      const p = suck[k]; p.r -= p.v
      if (p.r <= 0.16) { suck.splice(k, 1); continue }
      cglow(ctx, cx + Math.cos(p.a) * p.r * w * 0.5, cy + Math.sin(p.a) * p.r * h * 0.5, 1.9 * D, t, (1 - p.r) * 0.7)
    }
    // sigilo pulsavimas
    cglow(ctx, cx, cy, Math.min(w, h) * 0.2, t, 0.07 + (Math.sin(now / 700) * 0.5 + 0.5) * 0.09)
    ctx.globalCompositeOperation = 'source-over'
  },
  stunned: ({ ctx, w, h, now, st, D }) => {
    ctx.globalCompositeOperation = 'lighter'
    const t = '#f0b429', cx = w / 2, topY = 9 * D, rx = w * 0.27, ry = 6.5 * D
    // žvaigždės su judesio uodegomis ant pasvirusios elipsės
    for (let i = 0; i < 3; i++) {
      const a = now / 1400 * TAU + i / 3 * TAU
      for (let k = 4; k >= 1; k--) {
        const a2 = a - k * 0.16
        cglow(ctx, cx + Math.cos(a2) * rx, topY + Math.sin(a2) * ry, (5 - k) * 1.15 * D, t, 0.36 - k * 0.07)
      }
      const x = cx + Math.cos(a) * rx, y = topY + Math.sin(a) * ry
      cglow(ctx, x, y, 6.5 * D, t, 0.5)
      cstar(ctx, x, y, 4.6 * D, '#ffe9a8', a)
    }
    // atsitiktiniai elektros lankai kraštuose
    if (now > ((st.arc as number) ?? 0)) { st.arc = now + RD(500, 1400); st.arcT = now; st.arcSide = Math.random() < 0.5 ? 0 : 1; st.arcY = RD(0.25, 0.7) }
    const at = st.arcT as number | undefined
    if (at && now - at < 170) {
      const e = (now - at) / 170
      const x0 = (st.arcSide as number) ? w - 6 * D : 6 * D
      for (let k = 0; k < 6; k++) {
        const y = h * (st.arcY as number) + k * 3.2 * D
        const x = x0 + ((k % 2) ? 1 : -1) * 3 * D * ((st.arcSide as number) ? -1 : 1)
        cglow(ctx, x, y, 2.2 * D, '#fff7cc', (1 - e) * 0.9)
        cglow(ctx, x, y, 4.6 * D, t, (1 - e) * 0.5)
      }
    }
    ctx.globalCompositeOperation = 'source-over'
  },
}

const CANVAS_STATUSES: VfxStatusId[] = ['shield', 'burning', 'frozen', 'poisoned', 'silenced', 'stunned']

/** Gyvas idle canvas: vienas <canvas> kortai, piešia visų aktyvių statusų flow. */
function IdleCanvas({ statuses }: { statuses: VfxStatusId[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = statuses.join(',')
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let alive = true
    let raf = 0
    const D = Math.min(1.5, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
    const hi = getVfxQuality() === 'high'
    const states: Record<string, Record<string, unknown>> = {}
    const resize = () => {
      const host = c.parentElement
      if (!host) return
      c.width = Math.max(10, (host.clientWidth + 16) * D)
      c.height = Math.max(10, (host.clientHeight + 24) * D)
    }
    resize()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    if (ro && c.parentElement) ro.observe(c.parentElement)
    const loop = (now: number) => {
      if (!alive) return
      if (!document.hidden) {
        ctx.clearRect(0, 0, c.width, c.height)
        for (const s of statuses) IDLE_PAINTERS[s]?.({ ctx, w: c.width, h: c.height, now, st: (states[s] ??= {}), D, hi })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { alive = false; cancelAnimationFrame(raf); ro?.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return <canvas ref={ref} aria-hidden style={{ position: 'absolute', left: -8, top: -12, width: 'calc(100% + 16px)', height: 'calc(100% + 24px)', pointerEvents: 'none', zIndex: 6 }} />
}

// ── Idle sluoksniai pagal statusą ────────────────────────────────────────────
function Idle({ id, q }: { id: VfxStatusId; q: 'low' | 'medium' | 'high' }) {
  const t = STATUS_VFX_REGISTRY[id].tint
  const parts = q === 'low' ? 0 : q === 'medium' ? 1 : 2
  switch (id) {
    case 'shield': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="shield">
        {/* statinė bazė: kupolas + kraštas (judesį piešia IdleCanvas) */}
        <div data-idle style={{ position: 'absolute', inset: -3, borderRadius: 11, background: `radial-gradient(ellipse at 50% 42%, ${t}10 45%, ${t}2e 78%, ${t}55 100%)`, border: `2px solid ${t}cc`, boxShadow: `0 0 14px ${t}88, inset 0 0 16px ${t}55`, animation: 'svfxBreath 2.2s ease-in-out infinite' }} />
        {parts >= 0 && <div style={{ position: 'absolute', inset: -2, borderRadius: 10, opacity: 0.14, backgroundImage: `radial-gradient(circle at 25% 30%, ${t} 1.5px, transparent 2.5px), radial-gradient(circle at 75% 60%, ${t} 1.5px, transparent 2.5px), radial-gradient(circle at 45% 80%, ${t} 1.5px, transparent 2.5px)`, backgroundSize: '28px 28px' }} />}
      </div>)
    case 'burning': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="burning">
        {/* statinė bazė: karščio pašvaistė + apatinis švytėjimas (liepsnas piešia IdleCanvas) */}
        <div data-idle style={{ position: 'absolute', inset: -3, borderRadius: 11, boxShadow: `0 0 16px #ff5a0077, inset 0 -14px 20px #ff430055`, animation: 'svfxPulse 1.2s ease-in-out infinite' }} />
        {parts >= 0 && <div style={{ position: 'absolute', left: -1, right: -1, bottom: -2, height: '30%', borderRadius: '0 0 9px 9px', background: 'linear-gradient(0deg, #ff3d0066, transparent)' }} />}
      </div>)
    case 'frozen': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="frozen">
        {/* statinė bazė: ledo sluoksnis + varvekliai + briaunos + kampų kristalai (blizgesį/snaiges piešia IdleCanvas) */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: `linear-gradient(160deg, ${t}40 0%, ${t}1a 45%, ${t}47 100%)`, boxShadow: `inset 0 0 22px ${t}90` }} />
        <div style={{ position: 'absolute', top: -2, left: 2, right: 2, height: 16, background: `linear-gradient(180deg, #e8f7ffe6, ${t}aa 55%, transparent)`, clipPath: 'polygon(0 0, 100% 0, 100% 34%, 92% 88%, 84% 38%, 74% 70%, 64% 36%, 55% 96%, 46% 38%, 36% 66%, 27% 36%, 17% 84%, 8% 38%, 0 30%)' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden' }}>
          <span style={{ position: 'absolute', top: '-12%', left: '14%', width: 3, height: '130%', background: '#ffffff', opacity: 0.3, transform: 'rotate(24deg)' }} />
          <span style={{ position: 'absolute', top: '-12%', left: '58%', width: 2, height: '130%', background: '#ffffff', opacity: 0.22, transform: 'rotate(-18deg)' }} />
        </div>
        <div data-idle style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `2.5px solid ${t}`, boxShadow: `0 0 14px ${t}88`, animation: 'svfxShimmer 3s ease-in-out infinite' }} />
        <span style={{ position: 'absolute', top: -4, left: -4, width: 12, height: 12, background: '#cdeeff', clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', filter: `drop-shadow(0 0 4px ${t})` }} />
        <span style={{ position: 'absolute', bottom: -4, right: -4, width: 11, height: 11, background: '#cdeeff', clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', filter: `drop-shadow(0 0 4px ${t})` }} />
        {parts >= 0 && null}
      </div>)
    case 'poisoned': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="poisoned">
        {/* statinė bazė: tint + rėmas (dūmus/burbulus piešia IdleCanvas) */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: `linear-gradient(0deg, ${t}33, transparent 55%)` }} />
        <div data-idle style={{ position: 'absolute', inset: -3, borderRadius: 11, border: '2px solid #74e69d', boxShadow: `0 0 14px ${t}88, inset 0 -14px 18px ${t}44`, animation: 'svfxPulse 2s ease-in-out infinite' }} />
        {parts >= 0 && null}
      </div>)
    case 'stunned': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="stunned">
        {/* statinė bazė: pritemdymas + twitch (žvaigždes/lankus piešia IdleCanvas) */}
        <div data-idle style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(20,16,30,0.26)', animation: 'svfxTwitch 2.8s ease-in-out infinite' }} />
        {parts >= 0 && null}
      </div>)
    case 'silenced': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="silenced">
        {/* statinė bazė: pritemdymas + sigilas + juosta (runų orbitą piešia IdleCanvas) */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(12,8,22,0.5)' }} />
        <div data-idle style={{ position: 'absolute', inset: '26% 20%', borderRadius: '50%', border: `2.5px solid ${t}cc`, boxShadow: `0 0 12px ${t}88, inset 0 0 10px ${t}44`, animation: 'svfxShimmer 2.4s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: '76%', height: 2.5, background: t, transform: 'rotate(-40deg)', boxShadow: `0 0 6px ${t}` }} />
        </div>
        <div data-idle style={{ position: 'absolute', left: -3, right: -3, top: '47%', height: 9, background: `linear-gradient(90deg, transparent, ${t}66 18%, ${t}aa 50%, ${t}66 82%, transparent)`, boxShadow: `0 0 10px ${t}55`, animation: 'svfxShimmer 2.2s ease-in-out infinite' }} />
      </div>)
    case 'blessed': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="blessed">
        <div data-idle style={{ position: 'absolute', top: -6, left: '20%', right: '20%', height: 10, borderRadius: '50%', background: `radial-gradient(ellipse, ${t}77, transparent 70%)`, animation: 'svfxPulse 2.6s ease-in-out infinite' }} />
        <div data-idle style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `1px solid ${t}55`, animation: 'svfxPulse 2.6s ease-in-out infinite' }} />
        {Array.from({ length: parts }).map((_, i) => (
          <span key={i} data-idle style={{ position: 'absolute', bottom: '30%', left: `${28 + i * 40}%`, width: 2.5, height: 2.5, borderRadius: 2, background: '#fef3c7', animation: `svfxRise 2.2s ease-out ${i * 0.9}s infinite` }} />
        ))}
      </div>)
    case 'stealth': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="stealth">
        <div data-idle style={{ position: 'absolute', inset: 0, borderRadius: 8, background: `linear-gradient(180deg, transparent 40%, ${t}26)`, animation: 'svfxShimmer 3.4s ease-in-out infinite' }} />
      </div>)
    case 'control': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="control">
        <div data-idle style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `1.5px dashed ${t}88`, animation: 'svfxPulse 2s ease-in-out infinite' }} />
      </div>)
    case 'taunt': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="taunt">
        <div data-idle style={{ position: 'absolute', inset: -1, borderRadius: 9, border: `1px solid ${t}44`, animation: 'svfxPulse 4s ease-in-out infinite' }} />
      </div>)
    case 'immortal': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="immortal">
        <div data-idle style={{ position: 'absolute', inset: -2, borderRadius: 10, boxShadow: `inset 0 0 10px ${t}44`, animation: 'svfxPulse 3s ease-in-out infinite' }} />
      </div>)
    default: return null
  }
}

// ── One-shot animacijos ──────────────────────────────────────────────────────
function OneShot({ s, onDone, q }: { s: Shot; onDone: () => void; q: 'low' | 'medium' | 'high' }) {
  const t = STATUS_VFX_REGISTRY[s.statusId].tint
  const doneRef = useRef(false)
  const fire = () => { if (!doneRef.current) { doneRef.current = true; onDone() } }
  // saugiklis, jei animationend nesuveiktų (pvz. display:none tab'e)
  useEffect(() => { const to = setTimeout(fire, 900); return () => clearTimeout(to) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const shards = q === 'low' ? 0 : q === 'medium' ? 5 : 8
  const key = `${s.statusId}:${s.type}`
  const common = { className: 'rvnSvfx', style: { zIndex: 6 } as React.CSSProperties, 'data-vfx-shot': key }

  // REMOVE: skydas susvyruoja ir išsiskaido į daleles (švelnus expire)
  if (s.statusId === 'shield' && s.type === 'remove') {
    return (
      <div {...common}>
        <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -3, borderRadius: 11, border: `1.5px solid ${t}aa`, animation: 'svfxShake 0.3s ease-in-out both' }} />
        <div data-anim style={{ position: 'absolute', inset: -3, borderRadius: 11, border: `1.5px solid ${t}`, animation: 'svfxRipple 0.55s ease-out 0.25s both' }} />
        {Array.from({ length: Math.min(5, Math.max(3, shards)) }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2
          return <span key={i} data-anim style={{ position: 'absolute', top: '50%', left: '50%', width: 4, height: 4, borderRadius: 4, background: t, boxShadow: `0 0 5px ${t}`, ['--dx' as string]: `${Math.cos(a) * 26}px`, ['--dy' as string]: `${Math.sin(a) * 26}px`, ['--rot' as string]: '0deg', animation: `svfxShard 0.55s ease-out ${0.2 + i * 0.03}s both` }} />
        })}
      </div>)
  }
  // DESTROY: skydo dužimas — flash + ratilas + energijos šukės
  if (s.statusId === 'shield' && s.type === 'destroy') {
    return (
      <div {...common}>
        <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -2, borderRadius: 10, background: `${t}55`, animation: 'svfxFlash 0.6s ease-out both' }} />
        <div data-anim style={{ position: 'absolute', inset: -6, borderRadius: 12, border: `2px solid ${t}`, animation: 'svfxRipple 0.55s ease-out both' }} />
        {Array.from({ length: shards }).map((_, i) => {
          const a = (i / Math.max(1, shards)) * Math.PI * 2
          return <span key={i} data-anim style={{
            position: 'absolute', top: '50%', left: '50%', width: 7, height: 10,
            background: `linear-gradient(160deg, ${t}, ${t}33)`, clipPath: 'polygon(50% 0, 100% 60%, 60% 100%, 0 45%)',
            ['--dx' as string]: `${Math.cos(a) * 34}px`, ['--dy' as string]: `${Math.sin(a) * 34}px`, ['--rot' as string]: `${(i % 2 ? 1 : -1) * 160}deg`,
            animation: `svfxShard 0.6s cubic-bezier(0.2,0.7,0.4,1) ${i * 0.02}s both`,
          }} />
        })}
      </div>)
  }
  if (s.type === 'trigger') {
    // reakcijos: ripple/pliūpsnis pagal statusą
    return (
      <div {...common}>
        {s.statusId === 'shield' && <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -4, borderRadius: 11, border: `2px solid ${t}`, boxShadow: `0 0 14px ${t}`, animation: 'svfxRipple 0.4s ease-out both' }} />}
        {s.statusId === 'burning' && <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%', borderRadius: 8, background: `linear-gradient(0deg, ${t}88, transparent)`, transformOrigin: 'bottom', animation: 'svfxFlicker 0.35s ease-out 2 both' }} />}
        {s.statusId === 'poisoned' && <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -2, borderRadius: 10, background: `radial-gradient(ellipse at 50% 80%, ${t}66, transparent 65%)`, animation: 'svfxInward 0.4s ease-out both' }} />}
        {s.statusId === 'frozen' && <>
          <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -2, borderRadius: 10, background: `${t}44`, animation: 'svfxFlash 0.35s ease-out both' }} />
          <span data-anim style={{ position: 'absolute', top: '20%', left: '30%', width: 1.5, height: '55%', background: '#e0f2fe', transform: 'rotate(20deg)', animation: 'svfxCrack 0.4s ease-out both' }} />
        </>}
        {s.statusId === 'stunned' && <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: 0, animation: 'svfxShake 0.3s ease-in-out both' }}>
          <div style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `2px solid ${t}aa` }} />
        </div>}
        {s.statusId === 'silenced' && <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: '20% 15%', borderRadius: '50%', border: `2px solid ${t}`, animation: 'svfxInward 0.35s ease-in both' }} />}
        {s.statusId === 'blessed' && <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -3, borderRadius: 11, boxShadow: `0 0 16px ${t}, inset 0 0 12px ${t}66`, animation: 'svfxFlash 0.45s ease-out both' }} />}
        {!['shield', 'burning', 'poisoned', 'frozen', 'stunned', 'silenced', 'blessed'].includes(s.statusId) &&
          <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `2px solid ${t}`, animation: 'svfxFlash 0.35s ease-out both' }} />}
      </div>)
  }
  if (s.type === 'remove' || s.type === 'destroy') {
    // švelnus nuėmimas: garai/šukės/išblėsimas pagal statusą
    return (
      <div {...common}>
        {s.statusId === 'frozen' ? <>
          <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `2px solid ${t}`, animation: 'svfxFlash 0.4s ease-out both' }} />
          {Array.from({ length: Math.min(4, shards) }).map((_, i) => (
            <span key={i} data-anim style={{ position: 'absolute', top: `${15 + i * 20}%`, left: `${10 + (i % 2) * 70}%`, width: 6, height: 8, background: t, opacity: 0.9, clipPath: 'polygon(50% 0, 100% 60%, 40% 100%, 0 40%)', ['--dx' as string]: `${(i % 2 ? 1 : -1) * 14}px`, ['--dy' as string]: '26px', ['--rot' as string]: '90deg', animation: `svfxShard 0.5s ease-in ${i * 0.04}s both` }} />
          ))}
        </> : s.statusId === 'poisoned' || s.statusId === 'burning' || s.statusId === 'stealth' ? (
          <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: '30% 20% 0', borderRadius: 10, background: `radial-gradient(ellipse at 50% 90%, ${t}66, transparent 70%)`, animation: 'svfxUp 0.5s ease-out both' }} />
        ) : s.statusId === 'stunned' ? (
          <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', top: -10, left: '50%', width: 30, height: 30, marginLeft: -15, animation: 'svfxSpinOut 0.55s ease-in both' }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ position: 'absolute', top: i === 0 ? 0 : i === 1 ? 18 : 8, left: i === 0 ? 12 : i === 1 ? 2 : 24, width: 6, height: 6, background: t, clipPath: 'polygon(50% 0, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0 50%, 35% 35%)', filter: `drop-shadow(0 0 3px ${t})` }} />
            ))}
          </div>
        ) : s.statusId === 'silenced' ? (
          <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: '25% 20%', borderRadius: '50%', border: `2px solid ${t}`, animation: 'svfxCrack 0.45s ease-out both' }} />
        ) : (
          <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `1.5px solid ${t}`, animation: 'svfxUp 0.45s ease-out both' }} />
        )}
      </div>)
  }
  // APPLY
  return (
    <div {...common}>
      {s.statusId === 'shield' && <>
        <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -3, borderRadius: 11, border: `2px solid ${t}`, boxShadow: `0 0 18px ${t}99, inset 0 0 14px ${t}44`, animation: 'svfxRing 0.45s cubic-bezier(0.2,0.8,0.3,1) both' }} />
        {/* pulse išsiplečia plačiau ir susitraukia į pastovų skydą */}
        <div data-anim style={{ position: 'absolute', inset: -3, borderRadius: 11, border: `1.5px solid ${t}cc`, animation: 'svfxRingIn 0.45s ease-out 0.3s both' }} />
        <div data-anim style={{ position: 'absolute', inset: -2, borderRadius: 10, background: `radial-gradient(circle, transparent 55%, ${t}44)`, animation: 'svfxFlash 0.5s ease-out both' }} />
        {/* energijos sweep aplink kontūrą */}
        <div data-anim style={{ position: 'absolute', inset: -2, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, width: '50%', background: `linear-gradient(105deg, transparent, ${t}55, transparent)`, animation: 'svfxSweep 0.5s ease-out 0.1s both' }} />
        </div>
      </>}
      {s.statusId === 'frozen' && <>
        <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -2, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(120deg, ${t}77, ${t}22 55%, transparent)`, animation: 'svfxSweep 0.45s ease-out both' }} />
        </div>
        <div data-anim style={{ position: 'absolute', inset: -2, borderRadius: 10, background: '#e0f2fe33', animation: 'svfxFlash 0.4s ease-out both' }} />
      </>}
      {s.statusId === 'burning' && <>
        <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', left: -1, right: -1, bottom: -2, height: '55%', borderRadius: '0 0 9px 9px', background: `linear-gradient(0deg, ${t}aa, transparent)`, transformOrigin: 'bottom', animation: 'svfxFlicker 0.4s ease-out both' }} />
        <div data-anim style={{ position: 'absolute', inset: -2, borderRadius: 10, background: `${t}44`, animation: 'svfxFlash 0.3s ease-out both' }} />
        {/* uždegimo kibirkštys */}
        {Array.from({ length: Math.min(4, Math.max(2, shards - 3)) }).map((_, i) => {
          const a = -Math.PI / 2 + (i - 1.5) * 0.6
          return <span key={i} data-anim style={{ position: 'absolute', top: '60%', left: '50%', width: 3, height: 3, borderRadius: 3, background: '#fde047', boxShadow: '0 0 5px #fb923c', ['--dx' as string]: `${Math.cos(a) * 28}px`, ['--dy' as string]: `${Math.sin(a) * 30}px`, ['--rot' as string]: '0deg', animation: `svfxShard 0.5s ease-out ${i * 0.03}s both` }} />
        })}
      </>}
      {s.statusId === 'poisoned' && <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: '20% -2px -2px', borderRadius: 10, background: `radial-gradient(ellipse at 50% 100%, ${t}77, transparent 70%)`, animation: 'svfxRing 0.45s ease-out both' }} />}
      {s.statusId === 'stunned' && <>
        <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: 0, animation: 'svfxShake 0.35s ease-in-out both' }}>
          <div style={{ position: 'absolute', top: -6, left: '25%', right: '25%', height: 8, borderRadius: '50%', background: `radial-gradient(ellipse, ${t}aa, transparent)` }} />
        </div>
        <div data-anim style={{ position: 'absolute', inset: -2, borderRadius: 10, background: `${t}2e`, animation: 'svfxFlash 0.3s ease-out both' }} />
        {/* elektros zigzagai */}
        {[0, 1].map((i) => (
          <span key={'z' + i} data-anim style={{ position: 'absolute', top: `${18 + i * 34}%`, left: i ? '64%' : '16%', width: 4, height: 18, background: '#fff7cc', clipPath: 'polygon(60% 0, 100% 0, 45% 45%, 70% 45%, 0 100%, 25% 55%, 0 55%)', filter: `drop-shadow(0 0 4px ${t})`, animation: `svfxFlash 0.35s ease-out ${i * 0.08}s both` }} />
        ))}
      </>}
      {s.statusId === 'silenced' && <>
        <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -2, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, #0f0a19dd, transparent)`, animation: 'svfxSweep 0.5s ease-in-out both' }} />
        </div>
        <div data-anim style={{ position: 'absolute', inset: '25% 20%', borderRadius: '50%', border: `2px solid ${t}`, animation: 'svfxInward 0.45s ease-out 0.15s both' }} />
      </>}
      {s.statusId === 'blessed' && <>
        <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: '-10% 30% 30%', background: `linear-gradient(180deg, ${t}88, transparent)`, animation: 'svfxBeam 0.55s ease-out both' }} />
        <div data-anim style={{ position: 'absolute', inset: -3, borderRadius: 11, border: `1.5px solid ${t}`, animation: 'svfxRing 0.55s ease-out 0.1s both' }} />
      </>}
      {!['shield', 'frozen', 'burning', 'poisoned', 'stunned', 'silenced', 'blessed'].includes(s.statusId) &&
        <div data-anim onAnimationEnd={fire} style={{ position: 'absolute', inset: -3, borderRadius: 11, border: `2px solid ${t}`, boxShadow: `0 0 12px ${t}88`, animation: 'svfxRing 0.4s ease-out both' }} />}
    </div>
  )
}

// ── Pagrindinis sluoksnis ────────────────────────────────────────────────────
export const CardStatusVfxLayer = memo(function CardStatusVfxLayer({ uid, active }: {
  uid: string
  active: VfxStatusId[]   // šiuo metu aktyvūs statusai (idle)
}) {
  const [shots, setShots] = useState<Shot[]>([])
  const q = useRef(getVfxQuality())
  const rm = useRef(prefersReducedMotion())

  useEffect(() => subscribeStatusVfx(uid, (e) => {
    // eilė: max 2 vienu metu; svarbiausia (destroy) — pirmiau
    setShots((prev) => {
      const next: Shot = { key: `${e.seq}`, statusId: e.statusId, type: e.type }
      const arr = [...prev, next]
      return arr.length > 3 ? arr.slice(arr.length - 3) : arr
    })
  }), [uid])

  const idle = active
    .filter((s) => STATUS_VFX_REGISTRY[s])
    .sort((a, b) => STATUS_VFX_REGISTRY[b].priority - STATUS_VFX_REGISTRY[a].priority)
    .slice(0, IDLE_LIMIT)

  return (
    <>
      <VfxCss />
      {!rm.current && idle.map((s) => <Idle key={s} id={s} q={q.current} />)}
      {!rm.current && q.current !== 'low' && (() => {
        const cvs = idle.filter((s) => CANVAS_STATUSES.includes(s))
        return cvs.length > 0 ? <IdleCanvas statuses={cvs} /> : null
      })()}
      {rm.current && idle.slice(0, 1).map((s) => (
        <div key={s} className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle={s}>
          <div style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `1.5px solid ${STATUS_VFX_REGISTRY[s].tint}66` }} />
        </div>
      ))}
      {shots.map((s) => (
        <OneShot key={s.key} s={s} q={q.current} onDone={() => setShots((prev) => prev.filter((x) => x.key !== s.key))} />
      ))}
    </>
  )
})
