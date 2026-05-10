'use client'

import { useState, useTransition } from 'react'
import { registerForEvent, cancelRegistration } from '@/app/events/[eventId]/actions'

type Props = {
  eventId: string
  isRegistered: boolean
  isFull: boolean
  isCancelled: boolean
}

export function EventRegisterButton({ eventId, isRegistered, isFull, isCancelled }: Props) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  function handleRegister() {
    setMsg(null)
    startTransition(async () => {
      const res = await registerForEvent(eventId)
      if (res.error) setMsg({ text: res.error, ok: false })
      else setMsg({ text: res.success ?? 'Užsiregistruota!', ok: true })
    })
  }

  function handleCancel() {
    setMsg(null)
    startTransition(async () => {
      const res = await cancelRegistration(eventId)
      if (res.error) setMsg({ text: res.error, ok: false })
      else setMsg({ text: res.success ?? 'Atšaukta', ok: true })
    })
  }

  return (
    <div className="space-y-2">
      {isRegistered ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
            ✓ Užsiregistravote
          </div>
          <button
            onClick={handleCancel}
            disabled={pending}
            className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}
          >
            {pending ? 'Atšaukiama...' : 'Atšaukti registraciją'}
          </button>
        </div>
      ) : isCancelled ? (
        <div className="text-sm px-4 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          Renginys atšauktas
        </div>
      ) : isFull ? (
        <div className="text-sm px-4 py-2 rounded-lg"
          style={{ background: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.3)' }}>
          Vietų nebėra
        </div>
      ) : (
        <button
          onClick={handleRegister}
          disabled={pending}
          className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}
        >
          {pending ? 'Registruojama...' : 'Registruotis'}
        </button>
      )}

      {msg && (
        <p className="text-xs" style={{ color: msg.ok ? '#22c55e' : '#ef4444' }}>
          {msg.text}
        </p>
      )}
    </div>
  )
}
