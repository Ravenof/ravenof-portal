'use client'

// ── Iškvietimo (summon) efektai – PREMIUM, ORIGIN-BASED, DISTINCT MOTIFS ───────
// Kiekvienas efektas turi SAVO dominuojantį motyvą (ne tą patį ratą visiems):
//   ritual = magijos ratas+runos (tik ritualiniams), flame = kylančios liepsnos,
//   blast = sprogimo banga+skeveldros, ice = ledo kristalų žvaigždė, bolts = šakotas
//   žaibo tinklas, cloud = kunkuliuojantis nuodų debesis, quake = žemės plyšiai,
//   rift = vertikalus tuštumos plyšys, tendrils = šešėlių tentakliai, souls = kylantys
//   sielų wisp'ai+spinduliai, darkness = tamsos kupolas+korona, pulse = mirties banga,
//   eruption = kaulų spygliai. Origin = kortos pozicija; plinta į aplinką. Charge→release
//   timeline, sluoksniuotas bloom (shadowBlur), particle su trail+flicker. Vienas rAF.

import { useEffect, useRef } from 'react'
import type { SummonEffectType } from '@/lib/game/types'

type Pkind = 'ember' | 'shard' | 'wisp' | 'bone' | 'spore' | 'spark' | 'drop' | 'ash' | 'rune' | 'puff' | 'body'
type Motif = 'ritual' | 'flame' | 'blast' | 'ice' | 'bolts' | 'cloud' | 'quake' | 'rift' | 'tendrils' | 'souls' | 'darkness' | 'pulse' | 'eruption'
type Geom = 'hexagram' | 'pentagram' | 'star12' | 'triangle'

type Cfg = {
  motif: Motif; glow: string; ring: string; ring2?: string; core: string
  particle: Pkind; pcolor: string; count: number; s0: number; s1: number; grav: number; rise?: boolean
  geom?: Geom; runeN?: number; pentagram?: boolean; pillar?: boolean
  glyph?: 'skull' | 'eye'; shake?: 'soft' | 'hard'; dur: number
}

const C: Record<SummonEffectType, Cfg> = {
  eclipse:       { motif: 'darkness', glow: '#3a0a4a', ring: '#7c3aed', core: '#e9d5ff', particle: 'wisp', pcolor: 'rgba(80,30,110,0.85)', count: 30, s0: .4, s1: 2.4, grav: -.012, rise: true, glyph: 'eye', shake: 'soft', dur: 2400 },
  shadowSurge:   { motif: 'tendrils', glow: '#0a0a1a', ring: '#5a5a88', core: '#b0b0e0', particle: 'wisp', pcolor: 'rgba(24,22,42,0.95)', count: 34, s0: .6, s1: 3, grav: -.01, rise: true, shake: 'soft', dur: 2200 },
  voidRip:       { motif: 'rift', glow: '#160626', ring: '#9a4dff', ring2: '#c084fc', core: '#e9d5ff', particle: 'wisp', pcolor: 'rgba(140,70,255,0.8)', count: 32, s0: 1, s1: 4, grav: -.02, rise: true, glyph: 'eye', shake: 'hard', dur: 2400 },
  necroticSmoke: { motif: 'ritual', glow: '#0e4a3a', ring: '#5ef0c0', core: '#d6fff0', particle: 'wisp', pcolor: 'rgba(94,240,192,0.7)', count: 34, s0: .6, s1: 3, grav: -.02, rise: true, geom: 'hexagram', runeN: 26, glyph: 'skull', shake: 'soft', dur: 2400 },
  spectralWail:  { motif: 'souls', glow: '#22323f', ring: '#9fc8e8', core: '#eaf6ff', particle: 'wisp', pcolor: 'rgba(200,224,240,0.7)', count: 32, s0: .6, s1: 2.8, grav: -.045, rise: true, glyph: 'skull', shake: 'soft', dur: 2400 },
  soulRelease:   { motif: 'souls', glow: '#9fd0ff', ring: '#cfe6ff', core: '#ffffff', particle: 'wisp', pcolor: 'rgba(220,238,255,0.9)', count: 34, s0: .5, s1: 2.4, grav: -.06, rise: true, pillar: true, shake: 'soft', dur: 2400 },
  deathPulse:    { motif: 'pulse', glow: '#1e1e1e', ring: '#b0b0b0', core: '#f4f4f4', particle: 'ash', pcolor: 'rgba(180,180,180,0.85)', count: 30, s0: .8, s1: 3.2, grav: -.01, rise: true, glyph: 'skull', shake: 'soft', dur: 2300 },
  boneEruption:  { motif: 'eruption', glow: '#4a4234', ring: '#e8e0c8', core: '#fffaf0', particle: 'bone', pcolor: '#f0ead8', count: 30, s0: 2, s1: 6, grav: .12, glyph: 'skull', shake: 'hard', dur: 2200 },
  lightning:     { motif: 'bolts', glow: '#9fc4ff', ring: '#7db8ff', core: '#ffffff', particle: 'spark', pcolor: '#eaf4ff', count: 40, s0: 4, s1: 12, grav: 0, shake: 'soft', dur: 1900 },
  arcaneDeto:    { motif: 'ritual', glow: '#4c1d95', ring: '#a78bfa', ring2: '#ffffff', core: '#f5f0ff', particle: 'spark', pcolor: '#c4b5fd', count: 50, s0: 3, s1: 11, grav: .04, geom: 'star12', runeN: 32, shake: 'hard', dur: 2000 },
  cursedBrand:   { motif: 'ritual', glow: '#3a0a2a', ring: '#d4327a', core: '#ffd0e6', particle: 'rune', pcolor: '#ff3a8a', count: 28, s0: .6, s1: 2.8, grav: 0, geom: 'pentagram', runeN: 28, glyph: 'eye', shake: 'soft', dur: 2300 },
  bloodRitual:   { motif: 'ritual', glow: '#5a0808', ring: '#c01e1e', core: '#ff8080', particle: 'drop', pcolor: '#e23a3a', count: 34, s0: 2, s1: 6, grav: .14, geom: 'pentagram', runeN: 26, shake: 'soft', dur: 2400 },
  massFreeze:    { motif: 'ice', glow: '#5aa8e8', ring: '#cfe6ff', ring2: '#9fe1ff', core: '#ffffff', particle: 'shard', pcolor: '#dff2ff', count: 54, s0: 1.5, s1: 5, grav: .03, shake: 'soft', dur: 2100 },
  frostNova:     { motif: 'ice', glow: '#7cc4ff', ring: '#eaf6ff', ring2: '#7cc4ff', core: '#ffffff', particle: 'shard', pcolor: '#eaf6ff', count: 62, s0: 3, s1: 8, grav: .02, shake: 'soft', dur: 2000 },
  fire:          { motif: 'flame', glow: '#ff7a1a', ring: '#ffb24a', core: '#fff0c0', particle: 'ember', pcolor: '#ffb24a', count: 50, s0: 1.5, s1: 5, grav: -.05, rise: true, shake: 'soft', dur: 2100 },
  hellfire:      { motif: 'flame', glow: '#6a0c0c', ring: '#ff3a1a', core: '#ffe0a0', particle: 'ember', pcolor: '#ff5a2a', count: 58, s0: 2, s1: 6.5, grav: -.05, rise: true, pentagram: true, glyph: 'eye', shake: 'hard', dur: 2300 },
  emberStorm:    { motif: 'flame', glow: '#7a3a10', ring: '#ff9a3a', core: '#ffe0b0', particle: 'ember', pcolor: '#ffc24a', count: 64, s0: 1.5, s1: 6, grav: -.035, rise: true, shake: 'soft', dur: 2300 },
  moltenShatter: { motif: 'quake', glow: '#7a2a0a', ring: '#ff6a1a', core: '#ffd090', particle: 'ember', pcolor: '#ff8a3a', count: 40, s0: 2, s1: 6, grav: .08, shake: 'hard', dur: 2200 },
  explosion:     { motif: 'blast', glow: '#ffd25a', ring: '#ff7a1a', ring2: '#ffffff', core: '#ffffff', particle: 'spark', pcolor: '#ffd25a', count: 72, s0: 4, s1: 14, grav: .06, shake: 'hard', dur: 1800 },
  poisonCloud:   { motif: 'cloud', glow: '#3a6a0a', ring: '#84cc16', core: '#d4ff80', particle: 'spore', pcolor: '#a3e635', count: 34, s0: .6, s1: 3, grav: -.02, rise: true, glyph: 'skull', shake: 'soft', dur: 2400 },
  plague:        { motif: 'cloud', glow: '#2e3a0a', ring: '#9acd32', core: '#caff70', particle: 'spore', pcolor: '#9acd32', count: 40, s0: .7, s1: 3.2, grav: -.02, rise: true, glyph: 'skull', shake: 'soft', dur: 2500 },
  earthquake:    { motif: 'quake', glow: '#4a3826', ring: '#8a6a44', core: '#d0a060', particle: 'ash', pcolor: 'rgba(138,104,68,0.92)', count: 40, s0: 1, s1: 4, grav: .12, shake: 'hard', dur: 2300 },
}

export const SUMMON_SHAKE: Set<SummonEffectType> = new Set(
  (Object.keys(C) as SummonEffectType[]).filter((k) => C[k].shake === 'hard'),
)

const TAU = Math.PI * 2
const HALF = Math.PI / 2
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const eo = (t: number) => 1 - Math.pow(1 - t, 3)
const cl = (t: number) => Math.max(0, Math.min(1, t))

type Part = { x: number; y: number; px: number; py: number; vx: number; vy: number; size: number; rot: number; vr: number; max: number; seed: number; z: number; kind: Pkind }
type Bolt = { x: number; y: number }[]

export function SummonBurst({ type, x, y, effectKey, onDone }: {
  type: SummonEffectType; x: number; y: number; effectKey: number; onDone: () => void
}) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(onDone); doneRef.current = onDone

  useEffect(() => {
    const cfg = C[type]; const c = cvs.current; const ctx = c?.getContext('2d')
    const tEnd = window.setTimeout(() => doneRef.current(), cfg.dur)
    if (!c || !ctx) return () => window.clearTimeout(tEnd)
    const D = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.floor(window.innerWidth * D); c.height = Math.floor(window.innerHeight * D)
    const ox = x * D, oy = y * D
    const maxR = 520 * D
    const CHARGE = 0.24
    const parts: Part[] = []
    let bolts: Bolt[] = []
    let released = false
    const seedBurst = () => {
      released = true
      for (let i = 0; i < cfg.count; i++) { const a = rnd(0, TAU); const sp = rnd(cfg.s0, cfg.s1) * D; parts.push({ x: ox, y: oy, px: ox, py: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (cfg.rise ? rnd(0.5, 2) * D : 0), size: rnd(2, 5) * D, rot: rnd(0, TAU), vr: rnd(-0.18, 0.18), max: cfg.dur * rnd(0.5, 0.92), seed: rnd(0, 9), z: rnd(-1, 1), kind: cfg.particle }) }
      // tūrio „body" sluoksnis – tankūs minkšti puff'ai gyliui
      const mass = cfg.motif === 'cloud' || cfg.motif === 'souls' || cfg.motif === 'tendrils' || cfg.motif === 'darkness' || cfg.motif === 'ritual' || cfg.rise
      const bodyN = mass ? 18 : 7
      for (let i = 0; i < bodyN; i++) { const a = rnd(0, TAU); const sp = rnd(0.3, 1.5) * D; parts.push({ x: ox, y: oy, px: ox, py: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (cfg.rise ? rnd(0.6, 1.8) * D : 0), size: rnd(44, 96) * D, rot: 0, vr: 0, max: cfg.dur * rnd(0.6, 0.95), seed: rnd(0, 9), z: rnd(-1, 1), kind: 'body' }) }
      if (cfg.motif === 'bolts') bolts = genNet(ox, oy, maxR, D)
    }

    let raf = 0
    const t0 = performance.now()
    const frame = (now: number) => {
      const p = (now - t0) / cfg.dur
      const rt = released ? (p - CHARGE) / (1 - CHARGE) : 0
      ctx.clearRect(0, 0, c.width, c.height)

      // vignette į kortą
      ctx.globalCompositeOperation = 'source-over'
      const vg = ctx.createRadialGradient(ox, oy, 60 * D, ox, oy, 360 * D)
      vg.addColorStop(0, 'transparent'); vg.addColorStop(1, `rgba(2,1,6,${cl(p < 0.5 ? p : 1 - p) * 0.4})`)
      ctx.fillStyle = vg; ctx.fillRect(0, 0, c.width, c.height)
      ctx.globalCompositeOperation = 'lighter'

      // CHARGE: branduolys + sukantis žiedas renkasi
      if (p < CHARGE) {
        const k = p / CHARGE
        orb(ctx, ox, oy, (16 + k * 42) * D, cfg.ring, cfg.core, k * 0.85, D)
        ctx.strokeStyle = cfg.ring; ctx.globalAlpha = k * 0.7; ctx.lineWidth = 2 * D; ctx.beginPath(); ctx.arc(ox, oy, (50 - k * 26) * D, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1
      } else if (!released) seedBurst()

      // RELEASE blyksnis
      if (released && rt < 0.16) { orb(ctx, ox, oy, (50 + rt * 200) * D, cfg.ring, '#ffffff', (1 - rt / 0.16) * 0.95, D) }

      // ── DOMINUOJANTIS MOTYVAS ──
      if (released) {
        glow(ctx, ox, oy, eo(rt) * maxR * 0.5, cfg.glow, (1 - rt) * 0.22)   // bendra išsiplečianti aura
        switch (cfg.motif) {
          case 'ritual':  ritual(ctx, ox, oy, p, rt, cfg, now, D); break
          case 'flame':   flame(ctx, ox, oy, rt, cfg, now, D); if (cfg.pentagram) pentaOverlay(ctx, ox, oy, p, cfg.core, now, D); break
          case 'blast':   blast(ctx, ox, oy, rt, cfg, maxR, D); break
          case 'ice': {
            ringB(ctx, ox, oy, eo(rt) * maxR, cfg.ring, (1 - rt) * 0.85, 5 * D, D)
            if (cfg.ring2) ringB(ctx, ox, oy, eo(Math.max(0, rt - 0.08)) * maxR, cfg.ring2, (1 - rt) * 0.55, 2.5 * D, D)
            glow(ctx, ox, oy, eo(rt) * maxR * 0.55, cfg.glow, (1 - rt) * 0.3)
            break
          }
          case 'bolts':   drawBolts(ctx, bolts, rt, cfg, now, D); break
          case 'cloud':   cloud(ctx, ox, oy, rt, cfg, now, D); break
          case 'quake':   cracks(ctx, ox, oy, rt, maxR, cfg.ring, cfg.core, D); glow(ctx, ox, oy, 50 * D * (1 - rt), cfg.glow, (1 - rt) * 0.4); break
          case 'rift':    rift(ctx, ox, oy, p, rt, cfg, now, D); break
          case 'tendrils':tendrils(ctx, ox, oy, rt, maxR, cfg.ring, D, now); ringB(ctx, ox, oy, eo(rt) * maxR, cfg.ring, (1 - rt) * 0.4, 2 * D, D); break
          case 'souls':   souls(ctx, ox, oy, rt, cfg, now, D); break
          case 'darkness':darkness(ctx, ox, oy, p, rt, cfg, D); break
          case 'pulse':   ringB(ctx, ox, oy, eo(rt) * maxR, cfg.ring, (1 - rt) * 0.95, 8 * D, D); ringB(ctx, ox, oy, eo(Math.max(0, rt - 0.1)) * maxR, cfg.core, (1 - rt) * 0.5, 3 * D, D); break
          case 'eruption':eruption(ctx, ox, oy, rt, cfg, D); cracks(ctx, ox, oy, rt, maxR * 0.7, cfg.ring, cfg.core, D); break
        }
        // bendros dalelės virš motyvo (sutvarkytos pagal gylį – tūris)
        parts.sort((u, v) => u.z - v.z)
        for (const q of parts) {
          const e = (now - t0 - CHARGE * cfg.dur) / q.max; if (e < 0 || e >= 1) continue
          q.px = q.x; q.py = q.y; q.x += q.vx; q.y += q.vy; q.vy += cfg.grav * D; q.vx *= 0.986; q.vy *= 0.986; q.rot += q.vr
          drawP(ctx, q, 1 - e, cfg.pcolor, cfg.glow, now, D)
        }
      }

      // centrinis glifas
      if (cfg.glyph) { const ga = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7; glyph(ctx, cfg.glyph, ox, oy, 30 * D, cfg.core, Math.max(0, ga), now) }

      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1
      if (now - t0 < cfg.dur) raf = requestAnimationFrame(frame)
      else ctx.clearRect(0, 0, c.width, c.height)
    }
    raf = requestAnimationFrame(frame)
    return () => { window.clearTimeout(tEnd); cancelAnimationFrame(raf) }
  }, [type, x, y, effectKey])

  return <canvas ref={cvs} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 127, pointerEvents: 'none', width: '100%', height: '100%' }} />
}

// ── primityvai ────────────────────────────────────────────────────────────────
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number) {
  if (a <= 0 || r <= 0) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'transparent')
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
}
function orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, core: string, a: number, D: number) {
  if (a <= 0) return
  for (let i = 4; i >= 0; i--) { const rr = r * (0.5 + i * 0.17); glow(ctx, x, y - i * 2 * D, rr, i < 2 ? core : color, a * (0.28 + (4 - i) * 0.12)) }
}
function ringB(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number, lw: number, D: number) {
  if (r < 1 || a <= 0) return; ctx.shadowColor = color; ctx.shadowBlur = 10 * D
  ctx.strokeStyle = color; ctx.globalAlpha = a; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke()
  ctx.shadowBlur = 0; ctx.globalAlpha = 1
}
// FLAME – volumetric kylantis ugnies pliūpsnis (plūsta iš kortos aukštyn ir į šonus)
function flame(ctx: CanvasRenderingContext2D, ox: number, oy: number, rt: number, cfg: Cfg, now: number, D: number) {
  const up = eo(cl(rt * 1.3)); const fade = rt < 0.78 ? 1 : 1 - (rt - 0.78) / 0.22
  // pliūpsnio banga prie pagrindo (sklinda į šonus)
  glow(ctx, ox, oy, (40 + up * 120) * D, cfg.glow, fade * (1 - rt) * 0.45)
  const n = 22
  for (let i = 0; i < n; i++) {
    const t = (i % 11) / 11; const lobe = i < 11 ? 1 : -1
    const sway = Math.sin(now / 190 + i * 1.4) * 26 * D * t
    const spread = lobe * (8 + t * 70) * D * up               // platėja kylant ir į šonus
    const px = ox + spread + sway * 0.6
    const py = oy - t * 165 * D * up * (0.82 + 0.18 * Math.sin(now / 150 + i))
    const s = (46 - t * 24) * D * (0.7 + 0.3 * Math.sin(now / 110 + i * 2))   // tankesnis/platus apačioje
    const col = t < 0.34 ? cfg.core : t < 0.66 ? cfg.ring : cfg.glow
    const g = ctx.createRadialGradient(px, py, 0, px, py, s * 1.7)
    g.addColorStop(0, col); g.addColorStop(0.55, cfg.glow); g.addColorStop(1, 'transparent')
    ctx.globalAlpha = fade * (1 - rt) * 0.5 * (1 - t * 0.35); ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(px, py, s * 1.7, 0, TAU); ctx.fill()
  }
  ctx.globalAlpha = 1; glow(ctx, ox, oy, 74 * D, cfg.core, fade * (1 - rt) * 0.7)
}
function pentaOverlay(ctx: CanvasRenderingContext2D, ox: number, oy: number, p: number, core: string, now: number, D: number) {
  ctx.save(); ctx.translate(ox, oy); ctx.scale(1, 0.42); ctx.rotate(now / 2400); ctx.strokeStyle = core; ctx.shadowColor = core; ctx.shadowBlur = 10 * D; ctx.globalAlpha = cl(p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15) * 0.85; ctx.lineWidth = 2 * D
  const r = 80 * D; ctx.beginPath(); for (let i = 0; i <= 5; i++) { const a = ((i * 2) % 5) / 5 * TAU - HALF; const px = Math.cos(a) * r, py = Math.sin(a) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py) } ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 1.14, 0, TAU); ctx.stroke()
  ctx.shadowBlur = 0; ctx.restore(); ctx.globalAlpha = 1
}
// BLAST – sprogimo banga + skeveldros
function blast(ctx: CanvasRenderingContext2D, ox: number, oy: number, rt: number, cfg: Cfg, maxR: number, D: number) {
  ringB(ctx, ox, oy, eo(rt) * maxR, cfg.ring, (1 - rt) * 0.9, 6 * D, D)
  if (cfg.ring2) ringB(ctx, ox, oy, eo(Math.max(0, rt - 0.08)) * maxR, cfg.ring2, (1 - rt) * 0.6, 3 * D, D)
  ctx.save(); ctx.translate(ox, oy)
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; const r0 = eo(rt) * 50 * D, r1 = eo(rt) * maxR * (0.7 + (i % 3) * 0.1); ctx.strokeStyle = cfg.ring; ctx.globalAlpha = (1 - rt) * 0.5; ctx.lineWidth = 2 * D; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke() }
  ctx.restore(); ctx.globalAlpha = 1
}
// BOLTS – šakotas žaibo tinklas
function genNet(ox: number, oy: number, maxR: number, D: number): Bolt[] {
  const bolts: Bolt[] = []; const n = 7
  for (let i = 0; i < n; i++) { const a = i / n * TAU + rnd(-0.2, 0.2); bolts.push(genBolt(ox, oy, ox + Math.cos(a) * maxR * 0.9, oy + Math.sin(a) * maxR * 0.9, 30 * D)) }
  return bolts
}
function genBolt(x1: number, y1: number, x2: number, y2: number, disp: number): Bolt {
  let pts: Bolt = [{ x: x1, y: y1 }, { x: x2, y: y2 }]; let d = disp
  for (let it = 0; it < 5; it++) { const np: Bolt = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1; const off = rnd(-d, d); np.push(a, { x: mx - dy / len * off, y: my + dx / len * off }) } np.push(pts[pts.length - 1]); pts = np; d *= 0.55 }
  return pts
}
function drawBolts(ctx: CanvasRenderingContext2D, bolts: Bolt[], rt: number, cfg: Cfg, now: number, D: number) {
  const fl = rt < 0.5 ? 1 : (Math.sin(now / 40) > 0 ? 0.8 : 0.3); const a = (1 - rt) * fl
  ctx.lineCap = 'round'; ctx.shadowColor = cfg.ring; ctx.shadowBlur = 14 * D
  ctx.strokeStyle = cfg.ring; ctx.globalAlpha = a * 0.5; ctx.lineWidth = 5 * D; for (const b of bolts) trace(ctx, b)
  ctx.shadowBlur = 7 * D; ctx.strokeStyle = cfg.core; ctx.globalAlpha = a; ctx.lineWidth = 1.6 * D; for (const b of bolts) trace(ctx, b)
  ctx.shadowBlur = 0; ctx.globalAlpha = 1
}
function trace(ctx: CanvasRenderingContext2D, b: Bolt) { ctx.beginPath(); ctx.moveTo(b[0].x, b[0].y); for (let i = 1; i < b.length; i++) ctx.lineTo(b[i].x, b[i].y); ctx.stroke() }
// CLOUD – kunkuliuojantis debesis
function cloud(ctx: CanvasRenderingContext2D, ox: number, oy: number, rt: number, cfg: Cfg, now: number, D: number) {
  ctx.globalCompositeOperation = 'source-over'
  for (let i = 0; i < 11; i++) { const a = i / 11 * TAU; const rr = eo(rt) * 100 * D + Math.sin(i * 2) * 12 * D; const cx = ox + Math.cos(a) * rr; const cy = oy + Math.sin(a) * rr * 0.7 - eo(rt) * 46 * D; const s = (32 + Math.sin(now / 280 + i) * 9) * D; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s); g.addColorStop(0, cfg.glow); g.addColorStop(0.6, cfg.pcolor); g.addColorStop(1, 'transparent'); ctx.globalAlpha = (1 - rt) * 0.42; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, s, 0, TAU); ctx.fill() }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; glow(ctx, ox, oy, 50 * D, cfg.core, (1 - rt) * 0.35)
}
// QUAKE – žemės plyšiai
function cracks(ctx: CanvasRenderingContext2D, x: number, y: number, rt: number, maxR: number, color: string, core: string, D: number) {
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU + 0.25; const r = eo(rt) * maxR * (0.6 + (i % 3) * 0.14)
    const pts: [number, number][] = [[x, y]]; for (let k = 1; k <= 5; k++) { const rr = r * k / 5; const ja = a + Math.sin(k * 1.7 + i) * 0.2; pts.push([x + Math.cos(ja) * rr, y + Math.sin(ja) * rr]) }
    ctx.strokeStyle = color; ctx.globalAlpha = (1 - rt) * 0.85; ctx.lineWidth = 4 * D; ctx.beginPath(); pts.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke()
    ctx.strokeStyle = core; ctx.shadowColor = core; ctx.shadowBlur = 8 * D; ctx.globalAlpha = (1 - rt) * 0.95; ctx.lineWidth = 1.4 * D; ctx.beginPath(); pts.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.shadowBlur = 0
  }
  ctx.globalAlpha = 1
}
// RIFT – vertikalus tuštumos plyšys
function rift(ctx: CanvasRenderingContext2D, ox: number, oy: number, p: number, rt: number, cfg: Cfg, now: number, D: number) {
  const fade = cl(p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15)
  const h = (40 + eo(cl(p * 1.4)) * 150) * D * fade; const w = (9 + Math.sin(now / 200) * 3) * D * (1 - rt * 0.4)
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#05010a'; ctx.globalAlpha = cl(p * 3) * fade; ctx.beginPath(); ctx.ellipse(ox, oy, w, h, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = cfg.ring; ctx.shadowColor = cfg.ring2 ?? cfg.core; ctx.shadowBlur = 16 * D; ctx.globalAlpha = fade * 0.95; ctx.lineWidth = 2.5 * D; ctx.beginPath(); ctx.ellipse(ox, oy, w, h, 0, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1
  glow(ctx, ox, oy, w * 4, cfg.core, fade * 0.5)
}
// TENDRILS – šešėlių tentakliai
function tendrils(ctx: CanvasRenderingContext2D, x: number, y: number, rt: number, maxR: number, color: string, D: number, now: number) {
  const n = 9; ctx.strokeStyle = color; ctx.globalAlpha = (1 - rt) * 0.78; ctx.lineWidth = 3.5 * D; ctx.lineCap = 'round'
  for (let i = 0; i < n; i++) { const a = i / n * TAU + now / 2200; const r = eo(rt) * maxR; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 1; k <= 7; k++) { const rr = r * k / 7; const wob = Math.sin(k * 1.25 + i + now / 280) * 18 * D * (k / 7); ctx.lineTo(x + Math.cos(a) * rr - Math.sin(a) * wob, y + Math.sin(a) * rr + Math.cos(a) * wob) } ctx.stroke() }
  ctx.globalAlpha = 1
}
// SOULS – kylantys sielų wisp'ai + spinduliai
function souls(ctx: CanvasRenderingContext2D, ox: number, oy: number, rt: number, cfg: Cfg, now: number, D: number) {
  ctx.save(); ctx.translate(ox, oy); ctx.rotate(now / 5000)
  for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; const w = 0.05; const R = (90 + eo(rt) * 200) * D; ctx.fillStyle = cfg.core; ctx.globalAlpha = (1 - rt) * 0.08; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an - w) * R, Math.sin(an - w) * R); ctx.lineTo(Math.cos(an + w) * R, Math.sin(an + w) * R); ctx.closePath(); ctx.fill() }
  ctx.restore(); ctx.globalAlpha = 1
  if (cfg.pillar) { const ph = (60 + eo(rt) * 150) * D; const g = ctx.createLinearGradient(ox, oy, ox, oy - ph); g.addColorStop(0, cfg.core); g.addColorStop(1, 'transparent'); ctx.globalAlpha = (1 - rt) * 0.5; ctx.fillStyle = g; const w = 30 * D * (1 - rt * 0.4); ctx.fillRect(ox - w / 2, oy - ph, w, ph); ctx.globalAlpha = 1 }
}
// DARKNESS – tamsos kupolas + korona
function darkness(ctx: CanvasRenderingContext2D, ox: number, oy: number, p: number, rt: number, cfg: Cfg, D: number) {
  const fade = cl(p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15); const dr = (22 + eo(cl(p / 0.4)) * 72) * D
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#04020a'; ctx.globalAlpha = cl(p * 2) * fade; ctx.beginPath(); ctx.arc(ox, oy, dr, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = cfg.core; ctx.shadowColor = cfg.ring; ctx.shadowBlur = 18 * D; ctx.globalAlpha = fade * 0.9; ctx.lineWidth = 3 * D; ctx.beginPath(); ctx.arc(ox, oy, dr + 4 * D, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1
  ringB(ctx, ox, oy, eo(rt) * 300 * D, cfg.ring, (1 - rt) * 0.45, 3 * D, D)
}
// ERUPTION – kaulų spygliai
function eruption(ctx: CanvasRenderingContext2D, ox: number, oy: number, rt: number, cfg: Cfg, D: number) {
  const g = eo(cl(rt * 1.4)); ctx.save(); ctx.translate(ox, oy)
  for (let i = 0; i < 11; i++) { const a = i / 11 * TAU; const dist = (40 + (i % 3) * 16) * D; const len = (34 + (i % 4) * 12) * D * g; const bx = Math.cos(a) * dist, by = Math.sin(a) * dist * 0.6; ctx.fillStyle = cfg.ring; ctx.shadowColor = cfg.core; ctx.shadowBlur = 5 * D; ctx.globalAlpha = (1 - rt) * 0.92; ctx.beginPath(); ctx.moveTo(bx - 5 * D, by); ctx.lineTo(bx, by - len); ctx.lineTo(bx + 5 * D, by); ctx.closePath(); ctx.fill() }
  ctx.shadowBlur = 0; ctx.restore(); ctx.globalAlpha = 1
}
// RITUAL – magijos ratas (tik ritualiniams)
function ritual(ctx: CanvasRenderingContext2D, ox: number, oy: number, p: number, rt: number, cfg: Cfg, now: number, D: number) {
  const R = 118 * D; const prog = cl(p / 0.24); const fade = cl(p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15)
  if (fade <= 0) { ringB(ctx, ox, oy, eo(rt) * 320 * D, cfg.ring, (1 - rt) * 0.5, 3 * D, D); return }
  ctx.save(); ctx.translate(ox, oy); ctx.scale(1, 0.42); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade; ctx.shadowColor = cfg.ring; ctx.shadowBlur = 12 * D
  const end = -HALF + prog * TAU; ctx.strokeStyle = cfg.ring; ctx.lineWidth = 2 * D; arc(ctx, R, end); arc(ctx, R * 0.97, end); ctx.lineWidth = 3.4 * D; arc(ctx, R * 0.8, end); ctx.lineWidth = 1.4 * D; arc(ctx, R * 0.3, end)
  ctx.save(); ctx.rotate(now / 3400); for (let i = 0; i < 48; i++) { if (i / 48 > prog) break; const a = i / 48 * TAU; ctx.lineWidth = (i % 12 === 0 ? 3 : 1) * D; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineTo(Math.cos(a) * R * (i % 12 === 0 ? 0.86 : 0.92), Math.sin(a) * R * (i % 12 === 0 ? 0.86 : 0.92)); ctx.stroke() } ctx.restore()
  const runeN = cfg.runeN ?? 24; ctx.save(); ctx.rotate(-now / 2700); ctx.strokeStyle = cfg.core; ctx.lineWidth = 1.5 * D; for (let i = 0; i < runeN; i++) { if (i / runeN > prog) break; const a = i / runeN * TAU; ctx.save(); ctx.rotate(a); ctx.translate(R * 0.88, 0); ctx.rotate(HALF); runeMark(ctx, (i * 3) % 4, 5 * D); ctx.restore() } ctx.restore()
  if (prog > 0.6 && cfg.geom) { ctx.save(); ctx.rotate(now / 2400); ctx.strokeStyle = cfg.core; ctx.lineWidth = 1.8 * D; drawGeom(ctx, cfg.geom, R * 0.64); ctx.restore() }
  ctx.shadowBlur = 0; ctx.restore(); ctx.globalAlpha = 1
}
function arc(ctx: CanvasRenderingContext2D, r: number, end: number) { ctx.beginPath(); ctx.arc(0, 0, r, -HALF, end); ctx.stroke() }
function runeMark(ctx: CanvasRenderingContext2D, v: number, s: number) {
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s)
  if (v === 0) { ctx.moveTo(0, -s * 0.4); ctx.lineTo(s * 0.6, -s * 0.8) } else if (v === 1) { ctx.moveTo(0, 0); ctx.lineTo(s * 0.6, -s * 0.5); ctx.moveTo(0, 0); ctx.lineTo(s * 0.6, s * 0.5) } else if (v === 2) { ctx.moveTo(-s * 0.5, -s * 0.6); ctx.lineTo(s * 0.5, -s * 0.6) } else { ctx.moveTo(0, -s * 0.3); ctx.lineTo(s * 0.5, 0); ctx.lineTo(0, s * 0.3) }
  ctx.stroke()
}
function drawGeom(ctx: CanvasRenderingContext2D, geom: Geom, r: number) {
  const poly = (n: number, off: number) => { ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU - HALF + off; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) } ctx.stroke() }
  const starP = (n: number, k: number) => { ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = ((i * k) % n) / n * TAU - HALF; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) } ctx.stroke() }
  if (geom === 'hexagram') { poly(3, 0); poly(3, Math.PI) } else if (geom === 'pentagram') starP(5, 2); else if (geom === 'star12') starP(12, 5); else poly(3, 0)
}
function drawP(ctx: CanvasRenderingContext2D, q: Part, a: number, color: string, dark: string, now: number, D: number) {
  const { x, y } = q
  const zf = 0.55 + (q.z + 1) / 2 * 0.85           // gylio mastelis (priekis didesnis)
  const s = q.size * zf
  a *= 0.5 + (q.z + 1) / 2 * 0.5                    // priekis ryškesnis
  if (q.kind === 'body') { ctx.globalCompositeOperation = 'source-over'; const g = ctx.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, color); g.addColorStop(0.45, dark); g.addColorStop(1, 'transparent'); ctx.globalAlpha = a * 0.3; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; return }
  if (q.kind === 'ember' || q.kind === 'wisp' || q.kind === 'spore') { const fl = 0.75 + 0.25 * Math.sin(now * 0.02 + q.seed * 7); const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.8); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); ctx.globalAlpha = a * 0.9 * fl; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s * 2.8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; return }
  if (q.kind === 'spark') { ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6 * D; ctx.globalAlpha = a; ctx.lineWidth = s * 0.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q.px, q.py); ctx.lineTo(x, y); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; return }
  if (q.kind === 'ash' || q.kind === 'drop') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = color; ctx.globalAlpha = a; ctx.beginPath(); if (q.kind === 'drop') ctx.ellipse(x, y, s * 0.7, s * 1.4, Math.atan2(q.vy, q.vx) + HALF, 0, TAU); else ctx.arc(x, y, s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; return }
  if (q.kind === 'shard') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 6 * D; ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(0, -s * 2.2); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.restore(); ctx.globalAlpha = 1; return }
  if (q.kind === 'bone') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = color; ctx.globalAlpha = a; ctx.beginPath(); ctx.roundRect(-s * 0.4, -s * 1.6, s * 0.8, s * 3.2, s * 0.4); ctx.fill(); ctx.beginPath(); ctx.arc(0, -s * 1.6, s * 0.6, 0, TAU); ctx.arc(0, s * 1.6, s * 0.6, 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; return }
  if (q.kind === 'rune') { ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot); ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 5 * D; ctx.globalAlpha = a; ctx.lineWidth = s * 0.5; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(0, -s * 0.4); ctx.lineTo(s * 0.7, -s * 0.9); ctx.stroke(); ctx.shadowBlur = 0; ctx.restore(); ctx.globalAlpha = 1; return }
}
function glyph(ctx: CanvasRenderingContext2D, kind: 'skull' | 'eye', x: number, y: number, r: number, c: string, a: number, now: number) {
  if (a <= 0) return; ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.95; ctx.strokeStyle = c; ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 8; ctx.lineWidth = Math.max(1.6, r * 0.06)
  if (kind === 'eye') { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.3 * (0.9 + 0.1 * Math.sin(now / 200)), 0, TAU); ctx.fill() }
  else { ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.62, Math.PI, 0); ctx.lineTo(r * 0.46, r * 0.42); ctx.lineTo(-r * 0.46, r * 0.42); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(-r * 0.26, -r * 0.05, r * 0.17, 0, TAU); ctx.arc(r * 0.26, -r * 0.05, r * 0.17, 0, TAU); ctx.fill() }
  ctx.shadowBlur = 0; ctx.restore(); ctx.globalAlpha = 1
}
