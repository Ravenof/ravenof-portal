'use server'
// Tournament Module v3 — Advancement engine (grand final fix)
// Handles: winners → losers dropout pairing, losers finalist detection, grand final creation,
// tournament completion. Idempotent via advanced_at guard.

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Statuses that count as "finished" ────────────────────────────────────────
const FINISHED = ['confirmed', 'admin_resolved', 'completed'] as const
type FinishedStatus = typeof FINISHED[number]

function isFinished(status: string): status is FinishedStatus {
  return (FINISHED as readonly string[]).includes(status)
}

// ── Suporuoti žaidėjus mačams ─────────────────────────────────────────────────
function pairPlayers(
  playerIds: string[],
  eventId: string,
  bracket: 'winners' | 'losers' | 'grand_final',
  round: number,
): object[] {
  const matches: object[] = []
  const ids = [...playerIds]
  let matchNumber = 1

  for (let i = 0; i < ids.length; i += 2) {
    const p1    = ids[i]
    const p2    = ids[i + 1] ?? null
    const isBye = p2 === null

    matches.push({
      event_id:     eventId,
      round,
      match_number: matchNumber++,
      player1_id:   p1,
      player2_id:   p2,
      winner_id:    isBye ? p1 : null,
      loser_id:     null,
      is_bye:       isBye,
      bracket,
      status:       isBye ? 'completed' : 'pending',
      completed_at: isBye ? new Date().toISOString() : null,
      advanced_at:  isBye ? new Date().toISOString() : null,
    })
  }

  return matches
}

// ── Rasti pralaimėjusiųjų šakos žaidėją, kuris laimėjo paskutinį LR mačą
// ── ir dar neturi tolesnio LR mačo (laukia varžovo) ─────────────────────────
async function getUnmatchedLRWinners(
  eventId: string,
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data: lrMatches } = await supabase
    .from('tournament_matches')
    .select('id, round, player1_id, player2_id, winner_id, status, is_bye')
    .eq('event_id', eventId)
    .eq('bracket', 'losers')
    .order('round', { ascending: false })

  if (!lrMatches || lrMatches.length === 0) return []

  // Surinkti visus žaidėjus, kurie yra LR mačuose
  const allLRPlayerIds = new Set<string>()
  for (const m of lrMatches) {
    if (m.player1_id) allLRPlayerIds.add(m.player1_id)
    if (m.player2_id) allLRPlayerIds.add(m.player2_id)
  }

  const waiters: string[] = []

  for (const playerId of allLRPlayerIds) {
    // Rasti šio žaidėjo mačus LR šakoje, surikiuotus pagal raundą (mažėjančia tvarka)
    const playerMatches = lrMatches
      .filter(m => m.player1_id === playerId || m.player2_id === playerId)
      .sort((a, b) => b.round - a.round)

    const latestMatch = playerMatches[0]
    if (!latestMatch) continue

    // Jei laimėjo paskutinį mačą ir jo statusas baigtas — jis laukia
    if (isFinished(latestMatch.status) && latestMatch.winner_id === playerId) {
      waiters.push(playerId)
    }
  }

  return waiters
}

// ── Bandyti sukurti Didįjį finalą ────────────────────────────────────────────
// Naudoja mačų duomenis (ne žaidėjų statusą) finalistams rasti.
// Grąžina true jei finalas sukurtas.
async function tryCreateGrandFinal(
  eventId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  // 1. Patikrinti ar Didysis finalas jau egzistuoja
  const { data: existingGF } = await supabase
    .from('tournament_matches')
    .select('id')
    .eq('event_id', eventId)
    .eq('bracket', 'grand_final')
    .limit(1)

  if (existingGF && existingGF.length > 0) return false

  // 2. Patikrinti ar nėra laukiančių WR arba LR mačų
  //    (bye mačai neblokuoja — jie visada laikomi baigtais)
  const { data: pendingMatches } = await supabase
    .from('tournament_matches')
    .select('id, status')
    .eq('event_id', eventId)
    .in('bracket', ['winners', 'losers'])
    .in('status', ['pending', 'active', 'reported_by_one', 'disputed'])
    .eq('is_bye', false)

  if (pendingMatches && pendingMatches.length > 0) return false

  // 3. Rasti laimėtojų šakos finalistą
  //    = paskutinio laimėtojų raundo laimėtojas (kai tame raunde tik 1 mačas ir jis baigtas)
  const { data: winnerMatches } = await supabase
    .from('tournament_matches')
    .select('round, winner_id, status, is_bye')
    .eq('event_id', eventId)
    .eq('bracket', 'winners')
    .order('round', { ascending: false })

  if (!winnerMatches || winnerMatches.length === 0) return false

  const highestWR = winnerMatches[0].round
  const lastWRRound = winnerMatches.filter(m => m.round === highestWR)
  const allLastWRDone = lastWRRound.every(m => m.is_bye || isFinished(m.status))
  if (!allLastWRDone) return false

  const wFinalistIds = lastWRRound
    .map(m => m.winner_id)
    .filter((id): id is string => !!id)
  if (wFinalistIds.length !== 1) return false
  const winnersFinalId = wFinalistIds[0]

  // 4. Rasti pralaimėjusiųjų šakos finalistą
  //    = paskutinio pralaimėjusiųjų raundo laimėtojas (kai tame raunde tik 1 mačas ir jis baigtas)
  const { data: loserMatches } = await supabase
    .from('tournament_matches')
    .select('round, winner_id, status, is_bye')
    .eq('event_id', eventId)
    .eq('bracket', 'losers')
    .order('round', { ascending: false })

  if (!loserMatches || loserMatches.length === 0) return false

  const highestLR = loserMatches[0].round
  const lastLRRound = loserMatches.filter(m => m.round === highestLR)
  const allLastLRDone = lastLRRound.every(m => m.is_bye || isFinished(m.status))
  if (!allLastLRDone) return false

  const lFinalistIds = lastLRRound
    .map(m => m.winner_id)
    .filter((id): id is string => !!id)
  if (lFinalistIds.length !== 1) return false
  const losersFinalId = lFinalistIds[0]

  // 5. Saugumas: jie turi būti skirtingi žaidėjai
  if (winnersFinalId === losersFinalId) return false

  // 6. Sukurti Didįjį finalą
  const { error: insertErr } = await supabase.from('tournament_matches').insert({
    event_id:     eventId,
    round:        1,
    match_number: 1,
    player1_id:   winnersFinalId,
    player2_id:   losersFinalId,
    bracket:      'grand_final',
    status:       'pending',
    is_bye:       false,
  })

  if (insertErr) return false
  return true
}

// ── Užbaigti turnyrą (kai Didysis finalas patvirtintas) ─────────────────────
async function finalizeTournament(
  eventId: string,
  winnerId: string,
  loserId: string,
  supabase: SupabaseClient,
): Promise<void> {
  // Nustatyti galutines vietas
  await supabase
    .from('tournament_players')
    .update({ final_placement: 1 })
    .eq('id', winnerId)

  await supabase
    .from('tournament_players')
    .update({ final_placement: 2 })
    .eq('id', loserId)

  // Pažymėti turnyrą kaip baigtą
  await supabase
    .from('events')
    .update({ tournament_status: 'completed' })
    .eq('id', eventId)
}

// ── advanceTournamentAfterConfirmedMatch ─────────────────────────────────────
/**
 * Iškviečiama po to kai mačas patvirtintas/admin_resolved.
 * Idempotent — saugu kviesti kelis kartus (apsaugoja advanced_at).
 */
export async function advanceTournamentAfterConfirmedMatch(
  matchId: string,
  supabase: SupabaseClient,
): Promise<void> {
  // 1. Gauti mačą
  const { data: match, error: matchErr } = await supabase
    .from('tournament_matches')
    .select('id, event_id, bracket, round, match_number, player1_id, player2_id, winner_id, loser_id, is_bye, advanced_at, status')
    .eq('id', matchId)
    .single()

  if (matchErr || !match) return

  // 2. Patikrinti statusą
  if (!isFinished(match.status)) return

  // 3. Idempotency — jau apdorotas
  if (match.advanced_at !== null && match.advanced_at !== undefined) return

  // 4. Pažymėti kaip apdorotą
  await supabase
    .from('tournament_matches')
    .update({ advanced_at: new Date().toISOString() })
    .eq('id', matchId)

  // 5. Atnaujinti pralaimėjusiojo losses_count (ne bye mačams)
  if (match.loser_id && !match.is_bye) {
    const { data: loserRow } = await supabase
      .from('tournament_players')
      .select('losses_count')
      .eq('id', match.loser_id)
      .single()

    const newLosses = (loserRow?.losses_count ?? 0) + 1

    await supabase
      .from('tournament_players')
      .update({ losses_count: newLosses })
      .eq('id', match.loser_id)

    // 6. Jei 2 pralaimėjimai — eliminavimas
    if (newLosses >= 2) {
      await supabase
        .from('tournament_players')
        .update({ status: 'eliminated' })
        .eq('id', match.loser_id)
    }
  }

  // 7. Didžiojo finalo specialus atvejis
  if (match.bracket === 'grand_final') {
    if (match.winner_id && match.loser_id) {
      await finalizeTournament(match.event_id, match.winner_id, match.loser_id, supabase)
    }
    return
  }

  // 8. Patikrinti ar visi šio raundo mačai baigti
  //    (bye mačai visada laikomi baigtais)
  const { data: roundMatches } = await supabase
    .from('tournament_matches')
    .select('id, status, is_bye, winner_id, loser_id, player1_id, player2_id, bracket, round')
    .eq('event_id', match.event_id)
    .eq('bracket', match.bracket)
    .eq('round', match.round)

  if (!roundMatches) return

  const allRoundDone = roundMatches.every(m => m.is_bye || isFinished(m.status))
  if (!allRoundDone) return

  // ── 9. LAIMĖTOJŲ ŠAKA ─────────────────────────────────────────────────────
  if (match.bracket === 'winners') {
    const winnerIds = roundMatches
      .map(m => m.winner_id)
      .filter((id): id is string => !!id)

    const loserIds = roundMatches
      .filter(m => !m.is_bye)
      .map(m => m.loser_id)
      .filter((id): id is string => !!id)

    const nextRound = match.round + 1

    // 9a. Generuoti kitą winners raundą (jei daugiau nei 1 laimėtojas)
    if (winnerIds.length > 1) {
      const { data: existingNextW } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('event_id', match.event_id)
        .eq('bracket', 'winners')
        .eq('round', nextRound)
        .limit(1)

      if (!existingNextW || existingNextW.length === 0) {
        const nextWMatches = pairPlayers(winnerIds, match.event_id, 'winners', nextRound)
        if (nextWMatches.length > 0) {
          await supabase.from('tournament_matches').insert(nextWMatches)
        }
      }
    }
    // Jei winnerIds.length === 1 — šis žaidėjas yra laimėtojų šakos finalistas
    // Finalas bus sukurtas kai ir LR šaka baigs savo paskutinį raundą

    // 9b. Generuoti / papildyti pralaimėjusiųjų šaką losers dropout'ais
    if (loserIds.length > 0) {
      // Rasti aukščiausią esamą LR raundą
      const { data: existingLR } = await supabase
        .from('tournament_matches')
        .select('round')
        .eq('event_id', match.event_id)
        .eq('bracket', 'losers')
        .order('round', { ascending: false })
        .limit(1)

      const nextLRRound = (existingLR && existingLR.length > 0)
        ? existingLR[0].round + 1
        : 1

      // Patikrinti ar šis LR raundas jau sukurtas
      const { data: existingLRRound } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('event_id', match.event_id)
        .eq('bracket', 'losers')
        .eq('round', nextLRRound)
        .limit(1)

      if (!existingLRRound || existingLRRound.length === 0) {
        if (loserIds.length >= 2) {
          // Keli WR dropout'ai — suporuoti tarpusavyje
          const lossersMatches = pairPlayers(loserIds, match.event_id, 'losers', nextLRRound)
          if (lossersMatches.length > 0) {
            await supabase.from('tournament_matches').insert(lossersMatches)
          }
        } else if (loserIds.length === 1) {
          // Vienas WR dropout — bandyti suporuoti su laukiančiu LR laimėtoju
          const lrWaiters = await getUnmatchedLRWinners(match.event_id, supabase)

          if (lrWaiters.length === 1 && lrWaiters[0] !== loserIds[0]) {
            // Sukurti LR mačą: WR dropout vs LR waiter
            const crossMatch = {
              event_id:     match.event_id,
              round:        nextLRRound,
              match_number: 1,
              player1_id:   lrWaiters[0],
              player2_id:   loserIds[0],
              winner_id:    null,
              loser_id:     null,
              is_bye:       false,
              bracket:      'losers',
              status:       'pending',
              completed_at: null,
              advanced_at:  null,
            }
            await supabase.from('tournament_matches').insert(crossMatch)
          }
          // Jei LR waiters nėra arba daugiau — palaukti kol LR raundas baigsis
        }
      }
    }

    // 9c. Bandyti sukurti Grand Final (jei liko 1 WR winner ir nėra laukiančių mačų)
    if (winnerIds.length === 1) {
      await tryCreateGrandFinal(match.event_id, supabase)
    }
  }

  // ── 10. PRALAIMĖJUSIŲJŲ ŠAKA ──────────────────────────────────────────────
  else if (match.bracket === 'losers') {
    const winnerIds = roundMatches
      .map(m => m.winner_id)
      .filter((id): id is string => !!id)

    if (winnerIds.length === 0) return

    if (winnerIds.length === 1) {
      // Vienas LR laimėtojas — bandyti sukurti Grand Final
      await tryCreateGrandFinal(match.event_id, supabase)
      return
    }

    // Keli LR laimėtojai — sukurti kitą LR raundą
    const nextRound = match.round + 1
    const { data: existingNextL } = await supabase
      .from('tournament_matches')
      .select('id')
      .eq('event_id', match.event_id)
      .eq('bracket', 'losers')
      .eq('round', nextRound)
      .limit(1)

    if (!existingNextL || existingNextL.length === 0) {
      const nextLMatches = pairPlayers(winnerIds, match.event_id, 'losers', nextRound)
      if (nextLMatches.length > 0) {
        await supabase.from('tournament_matches').insert(nextLMatches)
      }
    }
  }
}

// ── recalculateTournamentBracket ─────────────────────────────────────────────
/**
 * Apdoroja visus neapdorotus baigtus mačus nuosekliai.
 * Idempotent — saugu paleisti kelis kartus.
 * Taip pat bando sukurti Didįjį finalą, jei sąlygos sutampa.
 */
export async function recalculateTournamentBracket(
  eventId: string,
  supabase: SupabaseClient,
): Promise<{ advanced: number; error?: string; grandFinalCreated?: boolean }> {
  const { data: matches, error } = await supabase
    .from('tournament_matches')
    .select('id, bracket, round, match_number, status, advanced_at, is_bye')
    .eq('event_id', eventId)
    .order('bracket')
    .order('round')
    .order('match_number')

  if (error || !matches) {
    return { advanced: 0, error: 'Klaida gaunant mačus: ' + (error?.message ?? 'unknown') }
  }

  // Surasti visus baigtus ir neapdorotus mačus
  const toProcess = matches.filter(
    m => isFinished(m.status) && !m.is_bye && (m.advanced_at === null || m.advanced_at === undefined)
  )

  let advanced = 0
  for (const m of toProcess) {
    try {
      await advanceTournamentAfterConfirmedMatch(m.id, supabase)
      advanced++
    } catch {
      // Tęsti net jei vienas mačas nepavyko
    }
  }

  // Bandyti sukurti Didįjį finalą (jei dar nesukurtas ir sąlygos atitinka)
  const grandFinalCreated = await tryCreateGrandFinal(eventId, supabase)

  // Jei Didysis finalas jau egzistuoja ir yra baigtas — užbaigti turnyrą
  if (!grandFinalCreated) {
    const { data: gfMatch } = await supabase
      .from('tournament_matches')
      .select('id, status, winner_id, loser_id, advanced_at')
      .eq('event_id', eventId)
      .eq('bracket', 'grand_final')
      .maybeSingle()

    if (gfMatch && isFinished(gfMatch.status) && !gfMatch.advanced_at) {
      try {
        await advanceTournamentAfterConfirmedMatch(gfMatch.id, supabase)
        advanced++
      } catch {
        // Ignoruoti
      }
    }
  }

  return { advanced, grandFinalCreated }
}
