// Tournament Rewards — XP + badge engine
// Idempotent: calling multiple times never double-awards.
// All XP goes through award_tournament_xp_once (SECURITY DEFINER, bypasses RLS).
// All badges go through try_award_badge (SECURITY DEFINER, idempotent).

import type { SupabaseClient } from '@supabase/supabase-js'

// ── XP constants ─────────────────────────────────────────────────────────────
export const TOURNAMENT_XP = {
  PARTICIPATION:  400,
  MATCH_WIN:      100,
  PLACEMENT_1:   1500,
  PLACEMENT_2:   1000,
  PLACEMENT_3:    700,
} as const

// ── Low-level helper: call award_tournament_xp_once RPC ──────────────────────
async function awardXpOnce(
  supabase: SupabaseClient,
  opts: {
    userId:     string
    amount:     number
    sourceType: string
    sourceId:   string
    reason:     string
  },
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc('award_tournament_xp_once', {
      p_user_id:    opts.userId,
      p_amount:     opts.amount,
      p_source_type: opts.sourceType,
      p_source_id:  opts.sourceId,
      p_reason:     opts.reason,
    })
    return data === true
  } catch {
    return false
  }
}

// ── Low-level helper: call try_award_badge RPC ────────────────────────────────
async function awardBadge(
  supabase: SupabaseClient,
  opts: {
    userId:     string
    badgeKey:   string
    sourceType: string
    sourceId:   string
  },
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc('try_award_badge', {
      p_user_id:     opts.userId,
      p_badge_key:   opts.badgeKey,
      p_source_type: opts.sourceType,
      p_source_id:   opts.sourceId,
    })
    return data === true
  } catch {
    return false
  }
}

// ── awardParticipationXp ──────────────────────────────────────────────────────
// Awards +400 XP to every tournament_player in the event.
// Source: (user_id, 'tournament_participation', eventId) — idempotent.
export async function awardParticipationXp(
  eventId: string,
  supabase: SupabaseClient,
): Promise<number> {
  const { data: players } = await supabase
    .from('tournament_players')
    .select('id, user_id')
    .eq('event_id', eventId)

  if (!players || players.length === 0) return 0

  let awarded = 0
  for (const p of players) {
    const ok = await awardXpOnce(supabase, {
      userId:     p.user_id,
      amount:     TOURNAMENT_XP.PARTICIPATION,
      sourceType: 'tournament_participation',
      sourceId:   eventId,
      reason:     'Turnyro dalyvavimas',
    })
    if (ok) awarded++

    // Badge: pirmą kartą dalyvauja turnyre
    await awardBadge(supabase, {
      userId:     p.user_id,
      badgeKey:   'tournament_participant',
      sourceType: 'tournament_participation',
      sourceId:   eventId,
    })
  }

  return awarded
}

// ── awardMatchWinXp ───────────────────────────────────────────────────────────
// Awards +100 XP to the winner of a specific match.
// Source: (user_id, 'tournament_match_win', matchId) — idempotent.
export async function awardMatchWinXp(
  matchId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data: match } = await supabase
    .from('tournament_matches')
    .select('id, winner_id, is_bye')
    .eq('id', matchId)
    .single()

  if (!match || !match.winner_id || match.is_bye) return false

  // Resolve tournament_player → user_id
  const { data: player } = await supabase
    .from('tournament_players')
    .select('user_id')
    .eq('id', match.winner_id)
    .single()

  if (!player) return false

  return awardXpOnce(supabase, {
    userId:     player.user_id,
    amount:     TOURNAMENT_XP.MATCH_WIN,
    sourceType: 'tournament_match_win',
    sourceId:   matchId,
    reason:     'Pergalė mače',
  })
}

// ── awardPlacementRewards ─────────────────────────────────────────────────────
// Awards XP + badges for 1st, 2nd, 3rd place.
// Reads final_placement from tournament_players.
// Source XP: (user_id, 'tournament_placement_N', eventId) — idempotent.
export async function awardPlacementRewards(
  eventId: string,
  supabase: SupabaseClient,
): Promise<{ xpAwarded: number; badgesUnlocked: number }> {
  const { data: players } = await supabase
    .from('tournament_players')
    .select('id, user_id, final_placement')
    .eq('event_id', eventId)
    .not('final_placement', 'is', null)

  if (!players || players.length === 0) return { xpAwarded: 0, badgesUnlocked: 0 }

  let xpAwarded = 0
  let badgesUnlocked = 0

  for (const p of players) {
    const placement = p.final_placement as number | null
    if (!placement) continue

    let xpAmount: number | null = null
    let xpSourceType: string | null = null
    let xpReason: string | null = null
    const badgeKeys: string[] = []

    if (placement === 1) {
      xpAmount     = TOURNAMENT_XP.PLACEMENT_1
      xpSourceType = 'tournament_placement_1'
      xpReason     = 'Turnyro nugalėtojas (1 vieta)'
      badgeKeys.push('tournament_champion', 'finalist', 'on_podium')
    } else if (placement === 2) {
      xpAmount     = TOURNAMENT_XP.PLACEMENT_2
      xpSourceType = 'tournament_placement_2'
      xpReason     = 'Turnyro finalistas (2 vieta)'
      badgeKeys.push('finalist', 'on_podium')
    } else if (placement === 3) {
      xpAmount     = TOURNAMENT_XP.PLACEMENT_3
      xpSourceType = 'tournament_placement_3'
      xpReason     = 'Turnyro prizininkas (3 vieta)'
      badgeKeys.push('on_podium')
    }

    if (xpAmount && xpSourceType && xpReason) {
      const ok = await awardXpOnce(supabase, {
        userId:     p.user_id,
        amount:     xpAmount,
        sourceType: xpSourceType,
        sourceId:   eventId,
        reason:     xpReason,
      })
      if (ok) xpAwarded++
    }

    for (const badgeKey of badgeKeys) {
      const unlocked = await awardBadge(supabase, {
        userId:     p.user_id,
        badgeKey,
        sourceType: xpSourceType ?? 'tournament_participation',
        sourceId:   eventId,
      })
      if (unlocked) badgesUnlocked++
    }
  }

  return { xpAwarded, badgesUnlocked }
}

// ── checkTournamentRegularBadge ───────────────────────────────────────────────
// Unlocks 'tournament_regular' if user has played ≥ 5 tournaments.
async function checkTournamentRegularBadge(
  userId: string,
  eventId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  // Count distinct events this user has participated in
  const { count } = await supabase
    .from('tournament_players')
    .select('event_id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (!count || count < 5) return false

  return awardBadge(supabase, {
    userId,
    badgeKey:   'tournament_regular',
    sourceType: 'tournament_participation',
    sourceId:   eventId,
  })
}

// ── awardTournamentRewards ────────────────────────────────────────────────────
// Full idempotent recalculation for an event:
//   1. Participation XP + participant badge for all players
//   2. Match win XP for all confirmed match winners
//   3. Placement XP + badges (1/2/3) if tournament is completed
//   4. tournament_regular badge check for each player
//
// Safe to call many times — ON CONFLICT DO NOTHING prevents duplicates.
export async function awardTournamentRewards(
  eventId: string,
  supabase: SupabaseClient,
): Promise<{ xpAwarded: number; badgesUnlocked: number; nothingNew: boolean }> {
  let xpAwarded    = 0
  let badgesUnlocked = 0

  // 1. Participation XP
  const participationAwarded = await awardParticipationXp(eventId, supabase)
  xpAwarded += participationAwarded

  // 2. Match win XP — all finished non-bye matches in this event
  const { data: matches } = await supabase
    .from('tournament_matches')
    .select('id, winner_id, is_bye, status')
    .eq('event_id', eventId)
    .in('status', ['confirmed', 'admin_resolved', 'completed'])
    .eq('is_bye', false)
    .not('winner_id', 'is', null)

  if (matches) {
    for (const m of matches) {
      const ok = await awardMatchWinXp(m.id, supabase)
      if (ok) xpAwarded++
    }
  }

  // 3. Placement rewards (only if completed)
  const { data: event } = await supabase
    .from('events')
    .select('tournament_status')
    .eq('id', eventId)
    .single()

  if (event?.tournament_status === 'completed') {
    const { xpAwarded: px, badgesUnlocked: bu } = await awardPlacementRewards(eventId, supabase)
    xpAwarded    += px
    badgesUnlocked += bu
  }

  // 4. tournament_regular badge check for all players
  const { data: players } = await supabase
    .from('tournament_players')
    .select('user_id')
    .eq('event_id', eventId)

  if (players) {
    for (const p of players) {
      const unlocked = await checkTournamentRegularBadge(p.user_id, eventId, supabase)
      if (unlocked) badgesUnlocked++
    }
  }

  return {
    xpAwarded,
    badgesUnlocked,
    nothingNew: xpAwarded === 0 && badgesUnlocked === 0,
  }
}
