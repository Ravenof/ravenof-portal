'use client'

import { useEffect, useState } from 'react'
import type { CardWithRelations } from '@/types'
import { getRarityColor, getFactionColor } from '@/lib/utils'

type Props = {
  card: CardWithRelations | null
  x: number
  y: number
}

const PREVIEW_W = 200
const PREVIEW_H = 340
const OFFSET = 20

export function CardHoverPreview({ card, x, y }: Props) {
  const [viewport, setViewport] = useState({ w: 1920, h: 1080 })

  useEffect(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight })
    const handler = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (!card) return null

  const rarityColor = getRarityColor(card.rarity?.name)
  const factionColor = getFactionColor(card.faction?.color_hex)

  const left = x + OFFSET + PREVIEW_W > viewport.w ? x - OFFSET - PREVIEW_W : x + OFFSET
  const top = Math.max(8, y + PREVIEW_H > viewport.h ? y - PREVIEW_H + 40 : y - 10)

  return (
    <div
      className="hidden lg:block"
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 9999,
        width: PREVIEW_W + 'px',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 0 20px ' + factionColor + '55)',
      }}
    >
      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '2px solid ' + rarityColor,
          background: 'var(--bg-elevated)',
          boxShadow: '0 0 28px ' + rarityColor + '44, inset 0 0 40px rgba(0,0,0,0.6)',
        }}
      >
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.name}
            style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '3/4',
              background: `linear-gradient(160deg, ${factionColor}22 0%, #0a0a1a 60%, ${rarityColor}18 100%)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '52px', opacity: 0.2, lineHeight: 1 }}>⚔</span>
            <span style={{
              fontSize: '10px', opacity: 0.4, color: factionColor,
              fontFamily: 'Cinzel, Georgia, serif', textAlign: 'center', padding: '0 12px',
            }}>
              {card.faction?.name ?? 'Ravenof'}
            </span>
          </div>
        )}

        <div style={{ padding: '8px 10px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.95))' }}>
          <p style={{
            fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: 'Cinzel, Georgia, serif', lineHeight: '1.2', marginBottom: '4px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {card.name}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '3px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {card.card_type?.name ?? ''}
            </span>
            {card.gold_cost != null && (
              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#0a0a0f',
                background: 'var(--gold)', borderRadius: '6px', padding: '1px 7px', lineHeight: '1.4',
              }}>
                {card.gold_cost}⚜
              </span>
            )}
          </div>

          {card.faction && (
            <p style={{ fontSize: '10px', color: factionColor, opacity: 0.9 }}>{card.faction.name}</p>
          )}
          <p style={{ fontSize: '10px', color: rarityColor, marginTop: '1px', opacity: 0.8 }}>{card.rarity?.name}</p>

          {(card.attack != null || card.health != null) && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {card.attack != null && (
                <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700 }}>⚔ {card.attack}</span>
              )}
              {card.health != null && (
                <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700 }}>♥ {card.health}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
