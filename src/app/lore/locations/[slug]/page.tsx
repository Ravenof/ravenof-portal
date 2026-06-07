import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MapPin, Scroll, User, Sword, CreditCard, ArrowLeft } from 'lucide-react'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('lore_locations').select('name').eq('slug', slug).single()
  return { title: data ? `${data.name} — Atlasas` : 'Vietovė' }
}

const TYPE_LABELS: Record<string, string> = {
  miestas: 'Miestas', griuvėsiai: 'Griuvėsiai', miškas: 'Miškas',
  tvirtovė: 'Tvirtovė', uostas: 'Uostas', plyšys: 'Plyšys', slėnis: 'Slėnis',
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

export default async function LoreLocationPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: loc } = await supabase
    .from('lore_locations')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!loc) return notFound()

  const cardNumbers: string[] = loc.related_card_numbers ?? []

  const [eventsRes, cardsRes, eraRes] = await Promise.all([
    supabase.from('lore_events')
      .select('slug, title, summary, event_type, era_slug, timeline_index')
      .eq('location_slug', slug)
      .eq('status', 'published')
      .order('timeline_index'),
    cardNumbers.length > 0
      ? supabase.from('cards').select('card_number, name, image_url').in('card_number', cardNumbers)
      : Promise.resolve({ data: [] }),
    supabase.from('lore_eras')
      .select('name, slug')
      .eq('timeline_index', loc.first_era_index ?? 0)
      .eq('status', 'published')
      .maybeSingle(),
  ])

  const events = eventsRes.data ?? []
  const cards  = (cardsRes as { data: { card_number: string; name: string; image_url: string | null }[] | null }).data ?? []
  const era    = eraRes.data

  const EVENT_TYPE_LABELS: Record<string, string> = {
    battle: '⚔️ Mūšis', treaty: '🤝 Sutartis', discovery: '🔍 Atradimas',
    founding: '🏗️ Įkūrimas', collapse: '💀 Žlugimas',
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
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {TYPE_LABELS[loc.type] ?? loc.type}
          </span>
          <span style={{ color: 'var(--bg-border)' }}>·</span>
          <span className="text-sm font-bold truncate"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            {loc.name}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(212,175,55,0.12)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.25)', fontFamily: 'var(--rvn-font-display)', fontSize: '10px', letterSpacing: '0.06em' }}>
                  📍 {TYPE_LABELS[loc.type] ?? loc.type}
                </span>
                {era && (
                  <span className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', fontSize: '10px' }}>
                    🕰️ {era.name}
                  </span>
                )}
                {loc.region && (
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '10px' }}>
                    {loc.region}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold"
                style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)', letterSpacing: '0.04em', textShadow: '0 0 20px rgba(212,175,55,0.2)' }}>
                {loc.name}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 text-xs shrink-0"
              style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              <MapPin className="w-3 h-3" />
              {Number(loc.x).toFixed(0)}°V, {Number(loc.y).toFixed(0)}°Š
            </div>
          </div>

          {/* Description */}
          {loc.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {loc.description}
            </p>
          )}
          {!loc.description && loc.short_description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {loc.short_description}
            </p>
          )}
        </div>

        {/* Events */}
        {events.length > 0 && (
          <Section icon={<Scroll className="w-4 h-4" />} title="Įvykiai šioje vietovėje">
            <div className="space-y-3">
              {events.map((ev) => (
                <Link key={ev.slug} href={`/lore/events/${ev.slug}`}
                  className="block rounded-xl px-4 py-3 transition-all hover:border-[rgba(212,175,55,0.3)] group"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold mb-1 group-hover:text-[var(--gold)] transition-colors"
                        style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                        {ev.title}
                      </p>
                      {ev.summary && (
                        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                          {ev.summary}
                        </p>
                      )}
                    </div>
                    {ev.event_type && (
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
                      </span>
                    )}
                  </div>
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
            Grįžti į Atlasą
          </Link>
        </div>
      </div>
    </div>
  )
}
