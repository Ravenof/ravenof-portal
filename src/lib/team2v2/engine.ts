// ── 2v2 realaus laiko kovos variklis (FAZĖ 2, branduolys) ────────────────────
// Vienalaikis: nėra griežtų ėjimų — kiekvienas seat'as kaupia auksą laike ir gali
// veikti kai tik turi. Supaprastinta mechanika (kūriniai/atakos/bendras HP);
// ŽMK/efektų pilna parama — vėliau. Gryna logika (laikas perduodamas kaip `now` ms).

import type { SeatId, TeamId } from './types'
import { TEAM_HP_MAX } from './types'

export const GOLD_START = 200
export const GOLD_CAP = 1000
export const GOLD_PER_SEC = 60          // pajamų greitis
export const ATTACK_COOLDOWN_MS = 1600  // kiek laukti tarp atakų
export const SUMMON_SICK_MS = 1200      // ką tik iškviestas negali iškart pulti
export const HAND_MAX = 8
export const BOARD_SLOTS = 5

export type T2Zmk = '+0' | '+1' | '-1' | '+2' | '-2' | 'x2' | 'x0'
const ZMK_BAG: T2Zmk[] = [
  '+0','+0','+0','+0','+0','+0', '+1','+1','+1','+1','+1', '-1','-1','-1','-1','-1', '+2','-2','x2','x0',
]
function applyZmk(base: number, v: T2Zmk): number {
  switch (v) { case '+0': return base; case '+1': return base + 1; case '-1': return Math.max(0, base - 1)
    case '+2': return base + 2; case '-2': return Math.max(0, base - 2); case 'x2': return base * 2; case 'x0': return 0 }
}

export type T2Effect = { kind: 'damage' | 'aoeDamage' | 'heal' | 'buffAtk' | 'buffHp' | 'draw'; value: number }
export type T2Card = { uid: string; id: string; name: string; image: string | null; gold: number; atk: number; hp: number; factionColor: string; rarityColor: string; effects?: T2Effect[] }
export type T2Unit = { uid: string; card: T2Card; hp: number; maxHp: number; atk: number; bornAt: number; lastAttackAt: number }

export type T2Seat = {
  id: SeatId
  team: TeamId
  controller: 'human' | 'ai'
  name: string
  avatar: string
  gold: number
  goldFloat: number       // tikslesnis aukso kaupimas (float), gold = floor
  lastIncomeAt: number
  deck: T2Card[]
  hand: T2Card[]
  units: (T2Unit | null)[]
  lastDrawAt: number
  zmk: T2Zmk[]
  zmkGrave: T2Zmk[]
  lastZmk?: { v: T2Zmk; dmg: number; at: number }
  botSlug?: string | null
  difficulty?: 'easy' | 'normal' | 'hard'
}

export type T2Log = { id: number; t: number; msg: string }
export type T2State = {
  seats: Record<SeatId, T2Seat>
  order: SeatId[]
  teams: Record<TeamId, { hp: number; maxHp: number }>
  startedAt: number
  winner: TeamId | null
  log: T2Log[]
  _logId: number
}

const DRAW_INTERVAL_MS = 4000   // automatinis kortos traukimas kas 4 s

function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const enemyTeam = (t: TeamId): TeamId => (t === 'A' ? 'B' : 'A')
function log(s: T2State, now: number, msg: string) { s._logId++; s.log.push({ id: s._logId, t: now, msg }); if (s.log.length > 60) s.log.shift() }

export type SeatInit = { id: SeatId; team: TeamId; controller: 'human' | 'ai'; name: string; avatar: string; cards: T2Card[]; botSlug?: string | null; difficulty?: 'easy' | 'normal' | 'hard' }

export function createT2State(seats: SeatInit[], now = 0): T2State {
  const seatMap = {} as Record<SeatId, T2Seat>
  const order: SeatId[] = []
  for (const si of seats) {
    const deck = shuffle(si.cards)
    const hand = deck.splice(0, 4)
    seatMap[si.id] = {
      id: si.id, team: si.team, controller: si.controller, name: si.name, avatar: si.avatar,
      gold: GOLD_START, goldFloat: GOLD_START, lastIncomeAt: now, lastDrawAt: now,
      deck, hand, units: Array(BOARD_SLOTS).fill(null),
      zmk: shuffle([...ZMK_BAG]), zmkGrave: [],
      botSlug: si.botSlug, difficulty: si.difficulty,
    }
    order.push(si.id)
  }
  return {
    seats: seatMap, order,
    teams: { A: { hp: TEAM_HP_MAX, maxHp: TEAM_HP_MAX }, B: { hp: TEAM_HP_MAX, maxHp: TEAM_HP_MAX } },
    startedAt: now, winner: null, log: [], _logId: 0,
  }
}

function drawZmk(seat: T2Seat): T2Zmk {
  if (seat.zmk.length === 0) { seat.zmk = shuffle(seat.zmkGrave); seat.zmkGrave = [] }
  const v = (seat.zmk.pop() ?? '+0') as T2Zmk
  seat.zmkGrave.push(v)
  return v
}

/** Realaus laiko tika: auksas kaupiasi, periodiškai traukiama korta. Mutuoja state. */
export function tickEconomy(s: T2State, now: number): void {
  if (s.winner) return
  for (const id of s.order) {
    const seat = s.seats[id]
    const dt = Math.max(0, now - seat.lastIncomeAt)
    if (dt > 0) {
      seat.goldFloat = Math.min(GOLD_CAP, seat.goldFloat + (dt / 1000) * GOLD_PER_SEC)
      seat.gold = Math.floor(seat.goldFloat)
      seat.lastIncomeAt = now
    }
    if (now - seat.lastDrawAt >= DRAW_INTERVAL_MS && seat.hand.length < HAND_MAX && seat.deck.length > 0) {
      seat.hand.push(seat.deck.shift()!)
      seat.lastDrawAt = now
    }
  }
}

export function canPlay(seat: T2Seat, card: T2Card): boolean {
  return seat.gold >= card.gold && seat.units.some((u) => u === null)
}

function teamUnits(s: T2State, team: TeamId): { seatId: SeatId; slot: number; u: T2Unit }[] {
  const out: { seatId: SeatId; slot: number; u: T2Unit }[] = []
  for (const id of s.order) { const sx = s.seats[id]; if (sx.team === team) sx.units.forEach((u, slot) => { if (u) out.push({ seatId: id, slot, u }) }) }
  return out
}

function resolveBattlecry(s: T2State, seat: T2Seat, e: T2Effect, now: number): void {
  const foe = enemyTeam(seat.team)
  if (e.kind === 'damage') {
    const enemies = teamUnits(s, foe)
    if (enemies.length) {
      const tgt = enemies.sort((a, b) => a.u.hp - b.u.hp)[0]
      tgt.u.hp -= e.value
      log(s, now, `Kovos šūksnis: „${tgt.u.card.name}" gauna ${e.value} žalos.`)
      if (tgt.u.hp <= 0) { s.seats[tgt.seatId].units[tgt.slot] = null }
    } else {
      dmgTeam(s, foe, e.value, now, `Kovos šūksnis (${e.value})`)
    }
  } else if (e.kind === 'aoeDamage') {
    let n = 0
    for (const { seatId, slot, u } of teamUnits(s, foe)) { u.hp -= e.value; n++; if (u.hp <= 0) s.seats[seatId].units[slot] = null }
    log(s, now, `Kovos šūksnis: ${e.value} žalos visiems priešo kūriniams (${n}).`)
  } else if (e.kind === 'heal') {
    const t = s.teams[seat.team]; t.hp = Math.min(t.maxHp, t.hp + e.value)
    log(s, now, `Kovos šūksnis: +${e.value} HP komandai (${t.hp}/${t.maxHp}).`)
  } else if (e.kind === 'buffAtk' || e.kind === 'buffHp') {
    for (const { u } of teamUnits(s, seat.team)) { if (e.kind === 'buffAtk') u.atk += e.value; else { u.hp += e.value; u.maxHp += e.value } }
    log(s, now, `Kovos šūksnis: komandos kūriniai +${e.value} ${e.kind === 'buffAtk' ? 'ATK' : 'HP'}.`)
  } else if (e.kind === 'draw') {
    for (let i = 0; i < e.value && seat.hand.length < HAND_MAX && seat.deck.length > 0; i++) seat.hand.push(seat.deck.shift()!)
    log(s, now, `Kovos šūksnis: ${seat.name} traukia ${e.value} kortas.`)
  }
}

export function playUnit(s: T2State, seatId: SeatId, cardUid: string, now: number): boolean {
  if (s.winner) return false
  const seat = s.seats[seatId]
  const idx = seat.hand.findIndex((c) => c.uid === cardUid)
  if (idx < 0) return false
  const card = seat.hand[idx]
  if (!canPlay(seat, card)) return false
  const slot = seat.units.findIndex((u) => u === null)
  if (slot < 0) return false
  seat.hand.splice(idx, 1)
  seat.goldFloat -= card.gold; seat.gold = Math.floor(seat.goldFloat)
  seat.units[slot] = { uid: card.uid, card, hp: card.hp, maxHp: card.hp, atk: card.atk, bornAt: now, lastAttackAt: now }
  log(s, now, `${seat.name} iškviečia „${card.name}".`)
  for (const e of (card.effects ?? [])) { if (s.winner) break; resolveBattlecry(s, seat, e, now) }
  return true
}

export function unitReady(u: T2Unit, now: number): boolean {
  return now - u.bornAt >= SUMMON_SICK_MS && now - u.lastAttackAt >= ATTACK_COOLDOWN_MS
}

/** Ataka: taikinys – priešo komandos seat'o užduotis (unit uid) arba 'face:<seatId>' (komandos HP). */
export function attack(s: T2State, seatId: SeatId, attackerUid: string, target: { kind: 'unit'; seatId: SeatId; uid: string } | { kind: 'face'; team: TeamId }, now: number): boolean {
  if (s.winner) return false
  const seat = s.seats[seatId]
  const au = seat.units.find((u) => u?.uid === attackerUid) as T2Unit | undefined
  if (!au || !unitReady(au, now)) return false
  if (target.kind === 'face') {
    if (target.team === seat.team) return false
    const v = drawZmk(seat); const dmg = applyZmk(au.atk, v)
    seat.lastZmk = { v, dmg, at: now }
    dmgTeam(s, target.team, dmg, now, `„${au.card.name}" (${au.atk}${v !== '+0' ? ' ' + v : ''}=${dmg}) puola komandą`)
    au.lastAttackAt = now
    return true
  }
  const tSeat = s.seats[target.seatId]
  if (!tSeat || tSeat.team === seat.team) return false
  const slot = tSeat.units.findIndex((u) => u?.uid === target.uid)
  const def = slot >= 0 ? tSeat.units[slot] : null
  if (!def) return false
  // vienu metu: abu daro žalą (su ŽMK)
  const av = drawZmk(seat); const adm = applyZmk(au.atk, av); seat.lastZmk = { v: av, dmg: adm, at: now }
  const dv = drawZmk(tSeat); const ddm = applyZmk(def.atk, dv); tSeat.lastZmk = { v: dv, dmg: ddm, at: now }
  def.hp -= adm
  au.hp -= ddm
  log(s, now, `„${au.card.name}" (${adm}) ⚔ „${def.card.name}" (${ddm}).`)
  au.lastAttackAt = now
  if (def.hp <= 0) { tSeat.units[slot] = null; log(s, now, `„${def.card.name}" sunaikintas.`) }
  const aSlot = seat.units.findIndex((u) => u?.uid === au.uid)
  if (au.hp <= 0 && aSlot >= 0) { seat.units[aSlot] = null; log(s, now, `„${au.card.name}" sunaikintas.`) }
  return true
}

function dmgTeam(s: T2State, team: TeamId, dmg: number, now: number, reason: string): void {
  const t = s.teams[team]
  t.hp = Math.max(0, t.hp - Math.max(0, dmg))
  log(s, now, `${reason} → ${team} komanda ${t.hp}/${t.maxHp} HP.`)
  if (t.hp <= 0 && !s.winner) { s.winner = enemyTeam(team); log(s, now, `Komanda ${s.winner} laimi!`) }
}

// ── Botų sprendimai (perpanaudoja ranked „elgseną" supaprastintai) ───────────
/** Vienas boto veiksmas (jei yra). Grąžina true jei veikė. Bot AI kviečiamas su delsa UI sluoksnyje. */
export function botStep(s: T2State, seatId: SeatId, now: number): boolean {
  if (s.winner) return false
  const seat = s.seats[seatId]
  if (seat.controller !== 'ai') return false
  // 1) iškviesti įperkamą kūrinį (brangiausią įperkamą – stipresnė lenta)
  const playable = seat.hand.filter((c) => canPlay(seat, c)).sort((a, b) => b.gold - a.gold)
  const aggressive = seat.difficulty === 'easy' ? 0.5 : 0.85
  if (playable.length && Math.random() < 0.9) { return playUnit(s, seatId, playable[0].uid, now) }
  // 2) atakuoti su paruoštu kūriniu
  const ready = seat.units.filter((u): u is T2Unit => !!u && unitReady(u, now))
  if (ready.length) {
    const foe = enemyTeam(seat.team)
    const enemyUnits: { seatId: SeatId; u: T2Unit }[] = []
    for (const id of s.order) { const sx = s.seats[id]; if (sx.team === foe) for (const u of sx.units) if (u) enemyUnits.push({ seatId: id, u }) }
    const atk = ready[0]
    // sunkesni botai dažniau valo grėsmes; lengvi dažniau eina į veidą
    if (enemyUnits.length && Math.random() < (1 - aggressive)) {
      // rasti pelningą trade (nužudo ir išgyvena) arba stipriausią grėsmę
      const kill = enemyUnits.find((e) => atk.atk >= e.u.hp && e.u.atk < atk.hp) ?? enemyUnits.sort((a, b) => b.u.atk - a.u.atk)[0]
      return attack(s, seatId, atk.uid, { kind: 'unit', seatId: kill.seatId, uid: kill.u.uid }, now)
    }
    return attack(s, seatId, atk.uid, { kind: 'face', team: foe }, now)
  }
  return false
}
