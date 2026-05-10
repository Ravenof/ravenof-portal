import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityDeckCard } from '@/components/community/CommunityDeckCard'
import { UserRankCard } from '@/components/profile/UserRankCard'
import { XPProgressBar } from '@/components/profile/XPProgressBar'
import { BadgeGrid } from '@/components/profile/BadgeGrid'
import type { PublicDeck, VoteValue, RankRule, UserBadge, Profile } from '@/types'

type Props = { params: Promise<{ username: string }> }

export const revalidate = 60

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Cast needed because Supabase doesn't know new columns yet
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .eq('is_public', true)
    .maybeSingle()

  if (!rawProfile) return notFound()
  const profile = rawProfile as unknown as Profile

  // Rank rules for current + next rank
  const { data: allRanks } = await supabase
    .from('rank_rules')
    .select('*')
    .order('min_level', { ascending: true })

  const ranks: RankRule[] = (allRanks ?? []) as RankRule[]
  const currentRank = ranks.find((r) => r.rank_key === profile.rank_key) ?? ranks[0] ?? null
  const currentIdx = ranks.findIndex((r) => r.rank_key === profile.rank_key)
  const nextRank: RankRule | null =
    currentIdx >= 0 && currentIdx < ranks.length - 1 ? ranks[currentIdx + 1] : null

  // Public decks (respecting show_public_decks)
  let decks: PublicDeck[] = []
  if (profile.show_public_decks) {
    const { data: rawDecks } = await supabase
      .from('decks')
      .select(`
        id, name, description, faction_id, visibility, card_count, avg_gold_cost, score, created_at, updated_at,
        faction:factions ( id, name, slug, color_hex, icon_url, description, sort_order )
      `)
      .eq('user_id', profile.id)
      .eq('visibility', 'public')
      .order('score', { ascending: false })
      .limit(30)

    let voteMap: Record<string, VoteValue> = {}
    if (user && rawDecks && rawDecks.length > 0) {
      const deckIds = rawDecks.map((d: { id: string }) => d.id)
      const { data: votes } = await supabase
        .from('deck_votes')
        .select('deck_id, vote')
        .eq('user_id', user.id)
        .in('deck_id', deckIds)
      if (votes) {
        voteMap = Object.fromEntries(
          votes.map((v: { deck_id: string; vote: -1 | 1 }) => [v.deck_id, v.vote as VoteValue])
        )
      }
    }

    decks = ((rawDecks ?? []) as unknown[]).map((d) => {
      const deck = d as Record<string, unknown>
      return {
        ...(deck as unknown as PublicDeck),
        author: profile,
        user_vote: (voteMap[(deck.id as string)] ?? 0) as VoteValue,
      }
    })
  }

  // Attended events count (respecting show_attended_events)
  let attendedCount = 0
  if (profile.show_attended_events) {
    const { count } = await supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('status', 'attended')
    attendedCount = count ?? 0
  }

  // Badges (respecting show_badges)
  let userBadges: UserBadge[] = []
  if (profile.show_badges) {
    const { data: badgeRows } = await supabase
      .from('user_badges')
      .select(`
        id, user_id, badge_id, earned_at, source_type, source_id,
        badge:badges ( id, badge_key, title, description, icon, category, requirement_type, requirement_value, xp_reward, is_active, sort_order, created_at )
      `)
      .eq('user_id', profile.id)
      .order('earned_at', { ascending: false })
    userBadges = (badgeRows ?? []) as unknown as UserBadge[]
  }

  const displayName = profile.display_name ?? profile.username
  const memberSince = new Date(profile.created_at).toLocaleDateString('lt-LT', {
    year: 'numeric',
    month: 'long',
  })
  const isOwnProfile = user?.id === profile.id

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/community-decks"
            className="text-xs hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            Viesios Decks
          </Link>
          {isOwnProfile && (
            <Link
              href="/profile/settings"
              className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
            >
              Nustatymai
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">
        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          <div className="flex items-start gap-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-2xl font-bold"
              style={{ background: 'var(--bg-elevated)', color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>

            <div className="flex-1 min-w-0">
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}
              >
                {displayName}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                @{profile.username} &middot; narys nuo {memberSince}
              </p>
              {profile.show_profile_details && profile.bio && (
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {profile.bio}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {profile.show_public_decks && (
                  <span>{decks.length} deck{decks.length !== 1 ? 'ai' : 'as'}</span>
                )}
                {profile.show_attended_events && (
                  <span>{attendedCount} renginiai</span>
                )}
                {profile.show_badges && (
                  <span>{userBadges.length} zenkleliai</span>
                )}
              </div>
            </div>
          </div>

          {profile.show_level && (
            <div className="mt-5 space-y-3">
              <UserRankCard profile={profile} rankRule={currentRank} />
              <XPProgressBar
                xp={profile.xp_total}
                level={profile.level}
                currentRank={currentRank}
                nextRank={nextRank}
              />
            </div>
          )}
        </div>

        {profile.show_badges && userBadges.length > 0 && (
          <section>
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Zenkleliai
            </h2>
            <BadgeGrid badges={userBadges} />
          </section>
        )}

        {profile.show_public_decks && (
          <section>
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Viesios Kalades
            </h2>
            {decks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Nera viesu kaladzriu.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {decks.map((deck) => (
                  <CommunityDeckCard key={deck.id} deck={deck} userId={user?.id ?? null} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
