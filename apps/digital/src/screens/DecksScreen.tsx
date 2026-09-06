// /digital/decks – serverio puslapio (src/app/digital/decks/page.tsx) kliento versija:
// tie patys užklausų laukai, tas pats DigitalDecks komponentas.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { DigitalDecks } from '@/components/digital/DigitalDecks'
import { createClient } from '@/lib/supabase/client'
import type { CardWithRelations, CollectionMap, DeckEntry, DeckVisibility, Faction } from '@/types'
import { RequireUser } from './RequireUser'

type Tab = 'builder' | 'my' | 'community'
type InitialDeck = { id: string; name: string; description: string; factionId: number | null; visibility: DeckVisibility; entries: DeckEntry[]; sideEntries: DeckEntry[] } | null
type Loaded = { cards: CardWithRelations[]; factions: Faction[]; collection: CollectionMap; initialDeck: InitialDeck }

const CARD_SEL = `
  id, card_number, name, gold_cost, attack, health,
  description, effect_text, image_url, is_champion, status,
  faction_id, card_type_id, rarity_id,
  faction:factions ( id, name, slug, color_hex, icon_url ),
  card_type:card_types ( id, name, icon_url ),
  rarity:rarities ( id, name, copy_limit, color_hex ),
  card_keywords ( keyword:keywords ( id, name ) )
`

let cardsCache: { cards: CardWithRelations[]; factions: Faction[]; at: number } | null = null

async function loadBuilderCards() {
  if (cardsCache && Date.now() - cardsCache.at < 600_000) return cardsCache
  const sb = createClient()
  const [{ data: cards }, { data: factions }] = await Promise.all([
    sb.from('cards').select(CARD_SEL).eq('status', 'active').order('gold_cost').order('name'),
    sb.from('factions').select('*').order('sort_order'),
  ])
  cardsCache = { cards: (cards as unknown as CardWithRelations[]) ?? [], factions: (factions as Faction[]) ?? [], at: Date.now() }
  return cardsCache
}

function Inner({ user }: { user: User }) {
  const [sp] = useSearchParams()
  const deckId = sp.get('deck')
  const tabParam = sp.get('tab')
  const tab: Tab = tabParam === 'builder' ? 'builder' : tabParam === 'community' ? 'community' : 'my'
  const [data, setData] = useState<Loaded | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const sb = createClient()
      const [{ cards, factions }, { data: collectionRows }] = await Promise.all([
        loadBuilderCards(),
        sb.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
      ])
      const collection: CollectionMap = Object.fromEntries((collectionRows ?? []).map((r) => [r.card_id, r.quantity]))
      let initialDeck: InitialDeck = null
      if (deckId) {
        const [{ data: deck }, { data: deckCards }] = await Promise.all([
          sb.from('decks').select('id, name, description, faction_id, visibility').eq('id', deckId).eq('user_id', user.id).single(),
          sb.from('deck_cards').select('card_id, quantity, is_side_deck').eq('deck_id', deckId),
        ])
        if (deck) {
          const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]))
          const sortFn = (a: DeckEntry, b: DeckEntry) => ((a.card.gold_cost ?? 0) - (b.card.gold_cost ?? 0)) || a.card.name.localeCompare(b.card.name)
          const rows = (deckCards ?? []).filter((dc) => cardMap[dc.card_id])
          const entries = rows.filter((dc) => !(dc as { is_side_deck?: boolean }).is_side_deck).map((dc) => ({ card: cardMap[dc.card_id], quantity: dc.quantity })).sort(sortFn)
          const sideEntries = rows.filter((dc) => (dc as { is_side_deck?: boolean }).is_side_deck).map((dc) => ({ card: cardMap[dc.card_id], quantity: dc.quantity })).sort(sortFn)
          initialDeck = { id: deck.id as string, name: deck.name as string, description: (deck.description ?? '') as string, factionId: deck.faction_id as number | null, visibility: deck.visibility as DeckVisibility, entries, sideEntries }
        }
      }
      if (alive) setData({ cards, factions, collection, initialDeck })
    })()
    return () => { alive = false }
  }, [user.id, deckId])

  if (!data) return null
  return <DigitalDecks key={`${tab}:${deckId ?? ''}`} userId={user.id} cards={data.cards} factions={data.factions} collection={data.collection} initialTab={tab} initialDeck={data.initialDeck} />
}

export default function DecksScreen() { return <RequireUser>{(u) => <Inner user={u} />}</RequireUser> }
