// ── Aukcionas (kliento RPC apvalkalai) ────────────────────────────────────────
import { createClient } from '@/lib/supabase/client'

export type Listing = {
  id: string; price: number; cardId: string; name: string; imageUrl: string | null
  rarity: string | null; rarityColor: string | null; sortOrder: number | null
  faction: string | null; sellerId: string; seller: string | null; createdAt: string
}
export type MyListing = { id: string; price: number; cardId: string; name: string; imageUrl: string | null; rarity: string | null; rarityColor: string | null; createdAt: string }
export type OwnedCard = { cardId: string; name: string; imageUrl: string | null; rarity: string | null; rarityColor: string | null; sortOrder: number | null; quantity: number }

export async function browseListings(card?: string, seller?: string): Promise<Listing[]> {
  const { data, error } = await createClient().rpc('rvn_browse_listings', { p_card: card ?? null, p_seller: seller ?? null, p_limit: 80 })
  if (error) { console.warn('[market] browse:', error.message); return [] }
  return (data as Listing[]) ?? []
}
export async function myListings(): Promise<MyListing[]> {
  const { data, error } = await createClient().rpc('rvn_my_listings')
  if (error) { console.warn('[market] my:', error.message); return [] }
  return (data as MyListing[]) ?? []
}
export async function listCard(cardId: string, price: number): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await createClient().rpc('rvn_list_card', { p_card_id: cardId, p_price: price })
  if (error) return { error: error.message.replace(/^.*exception\s*/i, '') }
  return data as { ok: true }
}
export async function cancelListing(id: string): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await createClient().rpc('rvn_cancel_listing', { p_id: id })
  if (error) return { error: error.message }
  return data as { ok: true }
}
export async function buyListing(id: string): Promise<{ ok: true; gold: number } | { error: string }> {
  const { data, error } = await createClient().rpc('rvn_buy_listing', { p_id: id })
  if (error) return { error: error.message.replace(/^.*exception\s*/i, '') }
  return data as { ok: true; gold: number }
}
export async function myCollection(): Promise<OwnedCard[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('user_collections')
    .select('card_id, quantity, card:cards ( name, image_url, rarity:rarities ( name, color_hex, sort_order ) )')
    .eq('user_id', user.id).gt('quantity', 0)
  type Row = { card_id: string; quantity: number; card: { name: string; image_url: string | null; rarity: { name: string; color_hex: string; sort_order: number } | null } | null }
  return ((data as unknown as Row[]) ?? []).map((r) => ({
    cardId: r.card_id, quantity: r.quantity, name: r.card?.name ?? '?', imageUrl: r.card?.image_url ?? null,
    rarity: r.card?.rarity?.name ?? null, rarityColor: r.card?.rarity?.color_hex ?? null, sortOrder: r.card?.rarity?.sort_order ?? null,
  })).sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0) || a.name.localeCompare(b.name))
}
