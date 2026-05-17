'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { advanceTournamentAfterConfirmedMatch } from '@/lib/tournament/advancement'
import { awardTournamentRewards } from '@/lib/tournament/rewards'

// -- TASK 4: submitTournamentMatchReport

export async function submitTournamentMatchReport(
  matchId: string,
  claimedResult: 'win' | 'loss',
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient()

  // 1. Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Neprisijungęs' }

  // 2. Gauti mačą
  const { data: match } = await supabase
    .from('tournament_matches')
    .select('id, event_id, player1_id, player2_id, status, is_bye')
    .eq('id', matchId)
    .single()

  if (!match)                                          return { error: 'Mačas nerastas' }
  if (match.is_bye)                                    return { error: 'Laisvo praejimo mačas — rezultato nereikia' }
  if (['confirmed', 'admin_resolved'].includes(match.status))
    return { error: 'Šio mačo rezultato nebegalima keisti' }
  if (!match.player1_id || !match.player2_id)          return { error: 'Mačas dar neturi abiejų dalyvių' }

  // 3. Patikrinti, kad user yra šio mačo dalyvis
  const { data: myPlayer } = await supabase
    .from('tournament_players')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_id', match.event_id)
    .maybeSingle()

  if (!myPlayer)                                       return { error: 'Nesate turnyro dalyvis' }
  if (myPlayer.id !== match.player1_id && myPlayer.id !== match.player2_id)
    return { error: 'Nesate šio mačo dalyvis' }

  // 4. Upsert ataskaita
  const { error: upsertErr } = await supabase
    .from('tournament_match_reports')
    .upsert(
      {
        match_id:             matchId,
        reported_by_user_id:  user.id,
        tournament_player_id: myPlayer.id,
        claimed_result:       claimedResult,
      },
      { onConflict: 'match_id,reported_by_user_id' },
    )

  if (upsertErr) return { error: 'Klaida siunčiant rezultatą. Bandykite dar kartą.' }

  // 5. Patikrinti abiejų žaidėjų ataskaitas
  const { data: reports } = await supabase
    .from('tournament_match_reports')
    .select('tournament_player_id, claimed_result')
    .eq('match_id', matchId)

  if (!reports || reports.length < 2) {
    // Tik vienas pateikė
    await supabase
      .from('tournament_matches')
      .update({ status: 'reported_by_one' })
      .eq('id', matchId)

    revalidatePath('/events/' + match.event_id)
    return { success: 'Rezultatas pateiktas. Laukiama varžovo patvirtinimo.' }
  }

  // Abu pateikė — tikrinam sutapimą
  const p1Report = reports.find(r => r.tournament_player_id === match.player1_id)
  const p2Report = reports.find(r => r.tournament_player_id === match.player2_id)

  if (!p1Report || !p2Report) {
    await supabase.from('tournament_matches').update({ status: 'reported_by_one' }).eq('id', matchId)
    revalidatePath('/events/' + match.event_id)
    return { success: 'Rezultatas pateiktas. Laukiama varžovo patvirtinimo.' }
  }

  const p1Wins = p1Report.claimed_result === 'win'
  const p2Wins = p2Report.claimed_result === 'win'

  if (p1Wins !== p2Wins) {
    // Sutampa: vienas teigia laimejima, kitas pralaimejima
    const winnerId = p1Wins ? match.player1_id : match.player2_id
    const loserId  = p1Wins ? match.player2_id : match.player1_id

    await supabase
      .from('tournament_matches')
      .update({
        status:       'confirmed',
        winner_id:    winnerId,
        loser_id:     loserId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    // v3: pereiti prie kito raundo (gali nepavykti del RLS — tada admin naudoja recalculate)
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

    revalidatePath('/events/' + match.event_id)
    return { success: 'Rezultatas patvirtintas!' }
  }

  // Nesutampa — ginčas
  await supabase
    .from('tournament_matches')
    .update({ status: 'disputed' })
    .eq('id', matchId)

  revalidatePath('/events/' + match.event_id)
  revalidatePath('/admin/events/' + match.event_id + '/edit')
  return { success: 'Rezultatai nesutampa. Laukiama administratoriaus sprendimo.' }
}
