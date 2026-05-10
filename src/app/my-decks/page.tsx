import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { MyDecksList } from '@/components/my-decks/MyDecksList'
import type { DeckWithRelations } from '@/types'

export const metadata = { title: 'Mano kaladės | Ravenof' }

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
            className="text-lg font-bold flex-1"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
          >
            Mano Decks
          </h1>
          <Link
            href="/deck-builder"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}
          >
            <Plus className="w-4 h-4" />
            Naujas Deck
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <MyDecksList
          decks={(decks as unknown as DeckWithRelations[]) ?? []}
          userId={user.id}
        />
      </main>
    </div>
  )
}
