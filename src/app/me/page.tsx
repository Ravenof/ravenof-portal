import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserRankCard } from '@/components/profile/UserRankCard'
import { XPProgressBar } from '@/components/profile/XPProgressBar'
import type { Profile, RankRule, UserBadge } from '@/types'

export const revalidate = 0

export default async function MePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  if (!rawProfile) redirect('/login')
  const profile = rawProfile as unknown as Profile

  // Rank rules
  const { data: allRanks } = await supabase
    .from('rank_rules')
    .select('*')
    .order('min_level', { ascending: true })
  const ranks: RankRule[] = (allRanks ?? []) as RankRule[]
  const currentRank = ranks.find((r) => r.rank_key === profile.rank_key) ?? ranks[0] ?? null
  const currentIdx = ranks.findIndex((r) => r.rank_key === profile.rank_key)
  const nextRank: RankRule | null =
    currentIdx >= 0 && currentIdx < ranks.length - 1 ? ranks[currentIdx + 1] : null

  // Stats (parallel)
  const [
    ownedRes,
    totalCardsRes,
    publicDecksRes,
    upvotesRes,
    attendedRes,
    upcomingRes,
    badgesRes,
  ] = await Promise.all([
    supabase
      .from('user_collections')
      .select('card_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('quantity', 0),
    supabase
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('decks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('visibility', 'public'),
    supabase
      .from('deck_votes')
      .select('id', { count: 'exact', head: true })
      .in(
        'deck_id',
        (
          await supabase
            .from('decks')
            .select('id')
            .eq('user_id', user.id)
            .eq('visibility', 'public')
        ).data?.map((d: { id: string }) => d.id) ?? [],
      )
      .eq('vote', 1),
    supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'attended'),
    supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'registered'),
    supabase
      .from('user_badges')
      .select('id, badge:badges(title,icon)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })
      .limit(5),
  ])

  const ownedCount = ownedRes.count ?? 0
  const totalCards = totalCardsRes.count ?? 0
  const publicDecksCount = publicDecksRes.count ?? 0
  const upvotesCount = upvotesRes.count ?? 0
  const attendedCount = attendedRes.count ?? 0
  const upcomingCount = upcomingRes.count ?? 0
  const badgesCount = badgesRes.count ?? 0
  const recentBadges = (badgesRes.data ?? []) as unknown as UserBadge[]
  const completionPct = totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0

  const displayName = profile.display_name ?? profile.username

  const QUICK_LINKS = [
    { href: '/my-cards', label: 'Mano kortos', icon: '🃏' },
    { href: '/my-decks', label: 'Mano deck\'ai', icon: '📚' },
    { href: '/my-events', label: 'Mano renginiai', icon: '🗓' },
    { href: `/users/${profile.username}`, label: 'Public profilis', icon: '👤' },
    { href: '/leaderboards', label: 'Topai', icon: '🏆' },
    { href: '/profile/settings', label: 'Nustatymai', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <h1 className="text-lg font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
          Mano profilis
        </h1>
        <Link href="/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          &larr; Kortų bazė
        </Link>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile summary */}
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <div className="flex items-start gap-5 mb-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-2xl font-bold"
              style={{ background: 'var(--bg-elevated)', color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>
                {displayName}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>
              )}
            </div>
          </div>
          <UserRankCard profile={profile} rankRule={currentRank} />
          <div className="mt-3">
            <XPProgressBar xp={profile.xp_total} level={profile.level} currentRank={currentRank} nextRank={nextRank} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Turimos kortos', value: `${ownedCount} / ${totalCards}`, sub: `${completionPct}%` },
            { label: 'Vieši deck\'ai', value: publicDecksCount },
            { label: 'Upvotes gauta', value: upvotesCount },
            { label: 'Lankyti renginiai', value: attendedCount },
            { label: 'Artėjantys renginiai', value: upcomingCount },
            { label: 'Ženkleliai', value: badgesCount },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
            >
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}>
                {stat.value}
              </p>
              {stat.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.sub}</p>}
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
            Sparčiosios nuorodos
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition hover:opacity-80"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}
              >
                <span>{link.icon}</span>
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent badges */}
        {recentBadges.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
              Paskutiniai ženkleliai
            </h3>
            <div className="flex gap-2 flex-wrap">
              {recentBadges.map((ub) => (
                <div
                  key={ub.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}
                >
                  <span>{(ub.badge as unknown as { icon: string }).icon}</span>
                  <span>{(ub.badge as unknown as { title: string }).title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
