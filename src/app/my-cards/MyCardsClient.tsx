'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import type { MyOwnedCard } from '@/types'
import { updateCardQuantity, removeCard } from './actions'

type Props = {
  cards: MyOwnedCard[]
  ownedCount: number
  totalCards: number
  completionPct: number
  isPublic: boolean
}

// ── Pill helpers ──────────────────────────────────────────────────────────────

function Pill({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-150 whitespace-nowrap"
      style={active ? {
        background: 'linear-gradient(135deg, rgba(124,58,237,0.28) 0%, rgba(240,180,41,0.12) 100%)',
        color: 'var(--gold)',
        border: '1px solid rgba(240,180,41,0.5)',
        fontFamily: 'var(--rvn-font-display)',
        letterSpacing: '0.03em',
      } : {
        background: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
        border: '1px solid var(--bg-border)',
        fontFamily: 'var(--rvn-font-display)',
        letterSpacing: '0.03em',
      }}
    >
      {children}
    </button>
  )
}

function PillRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p
        className="text-[10px] uppercase tracking-wider font-semibold px-0.5"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}
      >
        {label}
      </p>
      <div
        className="flex gap-1.5 overflow-x-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MyCardsClient({ cards: initialCards, ownedCount, totalCards, completionPct, isPublic }: Props) {
  const [cards, setCards]               = useState<MyOwnedCard[]>(initialCards)
  const [search, setSearch]             = useState('')
  const [faction, setFaction]           = useState('')
  const [cardType, setCardType]         = useState('')
  const [rarity, setRarity]             = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [errors, setErrors]             = useState<Record<string, string>>({})
  const [isPending, startTransition]    = useTransition()
  const [filtersOpen, setFiltersOpen]   = useState(false)

  const factions = useMemo(() => {
    const map = new Map<string, string>()
    cards.forEach((c) => { if (c.faction_id && c.faction_name) map.set(String(c.faction_id), c.faction_name) })
    return Array.from(map.entries())
  }, [cards])

  const cardTypes = useMemo(() => {
    const map = new Map<string, string>()
    cards.forEach((c) => { if (c.card_type_id && c.card_type_name) map.set(String(c.card_type_id), c.card_type_name) })
    return Array.from(map.entries())
  }, [cards])

  const rarities = useMemo(() => {
    const map = new Map<string, string>()
    cards.forEach((c) => { if (c.rarity_id && c.rarity_name) map.set(String(c.rarity_id), c.rarity_name) })
    return Array.from(map.entries())
  }, [cards])

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if (faction && String(c.faction_id) !== faction) return false
      if (cardType && String(c.card_type_id) !== cardType) return false
      if (rarity && String(c.rarity_id) !== rarity) return false
      return true
    })
  }, [cards, search, faction, cardType, rarity])

  const hasFilters = !!(search || faction || cardType || rarity)
  const currentOwned = cards.length
  const currentPct = totalCards > 0 ? Math.round((currentOwned / totalCards) * 100) : 0

  function clearError(cardId: string) {
    setErrors((prev) => { const n = { ...prev }; delete n[cardId]; return n })
  }

  function clearFilters() {
    setSearch(''); setFaction(''); setCardType(''); setRarity('')
  }

  function handleDelta(cardId: string, delta: number) {
    clearError(cardId)
    setCards((prev) =>
      prev
        .map((c) => c.card_id === cardId ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    )
    startTransition(async () => {
      const res = await updateCardQuantity(cardId, delta)
      if (res.error) {
        setCards(initialCards)
        setErrors((prev) => ({ ...prev, [cardId]: res.error! }))
      }
    })
  }

  function handleRemove(cardId: string) {
    clearError(cardId)
    setConfirmRemove(null)
    setCards((prev) => prev.filter((c) => c.card_id !== cardId))
    startTransition(async () => {
      const res = await removeCard(cardId)
      if (res.error) {
        setCards(initialCards)
        setErrors((prev) => ({ ...prev, [cardId]: res.error! }))
      }
    })
  }

  return (
    <div className="space-y-4">

      {/* ── Progress bar ──────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
            {currentOwned} / {totalCards}
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--gold)' }}>{currentPct}%</span>
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: isPublic ? 'rgba(34,197,94,0.15)' : 'rgba(100,100,120,0.2)',
              color:      isPublic ? '#4ade80' : 'var(--text-muted)',
              fontFamily: 'var(--rvn-font-display)',
            }}
          >
            {isPublic ? 'Kolekcija viesha' : 'Kolekcija privati'}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: currentPct + '%', background: 'linear-gradient(to right, var(--rvn-violet), var(--gold))' }}
          />
        </div>
      </div>

      {/* ── Search + filter toggle ─────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Iesk\u0173ti kort\u0173..."
            className="rvn-input w-full"
            style={{ paddingLeft: '2rem', paddingRight: search ? '2rem' : '0.75rem' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: (filtersOpen || (faction || cardType || rarity))
              ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(240,180,41,0.1))'
              : 'var(--bg-elevated)',
            color: (filtersOpen || (faction || cardType || rarity)) ? 'var(--gold)' : 'var(--text-muted)',
            border: (filtersOpen || (faction || cardType || rarity))
              ? '1px solid rgba(240,180,41,0.4)'
              : '1px solid var(--bg-border)',
            fontFamily: 'var(--rvn-font-display)',
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {(faction || cardType || rarity) && (
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
          )}
        </button>
      </div>

      {/* ── Pill filters (collapsible) ─────────────────────────────── */}
      {filtersOpen && (
        <div
          className="rounded-xl p-3 space-y-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          {factions.length > 0 && (
            <PillRow label="Frakcija">
              <Pill active={faction === ''} onClick={() => setFaction('')}>Visos</Pill>
              {factions.map(([id, name]) => (
                <Pill key={id} active={faction === id} onClick={() => setFaction(faction === id ? '' : id)}>
                  {name}
                </Pill>
              ))}
            </PillRow>
          )}

          {cardTypes.length > 0 && (
            <PillRow label="Tipas">
              <Pill active={cardType === ''} onClick={() => setCardType('')}>Visi</Pill>
              {cardTypes.map(([id, name]) => (
                <Pill key={id} active={cardType === id} onClick={() => setCardType(cardType === id ? '' : id)}>
                  {name}
                </Pill>
              ))}
            </PillRow>
          )}

          {rarities.length > 0 && (
            <PillRow label="Retumas">
              <Pill active={rarity === ''} onClick={() => setRarity('')}>Visi retumai</Pill>
              {rarities.map(([id, name]) => (
                <Pill key={id} active={rarity === id} onClick={() => setRarity(rarity === id ? '' : id)}>
                  {name}
                </Pill>
              ))}
            </PillRow>
          )}

          {hasFilters && (faction || cardType || rarity) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}
            >
              <X className="w-3 h-3" /> I\u0161valyti filtrus
            </button>
          )}
        </div>
      )}

      {/* ── Count ─────────────────────────────────────────────────── */}
      <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
        {filtered.length} kortel\u0117(-i\u0173)
        {hasFilters && <span style={{ color: 'var(--gold)' }}> (filtruota)</span>}
      </p>

      {/* ── Cards grid ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12 opacity-50" style={{ color: 'var(--text-muted)' }}>Nerasta kort\u0173</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filtered.map((c) => {
            const href = '/cards/' + encodeURIComponent(c.card_number ?? c.card_id)
            return (
              <div
                key={c.card_id}
                className="flex items-center gap-3 rounded-lg px-3 py-2"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid ' + (c.rarity_color ? c.rarity_color + '25' : 'var(--bg-border)'),
                }}
              >
                {/* Clickable left side — image + info */}
                <Link
                  href={href}
                  className="flex items-center gap-3 flex-1 min-w-0"
                  style={{ textDecoration: 'none' }}
                >
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      className="w-9 h-9 rounded object-cover flex-shrink-0 hover:opacity-80 transition-opacity"
                      style={{ border: '1px solid var(--bg-border)' }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded flex-shrink-0"
                      style={{
                        background: c.faction_color ? c.faction_color + '25' : 'var(--bg-elevated)',
                        border: '1px solid var(--bg-border)',
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-semibold truncate hover:text-[var(--gold)] transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {c.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {[c.faction_name, c.rarity_name, c.gold_cost != null ? c.gold_cost + 'g' : null].filter(Boolean).join(' \u00b7 ')}
                    </p>
                    {errors[c.card_id] && (
                      <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>{errors[c.card_id]}</p>
                    )}
                  </div>
                </Link>

                {/* Quantity controls — outside Link */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDelta(c.card_id, -1)}
                    disabled={isPending}
                    className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold hover:opacity-80 disabled:opacity-40 transition"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}
                  >
                    -
                  </button>
                  <span className="text-xs font-bold w-5 text-center" style={{ color: 'var(--gold)' }}>
                    {c.quantity}
                  </span>
                  <button
                    onClick={() => handleDelta(c.card_id, 1)}
                    disabled={isPending}
                    className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold hover:opacity-80 disabled:opacity-40 transition"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}
                  >
                    +
                  </button>

                  {confirmRemove === c.card_id ? (
                    <>
                      <button
                        onClick={() => handleRemove(c.card_id)}
                        disabled={isPending}
                        className="text-xs px-1.5 py-0.5 rounded hover:opacity-80 disabled:opacity-40 transition font-semibold"
                        style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
                      >
                        &#10003;
                      </button>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="text-xs px-1.5 py-0.5 rounded hover:opacity-80 transition"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
                      >
                        x
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(c.card_id)}
                      disabled={isPending}
                      className="w-6 h-6 rounded flex items-center justify-center hover:opacity-80 disabled:opacity-40 transition text-xs"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
                      title="Pa\u0161alinti i\u0161 kolekcijos"
                    >
                      &#128465;
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isPending && (
        <p className="text-xs text-center animate-pulse" style={{ color: 'var(--text-muted)' }}>Saugoma...</p>
      )}
    </div>
  )
}
