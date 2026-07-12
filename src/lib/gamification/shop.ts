// ── Parduotuvė v2 (multi-valiutė: Sidabras/Rubinai) — kliento RPC apvalkalai ──
import { createClient } from '@/lib/supabase/client'

export type ShopPrices = { silver?: number; rubies?: number; real_money?: number }
export type ShopItem = {
  id: number; slug: string; itemType: string; name: string; description: string | null
  rarity: string | null; payload: Record<string, unknown>[]; sortOrder: number; prices: ShopPrices
}

export async function getShop(): Promise<ShopItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_shop')
  if (error) { console.warn('[shop] get:', error.message); return [] }
  return (data as ShopItem[]) ?? []
}

export type PurchaseResult = { ok: true; balances?: { silver: number; rubies: number; essence: number } } | { error: string }
export async function purchaseShopItem(id: number, currency: 'silver' | 'rubies'): Promise<PurchaseResult | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_purchase_shop_item', { p_item_id: id, p_currency: currency })
  if (error) return { error: error.message }
  return (data ?? null) as PurchaseResult | null
}

// label pakeistas labelKey (i18n): tekstas — locales shop.sections.*
export const SHOP_SECTIONS: { key: string; labelKey: string; types: string[] }[] = [
  { key: 'packs',   labelKey: 'shop.sections.packs',   types: ['pack'] },
  { key: 'backs',   labelKey: 'shop.sections.backs',   types: ['card_back'] },
  { key: 'avatars', labelKey: 'shop.sections.avatars', types: ['player_avatar'] },
  { key: 'decks',   labelKey: 'shop.sections.decks',   types: ['faction_deck', 'bundle'] },
  { key: 'rubies',  labelKey: 'shop.sections.rubies',  types: ['rubies_bundle'] },
]
/** Klaidų kodai -> i18n raktai (shop.err.*). */
export const PURCHASE_ERR_KEY: Record<string, string> = {
  not_enough: 'shop.err.not_enough', no_price: 'shop.err.no_price', iap_required: 'shop.err.iap_required',
  not_found: 'shop.err.not_found', bad_currency: 'shop.err.bad_currency',
}
