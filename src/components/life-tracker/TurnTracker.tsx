'use client'

type Props = {
  round: number
  gold: number
  activeName: string
  onNextTurn: () => void
  onResetTurn: () => void
}

export function TurnTracker({ round, gold, activeName, onNextTurn, onResetTurn }: Props) {
  return (
    <div
      className="rounded-xl px-5 py-4 space-y-3"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
    >
      {/* Top row: Round + Gold + Active */}
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            Ratas
          </p>
          <p
            className="text-3xl font-bold leading-tight"
            style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            {round}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            Eilė
          </p>
          <p
            className="text-sm font-semibold truncate mt-0.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {activeName}
          </p>
        </div>

        <div className="flex-1 min-w-0 text-right">
          <p
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            Auksas
          </p>
          <p
            className="text-2xl font-bold leading-tight"
            style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            {gold}
          </p>
        </div>
      </div>

      {/* Bottom row: buttons */}
      <div className="flex gap-2">
        <button
          onClick={onResetTurn}
          className="px-3 py-2.5 rounded-lg text-xs transition hover:opacity-80 flex-shrink-0 min-h-[44px]"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-muted)',
            border: '1px solid var(--bg-border)',
          }}
          aria-label="Atstatyti ratą į 1"
        >
          Atstatyti ratą
        </button>
        <button
          onClick={onNextTurn}
          className="flex-1 py-2.5 rounded-lg text-sm font-bold transition hover:opacity-90 active:scale-95 min-h-[44px]"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}
        >
          Kitas ėjimas &rarr;
        </button>
      </div>
    </div>
  )
}
