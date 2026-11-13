'use client'

// ── ComicCinematicOverlay — komikso intarpas iškvietimui ir gebėjimui („Kirtis") ─
// Plonas React apvalkalas aplink lib/game/comicStage.ts: visą piešimą ir laiką valdo
// variklis, čia tik gyvavimo ciklas, muzikos pritildymas ir saugiklis.

import { useEffect, useRef } from 'react'
import { playComic, comicTimes, comicExitMs, type ComicSpec } from '@/lib/game/comicStage'
import { duckMusic } from '@/lib/game/musicManager'

const SAFETY_MS = 6000   // jei rAF sustotų (skirtukas fone) – vis tiek užbaigiam

export function ComicCinematicOverlay({ comic, onFinished }: { comic: ComicSpec; onFinished: () => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const doneRef = useRef<() => void>(onFinished)
  doneRef.current = onFinished

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let done = false
    const fin = () => { if (done) return; done = true; doneRef.current() }
    duckMusic(-12, comicTimes(comic).exitAt + comicExitMs(comic))
    const h = playComic(root, comic, fin)
    const t = window.setTimeout(fin, SAFETY_MS)
    return () => { window.clearTimeout(t); h.destroy() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={rootRef} role="dialog" aria-live="polite" style={{ position: 'fixed', inset: 0, zIndex: 160, overflow: 'hidden', cursor: 'pointer', touchAction: 'none' }} />
}
