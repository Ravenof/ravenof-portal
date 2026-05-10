import type { UserBadge } from '@/types'

type Props = {
  userBadge: UserBadge
}

export function BadgeItem({ userBadge }: Props) {
  const { badge, earned_at } = userBadge
  const earnedDate = new Date(earned_at).toLocaleDateString('lt-LT', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <div
      className="group relative flex flex-col items-center gap-1.5 p-3 rounded-lg cursor-default"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--bg-border)',
        transition: 'border-color 0.2s',
      }}
      title={`${badge.title} – ${badge.description ?? ''}\nGauta: ${earnedDate}`}
    >
      <span className="text-2xl leading-none">{badge.icon ?? '🏅'}</span>
      <p
        className="text-xs text-center leading-tight font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {badge.title}
      </p>
    </div>
  )
}
