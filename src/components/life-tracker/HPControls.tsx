'use client'

import { LTButton } from './LTButton'

type Props = {
  sideIdx: 0 | 1
  onHpChange: (sideIdx: 0 | 1, delta: number) => void
}

const DAMAGE: readonly number[] = [-10, -5, -1]
const HEAL: readonly number[] = [1, 5, 10]

export function HPControls({ sideIdx, onHpChange }: Props) {
  return (
    <div className="w-full space-y-2">
      <div className="flex gap-1.5">
        {DAMAGE.map((v) => (
          <LTButton
            key={v}
            variant="damage"
            size="sm"
            style={{ flex: 1 }}
            onClick={() => onHpChange(sideIdx, v)}
            aria-label={`${v} HP`}
          >
            {v}
          </LTButton>
        ))}
      </div>
      <div className="flex gap-1.5">
        {HEAL.map((v) => (
          <LTButton
            key={v}
            variant="heal"
            size="sm"
            style={{ flex: 1 }}
            onClick={() => onHpChange(sideIdx, v)}
            aria-label={`+${v} HP`}
          >
            +{v}
          </LTButton>
        ))}
      </div>
    </div>
  )
}
