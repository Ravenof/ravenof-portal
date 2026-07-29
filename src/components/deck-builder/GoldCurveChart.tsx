'use client'

import type { DeckEntry } from '@/types'
import { pluralLt } from '@/lib/lt-plural'
import { costCurve, COST_CURVE_LABELS } from '@/lib/cards/cost'

const BAR_MAX_H = 72

type Props = { entries: DeckEntry[] }

type BarData = {
  step: number
  cnt: number
  barH: number
  isActive: boolean
  label: string
  countColor: string
  barBg: string
  barOpacity: number
}

export function GoldCurveChart({ entries }: Props) {
  // KANONINĖ kainos kreivė — bendras helperis su /digital builder'iu ir drawer'iu
  // (žr. src/lib/cards/cost.ts). DB gold_cost šimtais → 1..8+ stulpeliai.
  const curve = costCurve(entries.map((e) => ({ gold: e.card.gold_cost, qty: e.quantity })))

  const max = Math.max(1, ...curve)
  const totalCards = curve.reduce((s, v) => s + v, 0)

  const bars: BarData[] = curve.map((cnt, i) => {
    const isActive = cnt > 0
    const barH = cnt === 0 ? 3 : Math.max(8, (cnt / max) * BAR_MAX_H)
    const suffix = pluralLt(cnt, ['korta', 'kortos', 'kortų'])
    return {
      step: i,
      cnt,
      barH,
      isActive,
      label: COST_CURVE_LABELS[i] + ': ' + cnt + ' ' + suffix,
      countColor: isActive ? 'var(--gold)' : 'transparent',
      barBg: isActive ? 'var(--gold)' : 'var(--bg-elevated)',
      barOpacity: isActive ? 0.85 : 0.4,
    }
  })

  const containerH = BAR_MAX_H + 16

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Aukso kreivė
        </p>
        {totalCards > 0 && (
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            {totalCards} {pluralLt(totalCards, ['korta', 'kortos', 'kortų'])}
          </span>
        )}
      </div>

      <div className="flex items-end gap-0.5" style={{ height: containerH + 'px' }}>
        {bars.map((bar) => (
          <div
            key={bar.step}
            className="flex-1 flex flex-col items-center justify-end"
            style={{ height: '100%' }}
            title={bar.label}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: bar.countColor,
                lineHeight: '14px',
                minHeight: '14px',
                display: 'block',
                textAlign: 'center',
                width: '100%',
              }}
            >
              {bar.isActive ? bar.cnt : ''}
            </span>
            <div
              className="w-full rounded-t transition-all duration-300"
              style={{
                height: bar.barH + 'px',
                background: bar.barBg,
                opacity: bar.barOpacity,
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-0.5 mt-1">
        {COST_CURVE_LABELS.map((label) => (
          <div
            key={label}
            className="flex-1 text-center"
            style={{ fontSize: '8px', color: 'var(--text-muted)', opacity: 0.7 }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
