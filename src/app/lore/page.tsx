'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import {
  loreEras, loreLocations, loreEvents, loreCharacters, loreArtifacts, loreFactions,
  getCharacterById, getArtifactById, getFactionById,
} from '@/data/lore'
import { LoreMap }      from '@/components/lore/LoreMap'
import { LorePanel }    from '@/components/lore/LorePanel'
import { LoreTimeline } from '@/components/lore/LoreTimeline'
import { LoreFilters }  from '@/components/lore/LoreFilters'

export default function LorePage() {
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [activeEraIndex, setActiveEraIndex] = useState<number>(loreEras.length - 1)
  const [activeFaction,  setActiveFaction]  = useState<string | null>(null)

  // Filter locations by era and faction
  const visibleLocations = useMemo(() => {
    return loreLocations.filter((loc) => {
      const eraOk    = loc.firstEraIndex <= activeEraIndex
      const facOk    = activeFaction === null || loc.factionId === activeFaction
      return eraOk && facOk
    })
  }, [activeEraIndex, activeFaction])

  // Derive panel data
  const selectedLocation = useMemo(
    () => loreLocations.find((l) => l.id === selectedId) ?? null,
    [selectedId],
  )
  const panelFaction    = selectedLocation?.factionId ? getFactionById(selectedLocation.factionId) : undefined
  const panelEvents     = useMemo(
    () => loreEvents.filter(
      (e) => e.locationId === selectedId && e.eraIndex <= activeEraIndex,
    ),
    [selectedId, activeEraIndex],
  )
  const panelCharacters = useMemo(
    () => (selectedLocation?.characterIds ?? []).map(getCharacterById).filter(Boolean) as ReturnType<typeof getCharacterById>[],
    [selectedLocation],
  )
  const panelArtifacts  = useMemo(
    () => (selectedLocation?.artifactIds ?? []).map(getArtifactById).filter(Boolean) as ReturnType<typeof getArtifactById>[],
    [selectedLocation],
  )

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
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
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em', textShadow: '0 0 12px rgba(212,175,55,0.3)' }}
          >
            Lore Atlas
          </h1>
          <span
            className="hidden sm:inline text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--text-muted)', border: '1px solid rgba(212,175,55,0.15)', fontFamily: 'var(--rvn-font-display)', fontSize: '10px' }}
          >
            v1 · lore data
          </span>
        </div>

        <div className="flex items-center gap-2">
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
          factions={loreFactions}
          activeFactionId={activeFaction}
          onChange={setActiveFaction}
          visibleCount={visibleLocations.length}
          totalCount={loreLocations.length}
        />

        {/* Map + Panel */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1">

          {/* Map — takes all available width, shrinks to make room for panel */}
          <div className="flex-1 min-w-0">
            <LoreMap
              locations={visibleLocations}
              factions={loreFactions}
              selectedId={selectedId}
              onSelect={handleSelect}
            />

            {/* Hint when nothing selected */}
            {!selectedId && visibleLocations.length > 0 && (
              <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
                Spustelėk žymeklį žemėlapyje, kad pamatytum vietovės istoriją
              </p>
            )}
          </div>

          {/* Desktop side panel — static position, not overlaid */}
          {selectedLocation && (
            <div className="hidden lg:block shrink-0" style={{ width: '22rem' }}>
              <div
                className="rounded-xl overflow-hidden flex flex-col"
                style={{
                  background:  'var(--bg-elevated)',
                  border:      '1px solid ' + (panelFaction?.color ?? 'var(--bg-border)') + '33',
                  boxShadow:   '0 0 40px rgba(0,0,0,0.7)',
                  maxHeight:   'calc(100vh - 12rem)',
                }}
              >
                <LorePanel
                  location={selectedLocation}
                  faction={panelFaction}
                  events={panelEvents}
                  characters={panelCharacters as NonNullable<ReturnType<typeof getCharacterById>>[]}
                  artifacts={panelArtifacts as NonNullable<ReturnType<typeof getArtifactById>>[]}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <LoreTimeline
          eras={loreEras}
          activeIndex={activeEraIndex}
          onChange={(idx) => {
            setActiveEraIndex(idx)
            // Deselect if location not visible in new era
            if (selectedLocation && selectedLocation.firstEraIndex > idx) {
              setSelectedId(null)
            }
          }}
        />

        {/* Stats bar */}
        <div
          className="flex items-center justify-center gap-6 py-2 rounded-lg"
          style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.08)' }}
        >
          {[
            { n: loreLocations.length, label: 'Vietovių'  },
            { n: loreEvents.length,    label: 'Įvykių'    },
            { n: loreCharacters.length,label: 'Veikėjų'   },
            { n: loreArtifacts.length, label: 'Artefaktų' },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{n}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile bottom sheet panel — rendered outside main flow via fixed positioning in LorePanel */}
      <div className="lg:hidden">
        <LorePanel
          location={selectedLocation}
          faction={panelFaction}
          events={panelEvents}
          characters={panelCharacters as NonNullable<ReturnType<typeof getCharacterById>>[]}
          artifacts={panelArtifacts as NonNullable<ReturnType<typeof getArtifactById>>[]}
          onClose={() => setSelectedId(null)}
        />
      </div>
    </div>
  )
}
