import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreditCard, ArrowLeft, MapPin, Clock } from 'lucide-react'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('lore_events').select('title').eq('slug', slug).single()
  return { title: data ? `${data.title} — Atlasas` : 'Įvykis' }
}

const EVENT_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  battle:    { label: 'Mūšis',     icon: '⚔️', color: '#ef4444' },
  treaty:    { label: 'Sutartis',  icon: '🤝', color: '#22c55e' },
  discovery: { label: 'Atradimas', icon: '🔍', color: '#3b82f6' },
  founding:  { label: 'Įkūrimas', icon: '🏗️', color: '#f59e0b' },
  collapse:  { label: 'Žlugimas', icon: '💀', color: '#8b5cf6' },
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

export default async function LoreEventPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: ev } = await supabase
    .from('lore_events')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!ev) return notFound()

  const cardNumbers: string[] = ev.related_card_numbers ?? []

  const [cardsRes, locationRes, eraRes] = await Promise.all([
    cardNumbers.length > 0
      ? supabase.from('cards').select('card_number, name').in('card_number', cardNumbers)
      : Promise.resolve({ data: [] }),
    ev.location_slug
      ? supabase.from('lore_locations').select('slug, name, type').eq('slug', ev.location_slug).eq('status', 'published').maybeSingle()
      : Promise.resolve({ data: null }),
    ev.era_slug
      ? supabase.from('lore_eras').select('name, slug').eq('slug', ev.era_slug).eq('status', 'published').maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const cards    = (cardsRes as { data: { card_number: string; name: string }[] | null }).data ?? []
  const location = (locationRes as { data: { slug: string; name: string; type: string } | null }).data
  const era      = (eraRes as { data: { name: string; slug: string } | null }).data

  const typeMeta = ev.event_type ? (EVENT_TYPE_META[ev.event_type] ?? null) : null

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
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Įvykis</span>
          <span style={{ color: 'var(--bg-border)' }}>·</span>
          <span className="text-sm font-bold truncate"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            {ev.title}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${typeMeta ? typeMeta.color + '33' : 'rgba(212,175,55,0.15)'}`,
          }}>

          {/* Chips row */}
          <div className="flex items-center gap-2 flex-wrap">
            {typeMeta && (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: typeMeta.color + '18', color: typeMeta.color, border: `1px solid ${typeMeta.color}40`, fontSize: '10px', fontFamily: 'var(--rvn-font-display)' }}>
                {typeMeta.icon} {typeMeta.label}
              </span>
            )}
            {era && (
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', fontSize: '10px' }}>
                🕰️ {era.name}
              </span>
            )}
            {location && (
              <Link href={`/lore/locations/${location.slug}`}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)', fontSize: '10px', textDecoration: 'none' }}>
                <MapPin className="w-2.5 h-2.5" />
                {location.name}
              </Link>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            {ev.title}
          </h1>

          {/* Summary */}
          {ev.summary && (
            <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
              {ev.summary}
            </p>
          )}
        </div>

        {/* Full text */}
        {ev.full_text && (
          <div className="rounded-2xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4" style={{ color: 'var(--gold)', opacity: 0.7 }} />
              <h2 className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
                Pilnas aprašymas
              </h2>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
              {ev.full_text}
            </div>
          </div>
        )}

        {/* Location link (standalone card if no full_text) */}
        {!ev.full_text && location && (
          <Section icon={<MapPin className="w-4 h-4" />} title="Vietovė">
            <Link href={`/lore/locations/${location.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02]"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              📍 {location.name}
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                · {TYPE_LABELS[location.type] ?? location.type}
              </span>
            </Link>
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
