import Link from 'next/link'
import { HeaderNav } from '@/components/layout/HeaderNav'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PackOpeningClient } from './PackOpeningClient'

export const revalidate = 0
export const metadata = { title: 'Kortelių paketai' }

export default async function PacksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load active packs
  const { data: rawPacks } = await supabase
    .from('card_packs')
    .select('id, name, description, image_url, cards_per_pack, daily_limit, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const packs = rawPacks ?? []

  // For each pack, check how many times user opened it today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const packsWithLimits = await Promise.all(
    packs.map(async (pack) => {
      const { count } = await supabase
        .from('user_pack_openings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('pack_id', pack.id)
        .gte('opened_at', todayStart.toISOString())
      return { ...pack, openedToday: count ?? 0 }
    })
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ background: 'rgba(7,7,15,0.97)', backdropFilter: 'blur(16px)', borderColor: 'rgba(240,180,41,0.1)' }}>
        <div className="max-w-screen-lg mx-auto flex items-center gap-3">
          <Link href="/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Kortos
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em' }}>
            📦 Kortelių paketai
          </h1>
          <div className="ml-auto"><HeaderNav /></div>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-6">
        {/* Hero */}
        <div className="mb-8 text-center space-y-2">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Atidaryk paketus ir pildyk savo kortelių kolekciją
          </p>
        </div>

        <PackOpeningClient packs={packsWithLimits} />
      </div>
    </div>
  )
}
