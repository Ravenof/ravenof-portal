export type GameMode = '1v1' | '2v2'
export type ActionType = 'damage' | 'heal'

export type LogEntry = {
  id: string
  round: number
  sideIdx: 0 | 1
  targetName: string
  change: number      // negative = damage, positive = heal
  prevHp: number
  newHp: number
  actionType: ActionType
  timestamp: number
}

export type GameState = {
  mode: GameMode
  names: [string, string]
  hp: [number, number]
  maxHp: number
  round: number
  activeSide: 0 | 1
  log: LogEntry[]
  soundEnabled: boolean
}
