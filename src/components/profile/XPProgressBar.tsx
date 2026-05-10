import type { RankRule } from '@/types'

type Props = {
  xp: number
  level: number
  currentRank: RankRule | null
  nextRank: RankRule | null
}

export function XPProgressBar({ xp, level, currentRank, nextRank }: Props) {
  const fromXp = currentRank?.min_xp ?? 0
  const toXp = nextRank?.min_xp ?? null
  const color = currentRank?.color_hex ?? '#6b7280'

  let pct = 100
  let label = 'Max lygis pasiektas'

  if (toXp !== null) {
    const range = toXp - fromXp
    const progress = xp - fromXp
    pct = Math.min(100, Math.max(0, Math.round((progress / range) * 100)))
    const remaining = toXp - xp
    label = `${remaining.toLocaleString()} XP iki ${nextRank?.title ?? 'kito rango'}`
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Lygis {level}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 6px ${color}66`,
          }}
        />
      </div>
    </div>
  )
}
