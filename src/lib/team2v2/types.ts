// ── Ravenof 2v2 (komandinė kova) — pamatinis būsenos modelis ─────────────────
// FAZĖ 1: tik sąrankos/būsenos modelis. 4 seat'ai (2 komandos), bendras komandos
// HP pool'as (60). Tikras realaus laiko vienalaikis kovos variklis — kita fazė.
// Botai elgiasi kaip ranked botai (strategija/kalades), bet co-op rėžime jie
// AIŠKIAI pažymėti kaip AI (neapsimeta tikrais žaidėjais).

import type { AiWeightDelta } from '@/lib/tutorial/ai'

export const TEAM_HP_MAX = 60

export type SeatId = 'p0' | 'p1' | 'p2' | 'p3'
export type TeamId = 'A' | 'B'
export type Controller = 'human' | 'ai'

export type Seat = {
  id: SeatId
  team: TeamId
  controller: Controller
  name: string
  avatar: string
  faction: string | null
  factionSlug: string | null
  /** Žmogaus pasirinkta kaladė (controller='human'). */
  deckId?: string | null
  /** Boto identifikatorius (controller='ai'); strategija/sunkumas perpanaudoja ranked botus. */
  botSlug?: string | null
  difficulty?: 'easy' | 'normal' | 'hard'
  aiStrategy?: AiWeightDelta
}

export type Team = {
  id: TeamId
  seats: Seat[]          // 2 seat'ai
  hp: number             // bendras komandos HP
  maxHp: number
}

export type Team2v2State = {
  teams: [Team, Team]
  /** Kieno komandos eilė (FAZĖ 1 placeholder; realaus laiko fazėje keisis). */
  activeTeam: TeamId
  turn: number
  winner: TeamId | null
}

/** Komandai padaroma žala mažina bendrą pool'ą; pralaimi pasiekus 0. */
export function damageTeam(state: Team2v2State, team: TeamId, dmg: number): Team2v2State {
  const teams = state.teams.map((t) => t.id === team ? { ...t, hp: Math.max(0, t.hp - Math.max(0, dmg)) } : t) as [Team, Team]
  let winner = state.winner
  const a = teams.find((t) => t.id === 'A')!, b = teams.find((t) => t.id === 'B')!
  if (a.hp <= 0 && !winner) winner = 'B'
  if (b.hp <= 0 && !winner) winner = 'A'
  return { ...state, teams, winner }
}

export const teamOf = (state: Team2v2State, id: TeamId): Team => state.teams.find((t) => t.id === id)!
export const allySeat = (team: Team, seatId: SeatId): Seat | undefined => team.seats.find((s) => s.id !== seatId)
