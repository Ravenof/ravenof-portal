'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getRarityColor, getFactionColor } from '@/lib/utils'
import { Sword, Heart, Coins, X } from 'lucide-react'
import type { DeckCardWithCard, CardWithRelations } from '@/types'

const TYPE_ORDER = ['Champion', 'Unit', 'Spell', 'Structure', 'Token']

function getTypeOrder(name: string | undefined) {
  const idx = TYPE_ORDER.indexOf(name ?? '')
  return idx >= 0 ? idx : TYPE_ORDER.length
}

// Card preview modal

function CardPreviewModal({ card, onClose }: { card: CardWithRelations; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const rarityColor  = getRarityColor(card.rarity?.name)
  const factionColor = getFactionColor(card.faction?.color_hex)

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '2px solid ' + rarityColor, maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>

        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.name}
            style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '140px',
            background: 'linear-gradient(160deg, ' + factionColor + '22 0%, #0a0a1a 60%, ' + rarityColor + '18 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '52px', opacity: 0.35,
          }}>
            &#9876;
          </div>
        )}

        <div className="p-4 overflow-y-auto" style={{ maxHeight: '320px' }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-base font-bold leading-tight" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>
              {card.name}
            </h3>
            {card.gold_cost != null && (
              <span className="flex-shrink-0 flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--gold)', border: '1px solid rgba(245,158,11,0.4)' }}>
                <Coins className="w-3.5 h-3.5" />{card.gold_cost}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {card.faction && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: factionColor + '25', color: factionColor, border: '1px solid ' + factionColor + '40' }}>
                {card.faction.name}
              </span>
            )}
            {card.card_type && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                {card.card_type.name}
              </span>
            )}
            {card.rarity && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: rarityColor + '22', color: rarityColor }}>
                {card.rarity.name}
              </span>
            )}
          </div>

          {(card.attack != null || card.health != null) && (
            <div className="flex gap-4 mb-3">
              {card.attack != null && (
                <span className="flex items-center gap-1 text-sm font-bold text-red-400">
                  <Sword className="w-4 h-4" />{card.attack}
                </span>
              )}
              {card.health != null && (
                <span className="flex items-center gap-1 text-sm font-bold text-green-400">
                  <Heart className="w-4 h-4" />{card.health}
                </span>
              )}
            </div>
          )}

          {card.effect_text && (
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {card.effect_text}
            </p>
          )}

          {card.description && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {card.description}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Main component

type Props = { cards: DeckCardWithCard[] }

export function ReadOnlyDeckList({ cards }: Props) {
  const [previewCard, setPreviewCard] = useState<CardWithRelations | null>(null)
  const total = cards.reduce((s, c) => s + c.quantity, 0)

  const groupMap: Record<string, DeckCardWithCard[]> = {}
  for (const dc of cards) {
    const type = dc.card.card_type?.name ?? 'Kita'
    if (!groupMap[type]) groupMap[type] = []
    groupMap[type].push(dc)
  }

  for (const type in groupMap) {
    groupMap[type].sort((a, b) => {
      const gA = a.card.gold_cost ?? 0
      const gB = b.card.gold_cost ?? 0
      if (gA !== gB) return gA - gB
      return a.card.name.localeCompare(b.card.name)
    })
  }

  const groupKeys = Object.keys(groupMap).sort(
    (a, b) => getTypeOrder(a) - getTypeOrder(b)
  )

  return (
    <div className="space-y-4">
      {previewCard && (
        <CardPreviewModal card={previewCard} onClose={() => setPreviewCard(null)} />
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
          Kortų sąrašas
        </p>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} kortų</span>
      </div>

      {groupKeys.map((type) => {
        const group = groupMap[type]
        const groupTotal = group.reduce((s, c) => s + c.quantity, 0)
        return (
          <div key={type}>
            <div
              className="flex items-center justify-between px-1 mb-1"
              style={{ borderBottom: '1px solid var(--bg-border)', paddingBottom: '3px' }}
            >
              <span className="uppercase tracking-wider font-semibold" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {type}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{groupTotal}</span>
            </div>
            <div className="space-y-0.5">
              {group.map((dc) => {
                const rarityColor  = getRarityColor(dc.card.rarity?.name)
                const factionColor = getFactionColor(dc.card.faction?.color_hex)
                const isUnit = dc.card.card_type?.name === 'Unit' || dc.card.card_type?.name === 'Champion'
                return (
                  <button
                    key={dc.card.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors active:opacity-70"
                    style={{ background: 'var(--bg-elevated)', cursor: 'pointer' }}
                    onClick={() => setPreviewCard(dc.card)}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rarityColor }} />

                    {dc.quantity > 1 && (
                      <span className="text-xs font-bold tabular-nums w-4 text-center" style={{ color: 'var(--gold)' }}>
                        {dc.quantity}x
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {dc.card.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isUnit && dc.card.attack !== null && (
                        <span className="flex items-center gap-0.5 text-xs font-bold text-red-400">
                          <Sword className="w-2.5 h-2.5" />{dc.card.attack}
                        </span>
                      )}
                      {isUnit && dc.card.health !== null && (
                        <span className="flex items-center gap-0.5 text-xs font-bold text-green-400">
                          <Heart className="w-2.5 h-2.5" />{dc.card.health}
                        </span>
                      )}
                      {dc.card.gold_cost !== null && (
                        <span
                          className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--gold)' }}
                        >
                          <Coins className="w-2.5 h-2.5" />{dc.card.gold_cost}
                        </span>
                      )}
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: factionColor }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
