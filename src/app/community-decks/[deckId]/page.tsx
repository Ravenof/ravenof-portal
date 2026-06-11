import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { VoteWidget } from '@/components/community/VoteWidget'
import { ReadOnlyDeckList } from '@/components/community/ReadOnlyDeckList'
import { CopyToDeckButton } from '@/components/community/CopyToDeckButton'
import { PlaytestButton } from '@/components/decks/PlaytestButton'
import { GoldCurveChart } from '@/components/deck-builder/GoldCurveChart'
import { getFactionColor } from '@/lib/utils'
import type { CardWithRelations, DeckCardWithCard, VoteValue, DeckComment } from '@/types'
import { CommentSection } from '@/components/community/CommentSection'

type Props = { params: Promise<{ deckId: string }> }

export const revalidate = 0

export default async function CommunityDeckDetailPage({ params }: Props) {
  const { deckId } = await params
  const supabase = await createClient()
  const user = await getCachedUser()

  // Fetch deck (no profile join — fetch separately)
  const { data: rawDeck } = await supabase
    .from('decks')
    .select(`
      id, name, description, faction_id, visibility, card_count, avg_gold_cost, score, created_at, updated_at, user_id,
      faction:factions ( id, name, slug, color_hex, icon_url, description, sort_order )
    `)
    .eq('id', deckId)
    .eq('visibility', 'public')
    .single()

  if (!rawDeck) return notFound()

  const deckRaw = rawDeck as unknown as { user_id: string; [key: string]: unknown }

  // Fetch author profile separately
  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, is_public, created_at, updated_at')
    .eq('id', deckRaw.user_id)
    .single()

  const deck = {
    ...deckRaw,
    author: authorProfile ?? null,
  } as unknown as {
    id: string; name: string; description: string | null; faction_id: number | null
    visibility: string; card_count: number; avg_gold_cost: number; score: number
    created_at: string; updated_at: string; user_id: string
    faction: { id: number; name: string; color_hex: string } | null
    author: { id: string; username: string; display_name: string | null } | null
  }

  // Fetch deck cards with full card info
  const { data: rawCards } = await supabase
    .from('deck_cards')
    .select(`
      quantity,
      card:cards (
        id, card_number, name, faction_id, card_type_id, rarity_id,
        gold_cost, attack, health, description, effect_text, image_url, is_champion, status,
        created_at, updated_at,
        faction:factions ( id, name, slug, color_hex, icon_url, description, sort_order ),
        card_type:card_types ( id, name, sort_order, icon_url ),
        rarity:rarities ( id, name, copy_limit, color_hex, sort_order ),
        card_keywords ( keyword:keywords ( id, name, description ) )
      )
    `)
    .eq('deck_id', deckId)

  const cards: DeckCardWithCard[] = ((rawCards ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>
    return { quantity: r.quantity as number, card: r.card as CardWithRelations }
  })

  const deckEntries = cards.map((dc) => ({ card: dc.card, quantity: dc.quantity }))

  // User's vote
  let userVote: VoteValue = 0
  if (user) {
    const { data: voteRow } = await supabase
      .from('deck_votes')
      .select('vote')
      .eq('deck_id', deckId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (voteRow) userVote = voteRow.vote as VoteValue
  }

  // Fetch comments
  const { data: rawComments } = await supabase
    .from('deck_comments')
    .select('id, deck_id, user_id, body, status, created_at, updated_at, author:profiles ( username, display_name )')
    .eq('deck_id', deckId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  const comments: DeckComment[] = (rawComments ?? []) as unknown as DeckComment[]

  // Check if user is admin
  let isAdmin = false
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    isAdmin = prof?.role === 'admin'
  }

  const fColor = getFactionColor(deck.faction?.color_hex)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/community-decks" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Viešos kaladės
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-xs font-semibold truncate" style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}>
            {deck.name}
          </span>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex gap-6 flex-col lg:flex-row">

          <div className="flex-1 min-w-0 space-y-4">
            <div className="rounded-xl p-5"
              style={{ background: 'var(--bg-surface)', border: '1px solid ' + fColor + '30' }}>
              <div className="h-1 rounded-full mb-4" style={{ background: fColor, opacity: 0.5, maxWidth: '60px' }} />

              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold leading-tight"
                    style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>
                    {deck.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="px-2 py-0.5 rounded" style={{ background: fColor + '20', color: fColor }}>
                      {deck.faction?.name ?? 'Nėra frakcijos'}
                    </span>
                    <span>{deck.card_count} kortų</span>
                    {deck.avg_gold_cost > 0 && <span>vid. {deck.avg_gold_cost} aukso</span>}
                    {deck.author && (
                      <span>
                        {'aut. '}
                        <Link href={'/users/' + deck.author.username}
                          className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
                          {deck.author.display_name ?? deck.author.username}
                        </Link>
                      </span>
                    )}
                    <span style={{ opacity: 0.5 }}>
                      {new Date(deck.updated_at).toLocaleDateString('lt-LT')}
                    </span>
                  </div>

                  {deck.description && (
                    <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
                      {deck.description}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  <VoteWidget
                    deckId={deck.id}
                    initialScore={deck.score}
                    initialVote={userVote}
                    userId={user?.id ?? null}
                    size="md"
                  />
                </div>
              </div>

              {user?.id !== deck.user_id && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--bg-border)' }}>
                  <PlaytestButton deckId={deck.id} deckName={deck.name} />
                  <CopyToDeckButton
                    deckId={deck.id}
                    deckName={deck.name}
                    factionId={deck.faction_id}
                    cardCount={deck.card_count}
                    avgGoldCost={deck.avg_gold_cost}
                    cards={cards}
                    userId={user?.id ?? null}
                  />
                </div>
              )}
              {user?.id === deck.user_id && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--bg-border)' }}>
                  <Link href={'/deck-builder/' + deck.id}
                    className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    Redaguoti savo kaladę
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-xl p-4"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <GoldCurveChart entries={deckEntries} />
            </div>
          </div>

          <div className="lg:w-80 flex-shrink-0 rounded-xl p-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <ReadOnlyDeckList cards={cards} />
          </div>
        </div>

          {/* Comments */}
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <CommentSection
              deckId={deckId}
              initialComments={comments}
              userId={user?.id ?? null}
              isAdmin={isAdmin}
            />
          </div>
        </div>
    </div>
  )
}
