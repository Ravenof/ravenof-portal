'use client'

// Tournament Module v3 — Bracket view grouped by bracket then round, with mobile tab nav
import { useState, type CSSProperties } from 'react'
import type { TournamentMatch, TournamentPlayer } from '@/types'
import { formatMatchStatus, formatBracket, matchStatusColor } from '@/lib/tournament/helpers'

type PlayerWithProfile = TournamentPlayer & {
  username?: string
  display_name?: string | null
}

type Props = {
  matches: TournamentMatch[]
  playerMap: Record<string, PlayerWithProfile>
  myPlayerId: string | null
  tournamentCompleted?: boolean
  tournamentWinnerId?: string | null
}

type TabKey = 'all' | 'winners' | 'losers' | 'grand_final'

const BRACKET_ORDER: Array<'winners' | 'losers' | 'grand_final'> = ['winners', 'losers', 'grand_final']

const BRACKET_COLORS: Record<string, string> = {
  winners:     '#a78bfa',
  losers:      '#f59e0b',
  grand_final: '#fbbf24',
}

const BRACKET_TAB_LABELS: Record<string, string> = {
  winners:     'Laimėtojų šaka',
  losers:      'Pralaimėjusiųjų šaka',
  grand_final: 'Didysis finalas',
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
  const pos  = player.seed ? ('Poz. ' + player.seed) : ''
  return (
    <div className="px-3 py-2 rounded-lg flex items-center gap-2 min-w-0 transition-colors"
      style={{
        background: isWinner ? 'rgba(34,197,94,.12)' : isLoser ? 'rgba(239,68,68,.06)' : 'rgba(255,255,255,.04)',
        border: isWinner ? '1px solid rgba(34,197,94,.35)' : 'none',
      }}>
      {pos && (
        <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)', minWidth: '54px' }}>
          {pos}
        </span>
      )}
      <span className="text-sm font-semibold truncate min-w-0"
        style={{
          color: isWinner ? '#86efac' : isLoser ? '#fca5a5' : 'var(--text-primary)',
          fontFamily: 'Cinzel, Georgia, serif',
        }}>
        {name}
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
  const p1          = match.player1_id ? (playerMap[match.player1_id] ?? null) : null
  const p2          = match.player2_id ? (playerMap[match.player2_id] ?? null) : null
  const statusColor = matchStatusColor(match.status)
  const isConfirmed = ['confirmed', 'admin_resolved', 'completed'].includes(match.status)
  const isDisputed  = match.status === 'disputed'

  const borderColor = isDisputed
    ? '#ef4444'
    : isMyMatch
      ? '#7c3aed'
      : (isConfirmed && match.winner_id)
        ? '#22c55e'
        : 'var(--bg-border)'

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        border: '1px solid ' + borderColor,
        background: isMyMatch
          ? 'linear-gradient(135deg,rgba(109,40,217,.12),rgba(15,9,48,.2))'
          : 'var(--bg-surface)',
        boxShadow: isDisputed
          ? '0 0 12px rgba(239,68,68,.2)'
          : isMyMatch
            ? '0 0 16px rgba(124,58,237,.2)'
            : 'none',
      }}>
      {/* Header */}
      <div className="px-3 py-1.5 flex items-center justify-between"
        style={{ background: 'rgba(0,0,0,.2)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {'#' + match.match_number}
          {isMyMatch && (
            <span className="ml-2 text-xs" style={{ color: '#a78bfa' }}> Jūsų</span>
          )}
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
          isLoser={isConfirmed && !!match.loser_id && match.loser_id === match.player1_id}
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
              isLoser={isConfirmed && !!match.loser_id && match.loser_id === match.player2_id}
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

function BracketSection({
  bracket,
  matches,
  playerMap,
  myPlayerId,
  mobileOnly = false,
}: {
  bracket: 'winners' | 'losers' | 'grand_final'
  matches: TournamentMatch[]
  playerMap: Record<string, PlayerWithProfile>
  myPlayerId: string | null
  mobileOnly?: boolean
}) {
  if (matches.length === 0) return null

  const rounds     = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b)
  const color      = BRACKET_COLORS[bracket] ?? '#a78bfa'
  const label      = formatBracket(bracket)
  const roundLabel = (round: number) =>
    bracket === 'grand_final' ? 'Didysis finalas' : (round + '. raundas')

  return (
    <div className="mb-6">
      {/* Bracket heading */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px" style={{ background: color + '30' }} />
        <h3 className="text-xs font-bold uppercase tracking-widest px-3"
          style={{ color, fontFamily: 'Cinzel, Georgia, serif' }}>
          {label}
        </h3>
        <div className="flex-1 h-px" style={{ background: color + '30' }} />
      </div>

      {/* Desktop columns (hidden when mobileOnly) */}
      {!mobileOnly && (
        <div className="hidden sm:flex gap-6 overflow-x-auto pb-2">
          {rounds.map(round => {
            const rMatches = matches.filter(m => m.round === round)
            return (
              <div key={round} style={{ minWidth: '240px', maxWidth: '280px', flex: '1' }}>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color }}>
                  {roundLabel(round)}
                </h4>
                <div className="space-y-3">
                  {rMatches.map(m => (
                    <MatchCard key={m.id} match={m} playerMap={playerMap}
                      isMyMatch={myPlayerId !== null && (m.player1_id === myPlayerId || m.player2_id === myPlayerId)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mobile vertical list (always shown when mobileOnly, else sm:hidden) */}
      <div className={mobileOnly ? 'space-y-5' : 'sm:hidden space-y-5'}>
        {rounds.map(round => {
          const rMatches = matches.filter(m => m.round === round)
          return (
            <div key={round}>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color }}>
                {roundLabel(round)}
              </h4>
              <div className="space-y-3">
                {rMatches.map(m => (
                  <MatchCard key={m.id} match={m} playerMap={playerMap}
                    isMyMatch={myPlayerId !== null && (m.player1_id === myPlayerId || m.player2_id === myPlayerId)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TournamentBracketView({
  matches,
  playerMap,
  myPlayerId,
  tournamentCompleted,
  tournamentWinnerId,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  if (matches.length === 0) return null

  const byBracket: Record<string, TournamentMatch[]> = {}
  for (const m of matches) {
    if (!byBracket[m.bracket]) byBracket[m.bracket] = []
    byBracket[m.bracket].push(m)
  }

  const winner     = tournamentWinnerId ? (playerMap[tournamentWinnerId] ?? null) : null
  const winnerName = winner ? (winner.display_name || winner.username || '???') : null

  // Build tabs list — only show brackets that have matches
  const availableTabs: Array<{ key: TabKey; label: string }> = [
    { key: 'all', label: 'Visi mačai' },
    ...(byBracket['winners']?.length     ? [{ key: 'winners'     as TabKey, label: BRACKET_TAB_LABELS['winners'] }]     : []),
    ...(byBracket['losers']?.length      ? [{ key: 'losers'      as TabKey, label: BRACKET_TAB_LABELS['losers'] }]      : []),
    ...(byBracket['grand_final']?.length ? [{ key: 'grand_final' as TabKey, label: BRACKET_TAB_LABELS['grand_final'] }] : []),
  ]

  const showTabs = availableTabs.length > 2

  return (
    <div>
      <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Turnyrinė lentelė
      </h2>

      {/* Turnyro laimėtojo juosta */}
      {tournamentCompleted && winnerName && (
        <div className="mb-6 rounded-xl px-5 py-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(90deg,rgba(251,191,36,.1),rgba(45,27,105,.15))',
            border: '1px solid rgba(251,191,36,.25)',
          }}>
          <span className="text-lg">🏆</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#fbbf24' }}>Turnyro laimėtojas</p>
            <p className="text-sm font-bold truncate" style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#fde68a' }}>
              {winnerName}
            </p>
          </div>
        </div>
      )}

      {/* ── Mobile tab nav (hidden on sm+) ── */}
      {showTabs && (
        <div
          className="sm:hidden flex gap-2 overflow-x-auto pb-3 mb-4"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as CSSProperties}>
          {availableTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
              style={{
                background: activeTab === tab.key ? '#7c3aed' : 'var(--bg-elevated)',
                color:      activeTab === tab.key ? '#ede9fe' : 'var(--text-muted)',
                border:     activeTab === tab.key ? '1px solid #7c3aed' : '1px solid var(--bg-border)',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Mobile: filtered bracket sections ── */}
      <div className="sm:hidden">
        {BRACKET_ORDER.map(bracket => {
          const bMatches = byBracket[bracket] ?? []
          if (bMatches.length === 0) return null
          if (activeTab !== 'all' && activeTab !== bracket) return null
          return (
            <BracketSection
              key={bracket}
              bracket={bracket}
              matches={bMatches}
              playerMap={playerMap}
              myPlayerId={myPlayerId}
              mobileOnly
            />
          )
        })}
      </div>

      {/* ── Desktop: all brackets ── */}
      <div className="hidden sm:block">
        {BRACKET_ORDER.map(bracket => (
          <BracketSection
            key={bracket}
            bracket={bracket}
            matches={byBracket[bracket] ?? []}
            playerMap={playerMap}
            myPlayerId={myPlayerId}
          />
        ))}
      </div>
    </div>
  )
}
