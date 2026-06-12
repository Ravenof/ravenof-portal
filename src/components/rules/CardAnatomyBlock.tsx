'use client'

// ── CardAnatomyBlock — interaktyvi kortos anatomija ───────────────────────────
// Numeruoti hotspot taškai ant kortos pavyzdžio rodo, kur kas yra kortoje.
// Hotspot ↔ sąrašo elementas susieti dvikrypčiai. Kortą galima apžiūrėti iš arti.

import { useState } from 'react'
import Image from 'next/image'
import { GameCard } from '@/components/ui/GameCard'
import { playUiClick } from '@/lib/ui-sound'
import { CardLightbox } from './CardLightbox'

const CARD_IMG = '/rules/examples/card-example-creature.png'

// x/y — pozicija procentais ant kortos pavyzdžio (3:4)
const ANATOMY_ITEMS = [
  { label: 'Iškvietimo kaina', desc: 'Kiek aukso mokama už kortą.',                        x: 83.5, y: 12   },
  { label: 'Pavadinimas',      desc: 'Kortos identifikatorius.',                           x: 50,   y: 70   },
  { label: 'Kortų tipas',      desc: 'Ikonėlė - Padaras, Burtas, Artefaktas ir kt.',       x: 16,   y: 26.5 },
  { label: 'Frakcija',         desc: 'Kuriai frakcijai priklauso korta.',                  x: 16,   y: 12   },
  { label: 'Efekto tekstas',   desc: 'Kortos gebėjimai. Raktažodžiai paryškintu šriftu.',  x: 50,   y: 82   },
  { label: 'ATK (⚔)',          desc: 'Puolimo taškai - žalos kiekis atakuojant.',          x: 16,   y: 54   },
  { label: 'HP (♥)',           desc: 'Gyvybės taškai - kiek žalos atlaikoma.',             x: 85.5, y: 56   },
  { label: 'Retumas',          desc: 'Nurodo, kiek kopijų leidžiama turėti kaladėje.',     x: 86,   y: 72   },
]

export function CardAnatomyBlock() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [inspecting, setInspecting] = useState(false)

  const select = (i: number) => {
    playUiClick()
    setActiveIdx((cur) => (cur === i ? null : i))
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.2)' }}>
      <style>{`@keyframes rvnHotspotPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(240,180,41,0.4); } 50% { box-shadow: 0 0 0 7px rgba(240,180,41,0); } }`}</style>

      {/* Kairė: korta su hotspot taškais */}
      <div className="flex flex-col items-center justify-center gap-3 p-6" style={{ background: 'var(--bg-surface)' }}>
        <GameCard glowColor="rgba(240,180,41,0.5)" intensity={6} sounds={false} className="rounded-xl">
          <div
            className="w-52 sm:w-56 aspect-[3/4] rounded-xl overflow-hidden relative"
            style={{ border: '2px solid rgba(240,180,41,0.4)' }}
          >
            <Image src={CARD_IMG} alt="Kortos pavyzdys" fill className="object-cover" sizes="224px" />
            {/* Hotspot taškai */}
            {ANATOMY_ITEMS.map((item, i) => {
              const active = activeIdx === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); select(i) }}
                  className="absolute z-20 w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center font-black transition-all"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    fontSize: 10,
                    fontFamily: 'var(--rvn-font-display)',
                    background: active ? 'var(--gold)' : 'rgba(10,10,20,0.78)',
                    color: active ? '#0a0a14' : 'var(--gold)',
                    border: `1.5px solid ${active ? '#ffd970' : 'rgba(240,180,41,0.6)'}`,
                    boxShadow: active ? '0 0 14px rgba(240,180,41,0.8)' : '0 0 6px rgba(0,0,0,0.6)',
                    transform: active ? 'scale(1.3)' : undefined,
                    animation: active ? undefined : 'rvnHotspotPulse 2.4s ease-in-out infinite',
                  }}
                  aria-label={item.label}
                  aria-pressed={active}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </GameCard>

        <button
          onClick={() => { playUiClick(); setInspecting(true) }}
          className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-85"
          style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}
        >
          🔍 Apžiūrėti iš arti
        </button>
      </div>

      {/* Dešinė: elementų sąrašas */}
      <div className="p-4 flex flex-col gap-1" style={{ background: 'rgba(240,180,41,0.03)' }}>
        <p className="text-xs font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
          KORTOS ELEMENTAI
        </p>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          Spustelėk numerį ant kortos arba sąraše - pamatysi, kur kas yra.
        </p>
        {ANATOMY_ITEMS.map((item, i) => {
          const active = activeIdx === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => select(i)}
              onMouseEnter={() => setActiveIdx(i)}
              className="flex gap-2 text-xs text-left rounded-lg px-2 py-1.5 transition-all w-full"
              style={{
                background: active ? 'rgba(240,180,41,0.1)' : 'transparent',
                border: active ? '1px solid rgba(240,180,41,0.3)' : '1px solid transparent',
              }}
              aria-pressed={active}
            >
              <span
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold transition-all"
                style={{
                  fontSize: 10,
                  background: active ? 'var(--gold)' : 'rgba(240,180,41,0.1)',
                  color: active ? '#0a0a14' : 'var(--gold)',
                  fontFamily: 'var(--rvn-font-display)',
                }}
              >
                {i + 1}
              </span>
              <div>
                <span className="font-semibold" style={{ color: active ? 'var(--gold)' : 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{item.label}</span>
                <span style={{ color: 'var(--text-muted)' }}> — {item.desc}</span>
              </div>
            </button>
          )
        })}
      </div>

      {inspecting && (
        <CardLightbox
          src={CARD_IMG}
          alt="Kortos pavyzdys iš arti"
          caption="Orm'as — padaro kortos pavyzdys"
          onClose={() => setInspecting(false)}
        />
      )}
    </div>
  )
}
