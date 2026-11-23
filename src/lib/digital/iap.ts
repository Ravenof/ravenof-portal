// ── IAP klientas (karkasas) ──────────────────────────────────────────────────
// Platformos pirkimą (Google Play Billing / StoreKit / Steam) atlieka native plugin'as;
// ČIA – tik kvito pateikimas verify-receipt edge function'ui, kuri suteikia valiutą.
// Klientas valiutos pats NEprideda. Po sėkmės – emitWalletChanged().
import { createClient } from '@/lib/supabase/client'
import { emitWalletChanged } from '@/lib/digital/native'
import { registerPlugin, Capacitor } from '@capacitor/core'

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

// ── Google Play Billing per @capgo/native-purchases (native plugin'as AAB'e) ──
// JS pusė kalba su plugin'u per registerPlugin – npm paketas reikalingas tik
// native build'ui (npx cap sync). Senas AAB be plugin'o → billingAvailable()=false.
//
// Srautas (vartojami / consumable rubinai):
//  1) purchaseProduct(autoAcknowledge=false, isConsumable=false) → purchaseToken
//  2) submitReceipt('google', …) → verify-receipt patikrina Google API, suteikia
//     rubinus (idempotentiškai pagal orderId) ir PATS suvartoja (consume) pirkinį
//  3) jei 2) nepavyko (tinklas, uždarytas appas) – recoverGooglePurchases() kitą
//     kartą atidarius parduotuvę pakartoja visus nesuvartotus pirkinius.

type NPProduct = { identifier: string; title: string; price: number; priceString: string; currencyCode: string }
type NPTransaction = { transactionId: string; productIdentifier: string; purchaseToken?: string; purchaseState?: string; orderId?: string }
interface NativePurchasesPlugin {
  isBillingSupported(): Promise<{ isBillingSupported: boolean }>
  getProducts(o: { productIdentifiers: string[]; productType?: 'inapp' | 'subs' }): Promise<{ products: NPProduct[] }>
  purchaseProduct(o: { productIdentifier: string; productType?: 'inapp' | 'subs'; quantity?: number; isConsumable?: boolean; autoAcknowledgePurchases?: boolean; appAccountToken?: string }): Promise<NPTransaction>
  getPurchases(o?: { productType?: 'inapp' | 'subs'; appAccountToken?: string }): Promise<{ purchases: NPTransaction[] }>
}
let npInst: NativePurchasesPlugin | null = null
// tingus registravimas – modulis importuojamas ir SSR metu
const np = (): NativePurchasesPlugin => (npInst ??= registerPlugin<NativePurchasesPlugin>('NativePurchases'))
// Plugin'as po kiekvieno kvietimo uždaro bendrą BillingClient – lygiagretūs kvietimai
// (getProducts + getPurchases atidarius parduotuvę) vienas kitam nutraukia ryšį.
// Todėl visi billing kvietimai eina griežtai po vieną.
let billingQueue: Promise<unknown> = Promise.resolve()
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = billingQueue.then(fn, fn)
  billingQueue = run.catch(() => undefined)
  return run
}

/** Ar šiame įrenginyje galima pirkti per Google Play (Android + naujas AAB su plugin'u). */
export function billingAvailable(): boolean {
  try { return iapPlatform() === 'google' && Capacitor.isPluginAvailable('NativePurchases') } catch { return false }
}

/** Lokalizuotos store kainos (pvz. „4,99 €") pagal product id. Tuščias objektas, jei billing nėra. */
export async function getStorePrices(ids: string[]): Promise<Record<string, string>> {
  if (!billingAvailable() || ids.length === 0) return {}
  try {
    const { products } = await serial(() => np().getProducts({ productIdentifiers: ids, productType: 'inapp' }))
    return Object.fromEntries((products ?? []).map((p) => [p.identifier, p.priceString]))
  } catch (e) { console.warn('[iap] getProducts:', e); return {} }
}

export type BuyResult = { ok: true } | { ok: false; reason: 'unavailable' | 'cancelled' | 'pending' | 'verify' | 'failed'; message?: string }

/** Nupirkti vartojamą produktą (rubinus). Rubinus suteikia TIK serveris. */
export async function buyProduct(productId: string): Promise<BuyResult> {
  if (!billingAvailable()) return { ok: false, reason: 'unavailable' }
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return { ok: false, reason: 'failed', message: 'not signed in' }
  const userId = user.id
  let tx: NPTransaction
  try {
    tx = await serial(() => np().purchaseProduct({ productIdentifier: productId, productType: 'inapp', quantity: 1, isConsumable: false, autoAcknowledgePurchases: false, appAccountToken: userId }))
  } catch (e) {
    const err = e as { code?: string; message?: string }
    const txt = `${err?.code ?? ''} ${err?.message ?? ''}`.toUpperCase()
    if (txt.includes('CANCEL')) return { ok: false, reason: 'cancelled' }
    if (txt.includes('PENDING')) return { ok: false, reason: 'pending' }
    return { ok: false, reason: 'failed', message: err?.message }
  }
  const token = tx.purchaseToken ?? tx.transactionId
  if (!token) return { ok: false, reason: 'verify', message: 'no token' }
  const r = await submitReceipt('google', tx.productIdentifier || productId, token)
  return r.ok ? { ok: true } : { ok: false, reason: 'verify', message: r.error }
}

/** Pakartoja nesuvartotus Google pirkinius (nutrūkęs patvirtinimas / pending, kuris jau apmokėtas). Grąžina kiek suteikta. */
export async function recoverGooglePurchases(): Promise<number> {
  if (!billingAvailable()) return 0
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return 0
  const userId = user.id
  let n = 0
  try {
    // Be appAccountToken filtro plugin'e: serveris pats tikrina obfuscatedExternalAccountId
    const { purchases } = await serial(() => np().getPurchases({ productType: 'inapp' }))
    for (const p of (purchases ?? []) as (NPTransaction & { appAccountToken?: string | null })[]) {
      if (p.appAccountToken && p.appAccountToken !== userId) continue // kito paskyros pirkinys
      if (p.purchaseState && p.purchaseState !== '1') continue // dar laukia apmokėjimo
      const token = p.purchaseToken ?? p.transactionId
      if (!token || !p.productIdentifier) continue
      const r = await submitReceipt('google', p.productIdentifier, token)
      if (r.ok && !r.duplicate) n++
    }
  } catch (e) { console.warn('[iap] recover:', e) }
  return n
}

export type IapPack = IapProduct & { base_amount: number | null; bonus_amount: number; price_eur: number | null; image_url: string | null }

/** Rubinų paketai parduotuvei (iap_products, rūšiuota). */
export async function listRubyPacks(): Promise<IapPack[]> {
  const { data, error } = await createClient().from('iap_products')
    .select('product_id, title, payload, sort_order, base_amount, bonus_amount, price_eur, image_url')
    .eq('active', true).like('product_id', 'ravenof.rubies.%').order('sort_order')
  if (error) { console.warn('[iap] packs:', error.message); return [] }
  return (data as IapPack[]) ?? []
}
