// ════════════════════════════════════════════════════════════════════════════
// Tutorial analytics — fire-and-forget event logging (per-step timing, wrong
// actions, drop-off). All writes go through rvn_tutorial_log_event (SECURITY
// DEFINER). Never throws into the UI; failures are swallowed.
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'

export type TutorialEventType =
  | 'lesson_start' | 'lesson_complete' | 'lesson_skip' | 'lesson_quit'
  | 'step_start' | 'step_complete' | 'wrong_action' | 'explanation_skip' | 'hint_shown'

export class TutorialAnalytics {
  private lessonSlug: string
  private lessonId: string | null
  private stepStartedAt = 0
  private lessonStartedAt = 0

  constructor(lessonSlug: string, lessonId: string | null) {
    this.lessonSlug = lessonSlug
    this.lessonId = lessonId
  }

  private async fire(step: string | null, type: TutorialEventType, valueMs?: number, meta?: Record<string, unknown>) {
    try {
      const supabase = createClient()
      await supabase.rpc('rvn_tutorial_log_event', {
        p_lesson_slug: this.lessonSlug,
        p_lesson: this.lessonId,
        p_step: step,
        p_type: type,
        p_value: valueMs ?? null,
        p_meta: meta ?? {},
      })
    } catch { /* analytics niekada nelaužia UI */ }
  }

  lessonStart() { this.lessonStartedAt = Date.now(); void this.fire(null, 'lesson_start') }
  lessonComplete() { void this.fire(null, 'lesson_complete', Date.now() - this.lessonStartedAt) }
  lessonSkip() { void this.fire(null, 'lesson_skip') }
  lessonQuit(step: string | null) { void this.fire(step, 'lesson_quit') }

  stepStart(step: string) { this.stepStartedAt = Date.now(); void this.fire(step, 'step_start') }
  stepComplete(step: string) { void this.fire(step, 'step_complete', this.stepStartedAt ? Date.now() - this.stepStartedAt : undefined) }
  wrongAction(step: string, meta?: Record<string, unknown>) { void this.fire(step, 'wrong_action', undefined, meta) }
  explanationSkip(step: string) { void this.fire(step, 'explanation_skip') }
  hintShown(step: string) { void this.fire(step, 'hint_shown') }
}
