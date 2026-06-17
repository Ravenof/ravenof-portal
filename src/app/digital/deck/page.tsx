import { redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { DeckBuilderClient } from '@/app/deck-builder/DeckBuilderClient'
import type { CardWithRelations, CollectionMap } from '@/types'

export const metadata = { title: 'Kaladžių kūrėjas | Ravenof Digital' }

// Bendras kortų pulas (kešuotas, kaip /deck-builder) — duplikatas Digital aplinkai.
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
    return { cards: (cards as unknown as CardWithRelations[]) ?? [], factions: factions ?? [] }
  },
  ['deck-builder-cards'],
  { revalidate: 600, tags: ['cards'] }
)

export default async function DigitalDeckPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login?next=/digital/deck')

  const supabase = await createClient()
  const [{ cards, factions }, { data: collectionRows }] = await Promise.all([
    getCachedBuilderCards(),
    supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
  ])
  const collection: CollectionMap = Object.fromEntries((collectionRows ?? []).map((r) => [r.card_id, r.quantity]))

  return (
    <DeckBuilderClient userId={user.id} cards={cards} factions={factions} collection={collection} deckId={null} initialDeck={null} embedded />
  )
}
