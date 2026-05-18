'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useCollectionStore } from '@/stores/collectionStore'

type OwnedToggleProps = {
  cardId: string
  isAuthenticated: boolean
  size?: 'sm' | 'md'
}

export function OwnedToggle({ cardId, isAuthenticated, size = 'sm' }: OwnedToggleProps) {
  const [loading, setLoading] = useState(false)
  const isOwned    = useCollectionStore((state) => (state.collection[cardId] ?? 0) > 0)
  const toggleOwned = useCollectionStore((state) => state.toggleOwned)

  if (!isAuthenticated) return null

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleClick = async (e: React.MouseEvent) => {
    stop(e)
    if (loading) return
    setLoading(true)
    await toggleOwned(cardId)
    setLoading(false)
  }

  const sz     = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
  const iconSz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <button
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={handleClick}
      disabled={loading}
      aria-label={isOwned ? 'Pašalinti iš turimų' : 'Pažymėti kaip turimą'}
      title={isOwned ? 'Turima — spausti norint pašalinti' : 'Pažymėti kaip turimą'}
      className={`flex items-center justify-center rounded-full border-2 transition-all duration-200 disabled:opacity-50 ${sz}`}
      style={isOwned ? {
        border: '2px solid rgba(124,58,237,0.7)',
        background: 'rgba(124,58,237,0.2)',
        color: '#c4b5fd',
        boxShadow: '0 0 8px rgba(124,58,237,0.25)',
      } : {
        border: '2px solid rgba(100,116,139,0.4)',
        background: 'rgba(15,15,26,0.7)',
        color: 'var(--text-muted)',
      }}
    >
      {isOwned
        ? <Check className={iconSz} />
        : <Plus className={iconSz} />
      }
    </button>
  )
}
