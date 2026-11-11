'use client'
// ── Riedantis skaičius (game juice, 761) ─────────────────────────────────────
// HP ir auksas nebe „peršoka" į naują reikšmę, o per trumpą laiką nurieda iki jos.
// Trukmė auga su pokyčio dydžiu (bet neviršija maxMs), kad −1 būtų greitas, o −12
// spėtų pasimatyti. `prefers-reduced-motion` – be animacijos. Pirmas atvaizdavimas – iškart.
import { useEffect, useRef, useState } from 'react'

export function RollingNumber({ value, minMs = 180, maxMs = 520 }: { value: number; minMs?: number; maxMs?: number }) {
  const [shown, setShown] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    const from = fromRef.current
    if (from === value) return
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof requestAnimationFrame === 'undefined') { fromRef.current = value; setShown(value); return }
    const dur = Math.min(maxMs, minMs + Math.abs(value - from) * 28)
    const t0 = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const eased = 1 - Math.pow(1 - k, 3)
      const cur = Math.round(from + (value - from) * eased)
      fromRef.current = cur
      setShown(cur)
      if (k < 1) rafRef.current = requestAnimationFrame(tick)
      else { rafRef.current = null; fromRef.current = value }
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }
  }, [value, minMs, maxMs])
  return <>{shown}</>
}
