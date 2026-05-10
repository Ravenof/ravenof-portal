'use client'

import type { LogEntry } from '@/types/life-tracker'

type Props = {
  log: LogEntry[]
}

function formatEntry(e: LogEntry): string {
  const sign = e.change > 0 ? '+' : ''
  return `Round ${e.round} — ${e.targetName} ${sign}${e.change} HP: ${e.prevHp} → ${e.newHp}`
}

export function ActionLog({ log }: Props) {
  if (log.length === 0) return null

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
    >
      <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--bg-border)' }}>
        <h3
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
        >
          Action Log
        </h3>
      </div>
      <div>
        {log.map((entry) => (
          <div
            key={entry.id}
            className="px-4 py-2 flex items-center gap-2 border-b last:border-b-0"
            style={{ borderColor: 'var(--bg-border)' }}
          >
            <span
              className="flex-shrink-0 text-xs font-bold"
              style={{ color: entry.actionType === 'damage' ? '#f87171' : '#4ade80' }}
            >
              {entry.actionType === 'damage' ? '▼' : '▲'}
            </span>
            <span
              className="text-xs"
              style={{ color: entry.actionType === 'damage' ? '#fca5a5' : '#86efac' }}
            >
              {formatEntry(entry)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
