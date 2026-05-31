'use client'

import Image from 'next/image'

const FACTIONS = [
  { id: 'demonu-orda',          label: 'Demonų Orda',           desc: 'Sabotažas, prakeiksmai, tamsioji kontrolė.',                       img: '/rules/factions/demonu-orda.png'          },
  { id: 'mirties-marsas',       label: 'Mirties Maršas',        desc: 'Negyvėlių armija, kapinyno sinergijos, nuolatinis spaudimas.',      img: '/rules/factions/mirties-marsas.png'       },
  { id: 'plesiku-naktis',       label: 'Plėšikų Naktis',        desc: 'Iniciatyva, aukso vogimas, greiti sprendimai.',                     img: '/rules/factions/plesiku-naktis.png'       },
  { id: 'goblinu-gauja',        label: 'Goblinų Gauja',          desc: 'Chaosas, agresija, Monetos metimas - didelė rizika ir atlygis.',   img: '/rules/factions/goblinu-gauja.png'        },
  { id: 'mistikos-melodija',    label: 'Mistikos Melodija',      desc: 'Burtai, kontrolė, masinis žalos padarymas, reakcijos.',            img: '/rules/factions/mistikos-melodija.png'    },
  { id: 'rytu-vezas',           label: 'Rytų Vėjas',             desc: 'Sėlinimas, tikslūs smūgiai, greitas tempas.',                      img: '/rules/factions/rytu-vezas.png'           },
  { id: 'sviesos-pulkas',       label: 'Šviesos Pulkas',         desc: 'Gynyba, Pasišaipymas, Magiškasis skydas, board kontrolė.',         img: '/rules/factions/sviesos-pulkas.png'       },
  { id: 'inkvizicijos-legionas',label: 'Inkvizicijos Legionas',  desc: 'Gydymas, pastiprinimas, palaikymas, šviesos sinergijos.',          img: '/rules/factions/inkvizicijos-legionas.png'},
  { id: 'neutralios',           label: 'Neutralios / Universalios', desc: 'Tinka su bet kuria frakcija. Universalūs efektai.',             img: '/rules/factions/neutralios.png'           },
]

export function FactionGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {FACTIONS.map((f) => (
        <div key={f.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden relative flex items-center justify-center"
            style={{ background: 'rgba(240,180,41,0.05)', border: '1px solid rgba(240,180,41,0.15)' }}>
            <Image
              src={f.img}
              alt={f.label}
              fill
              className="object-contain p-1"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{f.label}</p>
            <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
