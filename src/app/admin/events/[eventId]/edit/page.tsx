import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventForm } from '@/components/admin/EventForm'
import { updateRegistrationStatus } from '@/app/admin/events/actions'
import type { RavenEvent, EventRegistration, Profile, RegistrationStatus } from '@/types'

type Params = Promise<{ eventId: string }>

const REG_STATUS_COLORS: Record<string, string> = {
  registered: '#22c55e',
  cancelled:  '#ef4444',
  attended:   '#a78bfa',
  no_show:    '#f59e0b',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default async function EditEventPage({ params }: { params: Params }) {
  const { eventId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'event_moderator'].includes(role)) redirect('/')

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error || !event) notFound()
  const ev = event as RavenEvent & { created_by: string }
  // Moderator can only edit own events
  if (role === 'event_moderator' && ev.created_by !== user.id) redirect('/admin/events')

  // Fetch registrations
  const { data: regs } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  const registrations = (regs ?? []) as EventRegistration[]
  const userIds = registrations.map(r => r.user_id)

  // Fetch profiles
  const profileMap: Record<string, Profile> = {}
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_public, created_at, updated_at')
      .in('id', userIds)
    for (const p of (profilesData ?? [])) {
      profileMap[p.id] = p as Profile
    }
  }

  const registeredCount = registrations.filter(r => r.status === 'registered' || r.status === 'attended').length

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/events" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Renginiai
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Redaguoti renginį
          </span>
          {role === 'event_moderator'
            ? <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#a78bfa20', color: '#a78bfa' }}>MODERATORIUS</span>
            : <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>ADMIN</span>
          }
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Left: Event Form */}
        <div>
          <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            {ev.title}
          </h1>
          <EventForm eventId={eventId} initialData={ev} />
        </div>

        {/* Right: Participants */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Dalyviai
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {registeredCount}{ev.capacity ? `/${ev.capacity}` : ''}
            </span>
          </div>

          {registrations.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Nėra registracijų
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--bg-border)' }}>
              {registrations.map(reg => {
                const p = profileMap[reg.user_id]
                return (
                  <div key={reg.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {p?.display_name || p?.username || reg.user_id.slice(0, 8) + '...'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(reg.created_at)}
                      </p>
                    </div>
                    <form action={async (fd: FormData) => {
                      'use server'
                      const s = fd.get('status') as RegistrationStatus
                      await updateRegistrationStatus(reg.id, s)
                    }}>
                      <select name="status" defaultValue={reg.status}
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          background: (REG_STATUS_COLORS[reg.status] ?? '#6b7280') + '20',
                          color: REG_STATUS_COLORS[reg.status] ?? '#6b7280',
                          border: '1px solid ' + (REG_STATUS_COLORS[reg.status] ?? '#6b7280') + '40',
                        }}>
                        <option value="registered">registered</option>
                        <option value="cancelled">cancelled</option>
                        <option value="attended">attended</option>
                        <option value="no_show">no_show</option>
                      </select>
                      <button type="submit" className="ml-2 text-xs px-2 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
                        ✓
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
