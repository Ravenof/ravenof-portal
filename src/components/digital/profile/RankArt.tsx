'use client'

// ── Rango ženklas: iliustracija PO pakopos rėmu ─────────────────────────────
// Handoff (COWORK-INSTRUCTIONS.md, 2 žingsnis): du sluoksniai viename kvadrate,
// abu `inset:0; width:100%; height:100%; object-fit:contain`, rėmas – VIRŠUJE.
// Etalonas: asffa/asset-previews/rank-layering-example.png.
// Šis komponentas NEKEIČIA Ranked ekrano – jis skirtas profilio rango slotui.

import { rankBadgeSrc, rankFrameSrc, rankLabel, type RankTier } from '@/lib/profile/ranks'

export type RankArtProps = {
  rank: number
  tier: RankTier
  size?: number
  /** Rodyti tik ženklą (be rėmo) – pvz. mažoms sąrašo eilutėms. */
  frameless?: boolean
  className?: string
}

export function RankArt({ rank, tier, size = 92, frameless = false, className }: RankArtProps) {
  const badge = rankBadgeSrc(rank)
  return (
    <div className={className} style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}
      role="img" aria-label={rankLabel(rank)}>
      {badge
        ? /* eslint-disable-next-line @next/next/no-img-element */
          <img src={badge} alt="" draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
        : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4 }}>🛡</span>}
      {!frameless && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={rankFrameSrc(tier)} alt="" draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
      )}
    </div>
  )
}
