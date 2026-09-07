'use client'
// ── Desktop kovos išdėstymo režimas ir dydžiai ──────────────────────────────
// Desktop = pelė (hover:hover + pointer:fine) IR plotis ≥ 1024. Mažas lango
// aukštis desktop'e įjungia „compact" dydžius, o NE telefono gestus (hMobile).
// Visi dydžiai skaičiuojami iš aukščio biudžeto: priešo info → priešo padarai →
// ėjimo juosta → tavo padarai → ranka (ramybėje pilnai matoma, nedengia padarų).
import { useEffect, useState } from 'react'

export type DesktopSizes = {
  vw: number; vh: number
  compact: boolean
  railL: number; railR: number       // šoninių stulpelių plotis
  centerW: number                    // lentos plotis (be rail'ų ir tarpų)
  unitW: number                      // padaro korta (5 vietos)
  handW: number                      // suskleista rankos korta
  handWBig: number                   // išskleista rankos korta
  handZoneH: number                  // rezervas rankai apačioje (ramybės būsena)
  pileW: number                      // kaladžių miniatiūros
  endTurn: number                    // ėjimo mygtuko skersmuo
  logFont: number
  previewW: number                   // didelės kortos peržiūros plotis
  fieldW: number                     // lauko kortos plotis
  /** Padaro plotis, kai vietų daugiau nei 5 (lauko efektas iki 10) – tankus režimas, visos matomos. */
  denseUnitW: (slots: number) => number
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function computeDesktopSizes(vw: number, vh: number): DesktopSizes {
  const compact = vh < 760 || vw < 1300
  const railL = clamp(Math.round(vw * 0.15), 196, 250)
  const railR = clamp(Math.round(vw * 0.15), 196, 250)
  const pad = 12
  const centerW = vw - railL - railR - pad * 4
  // Aukščio biudžetas: viršus (priešo avataras/ranka) ~72, ėjimo juosta ~44, tarpai ~40.
  const fixed = 72 + 44 + 40 + pad * 2
  // Ranka ramybėje: kortos pilnai matomos, handW ≈ 0.92·unitW → aukštis 1.227·unitW.
  const unitByH = Math.floor((vh - fixed - 48) / (2 * 4 / 3 + 0.92 * 4 / 3 + 0.1))
  const unitByW = Math.floor((centerW - 4 * 10 - 2 * (compact ? 64 : 84)) / 5)   // 5 vietos + tarpai + lauko korta dešinėje
  const unitW = clamp(Math.min(unitByH, unitByW), 92, compact ? 132 : 156)
  const handW = Math.round(unitW * 0.92)
  const handWBig = Math.round(unitW * 1.22)
  // Rankos zona: korta pilnai + išskleidimo mygtukas (36) + oras.
  const handZoneH = Math.round(handW * 4 / 3) + 16
  const pileW = compact ? 50 : 62
  const endTurn = compact ? 106 : 124
  const logFont = compact ? 12 : 13
  const previewW = compact ? 264 : 300
  const fieldW = compact ? 60 : 72
  const denseUnitW = (slots: number) => clamp(Math.floor((centerW - 2 * fieldW - (slots - 1) * 6) / slots), 56, unitW)
  return { vw, vh, compact, railL, railR, centerW, unitW, handW, handWBig, handZoneH, pileW, endTurn, logFont, previewW, fieldW, denseUnitW }
}

export function isDesktopEnv(): boolean {
  if (typeof window === 'undefined') return false
  const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
  return fine && window.innerWidth >= 1024
}

/** Reaktyvus desktop režimas + dydžiai (perskaičiuojama keičiant lango dydį / mastelį). */
export function useDesktopLayout(enabled: boolean): { desktop: boolean; sizes: DesktopSizes | null } {
  const [state, setState] = useState<{ desktop: boolean; sizes: DesktopSizes | null }>(() => {
    const d = enabled && isDesktopEnv()
    return { desktop: d, sizes: d ? computeDesktopSizes(window.innerWidth, window.innerHeight) : null }
  })
  useEffect(() => {
    if (!enabled) { setState({ desktop: false, sizes: null }); return }
    let raf = 0
    const recompute = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const d = isDesktopEnv()
        setState({ desktop: d, sizes: d ? computeDesktopSizes(window.innerWidth, window.innerHeight) : null })
      })
    }
    recompute()
    window.addEventListener('resize', recompute)
    const mq = window.matchMedia?.('(hover: hover) and (pointer: fine)')
    mq?.addEventListener?.('change', recompute)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', recompute); mq?.removeEventListener?.('change', recompute) }
  }, [enabled])
  return state
}
