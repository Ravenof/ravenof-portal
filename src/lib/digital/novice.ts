// ── Naujoko būsena: ar žaidėjas dar tik pradeda (pagrindų pamokos + sužaistos kovos) ──
// Naudoja Pradžia („Kas toliau"), kasdienių atlygių auto-nukreipimas, pasveikinimo dovana
// ir Reitingo ekrano priminimas. Veteranų (daug kovų, bet be mokymų) neliečiam.
import { createClient } from '@/lib/supabase/client'
import { loadTutorialState } from '@/lib/tutorial2/lessonLoader'
import { CORE_LESSON_KEYS } from '@/data/tutorialLessons/lessonSeeds'

export type NoviceState = {
  /** rodyti naujoko kelią (pagrindai neįveikti IR kovų mažai) */
  novice: boolean
  coreDone: boolean
  lesson1Done: boolean
  /** kita neįveikta pagrindų pamoka */
  nextLesson: { title: string; subtitle: string | null } | null
  coreTotal: number
  coreCompleted: number
  matches: number
}

const VETERAN_MATCHES = 10
let cache: { at: number; uid: string; v: NoviceState } | null = null

export function invalidateNovice(): void { cache = null }

export async function getNoviceState(): Promise<NoviceState | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    const uid = data.user?.id
    if (!uid) return null
    if (cache && cache.uid === uid && Date.now() - cache.at < 20_000) return cache.v
    const [st, mc] = await Promise.all([
      loadTutorialState(),
      supabase.from('matches').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    ])
    const core = st.lessons.filter((l) => CORE_LESSON_KEYS.includes(l.seed_key ?? ''))
    if (!core.length) return null // mokymai neužsėti – naujoko kelio nerodom
    const done = core.filter((l) => st.progress[l.id]?.completed)
    const next = core.find((l) => !st.progress[l.id]?.completed) ?? null
    const matches = mc.count ?? 0
    const coreDone = done.length === core.length
    const v: NoviceState = {
      novice: !coreDone && matches < VETERAN_MATCHES,
      coreDone,
      lesson1Done: !!st.progress[core[0].id]?.completed,
      nextLesson: next ? { title: next.title, subtitle: next.subtitle ?? null } : null,
      coreTotal: core.length, coreCompleted: done.length, matches,
    }
    cache = { at: Date.now(), uid, v }
    return v
  } catch { return null }
}
