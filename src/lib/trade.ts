// ── Realaus laiko korta↔korta mainai (kliento RPC apvalkalai) ─────────────────
import { createClient } from '@/lib/supabase/client'

export type TradeIncoming = { id: string; fromId: string; username: string | null; displayName: string | null }
export type TradeCard = { name: string; imageUrl: string | null; rarity: string | null; rarityColor: string | null }
export type TradeState = {
  id: string; status: 'pending' | 'active' | 'completed' | 'cancelled'
  aId: string; bId: string; aOffer: string[]; bOffer: string[]
  aConfirmed: boolean; bConfirmed: boolean; aName: string | null; bName: string | null
  cards: Record<string, TradeCard>; me: 'a' | 'b'
}

export async function tradeCreate(target: string): Promise<string | null> {
  const { data, error } = await createClient().rpc('rvn_trade_create', { p_target: target })
  if (error) { console.warn('[trade] create:', error.message); return null }
  return (data as string) ?? null
}
export async function tradeIncoming(): Promise<TradeIncoming[]> {
  const { data, error } = await createClient().rpc('rvn_trade_incoming')
  if (error) return []
  return (data as TradeIncoming[]) ?? []
}
export async function tradeAccept(id: string): Promise<void> { await createClient().rpc('rvn_trade_accept', { p_id: id }) }
export async function tradeCancel(id: string): Promise<void> { await createClient().rpc('rvn_trade_cancel', { p_id: id }) }
export async function tradeSetOffer(id: string, cards: string[]): Promise<void> { await createClient().rpc('rvn_trade_set_offer', { p_id: id, p_cards: cards }) }
export async function tradeConfirm(id: string, confirm: boolean): Promise<{ ok: true; done: boolean } | { error: string }> {
  const { data, error } = await createClient().rpc('rvn_trade_confirm', { p_id: id, p_confirm: confirm })
  if (error) return { error: error.message.replace(/^.*exception\s*/i, '') }
  return data as { ok: true; done: boolean }
}
export async function tradeGet(id: string): Promise<TradeState | null> {
  const { data, error } = await createClient().rpc('rvn_trade_get', { p_id: id })
  if (error) { console.warn('[trade] get:', error.message); return null }
  return (data as TradeState) ?? null
}
