import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Shield, MapPin, User, CreditCard, ArrowLeft } from 'lucide-react'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('lore_factions').select('name').eq('slug', slug).single()
  return { title: data ? `${data.name} | Ravenof Atlasas` : 'Frakcija | Ravenof' }
}

function Section({ icon, title, color, children }: {
  icon: React.ReactNode; title: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
          {title}
        </h2>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${color}33, transparent)` }} />
      </div>
      {children}
    </div>
  )
}

export default async function LoreFactionPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: faction } = await supabase
    .from('lore_factions')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!faction) return notFound()

  const color: string = faction.color ?? '#d4af37'

  // Fetch locations that belong to this faction
  // faction_ids is a text[] — we use the contains operator
  const [locationsRes, charactersRes] = await Promise.all([
    supabase
      .from('lore_locations')
      .select('slug, name, type, short_description')
      .eq('status', 'published')
      .contains('faction_ids', [slug])
      .order('sort_order', { ascending: true }),
    supabase
      .from('lore_characters')
      .select('slug, name, role, short_description')
      .eq('status', 'published')
      .eq('faction_id', slug)
      .order('sort_order', { ascending: true }),
  ])

  const locations = locationsRes.data ?? []
  const characters = charactersRes.data ?? []

  const TYPE_ICONS: Record<string, string> = {
    miestas: '🏙️', griuvėsiai: '🏚️', miškas: '🌲',
    tvirtovė: '🏰', uostas: '⚓', plyšys: '🌋', slėnis: '🏔️',
  }
  const TYPE_LABELS: Record<string, string> = {
    miestas: 'Miestas', griuvėsiai: 'Griuvėsiai', miškas: 'Miškas',
    tvirtovė: 'Tvirtovė', uostas: 'Uostas', plyšys: 'Plyšys', slėnis: 'Slėnis',
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/lore/factions" className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={13} />
            <span>Frakcijos</span>
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold truncate"
            style={{ fontFamily: 'var(--rvn-font-display)', color }}>
            {faction.name}
          </span>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Hero */}
        <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
          style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${color}44`,
            boxShadow: `0 0 40px ${color}11`,
          }}>
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at top left, ${color}08, transparent 60%)` }} />

          <div className="relative flex items-start gap-5">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{
                background: color + '18',
                border: `2px solid ${color}66`,
                boxShadow: `0 0 20px ${color}33`,
              }}>
              <Shield size={28} style={{ color }} />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1"
                style={{ fontFamily: 'var(--rvn-font-display)', color }}>
                {faction.name}
              </h1>
              <p className="text-xs font-mono mb-3" style={{ color: 'var(--text-muted)' }}>
                {faction.slug}
              </p>
              {faction.description && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {faction.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="relative mt-6 pt-4 flex flex-wrap gap-4 border-t"
            style={{ borderColor: color + '22' }}>
            {[
              { label: 'Vietovės', count: locations.length },
              { label: 'Veikėjai', count: characters.length },
            ].map(({ label, count }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color }}>
                  {count}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Locations */}
        {locations.length > 0 && (
          <Section icon={<MapPin size={14} />} title="Kontroliuojamos vietovės" color={color}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {locations.map((loc) => (
                <Link key={loc.slug} href={`/lore/locations/${loc.slug}`}
                  className="flex items-start gap-3 p-3 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                  <span className="text-lg flex-shrink-0">{TYPE_ICONS[loc.type] ?? '📍'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate"
                      style={{ fontFamily: 'var(--rvn-font-display)', color }}>
                      {loc.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {TYPE_LABELS[loc.type] ?? loc.type}
                    </p>
                    {loc.short_description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {loc.short_description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Characters */}
        {characters.length > 0 && (
          <Section icon={<User size={14} />} title="Frakcijos nariai" color={color}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {characters.map((ch) => (
                <Link key={ch.slug} href={`/lore/characters/${ch.slug}`}
                  className="flex items-start gap-3 p-3 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
                    style={{ background: color + '22', border: `1px solid ${color}55` }}>
                    <User size={14} style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate"
                      style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                      {ch.name}
                    </p>
                    {ch.role && (
                      <p className="text-xs" style={{ color }}>
                        {ch.role}
                      </p>
                    )}
                    {ch.short_description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {ch.short_description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Back link */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--bg-border)' }}>
          <Link href="/lore/factions"
            className="inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} />
            Visos frakcijos
          </Link>
        </div>

      </div>
    </div>
  )
}
