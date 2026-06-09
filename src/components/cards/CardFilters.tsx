'use client'

import { useCallback, useTransition, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [mobileOpen, setMobileOpen] = useState(false)

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
      {/* Header - always visible; acts as toggle on mobile */}
      <div
        className="flex items-center justify-between"
        onClick={() => setMobileOpen((o) => !o)}
        style={{ cursor: 'pointer' }}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          <span
            className="font-semibold text-sm"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.04em' }}
          >
            Filtrai
          </span>
          {hasFilters && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(240,180,41,0.15)', color: 'var(--gold)', fontSize: '10px' }}
            >
              aktyvūs
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {filteredCount}/{totalCount}
          </span>
          {hasFilters && (
            <button
              onClick={(e) => { e.stopPropagation(); clearAll() }}
              className="hidden md:flex text-xs items-center gap-1 transition-colors hover:text-[var(--gold)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-3 h-3" /> Valyti
            </button>
          )}
          {/* Mobile chevron */}
          <span className="md:hidden" style={{ color: 'var(--text-muted)' }}>
            {mobileOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </div>

      {/* Body - always visible on md+, collapsible on mobile */}
      <div className={`${mobileOpen ? 'block' : 'hidden'} md:block space-y-3`}>

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

        {/* Sort */}
        <Sel label="Rūšiuoti" value={get('sort') || 'gold_asc'} onChange={(v) => update('sort', v)}>
          <option value="gold_asc">Pigiausios pirma</option>
          <option value="gold_desc">Brangiausios pirma</option>
          <option value="name">Pavadinimas A–Z</option>
          <option value="attack">Stipriausios (ATK)</option>
          <option value="health">Atspariausios (HP)</option>
        </Sel>

        {/* Filters */}
        <div className="space-y-3">

          {/* Faction icon pills */}
          <div className="space-y-1">
            <label
              className="block text-xs font-medium"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}
            >
              Frakcija
            </label>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => update('faction_id', '')}
                className="text-xs px-2 py-1 rounded-lg transition-all"
                style={{
                  background: !get('faction_id') ? 'rgba(240,180,41,0.15)' : 'var(--bg-elevated)',
                  color:      !get('faction_id') ? 'var(--gold)' : 'var(--text-muted)',
                  border:     !get('faction_id') ? '1px solid rgba(240,180,41,0.4)' : '1px solid var(--bg-border)',
                  fontFamily: 'var(--rvn-font-display)',
                }}
              >
                Visos
              </button>
              {factions.map((f) => {
                const active = get('faction_id') === String(f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => update('faction_id', active ? '' : String(f.id))}
                    title={f.name}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                    style={{
                      background: active ? f.color_hex + '22' : 'var(--bg-elevated)',
                      color:      active ? f.color_hex : 'var(--text-muted)',
                      border:     active ? '1px solid ' + f.color_hex + '55' : '1px solid var(--bg-border)',
                    }}
                  >
                    {f.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.icon_url}
                        alt={f.name}
                        width={14}
                        height={14}
                        style={{
                          width: 14, height: 14, objectFit: 'contain', flexShrink: 0,
                          filter: active ? 'none' : 'grayscale(0.4) opacity(0.7)',
                        }}
                      />
                    ) : (
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: f.color_hex }}
                      />
                    )}
                    <span style={{ fontFamily: 'var(--rvn-font-display)', fontSize: '10px', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Card type icon pills */}
          <div className="space-y-1">
            <label
              className="block text-xs font-medium"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}
            >
              Tipas
            </label>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => update('type_id', '')}
                className="text-xs px-2 py-1 rounded-lg transition-all"
                style={{
                  background: !get('type_id') ? 'rgba(240,180,41,0.15)' : 'var(--bg-elevated)',
                  color:      !get('type_id') ? 'var(--gold)' : 'var(--text-muted)',
                  border:     !get('type_id') ? '1px solid rgba(240,180,41,0.4)' : '1px solid var(--bg-border)',
                  fontFamily: 'var(--rvn-font-display)',
                }}
              >
                Visi
              </button>
              {cardTypes.map((t) => {
                const active = get('type_id') === String(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => update('type_id', active ? '' : String(t.id))}
                    title={t.name}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                    style={{
                      background: active ? 'rgba(240,180,41,0.12)' : 'var(--bg-elevated)',
                      color:      active ? 'var(--gold)' : 'var(--text-muted)',
                      border:     active ? '1px solid rgba(240,180,41,0.4)' : '1px solid var(--bg-border)',
                    }}
                  >
                    {t.icon_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.icon_url}
                        alt={t.name}
                        width={13}
                        height={13}
                        style={{
                          width: 13, height: 13, objectFit: 'contain', flexShrink: 0,
                          filter: active ? 'none' : 'grayscale(0.3) opacity(0.7)',
                        }}
                      />
                    )}
                    <span style={{ fontFamily: 'var(--rvn-font-display)', fontSize: '10px', letterSpacing: '0.02em' }}>
                      {t.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

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
                <option key={n} value={n}>max {n}</option>
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

        {/* Mobile clear all button */}
        {hasFilters && mobileOpen && (
          <button
            onClick={clearAll}
            className="w-full md:hidden text-xs flex items-center justify-center gap-1 py-2 rounded-lg transition-colors hover:text-[var(--gold)]"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
          >
            <X className="w-3 h-3" /> Valyti filtrus
          </button>
        )}

      </div>{/* end collapsible body */}
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
