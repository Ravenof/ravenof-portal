'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { DeckFactionSelect } from '@/components/deck-builder/DeckFactionSelect'
import { DeckCardPool } from '@/components/deck-builder/DeckCardPool'
import { DeckListPanel } from '@/components/deck-builder/DeckListPanel'
import { DeckStats } from '@/components/deck-builder/DeckStats'
import { DeckValidationWarnings } from '@/components/deck-builder/DeckValidationWarnings'
import { SaveDeckButton } from '@/components/deck-builder/SaveDeckButton'
import { validateDeck, DECK_MIN } from '@/lib/deck-validation'
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

type ValidityState = 'valid' | 'almost' | 'invalid'

function getDeckValidity(
  entries: DeckEntry[],
  factionId: number | null,
  name: string,
): { state: ValidityState; label: string } {
  const allWarnings = validateDeck(entries, factionId, name)
  const errors = allWarnings.filter((w) => w.type === 'error')
  const total = entries.reduce((s, e) => s + e.quantity, 0)

  if (errors.length === 0) {
    return { state: 'valid', label: 'Deck galioja' }
  }

  // "Almost ready": has a name, has a faction, has cards, only issue is card count
  const hasName = name.trim().length > 0
  const hasFaction = factionId !== null
  const onlyCountIssue =
    errors.length === 1 &&
    total > 0 &&
    total < DECK_MIN

  if (hasName && hasFaction && onlyCountIssue) {
    const missing = DECK_MIN - total
    return { state: 'almost', label: `Dar ${missing} kortų` }
  }

  // Also "almost" if we have decent progress (faction + name + >15 cards but other minor issues)
  if (hasName && hasFaction && total >= 15) {
    return { state: 'almost', label: 'Beveik paruoštas' }
  }

  return { state: 'invalid', label: 'Negalioja' }
}

const VALIDITY_STYLES: Record<ValidityState, { color: string; bg: string; border: string }> = {
  valid:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
  almost:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  invalid: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' },
}

const VALIDITY_ICONS: Record<ValidityState, React.ElementType> = {
  valid:   CheckCircle2,
  almost:  Clock,
  invalid: AlertCircle,
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

  const allWarnings = validateDeck(store.entries, store.factionId, store.name)
  const errors = allWarnings.filter((w) => w.type === 'error')
  const { state: validityState, label: validityLabel } = getDeckValidity(
    store.entries, store.factionId, store.name
  )
  const vstyle = VALIDITY_STYLES[validityState]
  const VIcon = VALIDITY_ICONS[validityState]

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
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <Link
            href="/community-decks"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            Viesos decks
          </Link>

          {/* Title */}
          <h1
            className="text-lg font-bold flex-1 text-center hidden sm:block"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
          >
            {deckId ? 'Redaguoti Deck' : 'Deck Builder'}
          </h1>

          {/* Validity badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: vstyle.bg, border: '1px solid ' + vstyle.border, color: vstyle.color }}
          >
            <VIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{validityLabel}</span>
          </div>

          {/* Owned only toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={store.ownedOnly}
                onChange={(e) => store.setOwnedOnly(e.target.checked)}
              />
              <div
                className="w-8 h-4 rounded-full transition-colors"
                style={{ background: store.ownedOnly ? '#22c55e' : 'var(--bg-border)' }}
              />
              <div
                className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                style={{ transform: store.ownedOnly ? 'translateX(16px)' : 'none' }}
              />
            </div>
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>Tik mano</span>
          </label>

          {/* Stats toggle (mobile) */}
          <button
            onClick={() => setShowStats((v) => !v)}
            className="lg:hidden p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
            title="Statistika"
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
              border: '1px solid ' + (store.name.trim() ? 'var(--bg-border)' : '#ef4444'),
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

        {/* Desktop: side by side */}
        <div className="hidden lg:flex gap-4">

          {/* Card pool */}
          <div className="flex-1 min-w-0">
            <div
              className="rounded-xl p-4 flex flex-col"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--bg-border)',
                height: 'calc(100vh - 240px)',
              }}
            >
              <DeckCardPool cards={cards} collection={collection} />
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-3 w-72 flex-shrink-0">
            {/* Deck list */}
            <div
              className="rounded-xl p-4 flex flex-col"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--bg-border)',
                height: '46vh',
                minHeight: '280px',
              }}
            >
              <DeckListPanel />
            </div>

            {/* Validation warnings */}
            {allWarnings.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                <DeckValidationWarnings warnings={allWarnings} />
              </div>
            )}

            {/* Stats */}
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <DeckStats />
            </div>
          </div>
        </div>

        {/* Mobile layout: card pool first, deck below */}
        <div className="lg:hidden flex flex-col gap-3">
          {/* Card pool */}
          <div
            className="rounded-xl p-3 flex flex-col"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--bg-border)',
              height: '55vh',
              minHeight: '320px',
            }}
          >
            <DeckCardPool cards={cards} collection={collection} />
          </div>

          {/* Deck list */}
          <div
            className="rounded-xl p-3 flex flex-col"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--bg-border)',
              height: '45vh',
              minHeight: '260px',
            }}
          >
            <DeckListPanel />
          </div>

          {/* Warnings */}
          {allWarnings.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <DeckValidationWarnings warnings={allWarnings} />
            </div>
          )}

          {/* Stats (toggled) */}
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
