'use client'

// ── Reitingo kovos rezultato ekranas (po kovos). ─────────────────────────────
import { useEffect } from 'react'
import { RankBadge } from './RankBadge'
import { RButton } from './_ui'
import { formatRank, isMaxRank } from '@/lib/ranked/rank'
import { MILESTONE_BY_KEY } from '@/lib/ranked/rewards'
import { ACHIEVEMENT_BY_KEY } from '@/lib/ranked/achievements'
import type { MatchReportResult, PlayerMatchStats } from '@/lib/ranked/types'
import { playRanked } from '@/lib/ranked/sound'
import { useT } from '@/lib/i18n/react'

export function RankedResult({ result, opponentName, stats, onAgain, onHome, onLeaderboard, onRewards }: {
  result: MatchReportResult & { won: boolean }
  opponentName: string
  stats: PlayerMatchStats
  onAgain: () => void
  onHome: () => void
  onLeaderboard: () => void
  onRewards: () => void
}) {
  const t = useT()
  const won = result.won
  useEffect(() => {
    playRanked(won ? 'ranked_win' : 'ranked_loss')
    if (result.rankChange === 'up') setTimeout(() => playRanked('ranked_rank_up'), 600)
    if (result.rankChange === 'down') setTimeout(() => playRanked('ranked_rank_down'), 600)
  }, [won, result.rankChange])

  const lossWarn = !won && result.lossCounterAfter === 1 && result.rankChange === 'same'
  const stat = (label: string, value: number | string) => (
    <div className="flex justify-between text-[11px] px-1 py-0.5"><span style={{ color: 'var(--text-muted)' }}>{label}</span><span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{value}</span></div>
  )

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(4,3,8,0.95)' }}>
      <div className="relative w-[min(460px,96vw)] my-6" style={{ borderRadius: 20, background: won ? 'rgba(240,180,41,0.4)' : 'rgba(239,68,68,0.32)', padding: 2 }}>
        <div className="px-5 py-7" style={{ borderRadius: 19, background: `radial-gradient(120% 80% at 50% 0%, rgba(${won ? '240,180,41' : '239,68,68'},0.16), rgba(10,8,16,0.98) 60%), linear-gradient(160deg,#15101f,#0a0810)` }}>
          <p className="text-5xl text-center mb-1">{won ? '🏆' : '💀'}</p>
          <h2 className="text-2xl font-bold text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: won ? 'var(--gold)' : '#f87171', letterSpacing: '0.06em' }}>{won ? t('ranked.result.win') : t('ranked.result.loss')}</h2>
          <p className="text-center text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>{t('ranked.result.vs', { name: opponentName })}</p>

          {/* Rango judėjimas */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <RankBadge step={result.rankStepBefore} size={56} />
            <span className="text-xl" style={{ color: result.rankChange === 'up' ? '#86efac' : result.rankChange === 'down' ? '#f87171' : 'var(--text-muted)' }}>
              {result.rankChange === 'up' ? '→' : result.rankChange === 'down' ? '→' : '='}
            </span>
            <RankBadge step={result.rankStepAfter} size={64} animate={result.rankChange === 'up' ? 'up' : result.rankChange === 'down' ? 'down' : null} />
          </div>
          <p className="text-center text-xs font-semibold mb-1" style={{ color: result.rankChange === 'up' ? '#86efac' : result.rankChange === 'down' ? '#f87171' : 'var(--text-muted)' }}>
            {result.rankChange === 'up' ? t('ranked.result.rankUpTo', { rank: formatRank(result.rankStepAfter) }) : result.rankChange === 'down' ? t('ranked.result.rankDownTo', { rank: formatRank(result.rankStepAfter) }) : t('ranked.result.noChange')}
          </p>
          {isMaxRank(result.rankStepAfter) && won && <p className="text-center text-[11px] mb-2" style={{ color: 'var(--gold)' }}>{t('ranked.result.maxReached')}</p>}
          {lossWarn && <p className="text-center text-[11px] mb-2" style={{ color: '#fbbf24' }}>{t('ranked.result.lossToDemotion')}</p>}

          {/* Atlygis */}
          {(result.expGained > 0 || result.goldGained > 0) && (
            <div className="flex items-center justify-center gap-3 my-3">
              {result.expGained > 0 && <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.5)', color: '#c4b5fd' }}>+{result.expGained} EXP</span>}
              {result.goldGained > 0 && <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(240,180,41,0.18)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>+{result.goldGained} 🪙</span>}
            </div>
          )}

          {/* Atrakinta */}
          {result.unlockedRewardKeys.length > 0 && (
            <p className="text-center text-[11px] mb-1" style={{ color: 'var(--gold)' }}>{t('ranked.result.unlockedRewards')} {result.unlockedRewardKeys.map((k) => MILESTONE_BY_KEY.get(k)?.title ?? k).join(', ')}</p>
          )}
          {result.completedAchievementKeys.length > 0 && (
            <p className="text-center text-[11px] mb-2" style={{ color: '#86efac' }}>{t('ranked.result.achievements')} {result.completedAchievementKeys.map((k) => ACHIEVEMENT_BY_KEY.get(k)?.name ?? k).join(', ')}</p>
          )}

          {/* Statistika */}
          <div className="rounded-lg px-3 py-2 my-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {stat(t('ranked.result.killsLost'), `${stats.totalKills} / ${stats.totalDeaths}`)}
            {stat(t('ranked.result.dmgDealt'), stats.damageDealtToEnemyPlayer)}
            {stat(t('ranked.result.dmgTaken'), stats.damageTaken)}
            {stat(t('ranked.result.spellsPlayed'), stats.spellsPlayed)}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <RButton onClick={onAgain} tone="gold">{t('ranked.result.playAgain')}</RButton>
            <RButton onClick={onHome} tone="muted">{t('ranked.result.backToRanked')}</RButton>
            <RButton onClick={onLeaderboard} tone="accent">{t('ranked.result.viewTop')}</RButton>
            <RButton onClick={onRewards} tone="accent">{t('ranked.result.rewards')}</RButton>
          </div>
        </div>
      </div>
    </div>
  )
}
