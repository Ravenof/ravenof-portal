import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventForm } from '@/components/admin/EventForm'
import { StartTournamentButton } from '@/components/admin/StartTournamentButton'
import { updateRegistrationStatus } from '@/app/admin/events/actions'
import type { RavenEvent, EventRegistration, Profile, RegistrationStatus, TournamentPlayer, TournamentMatch } from '@/types'

type Params = Promise<{ eventId: string }>

const REG_STATUS_COLORS: Record<string, string> = {
  registered: '#22c55e',
  cancelled:  '#ef4444',
  attended:   '#a78bfa',
  no_show:    '#f59e0b',
}

const MATCH_STATUS_COLORS: Record<string, string> = {
  pending:   '#6b7280',
  active:    '#f59e0b',
  completed: '#22c55e',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('lt-LT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
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
  if (role === 'event_moderator' && ev.created_by !== user.id) redirect('/admin/events')

  // Fetch registrations
  const { data: regs } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  const registrations = (regs ?? []) as EventRegistration[]
  const userIds = registrations.map(r => r.user_id)

  // Fetch profiles for registrations
  const profileMap: Record<string, Profile> = {}
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_public, created_at, updated_at')
      .in('id', userIds)
    for (const p of (profilesData ?? [])) profileMap[p.id] = p as Profile
  }

  const registeredCount = registrations.filter(
    r => r.status === 'registered' || r.status === 'attended'
  ).length

  // TASK 9: Fetch tournament data when event_type === turnyras
  let tPlayers: (TournamentPlayer & { username?: string; display_name?: string | null })[] = []
  let tMatches: TournamentMatch[] = []

  if (ev.event_type === 'turnyras') {
    const { data: tp } = await supabase
      .from('tournament_players')
      .select('*')
      .eq('event_id', eventId)
      .order('seed', { ascending: true })
    tPlayers = (tp ?? []) as TournamentPlayer[]

    if (tPlayers.length > 0) {
      const tUserIds = tPlayers.map(p => p.user_id)
      const { data: tProfs } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', tUserIds)
      const tProfMap: Record<string, { username: string; display_name: string | null }> = {}
      for (const p of (tProfs ?? [])) tProfMap[p.id] = p

      tPlayers = tPlayers.map(p => ({
        ...p,
        username:     tProfMap[p.user_id]?.username,
        display_name: tProfMap[p.user_id]?.display_name,
      }))
    }

    const { data: tm } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('event_id', eventId)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true })
    tMatches = (tm ?? []) as TournamentMatch[]
  }

  const tPlayerMap = Object.fromEntries(tPlayers.map(p => [p.id, p]))

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
          {ev.event_type === 'turnyras' && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#6d28d920', color: '#a78bfa', border: '1px solid #6d28d940' }}>
              ⚔ TURNYRAS
            </span>
          )}
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        {/* Top row: Form + Participants */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Left: Event Form */}
          <div>
            <h1 className="text-2xl font-bold mb-6"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
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

        {/* TASK 9: Tournament section — shown only for turnyras events */}
        {ev.event_type === 'turnyras' && (
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid #6d28d940', background: 'linear-gradient(135deg,rgba(45,27,105,.15),rgba(15,9,48,.25))' }}>
            <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
              style={{ borderBottom: '1px solid #6d28d940', background: 'rgba(109,40,217,.08)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#ddd6fe' }}>
                  ⚔ Turnyro valdymas
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {registeredCount} registruotų dalyvių
                  {ev.tournament_status && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        background: ev.tournament_status === 'active' ? '#22c55e20' : ev.tournament_status === 'completed' ? '#a78bfa20' : '#6b728020',
                        color: ev.tournament_status === 'active' ? '#22c55e' : ev.tournament_status === 'completed' ? '#a78bfa' : '#9ca3af',
                      }}>
                      {ev.tournament_status === 'active' ? 'Vyksta' : ev.tournament_status === 'completed' ? 'Baigtas' : 'Laukia'}
                    </span>
                  )}
                </p>
              </div>
              <StartTournamentButton
                eventId={eventId}
                playerCount={registeredCount}
                tournamentStatus={ev.tournament_status}
              />
            </div>

            {/* Bracket display */}
            {tMatches.length > 0 ? (
              <div className="p-6">
                <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                  1 Raundas — Winners Bracket
                </h3>
                <div className="space-y-3">
                  {tMatches.map(match => {
                    const p1 = match.player1_id ? tPlayerMap[match.player1_id] : null
                    const p2 = match.player2_id ? tPlayerMap[match.player2_id] : null
                    const winner = match.winner_id ? tPlayerMap[match.winner_id] : null
                    const p1Name = p1 ? (p1.display_name || p1.username || '???') : '—'
                    const p2Name = p2 ? (p2.display_name || p2.username || '???') : match.is_bye ? 'BYE' : '—'
                    return (
                      <div key={match.id} className="rounded-xl p-4 flex items-center gap-4"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', minWidth: '24px' }}>
                          #{match.match_number}
                        </span>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <span className={`text-sm font-medium truncate ${match.winner_id === match.player1_id ? 'font-bold' : ''}`}
                            style={{ color: match.winner_id === match.player1_id ? '#22c55e' : 'var(--text-primary)' }}>
                            {p1 ? `[${p1.seed}] ${p1Name}` : p1Name}
                          </span>
                          <span className="text-xs px-1.5" style={{ color: 'var(--text-muted)' }}>vs</span>
                          <span className={`text-sm font-medium truncate ${match.winner_id === match.player2_id ? 'font-bold' : ''}`}
                            style={{ color: match.is_bye ? '#6b7280' : match.winner_id === match.player2_id ? '#22c55e' : 'var(--text-primary)', fontStyle: match.is_bye ? 'italic' : undefined }}>
                            {p2 ? `[${p2.seed}] ${p2Name}` : p2Name}
                          </span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded font-medium shrink-0"
                          style={{
                            background: (MATCH_STATUS_COLORS[match.status] ?? '#6b7280') + '20',
                            color: MATCH_STATUS_COLORS[match.status] ?? '#6b7280',
                          }}>
                          {match.is_bye ? 'Bye' : match.status === 'pending' ? 'Laukia' : match.status === 'active' ? 'Vyksta' : 'Baigta'}
                        </span>
                        {winner && (
                          <span className="text-xs shrink-0" style={{ color: '#22c55e' }}>
                            ✓ {winner.display_name || winner.username}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Turnyras dar nepradėtas. Kai bus bent 2 registruoti dalyviai, galėsi startuoti.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
