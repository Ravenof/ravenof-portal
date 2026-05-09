'use client'

import { useEffect } from 'react'
import { CardItem } from './CardItem'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useCollectionStore } from '@/stores/collectionStore'
import type { CardWithRelations, CollectionMap } from '@/types'

type CardGridProps = {
  cards: CardWithRelations[]
  isAuthenticated: boolean
  initialCollection: CollectionMap
}

export function CardGrid({ cards, isAuthenticated, initialCollection }: CardGridProps) {
  const { init } = useCollectionStore()

  // Inicializuoti store iš server datos (tik pirmą kartą)
  useEffect(() => {
    init(initialCollection)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-6xl opacity-20">🃏</div>
        <p
          className="text-lg"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-muted)' }}
        >
          Kortų nerasta
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Pabandyk pakeisti filtrus
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
