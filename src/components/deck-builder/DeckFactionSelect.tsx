'use client'

import type { Faction } from '@/types'
import { NEUTRAL_FACTION_ID } from '@/lib/deck-validation'

type Props = {
  factions: Faction[]
  selected: number | null
  onChange: (id: number | null) => void
  disabled?: boolean
}

export function DeckFactionSelect({ factions, selected, onChange, disabled }: Props) {
  // Only factions with cards + always show "Universalus" option
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Deck frakcija
      </p>
      <div className="flex flex-wrap gap-2">
        {factions.map((f) => {
          const isSelected = selected === f.id
          const isNeutral = f.id === NEUTRAL_FACTION_ID
          if (isNeutral) return null // Neutral is not a selectable deck faction
          return (
            <button
              key={f.id}
              disabled={disabled}
              onClick={() => onChange(isSelected ? null : f.id)}
              title={f.name}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-40"
              style={{
                background: isSelected ? `${f.color_hex}30` : 'var(--bg-elevated)',
                border: `1.5px solid ${isSelected ? f.color_hex : 'var(--bg-border)'}`,
                color: isSelected ? f.color_hex : 'var(--text-secondary)',
                boxShadow: isSelected ? `0 0 10px ${f.color_hex}40` : 'none',
              }}
            >
              {f.name}
            </button>
          )
        })}
      </div>
      {selected && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Rodomi: <strong style={{ color: 'var(--gold)' }}>
            {factions.find((f) => f.id === selected)?.name}
          </strong> + Universalus kortos
        </p>
      )}
    </div>
  )
}
