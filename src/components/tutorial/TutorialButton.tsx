'use client'

// ── TutorialButton — „Išmokyk mane žaisti" ────────────────────────────────────
// TutorialGame kraunamas dynamic'u tik paspaudus (nedidina puslapio bundle).

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { playUiClick } from '@/lib/ui-sound'

/** Demo kaladės ID – TutorialGame susikuria kaladę iš aktyvių DB kortų. */
export const DEMO_DECK_TUTORIAL = '__demo__'

const TutorialGame = dynamic(
  () => import('./TutorialGame').then((m) => m.TutorialGame),
  { ssr: false }
)

export function TutorialButton({ deckId, deckName, variant = 'full' }: {
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
          background: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.06))',
          border: '1px solid rgba(139,92,246,0.45)',
          color: '#c4b5fd',
          fontFamily: 'var(--rvn-font-display)',
          letterSpacing: '0.04em',
        }}
        title="Mokomoji kova prieš AI: kovos laukas, auksas, ŽMK, žetonai ir patarimai žingsnis po žingsnio"
      >
        🎓 Išmokyk mane žaisti
      </button>
      {open && (
        <TutorialGame deckId={deckId} deckName={deckName} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
