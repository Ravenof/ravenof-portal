'use client'

// ── „Dark fantasy" liepsnų fonas — OPTIMIZUOTAS (mažiau GPU/baterijos):
// 3 sluoksniai vietoj 5, be mix-blend-mode, lėtesnės animacijos, gerbiamas
// prefers-reduced-motion ir „Fono efektai" nustatymas (rvn:bgfx event).
import { useEffect, useState } from 'react'
import { isBgFxEnabled } from '@/lib/settings'

export function Flames() {
  const [on, setOn] = useState(true)
  useEffect(() => {
    setOn(isBgFxEnabled())
    const h = (e: Event) => setOn((e as CustomEvent<boolean>).detail)
    window.addEventListener('rvn:bgfx', h)
    return () => window.removeEventListener('rvn:bgfx', h)
  }, [])

  return (
    <>
      <style>{`
        @keyframes rvnFlRise { 0%{transform:translateY(0)} 50%{transform:translateY(-14px)} 100%{transform:translateY(0)} }
        @keyframes rvnFlFlick { 0%,100%{opacity:.30} 50%{opacity:.55} }
        .rvn-fl{ position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden;
          background: radial-gradient(125% 55% at 50% 120%, rgba(240,90,20,0.20), rgba(120,20,10,0.06) 44%, transparent 72%); }
        .rvn-fl-i{ position:absolute; bottom:-80px; width:340px; height:420px; border-radius:48% 48% 50% 50%;
          filter: blur(38px); will-change: transform, opacity;
          background: radial-gradient(circle at 50% 72%, rgba(255,175,45,0.42), rgba(240,95,20,0.26) 34%, rgba(150,25,10,0.10) 60%, transparent 72%);
          animation: rvnFlRise 5.2s ease-in-out infinite, rvnFlFlick 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .rvn-fl-i{ animation: none; } }
      `}</style>
      <div className="rvn-fl" aria-hidden>
        {on && (
          <>
            <div className="rvn-fl-i" style={{ left: '6%' }} />
            <div className="rvn-fl-i" style={{ left: '40%', width: 380, height: 480, animationDelay: '1.4s, 0.9s' }} />
            <div className="rvn-fl-i" style={{ left: '74%', animationDelay: '0.6s, 1.6s' }} />
          </>
        )}
      </div>
    </>
  )
}
