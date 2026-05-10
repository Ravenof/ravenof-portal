import type { UserBadge } from '@/types'
import { BadgeItem } from './BadgeItem'

type Props = {
  badges: UserBadge[]
}

export function BadgeGrid({ badges }: Props) {
  if (badges.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Dar nėra ženklelių.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
      {badges.map((ub) => (
        <BadgeItem key={ub.id} userBadge={ub} />
      ))}
    </div>
  )
}
