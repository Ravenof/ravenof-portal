'use client'

const RARITIES = [
  {
    id: 'common',
    label: 'Paprastas',
    color: '#94a3b8',
    colorBg: 'rgba(148,163,184,0.12)',
    copies: 'iki 2 kopijų',
    desc: 'Pagrindinės kortos. Universalios ir dažnai naudojamos.',
  },
  {
    id: 'magic',
    label: 'Magiškas',
    color: '#4ade80',
    colorBg: 'rgba(74,222,128,0.12)',
    copies: 'iki 2 kopijų',
    desc: 'Patobulinti efektai. Geros sinergijoms.',
  },
  {
    id: 'unique',
    label: 'Unikalus',
    color: '#60a5fa',
    colorBg: 'rgba(96,165,250,0.12)',
    copies: 'iki 2 kopijų',
    desc: 'Stipresni efektai ir unikalios mechanikos.',
  },
  {
    id: 'epic',
    label: 'Epiškas',
    color: '#c084fc',
    colorBg: 'rgba(192,132,252,0.12)',
    copies: '1 kopija',
    desc: 'Galingi efektai. Tik 1 kopija kaladėje.',
  },
  {
    id: 'legendary',
    label: 'Legendinis',
    color: '#f87171',
    colorBg: 'rgba(248,113,113,0.12)',
    copies: '1 kopija',
    desc: 'Patys galingiausi efektai. Tik 1 kopija kaladėje.',
  },
]

function DiamondIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Diamond shape */}
      <polygon
        points="20,2 38,14 20,42 2,14"
        fill={color}
        fillOpacity="0.18"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner highlight */}
      <polygon
        points="20,8 32,16 20,36 8,16"
        fill={color}
        fillOpacity="0.08"
      />
      {/* Top facet */}
      <polygon
        points="20,2 38,14 20,16 2,14"
        fill={color}
        fillOpacity="0.25"
      />
      <polygon
        points="20,2 38,14 20,14"
        fill="white"
        fillOpacity="0.12"
      />
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
          <div className="shrink-0 flex items-center justify-center w-10 h-10">
            <DiamondIcon color={r.color} size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: r.color }}>
                {r.label}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: `${r.color}20`, color: r.color, fontFamily: 'var(--rvn-font-display)', fontSize: 10 }}
              >
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
