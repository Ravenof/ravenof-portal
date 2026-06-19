'use client'

// ── Pilno lauko summon vizualūs efektai (HQ procedūriniai) ────────────────────
// Trys sluoksniai: (1) SVG turbulence/displacement + glow filtrai organiškai
// tekstūrai; (2) CSS gradientų/vinjetės/spindulių formos; (3) <canvas> dalelių
// sistema (žiežirbos, sporos, skeveldros, pelenai) su capped particle count ir
// VIENU requestAnimationFrame ciklu → kinematografiška, bet be lag. Visada
// pointer-events-none, savaime išsijungia po FX_DURATION. Screen shake'ą valdo
// TutorialGame (root div).

import { useEffect, useRef } from 'react'
import type { SummonEffectType } from '@/lib/game/types'

export const FX_DURATION: Record<SummonEffectType, number> = {
  eclipse:       3400,
  necroticSmoke: 4200,
  lightning:     2100,
  massFreeze:    3800,
  fire:          3800,
  explosion:     2100,
  poisonCloud:   4400,
  earthquake:    3200,
}

const TAU = Math.PI * 2
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const arr = (n: number) => Array.from({ length: n }, (_, i) => i)

type Pt = { x: number; y: number }
function genBolt(x1: number, y1: number, x2: number, y2: number, disp: number): Pt[] {
  let pts: Pt[] = [{ x: x1, y: y1 }, { x: x2, y: y2 }]
  let d = disp
  for (let it = 0; it < 5; it++) {
    const np: Pt[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1]
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1
      const off = rnd(-d, d)
      np.push(a, { x: mx - dy / len * off, y: my + dx / len * off })
    }
    np.push(pts[pts.length - 1])
    pts = np; d *= 0.55
  }
  return pts
}
function genNetwork(W: number, H: number): Pt[][] {
  const bolts: Pt[][] = []
  const mains = 5 + Math.floor(rnd(0, 3))
  for (let i = 0; i < mains; i++) {
    const x1 = rnd(W * 0.08, W * 0.92)
    const main = genBolt(x1, 0, x1 + rnd(-W * 0.18, W * 0.18), H, W * 0.06)
    bolts.push(main)
    const nb = 2 + Math.floor(rnd(0, 3))
    for (let b = 0; b < nb; b++) {
      const p = main[Math.floor(rnd(main.length * 0.2, main.length * 0.8))]
      bolts.push(genBolt(p.x, p.y, p.x + rnd(-W * 0.22, W * 0.22), Math.min(p.y + rnd(H * 0.12, H * 0.34), H), W * 0.04))
    }
  }
  return bolts
}
function traceBolt(ctx: CanvasRenderingContext2D, b: Pt[]): void {
  ctx.beginPath(); ctx.moveTo(b[0].x, b[0].y)
  for (let i = 1; i < b.length; i++) ctx.lineTo(b[i].x, b[i].y)
  ctx.stroke()
}
function drawBolts(ctx: CanvasRenderingContext2D, bolts: Pt[][], alpha: number, dpr: number): void {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.shadowColor = '#5b9bff'; ctx.shadowBlur = 16 * dpr
  ctx.strokeStyle = `rgba(150,195,255,${alpha * 0.5})`; ctx.lineWidth = 5 * dpr
  for (const b of bolts) traceBolt(ctx, b)
  ctx.shadowBlur = 8 * dpr
  ctx.strokeStyle = `rgba(235,244,255,${alpha})`; ctx.lineWidth = 1.6 * dpr
  for (const b of bolts) traceBolt(ctx, b)
  ctx.shadowBlur = 0
}
function ltngIntensity(t: number, spikes: number[]): number {
  let m = 0; for (const sp of spikes) if (t >= sp) m = Math.max(m, Math.exp(-(t - sp) / 110)); return m
}
function lastSpikeIdx(t: number, spikes: number[]): number {
  let idx = -1; for (let i = 0; i < spikes.length; i++) if (t >= spikes[i]) idx = i; return idx
}

type Particle = {
  x: number; y: number; vx: number; vy: number; life: number; max: number
  size: number; kind: string; rot: number; vr: number; hue: number
}

// ── Canvas dalelių variklis ───────────────────────────────────────────────────
function startParticles(canvas: HTMLCanvasElement, type: SummonEffectType, duration: number): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = 0, H = 0
  const resize = () => { W = canvas.width = Math.floor(window.innerWidth * dpr); H = canvas.height = Math.floor(window.innerHeight * dpr) }
  resize()
  window.addEventListener('resize', resize)

  const parts: Particle[] = []
  const add = type === 'fire' || type === 'explosion' || type === 'lightning' || type === 'necroticSmoke'
  const push = (p: Partial<Particle>) => parts.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1000, size: 2, kind: 'ember', rot: 0, vr: 0, hue: 30, ...p })

  // Pradinis sprogimas
  if (type === 'explosion') {
    for (let i = 0; i < 140; i++) { const a = rnd(0, TAU), s = rnd(2, 12) * dpr; push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: rnd(500, 1200), size: rnd(1.5, 4) * dpr, kind: 'spark', hue: rnd(18, 45) }) }
    for (let i = 0; i < 30; i++) { const a = rnd(0, TAU), s = rnd(0.5, 3) * dpr; push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: rnd(900, 1700), size: rnd(8, 20) * dpr, kind: 'smoke', hue: 20 }) }
  }
  if (type === 'lightning') {
    for (let i = 0; i < 70; i++) { const a = rnd(0, TAU), s = rnd(1, 8) * dpr; push({ x: rnd(0, W), y: rnd(0, H * 0.55), vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: rnd(300, 800), size: rnd(1, 3) * dpr, kind: 'spark', hue: rnd(200, 220) }) }
  }

  let raf = 0
  const t0 = performance.now()
  let prev = t0
  let bolts: { x: number; y: number }[][] = []
  let boltSpike = -1
  const spikes = [0.04, 0.16, 0.32, 0.5].map((fr) => fr * duration)

  const frame = (now: number) => {
    const t = now - t0
    const dt = Math.min(48, now - prev); prev = now
    ctx.clearRect(0, 0, W, H)

    if (type === 'lightning') {
      const inten = ltngIntensity(t, spikes)
      const si = lastSpikeIdx(t, spikes)
      if (si !== boltSpike) { boltSpike = si; bolts = si >= 0 ? genNetwork(W, H) : [] }
      if (inten > 0.02 && bolts.length) { ctx.globalCompositeOperation = 'lighter'; drawBolts(ctx, bolts, inten, dpr) }
    }

    const active = t < duration - 500
    if (active) {
      if (type === 'fire') for (let i = 0; i < 6; i++) push({ x: rnd(0, W), y: H + 10, vx: rnd(-0.5, 0.5) * dpr, vy: -rnd(2.4, 5.5) * dpr, max: rnd(700, 1500), size: rnd(2, 5.5) * dpr, kind: 'ember', hue: rnd(18, 45) })
      if (type === 'necroticSmoke') for (let i = 0; i < 3; i++) push({ x: rnd(0, W), y: H + 10, vx: rnd(-0.3, 0.3) * dpr, vy: -rnd(1, 3) * dpr, max: rnd(1300, 2300), size: rnd(8, 16) * dpr, kind: 'wisp', hue: 280 })
      if (type === 'poisonCloud') for (let i = 0; i < 3; i++) push({ x: rnd(0, W), y: H + 10, vx: rnd(-0.3, 0.3) * dpr, vy: -rnd(0.8, 2.4) * dpr, max: rnd(1500, 2600), size: rnd(4, 9) * dpr, kind: 'spore', hue: 95 })
      if (type === 'massFreeze') for (let i = 0; i < 4; i++) push({ x: rnd(0, W), y: -10, vx: rnd(-0.6, 0.6) * dpr, vy: rnd(1.4, 3.4) * dpr, max: rnd(1300, 2300), size: rnd(2.5, 6) * dpr, kind: 'shard', rot: rnd(0, TAU), vr: rnd(-0.08, 0.08), hue: 200 })
      if (type === 'earthquake') for (let i = 0; i < 3; i++) push({ x: rnd(0, W), y: -10, vx: rnd(-0.5, 0.5) * dpr, vy: rnd(3, 7) * dpr, max: rnd(800, 1500), size: rnd(2.5, 6) * dpr, kind: 'debris', rot: rnd(0, TAU), vr: rnd(-0.2, 0.2), hue: 30 })
      if (type === 'eclipse') for (let k = 0; k < 2; k++) {
        const e = Math.floor(rnd(0, 4)), sp = rnd(0.3, 1.0) * dpr
        let x = 0, y = 0, vx = 0, vy = 0
        if (e === 0) { x = rnd(0, W); y = -10; vx = (W / 2 - x) / W * sp; vy = sp }
        else if (e === 1) { x = rnd(0, W); y = H + 10; vx = (W / 2 - x) / W * sp; vy = -sp }
        else if (e === 2) { x = -10; y = rnd(0, H); vx = sp; vy = (H / 2 - y) / H * sp }
        else { x = W + 10; y = rnd(0, H); vx = -sp; vy = (H / 2 - y) / H * sp }
        push({ x, y, vx, vy, max: rnd(1700, 2900), size: rnd(10, 22) * dpr, kind: 'shadow', hue: 285 })
      }
    }

    ctx.globalCompositeOperation = add ? 'lighter' : 'source-over'
    const f = dt / 16
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]
      p.life += dt
      if (p.life >= p.max) { parts.splice(i, 1); continue }
      p.x += p.vx * f; p.y += p.vy * f
      if (p.kind === 'ember' || p.kind === 'ash' || p.kind === 'wisp') p.vy *= 0.992
      if (p.kind === 'spark') { p.vx *= 0.95; p.vy = p.vy * 0.95 + 0.06 * dpr }
      if (p.kind === 'debris' || p.kind === 'shard') { p.vy += 0.05 * dpr * f; p.rot += p.vr * f }
      if (p.kind === 'spore') p.vx += Math.sin((p.life + p.x) * 0.01) * 0.05 * dpr
      const a = 1 - p.life / p.max
      draw(ctx, p, a)
    }

    if (now - t0 < duration) raf = requestAnimationFrame(frame)
    else ctx.clearRect(0, 0, W, H)
  }
  raf = requestAnimationFrame(frame)

  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); ctx.clearRect(0, 0, W, H) }
}

function draw(ctx: CanvasRenderingContext2D, p: Particle, a: number): void {
  switch (p.kind) {
    case 'ember': {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
      g.addColorStop(0, `hsla(${p.hue},100%,66%,${a})`); g.addColorStop(0.5, `hsla(${p.hue - 8},100%,52%,${a * 0.7})`); g.addColorStop(1, `hsla(${p.hue},100%,45%,0)`)
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, TAU); ctx.fill(); break
    }
    case 'wisp': {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.6)
      g.addColorStop(0, `hsla(275,75%,60%,${a * 0.6})`); g.addColorStop(1, `hsla(265,70%,30%,0)`)
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.6, 0, TAU); ctx.fill(); break
    }
    case 'smoke': {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4)
      g.addColorStop(0, `hsla(24,20%,22%,${a * 0.5})`); g.addColorStop(1, `hsla(24,20%,12%,0)`)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, TAU); ctx.fill()
      ctx.globalCompositeOperation = 'lighter'; break
    }
    case 'ash': { ctx.fillStyle = `rgba(12,8,6,${a * 0.85})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); break }
    case 'shadow': {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.8)
      g.addColorStop(0, `rgba(14,4,22,${a * 0.62})`); g.addColorStop(0.6, `rgba(46,8,60,${a * 0.18})`); g.addColorStop(1, 'rgba(8,3,14,0)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.8, 0, TAU); ctx.fill(); break
    }
    case 'spark': {
      ctx.strokeStyle = `hsla(${p.hue},100%,72%,${a})`; ctx.lineWidth = p.size; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5); ctx.stroke(); break
    }
    case 'spore': {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4)
      g.addColorStop(0, `hsla(95,80%,55%,${a * 0.7})`); g.addColorStop(1, `hsla(100,80%,32%,0)`)
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.4, 0, TAU); ctx.fill(); break
    }
    case 'shard': {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
      ctx.fillStyle = `hsla(200,90%,86%,${a})`; ctx.strokeStyle = `hsla(205,95%,70%,${a})`; ctx.lineWidth = 0.6
      ctx.beginPath(); ctx.moveTo(0, -p.size * 2); ctx.lineTo(p.size, p.size); ctx.lineTo(-p.size, p.size); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); break
    }
    case 'debris': {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
      ctx.fillStyle = `rgba(${90 + p.hue},${70 + p.hue * 0.6},${50 + p.hue * 0.3},${a})`
      ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * 2.4); ctx.restore(); break
    }
  }
}

// ── Komponentas ───────────────────────────────────────────────────────────────
export function BattleEffectOverlay({ type, effectKey, onDone }: {
  type: SummonEffectType
  effectKey: number
  onDone: () => void
}) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const dur = FX_DURATION[type] ?? 3000
    const t = window.setTimeout(() => doneRef.current(), dur)
    let stop = () => {}
    if (cvs.current) stop = startParticles(cvs.current, type, dur)
    return () => { window.clearTimeout(t); stop() }
  }, [type, effectKey])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 127, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{CSS}</style>

      {/* SVG filtrai organiškai tekstūrai (turbulence + displacement + glow) */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="rvnSmoke" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.009 0.013" numOctaves={3} seed={7} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="rvnFire" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.016 0.03" numOctaves={2} seed={3} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="30" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Bendra kinematografinė vinjetė */}
      <div className="rvnfx rvnfx-vignette" />

      {type === 'eclipse' && (
        <>
          <div className="rvnfx rvnfx-dark-veil" />
          <div className="rvnfx rvnfx-dark-edge rvnfx-dark-t" />
          <div className="rvnfx rvnfx-dark-edge rvnfx-dark-b" />
          <div className="rvnfx rvnfx-dark-edge rvnfx-dark-l" />
          <div className="rvnfx rvnfx-dark-edge rvnfx-dark-r" />
          <div className="rvnfx rvnfx-dark-core" />
        </>
      )}

      {type === 'necroticSmoke' && (
        <>
          <div className="rvnfx rvnfx-tint" style={{ background: 'radial-gradient(circle at 50% 60%, rgba(120,40,170,0.4), rgba(30,8,50,0.6))' }} />
          {arr(6).map((i) => (
            <div key={i} className="rvnfx rvnfx-blob rvnfx-smoke rvnfx-necro"
              style={{ left: `${4 + i * 16}%`, animationDelay: `${i * 0.26}s`, width: `${240 + (i % 3) * 90}px`, height: `${240 + (i % 3) * 90}px` }} />
          ))}
        </>
      )}

      {type === 'lightning' && (
        <>
          <div className="rvnfx rvnfx-ltng-flash" />
          <div className="rvnfx rvnfx-tint rvnfx-ltng-tint" />
        </>
      )}

      {type === 'massFreeze' && (
        <>
          <div className="rvnfx rvnfx-tint rvnfx-freeze-tint" />
          <div className="rvnfx rvnfx-frost rvnfx-frost-t" />
          <div className="rvnfx rvnfx-frost rvnfx-frost-b" />
          <div className="rvnfx rvnfx-frost rvnfx-frost-l" />
          <div className="rvnfx rvnfx-frost rvnfx-frost-r" />
          <div className="rvnfx rvnfx-freeze-shimmer" />
        </>
      )}

      {type === 'fire' && (
        <>
          <div className="rvnfx rvnfx-tint rvnfx-fire-tint" />
          <div className="rvnfx rvnfx-fire-glow" />
          <div className="rvnfx rvnfx-fire-wall" />
        </>
      )}

      {type === 'explosion' && (
        <>
          <div className="rvnfx rvnfx-expl-flash" />
          <div className="rvnfx rvnfx-expl-ball" />
          <div className="rvnfx rvnfx-expl-ring" />
          <div className="rvnfx rvnfx-expl-ring rvnfx-expl-ring2" />
        </>
      )}

      {type === 'poisonCloud' && (
        <>
          <div className="rvnfx rvnfx-tint" style={{ background: 'radial-gradient(circle at 50% 70%, rgba(80,180,40,0.4), rgba(14,40,8,0.55))' }} />
          {arr(6).map((i) => (
            <div key={i} className="rvnfx rvnfx-blob rvnfx-smoke rvnfx-poison"
              style={{ left: `${3 + i * 16}%`, animationDelay: `${i * 0.28}s`, width: `${230 + (i % 3) * 90}px`, height: `${230 + (i % 3) * 90}px` }} />
          ))}
        </>
      )}

      {type === 'earthquake' && (
        <>
          <div className="rvnfx rvnfx-quake-dust rvnfx-quake-dust-t" />
          <div className="rvnfx rvnfx-quake-dust rvnfx-quake-dust-b" />
          <svg className="rvnfx rvnfx-cracks" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="0,52 18,48 30,56 48,50 64,58 80,52 100,57" />
            <polyline points="24,100 30,72 26,60 36,44 32,28 40,0" />
            <polyline points="70,100 66,74 74,58 64,40 72,22 66,0" />
          </svg>
        </>
      )}

      <canvas ref={cvs} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  )
}

const CSS = `
.rvnfx { position: absolute; will-change: transform, opacity; }
.rvnfx-vignette { inset: 0; background: radial-gradient(ellipse at 50% 45%, transparent 42%, rgba(0,0,0,0.55) 100%); opacity: 0; animation: rvnfxTint 1s ease-out forwards; }
.rvnfx-tint { inset: 0; opacity: 0; animation: rvnfxTint 1.2s ease-out, rvnfxOut 1.4s ease-in 2.2s forwards; }

/* Darkness (evil) */
.rvnfx-dark-veil { inset: 0; background: radial-gradient(circle at 50% 50%, transparent 48%, rgba(0,0,0,0.97) 100%); opacity: 0; transform: scale(1.7); animation: rvnfxDark 3.4s ease-in-out forwards; }
@keyframes rvnfxDark { 0%{opacity:0; transform:scale(1.8)} 30%{opacity:1; transform:scale(0.92)} 72%{opacity:1; transform:scale(0.8)} 100%{opacity:0; transform:scale(1.3)} }
.rvnfx-dark-edge { background: linear-gradient(var(--d,0deg), rgba(6,2,10,0.96), rgba(8,2,14,0)); filter: url(#rvnSmoke) blur(6px); opacity: 0; animation: rvnfxFrost 3.4s ease-out forwards; }
.rvnfx-dark-t { top:0; left:0; right:0; height: 44vh; --d:180deg; }
.rvnfx-dark-b { bottom:0; left:0; right:0; height: 44vh; --d:0deg; }
.rvnfx-dark-l { top:0; bottom:0; left:0; width: 36vw; --d:90deg; }
.rvnfx-dark-r { top:0; bottom:0; right:0; width: 36vw; --d:270deg; }
.rvnfx-dark-core { top:50%; left:50%; width: 52vmin; height: 52vmin; margin: -26vmin 0 0 -26vmin; border-radius: 50%; background: radial-gradient(circle, rgba(96,12,120,0.5), rgba(48,4,60,0.22) 45%, transparent 66%); opacity: 0; transform: scale(0.55); animation: rvnfxDarkCore 3.4s ease-in-out forwards; }
@keyframes rvnfxDarkCore { 0%{opacity:0; transform:scale(0.5)} 35%{opacity:0.85; transform:scale(1.05)} 55%{opacity:0.55; transform:scale(0.95)} 75%{opacity:0.8; transform:scale(1.06)} 100%{opacity:0; transform:scale(1.2)} }

/* Smoke / poison blobs (turbulence-displaced) */
.rvnfx-blob { bottom: -12%; border-radius: 46% 54% 50% 50%; opacity: 0; transform: translateY(30px) scale(0.6); animation: rvnfxBlob 3.6s ease-out forwards; }
.rvnfx-smoke { filter: url(#rvnSmoke) blur(10px); }
.rvnfx-necro { background: radial-gradient(circle, rgba(180,100,255,0.9), rgba(88,28,135,0) 70%); }
.rvnfx-poison { background: radial-gradient(circle, rgba(150,220,40,0.85), rgba(40,70,15,0) 70%); }
@keyframes rvnfxBlob { 0%{opacity:0; transform:translateY(40px) scale(0.5)} 22%{opacity:0.95} 70%{opacity:0.8} 100%{opacity:0; transform:translateY(-240px) scale(1.6)} }

/* Lightning */
.rvnfx-ltng-flash { inset: 0; background: #eaf2ff; opacity: 0; animation: rvnfxLtngFlash 2.1s steps(1,end) forwards; }
.rvnfx-ltng-tint { background: radial-gradient(circle at 50% 30%, rgba(120,170,255,0.35), rgba(20,30,70,0.4)); }
.rvnfx-ltng-bolts { position: absolute; inset: 0; width: 100%; height: 100%; fill: none; stroke: #eaf4ff; stroke-width: 0.8; filter: drop-shadow(0 0 5px #8fc4ff) drop-shadow(0 0 12px #4f8cff); opacity: 0; animation: rvnfxBolts 2.1s ease-out forwards; }
@keyframes rvnfxLtngFlash { 0%{opacity:0} 5%{opacity:0.95} 10%{opacity:0.1} 16%{opacity:0.85} 22%{opacity:0} 38%{opacity:0.6} 44%{opacity:0} 100%{opacity:0} }
@keyframes rvnfxBolts { 0%{opacity:0} 7%{opacity:1} 24%{opacity:0.15} 40%{opacity:1} 58%{opacity:0} 100%{opacity:0} }

/* Mass freeze */
.rvnfx-freeze-tint { background: radial-gradient(circle at 50% 50%, rgba(130,210,255,0.32), rgba(15,55,105,0.5)); }
.rvnfx-frost { background: linear-gradient(var(--d,0deg), rgba(205,238,255,0.9), rgba(205,238,255,0)); opacity: 0; filter: blur(2px); animation: rvnfxFrost 3.8s ease-out forwards; }
.rvnfx-frost-t { top:0; left:0; right:0; height: 30vh; --d:180deg; }
.rvnfx-frost-b { bottom:0; left:0; right:0; height: 30vh; --d:0deg; }
.rvnfx-frost-l { top:0; bottom:0; left:0; width: 24vw; --d:90deg; }
.rvnfx-frost-r { top:0; bottom:0; right:0; width: 24vw; --d:270deg; }
.rvnfx-freeze-shimmer { inset:0; background: linear-gradient(115deg, transparent 30%, rgba(220,245,255,0.22) 50%, transparent 70%); opacity:0; animation: rvnfxShimmer 3.8s ease-in-out forwards; }
@keyframes rvnfxFrost { 0%{opacity:0; transform:scale(0.75)} 28%{opacity:0.92; transform:scale(1)} 75%{opacity:0.85} 100%{opacity:0} }
@keyframes rvnfxShimmer { 0%{opacity:0; transform:translateX(-30%)} 30%{opacity:1} 60%{opacity:0.6} 100%{opacity:0; transform:translateX(30%)} }

/* Fire */
.rvnfx-fire-tint { background: radial-gradient(circle at 50% 100%, rgba(255,150,40,0.42), rgba(120,20,0,0.4)); }
.rvnfx-fire-glow { left:0; right:0; bottom:0; height: 55vh; background: radial-gradient(80% 100% at 50% 100%, rgba(255,150,40,0.45), transparent 70%); opacity:0; animation: rvnfxTint 0.8s ease-out, rvnfxOut 1.4s ease-in 2.4s forwards; }
.rvnfx-fire-wall { left:-5%; right:-5%; bottom:0; height: 46vh; background: radial-gradient(60% 90% at 28% 100%, rgba(255,210,80,0.95), transparent 68%), radial-gradient(55% 85% at 62% 100%, rgba(255,120,20,0.95), transparent 70%), radial-gradient(80% 100% at 50% 100%, rgba(210,40,10,0.9), transparent 74%); filter: url(#rvnFire) blur(2px); opacity:0; transform-origin: bottom; animation: rvnfxFire 3.8s ease-out forwards; }
@keyframes rvnfxFire { 0%{opacity:0; transform:scaleY(0.2)} 16%{opacity:1; transform:scaleY(1.06)} 28%{transform:scaleY(0.9)} 42%{transform:scaleY(1.08)} 58%{transform:scaleY(0.94)} 78%{opacity:0.9} 100%{opacity:0; transform:scaleY(0.82)} }

/* Explosion */
.rvnfx-expl-flash { inset:0; background: radial-gradient(circle at 50% 50%, #fff, rgba(255,220,150,0.4) 38%, transparent 68%); opacity:0; animation: rvnfxExplFlash 2.1s ease-out forwards; }
.rvnfx-expl-ball { top:50%; left:50%; width: 32vmin; height:32vmin; margin:-16vmin 0 0 -16vmin; border-radius:50%; background: radial-gradient(circle, #fff 0%, #ffd25a 22%, #ff7a1a 48%, #c01e0a 72%, transparent 80%); filter: url(#rvnFire); opacity:0; transform: scale(0.1); animation: rvnfxExplBall 2.1s cubic-bezier(.1,.7,.2,1) forwards; }
.rvnfx-expl-ring { top:50%; left:50%; width: 20vmin; height:20vmin; margin:-10vmin 0 0 -10vmin; border-radius:50%; border: 0.7vmin solid rgba(255,215,130,0.9); box-shadow: 0 0 4vmin rgba(255,170,80,0.5); opacity:0; transform: scale(0.1); animation: rvnfxExplRing 1.9s ease-out forwards; }
.rvnfx-expl-ring2 { border-color: rgba(255,120,40,0.7); animation-delay: 0.12s; }
@keyframes rvnfxExplFlash { 0%{opacity:0} 5%{opacity:1} 28%{opacity:0.3} 100%{opacity:0} }
@keyframes rvnfxExplBall { 0%{opacity:0; transform:scale(0.1)} 10%{opacity:1; transform:scale(1)} 55%{opacity:0.85; transform:scale(1.3)} 100%{opacity:0; transform:scale(1.6)} }
@keyframes rvnfxExplRing { 0%{opacity:0; transform:scale(0.1)} 9%{opacity:1} 100%{opacity:0; transform:scale(7)} }

/* Earthquake */
.rvnfx-quake-dust { left:0; right:0; height: 32vh; background: linear-gradient(var(--g,0deg), rgba(95,72,50,0.65), transparent); opacity:0; filter: blur(3px); animation: rvnfxTint 0.6s ease-out, rvnfxOut 1.4s ease-in 2s forwards; }
.rvnfx-quake-dust-t { top:0; --g:180deg; }
.rvnfx-quake-dust-b { bottom:0; --g:0deg; }
.rvnfx-cracks { position:absolute; inset:0; width:100%; height:100%; fill:none; stroke: rgba(15,9,4,0.88); stroke-width: 0.7; filter: drop-shadow(0 0 1px rgba(255,150,50,0.6)); }
.rvnfx-cracks polyline { opacity:0; stroke-dasharray: 200; stroke-dashoffset: 200; animation: rvnfxCrack 3.2s ease-out forwards; }
@keyframes rvnfxCrack { 0%{opacity:0; stroke-dashoffset:200} 12%{opacity:1} 50%{stroke-dashoffset:0} 80%{opacity:1} 100%{opacity:0} }

@keyframes rvnfxTint { from{opacity:0} to{opacity:1} }
@keyframes rvnfxOut { from{opacity:1} to{opacity:0} }

@keyframes rvnfxShakeHard {
  0%{transform:translate(0,0)} 10%{transform:translate(-7px,4px)} 20%{transform:translate(6px,-5px)}
  30%{transform:translate(-5px,-4px)} 40%{transform:translate(5px,5px)} 50%{transform:translate(-6px,3px)}
  60%{transform:translate(6px,-3px)} 70%{transform:translate(-4px,4px)} 80%{transform:translate(4px,-4px)}
  90%{transform:translate(-3px,2px)} 100%{transform:translate(0,0)}
}

@media (prefers-reduced-motion: reduce) { .rvnfx { animation-duration: 0.7s !important; } }
`
