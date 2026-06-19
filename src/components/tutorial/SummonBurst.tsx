'use client'

// ── Iškvietimo (summon) efektai – ORIGIN-BASED ────────────────────────────────
// Efektas PRASIDEDA nuo iškviestos kortos (x,y) ir plinta į aplinką (NE full-screen).
// Vienas <canvas> + vienas rAF. 22 dark-fantasy variantai per bendrą parametrizuotą
// generatorių: centrinis glow → 1–2 sklindantys žiedai (shockwave) → teminės dalelės,
// radijuojančios nuo kortos → pasirenkamas glifas (kaukolė/pentagrama/runa/akis/kryžius)
// → pasirenkama forma (plyšiai / šešėlių tendriliai / šviesos stulpas). Maks. spindulys
// ribotas (~card aplinka), tad efektas „sklinda iš kortos", o ne dengia visą ekraną.

import { useEffect, useRef } from 'react'
import type { SummonEffectType } from '@/lib/game/types'

type Pkind = 'ember' | 'shard' | 'wisp' | 'bone' | 'spore' | 'spark' | 'drop' | 'ash' | 'rune'
type Glyph = 'pentagram' | 'rune' | 'skull' | 'eye' | 'cross' | 'none'
type Shape = 'cracks' | 'tendrils' | 'pillar' | 'none'

type Cfg = {
  glow: string; ring: string; ring2?: string
  particle: Pkind; pcolor: string; count: number; s0: number; s1: number; grav: number; rise?: boolean
  glyph?: Glyph; glyphColor?: string; shape?: Shape; shake?: 'soft' | 'hard'; dur: number; maxR?: number
}

const C: Record<SummonEffectType, Cfg> = {
  eclipse:       { glow: '#3a0a4a', ring: '#6d28d9', particle: 'wisp', pcolor: 'rgba(40,8,55,0.9)', count: 32, s0: 0.6, s1: 3, grav: -0.015, rise: true, glyph: 'eye', glyphColor: '#a855f7', shape: 'tendrils', shake: 'soft', dur: 2400 },
  shadowSurge:   { glow: '#0a0a16', ring: '#3a3a5a', particle: 'wisp', pcolor: 'rgba(14,12,24,0.92)', count: 36, s0: 0.8, s1: 3.4, grav: -0.01, rise: true, shape: 'tendrils', glyph: 'none', shake: 'soft', dur: 2200 },
  voidRip:       { glow: '#1a0a2a', ring: '#7c3aed', ring2: '#c084fc', particle: 'wisp', pcolor: 'rgba(124,58,237,0.8)', count: 30, s0: 1, s1: 4, grav: -0.02, rise: true, glyph: 'eye', glyphColor: '#c084fc', shape: 'tendrils', shake: 'hard', dur: 2400 },
  necroticSmoke: { glow: '#1a6b52', ring: '#5ef0c0', particle: 'wisp', pcolor: 'rgba(94,240,192,0.7)', count: 30, s0: 0.6, s1: 3, grav: -0.02, rise: true, glyph: 'skull', glyphColor: '#aef5dd', shake: 'soft', dur: 2400 },
  spectralWail:  { glow: '#2a3a4a', ring: '#9fc8e8', particle: 'wisp', pcolor: 'rgba(190,216,232,0.7)', count: 30, s0: 0.7, s1: 3.2, grav: -0.03, rise: true, glyph: 'skull', glyphColor: '#dff2ff', shake: 'soft', dur: 2400 },
  soulRelease:   { glow: '#bfe0ff', ring: '#9fc4ff', particle: 'wisp', pcolor: 'rgba(207,230,255,0.85)', count: 28, s0: 0.5, s1: 2.6, grav: -0.05, rise: true, shape: 'pillar', glyph: 'none', shake: 'soft', dur: 2400 },
  deathPulse:    { glow: '#2a2a2a', ring: '#9a9a9a', particle: 'ash', pcolor: 'rgba(150,150,150,0.85)', count: 30, s0: 0.6, s1: 2.8, grav: -0.02, rise: true, glyph: 'cross', glyphColor: '#cfcfcf', shake: 'soft', dur: 2300 },
  boneEruption:  { glow: '#5a5040', ring: '#e8e0c8', particle: 'bone', pcolor: '#f0ead8', count: 30, s0: 2, s1: 6, grav: 0.1, glyph: 'skull', glyphColor: '#fffaf0', shape: 'cracks', shake: 'hard', dur: 2200 },
  lightning:     { glow: '#bcd8ff', ring: '#7db8ff', particle: 'spark', pcolor: '#eaf4ff', count: 44, s0: 4, s1: 11, grav: 0, shape: 'cracks', glyph: 'none', shake: 'soft', dur: 1800 },
  arcaneDeto:    { glow: '#4c1d95', ring: '#a78bfa', ring2: '#ffffff', particle: 'spark', pcolor: '#c4b5fd', count: 50, s0: 3, s1: 10, grav: 0.04, glyph: 'rune', glyphColor: '#c4b5fd', shake: 'hard', dur: 1900 },
  cursedBrand:   { glow: '#3a0a2a', ring: '#a8327a', particle: 'rune', pcolor: '#ff3a8a', count: 24, s0: 0.6, s1: 2.6, grav: 0, glyph: 'rune', glyphColor: '#ff3a8a', shake: 'soft', dur: 2200 },
  bloodRitual:   { glow: '#6a0a0a', ring: '#c01e1e', particle: 'drop', pcolor: '#e23a3a', count: 32, s0: 2, s1: 6, grav: 0.14, glyph: 'pentagram', glyphColor: '#ff2a2a', shape: 'cracks', shake: 'soft', dur: 2300 },
  massFreeze:    { glow: '#7cc4ff', ring: '#cfe6ff', ring2: '#9fe1ff', particle: 'shard', pcolor: '#dff2ff', count: 34, s0: 1.5, s1: 5, grav: 0.03, glyph: 'none', shake: 'soft', dur: 2000 },
  frostNova:     { glow: '#9fe1ff', ring: '#cfe6ff', ring2: '#7cc4ff', particle: 'shard', pcolor: '#eaf6ff', count: 40, s0: 3, s1: 8, grav: 0.02, glyph: 'none', shake: 'soft', dur: 1900 },
  fire:          { glow: '#ff7a1a', ring: '#ffb24a', particle: 'ember', pcolor: '#ffb24a', count: 42, s0: 1.5, s1: 5, grav: -0.04, rise: true, glyph: 'none', shake: 'soft', dur: 2000 },
  hellfire:      { glow: '#7a1010', ring: '#ff3a1a', ring2: '#ffae3a', particle: 'ember', pcolor: '#ff5a2a', count: 48, s0: 2, s1: 6, grav: -0.04, rise: true, glyph: 'pentagram', glyphColor: '#ff3a3a', shape: 'cracks', shake: 'hard', dur: 2300 },
  emberStorm:    { glow: '#7a3a10', ring: '#ff9a3a', particle: 'ember', pcolor: '#ffb24a', count: 54, s0: 1.5, s1: 5.5, grav: -0.03, rise: true, glyph: 'none', shake: 'soft', dur: 2200 },
  moltenShatter: { glow: '#7a2a0a', ring: '#ff6a1a', particle: 'ember', pcolor: '#ff8a3a', count: 38, s0: 2, s1: 6, grav: 0.06, shape: 'cracks', glyph: 'none', shake: 'hard', dur: 2100 },
  explosion:     { glow: '#ffd25a', ring: '#ff7a1a', ring2: '#ffffff', particle: 'spark', pcolor: '#ffd25a', count: 64, s0: 4, s1: 13, grav: 0.06, glyph: 'none', shake: 'hard', dur: 1700 },
  poisonCloud:   { glow: '#4a7a10', ring: '#84cc16', particle: 'spore', pcolor: '#a3e635', count: 32, s0: 0.6, s1: 3, grav: -0.02, rise: true, glyph: 'none', shake: 'soft', dur: 2400 },
  plague:        { glow: '#3a4a10', ring: '#84cc16', particle: 'spore', pcolor: '#9acd32', count: 36, s0: 0.7, s1: 3.2, grav: -0.02, rise: true, glyph: 'skull', glyphColor: '#bef264', shake: 'soft', dur: 2500 },
  earthquake:    { glow: '#5a4632', ring: '#7a5a3a', particle: 'ash', pcolor: 'rgba(122,90,58,0.9)', count: 32, s0: 1, s1: 4, grav: 0.12, shape: 'cracks', glyph: 'none', shake: 'hard', dur: 2200 },
}

export const SUMMON_SHAKE: Set<SummonEffectType> = new Set(
  (Object.keys(C) as SummonEffectType[]).filter((k) => C[k].shake === 'hard'),
)

const TAU = Math.PI * 2
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

type Part = { x: number; y: number; vx: number; vy: number; size: number; rot: number; vr: number; born: number; max: number }

export function SummonBurst({ type, x, y, effectKey, onDone }: {
  type: SummonEffectType; x: number; y: number; effectKey: number; onDone: () => void
}) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(onDone); doneRef.current = onDone

  useEffect(() => {
    const cfg = C[type]; const c = cvs.current; const ctx = c?.getContext('2d')
    const t = window.setTimeout(() => doneRef.current(), cfg.dur)
    if (!c || !ctx) return () => window.clearTimeout(t)
    const D = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.floor(window.innerWidth * D); c.height = Math.floor(window.innerHeight * D)
    const ox = x * D, oy = y * D
    const maxR = (cfg.maxR ?? 330) * D
    const parts: Part[] = []
    const t0 = performance.now()
    for (let i = 0; i < cfg.count; i++) {
      const a = rnd(0, TAU); const sp = rnd(cfg.s0, cfg.s1) * D
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (cfg.rise ? rnd(0.5, 2) * D : 0), size: rnd(2, 5) * D, rot: rnd(0, TAU), vr: rnd(-0.15, 0.15), born: 0, max: cfg.dur * rnd(0.55, 0.95) })
    }
    let raf = 0
    const frame = (now: number) => {
      const p = (now - t0) / cfg.dur
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.globalCompositeOperation = 'lighter'

      // centrinis glow
      const gr = (20 + easeOut(Math.min(1, p / 0.3)) * 70) * D
      const gg = ctx.createRadialGradient(ox, oy, 0, ox, oy, gr); gg.addColorStop(0, cfg.glow); gg.addColorStop(1, 'transparent')
      ctx.globalAlpha = (1 - p) * 0.9; ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(ox, oy, gr, 0, TAU); ctx.fill(); ctx.globalAlpha = 1

      // sklindantys žiedai
      ring(ctx, ox, oy, easeOut(p) * maxR, cfg.ring, (1 - p) * 0.85, 4 * D)
      if (cfg.ring2) ring(ctx, ox, oy, easeOut(Math.max(0, p - 0.08)) * maxR, cfg.ring2, (1 - p) * 0.6, 2 * D)

      // forma
      if (cfg.shape === 'cracks') cracks(ctx, ox, oy, p, maxR, cfg.ring, D)
      else if (cfg.shape === 'tendrils') tendrils(ctx, ox, oy, p, maxR, cfg.ring, D, now)
      else if (cfg.shape === 'pillar') { ctx.fillStyle = cfg.glow; ctx.globalAlpha = (1 - p) * 0.5; const w = 36 * D * (1 - p * 0.4); ctx.fillRect(ox - w / 2, oy - maxR, w, maxR + 30 * D); ctx.globalAlpha = 1 }

      // dalelės
      for (const q of parts) {
        const e = (now - t0) / q.max; if (e >= 1) continue
        q.x += q.vx; q.y += q.vy; q.vy += cfg.grav * D; q.vx *= 0.985; q.vy *= 0.985; q.rot += q.vr
        drawP(ctx, cfg.particle, q, 1 - e, cfg.pcolor, D)
      }

      // glifas (vidury, pasirodo ~0.15, sukasi, blanksta)
      if (cfg.glyph && cfg.glyph !== 'none') glyph(ctx, cfg.glyph, ox, oy, (40 + easeOut(Math.min(1, p / 0.4)) * 26) * D, cfg.glyphColor ?? cfg.ring, p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8, now)

      if (now - t0 < cfg.dur) raf = requestAnimationFrame(frame)
      else ctx.clearRect(0, 0, c.width, c.height)
    }
    raf = requestAnimationFrame(frame)
    return () => { window.clearTimeout(t); cancelAnimationFrame(raf) }
  }, [type, x, y, effectKey])

  return <canvas ref={cvs} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 127, pointerEvents: 'none', width: '100%', height: '100%' }} />
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number, lw: number) {
  if (r < 1) return; ctx.strokeStyle = color; ctx.globalAlpha = Math.max(0, a); ctx.lineWidth = lw
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1
}
function cracks(ctx: CanvasRenderingContext2D, x: number, y: number, p: number, maxR: number, color: string, D: number) {
  const n = 9; ctx.strokeStyle = color; ctx.globalAlpha = (1 - p) * 0.8; ctx.lineWidth = 2 * D
  for (let i = 0; i < n; i++) { const a = i / n * TAU + 0.3; const r = easeOut(p) * maxR * (0.7 + (i % 3) * 0.12); ctx.beginPath(); ctx.moveTo(x, y); let cx = x, cy = y; const seg = 4; for (let k = 1; k <= seg; k++) { const rr = r * k / seg; const ja = a + Math.sin(k * 1.7 + i) * 0.18; cx = x + Math.cos(ja) * rr; cy = y + Math.sin(ja) * rr; ctx.lineTo(cx, cy) } ctx.stroke() }
  ctx.globalAlpha = 1
}
function tendrils(ctx: CanvasRenderingContext2D, x: number, y: number, p: number, maxR: number, color: string, D: number, now: number) {
  const n = 8; ctx.strokeStyle = color; ctx.globalAlpha = (1 - p) * 0.7; ctx.lineWidth = 3 * D; ctx.lineCap = 'round'
  for (let i = 0; i < n; i++) { const a = i / n * TAU + now / 2000; const r = easeOut(p) * maxR; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 1; k <= 6; k++) { const rr = r * k / 6; const wob = Math.sin(k * 1.3 + i + now / 300) * 14 * D * (k / 6); ctx.lineTo(x + Math.cos(a) * rr - Math.sin(a) * wob, y + Math.sin(a) * rr + Math.cos(a) * wob) } ctx.stroke() }
  ctx.globalAlpha = 1
}
function drawP(ctx: CanvasRenderingContext2D, kind: Pkind, q: Part, a: number, color: string, D: number) {
  const { x, y, size: s } = q
  if (kind === 'ember' || kind === 'wisp' || kind === 'spore') {
    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.6); g.addColorStop(0, color); g.addColorStop(1, 'transparent')
    ctx.globalAlpha = a * 0.9; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 2.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; return
  }
  if (kind === 'spark') { ctx.strokeStyle = color; ctx.globalAlpha = a; ctx.lineWidth = s * 0.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - q.vx * 2, y - q.vy * 2); ctx.stroke(); ctx.globalAlpha = 1; return }
  if (kind === 'ash' || kind === 'drop') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = color; ctx.globalAlpha = a; ctx.beginPath(); if (kind === 'drop') { ctx.ellipse(x, y, s * 0.7, s * 1.3, Math.atan2(q.vy, q.vx) + Math.PI / 2, 0, TAU) } else { ctx.arc(x, y, s, 0, TAU) } ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; return }
  if (kind === 'shard') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot); ctx.fillStyle = color; ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(0, -s * 2); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; return }
  if (kind === 'bone') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot); ctx.fillStyle = color; ctx.globalAlpha = a; ctx.beginPath(); ctx.roundRect(-s * 0.4, -s * 1.6, s * 0.8, s * 3.2, s * 0.4); ctx.fill(); ctx.beginPath(); ctx.arc(0, -s * 1.6, s * 0.6, 0, TAU); ctx.arc(0, s * 1.6, s * 0.6, 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; return }
  if (kind === 'rune') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot); ctx.strokeStyle = color; ctx.globalAlpha = a; ctx.lineWidth = s * 0.5; ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.moveTo(s, -s); ctx.lineTo(-s, s); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; return }
}
function glyph(ctx: CanvasRenderingContext2D, kind: Glyph, x: number, y: number, r: number, color: string, a: number, now: number) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = Math.max(0, a) * 0.95; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1.5, r * 0.05)
  if (kind === 'pentagram') { ctx.rotate(now / 1400); ctx.beginPath(); for (let i = 0; i <= 5; i++) { const an = (i * 2) / 5 * TAU - Math.PI / 2; const px = Math.cos(an) * r, py = Math.sin(an) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) } ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 1.12, 0, TAU); ctx.stroke() }
  else if (kind === 'rune') { ctx.rotate(now / 1200); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 6; i++) { const a1 = i / 6 * TAU, a2 = ((i + 2) % 6) / 6 * TAU; ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r); ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r) } ctx.stroke() }
  else if (kind === 'eye') { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, TAU); ctx.fill() }
  else if (kind === 'cross') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.moveTo(-r * 0.6, -r * 0.3); ctx.lineTo(r * 0.6, -r * 0.3); ctx.stroke() }
  else if (kind === 'skull') { ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.6, Math.PI, 0); ctx.lineTo(r * 0.45, r * 0.4); ctx.lineTo(-r * 0.45, r * 0.4); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(-r * 0.24, -r * 0.05, r * 0.16, 0, TAU); ctx.arc(r * 0.24, -r * 0.05, r * 0.16, 0, TAU); ctx.fill() }
  ctx.restore(); ctx.globalAlpha = 1
}
