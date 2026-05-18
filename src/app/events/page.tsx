import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { RavenEvent } from '@/types'

export const metadata = { title: 'Renginiai | Ravenof' }
export const revalidate = 0

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  published: { bg: 'rgba(34,197,94,0.1)',   color: '#4ade80', border: 'rgba(34,197,94,0.3)',   label: 'Aktyvus'    },
  completed: { bg: 'rgba(96,165,250,0.1)',  color: '#60a5fa', border: 'rgba(96,165,250,0.3)',  label: 'Baigtas'    },
  cancelled: { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.3)',   label: 'Atšauktas'  },
  draft:     { bg: 'rgba(100,116,139,0.1)', color: '#94a3b8', border: 'rgba(100,116,139,0.2)', label: 'Juodraštis' },
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
  const pastEvents     = (past ?? [])    as RavenEvent[]

  function EventCard({ event, dimmed }: { event: RavenEvent; dimmed?: boolean }) {
    const ss = STATUS_STYLE[event.status] ?? STATUS_STYLE.draft
    const regCount = countMap[event.id] ?? 0
    const isFull   = event.capacity !== null && regCount >= event.capacity
    return (
      <div
        className="rounded-2xl flex flex-col gap-4 transition-all duration-200 hover:scale-[1.01] group relative overflow-hidden"
        style={{
          background: dimmed
            ? 'rgba(15,15,26,0.7)'
            : 'linear-gradient(135deg, rgba(240,180,41,0.04) 0%, var(--bg-surface) 50%)',
          border:  dimmed ? '1px solid var(--bg-border)' : '1px solid rgba(240,180,41,0.15)',
          padding: '1.25rem',
          opacity: dimmed ? 0.75 : 1,
        }}
      >
        {!dimmed && (
          <div
            className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(to right, transparent, rgba(240,180,41,0.4), transparent)' }}
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <h2
            className="text-base font-bold leading-snug min-w-0"
            style={{
              fontFamily: 'var(--rvn-font-display)',
              color:      dimmed ? 'var(--text-secondary)' : 'var(--text-primary)',
            }}
          >
            {event.title}
          </h2>
          <span
            className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: ss.bg, color: ss.color, border: '1px solid ' + ss.border }}
          >
            {ss.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>📅 {formatDate(event.starts_at)}</span>
          {event.location && <span>📍 {event.location}</span>}
          <span style={{ color: isFull ? '#f87171' : 'var(--text-muted)' }}>
            👥 {regCount}{event.capacity ? '/' + event.capacity : ''} dalyvių
          </span>
        </div>

        {event.description && (
          <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {event.description}
          </p>
        )}

        <div className="mt-auto">
          <Link
            href={'/events/' + event.id}
            className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background:    'linear-gradient(135deg, #92400e, #b45309)',
              color:         'var(--gold)',
              border:        '1px solid rgba(240,180,41,0.3)',
              fontFamily:    'var(--rvn-font-display)',
              letterSpacing: '0.04em',
            }}
          >
            Peržiūrėti
          </Link>
        </div>
      </div>
    )
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
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/cards" className="text-xs hover:opacity-70 shrink-0" style={{ color: 'var(--text-muted)' }}>
              Kortų bazė
            </Link>
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            <h1
              className="text-lg font-bold truncate"
              style={{
                fontFamily:    'var(--rvn-font-display)',
                color:         'var(--gold)',
                textShadow:    '0 0 16px rgba(240,180,41,0.3)',
                letterSpacing: '0.06em',
              }}
            >
              Renginiai
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/leaderboards"
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}>
              Topai
            </Link>
            <Link href="/life-tracker"
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}>
              Life Tracker
            </Link>
            {!user && (
              <Link href="/login"
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{
                  background:    'linear-gradient(135deg,#92400e,#b45309)',
                  color:         'var(--gold)',
                  border:        '1px solid rgba(240,180,41,0.3)',
                  fontFamily:    'var(--rvn-font-display)',
                }}>
                Prisijungti
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-12">

        <section>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="rvn-section-title text-sm uppercase tracking-widest">
              Artėjantys renginiai
            </h2>
            <div className="flex-1 rvn-divider-gold" />
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="rounded-2xl text-center py-16"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <p className="opacity-40 text-base"
                style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)' }}>
                Artėjančių renginių nėra
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {upcomingEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </section>

        {pastEvents.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-sm uppercase tracking-widest font-semibold"
                style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)' }}>
                Praėję renginiai
              </h2>
              <div className="flex-1 rvn-divider" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pastEvents.map(e => <EventCard key={e.id} event={e} dimmed />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
