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

// ── Idle sluoksniai pagal statusą ────────────────────────────────────────────
function Idle({ id, q }: { id: VfxStatusId; q: 'low' | 'medium' | 'high' }) {
  const t = STATUS_VFX_REGISTRY[id].tint
  const parts = q === 'low' ? 0 : q === 'medium' ? 1 : 2
  switch (id) {
    case 'shield': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="shield">
        {/* energijos membrana: kvėpuojantis dvigubas laukas + periodinis ratilas */}
        <div data-idle style={{ position: 'absolute', inset: -3, borderRadius: 11, border: `1.5px solid ${t}88`, boxShadow: `inset 0 0 12px ${t}3c, 0 0 10px ${t}44`, animation: 'svfxBreath 2.4s ease-in-out infinite' }} />
        <div data-idle style={{ position: 'absolute', inset: -1, borderRadius: 9, border: `1px solid ${t}44`, animation: 'svfxBreath 2.4s ease-in-out 1.2s infinite' }} />
        <div data-idle style={{ position: 'absolute', inset: -3, borderRadius: 11, border: `1px solid ${t}66`, animation: 'svfxIdleRipple 2.8s ease-out infinite' }} />
        {parts > 0 && <div data-idle style={{ position: 'absolute', inset: -2, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, width: '45%', background: `linear-gradient(105deg, transparent, ${t}30, transparent)`, animation: 'svfxSheen 3.2s linear infinite' }} />
        </div>}
        {parts > 1 && <span data-idle style={{ position: 'absolute', top: '18%', right: -2, width: 3, height: 3, borderRadius: 3, background: '#dbeafe', boxShadow: `0 0 5px ${t}`, animation: 'svfxRise 2.1s linear infinite reverse' }} />}
      </div>)
    case 'burning': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="burning">
        <div data-idle style={{ position: 'absolute', left: -1, right: -1, bottom: -2, height: '42%', borderRadius: '0 0 9px 9px', background: `linear-gradient(0deg, ${t}77, ${t}22 55%, transparent)`, transformOrigin: 'bottom', animation: 'svfxFlicker 1.1s ease-in-out infinite' }} />
        {/* liepsnų liežuviai kylantys nuo apačios */}
        {[0, 1, 2].map((i) => (
          <span key={'f' + i} data-idle style={{ position: 'absolute', bottom: -2, left: `${14 + i * 32}%`, width: 9, height: 15, borderRadius: '50% 50% 20% 20%', background: `linear-gradient(0deg, ${t}dd, #fde04788 60%, transparent)`, transformOrigin: 'bottom', animation: `svfxFlame ${1 + i * 0.25}s ease-in-out ${i * 0.3}s infinite` }} />
        ))}
        <div data-idle style={{ position: 'absolute', inset: -1, borderRadius: 9, boxShadow: `inset 0 -10px 14px ${t}33`, animation: 'svfxPulse 1.6s ease-in-out infinite' }} />
        {Array.from({ length: parts + 1 }).map((_, i) => (
          <span key={i} data-idle style={{ position: 'absolute', bottom: 4, left: `${20 + i * 30}%`, width: 3, height: 3, borderRadius: 2, background: '#fdba74', boxShadow: '0 0 4px #fb923c', animation: `svfxRise 1.6s ease-out ${i * 0.55}s infinite` }} />
        ))}
      </div>)
    case 'frozen': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="frozen">
        {/* ledinis atspalvis ant visos kortos (artwork lieka matomas) */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: `${t}1f` }} />
        <div data-idle style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `2px solid ${t}99`, boxShadow: `inset 0 0 14px ${t}55, 0 0 10px ${t}44`, animation: 'svfxShimmer 3.6s ease-in-out infinite' }} />
        {/* šerkšno kristalai kampuose */}
        <span style={{ position: 'absolute', top: -3, left: -3, width: 10, height: 10, background: t, opacity: 0.9, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', filter: `drop-shadow(0 0 3px ${t})` }} />
        <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, background: t, opacity: 0.75, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }} />
        <span style={{ position: 'absolute', bottom: -3, right: -3, width: 9, height: 9, background: t, opacity: 0.85, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', filter: `drop-shadow(0 0 3px ${t})` }} />
        <span style={{ position: 'absolute', bottom: -2, left: -2, width: 6, height: 6, background: t, opacity: 0.7, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }} />
        {/* dreifuojančios snaigės */}
        {Array.from({ length: parts + 1 }).map((_, i) => (
          <span key={'s' + i} data-idle style={{ position: 'absolute', top: 0, left: `${20 + i * 34}%`, width: 2.5, height: 2.5, borderRadius: 2, background: '#e0f2fe', animation: `svfxSnow ${2.2 + i * 0.6}s linear ${i * 0.8}s infinite` }} />
        ))}
      </div>)
    case 'poisoned': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="poisoned">
        <div data-idle style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `1.5px solid ${t}66`, boxShadow: `inset 0 -10px 14px ${t}30`, animation: 'svfxPulse 2.8s ease-in-out infinite' }} />
        {/* garuojantys nuodų debesėliai */}
        {[0, 1].map((i) => (
          <span key={'g' + i} data-idle style={{ position: 'absolute', bottom: '12%', left: `${16 + i * 42}%`, width: 24, height: 15, borderRadius: '50%', background: `radial-gradient(ellipse, ${t}55, transparent 70%)`, animation: `svfxFume ${2.6 + i * 0.7}s ease-out ${i * 1.2}s infinite` }} />
        ))}
        {/* burbuliukai */}
        {Array.from({ length: parts }).map((_, i) => (
          <span key={i} data-idle style={{ position: 'absolute', bottom: 6, left: `${30 + i * 35}%`, width: 4, height: 4, borderRadius: 4, border: `1px solid ${t}`, opacity: 0.7, animation: `svfxRise 2.4s ease-in ${i * 1.1}s infinite` }} />
        ))}
      </div>)
    case 'stunned': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="stunned">
        <div data-idle style={{ position: 'absolute', inset: 0, animation: 'svfxTwitch 3.4s ease-in-out infinite' }}>
          <div data-idle style={{ position: 'absolute', top: -10, left: '50%', width: 30, height: 30, marginLeft: -15, animation: 'svfxOrbit 2.6s linear infinite' }}>
            {[0, 1, 2].slice(0, Math.max(2, parts + 1)).map((i) => (
              <span key={i} style={{ position: 'absolute', top: i === 0 ? 0 : i === 1 ? 18 : 8, left: i === 0 ? 12 : i === 1 ? 2 : 24, width: 6, height: 6, background: t, clipPath: 'polygon(50% 0, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0 50%, 35% 35%)', filter: `drop-shadow(0 0 3px ${t})` }} />
            ))}
          </div>
        </div>
        {/* pulsuojanti shock aura */}
        <div data-idle style={{ position: 'absolute', inset: -2, borderRadius: 10, border: `1px solid ${t}55`, animation: 'svfxIdleRipple 2.2s ease-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(20,16,30,0.22)' }} />
      </div>)
    case 'silenced': return (
      <div className="rvnSvfx" style={{ zIndex: 5 }} data-vfx-idle="silenced">
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(15,10,25,0.34)' }} />
        {/* horizontali „sandarinimo" juosta – magijos užgniaužimas */}
        <div data-idle style={{ position: 'absolute', left: -2, right: -2, top: '46%', height: 7, background: `linear-gradient(90deg, transparent, ${t}50 20%, ${t}77 50%, ${t}50 80%, transparent)`, animation: 'svfxShimmer 2.6s ease-in-out infinite' }} />
        <div data-idle style={{ position: 'absolute', inset: '28% 22%', borderRadius: '50%', border: `1.5px solid ${t}77`, animation: 'svfxShimmer 3s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: '70%', height: 1.5, background: `${t}aa`, transform: 'rotate(-40deg)' }} />
        </div>
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
