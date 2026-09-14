// ── Paleidimo splash: Ravenof logo prieš pagrindinį meniu ────────────────────
// Rodomas vieną kartą per paleidimą (Electron / Android / naršyklė), ~1.8 s:
// tamsus fonas su švelniu švytėjimu, logotipas įsižiebia, tada visas ekranas
// išnyksta. Android'e prieš tai matomas natyvus splash (tas pats logo) – perėjimas
// vientisas. Nesiremia tinklu: logo yra bundle'e (/brand/ravenof-logo.png).
import { useEffect, useState } from 'react'

const MIN_MS = 1800
const FADE_MS = 550

export function Splash() {
  const [phase, setPhase] = useState<'in' | 'out' | 'done'>('in')
  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('out'), MIN_MS)
    const t2 = window.setTimeout(() => setPhase('done'), MIN_MS + FADE_MS)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [])
  if (phase === 'done') return null
  return (
    <div aria-hidden style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'grid', placeItems: 'center',
      background: 'radial-gradient(70% 60% at 50% 50%, #221a2c 0%, #0a0a0f 70%)',
      opacity: phase === 'out' ? 0 : 1, transition: `opacity ${FADE_MS}ms ease`, pointerEvents: phase === 'out' ? 'none' : 'auto',
    }}>
      <style>{`@keyframes rvnSplashIn{0%{opacity:0;transform:scale(.92)}100%{opacity:1;transform:scale(1)}}@keyframes rvnSplashGlow{0%,100%{opacity:.35}50%{opacity:.7}}`}</style>
      <div style={{ position: 'absolute', width: '60vmin', height: '60vmin', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,163,59,.22), transparent 65%)', animation: 'rvnSplashGlow 2.4s ease-in-out infinite' }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/ravenof-logo.png" alt="Ravenof" draggable={false}
        style={{ position: 'relative', width: 'min(62vw, 520px)', maxHeight: '48vh', objectFit: 'contain', filter: 'drop-shadow(0 12px 40px rgba(0,0,0,.8))', animation: 'rvnSplashIn .9s cubic-bezier(.2,.8,.3,1) both' }} />
    </div>
  )
}
