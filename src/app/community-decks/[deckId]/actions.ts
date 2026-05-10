'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addComment(deckId: string, body: string): Promise<{ error?: string }> {
  const trimmed = body.trim()
  if (!trimmed) return { error: 'Komentaras negali būti tuščias' }
  if (trimmed.length > 1000) return { error: 'Komentaras per ilgas (max 1000 simbolių)' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Reikia prisijungti' }

  const { error } = await supabase
    .from('deck_comments')
    .insert({ deck_id: deckId, user_id: user.id, body: trimmed })

  if (error) return { error: error.message }

  revalidatePath(`/community-decks/${deckId}`)
  return {}
}

export async function deleteComment(commentId: string, deckId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Reikia prisijungti' }

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('deck_comments')
    .update({ status: 'deleted', updated_at: new Date().toISOString() })
    .eq('id', commentId)

  if (!isAdmin) {
    query = query.eq('user_id', user.id)
  }

  const { error } = await query
  if (error) return { error: error.message }

  revalidatePath(`/community-decks/${deckId}`)
  return {}
}
