import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EventRegisterButton } from '@/components/events/EventRegisterButton'
import type { RavenEvent, EventRegistration, TournamentPlayer, TournamentMatch } from '@/types'

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
  if (ev.status === 'draft') notFound()

  // Count registered+attended
  const { count: regCount } = await supabase
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .in('status', ['registered', 'attended'])

  const registrationCount = regCount ?? 0

  // Current user
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

  const isFull       = ev.capacity !== null && registrationCount >= ev.capacity
  const isRegistered = userRegistration?.status === 'registered' || userRegistration?.status === 'attended'
  const isPast       = ev.ends_at
    ? new Date(ev.ends_at) < new Date()
    : new Date(ev.starts_at) < new Date()

  // TASK 10: Tournament data
  let tPlayers: (TournamentPlayer & { username?: string; display_name?: string | null })[] = []
  let tMatches: TournamentMatch[] = []
  let myTPlayer: TournamentPlayer | null = null
  let myMatch: (TournamentMatch & { opponentName?: string }) | null = null

  if (ev.event_type === 'turnyras' && ev.tournament_status === 'active') {
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

    // Find current user's player + match
    if (user) {
      myTPlayer = tPlayers.find(p => p.user_id === user.id) ?? null
      if (myTPlayer) {
        const m = tMatches.find(
          m => (m.player1_id === myTPlayer!.id || m.player2_id === myTPlayer!.id) && m.status !== 'completed'
        ) ?? null
        if (m) {
          const oppId = m.player1_id === myTPlayer.id ? m.player2_id : m.player1_id
          const opp   = oppId ? tPlayers.find(p => p.id === oppId) : null
          myMatch = {
            ...m,
            opponentName: opp ? (opp.display_name || opp.username || '???') : m.is_bye ? 'BYE' : '???',
          }
        }
      }
    }
  }

  const tPlayerMap = Object.fromEntries(tPlayers.map(p => [p.id, p]))

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
        {/* Type badge */}
        {ev.event_type === 'turnyras' && (
          <div className="mb-3">
            <span className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: '#6d28d920', color: '#a78bfa', border: '1px solid #6d28d940' }}>
              ⚔ TURNYRAS
            </span>
          </div>
        )}

        {/* Past badge */}
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

        {/* TASK 10: Tournament section — shown when turnyras + active */}
        {ev.event_type === 'turnyras' && ev.tournament_status === 'active' && (
          <div className="space-y-6">
            {/* My current match */}
            {myTPlayer && myMatch && (
              <div className="rounded-2xl p-6"
                style={{ background: 'linear-gradient(135deg,rgba(45,27,105,.3),rgba(15,9,48,.4))', border: '1px solid #7c3aed60', boxShadow: '0 0 24px rgba(124,58,237,.15)' }}>
                <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                  ⚔ Tavo dabartinė rungtynė
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center">
                    <p className="text-xs mb-1" style={{ color: '#a78bfa' }}>TU</p>
                    <p className="text-lg font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#ddd6fe' }}>
                      {(myTPlayer as { display_name?: string | null; username?: string }).display_name || (myTPlayer as { display_name?: string | null; username?: string }).username || 'Tu'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Seed #{myTPlayer.seed}
                    </p>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: '#6d28d9' }}>VS</div>
                  <div className="flex-1 text-center">
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>VARŽOVAS</p>
                    <p className="text-lg font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: myMatch.is_bye ? '#6b7280' : 'var(--text-primary)', fontStyle: myMatch.is_bye ? 'italic' : undefined }}>
                      {myMatch.opponentName}
                    </p>
                  </div>
                </div>
                {myMatch.is_bye && (
                  <p className="text-center text-sm mt-4" style={{ color: '#22c55e' }}>
                    ✓ Gauni bye — automatiškai pereini į kitą raundą!
                  </p>
                )}
              </div>
            )}

            {myTPlayer && !myMatch && (
              <div className="rounded-xl p-5 text-center"
                style={{ background: '#22c55e10', border: '1px solid #22c55e30', color: '#22c55e' }}>
                ✓ Šio raundo rungtynės baigtos — lauk kitų porų rezultatų
              </div>
            )}

            {!myTPlayer && user && isRegistered && (
              <div className="rounded-xl p-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Esi užsiregistravęs, bet turnyro dalyviuose nerastas — kreipkis į organizatorių.
              </div>
            )}

            {/* Full bracket — 1 raundas */}
            <div>
              <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                1 Raundo bracket
              </h2>
              <div className="space-y-2">
                {tMatches.filter(m => m.round === 1).map(match => {
                  const p1 = match.player1_id ? tPlayerMap[match.player1_id] : null
                  const p2 = match.player2_id ? tPlayerMap[match.player2_id] : null
                  const isMyMatch = myTPlayer && (match.player1_id === myTPlayer.id || match.player2_id === myTPlayer.id)
                  const p1Name = p1 ? (p1.display_name || p1.username || '???') : '—'
                  const p2Name = p2 ? (p2.display_name || p2.username || '???') : match.is_bye ? 'BYE' : '—'
                  return (
                    <div key={match.id}
                      className="rounded-xl px-4 py-3 flex items-center gap-3"
                      style={{
                        background: isMyMatch ? 'rgba(109,40,217,.15)' : 'var(--bg-surface)',
                        border: isMyMatch ? '1px solid #7c3aed60' : '1px solid var(--bg-border)',
                      }}>
                      <span className="text-xs font-mono w-6 shrink-0" style={{ color: 'var(--text-muted)' }}>
                        #{match.match_number}
                      </span>
                      <span className="flex-1 text-sm truncate"
                        style={{ color: match.winner_id === match.player1_id ? '#22c55e' : 'var(--text-primary)', fontWeight: match.winner_id === match.player1_id ? 700 : 400 }}>
                        {p1 ? `[${p1.seed}] ${p1Name}` : p1Name}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>vs</span>
                      <span className="flex-1 text-sm truncate text-right"
                        style={{ color: match.is_bye ? '#6b7280' : match.winner_id === match.player2_id ? '#22c55e' : 'var(--text-primary)', fontWeight: match.winner_id === match.player2_id ? 700 : 400, fontStyle: match.is_bye ? 'italic' : undefined }}>
                        {p2 ? `[${p2.seed}] ${p2Name}` : p2Name}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: match.status === 'completed' ? '#22c55e20' : match.status === 'active' ? '#f59e0b20' : '#6b728020',
                          color: match.status === 'completed' ? '#22c55e' : match.status === 'active' ? '#f59e0b' : '#6b7280',
                        }}>
                        {match.is_bye ? 'Bye' : match.status === 'pending' ? 'Laukia' : match.status === 'active' ? 'Vyksta' : 'Baigta'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Turnyras not yet started */}
        {ev.event_type === 'turnyras' && !ev.tournament_status && (
          <div className="rounded-xl p-5 text-center text-sm"
            style={{ background: '#6d28d910', border: '1px solid #6d28d930', color: '#a78bfa' }}>
            ⚔ Turnyras dar nepradėtas — bracket bus matomas kai organizatorius startuos turnyrą
          </div>
        )}
      </div>
    </div>
  )
}
