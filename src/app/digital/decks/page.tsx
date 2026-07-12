import { getServerT } from '@/lib/i18n/server'
import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { DigitalDecks } from '@/components/digital/DigitalDecks'
import type { CardWithRelations, CollectionMap, DeckEntry, DeckVisibility } from '@/types'

export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('navigation.decks')} | Ravenof Digital` }
}

type Tab = 'builder' | 'my' | 'community'
type SearchParams = Promise<{ tab?: string; deck?: string }>

const getCachedBuilderCards = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const [{ data: cards }, { data: factions }] = await Promise.all([
      supabase.from('cards').select(`
        id, card_number, name, gold_cost, attack, health,
        description, effect_text, image_url, is_champion, status,
        faction_id, card_type_id, rarity_id,
        faction:factions ( id, name, slug, color_hex, icon_url ),
        card_type:card_types ( id, name, icon_url ),
        rarity:rarities ( id, name, copy_limit, color_hex ),
        card_keywords ( keyword:keywords ( id, name ) )
      `).eq('status', 'active').order('gold_cost').order('name'),
      supabase.from('factions').select('*').order('sort_order'),
    ])
    return { cards: (cards as unknown as CardWithRelations[]) ?? [], factions: factions ?? [] }
  },
  ['deck-builder-cards'],
  { revalidate: 600, tags: ['cards'] }
)

export default async function DigitalDecksPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCachedUser()
  if (!user) redirect('/digital/login?next=/digital/decks')

  const params = await searchParams
  const deckId = params.deck ?? null
  const tab: Tab = params.tab === 'builder' ? 'builder' : params.tab === 'community' ? 'community' : 'my'

  const supabase = await createClient()
  const [{ cards, factions }, { data: collectionRows }] = await Promise.all([
    getCachedBuilderCards(),
    supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
  ])
  const collection: CollectionMap = Object.fromEntries((collectionRows ?? []).map((r) => [r.card_id, r.quantity]))

  // Redagavimas — užkraunam konkrečią kaladę
  let initialDeck: {
    id: string; name: string; description: string; factionId: number | null
    visibility: DeckVisibility; entries: DeckEntry[]; sideEntries: DeckEntry[]
  } | null = null

  if (deckId) {
    const [{ data: deck }, { data: deckCards }] = await Promise.all([
      supabase.from('decks').select('id, name, description, faction_id, visibility').eq('id', deckId).eq('user_id', user.id).single(),
      supabase.from('deck_cards').select('card_id, quantity, is_side_deck').eq('deck_id', deckId),
    ])
    if (deck) {
      const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]))
      const sortFn = (a: DeckEntry, b: DeckEntry) => ((a.card.gold_cost ?? 0) - (b.card.gold_cost ?? 0)) || a.card.name.localeCompare(b.card.name)
      const rows = (deckCards ?? []).filter((dc) => cardMap[dc.card_id])
      const entries = rows.filter((dc) => !(dc as { is_side_deck?: boolean }).is_side_deck).map((dc) => ({ card: cardMap[dc.card_id], quantity: dc.quantity })).sort(sortFn)
      const sideEntries = rows.filter((dc) => (dc as { is_side_deck?: boolean }).is_side_deck).map((dc) => ({ card: cardMap[dc.card_id], quantity: dc.quantity })).sort(sortFn)
      initialDeck = {
        id: deck.id as string, name: deck.name as string, description: (deck.description ?? '') as string,
        factionId: deck.faction_id as number | null, visibility: deck.visibility as DeckVisibility, entries, sideEntries,
      }
    }
  }

  return (
    <DigitalDecks userId={user.id} cards={cards} factions={factions} collection={collection} initialTab={tab} initialDeck={initialDeck} />
  )
}
