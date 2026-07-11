'use client'

// ── Bendra krovimo būsena su timeout → retry (jokio amžino „Kraunama…") ──────
import { playUiClick } from '@/lib/ui-sound'

export function LoadingOrRetry({ timedOut, onRetry, label = 'Kraunama…' }: {
  timedOut: boolean
  onRetry: () => void
  label?: string
}) {
  if (!timedOut) {
    return <p className="text-center text-sm py-16" role="status" style={{ color: 'var(--text-muted)' }}>{label}</p>
  }
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2.5 text-center px-6 py-10">
      <span style={{ fontSize: 30 }}>🕯</span>
      <p className="font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', fontSize: 14 }}>Užtruko per ilgai</p>
      <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Patikrink interneto ryšį ir bandyk dar kartą.</p>
      <button onClick={() => { playUiClick(); onRetry() }} className="rvn-press px-6 py-2 rounded-xl text-sm font-bold"
        style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
        ↻ Bandyti dar kartą
      </button>
    </div>
  )
}
