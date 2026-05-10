import Link from 'next/link'

export type LeaderboardRow = {
  rank: number
  username: string
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
      {/* Podium — top 3 */}
      {rows.length >= 1 && (
        <div className="flex gap-2 p-4" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--bg-border)' }}>
          {rows.slice(0, 3).map((row) => (
            <Link
              key={row.username}
              href={`/users/${row.username}`}
              className="flex-1 text-center rounded-xl py-4 px-2 transition hover:opacity-80"
              style={{
                background: row.rank === 1 ? 'rgba(212,175,55,0.12)' : row.rank === 2 ? 'rgba(192,192,192,0.1)' : 'rgba(180,100,30,0.1)',
                border: '1px solid ' + (row.rank === 1 ? 'rgba(212,175,55,0.4)' : 'var(--bg-border)'),
              }}
            >
              <div className="text-2xl mb-1">{MEDALS[row.rank - 1]}</div>
              <div className="text-xs font-bold truncate" style={{ color: row.rank === 1 ? 'var(--gold)' : 'var(--text-primary)' }}>
                {row.username}
              </div>
              <div className="text-sm font-bold mt-1" style={{ color: 'var(--gold)' }}>{row.primary}</div>
              {row.secondary != null && (
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{row.secondary}</div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Rest of the table */}
      {rows.length > 3 && (
        <div>
          <div className="flex px-4 py-2 text-xs font-semibold uppercase tracking-wider"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', borderBottom: '1px solid var(--bg-border)' }}>
            <span className="w-8">#</span>
            <span className="flex-1">Žaidėjas</span>
            <span className="w-24 text-right">{primaryLabel}</span>
            {secondaryLabel && <span className="w-24 text-right">{secondaryLabel}</span>}
          </div>
          {rows.slice(3).map((row) => (
            <div key={row.username} className="flex items-center px-4 py-2.5 border-b last:border-b-0"
              style={{ borderColor: 'var(--bg-border)', background: 'var(--bg-surface)' }}>
              <span className="w-8 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{row.rank}</span>
              <span className="flex-1">
                <Link href={`/users/${row.username}`} className="text-sm font-medium hover:underline"
                  style={{ color: 'var(--text-primary)' }}>
                  {row.username}
                </Link>
                {row.badge && <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>{row.badge}</span>}
              </span>
              <span className="w-24 text-right text-sm font-semibold" style={{ color: 'var(--gold)' }}>{row.primary}</span>
              {secondaryLabel && (
                <span className="w-24 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
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
