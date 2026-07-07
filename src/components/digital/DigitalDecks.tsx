'use client'

// ── Ravenof Digital — Kaladžių hub (segment tabs: Builder / Mano / Community) ──
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hammer, Library, Users } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'
import { DigitalDeckBuilder } from './DigitalDeckBuilder'
import { DigitalMyDecks } from './DigitalMyDecks'
import { DigitalCommunityDecks } from './DigitalCommunityDecks'
import type { CardWithRelations, Faction, CollectionMap, DeckVisibility } from '@/types'
import { PageHero } from './ui/HubKit'

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

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { key: 'builder',   label: 'Deck Builder', icon: Hammer },
  { key: 'my',        label: 'Mano kaladės', icon: Library },
  { key: 'community', label: 'Bendruomenė',  icon: Users },
]

export function DigitalDecks({ userId, cards, factions, collection, initialTab, initialDeck }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div className="h-full flex flex-col min-h-0">
      {tab !== 'builder' && (
        <div className="mb-3">
          <PageHero compact iconName="fi-decks" icon={<span style={{ fontSize: 28 }}>📚</span>} title="KALADĖS" sub="Kurk, tvarkyk ir dalinkis kovos kaladėmis" />
        </div>
      )}
      {/* Segment tabs — dark fantasy oktagonai */}
      <div className="grid grid-cols-3 gap-1.5 mb-3 shrink-0">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          const oct = (b: number) => `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`
          return (
            <button key={t.key} onClick={() => { playUiClick(); setTab(t.key) }}
              className="rvn-press block w-full"
              style={{ filter: active ? 'drop-shadow(0 0 8px rgba(240,180,41,0.35))' : 'saturate(0.7) brightness(0.8)', transition: 'filter .15s' }}>
              <span className="block" style={{ clipPath: oct(9), padding: 1.5, background: active ? 'rgba(240,180,41,0.9)' : 'rgba(240,180,41,0.28)' }}>
                <span className="flex flex-col items-center justify-center" style={{ clipPath: oct(8), gap: 2, minHeight: 48, padding: '6px 4px',
                  background: active
                    ? 'radial-gradient(120% 140% at 50% 0%, rgba(240,180,41,0.22), transparent 60%), linear-gradient(160deg, rgba(24,18,32,0.98), rgba(8,6,12,0.98))'
                    : 'linear-gradient(160deg, rgba(16,12,22,0.97), rgba(8,6,12,0.98))' }}>
                  <Icon className="w-4 h-4" style={{ color: active ? 'var(--gold)' : 'rgba(150,160,185,0.8)' }} />
                  <span className="rvn-disp truncate" style={{ maxWidth: '100%', fontSize: 10, fontWeight: 800, letterSpacing: '0.03em', color: active ? 'var(--gold)' : 'rgba(150,160,185,0.85)' }}>{t.label}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

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
