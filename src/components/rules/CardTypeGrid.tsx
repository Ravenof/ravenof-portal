const CARD_TYPES = [
  { id: 'creature',  icon: '⚔', label: 'Padaras',     desc: 'Kovos lauko vienetas',          atk: true,  hp: true,  stays: true,  imgPath: '/rules/examples/type-creature.png'  },
  { id: 'spell',     icon: '✨', label: 'Burtas',      desc: 'Vienkartinis efektas',          atk: false, hp: false, stays: false, imgPath: '/rules/examples/type-spell.png'     },
  { id: 'artifact',  icon: '⚗', label: 'Artefaktas',  desc: 'Ilgalaikis efektas su HP',      atk: false, hp: true,  stays: true,  imgPath: '/rules/examples/type-artifact.png'  },
  { id: 'curse',     icon: '💀', label: 'Prakeiksmas', desc: 'Įmaišomas į priešininko kaladę',atk: false, hp: false, stays: false, imgPath: '/rules/examples/type-curse.png'     },
  { id: 'reaction',  icon: '⚡', label: 'Reakcija',    desc: 'Užversta, aktyvuojasi sąlygiškai', atk: false, hp: false, stays: true, imgPath: '/rules/examples/type-reaction.png' },
  { id: 'field',     icon: '🌍', label: 'Laukas',      desc: 'Globalus aplinkos efektas',     atk: false, hp: false, stays: true,  imgPath: '/rules/examples/type-field.png'     },
  { id: 'champion',  icon: '👑', label: 'Čempionas',   desc: 'Galingas su fazėmis ir gebėjimais', atk: false, hp: true, stays: true, imgPath: '/rules/examples/type-champion.png' },
]

export function CardTypeGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {CARD_TYPES.map((ct) => (
        <div
          key={ct.id}
          className="rounded-xl overflow-hidden flex flex-col"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          {/* Image slot */}
          <div className="h-24 flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg,#12121e,#1a1a2e)' }}>
            <span className="text-4xl opacity-50">{ct.icon}</span>
            <div className="absolute bottom-1 right-1 text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--text-muted)', fontSize: '9px' }}>
              Kortos pavyzdys
            </div>
          </div>
          {/* Info */}
          <div className="p-3 flex flex-col gap-2 flex-1">
            <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
              {ct.label}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{ct.desc}</p>
            <div className="flex flex-wrap gap-1 mt-auto">
              {ct.atk && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', fontSize: '10px' }}>
                  ⚔ ATK
                </span>
              )}
              {ct.hp && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', fontSize: '10px' }}>
                  ♥ HP
                </span>
              )}
              {ct.stays && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(240,180,41,0.08)', color: 'rgba(240,180,41,0.7)', border: '1px solid rgba(240,180,41,0.15)', fontSize: '10px' }}>
                  Lieka lauke
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
