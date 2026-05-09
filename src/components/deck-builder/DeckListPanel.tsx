'use client'

import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { DeckCardRow } from './DeckCardRow'
import { DECK_MIN, DECK_MAX } from '@/lib/deck-validation'
import { Swords } from 'lucide-react'

export function DeckListPanel() {
  const { entries, totalCards, factionId } = useDeckBuilderStore()
  const total = totalCards()

  const sorted = [...entries].sort((a, b) => {
    const goldA = a.card.gold_cost ?? 0
    const goldB = b.card.gold_cost ?? 0
    if (goldA !== goldB) return goldA - goldB
    return a.card.name.localeCompare(b.card.name)
  })

  const pct = Math.min(100, (total / DECK_MIN) * 100)
  const overMax = total > DECK_MAX

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          <span className="font-semibold text-sm" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Deck sąrašas
          </span>
        </div>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: overMax ? '#ef4444' : total >= DECK_MIN ? '#22c55e' : 'var(--text-muted)' }}
        >
          {total}/{DECK_MAX}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: overMax ? '#ef4444' : total >= DECK_MIN ? '#22c55e' : 'var(--gold)',
          }}
        />
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-40">
            <Swords className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              {factionId ? 'Pridėk kortų į deck' : 'Pasirink frakciją'}
            </p>
          </div>
        ) : (
          sorted.map((entry) => (
            <DeckCardRow key={entry.card.id} entry={entry} />
          ))
        )}
      </div>

      {/* Footer hint */}
      {total > 0 && total < DECK_MIN && (
        <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
          Reikia dar {DECK_MIN - total} kortų
        </p>
      )}
    </div>
  )
}
