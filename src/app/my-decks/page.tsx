import { redirect } from 'next/navigation'
import { HeaderNav } from '@/components/layout/HeaderNav'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MyDecksList } from '@/components/my-decks/MyDecksList'
import { RavenofButton } from '@/components/ui/RavenofButton'
import type { DeckWithRelations } from '@/types'

export const metadata = { title: 'Mano kaladės' }

export default async function MyDecksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/my-decks')

  const { data: decks } = await supabase
    .from('decks')
    .select(`
      id, name, description, faction_id, visibility,
      card_count, avg_gold_cost, created_at, updated_at,
      faction:factions ( id, name, slug, color_hex )
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const deckList = (decks ?? []) as unknown as DeckWithRelations[]
  const deckIds  = deckList.map((d) => d.id)

  // Fetch collection + deck cards in parallel
  const [{ data: collectionRows }, { data: allDeckCards }] = await Promise.all([
    supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
    deckIds.length > 0
      ? supabase.from('deck_cards').select('deck_id, card_id, quantity').in('deck_id', deckIds)
      : Promise.resolve({ data: [] as { deck_id: string; card_id: string; quantity: number }[] }),
  ])

  // Build collection map: card_id → qty owned
  const collection: Record<string, number> = Object.fromEntries(
    (collectionRows ?? []).map((r) => [r.card_id, r.quantity])
  )

  // Compute missing cards per deck
  const deckOwnership: Record<string, { missing: number; total: number }> = {}
  for (const dc of (allDeckCards ?? [])) {
    if (!deckOwnership[dc.deck_id]) deckOwnership[dc.deck_id] = { missing: 0, total: 0 }
    deckOwnership[dc.deck_id].total += dc.quantity
    const owned = collection[dc.card_id] ?? 0
    if (owned < dc.quantity) deckOwnership[dc.deck_id].missing += (dc.quantity - owned)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--bg-border)',
        }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center gap-3 flex-wrap">
          <Link
            href="/cards"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Kortų bazė
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1
            className="rvn-page-title text-lg flex-1"
          >
            Mano kaladės
          </h1>
          <HeaderNav />
          <Link href="/deck-builder">
            <RavenofButton variant="gold" size="md">
              <Plus className="w-4 h-4" />
              Nauja kaladė
            </RavenofButton>
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <MyDecksList
          decks={deckList}
          userId={user.id}
          deckOwnership={deckOwnership}
        />
      </main>
    </div>
  )
}
