'use client'

// ── Sezono istorija — praėjusių sezonų rezultatai. ───────────────────────────
import { useEffect, useState } from 'react'
import { getSeasonHistory, type SeasonHistoryRow } from '@/lib/ranked/client'
import { formatRank } from '@/lib/ranked/rank'
import { useT } from '@/lib/i18n/react'

export function SeasonHistory() {
  const t = useT()
  const [rows, setRows] = useState<SeasonHistoryRow[] | null>(null)
  useEffect(() => { getSeasonHistory().then(setRows) }, [])

  if (rows === null) return <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
  if (rows.length === 0) return <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>{t('ranked.noSeasons')}</p>

  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.season_id} className="px-3 py-3 rounded-lg" style={{ background: 'rgba(10,8,16,0.55)', border: '1px solid rgba(240,180,41,0.25)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{r.season_name}</p>
            {r.leaderboard_position != null && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(240,180,41,0.15)', color: 'var(--gold)' }}>#{r.leaderboard_position}</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            <span>{t('ranked.finalRank')} <b style={{ color: 'var(--text-primary)' }}>{formatRank(r.final_rank_step)}</b></span>
            <span>{t('ranked.bestRank')} <b style={{ color: 'var(--text-primary)' }}>{formatRank(r.best_rank_step)}</b></span>
            <span>{t('ranked.winsLabel')} <b style={{ color: '#86efac' }}>{r.wins}</b></span>
            <span>{t('ranked.lossesLabel')} <b style={{ color: '#f87171' }}>{r.losses}</b></span>
            <span>{t('ranked.winPct')} <b style={{ color: 'var(--text-primary)' }}>{Math.round((r.win_rate ?? 0) * 100)}%</b></span>
            <span>K/D: <b style={{ color: 'var(--text-primary)' }}>{Number(r.kd_ratio ?? 0).toFixed(2)}</b></span>
          </div>
          {r.rewards_earned?.length > 0 && <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Atsiimta atlygių: {r.rewards_earned.length}</p>}
        </div>
      ))}
    </div>
  )
}
