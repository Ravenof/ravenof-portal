import Link from 'next/link'
import Image from 'next/image'
import { GameCard } from '@/components/ui/GameCard'
import { notFound } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { OwnedToggle } from '@/components/cards/OwnedToggle'
import { Sword, Heart, Coins, BookOpen } from 'lucide-react'
import type { CardWithRelations } from '@/types'

type Props = { params: Promise<{ cardNumber: string }> }

export const revalidate = 60

export async function generateMetadata({ params }: Props) {
  const { cardNumber } = await params
  return { title: `${decodeURIComponent(cardNumber)}` }
}

type DeckSnippet = {
  id: string
  name: string
  score: number
  card_count: number
  avg_gold_cost: number
  faction: { name: string; color_hex: string } | null
  owner: { username: string; display_name: string | null } | null
}

export default async function CardDetailPage({ params }: Props) {
  const { cardNumber } = await params
  const decoded = decodeURIComponent(cardNumber)
  const supabase = await createClient()

  // Try card_number first, fallback to id
  let { data: raw } = await supabase
    .from('cards')
    .select(`
      id, card_number, name, gold_cost, attack, health,
      description, effect_text, lore_text, image_url, is_champion, status,
      faction:factions ( id, name, slug, color_hex, icon_url ),
      card_type:card_types ( id, name, icon_url ),
      rarity:rarities ( id, name, copy_limit, color_hex ),
      card_keywords ( keyword:keywords ( id, name, description ) )
    `)
    .eq('card_number', decoded)
    .maybeSingle()

  if (!raw) {
    const { data } = await supabase
      .from('cards')
      .select(`
        id, card_number, name, gold_cost, attack, health,
        description, effect_text, lore_text, image_url, is_champion, status,
        faction:factions ( id, name, slug, color_hex, icon_url ),
        card_type:card_types ( id, name, icon_url ),
        rarity:rarities ( id, name, copy_limit, color_hex ),
        card_keywords ( keyword:keywords ( id, name, description ) )
      `)
      .eq('id', decoded)
      .maybeSingle()
    raw = data
  }

  if (!raw) return notFound()

  const card = raw as unknown as CardWithRelations & { lore_text: string | null }

  const user = await getCachedUser()
  const isAdmin = user
    ? (await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle())?.data?.role === 'admin'
    : false

  if (card.status !== 'active' && !isAdmin) return notFound()

  // Fetch public decks that use this card
  const { data: deckCardRows } = await supabase
    .from('deck_cards')
    .select('deck_id')
    .eq('card_id', card.id)

  let decksUsingCard: DeckSnippet[] = []
  if (deckCardRows && deckCardRows.length > 0) {
    const deckIds = deckCardRows.map((r: { deck_id: string }) => r.deck_id)
    const { data: deckRows } = await supabase
      .from('decks')
      .select('id, name, score, card_count, avg_gold_cost, faction_id, user_id')
      .in('id', deckIds)
      .eq('visibility', 'public')
      .order('score', { ascending: false })
      .limit(8)

    if (deckRows && deckRows.length > 0) {
      const factionIds = [...new Set(deckRows.map((d: { faction_id: number | null }) => d.faction_id).filter(Boolean))]
      const ownerIds   = [...new Set(deckRows.map((d: { user_id: string }) => d.user_id))]

      const [{ data: factions }, { data: owners }] = await Promise.all([
        supabase.from('factions').select('id, name, color_hex').in('id', factionIds),
        supabase.from('profiles').select('id, username, display_name').in('id', ownerIds),
      ])

      const fMap: Record<number, { name: string; color_hex: string }> = {}
      for (const f of (factions ?? [])) fMap[f.id] = f
      const oMap: Record<string, { username: string; display_name: string | null }> = {}
      for (const o of (owners ?? [])) oMap[o.id] = o

      decksUsingCard = deckRows.map((d: { id: string; name: string; score: number; card_count: number; avg_gold_cost: number; faction_id: number | null; user_id: string }) => ({
        id:           d.id,
        name:         d.name,
        score:        d.score,
        card_count:   d.card_count,
        avg_gold_cost: d.avg_gold_cost,
        faction:      d.faction_id ? (fMap[d.faction_id] ?? null) : null,
        owner:        oMap[d.user_id] ?? null,
      }))
    }
  }

  // ── Lore ryšiai ────────────────────────────────────────────
  const cn = card.card_number
  const [loreLocsRes, loreCharsRes, loreArtsRes, loreEventsRes] = cn
    ? await Promise.all([
        supabase.from('lore_locations').select('slug, name').contains('related_card_numbers', [cn]).eq('status', 'published'),
        supabase.from('lore_characters').select('slug, name, role').contains('related_card_numbers', [cn]).eq('status', 'published'),
        supabase.from('lore_artifacts').select('slug, name').contains('related_card_numbers', [cn]).eq('status', 'published'),
        supabase.from('lore_events').select('slug, title, era_slug').contains('related_card_numbers', [cn]).eq('status', 'published'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]

  const loreLocs   = (loreLocsRes.data   ?? []) as { slug: string; name: string }[]
  const loreChars  = (loreCharsRes.data  ?? []) as { slug: string; name: string; role: string | null }[]
  const loreArts   = (loreArtsRes.data   ?? []) as { slug: string; name: string }[]
  const loreEvents = (loreEventsRes.data ?? []) as { slug: string; title: string; era_slug: string | null }[]
  const hasLore    = loreLocs.length > 0 || loreChars.length > 0 || loreArts.length > 0 || loreEvents.length > 0

  const factionColor = card.faction?.color_hex ? '#' + card.faction.color_hex.replace('#', '') : '#b8860b'
  const rarityColor = (() => {
    const n = card.rarity?.name?.toLowerCase() ?? ''
    if (n.includes('legend')) return '#d4af37'
    if (n.includes('epic') || n.includes('epik')) return '#9b59b6'
    if (n.includes('unik')) return '#3498db'
    if (n.includes('mag')) return '#2ecc71'
    return '#95a5a6'
  })()

  const keywords = (card.card_keywords ?? []) as unknown as { keyword: { id: number; name: string; description: string | null } }[]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <Link href="/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          ← Kortų bazė
        </Link>
        {card.card_number && (
          <>
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.card_number}</span>
          </>
        )}
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-8 space-y-8">
        {/* Main card layout */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left — Image */}
          <div className="flex-shrink-0 w-full md:w-72">
            <GameCard glowColor={rarityColor} intensity={12} liftPx={6} className="rounded-2xl">
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                aspectRatio: '3/4',
                border: '2px solid ' + rarityColor + '80',
                boxShadow: '0 0 32px ' + rarityColor + '30, 0 8px 32px rgba(0,0,0,0.6)',
                background: factionColor + '12',
              }}
            >
              {card.image_url ? (
                <Image
                  src={card.image_url}
                  alt={card.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 288px"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-7xl opacity-20" style={{ color: factionColor }}>⚔</span>
                </div>
              )}

              {card.gold_cost !== null && (
                <div
                  className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold"
                  style={{ background: 'rgba(0,0,0,0.8)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.4)', backdropFilter: 'blur(4px)' }}
                >
                  <Coins className="w-3.5 h-3.5" />
                  {card.gold_cost}
                </div>
              )}

              {card.is_champion && (
                <div
                  className="absolute top-3 right-3 px-2 py-1 rounded text-sm font-bold"
                  style={{ background: 'rgba(0,0,0,0.8)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.4)' }}
                >
                  ♔ Čempionas
                </div>
              )}

              {user && (
                <div className="absolute bottom-3 right-3">
                  <OwnedToggle cardId={card.id} isAuthenticated={true} size="md" />
                </div>
              )}
            </div>
            </GameCard>
          </div>

          {/* Right — Info */}
          <div className="flex-1 space-y-5">
            <div>
              <h1
                className="text-3xl font-bold"
                style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}
              >
                {card.name}
              </h1>
              {card.faction && (
                <p className="mt-1 text-sm font-medium" style={{ color: factionColor }}>
                  {card.faction.name}
                </p>
              )}
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-3">
              {card.card_type && (
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}
                >
                  {card.card_type.name}
                </span>
              )}
              {card.rarity && (
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ background: rarityColor + '18', color: rarityColor, border: '1px solid ' + rarityColor + '40' }}
                >
                  {card.rarity.name}
                </span>
              )}
              {card.attack !== null && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold text-red-400"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Sword className="w-3.5 h-3.5" /> {card.attack}
                </span>
              )}
              {card.health !== null && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold text-green-400"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <Heart className="w-3.5 h-3.5" /> {card.health}
                </span>
              )}
            </div>

            {keywords.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>RaktŻodžiai</p>
                <div className="flex flex-wrap gap-2">
                  {keywords.map(({ keyword }) => (
                    <span
                      key={keyword.id}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)' }}
                      title={keyword.description ?? undefined}
                    >
                      {keyword.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {card.lore_text && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'linear-gradient(135deg, ' + factionColor + '08 0%, var(--bg-surface) 100%)',
                  border: '1px solid ' + factionColor + '30',
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: factionColor, opacity: 0.8 }}>Istorija</p>
                <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-secondary)', fontFamily: 'Georgia, serif' }}>
                  “{card.lore_text}”
                </p>
              </div>
            )}

            {card.card_number && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>#{card.card_number}</p>
            )}
          </div>
        </div>

        {/* ── Lore ryšiai ──────────────────────────────────────── */}
        {hasLore && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <h2 className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
                Lore ryšiai
              </h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212,175,55,0.3), transparent)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {loreLocs.length > 0 && (
                <div className="rounded-xl p-4 space-y-2"
                  style={{ background: 'var(--bg-surface)', border: '1px solid rgba(212,175,55,0.12)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>📍 Vietovės</p>
                  {loreLocs.map((l) => (
                    <Link key={l.slug} href={`/lore/locations/${l.slug}`}
                      className="block text-xs transition-opacity hover:opacity-70"
                      style={{ color: 'var(--gold)', textDecoration: 'none', fontFamily: 'var(--rvn-font-display)' }}>
                      {l.name} →
                    </Link>
                  ))}
                </div>
              )}
              {loreChars.length > 0 && (
                <div className="rounded-xl p-4 space-y-2"
                  style={{ background: 'var(--bg-surface)', border: '1px solid rgba(212,175,55,0.12)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>👤 Veikėjai</p>
                  {loreChars.map((c) => (
                    <Link key={c.slug} href={`/lore/characters/${c.slug}`}
                      className="block text-xs transition-opacity hover:opacity-70"
                      style={{ color: 'var(--gold)', textDecoration: 'none', fontFamily: 'var(--rvn-font-display)' }}>
                      {c.name}{c.role ? ` · ${c.role}` : ''} →
                    </Link>
                  ))}
                </div>
              )}
              {loreArts.length > 0 && (
                <div className="rounded-xl p-4 space-y-2"
                  style={{ background: 'var(--bg-surface)', border: '1px solid rgba(212,175,55,0.12)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>✦ Artefaktai</p>
                  {loreArts.map((a) => (
                    <Link key={a.slug} href={`/lore/artifacts/${a.slug}`}
                      className="block text-xs transition-opacity hover:opacity-70"
                      style={{ color: 'var(--gold)', textDecoration: 'none', fontFamily: 'var(--rvn-font-display)' }}>
                      {a.name} →
                    </Link>
                  ))}
                </div>
              )}
              {loreEvents.length > 0 && (
                <div className="rounded-xl p-4 space-y-2"
                  style={{ background: 'var(--bg-surface)', border: '1px solid rgba(212,175,55,0.12)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>⚡ Įvykiai</p>
                  {loreEvents.map((e) => (
                    <Link key={e.slug} href={`/lore/events/${e.slug}`}
                      className="block text-xs transition-opacity hover:opacity-70"
                      style={{ color: 'var(--gold)', textDecoration: 'none', fontFamily: 'var(--rvn-font-display)' }}>
                      {e.title} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Naudojama kaladėse ─────────────────────────────────── */}
        {decksUsingCard.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <h2
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}
              >
                Naudojama kaladėse
              </h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.3), transparent)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{decksUsingCard.length}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {decksUsingCard.map((deck) => {
                const dc = deck.faction?.color_hex
                  ? '#' + deck.faction.color_hex.replace('#', '')
                  : '#b8860b'
                return (
                  <Link
                    key={deck.id}
                    href={'/community-decks/' + deck.id}
                    className="block rounded-xl p-4 transition-all hover:border-[rgba(240,180,41,0.25)]"
                    style={{ background: 'var(--bg-surface)', border: '1px solid ' + dc + '30', textDecoration: 'none' }}
                  >
                    {/* faction bar */}
                    <div className="h-0.5 rounded-full mb-3 -mt-1" style={{ background: dc, opacity: 0.5 }} />

                    <p
                      className="font-semibold text-sm leading-tight truncate mb-1"
                      style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}
                    >
                      {deck.name}
                    </p>

                    <p className="text-xs mb-2 truncate" style={{ color: 'var(--text-muted)' }}>
                      {deck.owner ? (deck.owner.display_name ?? deck.owner.username) : '—'}
                    </p>

                    <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span style={{ color: dc }}>{deck.faction?.name ?? '—'}</span>
                      <span className="flex items-center gap-1">
                        <span style={{ color: 'var(--gold)' }}>▲</span>
                        {deck.score}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>

            {deckCardRows && deckCardRows.length > 8 && (
              <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                Rodomi 8 populiariausi. Iš viso kaladžių: {deckCardRows.length}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
