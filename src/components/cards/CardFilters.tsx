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

  const ownedActive = get('owned_only') === '1'

  return (
    <div className="rvn-panel space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          <span
            className="font-semibold text-sm"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.04em' }}
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
              className="text-xs flex items-center gap-1 transition-colors hover:text-[var(--gold)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-3 h-3" /> Valyti filtrus
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
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
          className="rvn-input w-full"
          style={{ paddingLeft: '2.25rem', paddingRight: get('search') ? '2rem' : '0.75rem' }}
        />
        {get('search') && (
          <button
            onClick={() => update('search', '')}
            className="absolute right-2 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
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

      {/* Owned only toggle */}
      {isAuthenticated && (
        <button
          type="button"
          onClick={() => update('owned_only', ownedActive ? '' : '1')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
          style={{
            background: ownedActive
              ? 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(240,180,41,0.08) 100%)'
              : 'var(--bg-elevated)',
            border: ownedActive
              ? '1px solid rgba(124,58,237,0.45)'
              : '1px solid var(--bg-border)',
            boxShadow: ownedActive ? '0 0 12px rgba(124,58,237,0.15)' : 'none',
          }}
        >
          {/* Toggle pill */}
          <div className="relative flex-shrink-0 w-10 h-5">
            <div
              className="w-10 h-5 rounded-full transition-all duration-200"
              style={{
                background: ownedActive
                  ? 'linear-gradient(to right, var(--rvn-violet), var(--gold))'
                  : 'var(--bg-border)',
              }}
            />
            <div
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm"
              style={{ transform: ownedActive ? 'translateX(20px)' : 'none' }}
            />
          </div>
          <span
            className="text-sm font-semibold"
            style={{
              fontFamily: 'var(--rvn-font-display)',
              letterSpacing: '0.03em',
              color: ownedActive ? 'var(--gold)' : 'var(--text-secondary)',
            }}
          >
            Mano kortos
          </span>
          {ownedActive && (
            <span
              className="ml-auto text-xs rvn-chip rvn-chip-violet"
              style={{ fontSize: '10px' }}
            >
              aktyvus
            </span>
          )}
        </button>
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
      <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rvn-select w-full"
      >
        {children}
      </select>
    </div>
  )
}
