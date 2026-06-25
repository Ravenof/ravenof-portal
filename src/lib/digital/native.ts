// ── Ravenof Digital — native shell (Capacitor) tiltas + piniginės įvykių magistralė ──
// Remote-URL appas: Capacitor plugin'ai gyvena native shell'e ir pasiekiami per
// window.Capacitor.Plugins. Web buildas nepaliečiamas (jokio npm importo čia).
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Ar veikiame native (Android/iOS) Capacitor shell'e? */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as any).Capacitor
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform())
}

/**
 * Bando uždaryti appą (tik native shell'e – App.exitApp()).
 * Grąžina true, jei bandymas pavyko; false – jei native plugin neprieinamas
 * (pvz. PWA/naršyklė, kuri neleidžia uždaryti lango programiškai).
 */
export async function exitNativeApp(): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const App = (window as any).Capacitor?.Plugins?.App
    if (!App || typeof App.exitApp !== 'function') return false
    await App.exitApp()
    return true
  } catch {
    return false
  }
}

// ── Piniginės įvykių magistralė ───────────────────────────────────────────────
// Bet kuris komponentas, pakeitęs auksą/pakuotes (pirkimas, pakuotės atplėšimas),
// iškviečia emitWalletChanged(); viršutinė juosta (layout) perkrauna balansą.
const WALLET_EVENT = 'rvn:wallet'

export function emitWalletChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(WALLET_EVENT))
}

export function onWalletChanged(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(WALLET_EVENT, cb)
  return () => window.removeEventListener(WALLET_EVENT, cb)
}

// ── Parduotuvės atidarymo magistralė ─────────────────────────────────────────
// Bet kuris ekranas gali paprašyti atidaryti parduotuvę (modalas gyvena layout'e).
const STORE_EVENT = 'rvn:open-store'

export function requestOpenStore(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(STORE_EVENT))
}

export function onOpenStore(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(STORE_EVENT, cb)
  return () => window.removeEventListener(STORE_EVENT, cb)
}

// ── Pilno ekrano (immersive) režimas — paslepia native status bar ─────────────
export async function setNativeImmersive(on: boolean): Promise<void> {
  if (!isNativeApp()) return
  try {
    const SB = (window as any).Capacitor?.Plugins?.StatusBar
    if (!SB) return
    if (on) {
      await SB.setOverlaysWebView?.({ overlay: true })
      await SB.hide?.()
    } else {
      await SB.show?.()
      await SB.setOverlaysWebView?.({ overlay: false })
    }
  } catch { /* status bar plugin neprieinama */ }
}
