// ── Notifikacijos: vieninga apklausa + native push (Capacitor bridge) ─────────
import { createClient } from '@/lib/supabase/client'

export type NotifEvent = {
  type: 'message' | 'friend' | 'challenge' | 'trade' | 'sale'
  title: string; body: string; ts: string; link: string
}

export async function pollNotifications(since: string | null): Promise<NotifEvent[]> {
  const { data, error } = await createClient().rpc('rvn_notifications_poll', { p_since: since })
  if (error) return []
  return (data as NotifEvent[]) ?? []
}

export async function savePushToken(token: string, platform = 'android'): Promise<void> {
  try { await createClient().rpc('rvn_save_push_token', { p_token: token, p_platform: platform }) } catch { /* */ }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as any).Capacitor
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform())
}

// Native push registracija per Capacitor bridge (remote-URL app – plugin yra native shell'e).
// Web buildas nepaliečiamas (jokio npm importo). Veikia tik kai pasiekiamas window.Capacitor.Plugins.PushNotifications.
export async function registerNativePush(onForeground?: (n: { title?: string; body?: string }) => void): Promise<void> {
  if (!isNativeApp()) return
  try {
    const Push = (window as any).Capacitor?.Plugins?.PushNotifications
    if (!Push) return
    const perm = await Push.requestPermissions()
    if (perm?.receive !== 'granted') return
    await Push.register()
    Push.addListener('registration', async (t: { value?: string }) => { if (t?.value) await savePushToken(t.value, 'android') })
    Push.addListener('pushNotificationReceived', (n: any) => { onForeground?.({ title: n?.title ?? n?.data?.title, body: n?.body ?? n?.data?.body }) })
  } catch { /* push neprieinama – ignoruojam */ }
}
