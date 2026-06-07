'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen, Map, List, CreditCard, RotateCcw, MapPin, Scroll, User, Sword, Search, X as XIcon, Shield } from 'lucide-react'
import { LoreMap }      from '@/components/lore/LoreMap'
import { LorePanel }    from '@/components/lore/LorePanel'
import { LoreTimeline } from '@/components/lore/LoreTimeline'
import { LoreFilters }  from '@/components/lore/LoreFilters'
import type { LoreAtlasData } from '@/lib/loreFetcher'
import type { LoreCharacter, LoreArtifact } from '@/data/lore'

type View = 'map' | 'list'

// ── Card chip ─────────────────────────────────────────────────
function CardChip({ cardNumber, name }: { cardNumber: string; name: string }) {
  return (
    <Link
      href={'/cards/' + encodeURIComponent(cardNumber)}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:scale-105"
      style={{
        background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)',
        color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', textDecoration: 'none', whiteSpace: 'nowrap',
      }}
    >
      🃏 {name}
    </Link>
  )
}

// ── List section header ───────────────────────────────────────
function ListSection({ icon, title, count, children }: {
  icon: React.ReactNode; title: string; count: number; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--gold)', opacity: 0.8 }}>{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-widest"
          style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.1em' }}>{title}</h2>
        <span className="text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--text-muted)', border: '1px solid rgba(212,175,55,0.15)', fontFamily: 'monospace' }}>
          {count}
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212,175,55,0.2), transparent)' }} />
      </div>
      {children}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 rounded-xl"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
      <button onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
        <RotateCcw className="w-3 h-3" /> Nustatyti filtrus iš naujo
      </button>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export function LoreAtlasClient({
  eras, locations, events, characters, artifacts, factions, source,
}: LoreAtlasData) {
  const [view,           setView]           = useState<View>('map')
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [activeEraIndex, setActiveEraIndex] = useState<number>(eras.length > 0 ? eras.length - 1 : 0)
  const [activeFaction,  setActiveFaction]  = useState<string | null>(null)
  const [searchQuery,    setSearchQuery]    = useState('')

  const visibleLocations = useMemo(() => locations.filter((loc) =>
    loc.firstEraIndex <= activeEraIndex && (activeFaction === null || loc.factionId === activeFaction)
  ), [locations, activeEraIndex, activeFaction])

  const visibleLocationIds = useMemo(() => new Set(visibleLocations.map((l) => l.id)), [visibleLocations])

  // Event count per location (only visible era events)
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    events.filter((e) => e.eraIndex <= activeEraIndex).forEach((e) => {
      if (e.locationId) counts[e.locationId] = (counts[e.locationId] ?? 0) + 1
    })
    return counts
  }, [events, activeEraIndex])

  const visibleEvents = useMemo(() => events.filter((e) =>
    e.eraIndex <= activeEraIndex && (activeFaction === null || !e.locationId || visibleLocationIds.has(e.locationId))
  ), [events, activeEraIndex, activeFaction, visibleLocationIds])

  const visibleCharacters = useMemo(() =>
    activeFaction === null ? characters : characters.filter((c) => c.factionId === activeFaction)
  , [characters, activeFaction])

  // ── Search filtering (list view only) ───────────────────────
  const sq = searchQuery.trim().toLowerCase()
  const searchedLocations  = useMemo(() => sq ? visibleLocations.filter( (l) => l.name.toLowerCase().includes(sq) || l.description?.toLowerCase().includes(sq)) : visibleLocations,  [visibleLocations,  sq])
  const searchedEvents     = useMemo(() => sq ? visibleEvents.filter(    (e) => e.name.toLowerCase().includes(sq) || e.description?.toLowerCase().includes(sq)) : visibleEvents,      [visibleEvents,     sq])
  const searchedCharacters = useMemo(() => sq ? visibleCharacters.filter((c) => c.name.toLowerCase().includes(sq) || c.description?.toLowerCase().includes(sq) || c.title?.toLowerCase().includes(sq)) : visibleCharacters, [visibleCharacters, sq])
  const searchedArtifacts  = useMemo(() => sq ? artifacts.filter(        (a) => a.name.toLowerCase().includes(sq) || a.description?.toLowerCase().includes(sq)) : artifacts,          [artifacts,         sq])

  const selectedLocation = useMemo(() => locations.find((l) => l.id === selectedId) ?? null, [locations, selectedId])
  const panelFaction = selectedLocation?.factionId ? factions.find((f) => f.id === selectedLocation.factionId) : undefined

  const panelEvents = useMemo(() =>
    events.filter((e) => e.locationId === selectedId && e.eraIndex <= activeEraIndex)
  , [events, selectedId, activeEraIndex])

  const panelCharacters = useMemo(() =>
    (selectedLocation?.characterIds ?? []).map((id) => characters.find((c) => c.id === id)).filter(Boolean) as LoreCharacter[]
  , [characters, selectedLocation])

  const panelArtifacts = useMemo(() =>
    (selectedLocation?.artifactIds ?? []).map((id) => artifacts.find((a) => a.id === id)).filter(Boolean) as LoreArtifact[]
  , [artifacts, selectedLocation])

  function handleSelect(id: string) { setSelectedId((prev) => (prev === id ? null : id)) }

  function resetFilters() {
    setActiveFaction(null)
    setActiveEraIndex(eras.length > 0 ? eras.length - 1 : 0)
    setSelectedId(null)
    setSearchQuery('')
  }

  const hasAnyFilter = activeFaction !== null || activeEraIndex < (eras.length > 0 ? eras.length - 1 : 0) || sq !== ''

  // ── Shared header ─────────────────────────────────────────
  const header = (
    <header
      className="sticky top-0 z-30 px-4 py-2.5 flex items-center justify-between gap-3"
      style={{
        background:     'rgba(5,5,12,0.75)',
        backdropFilter: 'blur(20px)',
        borderBottom:   '1px solid rgba(212,175,55,0.08)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <BookOpen className="w-4 h-4 shrink-0" style={{ color: 'var(--gold)' }} />
        <h1 className="text-sm font-bold tracking-widest"
          style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em', textShadow: '0 0 12px rgba(212,175,55,0.4)' }}>
          Atlasas
        </h1>
        <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full"
          style={{
            background: source === 'supabase' ? 'rgba(34,197,94,0.12)' : 'rgba(212,175,55,0.08)',
            color:      source === 'supabase' ? '#22c55e' : 'var(--text-muted)',
            border:     source === 'supabase' ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(212,175,55,0.12)',
            fontFamily: 'var(--rvn-font-display)', fontSize: '10px',
          }}>
          {source === 'supabase' ? 'tiesiogiai' : 'v1 · statinis'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(5,5,12,0.6)' }}>
          <button onClick={() => setView('map')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
            style={{
              background:  view === 'map' ? 'rgba(212,175,55,0.18)' : 'transparent',
              color:       view === 'map' ? 'var(--gold)' : 'var(--text-muted)',
              fontFamily:  'var(--rvn-font-display)',
              borderRight: '1px solid rgba(212,175,55,0.15)',
            }}>
            <Map className="w-3 h-3" />
            <span className="hidden sm:inline">Žemėlapis</span>
          </button>
          <button onClick={() => setView('list')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
            style={{
              background: view === 'list' ? 'rgba(212,175,55,0.18)' : 'transparent',
              color:      view === 'list' ? 'var(--gold)' : 'var(--text-muted)',
              fontFamily: 'var(--rvn-font-display)',
            }}>
            <List className="w-3 h-3" />
            <span className="hidden sm:inline">Sąrašas</span>
          </button>
        </div>

        <Link href="/cards" className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          ← Kortos
        </Link>
      </div>
    </header>
  )

  // ══════════════════════════════════════════════════════════
  // MAP VIEW — full-screen background layout
  // ══════════════════════════════════════════════════════════
  if (view === 'map') {
    return (
      <div style={{ height: '100dvh', overflow: 'hidden', background: '#0a0a0f', display: 'flex', flexDirection: 'column' }}>
        {header}

        {/* Map section — fills remaining height, LoreMap fills it via h-full */}
        <div className="relative flex-1 min-h-0 overflow-hidden">

          {/* ── Map ── */}
          <LoreMap
            locations={visibleLocations}
            factions={factions}
            selectedId={selectedId}
            onSelect={handleSelect}
            eventCounts={eventCounts}
          />

          {/* ── Floating filters (top) ── */}
          <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none">
            <div className="pointer-events-auto max-w-xl">
              <LoreFilters
                factions={factions}
                activeFactionId={activeFaction}
                onChange={setActiveFaction}
                visibleCount={visibleLocations.length}
                totalCount={locations.length}
              />
            </div>
          </div>

          {/* ── Desktop side panel (right overlay) ── */}
          {selectedLocation && (
            <div
              className="hidden lg:flex flex-col absolute right-3 z-20"
              style={{
                top: '4rem',
                bottom: '8rem',
                width: '22rem',
              }}
            >
              <div
                className="flex flex-col rounded-xl overflow-hidden flex-1"
                style={{
                  background: 'rgba(10,10,20,0.92)',
                  border:     '1px solid ' + (panelFaction?.color ?? 'rgba(212,175,55,0.2)') + '55',
                  boxShadow:  '0 8px 40px rgba(0,0,0,0.8)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <LorePanel
                  location={selectedLocation}
                  faction={panelFaction}
                  events={panelEvents}
                  characters={panelCharacters}
                  artifacts={panelArtifacts}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </div>
          )}

          {/* ── Floating timeline (bottom) ── */}
          <div className="absolute bottom-3 left-3 z-20"
            style={{ right: selectedLocation ? '25rem' : '3rem' }}>
            <LoreTimeline
              eras={eras}
              activeIndex={activeEraIndex}
              onChange={(idx) => {
                setActiveEraIndex(idx)
                if (selectedLocation && selectedLocation.firstEraIndex > idx) setSelectedId(null)
              }}
            />
          </div>

          {/* ── Stats badge (bottom-right) ── */}
          <div
            className="absolute bottom-3 right-3 z-20 hidden sm:flex items-center gap-4 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(5,5,12,0.75)', border: '1px solid rgba(212,175,55,0.12)', backdropFilter: 'blur(12px)' }}
          >
            {[
              { n: locations.length,  label: 'Vietovių'  },
              { n: events.length,     label: 'Įvykių'    },
              { n: characters.length, label: 'Veikėjų'   },
              { n: artifacts.length,  label: 'Artefaktų' },
            ].map(({ n, label }) => (
              <div key={label} className="text-center">
                <p className="text-sm font-bold leading-none" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{n}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* ── Hint (no selection) ── */}
          {!selectedId && visibleLocations.length > 0 && (
            <p className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 text-xs px-3 py-1.5 rounded-full pointer-events-none"
              style={{ background: 'rgba(5,5,12,0.6)', color: 'var(--text-muted)', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}>
              Spustelėk žymeklį, kad pamatytum vietovės istoriją
            </p>
          )}

          {/* Empty map state */}
          {visibleLocations.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="flex flex-col items-center gap-3 pointer-events-auto">
                <p className="text-sm px-4 py-2 rounded-xl" style={{ background: 'rgba(5,5,12,0.85)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
                  Nėra vietovių pagal pasirinktus filtrus
                </p>
                {hasAnyFilter && (
                  <button onClick={resetFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
                    <RotateCcw className="w-3 h-3" /> Nustatyti filtrus iš naujo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile bottom sheet */}
        <div className="lg:hidden">
          <LorePanel
            location={selectedLocation}
            faction={panelFaction}
            events={panelEvents}
            characters={panelCharacters}
            artifacts={panelArtifacts}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════
  // LIST VIEW — scrollable page
  // ══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {header}

      <div className="flex-1 flex flex-col px-3 sm:px-4 py-4 gap-6 max-w-screen-2xl mx-auto w-full">

        <LoreFilters
          factions={factions}
          activeFactionId={activeFaction}
          onChange={setActiveFaction}
          visibleCount={visibleLocations.length}
          totalCount={locations.length}
        />

        {/* ── Search bar ── */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ieškoti vietovių, įvykių, veikėjų, artefaktų..."
            className="w-full rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none transition-colors"
            style={{
              background:  'var(--bg-surface)',
              border:      '1px solid ' + (sq ? 'rgba(212,175,55,0.35)' : 'var(--bg-border)'),
              color:       'var(--text-primary)',
              fontFamily:  'var(--rvn-font-body)',
              caretColor:  'var(--gold)',
            }}
          />
          {sq && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
              style={{ background: 'var(--bg-border)', color: 'var(--text-muted)' }}
              aria-label="Išvalyti paiešką"
            >
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Search result summary */}
        {sq && (
          <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>
            Rasta: {searchedLocations.length + searchedEvents.length + searchedCharacters.length + searchedArtifacts.length} rezultatai
            {' '}— ieškota „{searchQuery.trim()}"
          </p>
        )}

        {/* Lokacijos */}
        <ListSection icon={<MapPin className="w-3.5 h-3.5" />} title="Lokacijos" count={searchedLocations.length}>
          {searchedLocations.length === 0 ? <EmptyState message={sq ? `Nerasta lokacijų pagal „${searchQuery.trim()}"` : 'Nėra lokacijų pagal pasirinktus filtrus'} onReset={resetFilters} /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {searchedLocations.map((loc) => {
                const fac = loc.factionId ? factions.find((f) => f.id === loc.factionId) : undefined
                return (
                  <div key={loc.id} className="rounded-xl p-4 flex flex-col gap-2"
                    style={{ background: 'var(--bg-surface)', border: '1px solid ' + (fac?.color ?? 'var(--bg-border)') + (fac ? '33' : '') }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>{loc.name}</p>
                        {fac && <p className="text-xs" style={{ color: fac.color }}>{fac.name}</p>}
                      </div>
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(212,175,55,0.08)', color: 'var(--text-muted)', border: '1px solid rgba(212,175,55,0.12)', fontFamily: 'var(--rvn-font-display)', fontSize: '10px' }}>
                        {loc.type}
                      </span>
                    </div>
                    {loc.description && <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{loc.description}</p>}
                    {loc.relatedCards.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {loc.relatedCards.map((c) => <CardChip key={c.cardNumber} cardNumber={c.cardNumber} name={c.name} />)}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-auto">
                      <button onClick={() => { setView('map'); setSelectedId(loc.id) }}
                        className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                        🗺 Žemėlapyje
                      </button>
                      <Link href={`/lore/locations/${loc.id}`}
                        className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                        Skaityti →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ListSection>

        {/* Įvykiai */}
        <ListSection icon={<Scroll className="w-3.5 h-3.5" />} title="Įvykiai" count={searchedEvents.length}>
          {searchedEvents.length === 0 ? <EmptyState message={sq ? `Nerasta įvykių pagal „${searchQuery.trim()}"` : 'Nėra įvykių pagal pasirinktus filtrus'} onReset={resetFilters} /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {searchedEvents.map((ev) => {
                const era = eras.find((e) => e.index === ev.eraIndex)
                return (
                  <div key={ev.id} className="rounded-xl p-4 flex flex-col gap-2"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>{ev.name}</p>
                      {era && <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: era.color + '22', color: era.color, border: '1px solid ' + era.color + '44', fontFamily: 'var(--rvn-font-display)', fontSize: '10px', whiteSpace: 'nowrap' }}>
                        {era.name}
                      </span>}
                    </div>
                    {ev.description && <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{ev.description}</p>}
                    {ev.locationId && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>📍 {locations.find((l) => l.id === ev.locationId)?.name ?? ev.locationId}</p>}
                    <Link href={`/lore/events/${ev.id}`}
                      className="self-start text-xs mt-auto transition-opacity hover:opacity-70" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                      Skaityti →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </ListSection>

        {/* Veikėjai */}
        <ListSection icon={<User className="w-3.5 h-3.5" />} title="Veikėjai" count={searchedCharacters.length}>
          {searchedCharacters.length === 0 ? <EmptyState message={sq ? `Nerasta veikėjų pagal „${searchQuery.trim()}"` : 'Nėra veikėjų pagal pasirinktus filtrus'} onReset={resetFilters} /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {searchedCharacters.map((ch) => {
                const fac = ch.factionId ? factions.find((f) => f.id === ch.factionId) : undefined
                return (
                  <div key={ch.id} className="rounded-xl p-3 flex flex-col gap-1.5"
                    style={{ background: 'var(--bg-surface)', border: '1px solid ' + (fac?.color ?? 'var(--bg-border)') + (fac ? '33' : '') }}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">👤</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>{ch.name}</p>
                        {ch.title && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{ch.title}</p>}
                      </div>
                    </div>
                    {fac && <span className="text-xs" style={{ color: fac.color }}>{fac.name}</span>}
                    {ch.description && <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{ch.description}</p>}
                    <Link href={`/lore/characters/${ch.id}`}
                      className="self-start text-xs mt-auto transition-opacity hover:opacity-70" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                      Skaityti →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </ListSection>

        {/* Artefaktai */}
        <ListSection icon={<Sword className="w-3.5 h-3.5" />} title="Artefaktai" count={searchedArtifacts.length}>
          {searchedArtifacts.length === 0 ? <EmptyState message={sq ? `Nerasta artefaktų pagal „${searchQuery.trim()}"` : 'Artefaktų dar nėra'} onReset={resetFilters} /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {searchedArtifacts.map((art) => (
                <div key={art.id} className="rounded-xl p-4 flex flex-col gap-2"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                  <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>✦ {art.name}</p>
                  {art.description && <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{art.description}</p>}
                  <Link href={`/lore/artifacts/${art.id}`}
                    className="self-start text-xs mt-auto transition-opacity hover:opacity-70" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                    Skaityti →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </ListSection>

        {/* Frakcijos */}
        {factions.length > 0 && (
          <ListSection icon={<Shield className="w-3.5 h-3.5" />} title="Frakcijos" count={factions.length}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-8">
              {factions.map((f) => (
                <div key={f.id} className="rounded-xl p-4 flex flex-col gap-2"
                  style={{ background: 'var(--bg-surface)', border: `1px solid ${f.color}33` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ background: f.color + '33', border: `1.5px solid ${f.color}88` }} />
                    <p className="text-sm font-bold truncate"
                      style={{ fontFamily: 'var(--rvn-font-display)', color: f.color }}>
                      {f.name}
                    </p>
                  </div>
                  {f.description && (
                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {f.description}
                    </p>
                  )}
                  <Link href={`/lore/factions/${f.id}`}
                    className="self-start text-xs mt-auto transition-opacity hover:opacity-70"
                    style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                    Skaityti →
                  </Link>
                </div>
              ))}
            </div>
          </ListSection>
        )}
      </div>
    </div>
  )
}
