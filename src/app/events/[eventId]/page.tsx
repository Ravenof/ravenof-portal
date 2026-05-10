import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EventRegisterButton } from '@/components/events/EventRegisterButton'
import type { RavenEvent, EventRegistration } from '@/types'

type Params = Promise<{ eventId: string }>

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('lt-LT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error || !event) notFound()

  const ev = event as RavenEvent

  // Hide draft events from public; cancelled/completed remain visible with correct status
  if (ev.status === 'draft') notFound()

  // Count registered+attended
  const { count: regCount } = await supabase
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .in('status', ['registered', 'attended'])

  const registrationCount = regCount ?? 0

  // Check current user
  const { data: { user } } = await supabase.auth.getUser()
  let userRegistration: EventRegistration | null = null

  if (user) {
    const { data: reg } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()
    userRegistration = reg as EventRegistration | null
  }

  const isFull = ev.capacity !== null && registrationCount >= ev.capacity
  const isRegistered = userRegistration?.status === 'registered' || userRegistration?.status === 'attended'
  const isPast = ev.ends_at ? new Date(ev.ends_at) < new Date() : new Date(ev.starts_at) < new Date()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/events" className="text-xs hover:opacity-70 flex items-center gap-1"
            style={{ color: 'var(--text-muted)' }}>
            ← Renginiai
          </Link>
          <div className="flex-1" />
          <Link href="/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Kortų bazė
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Past badge — only shown when event is published but already in the past */}
        {isPast && (
          <div className="mb-4">
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: '#6b728020', color: '#9ca3af', border: '1px solid #6b728040' }}>
              PASIBAIGĘS
            </span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold mb-6"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
          {ev.title}
        </h1>

        {/* Meta grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>PRADŽIA</p>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(ev.starts_at)}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formatTime(ev.starts_at)}</p>
          </div>

          {ev.ends_at && (
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>PABAIGA</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(ev.ends_at)}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formatTime(ev.ends_at)}</p>
            </div>
          )}

          {ev.location && (
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>VIETA</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{ev.location}</p>
            </div>
          )}

          <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>DALYVIAI</p>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {registrationCount}
              {ev.capacity ? <span style={{ color: 'var(--text-muted)' }}> / {ev.capacity}</span> : null}
            </p>
            {isFull && (
              <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>Vietos užimtos</p>
            )}
          </div>
        </div>

        {/* Description */}
        {ev.description && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Aprašymas
            </h2>
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {ev.description}
              </p>
            </div>
          </div>
        )}

        {/* Registration */}
        {!isPast && (
          <div className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Registracija
            </h2>
            {user ? (
              <EventRegisterButton
                eventId={eventId}
                isRegistered={isRegistered}
                isFull={isFull && !isRegistered}
                isCancelled={ev.status === 'cancelled'}
              />
            ) : (
              <div>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Norėdami registruotis, prisijunkite prie savo paskyros.
                </p>
                <Link href="/login"
                  className="inline-block px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
                  Prisijungti
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
