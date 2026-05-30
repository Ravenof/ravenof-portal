'use client'

import Image from 'next/image'

const CARD_TYPES = [
  { id: 'creature',  icon: '⚔', label: 'Padaras',     desc: 'Kovos lauko vienetas',               atk: true,  hp: true,  stays: true,  imgPath: '/rules/examples/type-creature.png'  },
  { id: 'spell',     icon: '✨', label: 'Burtas',      desc: 'Vienkartinis efektas',               atk: false, hp: false, stays: false, imgPath: '/rules/examples/type-spell.png'     },
  { id: 'artifact',  icon: '⚗', label: 'Artefaktas',  desc: 'Ilgalaikis efektas su HP',           atk: false, hp: true,  stays: true,  imgPath: '/rules/examples/type-artifact.png'  },
  { id: 'curse',     icon: '💀', label: 'Prakeiksmas', desc: 'Įmaišomas į priešininko kaladę',     atk: false, hp: false, stays: false, imgPath: '/rules/examples/type-curse.png'     },
  { id: 'reaction',  icon: '⚡', label: 'Reakcija',    desc: 'Užversta, aktyvuojasi sąlygiškai',  atk: false, hp: false, stays: true,  imgPath: '/rules/examples/type-reaction.png'  },
  { id: 'field',     icon: '🌍', label: 'Laukas',      desc: 'Globalus aplinkos efektas',          atk: false, hp: false, stays: true,  imgPath: '/rules/examples/type-field.png'     },
  { id: 'champion',  icon: '👑', label: 'Čempionas',   desc: 'Galingas su fazėmis ir gebėjimais',  atk: false, hp: true,  stays: true,  imgPath: '/rules/examples/type-champion.png'  },
]

type CardType = typeof CARD_TYPES[number]

function CardTypeItem({ ct }: { ct: CardType }) {
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
    >
      {/* Image slot */}
      <div className="relative h-36 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#12121e,#1a1a2e)' }}>
        <Image
          src={ct.imgPath}
          alt={`${ct.label} kortos pavyzdys`}
          fill
          className="object-contain p-2"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        {/* Fallback icon */}
        <span className="text-4xl opacity-30 relative z-0">{ct.icon}</span>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
          {ct.label}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{ct.desc}</p>
        <div className="flex flex-wrap gap-1 mt-auto">
          {ct.atk && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontSize: 10 }}>
              ⚔ ATK
            </span>
          )}
          {ct.hp && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', fontSize: 10 }}>
              ♥ HP
            </span>
          )}
          {ct.stays && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(240,180,41,0.08)', color: 'rgba(240,180,41,0.7)', border: '1px solid rgba(240,180,41,0.15)', fontSize: 10 }}>
              Lieka lauke
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function CardTypeGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {CARD_TYPES.map((ct) => <CardTypeItem key={ct.id} ct={ct} />)}
    </div>
  )
}
