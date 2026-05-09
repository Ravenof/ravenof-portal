import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommunityDeckCard } from '@/components/community/CommunityDeckCard'
import type { PublicDeck, VoteValue } from '@/types'

type Props = { params: Promise<{ username: string }> }

export const revalidate = 60

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch profile by username
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, is_public, created_at')
    .eq('username', username)
    .eq('is_public', true)
    .maybeSingle()

  if (!profile) return notFound()

  // Fetch their public decks
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

  // User's votes on these decks
  let voteMap: Record<string, VoteValue> = {}
  if (user && rawDecks && rawDecks.length > 0) {
    const deckIds = rawDecks.map((d: { id: string }) => d.id)
    const { data: votes } = await supabase
      .from('deck_votes')
      .select('deck_id, vote')
      .eq('user_id', user.id)
      .in('deck_id', deckIds)
    if (votes) {
      voteMap = Object.fromEntries(votes.map((v: { deck_id: string; vote: -1 | 1 }) => [v.deck_id, v.vote as VoteValue]))
    }
  }

  const decks: PublicDeck[] = ((rawDecks ?? []) as unknown[]).map((d) => {
    const deck = d as Record<string, unknown>
    return {
      ...(deck as unknown as PublicDeck),
      author: {
        id: profile.id, username: profile.username, display_name: profile.display_name,
        avatar_url: profile.avatar_url, bio: profile.bio, is_public: profile.is_public,
        created_at: profile.created_at, updated_at: profile.created_at,
      },
      user_vote: (voteMap[(deck.id as string)] ?? 0) as VoteValue,
    }
  })

  const displayName = profile.display_name ?? profile.username
  const memberSince = new Date(profile.created_at).toLocaleDateString('lt-LT', { year: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/community-decks" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Viesos Decks
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Profile hero */}
        <div
          className="rounded-xl p-6 mb-6 flex items-center gap-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          {/* Avatar placeholder */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-2xl font-bold"
            style={{ background: 'var(--bg-elevated)', color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>

          <div>
            <h1
              className="text-xl font-bold"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}
            >
              {displayName}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              @{profile.username} · narys nuo {memberSince}
            </p>
            {profile.bio && (
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                {profile.bio}
              </p>
            )}
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              {decks.length} vieš{decks.length === 1 ? 'as' : 'i'} deck{decks.length !== 1 ? 'ai' : 'as'}
            </p>
          </div>
        </div>

        {/* Decks */}
        {decks.length === 0 ? (
          <div className="text-center py-16 opacity-50">
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
              Nera viesu deck
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {decks.map((deck) => (
              <CommunityDeckCard key={deck.id} deck={deck} userId={user?.id ?? null} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
