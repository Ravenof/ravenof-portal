'use client'

// ── Bendras „dark fantasy" liepsnų fonas Ravenof Digital aplinkai ────────────
// Optimizuota: mažesnis blur, paslepiama kovoje (.rvn-in-battle), mažiau elementų
// telefone, paiso reduced-motion. (Anksčiau 5× blur(40px)+screen sukosi visur.)
export function Flames() {
  return (
    <>
      <style>{`
        @keyframes rvnFlRise { 0%{transform:translateY(0) scaleX(1)} 50%{transform:translateY(-14px) scaleX(1.05)} 100%{transform:translateY(0) scaleX(1)} }
        @keyframes rvnFlFlick { 0%,100%{opacity:.26} 40%{opacity:.56} 70%{opacity:.4} }
        .rvn-fl{ position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden;
          background: radial-gradient(125% 55% at 50% 120%, rgba(240,90,20,0.18), rgba(120,20,10,0.05) 44%, transparent 72%); }
        .rvn-fl-i{ position:absolute; bottom:-80px; width:320px; height:380px; border-radius:48% 48% 50% 50%;
          filter: blur(28px); mix-blend-mode:screen; will-change:transform,opacity;
          background: radial-gradient(circle at 50% 72%, rgba(255,175,45,0.5), rgba(240,95,20,0.32) 34%, rgba(150,25,10,0.12) 60%, transparent 72%);
          animation: rvnFlRise 4s ease-in-out infinite, rvnFlFlick 1.8s ease-in-out infinite; }
        /* Kovoje (TutorialGame) – nematyti, tad išjungiam (ArenaBackground rodomas viršuje) */
        .rvn-in-battle .rvn-fl{ display:none; }
        /* Telefone – mažesnis blur + tik 3 liepsnos */
        @media (max-width:520px){ .rvn-fl-i{ filter: blur(20px); width:240px!important; height:320px!important; } .rvn-fl-i:nth-child(n+4){ display:none; } }
        @media (prefers-reduced-motion: reduce){ .rvn-fl-i{ animation:none; } }
      `}</style>
      <div className="rvn-fl" aria-hidden>
        <div className="rvn-fl-i" style={{ left: '4%', width: 280 }} />
        <div className="rvn-fl-i" style={{ left: '30%', width: 330, height: 440, animationDelay: '0.6s, 0.9s' }} />
        <div className="rvn-fl-i" style={{ left: '62%', width: 350, height: 450, animationDelay: '1.1s, 0.4s' }} />
        <div className="rvn-fl-i" style={{ left: '86%', width: 280, animationDelay: '0.3s, 1.2s' }} />
      </div>
    </>
  )
}
