'use client'

import { useTransition, useState } from 'react'
import { recalculateTournamentBracket } from '@/app/admin/events/actions'

type Props = {
  eventId: string
}

export function RecalculateBracketButton({ eventId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleClick() {
    setMessage(null)
    startTransition(async () => {
      const result = await recalculateTournamentBracket(eventId)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: result.success ?? 'Turnyrinė lentelė perskaičiuota.' })
      }
    })
  }

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs px-3 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 w-full sm:w-auto"
        style={{
          background: '#6d28d920',
          color: '#a78bfa',
          border: '1px solid #6d28d940',
        }}
      >
        {isPending ? 'Skaičiuojama...' : 'Perskaičiuoti turnyrinę lentelę'}
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
