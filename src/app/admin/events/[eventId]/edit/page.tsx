import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventForm } from '@/components/admin/EventForm'
import { StartTournamentButton } from '@/components/admin/StartTournamentButton'
import { DisputedMatchAdmin } from '@/components/tournament/DisputedMatchAdmin'
import { updateRegistrationStatus } from '@/app/admin/events/actions'
import { formatMatchStatus, matchStatusColor } from '@/lib/tournament/helpers'
import type { RavenEvent, EventRegistration, Profile, RegistrationStatus, TournamentPlayer, TournamentMatch } from '@/types'

type Params = Promise<{ eventId: string }>

const REG_STATUS_COLORS: Record<string, string> = {
  registered: '#22c55e',
  cancelled:  '#ef4444',
  attended:   '#a78bfa',
  no_show:    '#f59e0b',
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

  const { data: event, error } = await supabase.from('events').select('*').eq('id', eventId).single()
  if (error || !event) notFound()
  const ev = event as RavenEvent & { created_by: string }
  if (role === 'event_moderator' && ev.created_by !== user.id) redirect('/admin/events')

  // Registracijos
  const { data: regs } = await supabase
    .from('event_registrations').select('*').eq('event_id', eventId)
    .order('created_at', { ascending: true })
  const registrations = (regs ?? []) as EventRegistration[]

  const profileMap: Record<string, Profile> = {}
  if (registrations.length > 0) {
    const uids = registrations.map(r => r.user_id)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_public, created_at, updated_at')
      .in('id', uids)
    for (const p of (profilesData ?? [])) profileMap[p.id] = p as Profile
  }

  const registeredCount = registrations.filter(
    r => r.status === 'registered' || r.status === 'attended'
  ).length

  // Turnyro duomenys
  type PlayerWithProfile = TournamentPlayer & { username?: string; display_name?: string | null }

  let tPlayers: PlayerWithProfile[] = []
  let tMatches: TournamentMatch[] = []

  if (ev.event_type === 'turnyras') {
    const { data: tp } = await supabase
      .from('tournament_players').select('*').eq('event_id', eventId).order('seed')
    tPlayers = (tp ?? []) as PlayerWithProfile[]

    if (tPlayers.length > 0) {
      const uids = tPlayers.map(p => p.user_id)
      const { data: tProfs } = await supabase
        .from('profiles').select('id, username, display_name').in('id', uids)
      const tProfMap: Record<string, { username: string; display_name: string | null }> = {}
      for (const p of (tProfs ?? [])) tProfMap[p.id] = p
      tPlayers = tPlayers.map(p => ({
        ...p,
        username:     tProfMap[p.user_id]?.username,
        display_name: tProfMap[p.user_id]?.display_name,
      }))
    }

    const { data: tm } = await supabase
      .from('tournament_matches').select('*').eq('event_id', eventId)
      .order('round').order('match_number')
    tMatches = (tm ?? []) as TournamentMatch[]
  }

  const tPlayerMap = Object.fromEntries(tPlayers.map(p => [p.id, p]))

  // Ginčytini mačai — DisputedMatchAdmin
  const disputedMatches = tMatches
    .filter(m => m.status === 'disputed')
    .map(m => ({
      id:           m.id,
      match_number: m.match_number,
      player1:      m.player1_id ? { ...(tPlayerMap[m.player1_id] ?? {}), id: m.player1_id } : null,
      player2:      m.player2_id ? { ...(tPlayerMap[m.player2_id] ?? {}), id: m.player2_id } : null,
    }))

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
            <span className="text-xs px-2 py-0.5 rounded"
              style={{ background: '#6d28d920', color: '#a78bfa', border: '1px solid #6d28d940' }}>
              ⚔ TURNYRAS
            </span>
          )}
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        {/* Viršutinė eilutė: forma + dalyviai */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div>
            <h1 className="text-2xl font-bold mb-6"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
              {ev.title}
            </h1>
            <EventForm eventId={eventId} initialData={ev} />
          </div>

          {/* Dalyviai */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Dalyviai</h2>
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

        {/* ── Turnyro sekcija ─────────────────────────────────────────────────── */}
        {ev.event_type === 'turnyras' && (
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid #6d28d940', background: 'linear-gradient(135deg,rgba(45,27,105,.1),rgba(15,9,48,.2))' }}>
            {/* Header */}
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
                      {ev.tournament_status === 'active' ? 'Vyksta' : ev.tournament_status === 'completed' ? 'Baigtas' : 'Laukiama'}
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

            <div className="p-6 space-y-6">
              {/* TASK 5: Ginčytini mačai */}
              {disputedMatches.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider"
                    style={{ color: '#ef4444', fontFamily: 'Cinzel, Georgia, serif' }}>
                    ⚠ Ginčai dėl rezultatų
                  </h3>
                  <DisputedMatchAdmin matches={disputedMatches} />
                </div>
              )}

              {/* Mačų sąrašas */}
              {tMatches.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                    1 Raundas — Laimėtojų šaka
                  </h3>
                  <div className="space-y-2">
                    {tMatches.map(match => {
                      const p1   = match.player1_id ? tPlayerMap[match.player1_id] : null
                      const p2   = match.player2_id ? tPlayerMap[match.player2_id] : null
                      const sc   = matchStatusColor(match.status)
                      const p1Name = p1 ? `[Poz.${p1.seed}] ${p1.display_name || p1.username || '???'}` : '—'
                      const p2Name = match.is_bye ? 'Laisvas praėjimas' : p2 ? `[Poz.${p2.seed}] ${p2.display_name || p2.username || '???'}` : '—'
                      return (
                        <div key={match.id} className="rounded-xl p-3 flex items-center gap-3"
                          style={{
                            background: match.status === 'disputed' ? '#ef444410' : 'var(--bg-elevated)',
                            border: match.status === 'disputed' ? '1px solid #ef444450' : '1px solid var(--bg-border)',
                          }}>
                          <span className="text-xs font-mono w-6 shrink-0" style={{ color: 'var(--text-muted)' }}>
                            #{match.match_number}
                          </span>
                          <span className="flex-1 text-sm truncate"
                            style={{ color: match.winner_id === match.player1_id ? '#22c55e' : 'var(--text-primary)', fontWeight: match.winner_id === match.player1_id ? 700 : 400 }}>
                            {p1Name}
                          </span>
                          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>vs</span>
                          <span className="flex-1 text-sm truncate text-right"
                            style={{ color: match.is_bye ? '#6b7280' : match.winner_id === match.player2_id ? '#22c55e' : 'var(--text-primary)', fontWeight: match.winner_id === match.player2_id ? 700 : 400, fontStyle: match.is_bye ? 'italic' : undefined }}>
                            {p2Name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded shrink-0 font-medium"
                            style={{ background: sc + '20', color: sc }}>
                            {match.is_bye ? 'Laisvas praėjimas' : formatMatchStatus(match.status)}
                          </span>
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
          </div>
        )}
      </div>
    </div>
  )
}
