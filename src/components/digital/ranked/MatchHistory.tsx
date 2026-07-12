'use client'

// ── Kovų istorija — paskutinės 10 reitingo kovų su detaliomis statistikomis. ──
import { useEffect, useState } from 'react'
import { getRecentMatches } from '@/lib/ranked/client'
import type { RankedMatchRow } from '@/lib/ranked/types'
import { formatRank } from '@/lib/ranked/rank'
import { useT } from '@/lib/i18n/react'

const CHANGE_LABEL: Record<RankedMatchRow['rank_change'], { k: string; c: string }> = {
  up: { k: 'ranked.rankUp', c: '#86efac' },
  down: { k: 'ranked.rankDown', c: '#f87171' },
  same: { k: 'ranked.result.noChange', c: 'var(--text-muted)' },
}

export function MatchHistory() {
  const t = useT()
  const [rows, setRows] = useState<RankedMatchRow[] | null>(null)
  useEffect(() => { getRecentMatches(10).then(setRows) }, [])

  if (rows === null) return <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
  if (rows.length === 0) return <p className="text-center text-sm py-6" style={{ color: 'var(--text-muted)' }}>{t('ranked.historyEmpty')}</p>

  return (
    <div className="space-y-2">
      {rows.map((m) => {
        const win = m.result === 'win'
        const ch = CHANGE_LABEL[m.rank_change]
        const s = m.player_stats ?? {}
        return (
          <div key={m.id} className="px-3 py-2.5 rounded-lg" style={{ background: 'rgba(10,8,16,0.55)', borderLeft: `3px solid ${win ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'}`, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: win ? '#86efac' : '#f87171', fontFamily: 'var(--rvn-font-display)' }}>
                  {win ? t('ranked.result.win') : t('ranked.result.loss')} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs {m.opponent_name}</span>
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {m.player_faction ?? '—'} vs {m.opponent_faction ?? '—'} · {t('ranked.matchMeta', { turns: m.turns_played, min: Math.round((m.duration_seconds ?? 0) / 60) })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] font-semibold" style={{ color: ch.c }}>{t(ch.k)}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatRank(m.rank_step_before)} → {formatRank(m.rank_step_after)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span>☠ {s.totalKills ?? 0} / {s.totalDeaths ?? 0}</span>
              <span>🗡 {s.damageDealtToEnemyPlayer ?? 0}</span>
              <span>🛡 {s.damageTaken ?? 0}</span>
              {(m.exp_gained ?? 0) > 0 && <span style={{ color: '#a78bfa' }}>+{m.exp_gained} EXP</span>}
              {(m.gold_gained ?? 0) > 0 && <span style={{ color: 'var(--gold)' }}>+{m.gold_gained} 🪙</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
