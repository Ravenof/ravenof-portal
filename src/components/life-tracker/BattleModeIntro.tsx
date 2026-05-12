'use client'

import { useEffect } from 'react'

type Props = {
  onComplete: () => void
}

export function BattleModeIntro({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 750)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{ background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(8px)' }}
    >
      <style>{`
        @keyframes bmi-sword-left {
          0%   { transform: translateX(-120%) rotate(-45deg); opacity: 0; }
          60%  { transform: translateX(0%) rotate(-45deg); opacity: 1; }
          100% { transform: translateX(0%) rotate(-45deg); opacity: 1; }
        }
        @keyframes bmi-sword-right {
          0%   { transform: translateX(120%) rotate(135deg); opacity: 0; }
          60%  { transform: translateX(0%) rotate(135deg); opacity: 1; }
          100% { transform: translateX(0%) rotate(135deg); opacity: 1; }
        }
        @keyframes bmi-flash {
          0%   { opacity: 0; transform: scale(0.5); }
          55%  { opacity: 0; transform: scale(0.5); }
          65%  { opacity: 1; transform: scale(1.4); }
          100% { opacity: 0; transform: scale(2.0); }
        }
        @keyframes bmi-title {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { opacity: 0; transform: scale(0.7); }
          80%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        .bmi-sword-left  { animation: bmi-sword-left  0.75s ease-out forwards; }
        .bmi-sword-right { animation: bmi-sword-right 0.75s ease-out forwards; }
        .bmi-flash       { animation: bmi-flash       0.75s ease-out forwards; }
        .bmi-title       { animation: bmi-title        0.75s ease-out forwards; }
      `}</style>

      {/* Gold radial flash */}
      <div
        className="bmi-flash absolute"
        style={{
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.55) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Swords */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        {/* Left sword */}
        <div
          className="bmi-sword-left absolute"
          style={{ fontSize: '4.5rem', lineHeight: 1, transformOrigin: 'center' }}
          aria-hidden
        >
          🗡️
        </div>
        {/* Right sword */}
        <div
          className="bmi-sword-right absolute"
          style={{ fontSize: '4.5rem', lineHeight: 1, transformOrigin: 'center' }}
          aria-hidden
        >
          🗡️
        </div>
      </div>

      {/* Title */}
      <p
        className="bmi-title mt-4 text-2xl font-bold tracking-widest uppercase"
        style={{
          fontFamily: 'Cinzel, Georgia, serif',
          color: 'var(--gold)',
          textShadow: '0 0 24px rgba(212,175,55,0.6)',
          letterSpacing: '0.2em',
        }}
      >
        Kovos režimas
      </p>
    </div>
  )
}
