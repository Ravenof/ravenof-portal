import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreditCard, ArrowLeft, MapPin } from 'lucide-react'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('lore_characters').select('name').eq('slug', slug).single()
  return { title: data ? `${data.name} | Ravenof Atlasas` : 'Veikėjas | Ravenof' }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  alive:     { label: 'Gyvas', color: '#22c55e' },
  dead:      { label: 'Miręs', color: '#ef4444' },
  unknown:   { label: 'Nežinoma', color: '#6b7280' },
  legendary: { label: 'Legendinis', color: '#d4af37' },
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--gold)', opacity: 0.8 }}>{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
          {title}
        </h2>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(212,175,55,0.2), transparent)' }} />
      </div>
      {children}
    </div>
  )
}

export default async function LoreCharacterPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: char } = await supabase
    .from('lore_characters')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!char) return notFound()

  const cardNumbers: string[] = char.related_card_numbers ?? []

  // Find locations where this character appears (locations that list this character)
  const [cardsRes, locationsRes] = await Promise.all([
    cardNumbers.length > 0
      ? supabase.from('cards').select('card_number, name').in('card_number', cardNumbers)
      : Promise.resolve({ data: [] }),
    supabase.from('lore_locations')
      .select('slug, name, type')
      .contains('related_card_numbers', cardNumbers.length > 0 ? cardNumbers : ['__none__'])
      .eq('status', 'published')
      .limit(10),
  ])

  const cards     = (cardsRes as { data: { card_number: string; name: string }[] | null }).data ?? []
  const locations = locationsRes.data ?? []

  const statusInfo = STATUS_LABELS[char.status_value ?? 'unknown'] ?? STATUS_LABELS.unknown

  const TYPE_LABELS: Record<string, string> = {
    miestas: 'Miestas', griuvėsiai: 'Griuvėsiai', miškas: 'Miškas',
    tvirtovė: 'Tvirtovė', uostas: 'Uostas', plyšys: 'Plyšys', slėnis: 'Slėnis',
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ background: 'rgba(5,5,12,0.95)', borderColor: 'var(--bg-border)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/lore" className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Atlasas
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Veikėjas</span>
          <span style={{ color: 'var(--bg-border)' }}>·</span>
          <span className="text-sm font-bold truncate"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            {char.name}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <div className="flex items-start gap-4">
            {/* Avatar placeholder */}
            <div className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-2xl"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
              👤
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: statusInfo.color + '20', color: statusInfo.color, border: `1px solid ${statusInfo.color}40`, fontSize: '10px' }}>
                  {statusInfo.label}
                </span>
                {char.faction_id && (
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '10px' }}>
                    {char.faction_id}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold"
                style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                {char.name}
              </h1>
              {char.role && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                  {char.role}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {(char.description || char.short_description) && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {char.description || char.short_description}
            </p>
          )}
        </div>

        {/* Locations where character appears */}
        {locations.length > 0 && (
          <Section icon={<MapPin className="w-4 h-4" />} title="Pasirodo vietovėse">
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <Link key={loc.slug} href={`/lore/locations/${loc.slug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:scale-105"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  📍 {loc.name}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    · {TYPE_LABELS[loc.type] ?? loc.type}
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Related Cards */}
        {cards.length > 0 && (
          <Section icon={<CreditCard className="w-4 h-4" />} title="Susijusios kortos">
            <div className="flex flex-wrap gap-2">
              {cards.map((card) => (
                <Link key={card.card_number} href={`/cards/${encodeURIComponent(card.card_number)}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all hover:scale-105"
                  style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', textDecoration: 'none' }}>
                  🃏 {card.name}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Back */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--bg-border)' }}>
          <Link href="/lore"
            className="inline-flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-4 h-4" />
            Grįžti į Lore Atlasą
          </Link>
        </div>
      </div>
    </div>
  )
}
