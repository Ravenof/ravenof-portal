import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { RavenEvent } from '@/types'

export const metadata = { title: 'Renginiai | Ravenof' }
export const revalidate = 0

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  published:  { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', label: 'Aktyvus' },
  completed:  { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', label: 'Baigtas' },
  cancelled:  { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'Atšauktas' },
  draft:      { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', label: 'Juodraštis' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('lt-LT', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date().toISOString()

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from('events')
      .select('id,title,description,location,starts_at,ends_at,capacity,status')
      .eq('status', 'published')
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(20),
    supabase
      .from('events')
      .select('id,title,description,location,starts_at,ends_at,capacity,status')
      .in('status', ['published', 'completed'])
      .lt('starts_at', now)
      .order('starts_at', { ascending: false })
      .limit(10),
  ])

  // Fetch registration counts for all events
  const allIds = [...(upcoming ?? []), ...(past ?? [])].map(e => e.id)
  let countMap: Record<string, number> = {}
  if (allIds.length > 0) {
    const { data: counts } = await supabase
      .from('event_registrations')
      .select('event_id')
      .in('event_id', allIds)
      .in('status', ['registered', 'attended'])
    if (counts) {
      counts.forEach((r: { event_id: string }) => {
        countMap[r.event_id] = (countMap[r.event_id] ?? 0) + 1
      })
    }
  }

  const upcomingEvents = (upcoming ?? []) as RavenEvent[]
  const pastEvents     = (past ?? []) as RavenEvent[]

  function EventCard({ event }: { event: RavenEvent }) {
    const ss = STATUS_STYLE[event.status] ?? STATUS_STYLE.draft
    const regCount = countMap[event.id] ?? 0
    const isFull = event.capacity !== null && regCount >= event.capacity
    return (
      <div
        className="rounded-xl p-5 flex flex-col gap-3 transition-colors"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--bg-border)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            className="text-base font-bold leading-snug"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}
          >
            {event.title}
          </h2>
          <span
            className="flex-shrink-0 text-xs px-2 py-0.5 rounded font-medium"
            style={{ background: ss.bg, color: ss.color }}
          >
            {ss.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>📅 {formatDate(event.starts_at)}</span>
          {event.location && <span>📍 {event.location}</span>}
          <span style={{ color: isFull ? '#ef4444' : 'var(--text-muted)' }}>
            👥 {regCount}{event.capacity ? '/' + event.capacity : ''} dalyvių
          </span>
        </div>

        {event.description && (
          <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>
            {event.description}
          </p>
        )}

        <Link
          href={'/events/' + event.id}
          className="self-start text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}
        >
          Peržiūrėti →
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-4"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              ← Kortų bazė
            </Link>
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
              Renginiai
            </h1>
          </div>
          <Link
              href="/life-tracker"
              className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}
            >
              Life Tracker
            </Link>
          {!user && (
            <Link href="/login" className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
              Prisijungti
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-10">
        {/* Upcoming */}
        <section>
          <h2 className="text-sm font-semibold mb-4 tracking-wider" style={{ color: 'var(--text-muted)' }}>
            ARTĖJANTYS RENGINIAI
          </h2>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-16 opacity-40">
              <p style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-muted)' }}>
                Artėjančių renginių nėra
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {upcomingEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </section>

        {/* Past */}
        {pastEvents.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-4 tracking-wider" style={{ color: 'var(--text-muted)' }}>
              PRAĖJĘ RENGINIAI
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-70">
              {pastEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
