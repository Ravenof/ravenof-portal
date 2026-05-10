'use client'

type Props = {
  sideIdx: 0 | 1
  onHpChange: (sideIdx: 0 | 1, delta: number) => void
}

const DAMAGE: readonly number[] = [-10, -5, -1]
const HEAL: readonly number[] = [1, 5, 10]

export function HPControls({ sideIdx, onHpChange }: Props) {
  return (
    <div className="w-full space-y-2">
      <div className="flex gap-2">
        {DAMAGE.map((v) => (
          <button
            key={v}
            onClick={() => onHpChange(sideIdx, v)}
            className="flex-1 py-3 rounded-xl text-base font-bold transition-all active:scale-95"
            style={{
              background: 'rgba(239,68,68,0.15)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.35)',
            }}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {HEAL.map((v) => (
          <button
            key={v}
            onClick={() => onHpChange(sideIdx, v)}
            className="flex-1 py-3 rounded-xl text-base font-bold transition-all active:scale-95"
            style={{
              background: 'rgba(34,197,94,0.15)',
              color: '#4ade80',
              border: '1px solid rgba(34,197,94,0.35)',
            }}
          >
            +{v}
          </button>
        ))}
      </div>
    </div>
  )
}
