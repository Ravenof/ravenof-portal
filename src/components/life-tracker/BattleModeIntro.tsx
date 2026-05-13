'use client'

import { useEffect } from 'react'

type Props = {
  onComplete: () => void
}

function SwordShape() {
  return (
    <div style={{ position: 'relative', width: 14, height: 130 }}>
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderBottom: '18px solid #e8e8e8',
      }} />
      <div style={{
        position: 'absolute', top: 16, left: '50%',
        transform: 'translateX(-50%)',
        width: 6, height: 64,
        background: 'linear-gradient(to bottom, #f0f0f0 0%, #d4af37 60%, #b8972a 100%)',
        borderRadius: '0 0 2px 2px',
      }} />
      <div style={{
        position: 'absolute', top: 76, left: '50%',
        transform: 'translateX(-50%)',
        width: 34, height: 8,
        background: 'linear-gradient(to bottom, #f0c040, #b8860b)',
        borderRadius: 4,
        boxShadow: '0 0 8px rgba(212,175,55,0.7)',
      }} />
      <div style={{
        position: 'absolute', top: 84, left: '50%',
        transform: 'translateX(-50%)',
        width: 8, height: 34,
        background: 'linear-gradient(to bottom, #7a5230, #3d2410)',
        borderRadius: '0 0 4px 4px',
      }} />
      <div style={{
        position: 'absolute', top: 116, left: '50%',
        transform: 'translateX(-50%)',
        width: 14, height: 10,
        background: 'linear-gradient(to bottom, #d4af37, #8b6914)',
        borderRadius: '0 0 7px 7px',
      }} />
    </div>
  )
}

export function BattleModeIntro({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 950)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{ background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(8px)' }}
    >
      <style>{`
        /*
         * Sword A: rotate(45deg)  → tip upper-right  = \ diagonal
         * Sword B: rotate(-45deg) → tip upper-left   = /  diagonal
         * Together at center they form a clear X.
         * Sword A slides in from the LEFT, Sword B from the RIGHT.
         */
        @keyframes bmi-sword-a {
          0%   { transform: translateX(-320px) rotate(45deg); opacity: 0; }
          20%  { opacity: 1; }
          64%  { transform: translateX(0px) rotate(45deg); }
          74%  { transform: translateX(-10px) rotate(44deg); }
          100% { transform: translateX(0px) rotate(45deg); }
        }
        @keyframes bmi-sword-b {
          0%   { transform: translateX(320px) rotate(-45deg); opacity: 0; }
          20%  { opacity: 1; }
          64%  { transform: translateX(0px) rotate(-45deg); }
          74%  { transform: translateX(10px) rotate(-44deg); }
          100% { transform: translateX(0px) rotate(-45deg); }
        }
        @keyframes bmi-spark {
          0%, 61%  { opacity: 0; transform: translate(-50%,-50%) scale(0.2); }
          68%      { opacity: 1; transform: translate(-50%,-50%) scale(2); }
          82%      { opacity: 0.6; transform: translate(-50%,-50%) scale(1.3); }
          100%     { opacity: 0; transform: translate(-50%,-50%) scale(2.8); }
        }
        @keyframes bmi-glow {
          0%, 60% { opacity: 0; transform: translate(-50%,-50%) scale(0.3); }
          68%     { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          100%    { opacity: 0; transform: translate(-50%,-50%) scale(2.2); }
        }
        @keyframes bmi-title {
          0%, 58%  { opacity: 0; transform: translateY(10px); }
          80%      { opacity: 1; transform: translateY(-1px); }
          100%     { opacity: 1; transform: translateY(0); }
        }
        .bmi-sword-a { animation: bmi-sword-a 0.95s cubic-bezier(0.15,1,0.3,1) forwards; }
        .bmi-sword-b { animation: bmi-sword-b 0.95s cubic-bezier(0.15,1,0.3,1) forwards; }
        .bmi-spark   { animation: bmi-spark   0.95s ease-out forwards; }
        .bmi-glow    { animation: bmi-glow    0.95s ease-out forwards; }
        .bmi-title   { animation: bmi-title   0.95s ease-out forwards; }
      `}</style>

      <div style={{ position: 'relative', width: 220, height: 220 }}>

        {/* Radial glow */}
        <div className="bmi-glow" style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.6) 0%, transparent 65%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Sword A — rotate(45deg), enters from left */}
        <div className="bmi-sword-a" style={{
          position: 'absolute',
          top: '50%', left: '50%',
          marginTop: -65, marginLeft: -7,
          transformOrigin: 'center center',
          zIndex: 2,
        }}>
          <SwordShape />
        </div>

        {/* Sword B — rotate(-45deg), enters from right */}
        <div className="bmi-sword-b" style={{
          position: 'absolute',
          top: '50%', left: '50%',
          marginTop: -65, marginLeft: -7,
          transformOrigin: 'center center',
          zIndex: 3,
        }}>
          <SwordShape />
        </div>

        {/* Spark at crossing */}
        <div className="bmi-spark" style={{
          position: 'absolute', top: '50%', left: '50%',
          fontSize: '2.2rem', lineHeight: 1,
          zIndex: 4, pointerEvents: 'none',
          color: '#ffd700',
        }} aria-hidden>✦</div>

      </div>

      <p className="bmi-title" style={{
        marginTop: 20,
        fontSize: '1.4rem', fontWeight: 700,
        fontFamily: 'Cinzel, Georgia, serif',
        color: 'var(--gold)',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        textShadow: '0 0 28px rgba(212,175,55,0.7)',
      }}>
        Kovos režimas
      </p>
    </div>
  )
}
