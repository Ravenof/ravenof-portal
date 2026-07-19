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

export type AoeVariant = 'fire' | 'lightning' | 'ice' | 'poison' | 'arcane' | 'holy' | 'generic' | 'heal' | 'necrotic' | 'curse'
export type SpawnFx = {
  kind: FxKind
  variant?: AoeVariant
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  /** aoeWave: paveikiama zona (CSS px). Nurodžius – efektas ribojamas ŠIAI zonai (pvz. tik priešo pusė). */
  rect?: { x: number; y: number; w: number; h: number }
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
  lungeUnit: (uid: string, target: { x: number; y: number }) => void
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
  color: string; color2: string; im: number; dur: number; t0: number; parts: P[]; seeded: boolean; variant?: AoeVariant
  rect?: { x: number; y: number; w: number; h: number }
  bolts?: { pts: { x: number; y: number }[]; t0f: number }[]
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) {
  if (r <= 0) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color); g.addColorStop(1, 'transparent')
  ctx.globalAlpha = a; ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
}
/** Minkštas bangos žiedas be stroke — gradientinis „annulus" (jokių pieštinių linijų) */
function softRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, thick: number, color: string, a: number) {
  if (r <= 0) return
  const g = ctx.createRadialGradient(x, y, Math.max(0, r - thick), x, y, r + thick)
  g.addColorStop(0, 'transparent'); g.addColorStop(0.5, color); g.addColorStop(1, 'transparent')
  ctx.globalAlpha = a; ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r + thick, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
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
        dur: (fx.duration ?? 1.4) * 1000, t0: performance.now(), parts: [], seeded: false, variant: fx.variant,
        rect: fx.rect ? { x: fx.rect.x * D, y: fx.rect.y * D, w: fx.rect.w * D, h: fx.rect.h * D } : undefined,
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
    lungeUnit: (uid, target) => {
      const el = document.querySelector(`[data-unit-uid="${uid}"]`) as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      // pajuda ~60% link taikinio ir grįžta
      const dx = (target.x - cx) * 0.6, dy = (target.y - cy) * 0.6
      el.style.setProperty('--lx', Math.round(dx) + 'px')
      el.style.setProperty('--ly', Math.round(dy) + 'px')
      el.classList.remove('rvn-lunge'); void el.offsetWidth; el.classList.add('rvn-lunge')
      window.setTimeout(() => el.classList.remove('rvn-lunge'), 540)
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
      const v: AoeVariant = it.variant ?? 'generic'
      if (p < tp) {
        const e = easeIn(p / tp)
        // organiška trajektorija: lengvas lankas (curse — nervingas dreifas)
        const wob = Math.sin(e * Math.PI) * -34 * D
        const jit = v === 'curse' ? rnd(-2.5, 2.5) * D : 0
        const x = lerp(from.x, to.x, e) + Math.cos(ang + Math.PI / 2) * wob * 0.3 + jit
        const y = lerp(from.y, to.y, e) + Math.sin(ang + Math.PI / 2) * wob * 0.3 + wob * 0.2 + jit
        // uodega pagal elementą: išsisklaidančios žarijos vietoj tiesios linijos
        if (v === 'poison') { if (Math.random() < 0.7) it.parts.push({ x, y, vx: rnd(-0.2, 0.2) * D, vy: rnd(0.4, 1.4) * D, life: now, max: rnd(320, 560), size: rnd(1.5, 3) * D, rot: 1, vr: 0 }) }
        else if (v === 'necrotic') { if (Math.random() < 0.8) it.parts.push({ x, y, vx: rnd(-0.3, 0.3) * D, vy: -rnd(0.2, 0.8) * D, life: now, max: rnd(400, 700), size: rnd(2.5, 5) * D, rot: 2, vr: 0 }) }
        else if (Math.random() < 0.85) it.parts.push({ x, y, vx: rnd(-0.5, 0.5) * D, vy: rnd(-0.5, 0.5) * D - 0.3 * D, life: now, max: rnd(260, 480), size: rnd(1.5, 3.5) * D, rot: 0, vr: 0 })
        for (let k = it.parts.length - 1; k >= 0; k--) {
          const q = it.parts[k]; q.x += q.vx; q.y += q.vy
          const e2 = (now - q.life) / q.max; if (e2 >= 1) { it.parts.splice(k, 1); continue }
          if (q.rot === 2) { ctx.globalCompositeOperation = 'source-over'; glow(ctx, q.x, q.y, q.size * 2.6, 'rgba(10,6,18,1)', (1 - e2) * 0.35); ctx.globalCompositeOperation = 'lighter'; glow(ctx, q.x, q.y, q.size * 1.4, color, (1 - e2) * 0.45) }
          else glow(ctx, q.x, q.y, q.size * 2.2, q.rot === 1 ? color2 : color, (1 - e2) * 0.55)
        }
        // galva: karšta šerdis + aureolė
        if (v === 'heal') { glow(ctx, x, y, 24 * D * im, color, 0.3); glow(ctx, x, y, 13 * D * im, color, 0.8); glow(ctx, x, y, 6 * D * im, color2, 0.95) }
        else if (v === 'necrotic') { glow(ctx, x, y, 28 * D * im, color2, 0.3); glow(ctx, x, y, 14 * D * im, color, 0.75); glow(ctx, x, y, 6 * D * im, '#eafff5', 0.8) }
        else if (v === 'curse') { glow(ctx, x, y, 26 * D * im, color, 0.4); glow(ctx, x, y, 13 * D * im, color, 0.9); glow(ctx, x, y, 5 * D * im, '#ffd7d7', 0.85) }
        else { glow(ctx, x, y, 26 * D * im, color, 0.35); glow(ctx, x, y, 15 * D * im, color, 0.85); glow(ctx, x, y, 7 * D * im, '#ffffff', 0.95) }
        if (it.kind === 'curseMark') { glow(ctx, x, y, (12 + Math.sin(now / 60) * 2) * D * im, color2, 0.5) }
      } else {
        const q = (p - tp) / (1 - tp)
        if (it.kind === 'curseMark') { drawRune(ctx, to.x, to.y, 26 * D * im, color, 1 - q, now); break }
        if (v === 'heal') {
          // švelnus žydėjimas + kylančios kibirkštys, be smūgio bangos
          glow(ctx, to.x, to.y, (20 + easeOut(q) * 26) * D * im, color, (1 - q) * 0.6)
          glow(ctx, to.x, to.y, 12 * D * im * (1 - q * 0.4), color2, (1 - q) * 0.85)
          if (!it.seeded) { it.seeded = true; it.parts.length = 0; for (let k = 0; k < 12; k++) it.parts.push({ x: to.x + rnd(-20, 20) * D, y: to.y + rnd(-6, 14) * D, vx: rnd(-0.2, 0.2) * D, vy: -rnd(0.8, 2) * D, life: 0, max: 1, size: rnd(1.5, 3) * D, rot: k % 2, vr: 0 }) }
          for (const sp of it.parts) { sp.x += sp.vx; sp.y += sp.vy; glow(ctx, sp.x, sp.y, sp.size * 2, sp.rot ? color2 : color, (1 - q) * 0.85) }
        } else if (v === 'poison') {
          softRing(ctx, to.x, to.y, (6 + easeOut(q) * 30) * D * im, 8 * D, color, (1 - q) * 0.5)
          glow(ctx, to.x, to.y, 26 * D * im * (1 - q * 0.5), color, (1 - q) * 0.7)
          if (!it.seeded) { it.seeded = true; it.parts.length = 0; for (let k = 0; k < 14; k++) { const a = rnd(-2.6, -0.5); it.parts.push({ x: to.x, y: to.y, vx: Math.cos(a) * rnd(1, 3.5) * D, vy: Math.sin(a) * rnd(1, 2.5) * D, life: 0, max: 1, size: rnd(1.5, 3.5) * D, rot: 0, vr: 0 }) } }
          for (const sp of it.parts) { sp.vy += 0.14 * D; sp.x += sp.vx; sp.y += sp.vy; glow(ctx, sp.x, sp.y, sp.size * 2, color, (1 - q) * 0.8) }
        } else if (v === 'necrotic') {
          // implozija: banga traukiasi Į VIDŲ + sielos kyla
          softRing(ctx, to.x, to.y, (46 - easeOut(q) * 40) * D * im, 10 * D, color, (1 - q) * 0.6)
          glow(ctx, to.x, to.y, 20 * D * im * (1 - q * 0.3), color, (1 - q) * 0.75)
          if (!it.seeded) { it.seeded = true; it.parts.length = 0; for (let k = 0; k < 8; k++) it.parts.push({ x: to.x + rnd(-18, 18) * D, y: to.y + rnd(-8, 8) * D, vx: rnd(-0.2, 0.2) * D, vy: -rnd(1, 2.2) * D, life: 0, max: 1, size: rnd(2.5, 5) * D, rot: 0, vr: 0 }) }
          for (const sp of it.parts) { sp.x += sp.vx + Math.sin((now + sp.size * 90) / 180) * 0.5 * D; sp.y += sp.vy; ctx.globalCompositeOperation = 'source-over'; glow(ctx, sp.x, sp.y, sp.size * 2.4, 'rgba(10,6,18,1)', (1 - q) * 0.3); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sp.x, sp.y, sp.size * 1.3, color, (1 - q) * 0.6) }
        } else if (v === 'curse') {
          // pulsuojantis tamsus sprogimas: dvi bangos + tamsos dėmė + raudonos žarijos
          const pulse = 0.5 + 0.5 * Math.sin(q * Math.PI * 3)
          softRing(ctx, to.x, to.y, (8 + easeOut(q) * 40) * D * im, 9 * D, color, (1 - q) * 0.65)
          softRing(ctx, to.x, to.y, (4 + easeOut(q) * 24) * D * im, 7 * D, color, (1 - q) * 0.4 * pulse)
          ctx.globalCompositeOperation = 'source-over'; glow(ctx, to.x, to.y, 30 * D * im * (1 - q * 0.4), 'rgba(10,4,8,1)', (1 - q) * 0.4); ctx.globalCompositeOperation = 'lighter'
          glow(ctx, to.x, to.y, 16 * D * im * (1 - q), color, (1 - q) * 0.9)
          if (!it.seeded) { it.seeded = true; it.parts.length = 0; for (let k = 0; k < 14; k++) { const a = rnd(0, TAU), sp2 = rnd(1.2, 4) * D; it.parts.push({ x: to.x, y: to.y, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2 - 0.8 * D, life: 0, max: 1, size: rnd(1.2, 3) * D, rot: 0, vr: 0 }) } }
          for (const sp of it.parts) { sp.vy += 0.08 * D; sp.x += sp.vx; sp.y += sp.vy; glow(ctx, sp.x, sp.y, sp.size * 2, color, (1 - q) * 0.8) }
        } else {
          // standartinis: minkšta banga (gradient žiedas) + žarijos su gravitacija
          softRing(ctx, to.x, to.y, (8 + easeOut(q) * 44) * D * im, 10 * D, color, (1 - q) * 0.7)
          glow(ctx, to.x, to.y, 34 * D * im * (1 - q * 0.5), color, (1 - q) * 0.8)
          glow(ctx, to.x, to.y, 14 * D * im * (1 - q), '#ffffff', (1 - q) * 0.9)
          if (!it.seeded) { it.seeded = true; it.parts.length = 0; for (let k = 0; k < 16; k++) { const a = rnd(0, TAU), sp2 = rnd(1.4, 4.6) * D; it.parts.push({ x: to.x, y: to.y, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2 - 1.2 * D, life: 0, max: 1, size: rnd(1.4, 3.2) * D, rot: 0, vr: 0 }) } }
          for (const sp of it.parts) { sp.vy += 0.10 * D; sp.x += sp.vx; sp.y += sp.vy; glow(ctx, sp.x, sp.y, sp.size * 2, color, (1 - q) * 0.8) }
        }
      }
      break
    }
    case 'beam': {
      const env = p < 0.22 ? easeOut(p / 0.22) : 1 - easeIn((p - 0.22) / 0.78)
      const len = Math.hypot(to.x - from.x, to.y - from.y)
      // gradientinis spindulys minkštais kraštais (be stroke) + pulsuojantis plotis
      ctx.save(); ctx.translate(from.x, from.y); ctx.rotate(ang)
      const w = 16 * D * im * (0.8 + Math.sin(now / 70) * 0.12)
      const g = ctx.createLinearGradient(0, -w, 0, w)
      g.addColorStop(0, 'transparent'); g.addColorStop(0.35, color); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.65, color); g.addColorStop(1, 'transparent')
      ctx.globalAlpha = env * 0.55; ctx.fillStyle = g; ctx.fillRect(0, -w, len, w * 2); ctx.globalAlpha = 1
      ctx.restore()
      // tekanti energija: rutuliukai palei spindulį
      if (Math.random() < 0.9) it.parts.push({ x: Math.random(), y: rnd(-6, 6) * D, vx: 0, vy: 0, life: now, max: rnd(240, 420), size: rnd(2, 5) * D, rot: 0, vr: 0 })
      for (let k = it.parts.length - 1; k >= 0; k--) {
        const q = it.parts[k]; const e = (now - q.life) / q.max
        if (e >= 1) { it.parts.splice(k, 1); continue }
        const t = Math.min(1, q.x + e * 0.6)
        const bx = lerp(from.x, to.x, t) + Math.cos(ang + Math.PI / 2) * q.y
        const by = lerp(from.y, to.y, t) + Math.sin(ang + Math.PI / 2) * q.y
        glow(ctx, bx, by, q.size * 1.8, '#ffffff', env * (1 - e) * 0.7)
      }
      glow(ctx, from.x, from.y, 20 * D * im, color, env * 0.8)
      glow(ctx, to.x, to.y, 30 * D * im, color, env * 0.9); glow(ctx, to.x, to.y, 12 * D * im, '#ffffff', env)
      softRing(ctx, to.x, to.y, (10 + p * 26) * D * im, 8 * D, color, env * 0.35)
      break
    }
    case 'slash': {
      const q = easeOut(Math.min(1, p / 0.5)); const fade = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5
      const len = 68 * D * im
      // šviesos šuoras lanku: mažėjantys glow taškai su gęstančia uodega (storiausia viduryje)
      const steps = 26
      for (let k = 0; k < steps; k++) {
        const t = k / steps; if (t > q) break
        const taper = Math.sin(t * Math.PI)
        const trail = Math.max(0, 1 - (q - t) * 2.2)
        if (trail <= 0.02) continue
        const a = -0.75 + t * 1.5 + ang
        const x = to.x + Math.cos(a) * len, y = to.y + Math.sin(a) * len
        glow(ctx, x, y, (4 + taper * 11) * D, color, fade * trail * 0.75)
        glow(ctx, x, y, (2 + taper * 4.5) * D, '#ffffff', fade * trail * 0.85)
      }
      // kibirkštys smūgio pabaigoje su gravitacija
      if (q > 0.75) {
        if (!it.seeded) { it.seeded = true; for (let k = 0; k < 10; k++) { const a2 = ang + rnd(-0.8, 0.8), sp = rnd(2, 6) * D; it.parts.push({ x: to.x + Math.cos(ang + 0.75) * len, y: to.y + Math.sin(ang + 0.75) * len, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, life: 0, max: 1, size: rnd(1.2, 2.8) * D, rot: 0, vr: 0 }) } }
        for (const sp of it.parts) { sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.08 * D; glow(ctx, sp.x, sp.y, sp.size * 2, color, fade * 0.8) }
      }
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
      // Zoninis efektas: jei perduotas rect – ribojamas TIK paveikiamai zonai (pvz. priešo
      // lentos pusei); be rect – visas ekranas. Šviesa + dūmai + dalelės + elementinė banga
      // (žaibo trenksmai / ugnies frontas / šalčio plitimas). JOKIŲ projektilų.
      const W = window.innerWidth * D, H = window.innerHeight * D
      const v = it.variant ?? 'generic'
      const zx = it.rect?.x ?? 0, zy = it.rect?.y ?? 0
      const zw = it.rect?.w ?? W, zh = it.rect?.h ?? H
      const zcx = zx + zw / 2, zcy = zy + zh / 2
      const zmax = Math.max(zw, zh)
      if (!it.seeded) {
        it.seeded = true
        const n = Math.round((it.rect ? 46 : 64) * im)
        for (let k = 0; k < n; k++) {
          const x = rnd(zx, zx + zw)
          if (v === 'fire') it.parts.push({ x, y: rnd(zy + zh * 0.4, zy + zh), vx: rnd(-0.2, 0.2) * D, vy: -rnd(0.8, 2.6) * D, life: now + rnd(0, 300), max: rnd(700, 1300), size: rnd(2, 6) * D, rot: rnd(0, TAU), vr: 0 })
          else if (v === 'ice') it.parts.push({ x, y: rnd(zy - zh * 0.2, zy + zh * 0.4), vx: rnd(-0.3, 0.3) * D, vy: rnd(0.5, 1.6) * D, life: now + rnd(0, 400), max: rnd(900, 1500), size: rnd(2, 5) * D, rot: rnd(0, TAU), vr: 0 })
          else if (v === 'lightning') it.parts.push({ x, y: rnd(zy, zy + zh), vx: 0, vy: 0, life: now + rnd(0, 700), max: rnd(90, 220), size: rnd(2, 7) * D, rot: rnd(0, TAU), vr: 0 })
          else if (v === 'poison') it.parts.push({ x, y: rnd(zy + zh * 0.3, zy + zh), vx: rnd(-0.2, 0.2) * D, vy: -rnd(0.2, 0.9) * D, life: now + rnd(0, 400), max: rnd(1000, 1700), size: rnd(3, 7) * D, rot: rnd(0, TAU), vr: 0 })
          else if (v === 'heal' || v === 'holy') it.parts.push({ x, y: rnd(zy + zh * 0.35, zy + zh), vx: rnd(-0.15, 0.15) * D, vy: -rnd(0.5, 1.6) * D, life: now + rnd(0, 400), max: rnd(900, 1500), size: rnd(1.5, 4) * D, rot: rnd(0, TAU), vr: 0 })
          else if (v === 'necrotic') it.parts.push({ x, y: rnd(zy + zh * 0.3, zy + zh * 0.9), vx: rnd(-0.3, 0.3) * D, vy: -rnd(0.3, 1.0) * D, life: now + rnd(0, 500), max: rnd(1100, 1800), size: rnd(3, 7) * D, rot: rnd(0, TAU), vr: 1 })
          else if (v === 'curse') it.parts.push({ x, y: rnd(zy, zy + zh), vx: rnd(-0.6, 0.6) * D, vy: rnd(-0.4, 0.4) * D, life: now + rnd(0, 400), max: rnd(600, 1100), size: rnd(1.5, 4) * D, rot: rnd(0, TAU), vr: 0 })
          else it.parts.push({ x, y: rnd(zy, zy + zh), vx: rnd(-0.5, 0.5) * D, vy: -rnd(0.2, 1.0) * D, life: now + rnd(0, 350), max: rnd(700, 1300), size: rnd(2, 5) * D, rot: rnd(0, TAU), vr: 0 })
        }
        // dūmų debesys (dideli minkšti, kyla) — zonos ribose
        const sn = Math.round((it.rect ? 7 : 10) * im)
        for (let k = 0; k < sn; k++) it.parts.push({ x: rnd(zx, zx + zw), y: rnd(zy + zh * 0.45, zy + zh * 1.05), vx: rnd(-0.15, 0.15) * D, vy: -rnd(0.2, 0.7) * D, life: now, max: rnd(1100, 1700), size: rnd(40, 90) * D, rot: -1, vr: 0 })
        // žaibo trenksmai: keli klaikūs dantyti smūgiai iš viršaus į zonos taškus
        if (v === 'lightning') {
          it.bolts = []
          const bn = 3 + Math.round(2 * im)
          for (let k = 0; k < bn; k++) {
            const bx = rnd(zx + zw * 0.08, zx + zw * 0.92)
            const endY = rnd(zy + zh * 0.35, zy + zh * 0.95)
            const startY = zy - Math.min(120 * D, zh * 0.5)
            const segs = 7
            const pts: { x: number; y: number }[] = []
            for (let s2 = 0; s2 <= segs; s2++) pts.push({ x: bx + (s2 === 0 || s2 === segs ? 0 : rnd(-zw * 0.045, zw * 0.045)), y: lerp(startY, endY, s2 / segs) })
            it.bolts.push({ pts, t0f: rnd(0.02, 0.55) })
          }
        }
      }
      ctx.globalCompositeOperation = 'lighter'
      // zonos šviesos „wash" (ribose) + bendras švytėjimas iš zonos centro
      const wash = Math.sin(Math.min(1, p) * Math.PI)
      ctx.fillStyle = color; ctx.globalAlpha = wash * (v === 'lightning' ? 0.16 : v === 'curse' ? 0.07 + 0.05 * Math.sin(now / 110) : 0.09); ctx.fillRect(zx, zy, zw, zh); ctx.globalAlpha = 1
      if (v === 'necrotic' || v === 'curse') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(6,3,10,1)'; ctx.globalAlpha = wash * 0.22; ctx.fillRect(zx, zy, zw, zh); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter' }
      glow(ctx, zcx, zcy, zmax * (0.35 + easeOut(p) * 0.4), color, (1 - p) * 0.16)
      softRing(ctx, zcx, zcy, zmax * easeOut(Math.min(1, p * 1.6)) * 0.55, 60 * D, color, (1 - p) * 0.22)
      if (v === 'lightning' && p < 0.18) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = (0.18 - p) / 0.18 * 0.35; ctx.fillRect(zx, zy, zw, zh); ctx.globalAlpha = 1 }
      // žaibo trenksmai (glow taškų grandinės — be kietų linijų)
      if (v === 'lightning' && it.bolts) {
        for (const b of it.bolts) {
          const q = (p - b.t0f) / 0.18
          if (q < 0 || q > 1) continue
          const a = Math.sin(q * Math.PI)
          for (let s2 = 0; s2 < b.pts.length - 1; s2++) {
            const p1 = b.pts[s2], p2 = b.pts[s2 + 1]
            for (let t2 = 0; t2 < 4; t2++) {
              const xx = lerp(p1.x, p2.x, t2 / 4), yy = lerp(p1.y, p2.y, t2 / 4)
              glow(ctx, xx, yy, 4.5 * D, '#ffffff', a * 0.9)
              glow(ctx, xx, yy, 10 * D, color, a * 0.45)
            }
          }
          const end = b.pts[b.pts.length - 1]
          glow(ctx, end.x, end.y, 26 * D * a, '#ffffff', a * 0.75)
          glow(ctx, end.x, end.y, 44 * D * a, color, a * 0.4)
        }
      }
      // ugnies frontas: banga vilnija per zonos paviršių (kairė → dešinė)
      if (v === 'fire' && p < 0.75) {
        const bx2 = zx + easeOut(p / 0.75) * zw
        for (let k = 0; k < 9; k++) {
          const yy = zy + (k / 8) * zh
          glow(ctx, bx2 + rnd(-10, 10) * D, yy + rnd(-6, 6) * D, rnd(10, 22) * D, `hsla(${20 + rnd(0, 25)},100%,58%,1)`, (1 - p) * 0.7)
        }
        glow(ctx, bx2, zcy, zh * 0.5, color, (1 - p) * 0.22)
      }
      // šalčio frontas: suplotas žiedas plinta zonos paviršiumi + blizgios kibirkštys
      if (v === 'ice') {
        ctx.save(); ctx.translate(zcx, zcy); ctx.scale(1, Math.max(0.22, zh / Math.max(1, zw)))
        softRing(ctx, 0, 0, zw * 0.55 * easeOut(Math.min(1, p * 1.3)), 26 * D, color, (1 - p) * 0.5)
        ctx.restore()
        if (p < 0.6 && Math.random() < 0.5) glow(ctx, rnd(zx, zx + zw), rnd(zy, zy + zh), rnd(2, 5) * D, '#ffffff', 0.8)
      }
      // dalelės / dūmai
      for (let k = it.parts.length - 1; k >= 0; k--) {
        const q = it.parts[k]
        if (now < q.life) continue
        q.x += q.vx + Math.sin((now + q.rot * 120) / 320) * 0.25 * D
        q.y += q.vy
        const e = (now - q.life) / q.max
        if (e >= 1) { it.parts.splice(k, 1); continue }
        const a = Math.sin(Math.min(1, e) * Math.PI)
        if (q.rot === -1) { // dūmų debesis
          ctx.globalCompositeOperation = 'source-over'
          glow(ctx, q.x, q.y, q.size * (1 + e * 0.6), color, a * 0.10)
          ctx.globalCompositeOperation = 'lighter'
        } else if (v === 'fire') {
          glow(ctx, q.x, q.y, q.size * 2.6, `hsla(${18 + (1 - e) * 30},100%,60%,1)`, a * 0.9)
        } else if (v === 'lightning') {
          glow(ctx, q.x, q.y, q.size * (1.8 + Math.random() * 1.2), Math.random() < 0.5 ? '#ffffff' : color, a * 0.95)
        } else if (v === 'ice') {
          glow(ctx, q.x, q.y, q.size * 2.2, color, a * 0.85); glow(ctx, q.x, q.y, q.size * 0.7, '#ffffff', a * 0.7)
        } else if (v === 'heal' || v === 'holy') {
          glow(ctx, q.x, q.y, q.size * 2.2, color, a * 0.8); glow(ctx, q.x, q.y, q.size * 0.8, '#ffe28c', a * 0.75)
        } else if (v === 'necrotic' && q.vr === 1) {
          ctx.globalCompositeOperation = 'source-over'; glow(ctx, q.x, q.y, q.size * 2.6, 'rgba(8,5,16,1)', a * 0.35); ctx.globalCompositeOperation = 'lighter'; glow(ctx, q.x, q.y, q.size * 1.2, color, a * 0.6)
        } else if (v === 'curse') {
          const fl = Math.random() < 0.08 ? 1.8 : 1
          glow(ctx, q.x, q.y, q.size * 2.1 * fl, color, a * 0.8)
        } else {
          glow(ctx, q.x, q.y, q.size * 2.4, color, a * 0.85)
        }
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1
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
      const grow = easeOut(Math.min(1, p / 0.4)); const fade = p < 0.62 ? 1 : 1 - (p - 0.62) / 0.38
      const R = 42 * D * im * grow
      ctx.save(); ctx.translate(to.x, to.y); ctx.scale(1, 0.42)
      // minkštas portalo žiedas (gradient annulus) + gelmės švytėjimas
      softRing(ctx, 0, 0, R, 14 * D, color, fade * 0.8)
      softRing(ctx, 0, 0, R * 0.62, 9 * D, color2, fade * 0.5)
      glow(ctx, 0, 0, R * 0.75, color, fade * 0.35)
      // orbituojantys šviesos rutuliukai vietoj kontūrų
      for (let k = 0; k < 7; k++) {
        const a = now / 300 + k / 7 * TAU
        const rr = R * (0.82 + Math.sin(now / 240 + k) * 0.08)
        glow(ctx, Math.cos(a) * rr, Math.sin(a) * rr, 5.5 * D, k % 2 ? color2 : '#ffffff', fade * 0.85)
      }
      ctx.restore()
      // šviesos kolona iš portalo (vertikalus gradientas)
      const ch = 90 * D * im * grow
      const cg = ctx.createLinearGradient(0, to.y - ch, 0, to.y)
      cg.addColorStop(0, 'transparent'); cg.addColorStop(1, color)
      ctx.globalAlpha = fade * 0.22; ctx.fillStyle = cg
      ctx.beginPath(); ctx.moveTo(to.x - 26 * D * grow, to.y); ctx.lineTo(to.x - 9 * D * grow, to.y - ch); ctx.lineTo(to.x + 9 * D * grow, to.y - ch); ctx.lineTo(to.x + 26 * D * grow, to.y); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1
      // kylančios dulkelės
      if (Math.random() < 0.8) it.parts.push({ x: to.x + rnd(-30, 30) * D * grow, y: to.y + rnd(-6, 6) * D, vx: rnd(-0.15, 0.15) * D, vy: -rnd(0.8, 2) * D, life: now, max: rnd(500, 900), size: rnd(1.5, 3.5) * D, rot: 0, vr: 0 })
      for (let k = it.parts.length - 1; k >= 0; k--) {
        const sp = it.parts[k]; sp.x += sp.vx; sp.y += sp.vy
        const e = (now - sp.life) / sp.max; if (e >= 1) { it.parts.splice(k, 1); continue }
        glow(ctx, sp.x, sp.y, sp.size * 2.2, k % 2 ? color2 : color, (1 - e) * fade * 0.8)
      }
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
.hpv2 { position:absolute; inset:0; background: rgba(16,12,24,0.5); overflow:hidden; }
.hpv2-liquid { position:absolute; left:0; right:0; bottom:0; transition: height .5s cubic-bezier(.3,.8,.3,1), background .5s ease; }
.hpv2-wave { position:absolute; left:50%; top:-21px; width:280%; height:46px; transform:translateX(-50%); border-radius:42% 46% 43% 45%; opacity:.85; animation: hpvSpin 4.5s linear infinite; }
.hpv2-wave2 { top:-18px; height:42px; opacity:.5; animation-duration: 7s; animation-direction: reverse; }
@keyframes hpvSpin { from{ transform:translateX(-50%) rotate(0deg); } to{ transform:translateX(-50%) rotate(360deg); } }
.hpv2-bub { position:absolute; bottom:4px; width:4px; height:4px; border-radius:50%; background:rgba(255,255,255,0.55); animation: hpvBub linear infinite; }
@keyframes hpvBub { 0%{ transform:translateY(0) scale(.5); opacity:0; } 20%{ opacity:.8; } 100%{ transform:translateY(-46px) scale(1); opacity:0; } }
.hpv2-glass { position:absolute; inset:0; pointer-events:none; background:linear-gradient(125deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.05) 30%, transparent 52%, rgba(0,0,0,0.34) 100%); }
.hpv2-shine { position:absolute; top:14px; left:8px; width:4px; height:52%; border-radius:3px; pointer-events:none; background:linear-gradient(180deg, rgba(255,255,255,0.55), transparent); }
@media (prefers-reduced-motion: reduce){ .hpv2-wave, .hpv2-bub { animation:none !important; } }
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
.rvn-lunge { animation: rvnLunge 0.52s cubic-bezier(0.34,0.2,0.2,1); z-index: 45; will-change: transform; }
@keyframes rvnLunge { 0%{transform:translate(0,0)} 42%{transform:translate(var(--lx,0px),var(--ly,0px)) scale(1.1)} 56%{transform:translate(var(--lx,0px),var(--ly,0px)) scale(1.06)} 100%{transform:translate(0,0)} }
`
