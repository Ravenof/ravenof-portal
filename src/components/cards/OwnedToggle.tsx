'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCollectionStore } from '@/stores/collectionStore'

type OwnedToggleProps = {
  cardId: string
  isAuthenticated: boolean
  size?: 'sm' | 'md'
}

export function OwnedToggle({ cardId, isAuthenticated, size = 'sm' }: OwnedToggleProps) {
  const [loading, setLoading] = useState(false)
  const { collection, toggleOwned } = useCollectionStore()
  const isOwned = (collection[cardId] ?? 0) > 0

  if (!isAuthenticated) return null

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    await toggleOwned(cardId)
    setLoading(false)
  }

  const sz = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
  const iconSz = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={isOwned ? 'Turiu — spausti norėdamas pašalinti' : 'Pažymėti kaip turimą'}
      className={cn(
        'flex items-center justify-center rounded-full border-2 transition-all duration-200 disabled:opacity-50',
        sz,
        isOwned
          ? 'border-green-500 bg-green-500/20 text-green-400 hover:border-red-500 hover:bg-red-500/20 hover:text-red-400'
          : 'border-gray-600 bg-black/40 text-gray-500 hover:border-green-500 hover:text-green-400'
      )}
    >
      {isOwned
        ? <Check className={iconSz} />
        : <Plus className={iconSz} />
      }
    </button>
  )
}
