'use client'
// ── Profilio ekranų DESKTOP pagalbininkai ───────────────────────────────────
//  • useProfileUi()   – desk (desktop režimas) + compact (TIK ne-desktop: senas
//                        844×390 išdėstymas). Desktop'e compact niekada neįsijungia —
//                        išdėstymą ten renka realus konteinerio plotis (useElementWidth).
//  • useElementWidth  – ResizeObserver plotis (0 kol neišmatuota).
//  Mobile išvestis nekeičiama: visi desktop dydžiai naudojami tik kai desk === true.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDesktopUi } from '../ui/useDesktopUi'
import { useCompact } from '../progression/kit'

export function useProfileUi() {
  const { desktop } = useDesktopUi()
  const narrow = useCompact()
  return { desk: desktop, compact: !desktop && narrow }
}

export function useElementWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [w, setW] = useState(0)
  const ro = useRef<ResizeObserver | null>(null)
  const ref = useCallback((el: T | null) => {
    ro.current?.disconnect()
    ro.current = null
    if (!el || typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver((entries) => {
      const cw = Math.round(entries[0]?.contentRect.width ?? 0)
      setW((prev) => (prev === cw ? prev : cw))
    })
    obs.observe(el)
    ro.current = obs
  }, [])
  useEffect(() => () => ro.current?.disconnect(), [])
  return [ref, w]
}
