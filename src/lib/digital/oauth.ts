// ── Google / Facebook prisijungimas (Supabase OAuth, PKCE) ───────────────────
// Trys aplinkos:
//  • web (Next / Vercel)  – įprastas redirect'as į Google ir atgal į /digital/auth/callback
//  • Electron (desktop)   – Google/Facebook atsidaro sistemos naršyklėje, Supabase
//                           grąžina į `ravenof://auth/callback?code=…`; main procesas
//                           gauna deep link'ą ir persiunčia į renderer'į (preload tiltas)
//  • Capacitor (Android)  – tas pats principas per App.openUrl + appUrlOpen listener
//                           (AndroidManifest intent-filter schemai `ravenof`)
// PKCE code_verifier saugomas toje pačioje sesijos saugykloje (client.ts), todėl
// exchangeCodeForSession veikia ir grįžus per deep link'ą.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client'
import { isNativeApp } from '@/lib/digital/native'

export type OAuthProvider = 'google' | 'facebook'
export const DEEP_LINK_REDIRECT = 'ravenof://auth/callback'
const NEXT_KEY = 'rvn.oauth.next'

type DesktopBridge = { openExternal?: (url: string) => Promise<void> | void; onAuthCallback?: (cb: (url: string) => void) => () => void }
function desktop(): DesktopBridge | null {
  if (typeof window === 'undefined') return null
  return (window as any).ravenofDesktop ?? null
}

/** Ar prisijungimas vyks išorinėje naršyklėje (deep link grįžimas), o ne redirect'u tame pačiame lange. */
export function usesExternalBrowser(): boolean {
  return !!desktop() || isNativeApp()
}

export function rememberNext(next: string | null) {
  try { if (next) sessionStorage.setItem(NEXT_KEY, next); else sessionStorage.removeItem(NEXT_KEY) } catch { /* ignore */ }
}
export function takeNext(): string | null {
  try { const v = sessionStorage.getItem(NEXT_KEY); sessionStorage.removeItem(NEXT_KEY); return v } catch { return null }
}

/** Pradeda OAuth srautą. Web'e puslapis persikrauna (redirect), kitur – atsidaro sistemos naršyklė. */
export async function startOAuth(provider: OAuthProvider, next: string | null): Promise<void> {
  const sb = createClient()
  rememberNext(next)
  if (usesExternalBrowser()) {
    const { data, error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: DEEP_LINK_REDIRECT, skipBrowserRedirect: true } })
    if (error) throw error
    if (!data.url) throw new Error('no oauth url')
    const d = desktop()
    if (d?.openExternal) { await d.openExternal(data.url); return }
    const App = (window as any).Capacitor?.Plugins?.App
    if (App?.openUrl) { await App.openUrl({ url: data.url }); return }
    window.open(data.url, '_blank')
    return
  }
  const redirectTo = `${window.location.origin}/digital/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
  const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo } })
  if (error) throw error
}

/** Klauso deep link'o grįžimo (Electron / Capacitor). Grąžina unsubscribe. */
export function listenOAuthCallback(cb: (url: string) => void): () => void {
  const d = desktop()
  if (d?.onAuthCallback) return d.onAuthCallback(cb)
  const App = (window as any).Capacitor?.Plugins?.App
  if (App?.addListener) {
    const p = App.addListener('appUrlOpen', (ev: { url: string }) => { if (ev?.url?.startsWith('ravenof://')) cb(ev.url) })
    return () => { Promise.resolve(p).then((h: any) => h?.remove?.()).catch(() => {}) }
  }
  return () => {}
}

/** Iš callback URL (`?code=` PKCE arba `#access_token=` implicit) sukuria sesiją. */
export async function completeOAuth(url: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = createClient()
  let u: URL
  try { u = new URL(url) } catch { return { ok: false, error: 'bad url' } }
  const errDesc = u.searchParams.get('error_description') || u.searchParams.get('error')
  if (errDesc) return { ok: false, error: errDesc }
  const code = u.searchParams.get('code')
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }
  const hash = new URLSearchParams(u.hash.replace(/^#/, ''))
  const access_token = hash.get('access_token'), refresh_token = hash.get('refresh_token')
  if (access_token && refresh_token) {
    const { error } = await sb.auth.setSession({ access_token, refresh_token })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }
  return { ok: false, error: 'no code' }
}
