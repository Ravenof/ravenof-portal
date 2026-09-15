'use server'

// ── Admin: klaidų pranešimų būsena / pastaba ─────────────────────────────────
import { revalidatePath } from 'next/cache'
import { createClient, getCachedUser } from '@/lib/supabase/server'

const STATUSES = ['new', 'triaged', 'in_progress', 'fixed', 'wontfix', 'duplicate']

export async function updateBugStatus(id: number, status: string, adminNote: string | null, duplicateOf: number | null): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Neturi admin teisių' }
  if (!STATUSES.includes(status)) return { error: 'Bloga būsena' }
  const { error } = await supabase.from('bug_reports').update({ status, admin_note: adminNote?.trim() || null, duplicate_of: status === 'duplicate' ? duplicateOf : null }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/bugs')
  return {}
}
