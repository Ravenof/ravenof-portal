'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Iškvietimo (summon) efektai v2 – KIEKVIENAS SU SAVO KINEMATOGRAFINE SCENA ──
// Perdaryta iš pagrindų: ne bendras „žiedas+dalelės" šablonas, o unikali
// anticipation→impact→aftermath dramaturgija kiekvienam efektui (žr. fx-summon-preview.html).
// Technika pigi: radialiniai/linijiniai gradientai + globalCompositeOperation='lighter',
// BE shadowBlur/ctx.filter. Tyčinės linijos tik ten, kur natūralu (žaibai, žemės plyšiai,
// sigilo brėžiai). Vienas rAF, dalelės ~30–60 (LOW įrenginiuose ~pusė, DPR 1).

import { useEffect, useRef } from 'react'
import type { SummonEffectType } from '@/lib/game/types'

const TAU = Math.PI * 2
const HALF = Math.PI / 2
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const eo = (t: number) => 1 - Math.pow(1 - t, 3)
const ei = (t: number) => t * t
const cl = (t: number) => Math.max(0, Math.min(1, t))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const DUR: Record<SummonEffectType, number> = {
  eclipse: 2400, shadowSurge: 2300, voidRip: 2400, necroticSmoke: 2400, spectralWail: 2400,
  soulRelease: 2400, deathPulse: 2300, boneEruption: 2300, lightning: 2000, arcaneDeto: 2200,
  cursedBrand: 2400, bloodRitual: 2400, massFreeze: 2300, frostNova: 2200, fire: 2200,
  hellfire: 2400, emberStorm: 2300, moltenShatter: 2300, explosion: 1900, poisonCloud: 2400,
  plague: 2400, earthquake: 2300,
}

// stiprus board shake šiems (kaip anksčiau)
export const SUMMON_SHAKE: Set<SummonEffectType> = new Set([
  'voidRip', 'boneEruption', 'arcaneDeto', 'hellfire', 'moltenShatter', 'explosion', 'earthquake',
] as SummonEffectType[])

export function SummonBurst({ type, x, y, effectKey, onDone }: {
  type: SummonEffectType; x: number; y: number; effectKey: number; onDone: () => void
}) {
  const cvs = useRef<HTMLCanvasElement | null>(null)
  const doneRef = useRef(onDone); doneRef.current = onDone

  useEffect(() => {
    const cv = cvs.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const LOW = window.innerWidth < 820
      || (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4)
      || (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
    const D = Math.min(window.devicePixelRatio || 1, LOW ? 1 : 2)
    cv.width = window.innerWidth * D; cv.height = window.innerHeight * D
    const dur = DUR[type] || 2300
    const tEnd = window.setTimeout(() => doneRef.current(), dur)
    const o = { x: x * D, y: y * D }
    const st: any = {}
    const W = () => cv.width, H = () => cv.height
    const N = (n: number) => (LOW ? Math.ceil(n * 0.55) : n)

    // ── primityvai ────────────────────────────────────────────────────────────
    const glow = (gx: number, gy: number, r: number, color: string, a: number) => {
      if (r <= 0 || a <= 0) return
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r)
      g.addColorStop(0, color); g.addColorStop(1, 'transparent')
      ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
    }
    const softRing = (gx: number, gy: number, r: number, thick: number, color: string, a: number) => {
      if (r <= 0 || a <= 0) return
      const g = ctx.createRadialGradient(gx, gy, Math.max(0, r - thick), gx, gy, r + thick)
      g.addColorStop(0, 'transparent'); g.addColorStop(.5, color); g.addColorStop(1, 'transparent')
      ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r + thick, 0, TAU); ctx.fill(); ctx.globalAlpha = 1
    }
    const dark = (gx: number, gy: number, r: number, a: number) => {
      ctx.globalCompositeOperation = 'source-over'; glow(gx, gy, r, 'rgba(4,2,8,1)', a); ctx.globalCompositeOperation = 'lighter'
    }
    const washScreen = (color: string, a: number) => {
      if (a <= 0) return
      ctx.fillStyle = color; ctx.globalAlpha = a; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1
    }
    const darkVeil = (a: number) => {
      if (a <= 0) return
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(3,1,6,1)'; ctx.globalAlpha = a
      ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'
    }
    const pillar = (px: number, baseY: number, topY: number, w: number, color: string, a: number) => {
      if (a <= 0) return
      const g = ctx.createLinearGradient(0, topY, 0, baseY); g.addColorStop(0, 'transparent'); g.addColorStop(1, color)
      ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath()
      ctx.moveTo(px - w, baseY); ctx.lineTo(px - w * .32, topY); ctx.lineTo(px + w * .32, topY); ctx.lineTo(px + w, baseY)
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1
    }
    // šakotas žaibas (tyčinės linijos — žaibui natūralu)
    const boltPath = (x0: number, y0: number, x1: number, y1: number, jag: number) => {
      const pts: number[][] = [[x0, y0]]; const n = 7
      for (let i = 1; i < n; i++) { const t = i / n; pts.push([lerp(x0, x1, t) + rnd(-jag, jag), lerp(y0, y1, t) + rnd(-jag * .4, jag * .4)]) }
      pts.push([x1, y1]); return pts
    }
    const drawBolt = (pts: number[][], color: string, coreW: number, a: number) => {
      ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.strokeStyle = color; ctx.lineWidth = coreW * 3
      ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = coreW
      ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.globalAlpha = 1
    }
    // žemės plyšiai (tyčinės linijos)
    const crack = (org: { x: number; y: number }, ang: number, len: number, segs: number) => {
      const pts: number[][] = [[org.x, org.y]]; let px = org.x, py = org.y, a = ang
      for (let i = 0; i < segs; i++) { a += rnd(-.35, .35); const L = len / segs; px += Math.cos(a) * L; py += Math.sin(a) * L * .4; pts.push([px, py]) }
      return pts
    }
    const drawCrack = (pts: number[][], color: string, w: number, a: number, glowc: string | null) => {
      ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'
      ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.globalAlpha = 1
      if (glowc) for (let i = 1; i < pts.length; i += 2) glow(pts[i][0], pts[i][1], w * 4, glowc, a * .5)
    }
    const seed = (n: number, fn: (i: number) => any) => {
      if (st.seeded) return; st.seeded = true; st.p = []
      const nn = N(n); for (let i = 0; i < nn; i++) st.p.push(fn(i))
    }
    const parts = (fn: (q: any, i: number) => void) => { if (!st.p) return; for (let i = 0; i < st.p.length; i++) fn(st.p[i], i) }

    // ── 22 efektai ────────────────────────────────────────────────────────────
    const EFF: Record<SummonEffectType, (p: number, now: number) => void> = {

      // 🌑 TAMSA: ekranas temsta, juoda saulė su violetine korona pakyla ir kolapsuoja į kortą
      eclipse(p, now) {
        darkVeil(Math.sin(cl(p) * Math.PI) * .55)
        const sy = o.y - 170 * D
        if (p < .62) {
          const k = eo(cl(p / .5))
          dark(o.x, sy, 70 * D * k, 1)
          softRing(o.x, sy, 72 * D * k, 16 * D, '#7c3aed', .85)
          softRing(o.x, sy, 86 * D * k, 26 * D, '#3a0a4a', .5)
          for (let i = 0; i < 6; i++) { const a = now / 900 + i / 6 * TAU; glow(o.x + Math.cos(a) * 84 * D * k, sy + Math.sin(a) * 84 * D * k, 10 * D, '#c084fc', .5 * k) }
        } else {
          const q = (p - .62) / .38
          const yy = lerp(sy, o.y, ei(q)), rr = 70 * D * (1 - q * .85)
          dark(o.x, yy, rr, 1 - q * .3); softRing(o.x, yy, rr + 8 * D, 12 * D, '#7c3aed', (1 - q) * .9)
          if (q > .75) { softRing(o.x, o.y, (q - .75) / .25 * 260 * D, 30 * D, '#a855f7', (1 - q) * .9); glow(o.x, o.y, 90 * D * (1 - q), '#e9d5ff', 1 - q) }
        }
        seed(26, () => ({ x: rnd(0, W()), y: rnd(0, H()), v: rnd(.2, .7) * D, s: rnd(1.5, 3.5) * D, ph: rnd(0, 9) }))
        parts(q => { q.y -= q.v; if (q.y < -9) q.y = H(); glow(q.x + Math.sin(now / 700 + q.ph) * 8 * D, q.y, q.s * 2, '#6d28d9', .3 * Math.sin(cl(p) * Math.PI)) })
      },

      // 🌫️ ŠEŠĖLIŲ ANTPLŪDIS: tamsos potvynis iš abiejų pusių žeme → šešėlių geizeris
      shadowSurge(p, now) {
        const gy = o.y + 70 * D
        if (p < .4) {
          const k = eo(p / .4)
          for (const dir of [-1, 1]) {
            const front = lerp(dir > 0 ? W() + 80 * D : -80 * D, o.x, k)
            for (let i = 0; i < 7; i++) { const bx = front - dir * i * 46 * D, s = (34 + i * 7) * D; dark(bx, gy + Math.sin(now / 220 + i) * 5 * D, s, .5); glow(bx, gy, s * .5, '#5a5a88', .12) }
          }
        } else {
          const q = (p - .4) / .6, up = eo(cl(q * 1.3))
          for (let i = 0; i < 12; i++) {
            const t = i / 12, sway = Math.sin(now / 170 + i * 1.7) * 20 * D * t
            const px = o.x + sway + (i % 2 ? -1 : 1) * t * 26 * D, py = gy - t * 230 * D * up
            dark(px, py, (40 - t * 20) * D, (1 - q * .6) * .7); glow(px, py, (22 - t * 10) * D, '#8888c0', (1 - q) * .22)
          }
          softRing(o.x, gy, eo(q) * 250 * D, 26 * D, '#5a5a88', (1 - q) * .5)
          glow(o.x, o.y, 70 * D, '#b0b0e0', Math.sin(q * Math.PI) * .4)
        }
        seed(20, () => ({ x: o.x + rnd(-60, 60) * D, y: gy, vx: rnd(-.6, .6) * D, vy: -rnd(1, 3.4) * D, s: rnd(2, 5) * D, b: rnd(.4, 1) }))
        if (p > .4) parts(q => { q.x += q.vx; q.y += q.vy; glow(q.x, q.y, q.s * 2, '#b0b0e0', q.b * (1 - p) * .7) })
      },

      // 🕳️ TUŠTUMOS PLYŠYS: erdvė perplėšiama, traukia daleles Į vidų, užsitrenkia su banga
      voidRip(p, now) {
        const open = p < .2 ? eo(p / .2) : p < .7 ? 1 : 1 - eo((p - .7) / .3)
        const rh = 200 * D * open, rw = 26 * D * open * (1 + Math.sin(now / 90) * .08)
        darkVeil(open * .35)
        ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#020108'
        ctx.beginPath(); ctx.ellipse(o.x, o.y, Math.max(0.01, rw), Math.max(0.01, rh), 0, 0, TAU); ctx.fill()
        ctx.globalCompositeOperation = 'lighter'
        if (rh > 1) {
          const eg = ctx.createRadialGradient(o.x, o.y, rh * .4, o.x, o.y, rh * 1.15)
          eg.addColorStop(0, 'transparent'); eg.addColorStop(.8, '#9a4dff'); eg.addColorStop(1, 'transparent')
          ctx.globalAlpha = open * .7; ctx.fillStyle = eg
          ctx.save(); ctx.translate(o.x, o.y); ctx.scale(rw / rh * 1.6, 1)
          ctx.beginPath(); ctx.arc(0, 0, rh * 1.1, 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1
        }
        seed(34, () => ({ a: rnd(0, TAU), r: rnd(140, 420) * D, v: rnd(.004, .012), s: rnd(1.5, 4) * D }))
        parts(q => {
          q.r *= (1 - q.v * (0.5 + open)); q.a += .02; if (q.r < 10 * D) q.r = rnd(240, 420) * D
          glow(o.x + Math.cos(q.a) * q.r * 1.4, o.y + Math.sin(q.a) * q.r * .7, q.s * 2, '#c084fc', open * .6 * (1 - q.r / (430 * D)))
        })
        if (p >= .7) { const q = (p - .7) / .3; softRing(o.x, o.y, eo(q) * 300 * D, 26 * D, '#9a4dff', (1 - q) * .9); glow(o.x, o.y, 110 * D * (1 - q), '#e9d5ff', (1 - q) * .9) }
      },

      // 💜 NEKROTINIS DŪMAS: dūmai liejasi iš kortos ir šliaužia žeme, dūmuose kaukolių akys
      necroticSmoke(p, now) {
        const gy = o.y + 66 * D, k = eo(cl(p * 1.4)), fade = p < .7 ? 1 : 1 - (p - .7) / .3
        for (let i = 0; i < 14; i++) {
          const t = i / 14, dir = i % 2 ? 1 : -1
          const px = o.x + dir * t * 250 * D * k + Math.sin(now / 260 + i * 2) * 10 * D, py = gy + Math.sin(now / 300 + i) * 4 * D - t * 8 * D
          dark(px, py, (46 - t * 18) * D, fade * .55); glow(px, py, (28 - t * 12) * D, '#0e4a3a', fade * .3); glow(px, py, (12 - t * 5) * D, '#5ef0c0', fade * .14)
        }
        seed(22, () => ({ x: o.x + rnd(-90, 90) * D, y: gy + rnd(-10, 10) * D, vx: rnd(-.2, .2) * D, vy: -rnd(.5, 1.6) * D, s: rnd(2, 5) * D, ph: rnd(0, 9), skull: Math.random() < .25 }))
        parts(q => {
          q.x += q.vx + Math.sin(now / 240 + q.ph) * .4 * D; q.y += q.vy
          if (q.skull) {
            dark(q.x, q.y, q.s * 3.4, fade * .5); glow(q.x, q.y, q.s * 2.2, '#5ef0c0', fade * .3)
            glow(q.x - q.s, q.y - q.s * .5, q.s * .6, '#d6fff0', fade * .5); glow(q.x + q.s, q.y - q.s * .5, q.s * .6, '#d6fff0', fade * .5)
          } else glow(q.x, q.y, q.s * 2.2, '#5ef0c0', fade * .4)
        })
        glow(o.x, o.y, 60 * D, '#5ef0c0', Math.sin(cl(p) * Math.PI) * .3)
      },

      // 👻 VAIDUOKLIŲ AIMANA: vaiduokliai spirale iš kortos + „riksmo" bangos per ekraną
      spectralWail(p) {
        const fade = p < .72 ? 1 : 1 - (p - .72) / .28
        for (let i = 0; i < 3; i++) { const q = cl(p * 1.1 - i * .14); if (q > 0 && q < 1) softRing(o.x, o.y, eo(q) * Math.max(W(), H()) * .42, 34 * D, '#9fc8e8', (1 - q) * .34) }
        seed(12, i => ({ a: i / 12 * TAU + rnd(-.2, .2), r: 10 * D, v: rnd(1.2, 2.2) * D, s: rnd(8, 14) * D, ph: rnd(0, 9) }))
        parts(q => {
          q.r += q.v; q.a += .013
          const px = o.x + Math.cos(q.a) * q.r, py = o.y + Math.sin(q.a) * q.r * .75 - q.r * .22
          dark(px, py, q.s * 1.6, fade * .32)
          glow(px, py, q.s, '#eaf6ff', fade * .5); glow(px, py + q.s * .9, q.s * .5, '#9fc8e8', fade * .35)
          glow(px - q.s * .32, py - q.s * .18, q.s * .16, '#04040a', fade * .9); glow(px + q.s * .32, py - q.s * .18, q.s * .16, '#04040a', fade * .9)
        })
        glow(o.x, o.y, 80 * D, '#9fc8e8', Math.sin(cl(p) * Math.PI) * .4)
      },

      // 🕯️ SIELŲ IŠLAISVINIMAS: šviesos kolona į dangų, sielos spirale kyla jos viduje
      soulRelease(p) {
        const k = eo(cl(p * 1.6)), fade = p < .7 ? 1 : 1 - (p - .7) / .3
        pillar(o.x, o.y + 50 * D, -40 * D, 60 * D * k, '#cfe6ff', fade * .3)
        pillar(o.x, o.y + 50 * D, -40 * D, 26 * D * k, '#ffffff', fade * .4)
        softRing(o.x, o.y + 40 * D, eo(cl(p * 1.2)) * 170 * D, 20 * D, '#9fd0ff', (1 - p) * .5)
        seed(16, i => ({ t: rnd(0, 1), v: rnd(.004, .009), ph: i, s: rnd(2.5, 5) * D }))
        parts(q => {
          q.t += q.v; if (q.t > 1) q.t = 0
          const py = lerp(o.y + 30 * D, -30 * D, q.t), px = o.x + Math.sin(q.t * 9 + q.ph) * 36 * D * (1 - q.t * .5)
          glow(px, py, q.s * 2, '#ffffff', fade * .7 * Math.sin(q.t * Math.PI)); glow(px, py, q.s * 4, '#9fd0ff', fade * .25)
        })
        glow(o.x, o.y, 70 * D, '#fff7d0', Math.sin(cl(p) * Math.PI) * .5)
      },

      // ⚰️ MIRTIES BANGA: pilka gęsinanti banga, ekranas „numiršta", krenta pelenai
      deathPulse(p, now) {
        const r = eo(cl(p * 1.25)) * Math.max(W(), H()) * .75
        darkVeil(cl(p * 1.2) * .28 * (1 - cl((p - .75) / .25)))
        softRing(o.x, o.y, r, 44 * D, '#b0b0b0', (1 - p) * .8)
        softRing(o.x, o.y, r * .86, 18 * D, '#f4f4f4', (1 - p) * .5)
        dark(o.x, o.y, r * .5, (1 - p) * .2)
        seed(30, () => ({ x: rnd(0, W()), y: rnd(-40, 0) * D - rnd(0, H() * .3), v: rnd(.5, 1.4) * D, s: rnd(1.5, 3.5) * D, ph: rnd(0, 9), d: rnd(.4, 1) }))
        if (p > .3) parts(q => {
          q.y += q.v; q.x += Math.sin(now / 500 + q.ph) * .4 * D
          ctx.globalCompositeOperation = 'source-over'; glow(q.x, q.y, q.s * 1.8, 'rgba(150,150,150,1)', q.d * (1 - p) * .5); ctx.globalCompositeOperation = 'lighter'
        })
        glow(o.x, o.y, 60 * D, '#f4f4f4', Math.sin(cl(p) * Math.PI) * .4)
      },

      // 💀 KAULŲ IŠSIVERŽIMAS: žemė skyla, kaulų spygliai paeiliui iššauna su blyksniais
      boneEruption(p) {
        const gy = o.y + 64 * D
        if (!st.cr) {
          st.cr = []; for (let i = 0; i < 7; i++) st.cr.push(crack({ x: o.x, y: gy }, rnd(0, TAU), rnd(120, 260) * D, 6))
          st.sp = []; for (let i = 0; i < 8; i++) st.sp.push({ dx: (i - 3.5) * 46 * D + rnd(-10, 10) * D, h: rnd(70, 130) * D, w: rnd(10, 16) * D, at: .14 + i * .055 })
        }
        for (const c of st.cr) drawCrack(c, '#0a0806', 3 * D, cl(p * 3) * (1 - cl((p - .7) / .3)), '#e8e0c8')
        for (const s of st.sp) {
          const q = cl((p - s.at) / .12); if (q <= 0) continue
          const up = eo(q) * (1 - cl((p - .78) / .22) * .25)
          const bx = o.x + s.dx, h = s.h * up
          ctx.globalCompositeOperation = 'source-over'
          const bg = ctx.createLinearGradient(0, gy - h, 0, gy)
          bg.addColorStop(0, '#fffaf0'); bg.addColorStop(.25, '#e8e0c8'); bg.addColorStop(1, '#5a5244')
          ctx.fillStyle = bg; ctx.globalAlpha = 1 - cl((p - .85) / .15)
          ctx.beginPath(); ctx.moveTo(bx - s.w, gy)
          ctx.quadraticCurveTo(bx - s.w * .4, gy - h * .6, bx + (s.dx > 0 ? s.w * .4 : -s.w * .4), gy - h)
          ctx.quadraticCurveTo(bx + s.w * .5, gy - h * .5, bx + s.w, gy); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1
          ctx.globalCompositeOperation = 'lighter'
          if (q < .5) glow(bx, gy - h, 26 * D, '#fffaf0', 0.5 - q)
        }
        seed(26, () => ({ x: o.x + rnd(-170, 170) * D, y: gy, vx: rnd(-1.4, 1.4) * D, vy: -rnd(2, 5.5) * D, s: rnd(1.5, 3.5) * D }))
        if (p > .14) parts(q => { q.vy += .11 * D; q.x += q.vx; q.y += q.vy; glow(q.x, q.y, q.s * 1.8, '#e8e0c8', (1 - p) * .7) })
        softRing(o.x, gy, eo(cl(p * 1.4)) * 230 * D, 22 * D, '#8a6a44', (1 - p) * .4)
      },

      // ⚡ NUŽAIBAVIMAS: 3 stori šakoti žaibai paeiliui su flicker, lieka plazmos kamuolys
      lightning(p, now) {
        if (!st.b) {
          st.b = []
          for (let i = 0; i < 3; i++) {
            const sx = o.x + rnd(-240, 240) * D
            const main = boltPath(sx, -30 * D, o.x, o.y, 60 * D)
            const forks: number[][][] = []
            for (let f = 0; f < 2; f++) { const bp = main[2 + f * 2]; forks.push(boltPath(bp[0], bp[1], bp[0] + rnd(-140, 140) * D, bp[1] + rnd(80, 160) * D, 40 * D)) }
            st.b.push({ main, forks, at: .08 + i * .16 })
          }
        }
        for (const b of st.b) {
          const q = (p - b.at) / .12
          if (q > 0 && q < 1) {
            const fl = q < .25 ? 1 : Math.random() < .4 ? .9 : .25
            washScreen('#9fc4ff', fl * .12)
            drawBolt(b.main, '#7db8ff', 3.4 * D, fl); for (const f of b.forks) drawBolt(f, '#7db8ff', 1.8 * D, fl * .7)
            glow(o.x, o.y, 90 * D, '#eaf4ff', fl * .8)
          }
        }
        if (p > .5) {
          const q = (p - .5) / .5
          glow(o.x, o.y, (50 + Math.sin(now / 60) * 6) * D * (1 - q * .6), '#7db8ff', (1 - q) * .8)
          glow(o.x, o.y, 24 * D * (1 - q * .4), '#ffffff', 1 - q)
          for (let i = 0; i < 5; i++) { const a = now / 140 + i / 5 * TAU; glow(o.x + Math.cos(a) * 40 * D * (1 - q * .5), o.y + Math.sin(a) * 40 * D * (1 - q * .5), 6 * D, '#eaf4ff', (1 - q) * .7) }
          softRing(o.x, o.y, eo(q) * 220 * D, 18 * D, '#7db8ff', (1 - q) * .5)
        }
      },

      // 🔮 ARKANINIS SPROGIMAS: sigilas kraunasi sukdamasis → supernova su spindulių vainiku
      arcaneDeto(p, now) {
        if (p < .34) {
          const k = p / .34
          ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(now / 500)
          ctx.strokeStyle = '#a78bfa'; ctx.globalAlpha = k * .85; ctx.lineWidth = 2.2 * D
          const r = 54 * D * (1 - k * .25)
          ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke()
          for (let i = 0; i < 6; i++) {
            const a1 = i / 6 * TAU, a2 = (i + 2) / 6 * TAU
            ctx.beginPath(); ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r); ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r); ctx.stroke()
          }
          ctx.restore(); ctx.globalAlpha = 1
          glow(o.x, o.y, (14 + k * 26) * D, '#f5f0ff', k)
        } else {
          const q = (p - .34) / .66
          if (q < .2) washScreen('#c4b5fd', (0.2 - q) * .8)
          glow(o.x, o.y, 150 * D * (1 - q * .5), '#a78bfa', (1 - q) * .7); glow(o.x, o.y, 60 * D * (1 - q), '#ffffff', 1 - q)
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * TAU + .3
            const L = eo(cl(q * 1.4)) * 330 * D, x1 = o.x + Math.cos(a) * L, y1 = o.y + Math.sin(a) * L
            ctx.globalAlpha = (1 - q) * .5; ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = (7 - 5 * q) * D; ctx.lineCap = 'round'
            ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(x1, y1); ctx.stroke(); ctx.globalAlpha = 1
          }
          softRing(o.x, o.y, eo(q) * 300 * D, 24 * D, '#a78bfa', (1 - q) * .8)
          seed(26, () => { const a = rnd(0, TAU), sp = rnd(2, 7) * D; return { x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: rnd(1.5, 3.5) * D } })
          parts(q2 => { q2.x += q2.vx; q2.y += q2.vy; glow(q2.x, q2.y, q2.s * 2, '#c4b5fd', (1 - q) * .8) })
        }
      },

      // 🩸 PRAKEIKIMO ŽENKLAS: kruvinas sigilas įsidega žemėje segmentais, tada suliepsnoja
      cursedBrand(p) {
        const gy = o.y + 58 * D, k = cl(p / .55)
        ctx.save(); ctx.translate(o.x, gy); ctx.scale(1, .4)
        const r = 95 * D
        const segs = Math.floor(k * 10)
        ctx.strokeStyle = '#d4327a'; ctx.lineWidth = 3 * D
        for (let i = 0; i < segs; i++) {
          const a1 = i / 10 * TAU - HALF, a2 = ((i + 4) % 10) / 10 * TAU - HALF
          ctx.globalAlpha = .9 * (1 - cl((p - .8) / .2))
          ctx.beginPath(); ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r); ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r); ctx.stroke()
        }
        if (k > .1) { ctx.globalAlpha = .85 * (1 - cl((p - .8) / .2)); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU * k); ctx.stroke() }
        ctx.restore(); ctx.globalAlpha = 1
        glow(o.x, gy, r * .9 * k, '#3a0a2a', .5)
        if (p > .55) {
          const q = (p - .55) / .45
          for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const fx = o.x + Math.cos(a) * r, fy = gy + Math.sin(a) * r * .4; glow(fx, fy - 14 * D * Math.sin(q * Math.PI), 9 * D, '#ff3a8a', (1 - q) * .8) }
          pillar(o.x, gy, gy - 150 * D * eo(q), 40 * D, '#d4327a', (1 - q) * .3)
          glow(o.x, o.y, 80 * D, '#ffd0e6', Math.sin(q * Math.PI) * .5)
        }
      },

      // ⛧ KRAUJO RITUALAS: pentagrama piešiasi, kraujo lašai traukiami Į kortą, crimson pliūpsnis
      bloodRitual(p, now) {
        const gy = o.y + 58 * D, k = cl(p / .5)
        ctx.save(); ctx.translate(o.x, gy); ctx.scale(1, .4); ctx.rotate(Math.sin(now / 1400) * .06)
        const r = 90 * D; ctx.strokeStyle = '#c01e1e'; ctx.lineWidth = 2.6 * D
        ctx.globalAlpha = k * .9 * (1 - cl((p - .82) / .18))
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU * k); ctx.stroke()
        const pk = Math.floor(k * 5)
        for (let i = 0; i < pk; i++) {
          const a1 = (i * 2) / 5 * TAU - HALF, a2 = ((i * 2 + 4) % 10 / 10) * TAU - HALF
          ctx.beginPath(); ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r); ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r); ctx.stroke()
        }
        ctx.restore(); ctx.globalAlpha = 1
        seed(26, () => ({ a: rnd(0, TAU), r: rnd(150, 380) * D, v: rnd(.01, .025), s: rnd(2, 4.5) * D }))
        parts(q => {
          q.r *= (1 - q.v); if (q.r < 12 * D) q.r = rnd(200, 380) * D
          const px = o.x + Math.cos(q.a) * q.r, py = o.y + Math.sin(q.a) * q.r * .8
          glow(px, py, q.s * 1.6, '#e23a3a', .7 * Math.sin(cl(p) * Math.PI)); glow(px, py + q.s, q.s * .7, '#7a0a0a', .5)
        })
        glow(o.x, gy, 70 * D * k, '#5a0808', .55)
        if (p > .62) {
          const q = (p - .62) / .38
          pillar(o.x, gy, gy - 190 * D * eo(q), 50 * D, '#c01e1e', (1 - q) * .4)
          glow(o.x, o.y, 90 * D, '#ff8080', Math.sin(q * Math.PI) * .6)
          softRing(o.x, gy, eo(q) * 200 * D, 18 * D, '#c01e1e', (1 - q) * .6)
        }
      },

      // 🧊 MASINIS UŽŠALIMAS: šerkšnas iš kampų → SNAP blyksnis → snaigės
      massFreeze(p, now) {
        const k = cl(p / .5)
        for (const [cx, cy] of [[0, 0], [W(), 0], [0, H()], [W(), H()]]) {
          const rr = eo(k) * Math.max(W(), H()) * .55
          if (rr <= 0) continue
          const g = ctx.createRadialGradient(cx, cy, rr * .4, cx, cy, rr)
          g.addColorStop(0, 'rgba(90,168,232,0.28)'); g.addColorStop(1, 'transparent')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill()
        }
        seed(40, () => ({ x: rnd(0, W()), y: rnd(-H() * .3, 0), v: rnd(.6, 1.8) * D, s: rnd(1.5, 3.5) * D, ph: rnd(0, 9) }))
        if (p < .5) { if (Math.floor(p * 20) % 3 === 0) glow(o.x, o.y, (30 + k * 30) * D, '#cfe6ff', k * .6) }
        else {
          const q = (p - .5) / .5
          if (q < .14) washScreen('#eaf6ff', (0.14 - q) / .14 * .5)
          softRing(o.x, o.y, eo(q) * Math.max(W(), H()) * .6, 30 * D, '#9fe1ff', (1 - q) * .6)
          parts(s => {
            s.y += s.v; s.x += Math.sin(now / 400 + s.ph) * .5 * D
            glow(s.x, s.y, s.s * 1.8, '#eaf6ff', (1 - q) * .8); glow(s.x, s.y, s.s * .6, '#ffffff', 1 - q)
          })
        }
        glow(o.x, o.y, 70 * D, '#cfe6ff', Math.sin(cl(p) * Math.PI) * .4)
      },

      // ❄ ŠALČIO NOVA: kristalų šukės ratu + ledo kristalai išauga iš žemės + šalta migla
      frostNova(p) {
        const gy = o.y + 60 * D
        if (p < .12) washScreen('#eaf6ff', (0.12 - p) / .12 * .4)
        softRing(o.x, o.y, eo(cl(p * 1.2)) * 320 * D, 26 * D, '#eaf6ff', (1 - p) * .7)
        softRing(o.x, o.y, eo(cl(p * 1.2 - .06)) * 320 * D, 12 * D, '#7cc4ff', (1 - p) * .5)
        if (!st.cr) { st.cr = []; for (let i = 0; i < 6; i++) st.cr.push({ dx: (i - 2.5) * 56 * D + rnd(-8, 8) * D, h: rnd(50, 95) * D, w: rnd(9, 14) * D, at: .1 + i * .05, tilt: rnd(-.2, .2) }) }
        for (const c of st.cr) {
          const q = cl((p - c.at) / .16); if (q <= 0) continue
          const up = eo(q), h = c.h * up, bx = o.x + c.dx
          ctx.globalCompositeOperation = 'source-over'
          const ig = ctx.createLinearGradient(0, gy - h, 0, gy)
          ig.addColorStop(0, 'rgba(234,246,255,.95)'); ig.addColorStop(.5, 'rgba(124,196,255,.75)'); ig.addColorStop(1, 'rgba(40,80,140,.5)')
          ctx.fillStyle = ig; ctx.globalAlpha = 1 - cl((p - .82) / .18)
          ctx.save(); ctx.translate(bx, gy); ctx.rotate(c.tilt)
          ctx.beginPath(); ctx.moveTo(-c.w, 0); ctx.lineTo(0, -h); ctx.lineTo(c.w, 0); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1
          ctx.globalCompositeOperation = 'lighter'
          glow(bx, gy - h, 10 * D, '#ffffff', (1 - q) * .8)
        }
        seed(30, () => { const a = rnd(0, TAU), sp = rnd(3, 8) * D; return { x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: rnd(1.5, 3.5) * D } })
        parts(q => { q.vx *= .97; q.vy *= .97; q.x += q.vx; q.y += q.vy; glow(q.x, q.y, q.s * 1.8, '#dff2ff', (1 - p) * .8) })
        dark(o.x, gy, 140 * D * cl(p * 1.4), .14)
      },

      // 🔥 UGNIS: ugnies tornado spirale aukštyn, išsisklaido kibirkštimis
      fire(p, now) {
        const k = eo(cl(p * 1.5)), fade = p < .7 ? 1 : 1 - (p - .7) / .3
        for (let i = 0; i < 16; i++) {
          const t = i / 16
          const a = now / 240 + t * TAU * 2.2, rr = (30 + t * 22) * D * (1 - t * .25)
          const px = o.x + Math.cos(a) * rr, py = o.y + 60 * D - t * 210 * D * k
          const s = (34 - t * 18) * D
          const col = t < .3 ? '#fff0c0' : t < .6 ? '#ffb24a' : '#ff7a1a'
          glow(px, py, s, col, fade * .5 * (1 - t * .3)); dark(px, py - s * .8, s * .5, fade * .12)
        }
        glow(o.x, o.y + 50 * D, 80 * D * k, '#ff7a1a', fade * .5)
        seed(26, () => ({ x: o.x + rnd(-40, 40) * D, y: o.y + rnd(20, 60) * D, vx: rnd(-.6, .6) * D, vy: -rnd(1.5, 4) * D, s: rnd(1.5, 3.5) * D, ph: rnd(0, 9) }))
        parts(q => { q.x += q.vx + Math.sin(now / 180 + q.ph) * .5 * D; q.y += q.vy; glow(q.x, q.y, q.s * 2, '#ffc24a', fade * .75) })
      },

      // 😈 PRAGARO UGNIS: degantis ratas + liepsnų kolonos + demoniška akis + pelenai
      hellfire(p, now) {
        const gy = o.y + 60 * D, k = eo(cl(p * 1.3)), fade = p < .72 ? 1 : 1 - (p - .72) / .28
        ctx.save(); ctx.translate(o.x, gy); ctx.scale(1, .38)
        softRing(0, 0, 110 * D * k, 22 * D, '#ff3a1a', fade * .8); softRing(0, 0, 110 * D * k, 44 * D, '#6a0c0c', fade * .5)
        ctx.restore()
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * TAU + now / 2600
          const bx = o.x + Math.cos(a) * 110 * D * k, by = gy + Math.sin(a) * 110 * D * k * .38
          const hh = (50 + 30 * Math.sin(now / 170 + i * 2)) * D * k
          pillar(bx, by, by - hh, 16 * D, '#ff5a2a', fade * .5); glow(bx, by - hh, 12 * D, '#ffe0a0', fade * .6)
        }
        glow(o.x, o.y, 90 * D * k, '#6a0c0c', fade * .5)
        if (p > .3 && p < .55) glow(o.x, o.y - 30 * D, 26 * D, '#ff3a1a', Math.sin((p - .3) / .25 * Math.PI) * .9)
        seed(30, () => ({ x: o.x + rnd(-140, 140) * D, y: gy + rnd(-8, 8) * D, vx: rnd(-.4, .4) * D, vy: -rnd(1, 3.2) * D, s: rnd(1.5, 4) * D, ash: Math.random() < .4 }))
        parts(q => {
          q.x += q.vx; q.y += q.vy
          if (q.ash) { ctx.globalCompositeOperation = 'source-over'; glow(q.x, q.y, q.s * 1.6, 'rgba(60,50,50,1)', fade * .5); ctx.globalCompositeOperation = 'lighter' }
          else glow(q.x, q.y, q.s * 2, '#ff5a2a', fade * .7)
        })
      },

      // 🌪️ ŽARIJŲ AUDRA: horizontalus žarijų vėjas per visą ekraną, korta įsidega
      emberStorm(p, now) {
        const fade = p < .75 ? 1 : 1 - (p - .75) / .25
        seed(64, () => ({ x: rnd(-W() * .2, W()), y: rnd(0, H()), v: rnd(3, 9) * D, s: rnd(1.2, 3.6) * D, ph: rnd(0, 9) }))
        parts(q => {
          q.x += q.v; q.y += Math.sin(now / 220 + q.ph) * 1.4 * D; if (q.x > W() + 20) q.x = -20 * D
          glow(q.x, q.y, q.s * 2.2, '#ffc24a', fade * .55); glow(q.x - q.v * 2, q.y, q.s * 1.2, '#ff9a3a', fade * .3)
        })
        dark(W() * .5, H() * .5, Math.max(W(), H()) * .5, fade * .1)
        glow(o.x, o.y, (50 + Math.sin(now / 120) * 8) * D * cl(p * 2), '#ff9a3a', fade * .6)
        glow(o.x, o.y, 24 * D * cl(p * 2), '#ffe0b0', fade * .8)
      },

      // 🌋 LAVOS SKILIMAS: žemė švyti, plyšiai švyti lava, purslai, vėsta į tamsą
      moltenShatter(p) {
        const gy = o.y + 62 * D, cool = cl((p - .6) / .4)
        if (!st.cr) { st.cr = []; for (let i = 0; i < 8; i++) st.cr.push(crack({ x: o.x, y: gy }, rnd(0, TAU), rnd(140, 280) * D, 6)) }
        glow(o.x, gy, 180 * D * cl(p * 2), '#7a2a0a', (1 - cool) * .5)
        for (const c of st.cr) {
          drawCrack(c, '#2a1006', 4 * D, cl(p * 3), null)
          for (let i = 1; i < c.length; i++) glow(c[i][0], c[i][1], 7 * D, '#ff6a1a', (1 - cool) * .8 * cl(p * 3))
        }
        if (!st.sp && p > .15) { st.sp = []; for (let i = 0; i < N(14); i++) st.sp.push({ x: o.x + rnd(-120, 120) * D, y: gy, vx: rnd(-1, 1) * D, vy: -rnd(3, 7) * D, s: rnd(2, 4.5) * D }) }
        if (st.sp) for (const q of st.sp) {
          q.vy += .12 * D; q.x += q.vx; q.y += q.vy
          glow(q.x, q.y, q.s * 2, '#ff8a3a', (1 - cool) * .85); glow(q.x, q.y - q.s, q.s, '#ffd090', (1 - cool) * .6)
        }
        softRing(o.x, gy, eo(cl(p * 1.3)) * 240 * D, 20 * D, '#ff6a1a', (1 - p) * .5)
      },

      // 💥 SPROGIMAS: blyksnis → turbulentiškas ugnies kamuolys su dūmais → banga + skeveldros su dūmų uodegom
      explosion(p, now) {
        if (p < .08) washScreen('#fff', (0.08 - p) / .08 * .7)
        if (p < .5) {
          const q = p / .5, R = (30 + eo(q) * 110) * D
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * TAU + now / 400, rr = R * (.6 + .35 * Math.sin(now / 130 + i * 2.4))
            const px = o.x + Math.cos(a) * rr * .55, py = o.y + Math.sin(a) * rr * .45 - q * 24 * D
            glow(px, py, rr * .6, i % 3 === 0 ? '#ffffff' : i % 2 ? '#ffd25a' : '#ff7a1a', (1 - q) * .5)
          }
          glow(o.x, o.y, R, '#ff7a1a', (1 - q) * .6); glow(o.x, o.y, R * .5, '#fff', (1 - q) * .8)
          dark(o.x, o.y - R * .8, R * .7, q * .35)
        }
        softRing(o.x, o.y, eo(cl(p * 1.15)) * 340 * D, 30 * D, '#ffd25a', (1 - p) * .65)
        seed(20, () => { const a = rnd(-Math.PI, 0); const sp = rnd(4, 9) * D; return { x: o.x, y: o.y, vx: Math.cos(a) * sp * rnd(.5, 1), vy: Math.sin(a) * sp, s: rnd(2, 4) * D, tr: [] as number[][] } })
        parts(q => {
          q.vy += .14 * D; q.x += q.vx; q.y += q.vy
          q.tr.push([q.x, q.y]); if (q.tr.length > 6) q.tr.shift()
          for (let i = 0; i < q.tr.length; i++) {
            ctx.globalCompositeOperation = 'source-over'
            glow(q.tr[i][0], q.tr[i][1], q.s * 1.5, 'rgba(80,70,66,1)', (i / q.tr.length) * (1 - p) * .4)
            ctx.globalCompositeOperation = 'lighter'
          }
          glow(q.x, q.y, q.s * 1.6, '#ffd25a', (1 - p) * .85)
        })
      },

      // ☣️ NUODŲ DEBESIS: grybo debesis išsipučia, laša nuodai, viduje pulsuoja švytėjimas
      poisonCloud(p, now) {
        const k = eo(cl(p * 1.2)), fade = p < .7 ? 1 : 1 - (p - .7) / .3
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU
          const rr = (46 + 26 * Math.sin(now / 300 + i * 1.8)) * D * k
          const px = o.x + Math.cos(a) * 70 * D * k, py = o.y - 40 * D * k + Math.sin(a) * 40 * D * k - Math.abs(Math.cos(a)) * 10 * D
          dark(px, py, rr, fade * .5); glow(px, py, rr * .6, '#3a6a0a', fade * .4); glow(px, py, rr * .25, '#84cc16', fade * .3)
        }
        glow(o.x, o.y - 40 * D * k, (40 + Math.sin(now / 250) * 10) * D * k, '#d4ff80', fade * .35 * (0.7 + 0.3 * Math.sin(now / 250)))
        seed(16, () => ({ x: o.x + rnd(-80, 80) * D, y: o.y - rnd(0, 60) * D, vy: rnd(.8, 2) * D, s: rnd(1.5, 3.5) * D, drip: Math.random() < .6 }))
        parts(q => {
          if (q.drip) { q.y += q.vy; glow(q.x, q.y, q.s * 1.6, '#a3e635', fade * .7); glow(q.x, q.y + q.s * 1.4, q.s * .7, '#84cc16', fade * .4) }
          else { q.y -= q.vy * .4; glow(q.x, q.y, q.s * 2, '#84cc16', fade * .4) }
        })
      },

      // 🦗 MARAS: gyvas spiečius-murmuracija aplink kortą + liguistas žalsvas rūkas
      plague(p, now) {
        const fade = p < .72 ? 1 : 1 - (p - .72) / .28
        dark(o.x, o.y, 220 * D * cl(p * 1.5), fade * .25)
        glow(o.x, o.y, 180 * D * cl(p * 1.5), '#2e3a0a', fade * .35)
        seed(54, () => ({ a: rnd(0, TAU), r: rnd(30, 150) * D, v: rnd(.03, .09), ph: rnd(0, 9), s: rnd(1.2, 2.6) * D, el: rnd(.5, .9) }))
        parts(q => {
          q.a += q.v; q.r += Math.sin(now / 300 + q.ph) * 1.2 * D
          const px = o.x + Math.cos(q.a + Math.sin(now / 500 + q.ph)) * q.r * 1.15
          const py = o.y + Math.sin(q.a) * q.r * q.el
          ctx.globalCompositeOperation = 'source-over'; glow(px, py, q.s * 1.7, 'rgba(14,16,6,1)', fade * .85); ctx.globalCompositeOperation = 'lighter'
          glow(px, py, q.s * .8, '#9acd32', fade * .3)
        })
        glow(o.x, o.y, 60 * D, '#caff70', Math.sin(cl(p) * Math.PI) * .3)
      },

      // 🪨 ŽEMĖS DREBĖJIMAS: radialiniai plyšiai + dulkių geizeriai iš plyšių + mėtomi akmenys
      earthquake(p) {
        const gy = o.y + 62 * D
        if (!st.cr) {
          st.cr = []; st.gz = []
          for (let i = 0; i < 9; i++) {
            const c = crack({ x: o.x, y: gy }, rnd(0, TAU), rnd(150, 300) * D, 7); st.cr.push(c)
            if (i % 2 === 0) st.gz.push({ x: c[3][0], y: c[3][1], at: .15 + i * .06 })
          }
          st.rk = []; for (let i = 0; i < N(10); i++) st.rk.push({ x: o.x + rnd(-160, 160) * D, y: gy, vx: rnd(-.8, .8) * D, vy: -rnd(2.5, 5.5) * D, s: rnd(2.5, 5) * D, r: rnd(0, TAU), vr: rnd(-.2, .2) })
        }
        for (const c of st.cr) drawCrack(c, '#1a1208', 4 * D, cl(p * 2.5) * (1 - cl((p - .75) / .25)), '#8a6a44')
        for (const g of st.gz) {
          const q = cl((p - g.at) / .4); if (q <= 0) continue
          for (let i = 0; i < 5; i++) {
            const t = i / 5
            ctx.globalCompositeOperation = 'source-over'
            glow(g.x + rnd(-4, 4) * D, g.y - t * 90 * D * eo(q), (16 + t * 14) * D, 'rgba(120,95,64,1)', (1 - q) * (1 - t * .4) * .5)
            ctx.globalCompositeOperation = 'lighter'
          }
        }
        for (const r of st.rk) {
          if (p > .15) { r.vy += .12 * D; r.x += r.vx; r.y += r.vy; r.r += r.vr }
          ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.r)
          ctx.fillStyle = '#5a4834'; ctx.globalAlpha = 1 - cl((p - .8) / .2)
          ctx.fillRect(-r.s, -r.s * .7, r.s * 2, r.s * 1.4); ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'
        }
        softRing(o.x, gy, eo(cl(p * 1.3)) * 260 * D, 22 * D, '#8a6a44', (1 - p) * .45)
        glow(o.x, gy, 120 * D * cl(p * 2), '#4a3826', (1 - p) * .4)
      },
    }

    const draw = EFF[type] || EFF.explosion
    const t0 = performance.now()
    let raf = 0
    const frame = (now: number) => {
      ctx.clearRect(0, 0, cv.width, cv.height)
      const p = (now - t0) / dur
      if (p < 1) {
        ctx.globalCompositeOperation = 'lighter'
        draw(p, now)
        ctx.globalCompositeOperation = 'source-over'
        raf = requestAnimationFrame(frame)
      } else ctx.clearRect(0, 0, cv.width, cv.height)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.clearTimeout(tEnd) }
  }, [type, x, y, effectKey])

  return <canvas ref={cvs} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 127, pointerEvents: 'none', width: '100%', height: '100%' }} />
}
