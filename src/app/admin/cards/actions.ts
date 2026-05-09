'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type CardFormState = {
  error?: string
  success?: boolean
}

export async function saveCard(
  cardId: string | null,
  prevState: CardFormState,
  formData: FormData,
): Promise<CardFormState> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprisijunges' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { error: 'Neturi admin teisiu' }

  // Parse form
  const name = (formData.get('name') as string ?? '').trim()
  const card_number = (formData.get('card_number') as string ?? '').trim() || null
  const faction_id = formData.get('faction_id') ? Number(formData.get('faction_id')) : null
  const card_type_id = formData.get('card_type_id') ? Number(formData.get('card_type_id')) : null
  const rarity_id = formData.get('rarity_id') ? Number(formData.get('rarity_id')) : null
  const gold_cost = formData.get('gold_cost') ? Number(formData.get('gold_cost')) : null
  const attack = formData.get('attack') !== '' && formData.get('attack') !== null ? Number(formData.get('attack')) : null
  const health = formData.get('health') !== '' && formData.get('health') !== null ? Number(formData.get('health')) : null
  const description = (formData.get('description') as string ?? '').trim() || null
  const effect_text = (formData.get('effect_text') as string ?? '').trim() || null
  const image_url = (formData.get('image_url') as string ?? '').trim() || null
  const is_champion = formData.get('is_champion') === 'on'
  const status = (formData.get('status') as string) ?? 'draft'

  // Validation
  if (!name) return { error: 'Pavadinimas privalomas' }
  if (!faction_id) return { error: 'Frakcija privaloma' }
  if (!card_type_id) return { error: 'Tipas privalomas' }
  if (!rarity_id) return { error: 'Retumas privalomas' }
  if (!gold_cost) return { error: 'Aukso kaina privaloma' }

  const payload = {
    name, card_number, faction_id, card_type_id, rarity_id,
    gold_cost, attack, health, description, effect_text,
    image_url, is_champion, status,
  }

  if (cardId) {
    // Update
    const { error } = await supabase.from('cards').update(payload).eq('id', cardId)
    if (error) return { error: error.message }
  } else {
    // Insert
    const { error } = await supabase.from('cards').insert(payload)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/cards')
  revalidatePath('/cards')
  redirect('/admin/cards')
}
