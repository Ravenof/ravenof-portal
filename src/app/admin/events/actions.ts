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
  if (!profile || !['admin', 'event_moderator'].includes(profile.role)) return { error: 'Ne admin' }

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
    event_type:  (formData.get('event_type') as string) || 'playtestas',
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
  if (!profile || !['admin', 'event_moderator'].includes(profile.role)) return { error: 'Not admin' }

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


// ── TASK 6-8: startTournament ─────────────────────────────────────────────────

export async function startTournament(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Auth + role check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'event_moderator'].includes(profile.role)) {
    return { error: 'Neturi teisės' }
  }

  // Validate event
  const { data: event } = await supabase
    .from('events')
    .select('id, event_type, tournament_status, status')
    .eq('id', eventId)
    .single()

  if (!event)                              return { error: 'Renginys nerastas' }
  if (event.event_type !== 'turnyras')     return { error: 'Renginys nėra turnyras' }
  if (event.tournament_status === 'active')    return { error: 'Turnyras jau vyksta' }
  if (event.tournament_status === 'completed') return { error: 'Turnyras jau baigtas' }

  // Fetch registered players
  const { data: regs } = await supabase
    .from('event_registrations')
    .select('user_id')
    .eq('event_id', eventId)
    .in('status', ['registered', 'attended'])

  if (!regs || regs.length < 2) {
    return { error: 'Reikia bent 2 dalyvių turnyrui pradėti' }
  }

  const playerUserIds = regs.map((r: { user_id: string }) => r.user_id)
  const N = playerUserIds.length

  // Idempotent: reset if restarting
  await supabase.from('tournament_matches').delete().eq('event_id', eventId)
  await supabase.from('tournament_players').delete().eq('event_id', eventId)

  // Seed players (random order for v1)
  const shuffled = [...playerUserIds].sort(() => Math.random() - 0.5)
  const playerInserts = shuffled.map((userId: string, idx: number) => ({
    event_id: eventId,
    user_id:  userId,
    seed:     idx + 1,
  }))

  const { data: insertedPlayers, error: playerError } = await supabase
    .from('tournament_players')
    .insert(playerInserts)
    .select('id, seed, user_id')

  if (playerError || !insertedPlayers) {
    return { error: 'Klaida kuriant žaidėjus: ' + (playerError?.message ?? 'unknown') }
  }

  // Sort by seed ascending
  const players = [...insertedPlayers].sort(
    (a: { seed: number }, b: { seed: number }) => a.seed - b.seed
  )

  // TASK 8: Generate round 1 matches — seed 1 vs N, seed 2 vs N-1, …
  // Odd count: highest seed gets a bye (auto-wins)
  const matchCount = Math.ceil(N / 2)
  const matchInserts = []

  for (let i = 0; i < matchCount; i++) {
    const p1    = players[i]
    const p2Idx = N - 1 - i
    const isBye = p2Idx <= i          // overlapping indices → bye
    const p2    = isBye ? null : players[p2Idx]

    matchInserts.push({
      event_id:     eventId,
      round:        1,
      match_number: i + 1,
      player1_id:   p1.id,
      player2_id:   p2?.id ?? null,
      winner_id:    isBye ? p1.id : null,
      is_bye:       isBye,
      bracket:      'winners',
      status:       isBye ? 'completed' : 'pending',
    })
  }

  const { error: matchError } = await supabase
    .from('tournament_matches')
    .insert(matchInserts)

  if (matchError) {
    return { error: 'Klaida kuriant rungtynes: ' + matchError.message }
  }

  // Update event tournament_status → active
  const { error: eventError } = await supabase
    .from('events')
    .update({ tournament_status: 'active' })
    .eq('id', eventId)

  if (eventError) {
    return { error: 'Klaida atnaujinant renginį: ' + eventError.message }
  }

  revalidatePath('/admin/events/' + eventId + '/edit')
  revalidatePath('/events/' + eventId)
  return {}
}
