'use client'

import { AlertTriangle, XCircle } from 'lucide-react'
import type { ValidationWarning } from '@/lib/deck-validation'

type Props = { warnings: ValidationWarning[] }

export function DeckValidationWarnings({ warnings }: Props) {
  if (warnings.length === 0) return null

  return (
    <div className="space-y-1">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
          style={{
            background: w.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${w.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
            color: w.type === 'error' ? '#f87171' : '#fbbf24',
          }}
        >
          {w.type === 'error'
            ? <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            : <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          }
          {w.message}
        </div>
      ))}
    </div>
  )
}
