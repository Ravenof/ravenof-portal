import Link from 'next/link'
import Image from 'next/image'

export type LeaderboardRow = {
  rank: number
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  primary: string | number
  secondary?: string | number | null
  badge?: string | null
}

type Props = {
  rows: LeaderboardRow[]
  primaryLabel: string
  secondaryLabel?: string
}

const MEDALS = ['🥇', '🥈', '🥉']
const PODIUM_BG = [
  'rgba(212,175,55,0.12)',
  'rgba(192,192,192,0.08)',
  'rgba(180,100,30,0.08)',
]
const PODIUM_BORDER = [
  'rgba(212,175,55,0.4)',
  'rgba(192,192,192,0.3)',
  'rgba(180,100,30,0.3)',
]

function Avatar({ avatarUrl, name, size = 40 }: { avatarUrl?: string | null; name: string; size?: number }) {
  const initials = (name ?? '?').slice(0, 2).toUpperCase()
  return (
    <span
      className="relative flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg,#1e1b4b,#2d1b69)',
        border: '2px solid rgba(124,58,237,0.4)',
      }}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={name} fill sizes={`${size}px`} className="object-cover rounded-full" unoptimized />
      ) : (
        <span
          className="font-bold leading-none select-none"
          style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', fontSize: size > 36 ? '13px' : '10px' }}
        >
          {initials}
        </span>
      )}
    </span>
  )
}

export function LeaderboardTable({ rows, primaryLabel, secondaryLabel }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-center py-16 opacity-50" style={{ color: 'var(--text-muted)' }}>
        Nėra duomenų
      </p>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>

      {/* Podium - top 3 */}
      <div className="flex gap-2 p-4" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--bg-border)' }}>
        {rows.slice(0, 3).map((row, i) => (
          <Link
            key={row.username}
            href={`/users/${row.username}`}
            className="flex-1 text-center rounded-xl py-4 px-2 transition hover:opacity-80 flex flex-col items-center gap-2"
            style={{ background: PODIUM_BG[i], border: '1px solid ' + PODIUM_BORDER[i] }}
          >
            <div className="text-xl">{MEDALS[i]}</div>
            <Avatar avatarUrl={row.avatarUrl} name={row.displayName ?? row.username} size={48} />
            <div className="text-xs font-bold truncate w-full text-center px-1"
              style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-primary)' }}>
              {row.displayName ?? row.username}
            </div>
            <div className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{row.primary}</div>
            {row.secondary != null && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.secondary}</div>
            )}
            {row.badge && (
              <div className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(240,180,41,0.12)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                {row.badge}
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Rest of the table */}
      {rows.length > 3 && (
        <div>
          <div className="flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wider"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', borderBottom: '1px solid var(--bg-border)' }}>
            <span className="w-8">#</span>
            <span className="flex-1">Žaidėjas</span>
            <span className="w-24 text-right">{primaryLabel}</span>
            {secondaryLabel && <span className="w-20 text-right">{secondaryLabel}</span>}
          </div>
          {rows.slice(3).map((row) => (
            <div key={row.username} className="flex items-center px-4 py-2 border-b last:border-b-0"
              style={{ borderColor: 'var(--bg-border)', background: 'var(--bg-surface)' }}>
              <span className="w-8 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{row.rank}</span>
              <span className="flex-1 flex items-center gap-2.5 min-w-0">
                <Avatar avatarUrl={row.avatarUrl} name={row.displayName ?? row.username} size={28} />
                <span className="min-w-0">
                  <Link href={`/users/${row.username}`} className="text-sm font-medium hover:underline truncate block"
                    style={{ color: 'var(--text-primary)' }}>
                    {row.displayName ?? row.username}
                  </Link>
                  {row.badge && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.badge}</span>
                  )}
                </span>
              </span>
              <span className="w-24 text-right text-sm font-semibold" style={{ color: 'var(--gold)' }}>{row.primary}</span>
              {secondaryLabel && (
                <span className="w-20 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                  {row.secondary ?? '—'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
