'use client'

// ── Bendras „dark fantasy" liepsnų fonas Ravenof Digital aplinkai ────────────
export function Flames() {
  return (
    <>
      <style>{`
        @keyframes rvnFlRise { 0%{transform:translateY(0) scaleX(1)} 50%{transform:translateY(-16px) scaleX(1.06)} 100%{transform:translateY(0) scaleX(1)} }
        @keyframes rvnFlFlick { 0%,100%{opacity:.28} 40%{opacity:.62} 70%{opacity:.42} }
        .rvn-fl{ position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden;
          background: radial-gradient(125% 55% at 50% 120%, rgba(240,90,20,0.20), rgba(120,20,10,0.06) 44%, transparent 72%); }
        .rvn-fl-i{ position:absolute; bottom:-80px; width:320px; height:380px; border-radius:48% 48% 50% 50%;
          filter: blur(40px); mix-blend-mode:screen;
          background: radial-gradient(circle at 50% 72%, rgba(255,175,45,0.55), rgba(240,95,20,0.36) 34%, rgba(150,25,10,0.13) 60%, transparent 72%);
          animation: rvnFlRise 3.6s ease-in-out infinite, rvnFlFlick 1.6s ease-in-out infinite; }
      `}</style>
      <div className="rvn-fl" aria-hidden>
        <div className="rvn-fl-i" style={{ left: '2%', width: 280 }} />
        <div className="rvn-fl-i" style={{ left: '24%', width: 340, height: 460, animationDelay: '0.6s, 0.9s' }} />
        <div className="rvn-fl-i" style={{ left: '46%', width: 320, animationDelay: '1.1s, 0.4s' }} />
        <div className="rvn-fl-i" style={{ left: '68%', width: 360, height: 470, animationDelay: '0.3s, 1.2s' }} />
        <div className="rvn-fl-i" style={{ left: '90%', width: 280, animationDelay: '0.9s, 0.6s' }} />
      </div>
    </>
  )
}
