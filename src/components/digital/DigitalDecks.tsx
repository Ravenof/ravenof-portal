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

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'builder',   label: 'Deck Builder', icon: Hammer },
  { key: 'my',        label: 'Mano kaladės', icon: Library },
  { key: 'community', label: 'Bendruomenė',  icon: Users },
]

export function DigitalDecks({ userId, cards, factions, collection, initialTab, initialDeck }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div>
      {/* Segment tabs */}
      <div className="flex gap-1 p-1 rounded-2xl mb-3" style={{ background: 'rgba(10,8,16,0.8)', border: '1px solid rgba(240,180,41,0.18)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => { playUiClick(); setTab(t.key) }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold transition-colors"
              style={{ minHeight: 42, background: active ? 'rgba(240,180,41,0.18)' : 'transparent', color: active ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', boxShadow: active ? 'inset 0 0 12px rgba(240,180,41,0.12)' : 'none' }}>
              <Icon className="w-4 h-4" /> <span className="truncate">{t.label}</span>
            </button>
          )
        })}
      </div>

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
  )
}
