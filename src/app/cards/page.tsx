import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { CardGrid, CardGridSkeleton } from '@/components/cards/CardGrid'
import { CardFilters } from '@/components/cards/CardFilters'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { fetchNotifications } from '@/lib/notifications'
import type { CardWithRelations, CollectionMap } from '@/types'

const PAGE_SIZE = 48

type PageProps = {
  searchParams: Promise<{
    search?:     string
    faction_id?: string
    type_id?:    string
    rarity_id?:  string
    gold_min?:   string
    gold_max?:   string
    owned_only?: string
    page?:       string
  }>
}

export const metadata = { title: 'Kortų duomenų bazė | Ravenof' }

async function fetchCards(
  params: Awaited<PageProps['searchParams']>,
  page: number,
  ownedIds?: string[]
): Promise<{ cards: CardWithRelations[]; totalFiltered: number }> {
  const supabase = await createClient()
  let q = supabase
    .from('cards')
    .select(`
      id, card_number, name, gold_cost, attack, health,
      description, effect_text, image_url, is_champion, status,
      faction:factions ( id, name, slug, color_hex ),
      card_type:card_types ( id, name, icon_url ),
      rarity:rarities ( id, name, copy_limit, color_hex ),
      card_keywords ( keyword:keywords ( id, name ) )
    `, { count: 'exact' })
    .eq('status', 'active')

  if (params.search?.trim()) {
    const s = params.search.trim()
    if (s.length >= 3) {
      q = q.textSearch('search_vector', s, { type: 'websearch', config: 'simple' })
    } else {
      q = q.ilike('name', '%' + s + '%')
    }
  }
  if (params.faction_id)  q = q.eq('faction_id',   Number(params.faction_id))
  if (params.type_id)     q = q.eq('card_type_id', Number(params.type_id))
  if (params.rarity_id)   q = q.eq('rarity_id',    Number(params.rarity_id))
  if (params.gold_min)    q = q.gte('gold_cost',    Number(params.gold_min))
  if (params.gold_max)    q = q.lte('gold_cost',    Number(params.gold_max))
  if (ownedIds)           q = q.in('id', ownedIds.length > 0 ? ownedIds : ['__none__'])

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1
  q = q.order('gold_cost', { ascending: true, nullsFirst: false }).order('name').range(from, to)

  const { data, count, error } = await q
  if (error) { console.error(error); return { cards: [], totalFiltered: 0 } }
  return {
    cards:         (data as unknown as CardWithRelations[]) ?? [],
    totalFiltered: count ?? 0,
  }
}

async function fetchFilterOptions() {
  const supabase = await createClient()
  const [
    { data: factions },
    { data: cardTypes },
    { data: rarities },
    { count: totalCount },
  ] = await Promise.all([
    supabase.from('factions').select('*').order('sort_order'),
    supabase.from('card_types').select('*').order('sort_order'),
    supabase.from('rarities').select('*').order('sort_order'),
    supabase.from('cards').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])
  return { factions: factions ?? [], cardTypes: cardTypes ?? [], rarities: rarities ?? [], totalCount: totalCount ?? 0 }
}

async function fetchCollection(userId: string): Promise<CollectionMap> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_collections')
    .select('card_id, quantity')
    .eq('user_id', userId)
  if (!data) return {}
  return Object.fromEntries(data.map((r) => [r.card_id, r.quantity]))
}

async function fetchOwnedIds(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_collections')
    .select('card_id')
    .eq('user_id', userId)
    .gt('quantity', 0)
  return (data ?? []).map((r) => r.card_id)
}

async function fetchDeckCounts(cardIds: string[]): Promise<Record<string, number>> {
  if (cardIds.length === 0) return {}
  const supabase = await createClient()
  const { data } = await supabase
    .from('deck_cards')
    .select('card_id')
    .in('card_id', cardIds)
  if (!data) return {}
  const map: Record<string, number> = {}
  for (const row of data) {
    map[row.card_id] = (map[row.card_id] ?? 0) + 1
  }
  return map
}

function buildQs(params: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...params, ...overrides }
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== '') p.set(k, v)
  }
  const s = p.toString()
  return '/cards' + (s ? '?' + s : '')
}

export default async function CardsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const page = Math.max(1, Number(params.page ?? '1'))
  const useOwnedOnly = params.owned_only === '1' && !!user

  const [
    ownedIds,
    { factions, cardTypes, rarities, totalCount },
    collection,
    { notifications, unreadCount },
  ] = await Promise.all([
    useOwnedOnly && user ? fetchOwnedIds(user.id) : Promise.resolve<string[] | undefined>(undefined),
    fetchFilterOptions(),
    user ? fetchCollection(user.id) : Promise.resolve<CollectionMap>({}),
    user ? fetchNotifications(20) : Promise.resolve({ notifications: [], unreadCount: 0 }),
  ])

  const { cards, totalFiltered } = await fetchCards(params, page, ownedIds ?? undefined)
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))

  const deckCountMap = await fetchDeckCounts(cards.map((c) => c.id))

  // Build clean params object for qs helper (exclude page)
  const baseParams: Record<string, string | undefined> = {
    ...(params.search    ? { search:     params.search    } : {}),
    ...(params.faction_id ? { faction_id: params.faction_id } : {}),
    ...(params.type_id   ? { type_id:    params.type_id   } : {}),
    ...(params.rarity_id ? { rarity_id:  params.rarity_id } : {}),
    ...(params.gold_min  ? { gold_min:   params.gold_min  } : {}),
    ...(params.gold_max  ? { gold_max:   params.gold_max  } : {}),
    ...(params.owned_only ? { owned_only: params.owned_only } : {}),
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{
          background:     'rgba(7,7,15,0.95)',
          backdropFilter: 'blur(16px)',
          borderColor:    'rgba(240,180,41,0.1)',
          boxShadow:      '0 1px 0 rgba(240,180,41,0.06)',
        }}
      >
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1
              className="text-xl sm:text-2xl font-bold truncate"
              style={{
                fontFamily:    'var(--rvn-font-display)',
                color:         'var(--gold)',
                textShadow:    '0 0 16px rgba(240,180,41,0.3)',
                letterSpacing: '0.06em',
              }}
            >
              🃏 Kortų Duomenų Bazė
            </h1>
            {!user && (
              <p className="text-xs mt-0.5 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                <a href="/login" style={{ color: 'var(--gold)' }}>Prisijunk</a>
                {' '}norėdamas pažymėti turimas kortas
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
              {[
                { href: '/leaderboards',    label: 'Topai'           },
                { href: '/events',          label: 'Renginiai'       },
                { href: '/community-decks', label: 'Viešos kaladės'  },
                { href: '/life-tracker',    label: 'Kova'            },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)', fontSize: '11px', letterSpacing: '0.04em' }}
                >
                  {label}
                </a>
              ))}
              {user && (
                <>
                  <a
                    href="/me"
                    className="text-sm px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)', fontSize: '11px' }}
                  >
                    Profilis
                  </a>
                  <a
                    href="/my-decks"
                    className="text-sm px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)', fontSize: '11px' }}
                  >
                    Mano kaladės
                  </a>
                  <a
                    href="/deck-builder"
                    className="text-sm px-3 py-1.5 rounded-lg font-semibold transition-all hover:shadow-[0_0_10px_rgba(240,180,41,0.2)]"
                    style={{
                      background:    'linear-gradient(135deg,#92400e,#b45309)',
                      color:         'var(--gold)',
                      border:        '1px solid rgba(240,180,41,0.3)',
                      fontFamily:    'var(--rvn-font-display)',
                      fontSize:      '11px',
                    }}
                  >
                    + Kaladė
                  </a>
                  <a
                    href="/api/auth/signout"
                    className="text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-70"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)', fontSize: '11px' }}
                  >
                    Atsijungti
                  </a>
                </>
              )}
            </div>
            {user && (
              <NotificationBell initialNotifications={notifications} initialUnread={unreadCount} />
            )}
            {!user && (
              <a
                href="/login"
                className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-all hover:shadow-[0_0_10px_rgba(240,180,41,0.2)]"
                style={{
                  background:  'linear-gradient(135deg,#92400e,#b45309)',
                  color:       'var(--gold)',
                  border:      '1px solid rgba(240,180,41,0.3)',
                  fontFamily:  'var(--rvn-font-display)',
                }}
              >
                Prisijungti
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="hidden md:block w-60 flex-shrink-0">
            <div className="sticky top-24">
              <Suspense fallback={<div className="animate-pulse h-96 rounded-xl" style={{ background: 'var(--bg-surface)' }} />}>
                <CardFilters factions={factions} cardTypes={cardTypes} rarities={rarities}
                  isAuthenticated={!!user} totalCount={totalCount} filteredCount={totalFiltered} />
              </Suspense>
            </div>
          </aside>

          <main className="flex-1 min-w-0 space-y-4">
            <div className="md:hidden">
              <Suspense fallback={null}>
                <CardFilters factions={factions} cardTypes={cardTypes} rarities={rarities}
                  isAuthenticated={!!user} totalCount={totalCount} filteredCount={totalFiltered} />
              </Suspense>
            </div>

            <Suspense fallback={<CardGridSkeleton />}>
              <CardGrid
                cards={cards}
                initialCollection={collection}
                isAuthenticated={!!user}
                deckCountMap={deckCountMap}
              />
            </Suspense>

            {/* ── Puslapiavimas ─────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4 pb-2">
                {page > 1 ? (
                  <Link
                    href={buildQs(baseParams, { page: page > 2 ? String(page - 1) : undefined })}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}
                  >
                    ← Ankstesnis
                  </Link>
                ) : (
                  <span
                    className="px-4 py-2 rounded-lg text-sm opacity-30 cursor-not-allowed"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}
                  >
                    ← Ankstesnis
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let p: number
                    if (totalPages <= 7) {
                      p = i + 1
                    } else if (page <= 4) {
                      p = i + 1
                    } else if (page >= totalPages - 3) {
                      p = totalPages - 6 + i
                    } else {
                      p = page - 3 + i
                    }
                    const isCurrent = p === page
                    return (
                      <Link
                        key={p}
                        href={buildQs(baseParams, { page: p > 1 ? String(p) : undefined })}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all"
                        style={{
                          background:  isCurrent ? 'var(--gold)' : 'var(--bg-surface)',
                          border:      '1px solid ' + (isCurrent ? 'var(--gold)' : 'var(--bg-border)'),
                          color:       isCurrent ? '#0a0a0f' : 'var(--text-muted)',
                          fontFamily:  'var(--rvn-font-display)',
                        }}
                      >
                        {p}
                      </Link>
                    )
                  })}
                </div>

                {page < totalPages ? (
                  <Link
                    href={buildQs(baseParams, { page: String(page + 1) })}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}
                  >
                    Toliau →
                  </Link>
                ) : (
                  <span
                    className="px-4 py-2 rounded-lg text-sm opacity-30 cursor-not-allowed"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}
                  >
                    Toliau →
                  </span>
                )}
              </div>
            )}

            {totalPages > 1 && (
              <p className="text-center text-xs pb-4" style={{ color: 'var(--text-muted)' }}>
                Puslapis {page} iš {totalPages} · Iš viso {totalFiltered} kortų
              </p>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
