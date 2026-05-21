import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MyCardsClient } from './MyCardsClient'
import type { MyOwnedCard, Profile } from '@/types'

export const revalidate = 0

export default async function MyCardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawProfile } = await supabase.from('profiles').select('show_owned_cards').eq('id', user.id).maybeSingle()
  const profile = rawProfile as unknown as Pick<Profile, 'show_owned_cards'>

  const [ownedRes, totalRes] = await Promise.all([
    supabase
      .from('user_collections')
      .select(`
        card_id, quantity,
        card:cards (
          name, gold_cost, image_url, faction_id, card_type_id, rarity_id,
          faction:factions ( name, color_hex ),
          card_type:card_types ( name ),
          rarity:rarities ( name, color_hex )
        )
      `)
      .eq('user_id', user.id)
      .gt('quantity', 0),
    supabase.from('cards').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  type RawRow = {
    card_id: string
    quantity: number
    card: {
      name: string
      gold_cost: number | null
      image_url: string | null
      faction_id: number | null
      card_type_id: number | null
      rarity_id: number | null
      faction: { name: string; color_hex: string } | null
      card_type: { name: string } | null
      rarity: { name: string; color_hex: string } | null
    } | null
  }

  const rawRows = (ownedRes.data ?? []) as unknown as RawRow[]
  const cards: MyOwnedCard[] = rawRows
    .filter((r) => r.card != null)
    .map((r) => ({
      card_id: r.card_id,
      quantity: r.quantity,
      name: r.card!.name,
      gold_cost: r.card!.gold_cost,
      image_url: r.card!.image_url,
      faction_id: r.card!.faction_id,
      faction_name: r.card!.faction?.name ?? null,
      faction_color: r.card!.faction?.color_hex ?? null,
      card_type_id: r.card!.card_type_id,
      card_type_name: r.card!.card_type?.name ?? null,
      rarity_id: r.card!.rarity_id,
      rarity_name: r.card!.rarity?.name ?? null,
      rarity_color: r.card!.rarity?.color_hex ?? null,
    }))

  const totalCards = totalRes.count ?? 0
  const ownedCount = cards.length
  const completionPct = totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/me" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Profilis</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.04em' }}
          >
            Mano Kortos
          </h1>
        </div>
        <Link
          href="/profile/settings"
          className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}
        >
          Privatumas
        </Link>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <MyCardsClient
          cards={cards}
          ownedCount={ownedCount}
          totalCards={totalCards}
          completionPct={completionPct}
          isPublic={profile?.show_owned_cards ?? false}
        />
      </div>
    </div>
  )
}
