'use client'

import { getRarityColor, getFactionColor } from '@/lib/utils'
import { Sword, Heart, Coins } from 'lucide-react'
import type { DeckCardWithCard } from '@/types'

const TYPE_ORDER = ['Champion', 'Unit', 'Spell', 'Structure', 'Token']

function getTypeOrder(name: string | undefined) {
  const idx = TYPE_ORDER.indexOf(name ?? '')
  return idx >= 0 ? idx : TYPE_ORDER.length
}

type Props = { cards: DeckCardWithCard[] }

export function ReadOnlyDeckList({ cards }: Props) {
  const total = cards.reduce((s, c) => s + c.quantity, 0)

  // Group by type
  const groupMap: Record<string, DeckCardWithCard[]> = {}
  for (const dc of cards) {
    const type = dc.card.card_type?.name ?? 'Kita'
    if (!groupMap[type]) groupMap[type] = []
    groupMap[type].push(dc)
  }

  // Sort within groups
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
              <span
                className="uppercase tracking-wider font-semibold"
                style={{ fontSize: '10px', color: 'var(--text-muted)' }}
              >
                {type}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{groupTotal}</span>
            </div>
            <div className="space-y-0.5">
              {group.map((dc) => {
                const rarityColor  = getRarityColor(dc.card.rarity?.name)
                const factionColor = getFactionColor(dc.card.faction?.color_hex)
                const isUnit  = dc.card.card_type?.name === 'Unit' || dc.card.card_type?.name === 'Champion'
                return (
                  <div
                    key={dc.card.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{ background: 'var(--bg-elevated)' }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rarityColor }} />

                    {dc.quantity > 1 && (
                      <span
                        className="text-xs font-bold tabular-nums w-4 text-center"
                        style={{ color: 'var(--gold)' }}
                      >
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
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: factionColor }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
