// ── Craft (dublikatai -> Esencija; kūrimas) — kliento RPC apvalkalai ─────────
import { createClient } from '@/lib/supabase/client'

export type CraftConfig = {
  disenchant: Record<string, number>; craft: Record<string, number>; max_copies: Record<string, number>
}
export async function getCraftConfig(): Promise<{ config: CraftConfig; essence: number } | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_craft_config')
  if (error) { console.warn('[craft] cfg:', error.message); return null }
  return (data ?? null) as { config: CraftConfig; essence: number } | null
}

type Ok = { ok: true; essence?: number; essenceGained?: number; cost?: number } | { error: string; cost?: number; excess?: number }
export async function disenchantCard(cardId: string, count = 1): Promise<Ok | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_disenchant_card', { p_card_id: cardId, p_count: count })
  if (error) return { error: error.message }
  return (data ?? null) as Ok | null
}
export async function craftCard(cardId: string): Promise<Ok | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_craft_card', { p_card_id: cardId })
  if (error) return { error: error.message }
  return (data ?? null) as Ok | null
}

/** Serverio klaidos kodas → i18n raktas (tekstas gimsta UI per t()). */
export const CRAFT_ERR_KEY: Record<string, string> = {
  not_enough_essence: 'errors.craft.notEnoughEssence', max_copies: 'errors.craft.maxCopies',
  no_duplicates: 'errors.craft.noDuplicates', not_owned: 'errors.craft.notOwned',
  not_found: 'errors.craft.notFound', bad_count: 'errors.craft.badCount',
}
/** @deprecated naudok CRAFT_ERR_KEY + t() */
export const CRAFT_ERR_LT = CRAFT_ERR_KEY
