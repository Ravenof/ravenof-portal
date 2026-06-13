'use client'

import { useState } from 'react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { DeckCardRow } from './DeckCardRow'
import { CardHoverPreview } from './CardHoverPreview'
import { DECK_MIN, DECK_MAX, SIDE_DECK_MAX } from '@/lib/deck-validation'
import { pluralLt } from '@/lib/lt-plural'
import { Swords, Trash2 } from 'lucide-react'
import type { CardWithRelations } from '@/types'
import { RavenofButton } from '@/components/ui/RavenofButton'

const TYPE_ORDER = ['Čempionas', 'Padaras', 'Burtas', 'Artefaktas', 'Prakeiksmas', 'Reakcija', 'Laukas']

function getTypeOrder(typeName: string | undefined): number {
  const idx = TYPE_ORDER.indexOf(typeName ?? '')
  return idx >= 0 ? idx : TYPE_ORDER.length
}

export function DeckListPanel() {
  const { entries, sideEntries, totalCards, factionId, clearDeck } = useDeckBuilderStore()
  const [confirmClear, setConfirmClear] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<CardWithRelations | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const total = totalCards()

  const pct = Math.min(100, (total / DECK_MIN) * 100)
  const overMax = total > DECK_MAX
  const isComplete = total >= DECK_MIN && !overMax

  // Group entries by card type
  const groupMap: Record<string, typeof entries> = {}
  for (const entry of entries) {
    const typeName = entry.card.card_type?.name ?? 'Kita'
    if (!groupMap[typeName]) groupMap[typeName] = []
    groupMap[typeName].push(entry)
  }

  // Sort within each group by gold cost then name
  for (const type in groupMap) {
    groupMap[type].sort((a, b) => {
      const gA = a.card.gold_cost ?? 0
      const gB = b.card.gold_cost ?? 0
      if (gA !== gB) return gA - gB
      return a.card.name.localeCompare(b.card.name)
    })
  }

  const groupKeys = Object.keys(groupMap).sort((a, b) => getTypeOrder(a) - getTypeOrder(b))

  const handleClear = () => {
    clearDeck()
    setConfirmClear(false)
  }

  const barColor = overMax ? '#ef4444' : isComplete ? '#22c55e' : 'var(--gold)'
  const countColor = overMax ? '#ef4444' : isComplete ? '#22c55e' : 'var(--text-muted)'

  return (
    <div className="flex flex-col h-full" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
      <CardHoverPreview card={hoveredCard} x={mousePos.x} y={mousePos.y} />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          <span className="font-semibold text-sm" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Kaladės kortos
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tabular-nums" style={{ color: countColor }}>
            {total}/{DECK_MAX} <span style={{ fontWeight: 400, opacity: 0.55 }}>(min. {DECK_MIN})</span>
          </span>

          {total > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-1">
                <RavenofButton variant="danger" size="sm" onClick={handleClear}>
                  Išvalyti
                </RavenofButton>
                <RavenofButton variant="secondary" size="sm" onClick={() => setConfirmClear(false)}>
                  Ne
                </RavenofButton>
              </div>
            ) : (
              <button onClick={() => setConfirmClear(true)}
                className="p-1 rounded transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
                title="Išvalyti kaladę">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: barColor }} />
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-3">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-40">
            <Swords className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              {factionId ? 'Pridėk kortų į kaladę' : 'Pasirink frakciją'}
            </p>
          </div>
        ) : (
          groupKeys.map((type) => {
            const group = groupMap[type]
            const groupTotal = group.reduce((s, e) => s + e.quantity, 0)
            return (
              <div key={type}>
                <div className="flex items-center justify-between px-1 mb-1"
                  style={{ borderBottom: '1px solid var(--bg-border)', paddingBottom: '3px' }}>
                  <span className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                    {type}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                    {groupTotal}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.map((entry) => (
                    <DeckCardRow key={entry.card.id} entry={entry} onHover={setHoveredCard} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Prakeiksmų side deck (Demonai) */}
      {sideEntries.length > 0 && (
        <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--bg-border)' }}>
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#a855f7', fontSize: '10px' }}>
              🕸 Prakeiksmų side deck
            </span>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              {sideEntries.reduce((s, e) => s + e.quantity, 0)}/{SIDE_DECK_MAX}
            </span>
          </div>
          <div className="space-y-0.5">
            {sideEntries
              .slice()
              .sort((a, b) => (a.card.gold_cost ?? 0) - (b.card.gold_cost ?? 0) || a.card.name.localeCompare(b.card.name))
              .map((entry) => (
                <DeckCardRow key={entry.card.id} entry={entry} onHover={setHoveredCard} isSide />
              ))}
          </div>
        </div>
      )}

      {/* Footer hint */}
      {total > 0 && total < DECK_MIN && (
        <p className="text-xs text-center mt-2 pt-2" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--bg-border)' }}>
          Dar reikia {DECK_MIN - total} {pluralLt(DECK_MIN - total, ['kortos', 'kortų', 'kortų'])}
        </p>
      )}
      {isComplete && (
        <p className="text-xs text-center mt-2 pt-2 font-medium" style={{ color: '#22c55e', borderTop: '1px solid var(--bg-border)' }}>
          ✓ Kaladė pilna
        </p>
      )}
    </div>
  )
}
