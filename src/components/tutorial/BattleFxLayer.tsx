'use client'

// ── Kovos efektų sluoksnis ────────────────────────────────────────────────────
// Vienas <canvas> + vienas requestAnimationFrame ciklas tvarko visus aktyvius
// efektus (projektilai, kirčiai, spinduliai, srautai, bangos, sigilai, irimas,
// skydai, šaltis ...). Efektai PRASIDEDA nuo source kortos ir keliauja į taikinį.
// Plaukiantys skaičiai (-2/+2) ir purtymas (board/korta) – per imperatyvų handle,
// kad nereiktų re-renderinti didžiojo TutorialGame komponento.
//
// Naudojimas (tėve):
//   const fx = useRef<BattleFxHandle>(null)
//   <BattleFxLayer ref={fx} />
//   fx.current?.spawn({ kind:'projectile', from, to, color:'#ff7a1a' })
//   fx.current?.floatNumber(x, y, '-2', '#ff5a4a')
//   fx.current?.shakeBoard('soft'); fx.current?.shakeUnit(uid, 'normal')

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { FxKind, FxIntensity } from '@/lib/game/effectAnimations'

export type SpawnFx = {
  kind: FxKind
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  color: string
  color2?: string
  intensity?: FxIntensity
  duration?: number // sekundės
}

export type BattleFxHandle = {
  spawn: (fx: SpawnFx) => void
  floatNumber: (x: number, y: number, text: string, color: string, big?: boolean) => void
  shakeBoard: (kind?: 'soft' | 'hard') => void
  shakeUnit: (uid: string, kind?: 'soft' | 'normal' | 'hard') => void
  hitFlash: (x: number, y: number, color: string) => void
}

const TAU = Math.PI * 2
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeIn = (t: number) => t * t
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const intMul = (i?: FxIntensity) => (i === 'big' ? 1.5 : i === 'small' ? 0.7 : 1)

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; rot: number; vr: number }
type Item = {
  id: number; kind: FxKind; from: { x: number; y: number }; to: { x: number; y: number }
  color: string; color2: string; im: number; dur: number; t0: number; parts: P[]; seeded: boolean
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color); g.addColorStop(1, 'transparent')
  ctx.globalAlpha = a; ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
}

export const BattleFxLayer = forwardRef<BattleFxHandle>(function BattleFxLayer(_props, ref) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const items = useRef<Item[]>([])
  const raf = useRef(0)
  const running = useRef(false)
  const idc = useRef(0)
  const dprRef = useRef(1)
  const [nums, setNums] = useState<{ id: number; x: number; y: number; text: string; color: string; big?: boolean }[]>([])

  const ensureLoop = () => { if (!running.current) { running.current = true; raf.current = requestAnimationFrame(loop) } }

  useImperativeHandle(ref, () => ({
    spawn: (fx) => {
      const D = dprRef.current
      const from = fx.from ?? fx.to ?? { x: 0, y: 0 }
      const to = fx.to ?? fx.from ?? { x: 0, y: 0 }
      items.current.push({
        id: ++idc.current, kind: fx.kind,
        from: { x: from.x * D, y: from.y * D }, to: { x: to.x * D, y: to.y * D },
        color: fx.color, color2: fx.color2 ?? fx.color, im: intMul(fx.intensity),
        dur: (fx.duration ?? 1.4) * 1000, t0: performance.now(), parts: [], seeded: false,
      })
      ensureLoop()
    },
    floatNumber: (x, y, text, color, big) => {
      const id = ++idc.current
      setNums((n) => [...n, { id, x, y, text, color, big }])
      window.setTimeout(() => setNums((n) => n.filter((m) => m.id !== id)), 1150)
    },
    shakeBoard: (kind = 'soft') => {
      const el = document.querySelector('[data-fx-root]') as HTMLElement | null
      if (!el) return
      const cls = kind === 'hard' ? 'rvn-shake-hard' : 'rvn-shake-soft'
      el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls)
      window.setTimeout(() => el.classList.remove(cls), kind === 'hard' ? 480 : 360)
    },
    shakeUnit: (uid, kind = 'normal') => {
      const el = document.querySelector(`[data-unit-uid="${uid}"]`) as HTMLElement | null
      if (!el) return
      const cls = kind === 'hard' ? 'rvn-hit-hard' : kind === 'soft' ? 'rvn-hit-soft' : 'rvn-hit'
      el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls)
      window.setTimeout(() => el.classList.remove(cls), 420)
    },
    hitFlash: (x, y, color) => {
      const D = dprRef.current
      items.current.push({ id: ++idc.current, kind: 'disintegrate', from: { x: x * D, y: y * D }, to: { x: x * D, y: y * D }, color, color2: color, im: 0.6, dur: 600, t0: performance.now(), parts: [], seeded: false })
      ensureLoop()
    },
  }))

  useEffect(() => {
    const c = cvs.current; if (!c) return
    const resize = () => {
      const D = Math.min(window.devicePixelRatio || 1, 2); dprRef.current = D
      c.width = Math.floor(window.innerWidth * D); c.height = Math.floor(window.innerHeight * D)
    }
    resize(); window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf.current); running.current = false }
  }, [])

  const loop = (now: number) => {
    const c = cvs.current; const ctx = c?.getContext('2d')
    if (!c || !ctx) { running.current = false; return }
    const D = dprRef.current
    ctx.clearRect(0, 0, c.width, c.height)
    const list = items.current
    for (let i = list.length - 1; i >= 0; i--) {
      const it = list[i]
      const p = (now - it.t0) / it.dur
      if (p >= 1) { list.splice(i, 1); continue }
      drawItem(ctx, it, p, D, now)
    }
    if (list.length > 0) raf.current = requestAnimationFrame(loop)
    else { running.current = false; ctx.clearRect(0, 0, c.width, c.height) }
  }

  return (
    <>
      <style>{CSS}</style>
      <canvas ref={cvs} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 126, pointerEvents: 'none', width: '100%', height: '100%' }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 133, pointerEvents: 'none' }}>
        {nums.map((n) => (
          <span key={n.id} className="rvn-fnum" style={{ left: n.x, top: n.y, color: n.color, fontSize: n.big ? 30 : 22, textShadow: `0 0 10px ${n.color}, 0 2px 3px rgba(0,0,0,0.9)` }}>{n.text}</span>
        ))}
      </div>
    </>
  )
})

// ── Efektų piešimas ───────────────────────────────────────────────────────────
function drawItem(ctx: CanvasRenderingContext2D, it: Item, p: number, D: number, now: number) {
  const { from, to, color, color2, im } = it
  const dx = to.x - from.x, dy = to.y - from.y
  const ang = Math.atan2(dy, dx)
  ctx.globalCompositeOperation = 'lighter'

  switch (it.kind) {
    case 'projectile': case 'curseMark': {
      const tp = 0.62
      if (p < tp) {
        const e = easeIn(p / tp)
        const x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e)
        for (let k = 0; k < 6; k++) { const bk = Math.max(0, e - k * 0.04); glow(ctx, lerp(from.x, to.x, bk), lerp(from.y, to.y, bk), (10 - k) * D * im, color, (1 - k / 6) * 0.5) }
        glow(ctx, x, y, 14 * D * im, '#ffffff', 0.9); glow(ctx, x, y, 22 * D * im, color, 0.8)
        if (it.kind === 'curseMark') { ctx.strokeStyle = color2; ctx.globalAlpha = 0.8; ctx.lineWidth = 2 * D; ctx.beginPath(); ctx.arc(x, y, 12 * D * im * (1 + Math.sin(now / 60) * 0.1), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1 }
      } else {
        const q = (p - tp) / (1 - tp)
        if (it.kind === 'curseMark') { drawRune(ctx, to.x, to.y, 26 * D * im, color, 1 - q, now) }
        else { const r = (10 + q * 46) * D * im; ctx.strokeStyle = color; ctx.globalAlpha = (1 - q) * 0.9; ctx.lineWidth = 3 * D; ctx.beginPath(); ctx.arc(to.x, to.y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; glow(ctx, to.x, to.y, 30 * D * im * (1 - q), color, (1 - q) * 0.7); seedSparks(it, 14, color); drawSparks(ctx, it, q, D) }
      }
      break
    }
    case 'beam': {
      const env = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75
      ctx.strokeStyle = color; ctx.globalAlpha = env * 0.85; ctx.lineWidth = 7 * D * im; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = env; ctx.lineWidth = 2.4 * D; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.globalAlpha = 1
      const hx = lerp(from.x, to.x, p), hy = lerp(from.y, to.y, p); glow(ctx, hx, hy, 18 * D * im, color, env)
      break
    }
    case 'slash': {
      const q = easeOut(Math.min(1, p / 0.55)); const fade = p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45
      const len = 70 * D * im; const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2)
      const cx = to.x, cy = to.y
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang)
      ctx.strokeStyle = color; ctx.globalAlpha = fade * 0.9; ctx.lineWidth = 6 * D; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.arc(0, 0, len, -0.7, -0.7 + q * 1.4); ctx.stroke()
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = fade; ctx.lineWidth = 2 * D; ctx.beginPath(); ctx.arc(0, 0, len, -0.7, -0.7 + q * 1.4); ctx.stroke()
      ctx.restore(); ctx.globalAlpha = 1; void px; void py
      if (p > 0.45) { seedSparks(it, 12, color); drawSparks(ctx, it, (p - 0.45) / 0.55, D) }
      break
    }
    case 'disintegrate': case 'graveRise': {
      const up = it.kind === 'graveRise'
      if (!it.seeded) { it.seeded = true; for (let k = 0; k < 26 * im; k++) { const a = rnd(0, TAU), s = rnd(1, 5) * D; it.parts.push({ x: to.x + rnd(-18, 18) * D, y: to.y + rnd(-24, 24) * D, vx: up ? rnd(-0.6, 0.6) * D : Math.cos(a) * s, vy: up ? -rnd(1.5, 4) * D : Math.sin(a) * s - D, life: 0, max: it.dur, size: rnd(2, 5) * D, rot: 0, vr: 0 }) } }
      for (const q of it.parts) { q.x += q.vx; q.y += q.vy; q.vy += (up ? -0.02 : 0.06) * D; const a = 1 - p; glow(ctx, q.x, q.y, q.size * 2.4, color, a * 0.8) }
      break
    }
    case 'healStream': case 'drawStream': case 'goldSteal': {
      if (p < 0.8 && Math.random() < 0.6) it.parts.push({ x: from.x + rnd(-8, 8) * D, y: from.y + rnd(-8, 8) * D, vx: 0, vy: 0, life: now, max: rnd(420, 720), size: rnd(2, 4) * D, rot: rnd(0, TAU), vr: 0 })
      for (let k = it.parts.length - 1; k >= 0; k--) { const q = it.parts[k]; const e = (now - q.life) / q.max; if (e >= 1) { it.parts.splice(k, 1); continue }; const ee = easeOut(e); const x = lerp(from.x, to.x, ee) + Math.sin(e * 8 + q.rot) * 10 * D, y = lerp(from.y, to.y, ee) + Math.cos(e * 7 + q.rot) * 8 * D; glow(ctx, x, y, q.size * 2.6, color, (1 - e) * 0.9) }
      glow(ctx, to.x, to.y, 20 * D * im, color, Math.min(1, p * 2) * (1 - p) * 0.8)
      break
    }
    case 'buffSurge': {
      const r = (10 + easeOut(p) * 40) * D * im; ctx.strokeStyle = color; ctx.globalAlpha = (1 - p) * 0.8; ctx.lineWidth = 3 * D
      ctx.beginPath(); ctx.arc(to.x, to.y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1
      if (Math.random() < 0.8) it.parts.push({ x: to.x + rnd(-24, 24) * D, y: to.y + rnd(0, 20) * D, vx: 0, vy: -rnd(1.5, 3.5) * D, life: now, max: 700, size: rnd(2, 4) * D, rot: 0, vr: 0 })
      for (let k = it.parts.length - 1; k >= 0; k--) { const q = it.parts[k]; q.x += q.vx; q.y += q.vy; const e = (now - q.life) / q.max; if (e >= 1) { it.parts.splice(k, 1); continue }; glow(ctx, q.x, q.y, q.size * 2.4, color, (1 - e) * 0.9) }
      break
    }
    case 'debuffDrain': {
      if (Math.random() < 0.7) it.parts.push({ x: from.x + rnd(-20, 20) * D, y: from.y + rnd(-20, 20) * D, vx: 0, vy: 0, life: now, max: 650, size: rnd(2, 4) * D, rot: 0, vr: 0 })
      for (let k = it.parts.length - 1; k >= 0; k--) { const q = it.parts[k]; const e = (now - q.life) / q.max; if (e >= 1) { it.parts.splice(k, 1); continue }; const ee = easeIn(e); const x = lerp(q.x, to.x, ee), y = lerp(q.y, to.y, ee); glow(ctx, x, y, q.size * 2.2, color, (1 - e) * 0.8) }
      break
    }
    case 'aoeWave': {
      const r = easeOut(p) * Math.max(window.innerWidth, window.innerHeight) * 0.55 * D
      ctx.strokeStyle = color; ctx.globalAlpha = (1 - p) * 0.85; ctx.lineWidth = (8 - p * 5) * D
      ctx.beginPath(); ctx.arc(from.x, from.y, r, 0, TAU); ctx.stroke()
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = (1 - p) * 0.5; ctx.lineWidth = 2 * D
      ctx.beginPath(); ctx.arc(from.x, from.y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1
      break
    }
    case 'shield': {
      const grow = easeOut(Math.min(1, p / 0.4)); const fade = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4
      drawHex(ctx, to.x, to.y, 40 * D * im * grow, color, fade, now)
      break
    }
    case 'freeze': {
      const grow = easeOut(Math.min(1, p / 0.4)); const fade = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4
      glow(ctx, to.x, to.y, 36 * D * im * grow, color, fade * 0.5)
      ctx.globalCompositeOperation = 'source-over'
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.save(); ctx.translate(to.x, to.y); ctx.rotate(a); ctx.fillStyle = color; ctx.globalAlpha = fade * 0.9; const s = 16 * D * im * grow; ctx.beginPath(); ctx.moveTo(0, -s * 2); ctx.lineTo(s * 0.5, -s); ctx.lineTo(-s * 0.5, -s); ctx.closePath(); ctx.fill(); ctx.restore() }
      ctx.globalAlpha = 1
      break
    }
    case 'summonPortal': {
      const grow = easeOut(Math.min(1, p / 0.5)); const fade = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4
      ctx.save(); ctx.translate(to.x, to.y); ctx.scale(1, 0.45)
      for (let r = 0; r < 3; r++) { ctx.strokeStyle = r % 2 ? color2 : color; ctx.globalAlpha = fade * 0.8; ctx.lineWidth = 3 * D; ctx.beginPath(); ctx.arc(0, 0, (20 + r * 12) * D * im * grow + Math.sin(now / 120 + r) * 3 * D, 0, TAU); ctx.stroke() }
      ctx.restore(); ctx.globalAlpha = 1; glow(ctx, to.x, to.y, 30 * D * im * grow, color, fade * 0.6)
      break
    }
    case 'stealthFade': {
      if (Math.random() < 0.6) it.parts.push({ x: to.x + rnd(-26, 26) * D, y: to.y + rnd(-30, 30) * D, vx: rnd(-0.4, 0.4) * D, vy: rnd(-0.4, 0.4) * D, life: now, max: 600, size: rnd(3, 6) * D, rot: 0, vr: 0 })
      ctx.globalCompositeOperation = 'source-over'
      for (let k = it.parts.length - 1; k >= 0; k--) { const q = it.parts[k]; q.x += q.vx; q.y += q.vy; const e = (now - q.life) / q.max; if (e >= 1) { it.parts.splice(k, 1); continue }; ctx.fillStyle = `rgba(20,16,28,${(1 - e) * 0.6})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill() }
      break
    }
    case 'burn': {
      if (Math.random() < 0.9) it.parts.push({ x: to.x + rnd(-22, 22) * D, y: to.y + rnd(-6, 16) * D, vx: rnd(-0.3, 0.3) * D, vy: -rnd(1.5, 3.6) * D, life: now, max: rnd(500, 900), size: rnd(2, 5) * D, rot: 0, vr: 0 })
      glow(ctx, to.x, to.y, 30 * D * im * (1 - p * 0.4), color, (1 - p) * 0.5)
      for (let k = it.parts.length - 1; k >= 0; k--) { const q = it.parts[k]; q.x += q.vx; q.y += q.vy; q.vy *= 0.99; const e = (now - q.life) / q.max; if (e >= 1) { it.parts.splice(k, 1); continue }; glow(ctx, q.x, q.y, q.size * 2.6, `hsla(${20 + (1 - e) * 25},100%,60%,${1 - e})`, (1 - e) * 0.9) }
      break
    }
    case 'poison': {
      if (Math.random() < 0.8) it.parts.push({ x: to.x + rnd(-24, 24) * D, y: to.y + rnd(-18, 18) * D, vx: rnd(-0.2, 0.2) * D, vy: -rnd(0.3, 1.2) * D, life: now, max: rnd(700, 1200), size: rnd(2, 5) * D, rot: rnd(0, TAU), vr: 0 })
      glow(ctx, to.x, to.y, 28 * D * im * (1 - p * 0.4), color, (1 - p) * 0.45)
      for (let k = it.parts.length - 1; k >= 0; k--) { const q = it.parts[k]; q.x += q.vx + Math.sin((now + q.rot * 100) / 300) * 0.3 * D; q.y += q.vy; const e = (now - q.life) / q.max; if (e >= 1) { it.parts.splice(k, 1); continue }; glow(ctx, q.x, q.y, q.size * 2.4, color, (1 - e) * 0.85) }
      break
    }
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

function seedSparks(it: Item, n: number, _color: string) {
  if (it.seeded) return; it.seeded = true
  for (let k = 0; k < n; k++) { const a = rnd(0, TAU), s = rnd(2, 7); it.parts.push({ x: it.to.x, y: it.to.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 1, size: rnd(1.5, 3.5), rot: 0, vr: 0 }) }
}
function drawSparks(ctx: CanvasRenderingContext2D, it: Item, q: number, D: number) {
  for (const s of it.parts) { const x = it.to.x + s.vx * q * 16 * D, y = it.to.y + s.vy * q * 16 * D; glow(ctx, x, y, s.size * D, it.color, (1 - q) * 0.9) }
}
function drawRune(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number, now: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(now / 700)
  ctx.strokeStyle = color; ctx.globalAlpha = a * 0.9; ctx.lineWidth = 2.4
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke()
  ctx.beginPath(); for (let k = 0; k < 5; k++) { const a1 = k / 5 * TAU - Math.PI / 2, a2 = (k + 2) / 5 * TAU - Math.PI / 2; ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r); ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r) } ctx.stroke()
  ctx.restore(); ctx.globalAlpha = 1
}
function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number, now: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(now / 2000)
  ctx.strokeStyle = color; ctx.globalAlpha = a * 0.9; ctx.lineWidth = 3
  ctx.beginPath(); for (let k = 0; k <= 6; k++) { const an = k / 6 * TAU; const fx = Math.cos(an) * r, fy = Math.sin(an) * r; if (k === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy) } ctx.stroke()
  ctx.globalAlpha = a * 0.18; ctx.fillStyle = color; ctx.fill(); ctx.restore(); ctx.globalAlpha = 1
}

const CSS = `
.rvn-fnum { position: absolute; transform: translate(-50%,-50%); font-weight: 800; font-family: Cinzel, Georgia, serif; pointer-events: none; animation: rvnFnum 1.1s cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes hpvCrit { 0%,100%{ box-shadow: 0 0 6px rgba(239,68,68,0.45); } 50%{ box-shadow: 0 0 14px rgba(239,68,68,0.95); } }
@keyframes rvnFnum { 0%{opacity:0; transform:translate(-50%,-30%) scale(0.4)} 18%{opacity:1; transform:translate(-50%,-55%) scale(1.25)} 32%{transform:translate(-50%,-58%) scale(1)} 100%{opacity:0; transform:translate(-50%,-150%) scale(1)} }
[data-fx-root].rvn-shake-soft { animation: rvnShakeSoft 0.36s ease-in-out; }
[data-fx-root].rvn-shake-hard { animation: rvnShakeHard 0.48s ease-in-out; }
@keyframes rvnShakeSoft { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-3px,2px)} 50%{transform:translate(3px,-2px)} 75%{transform:translate(-2px,1px)} }
@keyframes rvnShakeHard { 0%,100%{transform:translate(0,0)} 12%{transform:translate(-7px,4px)} 28%{transform:translate(6px,-5px)} 44%{transform:translate(-5px,-3px)} 60%{transform:translate(5px,4px)} 76%{transform:translate(-3px,2px)} }
.rvn-hit, .rvn-hit-soft, .rvn-hit-hard { animation: rvnHit 0.42s ease-in-out; }
.rvn-hit-soft { animation-name: rvnHitSoft; }
.rvn-hit-hard { animation-name: rvnHitHard; }
@keyframes rvnHitSoft { 0%,100%{transform:translate(0,0)} 30%{transform:translate(-3px,0)} 60%{transform:translate(2px,0)} }
@keyframes rvnHit { 0%,100%{transform:translate(0,0) rotate(0)} 20%{transform:translate(-5px,1px) rotate(-2deg)} 45%{transform:translate(4px,-1px) rotate(2deg)} 70%{transform:translate(-3px,0) rotate(-1deg)} }
[class~="rvn-doom"] { animation: rvnDoom 0.42s ease-in-out infinite alternate; }
@keyframes rvnDoom { from { filter: drop-shadow(0 0 4px rgba(255,60,60,0.5)); } to { filter: drop-shadow(0 0 13px rgba(255,40,40,0.95)) brightness(1.12); } }
@keyframes rvnHitHard { 0%,100%{transform:translate(0,0) rotate(0)} 15%{transform:translate(-8px,2px) rotate(-3deg)} 40%{transform:translate(7px,-2px) rotate(3deg)} 65%{transform:translate(-5px,1px) rotate(-2deg)} 85%{transform:translate(3px,0) rotate(1deg)} }
`
