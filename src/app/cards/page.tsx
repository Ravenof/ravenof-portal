import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CardGrid, CardGridSkeleton } from '@/components/cards/CardGrid'
import { CardFilters } from '@/components/cards/CardFilters'
import type { CardWithRelations, CollectionMap } from '@/types'

type PageProps = {
  searchParams: Promise<{
    search?:    string
    faction_id?: string
    type_id?:   string
    rarity_id?: string
    gold_min?:  string
    gold_max?:  string
    owned_only?: string
  }>
}

export const metadata = { title: 'Kortu Duomenu Baze' }

async function fetchCards(params: Awaited<PageProps['searchParams']>): Promise<{
  cards: CardWithRelations[]
  filteredCount: number
}> {
  const supabase = await createClient()
  let q = supabase
    .from('cards')
    .select(`
      id, card_number, name, gold_cost, attack, health,
      description, effect_text, image_url, is_champion, status,
      faction:factions ( id, name, slug, color_hex ),
      card_type:card_types ( id, name ),
      rarity:rarities ( id, name, copy_limit, color_hex ),
      card_keywords ( keyword:keywords ( id, name ) )
    `, { count: 'exact' })
    .eq('status', 'active')

  if (params.search?.trim()) {
    const s = params.search.trim()
    if (s.length >= 3) {
      q = q.textSearch('search_vector', s, { type: 'websearch', config: 'simple' })
    } else {
      q = q.ilike('name', '%' + s + '%')
    }
  }
  if (params.faction_id)  q = q.eq('faction_id',   Number(params.faction_id))
  if (params.type_id)     q = q.eq('card_type_id', Number(params.type_id))
  if (params.rarity_id)   q = q.eq('rarity_id',    Number(params.rarity_id))
  if (params.gold_min)    q = q.gte('gold_cost',    Number(params.gold_min))
  if (params.gold_max)    q = q.lte('gold_cost',    Number(params.gold_max))

  q = q.order('gold_cost', { ascending: true, nullsFirst: false }).order('name')
  const { data, count, error } = await q
  if (error) { console.error(error); return { cards: [], filteredCount: 0 } }
  return {
    cards: (data as unknown as CardWithRelations[]) ?? [],
    filteredCount: count ?? 0,
  }
}

async function fetchFilterOptions() {
  const supabase = await createClient()
  const [
    { data: factions },
    { data: cardTypes },
    { data: rarities },
    { count: totalCount },
  ] = await Promise.all([
    supabase.from('factions').select('*').order('sort_order'),
    supabase.from('card_types').select('*').order('sort_order'),
    supabase.from('rarities').select('*').order('sort_order'),
    supabase.from('cards').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])
  return { factions: factions ?? [], cardTypes: cardTypes ?? [], rarities: rarities ?? [], totalCount: totalCount ?? 0 }
}

async function fetchCollection(userId: string): Promise<CollectionMap> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_collections')
    .select('card_id, quantity')
    .eq('user_id', userId)
  if (!data) return {}
  return Object.fromEntries(data.map((r) => [r.card_id, r.quantity]))
}

export default async function CardsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { cards: allCards },
    { factions, cardTypes, rarities, totalCount },
    collection,
  ] = await Promise.all([
    fetchCards(params),
    fetchFilterOptions(),
    user ? fetchCollection(user.id) : Promise.resolve<CollectionMap>({}),
  ])

  const cards = params.owned_only === '1' && user
    ? allCards.filter((c) => (collection[c.id] ?? 0) > 0)
    : allCards
  const displayCount = cards.length

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-4"
        style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
              Kortu Duomenu Baze
            </h1>
            {!user && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                <a href="/login" style={{ color: 'var(--gold)' }}>Prisijunk</a>{' '}noredamas pazymeti turimas kortas
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <a href="/community-decks" className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
              Viesos Decks
            </a>
            {user && (
              <>
                <a href="/my-decks" className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
                  Mano Decks
                </a>
                <a href="/deck-builder" className="text-sm px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
                  + Deck Builder
                </a>
              </>
            )}
            {user ? (
              <a href="/api/auth/signout" className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
                Atsijungti
              </a>
            ) : (
              <a href="/login" className="text-sm px-4 py-1.5 rounded-lg font-semibold"
                style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
                Prisijungti
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="hidden md:block w-60 flex-shrink-0">
            <div className="sticky top-24">
              <Suspense fallback={<div className="animate-pulse h-96 rounded-xl" style={{ background: 'var(--bg-surface)' }} />}>
                <CardFilters factions={factions} cardTypes={cardTypes} rarities={rarities}
                  isAuthenticated={!!user} totalCount={totalCount} filteredCount={displayCount} />
              </Suspense>
            </div>
          </aside>

          <main className="flex-1 min-w-0 space-y-4">
            <div className="md:hidden">
              <Suspense fallback={null}>
                <CardFilters factions={factions} cardTypes={cardTypes} rarities={rarities}
                  isAuthenticated={!!user} totalCount={totalCount} filteredCount={displayCount} />
              </Suspense>
            </div>
            <Suspense fallback={<CardGridSkeleton />}>
              <CardGrid
                cards={cards}
                initialCollection={collection}
                isAuthenticated={!!user}
              />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
