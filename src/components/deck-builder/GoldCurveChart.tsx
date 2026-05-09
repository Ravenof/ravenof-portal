'use client'

import type { DeckEntry } from '@/types'

const GOLD_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

type Props = { entries: DeckEntry[] }

export function GoldCurveChart({ entries }: Props) {
  // Bucket cards by gold cost
  const buckets: Record<number, number> = {}
  for (const step of GOLD_STEPS) buckets[step] = 0

  for (const entry of entries) {
    const g = entry.card.gold_cost ?? 0
    // Bucket: round up to nearest 100, cap at 1000
    const bucket = Math.min(1000, Math.ceil(g / 100) * 100) || 100
    if (bucket in buckets) buckets[bucket] += entry.quantity
    else buckets[1000] += entry.quantity
  }

  const max = Math.max(1, ...Object.values(buckets))

  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
        Aukso kreivė
      </p>
      <div className="flex items-end gap-1 h-16">
        {GOLD_STEPS.map((step) => {
          const cnt = buckets[step] ?? 0
          const h = cnt === 0 ? 2 : Math.max(4, (cnt / max) * 60)
          return (
            <div key={step} className="flex-1 flex flex-col items-center gap-0.5" title={`${step}⚜: ${cnt}`}>
              <span className="text-xs tabular-nums" style={{ color: cnt > 0 ? 'var(--gold)' : 'transparent', fontSize: '9px' }}>
                {cnt > 0 ? cnt : ''}
              </span>
              <div
                className="w-full rounded-t transition-all duration-300"
                style={{
                  height: `${h}px`,
                  background: cnt > 0 ? 'var(--gold)' : 'var(--bg-elevated)',
                  opacity: cnt > 0 ? 0.85 : 1,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {GOLD_STEPS.map((step) => (
          <div key={step} className="flex-1 text-center" style={{ fontSize: '8px', color: 'var(--text-muted)' }}>
            {step === 1000 ? '1k' : step / 100}
          </div>
        ))}
      </div>
    </div>
  )
}
