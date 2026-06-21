// ── 2v2 co-op vs botai — mačo sąranka ────────────────────────────────────────
// Žmogus + 1 botas sąjungininkas (komanda A) prieš 2 botus (komanda B).
// Botai parenkami iš ranked katalogo (strategija/kaladė/sunkumas), bet pažymimi
// kaip AI (co-op nemeluoja, kad tai tikri žaidėjai).

import { RANKED_BOTS, type RankedBot } from '@/lib/ranked/bots'
import { strategyWeights } from '@/lib/ranked/aiStrategy'
import { TEAM_HP_MAX, type Team, type Team2v2State, type Seat } from './types'

function botToSeat(b: RankedBot, id: Seat['id'], team: Seat['team']): Seat {
  return {
    id, team, controller: 'ai',
    name: `${b.name} (AI)`,
    avatar: b.avatar || '🤖',
    faction: b.faction, factionSlug: b.factionSlug,
    botSlug: b.slug,
    difficulty: b.difficultyModifier,
    aiStrategy: strategyWeights(b),
  }
}

/** Parenka N skirtingų aktyvių botų (atsitiktinai). */
function pickBots(n: number): RankedBot[] {
  const pool = [...RANKED_BOTS]
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  return pool.slice(0, n)
}

export type CoopSetup = {
  state: Team2v2State
  playerDeckId: string
}

/** Sukuria 2v2 co-op vs botai būseną: žmogus+sąjungininkas vs 2 priešai, bendras 60 HP. */
export function buildCoopMatch(playerDeckId: string, playerName: string): CoopSetup {
  const [ally, foe1, foe2] = pickBots(3)
  const youSeat: Seat = {
    id: 'p0', team: 'A', controller: 'human',
    name: playerName || 'Tu', avatar: '🛡️',
    faction: null, factionSlug: null, deckId: playerDeckId,
  }
  const teamA: Team = { id: 'A', hp: TEAM_HP_MAX, maxHp: TEAM_HP_MAX, seats: [youSeat, botToSeat(ally, 'p1', 'A')] }
  const teamB: Team = { id: 'B', hp: TEAM_HP_MAX, maxHp: TEAM_HP_MAX, seats: [botToSeat(foe1, 'p2', 'B'), botToSeat(foe2, 'p3', 'B')] }
  return {
    playerDeckId,
    state: { teams: [teamA, teamB], activeTeam: 'A', turn: 1, winner: null },
  }
}
