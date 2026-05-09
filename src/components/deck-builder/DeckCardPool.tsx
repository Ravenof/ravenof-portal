'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, Check } from 'lucide-react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { canAddCard, getCopyLimit, NEUTRAL_FACTION_ID } from '@/lib/deck-validation'
import { getFactionColor, getRarityColor } from '@/lib/utils'
import type { CardWithRelations, CollectionMap } from '@/types'

type Props = {
  cards: CardWithRelations[]
  collection: CollectionMap
}

export function DeckCardPool({ cards, collection }: Props) {
  const { factionId, entries, addCard, ownedOnly } = useDeckBuilderStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = useMemo(() => {
    let pool = cards

    // Faction filter
    if (factionId !== null) {
      pool = pool.filter(
        (c) => c.faction_id === factionId || c.faction_id === NEUTRAL_FACTION_ID
      )
    }

    // Owned only
    if (ownedOnly) {
      pool = pool.filter((c) => (collection[c.id] ?? 0) > 0)
    }

    // Search
    if (search.trim()) {
      const s = search.toLowerCase()
      pool = pool.filter((c) => c.name.toLowerCase().includes(s))
    }

    // Type filter
    if (typeFilter) {
      pool = pool.filter((c) => c.card_type?.name === typeFilter)
    }

    return pool
  }, [cards, factionId, ownedOnly, collection, search, typeFilter])

  // Unique card types from current pool (before type filter)
  const cardTypes = useMemo(() => {
    const pool = factionId
      ? cards.filter((c) => c.faction_id === factionId || c.faction_id === NEUTRAL_FACTION_ID)
      : cards
    const types = new Set(pool.map((c) => c.card_type?.name).filter(Boolean))
    return [...types].sort()
  }, [cards, factionId])

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--bg-border)',
    color: 'var(--text-primary)',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
  }

  if (!factionId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-50">
        <p className="text-lg" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-muted)' }}>
          Pasirink frakciją
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Pasirink frakciją aukščiau, kad matytum kortų baseiną
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Filters row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Ieškoti kortų..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5"
            style={inputStyle}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-2 py-1.5 rounded-lg text-sm"
          style={inputStyle}
        >
          <option value="">Visi tipai</option>
          {cardTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {filtered.length} kortų
      </p>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-1">
          {filtered.map((card) => {
            const existing = entries.find((e) => e.card.id === card.id)
            const qty = existing?.quantity ?? 0
            const limit = getCopyLimit(card)
            const result = canAddCard(card, entries, factionId)
            const atLimit = qty >= limit
            const fColor = getFactionColor(card.faction?.color_hex)
            const rColor = getRarityColor(card.rarity?.name)
            const owned = collection[card.id] ?? 0

            return (
              <div
                key={card.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group"
                style={{
                  background: qty > 0 ? `${fColor}10` : 'var(--bg-elevated)',
                  border: `1px solid ${qty > 0 ? fColor + '30' : 'transparent'}`,
                }}
                onClick={() => addCard(card)}
              >
                {/* Rarity dot */}
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rColor }} />

                {/* Name + type */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {card.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {card.gold_cost}⚜ · {card.card_type?.name} · {card.rarity?.name}
                    {owned > 0 && <span className="ml-1 text-green-400">✓ {owned}</span>}
                  </p>
                </div>

                {/* Qty indicator */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {qty > 0 && (
                    <span
                      className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded"
                      style={{ background: fColor + '30', color: fColor }}
                    >
                      {qty}/{limit}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); addCard(card) }}
                    disabled={atLimit || !result.ok}
                    className="w-6 h-6 rounded flex items-center justify-center transition-colors disabled:opacity-20"
                    style={{
                      background: atLimit ? 'transparent' : 'var(--bg-border)',
                      color: 'var(--text-muted)',
                    }}
                    title={result.reason}
                  >
                    {atLimit ? <Check className="w-3 h-3" style={{ color: 'var(--gold)' }} /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 opacity-40">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Kortų nerasta</p>
          </div>
        )}
      </div>
    </div>
  )
}
