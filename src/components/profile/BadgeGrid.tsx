import type { Badge, UserBadge } from '@/types'
import { BadgeItem } from './BadgeItem'

type Props = {
  allBadges: Badge[]
  earnedBadges: UserBadge[]
}

export function BadgeGrid({ allBadges, earnedBadges }: Props) {
  if (allBadges.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Dar nėra ženklelių.
      </p>
    )
  }

  // Build a lookup: badge_id -> UserBadge
  const earnedMap = new Map<string, UserBadge>()
  for (const ub of earnedBadges) {
    earnedMap.set(ub.badge_id, ub)
  }

  // Sort: earned first, then locked; within each group by sort_order
  const sorted = [...allBadges].sort((a, b) => {
    const aEarned = earnedMap.has(a.id) ? 0 : 1
    const bEarned = earnedMap.has(b.id) ? 0 : 1
    if (aEarned !== bEarned) return aEarned - bEarned
    return (a.sort_order ?? 99) - (b.sort_order ?? 99)
  })

  const earnedCount = earnedBadges.length

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {earnedCount} / {allBadges.length} ženklelių uždirbta
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {sorted.map((badge) => (
          <BadgeItem
            key={badge.id}
            badge={badge}
            userBadge={earnedMap.get(badge.id) ?? null}
          />
        ))}
      </div>
    </div>
  )
}
