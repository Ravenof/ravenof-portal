'use client'

type Props = {
  turn: number
  activeName: string
  onNextTurn: () => void
  onResetTurn: () => void
}

export function TurnTracker({ turn, activeName, onNextTurn, onResetTurn }: Props) {
  return (
    <div
      className="rounded-xl px-5 py-4 flex items-center gap-4"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-xs uppercase tracking-wider"
          style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
        >
          Ejimas
        </p>
        <p
          className="text-3xl font-bold leading-tight"
          style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}
        >
          {turn}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-xs uppercase tracking-wider"
          style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
        >
          Aktyvus
        </p>
        <p
          className="text-sm font-semibold truncate mt-0.5"
          style={{ color: 'var(--text-primary)' }}
        >
          {activeName}
        </p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onResetTurn}
          className="px-3 py-2 rounded-lg text-xs transition hover:opacity-80"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-muted)',
            border: '1px solid var(--bg-border)',
          }}
        >
          Reset
        </button>
        <button
          onClick={onNextTurn}
          className="px-4 py-2 rounded-lg text-sm font-bold transition hover:opacity-90 active:scale-95"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}
        >
          Next &rarr;
        </button>
      </div>
    </div>
  )
}
