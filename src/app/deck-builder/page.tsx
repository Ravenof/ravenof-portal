import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { DeckBuilderClient } from './DeckBuilderClient'
import type { CardWithRelations, CollectionMap } from '@/types'

export const metadata = { title: 'Kaladžių kūrėjas' }

// Cards + factions — shared across all users, invalidated via 'cards' tag when admin updates
const getCachedBuilderCards = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const [{ data: cards }, { data: factions }] = await Promise.all([
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
    ])
    return {
      cards: (cards as unknown as CardWithRelations[]) ?? [],
      factions: factions ?? [],
    }
  },
  ['deck-builder-cards'],
  { revalidate: 600, tags: ['cards'] } // 10min, invalidated by admin card actions
)

async function fetchBuilderData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, cards: [], factions: [], collection: {} }

  // Parallel: cached card pool + fresh user collection
  const [{ cards, factions }, { data: collectionRows }] = await Promise.all([
    getCachedBuilderCards(),
    supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
  ])

  const collection: CollectionMap = Object.fromEntries(
    (collectionRows ?? []).map((r) => [r.card_id, r.quantity])
  )

  return { user, cards, factions, collection }
}

export default async function DeckBuilderPage() {
  const { user, cards, factions, collection } = await fetchBuilderData()
  if (!user) redirect('/login?next=/deck-builder')

  return (
    <DeckBuilderClient
      userId={user.id}
      cards={cards}
      factions={factions}
      collection={collection}
      deckId={null}
      initialDeck={null}
    />
  )
}