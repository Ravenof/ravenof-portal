'use client'

// ── Topas — tikri žaidėjai + botai (botai NEžymimi, nebent admin). ───────────
import { useEffect, useMemo, useState } from 'react'
import { getLeaderboard } from '@/lib/ranked/client'
import type { LeaderboardRow } from '@/lib/ranked/types'
import { MEDAL_LABEL_LT } from '@/lib/ranked/rank'
import { useT } from '@/lib/i18n/react'

type Filter = 'top100' | 'around' | string // faction name

export function Leaderboard({ revealBots = false }: { revealBots?: boolean }) {
  const t = useT()
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [filter, setFilter] = useState<Filter>('top100')

  useEffect(() => { getLeaderboard(150, 0).then(setRows) }, [])

  const factions = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows ?? []) if (r.main_faction) set.add(r.main_faction)
    return Array.from(set).sort()
  }, [rows])

  const view = useMemo(() => {
    if (!rows) return []
    if (filter === 'around') {
      const meIdx = rows.findIndex((r) => r.is_me)
      if (meIdx < 0) return rows.slice(0, 20)
      return rows.slice(Math.max(0, meIdx - 5), meIdx + 6)
    }
    if (filter === 'top100') return rows.slice(0, 100)
    return rows.filter((r) => r.main_faction === filter)
  }, [rows, filter])

  const chip = (active: boolean) => ({
    background: active ? 'rgba(239,68,68,0.22)' : 'rgba(10,8,16,0.7)',
    border: '1px solid ' + (active ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.08)'),
    color: active ? '#fca5a5' : 'var(--text-muted)',
  })

  const medalColor = (t: LeaderboardRow['medal_tier']) => t === 'gold' ? 'var(--gold)' : t === 'silver' ? '#cbd5e1' : '#d9a06b'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilter('top100')} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={chip(filter === 'top100')}>Top 100</button>
        <button onClick={() => setFilter('around')} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={chip(filter === 'around')}>Aplink mane</button>
        {factions.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={chip(filter === f)}>{f}</button>
        ))}
      </div>

      {rows === null ? (
        <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
      ) : view.length === 0 ? (
        <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>{t('ranked.leaderboardEmpty')}</p>
      ) : (
        <div className="space-y-1.5">
          {view.map((r) => (
            <div key={`${r.is_bot}-${r.entity_id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: r.is_me ? 'linear-gradient(90deg, rgba(240,180,41,0.16), rgba(10,8,16,0.7))' : 'rgba(10,8,16,0.55)',
                border: '1px solid ' + (r.is_me ? 'rgba(240,180,41,0.5)' : 'rgba(255,255,255,0.06)'),
              }}>
              <span className="w-7 text-center text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: r.position <= 3 ? 'var(--gold)' : 'var(--text-muted)' }}>{r.position}</span>
              <span className="text-lg w-6 text-center">{r.avatar && r.avatar.length <= 4 ? r.avatar : '🎴'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: r.is_me ? 'var(--gold)' : 'var(--text-primary)' }}>
                  {r.name}
                  {revealBots && r.is_bot && <span className="ml-1 text-[9px] px-1 rounded" style={{ background: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>BOT</span>}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{r.main_faction ?? '—'} · {r.wins}P / {r.losses}Pr · serija {r.win_streak}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: medalColor(r.medal_tier) }}>
                  {r.rank_number} {MEDAL_LABEL_LT[r.medal_tier]}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>K/D {r.kd_ratio.toFixed(2)} · {Math.round(r.win_rate * 100)}%</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
