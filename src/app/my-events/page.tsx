import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { RegistrationStatus } from '@/types'

export const revalidate = 0

type RegWithEvent = {
  id: string
  status: RegistrationStatus
  created_at: string
  event: {
    id: string
    title: string
    location: string | null
    starts_at: string
    ends_at: string | null
    status: string
  } | null
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  registered: 'Registruotas',
  cancelled: 'Atšaukta',
  attended: 'Dalyvavo',
  no_show: 'Neatvyko',
}
const STATUS_COLOR: Record<RegistrationStatus, string> = {
  registered: '#60a5fa',
  cancelled: '#f87171',
  attended: '#4ade80',
  no_show: '#94a3b8',
}

export default async function MyEventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawRegs } = await supabase
    .from('event_registrations')
    .select(`
      id, status, created_at,
      event:events ( id, title, location, starts_at, ends_at, status )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const regs = (rawRegs ?? []) as unknown as RegWithEvent[]

  const now = new Date().toISOString()
  const upcoming = regs.filter((r) => r.status === 'registered' && r.event && r.event.starts_at > now)
  const attended = regs.filter((r) => r.status === 'attended')
  const other = regs.filter((r) => r.status === 'cancelled' || r.status === 'no_show')

  function RegCard({ reg }: { reg: RegWithEvent }) {
    if (!reg.event) return null
    return (
      <Link
        href={`/events/${reg.event.id}`}
        className="block rounded-xl p-4 transition hover:opacity-80"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{reg.event.title}</p>
            {reg.event.location && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{reg.event.location}</p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{formatDate(reg.event.starts_at)}</p>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: STATUS_COLOR[reg.status] + '25', color: STATUS_COLOR[reg.status] }}
          >
            {STATUS_LABEL[reg.status]}
          </span>
        </div>
      </Link>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <Link href="/me" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>&larr; Dashboard</Link>
        <span style={{ color: 'var(--bg-border)' }}>|</span>
        <h1 className="text-lg font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>Mano Renginiai</h1>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-6 space-y-8">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
            Artėjantys renginiai ({upcoming.length})
          </h2>
          {upcoming.length === 0
            ? <p className="text-sm opacity-50" style={{ color: 'var(--text-muted)' }}>Nėra registracijų.</p>
            : <div className="space-y-2">{upcoming.map((r) => <RegCard key={r.id} reg={r} />)}</div>}
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
            Lankyti renginiai ({attended.length})
          </h2>
          {attended.length === 0
            ? <p className="text-sm opacity-50" style={{ color: 'var(--text-muted)' }}>Nė vieno renginio.</p>
            : <div className="space-y-2">{attended.map((r) => <RegCard key={r.id} reg={r} />)}</div>}
        </section>

        {other.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}>
              Atšaukta / Neatvyko ({other.length})
            </h2>
            <div className="space-y-2">{other.map((r) => <RegCard key={r.id} reg={r} />)}</div>
          </section>
        )}
      </div>
    </div>
  )
}
