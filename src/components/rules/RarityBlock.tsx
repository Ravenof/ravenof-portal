'use client'

import Image from 'next/image'

// Png failai: /rules/rarity/common.png, magic.png, unique.png, epic.png, legendary.png

const RARITIES = [
  {
    id: 'common',
    label: 'Paprasta',
    color: '#94a3b8',
    colorBg: 'rgba(148,163,184,0.12)',
    copies: 'iki 2 kopijų',
    desc: 'Pagrindinės kortos. Universalios ir dažnai naudojamos.',
    img: '/rules/rarity/common.png',
  },
  {
    id: 'magic',
    label: 'Magiška',
    color: '#4ade80',
    colorBg: 'rgba(74,222,128,0.12)',
    copies: 'iki 2 kopijų',
    desc: 'Patobulinti efektai. Geros sinergijoms.',
    img: '/rules/rarity/magic.png',
  },
  {
    id: 'unique',
    label: 'Unikalus',
    color: '#60a5fa',
    colorBg: 'rgba(96,165,250,0.12)',
    copies: 'iki 2 kopijų',
    desc: 'Stipresni efektai ir unikalios mechanikos.',
    img: '/rules/rarity/unique.png',
  },
  {
    id: 'epic',
    label: 'Epiškas',
    color: '#c084fc',
    colorBg: 'rgba(192,132,252,0.12)',
    copies: '1 kopija',
    desc: 'Galingi efektai. Tik 1 kopija kaladėje.',
    img: '/rules/rarity/epic.png',
  },
  {
    id: 'legendary',
    label: 'Legendinis',
    color: '#f87171',
    colorBg: 'rgba(248,113,113,0.12)',
    copies: '1 kopija',
    desc: 'Patys galingiausi efektai. Tik 1 kopija kaladėje.',
    img: '/rules/rarity/legendary.png',
  },
]

function DiamondFallback({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={32} height={32} fill={color}>
      <polygon points="12,2 22,9 18,22 6,22 2,9" opacity={0.9} />
    </svg>
  )
}

export function RarityBlock() {
  return (
    <div className="flex flex-col gap-2">
      {RARITIES.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 rounded-xl p-3"
          style={{ background: r.colorBg, border: `1px solid ${r.color}30` }}
        >
          {/* Diamond icon */}
          <div className="w-10 h-10 shrink-0 relative flex items-center justify-center">
            <Image
              src={r.img}
              alt={`${r.label} deimantas`}
              width={36}
              height={36}
              className="object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
              <DiamondFallback color={r.color} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: r.color }}>
                {r.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${r.color}20`, color: r.color, fontFamily: 'var(--rvn-font-display)', fontSize: 10 }}>
                {r.copies}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
