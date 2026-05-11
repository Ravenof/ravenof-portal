import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { RavenEvent } from '@/types'

type SearchParams = Promise<{ status?: string }>

const STATUS_COLORS: Record<string, string> = {
  published: '#22c55e',
  draft:     '#6b7280',
  cancelled: '#ef4444',
  completed: '#a78bfa',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default async function AdminEventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'event_moderator'].includes(role)) redirect('/')

  const isMod = role === 'event_moderator'

  let q = supabase.from('events').select('*').order('starts_at', { ascending: false })
  // Moderators only see their own events
  if (isMod) q = q.eq('created_by', user.id)
  if (params.status) q = q.eq('status', params.status)

  const { data: events, error } = await q
  const rows = (events ?? []) as RavenEvent[]

  const eventIds = rows.map(e => e.id)
  const countMap: Record<string, number> = {}
  if (eventIds.length > 0) {
    const { data: regData } = await supabase
      .from('event_registrations')
      .select('event_id')
      .in('event_id', eventIds)
      .in('status', ['registered', 'attended'])
    for (const r of (regData ?? [])) {
      countMap[r.event_id] = (countMap[r.event_id] ?? 0) + 1
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          {!isMod && (
            <>
              <Link href="/admin/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                ← Kortos
              </Link>
              <span style={{ color: 'var(--bg-border)' }}>|</span>
            </>
          )}
          <span className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Renginiai
          </span>
          {isMod ? (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#a78bfa20', color: '#a78bfa' }}>MODERATORIUS</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>ADMIN</span>
          )}
          {!isMod && (
            <>
              <Link href="/admin/users" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                Vartotojai
              </Link>
              <Link href="/admin/achievements" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                Pasiekimai
              </Link>
            </>
          )}
          <div className="flex-1" />
          <Link href="/admin/events/new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Naujas renginys
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#ef444420', color: '#ef4444' }}>
            Klaida: {error.message}
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {['', 'published', 'draft', 'cancelled', 'completed'].map(s => (
            <Link key={s} href={s ? `/admin/events?status=${s}` : '/admin/events'}
              className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{
                background: params.status === s || (!params.status && s === '') ? 'var(--gold)' : 'var(--bg-elevated)',
                color: params.status === s || (!params.status && s === '') ? '#0a0a0f' : 'var(--text-secondary)',
                border: '1px solid var(--bg-border)',
              }}>
              {s === '' ? 'Visi' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </div>

        <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          {rows.length} renginių{isMod ? ' (tavo)' : ''}
        </div>

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Pavadinimas', 'Pradžia', 'Vieta', 'Dalyviai', 'Statusas', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((ev, i) => (
                <tr key={ev.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)', maxWidth: '220px' }}>
                    <span className="truncate block">{ev.title}</span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatDate(ev.starts_at)}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)', maxWidth: '160px' }}>
                    <span className="truncate block">{ev.location ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                    {countMap[ev.id] ?? 0}
                    {ev.capacity ? <span style={{ color: 'var(--text-muted)' }}>/{ev.capacity}</span> : ''}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="px-2 py-0.5 rounded font-medium"
                      style={{ background: (STATUS_COLORS[ev.status] ?? '#6b7280') + '20', color: STATUS_COLORS[ev.status] ?? '#6b7280' }}>
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/events/${ev.id}/edit`}
                      className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                      Redaguoti
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
              Renginių nerasta
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
