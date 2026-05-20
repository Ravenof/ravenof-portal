'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { RegistrationStatus } from '@/types'
import {
  advanceTournamentAfterConfirmedMatch,
  recalculateTournamentBracket as recalcHelper,
} from '@/lib/tournament/advancement'
import { awardTournamentRewards } from '@/lib/tournament/rewards'

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
    event_type:  (['playtestas','turnyras','kita'].includes(formData.get('event_type') as string) ? formData.get('event_type') as string : 'playtestas'),
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


// -- startTournament

export async function startTournament(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'event_moderator'].includes(profile.role)) {
    return { error: 'Neturi teisės' }
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, event_type, tournament_status, status')
    .eq('id', eventId)
    .single()

  if (!event)                              return { error: 'Renginys nerastas' }
  if (event.event_type !== 'turnyras')     return { error: 'Renginys nėra turnyras' }
  if (event.tournament_status === 'active')    return { error: 'Turnyras jau vyksta' }
  if (event.tournament_status === 'completed') return { error: 'Turnyras jau baigtas' }

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

  await supabase.from('tournament_matches').delete().eq('event_id', eventId)
  await supabase.from('tournament_players').delete().eq('event_id', eventId)

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

  const players = [...insertedPlayers].sort(
    (a: { seed: number }, b: { seed: number }) => a.seed - b.seed
  )

  const matchCount = Math.ceil(N / 2)
  const matchInserts = []

  for (let i = 0; i < matchCount; i++) {
    const p1    = players[i]
    const p2Idx = N - 1 - i
    const isBye = p2Idx <= i
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
      advanced_at:  isBye ? new Date().toISOString() : null,
    })
  }

  const { error: matchError } = await supabase
    .from('tournament_matches')
    .insert(matchInserts)

  if (matchError) {
    return { error: 'Klaida kuriant rungtynes: ' + matchError.message }
  }

  const { error: eventError } = await supabase
    .from('events')
    .update({ tournament_status: 'active' })
    .eq('id', eventId)

  if (eventError) {
    return { error: 'Klaida atnaujinant renginį: ' + eventError.message }
  }

  // Skirti dalyvavimo XP visiems žaidėjams
  try {
    await awardTournamentRewards(eventId, supabase)
  } catch {
    // Apdovanojimai niekada negali blokuoti turnyro pradžios
  }

  revalidatePath('/admin/events/' + eventId + '/edit')
  revalidatePath('/events/' + eventId)
  return {}
}


// -- adminResolveTournamentMatch

export async function adminResolveTournamentMatch(
  matchId: string,
  winnerTournamentPlayerId: string,
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'event_moderator'].includes(profile.role))
    return { error: 'Neturite teisės atlikti šio veiksmo.' }

  const { data: match } = await supabase
    .from('tournament_matches')
    .select('id, event_id, player1_id, player2_id, is_bye')
    .eq('id', matchId)
    .single()

  if (!match)                          return { error: 'Mačas nerastas' }
  if (match.is_bye)                    return { error: 'Laisvo praejimo mačui negalima skirti laimėtojo' }
  if (!match.player1_id || !match.player2_id)
    return { error: 'Mačas dar neturi abiejų dalyvių' }
  if (winnerTournamentPlayerId !== match.player1_id && winnerTournamentPlayerId !== match.player2_id)
    return { error: 'Neteisingas dalyvio ID' }

  const loserId = winnerTournamentPlayerId === match.player1_id
    ? match.player2_id
    : match.player1_id

  const { error: updErr } = await supabase
    .from('tournament_matches')
    .update({
      status:       'admin_resolved',
      winner_id:    winnerTournamentPlayerId,
      loser_id:     loserId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  if (updErr) return { error: 'Klaida išsaugant: ' + updErr.message }

  // v3: pereiti prie kito raundo
  try {
    await advanceTournamentAfterConfirmedMatch(matchId, supabase)
  } catch {
    // Tyliai ignoruoti
  }

  // Skirti XP / ženkliukus
  try {
    await awardTournamentRewards(match.event_id, supabase)
  } catch {
    // Apdovanojimai niekada negali blokuoti
  }

  revalidatePath('/admin/events/' + match.event_id + '/edit')
  revalidatePath('/events/' + match.event_id)
  return { success: 'Pergalė priskirta. Sprendimas įrašytas.' }
}


// -- resolveDisputedMatch

export async function resolveDisputedMatch(
  matchId: string,
  winnerPlayerId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'event_moderator'].includes(profile.role))
    return { error: 'Neturi teisės' }

  const { data: match } = await supabase
    .from('tournament_matches')
    .select('id, event_id, player1_id, player2_id, status')
    .eq('id', matchId)
    .single()

  if (!match)                        return { error: 'Mačas nerastas' }
  if (match.status !== 'disputed')   return { error: 'Mačas nėra ginčytinas' }
  if (winnerPlayerId !== match.player1_id && winnerPlayerId !== match.player2_id)
    return { error: 'Neteisingas žaidėjas' }

  const loserId = winnerPlayerId === match.player1_id ? match.player2_id : match.player1_id

  const { error: updErr } = await supabase
    .from('tournament_matches')
    .update({
      status:       'admin_resolved',
      winner_id:    winnerPlayerId,
      loser_id:     loserId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  if (updErr) return { error: 'Klaida: ' + updErr.message }

  // v3: pereiti prie kito raundo
  try {
    await advanceTournamentAfterConfirmedMatch(matchId, supabase)
  } catch {
    // Tyliai ignoruoti
  }

  revalidatePath('/admin/events/' + match.event_id + '/edit')
  revalidatePath('/events/' + match.event_id)
  return {}
}


// -- v3: recalculateTournamentBracket — admin action

export async function recalculateTournamentBracket(
  eventId: string,
): Promise<{ error?: string; success?: string; advanced?: number; grandFinalCreated?: boolean }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'event_moderator'].includes(profile.role))
    return { error: 'Neturite teisės atlikti šio veiksmo.' }

  const result = await recalcHelper(eventId, supabase)

  if (result.error) return { error: result.error }

  // Skirti XP / ženkliukus po perskaičiavimo
  try {
    await awardTournamentRewards(eventId, supabase)
  } catch {
    // Apdovanojimai niekada negali blokuoti
  }

  revalidatePath('/admin/events/' + eventId + '/edit')
  revalidatePath('/events/' + eventId)

  const nothingDone = (result.advanced ?? 0) === 0 && !result.grandFinalCreated

  return {
    success: nothingDone
      ? 'Naujų mačų sugeneruoti nereikėjo.'
      : result.grandFinalCreated
        ? 'Didysis finalas sugeneruotas!'
        : 'Turnyrinė lentelė atnaujinta. Apdorota mačų: ' + result.advanced + '.',
    advanced: result.advanced,
    grandFinalCreated: result.grandFinalCreated,
  }
}


// -- awardTournamentRewardsAction — admin manual trigger

export async function awardTournamentRewardsAction(
  eventId: string,
): Promise<{ error?: string; success?: string; xpAwarded?: number; badgesUnlocked?: number }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'event_moderator'].includes(profile.role))
    return { error: 'Neturite teisės atlikti šio veiksmo.' }

  const result = await awardTournamentRewards(eventId, supabase)

  revalidatePath('/admin/events/' + eventId + '/edit')
  revalidatePath('/events/' + eventId)

  if (result.nothingNew) {
    return { success: 'Visi apdovanojimai jau buvo skirti.' }
  }

  return {
    success: 'Apdovanojimai skirti. XP: +' + result.xpAwarded + ', ženkliukai: +' + result.badgesUnlocked + '.',
    xpAwarded:     result.xpAwarded,
    badgesUnlocked: result.badgesUnlocked,
  }
}

export async function deleteEvent(eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprisijungęs' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'event_moderator'].includes(profile.role)) return { error: 'Neturi teisių' }

  // Cascade delete related data
  await supabase.from('tournament_matches').delete().eq('event_id', eventId)
  await supabase.from('tournament_players').delete().eq('event_id', eventId)
  await supabase.from('event_registrations').delete().eq('event_id', eventId)

  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) return { error: error.message }

  revalidatePath('/admin/events')
  revalidatePath('/events')
  return {}
}
