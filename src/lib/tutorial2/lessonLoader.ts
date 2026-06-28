// ════════════════════════════════════════════════════════════════════════════
// Tutorial loader — fetch lessons + this user's progress (rvn_tutorial_state)
// and report completion (rvn_tutorial_complete).
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import type { LessonRow, LessonProgressRow, LessonReward } from './lessonTypes'

export interface TutorialState {
  lessons: LessonRow[]
  progress: Record<string, LessonProgressRow>  // keyed by lesson_id
}

export async function loadTutorialState(): Promise<TutorialState> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_tutorial_state')
  if (error || !data) return { lessons: [], progress: {} }
  const lessons = (data.lessons ?? []) as LessonRow[]
  const progress: Record<string, LessonProgressRow> = {}
  for (const p of (data.progress ?? []) as LessonProgressRow[]) progress[p.lesson_id] = p
  lessons.sort((a, b) => a.sort_order - b.sort_order)
  return { lessons, progress }
}

export async function loadLessonBySlug(slug: string): Promise<{ lesson: LessonRow | null; progress: Record<string, LessonProgressRow> }> {
  const { lessons, progress } = await loadTutorialState()
  return { lesson: lessons.find((l) => l.slug === slug) ?? null, progress }
}

export interface CompleteResult { ok: boolean; firstTime: boolean; reward: LessonReward }

export async function completeLesson(lessonId: string, timeMs: number): Promise<CompleteResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_tutorial_complete', { p_lesson: lessonId, p_time_ms: timeMs })
  if (error || !data?.ok) return { ok: false, firstTime: false, reward: {} }
  return { ok: true, firstTime: !!data.firstTime, reward: (data.reward ?? {}) as LessonReward }
}

/** A lesson is unlocked when the previous (by sort_order) is completed, or it's first. */
export function isLessonUnlocked(lessons: LessonRow[], progress: Record<string, LessonProgressRow>, idx: number): boolean {
  if (idx <= 0) return true
  const prev = lessons[idx - 1]
  return !!progress[prev.id]?.completed
}
