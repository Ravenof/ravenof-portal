'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'

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
  const user = await getCachedUser()
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
  const lore_text = (formData.get('lore_text') as string ?? '').trim() || null
  const image_url = (formData.get('image_url') as string ?? '').trim() || null
  const is_champion = formData.get('is_champion') === 'on'
  const status = (formData.get('status') as string) ?? 'draft'
  // virtualaus žaidimo konfigūracija (GameplayConfigEditor hidden input)
  let gameplay: unknown = null
  const gameplayRaw = (formData.get('gameplay') as string ?? '').trim()
  if (gameplayRaw) {
    try { gameplay = JSON.parse(gameplayRaw) } catch { gameplay = null }
  }

  // Validation
  if (!name) return { error: 'Pavadinimas privalomas' }
  if (!faction_id) return { error: 'Frakcija privaloma' }
  if (!card_type_id) return { error: 'Tipas privalomas' }
  if (!rarity_id) return { error: 'Retumas privalomas' }
  if (!gold_cost) return { error: 'Aukso kaina privaloma' }

  const payload = {
    name, card_number, faction_id, card_type_id, rarity_id,
    gold_cost, attack, health, description, effect_text, lore_text, gameplay,
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
  revalidatePath('/cards', 'layout')
  revalidateTag('cards') // invalidates deck-builder card cache
  redirect('/admin/cards')
}

export async function deleteCard(cardId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Neturi admin teisių' }

  // Remove from deck_cards and user_collections first
  await supabase.from('deck_cards').delete().eq('card_id', cardId)
  await supabase.from('user_collections').delete().eq('card_id', cardId)

  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) return { error: error.message }

  revalidatePath('/admin/cards')
  revalidatePath('/cards')
  revalidateTag('cards') // invalidates deck-builder card cache
  return {}
}

// ── Bulk actions ──────────────────────────────────────────────────────────────

export type BulkChanges = {
  status?: string
  faction_id?: number
  card_type_id?: number
  rarity_id?: number
}

async function requireAdmin() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { supabase, error: 'Neprisijungęs' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase, error: 'Neturi admin teisių' }
  return { supabase, error: null }
}

function revalidateCards() {
  revalidatePath('/admin/cards')
  revalidatePath('/cards')
  revalidateTag('cards')
}

export async function bulkUpdateCards(
  cardIds: string[],
  changes: BulkChanges,
): Promise<{ error?: string; updated?: number }> {
  if (cardIds.length === 0) return { error: 'Nepažymėta nė viena korta' }

  const payload: Record<string, unknown> = {}
  if (changes.status) payload.status = changes.status
  if (changes.faction_id) payload.faction_id = changes.faction_id
  if (changes.card_type_id) payload.card_type_id = changes.card_type_id
  if (changes.rarity_id) payload.rarity_id = changes.rarity_id
  if (Object.keys(payload).length === 0) return { error: 'Nepasirinktas nė vienas keičiamas laukas' }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const { error } = await supabase.from('cards').update(payload).in('id', cardIds)
  if (error) return { error: error.message }

  revalidateCards()
  return { updated: cardIds.length }
}

export async function bulkDeleteCards(
  cardIds: string[],
): Promise<{ error?: string; deleted?: number }> {
  if (cardIds.length === 0) return { error: 'Nepažymėta nė viena korta' }

  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  // Pirma išvalome susijusius įrašus (kaip ir vienos kortos trynime)
  await supabase.from('deck_cards').delete().in('card_id', cardIds)
  await supabase.from('user_collections').delete().in('card_id', cardIds)

  const { error } = await supabase.from('cards').delete().in('id', cardIds)
  if (error) return { error: error.message }

  revalidateCards()
  return { deleted: cardIds.length }
}
