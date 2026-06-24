import Link from 'next/link'
import { HeaderNav } from '@/components/layout/HeaderNav'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { CommunityDeckCard } from '@/components/community/CommunityDeckCard'
import type { PublicDeck, VoteValue, Profile } from '@/types'

export const metadata = { title: 'Viešos kaladės' }
export const revalidate = 30

type SearchParams = Promise<{ sort?: string; faction?: string; q?: string }>

export default async function CommunityDecksPage({ searchParams }: { searchParams: SearchParams }) {
  const params  = await searchParams
  const sort    = params.sort ?? 'score'
  const search  = params.q?.trim() ?? ''
  const supabase = await createClient()

  const user = await getCachedUser()

  // 1. Fetch public decks
  let query = supabase
    .from('decks')
    .select(`
      id, name, description, faction_id, visibility, card_count, avg_gold_cost, score, user_id, created_at, updated_at,
      faction:factions ( id, name, slug, color_hex, icon_url, description, sort_order )
    `)
    .eq('visibility', 'public')

  if (params.faction) query = query.eq('faction_id', Number(params.faction))
  if (search)         query = query.ilike('name', '%' + search + '%')

  if (sort === 'score') {
    query = query.order('score', { ascending: false }).order('updated_at', { ascending: false })
  } else if (sort === 'cards') {
    query = query.order('card_count', { ascending: false }).order('updated_at', { ascending: false })
  } else {
    query = query.order('updated_at', { ascending: false })
  }

  query = query.limit(60)

  const { data: rawDecks, error: decksError } = await query
  if (decksError) console.error('decks error:', decksError)

  // 2-4. Profiles + votes + factions — lygiagrečiai (anksčiau buvo 3 nuoseklios užklausos)
  const userIds = [...new Set((rawDecks ?? []).map((d: { user_id: string }) => d.user_id))]
  const deckIds = (rawDecks ?? []).map((d: { id: string }) => d.id)

  const [profilesRes, votesRes, factionsRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('*').in('id', userIds)
      : Promise.resolve({ data: null }),
    user && deckIds.length > 0
      ? supabase.from('deck_votes').select('deck_id, vote').eq('user_id', user.id).in('deck_id', deckIds)
      : Promise.resolve({ data: null }),
    supabase.from('factions').select('id, name, color_hex').order('sort_order'),
  ])

  let profileMap: Record<string, Profile> = {}
  if (profilesRes.data) profileMap = Object.fromEntries((profilesRes.data as unknown as Profile[]).map((p) => [p.id, p]))

  let voteMap: Record<string, VoteValue> = {}
  if (votesRes.data) voteMap = Object.fromEntries((votesRes.data as { deck_id: string; vote: -1 | 1 }[]).map((v) => [v.deck_id, v.vote as VoteValue]))

  const factions = factionsRes.data

  // 5. Merge
  const decks: PublicDeck[] = ((rawDecks ?? []) as unknown[]).map((d) => {
    const deck = d as Record<string, unknown>
    return {
      ...(deck as unknown as PublicDeck),
      author:    profileMap[(deck.user_id as string)] ?? null,
      user_vote: (voteMap[(deck.id as string)] ?? 0) as VoteValue,
    }
  })

  // Build query string helper
  function qs(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (sort !== 'score')   base.sort    = sort
    if (params.faction)     base.faction = params.faction
    if (search)             base.q       = search
    const merged = { ...base, ...overrides }
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    const s = p.toString()
    return s ? '?' + s : ''
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ background: 'rgba(7,7,15,0.95)', backdropFilter: 'blur(16px)', borderColor: 'rgba(240,180,41,0.1)', boxShadow: '0 1px 0 rgba(240,180,41,0.06)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/cards" className="text-xs transition-opacity hover:opacity-70 shrink-0" style={{ color: 'var(--text-muted)' }}>
              ← Kortų bazė
            </Link>
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', textShadow: '0 0 16px rgba(240,180,41,0.3)', letterSpacing: '0.06em' }}>
              📚 Viešos kaladės
            </h1>
            <Link href="/community-decks/meta" className="text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80" style={{ color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.3)', background: 'rgba(240,180,41,0.06)' }}>
              📊 Meta
            </Link>
          </div>
          <HeaderNav />
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Filters row */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Top row: sort + search */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Sort tabs */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
              {([['score', 'Populiariausi'], ['new', 'Naujausi'], ['cards', 'Daugiausia kortų']] as const).map(([s, label]) => (
                <Link key={s} href={qs({ sort: s === 'score' ? undefined : s })}
                  className="px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{ background: sort === s ? 'var(--gold)' : 'var(--bg-surface)', color: sort === s ? '#0a0a0f' : 'var(--text-muted)' }}>
                  {label}
                </Link>
              ))}
            </div>

            {/* Search */}
            <form method="GET" action="/community-decks" className="flex-1 min-w-[160px] max-w-xs">
              {sort !== 'score' && <input type="hidden" name="sort" value={sort} />}
              {params.faction && <input type="hidden" name="faction" value={params.faction} />}
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  defaultValue={search}
                  placeholder="Ieškoti kaladės..."
                  className="rvn-input w-full"
                  style={{ paddingLeft: '0.75rem', paddingRight: search ? '2rem' : '0.75rem' }}
                />
                {search && (
                  <Link href={qs({ q: undefined })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}>
                    ✕
                  </Link>
                )}
              </div>
            </form>

            <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
              {decks.length} kaladė{decks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Faction pills */}
          <div className="flex gap-1.5 flex-wrap">
            <Link href={qs({ faction: undefined })}
              className="px-2.5 py-1 text-xs rounded-full transition-colors"
              style={{ background: !params.faction ? 'var(--gold)' : 'var(--bg-surface)', color: !params.faction ? '#0a0a0f' : 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
              Visos
            </Link>
            {(factions ?? []).map((f: { id: number; name: string; color_hex: string }) => {
              const active = params.faction === String(f.id)
              return (
                <Link key={f.id} href={qs({ faction: active ? undefined : String(f.id) })}
                  className="px-2.5 py-1 text-xs rounded-full transition-colors"
                  style={{ background: active ? f.color_hex + '30' : 'var(--bg-surface)', color: active ? f.color_hex : 'var(--text-muted)', border: '1px solid ' + (active ? f.color_hex + '50' : 'var(--bg-border)') }}>
                  {f.name}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Deck list */}
        {decks.length === 0 ? (
          <div className="text-center py-24 opacity-50">
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
              {search ? 'Nerasta kaladžių pagal "' + search + '".' : 'Dar nėra viešų kaladžių.'}
            </p>
            {!search && user && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Pakeisk kaladės matomumą į “Viešas” kaladžių kūrimo įrankyje
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
