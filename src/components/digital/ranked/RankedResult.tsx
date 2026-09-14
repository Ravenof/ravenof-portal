'use client'

// ── Ravenof Reitingo kova — rezultato ekranas (celebration stiliumi) ─────────
// Tas pats varikliukas kaip atlygių šventė (RewardCelebration): spinduliai,
// žarijos, „įsispaudžianti" antraštė, atlygio plytelės su count-up. Pralaimėjus –
// raudonas tonas. Viršuje – RANGO CEREMONIJA: senas ženklas → naujas (su žiedais),
// be pokyčio – vienas ženklas + įspėjimas apie kritimą.
import { useEffect } from 'react'
import { RankBadge } from './RankBadge'
import { formatRank, isMaxRank } from '@/lib/ranked/rank'
import { MILESTONE_BY_KEY } from '@/lib/ranked/rewards'
import { ACHIEVEMENT_BY_KEY } from '@/lib/ranked/achievements'
import type { MatchReportResult, PlayerMatchStats } from '@/lib/ranked/types'
import type { GrantedReward } from '@/lib/progression/types'
import { playRanked } from '@/lib/ranked/sound'
import { useT } from '@/lib/i18n/react'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import { CelebrationStyles, CelebrationFx, CelebrationTiles, celebrationCtaDelay, type CelebrationItem } from '@/components/digital/progression/RewardCelebration'

const CER_CSS = `
.rvn-rank-cer{display:flex;align-items:center;justify-content:center;gap:26px;padding:18px 34px;background:linear-gradient(158deg,rgba(27,21,34,.97),rgba(15,13,21,.98));border:1px solid rgba(212,163,59,.35);box-shadow:inset 0 0 30px rgba(0,0,0,.45),0 12px 30px rgba(0,0,0,.55);position:relative;opacity:0;transform:translateY(30px) scale(.9);animation:rvnTileIn .6s cubic-bezier(.2,1.3,.4,1) forwards;animation-delay:var(--d);max-width:100%;flex-wrap:wrap}
.rvn-rank-cer.red{border-color:rgba(198,85,99,.35)}
.rvn-rank-cer .old{filter:saturate(.6) brightness(.7)}
.rvn-rank-cer .new{position:relative;display:grid;place-items:center}
.rvn-rank-cer .new>div{transform:scale(0);animation:rvnIcoPop .8s cubic-bezier(.2,1.5,.4,1) forwards;animation-delay:calc(var(--d) + .3s)}
.rvn-rank-cer .new .rvn-cele-ring{animation-delay:calc(var(--d) + .4s)}.rvn-rank-cer .new .rvn-cele-ring.r2{animation-delay:calc(var(--d) + .55s)}
.rvn-rank-cer .arrow{width:10px;height:10px;background:var(--ravenof-gold-bright);transform:rotate(45deg);box-shadow:0 0 10px rgba(242,196,90,.7)}
.rvn-rank-cer.red .arrow{background:#c65563;box-shadow:0 0 10px rgba(198,85,99,.6)}
.rvn-rank-cer .txt{text-align:left;display:flex;flex-direction:column;gap:4px}
.rvn-rank-cer .txt .k{font:500 11px var(--ravenof-font-body);letter-spacing:3px;text-transform:uppercase;color:var(--ravenof-text-secondary)}
.rvn-rank-cer .txt .v{font:700 22px var(--ravenof-font-display);color:var(--ravenof-gold-bright)}
.rvn-rank-cer.red .txt .v{color:#e9d7c3}
.rvn-rank-cer .txt .v.down{color:#c65563}
.rvn-rank-cer .txt .w{font:500 12px var(--ravenof-font-body);color:#D4A33B;margin-top:2px}
@media (max-width:640px){.rvn-rank-cer{gap:14px;padding:14px 16px}.rvn-rank-cer .txt .v{font-size:16px}.rvn-rank-cer .txt{text-align:center;align-items:center;width:100%}}
`

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

  const { desktop } = useDesktopUi()
  const dk = desktop ? 1 : 0
  const lossWarn = !won && result.lossCounterAfter === 1 && result.rankChange === 'same'
  const changed = result.rankChange !== 'same'
  const rankLine = changed
    ? `${formatRank(result.rankStepBefore)} → ${formatRank(result.rankStepAfter)}`
    : `${t('ranked.result.noChange')} · ${formatRank(result.rankStepAfter)}`

  // Atlygio plytelės (sidabras / XP)
  const items: CelebrationItem[] = []
  if (result.goldGained > 0) items.push({ kind: 'reward', reward: { type: 'silver', amount: result.goldGained } as GrantedReward })
  if (result.expGained > 0) items.push({ kind: 'reward', reward: { type: 'account_xp', amount: result.expGained } as unknown as GrantedReward })
  const base = 1.25   // plytelės po rango ceremonijos
  const cta = celebrationCtaDelay(items.length, base)

  const statCell = (v: string | number, l: string, last = false) => (
    <div key={l} className="flex flex-col items-center" style={{ gap: 3, padding: dk ? '10px 22px' : '7px 12px', borderRight: last ? 0 : '1px solid var(--ravenof-border-hairline)' }}>
      <b style={{ font: `700 ${dk ? 18 : 14}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)' }}>{v}</b>
      <span style={{ font: `500 ${dk ? 10.5 : 8.5}px var(--ravenof-font-body)`, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)' }}>{l}</span>
    </div>
  )

  return (
    <div className="ravenof-body fixed inset-0 z-[170] flex items-start justify-center p-4 overflow-y-auto ravenof-scroll"
      style={{ background: won ? 'rgba(4,3,7,0.92)' : 'radial-gradient(120% 100% at 50% 40%, rgba(90,24,34,0.45) 0%, rgba(4,3,7,0.94) 60%)' }}>
      <CelebrationStyles />
      <style>{CER_CSS}</style>
      <CelebrationFx tone={won ? 'gold' : 'red'} />
      <div className="rvn-cele-panel" style={{ maxWidth: 980, gap: dk ? 18 : 12, margin: 'auto' }}>
        <div className="rvn-cele-kicker">{t('ranked.title')} · {t('ranked.result.vs', { name: opponentName })}</div>
        <h1 className={'rvn-cele-title' + (won ? '' : ' lose')}>{won ? t('ranked.result.win') : t('ranked.result.loss')}</h1>
        <div className="rvn-cele-rule" />
        {!won && <p className="rvn-cele-sub">{t('ranked.result.encourage')}</p>}

        {/* ── Rango ceremonija ── */}
        <div className={'rvn-rank-cer' + (won ? '' : ' red')} style={{ ['--d' as string]: '0.8s' }}>
          {changed && (<>
            <div className="old"><RankBadge step={result.rankStepBefore} size={dk ? 64 : 48} /></div>
            <span className="arrow" aria-hidden />
          </>)}
          <div className="new">
            <span className="rvn-cele-ring" style={{ ['--d' as string]: '0.8s' }} /><span className="rvn-cele-ring r2" style={{ ['--d' as string]: '0.8s' }} />
            <div><RankBadge step={result.rankStepAfter} size={dk ? 112 : 84} animate={result.rankChange === 'up' ? 'up' : result.rankChange === 'down' ? 'down' : null} /></div>
          </div>
          <div className="txt">
            <span className="k">{t('ranked.result.seasonPath')}</span>
            <span className={'v' + (result.rankChange === 'down' ? ' down' : '')}>{rankLine}</span>
            {isMaxRank(result.rankStepAfter) && won && <span className="w">{t('ranked.result.maxReached')}</span>}
            {lossWarn && <span className="w">{t('ranked.result.lossToDemotion')}</span>}
          </div>
        </div>

        {items.length > 0 && <CelebrationTiles items={items} baseDelay={base} />}

        {/* ── Atrakinta / pasiekimai ── */}
        {(result.unlockedRewardKeys.length > 0 || result.completedAchievementKeys.length > 0) && (
          <div className="rvn-cele-extra flex flex-col" style={{ ['--cta' as string]: cta, gap: 6, width: '100%', maxWidth: dk ? 460 : 340 }}>
            {result.unlockedRewardKeys.length > 0 && (<>
              <p style={{ font: `700 ${dk ? 12 : 9.5}px var(--ravenof-font-display)`, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--ravenof-gold)', margin: 0 }}>{t('ranked.result.unlockedRewards')}</p>
              {result.unlockedRewardKeys.map((k) => (
                <div key={k} className="flex items-center" style={{ gap: 8, background: 'rgba(21,17,28,0.9)', border: '1px solid rgba(212,163,59,0.35)', padding: dk ? '10px 14px' : '7px 10px', textAlign: 'left', font: `700 ${dk ? 14 : 11.5}px var(--ravenof-font-body)`, color: '#f3ead3' }}>
                  <span className="flex-1 min-w-0 truncate">{MILESTONE_BY_KEY.get(k)?.title ?? k}</span>
                  <span style={{ font: `400 ${dk ? 12 : 9.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('ranked.result.seasonPath')}</span>
                </div>
              ))}
            </>)}
            {result.completedAchievementKeys.length > 0 && (<>
              <p style={{ font: `700 ${dk ? 12 : 9.5}px var(--ravenof-font-display)`, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--ravenof-success)', margin: '4px 0 0' }}>{t('ranked.result.achievements')}</p>
              {result.completedAchievementKeys.map((k) => (
                <div key={k} className="flex items-center" style={{ gap: 8, background: 'rgba(21,17,28,0.9)', border: '1px solid rgba(123,211,137,0.35)', padding: dk ? '10px 14px' : '7px 10px', textAlign: 'left', font: `700 ${dk ? 14 : 11.5}px var(--ravenof-font-body)`, color: '#f3ead3' }}>
                  <span className="flex-1 min-w-0 truncate">{ACHIEVEMENT_BY_KEY.get(k)?.name ?? k}</span>
                </div>
              ))}
            </>)}
          </div>
        )}

        {/* ── Statistika ── */}
        <div className="rvn-cele-extra flex" style={{ ['--cta' as string]: cta, border: '1px solid var(--ravenof-border-hairline)', background: 'rgba(0,0,0,0.35)' }}>
          {statCell(`${stats.totalKills} / ${stats.totalDeaths}`, t('ranked.result.killsLost'))}
          {statCell(stats.damageDealtToEnemyPlayer, t('ranked.result.dmgDealt'))}
          {statCell(stats.damageTaken, t('ranked.result.dmgTaken'))}
          {statCell(stats.spellsPlayed, t('ranked.result.spellsPlayed'), true)}
        </div>

        <div className="rvn-cele-extra flex gap-3 justify-center items-center flex-wrap" style={{ ['--cta' as string]: cta, marginTop: 6 }}>
          <button onClick={onAgain} className="ravenof-press" style={{ font: `800 ${dk ? 16 : 13}px var(--ravenof-font-display)`, letterSpacing: dk ? 3 : 2.5, textTransform: 'uppercase',
            background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', border: 0, padding: dk ? '18px 40px' : '14px 24px',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)', boxShadow: 'var(--ravenof-shadow-gold-btn)', cursor: 'pointer' }}>
            {t('ranked.result.playAgain')}
          </button>
          <button onClick={onHome} className="ravenof-press" style={{ font: `700 ${dk ? 16 : 13}px var(--ravenof-font-display)`, letterSpacing: dk ? 3 : 2.5, textTransform: 'uppercase',
            background: 'none', border: 0, borderTop: '1px solid var(--ravenof-border-strong)', borderBottom: '1px solid var(--ravenof-border-strong)',
            color: 'var(--ravenof-text-primary)', padding: dk ? '18px 34px' : '14px 22px', cursor: 'pointer' }}>
            {t('ranked.result.toHome')}
          </button>
        </div>
        <div className="rvn-cele-extra flex gap-5 justify-center" style={{ ['--cta' as string]: cta, marginTop: -6 }}>
          <button onClick={onLeaderboard} className="ravenof-press" style={{ font: `400 ${dk ? 13 : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-gold)', background: 'none', border: 0, cursor: 'pointer' }}>{t('ranked.result.viewTop')} ›</button>
          <button onClick={onRewards} className="ravenof-press" style={{ font: `400 ${dk ? 13 : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-gold)', background: 'none', border: 0, cursor: 'pointer' }}>{t('ranked.result.rewards')} ›</button>
        </div>
      </div>
    </div>
  )
}
