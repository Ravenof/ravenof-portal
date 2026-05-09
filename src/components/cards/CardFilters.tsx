'use client'

import { useCallback, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import type { Faction, CardType, Rarity } from '@/types'

type CardFiltersProps = {
  factions:  Faction[]
  cardTypes: CardType[]
  rarities:  Rarity[]
  isAuthenticated: boolean
  totalCount:    number
  filteredCount: number
}

export function CardFilters({
  factions, cardTypes, rarities, isAuthenticated, totalCount, filteredCount,
}: CardFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const get = (key: string) => searchParams.get(key) ?? ''

  const update = useCallback((key: string, value: string) => {
    startTransition(() => {
      const p = new URLSearchParams(searchParams.toString())
      value ? p.set(key, value) : p.delete(key)
      router.push(`/cards?${p.toString()}`, { scroll: false })
    })
  }, [router, searchParams])

  const clearAll = useCallback(() => {
    startTransition(() => router.push('/cards', { scroll: false }))
  }, [router])

  const hasFilters =
    get('search') || get('faction_id') || get('type_id') ||
    get('rarity_id') || get('gold_min') || get('gold_max') || get('owned_only')

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--bg-border)',
    color: 'var(--text-primary)',
    borderRadius: '0.5rem',
    width: '100%',
    padding: '0.375rem 0.5rem',
    fontSize: '0.875rem',
    outline: 'none',
  }

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          <span
            className="font-semibold text-sm"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
          >
            Filtrai
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {filteredCount}/{totalCount}
          </span>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-xs flex items-center gap-1 transition-colors hover:text-red-400"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-3 h-3" /> Išvalyti
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          placeholder="Ieškoti kortų..."
          defaultValue={get('search')}
          onChange={(e) => {
            const v = e.target.value
            clearTimeout((window as any).__st)
            ;(window as any).__st = setTimeout(() => update('search', v), 400)
          }}
          className="pl-9 pr-8"
          style={inputStyle}
        />
        {get('search') && (
          <button
            onClick={() => update('search', '')}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Selects */}
      <div className="space-y-3">
        <Sel label="Frakcija" value={get('faction_id')} onChange={(v) => update('faction_id', v)}>
          <option value="">Visos frakcijos</option>
          {factions.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </Sel>

        <Sel label="Tipas" value={get('type_id')} onChange={(v) => update('type_id', v)}>
          <option value="">Visi tipai</option>
          {cardTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Sel>

        <Sel label="Retumas" value={get('rarity_id')} onChange={(v) => update('rarity_id', v)}>
          <option value="">Visi</option>
          {rarities.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </Sel>

        <div className="grid grid-cols-2 gap-2">
          <Sel label="Auksas min" value={get('gold_min')} onChange={(v) => update('gold_min', v)}>
            <option value="">—</option>
            {[0,100,200,300,400,500,600,700,800,900].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </Sel>
          <Sel label="Auksas max" value={get('gold_max')} onChange={(v) => update('gold_max', v)}>
            <option value="">—</option>
            {[100,200,300,400,500,600,700,800,900,1000].map((n) => (
              <option key={n} value={n}>≤{n}</option>
            ))}
          </Sel>
        </div>
      </div>

      {/* Owned only */}
      {isAuthenticated && (
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative flex-shrink-0">
            <input
              type="checkbox"
              checked={get('owned_only') === '1'}
              onChange={(e) => update('owned_only', e.target.checked ? '1' : '')}
              className="sr-only"
            />
            <div
              className="w-10 h-6 rounded-full transition-colors duration-200"
              style={{ background: get('owned_only') === '1' ? '#22c55e' : 'var(--bg-border)' }}
            />
            <div
              className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200"
              style={{ transform: get('owned_only') === '1' ? 'translateX(16px)' : 'none' }}
            />
          </div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Tik mano kortos
          </span>
        </label>
      )}

      {pending && (
        <p className="text-xs text-center animate-pulse" style={{ color: 'var(--text-muted)' }}>
          Ieškoma...
        </p>
      )}
    </div>
  )
}

function Sel({
  label, value, onChange, children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          color: 'var(--text-primary)',
          borderRadius: '0.5rem',
          width: '100%',
          padding: '0.375rem 0.5rem',
          fontSize: '0.875rem',
          outline: 'none',
        }}
      >
        {children}
      </select>
    </div>
  )
}
