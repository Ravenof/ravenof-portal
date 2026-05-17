import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EventRegisterButton } from '@/components/events/EventRegisterButton'
import { MatchReportButtons } from '@/components/tournament/MatchReportButtons'
import { TournamentBracketView } from '@/components/tournament/TournamentBracketView'
import { formatMatchStatus } from '@/lib/tournament/helpers'
import type { RavenEvent, EventRegistration, TournamentPlayer, TournamentMatch, TournamentMatchReport } from '@/types'

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

  const { data: event, error } = await supabase.from('events').select('*').eq('id', eventId).single()
  if (error || !event) notFound()
  const ev = event as RavenEvent
  if (ev.status === 'draft') notFound()

  const { count: regCount } = await supabase
    .from('event_registrations').select('*', { count: 'exact', head: true })
    .eq('event_id', eventId).in('status', ['registered', 'attended'])
  const registrationCount = regCount ?? 0

  const { data: { user } } = await supabase.auth.getUser()
  let userRegistration: EventRegistration | null = null
  if (user) {
    const { data: reg } = await supabase
      .from('event_registrations').select('*')
      .eq('event_id', eventId).eq('user_id', user.id).maybeSingle()
    userRegistration = reg as EventRegistration | null
  }

  const isFull       = ev.capacity !== null && registrationCount >= ev.capacity
  const isRegistered = userRegistration?.status === 'registered' || userRegistration?.status === 'attended'
  const isPast       = ev.ends_at ? new Date(ev.ends_at) < new Date() : new Date(ev.starts_at) < new Date()

  // ── Turnyro duomenys ──────────────────────────────────────────────────────
  type PlayerWithProfile = TournamentPlayer & { username?: string; display_name?: string | null }

  let tPlayers: PlayerWithProfile[] = []
  let tMatches: TournamentMatch[] = []
  let myTPlayer: PlayerWithProfile | null = null
  let myMatch: (TournamentMatch & { opponentName?: string }) | null = null
  let myReport: TournamentMatchReport | null = null
  let opponentReported = false

  if (ev.event_type === 'turnyras' && ev.tournament_status === 'active') {
    const { data: tp } = await supabase
      .from('tournament_players').select('*').eq('event_id', eventId).order('seed')
    tPlayers = (tp ?? []) as PlayerWithProfile[]

    if (tPlayers.length > 0) {
      const tUids = tPlayers.map(p => p.user_id)
      const { data: tProfs } = await supabase
        .from('profiles').select('id, username, display_name').in('id', tUids)
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

    if (user) {
      myTPlayer = tPlayers.find(p => p.user_id === user.id) ?? null
      if (myTPlayer) {
        const m = tMatches.find(
          m => (m.player1_id === myTPlayer!.id || m.player2_id === myTPlayer!.id)
            && !['confirmed', 'admin_resolved', 'completed'].includes(m.status)
        ) ?? null
        if (m) {
          const oppId  = m.player1_id === myTPlayer.id ? m.player2_id : m.player1_id
          const opp    = oppId ? tPlayers.find(p => p.id === oppId) : null
          myMatch = {
            ...m,
            opponentName: opp
              ? (opp.display_name || opp.username || '???')
              : m.is_bye ? 'Laisvas praėjimas' : '???',
          }

          // Ataskaitų duomenys
          const { data: reports } = await supabase
            .from('tournament_match_reports').select('*').eq('match_id', m.id)
          for (const r of (reports ?? []) as TournamentMatchReport[]) {
            if (r.tournament_player_id === myTPlayer.id) myReport = r
            else opponentReported = true
          }
        }
      }
    }
  }

  const tPlayerMap = Object.fromEntries(tPlayers.map(p => [p.id, p]))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/events" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Renginiai
          </Link>
          <div className="flex-1" />
          <Link href="/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Kortų bazė
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Turnyro ženkliukas */}
        {ev.event_type === 'turnyras' && (
          <div className="mb-3">
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: '#6d28d920', color: '#a78bfa', border: '1px solid #6d28d940' }}>
              ⚔ TURNYRAS
            </span>
          </div>
        )}
        {isPast && (
          <div className="mb-4">
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: '#6b728020', color: '#9ca3af', border: '1px solid #6b728040' }}>
              PASIBAIGĘS
            </span>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-6"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
          {ev.title}
        </h1>

        {/* Meta kortelės */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>PRADŽIA</p>
            <p className="font-medium">{formatDate(ev.starts_at)}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formatTime(ev.starts_at)}</p>
          </div>
          {ev.ends_at && (
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>PABAIGA</p>
              <p className="font-medium">{formatDate(ev.ends_at)}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formatTime(ev.ends_at)}</p>
            </div>
          )}
          {ev.location && (
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>VIETA</p>
              <p className="font-medium">{ev.location}</p>
            </div>
          )}
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>DALYVIAI</p>
            <p className="font-medium">
              {registrationCount}
              {ev.capacity ? <span style={{ color: 'var(--text-muted)' }}> / {ev.capacity}</span> : null}
            </p>
            {isFull && <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>Vietos užimtos</p>}
          </div>
        </div>

        {/* Aprašymas */}
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

        {/* Registracija */}
        {!isPast && (
          <div className="rounded-xl p-6 mb-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
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

        {/* ── Turnyro sekcija ─────────────────────────────────────────────────── */}
        {ev.event_type === 'turnyras' && ev.tournament_status === 'active' && (
          <div className="space-y-6">
            {/* Tavo dabartinis mačas — TASK 1 */}
            {myTPlayer && myMatch && (
              <div className="rounded-2xl p-6 space-y-5"
                style={{
                  background: 'linear-gradient(135deg,rgba(45,27,105,.3),rgba(15,9,48,.4))',
                  border: '1px solid #7c3aed60',
                  boxShadow: '0 0 24px rgba(124,58,237,.15)',
                }}>
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                  ⚔ Tavo dabartinis mačas
                </h2>

                {/* Žaidėjai */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center">
                    <p className="text-xs mb-1" style={{ color: '#a78bfa' }}>TU</p>
                    <p className="text-lg font-bold"
                      style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#ddd6fe' }}>
                      {(myTPlayer as PlayerWithProfile).display_name || (myTPlayer as PlayerWithProfile).username || 'Tu'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Pozicija #{myTPlayer.seed}
                    </p>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: '#6d28d9' }}>VS</div>
                  <div className="flex-1 text-center">
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>VARŽOVAS</p>
                    <p className="text-lg font-bold"
                      style={{
                        fontFamily: 'Cinzel, Georgia, serif',
                        color: myMatch.is_bye ? '#6b7280' : 'var(--text-primary)',
                        fontStyle: myMatch.is_bye ? 'italic' : undefined,
                      }}>
                      {myMatch.opponentName}
                    </p>
                  </div>
                </div>

                {/* Mačo statusas */}
                {!myMatch.is_bye && (
                  <div className="pt-1 border-t" style={{ borderColor: 'rgba(124,58,237,.25)' }}>
                    <MatchReportButtons
                      matchId={myMatch.id}
                      matchStatus={myMatch.status}
                      isBye={myMatch.is_bye}
                      hasPlayer2={!!myMatch.player2_id}
                      myReport={myReport}
                      opponentReported={opponentReported}
                      eventId={eventId}
                    />
                  </div>
                )}
                {myMatch.is_bye && (
                  <p className="text-center text-sm" style={{ color: '#22c55e' }}>
                    ✓ Laisvas praėjimas — automatiškai pereini į kitą raundą!
                  </p>
                )}
              </div>
            )}

            {/* Turnyro mačas baigtas */}
            {myTPlayer && !myMatch && (
              <div className="rounded-xl p-5 text-center"
                style={{ background: '#22c55e10', border: '1px solid #22c55e30', color: '#22c55e' }}>
                ✓ Šio raundo mačas baigtas — lauk kitų porų rezultatų
              </div>
            )}

            {/* Nesi turnyro dalyvis bet esi registruotas */}
            {!myTPlayer && user && isRegistered && (
              <div className="rounded-xl p-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Esi užsiregistravęs, bet turnyro dalyvių sąraše nerastas — kreipkis į organizatorių.
              </div>
            )}

            {/* Turnyrinė lentelė — TASK 6 */}
            <TournamentBracketView
              matches={tMatches}
              playerMap={tPlayerMap}
              myPlayerId={myTPlayer?.id ?? null}
            />
          </div>
        )}

        {/* Turnyras dar nepradėtas */}
        {ev.event_type === 'turnyras' && !ev.tournament_status && (
          <div className="rounded-xl p-5 text-center text-sm"
            style={{ background: '#6d28d910', border: '1px solid #6d28d930', color: '#a78bfa' }}>
            ⚔ Turnyras dar nepradėtas — turnyrinė lentelė bus matoma kai organizatorius startuos turnyrą
          </div>
        )}
      </div>
    </div>
  )
}
