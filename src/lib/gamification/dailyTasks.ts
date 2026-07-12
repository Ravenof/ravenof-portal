// ── Dienos užduotys (kliento RPC apvalkalai) ─────────────────────────────────
import { createClient } from '@/lib/supabase/client'

export type Difficulty = 'easy' | 'medium' | 'hard'
export type DailyTask = {
  id: number; templateId: number; difficulty: Difficulty; objectiveType: string; title: string; description: string
  progress: number; target: number; rewardPayload: Record<string, unknown>[]; completed: boolean; claimed: boolean
}
export type DailyTasksState = {
  dateKey: string; tasks: DailyTask[]; allDone: boolean; chestClaimed: boolean
  reroll: { freeUsed: boolean; paidCount: number }
}

export async function getDailyTasks(): Promise<DailyTasksState | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_daily_tasks')
  if (error) { console.warn('[daily] get:', error.message); return null }
  const d = data as (DailyTasksState & { error?: string }) | null
  if (!d || d.error) return null
  return d
}

type Ok = { ok: true; payload?: Record<string, unknown>[] } | { error: string }
export async function claimDailyTask(id: number): Promise<Ok | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_claim_daily_task', { p_task_id: id })
  if (error) return { error: error.message }
  return (data ?? null) as Ok | null
}
export async function claimDailyChest(): Promise<Ok | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_claim_daily_chest')
  if (error) return { error: error.message }
  return (data ?? null) as Ok | null
}
export async function rerollDailyTask(id: number): Promise<Ok | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_reroll_daily_task', { p_task_id: id })
  if (error) return { error: error.message }
  return (data ?? null) as Ok | null
}

/** i18n raktai (tekstas – per t() render'e). */
export const DIFF_LABEL: Record<Difficulty, string> = { easy: 'quests.daily.easy', medium: 'quests.daily.medium', hard: 'quests.daily.hard' }
export const DIFF_ACCENT: Record<Difficulty, string> = { easy: '52,211,153', medium: '96,165,250', hard: '239,68,68' }
