'use client'

// ── Escape uždaro overlay/modalą (ir Android TV/klaviatūros back) ────────────
import { useEffect } from 'react'

export function useEscClose(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}
