'use server'

// ── Admin ŽMK kortų CRUD ──────────────────────────────────────────────────────

import { revalidatePath } from 'next/cache'
import { createClient, getCachedUser } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { supabase, ok: false }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, ok: profile?.role === 'admin' }
}

export type ZmkFormState = { error?: string; success?: boolean }

export async function saveZmkCard(id: string | null, _prev: ZmkFormState, formData: FormData): Promise<ZmkFormState> {
  const { supabase, ok } = await requireAdmin()
  if (!ok) return { error: 'Neturi teisių.' }

  const payload = {
    name: (formData.get('name') as string ?? '').trim(),
    description: (formData.get('description') as string ?? '').trim() || null,
    value: (formData.get('value') as string) ?? '+0',
    count: Math.max(1, Math.min(20, Number(formData.get('count') ?? 1))),
    mode: (formData.get('mode') as string) === 'draw' ? 'draw' : 'auto',
    effect_note: (formData.get('effect_note') as string ?? '').trim() || null,
    image_url: (formData.get('image_url') as string ?? '').trim() || null,
    sort_order: Number(formData.get('sort_order') ?? 0),
    active: formData.get('active') === 'on',
  }
  if (!payload.name) return { error: 'Pavadinimas privalomas.' }

  const { error } = id
    ? await supabase.from('zmk_cards').update(payload).eq('id', id)
    : await supabase.from('zmk_cards').insert(payload)
  if (error) return { error: error.message }
  revalidatePath('/admin/zmk')
  return { success: true }
}

export async function deleteZmkCard(id: string): Promise<ZmkFormState> {
  const { supabase, ok } = await requireAdmin()
  if (!ok) return { error: 'Neturi teisių.' }
  const { error } = await supabase.from('zmk_cards').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/zmk')
  return { success: true }
}
