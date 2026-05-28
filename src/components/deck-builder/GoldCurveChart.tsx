'use client'

import type { DeckEntry } from '@/types'

const GOLD_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
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
  const buckets: Record<number, number> = {}
  for (const step of GOLD_STEPS) buckets[step] = 0

  for (const entry of entries) {
    const g = entry.card.gold_cost ?? 0
    const bucket = Math.min(1000, Math.ceil(g / 100) * 100) || 100
    buckets[bucket] = (buckets[bucket] ?? 0) + entry.quantity
  }

  const max = Math.max(1, ...Object.values(buckets))
  const totalCards = Object.values(buckets).reduce((s, v) => s + v, 0)

  const bars: BarData[] = GOLD_STEPS.map((step) => {
    const cnt = buckets[step] ?? 0
    const isActive = cnt > 0
    const barH = cnt === 0 ? 3 : Math.max(8, (cnt / max) * BAR_MAX_H)
    const suffix = cnt === 1 ? 'korta' : 'kortų'
    return {
      step,
      cnt,
      barH,
      isActive,
      label: step + ': ' + cnt + ' ' + suffix,
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
            {totalCards} kortų
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
        {GOLD_STEPS.map((step) => (
          <div
            key={step}
            className="flex-1 text-center"
            style={{ fontSize: '8px', color: 'var(--text-muted)', opacity: 0.7 }}
          >
            {step === 1000 ? '1k' : step / 100}
          </div>
        ))}
      </div>
    </div>
  )
}
