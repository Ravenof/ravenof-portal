'use client'
// ── Desktop UI režimas meniu ekranams (/digital, ne kova) ─────────────────────
// Išdėstymas renkamas pagal TURIMĄ PLOTĮ, o hover galimybė vertinama atskirai:
//   • desktop  – plotis ≥ 1024 ir aukštis ≥ 600 (arba pelė + plotis ≥ 900).
//                Tada naudojami semantiniai desktop dydžiai (deskTokens.ts +
//                desktop-ui.css), NE mastelio koeficientas.
//   • compact  – desktop, bet žemas/siauras langas (aukštis < 780 arba plotis < 1280).
//   • hover    – (hover:hover) and (pointer:fine) – hover peržiūroms.
//
// SVARBU (hidratacija): SSR visada renderina mobile (desktop=false). Anksčiau
// useState(() => calc()) klientui iškart grąžindavo desktop=true, React hidratacijos
// metu atributų neperrašo → likdavo mobile className/stiliai (desktop režimas
// realiai niekada neįsijungdavo pirmo užkrovimo metu). useSyncExternalStore su
// getServerSnapshot tai sprendžia: hidratuojama su SSR reikšme, po to perrenderinama.
import { useSyncExternalStore } from 'react'

export type DesktopUi = { desktop: boolean; compact: boolean; hover: boolean; vw: number; vh: number }

const SERVER: DesktopUi = { desktop: false, compact: false, hover: false, vw: 0, vh: 0 }
let cache: DesktopUi = SERVER

function compute(): DesktopUi {
  if (typeof window === 'undefined') return SERVER
  const vw = window.innerWidth, vh = window.innerHeight
  const hover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false
  const desktop = (vw >= 1024 && vh >= 600) || (hover && vw >= 900 && vh >= 560)
  const compact = desktop && (vh < 780 || vw < 1280)
  if (cache.desktop === desktop && cache.compact === compact && cache.hover === hover && cache.vw === vw && cache.vh === vh) return cache
  cache = { desktop, compact, hover, vw, vh }
  return cache
}

function subscribe(cb: () => void) {
  let raf = 0
  const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(cb) }
  window.addEventListener('resize', on)
  const mq = window.matchMedia?.('(hover: hover) and (pointer: fine)')
  mq?.addEventListener?.('change', on)
  return () => { window.removeEventListener('resize', on); mq?.removeEventListener?.('change', on); cancelAnimationFrame(raf) }
}

export function useDesktopUi(): DesktopUi {
  return useSyncExternalStore(subscribe, compute, () => SERVER)
}

/** Ne-hook variantas (event handleriams, portalams). */
export function getDesktopUi(): DesktopUi { return compute() }
