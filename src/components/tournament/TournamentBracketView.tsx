// TASK 6: Turnyrinės lentelės vizualizacija — bracket cards
import type { TournamentMatch, TournamentPlayer } from '@/types'
import { formatMatchStatus, formatBracket, matchStatusColor } from '@/lib/tournament/helpers'

type PlayerWithProfile = TournamentPlayer & {
  username?: string
  display_name?: string | null
}

type Props = {
  matches: TournamentMatch[]
  playerMap: Record<string, PlayerWithProfile>
  myPlayerId: string | null   // tournament_player.id of current user
}

function PlayerSlot({
  player,
  isWinner,
  isLoser,
  isBye,
}: {
  player: PlayerWithProfile | null
  isWinner: boolean
  isLoser: boolean
  isBye?: boolean
}) {
  if (!player) {
    return (
      <div className="px-3 py-2 rounded-lg text-sm"
        style={{ color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(255,255,255,.03)' }}>
        {isBye ? 'Laisvas praėjimas' : '—'}
      </div>
    )
  }
  const name = player.display_name || player.username || '???'
  const pos  = player.seed ? `Poz. ${player.seed}` : ''
  return (
    <div className="px-3 py-2 rounded-lg flex items-center gap-2 transition-colors"
      style={{
        background: isWinner ? 'rgba(34,197,94,.12)' : isLoser ? 'rgba(239,68,68,.06)' : 'rgba(255,255,255,.04)',
        border: isWinner ? '1px solid rgba(34,197,94,.35)' : 'none',
      }}>
      {pos && <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)', minWidth: '54px' }}>{pos}</span>}
      <span className="text-sm font-semibold truncate"
        style={{ color: isWinner ? '#86efac' : isLoser ? '#fca5a5' : 'var(--text-primary)', fontFamily: 'Cinzel, Georgia, serif' }}>
        {isWinner && '🏆 '}{name}
      </span>
    </div>
  )
}

function MatchCard({
  match,
  playerMap,
  isMyMatch,
}: {
  match: TournamentMatch
  playerMap: Record<string, PlayerWithProfile>
  isMyMatch: boolean
}) {
  const p1       = match.player1_id ? playerMap[match.player1_id] ?? null : null
  const p2       = match.player2_id ? playerMap[match.player2_id] ?? null : null
  const statusColor = matchStatusColor(match.status)
  const isConfirmed = ['confirmed', 'admin_resolved', 'completed'].includes(match.status)
  const isDisputed  = match.status === 'disputed'

  const borderColor = isDisputed
    ? '#ef4444'
    : isMyMatch
      ? '#7c3aed'
      : isConfirmed && match.winner_id
        ? '#22c55e'
        : 'var(--bg-border)'

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${borderColor}`,
        background: isMyMatch
          ? 'linear-gradient(135deg,rgba(109,40,217,.12),rgba(15,9,48,.2))'
          : 'var(--bg-surface)',
        boxShadow: isDisputed
          ? '0 0 12px rgba(239,68,68,.2)'
          : isMyMatch
            ? '0 0 16px rgba(124,58,237,.2)'
            : 'none',
      }}>
      {/* Header row */}
      <div className="px-3 py-1.5 flex items-center justify-between"
        style={{ background: 'rgba(0,0,0,.2)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          #{match.match_number}
          {isMyMatch && <span className="ml-2 text-xs" style={{ color: '#a78bfa' }}>← Jūsų</span>}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: statusColor + '20', color: statusColor }}>
          {match.is_bye ? 'Laisvas praėjimas' : formatMatchStatus(match.status)}
        </span>
      </div>

      {/* Players */}
      <div className="p-2 space-y-1">
        <PlayerSlot
          player={p1}
          isWinner={isConfirmed && match.winner_id === match.player1_id}
          isLoser={isConfirmed && match.loser_id === match.player1_id}
        />
        {!match.is_bye && (
          <>
            <div className="text-center text-xs font-bold py-0.5"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              VS
            </div>
            <PlayerSlot
              player={p2}
              isWinner={isConfirmed && match.winner_id === match.player2_id}
              isLoser={isConfirmed && match.loser_id === match.player2_id}
              isBye={match.is_bye}
            />
          </>
        )}
        {match.is_bye && (
          <div className="px-3 py-1 text-xs italic" style={{ color: 'var(--text-muted)' }}>
            Laisvas praėjimas — automatinis perėjimas
          </div>
        )}
      </div>
    </div>
  )
}

export function TournamentBracketView({ matches, playerMap, myPlayerId }: Props) {
  if (matches.length === 0) return null

  // Group by round
  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b)

  return (
    <div>
      <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Turnyrinė lentelė
      </h2>

      {/* Desktop: horizontal columns per round */}
      <div className="hidden sm:flex gap-6 overflow-x-auto pb-2">
        {rounds.map(round => {
          const roundMatches = matches.filter(m => m.round === round)
          const bracketLabel = roundMatches[0] ? formatBracket(roundMatches[0].bracket) : ''
          return (
            <div key={round} style={{ minWidth: '240px', maxWidth: '280px', flex: '1' }}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: '#a78bfa', fontFamily: 'Cinzel, Georgia, serif' }}>
                  {round} Raundas
                </h3>
                {bracketLabel && (
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: '#6d28d920', color: '#a78bfa', border: '1px solid #6d28d940' }}>
                    {bracketLabel}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {roundMatches.map(m => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    playerMap={playerMap}
                    isMyMatch={myPlayerId !== null && (m.player1_id === myPlayerId || m.player2_id === myPlayerId)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical list */}
      <div className="sm:hidden space-y-6">
        {rounds.map(round => {
          const roundMatches = matches.filter(m => m.round === round)
          return (
            <div key={round}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: '#a78bfa', fontFamily: 'Cinzel, Georgia, serif' }}>
                {round} Raundas
              </h3>
              <div className="space-y-3">
                {roundMatches.map(m => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    playerMap={playerMap}
                    isMyMatch={myPlayerId !== null && (m.player1_id === myPlayerId || m.player2_id === myPlayerId)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
