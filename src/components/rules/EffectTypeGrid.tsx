'use client'

import Image from 'next/image'

const EFFECTS = [
  { id: 'fire',     label: 'Ugnis',         desc: 'Šiluminė žala, Degimo būsena.',              img: '/rules/effects/fire.png'      },
  { id: 'ice',      label: 'Ledas',          desc: 'Šaltoji žala, Sušaldymo būsena.',             img: '/rules/effects/ice.png'       },
  { id: 'lightning',label: 'Žaibas',         desc: 'Elektros žala, grandinių efektai.',           img: '/rules/effects/lightning.png' },
  { id: 'heal',     label: 'Gydymas',        desc: 'Gyvybės taškų atkūrimas.',                    img: ''                             },
  { id: 'buff',     label: 'Pastiprinimas',  desc: 'ATK, HP ar kitų reikšmių didinimas.',         img: '/rules/effects/buff.png'      },
  { id: 'necro',    label: 'Nekrotinis',      desc: 'Tamsioji žala, kapinyno sinergijos.',         img: '/rules/effects/necro.png'     },
  { id: 'debuff',   label: 'Susilpninimas',  desc: 'ATK, HP ar kitų reikšmių mažinimas.',         img: '/rules/effects/debuff.png'    },
  { id: 'poison',   label: 'Nuodai',         desc: 'Periodinė žala, Apnuodijimo būsena.',         img: '/rules/effects/poison.png'    },
  { id: 'artifact', label: 'Artefaktas',     desc: 'Artefaktų kūrimas, sąveika ar stiprinimas.',  img: ''                             },
  { id: 'trigger',  label: 'Suaktyvinimas',  desc: 'Efektai, aktyvuojami išsipildžius sąlygai.',  img: '/rules/effects/trigger.png'   },
  { id: 'synergy',  label: 'Sinergija',       desc: 'Efektai, veikiantys kartu su kitomis kortomis.', img: '/rules/effects/synergy.png'},
  { id: 'utility',  label: 'Pagalbiniai',    desc: 'Kortų traukimas, auksas, judėjimas.',          img: '/rules/effects/utility.png'   },
  { id: 'stun',     label: 'Apsvaiginimas',  desc: 'Suteikia Apsvaiginimo būseną.',               img: '/rules/effects/stun.png'      },
  { id: 'silence',  label: 'Nutildymas',     desc: 'Suteikia Nutildymo būseną.',                  img: '/rules/effects/silence.png'   },
  { id: 'coinflip', label: 'Monetos metimas','desc': 'Rizikos efektas, kurį nurodo kortos tekstas.', img: '/rules/effects/coinflip.png' },
]

const FALLBACK: Record<string, string> = {
  heal: '💚', artifact: '⭐',
}

export function EffectTypeGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {EFFECTS.map((e) => (
        <div key={e.id} className="flex items-center gap-2.5 rounded-lg p-2.5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <div className="shrink-0 w-9 h-9 rounded-lg overflow-hidden relative flex items-center justify-center"
            style={{ background: 'rgba(240,180,41,0.06)', border: '1px solid rgba(240,180,41,0.12)' }}>
            {e.img ? (
              <Image src={e.img} alt={e.label} fill className="object-contain p-1"
                onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = 'none' }} />
            ) : null}
            {!e.img && (
              <span style={{ fontSize: 16 }}>{FALLBACK[e.id] ?? '•'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>{e.label}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 9, lineHeight: 1.3 }}>{e.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
