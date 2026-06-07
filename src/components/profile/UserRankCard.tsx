import { getLevelProgress } from '@/lib/gamification/levels'
import type { Profile } from '@/types'

type Props = {
  profile: Profile
}

export function UserRankCard({ profile }: Props) {
  const progress = getLevelProgress(profile.xp_total)
  const { icon, color, name: groupName } = progress.rankGroup

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${color}44`,
        boxShadow: `0 0 12px ${color}22`,
      }}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color }}>
          {progress.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Lygis {profile.level} · {groupName} · {profile.xp_total.toLocaleString('lt-LT')} XP
        </p>
      </div>
      {progress.isMaxLevel && (
        <span
          className="text-xs font-bold flex-shrink-0 px-2 py-0.5 rounded-full"
          style={{ background: color + '22', color, border: `1px solid ${color}44` }}
        >
          MAX
        </span>
      )}
    </div>
  )
}
