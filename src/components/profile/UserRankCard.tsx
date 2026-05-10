import type { Profile, RankRule } from '@/types'

type Props = {
  profile: Profile
  rankRule: RankRule | null
}

export function UserRankCard({ profile, rankRule }: Props) {
  const icon = rankRule?.icon ?? '🌱'
  const color = rankRule?.color_hex ?? '#6b7280'
  const title = rankRule?.title ?? 'Naujas Keliautojas'

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
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
          {title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Lygis {profile.level} · {profile.xp_total.toLocaleString()} XP
        </p>
      </div>
    </div>
  )
}
