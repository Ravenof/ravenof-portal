'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type UpdateRoleState = { error?: string; success?: boolean }

const ALLOWED_ROLES = ['user', 'event_moderator', 'admin']

export async function updateUserRole(
  targetUserId: string,
  prevState: UpdateRoleState,
  formData: FormData,
): Promise<UpdateRoleState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
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
  const { data: { user } } = await supabase.auth.getUser()
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
  const { data: { user } } = await supabase.auth.getUser()
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
