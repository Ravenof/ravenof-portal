import { redirect, notFound } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { DeckBuilderClient } from '../DeckBuilderClient'
import type { CardWithRelations, CollectionMap, DeckEntry, DeckVisibility } from '@/types'

export const metadata = { title: 'Redaguoti kaladę' }

async function fetchEditData(deckId: string) {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { user: null, deck: null, cards: [], factions: [], collection: {} }

  const [
    { data: deck },
    { data: cards },
    { data: factions },
    { data: collectionRows },
    { data: deckCards },
  ] = await Promise.all([
    supabase
      .from('decks')
      .select('id, name, description, faction_id, visibility')
      .eq('id', deckId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('cards')
      .select(`
        id, card_number, name, gold_cost, attack, health,
        description, effect_text, image_url, is_champion, status,
        faction_id, card_type_id, rarity_id,
        faction:factions ( id, name, slug, color_hex ),
        card_type:card_types ( id, name, icon_url ),
        rarity:rarities ( id, name, copy_limit, color_hex ),
        card_keywords ( keyword:keywords ( id, name ) )
      `)
      .eq('status', 'active')
      .order('gold_cost')
      .order('name'),
    supabase.from('factions').select('*').order('sort_order'),
    supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
    supabase
      .from('deck_cards')
      .select('card_id, quantity, is_side_deck')
      .eq('deck_id', deckId),
  ])

  if (!deck) return { user, deck: null, cards: [], factions: [], collection: {} }

  const collection: CollectionMap = Object.fromEntries(
    (collectionRows ?? []).map((r) => [r.card_id, r.quantity])
  )

  // Build DeckEntry list: match deck_cards to full card objects
  const allCards = (cards as unknown as CardWithRelations[]) ?? []
  const cardMap = Object.fromEntries(allCards.map((c) => [c.id, c]))

  const sortFn = (a: DeckEntry, b: DeckEntry) => {
    const gc = (a.card.gold_cost ?? 0) - (b.card.gold_cost ?? 0)
    if (gc !== 0) return gc
    return a.card.name.localeCompare(b.card.name)
  }

  const rows = (deckCards ?? []).filter((dc) => cardMap[dc.card_id])
  const entries: DeckEntry[] = rows
    .filter((dc) => !(dc as { is_side_deck?: boolean }).is_side_deck)
    .map((dc) => ({ card: cardMap[dc.card_id], quantity: dc.quantity }))
    .sort(sortFn)
  const sideEntries: DeckEntry[] = rows
    .filter((dc) => (dc as { is_side_deck?: boolean }).is_side_deck)
    .map((dc) => ({ card: cardMap[dc.card_id], quantity: dc.quantity }))
    .sort(sortFn)

  return {
    user,
    deck: {
      id: deck.id as string,
      name: deck.name as string,
      description: (deck.description ?? '') as string,
      factionId: deck.faction_id as number | null,
      visibility: deck.visibility as DeckVisibility,
      entries,
      sideEntries,
    },
    cards: allCards,
    factions: factions ?? [],
    collection,
  }
}

export default async function EditDeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params
  const { user, deck, cards, factions, collection } = await fetchEditData(deckId)

  if (!user) redirect(`/login?next=/deck-builder/${deckId}`)
  if (!deck) notFound()

  return (
    <DeckBuilderClient
      userId={user.id}
      cards={cards}
      factions={factions}
      collection={collection}
      deckId={deck.id}
      initialDeck={{
        id: deck.id,
        name: deck.name,
        description: deck.description,
        factionId: deck.factionId,
        visibility: deck.visibility,
        entries: deck.entries,
        sideEntries: deck.sideEntries,
      }}
    />
  )
}
