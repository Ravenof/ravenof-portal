'use client'

// ── Pasiekimo ženklas: 512×512 iliustracija BURGUNDINIAME šešiakampyje ──────
// Handoff (3 žingsnis): iliustracija dedama Į ESAMĄ burgundinį hex apvalkalą,
// `object-fit: contain`, alfa išsaugoma. DRAUDŽIAMA: antras medalionas, Ranked
// pakopos rėmas, iliustracijos maskavimas. Pavadinimas ir sąlyga – tekstu ŠALIA
// vaizdo (prieinamumui), ne paveiksle.
// 63–70 badge'ai dar negeneruoti → rodom neutralų burgundinį apvalkalą su ⧗.

import { achievementBadgeSrc } from '@/lib/profile/achievements'

const HEX = 'polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)'

export type AchievementBadgeProps = {
  code: string
  /** Neužbaigti pasiekimai rodomi pilkšvi (bet ne paslėpti). */
  completed?: boolean
  size?: number
  className?: string
}

export function AchievementBadge({ code, completed = true, size = 64, className }: AchievementBadgeProps) {
  const src = achievementBadgeSrc(code)
  return (
    <span className={className} aria-hidden style={{
      position: 'relative', width: size, height: size * 1.08, flex: '0 0 auto',
      clipPath: HEX, display: 'inline-block',
      background: 'linear-gradient(160deg,#a9455a 0%,#6E2633 45%,#4a1d27 100%)',
      filter: completed ? undefined : 'grayscale(0.85) brightness(0.62)',
    }}>
      <span style={{ position: 'absolute', inset: 1, clipPath: HEX, background: 'linear-gradient(180deg,#2a1620,#160b12)' }} />
      {src
        ? /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt="" loading="lazy" decoding="async" draggable={false}
            style={{ position: 'absolute', inset: '9%', width: '82%', height: '82%', objectFit: 'contain' }} />
        : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.34, color: '#C1566A' }}>⧗</span>}
    </span>
  )
}
