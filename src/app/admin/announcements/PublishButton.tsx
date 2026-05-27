'use client'

import { useTransition } from 'react'
import { publishNow } from './actions'

export function PublishButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => { await publishNow(id) })}
      className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80 disabled:opacity-40"
      style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', whiteSpace: 'nowrap' }}>
      {pending ? '...' : 'Paskelbti dabar'}
    </button>
  )
}
