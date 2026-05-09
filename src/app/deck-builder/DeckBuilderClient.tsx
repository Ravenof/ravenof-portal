'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, List, Eye, EyeOff } from 'lucide-react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { DeckFactionSelect } from '@/components/deck-builder/DeckFactionSelect'
import { DeckCardPool } from '@/components/deck-builder/DeckCardPool'
import { DeckListPanel } from '@/components/deck-builder/DeckListPanel'
import { DeckStats } from '@/components/deck-builder/DeckStats'
import { DeckValidationWarnings } from '@/components/deck-builder/DeckValidationWarnings'
import { SaveDeckButton } from '@/components/deck-builder/SaveDeckButton'
import { validateDeck } from '@/lib/deck-validation'
import type { CardWithRelations, CollectionMap, Faction, DeckEntry, DeckVisibility } from '@/types'

type InitialDeck = {
  id: string
  name: string
  description: string
  factionId: number | null
  visibility: DeckVisibility
  entries: DeckEntry[]
} | null

type Props = {
  userId: string
  cards: CardWithRelations[]
  factions: Faction[]
  collection: CollectionMap
  deckId: string | null
  initialDeck: InitialDeck
}

export function DeckBuilderClient({ userId, cards, factions, collection, deckId, initialDeck }: Props) {
  const store = useDeckBuilderStore()
  const [showStats, setShowStats] = useState(false)

  // Init store once
  useEffect(() => {
    if (initialDeck) {
      store.loadExisting(
        initialDeck.id, initialDeck.name, initialDeck.description,
        initialDeck.factionId, initialDeck.visibility, initialDeck.entries
      )
    } else if (!deckId) {
      store.initNew()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const warnings = validateDeck(store.entries, store.factionId, store.name)
  const errors = warnings.filter((w) => w.type === 'error')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* ── HEADER ── */}
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--bg-border)',
        }}
      >
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3 flex-wrap">
          {/* Nav */}
          <Link
            href="/cards"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Kortų bazė
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <Link
            href="/my-decks"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            Mano decks
          </Link>

          {/* Title */}
          <h1
            className="text-lg font-bold flex-1 text-center"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
          >
            {deckId ? 'Redaguoti Deck' : 'Deck Builder'}
          </h1>

          {/* Owned only toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={store.ownedOnly}
                onChange={(e) => store.setOwnedOnly(e.target.checked)}
              />
              <div className="w-8 h-4 rounded-full transition-colors" style={{ background: store.ownedOnly ? '#22c55e' : 'var(--bg-border)' }} />
              <div className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform" style={{ transform: store.ownedOnly ? 'translateX(16px)' : 'none' }} />
            </div>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tik mano</span>
          </label>

          {/* Stats toggle (mobile) */}
          <button
            onClick={() => setShowStats((v) => !v)}
            className="lg:hidden p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
          >
            {showStats ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Save */}
          <SaveDeckButton userId={userId} />
        </div>
      </header>

      {/* ── DECK NAME + DESCRIPTION ── */}
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--bg-border)', background: 'var(--bg-surface)' }}>
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Deck pavadinimas..."
            value={store.name}
            onChange={(e) => store.setName(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{
              background: 'var(--bg-elevated)',
              border: `1px solid ${store.name.trim() ? 'var(--bg-border)' : '#ef4444'}`,
              color: 'var(--text-primary)',
              outline: 'none',
              fontFamily: 'Cinzel, Georgia, serif',
            }}
          />
          <input
            type="text"
            placeholder="Aprašymas (neprivaloma)"
            value={store.description}
            onChange={(e) => store.setDescription(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--bg-border)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── FACTION SELECT ── */}
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-2xl mx-auto">
          <DeckFactionSelect
            factions={factions}
            selected={store.factionId}
            onChange={store.setFaction}
          />
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-4">
        <div className="flex gap-4 h-full">

          {/* Card pool – left/main */}
          <div className="flex-1 min-w-0">
            <div
              className="rounded-xl p-4 h-full flex flex-col"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--bg-border)',
                maxHeight: 'calc(100vh - 220px)',
              }}
            >
              <DeckCardPool cards={cards} collection={collection} />
            </div>
          </div>

          {/* Deck panel – right */}
          <div className="hidden lg:flex flex-col gap-3 w-72 flex-shrink-0">
            {/* Deck list */}
            <div
              className="rounded-xl p-4 flex flex-col"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--bg-border)',
                height: '50vh',
                minHeight: '300px',
              }}
            >
              <DeckListPanel />
            </div>

            {/* Validation warnings */}
            {errors.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                <DeckValidationWarnings warnings={errors} />
              </div>
            )}

            {/* Stats */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
            >
              <DeckStats />
            </div>
          </div>
        </div>

        {/* Mobile: deck list + stats below */}
        <div className="lg:hidden mt-4 space-y-3">
          <div
            className="rounded-xl p-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', minHeight: '200px' }}
          >
            <DeckListPanel />
          </div>
          {errors.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <DeckValidationWarnings warnings={errors} />
            </div>
          )}
          {showStats && (
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <DeckStats />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
