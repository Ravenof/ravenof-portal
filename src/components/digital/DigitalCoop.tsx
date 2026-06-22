'use client'

// ── Ravenof Digital — Co-op 2v2 (perdaroma: tikras 1v1-mechanikos komandinis režimas) ─
// Senas realaus laiko prototipas pašalintas. Naujas variklis: ėjimais, komandos
// ėjimas (1=A, 2=B), bendras 60 HP, kiekvienas žaidėjas savo auksas, draugiški
// efektai veikia visai komandai. Kuriama etapais.
import Link from 'next/link'
import { playUiClick } from '@/lib/ui-sound'

const oct = (b: number) => `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`
const A = '56,189,248'

export function DigitalCoop() {
  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="relative" style={{ clipPath: oct(15), background: `rgba(${A},0.5)`, padding: 2.5 }}>
        <div className="px-5 py-6 text-center" style={{ clipPath: oct(14), background: `radial-gradient(120% 90% at 50% 0%, rgba(${A},0.16), rgba(10,8,16,0.97) 60%), linear-gradient(160deg,#15101f,#0a0810)` }}>
          <span className="text-5xl" style={{ filter: `drop-shadow(0 0 12px rgba(${A},0.55))` }}>🤝</span>
          <h1 className="text-xl font-bold mt-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', letterSpacing: '0.08em' }}>CO-OP 2v2</h1>
          <p className="text-[11px] mt-2 leading-snug" style={{ color: 'var(--text-muted)' }}>
            Komandinis režimas perdaromas: ta pati 1v1 mechanika, bet ėjimas priklauso komandai (1 = A, 2 = B),
            bendras <b style={{ color: '#7dd3fc' }}>60 HP</b> pool'as, kiekvienas žaidėjas turi savo auksą, o draugiški
            efektai veikia visai komandai. Kuriama etapais.
          </p>
        </div>
      </div>
      <Link href="/digital" onClick={() => playUiClick()} className="block text-center px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>← Į meniu</Link>
    </div>
  )
}
