'use client'

// ── ZmkSimulator — interaktyvus ŽMK traukimo bandymas ────────────────────────
// Žaidėjas pasirenka bazinę žalą, traukia modifikatorių iš sumaišytos 20 kortų
// kaladės ir mato rezultatą. ×2 / ×0 atveju kaladė permaišoma kaip žaidime.

import { useState } from 'react'
import Image from 'next/image'
import { playCardDraw, playShuffle, playUiClick } from '@/lib/ui-sound'

type ZmkDef = { value: string; color: string; img: string; add?: number; mult?: number }

const CARD_DEFS: Record<string, ZmkDef> = {
  '+0': { value: '+0', color: '#64748b', img: '/rules/zmk/card-plus0.png',  add: 0 },
  '+1': { value: '+1', color: '#22c55e', img: '/rules/zmk/card-plus1.png',  add: 1 },
  '-1': { value: '−1', color: '#ef4444', img: '/rules/zmk/card-minus1.png', add: -1 },
  '+2': { value: '+2', color: '#4ade80', img: '/rules/zmk/card-plus2.png',  add: 2 },
  '-2': { value: '−2', color: '#f87171', img: '/rules/zmk/card-minus2.png', add: -2 },
  'x2': { value: '×2', color: '#f0b429', img: '/rules/zmk/card-x2.png',     mult: 2 },
  'x0': { value: '×0', color: '#94a3b8', img: '/rules/zmk/card-x0.png',     mult: 0 },
}

const FULL_DECK: string[] = [
  ...Array(6).fill('+0'),
  ...Array(5).fill('+1'),
  ...Array(5).fill('-1'),
  '+2', '-2', 'x2', 'x0',
]

function shuffled(): string[] {
  const a = [...FULL_DECK]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function ZmkSimulator() {
  const [deck, setDeck]         = useState<string[]>(() => shuffled())
  const [current, setCurrent]   = useState<string | null>(null)
  const [drawId, setDrawId]     = useState(0)
  const [base, setBase]         = useState(3)
  const [busy, setBusy]         = useState(false)
  const [shuffleNote, setShuffleNote] = useState(false)

  const reshuffle = (silent = false) => {
    if (!silent) playShuffle()
    setDeck(shuffled())
    setCurrent(null)
    setShuffleNote(false)
  }

  const draw = () => {
    if (busy) return
    if (deck.length === 0) { reshuffle(); return }
    playCardDraw()
    setBusy(true)
    setShuffleNote(false)
    const [top, ...rest] = deck
    setCurrent(top)
    setDrawId((n) => n + 1)
    const isSpecial = top === 'x2' || top === 'x0'
    if (isSpecial) {
      // ×2/×0: žala išsprendžiama, tada kaladė permaišoma
      setTimeout(() => {
        playShuffle()
        setDeck(shuffled())
        setShuffleNote(true)
        setBusy(false)
      }, 900)
    } else {
      setDeck(rest)
      setTimeout(() => setBusy(false), 380)
    }
  }

  const def = current ? CARD_DEFS[current] : null
  const result = def
    ? (def.mult !== undefined ? base * def.mult : Math.max(0, base + (def.add ?? 0)))
    : null

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.25)', background: 'var(--bg-surface)' }}>
      <style>{`@keyframes rvnZmkFlip { from { transform: rotateY(90deg); opacity: 0.3; } to { transform: rotateY(0deg); opacity: 1; } }`}</style>

      {/* Antraštė */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
        <span className="text-lg">🎲</span>
        <div>
          <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            Išbandyk ŽMK!
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Pasirink bazinę žalą ir trauk modifikatorių - kaip tikrame žaidime.
          </p>
        </div>
      </div>

      <div className="p-4 flex flex-col sm:flex-row gap-4 items-center">
        {/* Kaladė */}
        <button
          type="button"
          onClick={draw}
          className="relative shrink-0 w-20 aspect-[2.5/3.5] cursor-pointer group"
          aria-label="Traukti ŽMK kortą"
          disabled={busy}
        >
          {[2, 1, 0].map((off) => (
            <div
              key={off}
              className="absolute inset-0 rounded-lg flex items-center justify-center"
              style={{
                transform: `translate(${off * 2}px, ${-off * 2}px)`,
                background: 'linear-gradient(135deg, #141428, #0c0c1c)',
                border: '1px solid rgba(240,180,41,0.35)',
                boxShadow: off === 0 ? '0 4px 12px rgba(0,0,0,0.5)' : undefined,
              }}
            >
              {off === 0 && (
                <span className="text-xs font-black transition-transform group-hover:scale-110" style={{ fontFamily: 'var(--rvn-font-display)', color: 'rgba(240,180,41,0.7)', letterSpacing: '0.1em' }}>
                  ŽMK
                </span>
              )}
            </div>
          ))}
          <span
            className="absolute -bottom-2 -right-2 z-10 text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', fontSize: 10 }}
          >
            {deck.length}
          </span>
        </button>

        <span className="hidden sm:block text-lg" style={{ color: 'var(--text-muted)' }}>→</span>

        {/* Ištraukta korta */}
        <div className="shrink-0 w-20 aspect-[2.5/3.5]">
          {def ? (
            <div
              key={drawId}
              className="w-full h-full rounded-lg overflow-hidden relative"
              style={{
                border: `1.5px solid ${def.color}70`,
                boxShadow: `0 0 16px ${def.color}30`,
                animation: 'rvnZmkFlip 0.35s ease-out',
              }}
            >
              <Image src={def.img} alt={`ŽMK korta ${def.value}`} fill className="object-cover" sizes="80px" />
            </div>
          ) : (
            <div className="w-full h-full rounded-lg flex items-center justify-center" style={{ border: '1px dashed var(--bg-border)', color: 'var(--text-muted)' }}>
              <span className="text-xl opacity-40">?</span>
            </div>
          )}
        </div>

        {/* Rezultatas */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Bazinė žala:</span>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => { playUiClick(); setBase(n) }}
                className="w-6 h-6 rounded text-xs font-bold transition-all"
                style={{
                  fontFamily: 'var(--rvn-font-display)',
                  background: base === n ? 'rgba(240,180,41,0.18)' : 'var(--bg-elevated)',
                  border: base === n ? '1px solid rgba(240,180,41,0.5)' : '1px solid var(--bg-border)',
                  color: base === n ? 'var(--gold)' : 'var(--text-muted)',
                }}
                aria-pressed={base === n}
              >
                {n}
              </button>
            ))}
          </div>

          {def && result !== null ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span style={{ fontFamily: 'var(--rvn-font-display)' }}>{base}</span>
              <span style={{ color: 'var(--text-muted)' }}> žala, ŽMK </span>
              <span className="font-bold" style={{ color: def.color, fontFamily: 'var(--rvn-font-display)' }}>{def.value}</span>
              <span style={{ color: 'var(--text-muted)' }}> → </span>
              <span className="text-base font-black" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{result} žala</span>
            </p>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Spustelėk kaladę arba mygtuką žemiau.
            </p>
          )}

          {shuffleNote && (
            <p className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
              ⟳ Ištraukta ×2/×0 - žala išspręsta, ŽMK permaišyta!
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={draw}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-85 disabled:opacity-50"
              style={{ background: 'rgba(240,180,41,0.12)', border: '1px solid rgba(240,180,41,0.35)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}
            >
              Traukti kortą
            </button>
            <button
              onClick={() => reshuffle()}
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-85"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}
            >
              ↺ Permaišyti
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
