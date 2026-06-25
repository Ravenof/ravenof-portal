'use client'

// ── Priešininkas rastas — „versus" intro (boto tapatybė NEatskleidžiama). ────
import { useEffect } from 'react'
import { RankBadge } from './RankBadge'
import { playRanked } from '@/lib/ranked/sound'

export type Opponent = { name: string; avatar: string; faction: string; rankStep: number }

export function MatchFound({ me, opponent, onReady }: {
  me: { name: string; rankStep: number }
  opponent: Opponent
  onReady: () => void
}) {
  useEffect(() => {
    playRanked('ranked_match_found')
    const t = setTimeout(() => { playRanked('ranked_match_start'); onReady() }, 2600)
    return () => clearTimeout(t)
  }, [onReady])

  const Side = ({ name, avatar, step, align }: { name: string; avatar: string; step: number; align: 'l' | 'r' }) => (
    <div className={`flex flex-col items-center gap-2 ${align === 'l' ? 'animate-[rvn-slide-l_0.5s_ease-out]' : 'animate-[rvn-slide-r_0.5s_ease-out]'}`}>
      <span className="text-4xl">{avatar}</span>
      <RankBadge step={step} size={72} showLabel />
      <p className="text-sm font-bold text-center max-w-[120px] truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{name}</p>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.94)' }}>
      <div className="relative w-[min(520px,96vw)]" style={{ borderRadius: 20, background: 'rgba(239,68,68,0.32)', padding: 2 }}>
        <div className="px-5 py-8" style={{ borderRadius: 19, background: 'radial-gradient(120% 90% at 50% 0%, rgba(239,68,68,0.16), rgba(10,8,16,0.98) 62%), linear-gradient(160deg,#15101f,#0a0810)' }}>
          <p className="text-center text-xs font-semibold mb-5" style={{ color: '#fca5a5', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.18em' }}>PRIEŠININKAS RASTAS</p>
          <div className="flex items-center justify-around gap-3">
            <Side name={me.name} avatar="🛡️" step={me.rankStep} align="l" />
            <span className="text-3xl font-bold animate-pulse" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', textShadow: '0 0 18px rgba(240,180,41,0.6)' }}>VS</span>
            <Side name={opponent.name} avatar={opponent.avatar} step={opponent.rankStep} align="r" />
          </div>
          <p className="text-center text-[11px] mt-5" style={{ color: 'var(--text-muted)' }}>{opponent.faction} · Kova ruošiama…</p>
        </div>
      </div>
    </div>
  )
}
