'use client'

import { useState, useTransition } from 'react'
import { submitTournamentMatchReport } from '@/app/events/[eventId]/tournament-actions'
import { formatMatchStatus } from '@/lib/tournament/helpers'

type Props = {
  matchId: string
  matchStatus: string
  isBye: boolean
  hasPlayer2: boolean
  myReport: { claimed_result: 'win' | 'loss' } | null
  opponentReported: boolean
  eventId: string
}

export function MatchReportButtons({
  matchId,
  matchStatus,
  isBye,
  hasPlayer2,
  myReport,
  opponentReported,
  eventId,
}: Props) {
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  // Nerodyti mygtukų šiais atvejais
  if (isBye || !hasPlayer2) return null
  if (['confirmed', 'admin_resolved'].includes(matchStatus)) {
    return (
      <div className="rounded-lg px-4 py-3 text-sm text-center"
        style={{ background: '#22c55e15', border: '1px solid #22c55e40', color: '#22c55e' }}>
        ✓ {formatMatchStatus(matchStatus)}
      </div>
    )
  }
  if (matchStatus === 'disputed') {
    return (
      <div className="rounded-lg px-4 py-3 text-sm text-center"
        style={{ background: '#ef444415', border: '1px solid #ef444440', color: '#ef4444' }}>
        ⚠ Ginčas dėl rezultato — laukiama administratoriaus sprendimo
      </div>
    )
  }

  // Jei abu jau pateikė bet dar ne confirmed (neturėtų nutikti, bet apsauga)
  if (myReport && opponentReported) {
    return (
      <div className="rounded-lg px-4 py-3 text-sm text-center"
        style={{ background: '#3b82f615', border: '1px solid #3b82f640', color: '#93c5fd' }}>
        Abu rezultatai pateikti — apdorojama...
      </div>
    )
  }

  // Jei user jau pateikė, rodyti statusą
  if (myReport) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg px-4 py-3 text-sm text-center"
          style={{ background: '#3b82f615', border: '1px solid #3b82f640', color: '#93c5fd' }}>
          Jūs pateikėte: <strong>{myReport.claimed_result === 'win' ? 'Laimėjau' : 'Pralaimėjau'}</strong>.
          Laukiama varžovo patvirtinimo.
        </div>
        {feedback && (
          <p className="text-xs text-center" style={{ color: feedback.type === 'err' ? '#ef4444' : '#22c55e' }}>
            {feedback.msg}
          </p>
        )}
      </div>
    )
  }

  const submit = (result: 'win' | 'loss') => {
    setFeedback(null)
    startTransition(async () => {
      const res = await submitTournamentMatchReport(matchId, result)
      if (res.error) setFeedback({ type: 'err', msg: res.error })
      else           setFeedback({ type: 'ok', msg: res.success ?? 'Pateikta' })
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        Pateikite mačo rezultatą:
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => submit('win')}
          disabled={isPending}
          className="flex-1 rounded-xl py-4 text-base font-bold transition-all disabled:opacity-50 active:scale-95"
          style={{
            background: 'linear-gradient(135deg,#14532d,#166534)',
            color: '#86efac',
            border: '1px solid #22c55e60',
            boxShadow: '0 0 12px rgba(34,197,94,.2)',
            fontFamily: 'Cinzel, Georgia, serif',
          }}>
          🏆 Laimėjau
        </button>
        <button
          onClick={() => submit('loss')}
          disabled={isPending}
          className="flex-1 rounded-xl py-4 text-base font-bold transition-all disabled:opacity-50 active:scale-95"
          style={{
            background: 'linear-gradient(135deg,#450a0a,#7f1d1d)',
            color: '#fca5a5',
            border: '1px solid #ef444460',
            boxShadow: '0 0 12px rgba(239,68,68,.2)',
            fontFamily: 'Cinzel, Georgia, serif',
          }}>
          💀 Pralaimėjau
        </button>
      </div>
      {feedback && (
        <p className="text-xs text-center mt-1" style={{ color: feedback.type === 'err' ? '#ef4444' : '#22c55e' }}>
          {feedback.msg}
        </p>
      )}
      {isPending && (
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>Siunčiama...</p>
      )}
    </div>
  )
}
