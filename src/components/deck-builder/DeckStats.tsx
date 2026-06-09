'use client'

import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { GoldCurveChart } from './GoldCurveChart'
import { getRarityColor } from '@/lib/utils'

export function DeckStats() {
  const { entries, totalCards, avgGold } = useDeckBuilderStore()
  const total = totalCards()
  const avg = avgGold()

  // Rarity distribution
  const rarityMap: Record<string, number> = {}
  const typeMap: Record<string, number> = {}

  for (const e of entries) {
    const r = e.card.rarity?.name ?? 'Nežinoma'
    rarityMap[r] = (rarityMap[r] ?? 0) + e.quantity
    const t = e.card.card_type?.name ?? 'Nežinoma'
    typeMap[t] = (typeMap[t] ?? 0) + e.quantity
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <StatBox label="Kortų" value={total} gold={total >= 30} />
        <StatBox label="Vid. auksas" value={avg ? `${avg}⚜` : '—'} />
      </div>

      {/* Gold curve */}
      <GoldCurveChart entries={entries} />

      {/* Rarity */}
      {Object.keys(rarityMap).length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Retumas</p>
          <div className="space-y-1">
            {Object.entries(rarityMap).map(([name, cnt]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getRarityColor(name) }} />
                <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>{name}</span>
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type distribution */}
      {Object.keys(typeMap).length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Tipai</p>
          <div className="space-y-1">
            {Object.entries(typeMap).sort((a, b) => b[1] - a[1]).map(([name, cnt]) => (
              <div key={name} className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (cnt / total) * 100)}%`, background: 'var(--gold)', opacity: 0.6 }}
                  />
                </div>
                <span className="text-xs w-20 truncate" style={{ color: 'var(--text-secondary)' }}>{name}</span>
                <span className="text-xs tabular-nums w-4" style={{ color: 'var(--text-muted)' }}>{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, gold }: { label: string; value: string | number; gold?: boolean }) {
  return (
    <div
      className="rounded-lg p-2 text-center"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
    >
      <p className="text-lg font-bold" style={{ color: gold ? '#22c55e' : 'var(--gold)' }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}
