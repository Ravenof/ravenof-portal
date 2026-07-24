'use client'

// ── Priešininkas rastas — „versus" intro (boto tapatybė NEatskleidžiama). ────
import { useEffect } from 'react'
import { RankBadge } from './RankBadge'
import { playRanked } from '@/lib/ranked/sound'
import { useT } from '@/lib/i18n/react'

export type Opponent = { name: string; avatar: string; faction: string; rankStep: number }

export function MatchFound({ me, opponent, onReady }: {
  me: { name: string; rankStep: number }
  opponent: Opponent
  onReady: () => void
}) {
  const t = useT()
  useEffect(() => {
    playRanked('ranked_match_found')
    const t = setTimeout(() => { playRanked('ranked_match_start'); onReady() }, 2600)
    return () => clearTimeout(t)
  }, [onReady])

  const Side = ({ name, avatar, step, align }: { name: string; avatar: string; step: number; align: 'l' | 'r' }) => (
    <div className={`flex flex-col items-center gap-2 ${align === 'l' ? 'animate-[rvn-slide-l_0.5s_ease-out]' : 'animate-[rvn-slide-r_0.5s_ease-out]'}`}>
      <span className="text-4xl">{avatar}</span>
      <RankBadge step={step} size={72} showLabel />
      <p className="text-sm font-bold text-center max-w-[120px] truncate" style={{ fontFamily: 'var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{name}</p>
    </div>
  )

  return (
    <div className="ravenof-body fixed inset-0 z-[160] flex items-center justify-center p-4 overflow-hidden" style={{ background: 'radial-gradient(120% 100% at 50% 45%, #14100a 0%, #07060A 70%)' }}>
      <div aria-hidden className="ravenof-rays" />
      <div className="relative w-[min(540px,96vw)] px-5 py-8" style={{ background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-gold)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
        <div className="ravenof-ornament" aria-hidden><i /></div>
        <p className="text-center" style={{ font: '700 12px var(--ravenof-font-display)', letterSpacing: 4, textTransform: 'uppercase', color: 'var(--ravenof-gold-bright)', margin: '8px 0 20px' }}>{t('ranked.matchFound')}</p>
        <div className="flex items-center justify-around gap-3">
          <Side name={me.name} avatar="🛡️" step={me.rankStep} align="l" />
          <span className="animate-pulse" style={{ font: '700 28px var(--ravenof-font-display)', color: 'var(--ravenof-gold-bright)', textShadow: '0 0 18px rgba(242,196,90,0.5)' }}>VS</span>
          <Side name={opponent.name} avatar={opponent.avatar} step={opponent.rankStep} align="r" />
        </div>
        <p className="text-center mt-5" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: '20px 0 0' }}>{opponent.faction} · {t('ranked.matchPreparing')}</p>
      </div>
    </div>
  )
}
