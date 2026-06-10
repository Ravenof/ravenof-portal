'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getCachedUser } from '@/lib/supabase/server'

export type RegisterResult = { error?: string; success?: string }

export async function registerForEvent(eventId: string): Promise<RegisterResult> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Reikia prisijungti' }

  // Check capacity
  const { data: event } = await supabase
    .from('events')
    .select('capacity, status')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Renginys nerastas' }
  if (event.status !== 'published') return { error: 'Registracija neuždara' }

  if (event.capacity !== null) {
    const { count } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('status', ['registered', 'attended'])
    if ((count ?? 0) >= event.capacity) return { error: 'Vietų nebėra' }
  }

  const { error } = await supabase
    .from('event_registrations')
    .upsert({ event_id: eventId, user_id: user.id, status: 'registered' }, { onConflict: 'event_id,user_id' })

  if (error) return { error: error.message }

  revalidatePath('/events/' + eventId)
  return { success: 'Sėkmingai užsiregistravote!' }
}

export async function cancelRegistration(eventId: string): Promise<RegisterResult> {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) return { error: 'Reikia prisijungti' }

  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/events/' + eventId)
  return { success: 'Registracija atšaukta' }
}
