'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { getCopyLimit } from '@/lib/deck-validation'
import { getRarityColor } from '@/lib/utils'
import type { DeckEntry, CardWithRelations } from '@/types'

type Props = {
  entry: DeckEntry
  onHover?: (card: CardWithRelations | null) => void
}

export function DeckCardRow({ entry, onHover }: Props) {
  const { addCard, removeCard, setQuantity } = useDeckBuilderStore()
  const { card, quantity } = entry
  const limit = getCopyLimit(card)
  const rarityColor = getRarityColor(card.rarity?.name)

  const qtyColor = quantity >= limit ? 'var(--gold)' : 'var(--text-primary)'

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg group transition-colors"
      style={{ background: 'var(--bg-elevated)' }}
      onMouseEnter={() => onHover?.(card)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Rarity dot */}
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rarityColor }} />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }} title={card.name}>
          {card.name}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {card.gold_cost}⚜ · {card.card_type?.name}
        </p>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => setQuantity(card.id, quantity - 1)}
          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
          style={{ color: 'var(--text-muted)' }}
        >
          <Minus className="w-3 h-3" />
        </button>

        <span className="w-5 text-center text-xs font-bold tabular-nums" style={{ color: qtyColor }}>
          {quantity}
        </span>

        <button
          onClick={() => addCard(card)}
          disabled={quantity >= limit}
          className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-green-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-muted)' }}
        >
          <Plus className="w-3 h-3" />
        </button>

        <span className="text-xs w-6 text-right" style={{ color: 'var(--text-muted)' }}>
          /{limit}
        </span>

        <button
          onClick={() => removeCard(card.id)}
          className="w-5 h-5 rounded flex items-center justify-center transition-all hover:bg-red-500/20"
          style={{ color: '#ef4444', opacity: 0.6 }}
          title="Išimti iš kaladės"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
