'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, Check } from 'lucide-react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { canAddCard, getCopyLimit, NEUTRAL_FACTION_ID } from '@/lib/deck-validation'
import { getFactionColor, getRarityColor } from '@/lib/utils'
import { CardHoverPreview } from './CardHoverPreview'
import type { CardWithRelations, CollectionMap } from '@/types'

type Props = {
  cards: CardWithRelations[]
  collection: CollectionMap
}

const GOLD_OPTIONS = [
  { label: 'Visi kainai', min: -1, max: -1 },
  { label: '0–2 ⚜', min: 0, max: 2 },
  { label: '3–4 ⚜', min: 3, max: 4 },
  { label: '5–6 ⚜', min: 5, max: 6 },
  { label: '7+ ⚜',  min: 7, max: 999 },
]

function CardRow({
  card,
  collection,
  onHover,
}: {
  card: CardWithRelations
  collection: CollectionMap
  onHover: (c: CardWithRelations | null) => void
}) {
  const { entries, addCard, factionId } = useDeckBuilderStore()
  const existing = entries.find((e) => e.card.id === card.id)
  const qty = existing?.quantity ?? 0
  const limit = getCopyLimit(card)
  const result = canAddCard(card, entries, factionId)
  const atLimit = qty >= limit
  const fColor = getFactionColor(card.faction?.color_hex)
  const rColor = getRarityColor(card.rarity?.name)
  const owned = collection[card.id] ?? 0
  const isUniversal = card.faction_id === NEUTRAL_FACTION_ID

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group"
      style={{
        background: qty > 0 ? `${fColor}10` : 'var(--bg-elevated)',
        border: `1px solid ${qty > 0 ? fColor + '30' : isUniversal ? 'rgba(212,175,55,0.15)' : 'transparent'}`,
      }}
      onClick={() => addCard(card)}
      onMouseEnter={() => onHover(card)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {card.name}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {card.gold_cost}⚜ · {card.card_type?.name} · {card.rarity?.name}
          {owned > 0 && <span className="ml-1 text-green-400">✓{owned}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {qty > 0 && (
          <span className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{ background: fColor + '30', color: fColor }}>
            {qty}/{limit}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); addCard(card) }}
          disabled={atLimit || !result.ok}
          className="w-6 h-6 rounded flex items-center justify-center transition-colors disabled:opacity-20"
          style={{ background: atLimit ? 'transparent' : 'var(--bg-border)', color: 'var(--text-muted)' }}
          title={result.reason}
        >
          {atLimit
            ? <Check className="w-3 h-3" style={{ color: 'var(--gold)' }} />
            : <Plus className="w-3 h-3" />}
        </button>
      </div>
    </div>
  )
}

export function DeckCardPool({ cards, collection }: Props) {
  const { factionId, ownedOnly } = useDeckBuilderStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [goldRange, setGoldRange] = useState(0) // index into GOLD_OPTIONS
  const [showUniversal, setShowUniversal] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<CardWithRelations | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Unique card types for the selected faction (excl. universal)
  const cardTypes = useMemo(() => {
    const pool = factionId
      ? cards.filter((c) => c.faction_id === factionId)
      : cards
    const types = new Set(pool.map((c) => c.card_type?.name).filter(Boolean))
    return [...types].sort()
  }, [cards, factionId])

  // Unique rarities
  const rarities = useMemo(() => {
    const pool = factionId
      ? cards.filter((c) => c.faction_id === factionId || c.faction_id === NEUTRAL_FACTION_ID)
      : cards
    const map = new Map<string, string>()
    pool.forEach((c) => { if (c.rarity?.name) map.set(c.rarity.name, c.rarity.name) })
    return [...map.keys()].sort()
  }, [cards, factionId])

  const goldOpt = GOLD_OPTIONS[goldRange]

  function applyFilters(pool: CardWithRelations[]) {
    let result = pool

    if (ownedOnly) result = result.filter((c) => (collection[c.id] ?? 0) > 0)

    if (search.trim()) {
      const s = search.toLowerCase()
      result = result.filter((c) =>
        c.name.toLowerCase().includes(s) ||
        (c.effect_text ?? '').toLowerCase().includes(s) ||
        (c.description ?? '').toLowerCase().includes(s) ||
        (c.card_number ?? '').toLowerCase().includes(s)
      )
    }

    if (typeFilter) result = result.filter((c) => c.card_type?.name === typeFilter)
    if (rarityFilter) result = result.filter((c) => c.rarity?.name === rarityFilter)

    if (goldOpt.min >= 0) {
      result = result.filter((c) => {
        const g = c.gold_cost ?? 0
        return g >= goldOpt.min && g <= goldOpt.max
      })
    }

    return result
  }

  const { factionCards, universalCards } = useMemo(() => {
    if (factionId === null) return { factionCards: [], universalCards: [] }

    const fPool = cards.filter((c) => c.faction_id === factionId)
    const uPool = cards.filter((c) => c.faction_id === NEUTRAL_FACTION_ID)

    return {
      factionCards: applyFilters(fPool),
      universalCards: showUniversal ? applyFilters(uPool) : [],
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, factionId, ownedOnly, search, typeFilter, rarityFilter, goldRange, showUniversal, collection])

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--bg-border)',
    color: 'var(--text-primary)',
    borderRadius: '0.5rem',
    fontSize: '0.75rem',
    outline: 'none',
    padding: '0.375rem 0.5rem',
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

  const totalShown = factionCards.length + universalCards.length

  return (
    <div className="flex flex-col h-full gap-2" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
      <CardHoverPreview card={hoveredCard} x={mousePos.x} y={mousePos.y} />

      {/* Row 1: Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Ieškoti kortų (pavadinimas, efektas, aprašymas)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm"
          style={{ ...inputStyle, fontSize: '0.8rem' }}
        />
      </div>

      {/* Row 2: Filters */}
      <div className="flex gap-1.5 flex-wrap">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
          <option value="">Visi tipai</option>
          {cardTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={inputStyle}>
          <option value="">Visos retybės</option>
          {rarities.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={goldRange} onChange={(e) => setGoldRange(Number(e.target.value))} style={inputStyle}>
          {GOLD_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
        </select>

        {(search || typeFilter || rarityFilter || goldRange > 0) && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setRarityFilter(''); setGoldRange(0) }}
            className="rounded hover:opacity-80 transition"
            style={{ ...inputStyle, color: 'var(--text-muted)' }}
          >
            ✕ Išvalyti
          </button>
        )}
      </div>

      {/* Row 3: Universal toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {totalShown} kortų
        </p>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Universalios kortos
          </span>
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={showUniversal}
              onChange={(e) => setShowUniversal(e.target.checked)} />
            <div className="w-8 h-4 rounded-full transition-colors"
              style={{ background: showUniversal ? 'var(--gold)' : 'var(--bg-border)' }} />
            <div className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform"
              style={{ transform: showUniversal ? 'translateX(16px)' : 'none' }} />
          </div>
        </label>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-1">
          {/* Faction cards */}
          {factionCards.map((card) => (
            <CardRow key={card.id} card={card} collection={collection} onHover={setHoveredCard} />
          ))}

          {/* Universal section */}
          {showUniversal && (
            <>
              <div
                className="flex items-center gap-2 px-1 mt-2 mb-1"
                style={{ borderBottom: '1px solid rgba(212,175,55,0.3)', paddingBottom: '4px' }}
              >
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--gold)', fontSize: '10px' }}
                >
                  ⚜ Universalios kortos
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  {universalCards.length}
                </span>
              </div>
              {universalCards.length === 0 ? (
                <p className="text-xs text-center py-3 opacity-40" style={{ color: 'var(--text-muted)' }}>
                  Universalių kortų nerasta
                </p>
              ) : (
                universalCards.map((card) => (
                  <CardRow key={card.id} card={card} collection={collection} onHover={setHoveredCard} />
                ))
              )}
            </>
          )}

          {totalShown === 0 && (
            <div className="text-center py-8 opacity-40">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Kortų nerasta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
