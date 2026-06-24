import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { AdminShopClient } from './AdminShopClient'

export const revalidate = 0
export const metadata = { title: 'Parduotuvė | Admin' }

export default async function AdminShopPage() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  const [cosRes, packRes, sdRes, sdcRes, facRes, cardRes] = await Promise.all([
    supabase.from('cosmetics').select('*').order('sort_order'),
    supabase.from('card_packs').select('id,name,description,price_gold,is_active,sort_order,image_url,cards_per_pack').order('sort_order'),
    supabase.from('starter_decks').select('*').order('sort_order'),
    supabase.from('starter_deck_cards').select('starter_deck_id,card_id,quantity'),
    supabase.from('factions').select('id,name').order('name'),
    supabase.from('cards').select('id,name,card_number,gold_cost,faction_id,rarity_id,image_url').eq('status', 'active').order('gold_cost', { nullsFirst: true }),
  ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(7,7,15,0.97)', backdropFilter: 'blur(16px)', borderColor: 'rgba(240,180,41,0.1)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Admin</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em' }}>🛒 Parduotuvės valdymas</h1>
        </div>
      </header>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <AdminShopClient
          cosmetics={cosRes.data ?? []}
          packs={packRes.data ?? []}
          starterDecks={sdRes.data ?? []}
          starterDeckCards={sdcRes.data ?? []}
          factions={facRes.data ?? []}
          cards={cardRes.data ?? []}
        />
      </div>
    </div>
  )
}
