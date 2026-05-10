'use client'

import { useState, useMemo } from 'react'
import type { MyOwnedCard } from '@/types'

type Props = {
  cards: MyOwnedCard[]
  ownedCount: number
  totalCards: number
  completionPct: number
  isPublic: boolean
}

export function MyCardsClient({ cards, ownedCount, totalCards, completionPct, isPublic }: Props) {
  const [search, setSearch] = useState('')
  const [faction, setFaction] = useState('')
  const [cardType, setCardType] = useState('')
  const [rarity, setRarity] = useState('')

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

  const selStyle = {
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--bg-border)',
    borderRadius: '0.5rem',
    padding: '0.375rem 0.625rem',
    fontSize: '0.75rem',
    outline: 'none',
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {ownedCount} / {totalCards} kortelių ({completionPct}%)
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: isPublic ? 'rgba(34,197,94,0.15)' : 'rgba(100,100,120,0.2)',
              color: isPublic ? '#4ade80' : 'var(--text-muted)',
            }}
          >
            {isPublic ? 'Kolekcija vieša' : 'Kolekcija privati'}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div className="h-full rounded-full" style={{ width: completionPct + '%', background: 'var(--gold)' }} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ieškoti..."
          className="text-xs px-3 py-1.5 rounded-lg flex-1 min-w-[140px] outline-none"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--bg-border)' }}
        />
        <select value={faction} onChange={(e) => setFaction(e.target.value)} style={selStyle}>
          <option value="">Visos frakcijos</option>
          {factions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={cardType} onChange={(e) => setCardType(e.target.value)} style={selStyle}>
          <option value="">Visi tipai</option>
          {cardTypes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={rarity} onChange={(e) => setRarity(e.target.value)} style={selStyle}>
          <option value="">Visos retybės</option>
          {rarities.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        {(search || faction || cardType || rarity) && (
          <button
            onClick={() => { setSearch(''); setFaction(''); setCardType(''); setRarity('') }}
            className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
          >
            Išvalyti
          </button>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} kortelė(-ių)</p>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-center py-12 opacity-50" style={{ color: 'var(--text-muted)' }}>Nerasta kortų</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filtered.map((c) => (
            <div
              key={c.card_id}
              className="flex items-center gap-3 rounded-lg px-3 py-2"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
            >
              {c.image_url ? (
                <img src={c.image_url} alt={c.name} className="w-9 h-9 rounded object-cover flex-shrink-0"
                  style={{ border: '1px solid var(--bg-border)' }} />
              ) : (
                <div className="w-9 h-9 rounded flex-shrink-0"
                  style={{ background: c.faction_color ? c.faction_color + '25' : 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {[c.faction_name, c.rarity_name, c.gold_cost != null ? c.gold_cost + 'g' : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--gold)' }}>x{c.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
