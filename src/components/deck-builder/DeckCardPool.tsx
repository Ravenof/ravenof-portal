'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, Plus, Check, Eye, X, Sword, Heart, Coins, SlidersHorizontal } from 'lucide-react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { canAddCard, canAddSideCard, isCurseCard, getCopyLimit, NEUTRAL_FACTION_ID } from '@/lib/deck-validation'
import { getFactionColor, getRarityColor } from '@/lib/utils'
import { pluralLt } from '@/lib/lt-plural'
import { CardHoverPreview } from './CardHoverPreview'
import { playCardFlip } from '@/lib/ui-sound'
import type { CardWithRelations, CollectionMap } from '@/types'

type Props = {
  cards: CardWithRelations[]
  collection: CollectionMap
}

const GOLD_COSTS = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
const TYPE_ORDER = ['Čempionas', 'Padaras', 'Burtas', 'Artefaktas', 'Prakeiksmas', 'Reakcija', 'Laukas']
function typeRank(t: string | undefined) { const i = TYPE_ORDER.indexOf(t ?? ''); return i >= 0 ? i : TYPE_ORDER.length }

// ─── Pill helpers ─────────────────────────────────────────────────────────────

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-150 whitespace-nowrap"
      style={
        active
          ? {
              background:
                'linear-gradient(135deg, rgba(124,58,237,0.28) 0%, rgba(240,180,41,0.12) 100%)',
              color: 'var(--gold)',
              border: '1px solid rgba(240,180,41,0.5)',
              boxShadow: '0 0 8px rgba(240,180,41,0.08)',
              fontFamily: 'var(--rvn-font-display)',
              letterSpacing: '0.03em',
            }
          : {
              background: 'var(--bg-elevated)',
              color: 'var(--text-muted)',
              border: '1px solid var(--bg-border)',
              fontFamily: 'var(--rvn-font-display)',
              letterSpacing: '0.03em',
            }
      }
    >
      {children}
    </button>
  )
}

function PillRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }}
    >
      {children}
    </div>
  )
}

// ─── Mobile card preview modal ───────────────────────────────────────────────

function CardMobilePreview({
  card,
  onClose,
}: {
  card: CardWithRelations
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const rarityColor  = getRarityColor(card.rarity?.name)
  const factionColor = getFactionColor(card.faction?.color_hex)
  const { entries, sideEntries, addCard, addSideCard, factionId } = useDeckBuilderStore()
  const isCurse = isCurseCard(card)
  const pool = isCurse ? sideEntries : entries
  const existing = pool.find((e) => e.card.id === card.id)
  const qty = existing?.quantity ?? 0
  const limit = getCopyLimit(card)
  const result = isCurse ? canAddSideCard(card, sideEntries) : canAddCard(card, entries, factionId)
  const atLimit = qty >= limit
  const addToDeck = () => (isCurse ? addSideCard(card) : addCard(card))

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-y-auto"
        style={{ background: 'var(--bg-elevated)', border: '2px solid ' + rarityColor, maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>

        {card.image_url ? (
          <img src={card.image_url} alt={card.name} style={{ width: '100%', height: 'auto', display: 'block' }} />
        ) : (
          <div
            style={{
              width: '100%', height: '140px',
              background: 'linear-gradient(160deg, ' + factionColor + '22 0%, #0a0a1a 60%, ' + rarityColor + '18 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '52px', opacity: 0.35,
            }}
          >
            ⚔
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-base font-bold leading-tight" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>
              {card.name}
            </h3>
            {card.gold_cost != null && (
              <span className="flex-shrink-0 flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--gold)', border: '1px solid rgba(245,158,11,0.4)' }}>
                <Coins className="w-3.5 h-3.5" />{card.gold_cost}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {card.faction && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: factionColor + '25', color: factionColor, border: '1px solid ' + factionColor + '40' }}>
                {card.faction.name}
              </span>
            )}
            {card.card_type && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                {card.card_type.name}
              </span>
            )}
            {card.rarity && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: rarityColor + '22', color: rarityColor }}>
                {card.rarity.name}
              </span>
            )}
          </div>

          {(card.attack != null || card.health != null) && (
            <div className="flex gap-4 mb-3">
              {card.attack != null && (
                <span className="flex items-center gap-1 text-sm font-bold text-red-400">
                  <Sword className="w-4 h-4" />{card.attack}
                </span>
              )}
              {card.health != null && (
                <span className="flex items-center gap-1 text-sm font-bold text-green-400">
                  <Heart className="w-4 h-4" />{card.health}
                </span>
              )}
            </div>
          )}

          {card.effect_text && (
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {card.effect_text}
            </p>
          )}

          {card.description && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {card.description}
            </p>
          )}
        </div>

        <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--bg-border)' }}>
          <button
            onClick={() => { addToDeck(); onClose() }}
            disabled={atLimit || !result.ok}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-30"
            style={{ background: atLimit ? 'var(--bg-border)' : 'var(--gold)', color: '#0a0a0f' }}
          >
            {atLimit ? `${isCurse ? 'Side deck' : 'Kaladėje'}: ${qty}/${limit}` : result.ok ? `+ Pridėti į ${isCurse ? 'prakeiksmų side deck' : 'kaladę'} (${qty}/${limit})` : result.reason ?? 'Negalima pridėti'}
          </button>
        </div>
      </div>
    </div>
  , document.body)
}

// ─── Card row ─────────────────────────────────────────────────────────────────

function CardRow({
  card,
  collection,
  onHover,
  onPreview,
}: {
  card: CardWithRelations
  collection: CollectionMap
  onHover: (c: CardWithRelations | null) => void
  onPreview: (c: CardWithRelations) => void
}) {
  const { entries, sideEntries, addCard, addSideCard, factionId } = useDeckBuilderStore()
  const isCurse = isCurseCard(card)
  const pool = isCurse ? sideEntries : entries
  const existing = pool.find((e) => e.card.id === card.id)
  const qty = existing?.quantity ?? 0
  const limit = getCopyLimit(card)
  const result = isCurse ? canAddSideCard(card, sideEntries) : canAddCard(card, entries, factionId)
  const atLimit = qty >= limit
  const addToDeck = () => (isCurse ? addSideCard(card) : addCard(card))
  const fColor = getFactionColor(card.faction?.color_hex)
  const rColor = getRarityColor(card.rarity?.name)
  const owned = collection[card.id] ?? 0
  const isUniversal = card.faction_id === NEUTRAL_FACTION_ID

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group"
      style={{
        background: qty > 0 ? fColor + '10' : 'var(--bg-elevated)',
        border: '1px solid ' + (qty > 0 ? fColor + '30' : isUniversal ? 'rgba(212,175,55,0.15)' : 'transparent'),
      }}
      onClick={() => addToDeck()}
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
          onClick={(e) => { e.stopPropagation(); playCardFlip(); onPreview(card) }}
          className="lg:hidden w-6 h-6 rounded flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-border)', color: 'var(--text-muted)' }}
          title="Peržiūrėti kortą"
        >
          <Eye className="w-3 h-3" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); addToDeck() }}
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

// ─── Main component ────────────────────────────────────────────────────────────

export function DeckCardPool({ cards, collection }: Props) {
  const { factionId, ownedOnly } = useDeckBuilderStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [goldCost, setGoldCost] = useState<number | null>(null)
  const [showUniversal, setShowUniversal] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<CardWithRelations | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [previewCard, setPreviewCard] = useState<CardWithRelations | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const cardTypes = useMemo(() => {
    const pool = factionId
      ? cards.filter((c) => c.faction_id === factionId)
      : cards
    const types = new Set(pool.map((c) => c.card_type?.name).filter(Boolean))
    return [...types].sort((a, b) => typeRank(a as string) - typeRank(b as string))
  }, [cards, factionId])

  const rarities = useMemo(() => {
    const pool = factionId
      ? cards.filter((c) => c.faction_id === factionId || c.faction_id === NEUTRAL_FACTION_ID)
      : cards
    const map = new Map<string, string>()
    pool.forEach((c) => { if (c.rarity?.name) map.set(c.rarity.name, c.rarity.name) })
    return [...map.keys()].sort()
  }, [cards, factionId])

  const hasActiveFilters = !!(search || typeFilter || rarityFilter || goldCost !== null)

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
    if (goldCost !== null) result = result.filter((c) => (c.gold_cost ?? 0) === goldCost)

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
  }, [cards, factionId, ownedOnly, search, typeFilter, rarityFilter, goldCost, showUniversal, collection])

  if (!factionId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-50">
        <p className="text-lg" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-muted)' }}>
          Pasirink frakciją
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Pasirink frakciją aukščiau, kad matytų kortų baseiną
        </p>
      </div>
    )
  }

  const totalShown = factionCards.length + universalCards.length

  return (
    <div className="flex flex-col h-full gap-2" onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}>
      <CardHoverPreview card={hoveredCard} x={mousePos.x} y={mousePos.y} />

      {previewCard && (
        <CardMobilePreview card={previewCard} onClose={() => setPreviewCard(null)} />
      )}

      {/* ── Search bar ──────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Ieškoti kortų..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rvn-input w-full"
            style={{ paddingLeft: '2rem', paddingRight: search ? '2rem' : '0.75rem' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter toggle button (mobile: show/hide; desktop: always open) */}
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="lg:hidden flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: (filtersOpen || hasActiveFilters)
              ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(240,180,41,0.1))'
              : 'var(--bg-elevated)',
            color: (filtersOpen || hasActiveFilters) ? 'var(--gold)' : 'var(--text-muted)',
            border: (filtersOpen || hasActiveFilters)
              ? '1px solid rgba(240,180,41,0.4)'
              : '1px solid var(--bg-border)',
            fontFamily: 'var(--rvn-font-display)',
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {hasActiveFilters && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--gold)' }}
            />
          )}
        </button>
      </div>

      {/* ── Filter pills ─────────────────────────────────────────────── */}
      {/* Mobile: collapsible; Desktop (lg+): always visible */}
      <div className={`${filtersOpen ? 'block' : 'hidden'} lg:block space-y-2.5`}>

        {/* Type */}
        <div className="space-y-1">
          <p
            className="text-[10px] uppercase tracking-wider font-semibold px-0.5"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}
          >
            Tipas
          </p>
          <PillRow>
            <Pill active={typeFilter === ''} onClick={() => setTypeFilter('')}>Visi</Pill>
            {cardTypes.map((t) => (
              <Pill key={t} active={typeFilter === t} onClick={() => setTypeFilter(typeFilter === (t as string) ? '' : (t as string))}>
                {t}
              </Pill>
            ))}
          </PillRow>
        </div>

        {/* Rarity */}
        <div className="space-y-1">
          <p
            className="text-[10px] uppercase tracking-wider font-semibold px-0.5"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}
          >
            Retumas
          </p>
          <PillRow>
            <Pill active={rarityFilter === ''} onClick={() => setRarityFilter('')}>Visi retumai</Pill>
            {rarities.map((r) => (
              <Pill key={r} active={rarityFilter === r} onClick={() => setRarityFilter(rarityFilter === r ? '' : r)}>
                {r}
              </Pill>
            ))}
          </PillRow>
        </div>

        {/* Gold cost */}
        <div className="space-y-1">
          <p
            className="text-[10px] uppercase tracking-wider font-semibold px-0.5"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}
          >
            Kaina ⚜
          </p>
          <PillRow>
            <Pill active={goldCost === null} onClick={() => setGoldCost(null)}>Visos</Pill>
            {GOLD_COSTS.map((cost) => (
              <Pill key={cost} active={goldCost === cost} onClick={() => setGoldCost(goldCost === cost ? null : cost)}>
                {cost}
              </Pill>
            ))}
          </PillRow>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setRarityFilter(''); setGoldCost(null) }}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}
          >
            <X className="w-3 h-3" /> Išvalyti filtrus
          </button>
        )}
      </div>

      {/* ── Count + Universal toggle ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between py-1.5 px-0.5"
        style={{ borderTop: '1px solid var(--bg-border)' }}
      >
        <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
          {totalShown} {pluralLt(totalShown, ['korta', 'kortos', 'kortų'])}
        </p>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
            Universalios
          </span>
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={showUniversal}
              onChange={(e) => setShowUniversal(e.target.checked)}
            />
            <div
              className="w-8 h-4 rounded-full transition-all duration-200"
              style={{
                background: showUniversal
                  ? 'linear-gradient(to right, var(--rvn-violet), var(--gold))'
                  : 'var(--bg-border)',
              }}
            />
            <div
              className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 shadow-sm"
              style={{ transform: showUniversal ? 'translateX(16px)' : 'none' }}
            />
          </div>
        </label>
      </div>

      {/* ── Card list ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-1">
          {factionCards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              collection={collection}
              onHover={setHoveredCard}
              onPreview={setPreviewCard}
            />
          ))}

          {showUniversal && (
            <>
              <div
                className="flex items-center gap-2 px-1 mt-2 mb-1"
                style={{ borderBottom: '1px solid rgba(212,175,55,0.3)', paddingBottom: '4px' }}
              >
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--gold)', fontSize: '10px', fontFamily: 'var(--rvn-font-display)' }}
                >
                  Universalios kortos
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  {universalCards.length}
                </span>
              </div>
              {universalCards.length === 0 ? (
                <p className="text-xs text-center py-3 opacity-40" style={{ color: 'var(--text-muted)' }}>
                  Universaliųjų kortų nerasta
                </p>
              ) : (
                universalCards.map((card) => (
                  <CardRow
                    key={card.id}
                    card={card}
                    collection={collection}
                    onHover={setHoveredCard}
                    onPreview={setPreviewCard}
                  />
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
