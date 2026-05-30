const QR_ITEMS = [
  { icon: '♥',  label: '1v1 pradžia',         value: '40 HP'              },
  { icon: '♥♥', label: '2v2 pradžia',         value: '60 HP komandai'     },
  { icon: '🂠',  label: 'Kaladė',              value: '30–40 kortų'        },
  { icon: '🃏',  label: 'Ranka',               value: 'maks. 10 kortų'     },
  { icon: '🎴',  label: 'DMD',                 value: '20 kortų'           },
  { icon: '⚔',  label: 'Padarų zona',          value: 'maks. 5'            },
  { icon: '⚗',  label: 'Artefaktų zona',       value: 'maks. 2'            },
  { icon: '🌍',  label: 'Lauko korta',          value: 'maks. 1'            },
  { icon: '⚜',  label: '1 korta = +100 aukso', value: '1× per ėjimą'      },
  { icon: '⏳',  label: 'Nepanaudotas auksas',  value: 'Nepersikelia'       },
]

export function RulesQuickReference() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid rgba(240,180,41,0.2)' }}
    >
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.12)' }}>
        <span className="text-base">⚡</span>
        <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
          GREITA ATMINTINĖ
        </p>
      </div>
      <div className="p-3 flex flex-col gap-1">
        {QR_ITEMS.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
            style={{ borderBottom: i < QR_ITEMS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
          >
            <span className="text-sm w-6 text-center shrink-0">{item.icon}</span>
            <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            <span className="text-xs font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', opacity: 0.9 }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
