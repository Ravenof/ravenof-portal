'use client'

import { useState, useTransition } from 'react'
import { startTournament } from '@/app/admin/events/actions'
import type { TournamentStatus } from '@/types'

type Props = {
  eventId: string
  playerCount: number
  tournamentStatus: TournamentStatus | null
}

export function StartTournamentButton({ eventId, playerCount, tournamentStatus }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  if (tournamentStatus === 'completed') {
    return (
      <div className="rounded-lg px-4 py-2 text-sm font-semibold"
        style={{ background: '#a78bfa20', color: '#a78bfa', border: '1px solid #a78bfa40' }}>
        ✓ Turnyras baigtas
      </div>
    )
  }

  if (tournamentStatus === 'active') {
    return (
      <div className="rounded-lg px-4 py-2 text-sm font-semibold"
        style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}>
        ⚔ Turnyras vyksta
      </div>
    )
  }

  // pending or null — show start button
  const handleStart = () => {
    setError(null)
    startTransition(async () => {
      const result = await startTournament(eventId)
      if (result.error) {
        setError(result.error)
      } else {
        setShowConfirm(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => { setShowConfirm(true); setError(null) }}
        disabled={playerCount < 2}
        className="rounded-lg px-5 py-2 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
        style={{
          background: 'linear-gradient(135deg,#4c1d95,#6d28d9)',
          color: '#ede9fe',
          border: '1px solid #7c3aed',
          boxShadow: '0 0 12px rgba(124,58,237,.35)',
          fontFamily: 'Cinzel, Georgia, serif',
        }}>
        ⚔ Startuoti turnyrą
      </button>

      {playerCount < 2 && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Reikia bent 2 registruotų dalyvių
        </p>
      )}

      {/* Confirm dialog overlay */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false) }}>
          <div className="rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid #7c3aed60', boxShadow: '0 0 40px rgba(124,58,237,.4)' }}>
            <h3 className="text-lg font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#ddd6fe' }}>
              ⚔ Startuoti turnyrą?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Bus sugeneruotos <strong style={{ color: '#ddd6fe' }}>{Math.ceil(playerCount / 2)}</strong> poros
              iš <strong style={{ color: '#ddd6fe' }}>{playerCount}</strong> dalyvių (1 raundas).
              {playerCount % 2 !== 0 && (
                <span style={{ color: '#f59e0b' }}> Aukščiausias seed gauna bye automatiškai.</span>
              )}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Šio veiksmo atšaukti negalima. Turnyras prasidės ir bus matomas dalyviams.
            </p>

            {error && (
              <div className="rounded-lg p-3 text-sm"
                style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleStart}
                disabled={isPending}
                className="flex-1 rounded-lg py-2 text-sm font-bold transition-opacity disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg,#4c1d95,#6d28d9)',
                  color: '#ede9fe',
                  border: '1px solid #7c3aed',
                }}>
                {isPending ? 'Generuojama...' : 'Taip, startuoti'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="px-4 rounded-lg py-2 text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
                Atšaukti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
