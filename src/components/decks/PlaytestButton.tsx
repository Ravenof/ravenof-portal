'use client'

// ── PlaytestButton — atidaro kaladės išbandymo režimą ─────────────────────────
// DeckPlaytest kraunamas dynamic'u tik paspaudus (nedidina puslapio bundle).

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { playUiClick } from '@/lib/ui-sound'

const DeckPlaytest = dynamic(
  () => import('./DeckPlaytest').then((m) => m.DeckPlaytest),
  { ssr: false }
)

export function PlaytestButton({ deckId, deckName, variant = 'full' }: {
  deckId: string
  deckName: string
  /** 'full' — pilnas mygtukas; 'compact' — mažas (kortelių sąrašui) */
  variant?: 'full' | 'compact'
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => { playUiClick(); setOpen(true) }}
        className={
          variant === 'full'
            ? 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95'
            : 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95 w-full'
        }
        style={{
          background: 'linear-gradient(135deg, rgba(240,180,41,0.16), rgba(240,180,41,0.06))',
          border: '1px solid rgba(240,180,41,0.4)',
          color: 'var(--gold)',
          fontFamily: 'var(--rvn-font-display)',
          letterSpacing: '0.04em',
        }}
        title="Maišyk, trauk kortas ir išbandyk kaladę kaip žaidime"
      >
        🎴 Išbandyti
      </button>
      {open && (
        <DeckPlaytest deckId={deckId} deckName={deckName} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
