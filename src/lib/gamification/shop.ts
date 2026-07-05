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

export const SHOP_SECTIONS: { key: string; label: string; types: string[] }[] = [
  { key: 'packs',   label: 'Pakuotės',        types: ['pack'] },
  { key: 'backs',   label: 'Kortų nugarėlės', types: ['card_back'] },
  { key: 'avatars', label: 'Žaidėjo avatarai', types: ['player_avatar'] },
  { key: 'decks',   label: 'Kaladės',          types: ['faction_deck', 'bundle'] },
  { key: 'rubies',  label: 'Rubinai',          types: ['rubies_bundle'] },
]
export const PURCHASE_ERR_LT: Record<string, string> = {
  not_enough: 'Nepakanka valiutos.', no_price: 'Kaina neprieinama.', iap_required: 'Šis paketas perkamas per programėlės parduotuvę.',
  not_found: 'Prekė nerasta.', bad_currency: 'Netinkama valiuta.',
}
