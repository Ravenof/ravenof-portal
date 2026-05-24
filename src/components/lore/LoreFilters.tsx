'use client'

import type { LoreFaction } from '@/data/lore'

type Props = {
  factions: LoreFaction[]
  activeFactionId: string | null
  onChange: (id: string | null) => void
  visibleCount: number
  totalCount: number
}

export function LoreFilters({ factions, activeFactionId, onChange, visibleCount, totalCount }: Props) {
  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      style={{
        background:     'rgba(7,7,15,0.9)',
        border:         '1px solid var(--bg-border)',
        backdropFilter: 'blur(12px)',
        borderRadius:   '0.75rem',
        padding:        '0.5rem 0.75rem',
      }}
    >
      {/* Label */}
      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
        Frakcija
      </span>

      {/* All button */}
      <button
        onClick={() => onChange(null)}
        className="px-2.5 py-1 rounded-lg text-xs transition-all duration-150"
        style={{
          background:  activeFactionId === null ? 'rgba(212,175,55,0.18)' : 'var(--bg-elevated)',
          border:      '1px solid ' + (activeFactionId === null ? 'rgba(212,175,55,0.5)' : 'var(--bg-border)'),
          color:       activeFactionId === null ? 'var(--gold)' : 'var(--text-muted)',
          fontFamily:  'var(--rvn-font-display)',
          letterSpacing: '0.04em',
          fontWeight:  activeFactionId === null ? 600 : 400,
        }}
      >
        Visos
      </button>

      {/* Faction buttons */}
      {factions.map((f) => {
        const isActive = activeFactionId === f.id
        return (
          <button
            key={f.id}
            onClick={() => onChange(isActive ? null : f.id)}
            className="px-2.5 py-1 rounded-lg text-xs transition-all duration-150 flex items-center gap-1.5"
            style={{
              background:  isActive ? f.color + '22' : 'var(--bg-elevated)',
              border:      '1px solid ' + (isActive ? f.color + '55' : 'var(--bg-border)'),
              color:       isActive ? f.color : 'var(--text-muted)',
              fontFamily:  'var(--rvn-font-display)',
              letterSpacing: '0.03em',
              fontWeight:  isActive ? 600 : 400,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.color }} />
            {f.name}
          </button>
        )
      })}

      {/* Count badge */}
      <span
        className="ml-auto text-xs px-2 py-0.5 rounded-full shrink-0"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)', fontFamily: 'monospace' }}
      >
        {visibleCount}/{totalCount}
      </span>
    </div>
  )
}
