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

// ── Grįžimo kabliukai — vietinės dienos notifikacijos (retention #6) ───────────
// Capacitor LocalNotifications gyvena native shell'e. Be jokio backend/push:
// suplanuojam kasdienį priminimą apie dienos atlygį ir kovą. Vartotojas gali
// išjungti nustatymuose. Priminimų būsena — įrenginio lygmens (localStorage).
const REMINDERS_KEY = 'rvn:reminders'
const RID_DAILY = 4801   // vakarinis: dienos atlygis / serija
const RID_BATTLE = 4802  // vidurdienio: sužaisk kovą

/** Ar priminimai įjungti (numatytai taip). */
export function remindersEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(REMINDERS_KEY) !== 'off'
}

function nextAt(hour: number, minute: number): Date {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
  return d
}

/** Suplanuoja kasdienius grįžimo priminimus (tik native, tik jei įjungta). */
export async function scheduleReturnReminders(): Promise<void> {
  if (!isNativeApp() || !remindersEnabled()) return
  try {
    const LN = (window as any).Capacitor?.Plugins?.LocalNotifications
    if (!LN) return
    const perm = await LN.checkPermissions?.()
    if (perm?.display !== 'granted') {
      const req = await LN.requestPermissions?.()
      if (req?.display !== 'granted') return
    }
    await LN.cancel?.({ notifications: [{ id: RID_DAILY }, { id: RID_BATTLE }] })
    await LN.schedule({ notifications: [
      { id: RID_DAILY,  title: 'Ravenof', body: 'Tavo dienos atlygis laukia! 🔥 Neprarask serijos.', schedule: { at: nextAt(19, 0), every: 'day', allowWhileIdle: true } },
      { id: RID_BATTLE, title: 'Ravenof', body: 'Arenoje laukia nauji priešininkai. ⚔️ Sužaisk kovą!', schedule: { at: nextAt(12, 30), every: 'day', allowWhileIdle: true } },
    ] })
  } catch { /* niekada nelaužia UI */ }
}

/** Atšaukia grįžimo priminimus. */
export async function cancelReturnReminders(): Promise<void> {
  try {
    const LN = (window as any).Capacitor?.Plugins?.LocalNotifications
    await LN?.cancel?.({ notifications: [{ id: RID_DAILY }, { id: RID_BATTLE }] })
  } catch { /* ignoruojam */ }
}

/** Įjungia/išjungia priminimus (nustatymų jungiklis). */
export async function setRemindersEnabled(on: boolean): Promise<void> {
  if (typeof window !== 'undefined') window.localStorage.setItem(REMINDERS_KEY, on ? 'on' : 'off')
  if (on) await scheduleReturnReminders()
  else await cancelReturnReminders()
}

// ── Ekrano orientacijos užraktas (horizontal combat, F7) ──────────────────────
// Native shell'e naudojam @capacitor/screen-orientation per window.Capacitor.Plugins
// (jei įdiegtas — sename APK be plugin'o tyliai praleidžiam). Web fallback: Screen
// Orientation API (veikia tik fullscreen; kitur meta -> rodom „pasukite telefoną").
export async function lockLandscape(): Promise<void> {
  // Native: orientaciją valdo AndroidManifest (screenOrientation=sensorLandscape).
  // Plugin lock/unlock jį overridintų (unlock -> UNSPECIFIED -> leidžia portrait), todėl native = no-op.
  if (isNativeApp()) return
  try {
    const o: any = typeof screen !== 'undefined' ? (screen as any).orientation : null
    if (o?.lock) await o.lock('landscape')
  } catch { /* naršyklė neleido – overlay „pasukite" pasirūpins */ }
}

export async function unlockOrientation(): Promise<void> {
  // Native: NELIETI orientacijos (manifest laiko landscape). Web: atrakinam.
  if (isNativeApp()) return
  try {
    const o: any = typeof screen !== 'undefined' ? (screen as any).orientation : null
    if (o?.unlock) o.unlock()
  } catch { /* ignoruojam */ }
}

/** Ar įrenginys šiuo metu vertikalioj (portrait) padėtyje? */
export function isPortraitNow(): boolean {
  if (typeof window === 'undefined') return false
  const o: any = typeof screen !== 'undefined' ? (screen as any).orientation : null
  if (o?.type) return String(o.type).startsWith('portrait')
  return window.innerHeight > window.innerWidth
}
