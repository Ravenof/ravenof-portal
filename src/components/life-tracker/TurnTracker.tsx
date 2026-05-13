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
        background: 'linear-gradient(180deg,#13100a 0%,#0a0a0f 100%)',
        border: '1px solid rgba(212,175,55,0.18)',
      }}
    >
      {/* Top row: Round + Active + Gold */}
      <div className="flex items-center gap-4">
        {/* Round */}
        <div className="flex-shrink-0 text-center">
          <p
            className="text-xs uppercase tracking-widest mb-0.5"
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

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(212,175,55,0.12)' }} />

        {/* Active player */}
        <div className="flex-1 min-w-0">
          <p
            className="text-xs uppercase tracking-widest mb-0.5"
            style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            Eile
          </p>
          <p
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text-primary)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            {activeName}
          </p>
        </div>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(212,175,55,0.12)' }} />

        {/* Gold section */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {onGoldAdjust && (
            <LTButton
              variant="damage"
              size="xs"
              onClick={() => onGoldAdjust(-100)}
              aria-label="Atimti 100 aukso"
              style={{ minWidth: 30, padding: '4px 8px' }}
            >
              &minus;
            </LTButton>
          )}
          <div className="text-center min-w-[4rem]">
            <p
              className="text-xs uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Auksas
            </p>
            <p
              className="text-2xl font-bold leading-tight tabular-nums"
              style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              {gold}
            </p>
          </div>
          {onGoldAdjust && (
            <LTButton
              variant="heal"
              size="xs"
              onClick={() => onGoldAdjust(100)}
              aria-label="Prideti 100 aukso"
              style={{ minWidth: 30, padding: '4px 8px' }}
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
          aria-label="Atstatyti rata i 1"
        >
          Atstatyti rata
        </LTButton>
        <LTButton
          variant="primary"
          size="sm"
          fullWidth
          onClick={onNextTurn}
        >
          Kitas ejimas &rarr;
        </LTButton>
      </div>
    </div>
  )
}
