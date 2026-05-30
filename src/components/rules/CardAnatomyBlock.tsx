'use client'

import Image from 'next/image'

const ANATOMY_ITEMS = [
  { label: 'Iškvietimo kaina',  desc: 'Kiek aukso mokama. Viršutinis dešinysis kampas.' },
  { label: 'Pavadinimas',       desc: 'Kortos identifikatorius.'                         },
  { label: 'Kortų tipas',       desc: 'Ikonėlė — Padaras, Burtas, Artefaktas ir kt.'    },
  { label: 'Frakcija',          desc: 'Kuriai frakcijai priklauso korta.'                },
  { label: 'Efekto tekstas',    desc: 'Kortos gebėjimai. Raktažodžiai paryškintu šriftu.'},
  { label: 'ATK (⚔)',           desc: 'Puolimo taškai — žalos kiekis atakuojant.'        },
  { label: 'HP (♥)',            desc: 'Gyvybės taškai — kiek žalos atlaikoma.'           },
  { label: 'Retumas',           desc: 'Nurodo, kiek kopijų leidžiama turėti kaladėje.'  },
]

export function CardAnatomyBlock() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.2)' }}>
      {/* Left: real card image */}
      <div className="flex items-center justify-center p-6" style={{ background: 'var(--bg-surface)' }}>
        <div
          className="w-40 aspect-[2.5/3.5] rounded-xl overflow-hidden relative"
          style={{ border: '2px solid rgba(240,180,41,0.4)', boxShadow: '0 0 24px rgba(240,180,41,0.12)' }}
        >
          <Image
            src="/rules/examples/card-example-creature.png"
            alt="Kortos pavyzdys"
            fill
            className="object-cover"
            onError={(e) => {
              // Fallback: show placeholder
              const parent = (e.currentTarget as HTMLImageElement).parentElement
              if (parent) {
                (e.currentTarget as HTMLImageElement).style.display = 'none'
                const fb = parent.querySelector('.card-fallback') as HTMLElement
                if (fb) fb.style.display = 'flex'
              }
            }}
          />
          {/* Fallback */}
          <div className="card-fallback absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#1a1030,#0d1a2e)', display: 'none' }}>
            <span className="text-5xl opacity-30">🃏</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Kortos pavyzdys</span>
          </div>
        </div>
      </div>

      {/* Right: anatomy list */}
      <div className="p-4 flex flex-col gap-2" style={{ background: 'rgba(240,180,41,0.03)' }}>
        <p className="text-xs font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
          KORTOS ELEMENTAI
        </p>
        {ANATOMY_ITEMS.map((item, i) => (
          <div key={i} className="flex gap-2 text-xs">
            <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(240,180,41,0.1)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
              {i + 1}
            </span>
            <div>
              <span className="font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{item.label}</span>
              <span style={{ color: 'var(--text-muted)' }}> — {item.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
