'use client'
// ── Desktop UI režimas meniu ekranams (hub, header, nav rail) ────────────────
// desktop = pelė + plotis ≥ 1024 (tas pats kriterijus kaip kovoje). k – mastelio
// koeficientas tekstui/tarpams: 1 mobile, ~1.4–1.8 desktope pagal lango plotį.
import { useEffect, useState } from 'react'
import { isDesktopEnv } from '@/components/tutorial/useDesktopLayout'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
function calc(): { desktop: boolean; k: number } {
  const d = isDesktopEnv()
  if (!d) return { desktop: false, k: 1 }
  return { desktop: true, k: clamp(Math.min(window.innerWidth / 1100, window.innerHeight / 620), 1.35, 1.8) }
}

export function useDesktopUi(): { desktop: boolean; k: number } {
  const [s, setS] = useState(() => (typeof window === 'undefined' ? { desktop: false, k: 1 } : calc()))
  useEffect(() => {
    let raf = 0
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setS(calc())) }
    on()
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [])
  return s
}
