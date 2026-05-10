'use client'

import type { CardWithRelations } from '@/types'
import { getRarityColor, getFactionColor } from '@/lib/utils'

type Props = {
  card: CardWithRelations | null
}

export function CardHoverPreview({ card }: Props) {
  if (!card) return null

  const rarityColor = getRarityColor(card.rarity?.name)
  const factionColor = getFactionColor(card.faction?.color_hex)

  return (
    <div
      className="hidden lg:block"
      style={{
        position: 'fixed',
        top: '80px',
        right: '16px',
        zIndex: 60,
        width: '180px',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 0 16px ' + factionColor + '55)',
      }}
    >
      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '2px solid ' + rarityColor,
          background: 'var(--bg-elevated)',
          boxShadow: '0 0 24px ' + rarityColor + '44, inset 0 0 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* Image */}
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.name}
            style={{
              width: '100%',
              aspectRatio: '3/4',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '3/4',
              background: `linear-gradient(135deg, ${factionColor}22 0%, #0a0a1a 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '48px', opacity: 0.3 }}>⚔</span>
          </div>
        )}

        {/* Info bar */}
        <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.7)' }}>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'Cinzel, Georgia, serif',
              lineHeight: '1.2',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {card.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {card.card_type?.name ?? ''}
            </span>
            {card.gold_cost != null && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0a0a0f',
                  background: 'var(--gold)',
                  borderRadius: '6px',
                  padding: '1px 6px',
                  lineHeight: '1.4',
                }}
              >
                {card.gold_cost}⚜
              </span>
            )}
          </div>
          {card.faction && (
            <p style={{ fontSize: '10px', color: factionColor, marginTop: '2px', opacity: 0.9 }}>
              {card.faction.name}
            </p>
          )}
          {card.rarity && (
            <p style={{ fontSize: '10px', color: rarityColor, marginTop: '1px', opacity: 0.8 }}>
              {card.rarity.name}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
