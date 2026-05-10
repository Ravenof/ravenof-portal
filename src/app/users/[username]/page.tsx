import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityDeckCard } from '@/components/community/CommunityDeckCard'
import { UserRankCard } from '@/components/profile/UserRankCard'
import { XPProgressBar } from '@/components/profile/XPProgressBar'
import { BadgeGrid } from '@/components/profile/BadgeGrid'
import type { PublicDeck, VoteValue, RankRule, UserBadge, Badge, Profile } from '@/types'

type Props = { params: Promise<{ username: string }> }

export const revalidate = 60

type OwnedCardRow = {
  card_id: string
  quantity: number
  card_name: string
  faction_id: number | null
  faction_name: string | null
  faction_slug: string | null
  faction_color: string | null
  card_type_id: number | null
  card_type_name: string | null
  rarity_id: number | null
  rarity_name: string | null
  rarity_color: string | null
  gold_cost: number | null
  image_url: string | null
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .eq('is_public', true)
    .maybeSingle()

  if (!rawProfile) return notFound()
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

  // Public decks
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

  // Attended events count
  let attendedCount = 0
  if (profile.show_attended_events) {
    const { count } = await supabase
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('status', 'attended')
    attendedCount = count ?? 0
  }

  // Badges
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

  // All badges (for showing locked badges in the grid)
  let allBadges: Badge[] = []
  if (profile.show_badges) {
    const { data: badgeDefs } = await supabase
      .from('badges')
      .select('id, badge_key, title, description, icon, category, requirement_type, requirement_value, xp_reward, is_active, sort_order, created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    allBadges = (badgeDefs ?? []) as Badge[]
  }

  // Owned cards via SECURITY DEFINER RPC (respects show_owned_cards internally)
  let ownedCards: OwnedCardRow[] = []
  let totalActiveCards = 0
  if (profile.show_owned_cards) {
    const { data: rpcData } = await supabase.rpc('get_public_user_collection', {
      p_username: username,
    })
    ownedCards = (rpcData ?? []) as OwnedCardRow[]

    // Fetch total active cards count for completion %
    const { count } = await supabase
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
    totalActiveCards = count ?? 0
  }

  const displayName = profile.display_name ?? profile.username
  const memberSince = new Date(profile.created_at).toLocaleDateString('lt-LT', {
    year: 'numeric',
    month: 'long',
  })
  const isOwnProfile = user?.id === profile.id

  const ownedUnique = ownedCards.length
  const completionPct =
    totalActiveCards > 0 ? Math.round((ownedUnique / totalActiveCards) * 100) : 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3">
          <Link href="/community-decks" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Viešos kaladės
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
        {/* Profile card */}
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
                  <span>{decks.length} kaladė{decks.length !== 1 ? 's' : ''}</span>
                )}
                {profile.show_attended_events && (
                  <span>{attendedCount} renginiai</span>
                )}
                {profile.show_badges && (
                  <span>{userBadges.length} ženkleliai</span>
                )}
                {profile.show_owned_cards && (
                  <span>{ownedUnique} kortos ({completionPct}%)</span>
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

        {/* Badges */}
        {profile.show_badges && allBadges.length > 0 && (
          <section>
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Ženkleliai
            </h2>
            <BadgeGrid allBadges={allBadges} earnedBadges={userBadges} />
          </section>
        )}

        {/* Public decks */}
        {profile.show_public_decks && (
          <section>
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Viešos kaladės
            </h2>
            {decks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Nėra viešų kaladžių.
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

        {/* Owned cards collection */}
        {profile.show_owned_cards ? (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
              >
                Turimos Kortos
              </h2>
              {totalActiveCards > 0 && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {ownedUnique} / {totalActiveCards} ({completionPct}%)
                </span>
              )}
            </div>

            {/* Completion bar */}
            {totalActiveCards > 0 && (
              <div
                className="h-1.5 rounded-full mb-4 overflow-hidden"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: completionPct + '%', background: 'var(--gold)' }}
                />
              </div>
            )}

            {ownedCards.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Kolekcija tuščia.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {ownedCards.map((c) => (
                  <div
                    key={c.card_id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
                  >
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.card_name}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                        style={{ border: '1px solid var(--bg-border)' }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded flex-shrink-0"
                        style={{
                          background: c.faction_color ? c.faction_color + '30' : 'var(--bg-elevated)',
                          border: '1px solid ' + (c.faction_color ? c.faction_color + '50' : 'var(--bg-border)'),
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {c.card_name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {[c.faction_name, c.rarity_name, c.gold_cost != null ? c.gold_cost + 'g' : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold flex-shrink-0"
                      style={{ color: 'var(--gold)' }}
                    >
                      x{c.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Turimos Kortos
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              Kolekcija privati.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
