import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserRankCard } from '@/components/profile/UserRankCard'
import { XPProgressBar } from '@/components/profile/XPProgressBar'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import type { Profile, UserBadge } from '@/types'

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

  const ownedCount       = ownedRes.count ?? 0
  const totalCards       = totalCardsRes.count ?? 0
  const publicDecksCount = publicDecksRes.count ?? 0
  const upvotesCount     = upvotesRes.count ?? 0
  const attendedCount    = attendedRes.count ?? 0
  const upcomingCount    = upcomingRes.count ?? 0
  const badgesCount      = badgesRes.count ?? 0
  const recentBadges     = (badgesRes.data ?? []) as unknown as UserBadge[]
  const completionPct    = totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0

  const displayName = profile.display_name ?? profile.username

  const QUICK_LINKS = [
    { href: '/my-cards',  label: 'Mano kortos',    icon: '🃏' },
    { href: '/my-decks',  label: 'Mano kaladės',   icon: '📚' },
    { href: '/my-events', label: 'Mano renginiai',  icon: '🗓' },
    { href: `/users/${profile.username}`, label: 'Viešas profilis', icon: '👤' },
    { href: '/leaderboards',      label: 'Topai',       icon: '🏆' },
    { href: '/profile/settings',  label: 'Nustatymai',  icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background:     'rgba(7,7,15,0.95)',
          backdropFilter: 'blur(16px)',
          borderColor:    'rgba(240,180,41,0.1)',
          boxShadow:      '0 1px 0 rgba(240,180,41,0.06)',
        }}
      >
        <h1
          className="rvn-page-title text-lg"
        >
          Mano Profilis
        </h1>
        <Link href="/cards" className="text-xs hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
          ← Kortų bazė
        </Link>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-6 space-y-6">

        {/* ── Profile identity card ─────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, var(--bg-surface) 60%)',
            border:     '1px solid rgba(124,58,237,0.2)',
            boxShadow:  '0 0 30px rgba(124,58,237,0.07)',
          }}
        >
          {/* violet glow orb */}
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)' }}
          />

          <div className="flex flex-col sm:flex-row items-start gap-4 mb-5 relative">
            {/* Avatar block — inline upload */}
            <div className="flex-shrink-0">
              <AvatarUpload
                userId={profile.id}
                currentAvatarUrl={profile.avatar_url ?? null}
                displayName={displayName}
              />
            </div>

            <div className="flex-1 min-w-0 w-full">
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)', letterSpacing: '0.04em' }}
              >
                {displayName}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                @{profile.username}
              </p>

              {/* previous username if set */}
              {'previous_username' in profile &&
               (profile as unknown as { previous_username: string | null; previous_username_visible_until: string | null })
                 .previous_username &&
               new Date((profile as unknown as { previous_username_visible_until: string }).previous_username_visible_until) > new Date() && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Ankstesnis vardas viešai rodomas iki{' '}
                  <span style={{ color: 'var(--gold)' }}>
                    {new Date(
                      (profile as unknown as { previous_username_visible_until: string }).previous_username_visible_until
                    ).toLocaleDateString('lt-LT')}
                  </span>
                </p>
              )}

              {profile.bio && (
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {profile.bio}
                </p>
              )}

              <div className="flex gap-2 flex-wrap mt-2">
                <Link
                  href="/profile/settings"
                  className="inline-block text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
                  style={{
                    background: 'var(--bg-elevated)',
                    color:      'var(--text-muted)',
                    border:     '1px solid var(--bg-border)',
                    fontFamily: 'var(--rvn-font-display)',
                    letterSpacing: '0.03em',
                  }}
                >
                  ⚙️ Nustatymai
                </Link>
                {profile.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="inline-block text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
                    style={{
                      background:    'rgba(239,68,68,0.12)',
                      color:         '#ef4444',
                      border:        '1px solid rgba(239,68,68,0.3)',
                      fontFamily:    'var(--rvn-font-display)',
                      letterSpacing: '0.03em',
                    }}
                  >
                    🛡 Admin panelė
                  </Link>
                )}
              </div>
            </div>
          </div>

          <UserRankCard profile={profile} />
          <div className="mt-3">
            <XPProgressBar xp={profile.xp_total} level={profile.level} />
          </div>
        </div>

        {/* ── Stats grid ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="rvn-section-title text-xs uppercase tracking-widest">Statistika</h3>
            <div className="flex-1 rvn-divider-gold" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Turimos kortos',       value: `${ownedCount} / ${totalCards}`, sub: `${completionPct}%` },
              { label: 'Viešos kaladės',       value: publicDecksCount },
              { label: 'Upvotai gauti',         value: upvotesCount },
              { label: 'Lankyti renginiai',     value: attendedCount },
              { label: 'Artėjantys renginiai',  value: upcomingCount },
              { label: 'Ženkleliai',            value: badgesCount },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4 transition-all hover:border-[rgba(240,180,41,0.2)]"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}>
                  {stat.label}
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                  {stat.value}
                </p>
                {stat.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick links ───────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="rvn-section-title text-xs uppercase tracking-widest">Sparčiosios nuorodos</h3>
            <div className="flex-1 rvn-divider" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:border-[rgba(240,180,41,0.25)] hover:text-[var(--gold)] group"
                style={{
                  background:  'var(--bg-surface)',
                  border:      '1px solid var(--bg-border)',
                  color:       'var(--text-secondary)',
                  fontFamily:  'var(--rvn-font-display)',
                  fontSize:    '12px',
                  letterSpacing: '0.03em',
                }}
              >
                <span className="text-base">{link.icon}</span>
                <span className="font-medium truncate">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Recent badges ─────────────────────────────────────────── */}
        {recentBadges.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="rvn-section-title text-xs uppercase tracking-widest">Paskutiniai ženkleliai</h3>
              <div className="flex-1 rvn-divider-gold" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {recentBadges.map((ub) => (
                <div key={ub.id} className="rvn-chip-gold flex items-center gap-2">
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
