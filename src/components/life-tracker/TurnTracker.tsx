'use client'

import { LTButton } from './LTButton'

type Props = {
  round: number
  gold: number
  activeName: string
  onNextTurn: () => void
  onResetTurn: () => void
  onGoldAdjust?: (delta: number) => void
}

export function TurnTracker({ round, gold, activeName, onNextTurn, onResetTurn, onGoldAdjust }: Props) {
  return (
    <div
      className="rounded-xl px-5 py-4 space-y-3"
      style={{
        background: 'linear-gradient(180deg,#17120a 0%,#0a0800 100%)',
        borderTop: '1.5px solid rgba(212,175,55,0.28)',
        borderRight: '1.5px solid rgba(212,175,55,0.12)',
        borderBottom: '1.5px solid rgba(90,62,8,0.6)',
        borderLeft: '1.5px solid rgba(212,175,55,0.12)',
        boxShadow: '0 4px 16px rgba(0,0,0,.6), inset 0 1px 0 rgba(232,200,74,.08)',
      }}
    >
      {/* Top row: Ratas | Žaidžia | Auksas */}
      <div className="flex items-center gap-3">
        {/* Ratas */}
        <div className="flex-shrink-0 text-center min-w-[3rem]">
          <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
            Ratas
          </p>
          <p className="text-3xl font-bold leading-tight" style={{ color: '#d4af37', fontFamily: 'Cinzel, Georgia, serif', textShadow: '0 0 12px rgba(212,175,55,.35)' }}>
            {round}
          </p>
        </div>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.22), transparent)' }} />

        {/* Žaidžia */}
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
            Žaidžia
          </p>
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Cinzel, Georgia, serif' }}>
            {activeName}
          </p>
        </div>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.22), transparent)' }} />

        {/* Auksas */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {onGoldAdjust && (
            <LTButton
              variant="damage"
              size="xs"
              onClick={() => onGoldAdjust(-100)}
              aria-label="Atimti 100 aukso"
              style={{ minWidth: 28, padding: '3px 7px' }}
            >
              −
            </LTButton>
          )}
          <div className="text-center min-w-[4rem]">
            <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
              Auksas
            </p>
            <p className="text-2xl font-bold leading-tight tabular-nums" style={{ color: '#d4af37', fontFamily: 'Cinzel, Georgia, serif', textShadow: '0 0 10px rgba(212,175,55,.3)' }}>
              {gold}
            </p>
          </div>
          {onGoldAdjust && (
            <LTButton
              variant="heal"
              size="xs"
              onClick={() => onGoldAdjust(100)}
              aria-label="Pridėti 100 aukso"
              style={{ minWidth: 28, padding: '3px 7px' }}
            >
              +
            </LTButton>
          )}
        </div>
      </div>

      {/* Bottom row: action buttons */}
      <div className="flex gap-2">
        <LTButton
          variant="muted"
          size="sm"
          onClick={onResetTurn}
          aria-label="Atstatyti ratą į 1"
        >
          Atstatyti ratą
        </LTButton>
        <LTButton
          variant="primary"
          size="sm"
          fullWidth
          onClick={onNextTurn}
        >
          Kitas ėjimas →
        </LTButton>
      </div>
    </div>
  )
}
