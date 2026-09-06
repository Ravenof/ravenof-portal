// ── IAP klientas (karkasas) ──────────────────────────────────────────────────
// Platformos pirkimą (Google Play Billing / StoreKit / Steam) atlieka native plugin'as;
// ČIA – tik kvito pateikimas verify-receipt edge function'ui, kuri suteikia valiutą.
// Klientas valiutos pats NEprideda. Po sėkmės – emitWalletChanged().
import { createClient } from '@/lib/supabase/client'
import { emitWalletChanged } from '@/lib/digital/native'

export type IapPlatform = 'google' | 'apple' | 'steam'
export type IapProduct = { product_id: string; title: string; payload: unknown; sort_order: number }

export async function listIapProducts(): Promise<IapProduct[]> {
  const { data } = await createClient().from('iap_products').select('product_id, title, payload, sort_order').eq('active', true).order('sort_order')
  return (data as IapProduct[]) ?? []
}

export async function submitReceipt(platform: IapPlatform, productId: string, token: string): Promise<{ ok: boolean; error?: string; duplicate?: boolean }> {
  const sb = createClient()
  const { data, error } = await sb.functions.invoke('verify-receipt', { body: { platform, productId, token } })
  if (error) return { ok: false, error: error.message }
  const r = data as { ok?: boolean; duplicate?: boolean; error?: string }
  if (r?.ok) emitWalletChanged()
  return { ok: !!r?.ok, duplicate: r?.duplicate, error: r?.error }
}

/** Kur esam: Electron (Steam) / Capacitor (google|apple) / web (null – IAP nėra). */
export function iapPlatform(): IapPlatform | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { ravenofDesktop?: { platform: string }; Capacitor?: { getPlatform?: () => string } }
  if (w.ravenofDesktop) return 'steam'
  const cp = w.Capacitor?.getPlatform?.()
  if (cp === 'android') return 'google'
  if (cp === 'ios') return 'apple'
  return null
}
