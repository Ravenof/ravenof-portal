'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen, Map, List, CreditCard, RotateCcw, MapPin, Scroll, User, Sword } from 'lucide-react'
import { LoreMap }      from '@/components/lore/LoreMap'
import { LorePanel }    from '@/components/lore/LorePanel'
import { LoreTimeline } from '@/components/lore/LoreTimeline'
import { LoreFilters }  from '@/components/lore/LoreFilters'
import type { LoreAtlasData } from '@/lib/loreFetcher'
import type { LoreCharacter, LoreArtifact } from '@/data/lore'

type View = 'map' | 'list'

// ── List-view section wrapper ─────────────────────────────────
function ListSection({ icon, title, count, children }: {
  icon: React.ReactNode
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--gold)', opacity: 0.8 }}>{icon}</span>
        <h2
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.1em' }}
        >
          {title}
        </h2>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--text-muted)', border: '1px solid rgba(212,175,55,0.15)', fontFamily: 'monospace' }}
        >
          {count}
        </span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212,175,55,0.2), transparent)' }} />
      </div>
      {children}
    </div>
  )
}

// ── Card chip ─────────────────────────────────────────────────
function CardChip({ cardNumber, name }: { cardNumber: string; name: string }) {
  return (
    <Link
      href={'/cards/' + encodeURIComponent(cardNumber)}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:scale-105"
      style={{
        background:    'rgba(212,175,55,0.08)',
        border:        '1px solid rgba(212,175,55,0.25)',
        color:         'var(--gold)',
        fontFamily:    'var(--rvn-font-display)',
        letterSpacing: '0.03em',
        textDecoration: 'none',
        whiteSpace:    'nowrap',
      }}
    >
      🃏 {name}
    </Link>
  )
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div
      className="flex flex-col items-center gap-3 py-10 rounded-xl"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
    >
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}
      >
        <RotateCcw className="w-3 h-3" />
        Nustatyti filtrus iš naujo
      </button>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
export function LoreAtlasClient({
  eras, locations, events, characters, artifacts, factions, source,
}: LoreAtlasData) {
  const [view,           setView]           = useState<View>('map')
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [activeEraIndex, setActiveEraIndex] = useState<number>(eras.length > 0 ? eras.length - 1 : 0)
  const [activeFaction,  setActiveFaction]  = useState<string | null>(null)

  // ── Filtered sets ─────────────────────────────────────────
  const visibleLocations = useMemo(() => {
    return locations.filter((loc) => {
      const eraOk = loc.firstEraIndex <= activeEraIndex
      const facOk = activeFaction === null || loc.factionId === activeFaction
      return eraOk && facOk
    })
  }, [locations, activeEraIndex, activeFaction])

  const visibleLocationIds = useMemo(
    () => new Set(visibleLocations.map((l) => l.id)),
    [visibleLocations],
  )

  // Events: filter by era; tie to visible locations when faction active
  const visibleEvents = useMemo(() => {
    return events.filter((e) => {
      const eraOk = e.eraIndex <= activeEraIndex
      const locOk = activeFaction === null || !e.locationId || visibleLocationIds.has(e.locationId)
      return eraOk && locOk
    })
  }, [events, activeEraIndex, activeFaction, visibleLocationIds])

  // Characters: filter by faction when set
  const visibleCharacters = useMemo(() => {
    if (activeFaction === null) return characters
    return characters.filter((c) => c.factionId === activeFaction)
  }, [characters, activeFaction])

  // Artifacts: no meaningful era/faction filter — show all
  const visibleArtifacts = artifacts

  // ── Panel derivations ──────────────────────────────────────
  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedId) ?? null,
    [locations, selectedId],
  )
  const panelFaction = selectedLocation?.factionId
    ? factions.find((f) => f.id === selectedLocation.factionId)
    : undefined

  const panelEvents = useMemo(
    () => events.filter((e) => e.locationId === selectedId && e.eraIndex <= activeEraIndex),
    [events, selectedId, activeEraIndex],
  )
  const panelCharacters = useMemo(
    () =>
      (selectedLocation?.characterIds ?? [])
        .map((id) => characters.find((c) => c.id === id))
        .filter(Boolean) as LoreCharacter[],
    [characters, selectedLocation],
  )
  const panelArtifacts = useMemo(
    () =>
      (selectedLocation?.artifactIds ?? [])
        .map((id) => artifacts.find((a) => a.id === id))
        .filter(Boolean) as LoreArtifact[],
    [artifacts, selectedLocation],
  )

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  function resetFilters() {
    setActiveFaction(null)
    setActiveEraIndex(eras.length > 0 ? eras.length - 1 : 0)
    setSelectedId(null)
  }

  const hasAnyFilter = activeFaction !== null || activeEraIndex < (eras.length > 0 ? eras.length - 1 : 0)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background:     'rgba(7,7,15,0.96)',
          backdropFilter: 'blur(16px)',
          borderBottom:   '1px solid rgba(212,175,55,0.1)',
          boxShadow:      '0 1px 0 rgba(212,175,55,0.06)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          <h1
            className="text-base font-bold tracking-widest"
            style={{
              fontFamily: 'var(--rvn-font-display)',
              color: 'var(--gold)',
              letterSpacing: '0.08em',
              textShadow: '0 0 12px rgba(212,175,55,0.3)',
            }}
          >
            Lore Atlas
          </h1>
          {source === 'supabase' && (
            <span
              className="hidden sm:inline text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(34,197,94,0.1)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.2)',
                fontFamily: 'var(--rvn-font-display)',
                fontSize: '10px',
              }}
            >
              live
            </span>
          )}
          {source === 'static' && (
            <span
              className="hidden sm:inline text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(212,175,55,0.1)',
                color: 'var(--text-muted)',
                border: '1px solid rgba(212,175,55,0.15)',
                fontFamily: 'var(--rvn-font-display)',
                fontSize: '10px',
              }}
            >
              v1 · static
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--bg-border)', background: 'var(--bg-elevated)' }}
          >
            <button
              onClick={() => setView('map')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
              style={{
                background:  view === 'map' ? 'rgba(212,175,55,0.15)' : 'transparent',
                color:       view === 'map' ? 'var(--gold)' : 'var(--text-muted)',
                fontFamily:  'var(--rvn-font-display)',
                borderRight: '1px solid var(--bg-border)',
              }}
              aria-pressed={view === 'map'}
            >
              <Map className="w-3 h-3" />
              <span className="hidden sm:inline">Žemėlapis</span>
            </button>
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
              style={{
                background: view === 'list' ? 'rgba(212,175,55,0.15)' : 'transparent',
                color:      view === 'list' ? 'var(--gold)' : 'var(--text-muted)',
                fontFamily: 'var(--rvn-font-display)',
              }}
              aria-pressed={view === 'list'}
            >
              <List className="w-3 h-3" />
              <span className="hidden sm:inline">Sąrašas</span>
            </button>
          </div>

          <Link
            href="/cards"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Kortos
          </Link>
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-3 sm:px-4 py-4 gap-4 max-w-screen-2xl mx-auto w-full">

        {/* Filters row */}
        <LoreFilters
          factions={factions}
          activeFactionId={activeFaction}
          onChange={setActiveFaction}
          visibleCount={visibleLocations.length}
          totalCount={locations.length}
        />

        {/* ── Map view ─────────────────────────────────────────── */}
        {view === 'map' && (
          <>
            <div className="flex flex-col lg:flex-row gap-4 flex-1">
              <div className="flex-1 min-w-0">
                <LoreMap
                  locations={visibleLocations}
                  factions={factions}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
                {!selectedId && visibleLocations.length > 0 && (
                  <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
                    Spustelėk žymeklį žemėlapyje, kad pamatytum vietovės istoriją
                  </p>
                )}
                {visibleLocations.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Nėra vietovių pagal pasirinktus filtrus
                    </p>
                    {hasAnyFilter && (
                      <button
                        onClick={resetFilters}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Nustatyti filtrus iš naujo
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Desktop side panel */}
              {selectedLocation && (
                <div className="hidden lg:block shrink-0" style={{ width: '22rem' }}>
                  <div
                    className="rounded-xl overflow-hidden flex flex-col"
                    style={{
                      background: 'var(--bg-elevated)',
                      border:     '1px solid ' + (panelFaction?.color ?? 'var(--bg-border)') + '33',
                      boxShadow:  '0 0 40px rgba(0,0,0,0.7)',
                      maxHeight:  'calc(100vh - 12rem)',
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
            </div>
          </>
        )}

        {/* ── List view ─────────────────────────────────────────── */}
        {view === 'list' && (
          <div className="flex-1 space-y-8 pb-4">

            {/* Lokacijos */}
            <ListSection icon={<MapPin className="w-3.5 h-3.5" />} title="Lokacijos" count={visibleLocations.length}>
              {visibleLocations.length === 0 ? (
                <EmptyState message="Nėra lokacijų pagal pasirinktus filtrus" onReset={resetFilters} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {visibleLocations.map((loc) => {
                    const fac = loc.factionId ? factions.find((f) => f.id === loc.factionId) : undefined
                    return (
                      <div
                        key={loc.id}
                        className="rounded-xl p-4 flex flex-col gap-2"
                        style={{
                          background: 'var(--bg-surface)',
                          border:     '1px solid ' + (fac?.color ?? 'var(--bg-border)') + (fac ? '33' : ''),
                        }}
                      >
                        {/* Name + type */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              className="text-sm font-bold truncate"
                              style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}
                            >
                              {loc.name}
                            </p>
                            {fac && (
                              <p className="text-xs" style={{ color: fac.color }}>{fac.name}</p>
                            )}
                          </div>
                          <span
                            className="shrink-0 text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: 'rgba(212,175,55,0.08)',
                              color: 'var(--text-muted)',
                              border: '1px solid rgba(212,175,55,0.12)',
                              fontFamily: 'var(--rvn-font-display)',
                              fontSize: '10px',
                            }}
                          >
                            {loc.type}
                          </span>
                        </div>

                        {/* Description */}
                        {loc.description && (
                          <p
                            className="text-xs leading-relaxed line-clamp-3"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {loc.description}
                          </p>
                        )}

                        {/* Related cards */}
                        {loc.relatedCards.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {loc.relatedCards.map((c) => (
                              <CardChip key={c.cardNumber} cardNumber={c.cardNumber} name={c.name} />
                            ))}
                          </div>
                        )}

                        {/* Open on map */}
                        <button
                          onClick={() => { setView('map'); setSelectedId(loc.id) }}
                          className="self-start text-xs mt-auto transition-opacity hover:opacity-70"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Žemėlapyje →
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </ListSection>

            {/* Įvykiai */}
            <ListSection icon={<Scroll className="w-3.5 h-3.5" />} title="Įvykiai" count={visibleEvents.length}>
              {visibleEvents.length === 0 ? (
                <EmptyState message="Nėra įvykių pagal pasirinktus filtrus" onReset={resetFilters} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {visibleEvents.map((ev) => {
                    const era = eras.find((e) => e.index === ev.eraIndex)
                    return (
                      <div
                        key={ev.id}
                        className="rounded-xl p-4 flex flex-col gap-2"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className="text-sm font-bold"
                            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}
                          >
                            {ev.name}
                          </p>
                          {era && (
                            <span
                              className="shrink-0 text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                background: era.color + '22',
                                color: era.color,
                                border: '1px solid ' + era.color + '44',
                                fontFamily: 'var(--rvn-font-display)',
                                fontSize: '10px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {era.name}
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-xs leading-relaxed line-clamp-4" style={{ color: 'var(--text-secondary)' }}>
                            {ev.description}
                          </p>
                        )}
                        {ev.locationId && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            📍 {locations.find((l) => l.id === ev.locationId)?.name ?? ev.locationId}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ListSection>

            {/* Veikėjai */}
            <ListSection icon={<User className="w-3.5 h-3.5" />} title="Veikėjai" count={visibleCharacters.length}>
              {visibleCharacters.length === 0 ? (
                <EmptyState message="Nėra veikėjų pagal pasirinktus filtrus" onReset={resetFilters} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {visibleCharacters.map((ch) => {
                    const fac = ch.factionId ? factions.find((f) => f.id === ch.factionId) : undefined
                    return (
                      <div
                        key={ch.id}
                        className="rounded-xl p-3 flex flex-col gap-1.5"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid ' + (fac?.color ?? 'var(--bg-border)') + (fac ? '33' : ''),
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">👤</span>
                          <div className="min-w-0">
                            <p
                              className="text-xs font-bold truncate"
                              style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}
                            >
                              {ch.name}
                            </p>
                            {ch.title && (
                              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{ch.title}</p>
                            )}
                          </div>
                        </div>
                        {fac && (
                          <span className="text-xs" style={{ color: fac.color }}>{fac.name}</span>
                        )}
                        {ch.description && (
                          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
                            {ch.description}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ListSection>

            {/* Artefaktai */}
            <ListSection icon={<Sword className="w-3.5 h-3.5" />} title="Artefaktai" count={visibleArtifacts.length}>
              {visibleArtifacts.length === 0 ? (
                <EmptyState message="Artefaktų dar nėra" onReset={resetFilters} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {visibleArtifacts.map((art) => (
                    <div
                      key={art.id}
                      className="rounded-xl p-4 flex flex-col gap-2"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
                    >
                      <p
                        className="text-sm font-bold"
                        style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}
                      >
                        ✦ {art.name}
                      </p>
                      {art.description && (
                        <p className="text-xs leading-relaxed line-clamp-4" style={{ color: 'var(--text-secondary)' }}>
                          {art.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ListSection>

          </div>
        )}

        {/* ── Timeline ─────────────────────────────────────────── */}
        <LoreTimeline
          eras={eras}
          activeIndex={activeEraIndex}
          onChange={(idx) => {
            setActiveEraIndex(idx)
            if (selectedLocation && selectedLocation.firstEraIndex > idx) {
              setSelectedId(null)
            }
          }}
        />

        {/* ── Stats bar ────────────────────────────────────────── */}
        <div
          className="flex items-center justify-center gap-6 py-2 rounded-lg flex-wrap"
          style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.08)' }}
        >
          {[
            { n: locations.length,  label: 'Vietovių'  },
            { n: events.length,     label: 'Įvykių'    },
            { n: characters.length, label: 'Veikėjų'   },
            { n: artifacts.length,  label: 'Artefaktų' },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
                {n}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile bottom sheet (map view only) ─────────────────── */}
      {view === 'map' && (
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
      )}
    </div>
  )
}
