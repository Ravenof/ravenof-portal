'use client'

// ── Reitingo kovos rezultatas — patvirtintas UI (Fazė 3, result-victory/defeat) ─
// Pergalė: aukso spinduliai + PERGALĖ + chip'ai + dešinėje SEZONO KELIAS rango
// pokytis (mažas → didelis herbas). Pralaimėjimas: raudonas radialas +
// „Reitingas nepakito · X" eilutė. Visi veiksmai (dar kartą / pradžia / TOP /
// atlygiai), statistika, milestone/achievement pranešimai ir garsai išlaikyti.
import { useEffect } from 'react'
import { RankBadge } from './RankBadge'
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
  const rankLine = result.rankChange === 'up'
    ? `${formatRank(result.rankStepBefore)} → ${formatRank(result.rankStepAfter)}`
    : result.rankChange === 'down'
      ? `${formatRank(result.rankStepBefore)} → ${formatRank(result.rankStepAfter)}`
      : `${t('ranked.result.noChange')} · ${formatRank(result.rankStepAfter)}`
  const rankColor = result.rankChange === 'up' ? 'var(--ravenof-text-primary)' : result.rankChange === 'down' ? '#c65563' : 'var(--ravenof-text-secondary)'

  const stat = (label: string, value: number | string) => (
    <div className="flex justify-between" style={{ font: '400 10.5px var(--ravenof-font-body)', padding: '2px 0' }}>
      <span style={{ color: 'var(--ravenof-text-secondary)' }}>{label}</span>
      <span style={{ color: 'var(--ravenof-text-primary)', fontWeight: 600 }}>{value}</span>
    </div>
  )

  return (
    <div className="ravenof-body fixed inset-0 z-[170] flex items-center justify-center p-4 overflow-hidden"
      style={{ background: won
        ? 'radial-gradient(120% 100% at 50% 45%, #14100a 0%, #07060A 70%)'
        : 'radial-gradient(120% 100% at 50% 40%, rgba(114,32,42,0.35) 0%, #0a0508 55%, #07060A 100%)' }}>
      {won && <div aria-hidden className="ravenof-rays" />}
      <div className="relative flex items-center w-[min(860px,96vw)]" style={{ gap: 24 }}>
        {/* ── KAIRĖ: rezultatas ── */}
        <div className="flex-1 min-w-0 text-center">
          <div className="ravenof-ornament" aria-hidden><i style={{ background: won ? 'var(--ravenof-gold-bright)' : '#B4444F' }} /></div>
          <p className="mt-2" style={{ font: '700 clamp(24px, 6vh, 30px) var(--ravenof-font-display)', letterSpacing: 5, textTransform: 'uppercase', color: won ? 'var(--ravenof-gold-bright)' : '#B4444F', textShadow: won ? '0 0 30px rgba(242,196,90,0.35)' : '0 0 26px rgba(180,68,79,0.4)', margin: 0 }}>
            {won ? t('ranked.result.win') : t('ranked.result.loss')}
          </p>
          <p style={{ font: '400 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: '4px 0 0' }}>{t('ranked.result.vs', { name: opponentName })}</p>
          {!won && <p style={{ font: 'italic 400 12px var(--ravenof-font-body)', color: '#c9a08f', margin: '6px 0 0' }}>{t('ranked.result.encourage')}</p>}

          {/* atlygio chip'ai */}
          {(result.expGained > 0 || result.goldGained > 0) && (
            <div className="flex items-center justify-center gap-2.5" style={{ marginTop: 14 }}>
              {result.goldGained > 0 && (
                <span className="flex items-center gap-1.5" style={{ background: '#15111C', border: '1px solid #3d3345', padding: '10px 16px', font: '700 13px var(--ravenof-font-body)', color: '#f3ead3' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/ravenof-ui/currencies/cur-silver.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                  +{result.goldGained}
                </span>
              )}
              {result.expGained > 0 && (
                <span className="flex items-center gap-1.5" style={{ background: '#15111C', border: '1px solid #3d3345', padding: '10px 16px', font: '700 13px var(--ravenof-font-body)', color: '#cfe0ff' }}>
                  <span style={{ font: '700 11px var(--ravenof-font-display)', color: '#c4b5fd' }}>XP</span> +{result.expGained}
                </span>
              )}
            </div>
          )}

          {/* rango eilutė (pralaimėjus / be pokyčio — kairėje, kaip ref) */}
          {(!won || result.rankChange === 'same') && (
            <p style={{ font: '400 12px var(--ravenof-font-body)', color: rankColor, margin: '10px 0 0' }}>{rankLine}</p>
          )}
          {isMaxRank(result.rankStepAfter) && won && <p style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-gold)', margin: '6px 0 0' }}>{t('ranked.result.maxReached')}</p>}
          {lossWarn && <p style={{ font: '400 11px var(--ravenof-font-body)', color: '#D4A33B', margin: '6px 0 0' }}>{t('ranked.result.lossToDemotion')}</p>}

          {/* atrakinta */}
          {result.unlockedRewardKeys.length > 0 && (
            <p style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-gold)', margin: '8px 0 0' }}>{t('ranked.result.unlockedRewards')} {result.unlockedRewardKeys.map((k) => MILESTONE_BY_KEY.get(k)?.title ?? k).join(', ')}</p>
          )}
          {result.completedAchievementKeys.length > 0 && (
            <p style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-success)', margin: '4px 0 0' }}>{t('ranked.result.achievements')} {result.completedAchievementKeys.map((k) => ACHIEVEMENT_BY_KEY.get(k)?.name ?? k).join(', ')}</p>
          )}

          {/* statistika */}
          <div style={{ margin: '12px auto 0', maxWidth: 280, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--ravenof-border-hairline)', padding: '8px 12px' }}>
            {stat(t('ranked.result.killsLost'), `${stats.totalKills} / ${stats.totalDeaths}`)}
            {stat(t('ranked.result.dmgDealt'), stats.damageDealtToEnemyPlayer)}
            {stat(t('ranked.result.dmgTaken'), stats.damageTaken)}
            {stat(t('ranked.result.spellsPlayed'), stats.spellsPlayed)}
          </div>

          <div className="flex gap-3 justify-center items-center" style={{ marginTop: 16 }}>
            <button onClick={onAgain} className="ravenof-press" style={{ font: '800 13px var(--ravenof-font-display)', letterSpacing: 2.5, textTransform: 'uppercase',
              background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', border: 0, padding: '14px 24px',
              clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)', boxShadow: 'var(--ravenof-shadow-gold-btn)', cursor: 'pointer' }}>
              {t('ranked.result.playAgain')}
            </button>
            <button onClick={onHome} className="ravenof-press" style={{ font: '700 13px var(--ravenof-font-display)', letterSpacing: 2.5, textTransform: 'uppercase',
              background: 'none', border: 0, borderTop: '1px solid var(--ravenof-border-strong)', borderBottom: '1px solid var(--ravenof-border-strong)',
              color: 'var(--ravenof-text-primary)', padding: '14px 22px', cursor: 'pointer' }}>
              {t('ranked.result.toHome')}
            </button>
          </div>
          <div className="flex gap-4 justify-center" style={{ marginTop: 10 }}>
            <button onClick={onLeaderboard} className="ravenof-press" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-gold)', background: 'none', border: 0, cursor: 'pointer' }}>{t('ranked.result.viewTop')} ›</button>
            <button onClick={onRewards} className="ravenof-press" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-gold)', background: 'none', border: 0, cursor: 'pointer' }}>{t('ranked.result.rewards')} ›</button>
          </div>
        </div>

        {/* ── DEŠINĖ: SEZONO KELIAS — rango pokytis (kai pakito) ── */}
        {won && result.rankChange !== 'same' && (
          <div className="shrink-0 text-center hidden sm:block" style={{ borderLeft: '1px solid var(--ravenof-border-hairline)', paddingLeft: 24, minWidth: 220 }}>
            <p style={{ font: '500 10px var(--ravenof-font-body)', letterSpacing: 3, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)', margin: 0 }}>{t('ranked.result.seasonPath')}</p>
            <div className="flex items-center justify-center" style={{ gap: 16, marginTop: 18 }}>
              <RankBadge step={result.rankStepBefore} size={54} />
              <span aria-hidden style={{ width: 9, height: 9, background: 'var(--ravenof-gold-bright)', transform: 'rotate(45deg)' }} />
              <RankBadge step={result.rankStepAfter} size={78} animate={result.rankChange === 'up' ? 'up' : 'down'} />
            </div>
            <p style={{ font: '700 14px var(--ravenof-font-display)', color: rankColor, marginTop: 16, letterSpacing: 0.5 }}>{rankLine}</p>
          </div>
        )}
      </div>
    </div>
  )
}
