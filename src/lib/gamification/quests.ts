// ── Dienos užduotys + prisijungimo serija (kliento RPC apvalkalai) ────────────
import { createClient } from '@/lib/supabase/client'

export type QuestEvent = 'pve_win' | 'pvp_win' | 'open_pack' | 'play_match'

export type DailyQuest = {
  quest_key: string
  title: string
  description: string
  event_type: string
  progress: number
  target: number
  reward_payload: Record<string, unknown>
  claimed: boolean
}

export type LoginCheckin = {
  streak: number
  longest: number
  reward: number
  already: boolean
  bonusBooster: boolean
}

/** Užtikrina ir grąžina šiandienos užduotis (3/dieną). */
export async function getDailyQuests(): Promise<DailyQuest[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_daily_quests')
  if (error) { console.warn('[quests] get:', error.message); return [] }
  return (data as DailyQuest[]) ?? []
}

/** Praneša įvykį (pergalė / kova / pakuotės atplėšimas). Fire-and-forget. */
export async function reportQuestEvent(event: QuestEvent, amount = 1): Promise<DailyQuest[] | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_quest_event', { p_event: event, p_amount: amount })
  if (error) { console.warn('[quests] event:', error.message); return null }
  return (data as DailyQuest[]) ?? null
}

/** Atsiima užduoties atlygį. */
export async function claimQuest(questKey: string): Promise<{ ok: true; reward: Record<string, unknown> } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_claim_quest', { p_quest_key: questKey })
  if (error) return { error: error.message }
  return data as { ok: true; reward: Record<string, unknown> }
}

/** Dienos prisijungimo check-in (idempotentiška). */
export async function loginCheckin(): Promise<LoginCheckin | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_login_checkin')
  if (error) { console.warn('[quests] checkin:', error.message); return null }
  return (data as LoginCheckin) ?? null
}
