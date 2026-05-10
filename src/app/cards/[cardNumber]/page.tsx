import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OwnedToggle } from '@/components/cards/OwnedToggle'
import { Sword, Heart, Coins } from 'lucide-react'
import type { CardWithRelations } from '@/types'

type Props = { params: Promise<{ cardNumber: string }> }

export const revalidate = 60

export async function generateMetadata({ params }: Props) {
  const { cardNumber } = await params
  return { title: `${decodeURIComponent(cardNumber)} | Ravenof` }
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
      faction:factions ( id, name, slug, color_hex ),
      card_type:card_types ( id, name ),
      rarity:rarities ( id, name, copy_limit, color_hex ),
      card_keywords ( keyword:keywords ( id, name, description ) )
    `)
    .eq('card_number', decoded)
    .maybeSingle()

  if (!raw) {
    // fallback: try by UUID id
    const { data } = await supabase
      .from('cards')
      .select(`
        id, card_number, name, gold_cost, attack, health,
        description, effect_text, lore_text, image_url, is_champion, status,
        faction:factions ( id, name, slug, color_hex ),
        card_type:card_types ( id, name ),
        rarity:rarities ( id, name, copy_limit, color_hex ),
        card_keywords ( keyword:keywords ( id, name, description ) )
      `)
      .eq('id', decoded)
      .maybeSingle()
    raw = data
  }

  if (!raw) return notFound()

  const card = raw as unknown as CardWithRelations & { lore_text: string | null }

  // Only public users see active cards; admin/hidden handled via auth
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user
    ? (await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle())?.data?.role === 'admin'
    : false

  if (card.status !== 'active' && !isAdmin) return notFound()

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
          &larr; Kortų bazė
        </Link>
        {card.card_number && (
          <>
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.card_number}</span>
          </>
        )}
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left — Image */}
          <div className="flex-shrink-0 w-full md:w-72">
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

              {/* Gold cost badge */}
              {card.gold_cost !== null && (
                <div
                  className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold"
                  style={{ background: 'rgba(0,0,0,0.8)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.4)', backdropFilter: 'blur(4px)' }}
                >
                  <Coins className="w-3.5 h-3.5" />
                  {card.gold_cost}
                </div>
              )}

              {/* Champion badge */}
              {card.is_champion && (
                <div
                  className="absolute top-3 right-3 px-2 py-1 rounded text-sm font-bold"
                  style={{ background: 'rgba(0,0,0,0.8)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.4)' }}
                >
                  ♔ Čempionas
                </div>
              )}

              {/* Owned toggle */}
              {user && (
                <div className="absolute bottom-3 right-3">
                  <OwnedToggle cardId={card.id} isAuthenticated={true} size="md" />
                </div>
              )}
            </div>
          </div>

          {/* Right — Info */}
          <div className="flex-1 space-y-5">
            {/* Name + faction */}
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

            {/* Effect text */}
            {card.effect_text && (
              <div
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Efektas
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {card.effect_text}
                </p>
              </div>
            )}

            {/* Description */}
            {card.description && (
              <div
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Aprašymas
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {card.description}
                </p>
              </div>
            )}

            {/* Keywords */}
            {keywords.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Raktažodžiai
                </p>
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

            {/* Lore */}
            {card.lore_text && (
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'linear-gradient(135deg, ' + factionColor + '08 0%, var(--bg-surface) 100%)',
                  border: '1px solid ' + factionColor + '30',
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: factionColor, opacity: 0.8 }}>
                  Istorija
                </p>
                <p
                  className="text-sm leading-relaxed italic"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'Georgia, serif' }}
                >
                  &ldquo;{card.lore_text}&rdquo;
                </p>
              </div>
            )}

            {/* Card number */}
            {card.card_number && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                #{card.card_number}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
