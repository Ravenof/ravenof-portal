'use client'

import { useActionState } from 'react'
import { updateUserRole } from '@/app/admin/users/actions'

const ROLES = [
  { value: 'user', label: 'user' },
  { value: 'event_moderator', label: 'moderator' },
  { value: 'admin', label: 'admin' },
]

type Props = { userId: string; currentRole: string }

export function UserRoleForm({ userId, currentRole }: Props) {
  const boundAction = updateUserRole.bind(null, userId)
  const [state, formAction, pending] = useActionState(boundAction, {})

  return (
    <form action={formAction} className="flex items-center gap-2">
      <select
        name="role"
        defaultValue={currentRole}
        disabled={pending}
        className="text-xs px-2 py-1 rounded outline-none"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          color: 'var(--text-secondary)',
        }}
      >
        {ROLES.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}
      >
        {pending ? '…' : '✓'}
      </button>
      {state.error && (
        <span className="text-xs" style={{ color: '#ef4444' }}>{state.error}</span>
      )}
      {state.success && (
        <span className="text-xs" style={{ color: '#22c55e' }}>✓</span>
      )}
    </form>
  )
}
