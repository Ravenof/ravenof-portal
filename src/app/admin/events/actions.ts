'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { RegistrationStatus } from '@/types'

export type EventFormState = { error?: string }

export async function saveEvent(
  eventId: string | null,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { error: 'Ne admin' }

  const title     = (formData.get('title') as string)?.trim()
  const starts_at = (formData.get('starts_at') as string)?.trim()

  if (!title)     return { error: 'Pavadinimas privalomas' }
  if (!starts_at) return { error: 'Pradžios data privaloma' }

  const ends_at_raw  = (formData.get('ends_at') as string)?.trim()
  const capacity_raw = (formData.get('capacity') as string)?.trim()

  const payload = {
    title,
    description: (formData.get('description') as string)?.trim() || null,
    location:    (formData.get('location') as string)?.trim() || null,
    starts_at,
    ends_at:     ends_at_raw || null,
    capacity:    capacity_raw ? parseInt(capacity_raw, 10) : null,
    status:      (formData.get('status') as string) || 'draft',
    created_by:  user.id,
  }

  if (eventId) {
    const { error } = await supabase.from('events').update(payload).eq('id', eventId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('events').insert(payload)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/events')
  revalidatePath('/events')
  redirect('/admin/events')
}

export async function updateRegistrationStatus(
  regId: string,
  status: RegistrationStatus,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { error: 'Not admin' }

  const { data: reg } = await supabase
    .from('event_registrations')
    .select('event_id')
    .eq('id', regId)
    .single()

  const { error } = await supabase
    .from('event_registrations')
    .update({ status })
    .eq('id', regId)

  if (error) return { error: error.message }

  if (reg?.event_id) revalidatePath('/admin/events/' + reg.event_id + '/edit')
  return {}
}
