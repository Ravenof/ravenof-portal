'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminResolveTournamentMatch } from '@/app/admin/events/actions'

type Player = {
  id: string
  seed?: number | null
  display_name?: string | null
  username?: string
}

type Props = {
  matchId: string
  matchNumber: number
  player1: Player | null
  player2: Player | null
  currentWinnerId: string | null
  currentStatus: string
}

function playerLabel(p: Player | null): string {
  if (!p) return '—'
  const name = p.display_name || p.username || '???'
  return p.seed ? `[Poz. ${p.seed}] ${name}` : name
}

export function AdminMatchOverride({
  matchId, matchNumber, player1, player2, currentWinnerId, currentStatus,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null)

  // Nerodyti jei nėra abiejų dalyvių
  if (!player1 || !player2) return null

  const assign = (winnerId: string) => {
    setResult(null)
    startTransition(async () => {
      const res = await adminResolveTournamentMatch(matchId, winnerId)
      setResult(res)
      if (!res.error) router.refresh()
    })
  }

  const currentWinnerName = currentWinnerId
    ? (currentWinnerId === player1.id ? playerLabel(player1) : playerLabel(player2))
    : null

  const isResolved = currentStatus === 'admin_resolved'

  return (
    <div className="mt-2 pt-2 border-t" style={{ borderColor: 'rgba(109,40,217,.2)' }}>
      <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#a78bfa' }}>
        Admin veiksmai
      </p>

      {/* Dabartinis laimėtojas */}
      {currentWinnerName && (
        <p className="text-xs mb-2" style={{ color: isResolved ? '#a78bfa' : '#22c55e' }}>
          {isResolved ? '⚖ Patvirtinta admino — ' : '✓ Laimėtojas: '}
          <span className="font-semibold">{currentWinnerName}</span>
        </p>
      )}

      {/* Sėkmės žinutė */}
      {result?.success && (
        <p className="text-xs mb-2" style={{ color: '#22c55e' }}>✓ {result.success}</p>
      )}

      {/* Override mygtukai */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => assign(player1.id)}
          disabled={isPending}
          className="rounded-lg py-1.5 px-3 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{
            background: currentWinnerId === player1.id ? '#166534' : '#0f2a1a',
            color: currentWinnerId === player1.id ? '#86efac' : '#4ade80',
            border: `1px solid ${currentWinnerId === player1.id ? '#22c55e50' : '#22c55e25'}`,
          }}>
          🏆 Skirti pergalę: {player1.display_name || player1.username || 'Dalyvis 1'}
        </button>
        <button
          onClick={() => assign(player2.id)}
          disabled={isPending}
          className="rounded-lg py-1.5 px-3 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{
            background: currentWinnerId === player2.id ? '#166534' : '#0f2a1a',
            color: currentWinnerId === player2.id ? '#86efac' : '#4ade80',
            border: `1px solid ${currentWinnerId === player2.id ? '#22c55e50' : '#22c55e25'}`,
          }}>
          🏆 Skirti pergalę: {player2.display_name || player2.username || 'Dalyvis 2'}
        </button>
      </div>

      {/* Klaida */}
      {result?.error && (
        <p className="text-xs mt-2" style={{ color: '#ef4444' }}>⚠ {result.error}</p>
      )}

      {isPending && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Išsaugoma...</p>
      )}
    </div>
  )
}
