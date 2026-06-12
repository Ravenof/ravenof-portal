// ── Tutorial žaidimo varikliukas ──────────────────────────────────────────────
// Grynas TS state machine pagal Ravenof: Antrasis leidimas taisykles
// (src/data/rules.ts). Jokio UI – tik būsena, veiksmai ir įvykių log'as.
// Naudoja mokomasis režimas „Išmokyk mane žaisti" (TutorialGame.tsx).

export type Side = 'you' | 'ai'
export type TutCardType = 'unit' | 'spell' | 'artifact' | 'reaction' | 'field' | 'champion' | 'curse'
export type TutKeyword = 'sprint' | 'taunt' | 'shield' | 'stealth' | 'battlecry' | 'lastwish'
export type TutStatus = 'frozen' | 'stunned' | 'burning' | 'poisoned' | 'silenced'

export const STATUS_META: Record<TutStatus, { icon: string; name: string }> = {
  frozen:   { icon: '❄', name: 'Sušaldytas' },
  stunned:  { icon: '✦', name: 'Apsvaigintas' },
  burning:  { icon: '🔥', name: 'Degantis' },
  poisoned: { icon: '☠', name: 'Apnuodytas' },
  silenced: { icon: '🔇', name: 'Nutildytas' },
}

export const KEYWORD_META: Record<TutKeyword, { icon: string; name: string }> = {
  sprint:    { icon: '▶', name: 'Sprintas' },
  taunt:     { icon: '⊙', name: 'Pasišaipymas' },
  shield:    { icon: '✦★', name: 'Magiškasis skydas' },
  stealth:   { icon: '◑', name: 'Sėlinimas' },
  battlecry: { icon: '📣', name: 'Kovos šūksnis' },
  lastwish:  { icon: '🕯', name: 'Paskutinis noras' },
}

// Iš kortos teksto atpažintas efektas (supaprastintas)
export type ParsedEffect = {
  damage?: number
  aoe?: boolean          // žala visiems priešininko padarams
  heal?: number
  draw?: number
  gold?: number
  buffAtk?: number
  buffHp?: number
  status?: TutStatus
  coinflip?: boolean
  targeted: boolean      // ar reikia pasirinkti taikinį
}

export type TutCard = {
  id: string
  uid: string
  name: string
  image: string | null
  gold: number
  attack: number | null
  health: number | null
  type: TutCardType
  keywords: TutKeyword[]
  effectText: string
  rarityColor: string
  factionColor: string
  effect: ParsedEffect | null
}

export const PERMANENT = 9999

export type BoardUnit = {
  uid: string
  card: TutCard
  atk: number
  hp: number
  maxHp: number
  shield: boolean
  stealth: boolean
  // būsena -> savininko ėjimo nr., po kurio ji pašalinama (PERMANENT = kol pašalins efektas)
  statuses: Partial<Record<TutStatus, number>>
  summonedOnTurn: number   // globalTurn kada iškviestas
  attacksUsed: number
  isChampion: boolean
  phase: number            // čempiono fazė (1-3)
  abilityUsed: boolean
}

export type BoardArtifact = { uid: string; card: TutCard; hp: number; maxHp: number }
export type ReactionSlot = { uid: string; card: TutCard; paid: number }

export type ZmkValue = '+0' | '+1' | '-1' | '+2' | '-2' | 'x2' | 'x0'
const ZMK_COMPOSITION: [ZmkValue, number][] = [
  ['+0', 6], ['+1', 5], ['-1', 5], ['+2', 1], ['-2', 1], ['x2', 1], ['x0', 1],
]

export type PlayerState = {
  side: Side
  hp: number
  maxHp: number
  deck: TutCard[]
  hand: TutCard[]
  discard: TutCard[]
  units: (BoardUnit | null)[]      // 5 vietos
  artifacts: (BoardArtifact | null)[] // 2 vietos
  reactions: (ReactionSlot | null)[]  // 3 vietos
  zmk: ZmkValue[]
  zmkGrave: ZmkValue[]
  gold: number
  turnNumber: number               // kelintas ŠIO žaidėjo ėjimas
  discardedForGold: boolean
}

export type GameEventType =
  | 'start' | 'startTurn' | 'draw' | 'gold' | 'handBurn' | 'deckEmpty'
  | 'play' | 'battlecry' | 'spell' | 'artifact' | 'reactionSet' | 'field'
  | 'attack' | 'zmk' | 'zmkReshuffle' | 'damage' | 'heal' | 'death' | 'lastwish'
  | 'status' | 'buff' | 'discardGold' | 'endTurn' | 'win'
  | 'champion' | 'evolve' | 'ability' | 'reactionTrigger' | 'coin' | 'curse' | 'blocked'

export type GameEvent = {
  t: GameEventType
  side: Side
  msg: string
  cardName?: string
  value?: number
  zmk?: ZmkValue
  status?: TutStatus
  coin?: 'green' | 'red'
}

export type TargetRef =
  | { kind: 'player'; side: Side }
  | { kind: 'unit'; side: Side; uid: string }
  | { kind: 'artifact'; side: Side; uid: string }

export type GameState = {
  you: PlayerState
  ai: PlayerState
  active: Side
  field: { card: TutCard; owner: Side } | null
  globalTurn: number
  winner: Side | null
  log: GameEvent[]
}

// ── Pagalbinės ────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function other(s: Side): Side { return s === 'you' ? 'ai' : 'you' }
export function P(g: GameState, s: Side): PlayerState { return s === 'you' ? g.you : g.ai }

function freshZmk(): ZmkValue[] {
  const all: ZmkValue[] = []
  for (const [v, n] of ZMK_COMPOSITION) for (let i = 0; i < n; i++) all.push(v)
  return shuffle(all)
}

function log(g: GameState, e: GameEvent) { g.log.push(e) }
const sideName = (s: Side) => (s === 'you' ? 'Tu' : 'Priešininkas')

// ── Kortos teksto atpažinimas (lietuviškas tekstas → ParsedEffect) ────────────

export function parseEffect(text: string | null | undefined): ParsedEffect | null {
  if (!text) return null
  const t = text.toLowerCase()
  const e: ParsedEffect = { targeted: false }
  let any = false

  const dmg = t.match(/(\d+)\s*(?:bazin\w*\s*)?žal/)
  if (dmg) { e.damage = parseInt(dmg[1], 10); any = true }
  if (e.damage && /vis\w*\s+(?:priešinink\w*\s+)?padar/.test(t)) e.aoe = true

  const heal = t.match(/(?:gydo|atkuria|atgauna|pagydo)\D{0,12}(\d+)/)
  if (heal) { e.heal = parseInt(heal[1], 10); any = true }

  const draw = t.match(/(?:i?š?trauk\w*)\s*(\d+)?\s*kort/)
  if (draw) { e.draw = draw[1] ? parseInt(draw[1], 10) : 1; any = true }

  const gold = t.match(/\+?\s*(\d+)0{1,2}\s*auks/) // 100/200... aukso
  if (gold) { const m = t.match(/(\d+)\s*auks/); if (m) { e.gold = parseInt(m[1], 10); any = true } }

  const ba = t.match(/\+(\d+)\s*atk/)
  if (ba) { e.buffAtk = parseInt(ba[1], 10); any = true }
  const bh = t.match(/\+(\d+)\s*(?:hp|gyvyb)/)
  if (bh) { e.buffHp = parseInt(bh[1], 10); any = true }

  if (/sušald/.test(t)) { e.status = 'frozen'; any = true }
  else if (/apsvaig/.test(t)) { e.status = 'stunned'; any = true }
  else if (/padeg|degim|degant/.test(t)) { e.status = 'burning'; any = true }
  else if (/nuod/.test(t)) { e.status = 'poisoned'; any = true }
  else if (/nutild/.test(t)) { e.status = 'silenced'; any = true }

  if (/monet\w*\s*met/.test(t)) { e.coinflip = true; any = true }

  if (!any) return null
  e.targeted = !e.aoe && (e.damage !== undefined || e.status !== undefined || e.buffAtk !== undefined || e.buffHp !== undefined)
  return e
}

export function detectKeywords(keywordNames: string[], text: string | null | undefined): TutKeyword[] {
  const hay = (keywordNames.join(' ') + ' ' + (text ?? '')).toLowerCase()
  const out: TutKeyword[] = []
  if (/sprint|aggressive/.test(hay)) out.push('sprint')
  if (/pasišaip|taunt/.test(hay)) out.push('taunt')
  if (/magišk\w*\s*skyd|divine shield/.test(hay)) out.push('shield')
  if (/sėlin|stealth/.test(hay)) out.push('stealth')
  if (/kovos šūksn|battlecry/.test(hay)) out.push('battlecry')
  if (/paskutin\w*\s*nor|deathrattle/.test(hay)) out.push('lastwish')
  return out
}

export function mapCardType(typeName: string | null | undefined, isChampion: boolean): TutCardType {
  if (isChampion) return 'champion'
  const t = (typeName ?? '').toLowerCase()
  if (/čempion|champion/.test(t)) return 'champion'
  if (/burt|spell|kerai/.test(t)) return 'spell'
  if (/artefakt|relic|structure|statin/.test(t)) return 'artifact'
  if (/reak/.test(t)) return 'reaction'
  if (/lauk|field/.test(t)) return 'field'
  if (/prakeik|curse/.test(t)) return 'curse'
  return 'unit'
}

// ── Žaidimo kūrimas ───────────────────────────────────────────────────────────

function mkPlayer(side: Side, deck: TutCard[]): PlayerState {
  return {
    side, hp: 40, maxHp: 40,
    deck: shuffle(deck), hand: [], discard: [],
    units: [null, null, null, null, null],
    artifacts: [null, null],
    reactions: [null, null, null],
    zmk: freshZmk(), zmkGrave: [],
    gold: 0, turnNumber: 0, discardedForGold: false,
  }
}

/** Sukuria žaidimą: tu prieš AI su ta pačia (veidrodine) kalade. */
export function createGame(deckYou: TutCard[], deckAi: TutCard[], first: Side): GameState {
  const g: GameState = {
    you: mkPlayer('you', deckYou),
    ai: mkPlayer('ai', deckAi),
    active: first,
    field: null,
    globalTurn: 0,
    winner: null,
    log: [],
  }
  // Pradinės rankos: pirmasis 4, antrasis 5
  drawCards(g, first, 4, true)
  drawCards(g, other(first), 5, true)
  log(g, { t: 'start', side: first, msg: `Pradeda ${first === 'you' ? 'tu' : 'priešininkas'}. ${first === 'you' ? 'Tu trauki 4, jis 5.' : 'Jis traukia 4, tu 5 (kompensacija už antrą ėjimą).'}` })
  return g
}

// ── Traukimas / auksas ────────────────────────────────────────────────────────

function drawCards(g: GameState, s: Side, n: number, silent = false) {
  const p = P(g, s)
  for (let i = 0; i < n; i++) {
    const c = p.deck.pop()
    if (!c) { log(g, { t: 'deckEmpty', side: s, msg: `${sideName(s)} ${s === 'you' ? 'nebeturi' : 'nebeturi'} kortų kaladėje.` }); return }
    // Prakeiksmas aktyvuojasi iš karto kai ištraukiamas
    if (c.type === 'curse') {
      p.discard.push(c)
      const dmg = c.effect?.damage ?? 1
      log(g, { t: 'curse', side: s, cardName: c.name, value: dmg, msg: `${sideName(s)} ${s === 'you' ? 'ištraukei' : 'ištraukė'} prakeiksmą „${c.name}" – efektas aktyvuojasi iš karto!` })
      dealToPlayer(g, s, dmg, s, false)
      continue
    }
    if (p.hand.length >= 10) {
      p.discard.push(c)
      log(g, { t: 'handBurn', side: s, cardName: c.name, msg: `Rankos limitas 10 – „${c.name}" keliauja į panaudotų krūvą.` })
      continue
    }
    p.hand.push(c)
    if (!silent) log(g, { t: 'draw', side: s, cardName: s === 'you' ? c.name : undefined, msg: `${sideName(s)} ${s === 'you' ? 'trauki' : 'traukia'} kortą.` })
  }
}

// ── ŽMK ───────────────────────────────────────────────────────────────────────

function drawZmkCard(g: GameState, s: Side): ZmkValue {
  const p = P(g, s)
  if (p.zmk.length === 0) {
    p.zmk = shuffle(p.zmkGrave)
    p.zmkGrave = []
    log(g, { t: 'zmkReshuffle', side: s, msg: `${sideName(s)} ${s === 'you' ? 'permaišai' : 'permaišo'} ŽMK kaladę.` })
  }
  const v = p.zmk.pop() as ZmkValue
  p.zmkGrave.push(v)
  return v
}

function applyZmk(base: number, v: ZmkValue): number {
  switch (v) {
    case '+0': return base
    case '+1': return base + 1
    case '-1': return Math.max(0, base - 1)
    case '+2': return base + 2
    case '-2': return Math.max(0, base - 2)
    case 'x2': return base * 2
    case 'x0': return 0
  }
}

function zmkAfter(g: GameState, s: Side, v: ZmkValue) {
  // ×2 / ×0 – po žalos išsprendimo ŽMK + kapinynas permaišomi
  if (v === 'x2' || v === 'x0') {
    const p = P(g, s)
    p.zmk = shuffle([...p.zmk, ...p.zmkGrave])
    p.zmkGrave = []
    log(g, { t: 'zmkReshuffle', side: s, msg: `Ištraukta ${v === 'x2' ? '×2' : '×0'} – ŽMK permaišoma iš naujo.` })
  }
}

/** Žala su ŽMK. unfavorable – traukiamos 2, imama blogesnė veikėjui. */
function rollDamage(g: GameState, actor: Side, base: number, unfavorable: boolean): number {
  let v = drawZmkCard(g, actor)
  if (unfavorable) {
    const v2 = drawZmkCard(g, actor)
    const a = applyZmk(base, v)
    const b = applyZmk(base, v2)
    const worse = a <= b ? v : v2
    log(g, { t: 'zmk', side: actor, zmk: worse, value: Math.min(a, b), msg: `Nepalankiai: ŽMK ${v} ir ${v2} – imama blogesnė.` })
    zmkAfter(g, actor, v); zmkAfter(g, actor, v2)
    return Math.min(a, b)
  }
  const dmg = applyZmk(base, v)
  log(g, { t: 'zmk', side: actor, zmk: v, value: dmg, msg: `ŽMK: ${v} → ${base} bazinė žala tampa ${dmg}.` })
  zmkAfter(g, actor, v)
  return dmg
}

// ── Žalos taikymas / mirtys ───────────────────────────────────────────────────

function dealToPlayer(g: GameState, target: Side, base: number, actor: Side, useZmk = true) {
  const dmg = useZmk ? rollDamage(g, actor, base, false) : base
  if (dmg <= 0) return
  const p = P(g, target)
  p.hp -= dmg
  log(g, { t: 'damage', side: target, value: dmg, msg: `${sideName(target)} ${target === 'you' ? 'gauni' : 'gauna'} ${dmg} žalos. Liko ${Math.max(0, p.hp)} HP.` })
  checkWin(g)
}

function dealToUnit(g: GameState, target: BoardUnit, owner: Side, base: number, actor: Side, useZmk = true) {
  if (target.shield) {
    target.shield = false
    log(g, { t: 'damage', side: owner, cardName: target.card.name, value: 0, msg: `✦★ Magiškasis skydas anuliuoja žalą „${target.card.name}" – ŽMK netraukiama.` })
    return
  }
  const dmg = useZmk ? rollDamage(g, actor, base, false) : base
  if (dmg <= 0) {
    log(g, { t: 'damage', side: owner, cardName: target.card.name, value: 0, msg: `„${target.card.name}" žalos negauna (0).` })
    return
  }
  target.hp -= dmg
  log(g, { t: 'damage', side: owner, cardName: target.card.name, value: dmg, msg: `„${target.card.name}" gauna ${dmg} žalos (${Math.max(0, target.hp)}/${target.maxHp}).` })
  if (target.hp <= 0) killUnit(g, owner, target)
}

function dealToArtifact(g: GameState, target: BoardArtifact, owner: Side, base: number, actor: Side) {
  const dmg = rollDamage(g, actor, base, false)
  if (dmg <= 0) return
  target.hp -= dmg
  log(g, { t: 'damage', side: owner, cardName: target.card.name, value: dmg, msg: `Artefaktas „${target.card.name}" gauna ${dmg} žalos.` })
  if (target.hp <= 0) {
    const p = P(g, owner)
    p.artifacts = p.artifacts.map((a) => (a?.uid === target.uid ? null : a))
    p.discard.push(target.card)
    log(g, { t: 'death', side: owner, cardName: target.card.name, msg: `Artefaktas „${target.card.name}" sunaikintas.` })
  }
}

function killUnit(g: GameState, owner: Side, u: BoardUnit) {
  const p = P(g, owner)
  const idx = p.units.findIndex((x) => x?.uid === u.uid)
  if (idx === -1) return
  // Paskutinis noras – prieš kortai keliaujant į krūvą (jei nenutildytas)
  if (u.card.keywords.includes('lastwish') && !u.statuses.silenced && u.card.effect) {
    log(g, { t: 'lastwish', side: owner, cardName: u.card.name, msg: `🕯 „${u.card.name}" Paskutinis noras aktyvuojasi!` })
    applyAutoEffect(g, owner, u.card.effect, u.card.name)
  }
  p.units[idx] = null
  p.discard.push(u.card)
  log(g, { t: 'death', side: owner, cardName: u.card.name, msg: `„${u.card.name}" žūsta ir keliauja į panaudotų krūvą.` })
}

function checkWin(g: GameState) {
  if (g.winner) return
  if (g.you.hp <= 0) { g.winner = 'ai'; log(g, { t: 'win', side: 'ai', msg: 'Tavo HP nukrito iki 0. Priešininkas laimi!' }) }
  else if (g.ai.hp <= 0) { g.winner = 'you'; log(g, { t: 'win', side: 'you', msg: 'Priešininko HP nukrito iki 0. TU LAIMĖJAI! 🏆' }) }
}

// ── Efektų taikymas ───────────────────────────────────────────────────────────

function coinOk(g: GameState, s: Side, e: ParsedEffect): boolean {
  if (!e.coinflip) return true
  const green = Math.random() < 0.5
  log(g, { t: 'coin', side: s, coin: green ? 'green' : 'red', msg: green ? '🪙 Monetos metimas: ŽALIA – efektas pavyksta!' : '🪙 Monetos metimas: RAUDONA – efektas nepavyksta.' })
  return green
}

/** Efektas be rankinio taikinio (Paskutinis noras, AoE, draw/gold/heal). */
function applyAutoEffect(g: GameState, s: Side, e: ParsedEffect, srcName: string) {
  if (!coinOk(g, s, e)) return
  const foe = other(s)
  if (e.damage !== undefined) {
    if (e.aoe) {
      const targets = P(g, foe).units.filter((u): u is BoardUnit => !!u)
      for (const t of targets) dealToUnit(g, t, foe, e.damage, s) // kiekvienam atskira ŽMK
    } else {
      // automatinis taikinys: silpniausias priešo padaras, kitaip – žaidėjas
      const units = P(g, foe).units.filter((u): u is BoardUnit => !!u && !u.stealth)
      const t = units.sort((a, b) => a.hp - b.hp)[0]
      if (t) dealToUnit(g, t, foe, e.damage, s)
      else dealToPlayer(g, foe, e.damage, s)
    }
  }
  if (e.heal) healSide(g, s, e.heal)
  if (e.draw) drawCards(g, s, e.draw)
  if (e.gold) { P(g, s).gold += e.gold; log(g, { t: 'gold', side: s, value: e.gold, msg: `${sideName(s)} ${s === 'you' ? 'gauni' : 'gauna'} +${e.gold} aukso („${srcName}").` }) }
}

function healSide(g: GameState, s: Side, n: number) {
  const p = P(g, s)
  // gydom labiausiai sužeistą padarą, jei visi sveiki – herojų
  const hurt = p.units.filter((u): u is BoardUnit => !!u && u.hp < u.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0]
  if (hurt) {
    const before = hurt.hp
    hurt.hp = Math.min(hurt.maxHp, hurt.hp + n)
    log(g, { t: 'heal', side: s, cardName: hurt.card.name, value: hurt.hp - before, msg: `„${hurt.card.name}" pagydomas ${hurt.hp - before} HP.` })
  } else {
    const before = p.hp
    p.hp = Math.min(p.maxHp, p.hp + n)
    if (p.hp > before) log(g, { t: 'heal', side: s, value: p.hp - before, msg: `${sideName(s)} ${s === 'you' ? 'atgauni' : 'atgauna'} ${p.hp - before} HP.` })
  }
}

function applyTargetedEffect(g: GameState, s: Side, e: ParsedEffect, target: TargetRef, srcName: string) {
  if (!coinOk(g, s, e)) return
  if (target.kind === 'player') {
    if (e.damage) dealToPlayer(g, target.side, e.damage, s)
    if (e.heal && target.side === s) { const p = P(g, s); const b = p.hp; p.hp = Math.min(p.maxHp, p.hp + e.heal); if (p.hp > b) log(g, { t: 'heal', side: s, value: p.hp - b, msg: `${sideName(s)} ${s === 'you' ? 'atgauni' : 'atgauna'} ${p.hp - b} HP.` }) }
  } else if (target.kind === 'unit') {
    const u = P(g, target.side).units.find((x) => x?.uid === target.uid)
    if (!u) { log(g, { t: 'blocked', side: s, msg: 'Taikinys nebegalioja – efekto dalis neįvyksta.' }); return }
    if (e.damage) dealToUnit(g, u, target.side, e.damage, s)
    if (u.hp > 0) {
      if (e.heal) { const b = u.hp; u.hp = Math.min(u.maxHp, u.hp + e.heal); if (u.hp > b) log(g, { t: 'heal', side: target.side, cardName: u.card.name, value: u.hp - b, msg: `„${u.card.name}" pagydomas ${u.hp - b} HP.` }) }
      if (e.buffAtk) { u.atk += e.buffAtk; log(g, { t: 'buff', side: target.side, cardName: u.card.name, msg: `„${u.card.name}" gauna +${e.buffAtk} ATK.` }) }
      if (e.buffHp) { u.hp += e.buffHp; u.maxHp += e.buffHp; log(g, { t: 'buff', side: target.side, cardName: u.card.name, msg: `„${u.card.name}" gauna +${e.buffHp} HP.` }) }
      if (e.status) applyStatus(g, target.side, u, e.status)
    }
  } else {
    const a = P(g, target.side).artifacts.find((x) => x?.uid === target.uid)
    if (a && e.damage) dealToArtifact(g, a, target.side, e.damage, s)
  }
  if (e.draw) drawCards(g, s, e.draw)
  if (e.gold) { P(g, s).gold += e.gold; log(g, { t: 'gold', side: s, value: e.gold, msg: `+${e.gold} aukso („${srcName}").` }) }
}

function applyStatus(g: GameState, owner: Side, u: BoardUnit, st: TutStatus) {
  const p = P(g, owner)
  // frozen/stunned/silenced: pašalinama savininko KITO ėjimo pabaigoje
  // burning/poisoned: kol pašalins efektas (PERMANENT)
  const until = st === 'burning' || st === 'poisoned' ? PERMANENT : p.turnNumber + 1
  u.statuses[st] = until
  log(g, { t: 'status', side: owner, cardName: u.card.name, status: st, msg: `${STATUS_META[st].icon} „${u.card.name}" gauna būseną: ${STATUS_META[st].name}.` })
}

// ── Ėjimo pradžia / pabaiga ───────────────────────────────────────────────────

export function beginTurn(g: GameState): GameState {
  if (g.winner) return g
  const s = g.active
  const p = P(g, s)
  g.globalTurn += 1
  p.turnNumber += 1
  p.discardedForGold = false
  log(g, { t: 'startTurn', side: s, msg: `— ${sideName(s)} ${s === 'you' ? 'pradedi' : 'pradeda'} ${p.turnNumber}-ą ėjimą —` })

  // 1. Ėjimo pradžios efektai: Degantis / Apnuodytas (1 bazinė žala + ŽMK)
  for (const u of [...p.units]) {
    if (!u) continue
    if (u.statuses.burning) {
      log(g, { t: 'status', side: s, cardName: u.card.name, status: 'burning', msg: `🔥 „${u.card.name}" dega – 1 bazinė žala.` })
      dealToUnit(g, u, s, 1, s)
    }
    const stillAlive = p.units.some((x) => x?.uid === u.uid)
    if (stillAlive && u.statuses.poisoned) {
      log(g, { t: 'status', side: s, cardName: u.card.name, status: 'poisoned', msg: `☠ „${u.card.name}" apnuodytas – 1 bazinė žala.` })
      dealToUnit(g, u, s, 1, s)
    }
  }
  // Artefaktų „ėjimo pradžioje" efektai (supaprastinta)
  for (const a of p.artifacts) {
    if (!a) continue
    const e = a.card.effect
    if (e && /ėjimo pradž/i.test(a.card.effectText)) {
      log(g, { t: 'artifact', side: s, cardName: a.card.name, msg: `Artefaktas „${a.card.name}" suveikia.` })
      applyAutoEffect(g, s, e, a.card.name)
    }
  }
  // atstatom atakas / gebėjimus
  for (const u of p.units) {
    if (!u) continue
    u.attacksUsed = 0
    u.abilityUsed = false
  }
  if (g.winner) return g

  // 2. Kortos traukimas
  drawCards(g, s, 1)
  // 3. Aukso gavimas pagal ėjimo numerį
  p.gold = Math.min(p.turnNumber, 10) * 100
  log(g, { t: 'gold', side: s, value: p.gold, msg: `${sideName(s)} ${s === 'you' ? 'gauni' : 'gauna'} ${p.gold} aukso (${p.turnNumber}${p.turnNumber >= 10 ? '+' : ''} ėjimas).` })
  return g
}

export function endTurn(g: GameState): GameState {
  if (g.winner) return g
  const s = g.active
  const p = P(g, s)
  // pašalinam pasibaigusias būsenas (frozen/stunned/silenced iki šio ėjimo pabaigos)
  for (const u of p.units) {
    if (!u) continue
    for (const k of Object.keys(u.statuses) as TutStatus[]) {
      const until = u.statuses[k]
      if (until !== undefined && until !== PERMANENT && p.turnNumber >= until) {
        delete u.statuses[k]
        log(g, { t: 'status', side: s, cardName: u.card.name, status: k, msg: `„${u.card.name}" būsena ${STATUS_META[k].name} baigėsi.` })
      }
    }
  }
  p.gold = 0
  log(g, { t: 'endTurn', side: s, msg: `${sideName(s)} ${s === 'you' ? 'baigi' : 'baigia'} ėjimą. Nepanaudotas auksas dingsta.` })
  g.active = other(s)
  return g
}

// ── Veiksmai ──────────────────────────────────────────────────────────────────

export type PlayResult = { ok: true } | { ok: false; reason: string }

export function canAfford(g: GameState, s: Side, card: TutCard): boolean {
  return P(g, s).gold >= card.gold
}

export function discardForGold(g: GameState, s: Side, uid: string): PlayResult {
  const p = P(g, s)
  if (p.discardedForGold) return { ok: false, reason: 'Tik 1 kartą per ėjimą gali išmesti kortą dėl aukso.' }
  const i = p.hand.findIndex((c) => c.uid === uid)
  if (i === -1) return { ok: false, reason: 'Kortos nėra rankoje.' }
  const [c] = p.hand.splice(i, 1)
  p.discard.push(c)
  p.gold += 100
  p.discardedForGold = true
  log(g, { t: 'discardGold', side: s, cardName: c.name, msg: `${sideName(s)} ${s === 'you' ? 'išmeti' : 'išmeta'} „${c.name}" ir ${s === 'you' ? 'gauni' : 'gauna'} +100 aukso (${p.gold}).` })
  return { ok: true }
}

export function playCard(g: GameState, s: Side, uid: string, opts?: { target?: TargetRef; sacrificeUid?: string }): PlayResult {
  if (g.winner) return { ok: false, reason: 'Žaidimas baigtas.' }
  if (g.active !== s) return { ok: false, reason: 'Ne tavo ėjimas.' }
  const p = P(g, s)
  const i = p.hand.findIndex((c) => c.uid === uid)
  if (i === -1) return { ok: false, reason: 'Kortos nėra rankoje.' }
  const card = p.hand[i]
  if (p.gold < card.gold) return { ok: false, reason: `Trūksta aukso: kaina ${card.gold}, turi ${p.gold}.` }

  switch (card.type) {
    case 'unit': {
      const slot = p.units.findIndex((u) => u === null)
      if (slot === -1) return { ok: false, reason: 'Padarų zona pilna (maks. 5).' }
      p.hand.splice(i, 1)
      p.gold -= card.gold
      const u: BoardUnit = {
        uid: card.uid, card,
        atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
        shield: card.keywords.includes('shield'),
        stealth: card.keywords.includes('stealth'),
        statuses: {}, summonedOnTurn: g.globalTurn, attacksUsed: 0,
        isChampion: false, phase: 0, abilityUsed: false,
      }
      p.units[slot] = u
      log(g, { t: 'play', side: s, cardName: card.name, value: card.gold, msg: `${sideName(s)} ${s === 'you' ? 'iškvieti' : 'iškviečia'} „${card.name}" (${card.gold} aukso).${card.keywords.includes('sprint') ? ' ▶ Sprintas – gali atakuoti iš karto!' : ''}` })
      if (card.keywords.includes('battlecry') && card.effect) {
        log(g, { t: 'battlecry', side: s, cardName: card.name, msg: `📣 „${card.name}" Kovos šūksnis!` })
        if (card.effect.targeted && opts?.target) applyTargetedEffect(g, s, card.effect, opts.target, card.name)
        else applyAutoEffect(g, s, card.effect, card.name)
      }
      return { ok: true }
    }
    case 'spell': {
      p.hand.splice(i, 1)
      p.gold -= card.gold
      log(g, { t: 'spell', side: s, cardName: card.name, value: card.gold, msg: `${sideName(s)} ${s === 'you' ? 'panaudoji' : 'panaudoja'} burtą „${card.name}" (${card.gold} aukso).` })
      if (card.effect) {
        if (card.effect.targeted && opts?.target) applyTargetedEffect(g, s, card.effect, opts.target, card.name)
        else applyAutoEffect(g, s, card.effect, card.name)
      }
      p.discard.push(card)
      return { ok: true }
    }
    case 'artifact': {
      const slot = p.artifacts.findIndex((a) => a === null)
      if (slot === -1) return { ok: false, reason: 'Artefaktų zona pilna (maks. 2).' }
      p.hand.splice(i, 1)
      p.gold -= card.gold
      p.artifacts[slot] = { uid: card.uid, card, hp: card.health ?? 3, maxHp: card.health ?? 3 }
      log(g, { t: 'artifact', side: s, cardName: card.name, value: card.gold, msg: `${sideName(s)} ${s === 'you' ? 'padedi' : 'padeda'} artefaktą „${card.name}".` })
      return { ok: true }
    }
    case 'reaction': {
      const slot = p.reactions.findIndex((r) => r === null)
      if (slot === -1) return { ok: false, reason: 'Reakcijų zona pilna (maks. 3).' }
      p.hand.splice(i, 1)
      p.gold -= card.gold
      p.reactions[slot] = { uid: card.uid, card, paid: card.gold }
      log(g, { t: 'reactionSet', side: s, value: card.gold, msg: `${sideName(s)} ${s === 'you' ? 'padedi' : 'padeda'} užverstą reakciją su ${card.gold} aukso žetonu.` })
      return { ok: true }
    }
    case 'field': {
      p.hand.splice(i, 1)
      p.gold -= card.gold
      if (g.field) {
        const oldOwner = P(g, g.field.owner)
        oldOwner.discard.push(g.field.card)
        log(g, { t: 'field', side: s, cardName: g.field.card.name, msg: `Sena lauko korta „${g.field.card.name}" pakeičiama.` })
      }
      g.field = { card, owner: s }
      log(g, { t: 'field', side: s, cardName: card.name, msg: `${sideName(s)} ${s === 'you' ? 'žaidi' : 'žaidžia'} lauko kortą „${card.name}" – veikia abu žaidėjus.` })
      return { ok: true }
    }
    case 'champion': {
      const existing = p.units.find((u) => u?.isChampion)
      if (existing) {
        // Evoliucija: reikia kortos rankoje + aukos
        if (!opts?.sacrificeUid) return { ok: false, reason: 'Evoliucijai reikia paaukoti padarą.' }
        const sacIdx = p.units.findIndex((u) => !!u && u.uid === opts.sacrificeUid && !u.isChampion)
        if (sacIdx === -1) return { ok: false, reason: 'Aukai pasirink savo padarą.' }
        p.hand.splice(i, 1)
        p.gold -= card.gold
        const sac = p.units[sacIdx] as BoardUnit
        p.units[sacIdx] = null
        p.discard.push(sac.card)
        log(g, { t: 'death', side: s, cardName: sac.card.name, msg: `„${sac.card.name}" paaukojamas.` })
        existing.phase += 1
        existing.card = card
        existing.maxHp = card.health ?? existing.maxHp + 2
        existing.hp = existing.maxHp // evoliucionavęs pilnai pagyja
        log(g, { t: 'evolve', side: s, cardName: card.name, msg: `⚜ Čempionas evoliucionuoja į ${existing.phase}-ą fazę ir pilnai pagyja!` })
        return { ok: true }
      }
      const slot = p.units.findIndex((u) => u === null)
      if (slot === -1) return { ok: false, reason: 'Padarų zona pilna (maks. 5, įskaitant Čempioną).' }
      if (!opts?.sacrificeUid) return { ok: false, reason: 'Čempiono iškvietimui reikia paaukoti padarą.' }
      const sacIdx = p.units.findIndex((u) => !!u && u.uid === opts.sacrificeUid && !u.isChampion)
      if (sacIdx === -1) return { ok: false, reason: 'Aukai pasirink savo padarą.' }
      p.hand.splice(i, 1)
      p.gold -= card.gold
      const sac = p.units[sacIdx] as BoardUnit
      p.units[sacIdx] = null
      p.discard.push(sac.card)
      log(g, { t: 'death', side: s, cardName: sac.card.name, msg: `„${sac.card.name}" paaukojamas Čempionui.` })
      const freeSlot = p.units.findIndex((u) => u === null)
      p.units[freeSlot] = {
        uid: card.uid, card, atk: 0,
        hp: card.health ?? 8, maxHp: card.health ?? 8,
        shield: false, stealth: false, statuses: {},
        summonedOnTurn: g.globalTurn, attacksUsed: 0,
        isChampion: true, phase: 1, abilityUsed: false,
      }
      log(g, { t: 'champion', side: s, cardName: card.name, value: card.gold, msg: `⚜ ${sideName(s)} ${s === 'you' ? 'iškvieti' : 'iškviečia'} Čempioną „${card.name}" (1 fazė)! Čempionas nėra padaras ir neatakuoja – naudoja gebėjimus.` })
      return { ok: true }
    }
    case 'curse':
      return { ok: false, reason: 'Prakeiksmai žaidžiami tik per kortų efektus.' }
  }
}

export function useChampionAbility(g: GameState, s: Side, opts?: { target?: TargetRef }): PlayResult {
  if (g.active !== s) return { ok: false, reason: 'Ne tavo ėjimas.' }
  const p = P(g, s)
  const ch = p.units.find((u) => u?.isChampion)
  if (!ch) return { ok: false, reason: 'Neturi Čempiono kovos lauke.' }
  if (ch.abilityUsed) return { ok: false, reason: 'Gebėjimas – tik 1 kartą per ėjimą.' }
  if (ch.statuses.frozen || ch.statuses.stunned) return { ok: false, reason: `Čempionas ${ch.statuses.frozen ? 'sušaldytas' : 'apsvaigintas'} – gebėjimas negalimas.` }
  if (ch.statuses.silenced) return { ok: false, reason: 'Čempionas nutildytas – gebėjimai blokuojami.' }
  ch.abilityUsed = true
  const e = ch.card.effect ?? { damage: ch.phase, targeted: true }
  // gebėjimo galia auga su faze
  const boosted: ParsedEffect = { ...e }
  if (boosted.damage) boosted.damage += ch.phase - 1
  if (boosted.heal) boosted.heal += ch.phase - 1
  log(g, { t: 'ability', side: s, cardName: ch.card.name, msg: `⚜ „${ch.card.name}" naudoja gebėjimą (${ch.phase} fazė).` })
  if (boosted.targeted && opts?.target) applyTargetedEffect(g, s, boosted, opts.target, ch.card.name)
  else applyAutoEffect(g, s, boosted, ch.card.name)
  return { ok: true }
}

// ── Atakos ────────────────────────────────────────────────────────────────────

export function effectiveAtk(g: GameState, u: BoardUnit): number {
  let atk = u.atk
  if (g.field?.card.effect?.buffAtk) atk += g.field.card.effect.buffAtk
  return atk
}

export function canUnitAttack(g: GameState, s: Side, u: BoardUnit): { ok: boolean; reason?: string } {
  if (u.isChampion) return { ok: false, reason: 'Čempionas neturi ATK ir negali atakuoti – naudok gebėjimą.' }
  if (u.attacksUsed >= 1) return { ok: false, reason: 'Šis padaras jau atakavo šį ėjimą.' }
  if (u.statuses.frozen) return { ok: false, reason: '❄ Padaras sušaldytas – praleidžia veikimo galimybę.' }
  if (u.statuses.stunned) return { ok: false, reason: '✦ Padaras apsvaigintas – negali atakuoti.' }
  if (u.summonedOnTurn === g.globalTurn && !u.card.keywords.includes('sprint'))
    return { ok: false, reason: 'Padaras iškviestas šį ėjimą – atakuoti galės kitą ėjimą (nebent turėtų ▶ Sprintą).' }
  if (effectiveAtk(g, u) <= 0) return { ok: false, reason: 'Padaro ATK = 0.' }
  return { ok: true }
}

/** Teisėti atakos taikiniai (Pasišaipymas + Sėlinimas). */
export function legalTargets(g: GameState, attackerSide: Side): TargetRef[] {
  const foe = other(attackerSide)
  const fp = P(g, foe)
  const taunts = fp.units.filter((u): u is BoardUnit => !!u && u.card.keywords.includes('taunt') && !u.stealth)
  if (taunts.length > 0) return taunts.map((u) => ({ kind: 'unit', side: foe, uid: u.uid }))
  const out: TargetRef[] = []
  for (const u of fp.units) if (u && !u.stealth) out.push({ kind: 'unit', side: foe, uid: u.uid })
  for (const a of fp.artifacts) if (a) out.push({ kind: 'artifact', side: foe, uid: a.uid })
  out.push({ kind: 'player', side: foe })
  return out
}

function maybeTriggerReaction(g: GameState, defender: Side, attacker: BoardUnit, attackerSide: Side) {
  const dp = P(g, defender)
  // naujausia padėta reakcija suveikia pirma
  for (let i = dp.reactions.length - 1; i >= 0; i--) {
    const r = dp.reactions[i]
    if (!r) continue
    dp.reactions[i] = null
    dp.discard.push(r.card)
    log(g, { t: 'reactionTrigger', side: defender, cardName: r.card.name, msg: `⚡ Reakcija! ${sideName(defender)} ${defender === 'you' ? 'atverti' : 'atverčia'} „${r.card.name}" – ji suveikia prieš ataką.` })
    const e = r.card.effect
    if (e?.damage) dealToUnit(g, attacker, attackerSide, e.damage, defender)
    else if (e) applyAutoEffect(g, defender, e, r.card.name)
    else dealToUnit(g, attacker, attackerSide, 1, defender)
    return
  }
}

export function attack(g: GameState, s: Side, attackerUid: string, target: TargetRef): PlayResult {
  if (g.winner) return { ok: false, reason: 'Žaidimas baigtas.' }
  if (g.active !== s) return { ok: false, reason: 'Ne tavo ėjimas.' }
  const p = P(g, s)
  const u = p.units.find((x) => x?.uid === attackerUid)
  if (!u) return { ok: false, reason: 'Padaro nėra kovos lauke.' }
  const can = canUnitAttack(g, s, u)
  if (!can.ok) return { ok: false, reason: can.reason ?? '' }
  const legal = legalTargets(g, s)
  const isLegal = legal.some((t) =>
    t.kind === target.kind && t.side === target.side && ('uid' in t ? t.uid === (target as { uid?: string }).uid : true))
  if (!isLegal) return { ok: false, reason: '⊙ Pasišaipymas! Privalai pulti padarą su Pasišaipymu.' }

  u.attacksUsed += 1
  if (u.stealth) { u.stealth = false; log(g, { t: 'status', side: s, cardName: u.card.name, msg: `◑ „${u.card.name}" Sėlinimas baigiasi po atakos.` }) }
  const foe = other(s)
  const atk = effectiveAtk(g, u)
  const unfav = !!u.statuses.poisoned // Apnuodytas puola nepalankiai

  // Gynėjo reakcija (jei turi) – „paskutinis aktyvavęsis sprendžiamas pirmas"
  maybeTriggerReaction(g, foe, u, s)
  if (!p.units.some((x) => x?.uid === u.uid)) return { ok: true } // žuvo nuo reakcijos

  if (target.kind === 'unit') {
    const def = P(g, foe).units.find((x) => x?.uid === target.uid)
    if (!def) { log(g, { t: 'blocked', side: s, msg: 'Taikinys nebegalioja.' }); return { ok: true } }
    log(g, { t: 'attack', side: s, cardName: u.card.name, msg: `⚔ „${u.card.name}" (${atk} ATK) atakuoja „${def.card.name}" – abu traukia po ŽMK!` })
    const defAtk = def.isChampion ? 0 : effectiveAtk(g, def)
    const defRetaliates = !def.statuses.frozen && defAtk > 0 // Sušaldytas nedaro atgalinės žalos
    // abu žalą daro vienu metu: puolančiojo žala gynėjui
    if (def.shield) {
      def.shield = false
      log(g, { t: 'damage', side: foe, cardName: def.card.name, value: 0, msg: `✦★ Magiškasis skydas anuliuoja žalą „${def.card.name}".` })
    } else {
      const dmg = rollDamage(g, s, atk, unfav)
      def.hp -= dmg
      log(g, { t: 'damage', side: foe, cardName: def.card.name, value: dmg, msg: `„${def.card.name}" gauna ${dmg} žalos (${Math.max(0, def.hp)}/${def.maxHp}).` })
    }
    // atgalinė žala puolančiajam
    if (defRetaliates) {
      if (u.shield) {
        u.shield = false
        log(g, { t: 'damage', side: s, cardName: u.card.name, value: 0, msg: `✦★ Magiškasis skydas anuliuoja atgalinę žalą „${u.card.name}".` })
      } else {
        const back = rollDamage(g, foe, defAtk, !!def.statuses.poisoned)
        u.hp -= back
        log(g, { t: 'damage', side: s, cardName: u.card.name, value: back, msg: `Atgalinė žala: „${u.card.name}" gauna ${back} (${Math.max(0, u.hp)}/${u.maxHp}).` })
      }
    } else if (def.statuses.frozen) {
      log(g, { t: 'status', side: foe, cardName: def.card.name, status: 'frozen', msg: `❄ „${def.card.name}" sušaldytas – atgalinės žalos nedaro.` })
    }
    if (def.hp <= 0) killUnit(g, foe, def)
    if (u.hp <= 0) killUnit(g, s, u)
  } else if (target.kind === 'artifact') {
    const a = P(g, foe).artifacts.find((x) => x?.uid === target.uid)
    if (!a) return { ok: true }
    log(g, { t: 'attack', side: s, cardName: u.card.name, msg: `⚔ „${u.card.name}" atakuoja artefaktą „${a.card.name}" – atgalinės žalos negauna.` })
    dealToArtifact(g, a, foe, atk, s)
  } else {
    log(g, { t: 'attack', side: s, cardName: u.card.name, msg: `⚔ „${u.card.name}" atakuoja ${foe === 'ai' ? 'priešininką' : 'tave'} tiesiogiai!` })
    if (unfav) { const dmg = rollDamage(g, s, atk, true); if (dmg > 0) { P(g, foe).hp -= dmg; log(g, { t: 'damage', side: foe, value: dmg, msg: `${sideName(foe)} ${foe === 'you' ? 'gauni' : 'gauna'} ${dmg} žalos. Liko ${Math.max(0, P(g, foe).hp)} HP.` }); checkWin(g) } }
    else dealToPlayer(g, foe, atk, s)
  }
  checkWin(g)
  return { ok: true }
}

// ── Klonavimas (UI immutability) ──────────────────────────────────────────────

export function cloneState(g: GameState): GameState {
  return JSON.parse(JSON.stringify(g)) as GameState
}
