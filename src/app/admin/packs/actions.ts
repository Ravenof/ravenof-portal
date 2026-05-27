'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Neprisijungta')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Nėra teisių')
  return supabase
}

export async function savePack(formData: FormData): Promise<void> {
  const supabase = await requireAdmin()
  const id = formData.get('_id') as string
  const payload = {
    name: (formData.get('name') as string).trim(),
    description: (formData.get('description') as string || null),
    image_url: (formData.get('image_url') as string || null),
    cards_per_pack: parseInt(formData.get('cards_per_pack') as string, 10) || 5,
    daily_limit: parseInt(formData.get('daily_limit') as string, 10) ?? 1,
    is_active: formData.get('is_active') === 'true',
    sort_order: parseInt(formData.get('sort_order') as string, 10) || 0,
  }
  if (id) {
    await supabase.from('card_packs').update(payload).eq('id', id)
  } else {
    await supabase.from('card_packs').insert(payload)
  }
  revalidatePath('/admin/packs')
  revalidatePath('/packs')
  redirect('/admin/packs')
}

export async function deletePack(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin()
    await supabase.from('card_packs').delete().eq('id', id)
    revalidatePath('/admin/packs')
    revalidatePath('/packs')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

export async function savePackCardPool(packId: string, formData: FormData): Promise<void> {
  const supabase = await requireAdmin()
  // Parse: card_ids are newline-separated
  const raw = (formData.get('card_ids') as string ?? '').trim()
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const defaultWeight = parseInt(formData.get('default_weight') as string, 10) || 10

  if (lines.length === 0) {
    revalidatePath('/admin/packs')
    redirect('/admin/packs/' + packId)
    return
  }

  // Verify card IDs exist
  const { data: existingCards } = await supabase
    .from('cards')
    .select('id, name')
    .in('id', lines)
  const validIds = new Set((existingCards ?? []).map((c: { id: string }) => c.id))

  const rows = lines
    .filter((id) => validIds.has(id))
    .map((card_id) => ({ pack_id: packId, card_id, weight: defaultWeight }))

  if (rows.length > 0) {
    await supabase.from('pack_card_pool').upsert(rows, { onConflict: 'pack_id,card_id' })
  }
  revalidatePath('/admin/packs')
  redirect('/admin/packs/' + packId)
}

export async function removeCardFromPool(packId: string, cardId: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin()
    await supabase.from('pack_card_pool').delete().eq('pack_id', packId).eq('card_id', cardId)
    revalidatePath('/admin/packs')
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}
