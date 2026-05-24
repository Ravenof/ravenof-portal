'use client'

import { useState, useTransition } from 'react'

type DeleteFn = (id: string) => Promise<{ error?: string }>

export function LoreDeleteButton({ id, onDelete }: { id: string; onDelete: DeleteFn }) {
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState('')

  if (confirm) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await onDelete(id)
              if (res.error) { setErr(res.error); setConfirm(false) }
            })
          }
          className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: '#ef444430', color: '#ef4444', border: '1px solid #ef444450' }}
        >
          {pending ? '…' : 'Tikrai?'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          Ne
        </button>
        {err && <span className="text-xs" style={{ color: '#ef4444' }}>{err}</span>}
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
      style={{ background: 'var(--bg-elevated)', color: '#ef4444', border: '1px solid var(--bg-border)' }}
    >
      Ištrinti
    </button>
  )
}
