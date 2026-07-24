'use client'

// ── Ravenof Digital — Kaladžių hub (segment tabs: Builder / Mano / Community) ──
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { playUiClick } from '@/lib/ui-sound'
import { DigitalDeckBuilder } from './DigitalDeckBuilder'
import { DigitalMyDecks } from './DigitalMyDecks'
import { DigitalCommunityDecks } from './DigitalCommunityDecks'
import type { CardWithRelations, Faction, CollectionMap, DeckVisibility } from '@/types'
import { useT } from '@/lib/i18n/react'

type Tab = 'builder' | 'my' | 'community'
type InitialDeck = {
  id: string; name: string; description: string; factionId: number | null
  visibility: DeckVisibility; entries: { card: CardWithRelations; quantity: number }[]
  sideEntries: { card: CardWithRelations; quantity: number }[]
} | null

type Props = {
  userId: string; cards: CardWithRelations[]; factions: Faction[]; collection: CollectionMap
  initialTab: Tab; initialDeck: InitialDeck
}

const TAB_DEFS: { key: Tab; labelKey: string }[] = [
  { key: 'my',        labelKey: 'decks.tabs.my' },
  { key: 'builder',   labelKey: 'decks.tabs.builder' },
  { key: 'community', labelKey: 'decks.tabs.community' },
]

export function DigitalDecks({ userId, cards, factions, collection, initialTab, initialDeck }: Props) {
  const router = useRouter()
  const t = useT()
  const [tab, setTab] = useState<Tab>(initialTab)
  // „Redaguoti" iš Mano kaladžių keičia tik URL query — komponentas nepersimontuoja,
  // todėl tab/deck reikia sinchronizuoti rankiniu būdu
  useEffect(() => { setTab(initialTab) }, [initialTab, initialDeck?.id])

  return (
    <div className="ravenof-body h-full flex flex-col min-h-0 ravenof-in">
      {/* Antraštė + segmentuoti tabai (patvirtintas UI; builder'yje slepiam: kiekvienas px kortoms) */}
      {tab !== 'builder' && <div className="flex items-center shrink-0" style={{ gap: 12, paddingBottom: 10 }}>
        <div style={{ font: '700 15px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('decks.title')}</div>
        <div className="flex-1" />
        <div className="flex" style={{ border: '1px solid var(--ravenof-border-strong)' }}>
          {TAB_DEFS.map((tb) => {
            const active = tab === tb.key
            return (
              <button key={tb.key} onClick={() => { playUiClick(); setTab(tb.key) }}
                className="ravenof-press"
                style={{ textAlign: 'center', padding: '8px 14px', font: '700 10px var(--ravenof-font-display)', letterSpacing: '.5px', textTransform: 'uppercase',
                  color: active ? 'var(--ravenof-on-gold)' : 'var(--ravenof-text-secondary)',
                  background: active ? 'var(--ravenof-grad-gold)' : 'transparent',
                  borderRight: '1px solid var(--ravenof-border-strong)', cursor: 'pointer' }}>{t(tb.labelKey)}</button>
            )
          })}
        </div>
      </div>}

      <div className="flex-1 min-h-0" style={{ overflowY: tab === 'builder' ? 'hidden' : 'auto' }}>
        {tab === 'builder' && (
          <DigitalDeckBuilder userId={userId} cards={cards} factions={factions} collection={collection} initialDeck={initialDeck}
            onSaved={() => { router.push('/digital/decks?tab=my'); setTab('my') }}
            onBack={() => setTab('my')} />
        )}
        {tab === 'my' && (
          <DigitalMyDecks userId={userId}
            onEdit={(id) => router.push('/digital/decks?tab=builder&deck=' + id)}
            onCreate={() => router.push('/digital/decks?tab=builder')} />
        )}
        {tab === 'community' && <DigitalCommunityDecks userId={userId} />}
      </div>
    </div>
  )
}
