'use client'
// Starter kaladžių dėžučių paveikslėliai pagal frakciją (PNG be fono).
// Bendras cache su „Mano kaladės" (sessionStorage 'rvn-deck-covers').
import { useEffect, useState } from 'react'
import { getStarterDecks } from '@/lib/starterDecks'

const KEY = 'rvn-deck-covers'

export function useStarterBoxes(): Record<number, string> {
  const [boxes, setBoxes] = useState<Record<number, string>>(() => {
    try { return JSON.parse(sessionStorage.getItem(KEY) || '{}') as Record<number, string> } catch { return {} }
  })
  useEffect(() => {
    let alive = true
    getStarterDecks().then((sd) => {
      if (!alive) return
      const m: Record<number, string> = {}
      for (const d of sd ?? []) if (d.factionId != null && d.imageUrl) m[d.factionId] = d.imageUrl
      if (Object.keys(m).length) {
        setBoxes(m)
        try { sessionStorage.setItem(KEY, JSON.stringify(m)) } catch { /* */ }
      }
    })
    return () => { alive = false }
  }, [])
  return boxes
}
