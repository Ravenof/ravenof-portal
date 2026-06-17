'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getCachedUser } from '@/lib/supabase/server'

export type UpdateRoleState = { error?: string; success?: boolean }

const ALLOWED_ROLES = ['user', 'event_moderator', 'admin']

export async function updateUserRole(
  targetUserId: string,
  prevState: UpdateRoleState,
  formData: FormData,
): Promise<UpdateRoleState> {
  const supabase = await createClient()

  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }

  // Only admin can change roles
  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!adminProfile || adminProfile.role !== 'admin') return { error: 'Neturi admin teisių' }

  // Prevent self-demotion
  if (targetUserId === user.id) return { error: 'Negali keisti savo rolės' }

  const newRole = (formData.get('role') as string)?.trim()
  if (!ALLOWED_ROLES.includes(newRole)) return { error: 'Neleistina rolė' }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function deleteUser(targetUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return { error: 'Neturi admin teisių' }
  if (targetUserId === user.id) return { error: 'Negali ištrinti savo paskyros' }

  // profiles FK cascades to most tables; explicitly clean up auth-linked data
  const { error } = await supabase.from('profiles').delete().eq('id', targetUserId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return {}
}

export async function setBanStatus(
  targetUserId: string,
  banned: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (adminProfile?.role !== 'admin') return { error: 'Neturi admin teisių' }
  if (targetUserId === user.id) return { error: 'Negali užblokuoti savęs' }

  const { error } = await supabase
    .from('profiles')
    .update({ role: banned ? 'banned' : 'user' })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return {}
}

export async function adminGiveGold(targetUserId: string, amount: number): Promise<{ error?: string; gold?: number }> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }
  const { data: ap } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (ap?.role !== 'admin') return { error: 'Neturi admin teisių' }
  if (!Number.isFinite(amount) || amount === 0) return { error: 'Nurodyk sumą' }
  const { data, error } = await supabase.rpc('rvn_admin_grant', { p_target: targetUserId, p_gold: Math.trunc(amount), p_pack_id: null, p_packs: 0 })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { gold: data as number }
}

export async function adminGivePacks(targetUserId: string, qty: number): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }
  const { data: ap } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (ap?.role !== 'admin') return { error: 'Neturi admin teisių' }
  if (!Number.isFinite(qty) || qty <= 0) return { error: 'Nurodyk kiekį' }
  const { data: pack } = await supabase.from('card_packs').select('id').eq('is_active', true).order('sort_order').limit(1).maybeSingle()
  if (!pack) return { error: 'Nėra aktyvios pakuotės' }
  const { error } = await supabase.rpc('rvn_admin_grant', { p_target: targetUserId, p_gold: 0, p_pack_id: (pack as { id: string }).id, p_packs: Math.trunc(qty) })
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}
