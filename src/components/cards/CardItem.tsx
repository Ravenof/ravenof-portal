'use client'

import React, { useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Sword, Heart, Coins } from 'lucide-react'
import { getFactionColor, getRarityColor, truncate } from '@/lib/utils'
import { OwnedToggle } from './OwnedToggle'
import type { CardWithRelations } from '@/types'

type CardItemProps = {
  card: CardWithRelations
  isAuthenticated: boolean
  onClick?: (card: CardWithRelations) => void
}

export function CardItem({ card, isAuthenticated, onClick }: CardItemProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)

  const factionColor = getFactionColor(card.faction?.color_hex)
  const rarityColor  = getRarityColor(card.rarity?.name)

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]),  { stiffness: 300, damping: 30 })
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]),  { stiffness: 300, damping: 30 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    mx.set((e.clientX - rect.left) / rect.width  - 0.5)
    my.set((e.clientY - rect.top)  / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    mx.set(0); my.set(0); setHovered(false)
  }

  const showImage = !!card.image_url && !imgError

  const borderColor = hovered ? rarityColor + '80' : 'var(--bg-border)'
  const cardShadow  = hovered
    ? '0 0 24px ' + rarityColor + '35, 0 8px 32px rgba(0,0,0,0.6)'
    : '0 2px 8px rgba(0,0,0,0.4)'

  const cardStyle = {
    rotateX: rotX,
    rotateY: rotY,
    transformStyle: 'preserve-3d' as const,
    background: 'var(--bg-surface)',
    border: '1px solid ' + borderColor,
    boxShadow: cardShadow,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <motion.div
      ref={cardRef}
      style={cardStyle as React.CSSProperties}
      whileHover={{ scale: 1.04 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => { if (onClick) onClick(card) }}
      className="relative rounded-xl overflow-hidden cursor-pointer select-none"
    >
      {/* IMAGE AREA */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '3/4', background: factionColor + '12' }}
      >
        {showImage ? (
          <>
            <Image
              src={card.image_url!}
              alt={card.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 20vw"
              className="object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
              style={{
                filter: hovered ? 'brightness(1.1)' : 'brightness(0.95)',
                transition: 'filter 0.2s',
              }}
            />
            {/* Dark overlay with faction gradient at bottom */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.75) 100%)',
              }}
            />
          </>
        ) : (
          /* Placeholder */
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <span
              className="text-5xl font-bold opacity-20"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: factionColor }}
            >
              {card.faction?.name?.[0] ?? '?'}
            </span>
            <span className="text-xs opacity-20" style={{ color: factionColor }}>
              {card.faction?.name}
            </span>
          </div>
        )}

        {hovered && !showImage && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, ' + rarityColor + '18 0%, transparent 70%)' }}
          />
        )}

        {card.gold_cost !== null && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold z-10"
            style={{
              background: 'rgba(0,0,0,0.75)',
              color: 'var(--gold)',
              border: '1px solid rgba(245,158,11,0.35)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Coins className="w-3 h-3" />
            {card.gold_cost}
          </div>
        )}

        {card.is_champion && (
          <div
            className="absolute top-2 right-8 px-1.5 py-0.5 rounded text-xs font-bold z-10"
            style={{ background: 'rgba(0,0,0,0.75)', color: 'var(--gold)', border: '1px solid rgba(245,158,11,0.35)' }}
          >
            ♔
          </div>
        )}

        <div className="absolute bottom-2 right-2 z-10">
          <OwnedToggle cardId={card.id} isAuthenticated={isAuthenticated} size="sm" />
        </div>
      </div>

      {/* INFO */}
      <div className="p-3 space-y-1.5">
        <h3
          className="font-semibold text-sm leading-tight"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}
          title={card.name}
        >
          {truncate(card.name, 22)}
        </h3>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: factionColor + '20', color: factionColor, border: '1px solid ' + factionColor + '35' }}
          >
            {card.faction?.name ?? '—'}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {card.card_type?.name ?? '—'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: rarityColor }} />
          <span className="text-xs" style={{ color: rarityColor }}>{card.rarity?.name ?? '—'}</span>
        </div>

        {(card.attack !== null || card.health !== null) && (
          <div className="flex items-center gap-3 pt-0.5">
            {card.attack !== null && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                <Sword className="w-3 h-3" />{card.attack}
              </span>
            )}
            {card.health !== null && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-400">
                <Heart className="w-3 h-3" />{card.health}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
