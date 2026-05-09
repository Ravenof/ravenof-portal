'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { VoteValue } from '@/types'

type Props = {
  deckId: string
  initialScore: number
  initialVote: VoteValue
  userId: string | null
  size?: 'sm' | 'md'
}

export function VoteWidget({ deckId, initialScore, initialVote, userId, size = 'md' }: Props) {
  const router = useRouter()
  const [myVote, setMyVote] = useState<VoteValue>(initialVote)
  const [score, setScore]   = useState(initialScore)
  const [busy, setBusy]     = useState(false)

  const iconSz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const scoreSz = size === 'sm' ? 'text-xs' : 'text-sm'
  const btnSz = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'

  const handleVote = async (v: -1 | 1) => {
    if (!userId) {
      router.push('/login')
      return
    }
    if (busy) return

    const newVote: VoteValue = myVote === v ? 0 : v
    const delta = newVote - myVote

    // Optimistic
    setMyVote(newVote)
    setScore((s) => s + delta)
    setBusy(true)

    try {
      const supabase = createClient()
      if (newVote === 0) {
        await supabase.from('deck_votes').delete()
          .eq('deck_id', deckId).eq('user_id', userId)
      } else if (myVote === 0) {
        await supabase.from('deck_votes').insert({
          deck_id: deckId, user_id: userId, vote: newVote,
        })
      } else {
        await supabase.from('deck_votes').update({ vote: newVote, updated_at: new Date().toISOString() })
          .eq('deck_id', deckId).eq('user_id', userId)
      }
    } catch {
      // Rollback optimistic update
      setMyVote(myVote)
      setScore((s) => s - delta)
    } finally {
      setBusy(false)
    }
  }

  const upActive   = myVote === 1
  const downActive = myVote === -1

  return (
    <div className="flex flex-col items-center gap-0.5" style={{ opacity: busy ? 0.7 : 1 }}>
      <button
        onClick={() => handleVote(1)}
        disabled={busy}
        className={btnSz + ' rounded flex items-center justify-center transition-all'}
        style={{
          background: upActive ? 'rgba(34,197,94,0.2)' : 'transparent',
          color: upActive ? '#22c55e' : 'var(--text-muted)',
          border: '1px solid ' + (upActive ? 'rgba(34,197,94,0.4)' : 'var(--bg-border)'),
        }}
        title="Teigiamas balsas"
      >
        <ChevronUp className={iconSz} />
      </button>

      <span
        className={'font-bold tabular-nums text-center ' + scoreSz}
        style={{
          color: score > 0 ? '#22c55e' : score < 0 ? '#ef4444' : 'var(--text-muted)',
          minWidth: '20px',
        }}
      >
        {score}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={busy}
        className={btnSz + ' rounded flex items-center justify-center transition-all'}
        style={{
          background: downActive ? 'rgba(239,68,68,0.2)' : 'transparent',
          color: downActive ? '#ef4444' : 'var(--text-muted)',
          border: '1px solid ' + (downActive ? 'rgba(239,68,68,0.4)' : 'var(--bg-border)'),
        }}
        title="Neigiamas balsas"
      >
        <ChevronDown className={iconSz} />
      </button>
    </div>
  )
}
