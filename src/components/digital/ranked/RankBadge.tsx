'use client'

// ── Ravenof Reitingo kova — rango ženklas (Bronza / Sidabras / Auksas) ───────
// Dark fantasy medalis su aiškiai matomu rango numeriu. Trys vizualios pakopos.
import { useState } from 'react'
import { medalTierFromStep, rankNumberFromStep, medalLabel, type MedalTier } from '@/lib/ranked/rank'
import { ICON_BASE, ICON_V } from '@/components/digital/ui/RvnIcon'

const TIER_STYLE: Record<MedalTier, { ring: string; face: string; glow: string; rim: string; text: string }> = {
  bronze: {
    ring: 'linear-gradient(145deg,#7a4a23,#3a2412)',
    face: 'radial-gradient(120% 100% at 50% 25%, #c98a4e, #6e3f1e 70%)',
    glow: 'rgba(179,121,63,0.45)', rim: '#8a5a30', text: '#fce8d0',
  },
  silver: {
    ring: 'linear-gradient(145deg,#c7d0db,#5b6675)',
    face: 'radial-gradient(120% 100% at 50% 25%, #eef3f8, #8f9bab 72%)',
    glow: 'rgba(199,208,219,0.5)', rim: '#aeb8c6', text: '#1c2530',
  },
  gold: {
    ring: 'linear-gradient(145deg,#fcd34d,#9a6b12)',
    face: 'radial-gradient(120% 100% at 50% 22%, #ffe9a8, #d49a1f 70%)',
    glow: 'rgba(240,180,41,0.6)', rim: '#f0b429', text: '#3a2606',
  },
}

const oct = (b: number) =>
  `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`

export function RankBadge({ step, size = 88, showLabel = false, animate }: {
  step: number
  size?: number
  showLabel?: boolean
  animate?: 'up' | 'down' | null
}) {
  const tier = medalTierFromStep(step)
  const num = rankNumberFromStep(step)
  const s = TIER_STYLE[tier]
  const numFont = size * 0.42
  // Dizainerio medalio PNG (file-first); nepavykus įkelti — senas CSS medalis
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div className="inline-flex flex-col items-center gap-1.5 select-none" style={animate ? { animation: `${animate === 'up' ? 'rvn-rankup' : 'rvn-rankdown'} 0.9s ease-out` } : undefined}>
      <div className="relative" style={{ width: size, height: size, filter: `drop-shadow(0 0 ${size * 0.18}px ${s.glow})` }}>
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${ICON_BASE}/rank-${tier}.png?v=${ICON_V}`} alt="" draggable={false}
            onError={() => setImgFailed(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (<>
          {/* išorinis žiedas */}
          <div className="absolute inset-0" style={{ clipPath: oct(size * 0.16), background: s.ring }} />
          {/* vidinis veidas */}
          <div className="absolute" style={{ inset: size * 0.07, clipPath: oct(size * 0.13), background: s.face, boxShadow: `inset 0 2px 6px rgba(255,255,255,0.35), inset 0 -3px 8px rgba(0,0,0,0.4)` }} />
          {/* kampų kniedės */}
          {['top-[8%] left-[8%]', 'top-[8%] right-[8%]', 'bottom-[8%] left-[8%]', 'bottom-[8%] right-[8%]'].map((p, i) => (
            <span key={i} className={`absolute ${p} rounded-full`} style={{ width: size * 0.08, height: size * 0.08, background: s.rim, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.5)' }} />
          ))}
        </>)}
        {/* rango numeris */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontFamily: 'var(--rvn-font-display)', fontSize: numFont, lineHeight: 1, fontWeight: 800, color: imgFailed ? s.text : '#fff7e0', textShadow: imgFailed ? '0 1px 2px rgba(0,0,0,0.35)' : '0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)' }}>{num}</span>
        </div>
      </div>
      {showLabel && (
        <span className="text-[11px] font-bold tracking-wide" style={{ fontFamily: 'var(--rvn-font-display)', color: tier === 'silver' ? '#cbd5e1' : tier === 'gold' ? 'var(--gold)' : '#d9a06b', letterSpacing: '0.08em' }}>
          {num} {medalLabel(tier)}
        </span>
      )}
    </div>
  )
}
