'use server'
// Tournament Module v3 — Advancement engine (BYE-safe losers bracket fix)
// Handles: winners → losers dropout pairing, losers finalist detection, grand final creation,
// tournament completion. Idempotent via advanced_at guard.
// Fix v3.1: 3-player / BYE edge case — collects all un-matched first-loss players,
//   pairs them together regardless of when they dropped from winners bracket.

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

// ── Rasti žaidėjus su 1 pralaimėjimu, kurie neturi LR mačo ──────────────────
// Tai yra WR dropout'ai, kurie dar laukia pirmojo LR mačo.
async function getPlayersNeedingLRMatch(
  eventId: string,
  supabase: SupabaseClient,
): Promise<string[]> {
  // 1. Visi aktyvūs žaidėjai su losses_count = 1
  const { data: oneLoss } = await supabase
    .from('tournament_players')
    .select('id')
    .eq('event_id', eventId)
    .eq('losses_count', 1)
    .eq('status', 'active')

  if (!oneLoss || oneLoss.length === 0) return []

  // 2. Visi žaidėjai, kurie jau yra kokiame nors LR mače
  const { data: lrMatches } = await supabase
    .from('tournament_matches')
    .select('player1_id, player2_id')
    .eq('event_id', eventId)
    .eq('bracket', 'losers')

  const inLR = new Set<string>()
  for (const m of (lrMatches ?? [])) {
    if (m.player1_id) inLR.add(m.player1_id)
    if (m.player2_id) inLR.add(m.player2_id)
  }

  // 3. Grąžinti tik tuos, kurių nėra LR mačuose
  return oneLoss.map((p: { id: string }) => p.id).filter((id: string) => !inLR.has(id))
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

  const allLRPlayerIds = new Set<string>()
  for (const m of lrMatches) {
    if (m.player1_id) allLRPlayerIds.add(m.player1_id)
    if (m.player2_id) allLRPlayerIds.add(m.player2_id)
  }

  const waiters: string[] = []

  for (const playerId of allLRPlayerIds) {
    const playerMatches = lrMatches
      .filter((m: { player1_id: string | null; player2_id: string | null }) =>
        m.player1_id === playerId || m.player2_id === playerId)
      .sort((a: { round: number }, b: { round: number }) => b.round - a.round)

    const latestMatch = playerMatches[0]
    if (!latestMatch) continue

    if (isFinished(latestMatch.status) && latestMatch.winner_id === playerId) {
      waiters.push(playerId)
    }
  }

  return waiters
}

// ── Sukurti trūkstamus LR mačus (naudojama repair/recalculate kelyje) ────────
// Idempotent: patikrina ar toks LR raundas jau yra.
async function createMissingLosersMatches(
  eventId: string,
  supabase: SupabaseClient,
): Promise<number> {
  const playersNeedingLR = await getPlayersNeedingLRMatch(eventId, supabase)
  if (playersNeedingLR.length < 2) return 0

  // Rasti aukščiausią esamą LR raundą
  const { data: existingLR } = await supabase
    .from('tournament_matches')
    .select('round')
    .eq('event_id', eventId)
    .eq('bracket', 'losers')
    .order('round', { ascending: false })
    .limit(1)

  const nextLRRound = (existingLR && existingLR.length > 0)
    ? existingLR[0].round + 1
    : 1

  // Patikrinti ar šis raundas jau yra (idempotency)
  const { data: existingRound } = await supabase
    .from('tournament_matches')
    .select('id')
    .eq('event_id', eventId)
    .eq('bracket', 'losers')
    .eq('round', nextLRRound)
    .limit(1)

  if (existingRound && existingRound.length > 0) return 0

  const newMatches = pairPlayers(playersNeedingLR, eventId, 'losers', nextLRRound)
  if (newMatches.length === 0) return 0

  const { error } = await supabase.from('tournament_matches').insert(newMatches)
  if (error) return 0
  return newMatches.length
}

// ── Bandyti sukurti Didįjį finalą ────────────────────────────────────────────
async function tryCreateGrandFinal(
  eventId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data: existingGF } = await supabase
    .from('tournament_matches')
    .select('id')
    .eq('event_id', eventId)
    .eq('bracket', 'grand_final')
    .limit(1)

  if (existingGF && existingGF.length > 0) return false

  // Patikrinti ar nėra laukiančių WR arba LR mačų (bye neblokuoja)
  const { data: pendingMatches } = await supabase
    .from('tournament_matches')
    .select('id, status')
    .eq('event_id', eventId)
    .in('bracket', ['winners', 'losers'])
    .in('status', ['pending', 'active', 'reported_by_one', 'disputed'])
    .eq('is_bye', false)

  if (pendingMatches && pendingMatches.length > 0) return false

  // Patikrinti ar nėra žaidėjų, laukiančių LR mačo (stuck 3-player)
  const needingLR = await getPlayersNeedingLRMatch(eventId, supabase)
  if (needingLR.length >= 2) return false

  // Rasti laimėtojų šakos finalistą
  const { data: winnerMatches } = await supabase
    .from('tournament_matches')
    .select('round, winner_id, status, is_bye')
    .eq('event_id', eventId)
    .eq('bracket', 'winners')
    .order('round', { ascending: false })

  if (!winnerMatches || winnerMatches.length === 0) return false

  const highestWR = winnerMatches[0].round
  const lastWRRound = winnerMatches.filter((m: { round: number }) => m.round === highestWR)
  const allLastWRDone = lastWRRound.every((m: { is_bye: boolean; status: string }) =>
    m.is_bye || isFinished(m.status))
  if (!allLastWRDone) return false

  const wFinalistIds = lastWRRound
    .map((m: { winner_id: string | null }) => m.winner_id)
    .filter((id: string | null): id is string => !!id)
  if (wFinalistIds.length !== 1) return false
  const winnersFinalId = wFinalistIds[0]

  // Rasti pralaimėjusiųjų šakos finalistą
  const { data: loserMatches } = await supabase
    .from('tournament_matches')
    .select('round, winner_id, status, is_bye')
    .eq('event_id', eventId)
    .eq('bracket', 'losers')
    .order('round', { ascending: false })

  if (!loserMatches || loserMatches.length === 0) return false

  const highestLR = loserMatches[0].round
  const lastLRRound = loserMatches.filter((m: { round: number }) => m.round === highestLR)
  const allLastLRDone = lastLRRound.every((m: { is_bye: boolean; status: string }) =>
    m.is_bye || isFinished(m.status))
  if (!allLastLRDone) return false

  const lFinalistIds = lastLRRound
    .map((m: { winner_id: string | null }) => m.winner_id)
    .filter((id: string | null): id is string => !!id)
  if (lFinalistIds.length !== 1) return false
  const losersFinalId = lFinalistIds[0]

  if (winnersFinalId === losersFinalId) return false

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

// ── Užbaigti turnyrą ─────────────────────────────────────────────────────────
async function finalizeTournament(
  eventId: string,
  winnerId: string,
  loserId: string,
  supabase: SupabaseClient,
): Promise<void> {
  await supabase
    .from('tournament_players')
    .update({ final_placement: 1 })
    .eq('id', winnerId)

  await supabase
    .from('tournament_players')
    .update({ final_placement: 2 })
    .eq('id', loserId)

  await supabase
    .from('events')
    .update({ tournament_status: 'completed' })
    .eq('id', eventId)
}

// ── advanceTournamentAfterConfirmedMatch ─────────────────────────────────────
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
  if (!isFinished(match.status)) return
  if (match.advanced_at !== null && match.advanced_at !== undefined) return

  // 2. Atomic claim — tik vienas concurrent kvietimas praeis toliau.
  // UPDATE ... WHERE advanced_at IS NULL grazina 0 eiluciu jei kitas procesas
  // jau pazymejo. Tai uzakerta kelia duplicate macu generavimui.
  const { data: claimed } = await supabase
    .from('tournament_matches')
    .update({ advanced_at: new Date().toISOString() })
    .eq('id', matchId)
    .is('advanced_at', null)
    .select('id')

  if (!claimed || claimed.length === 0) return  // kitas procesas jau pasieme

  // 3. Atnaujinti pralaimėjusiojo losses_count (ne bye mačams)
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

    if (newLosses >= 2) {
      await supabase
        .from('tournament_players')
        .update({ status: 'eliminated' })
        .eq('id', match.loser_id)
    }
  }

  // 4. Didžiojo finalo specialus atvejis
  if (match.bracket === 'grand_final') {
    if (match.winner_id && match.loser_id) {
      await finalizeTournament(match.event_id, match.winner_id, match.loser_id, supabase)
    }
    return
  }

  // 5. Patikrinti ar visi šio raundo mačai baigti
  const { data: roundMatches } = await supabase
    .from('tournament_matches')
    .select('id, status, is_bye, winner_id, loser_id, player1_id, player2_id, bracket, round')
    .eq('event_id', match.event_id)
    .eq('bracket', match.bracket)
    .eq('round', match.round)

  if (!roundMatches) return

  const allRoundDone = roundMatches.every((m: { is_bye: boolean; status: string }) =>
    m.is_bye || isFinished(m.status))
  if (!allRoundDone) return

  // ── 6. LAIMĖTOJŲ ŠAKA ─────────────────────────────────────────────────────
  if (match.bracket === 'winners') {
    const winnerIds: string[] = roundMatches
      .map((m: { winner_id: string | null }) => m.winner_id)
      .filter((id: string | null): id is string => !!id)

    const loserIds: string[] = roundMatches
      .filter((m: { is_bye: boolean }) => !m.is_bye)
      .map((m: { loser_id: string | null }) => m.loser_id)
      .filter((id: string | null): id is string => !!id)

    const nextRound = match.round + 1

    // 6a. Generuoti kitą winners raundą (jei daugiau nei 1 laimėtojas)
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

    // 6b. Sukurti / papildyti pralaimėjusiųjų šaką
    // FIX v3.1: Surinkti VISUS žaidėjus su 1 loss be LR mačo
    // (apima ankstesnių raundų dropout'us ir dabartinio raundo)
    if (loserIds.length > 0) {
      // Po losses_count atnaujinimo šiame raunde, getPlayersNeedingLRMatch
      // grąžins visus žaidėjus su 1 loss ir be LR mačo
      const allNeedingLR = await getPlayersNeedingLRMatch(match.event_id, supabase)

      if (allNeedingLR.length >= 2) {
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

        const { data: existingLRRound } = await supabase
          .from('tournament_matches')
          .select('id')
          .eq('event_id', match.event_id)
          .eq('bracket', 'losers')
          .eq('round', nextLRRound)
          .limit(1)

        if (!existingLRRound || existingLRRound.length === 0) {
          const lossersMatches = pairPlayers(allNeedingLR, match.event_id, 'losers', nextLRRound)
          if (lossersMatches.length > 0) {
            await supabase.from('tournament_matches').insert(lossersMatches)
          }
        }
      } else if (allNeedingLR.length === 1) {
        // Tik vienas žaidėjas laukia — bandyti suporuoti su LR šakos laimėtoju
        const lrWaiters = await getUnmatchedLRWinners(match.event_id, supabase)
        const combined = Array.from(new Set([...allNeedingLR, ...lrWaiters]))

        if (combined.length >= 2) {
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

          const { data: existingLRRound } = await supabase
            .from('tournament_matches')
            .select('id')
            .eq('event_id', match.event_id)
            .eq('bracket', 'losers')
            .eq('round', nextLRRound)
            .limit(1)

          if (!existingLRRound || existingLRRound.length === 0) {
            const crossMatches = pairPlayers(combined, match.event_id, 'losers', nextLRRound)
            if (crossMatches.length > 0) {
              await supabase.from('tournament_matches').insert(crossMatches)
            }
          }
        }
      }
    }

    // 6c. Bandyti sukurti Grand Final
    if (winnerIds.length === 1) {
      await tryCreateGrandFinal(match.event_id, supabase)
    }
  }

  // ── 7. PRALAIMĖJUSIŲJŲ ŠAKA ───────────────────────────────────────────────
  else if (match.bracket === 'losers') {
    const winnerIds: string[] = roundMatches
      .map((m: { winner_id: string | null }) => m.winner_id)
      .filter((id: string | null): id is string => !!id)

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

  // 1. Apdoroti neapdorotus baigtus mačus
  const toProcess = matches.filter(
    (m: { status: string; is_bye: boolean; advanced_at: string | null | undefined }) =>
      isFinished(m.status) && !m.is_bye && (m.advanced_at === null || m.advanced_at === undefined)
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

  // 2. FIX v3.1: sukurti trūkstamus LR mačus (stuck 3-player repair)
  //    Veikia net kai visi WR mačai jau apdoroti (advanced_at set)
  const missingCreated = await createMissingLosersMatches(eventId, supabase)
  if (missingCreated > 0) advanced += missingCreated

  // 3. Bandyti sukurti Didįjį finalą
  const grandFinalCreated = await tryCreateGrandFinal(eventId, supabase)

  // 4. Jei Didysis finalas jau egzistuoja ir yra baigtas — užbaigti turnyrą
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
