'use client'

import { useTransition, useState } from 'react'
import { awardTournamentRewardsAction } from '@/app/admin/events/actions'

type Props = {
  eventId: string
}

export function AwardRewardsButton({ eventId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleClick() {
    setMessage(null)
    startTransition(async () => {
      const result = await awardTournamentRewardsAction(eventId)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: result.success ?? 'Apdovanojimai skirti.' })
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{
          background: '#d97706' + '20',
          color: '#fbbf24',
          border: '1px solid ' + '#d97706' + '40',
        }}
      >
        {isPending ? 'Skiriama...' : 'Perskaičiuoti turnyro apdovanojimus'}
      </button>
      {message && (
        <span
          className="text-xs"
          style={{ color: message.type === 'success' ? '#22c55e' : '#ef4444' }}
        >
          {message.text}
        </span>
      )}
    </div>
  )
}
