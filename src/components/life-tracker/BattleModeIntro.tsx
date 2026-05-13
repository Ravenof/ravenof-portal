'use client'

import { useEffect } from 'react'

type Props = {
  onComplete: () => void
}

/** A simple CSS sword: blade + guard + handle */
function SwordShape() {
  return (
    <div style={{ position: 'relative', width: 14, height: 130 }}>
      {/* Blade tip */}
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderBottom: '18px solid #e8e8e8',
      }} />
      {/* Blade body */}
      <div style={{
        position: 'absolute', top: 16, left: '50%',
        transform: 'translateX(-50%)',
        width: 6, height: 68,
        background: 'linear-gradient(to bottom, #f0f0f0 0%, #d4af37 60%, #b8972a 100%)',
        borderRadius: '0 0 2px 2px',
      }} />
      {/* Guard */}
      <div style={{
        position: 'absolute', top: 80, left: '50%',
        transform: 'translateX(-50%)',
        width: 32, height: 7,
        background: 'linear-gradient(to bottom, #f0c040, #b8860b)',
        borderRadius: 4,
        boxShadow: '0 0 6px rgba(212,175,55,0.6)',
      }} />
      {/* Handle */}
      <div style={{
        position: 'absolute', top: 87, left: '50%',
        transform: 'translateX(-50%)',
        width: 8, height: 36,
        background: 'linear-gradient(to bottom, #7a5230, #3d2410)',
        borderRadius: '0 0 4px 4px',
      }} />
      {/* Pommel */}
      <div style={{
        position: 'absolute', top: 120, left: '50%',
        transform: 'translateX(-50%)',
        width: 12, height: 10,
        background: 'linear-gradient(to bottom, #d4af37, #8b6914)',
        borderRadius: '0 0 6px 6px',
      }} />
    </div>
  )
}

export function BattleModeIntro({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 900)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{ background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(8px)' }}
    >
      <style>{`
        /* ── Sword 1: \ diagonal — enters from upper-left, tip points lower-right ── */
        @keyframes bmi-sword-a {
          0%   { transform: translateX(-280px) translateY(-280px) rotate(45deg); opacity: 0; }
          18%  { opacity: 1; }
          65%  { transform: translateX(0px) translateY(0px) rotate(45deg); }
          76%  { transform: translateX(-6px) translateY(-6px) rotate(44deg); }
          100% { transform: translateX(0px) translateY(0px) rotate(45deg); }
        }
        /* ── Sword 2: / diagonal — enters from lower-right, tip points upper-left ── */
        @keyframes bmi-sword-b {
          0%   { transform: translateX(280px) translateY(280px) rotate(-135deg); opacity: 0; }
          18%  { opacity: 1; }
          65%  { transform: translateX(0px) translateY(0px) rotate(-135deg); }
          76%  { transform: translateX(6px) translateY(6px) rotate(-134deg); }
          100% { transform: translateX(0px) translateY(0px) rotate(-135deg); }
        }
        /* ── Gold spark at crossing point ── */
        @keyframes bmi-spark {
          0%, 62%  { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          68%      { opacity: 1; transform: translate(-50%, -50%) scale(1.8); }
          82%      { opacity: 0.7; transform: translate(-50%, -50%) scale(1.2); }
          100%     { opacity: 0; transform: translate(-50%, -50%) scale(2.4); }
        }
        /* ── Radial glow ── */
        @keyframes bmi-glow {
          0%, 60% { opacity: 0; transform: translate(-50%,-50%) scale(0.4); }
          68%     { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          100%    { opacity: 0; transform: translate(-50%,-50%) scale(2); }
        }
        /* ── Title ── */
        @keyframes bmi-title {
          0%, 58%  { opacity: 0; transform: translateY(10px); }
          80%      { opacity: 1; transform: translateY(-1px); }
          100%     { opacity: 1; transform: translateY(0); }
        }
        .bmi-sword-a { animation: bmi-sword-a 0.9s cubic-bezier(0.2,1,0.3,1) forwards; }
        .bmi-sword-b { animation: bmi-sword-b 0.9s cubic-bezier(0.2,1,0.3,1) forwards; }
        .bmi-spark   { animation: bmi-spark   0.9s ease-out forwards; }
        .bmi-glow    { animation: bmi-glow    0.9s ease-out forwards; }
        .bmi-title   { animation: bmi-title   0.9s ease-out forwards; }
      `}</style>

      {/* ── Stage ── */}
      <div style={{ position: 'relative', width: 200, height: 200 }}>

        {/* Radial gold glow */}
        <div
          className="bmi-glow"
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: 240, height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.55) 0%, transparent 65%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Sword A: \ — z-index 2 (below at guard crossing) */}
        <div
          className="bmi-sword-a"
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            marginTop: -65, marginLeft: -7,
            transformOrigin: 'center center',
            zIndex: 2,
          }}
        >
          <SwordShape />
        </div>

        {/* Sword B: / — z-index 3 (on top at guard crossing) */}
        <div
          className="bmi-sword-b"
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            marginTop: -65, marginLeft: -7,
            transformOrigin: 'center center',
            zIndex: 3,
          }}
        >
          <SwordShape />
        </div>

        {/* Spark */}
        <div
          className="bmi-spark"
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            fontSize: '2rem',
            lineHeight: 1,
            zIndex: 4,
            pointerEvents: 'none',
            color: '#ffd700',
          }}
          aria-hidden
        >
          ✦
        </div>
      </div>

      {/* Title */}
      <p
        className="bmi-title"
        style={{
          marginTop: 24,
          fontSize: '1.4rem',
          fontWeight: 700,
          fontFamily: 'Cinzel, Georgia, serif',
          color: 'var(--gold)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          textShadow: '0 0 28px rgba(212,175,55,0.7)',
        }}
      >
        Kovos režimas
      </p>
    </div>
  )
}
