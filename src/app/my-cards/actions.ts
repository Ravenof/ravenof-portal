'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getCachedUser } from '@/lib/supabase/server'

export async function updateCardQuantity(cardId: string, delta: number): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }

  // Fetch current quantity
  const { data: row, error: fetchErr } = await supabase
    .from('user_collections')
    .select('quantity')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .maybeSingle()

  if (fetchErr) return { error: fetchErr.message }
  if (!row) return { error: 'Korta nerasta kolekcijoje' }

  const newQty = row.quantity + delta

  if (newQty <= 0) {
    // Delete row
    const { error: delErr } = await supabase
      .from('user_collections')
      .delete()
      .eq('user_id', user.id)
      .eq('card_id', cardId)
    if (delErr) return { error: delErr.message }
  } else {
    const { error: upErr } = await supabase
      .from('user_collections')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('card_id', cardId)
    if (upErr) return { error: upErr.message }
  }

  revalidatePath('/my-cards')
  return {}
}

export async function removeCard(cardId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { error } = await supabase
    .from('user_collections')
    .delete()
    .eq('user_id', user.id)
    .eq('card_id', cardId)

  if (error) return { error: error.message }

  revalidatePath('/my-cards')
  return {}
}
