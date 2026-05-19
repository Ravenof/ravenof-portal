import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CommunityDeckCard } from '@/components/community/CommunityDeckCard'
import type { PublicDeck, VoteValue, Profile } from '@/types'

export const metadata = { title: 'Viešos kaladės | Ravenof' }
export const revalidate = 0

type SearchParams = Promise<{ sort?: string; faction?: string }>

export default async function CommunityDecksPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const sort   = params.sort ?? 'score'
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch public decks
  let query = supabase
    .from('decks')
    .select(`
      id, name, description, faction_id, visibility, card_count, avg_gold_cost, score, user_id, created_at, updated_at,
      faction:factions ( id, name, slug, color_hex, icon_url, description, sort_order )
    `)
    .eq('visibility', 'public')

  if (params.faction) {
    query = query.eq('faction_id', Number(params.faction))
  }

  if (sort === 'score') {
    query = query.order('score', { ascending: false }).order('updated_at', { ascending: false })
  } else {
    query = query.order('updated_at', { ascending: false })
  }

  query = query.limit(60)

  const { data: rawDecks, error: decksError } = await query
  if (decksError) console.error('decks error:', decksError)

  // 2. Fetch profiles for those user IDs
  const userIds = [...new Set((rawDecks ?? []).map((d: { user_id: string }) => d.user_id))]
  let profileMap: Record<string, Profile> = {}
  if (userIds.length > 0) {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)
    if (profErr) console.error('profiles error:', profErr)
    if (profiles) {
      profileMap = Object.fromEntries((profiles as unknown as Profile[]).map((p) => [p.id, p]))
    }
  }

  // 3. Fetch user's votes if logged in
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

  // 4. Fetch factions for filter
  const { data: factions } = await supabase
    .from('factions')
    .select('id, name, color_hex')
    .order('sort_order')

  // 5. Merge
  const decks: PublicDeck[] = ((rawDecks ?? []) as unknown[]).map((d) => {
    const deck = d as Record<string, unknown>
    return {
      ...(deck as unknown as PublicDeck),
      author: profileMap[(deck.user_id as string)] ?? null,
      user_vote: (voteMap[(deck.id as string)] ?? 0) as VoteValue,
    }
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{
          background:     'rgba(7,7,15,0.95)',
          backdropFilter: 'blur(16px)',
          borderColor:    'rgba(240,180,41,0.1)',
          boxShadow:      '0 1px 0 rgba(240,180,41,0.06)',
        }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/cards" className="text-xs transition-opacity hover:opacity-70 shrink-0" style={{ color: 'var(--text-muted)' }}>
              ← Kortų bazė
            </Link>
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            <h1
              className="text-lg font-bold"
              style={{
                fontFamily:    'var(--rvn-font-display)',
                color:         'var(--gold)',
                textShadow:    '0 0 16px rgba(240,180,41,0.3)',
                letterSpacing: '0.06em',
              }}
            >
              📚 Viešos kaladės
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {[
              { href: '/events',      label: 'Renginiai' },
              { href: '/leaderboards',label: 'Topai'     },
              { href: '/life-tracker',label: 'Kova'      },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}
              >
                {label}
              </Link>
            ))}
            {user && (
              <Link
                href="/me"
                className="text-xs px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}
              >
                Profilis
              </Link>
            )}
            {user && (
              <Link
                href="/my-decks"
                className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}
              >
                Mano kaladės
              </Link>
            )}
            {!user && (
              <Link
                href="/login"
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: 'var(--gold)', color: '#0a0a0f' }}
              >
                Prisijungti
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
            {(['score', 'new'] as const).map((s) => (
              <Link
                key={s}
                href={'?sort=' + s + (params.faction ? '&faction=' + params.faction : '')}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: sort === s ? 'var(--gold)' : 'var(--bg-surface)',
                  color: sort === s ? '#0a0a0f' : 'var(--text-muted)',
                }}
              >
                {s === 'score' ? 'Populiariausi' : 'Naujausi'}
              </Link>
            ))}
          </div>

          <div className="flex gap-1 flex-wrap">
            <Link
              href={'?sort=' + sort}
              className="px-2.5 py-1 text-xs rounded-full transition-colors"
              style={{
                background: !params.faction ? 'var(--gold)' : 'var(--bg-surface)',
                color: !params.faction ? '#0a0a0f' : 'var(--text-muted)',
                border: '1px solid var(--bg-border)',
              }}
            >
              Visos
            </Link>
            {(factions ?? []).map((f: { id: number; name: string; color_hex: string }) => (
              <Link
                key={f.id}
                href={'?sort=' + sort + '&faction=' + f.id}
                className="px-2.5 py-1 text-xs rounded-full transition-colors"
                style={{
                  background: params.faction === String(f.id) ? f.color_hex + '30' : 'var(--bg-surface)',
                  color: params.faction === String(f.id) ? f.color_hex : 'var(--text-muted)',
                  border: '1px solid ' + (params.faction === String(f.id) ? f.color_hex + '50' : 'var(--bg-border)'),
                }}
              >
                {f.name}
              </Link>
            ))}
          </div>

          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
            {decks.length} kaladė{decks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Deck list */}
        {decks.length === 0 ? (
          <div className="text-center py-24 opacity-50">
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
              Dar nėra viešų kaladžių.
            </p>
            {user && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Pakeisk savo kaladės matomumą į &quot;Viešas&quot; kaladžių kūrimo įrankyje
              </p>
            )}
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
