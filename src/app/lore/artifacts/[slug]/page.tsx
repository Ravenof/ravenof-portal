import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreditCard, ArrowLeft, MapPin, Scroll } from 'lucide-react'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('lore_artifacts').select('name').eq('slug', slug).single()
  return { title: data ? `${data.name} | Ravenof Atlasas` : 'Artefaktas | Ravenof' }
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

export default async function LoreArtifactPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: art } = await supabase
    .from('lore_artifacts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!art) return notFound()

  const cardNumbers: string[] = art.related_card_numbers ?? []
  const eventSlugs: string[]  = art.related_event_slugs  ?? []

  const [cardsRes, locationRes, eventsRes] = await Promise.all([
    cardNumbers.length > 0
      ? supabase.from('cards').select('card_number, name').in('card_number', cardNumbers)
      : Promise.resolve({ data: [] }),
    art.current_location_slug
      ? supabase.from('lore_locations').select('slug, name, type').eq('slug', art.current_location_slug).eq('status', 'published').maybeSingle()
      : Promise.resolve({ data: null }),
    eventSlugs.length > 0
      ? supabase.from('lore_events').select('slug, title, summary, event_type').in('slug', eventSlugs).eq('status', 'published')
      : Promise.resolve({ data: [] }),
  ])

  const cards    = (cardsRes as { data: { card_number: string; name: string }[] | null }).data ?? []
  const location = (locationRes as { data: { slug: string; name: string; type: string } | null }).data
  const events   = (eventsRes as { data: { slug: string; title: string; summary: string | null; event_type: string | null }[] | null }).data ?? []

  const EVENT_TYPE_LABELS: Record<string, string> = {
    battle: '⚔️ Mūšis', treaty: '🤝 Sutartis', discovery: '🔍 Atradimas',
    founding: '🏗️ Įkūrimas', collapse: '💀 Žlugimas',
  }

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
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Artefaktas</span>
          <span style={{ color: 'var(--bg-border)' }}>·</span>
          <span className="text-sm font-bold truncate"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            {art.name}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(212,175,55,0.2)' }}>
          <div className="flex items-start gap-4">
            {/* Artifact icon */}
            <div className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-3xl"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
              ✦
            </div>
            <div className="flex-1 min-w-0">
              {art.artifact_type && (
                <span className="inline-block text-xs px-2.5 py-1 rounded-full mb-2"
                  style={{ background: 'rgba(212,175,55,0.12)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.25)', fontSize: '10px', fontFamily: 'var(--rvn-font-display)' }}>
                  {art.artifact_type}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-bold"
                style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.04em', textShadow: '0 0 20px rgba(212,175,55,0.3)' }}>
                {art.name}
              </h1>
              {location && (
                <Link href={`/lore/locations/${location.slug}`}
                  className="inline-flex items-center gap-1.5 mt-1.5 text-xs hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                  <MapPin className="w-3 h-3" />
                  {location.name} · {TYPE_LABELS[location.type] ?? location.type}
                </Link>
              )}
            </div>
          </div>

          {/* Description */}
          {(art.description || art.short_description) && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {art.description || art.short_description}
            </p>
          )}

          {/* Image if available */}
          {art.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art.image_url} alt={art.name}
              className="w-full rounded-xl object-cover max-h-64"
              style={{ border: '1px solid rgba(212,175,55,0.15)' }} />
          )}
        </div>

        {/* Related Events */}
        {events.length > 0 && (
          <Section icon={<Scroll className="w-4 h-4" />} title="Susijusios įvykiai">
            <div className="space-y-2">
              {events.map((ev) => (
                <Link key={ev.slug} href={`/lore/events/${ev.slug}`}
                  className="block rounded-xl px-4 py-3 transition-all hover:border-[rgba(212,175,55,0.3)] group"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold group-hover:text-[var(--gold)] transition-colors"
                      style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                      {ev.title}
                    </p>
                    {ev.event_type && (
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
                      </span>
                    )}
                  </div>
                  {ev.summary && (
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{ev.summary}</p>
                  )}
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
