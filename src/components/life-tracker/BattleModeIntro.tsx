'use client'

import { useEffect } from 'react'

type Props = {
  onComplete: () => void
}

export function BattleModeIntro({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 800)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{ background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(8px)' }}
    >
      <style>{`
        /* ── Sword left: slides from far left, final angle +45deg (/ shape) ── */
        @keyframes bmi-left {
          0%   { transform: translateX(-220px) rotate(45deg); opacity: 0; }
          15%  { opacity: 1; }
          62%  { transform: translateX(-22px) rotate(45deg); }
          72%  { transform: translateX(-28px) rotate(48deg); }
          100% { transform: translateX(-22px) rotate(45deg); }
        }
        /* ── Sword right: slides from far right, final angle -45deg (\ shape) ── */
        @keyframes bmi-right {
          0%   { transform: translateX(220px) rotate(-45deg); opacity: 0; }
          15%  { opacity: 1; }
          62%  { transform: translateX(22px) rotate(-45deg); }
          72%  { transform: translateX(28px) rotate(-48deg); }
          100% { transform: translateX(22px) rotate(-45deg); }
        }
        /* ── Spark at crossing point ── */
        @keyframes bmi-spark {
          0%, 58% { opacity: 0; transform: scale(0.2); }
          65%     { opacity: 1; transform: scale(1.6); }
          80%     { opacity: 0.6; transform: scale(1.1); }
          100%    { opacity: 0; transform: scale(2.2); }
        }
        /* ── Radial gold glow ── */
        @keyframes bmi-glow {
          0%, 58% { opacity: 0; transform: scale(0.3); }
          66%     { opacity: 1; transform: scale(1); }
          100%    { opacity: 0; transform: scale(1.8); }
        }
        /* ── Title fade-in ── */
        @keyframes bmi-title {
          0%, 55%  { opacity: 0; transform: translateY(8px) scale(0.92); }
          80%      { opacity: 1; transform: translateY(0) scale(1.02); }
          100%     { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bmi-left  { animation: bmi-left  0.8s cubic-bezier(0.22,1,0.36,1) forwards; }
        .bmi-right { animation: bmi-right 0.8s cubic-bezier(0.22,1,0.36,1) forwards; }
        .bmi-spark { animation: bmi-spark 0.8s ease-out forwards; }
        .bmi-glow  { animation: bmi-glow  0.8s ease-out forwards; }
        .bmi-title { animation: bmi-title 0.8s ease-out forwards; }
      `}</style>

      {/* ── Sword crossing stage ── */}
      <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>

        {/* Radial gold glow — expands at impact */}
        <div
          className="bmi-glow absolute pointer-events-none"
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.65) 0%, transparent 65%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 0,
          }}
        />

        {/* "/" sword — rotated +45°, slides from left */}
        <div
          className="bmi-left absolute"
          style={{
            fontSize: '5rem',
            lineHeight: 1,
            zIndex: 2,
            top: '50%',
            left: '50%',
            marginTop: '-2.5rem',
            marginLeft: '-2.5rem',
            transformOrigin: 'center center',
            filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.5))',
          }}
          aria-hidden
        >
          🗡️
        </div>

        {/* "\" sword — rotated -45°, slides from right, z on top at center */}
        <div
          className="bmi-right absolute"
          style={{
            fontSize: '5rem',
            lineHeight: 1,
            zIndex: 3,
            top: '50%',
            left: '50%',
            marginTop: '-2.5rem',
            marginLeft: '-2.5rem',
            transformOrigin: 'center center',
            filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.5))',
          }}
          aria-hidden
        >
          🗡️
        </div>

        {/* ✦ spark burst at crossing point */}
        <div
          className="bmi-spark absolute pointer-events-none"
          style={{
            fontSize: '2rem',
            zIndex: 4,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden
        >
          ✦
        </div>
      </div>

      {/* Title */}
      <p
        className="bmi-title mt-5 text-2xl font-bold tracking-widest uppercase"
        style={{
          fontFamily: 'Cinzel, Georgia, serif',
          color: 'var(--gold)',
          textShadow: '0 0 28px rgba(212,175,55,0.7)',
          letterSpacing: '0.22em',
        }}
      >
        Kovos režimas
      </p>
    </div>
  )
}
