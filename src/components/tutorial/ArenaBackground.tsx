'use client'

// ── Mūšio arenos fonas ────────────────────────────────────────────────────────
// 8 frakcijų vibe arenos, parenkamos atsitiktinai mūšio pradžioje. „Fizinės arenos"
// pojūtis: dangaus/skliauto gradientas → horizonto švytėjimas → frakcijos siluetai →
// perspektyvinės grindys su grid + scenos šviesos baseinu (kur kortos) → ambientas
// (dalelės / migla / spinduliai) → vignette. Procedūrinis (be assetų), CSS/SVG, lengvas
// (jokio rAF). FILE-FIRST: jei yra public/arenas/<key>.jpg|webp – jis uždengia procedūrinį.

import { useEffect, useState } from 'react'
import { isBgFxEnabled } from '@/lib/settings'

export type ArenaKey = 'crypt' | 'arcane' | 'cathedral' | 'citadel' | 'inferno' | 'scrapyard' | 'harbor' | 'dojo'
export const ARENA_KEYS: ArenaKey[] = ['crypt', 'arcane', 'cathedral', 'citadel', 'inferno', 'scrapyard', 'harbor', 'dojo']
// Auto-detektas: kurios arenos turi tikrą paveikslėlį (HEAD užklausa, pigu).
const arenaHasArt: Partial<Record<ArenaKey, boolean>> = {}
let arenaDetectStarted = false
function detectArenaArt() {
  if (arenaDetectStarted || typeof window === 'undefined') return
  arenaDetectStarted = true
  for (const k of ARENA_KEYS) {
    fetch(`/arenas/${k}.jpg`, { method: 'HEAD' }).then((r) => { arenaHasArt[k] = r.ok }).catch(() => { arenaHasArt[k] = false })
  }
}
if (typeof window !== 'undefined') detectArenaArt()

/** Atsitiktinė arena – PIRMENYBĖ toms, kurios turi tikrą paveikslėlį (kad nerodytų procedūrinės). */
export function randomArena(): ArenaKey {
  const withArt = ARENA_KEYS.filter((k) => arenaHasArt[k])
  const pool = withArt.length ? withArt : ARENA_KEYS
  return pool[Math.floor(Math.random() * pool.length)]
}

type Theme = {
  name: string
  skyTop: string; skyBottom: string; horizon: string; accent: string
  floor: string; floorEdge: string; particle: string
  ambient: 'embers' | 'motes' | 'snow' | 'mist' | 'rays' | 'petals'
  fog?: boolean; rays?: boolean
}

const T: Record<ArenaKey, Theme> = {
  crypt:     { name: 'Mirties maršas',     skyTop: '#08130f', skyBottom: '#040b08', horizon: '#0f3a2c', accent: '#5ef0c0', floor: '#0a1814', floorEdge: '#16382c', particle: '#aef5dd', ambient: 'motes', fog: true },
  arcane:    { name: 'Mistikos melodija',  skyTop: '#0e0a26', skyBottom: '#06040f', horizon: '#2a1a55', accent: '#a78bfa', floor: '#100a22', floorEdge: '#2a1a55', particle: '#c4b5fd', ambient: 'motes' },
  cathedral: { name: 'Inkvizicijos legionas', skyTop: '#1c1408', skyBottom: '#0a0703', horizon: '#5a3e0f', accent: '#ffe08a', floor: '#181206', floorEdge: '#4a360f', particle: '#fff4c2', ambient: 'rays', rays: true },
  citadel:   { name: 'Šviesos pulkas',     skyTop: '#0a1322', skyBottom: '#05080f', horizon: '#1a3a66', accent: '#7cc4ff', floor: '#0a1220', floorEdge: '#1e4a7a', particle: '#cfe6ff', ambient: 'snow' },
  inferno:   { name: 'Demonų orda',        skyTop: '#1c0606', skyBottom: '#0a0202', horizon: '#5a1208', accent: '#ff5a3a', floor: '#180806', floorEdge: '#5a1808', particle: '#ff9a3a', ambient: 'embers' },
  scrapyard: { name: 'Goblinų gauja',      skyTop: '#15120a', skyBottom: '#080703', horizon: '#3a3010', accent: '#ffd24a', floor: '#13110a', floorEdge: '#3a3010', particle: '#ffe89a', ambient: 'embers', fog: true },
  harbor:    { name: 'Plėšikų naktis',     skyTop: '#0a1620', skyBottom: '#05080c', horizon: '#143042', accent: '#d4af37', floor: '#0a1018', floorEdge: '#1a3242', particle: '#ffe89a', ambient: 'mist', fog: true },
  dojo:      { name: 'Rytų vėjas',         skyTop: '#0e1614', skyBottom: '#070d0b', horizon: '#1a4038', accent: '#9fe8d0', floor: '#0e1614', floorEdge: '#1e4a40', particle: '#d8f5ec', ambient: 'petals' },
}

// Siluetai prie horizonto (SVG, viewBox 0..1000 x 0..200, apačia = horizontas)
function Silhouette({ k, accent }: { k: ArenaKey; accent: string }) {
  const fill = 'rgba(0,0,0,0.82)'
  const rim = { fill: 'none', stroke: accent, strokeWidth: 1.5, opacity: 0.35 } as const
  let shapes: React.ReactNode = null
  if (k === 'crypt') shapes = <>
    {[80, 180, 360, 620, 780, 900].map((x, i) => <g key={i}><rect x={x} y={130 - (i % 2) * 14} width={i % 2 ? 34 : 26} height={70} rx={i % 2 ? 16 : 4} fill={fill} /><line x1={x + 13} y1={130 - (i % 2) * 14} x2={x + 13} y2={140} {...rim} /></g>)}
    <path d="M460 200 L470 120 L455 130 L478 90 L462 96 L485 60 L500 96 L484 90 L506 130 L492 120 L502 200 Z" fill={fill} />
  </>
  else if (k === 'arcane') shapes = <>{[120, 320, 520, 720, 880].map((x, i) => <path key={i} d={`M${x} 200 L${x} 90 Q${x + 35} 40 ${x + 70} 90 L${x + 70} 200 Z`} fill={fill} />)}<circle cx={500} cy={60} r={26} {...rim} /></>
  else if (k === 'cathedral') shapes = <>{[100, 300, 500, 700, 880].map((x, i) => <g key={i}><path d={`M${x} 200 L${x} 70 Q${x + 40} 20 ${x + 80} 70 L${x + 80} 200 Z`} fill={fill} /><path d={`M${x + 18} 150 L${x + 18} 95 Q${x + 40} 70 ${x + 62} 95 L${x + 62} 150 Z`} fill={accent} opacity={0.18} /></g>)}</>
  else if (k === 'citadel') shapes = <>{Array.from({ length: 11 }).map((_, i) => <rect key={i} x={60 + i * 85} y={150} width={50} height={50} fill={fill} />)}{[60, 145, 230, 315, 400, 485, 570, 655, 740, 825, 910].map((x, i) => <rect key={'c' + i} x={x + 18} y={120} width={14} height={32} fill={fill} />)}</>
  else if (k === 'inferno') shapes = <>{[60, 180, 300, 440, 580, 720, 860, 960].map((x, i) => <path key={i} d={`M${x} 200 L${x + 28} ${70 + (i % 3) * 20} L${x + 56} 200 Z`} fill={fill} />)}</>
  else if (k === 'scrapyard') shapes = <>{[80, 200, 360, 520, 700, 860].map((x, i) => <rect key={i} x={x} y={120 + (i % 3) * 16} width={70 + (i % 2) * 30} height={80} fill={fill} transform={`rotate(${(i % 2 ? 1 : -1) * 2} ${x + 40} 160)`} />)}<line x1={300} y1={200} x2={310} y2={70} stroke={fill} strokeWidth={6} /><line x1={640} y1={200} x2={628} y2={84} stroke={fill} strokeWidth={6} /></>
  else if (k === 'harbor') shapes = <>{[120, 360, 640, 860].map((x, i) => <g key={i}><line x1={x} y1={200} x2={x} y2={50 + i * 8} stroke={fill} strokeWidth={5} /><path d={`M${x} ${70 + i * 6} L${x + 46} ${110 + i * 6} L${x} ${150} Z`} fill={fill} /></g>)}<circle cx={820} cy={50} r={30} fill={accent} opacity={0.22} /></>
  else shapes = <><path d="M0 200 L180 110 L360 200 Z" fill={fill} /><path d="M620 200 L820 90 L1000 200 Z" fill={fill} /><g><rect x={420} y={70} width={160} height={14} fill={fill} /><rect x={430} y={84} width={140} height={10} fill={fill} /><rect x={448} y={94} width={14} height={106} fill={fill} /><rect x={538} y={94} width={14} height={106} fill={fill} /></g></>
  return <svg viewBox="0 0 1000 200" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: '46%', width: '100%', height: '26%' }}>{shapes}</svg>
}

export function ArenaBackground({ arena }: { arena: ArenaKey }) {
  const [imgOk, setImgOk] = useState(false)
  const [fxOn, setFxOn] = useState(true)
  const t = T[arena]
  const pc = t.particle
  const ambN = 12
  // „Fono efektai" nustatymas (tas pats kaip meniu liepsnoms) — taupo bateriją
  useEffect(() => {
    setFxOn(isBgFxEnabled())
    const h = (e: Event) => setFxOn((e as CustomEvent<boolean>).detail)
    window.addEventListener('rvn:bgfx', h)
    return () => window.removeEventListener('rvn:bgfx', h)
  }, [])
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: -1, pointerEvents: 'none' }}>
      <style>{CSS}</style>

      {/* PERF: kai užsikrauna tikras arenos art, procedūriniai sluoksniai ir
          animuotos dalelės NEberenderinami (anksčiau suko GPU po nepermatomu vaizdu) */}
      {!imgOk && (<>
      {/* dangus / skliautas */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${t.skyTop} 0%, ${t.skyTop} 30%, ${t.skyBottom} 54%, ${t.floor} 54%, ${t.floor} 100%)` }} />
      {/* horizonto švytėjimas */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '38%', height: '22%', background: `radial-gradient(ellipse 70% 100% at 50% 100%, ${t.horizon}, transparent 70%)`, opacity: 0.9 }} />

      <Silhouette k={arena} accent={t.accent} />

      {/* perspektyvinės grindys */}
      <svg viewBox="0 0 100 46" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '46%' }}>
        <defs><linearGradient id={`fl-${arena}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.floorEdge} stopOpacity="0.0" /><stop offset="1" stopColor={t.floorEdge} stopOpacity="0.55" /></linearGradient></defs>
        <rect x="0" y="0" width="100" height="46" fill={`url(#fl-${arena})`} />
        {/* išilginės linijos į horizonto tašką (50,0) */}
        {[-60, -36, -18, -6, 6, 18, 36, 60].map((dx, i) => <line key={i} x1={50 + dx} y1="46" x2="50" y2="0" stroke={t.accent} strokeWidth="0.18" opacity="0.14" />)}
        {/* skersinės (tankėja prie horizonto) */}
        {[2, 6, 12, 21, 33, 46].map((y, i) => <line key={'h' + i} x1="0" y1={y} x2="100" y2={y} stroke={t.accent} strokeWidth="0.15" opacity="0.12" />)}
      </svg>

      {/* scenos šviesos baseinas (kur kortos) */}
      <div style={{ position: 'absolute', left: '50%', top: '52%', width: '85%', height: '46%', transform: 'translateX(-50%)', background: `radial-gradient(ellipse 60% 55% at 50% 40%, ${t.accent}22, transparent 70%)` }} />

      {/* migla */}
      {fxOn && t.fog && <div className="arena-fog" style={{ position: 'absolute', left: '-20%', right: '-20%', top: '40%', height: '26%', background: `radial-gradient(ellipse 50% 100% at 50% 50%, ${t.horizon}cc, transparent 70%)`, filter: 'blur(14px)' }} />}

      {/* spinduliai (katedra) */}
      {fxOn && t.rays && <div className="arena-rays" style={{ position: 'absolute', left: '50%', top: '-10%', width: '120%', height: '80%', transform: 'translateX(-50%)', background: `repeating-conic-gradient(from 0deg at 50% 0%, ${t.accent}00 0deg, ${t.accent}14 2deg, ${t.accent}00 6deg)`, mixBlendMode: 'screen', opacity: 0.5 }} />}

      {/* ambiento dalelės */}
      {fxOn && Array.from({ length: ambN }).map((_, i) => {
        const left = (i * 61) % 100; const dur = 6 + (i % 5) * 2.2; const delay = (i % 7) * -1.6; const sz = 2 + (i % 4)
        const down = t.ambient === 'snow' || t.ambient === 'petals'
        return <span key={i} className={`arena-p ${down ? 'arena-down' : 'arena-up'}`} style={{ left: `${left}%`, width: sz, height: sz, background: pc, boxShadow: `0 0 ${sz * 3}px ${pc}`, animationDuration: `${dur}s`, animationDelay: `${delay}s`, top: down ? '-5%' : '100%', borderRadius: t.ambient === 'petals' ? '50% 0 50% 0' : '50%' } as React.CSSProperties} />
      })}

      {/* vignette fokusui */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 75% 70% at 50% 52%, transparent 40%, rgba(2,1,6,0.72) 100%)' }} />
      </>)}

      {/* FILE-FIRST tikras art (jei yra) */}
      <img src={`/arenas/${arena}.jpg`} alt="" onLoad={() => setImgOk(true)} onError={() => setImgOk(false)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: imgOk ? 1 : 0, transition: 'opacity 0.4s' }} />
      {imgOk && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 78% 72% at 50% 52%, transparent 45%, rgba(2,1,6,0.6) 100%)' }} />}
    </div>
  )
}

const CSS = `
.arena-p { position: absolute; opacity: 0; pointer-events: none; }
.arena-up { animation-name: arenaUp; animation-timing-function: linear; animation-iteration-count: infinite; }
.arena-down { animation-name: arenaDown; animation-timing-function: linear; animation-iteration-count: infinite; }
@keyframes arenaUp { 0%{opacity:0; transform:translateY(0) translateX(0)} 12%{opacity:0.85} 80%{opacity:0.6} 100%{opacity:0; transform:translateY(-46vh) translateX(14px)} }
@keyframes arenaDown { 0%{opacity:0; transform:translateY(0) translateX(0)} 12%{opacity:0.8} 85%{opacity:0.5} 100%{opacity:0; transform:translateY(52vh) translateX(-16px)} }
.arena-fog { animation: arenaFog 14s ease-in-out infinite alternate; }
@keyframes arenaFog { from{transform:translateX(-4%)} to{transform:translateX(4%)} }
.arena-rays { animation: arenaRays 18s linear infinite; transform-origin: 50% 0; }
@keyframes arenaRays { from{transform:translateX(-50%) rotate(-4deg)} to{transform:translateX(-50%) rotate(4deg)} }
@media (prefers-reduced-motion: reduce) { .arena-p, .arena-fog, .arena-rays { animation: none !important; } }
`
