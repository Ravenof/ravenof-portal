'use client'

// ── Avatarų parašo efektų biblioteka (819) ───────────────────────────────────
// Dalelių pliūpsniai, įėjimai, pabaigos ir žemo HP auros, surenkami iš avataro
// profilio (lib/game/avatarPacks.ts). Tik DOM + transform/opacity (framer-motion
// ir CSS keyframes) – jokių paveikslėlių ar video. Dalelių skaičius ribotas.
import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import type { AvatarFxProfile, AvParticle } from '@/lib/game/avatarPacks'

const rnd = (i: number, s = 1) => { const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x) }

/** Vienos dalelės išvaizda. u = mastelis (1 = 120 px pločio avataras). */
function particleLook(type: AvParticle, p: AvatarFxProfile, i: number, u: number): { style: CSSProperties; text?: string; spin: boolean } {
  const alt = i % 3 === 0
  const c = alt ? p.c2 : p.c1
  const px = (n: number) => Math.max(1, Math.round(n * u))
  switch (type) {
    case 'ember':  return { spin: false, style: { width: px(5), height: px(5), borderRadius: '50%', background: alt ? '#ffe9a8' : p.c1, boxShadow: `0 0 ${px(8)}px ${p.c1}` } }
    case 'ash':    return { spin: true,  style: { width: px(4), height: px(4), borderRadius: 1, background: alt ? '#8a8580' : '#4a4642' } }
    case 'feather':return { spin: true,  style: { width: px(6), height: px(17), borderRadius: '60% 60% 60% 60% / 90% 90% 30% 30%', background: `linear-gradient(${p.c1}, #0b0910)`, boxShadow: `0 0 ${px(4)}px ${p.c1}88` } }
    case 'bone':   return { spin: true,  style: { width: px(4), height: px(11), borderRadius: px(2), background: '#e9e2cf', boxShadow: `0 0 ${px(5)}px ${p.c1}` } }
    case 'wisp':   return { spin: false, style: { width: px(20), height: px(20), borderRadius: '50%', background: `radial-gradient(circle, ${c}cc 0%, ${c}55 40%, transparent 70%)` } }
    case 'ray':    return { spin: false, style: { width: px(3), height: px(26), borderRadius: px(2), background: `linear-gradient(to top, transparent, ${p.c1}, #ffffff)` } }
    case 'spark':  return { spin: false, style: { width: px(4), height: px(4), borderRadius: '50%', background: '#ffffff', boxShadow: `0 0 ${px(6)}px ${p.c1}, 0 0 ${px(12)}px ${p.c1}` } }
    case 'glyph':  { const g = Array.from(p.glyphs || '✦'); return { spin: true, text: g[i % g.length], style: { fontSize: px(15), lineHeight: 1, color: c, textShadow: `0 0 ${px(6)}px ${p.c1}`, fontWeight: 700 } } }
    case 'coin':   return { spin: false, style: { width: px(8), height: px(8), borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, #fff3c4, ${p.c2})`, border: '1px solid #7a5a12', boxShadow: `0 0 ${px(4)}px ${p.c2}99` } }
    case 'bubble': return { spin: false, style: { width: px(9), height: px(9), borderRadius: '50%', border: `1.5px solid ${c}`, background: `${c}33`, boxShadow: `0 0 ${px(5)}px ${p.c1}88` } }
    case 'leaf':   return { spin: true,  style: { width: px(7), height: px(13), borderRadius: '80% 0 80% 0', background: alt ? p.c1 : p.c2, boxShadow: `0 0 ${px(4)}px ${p.c1}88` } }
    case 'bird':   return { spin: false, style: { width: px(18), height: px(10), background: '#0b0910', clipPath: 'polygon(0 20%, 30% 0, 50% 45%, 70% 0, 100% 20%, 62% 100%, 50% 70%, 38% 100%)', filter: `drop-shadow(0 0 ${px(3)}px ${p.c1})` } }
  }
}

export type AvBurstMode = 'hit' | 'fountain' | 'rise' | 'inward' | 'wide' | 'fall' | 'toward'

/** Dalelių pliūpsnis avataro dėžėje. Vienkartinis: perduok naują `key`, kad pasikartotų. */
export function AvBurst({ p, size, mode, n = 8, type, seed = 1, vec, delay = 0, slow = 1 }: {
  p: AvatarFxProfile; size: number; mode: AvBurstMode; n?: number; type?: AvParticle; seed?: number
  /** 'toward': kryptis px (pvz. į varžovo avatarą). */
  vec?: { x: number; y: number }; delay?: number; slow?: number
}) {
  const u = size / 120
  const kind = type ?? p.particle
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 7, overflow: 'visible' }} aria-hidden>
      {Array.from({ length: n }).map((_, i) => {
        const a = rnd(i, seed), b = rnd(i, seed + 3), c = rnd(i, seed + 7)
        const look = particleLook(kind, p, i, u)
        let left = '50%', top = '42%'
        let x: number[] = [0, 0], y: number[] = [0, 0]
        let dur = 0.7
        const ang = a * Math.PI * 2
        if (mode === 'hit') {
          const d = size * (0.5 + 0.55 * b)
          x = [0, Math.cos(ang) * d]; y = [0, Math.sin(ang) * d + size * 0.22]; dur = 0.55 + c * 0.3
        } else if (mode === 'fountain') {
          const h = size * (0.75 + 0.7 * b)
          x = [0, (a - 0.5) * size * 0.9, (a - 0.5) * size * 1.5]; y = [0, -h, -h * 0.35]; dur = 1.15 + c * 0.45
        } else if (mode === 'rise') {
          left = `${12 + a * 76}%`; top = `${62 + b * 22}%`
          x = [0, (c - 0.5) * size * 0.3]; y = [0, -size * (0.7 + 0.6 * b)]; dur = 0.9 + c * 0.5
        } else if (mode === 'inward') {
          const d = size * (0.9 + 0.7 * b)
          x = [Math.cos(ang) * d, 0]; y = [Math.sin(ang) * d, 0]; dur = 0.6 + c * 0.25
        } else if (mode === 'wide') {
          const d = size * (1.5 + 2.1 * b)
          x = [0, Math.cos(ang) * d]; y = [0, Math.sin(ang) * d * 0.7 - size * 0.5]; dur = 1.3 + c * 0.6
        } else if (mode === 'fall') {
          left = `${18 + a * 64}%`; top = `${40 + b * 30}%`
          x = [0, (c - 0.5) * size * 0.12]; y = [0, size * (0.6 + 0.6 * b)]; dur = 0.9 + c * 0.5
        } else {
          const vx = vec?.x ?? 0, vy = vec?.y ?? -size
          x = [0, vx * (0.82 + 0.3 * b) + (a - 0.5) * size * 0.5]; y = [0, vy * (0.82 + 0.3 * b) + (c - 0.5) * size * 0.5]; dur = 0.75 + c * 0.35
        }
        dur *= slow
        const rot = look.spin ? [a * 360, a * 360 + (i % 2 ? 300 : -300)] : mode === 'wide' && kind === 'bird' ? [Math.cos(ang) > 0 ? 8 : -8, Math.cos(ang) > 0 ? -6 : 6] : [0, 0]
        const op = mode === 'inward' ? [0, 1, 1, 0] : [0, 1, 1, 0]
        return (
          <motion.span key={i} className="absolute flex items-center justify-center" style={{ left, top, marginLeft: -4 * u, marginTop: -4 * u, willChange: 'transform, opacity', ...look.style }}
            initial={{ x: x[0], y: y[0], opacity: 0, rotate: rot[0], scale: mode === 'inward' ? 0.6 : 1 }}
            animate={{ x, y, opacity: op, rotate: rot[1], scale: mode === 'inward' ? [0.6, 1, 0.4] : [1, 1, 0.5] }}
            transition={{ duration: dur, delay: delay + rnd(i, seed + 11) * 0.18 * slow, ease: mode === 'fall' ? 'easeIn' : 'easeOut', times: undefined }}>
            {look.text}
          </motion.span>
        )
      })}
    </div>
  )
}

/** Keyframes – įdedama kartą AvatarFrame viduje (dublikatas kitam avatarui nekenkia). */
export function AvatarFxStyles() {
  return (
    <style>{`
      @keyframes rvnAvInEmbers  { 0% { opacity: 1; filter: none } 14% { opacity: .9; filter: brightness(.12) } 55% { filter: brightness(2.6) sepia(.9) saturate(3) } 100% { opacity: 1; filter: none } }
      @keyframes rvnAvInMist    { 0% { opacity: 1; filter: none } 14% { opacity: .05; filter: blur(12px) } 100% { opacity: 1; filter: blur(0) } }
      @keyframes rvnAvInPillar  { 0% { opacity: 1; filter: none } 12% { opacity: .15; filter: brightness(.3) } 45% { opacity: 1; filter: brightness(4.5) } 100% { opacity: 1; filter: none } }
      @keyframes rvnAvInAssemble{ 0% { opacity: 1 } 12% { opacity: 0 } 55% { opacity: 0 } 68% { opacity: 1; filter: brightness(2.2) } 100% { opacity: 1; filter: none } }
      @keyframes rvnAvInShadow  { 0% { opacity: 1; filter: none } 14% { opacity: .9; filter: brightness(0) } 60% { filter: brightness(0) } 100% { opacity: 1; filter: none } }
      @keyframes rvnAvInFlash   { 0% { opacity: 1; filter: none } 10% { opacity: .1 } 26% { opacity: 1; filter: brightness(6) } 100% { opacity: 1; filter: none } }
      @keyframes rvnAvInFade    { 0% { opacity: .2 } 100% { opacity: 1 } }
      @keyframes rvnAvAuraFlame { 0%, 100% { opacity: .55; transform: translateY(0) scaleY(1) } 50% { opacity: .95; transform: translateY(-3%) scaleY(1.08) } }
      @keyframes rvnAvAuraRise  { 0% { transform: translateY(0) scale(1); opacity: 0 } 15% { opacity: .95 } 100% { transform: translateY(-260%) scale(.4); opacity: 0 } }
      @keyframes rvnAvAuraSink  { 0% { transform: translateY(0) scale(.7); opacity: 0 } 20% { opacity: .8 } 100% { transform: translateY(160%) scale(1.3); opacity: 0 } }
      @keyframes rvnAvAuraCrack { 0%, 100% { opacity: .35 } 45% { opacity: .95 } 55% { opacity: .5 } }
      @keyframes rvnAvAuraFlick { 0%, 100% { opacity: .25 } 8% { opacity: .9 } 14% { opacity: .3 } 40% { opacity: .75 } 46% { opacity: .2 } 70% { opacity: .85 } }
    `}</style>
  )
}

const ENTER_ANIM: Record<AvatarFxProfile['entrance'], string> = {
  embers: 'rvnAvInEmbers', mist: 'rvnAvInMist', pillar: 'rvnAvInPillar', assemble: 'rvnAvInAssemble', shadow: 'rvnAvInShadow', flash: 'rvnAvInFlash',
}
/** Įėjimo trukmė ms. */
export const avEnterMs = (p: AvatarFxProfile) => (p.grand ? 1800 : 1250)
/** CSS `animation` reikšmė avataro šakniai įėjimo metu (opacity/filter – be transform, nesikerta su framer). */
export const avEnterAnimation = (p: AvatarFxProfile, reduced: boolean) =>
  reduced ? 'rvnAvInFade .5s ease-out both' : `${ENTER_ANIM[p.entrance]} ${avEnterMs(p)}ms ease-out both`

/** Įėjimo sluoksnis virš avataro (dalelės, šviesos stulpas, blyksnis). */
export function AvEntranceFx({ p, size }: { p: AvatarFxProfile; size: number }) {
  const g = p.grand ? 1.45 : 1
  const n = p.grand ? 14 : 10
  const ring = (color: string, delay = 0.12) => (
    <motion.div className="absolute rounded-full" style={{ left: '50%', top: '42%', width: 10, height: 10, marginLeft: -5, marginTop: -5, border: `2px solid ${color}`, boxShadow: `0 0 18px ${color}` }}
      initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: size * 0.16 * g, opacity: 0 }} transition={{ duration: 0.8 * g, delay, ease: 'easeOut' }} />
  )
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 8, overflow: 'visible' }} aria-hidden>
      {p.entrance === 'embers' && <><AvBurst p={p} size={size} mode="rise" n={n} seed={2} slow={g} />{ring(p.c1, 0.35)}</>}
      {p.entrance === 'mist' && <><AvBurst p={p} size={size} mode="rise" n={7} type="wisp" seed={4} slow={1.25 * g} /><AvBurst p={p} size={size} mode="hit" n={6} seed={5} delay={0.45} /></>}
      {p.entrance === 'pillar' && (
        <>
          <motion.div className="absolute" style={{ left: '22%', width: '56%', bottom: '18%', height: size * 3.2 * g, transformOrigin: '50% 100%', background: `linear-gradient(to top, ${p.c1}ee, ${p.c1}66 45%, transparent)`, filter: 'blur(3px)', borderRadius: '40% 40% 0 0' }}
            initial={{ scaleX: 0.15, opacity: 0 }} animate={{ scaleX: [0.15, 1, 0.5], opacity: [0, 0.95, 0] }} transition={{ duration: 0.95 * g, ease: 'easeOut' }} />
          <AvBurst p={p} size={size} mode="rise" n={n} seed={6} delay={0.2} slow={g} />
        </>
      )}
      {p.entrance === 'assemble' && <><AvBurst p={p} size={size} mode="inward" n={n + 2} seed={7} delay={0.1} slow={g} />{ring(p.c1, 0.7)}</>}
      {p.entrance === 'shadow' && (
        <>
          <motion.div className="absolute rounded-full" style={{ inset: '-25%', background: 'radial-gradient(circle, rgba(8,5,14,0.95) 0%, rgba(8,5,14,0.7) 45%, transparent 70%)' }}
            initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 1, 0], scale: [0.4, 1.1 * g, 1.3 * g] }} transition={{ duration: 1.1 * g, ease: 'easeOut' }} />
          <AvBurst p={p} size={size} mode={p.grand ? 'wide' : 'hit'} n={n} type={p.particle === 'feather' && p.grand ? 'bird' : undefined} seed={8} delay={0.45} slow={g} />
        </>
      )}
      {p.entrance === 'flash' && (
        <>
          <motion.div className="absolute rounded-full" style={{ inset: `${-40 * g}%`, background: `radial-gradient(circle, #ffffff 0%, ${p.c1}cc 28%, transparent 68%)` }}
            initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: [0, 1, 0], scale: [0.2, 1.2, 1.5] }} transition={{ duration: 0.6 * g, delay: 0.1, ease: 'easeOut' }} />
          <AvBurst p={p} size={size} mode={p.grand ? 'fountain' : 'hit'} n={n} seed={9} delay={0.22} slow={g} />
          {ring(p.c2, 0.2)}
        </>
      )}
    </div>
  )
}

/** Pralaimėjimo pabaiga (ne 'shatter' – tą piešia AvatarFrame pats). `composite` = portretas + rėmas. */
export function AvDefeatFx({ p, size, composite }: { p: AvatarFxProfile; size: number; composite: ReactNode }) {
  const g = p.grand ? 1.5 : 1
  const n = p.grand ? 14 : 12
  const body = (anim: Parameters<typeof motion.div>[0]['animate'], dur: number, style: CSSProperties = {}) => (
    <motion.div className="absolute inset-0" style={{ transformOrigin: '50% 100%', ...style }} initial={{ opacity: 1 }} animate={anim} transition={{ duration: dur * g, ease: 'easeIn' }}>{composite}</motion.div>
  )
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 6, overflow: 'visible' }} aria-hidden>
      {p.defeat === 'ash' && (
        <>
          {body({ clipPath: ['inset(0% 0% 0% 0%)', 'inset(0% 0% 100% 0%)'], filter: ['brightness(1) sepia(0)', 'brightness(1.8) sepia(1) saturate(3)', 'brightness(.3) sepia(.6)'], opacity: [1, 1, 0.6] }, 1.25)}
          <AvBurst p={p} size={size} mode="rise" n={n} type="ember" seed={21} slow={1.2 * g} />
          <AvBurst p={p} size={size} mode="rise" n={n} type="ash" seed={22} delay={0.25} slow={1.6 * g} />
        </>
      )}
      {p.defeat === 'mist' && (
        <>
          {body({ opacity: [1, 0.7, 0], filter: ['blur(0px)', 'blur(6px)', 'blur(16px)'], scale: [1, 1.08, 1.22] }, 1.3, { transformOrigin: '50% 50%' })}
          <AvBurst p={p} size={size} mode="hit" n={10} type="wisp" seed={23} slow={2 * g} />
          <AvBurst p={p} size={size} mode="rise" n={6} seed={24} delay={0.2} slow={1.4 * g} />
        </>
      )}
      {p.defeat === 'birds' && (
        <>
          {body({ opacity: [1, 1, 0], filter: ['brightness(1)', 'brightness(0)', 'brightness(0)'], scale: [1, 1.02, 0.85] }, 0.7, { transformOrigin: '50% 50%' })}
          <AvBurst p={p} size={size * g} mode="wide" n={n} type="bird" seed={25} delay={0.25} slow={g} />
          <AvBurst p={p} size={size} mode="hit" n={10} type="feather" seed={26} delay={0.3} slow={1.8} />
        </>
      )}
      {p.defeat === 'melt' && (
        <>
          {body({ scaleY: [1, 0.85, 0.12], scaleX: [1, 1.06, 1.35], opacity: [1, 0.95, 0], filter: ['blur(0px)', 'blur(1px)', 'blur(4px)'] }, 1.35)}
          <AvBurst p={p} size={size} mode="fall" n={n} seed={27} slow={1.2 * g} />
          <AvBurst p={p} size={size} mode="rise" n={5} seed={28} delay={0.5} />
        </>
      )}
      {p.defeat === 'light' && (
        <>
          <motion.div className="absolute rounded-full" style={{ inset: '-55%', background: `radial-gradient(circle, #ffffff 0%, ${p.c1}cc 30%, transparent 70%)` }}
            initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: [0, 1, 0], scale: [0.3, 1.2 * g, 1.6 * g] }} transition={{ duration: 1.1 * g, delay: 0.25, ease: 'easeOut' }} />
          {body({ opacity: [1, 1, 0], filter: ['brightness(1)', 'brightness(4)', 'brightness(7)'], y: [0, -size * 0.05, -size * 0.3], scale: [1, 1.04, 1.12] }, 1.2, { transformOrigin: '50% 50%' })}
          <AvBurst p={p} size={size} mode="rise" n={n} type="ray" seed={29} delay={0.2} slow={1.3 * g} />
          <AvBurst p={p} size={size} mode="hit" n={8} seed={30} delay={0.35} slow={1.4} />
        </>
      )}
    </div>
  )
}

/** Pergalės akcentas: avataro dalelių fontanas + žiedas. */
export function AvVictoryFx({ p, size }: { p: AvatarFxProfile; size: number }) {
  const g = p.grand ? 1.4 : 1
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 7, overflow: 'visible' }} aria-hidden>
      <motion.div className="absolute rounded-full" style={{ left: '50%', top: '42%', width: 10, height: 10, marginLeft: -5, marginTop: -5, border: `2px solid ${p.c1}`, boxShadow: `0 0 20px ${p.c1}` }}
        initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: size * 0.2 * g, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      <AvBurst p={p} size={size * g} mode="fountain" n={14} seed={41} />
    </div>
  )
}

/** Žemo HP aura (HP ≤ 30 %) – CSS kilpos, iki 6 elementų. `reduced` → tik statinis švytėjimas. */
export function AvAura({ p, size, reduced }: { p: AvatarFxProfile; size: number; reduced: boolean }) {
  const u = size / 120
  if (reduced) return <div className="absolute pointer-events-none" style={{ inset: '6%', zIndex: 4, borderRadius: '14%', boxShadow: `0 0 ${14 * u}px ${p.c1}aa` }} aria-hidden />
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 4, overflow: 'visible' }} aria-hidden>
      {p.aura === 'flame' && (
        <>
          <div className="absolute" style={{ left: '8%', right: '8%', bottom: '24%', height: '34%', background: `radial-gradient(ellipse at 50% 100%, ${p.c1}cc 0%, ${p.c1}55 40%, transparent 72%)`, filter: 'blur(4px)', transformOrigin: '50% 100%', animation: 'rvnAvAuraFlame 0.9s ease-in-out infinite' }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="absolute rounded-full" style={{ left: `${16 + i * 17}%`, bottom: '26%', width: 4 * u, height: 4 * u, background: i % 2 ? '#ffe9a8' : p.c1, boxShadow: `0 0 ${7 * u}px ${p.c1}`, animation: `rvnAvAuraRise ${1.3 + rnd(i, 3) * 0.9}s ease-out ${rnd(i, 5) * 1.2}s infinite` }} />
          ))}
        </>
      )}
      {p.aura === 'cracks' && (
        <svg className="absolute" viewBox="0 0 120 140" style={{ inset: 0, width: '100%', height: '100%', animation: 'rvnAvAuraCrack 1.6s ease-in-out infinite', filter: `drop-shadow(0 0 ${3 * u}px ${p.c1})` }}>
          <path d="M24 22 L33 38 L27 49 L38 62 M96 26 L88 41 L95 55 L86 66 M30 92 L40 82 L37 72 M92 94 L83 84 L88 74" fill="none" stroke="#06040a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 22 L33 38 L27 49 L38 62 M96 26 L88 41 L95 55 L86 66 M30 92 L40 82 L37 72 M92 94 L83 84 L88 74" fill="none" stroke={p.c1} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {p.aura === 'drip' && Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: `${10 + i * 15}%`, top: `${22 + rnd(i, 2) * 24}%`, width: 14 * u, height: 14 * u, background: `radial-gradient(circle, ${p.c1}bb 0%, ${p.c1}44 45%, transparent 70%)`, animation: `rvnAvAuraSink ${2 + rnd(i, 4) * 1.4}s ease-in ${rnd(i, 6) * 2}s infinite` }} />
      ))}
      {p.aura === 'flicker' && (
        <div className="absolute" style={{ inset: '7% 12% 22% 12%', borderRadius: '16%', boxShadow: `0 0 ${16 * u}px ${4 * u}px ${p.c1}, inset 0 0 ${14 * u}px ${p.c1}aa`, animation: 'rvnAvAuraFlick 2.2s linear infinite' }} />
      )}
    </div>
  )
}

/** Emocijos efektas (823): forma bendra, dalelės ir spalva – avataro. `vec` – kryptis į varžovo avatarą (grasinimui). */
export function AvEmoteFx({ p, size, k, vec, seed = 1 }: { p: AvatarFxProfile; size: number; k: string; vec?: { x: number; y: number }; seed?: number }) {
  const ringFx = (c: string, strong: boolean) => (
    <motion.div className="absolute rounded-xl" style={{ inset: '4%', border: `2px solid ${c}`, boxShadow: `0 0 ${strong ? 26 : 16}px ${c}`, zIndex: 7 }}
      initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: [0, strong ? 1 : 0.7, 0], scale: [0.92, 1.08, 1.16] }} transition={{ duration: strong ? 0.9 : 1.3, ease: 'easeOut' }} />
  )
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }} aria-hidden>
      {k === 'hello' && <AvBurst p={p} size={size} mode="fountain" n={6} seed={seed} />}
      {k === 'wellPlayed' && <>{ringFx(p.c1, true)}<AvBurst p={p} size={size} mode="rise" n={4} seed={seed + 2} /></>}
      {k === 'threat' && <AvBurst p={p} size={size} mode="toward" n={8} seed={seed + 4} vec={vec} />}
      {k === 'thanks' && ringFx(p.c2, false)}
      {k === 'oops' && <AvBurst p={p} size={size} mode="fall" n={4} seed={seed + 6} />}
    </div>
  )
}
