// ════════════════════════════════════════════════════════════════════════════
// Tutorial seed/rebuild — apply code-defined LessonSeed[] to tutorial_lessons
// (safe upsert keyed on seed_key). Runs with admin RLS. Mirrors campaign pattern.
//   • 'merge' : create missing; fill only empty columns (preserve admin edits)
//   • 'reset' : overwrite all columns from the seed
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import type { LessonSeed } from './lessonTypes'

export type RebuildMode = 'merge' | 'reset'
export interface RebuildReport { ok: boolean; created: number; updated: number; skipped: number; log: string[]; error?: string }

const isEmpty = (v: unknown) =>
  v === null || v === undefined || v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0)

export async function rebuildTutorial(seeds: LessonSeed[], mode: RebuildMode = 'merge'): Promise<RebuildReport> {
  const supabase = createClient()
  const log: string[] = []
  let created = 0, updated = 0, skipped = 0
  try {
    for (const s of seeds) {
      const desired: Record<string, unknown> = {
        seed_key: s.seedKey, slug: s.slug, sort_order: s.sortOrder,
        title: s.title, subtitle: s.subtitle ?? null, description: s.description ?? null,
        icon: s.icon ?? null, est_minutes: s.estMinutes ?? 4,
        config: s.config, reward_payload: s.reward, status: s.status ?? 'active',
      }
      const { data: ex } = await supabase.from('tutorial_lessons').select('*').eq('seed_key', s.seedKey).maybeSingle()
      if (!ex) {
        const { error } = await supabase.from('tutorial_lessons').insert(desired)
        if (error) throw error
        created++; log.push(`➕ ${s.title}`)
      } else if (mode === 'reset') {
        const { error } = await supabase.from('tutorial_lessons').update(desired).eq('seed_key', s.seedKey)
        if (error) throw error
        updated++; log.push(`✏️ ${s.title} (perrašyta)`)
      } else {
        const patch: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(desired)) if (isEmpty((ex as Record<string, unknown>)[k])) patch[k] = v
        if (Object.keys(patch).length) { await supabase.from('tutorial_lessons').update(patch).eq('seed_key', s.seedKey); updated++; log.push(`✏️ ${s.title}`) }
        else { skipped++; }
      }
    }
    log.push(`✓ ${mode === 'reset' ? 'Perrašyta' : 'Sujungta'}: +${created} / ~${updated} / =${skipped}`)
    return { ok: true, created, updated, skipped, log }
  } catch (e) {
    return { ok: false, created, updated, skipped, log, error: (e as Error).message }
  }
}
