// ── Tutorial žaidimo varikliukas ──────────────────────────────────────────────
// Grynas TS state machine pagal Ravenof: Antrasis leidimas taisykles
// (src/data/rules.ts). Jokio UI – tik būsena, veiksmai ir įvykių log'as.
// Naudoja mokomasis režimas „Išmokyk mane žaisti" (TutorialGame.tsx).

import type { GameplayConfig, EffectMapping, ZmkCardDef, ZmkMode, ProjectileType, BattleSoundType, SpellType, AttackRestriction } from '@/lib/game/types'
import { buildZmkDeck } from '@/lib/game/zmkEngine'
import { applyMappings, applyMapping, mappingNeedsSelection, type GameApi } from '@/lib/game/effectEngine'
import { activateCurses as curseActivate, buildCurseDeck } from '@/lib/game/curseEngine'
import * as fieldEngine from '@/lib/game/fieldEngine'
import { fireTrigger } from '@/lib/game/triggerSystem'
import type { ResolvedTarget } from '@/lib/game/targetResolver'
import { t } from '@/lib/i18n/core'

export type Side = 'you' | 'ai' | 'ally' | 'foe2'  // 1v1: you/ai; 2v2 komandos: A={you,ally} B={ai,foe2}
export type TeamId = 'A' | 'B'
export type TeamConfig = { id: TeamId; seatIds: Side[]; hp: number; maxHp: number; sharedHp: boolean }
export type TutCardType = 'unit' | 'spell' | 'artifact' | 'reaction' | 'field' | 'champion' | 'curse'
export type TutKeyword = 'sprint' | 'taunt' | 'shield' | 'stealth' | 'battlecry' | 'lastwish'
export type TutStatus = 'frozen' | 'stunned' | 'burning' | 'poisoned' | 'silenced' | 'blessed'

export const STATUS_META: Record<TutStatus, { icon: string; name: string }> = {
  frozen:   { icon: '❄', name: 'Sušaldytas' },
  stunned:  { icon: '✦', name: 'Apsvaigintas' },
  burning:  { icon: '🔥', name: 'Degantis' },
  poisoned: { icon: '☠', name: 'Apnuodytas' },
  silenced: { icon: '🔇', name: 'Nutildytas' },
  blessed:  { icon: '🕊', name: 'Palaimintas' },
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
  subtype?: string | null   // ZOMBIE / GOBLIN / DEMON ir pan.
  championGroup?: string | null  // čempiono šeima (3 fazės dalinasi)
  championPhase?: number | null  // kuri fazė (1/2/3) yra ši korta
  keywords: TutKeyword[]
  effectText: string
  rarityColor: string
  rarityName?: string | null
  factionColor: string
  factionId?: number | null
  factionName?: string | null
  effect: ParsedEffect | null
  /** Admin gameplay konfigūracija (cards.gameplay JSONB) */
  gameplay?: GameplayConfig | null
  /** Aktyvūs mapping'ai (iš gameplay; tuščia = legacy teksto parserio kelias) */
  mappings?: EffectMapping[]
  /** Adminui: kortai reikia suvesti efektų mapping'ą */
  needsMapping?: boolean
  /** resurrectSelf su oncePerGame: ar prisikėlimas jau panaudotas šiame žaidime */
  _resurrectUsed?: boolean
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
  auraAtk?: number         // šiuo metu pritaikytas auros ATK priedas (perskaičiuojamas)
  auraHp?: number          // šiuo metu pritaikytas auros HP priedas (perskaičiuojamas)
  auraKw?: TutKeyword[]     // auros suteikti raktažodžiai (taunt/sprint; perskaičiuojami)
  auraSilence?: boolean     // ar nutildymą suteikė aura (kad strip jį nuimtų)
  auraCantAttack?: boolean  // aura blokuoja atakas
  auraShield?: boolean      // skydą suteikė aura
  auraStealth?: boolean     // sėlinimą suteikė aura
  auraStatusImmune?: TutStatus[] // aura blokuoja ŠIAS būsenas (perskaičiuojama; union iš visų šaltinių)
  tempBuffs?: { atk: number; hp: number; kind: 'endOfTurn' | 'untilNextTurn'; turn: number }[]  // laikini buff'ai (nuiminėjami ėjimo riboje)
  control?: { from: Side; kind: 'endOfTurn' | 'untilNextTurn'; turn: number }  // laikinai perimta kontrolė (takeControl); from = kam grąžinti, turn = valdytojo turnNumber
}

export type BoardArtifact = { uid: string; card: TutCard; hp: number; maxHp: number }
export type ReactionSlot = { uid: string; card: TutCard; paid: number }

export type ZmkValue = '+0' | '+1' | '-1' | '+2' | '-2' | 'x2' | 'x0'

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
  /** Prakeiksmų side deck (Demonų mechanika) */
  curses: TutCard[]
  /** Atakų skaičius šį ėjimą (lauko limitui) */
  attacksThisTurn: number
  /** Ar šio ėjimo pirmos žalos sumažinimas (field pasyvas) jau panaudotas */
  fieldDamageReducedThisTurn: boolean
  /** Kito burto aukso nuolaida (Archimagas Lisarijus). Panaudojama vieną kartą. */
  spellDiscountNext: number
  /** Burtų žalos priedas (charakterio onCast trigger'is +X). Kaupiasi. */
  spellDamageBonus: number
  /** Aukso bauda, taikoma šio žaidėjo kito ėjimo pradžioje (priešo efektas). */
  goldPenaltyNextTurn: number
  /** Sekančios kortos kainos modifikatoriai (cardCostMod). Kiekvienas suvartojamas, kai sužaidžiama atitinkama korta. */
  nextCardCostMods: { delta: number; cardType: string | null }[]
}

export type GameEventType =
  | 'start' | 'startTurn' | 'draw' | 'gold' | 'handBurn' | 'deckEmpty'
  | 'play' | 'battlecry' | 'spell' | 'artifact' | 'reactionSet' | 'field' | 'returnHand'
  | 'attack' | 'zmk' | 'zmkReshuffle' | 'damage' | 'heal' | 'death' | 'lastwish'
  | 'status' | 'buff' | 'discardGold' | 'endTurn' | 'win'
  | 'champion' | 'evolve' | 'ability' | 'reactionTrigger' | 'coin' | 'curse' | 'blocked'
  | 'fxSource'

export type GameEvent = {
  t: GameEventType
  side: Side
  /**
   * i18n raktas (`battleLog.*`). Log'as saugomas STRUKTŪRIŠKAI – tekstas
   * sugeneruojamas render'e (eventText), tad pakeitus kalbą persirenderuoja
   * ir istoriniai įrašai. Naujuose įvykiuose `key` yra privalomas de facto.
   */
  key?: string
  /** Interpoliacijos parametrai. Reikšmė su `$t:` prefiksu išsprendžiama kaip vertimo raktas. */
  params?: Record<string, string | number>
  /** @deprecated Paliktas tik atgaliniam suderinamumui (seni įrašai / 2v2). Naudok key+params. */
  msg?: string
  cardName?: string
  value?: number
  zmk?: ZmkValue
  /** Pranašumo/nepalankumo traukimas: abi ŽMK reikšmės + kuri panaudota. */
  zmkPair?: [ZmkValue, ZmkValue]
  zmkPicked?: ZmkValue
  bias?: RollBias
  status?: TutStatus
  /** Status VFX sistema: struktūrizuotas būsenos įvykis (žr. statusVfx.ts) */
  statusEvt?: 'apply' | 'trigger' | 'remove' | 'destroy'
  /** Status VFX: platesnis nei TutStatus (shield/stealth/control/...) */
  statusId?: string
  coin?: 'green' | 'red'
  /** Animacijoms: šaltinis (kortos uid arba žaidėjas) */
  src?: { side: Side; uid?: string }
  /** Animacijoms: taikinys */
  tgt?: { kind: 'player' | 'unit' | 'artifact' | 'field'; side?: Side; uid?: string }
  projectile?: ProjectileType
  sound?: BattleSoundType
  fromZone?: 'hand' | 'deck' | 'graveyard'
  /** Čempiono skill kino pop-up: kuris skill (0..2) panaudotas. */
  skillIndex?: number
}

/** Trumpalaikis ŽMK traukimo kontekstas (atakos/burto pranašumui/nepalankumui). */
export type RollBias = 'normal' | 'advantage' | 'disadvantage'
export type RollContext =
  | { kind: 'attack'; actor: Side; poisonedSides?: Partial<Record<Side, boolean>>; blessedSides?: Partial<Record<Side, boolean>> }
  | { kind: 'spell'; actor: Side; spellType?: SpellType }

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
  /** ŽMK režimas: 'auto' – automatinis, 'draw' – žaidėjas atverčia pats */
  zmkMode: ZmkMode
  /** ŽMK kortų definicijos (value -> pavadinimas/aprašymas, iš zmk_cards) */
  zmkDefs: Record<string, ZmkCardDef>
  /** Laukiantis „peržiūrėk N → pasirink K" pasirinkimas (žaidėjui) */
  pendingPeek?: PendingPeek | null
  /** Laukianti kaladės viršaus peržiūra (tik skaitymui) */
  pendingReveal?: PendingReveal | null
  /** Laukiantis iškvietimo pasirinkimas (žaidėjas renkasi kortą) */
  pendingSummon?: PendingSummon | null
  /** Laukiantis „pasirink 1 iš kelių" / tutor pasirinkimas */
  pendingChoice?: PendingChoice | null
  /** Laukiantis efekto kopijavimas iš kapinyno (#5) */
  pendingCopy?: PendingCopy | null
  pendingReturn?: { side: Side } | null   // laukas: ėjimo pradžioje grąžink savo padarą į ranką (žaidėjas renkasi)
  // Special summon battlecry, kuriam reikia RANKINIO taikinio: korta švyti,
  // paspaudus renkamasi taikinys (resolveBattlecry). idx = mapping indeksai kortoje.
  pendingBattlecry?: { side: Side; uid: string; rounds: number; idx: number[] } | null
  /** Trumpalaikis ŽMK traukimo kontekstas (nevalomas tarp veiksmų – išvalomas kiekvieno veiksmo pradžioje) */
  rollContext?: RollContext | null
  /** Paskutinis mill (UI animacijai: kortos iš kaladės į kapinyną) */
  lastMill?: { id: number; side: Side; cards: TutCard[] } | null
  /** Žaidžiamas burtas atšauktas reakcija (onAnyCast „castSpell" taikinys) – efektas nevyksta. */
  spellCountered?: boolean
  // ── 2v2 komandinis sluoksnis (adityvus; 1v1 šių nenaudoja) ──
  mode?: '1v1' | '2v2'
  teams?: Record<TeamId, TeamConfig>
  activeTeam?: TeamId
  extraSeats?: Partial<Record<Side, PlayerState>>
  winnerTeam?: TeamId | null
}

export type PendingPeek = { caster: Side; victim: Side; choose: number; cards: TutCard[]; toHand?: boolean }
/** title/titleParams = i18n raktas + parametrai (tekstas gimsta render'e per ltext()). */
export type PendingReveal = { whoseDeck: Side; title: string; titleParams?: Record<string, string | number>; cards: TutCard[] }
export type PendingSummon = { caster: Side; choose: number; options: { card: TutCard; zone: 'hand' | 'deck' | 'discard' }[] }
export type PendingChoice = {
  caster: Side
  chooser?: Side
  sourceName: string
  /** i18n raktas (+ params) – NE gatavas tekstas. */
  title: string
  titleParams?: Record<string, string | number>
  kind: 'effect' | 'tutorHand'
  options: { label: string; sub?: string }[]
  branches?: EffectMapping[][]
  cards?: TutCard[]
}

export type PendingCopy = { caster: Side; sourceUid: string; sourceName: string; options: { card: TutCard; side: Side }[] }

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
export function P(g: GameState, s: Side): PlayerState { return g.extraSeats?.[s] ?? (s === 'you' ? g.you : g.ai) }

/** Visi žaidėjų seat'ai (1v1: you/ai; 2v2: 4). */
export function allSeats(g: GameState): Side[] { return g.teams ? [...g.teams.A.seatIds, ...g.teams.B.seatIds] : ['you', 'ai'] }
export function teamOfSeat(g: GameState, s: Side): TeamId { if (g.teams) return g.teams.A.seatIds.includes(s) ? 'A' : 'B'; return s === 'you' ? 'A' : 'B' }
function sameTeam(g: GameState, a: Side, b: Side): boolean { return teamOfSeat(g, a) === teamOfSeat(g, b) }
export function friendlySeats(g: GameState, s: Side): Side[] { if (g.teams) return g.teams[teamOfSeat(g, s)].seatIds; return [s] }
export function enemySeats(g: GameState, s: Side): Side[] { if (g.teams) { const t = teamOfSeat(g, s); return g.teams[t === 'A' ? 'B' : 'A'].seatIds }; return [other(s)] }
export function teamConfig(g: GameState, t: TeamId): TeamConfig | undefined { return g.teams?.[t] }

function log(g: GameState, e: GameEvent) { g.log.push(e) }
/** Rakto šoninis sufiksas: 2v2 seat'ai suvedami į „tu" / „priešininkas". */
const SK = (s: Side) => (s === 'you' || s === 'ally' ? 'you' : 'ai')
/** Vertimo rakto nuoroda param'e (išsprendžia eventText). */
const tref = (key: string) => `$t:${key}`

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
  else if (/palaimin/.test(t)) { e.status = 'blessed'; any = true }

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

function mkPlayer(side: Side, deck: TutCard[], zmkPile: ZmkValue[], curses: TutCard[]): PlayerState {
  return {
    side, hp: 40, maxHp: 40,
    deck: shuffle(deck), hand: [], discard: [],
    units: [null, null, null, null, null],
    artifacts: [null, null],
    reactions: [null, null, null],
    zmk: zmkPile, zmkGrave: [],
    gold: 0, turnNumber: 0, discardedForGold: false,
    curses, attacksThisTurn: 0, fieldDamageReducedThisTurn: false,
    spellDiscountNext: 0, spellDamageBonus: 0, goldPenaltyNextTurn: 0, nextCardCostMods: [],
  }
}

export type CreateGameOpts = {
  /** ŽMK kortos iš zmk_cards lentelės (admin). Nenurodyta – oficiali sudėtis. */
  zmkDefs?: ZmkCardDef[] | null
  /** Prakeiksmų side deck kortos (curse tipo kortos iš DB) */
  curseCards?: TutCard[]
}

/** Sukuria žaidimą: tu prieš AI su ta pačia (veidrodine) kalade. */
export function createGame(deckYou: TutCard[], deckAi: TutCard[], first: Side, opts?: CreateGameOpts): GameState {
  const zmkYou = buildZmkDeck(opts?.zmkDefs)
  const zmkAi = buildZmkDeck(opts?.zmkDefs)
  const curseCards = opts?.curseCards ?? []
  const g: GameState = {
    you: mkPlayer('you', deckYou, zmkYou.pile, buildCurseDeck(curseCards, 'y')),
    ai: mkPlayer('ai', deckAi, zmkAi.pile, buildCurseDeck(curseCards, 'a')),
    active: first,
    field: null,
    globalTurn: 0,
    winner: null,
    log: [],
    zmkMode: zmkYou.mode,
    zmkDefs: zmkYou.defs,
    pendingPeek: null,
    pendingReveal: null,
    pendingSummon: null,
    pendingChoice: null,
    pendingCopy: null,
    rollContext: null,
    lastMill: null,
  }
  // Pradinės rankos: pirmasis 4, antrasis 5
  drawCards(g, first, 4, true)
  drawCards(g, other(first), 5, true)
  log(g, { t: 'start', side: first, key: `battleLog.start.${SK(first)}` })
  recomputeAuras(g)
  return g
}

/** 2v2 partija: 4 seat'ai (you+ally vs ai+foe2), 2 komandos su bendru 60 HP, mode '2v2'. */
export function createGame2v2(decks: { you: TutCard[]; ally: TutCard[]; ai: TutCard[]; foe2: TutCard[] }, firstTeam: TeamId, opts?: CreateGameOpts): GameState {
  const mk = (side: Side, deck: TutCard[], tag: string) => mkPlayer(side, deck, buildZmkDeck(opts?.zmkDefs).pile, buildCurseDeck(opts?.curseCards ?? [], tag))
  const zmkMeta = buildZmkDeck(opts?.zmkDefs)
  const g: GameState = {
    you: mk('you', decks.you, 'y'),
    ai: mk('ai', decks.ai, 'a'),
    extraSeats: { ally: mk('ally', decks.ally, 'al'), foe2: mk('foe2', decks.foe2, 'f2') },
    teams: {
      A: { id: 'A', seatIds: ['you', 'ally'], hp: 60, maxHp: 60, sharedHp: true },
      B: { id: 'B', seatIds: ['ai', 'foe2'], hp: 60, maxHp: 60, sharedHp: true },
    },
    mode: '2v2',
    activeTeam: firstTeam,
    active: firstTeam === 'A' ? 'you' : 'ai',
    field: null, globalTurn: 0, winner: null, winnerTeam: null, log: [],
    zmkMode: zmkMeta.mode, zmkDefs: zmkMeta.defs,
    pendingPeek: null, pendingReveal: null, pendingSummon: null, pendingChoice: null, pendingCopy: null,
    rollContext: null, lastMill: null,
  }
  for (const sd of ['you', 'ally', 'ai', 'foe2'] as Side[]) drawCards(g, sd, 4, true)
  recomputeAuras(g)
  log(g, { t: 'start', side: g.active, key: 'battleLog.start2v2', params: { team: firstTeam } })
  return g
}

// ── Traukimas / auksas ────────────────────────────────────────────────────────

function drawCards(g: GameState, s: Side, n: number, silent = false) {
  const p = P(g, s)
  for (let i = 0; i < n; i++) {
    const c = p.deck.pop()
    if (!c) { log(g, { t: 'deckEmpty', side: s, key: `battleLog.deckEmpty.${SK(s)}` }); return }
    // Prakeiksmas (įmaišytas priešo) aktyvuojasi kai jį ištrauki – efektas tenka tau.
    if (c.type === 'curse') {
      activateCurseCard(g, s, c, 'drawn')
      if (g.winner) return
      continue
    }
    if (p.hand.length >= 10) {
      p.discard.push(c)
      log(g, { t: 'handBurn', side: s, cardName: c.name, key: 'battleLog.handLimitBurn', params: { card: c.name } })
      continue
    }
    p.hand.push(c)
    if (!silent) log(g, { t: 'draw', side: s, cardName: c.name, key: `battleLog.draw.${SK(s)}`, sound: 'draw' })
    // onDraw mapping'ai (pvz. „ištraukus šią kortą – aktyvuojamas prakeiksmas")
    const onDraw = (c.mappings ?? []).filter((m) => m.trigger === 'onDraw')
    if (onDraw.length > 0 && !silent) {
      applyMappings(gameApi, g, s, c.mappings ?? [], 'onDraw', { sourceName: c.name, depth: 0 })
      if (g.winner) return
    }
    if (!silent) fireGlobalListeners(g, 'onAnyDraw', { side: s })
  }
}

// ── ŽMK ───────────────────────────────────────────────────────────────────────

function drawZmkCard(g: GameState, s: Side): ZmkValue {
  const p = P(g, s)
  if (p.zmk.length === 0) {
    p.zmk = shuffle(p.zmkGrave)
    p.zmkGrave = []
    log(g, { t: 'zmkReshuffle', side: s, key: `battleLog.zmkReshuffle.${SK(s)}` })
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
    log(g, { t: 'zmkReshuffle', side: s, key: 'battleLog.zmkSpecialReshuffle', params: { value: v === 'x2' ? '×2' : '×0' } })
  }
}

/** Žala su ŽMK. bias: advantage – traukiamos 2, imama geresnė; disadvantage – blogesnė. */
function rollDamage(g: GameState, actor: Side, base: number, bias: RollBias = 'normal'): number {
  const v = drawZmkCard(g, actor)
  if (bias !== 'normal') {
    const v2 = drawZmkCard(g, actor)
    const a = applyZmk(base, v)
    const b = applyZmk(base, v2)
    const adv = bias === 'advantage'
    const pick = adv ? (a >= b ? v : v2) : (a <= b ? v : v2)
    const val = adv ? Math.max(a, b) : Math.min(a, b)
    log(g, { t: 'zmk', side: actor, zmk: pick, value: val, zmkPair: [v, v2], zmkPicked: pick, bias, key: `battleLog.zmkBias.${adv ? 'adv' : 'dis'}`, params: { a: v, b: v2 } })
    zmkAfter(g, actor, v); zmkAfter(g, actor, v2)
    return val
  }
  const dmg = applyZmk(base, v)
  log(g, { t: 'zmk', side: actor, zmk: v, value: dmg, key: 'battleLog.zmkRoll', params: { zmk: v, base, dmg } })
  zmkAfter(g, actor, v)
  return dmg
}

// ── Pranašumas / nepalankumas + burtų vampyrizmas (pasyvios auros) ────────────
function combineBias(n: number): RollBias {
  return n > 0 ? 'advantage' : n < 0 ? 'disadvantage' : 'normal'
}
/** Sumuoja pranašumo (+1) / nepalankumo (−1) auras, veikiančias `side` traukimą. */
function netAuraBias(g: GameState, side: Side, kind: 'attack' | 'spell', spellType?: SpellType): number {
  let n = 0
  for (const sd of allSeats(g)) {
    const p = P(g, sd)
    const srcs = [
      ...p.units.filter((u): u is BoardUnit => !!u && !u.statuses.silenced),
      ...p.artifacts.filter((a): a is BoardArtifact => !!a),
    ]
    for (const c of srcs) {
      const cfg = c.card.gameplay?.passiveAura
      if (!cfg) continue
      const scope = cfg.auraScope ?? 'friendly'
      const affects = scope === 'all' || (scope === 'friendly' ? sameTeam(g, sd, side) : !sameTeam(g, sd, side))
      if (!affects) continue
      if (kind === 'attack' && cfg.advAttack) n += cfg.advAttack === 'advantage' ? 1 : -1
      if (kind === 'spell' && cfg.advSpell) {
        if (cfg.advSpellType && cfg.advSpellType !== spellType) continue
        n += cfg.advSpell === 'advantage' ? 1 : -1
      }
    }
  }
  return n
}
/** ŽMK bias pagal dabartinį rollContext (atakos poison + auros). */
function ctxBias(g: GameState, roller: Side): RollBias {
  const c = g.rollContext
  if (!c) return 'normal'
  if (c.kind === 'spell') {
    if (c.actor !== roller) return 'normal'
    return combineBias(netAuraBias(g, roller, 'spell', c.spellType))
  }
  const poison = c.poisonedSides?.[roller] ? -1 : 0
  const blessed = c.blessedSides?.[roller] ? 1 : 0
  return combineBias(netAuraBias(g, roller, 'attack') + poison + blessed)
}
/** Burtų vampyrizmas: burto žala (kai rollContext = spell) gydo aurą turinčią pusę. */
function applySpellLifesteal(g: GameState, dmg: number) {
  const c = g.rollContext
  if (!c || c.kind !== 'spell' || dmg <= 0) return
  const caster = c.actor
  for (const sd of allSeats(g)) {
    const p = P(g, sd)
    const srcs = [
      ...p.units.filter((u): u is BoardUnit => !!u && !u.statuses.silenced),
      ...p.artifacts.filter((a): a is BoardArtifact => !!a),
    ]
    let heal = false
    for (const c2 of srcs) {
      const sc = c2.card.gameplay?.passiveAura?.spellLifestealScope
      if (!sc) continue
      const trigger = sc === 'all' || (sc === 'friendly' ? caster === sd : caster !== sd)
      if (trigger) { heal = true; break }
    }
    if (!heal) continue
    const before = p.hp
    p.hp = Math.min(p.maxHp, p.hp + dmg)
    if (p.hp > before) log(g, { t: 'heal', side: sd, value: p.hp - before, key: `battleLog.spellVampirism.${SK(sd)}`, params: { hp: p.hp - before, dmg }, sound: 'heal' })
  }
}

// ── Žalos taikymas / mirtys ───────────────────────────────────────────────────

type PassiveAura = NonNullable<TutCard['gameplay']>['passiveAura']
/** Visos pasyvios auros (padarų/artefaktų), veikiančios konkretų padarą (uid, savininkas). */
function aurasAffecting(g: GameState, ownerSide: Side, uid: string): PassiveAura[] {
  const out: PassiveAura[] = []
  const ownerUnit = P(g, ownerSide).units.find((u) => u?.uid === uid)
  const unitSubtype = (ownerUnit?.card.subtype ?? '').trim().toLowerCase()
  for (const sd of allSeats(g)) {
    const p = P(g, sd)
    const srcs = [
      ...p.units.filter((u): u is BoardUnit => !!u && !u.statuses.silenced),
      ...p.artifacts.filter((a): a is BoardArtifact => !!a),
    ]
    for (const c of srcs) {
      const cfg = c.card.gameplay?.passiveAura
      if (!cfg) continue
      const scope = cfg.auraScope ?? 'friendly'
      const affects = scope === 'all' || (scope === 'friendly' ? sameTeam(g, sd, ownerSide) : !sameTeam(g, sd, ownerSide))
      if (!affects) continue
      if (c.uid === uid && !cfg.auraIncludesSelf) continue
      if (cfg.auraSubtype && cfg.auraSubtype.trim().toLowerCase() !== unitSubtype) continue
      if (cfg.auraFaction && ownerUnit?.card.factionId !== cfg.auraFaction) continue
      out.push(cfg)
    }
  }
  return out
}
/** Žalos mažinimas % paveiktam padarui (suma, ribota iki 90%). */
function auraDamageReductionPctFor(g: GameState, ownerSide: Side, uid: string): number {
  let pct = 0
  for (const cfg of aurasAffecting(g, ownerSide, uid)) pct += cfg?.auraDamageReductionPct ?? 0
  return Math.min(90, Math.max(0, pct))
}
/** Ar padaras nemirtingas dėl auros (lieka 1 HP, nežūsta). */
function unitIsImmortal(g: GameState, ownerSide: Side, uid: string): boolean {
  return aurasAffecting(g, ownerSide, uid).some((cfg) => !!cfg?.auraImmortal)
}
/** Antros atakos aura: jei puolantysis sunaikino padarą (su sąlyga) – grąžinam jam atakos teisę. */
function grantSecondAttackIfAura(g: GameState, side: Side, u: BoardUnit, killed: { taunt: boolean; shield: boolean }) {
  for (const cfg of aurasAffecting(g, side, u.uid)) {
    if (!cfg?.auraSecondAttack) continue
    const cond = cfg.auraSecondAttackCond ?? 'any'
    const ok = cond === 'any' || (cond === 'taunt' && killed.taunt) || (cond === 'shield' && killed.shield)
    if (!ok) continue
    const p = P(g, side)
    u.attacksUsed = Math.max(0, u.attacksUsed - 1)
    p.attacksThisTurn = Math.max(0, p.attacksThisTurn - 1)
    log(g, { t: 'buff', side, cardName: u.card.name, key: 'battleLog.attackAgain', params: { card: u.card.name }, src: { side, uid: u.uid } })
    return
  }
}
/** Burtų žalos priedas iš aurų caster pusės (atitinkamo tipo) burtams. */
export function auraSpellDamageBonus(g: GameState, caster: Side, spellType?: SpellType): number {
  let bonus = 0
  for (const sd of allSeats(g)) {
    const p = P(g, sd)
    const srcs = [
      ...p.units.filter((u): u is BoardUnit => !!u && !u.statuses.silenced),
      ...p.artifacts.filter((a): a is BoardArtifact => !!a),
    ]
    for (const c of srcs) {
      const cfg = c.card.gameplay?.passiveAura
      if (!cfg?.auraSpellDamage) continue
      const scope = cfg.auraScope ?? 'friendly'
      const affects = scope === 'all' || (scope === 'friendly' ? sameTeam(g, sd, caster) : !sameTeam(g, sd, caster))
      if (!affects) continue
      if (cfg.auraSpellType && cfg.auraSpellType !== spellType) continue
      bonus += cfg.auraSpellDamage
    }
  }
  return bonus
}
/** Bazinės žalos priedas iš burtų aurų (jei dabar vykdomas caster burtas). */
function spellAuraBonusFor(g: GameState, actor: Side): number {
  const c = g.rollContext
  if (!c || c.kind !== 'spell' || c.actor !== actor) return 0
  return auraSpellDamageBonus(g, actor, c.spellType)
}

/** Ar lauke (bet kurioje pusėje) yra aktyvi „žala žaidėjams ×2" aura (padaras/artefaktas, nenutildytas). */
function heroDamageDoubleActive(g: GameState): boolean {
  for (const sd of allSeats(g)) {
    const p = P(g, sd)
    for (const u of p.units) if (u && !u.statuses.silenced && u.card.gameplay?.passiveAura?.auraHeroDamageDouble) return true
    for (const a of p.artifacts) if (a && a.card.gameplay?.passiveAura?.auraHeroDamageDouble) return true
  }
  return false
}

function dealToPlayer(g: GameState, target: Side, base: number, actor: Side, useZmk = true) {
  const base2 = base + spellAuraBonusFor(g, actor)
  let dmg = useZmk ? rollDamage(g, actor, base2, ctxBias(g, actor)) : base2
  const fr = fieldEngine.applyFirstDamageReduction(g, target, dmg)
  if (fr.reduced) { dmg = fr.dmg; log(g, { t: 'field', side: target, key: 'battleLog.fieldReduceFirst', params: { dmg } }) }
  if (dmg <= 0) return
  // Aura: žala žaidėjams ×2 (kol bet kurioje pusėje lauke yra nenutildyta korta su auraHeroDamageDouble)
  if (heroDamageDoubleActive(g)) {
    dmg *= 2
    log(g, { t: 'damage', side: target, key: 'battleLog.auraDoublePlayerDmg', params: { dmg } })
  }
  const left = applyPlayerDamage(g, target, dmg)
  log(g, { t: 'damage', side: target, value: dmg, projectile: (g as unknown as { __fxProjectile?: ProjectileType }).__fxProjectile, key: `battleLog.playerDamage.${SK(target)}`, params: { dmg, left } })
  applySpellLifesteal(g, dmg)
  fireGlobalListeners(g, 'onAnyDamage', { side: target })
  checkWin(g)
}

function dealToUnit(g: GameState, target: BoardUnit, owner: Side, base: number, actor: Side, useZmk = true, overflow = false) {
  if (target.shield) {
    target.shield = false
    log(g, { t: 'damage', side: owner, cardName: target.card.name, value: 0, statusEvt: 'destroy', statusId: 'shield', src: { side: owner, uid: target.uid }, key: 'battleLog.shieldNullifyNoZmk', params: { card: target.card.name } })
    return
  }
  const base2 = base + spellAuraBonusFor(g, actor)
  let dmg = useZmk ? rollDamage(g, actor, base2, ctxBias(g, actor)) : base2
  const fr = fieldEngine.applyFirstDamageReduction(g, owner, dmg)
  if (fr.reduced) { dmg = fr.dmg; log(g, { t: 'field', side: owner, key: 'battleLog.fieldReduceFirst', params: { dmg } }) }
  const redPct = auraDamageReductionPctFor(g, owner, target.uid)
  if (redPct > 0 && dmg > 0) {
    const before = dmg
    dmg = Math.max(0, Math.round(dmg * (1 - redPct / 100)))
    if (dmg < before) log(g, { t: 'damage', side: owner, cardName: target.card.name, value: dmg, key: 'battleLog.auraReduceDmg', params: { pct: redPct, card: target.card.name, before, dmg } })
  }
  if (dmg <= 0) {
    log(g, { t: 'damage', side: owner, cardName: target.card.name, value: 0, key: 'battleLog.noDamage', params: { card: target.card.name } })
    return
  }
  const overHpBefore = target.hp
  target.hp -= dmg
  log(g, { t: 'damage', side: owner, cardName: target.card.name, value: dmg, projectile: (g as unknown as { __fxProjectile?: ProjectileType }).__fxProjectile, key: 'battleLog.unitDamage', params: { card: target.card.name, dmg, hp: Math.max(0, target.hp), maxHp: target.maxHp } })
  applyEnemyDamageLeech(g, owner, dmg)
  if (overflow) {
    const excess = Math.max(0, dmg - Math.max(0, overHpBefore))
    if (excess > 0) { log(g, { t: 'damage', side: owner, key: `battleLog.overkill.${SK(owner)}`, params: { excess } }); dealToPlayer(g, owner, excess, actor, false) }
  }
  applySpellLifesteal(g, dmg)
  fireGlobalListeners(g, 'onAnyDamage', { side: owner })
  if (target.hp <= 0) killUnit(g, owner, target)
  else if ((target.card.gameplay?.passiveAura?.enrageAttack ?? 0) > 0) recomputeAuras(g) // Įsiūtis įsijungia sužeidus
}

// Statų auros perskaičiavimas. Idempotentinis: pirma nuima ankstesnį auros priedą,
// tada iš naujo prideda visų lauke esančių auros šaltinių (padarų/artefaktų) poveikį.
// Kviečiamas po bet kokio kovos lauko pasikeitimo (iškvietimas / žūtis / nutildymas / ėjimo pab.).
function auraIsActive(cfg: NonNullable<TutCard['gameplay']>['passiveAura']): boolean {
  if (!cfg) return false
  return (cfg.auraAttack ?? 0) !== 0 || (cfg.auraHealth ?? 0) !== 0
    || !!cfg.auraSilence || !!cfg.auraCantAttack || (cfg.auraKeywords?.length ?? 0) > 0
}
let recomputingAuras = false
export function recomputeAuras(g: GameState) {
  if (recomputingAuras) return
  recomputingAuras = true
  try {
  // 1) Nuimam dabartinį auros priedą nuo visų padarų
  for (const sd of allSeats(g)) {
    for (const u of P(g, sd).units) {
      if (!u) continue
      if (u.auraAtk) { u.atk = Math.max(0, u.atk - u.auraAtk) }
      if (u.auraHp) { u.maxHp = Math.max(1, u.maxHp - u.auraHp); if (u.hp > u.maxHp) u.hp = u.maxHp }
      if (u.auraSilence) { delete u.statuses.silenced; u.auraSilence = false }
      if (u.auraShield) { u.shield = false; u.auraShield = false }
      if (u.auraStealth) { u.stealth = false; u.auraStealth = false }
      u.auraAtk = 0; u.auraHp = 0; u.auraKw = []; u.auraCantAttack = false; u.auraStatusImmune = undefined
    }
  }
  // 1b) Lauko pasyvas: GLOBALUS NUTILDYMAS – visi paveiktų pusių padarai nutildyti,
  // kol laukas aktyvus (auraSilence mechanizmas: laukui dingus nuimama automatiškai)
  for (const sd of allSeats(g)) {
    if (!fieldEngine.globalSilence(g, sd)) continue
    for (const u of P(g, sd).units) {
      if (u && !u.statuses.silenced) { u.statuses.silenced = PERMANENT; u.auraSilence = true }
    }
  }
  // 2) Surenkam auros šaltinius (nenutildyti padarai + artefaktai)
  type Src = { side: Side; cfg: NonNullable<TutCard['gameplay']>['passiveAura']; selfUid: string }
  const sources: Src[] = []
  for (const sd of allSeats(g)) {
    const p = P(g, sd)
    for (const u of p.units) {
      if (!u || u.statuses.silenced) continue
      const cfg = u.card.gameplay?.passiveAura
      if (cfg && auraIsActive(cfg)) sources.push({ side: sd, cfg, selfUid: u.uid })
    }
    for (const a of p.artifacts) {
      if (!a) continue
      const cfg = a.card.gameplay?.passiveAura
      if (cfg && auraIsActive(cfg)) sources.push({ side: sd, cfg, selfUid: a.uid })
    }
  }
  // 3) Pritaikom kiekvieno šaltinio poveikį
  for (const src of sources) {
    const cfg = src.cfg!
    const aAtk = cfg.auraAttack ?? 0
    const aHp = cfg.auraHealth ?? 0
    const scope = cfg.auraScope ?? 'friendly'
    const want = (cfg.auraSubtype ?? '').trim().toLowerCase()
    const wantFac = cfg.auraFaction ?? 0
    for (const sd of allSeats(g)) {
      if (scope === 'friendly' && !sameTeam(g, sd, src.side)) continue
      if (scope === 'enemy' && sameTeam(g, sd, src.side)) continue
      for (const u of P(g, sd).units) {
        if (!u) continue
        if (u.uid === src.selfUid && !cfg.auraIncludesSelf) continue
        if (want && (u.card.subtype ?? '').toLowerCase() !== want) continue
        if (wantFac && u.card.factionId !== wantFac) continue
        if (aAtk) { u.atk = Math.max(0, u.atk + aAtk); u.auraAtk = (u.auraAtk ?? 0) + aAtk }
        if (aHp) { u.maxHp = Math.max(1, u.maxHp + aHp); u.hp += aHp; u.auraHp = (u.auraHp ?? 0) + aHp }
        if (cfg.auraSilence && !u.statuses.silenced) { u.statuses.silenced = PERMANENT; u.auraSilence = true }
        if (cfg.auraCantAttack) u.auraCantAttack = true
        if (cfg.auraStatusImmunity) {
          const NEG: TutStatus[] = ['frozen', 'burning', 'poisoned', 'stunned', 'silenced']
          const block = (cfg.auraStatusImmunityStatuses && cfg.auraStatusImmunityStatuses.length > 0 ? cfg.auraStatusImmunityStatuses : NEG) as TutStatus[]
          const cur = u.auraStatusImmune ?? []
          u.auraStatusImmune = [...new Set([...cur, ...block])]
        }
        for (const kw of (cfg.auraKeywords ?? [])) {
          if (kw === 'shield') { if (!u.shield) { u.shield = true; u.auraShield = true } }
          else if (kw === 'stealth') { if (!u.stealth) { u.stealth = true; u.auraStealth = true } }
          else { (u.auraKw ??= []).push(kw) }
        }
      }
    }
  }
  // 3b) Sinergija: kol ŠIS ir partneris (vardu/frakcija) abu kovos lauke – buff'as/raktažodžiai
  for (const sd of allSeats(g)) {
    const units = P(g, sd).units.filter((x): x is BoardUnit => !!x)
    for (const u of units) {
      if (u.statuses.silenced) continue
      const syn = u.card.gameplay?.synergy
      if (!syn) continue
      const names = (syn.withNames ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
      const fac = syn.withFaction ?? 0
      const hasPartner = units.some((x) => x.uid !== u.uid && (
        (names.length > 0 && names.includes(x.card.name.trim().toLowerCase())) ||
        (fac > 0 && x.card.factionId === fac)
      ))
      if (!hasPartner) continue
      if (syn.buffAttack) { u.atk = Math.max(0, u.atk + syn.buffAttack); u.auraAtk = (u.auraAtk ?? 0) + syn.buffAttack }
      if (syn.buffHealth) { u.maxHp = Math.max(1, u.maxHp + syn.buffHealth); u.hp += syn.buffHealth; u.auraHp = (u.auraHp ?? 0) + syn.buffHealth }
      for (const kw of (syn.keywords ?? [])) {
        if (kw === 'shield') { if (!u.shield) { u.shield = true; u.auraShield = true } }
        else if (kw === 'stealth') { if (!u.stealth) { u.stealth = true; u.auraStealth = true } }
        else { (u.auraKw ??= []).push(kw) }
      }
    }
  }
  // 3c) Įsiūtis: kol padaras SUŽEISTAS (hp < maxHp) — +ATK (maxHp jau po aurų)
  for (const sd of allSeats(g)) {
    for (const u of P(g, sd).units) {
      if (!u || u.statuses.silenced) continue
      const enr = u.card.gameplay?.passiveAura?.enrageAttack ?? 0
      if (enr > 0 && u.hp < u.maxHp) { u.atk = Math.max(0, u.atk + enr); u.auraAtk = (u.auraAtk ?? 0) + enr }
    }
  }
  // 4) Jei debuff aura nuvarė HP iki 0 – žūtis
  for (const sd of allSeats(g)) {
    for (const u of [...P(g, sd).units]) {
      if (u && u.hp <= 0) killUnit(g, sd, u)
    }
  }
  } finally { recomputingAuras = false }
}

// Pasyvi aura: jei priešininkas turi žaidime kortą su passiveAura.enemyUnitDamageHealsOwner,
// visa žala jo PRIEŠO padarams pridedama prie to žaidėjo HP.
function applyEnemyDamageLeech(g: GameState, damagedOwner: Side, dmg: number) {
  if (dmg <= 0) return
  const beneficiary: Side = damagedOwner === 'you' ? 'ai' : 'you'
  const p = P(g, beneficiary)
  const unitAura = p.units.some((u) => u && !u.statuses.silenced && u.card.gameplay?.passiveAura?.enemyUnitDamageHealsOwner)
  const artAura = p.artifacts.some((a) => a && a.card.gameplay?.passiveAura?.enemyUnitDamageHealsOwner)
  if (!unitAura && !artAura) return
  const before = p.hp
  p.hp = Math.min(p.maxHp, p.hp + dmg)
  if (p.hp > before) {
    log(g, { t: 'heal', side: beneficiary, value: p.hp - before, key: `battleLog.passiveDamageHeal.${SK(beneficiary)}`, params: { dmg, hp: p.hp - before }, sound: 'heal' })
  }
}

function dealToArtifact(g: GameState, target: BoardArtifact, owner: Side, base: number, actor: Side) {
  const dmg = rollDamage(g, actor, base + spellAuraBonusFor(g, actor), ctxBias(g, actor))
  if (dmg <= 0) return
  applySpellLifesteal(g, dmg)
  target.hp -= dmg
  log(g, { t: 'damage', side: owner, cardName: target.card.name, value: dmg, key: 'battleLog.artifactDamage', params: { card: target.card.name, dmg } })
  fireGlobalListeners(g, 'onAnyDamage', { side: owner })
  if (target.hp <= 0) {
    const p = P(g, owner)
    p.artifacts = p.artifacts.map((a) => (a?.uid === target.uid ? null : a))
    p.discard.push(target.card)
    log(g, { t: 'death', side: owner, cardName: target.card.name, key: 'battleLog.artifactDestroyed', params: { card: target.card.name }, src: { side: owner, uid: target.uid } })
    recomputeAuras(g)
  }
}

// ── onDestroy („Sunaikinus taikinį") ─────────────────────────────────────────
// Kill kreditas: prieš žūtį pažymimas žudikas (padaras kovoje — čia, attack();
// burtas/efektas — effectEngine applyMapping wrapper'yje per ctx.allMappings).
// killUnit pabaigoje iššaunami žudiko onDestroy mapping'ai. Padaras-šaltinis
// privalo būti gyvas (hp>0) ir nenutildytas; burtas/artefaktas šauna visada.
type KillCreditT = { side: Side; uid?: string; name: string; mappings: EffectMapping[]; depth: number }
function fireOnDestroyCredit(g: GameState, victimName: string) {
  const gk = g as unknown as { __killCredit?: KillCreditT }
  const kc = gk.__killCredit
  if (!kc || g.winner) return
  if (!kc.mappings.some((m) => m.trigger === 'onDestroy')) return
  if (kc.uid) {
    const su = P(g, kc.side).units.find((x) => x?.uid === kc.uid)
    if (!su || su.hp <= 0 || su.statuses.silenced) return
    log(g, { t: 'battlecry', side: kc.side, cardName: kc.name, key: 'battleLog.killEffect', params: { card: kc.name, victim: victimName }, src: { side: kc.side, uid: kc.uid } })
  } else {
    log(g, { t: 'battlecry', side: kc.side, cardName: kc.name, key: 'battleLog.killEffect', params: { card: kc.name, victim: victimName } })
  }
  // Kreditas išvalomas PRIEŠ vykdymą, kad grandininės žūtys viduje nekartotų to paties kredito
  gk.__killCredit = undefined
  applyMappings(gameApi, g, kc.side, kc.mappings, 'onDestroy', { sourceName: kc.name, sourceUid: kc.uid, depth: kc.depth + 1 })
}

function killUnit(g: GameState, owner: Side, u: BoardUnit) {
  const p = P(g, owner)
  const idx = p.units.findIndex((x) => x?.uid === u.uid)
  if (idx === -1) return
  // Nemirtingumo aura: padaras nežūsta – paliekamas su 1 HP.
  if (unitIsImmortal(g, owner, u.uid)) {
    if (u.hp < 1) u.hp = 1
    log(g, { t: 'status', side: owner, cardName: u.card.name, key: 'battleLog.cannotDie', params: { card: u.card.name }, src: { side: owner, uid: u.uid } })
    return
  }
  // Paskutinis noras / onDeath mapping'ai – prieš kortai keliaujant į kapinyną
  if (!u.statuses.silenced) {
    const deathMappings = (u.card.mappings ?? []).filter((m) => m.trigger === 'onDeath')
    if (deathMappings.length > 0) {
      log(g, { t: 'lastwish', side: owner, cardName: u.card.name, key: 'battleLog.lastWish', params: { card: u.card.name }, src: { side: owner, uid: u.uid } })
      applyMappings(gameApi, g, owner, u.card.mappings ?? [], 'onDeath', { sourceName: u.card.name, sourceUid: u.uid, depth: 0 })
    } else if (u.card.keywords.includes('lastwish') && u.card.effect) {
      log(g, { t: 'lastwish', side: owner, cardName: u.card.name, key: 'battleLog.lastWish', params: { card: u.card.name }, src: { side: owner, uid: u.uid } })
      applyAutoEffect(g, owner, u.card.effect, u.card.name)
    }
  }
  // Paskutinis noras: PRISIKĖLIMAS vietoje mirties (resurrectSelf; ne čempionams)
  if (!u.statuses.silenced && !u.isChampion) {
    for (const m of (u.card.mappings ?? [])) {
      if (m.trigger !== 'onDeath' || m.effect !== 'resurrectSelf') continue
      if (m.oncePerGame && u.card._resurrectUsed) continue
      if (m.oncePerGame) u.card._resurrectUsed = true
      const nu: BoardUnit = {
        uid: u.card.uid + '-res' + g.globalTurn + '-' + idx, card: u.card,
        atk: u.card.attack ?? 0,
        hp: m.resurrectHp1 ? 1 : (u.card.health ?? 1),
        maxHp: u.card.health ?? 1,
        shield: u.card.keywords.includes('shield'),
        stealth: u.card.keywords.includes('stealth'),
        statuses: {}, summonedOnTurn: g.globalTurn, attacksUsed: 0,
        isChampion: false, phase: 0, abilityUsed: false,
      }
      p.units[idx] = nu
      log(g, { t: 'lastwish', side: owner, cardName: u.card.name, key: `battleLog.lastWishResurrect${m.resurrectHp1 ? 'Hp1' : ''}${m.oncePerGame ? 'Once' : ''}`, params: { card: u.card.name }, sound: 'summon', src: { side: owner, uid: nu.uid } })
      fireGlobalListeners(g, 'onAnyDeath', { side: owner, subtype: u.card.subtype, faction: u.card.factionId })
      afterSummon(g, owner, u.card, 'graveyard')
      fireOnDestroyCredit(g, u.card.name)
      return
    }
  }
  // Paskutinio noro „reroute": korta keliauja į ranką (priešo/savo), o ne į kapinyną
  let reroute: Side | null = null
  if (!u.statuses.silenced) {
    for (const m of (u.card.mappings ?? [])) {
      if (m.trigger !== 'onDeath') continue
      if (m.effect === 'selfToEnemyHand') reroute = other(owner)
      else if (m.effect === 'selfToOwnHand') reroute = owner
    }
  }
  p.units[idx] = null
  if (reroute) {
    const rp = P(g, reroute)
    rp.hand.push(u.card)
    log(g, { t: 'death', side: owner, cardName: u.card.name, key: `battleLog.deathToHand.${reroute === owner ? 'self' : 'foe'}`, params: { card: u.card.name }, sound: 'death', src: { side: owner, uid: u.uid } })
  } else if (fieldEngine.exileOnDeath(g, owner)) {
    // Lauko pasyvas: sunaikinta korta PAŠALINAMA iš žaidimo (ne į kapinyną)
    log(g, { t: 'death', side: owner, cardName: u.card.name, key: 'battleLog.deathExiled', params: { card: u.card.name }, sound: 'death', src: { side: owner, uid: u.uid } })
  } else {
    // Laikinai perimtas (takeControl) padaras žūdamas grįžta į tikrojo šeimininko kapinyną
    const graveOwner = u.control ? P(g, u.control.from) : p
    graveOwner.discard.push(u.card)
    log(g, { t: 'death', side: owner, cardName: u.card.name, key: 'battleLog.deathGrave', params: { card: u.card.name }, sound: 'death', src: { side: owner, uid: u.uid } })
  }
  fireGlobalListeners(g, 'onAnyDeath', { side: owner, subtype: u.card.subtype, faction: u.card.factionId })
  recomputeAuras(g)
  fireOnDestroyCredit(g, u.card.name)
}

/** Žala žaidėjui: 2v2 – mažina komandos bendrą HP; 1v1 – seat'o PlayerState.hp. Grąžina likusį HP. */
function applyPlayerDamage(g: GameState, target: Side, dmg: number): number {
  if (g.mode === '2v2' && g.teams) {
    const t = g.teams[teamOfSeat(g, target)]
    t.hp = Math.max(0, t.hp - dmg)
    return t.hp
  }
  const p = P(g, target)
  p.hp -= dmg
  return Math.max(0, p.hp)
}
/** Gydymas žaidėjui: 2v2 – komandos HP (iki maxHp); 1v1 – seat'o HP. Grąžina realiai pagydytą kiekį. */
function applyPlayerHeal(g: GameState, target: Side, n: number): number {
  if (g.mode === '2v2' && g.teams) {
    const t = g.teams[teamOfSeat(g, target)]
    const b = t.hp; t.hp = Math.min(t.maxHp, t.hp + n); return t.hp - b
  }
  const p = P(g, target)
  const b = p.hp; p.hp = Math.min(p.maxHp, p.hp + n); return p.hp - b
}

function checkWin(g: GameState) {
  if (g.winner) return
  if (g.mode === '2v2' && g.teams) {
    if (g.teams.A.hp <= 0) { g.winnerTeam = 'B'; g.winner = 'ai'; log(g, { t: 'win', side: 'ai', key: 'battleLog.winTeam', params: { loser: 'A', winner: 'B' } }) }
    else if (g.teams.B.hp <= 0) { g.winnerTeam = 'A'; g.winner = 'you'; log(g, { t: 'win', side: 'you', key: 'battleLog.winTeam', params: { loser: 'B', winner: 'A' } }) }
    return
  }
  if (g.you.hp <= 0) { g.winner = 'ai'; log(g, { t: 'win', side: 'ai', key: 'battleLog.winAi' }) }
  else if (g.ai.hp <= 0) { g.winner = 'you'; log(g, { t: 'win', side: 'you', key: 'battleLog.winYou' }) }
}

// ── Efektų taikymas ───────────────────────────────────────────────────────────

function coinOk(g: GameState, s: Side, e: ParsedEffect): boolean {
  if (!e.coinflip) return true
  const green = Math.random() < 0.5
  log(g, { t: 'coin', side: s, coin: green ? 'green' : 'red', key: `battleLog.coin.${green ? 'green' : 'red'}` })
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
  if (e.gold) { P(g, s).gold += e.gold; log(g, { t: 'gold', side: s, value: e.gold, key: `battleLog.goldGain.${SK(s)}`, params: { gold: e.gold, src: srcName } }) }
}

function healSide(g: GameState, s: Side, n: number) {
  const p = P(g, s)
  // gydom labiausiai sužeistą padarą, jei visi sveiki – herojų
  const hurt = p.units.filter((u): u is BoardUnit => !!u && u.hp < u.maxHp).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0]
  if (hurt) {
    const before = hurt.hp
    hurt.hp = Math.min(hurt.maxHp, hurt.hp + n)
    log(g, { t: 'heal', side: s, cardName: hurt.card.name, value: hurt.hp - before, key: 'battleLog.unitHealed', params: { card: hurt.card.name, hp: hurt.hp - before } })
  } else {
    const before = p.hp
    p.hp = Math.min(p.maxHp, p.hp + n)
    if (p.hp > before) log(g, { t: 'heal', side: s, value: p.hp - before, key: `battleLog.playerHeal.${SK(s)}`, params: { hp: p.hp - before } })
  }
}

function applyTargetedEffect(g: GameState, s: Side, e: ParsedEffect, target: TargetRef, srcName: string) {
  if (!coinOk(g, s, e)) return
  if (target.kind === 'player') {
    if (e.damage) dealToPlayer(g, target.side, e.damage, s)
    if (e.heal && target.side === s) { const p = P(g, s); const b = p.hp; p.hp = Math.min(p.maxHp, p.hp + e.heal); if (p.hp > b) log(g, { t: 'heal', side: s, value: p.hp - b, key: `battleLog.playerHeal.${SK(s)}`, params: { hp: p.hp - b } }) }
  } else if (target.kind === 'unit') {
    const u = P(g, target.side).units.find((x) => x?.uid === target.uid)
    if (!u) { log(g, { t: 'blocked', side: s, key: 'battleLog.targetInvalidPart' }); return }
    if (e.damage) dealToUnit(g, u, target.side, e.damage, s)
    if (u.hp > 0) {
      if (e.heal) { const b = u.hp; u.hp = Math.min(u.maxHp, u.hp + e.heal); if (u.hp > b) log(g, { t: 'heal', side: target.side, cardName: u.card.name, value: u.hp - b, key: 'battleLog.unitHealed', params: { card: u.card.name, hp: u.hp - b } }) }
      if (e.buffAtk) { u.atk += e.buffAtk; log(g, { t: 'buff', side: target.side, cardName: u.card.name, key: 'battleLog.buffAtk', params: { card: u.card.name, atk: e.buffAtk } }) }
      if (e.buffHp) { u.hp += e.buffHp; u.maxHp += e.buffHp; log(g, { t: 'buff', side: target.side, cardName: u.card.name, key: 'battleLog.buffHp', params: { card: u.card.name, hp: e.buffHp } }) }
      if (e.status) applyStatus(g, target.side, u, e.status)
    }
  } else {
    const a = P(g, target.side).artifacts.find((x) => x?.uid === target.uid)
    if (a && e.damage) dealToArtifact(g, a, target.side, e.damage, s)
  }
  if (e.draw) drawCards(g, s, e.draw)
  if (e.gold) { P(g, s).gold += e.gold; log(g, { t: 'gold', side: s, value: e.gold, key: 'battleLog.goldPlus', params: { gold: e.gold, src: srcName } }) }
}

function applyStatus(g: GameState, owner: Side, u: BoardUnit, st: TutStatus) {
  // Statusų imuniteto aura: blokuojamos TIK auros nurodytos būsenos (blessed – teigiama, niekada neblokuojama)
  if (st !== 'blessed' && u.auraStatusImmune?.includes(st)) {
    log(g, { t: 'status', side: owner, cardName: u.card.name, key: 'battleLog.statusImmune', params: { card: u.card.name, status: tref(`statusEffects.${st}.name`) } })
    return
  }
  const p = P(g, owner)
  // Sušaldytas/Apsvaigintas — trukmė priklauso nuo to, KADA uždėta:
  //  • savininko ėjime (pvz. užšaldai SAVO padarą): veikia likusį šį ėjimą + visą
  //    priešininko ėjimą; nuimama savininko KITO ėjimo PRADŽIOJE (integer until).
  //  • ne savininko ėjime (pvz. užšaldai PRIEŠO padarą savo ėjime): veikia likusį
  //    tavo ėjimą + VISĄ jo ateinantį ėjimą; nuimama TO ėjimo PABAIGOJE (until x.5),
  //    tad tavo kitame ėjime jis jau laisvas (gali atsakyti į atakas).
  // Degantis/Apnuodytas/Nutildytas/Palaimintas – kol pašalins efektas (PERMANENT)
  const ownTurn = g.mode === '2v2' && g.teams ? sameTeam(g, g.active, owner) : g.active === owner
  const until = st === 'burning' || st === 'poisoned' || st === 'silenced' || st === 'blessed'
    ? PERMANENT
    : ownTurn ? p.turnNumber + 1 : p.turnNumber + 1.5
  u.statuses[st] = until
  log(g, { t: 'status', side: owner, cardName: u.card.name, status: st, statusEvt: 'apply', statusId: st, src: { side: owner, uid: u.uid }, key: 'battleLog.statusApply', params: { icon: STATUS_META[st].icon, card: u.card.name, status: tref(`statusEffects.${st}.name`) } })
  fireGlobalListeners(g, 'onAnyStatus', { side: owner })
  if (st === 'silenced') {
    // Nutildymas nuima VISUS efektus: skydą, sėlinimą, raktažodžius (per patikras) ir
    // visus stat buffus – statai grįžta į bazinę kortą; patirta žala lieka.
    u.shield = false
    u.stealth = false
    u.tempBuffs = []
    u.auraAtk = 0; u.auraHp = 0; u.auraKw = []; u.auraShield = false; u.auraStealth = false; u.auraCantAttack = false
    const baseAtk = u.card.attack ?? 0
    const baseHp = u.card.health ?? 1
    u.atk = baseAtk
    u.maxHp = baseHp
    if (u.hp > baseHp) u.hp = baseHp
    log(g, { t: 'status', side: owner, cardName: u.card.name, key: 'battleLog.silencedUnit', params: { card: u.card.name, atk: baseAtk, hp: u.hp } })
    recomputeAuras(g)
  }
}

// ── Nauji primityvai + GameApi (effect engine integracijai) ─────────────────

function healUnitPrim(g: GameState, owner: Side, u: BoardUnit, n: number) {
  const b = u.hp
  u.hp = Math.min(u.maxHp, u.hp + n)
  if (u.hp > b) {
    log(g, { t: 'heal', side: owner, cardName: u.card.name, value: u.hp - b, key: 'battleLog.unitHealed', params: { card: u.card.name, hp: u.hp - b }, sound: 'heal' })
    fireGlobalListeners(g, 'onAnyHeal', { side: owner })
    if ((u.card.gameplay?.passiveAura?.enrageAttack ?? 0) > 0) recomputeAuras(g) // pagijus iki pilno – Įsiūtis dingsta
  }
}

function healPlayerPrim(g: GameState, s: Side, n: number) {
  const gained = applyPlayerHeal(g, s, n)
  if (gained > 0) { log(g, { t: 'heal', side: s, value: gained, key: `battleLog.playerHeal.${SK(s)}`, params: { hp: gained }, sound: 'heal' }); fireGlobalListeners(g, 'onAnyHeal', { side: s }) }
}

function buffUnitPrim(g: GameState, owner: Side, u: BoardUnit, atk: number, hp: number, duration?: 'permanent' | 'endOfTurn' | 'untilNextTurn') {
  if (atk !== 0) {
    u.atk = Math.max(0, u.atk + atk)
    log(g, { t: 'buff', side: owner, cardName: u.card.name, key: atk > 0 ? 'battleLog.buffAtk' : 'battleLog.loseAtk', params: { card: u.card.name, atk: Math.abs(atk) } })
  }
  if (hp > 0) {
    u.hp += hp; u.maxHp += hp
    log(g, { t: 'buff', side: owner, cardName: u.card.name, key: 'battleLog.buffHp', params: { card: u.card.name, hp } })
  } else if (hp < 0) {
    u.maxHp = Math.max(1, u.maxHp + hp)
    u.hp += hp
    log(g, { t: 'buff', side: owner, cardName: u.card.name, key: 'battleLog.loseHp', params: { card: u.card.name, hp: Math.abs(hp) } })
    if (u.hp <= 0) killUnit(g, owner, u)
  }
  if (duration && duration !== 'permanent' && (atk !== 0 || hp !== 0)) {
    (u.tempBuffs ??= []).push({ atk, hp, kind: duration, turn: P(g, owner).turnNumber })
  }
}

// Laikinų buff'ų nuėmimas: 'endOfTurn' – savo ėjimo pabaigoje; 'untilNextTurn' – kito savo ėjimo pradžioje.
function expireTempBuffs(g: GameState, s: Side, phase: 'beginTurn' | 'endTurn') {
  const p = P(g, s)
  for (const u of p.units) {
    if (!u || !u.tempBuffs || u.tempBuffs.length === 0) continue
    const keep: typeof u.tempBuffs = []
    for (const b of u.tempBuffs) {
      const expire = phase === 'endTurn' ? (b.kind === 'endOfTurn' && b.turn >= p.turnNumber) : (b.kind === 'untilNextTurn' && b.turn < p.turnNumber)
      if (!expire) { keep.push(b); continue }
      if (b.atk) u.atk = Math.max(0, u.atk - b.atk)
      if (b.hp) { u.maxHp = Math.max(1, u.maxHp - b.hp); u.hp = Math.max(1, u.hp - b.hp) }
      log(g, { t: 'buff', side: s, cardName: u.card.name, key: 'battleLog.tempBuffEnd', params: { card: u.card.name } })
    }
    u.tempBuffs = keep
  }
}

// ── Kontrolės perėmimas (takeControl) ────────────────────────────────────────
// Perkelia priešo padarą į newOwner pusę. duration: 'permanent' – visam laikui;
// 'endOfTurn' – grąžinamas valdytojo ėjimo pabaigoje; 'untilNextTurn' – kito
// valdytojo ėjimo pradžioje. Čempionų perimti negalima. Perimtas padaras gali
// pulti iškart (attacksUsed nunulinamas; summonedOnTurn senas, tad ne „sick").
function takeControlUnitPrim(g: GameState, newOwner: Side, owner: Side, u: BoardUnit, duration: 'permanent' | 'endOfTurn' | 'untilNextTurn', srcName: string) {
  if (owner === newOwner) return
  if (u.isChampion) { log(g, { t: 'blocked', side: newOwner, key: 'battleLog.championNoControl', params: { src: srcName } }); return }
  const from = P(g, owner), to = P(g, newOwner)
  const idx = from.units.findIndex((x) => x?.uid === u.uid)
  if (idx === -1) return
  const slot = freeUnitSlot(g, to)
  if (slot === -1) { log(g, { t: 'blocked', side: newOwner, key: 'battleLog.controlZoneFull', params: { src: srcName } }); return }
  from.units[idx] = null
  to.units[slot] = u
  u.attacksUsed = 0
  u.abilityUsed = false
  if (duration === 'permanent') delete u.control
  else u.control = { from: owner, kind: duration, turn: to.turnNumber }
  const durRef = tref(`battleLog.controlDuration.${duration}`)
  log(g, { t: 'buff', side: newOwner, cardName: u.card.name, statusEvt: 'apply', statusId: 'control', key: `battleLog.takeControl.${SK(newOwner)}`, params: { src: srcName, card: u.card.name, duration: durRef }, sound: 'summon', src: { side: newOwner, uid: u.uid } })
  recomputeAuras(g)
}

// Laikinos kontrolės pabaiga: padaras grąžinamas tikram šeimininkui.
// 'endOfTurn' – valdytojo ėjimo pabaigoje; 'untilNextTurn' – kito valdytojo ėjimo pradžioje.
function expireControl(g: GameState, s: Side, phase: 'beginTurn' | 'endTurn') {
  const p = P(g, s)
  let moved = false
  for (const u of [...p.units]) {
    if (!u?.control) continue
    const c = u.control
    const expire = phase === 'endTurn' ? (c.kind === 'endOfTurn' && c.turn >= p.turnNumber) : (c.kind === 'untilNextTurn' && c.turn < p.turnNumber)
    if (!expire) continue
    delete u.control
    const idx = p.units.findIndex((x) => x?.uid === u.uid)
    const back = P(g, c.from)
    const slot = freeUnitSlot(g, back)
    if (idx === -1) continue
    if (slot === -1) {
      log(g, { t: 'buff', side: s, cardName: u.card.name, key: `battleLog.controlStay.${SK(s)}`, params: { card: u.card.name } })
      continue
    }
    p.units[idx] = null
    back.units[slot] = u
    u.attacksUsed = 0
    moved = true
    log(g, { t: 'buff', side: c.from, cardName: u.card.name, statusEvt: 'remove', statusId: 'control', key: `battleLog.controlEnd.${SK(c.from)}`, params: { card: u.card.name }, src: { side: c.from, uid: u.uid } })
  }
  if (moved) recomputeAuras(g)
}

function discardCardsPrim(g: GameState, s: Side, n: number) {
  const p = P(g, s)
  for (let i = 0; i < n && p.hand.length > 0; i++) {
    // be random: metama pigiausia korta (deterministinis pasirinkimas)
    const idx = p.hand.reduce((best, c, ci) => (c.gold < p.hand[best].gold ? ci : best), 0)
    const [c] = p.hand.splice(idx, 1)
    p.discard.push(c)
    log(g, { t: 'discardGold', side: s, cardName: c.name, key: `battleLog.discard.${SK(s)}`, params: { card: c.name } })
  }
}

function destroyArtifactPrim(g: GameState, owner: Side, uid: string) {
  const p = P(g, owner)
  const a = p.artifacts.find((x) => x?.uid === uid)
  if (!a) return
  p.artifacts = p.artifacts.map((x) => (x?.uid === uid ? null : x))
  p.discard.push(a.card)
  recomputeAuras(g)
  log(g, { t: 'death', side: owner, cardName: a.card.name, key: 'battleLog.artifactDestroyed', params: { card: a.card.name }, sound: 'death' })
}

function returnUnitToHandPrim(g: GameState, owner: Side, u: BoardUnit) {
  const p = P(g, owner)
  const idx = p.units.findIndex((x) => x?.uid === u.uid)
  if (idx === -1) return
  p.units[idx] = null
  if (p.hand.length >= 10) {
    p.discard.push(u.card)
    log(g, { t: 'handBurn', side: owner, cardName: u.card.name, key: 'battleLog.handFullBurn', params: { card: u.card.name } })
  } else {
    p.hand.push(u.card)
    log(g, { t: 'returnHand', side: owner, cardName: u.card.name, key: 'battleLog.returnHand', params: { card: u.card.name }, src: { side: owner, uid: u.uid }, sound: 'draw' })
  }
}

function summonFromZonePrim(g: GameState, s: Side, zone: 'hand' | 'deck' | 'discard', opts?: { costMax?: number; subtype?: string; factionId?: number; count?: number }) {
  const p = P(g, s)
  const src = zone === 'hand' ? p.hand : zone === 'deck' ? p.deck : p.discard
  const zoneRef = tref(`battleLog.zone.${zone}`)
  const want = (opts?.subtype ?? '').trim().toLowerCase()
  const wantFac = opts?.factionId ?? 0
  const eligible = (c: TutCard) =>
    c.type === 'unit' &&
    (opts?.costMax == null || (c.gold ?? 0) <= opts.costMax) &&
    (!want || (c.subtype ?? '').toLowerCase() === want) &&
    (!wantFac || c.factionId === wantFac)
  const count = Math.max(1, opts?.count ?? 1)
  for (let n = 0; n < count; n++) {
    const slot = freeUnitSlot(g, p)
    if (slot === -1) { log(g, { t: 'blocked', side: s, key: 'battleLog.zoneFullSummon' }); return }
    const idx = src.findIndex(eligible)
    if (idx === -1) { log(g, { t: 'blocked', side: s, key: 'battleLog.noSummonTargetZone', params: { zone: zoneRef } }); return }
    const [card] = src.splice(idx, 1)
    p.units[slot] = {
      uid: card.uid + '-s' + g.globalTurn + '-' + n, card,
      atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
      shield: card.keywords.includes('shield'),
      stealth: card.keywords.includes('stealth'),
      statuses: {}, summonedOnTurn: g.globalTurn, attacksUsed: 0,
      isChampion: false, phase: 0, abilityUsed: false,
    }
    ;(g as unknown as { __lastSummonedUid?: string }).__lastSummonedUid = p.units[slot]?.uid
    log(g, { t: 'play', side: s, cardName: card.name, key: 'battleLog.summonByEffect', params: { card: card.name }, sound: 'summon', fromZone: zone === 'discard' ? 'graveyard' : zone === 'deck' ? 'deck' : 'hand' })
    afterSummon(g, s, card, zone === 'discard' ? 'graveyard' : zone === 'deck' ? 'deck' : 'hand')
  }
}

function unitCount(p: PlayerState): number { return p.units.filter((u) => u != null).length }
/** Laisva padaro vieta atsižvelgiant į lauko limitą (Platusis laukas: iki 10). Auga masyvas iki cap. */
function freeUnitSlot(g: GameState, p: PlayerState): number {
  const cap = fieldEngine.creatureCap(g, p.side)
  if (unitCount(p) >= cap) return -1
  const idx = p.units.findIndex((u) => u === null)
  if (idx !== -1) return idx
  if (p.units.length < cap) { p.units.push(null); return p.units.length - 1 }
  return -1
}
/** Padarų zonos limitas pusei (UI). */
export function boardCreatureCap(g: GameState, s: Side): number { return fieldEngine.creatureCap(g, s) }

function placeUnit(g: GameState, p: PlayerState, card: TutCard, suffix: string) {
  const slot = freeUnitSlot(g, p)
  if (slot === -1) return false
  p.units[slot] = {
    uid: card.uid + suffix, card,
    atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
    shield: card.keywords.includes('shield'), stealth: card.keywords.includes('stealth'),
    statuses: {}, summonedOnTurn: g.globalTurn, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false,
  }
  ;(g as unknown as { __lastSummonedUid?: string }).__lastSummonedUid = card.uid + suffix
  return true
}

/** Žaidėjo iškvietimo pasirinkimo užbaigimas. */
export function resolveSummonChoice(g: GameState, chosenUids: string[]): { ok: boolean; reason?: string } {
  const ps = g.pendingSummon
  if (!ps) return { ok: true }
  const p = P(g, ps.caster)
  for (const uid of chosenUids.slice(0, ps.choose)) {
    const opt = ps.options.find((o) => o.card.uid === uid)
    if (!opt) continue
    const arr = opt.zone === 'hand' ? p.hand : opt.zone === 'deck' ? p.deck : p.discard
    const idx = arr.findIndex((c) => c.uid === uid)
    if (idx === -1) continue
    const slotFree = freeUnitSlot(g, p)
    if (slotFree === -1) { log(g, { t: 'blocked', side: ps.caster, key: 'battleLog.zoneFull' }); break }
    const [card] = arr.splice(idx, 1)
    placeUnit(g, p, card, '-sc' + g.globalTurn)
    log(g, { t: 'play', side: ps.caster, cardName: card.name, key: 'battleLog.summonChosen', params: { card: card.name }, sound: 'summon', fromZone: opt.zone === 'discard' ? 'graveyard' : opt.zone === 'deck' ? 'deck' : 'hand' })
    afterSummon(g, ps.caster, card, opt.zone === 'discard' ? 'graveyard' : opt.zone === 'deck' ? 'deck' : 'hand')
  }
  g.pendingSummon = null
  return { ok: true }
}

// ── #5: efekto kopijavimas iš kapinyno ──
function mappingCount(c: TutCard): number { return (c.mappings ?? []).length }
function copyEffectPrim(g: GameState, s: Side, sourceUid: string | undefined, sourceName: string, fromSide: 'own' | 'enemy' | 'any') {
  if (!sourceUid) { log(g, { t: 'blocked', side: s, key: 'battleLog.copyNoSource', params: { src: sourceName } }); return }
  const sides: Side[] = fromSide === 'own' ? [s] : fromSide === 'enemy' ? [other(s)] : [s, other(s)]
  const options: { card: TutCard; side: Side }[] = []
  for (const sd of sides) for (const c of P(g, sd).discard) if (c.type === 'unit' && mappingCount(c) > 0) options.push({ card: c, side: sd })
  if (options.length === 0) { log(g, { t: 'blocked', side: s, key: 'battleLog.copyNoGraveTarget', params: { src: sourceName } }); return }
  if (s === 'you') {
    g.pendingCopy = { caster: s, sourceUid, sourceName, options }
    log(g, { t: 'play', side: s, key: 'battleLog.copyChoose' })
    return
  }
  const best = options.reduce((a, b) => (mappingCount(b.card) > mappingCount(a.card) ? b : a))
  applyCopyEffect(g, s, sourceUid, best.card)
}
function applyCopyEffect(g: GameState, s: Side, sourceUid: string, srcCard: TutCard) {
  const u = P(g, s).units.find((x): x is BoardUnit => !!x && x.uid === sourceUid)
  if (!u) { log(g, { t: 'blocked', side: s, key: 'battleLog.copySourceGone' }); return }
  const copied = srcCard.mappings ?? []
  if (copied.length === 0) return
  u.card = { ...u.card, mappings: [...(u.card.mappings ?? []), ...copied.map((m) => ({ ...m }))] }
  log(g, { t: 'buff', side: s, cardName: u.card.name, key: 'battleLog.copyEffect', params: { card: u.card.name, from: srcCard.name }, src: { side: s, uid: sourceUid } })
  // Nukopijuoti Kovos šūksniai (onSummon/onPlay) suveikia IŠKART (mėgdžiotojas):
  // taikinio reikalaujantys → pendingBattlecry (žaidėjas renkasi), kiti — auto.
  const all = u.card.mappings ?? []
  const start = all.length - copied.length
  const copiedEntries = all.map((m, i) => ({ m, i })).slice(start).filter((x) => x.m.trigger === 'onSummon' || x.m.trigger === 'onPlay')
  if (copiedEntries.length > 0) fireEntryMappings(g, s, u, copiedEntries)
}
export function resolveCopyEffect(g: GameState, chosenUid: string): { ok: boolean; reason?: string } {
  const pc = g.pendingCopy
  if (!pc) return { ok: true }
  const opt = pc.options.find((o) => o.card.uid === chosenUid)
  if (opt) applyCopyEffect(g, pc.caster, pc.sourceUid, opt.card)
  g.pendingCopy = null
  return { ok: true }
}

function summonAdvancedPrim(g: GameState, s: Side, opts: { zones?: ('hand' | 'deck' | 'discard')[]; costMin?: number; costMax?: number; subtype?: string; factionId?: number; count?: number; choose?: boolean; names?: string }) {
  const p = P(g, s)
  const zones = (opts.zones && opts.zones.length ? opts.zones : ['hand', 'deck', 'discard']) as ('hand' | 'deck' | 'discard')[]
  const want = (opts.subtype ?? '').trim().toLowerCase()
  const wantFacA = opts.factionId ?? 0
  const nameWhitelist = (opts.names ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
  const eligible = (c: TutCard) =>
    c.type === 'unit' &&
    (opts.costMax == null || (c.gold ?? 0) <= opts.costMax) &&
    (opts.costMin == null || (c.gold ?? 0) >= opts.costMin) &&
    (!want || (c.subtype ?? '').toLowerCase() === want) &&
    (!wantFacA || c.factionId === wantFacA) &&
    (nameWhitelist.length === 0 || nameWhitelist.includes(c.name.trim().toLowerCase()))
  const count = Math.max(1, opts.count ?? 1)
  if (opts.choose && s === 'you') {
    const options: { card: TutCard; zone: 'hand' | 'deck' | 'discard' }[] = []
    for (const z of zones) {
      const arr = z === 'hand' ? p.hand : z === 'deck' ? p.deck : p.discard
      for (const c of arr) if (eligible(c)) options.push({ card: c, zone: z })
    }
    if (options.length === 0) { log(g, { t: 'blocked', side: s, key: 'battleLog.noSummonTarget' }); return }
    g.pendingSummon = { caster: s, choose: Math.min(count, options.length), options }
    log(g, { t: 'play', side: s, key: 'battleLog.chooseSummon', params: { n: Math.min(count, options.length) } })
    return
  }
  for (let n = 0; n < count; n++) {
    const slot = freeUnitSlot(g, p)
    if (slot === -1) { log(g, { t: 'blocked', side: s, key: 'battleLog.zoneFullSummon' }); return }
    let src: TutCard[] | null = null
    let idx = -1
    let foundZone: 'hand' | 'deck' | 'discard' = 'deck'
    for (const z of zones) {
      const arr = z === 'hand' ? p.hand : z === 'deck' ? p.deck : p.discard
      const j = arr.findIndex(eligible)
      if (j !== -1) { src = arr; idx = j; foundZone = z; break }
    }
    if (!src || idx === -1) { log(g, { t: 'blocked', side: s, key: 'battleLog.noSummonTarget' }); return }
    const [card] = src.splice(idx, 1)
    p.units[slot] = {
      uid: card.uid + '-sa' + g.globalTurn + '-' + n, card,
      atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
      shield: card.keywords.includes('shield'), stealth: card.keywords.includes('stealth'),
      statuses: {}, summonedOnTurn: g.globalTurn, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false,
    }
    ;(g as unknown as { __lastSummonedUid?: string }).__lastSummonedUid = p.units[slot]?.uid
    log(g, { t: 'play', side: s, cardName: card.name, key: 'battleLog.summonByEffect', params: { card: card.name }, sound: 'summon', fromZone: foundZone === 'discard' ? 'graveyard' : foundZone === 'deck' ? 'deck' : 'hand' })
    afterSummon(g, s, card, foundZone === 'discard' ? 'graveyard' : foundZone === 'deck' ? 'deck' : 'hand')
  }
}

// ── Card draw su „twist": iš kapinyno / tik tipo / traukti N pasilikti K ──
function drawAdvancedPrim(g: GameState, s: Side, opts: { count: number; fromGraveyard?: boolean; cardType?: string; keep?: number }) {
  const p = P(g, s)
  const typeOk = (c: TutCard) => c.type !== 'curse' && (!opts.cardType || c.type === opts.cardType)
  const count = Math.max(1, opts.count)
  // iš kapinyno (atsitiktinė) → ranka
  if (opts.fromGraveyard) {
    const pool = shuffle(p.discard.filter(typeOk))
    if (pool.length === 0) { log(g, { t: 'blocked', side: s, key: 'battleLog.graveNoDraw' }); return }
    let drawn = 0
    for (const c of pool) {
      if (drawn >= count) break
      const idx = p.discard.findIndex((x) => x.uid === c.uid); if (idx === -1) continue
      p.discard.splice(idx, 1)
      if (p.hand.length >= 10) { p.discard.push(c); log(g, { t: 'handBurn', side: s, cardName: c.name, key: 'battleLog.handFullStayGrave', params: { card: c.name } }) }
      else { p.hand.push(c); drawn++; log(g, { t: 'draw', side: s, cardName: c.name, key: `battleLog.drawFromGrave.${SK(s)}`, params: { card: c.name }, sound: 'draw' }) }
    }
    return
  }
  // traukti tinkamas iš kaladės viršaus (deck galas = viršus)
  const drawn: TutCard[] = []
  for (let i = p.deck.length - 1; i >= 0 && drawn.length < count; i--) {
    if (typeOk(p.deck[i])) { drawn.push(p.deck[i]); p.deck.splice(i, 1) }
  }
  if (drawn.length === 0) { log(g, { t: 'blocked', side: s, key: 'battleLog.deckNoDraw' }); return }
  // traukti N → pasilikti K (pop-up); kitas išmesti
  if (opts.keep != null && opts.keep < drawn.length) {
    const discardN = drawn.length - opts.keep
    if (s === 'you') {
      g.pendingPeek = { caster: s, victim: s, choose: discardN, cards: drawn, toHand: true }
      log(g, { t: 'play', side: s, key: 'battleLog.drawChooseDiscard', params: { n: drawn.length, discard: discardN } })
    } else {
      const sorted = [...drawn].sort((a, b) => (b.gold ?? 0) - (a.gold ?? 0))
      const keepSet = new Set(sorted.slice(0, opts.keep).map((c) => c.uid))
      for (const c of drawn) { if (keepSet.has(c.uid)) { if (p.hand.length < 10) p.hand.push(c); else p.discard.push(c) } else p.discard.push(c) }
      log(g, { t: 'play', side: s, key: `battleLog.drawKeep.${SK(s)}`, params: { n: drawn.length, keep: opts.keep } })
    }
    return
  }
  // paprastas tipinis traukimas
  for (const c of drawn) {
    if (p.hand.length >= 10) { p.discard.push(c) }
    else { p.hand.push(c); log(g, { t: 'draw', side: s, cardName: c.name, key: `battleLog.draw.${SK(s)}`, sound: 'draw' }) }
  }
}

// ── #1: prikelti BŪTENT sunaikintas kortas (Kaulų rinkėjas) ──
function reviveCardsPrim(g: GameState, s: Side, cards: TutCard[]) {
  const p = P(g, s)
  for (const card of cards) {
    if (card.type !== 'unit') continue
    const slot = freeUnitSlot(g, p)
    if (slot === -1) { log(g, { t: 'blocked', side: s, key: 'battleLog.zoneFullRaise' }); return }
    // pašalinam iš bet kurio kapinyno (mirus korta nukeliavo į savininko kapinyną)
    for (const sd of ['you', 'ai'] as Side[]) { const dp = P(g, sd); const j = dp.discard.findIndex((c) => c.uid === card.uid); if (j !== -1) { dp.discard.splice(j, 1); break } }
    placeUnit(g, p, card, '-rev' + g.globalTurn)
    log(g, { t: 'play', side: s, cardName: card.name, key: 'battleLog.raiseFromGrave', params: { card: card.name }, sound: 'summon', fromZone: 'graveyard' })
    afterSummon(g, s, card, 'graveyard')
  }
}

let millCounter = 0
function millDeckPrim(g: GameState, s: Side, n: number) {
  const p = P(g, s)
  const milled: TutCard[] = []
  for (let i = 0; i < n; i++) {
    const c = p.deck.pop()
    if (!c) break
    p.discard.push(c)
    milled.push(c)
  }
  if (milled.length > 0) g.lastMill = { id: ++millCounter, side: s, cards: milled }
  log(g, { t: 'discardGold', side: s, value: milled.length, key: `battleLog.mill.${SK(s)}`, params: { n: milled.length } })
  if (milled.length > 0) fireGlobalListeners(g, 'onAnyDiscard', { side: s })
}

function returnGraveyardToDeckPrim(g: GameState, s: Side, n: number) {
  const p = P(g, s)
  let moved = 0
  for (let i = 0; i < n; i++) {
    const c = p.discard.pop()
    if (!c) break
    p.deck.push(c)
    moved++
  }
  if (moved > 0) p.deck = shuffle(p.deck)
  log(g, { t: 'zmkReshuffle', side: s, key: `battleLog.graveToDeck.${SK(s)}`, params: { n: moved } })
}

// „Peržiūrėk N viršutines aukos kaladės → pasirink K išmesti į kapinyną".
// Žmogus-kerėtojas: nustatomas pendingPeek (UI rodo pasirinkimą). AI: auto-renka brangiausias.
function peekDiscardPrim(g: GameState, victim: Side, peekCount: number, choose: number, caster: Side) {
  const vp = P(g, victim)
  const n = Math.min(peekCount, vp.deck.length)
  if (n === 0) { log(g, { t: 'blocked', side: caster, key: 'battleLog.deckEmptyPeek', params: { victim: tref(`battleLog.sideGen.${SK(victim)}`) } }); return }
  const peeked = vp.deck.splice(vp.deck.length - n, n) // viršutinės n (deck galas = viršus)
  const k = Math.min(choose, peeked.length)
  if (caster === 'you') {
    g.pendingPeek = { caster, victim, choose: k, cards: peeked }
    log(g, { t: 'play', side: caster, key: 'battleLog.peekChoose', params: { victim: tref(`battleLog.sideGen.${SK(victim)}`), n, k } })
  } else {
    const sorted = [...peeked].sort((a, b) => (b.gold ?? 0) - (a.gold ?? 0))
    const toDiscard = new Set(sorted.slice(0, k).map((c) => c.uid))
    for (const c of peeked) if (toDiscard.has(c.uid)) vp.discard.push(c)
    for (const c of peeked) if (!toDiscard.has(c.uid)) vp.deck.push(c)
    log(g, { t: 'play', side: caster, key: 'battleLog.peekAuto', params: { caster: tref(`battleLog.side.${SK(caster)}`), victim: tref(`battleLog.sideGen.${SK(victim)}`), n, k } })
  }
}

/** Žaidėjo pasirinkimo užbaigimas: pažymėtos kortos → kapinynas, likusios → atgal ant kaladės. */
export function resolvePeekDiscard(g: GameState, chosenUids: string[]): { ok: boolean; reason?: string } {
  const pk = g.pendingPeek
  if (!pk) return { ok: true }
  const vp = P(g, pk.victim)
  const chosen = new Set(chosenUids.slice(0, pk.choose))
  for (const c of pk.cards) if (chosen.has(c.uid)) vp.discard.push(c)
  for (const c of pk.cards) if (!chosen.has(c.uid)) { if (pk.toHand) { if (vp.hand.length < 10) vp.hand.push(c); else vp.discard.push(c) } else vp.deck.push(c) }
  log(g, { t: 'play', side: pk.caster, key: pk.toHand ? 'battleLog.peekResultHand' : 'battleLog.peekResultDiscard', params: { kept: pk.cards.length - chosen.size, n: chosen.size, victim: tref(`battleLog.sideGen.${SK(pk.victim)}`) } })
  g.pendingPeek = null
  return { ok: true }
}

// Parodo kaladės viršutines `count` kortas (tik skaitymui, nepašalina).
function revealDeckPrim(g: GameState, whoseDeck: Side, count: number, caster: Side) {
  const vp = P(g, whoseDeck)
  const n = Math.min(count, vp.deck.length)
  if (n === 0) { log(g, { t: 'blocked', side: caster, key: 'battleLog.deckEmptyReveal', params: { owner: tref(`battleLog.sideGen.${SK(whoseDeck)}`) } }); return }
  const top = vp.deck.slice(vp.deck.length - n).reverse() // viršus pirmas
  const title = whoseDeck === caster ? 'battleLog.revealTitleOwn' : 'battleLog.revealTitleOther'
  const titleParams = { owner: tref(`battleLog.sideGen.${SK(whoseDeck)}`) }
  if (caster === 'you') {
    g.pendingReveal = { whoseDeck, title, titleParams, cards: top }
  }
  log(g, { t: 'play', side: caster, key: whoseDeck === caster ? 'battleLog.revealOwn' : 'battleLog.revealOther', params: { caster: tref(`battleLog.side.${SK(caster)}`), owner: tref(`battleLog.sideGen.${SK(whoseDeck)}`), n } })
}

// ── Globalūs įvykių pasyvai (onAnyDeath / onAnyAttack) ───────────────────────
// Skenuoja abiejų pusių kovos lauke esančias kortas; jei jų mapping turi
// atitinkamą globalų trigerį – pritaiko. Re-entrancy apsauga prieš ciklus.
let firingGlobal = false
function fireGlobalListeners(g: GameState, trigger: 'onAnyDeath' | 'onAnyAttack' | 'onAnySummon' | 'onAnyPlay' | 'onAnyDamage' | 'onAnyHeal' | 'onAnyDraw' | 'onAnyDiscard' | 'onAnyStatus' | 'onAnyGold' | 'onAnyTurnStart' | 'onAnyTurnEnd' | 'onAnyCast' | 'onAnyArtifact' | 'onAnyChampion' | 'onAnyCurse' | 'onOpponentGoldEmpty', ctx?: { side?: Side; subtype?: string | null; source?: SummonSource; spellType?: SpellType; faction?: number | null }) {
  if (firingGlobal || g.winner) return
  firingGlobal = true
  try {
    // Ar mapping'o trigerio filtrai (kieno įvykis / potipis / frakcija / burto tipas) tinka.
    const passes = (m: EffectMapping, sd: Side): boolean => {
      if (trigger === 'onOpponentGoldEmpty' && ctx?.side && sameTeam(g, ctx.side, sd)) return false
      if (ctx?.side) {
        const want = m.triggerSide ?? 'any'
        if (want === 'own' && ctx.side && !sameTeam(g, ctx.side, sd)) return false
        if (want === 'enemy' && ctx.side && sameTeam(g, ctx.side, sd)) return false
      }
      if (m.triggerSubtype && (ctx?.subtype ?? '').toLowerCase() !== m.triggerSubtype.trim().toLowerCase()) return false
      if (m.triggerSpellType && trigger === 'onAnyCast' && m.triggerSpellType !== ctx?.spellType) return false
      if (m.triggerFaction && ctx?.faction !== m.triggerFaction) return false
      if (m.triggerSummonSource && m.triggerSummonSource !== 'any' && ctx?.source && ctx.source !== m.triggerSummonSource) return false
      return true
    }
    for (const sd of allSeats(g)) {
      const pp = P(g, sd)
      const cards = [
        ...pp.units.filter((u): u is BoardUnit => !!u && !u.statuses.silenced),
        ...pp.artifacts.filter((a): a is BoardArtifact => !!a),
      ]
      for (const c of cards) {
        const ms = (c.card.mappings ?? []).filter((m) => m.trigger === trigger)
        for (const m of ms) {
          if (!passes(m, sd)) continue
          applyMapping(gameApi, g, sd, m, { sourceName: c.card.name, sourceUid: c.uid, depth: 2 })
          if (g.winner) return
        }
      }
      // Užverstos reakcijos („spąstai"): mapping-pagrįstos – suveikia kai įvyksta
      // sukonfigūruotas įvykis (kieno – pagal triggerSide), tada SUNAUDOJAMOS.
      for (let ri = 0; ri < pp.reactions.length; ri++) {
        const r = pp.reactions[ri]
        if (!r) continue
        const rms = (r.card.mappings ?? []).filter((m) => m.trigger === trigger && passes(m, sd))
        if (rms.length === 0) continue
        // Sunaudojam reakciją prieš taikant efektą (kad netriggerintų savęs rekursyviai)
        pp.reactions[ri] = null
        pp.discard.push(r.card)
        log(g, { t: 'reactionTrigger', side: sd, cardName: r.card.name, key: `battleLog.reaction.${SK(sd)}`, params: { card: r.card.name }, src: { side: sd, uid: r.uid } })
        for (const m of rms) {
          applyMapping(gameApi, g, sd, m, { sourceName: r.card.name, sourceUid: r.uid, depth: 2 })
          if (g.winner) return
        }
      }
    }
  } finally {
    firingGlobal = false
  }
}

// #2: prakeiksmui aktyvavus, prikelti iš kapinyno padarus, turinčius onAnyCurse+revive marker'į.
/**
 * Prakeiksmo aktyvacija: kortos efektas tenka VICTIM (kaladės savininkui).
 * via='drawn' – auka ištraukė pati (drawCards); via='forced' – priverstinė
 * aktyvacija efektu (forceCurseActivation). Abiem atvejais: onCurseDrawn
 * mapping'ai, onAnyCurse globalus trigeris ir kapinyno prisikėlimai.
 */
function activateCurseCard(g: GameState, victim: Side, c: TutCard, via: 'drawn' | 'forced') {
  const p = P(g, victim)
  p.discard.push(c)
  log(g, { t: 'curse', side: victim, cardName: c.name, key: via === 'drawn' ? `battleLog.curseDrawn.${SK(victim)}` : 'battleLog.curseForced',
    params: { card: c.name, owner: tref(`battleLog.sideGen.${SK(victim)}`) }, sound: 'curse' })
  const curseCaster: Side = other(victim)
  // Aktyvacija = TIK 'onCurseDrawn' mapping'ai (griežtai, atskirta nuo įmaišymo).
  const curseActivation = (c.mappings ?? []).filter((m) => m.trigger === 'onCurseDrawn')
  if (curseActivation.length > 0) {
    for (const m of curseActivation) {
      applyMapping(gameApi, g, curseCaster, m, { sourceName: c.name, depth: 1 })
      if (g.winner) return
    }
  } else if (!c.mappings || c.mappings.length === 0) {
    // Visai nekonfigūruotas prakeiksmas (be mapping'ų) – tekstinio efekto fallback.
    const dmg = c.effect?.damage ?? 1
    dealToPlayer(g, victim, dmg, curseCaster, false)
  } else {
    // Turi mapping'ų, bet nė vienas nepažymėtas 'onCurseDrawn' – aktyvacija neįvyksta.
    log(g, { t: 'blocked', side: victim, key: 'battleLog.curseNoActivation', params: { card: c.name } })
  }
  // #1: globalus „prakeiksmas aktyvuotas" trigeris (side = auka).
  fireGlobalListeners(g, 'onAnyCurse', { side: victim, subtype: c.subtype, faction: c.factionId })
  // #2: kapinyno prikėlimas (onAnyCurse + revive/resurrectSelf marker'is)
  reviveGraveyardOnCurse(g, victim)
}

/**
 * Priverstinė prakeiksmo aktyvacija: iš VICTIM kaladės paimamas atsitiktinis
 * įmaišytas prakeiksmas ir aktyvuojamas iškart (kaip būtų ištrauktas).
 */
function forceCurseActivationPrim(g: GameState, victim: Side, count: number, srcName: string) {
  const p = P(g, victim)
  for (let i = 0; i < count; i++) {
    const idxs = p.deck.reduce<number[]>((acc, c, ix) => { if (c.type === 'curse') acc.push(ix); return acc }, [])
    if (idxs.length === 0) {
      log(g, { t: 'blocked', side: victim, key: 'battleLog.curseNone', params: { src: srcName, owner: tref(`battleLog.sideGen.${SK(victim)}`) } })
      return
    }
    const [c] = p.deck.splice(idxs[Math.floor(Math.random() * idxs.length)], 1)
    activateCurseCard(g, victim, c, 'forced')
    if (g.winner) return
  }
}

function reviveGraveyardOnCurse(g: GameState, victim: Side) {
  if (g.winner) return
  for (const sd of allSeats(g)) {
    const pp = P(g, sd)
    for (let i = pp.discard.length - 1; i >= 0; i--) {
      const card = pp.discard[i]
      if (!card || card.type !== 'unit') continue
      const trig = (card.mappings ?? []).find((m) => m.trigger === 'onAnyCurse' && (m.effect === 'revive' || m.effect === 'summonFromGraveyard' || m.effect === 'resurrectSelf'))
      if (!trig) continue
      const want = trig.triggerSide ?? 'any'
      if (want === 'own' && !sameTeam(g, victim, sd)) continue
      if (want === 'enemy' && sameTeam(g, victim, sd)) continue
      if (freeUnitSlot(g, pp) === -1) continue
      pp.discard.splice(i, 1)
      const suffix = '-rev' + g.globalTurn + '-' + i
      if (placeUnit(g, pp, card, suffix)) {
        log(g, { t: 'play', side: sd, cardName: card.name, key: 'battleLog.curseRaise', params: { card: card.name }, sound: 'summon', src: { side: sd, uid: card.uid + suffix }, fromZone: 'graveyard' })
        afterSummon(g, sd, card, 'graveyard')
      } else { pp.discard.splice(i, 0, card) }
      if (g.winner) return
    }
  }
}

type SummonSource = 'graveyard' | 'deck' | 'hand' | 'play'

/** Lauko pasyvas: iškviestas padaras su Paskutiniu noru (onDeath) žūsta iškart. */
function fieldKillLastwishSummon(g: GameState, s: Side, card: TutCard) {
  if (g.winner || !fieldEngine.destroySummonedWithLastwish(g, s)) return
  const hasLastwish = (card.mappings ?? []).some((m) => m.trigger === 'onDeath') || card.keywords.includes('lastwish')
  if (!hasLastwish) return
  const u = P(g, s).units.find((x) => x && x.card === card)
  if (!u) return
  log(g, { t: 'field', side: s, cardName: card.name, key: 'battleLog.fieldLastWishDeath', params: { card: card.name } })
  killUnit(g, s, u)
}

/** Iškvietimo (padaro įėjimo į lauką) globalus trigeris. source = iš kur atsirado. */
function afterSummon(g: GameState, s: Side, card: TutCard, source: SummonSource = 'play') {
  recomputeAuras(g)
  fireGlobalListeners(g, 'onAnySummon', { side: s, subtype: card.subtype, faction: card.factionId, source })
  // 'play' kelias šaukia atskirai PO battlecry (kad šūksnis spėtų įvykti)
  if (source !== 'play') {
    // SPECIAL SUMMON (iš kaladės/kapinyno/rankos efektu): Kovos šūksnis IRGI suveikia.
    // Unit'as randamas pagal kortos objekto tapatybę (visi kvietėjai deda tą patį card ref).
    const su = P(g, s).units.find((x): x is BoardUnit => !!x && x.card === card)
    if (su) fireEntryMappings(g, s, su)
    fieldKillLastwishSummon(g, s, card)
  }
}

// ── Kovos šūksnis special summon'ams ir kopijoms ─────────────────────────────
function entryMappingsOf(card: TutCard): { m: EffectMapping; i: number }[] {
  return (card.mappings ?? []).map((m, i) => ({ m, i })).filter((x) => x.m.trigger === 'onSummon' || x.m.trigger === 'onPlay')
}

/** Neišspręstas pendingBattlecry įvykdomas AUTOMATIŠKAI (efektas nepražūva). */
function flushPendingBattlecry(g: GameState) {
  const pb = g.pendingBattlecry
  if (!pb) return
  g.pendingBattlecry = null
  const u = P(g, pb.side).units.find((x): x is BoardUnit => !!x && x.uid === pb.uid)
  if (!u || u.statuses.silenced) return
  for (let bc = 0; bc < pb.rounds && !g.winner; bc++) {
    for (const i of pb.idx) {
      const m = (u.card.mappings ?? [])[i]
      if (m) applyMapping(gameApi, g, pb.side, m, { sourceName: u.card.name, sourceUid: u.uid, depth: 1 })
      if (g.winner) break
    }
  }
}

/** Entry (onSummon/onPlay) mapping'ų vykdymas jau LAUKE esančiam padarui.
 *  entries nenurodžius — visi kortos entry mapping'ai (+legacy battlecry fallback).
 *  'you' pusei taikinio reikalaujantys mapping'ai → pendingBattlecry (korta švyti,
 *  žaidėjas renkasi); AI/svečiui — auto-pick (kaip AI žaidžiant iš rankos). */
function fireEntryMappings(g: GameState, s: Side, u: BoardUnit, entries?: { m: EffectMapping; i: number }[]) {
  if (g.winner || u.statuses.silenced) return
  if (!P(g, s).units.some((x) => x?.uid === u.uid)) return
  const card = u.card
  const list = entries ?? entryMappingsOf(card)
  const rounds = fieldEngine.battlecryTwice(g, s) ? 2 : 1
  if (list.length === 0) {
    if (!entries && card.keywords.includes('battlecry') && card.effect) {
      for (let bc = 0; bc < rounds && !g.winner; bc++) {
        log(g, { t: 'battlecry', side: s, cardName: card.name, key: bc === 0 ? 'battleLog.battlecry' : 'battleLog.battlecryRepeat', params: { card: card.name }, src: { side: s, uid: u.uid } })
        applyAutoEffect(g, s, card.effect, card.name)
      }
    }
    return
  }
  const needSel = s === 'you' ? list.filter((x) => mappingNeedsSelection(x.m)) : []
  const auto = list.filter((x) => !needSel.some((y) => y.i === x.i))
  if (auto.length > 0) {
    for (let bc = 0; bc < rounds && !g.winner; bc++) {
      log(g, { t: 'battlecry', side: s, cardName: card.name, key: bc === 0 ? 'battleLog.battlecry' : 'battleLog.battlecryRepeat', params: { card: card.name }, src: { side: s, uid: u.uid } })
      for (const x of auto) { applyMapping(gameApi, g, s, x.m, { sourceName: card.name, sourceUid: u.uid, depth: 1 }); if (g.winner) break }
    }
  }
  if (needSel.length > 0 && !g.winner && P(g, s).units.some((x) => x?.uid === u.uid)) {
    flushPendingBattlecry(g)  // ankstesnis dar neišspręstas → auto, kad nepražūtų
    g.pendingBattlecry = { side: s, uid: u.uid, rounds, idx: needSel.map((x) => x.i) }
    log(g, { t: 'battlecry', side: s, cardName: card.name, key: 'battleLog.battlecryAwaitTarget', params: { card: card.name }, src: { side: s, uid: u.uid } })
  }
}

/** Žaidėjo pasirinktas pendingBattlecry taikinys. */
export function resolvePendingBattlecry(g: GameState, target: TargetRef): { ok: boolean; reason?: string } {
  const pb = g.pendingBattlecry
  if (!pb) return { ok: true }
  const u = P(g, pb.side).units.find((x): x is BoardUnit => !!x && x.uid === pb.uid)
  g.pendingBattlecry = null
  if (!u) return { ok: true }  // padaras žuvo — šūksnis nebeįvyksta
  for (let bc = 0; bc < pb.rounds && !g.winner; bc++) {
    log(g, { t: 'battlecry', side: pb.side, cardName: u.card.name, key: 'battleLog.battlecry', params: { card: u.card.name }, src: { side: pb.side, uid: u.uid } })
    for (const i of pb.idx) {
      const m = (u.card.mappings ?? [])[i]
      if (m) applyMapping(gameApi, g, pb.side, m, { sourceName: u.card.name, sourceUid: u.uid, chosenTarget: toResolved(target), depth: 0 })
      if (g.winner) break
    }
  }
  checkWin(g)
  return { ok: true }
}
/** Kortos sužaidimo globalus trigeris. */
function afterPlay(g: GameState, s: Side, card: TutCard) {
  recomputeAuras(g)
  fireGlobalListeners(g, 'onAnyPlay', { side: s, subtype: card.subtype, faction: card.factionId })
}

function gainGoldPrim(g: GameState, s: Side, n: number, srcName: string) {
  P(g, s).gold += n
  log(g, { t: 'gold', side: s, value: n, key: `battleLog.goldGain.${SK(s)}`, params: { gold: n, src: srcName } })
  fireGlobalListeners(g, 'onAnyGold', { side: s })
}

function loseGoldPrim(g: GameState, s: Side, n: number, srcName: string) {
  const p = P(g, s)
  p.gold = Math.max(0, p.gold - n)
  log(g, { t: 'gold', side: s, value: -n, key: `battleLog.goldLose.${SK(s)}`, params: { gold: n, src: srcName } })
}

function scheduleGoldPenaltyPrim(g: GameState, s: Side, n: number, srcName: string) {
  const p = P(g, s)
  p.goldPenaltyNextTurn += n
  log(g, { t: 'gold', side: s, value: -n, key: `battleLog.goldPenaltyNext.${SK(s)}`, params: { gold: p.goldPenaltyNextTurn, src: srcName } })
}

function counterCurrentSpellPrim(g: GameState, srcName: string) {
  g.spellCountered = true
  log(g, { t: 'spell', side: g.active, key: 'battleLog.counterReady', params: { src: srcName } })
}

function drawZmkVisualPrim(g: GameState, s: Side) {
  const v = drawZmkCard(g, s)
  log(g, { t: 'zmk', side: s, zmk: v, key: 'battleLog.zmkDraw', params: { zmk: v }, sound: 'zmkFlip' })
  zmkAfter(g, s, v)
}

function removeZmkCardPrim(g: GameState, s: Side, value: string, count: number) {
  const p = P(g, s)
  const target = value as ZmkValue
  let removed = 0
  for (let i = p.zmk.length - 1; i >= 0 && removed < count; i--) {
    if (p.zmk[i] === target) { p.zmk.splice(i, 1); removed++ }
  }
  for (let i = p.zmkGrave.length - 1; i >= 0 && removed < count; i--) {
    if (p.zmkGrave[i] === target) { p.zmkGrave.splice(i, 1); removed++ }
  }
  log(g, {
    t: 'zmkReshuffle', side: s,
    key: removed > 0 ? 'battleLog.zmkRemoved' : 'battleLog.zmkNoneRemoved',
    params: { owner: tref(`battleLog.sideGen.${SK(s)}`), n: removed, card: target },
  })
}

function setSpellDiscountPrim(g: GameState, s: Side, n: number) {
  const p = P(g, s)
  p.spellDiscountNext = Math.max(p.spellDiscountNext, n)
  log(g, { t: 'gold', side: s, value: -n, key: `battleLog.spellDiscount.${SK(s)}`, params: { gold: n } })
}
function addCardCostModPrim(g: GameState, s: Side, delta: number, cardType: string | null) {
  const p = P(g, s)
  p.nextCardCostMods.push({ delta, cardType })
  const typeLbl = cardType ?? ''
  log(g, { t: 'gold', side: s, value: delta, key: `battleLog.${typeLbl ? 'nextCardCostType' : 'nextCardCost'}.${SK(s)}`, params: { type: typeLbl, delta: `${delta >= 0 ? '+' : ''}${delta}` } })
}
function buffSpellDamagePrim(g: GameState, s: Side, n: number) {
  const p = P(g, s)
  p.spellDamageBonus += n
  log(g, { t: 'buff', side: s, value: n, key: `battleLog.spellDamageBonus.${SK(s)}`, params: { n, total: p.spellDamageBonus } })
}

// ── Alchemikų fortas: sužaidus burtą – grąžinti jį į savininko kaladę ─────────
function maybeReturnCastSpell(g: GameState, caster: Side, card: TutCard) {
  for (const sd of allSeats(g)) {
    const p = P(g, sd)
    const srcs = [
      ...p.units.filter((u): u is BoardUnit => !!u && !u.statuses.silenced),
      ...p.artifacts.filter((a): a is BoardArtifact => !!a),
    ]
    let match = false
    for (const c of srcs) {
      const sc = c.card.gameplay?.passiveAura?.returnCastSpellScope
      if (!sc) continue
      if (sc === 'all' || (sc === 'friendly' ? caster === sd : caster !== sd)) { match = true; break }
    }
    if (!match) continue
    const cp = P(g, caster)
    const idx = cp.discard.findIndex((c) => c.uid === card.uid)
    if (idx === -1) return
    const [returned] = cp.discard.splice(idx, 1)
    cp.deck = shuffle([...cp.deck, returned])
    log(g, { t: 'play', side: caster, cardName: returned.name, key: 'battleLog.alchemistFort', params: { card: returned.name, owner: tref(`battleLog.sideGen.${SK(caster)}`) } })
    return
  }
}

// ── Tutor: korta/burtas pagal tipą iš kaladės/kapinyno į ranką (Milva Servilė) ─
function tutorToHandPrim(g: GameState, caster: Side, opts: { zone?: 'deck' | 'discard' | 'both'; spellType?: string; cardType?: string; choose?: boolean }) {
  const p = P(g, caster)
  const zone = opts.zone ?? 'both'
  const wantType = (opts.spellType ?? '').trim()
  const wantCardType = (opts.cardType ?? '').trim()
  const fromZones: { arr: TutCard[]; name: 'deck' | 'discard' }[] = []
  if (zone === 'deck' || zone === 'both') fromZones.push({ arr: p.deck, name: 'deck' })
  if (zone === 'discard' || zone === 'both') fromZones.push({ arr: p.discard, name: 'discard' })
  const eligible = (c: TutCard) => c.type !== 'curse'
    && (!wantCardType || c.type === wantCardType)
    && (!wantType || (c.type === 'spell' && c.gameplay?.spellType === wantType))
  const candidates: { card: TutCard; arr: TutCard[] }[] = []
  for (const z of fromZones) for (const c of z.arr) if (eligible(c)) candidates.push({ card: c, arr: z.arr })
  if (candidates.length === 0) { log(g, { t: 'blocked', side: caster, key: wantType ? 'battleLog.tutorNoneType' : 'battleLog.tutorNone', params: { type: wantType } }); return }
  if (opts.choose && caster === 'you') {
    g.pendingChoice = {
      caster, sourceName: 'Tutor', kind: 'tutorHand',
      title: wantType ? 'battleLog.chooseCardToHandType' : 'battleLog.chooseCardToHand',
      titleParams: { type: wantType },
      options: candidates.slice(0, 12).map((c) => ({ label: c.card.name, sub: t('battleLog.goldCost', { gold: c.card.gold }) })),
      cards: candidates.slice(0, 12).map((c) => c.card),
    }
    return
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  const i = pick.arr.findIndex((c) => c.uid === pick.card.uid)
  if (i === -1) return
  const [c] = pick.arr.splice(i, 1)
  if (p.hand.length >= 10) { p.discard.push(c); log(g, { t: 'handBurn', side: caster, cardName: c.name, key: 'battleLog.handFullToGrave', params: { card: c.name } }); return }
  p.hand.push(c)
  log(g, { t: 'draw', side: caster, cardName: c.name, key: `battleLog.tutorGain.${SK(caster)}`, params: { card: caster === 'you' ? c.name : '?' }, sound: 'draw' })
}

// ── chooseEffect: žaidėjas renkasi 1 iš variantų (pop-up); AI auto 1-as ───────
function chooseEffectPrim(g: GameState, caster: Side, sourceName: string, branches: EffectMapping[][], labels: string[], chooser?: Side) {
  if (branches.length === 0) return
  const who: Side = chooser ?? caster
  if (who === 'you') {
    // Pop-up rodomas tam, kas renkasi (chooser). Efektai vykdomi kerėtojo (caster) vardu.
    g.pendingChoice = {
      caster, chooser: 'you', sourceName, kind: 'effect',
      title: 'battleLog.chooseEffect',
      titleParams: { src: sourceName },
      options: branches.map((_, i) => ({ label: labels[i] || t('battleLog.variant', { n: i + 1 }) })),
      branches,
    }
    return
  }
  // AI renkasi – paprastas euristinis: 1-as variantas (vykdomas caster vardu)
  for (const m of branches[0]) {
    applyMapping(gameApi, g, caster, m, { sourceName, depth: 1 })
    if (g.winner) return
  }
}

/** Žaidėjo pasirinkimo (chooseEffect / tutorHand) užbaigimas. */
export function resolveChoice(g: GameState, index: number): { ok: boolean; reason?: string } {
  const pc = g.pendingChoice
  if (!pc) return { ok: true }
  g.pendingChoice = null
  if (pc.kind === 'effect' && pc.branches && pc.branches[index]) {
    for (const m of pc.branches[index]) {
      applyMapping(gameApi, g, pc.caster, m, { sourceName: pc.sourceName, depth: 1 })
      if (g.winner) break
    }
  } else if (pc.kind === 'tutorHand' && pc.cards && pc.cards[index]) {
    const card = pc.cards[index]
    const p = P(g, pc.caster)
    for (const arr of [p.deck, p.discard]) {
      const i = arr.findIndex((c) => c.uid === card.uid)
      if (i !== -1) {
        const [c] = arr.splice(i, 1)
        if (p.hand.length >= 10) { p.discard.push(c); log(g, { t: 'handBurn', side: pc.caster, cardName: c.name, key: 'battleLog.handFullToGrave', params: { card: c.name } }) }
        else { p.hand.push(c); log(g, { t: 'draw', side: pc.caster, cardName: c.name, key: `battleLog.tutorPick.${SK(pc.caster)}`, params: { card: c.name }, sound: 'draw' }) }
        break
      }
    }
  }
  return { ok: true }
}

export const gameApi: GameApi = {
  dealToUnit, dealToPlayer, dealToArtifact,
  healUnit: healUnitPrim,
  healPlayer: healPlayerPrim,
  drawCards: (g, s, n) => drawCards(g, s, n),
  discardCards: discardCardsPrim,
  killUnit,
  destroyArtifact: destroyArtifactPrim,
  applyStatus,
  buffUnit: buffUnitPrim,
  gainGold: gainGoldPrim,
  loseGold: loseGoldPrim,
  scheduleGoldPenalty: scheduleGoldPenaltyPrim,
  counterCurrentSpell: counterCurrentSpellPrim,
  returnUnitToHand: returnUnitToHandPrim,
  summonFromZone: summonFromZonePrim,
  millDeck: millDeckPrim,
  returnGraveyardToDeck: returnGraveyardToDeckPrim,
  peekDiscard: peekDiscardPrim,
  revealDeck: revealDeckPrim,
  summonAdvanced: summonAdvancedPrim,
  drawAdvanced: drawAdvancedPrim,
  reviveCards: reviveCardsPrim,
  activateCurses: (g, target, count, srcName, depth) => curseActivate(gameApi, g, target, count, srcName, depth),
  copyEffectFromGraveyard: (g, s, sourceUid, sourceName, fromSide) => copyEffectPrim(g, s, sourceUid, sourceName, fromSide),
  takeControlUnit: takeControlUnitPrim,
  forceCurseActivation: forceCurseActivationPrim,
  drawZmkVisual: drawZmkVisualPrim,
  removeZmkCard: removeZmkCardPrim,
  setSpellDiscount: setSpellDiscountPrim,
  addCardCostMod: addCardCostModPrim,
  buffSpellDamage: buffSpellDamagePrim,
  tutorToHand: tutorToHandPrim,
  chooseEffect: chooseEffectPrim,
  effectiveAtk: (g, u) => effectiveAtk(g, u),
  log,
}

/** Reali kortos kaina su lauko pasyvais (burtai/padarai gali kainuoti kitaip). */
export function effectiveCost(g: GameState, s: Side, card: TutCard): number {
  let cost = card.gold
  if (card.type === 'spell') cost += fieldEngine.spellCostDelta(g, s) - P(g, s).spellDiscountNext
  if (card.type === 'unit') cost += fieldEngine.unitCostDelta(g, s)
  cost -= auraCostReductionFor(g, s, card)
  cost += cardCostModDelta(g, s, card)
  return Math.max(0, cost)
}

/** Sekančios kortos kainos modifikatorių suma, tinkanti šiai kortai (cardCostMod). */
function cardCostModDelta(g: GameState, s: Side, card: TutCard): number {
  let d = 0
  for (const m of P(g, s).nextCardCostMods) {
    if (m.cardType === null || m.cardType === card.type) d += m.delta
  }
  return d
}
/** Suvartoja (pašalina) šiai kortai tinkamus kainos modifikatorius – po sėkmingo sužaidimo. */
function consumeCardCostMods(g: GameState, s: Side, card: TutCard): void {
  const p = P(g, s)
  p.nextCardCostMods = p.nextCardCostMods.filter((m) => !(m.cardType === null || m.cardType === card.type))
}

/** Suskaičiuoja kainos sumažinimą iš pasyvių aurų (padarų/artefaktų kovos lauke). */
function auraCostReductionFor(g: GameState, s: Side, card: TutCard): number {
  let red = 0
  const want = (st?: string) => (st ?? '').trim().toLowerCase()
  for (const sd of allSeats(g)) {
    const p = P(g, sd)
    const srcs = [
      ...p.units.filter((u): u is BoardUnit => !!u && !u.statuses.silenced),
      ...p.artifacts.filter((a): a is BoardArtifact => !!a),
    ]
    for (const c of srcs) {
      const cfg = c.card.gameplay?.passiveAura
      if (!cfg?.auraCostReduction) continue
      const scope = cfg.auraScope ?? 'friendly'
      const sideMatch = scope === 'all' || (scope === 'friendly' ? sameTeam(g, sd, s) : !sameTeam(g, sd, s))
      if (!sideMatch) continue
      if (cfg.auraSubtype && want(card.subtype ?? undefined) !== want(cfg.auraSubtype)) continue
      if (cfg.auraFaction && card.factionId !== cfg.auraFaction) continue
      red += cfg.auraCostReduction
    }
  }
  return red
}

/** Numatytasis projectile pagal kortos efektą (kai admin nenurodė). */
export function projectileForCard(card: TutCard): ProjectileType {
  const m = card.mappings?.[0]
  const eff = m?.effect
  if (eff === 'damage') return 'fireball'
  if (eff === 'heal') return 'healingGlow'
  if (eff === 'freeze') return 'freezeBurst'
  if (eff === 'stun') return 'stunBurst'
  if (eff === 'destroy') return 'destroyStrike'
  if (eff === 'poison' || eff === 'burn') return 'poisonGlob'
  if (eff === 'triggerCurse') return 'darkCurse'
  const e = card.effect
  if (e?.status === 'frozen') return 'freezeBurst'
  if (e?.status === 'stunned') return 'stunBurst'
  if (e?.status === 'poisoned' || e?.status === 'burning') return 'poisonGlob'
  if (e?.damage) return 'fireball'
  if (e?.heal) return 'healingGlow'
  return 'none'
}

/** TargetRef (UI) -> ResolvedTarget (effect engine) */
export function toResolved(t: TargetRef): ResolvedTarget {
  return t as ResolvedTarget
}

// ── Ėjimo pradžia / pabaiga ───────────────────────────────────────────────────

export function beginTurn(g: GameState): GameState {
  if (g.winner) return g
  g.rollContext = null
  g.globalTurn += 1
  seatBeginTurn(g, g.active)
  return g
}

/** Vieno seat'o ėjimo pradžia (be globalTurn/rollContext – juos tvarko viešosios funkcijos). */
function seatBeginTurn(g: GameState, s: Side): GameState {
  if (g.winner) return g
  const p = P(g, s)
  p.turnNumber += 1
  // Pasibaigusios būsenos: ĖJIMO PRADŽIOJE nuimamos TIK savo ėjime uždėtos
  // (integer until); ne savo ėjime uždėtos (x.5) kausto visą šį ėjimą ir
  // nuimamos jo pabaigoje (žr. seatEndTurn).
  for (const u of p.units) {
    if (!u) continue
    for (const k of Object.keys(u.statuses) as TutStatus[]) {
      const until = u.statuses[k]
      if (until !== undefined && until !== PERMANENT && Number.isInteger(until) && p.turnNumber >= until) {
        delete u.statuses[k]
        log(g, { t: 'status', side: s, cardName: u.card.name, status: k, statusEvt: 'remove', statusId: k, src: { side: s, uid: u.uid }, key: 'battleLog.statusEnd', params: { card: u.card.name, status: tref(`statusEffects.${k}.name`) } })
      }
    }
  }
  expireTempBuffs(g, s, 'beginTurn')
  expireControl(g, s, 'beginTurn')
  // Lauko pasyvas: ėjimo pradžioje aktyvus žaidėjas grąžina VIENĄ padarą iš lauko
  // (savo ARBA priešo – korta grįžta jos savininkui į ranką).
  // 'you' – renkasi per pendingReturn UI; AI/svečias – automatiškai: brangiausią priešo,
  // jei priešas padarų neturi – pigiausią savo.
  if (fieldEngine.returnUnitAtTurnStart(g, s)) {
    const all: { side: Side; u: BoardUnit }[] = []
    for (const sd of allSeats(g)) for (const x of P(g, sd).units) if (x) all.push({ side: sd, u: x })
    if (all.length > 0) {
      if (s === 'you') {
        g.pendingReturn = { side: s }
        log(g, { t: 'field', side: s, cardName: g.field?.card.name, key: 'battleLog.fieldChooseReturn' })
      } else {
        const enemies = all.filter((x) => !sameTeam(g, x.side, s))
        const pick = enemies.length > 0
          ? enemies.reduce((bst, x) => (x.u.card.gold > bst.u.card.gold ? x : bst), enemies[0])
          : all.filter((x) => sameTeam(g, x.side, s)).reduce((bst, x) => (x.u.card.gold < bst.u.card.gold ? x : bst), all[0])
        log(g, { t: 'field', side: s, cardName: g.field?.card.name, key: `battleLog.fieldReturn.${sameTeam(g, pick.side, s) ? 'self' : 'foe'}`, params: { side: tref(`battleLog.side.${SK(s)}`), card: pick.u.card.name } })
        returnUnitToHandPrim(g, pick.side, pick.u)
        recomputeAuras(g)
      }
    }
  }
  p.discardedForGold = false
  p.attacksThisTurn = 0
  p.fieldDamageReducedThisTurn = false
  log(g, { t: 'startTurn', side: s, key: `battleLog.turnStart.${SK(s)}`, params: { n: p.turnNumber } })

  // 1. Ėjimo pradžios efektai: Degantis / Apnuodytas (1 bazinė žala + ŽMK)
  for (const u of [...p.units]) {
    if (!u) continue
    if (u.statuses.burning) {
      log(g, { t: 'status', side: s, cardName: u.card.name, status: 'burning', statusEvt: 'trigger', statusId: 'burning', src: { side: s, uid: u.uid }, key: 'battleLog.burningTick', params: { card: u.card.name } })
      dealToUnit(g, u, s, 1, s)
    }
    const stillAlive = p.units.some((x) => x?.uid === u.uid)
    if (stillAlive && u.statuses.poisoned) {
      log(g, { t: 'status', side: s, cardName: u.card.name, status: 'poisoned', statusEvt: 'trigger', statusId: 'poisoned', src: { side: s, uid: u.uid }, key: 'battleLog.poisonTick', params: { card: u.card.name } })
      dealToUnit(g, u, s, 1, s)
    }
  }
  // Artefaktų „ėjimo pradžioje" efektai (supaprastinta)
  for (const a of p.artifacts) {
    if (!a) continue
    const e = a.card.effect
    if (e && /ėjimo pradž/i.test(a.card.effectText)) {
      log(g, { t: 'artifact', side: s, cardName: a.card.name, key: 'battleLog.artifactTrigger', params: { card: a.card.name } })
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

  // 1b. onTurnStart mapping'ai (padarai, artefaktai, laukas)
  fireTrigger(gameApi, g, s, 'onTurnStart')
  fireGlobalListeners(g, 'onAnyTurnStart', { side: s })
  if (g.winner) return g

  // 2. Kortos traukimas
  drawCards(g, s, 1)
  if (g.winner) return g
  // 3. Aukso gavimas pagal ėjimo numerį (+ lauko bonusas)
  const fieldBonus = fieldEngine.fieldGoldBonus(g, s)
  // += (ne =): ėjimo pradžios trigger'ių duotas auksas išsaugomas
  p.gold += Math.min(p.turnNumber, 10) * 100 + fieldBonus
  log(g, { t: 'gold', side: s, value: p.gold, key: `battleLog.${fieldBonus ? 'turnGoldField' : 'turnGold'}.${SK(s)}`, params: { gold: p.gold, turn: `${p.turnNumber}${p.turnNumber >= 10 ? '+' : ''}`, bonus: fieldBonus } })
  // Aukso bauda iš priešo efekto (loseGoldNextTurn)
  if (p.goldPenaltyNextTurn > 0) {
    const pen = Math.min(p.gold, p.goldPenaltyNextTurn)
    p.gold -= pen
    log(g, { t: 'gold', side: s, value: -pen, key: `battleLog.goldPenalty.${SK(s)}`, params: { gold: pen, left: p.gold } })
    p.goldPenaltyNextTurn = 0
  }
  return g
}

export function endTurn(g: GameState): GameState {
  if (g.winner) return g
  g.rollContext = null
  seatEndTurn(g, g.active)
  g.active = other(g.active)
  return g
}

/** Vieno seat'o ėjimo pabaiga (be active perjungimo/rollContext). */
function seatEndTurn(g: GameState, s: Side): GameState {
  if (g.winner) return g
  const p = P(g, s)
  if (g.pendingReturn?.side === s) g.pendingReturn = null  // nespėjo pasirinkti – praleidžiama
  if (g.pendingBattlecry?.side === s) flushPendingBattlecry(g)  // nepasirinko taikinio → auto
  // Priešo uždėtos būsenos (until x.5): kaustė visą šį ėjimą — nuimamos jo pabaigoje,
  // kad uždėjusiojo kitame ėjime padaras jau būtų laisvas (atsakytų į atakas).
  for (const u of p.units) {
    if (!u) continue
    for (const k of Object.keys(u.statuses) as TutStatus[]) {
      const until = u.statuses[k]
      if (until !== undefined && until !== PERMANENT && !Number.isInteger(until) && p.turnNumber >= Math.floor(until)) {
        delete u.statuses[k]
        log(g, { t: 'status', side: s, cardName: u.card.name, status: k, statusEvt: 'remove', statusId: k, src: { side: s, uid: u.uid }, key: 'battleLog.statusEnd', params: { card: u.card.name, status: tref(`statusEffects.${k}.name`) } })
      }
    }
  }
  expireTempBuffs(g, s, 'endTurn')
  expireControl(g, s, 'endTurn')
  recomputeAuras(g)
  // onTurnEnd mapping'ai (padarai, artefaktai, laukas)
  fireTrigger(gameApi, g, s, 'onTurnEnd')
  fireGlobalListeners(g, 'onAnyTurnEnd', { side: s })
  p.gold = 0
  log(g, { t: 'endTurn', side: s, key: `battleLog.turnEnd.${SK(s)}` })
  return g
}

// ── 2v2 komandos ėjimai ──────────────────────────────────────────────────────
/** Komandos ėjimo pradžia: VISI tos komandos seat'ai gauna ėjimo pradžią (auksas/traukimas/triggeriai). */
export function beginTeamTurn(g: GameState): GameState {
  if (g.winner || !g.teams) return g
  g.rollContext = null
  g.globalTurn += 1
  const team = g.activeTeam ?? 'A'
  const seats = g.teams[team].seatIds
  log(g, { t: 'startTurn', side: seats[0], key: 'battleLog.teamTurnStart', params: { team } })
  for (const s of seats) { if (g.winner) break; seatBeginTurn(g, s) }
  g.active = seats[0]
  return g
}
/** Komandos ėjimo pabaiga: visi komandos seat'ai baigia; aktyvi komanda persijungia. */
export function endTeamTurn(g: GameState): GameState {
  if (g.winner || !g.teams) return g
  g.rollContext = null
  const team = g.activeTeam ?? 'A'
  for (const s of g.teams[team].seatIds) seatEndTurn(g, s)
  g.activeTeam = team === 'A' ? 'B' : 'A'
  g.active = g.teams[g.activeTeam].seatIds[0]
  return g
}

// ── Veiksmai ──────────────────────────────────────────────────────────────────

/** reason = i18n raktas (battleLog.err.*); tekstas gimsta UI per resultText(). */
export type PlayResult = { ok: true } | { ok: false; reason: string; reasonParams?: Record<string, string | number> }

export function canAfford(g: GameState, s: Side, card: TutCard): boolean {
  return P(g, s).gold >= effectiveCost(g, s, card)
}

export function discardForGold(g: GameState, s: Side, uid: string): PlayResult {
  const p = P(g, s)
  if (p.discardedForGold) return { ok: false, reason: 'battleLog.err.discardOncePerTurn' }
  const i = p.hand.findIndex((c) => c.uid === uid)
  if (i === -1) return { ok: false, reason: 'battleLog.err.cardNotInHand' }
  const [c] = p.hand.splice(i, 1)
  p.discard.push(c)
  p.gold += 100
  p.discardedForGold = true
  log(g, { t: 'discardGold', side: s, cardName: c.name, key: `battleLog.discardForGold.${SK(s)}`, params: { card: c.name, gold: p.gold } })
  return { ok: true }
}

export function playCard(g: GameState, s: Side, uid: string, opts?: { target?: TargetRef; targets?: TargetRef[]; sacrificeUid?: string; tributeHandUid?: string; tributeHandUids?: string[] }): PlayResult {
  const pp = P(g, s)
  const playedCard = pp.hand.find((c) => c.uid === uid)
  const goldBefore = pp.gold
  const r = playCardInner(g, s, uid, opts)
  if (r.ok && playedCard) consumeCardCostMods(g, s, playedCard)
  // „Kai priešininkas išnaudoja visą auksą" – fire'inam priešo kortoms (jos reaguoja į TAVO 0 aukso).
  if (r.ok && goldBefore > 0 && pp.gold === 0 && !g.winner) fireGlobalListeners(g, 'onOpponentGoldEmpty', { side: s })
  return r
}

function playCardInner(g: GameState, s: Side, uid: string, opts?: { target?: TargetRef; targets?: TargetRef[]; sacrificeUid?: string; tributeHandUid?: string; tributeHandUids?: string[] }): PlayResult {
  if (g.winner) return { ok: false, reason: 'battleLog.err.gameOver' }
  g.rollContext = null
  if (g.active !== s) return { ok: false, reason: 'battleLog.err.notYourTurn' }
  const p = P(g, s)
  const i = p.hand.findIndex((c) => c.uid === uid)
  if (i === -1) return { ok: false, reason: 'battleLog.err.cardNotInHand' }
  const card = p.hand[i]
  const cost = effectiveCost(g, s, card)
  if (p.gold < cost) return { ok: false, reason: cost !== card.gold ? 'battleLog.err.notEnoughGoldField' : 'battleLog.err.notEnoughGold', reasonParams: { cost, gold: p.gold } }

  switch (card.type) {
    case 'unit': {
      const slot = freeUnitSlot(g, p)
      if (slot === -1) return { ok: false, reason: 'battleLog.err.unitZoneFull', reasonParams: { max: fieldEngine.creatureCap(g, s) } }
      p.hand.splice(i, 1)
      p.gold -= cost
      const u: BoardUnit = {
        uid: card.uid, card,
        atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
        shield: card.keywords.includes('shield'),
        stealth: card.keywords.includes('stealth'),
        statuses: {}, summonedOnTurn: g.globalTurn, attacksUsed: 0,
        isChampion: false, phase: 0, abilityUsed: false,
      }
      p.units[slot] = u
      log(g, { t: 'play', side: s, cardName: card.name, value: cost, key: `battleLog.${card.keywords.includes('sprint') ? 'playUnitSprint' : 'playUnit'}.${SK(s)}`, params: { card: card.name, cost }, src: { side: s, uid: u.uid }, sound: 'summon' })
      afterSummon(g, s, card, 'play')
      afterPlay(g, s, card)
      const summonMappings = (card.mappings ?? []).filter((m) => m.trigger === 'onSummon' || m.trigger === 'onPlay')
      // Lauko pasyvas: Kovos šūksniai suveikia 2 kartus
      const bcRounds = fieldEngine.battlecryTwice(g, s) ? 2 : 1
      if (summonMappings.length > 0) {
        for (let bc = 0; bc < bcRounds && !g.winner; bc++) {
          log(g, { t: 'battlecry', side: s, cardName: card.name, key: bc === 0 ? 'battleLog.battlecry' : 'battleLog.battlecryRepeat', params: { card: card.name }, src: { side: s, uid: u.uid } })
          for (const m of summonMappings) {
            applyMapping(gameApi, g, s, m, { sourceName: card.name, sourceUid: u.uid, chosenTarget: opts?.target ? toResolved(opts.target) : undefined, chosenTargets: opts?.targets?.map(toResolved), depth: 0 })
            if (g.winner) break
          }
        }
      } else if (card.keywords.includes('battlecry') && card.effect) {
        for (let bc = 0; bc < bcRounds && !g.winner; bc++) {
          log(g, { t: 'battlecry', side: s, cardName: card.name, key: bc === 0 ? 'battleLog.battlecry' : 'battleLog.battlecryRepeat', params: { card: card.name }, src: { side: s, uid: u.uid } })
          if (card.effect.targeted && opts?.target) applyTargetedEffect(g, s, card.effect, opts.target, card.name)
          else applyAutoEffect(g, s, card.effect, card.name)
        }
      }
      // lauko onSummon trigger'iai
      fireTrigger(gameApi, g, s, 'onSummon', 1)
      // Lauko pasyvas: padaras su Paskutiniu noru žūsta iškart (po battlecry)
      if (!g.winner) fieldKillLastwishSummon(g, s, card)
      return { ok: true }
    }
    case 'spell': {
      p.hand.splice(i, 1)
      p.gold -= cost
      p.spellDiscountNext = 0
      g.rollContext = { kind: 'spell', actor: s, spellType: card.gameplay?.spellType }
      const spellMappings = (card.mappings ?? []).filter((m) => m.trigger === 'onCast' || m.trigger === 'onPlay')
      const proj = spellMappings[0]?.projectile ?? card.gameplay?.projectileType ?? projectileForCard(card)
      log(g, {
        t: 'spell', side: s, cardName: card.name, value: cost,
        key: `battleLog.castSpell.${SK(s)}`, params: { card: card.name, cost },
        src: { side: s }, tgt: opts?.target ? { ...opts.target } : undefined,
        projectile: proj, sound: spellMappings[0]?.sound ?? card.gameplay?.soundType ?? 'spellCast',
      })
      // Reakcijų langas: priešo onAnyCast gali NUTILDYTI/ATŠAUKTI burtą (castSpell taikinys)
      g.spellCountered = false
      fireGlobalListeners(g, 'onAnyCast', { side: s, subtype: card.subtype, faction: card.factionId, spellType: card.gameplay?.spellType })
      if (g.spellCountered) {
        g.spellCountered = false
        log(g, { t: 'spell', side: s, cardName: card.name, key: 'battleLog.spellCountered', params: { card: card.name } })
        p.discard.push(card)
        afterPlay(g, s, card)
        return { ok: true }
      }
      if (spellMappings.length > 0) {
        for (const m of spellMappings) {
          applyMapping(gameApi, g, s, m, { sourceName: card.name, chosenTarget: opts?.target ? toResolved(opts.target) : undefined, chosenTargets: opts?.targets?.map(toResolved), depth: 0 })
          if (g.winner) break
        }
      } else if (card.effect) {
        if (card.effect.targeted && opts?.target) applyTargetedEffect(g, s, card.effect, opts.target, card.name)
        else applyAutoEffect(g, s, card.effect, card.name)
      }
      p.discard.push(card)
      maybeReturnCastSpell(g, s, card)
      // lauko onCast trigger'iai
      fireTrigger(gameApi, g, s, 'onCast', 1)
      afterPlay(g, s, card)
      return { ok: true }
    }
    case 'artifact': {
      const slot = p.artifacts.findIndex((a) => a === null)
      if (slot === -1) return { ok: false, reason: 'battleLog.err.artifactZoneFull' }
      p.hand.splice(i, 1)
      p.gold -= card.gold
      p.artifacts[slot] = { uid: card.uid, card, hp: card.health ?? 3, maxHp: card.health ?? 3 }
      log(g, { t: 'artifact', side: s, cardName: card.name, value: card.gold, key: `battleLog.playArtifact.${SK(s)}`, params: { card: card.name } })
      afterPlay(g, s, card)
      fireGlobalListeners(g, 'onAnyArtifact', { side: s, subtype: card.subtype, faction: card.factionId })
      return { ok: true }
    }
    case 'reaction': {
      const slot = p.reactions.findIndex((r) => r === null)
      if (slot === -1) return { ok: false, reason: 'battleLog.err.reactionZoneFull' }
      p.hand.splice(i, 1)
      p.gold -= card.gold
      p.reactions[slot] = { uid: card.uid, card, paid: card.gold }
      log(g, { t: 'reactionSet', side: s, value: card.gold, key: `battleLog.playReaction.${SK(s)}`, params: { gold: card.gold } })
      return { ok: true }
    }
    case 'field': {
      p.hand.splice(i, 1)
      p.gold -= cost
      if (g.field) {
        // onFieldLeave trigger'iai prieš pakeičiant
        fireTrigger(gameApi, g, s, 'onFieldLeave', 1)
        const oldOwner = P(g, g.field.owner)
        oldOwner.discard.push(g.field.card)
        log(g, { t: 'field', side: s, cardName: g.field.card.name, key: 'battleLog.fieldReplaced', params: { card: g.field.card.name } })
      }
      g.field = { card, owner: s }
      log(g, { t: 'field', side: s, cardName: card.name, key: `battleLog.playField.${SK(s)}`, params: { card: card.name }, sound: 'field' })
      fireTrigger(gameApi, g, s, 'onFieldEnter', 1)
      afterPlay(g, s, card)
      return { ok: true }
    }
    case 'champion': {
      // Tribute: 1 padaras iš lauko (1 tšk) ARBA 1 korta iš rankos (2 tšk). Reikia ≥1 tšk.
      const doTribute = (): PlayResult => {
        if (opts?.sacrificeUid) {
          const sIdx = p.units.findIndex((u) => !!u && u.uid === opts.sacrificeUid && !u.isChampion)
          if (sIdx === -1) return { ok: false, reason: 'battleLog.err.tributePickUnit' }
          const sac = p.units[sIdx] as BoardUnit
          p.units[sIdx] = null
          p.discard.push(sac.card)
          log(g, { t: 'death', side: s, cardName: sac.card.name, key: 'battleLog.sacrificeUnit', params: { card: sac.card.name }, src: { side: s, uid: sac.uid } })
          return { ok: true }
        }
        const handIds = (opts?.tributeHandUids ?? (opts?.tributeHandUid ? [opts.tributeHandUid] : [])).filter((x) => x !== uid)
        if (handIds.length >= 2) {
          const idxs: number[] = []
          for (const hid of handIds.slice(0, 2)) {
            const hIdx = p.hand.findIndex((c, ci) => c.uid === hid && !idxs.includes(ci))
            if (hIdx === -1) return { ok: false, reason: 'battleLog.err.tributeHandNotFound' }
            idxs.push(hIdx)
          }
          for (const hIdx of [...idxs].sort((a, b) => b - a)) {
            const [hc] = p.hand.splice(hIdx, 1)
            p.discard.push(hc)
            log(g, { t: 'death', side: s, cardName: hc.name, key: 'battleLog.sacrificeHand', params: { card: hc.name } })
          }
          return { ok: true }
        }
        return { ok: false, reason: 'battleLog.err.tributeRequired' }
      }
      const fam = card.championGroup ?? null
      const cardPhase = card.championPhase ?? null
      const existing = p.units.find((u) => u?.isChampion && (fam ? u.card.championGroup === fam : true))
      if (existing) {
        // Evoliucija. Griežta, jei nustatyta fazė: ši korta turi būti būtent +1 fazė.
        if (cardPhase != null && cardPhase !== existing.phase + 1) {
          return { ok: false, reason: 'battleLog.err.championPhaseNeeded', reasonParams: { phase: cardPhase, need: cardPhase - 1, current: existing.phase } }
        }
        const t = doTribute()
        if (!t.ok) return t
        const ci = p.hand.findIndex((c) => c.uid === uid)
        if (ci >= 0) p.hand.splice(ci, 1)
        p.gold -= cost
        existing.phase = cardPhase ?? existing.phase + 1
        existing.card = card
        existing.maxHp = card.health ?? existing.maxHp + 2
        existing.hp = existing.maxHp
        log(g, { t: 'evolve', side: s, cardName: card.name, key: 'battleLog.championEvolve', params: { phase: existing.phase } })
        afterPlay(g, s, card)
        fireGlobalListeners(g, 'onAnyChampion', { side: s, subtype: card.subtype, faction: card.factionId })
        return { ok: true }
      }
      // Iškvietimas (nėra šios šeimos čempiono lauke). Griežta: tik 1 fazės kortą.
      if (cardPhase != null && cardPhase !== 1) {
        return { ok: false, reason: 'battleLog.err.championFirstPhase', reasonParams: { phase: cardPhase } }
      }
      const willFreeBoard = !!opts?.sacrificeUid
      if (unitCount(p) - (willFreeBoard ? 1 : 0) >= fieldEngine.creatureCap(g, s)) return { ok: false, reason: 'battleLog.err.unitZoneFullChampion', reasonParams: { max: fieldEngine.creatureCap(g, s) } }
      const t = doTribute()
      if (!t.ok) return t
      const ci = p.hand.findIndex((c) => c.uid === uid)
      if (ci >= 0) p.hand.splice(ci, 1)
      p.gold -= cost
      const freeSlot = freeUnitSlot(g, p)
      if (freeSlot === -1) return { ok: false, reason: 'battleLog.err.unitZoneFullSimple' }
      p.units[freeSlot] = {
        uid: card.uid, card, atk: 0,
        hp: card.health ?? 8, maxHp: card.health ?? 8,
        shield: false, stealth: false, statuses: {},
        summonedOnTurn: g.globalTurn, attacksUsed: 0,
        isChampion: true, phase: 1, abilityUsed: false,
      }
      log(g, { t: 'champion', side: s, cardName: card.name, value: card.gold, key: `battleLog.playChampion.${SK(s)}`, params: { card: card.name } })
      afterSummon(g, s, card, 'play')
      afterPlay(g, s, card)
      fireGlobalListeners(g, 'onAnyChampion', { side: s, subtype: card.subtype, faction: card.factionId })
      return { ok: true }
    }
    case 'curse':
      return { ok: false, reason: 'battleLog.err.cursesOnlyViaEffects' }
  }
}

/** Čempiono fazės keitimas į mažesnę: rankos korta <-> tos pačios šeimos žemesnės fazės korta iš kaladės. */
export function swapChampionPhase(g: GameState, s: Side, handUid: string, targetPhase: number): PlayResult {
  if (g.winner) return { ok: false, reason: 'battleLog.err.gameOver' }
  if (g.active !== s) return { ok: false, reason: 'battleLog.err.notYourTurn' }
  const p = P(g, s)
  const i = p.hand.findIndex((c) => c.uid === handUid)
  if (i === -1) return { ok: false, reason: 'battleLog.err.cardNotInHand' }
  const card = p.hand[i]
  const fam = card.championGroup
  const ph = card.championPhase ?? null
  if (!fam || ph == null) return { ok: false, reason: 'battleLog.err.notPhasedChampion' }
  if (targetPhase >= ph) return { ok: false, reason: 'battleLog.err.onlyLowerPhase' }
  const di = p.deck.findIndex((c) => c.championGroup === fam && c.championPhase === targetPhase)
  if (di === -1) return { ok: false, reason: 'battleLog.err.noFamilyPhaseCard', reasonParams: { phase: targetPhase } }
  const [lower] = p.deck.splice(di, 1)
  p.hand.splice(i, 1)
  p.hand.push(lower)
  p.deck.push(card)
  p.deck = shuffle(p.deck)
  log(g, { t: 'champion', side: s, cardName: lower.name, key: `battleLog.championSwap.${SK(s)}`, params: { card: card.name, phase: ph, to: lower.name, toPhase: targetPhase } })
  return { ok: true }
}

/** Grąžina čempiono skill sąrašą (su atrakinimu pagal fazę). */
export function championSkills(ch: BoardUnit): { name: string; mappings: EffectMapping[]; unlocked: boolean }[] {
  const cfg = ch.card.gameplay?.championSkillConfig
  let raw = cfg?.skills
  if ((!raw || raw.length === 0) && (cfg?.mappings?.length || ch.card.mappings?.length)) {
    raw = [{ name: t('battle.game.skillDefault'), mappings: cfg?.mappings ?? ch.card.mappings ?? [] }]
  }
  return (raw ?? []).slice(0, 3).map((sk, i) => ({
    name: sk.name || `Skill ${i + 1}`,
    mappings: sk.mappings ?? [],
    unlocked: ch.phase >= i + 1,
  }))
}

export function useChampionAbility(g: GameState, s: Side, skillIndex = 0, opts?: { target?: TargetRef; targets?: TargetRef[] }): PlayResult {
  if (g.active !== s) return { ok: false, reason: 'battleLog.err.notYourTurn' }
  const p = P(g, s)
  const ch = p.units.find((u) => u?.isChampion)
  if (!ch) return { ok: false, reason: 'battleLog.err.noChampionOnBoard' }
  if (ch.abilityUsed) return { ok: false, reason: 'battleLog.err.skillOncePerTurn' }
  if (ch.statuses.frozen || ch.statuses.stunned) return { ok: false, reason: 'battleLog.err.championStatusBlocked', reasonParams: { status: tref(`statusEffects.${ch.statuses.frozen ? 'frozen' : 'stunned'}.name`) } }
  if (ch.statuses.silenced) return { ok: false, reason: 'battleLog.err.championSilenced' }
  const skills = championSkills(ch)
  if (skillIndex < 0 || skillIndex >= skills.length) return { ok: false, reason: 'battleLog.err.skillNotConfigured' }
  if (!skills[skillIndex].unlocked) return { ok: false, reason: 'battleLog.err.skillLocked', reasonParams: { n: skillIndex + 1 } }
  const skill = skills[skillIndex]
  ch.abilityUsed = true
  g.rollContext = { kind: 'spell', actor: s, spellType: ch.card.gameplay?.spellType }
  log(g, {
    t: 'ability', side: s, cardName: ch.card.name, key: 'battleLog.championSkill', params: { card: ch.card.name, skill: skill.name, phase: ch.phase },
    skillIndex,
    src: { side: s, uid: ch.uid }, tgt: opts?.target ? { ...opts.target } : undefined,
    projectile: skill.mappings[0]?.projectile ?? projectileForCard(ch.card), sound: 'championSkill',
  })
  if (skill.mappings.length > 0) {
    for (const m of skill.mappings) {
      applyMapping(gameApi, g, s, m, { sourceName: ch.card.name, sourceUid: ch.uid, chosenTarget: opts?.target ? toResolved(opts.target) : undefined, chosenTargets: opts?.targets?.map(toResolved), depth: 0 })
      if (g.winner) break
    }
  } else {
    const e = ch.card.effect ?? { damage: ch.phase, targeted: true }
    if (e.targeted && opts?.target) applyTargetedEffect(g, s, e, opts.target, ch.card.name)
    else applyAutoEffect(g, s, e, ch.card.name)
  }
  fireTrigger(gameApi, g, s, 'onChampionSkill', 1)
  return { ok: true }
}

// ── Atakos ────────────────────────────────────────────────────────────────────

export function effectiveAtk(g: GameState, u: BoardUnit): number {
  // lauko pasyvas (admin config arba legacy parsed buffAtk)
  const owner: Side = g.you.units.some((x) => x?.uid === u.uid) ? 'you' : 'ai'
  return Math.max(0, u.atk + fieldEngine.fieldAtkDelta(g, owner))
}

// Maks. atakų per ėjimą šiam padarui: 1 + papildomos (statinės/sąlyginės/dinaminės iš gameplay.extraAttacks).
function unitMaxAttacks(g: GameState, s: Side, u: BoardUnit): number {
  const ea = u.card.gameplay?.extraAttacks
  if (!ea) return 1
  const enemyUnits = enemySeats(g, s).flatMap((f) => P(g, f).units.filter((x): x is BoardUnit => !!x))
  const tauntCount = enemyUnits.filter((x) => !x.statuses.silenced && (x.card.keywords.includes('taunt') || !!x.auraKw?.includes('taunt'))).length
  let extra = ea.base ?? 0
  if ((ea.ifEnemyTaunt ?? 0) > 0 && tauntCount > 0) extra += ea.ifEnemyTaunt as number
  if ((ea.perEnemyTaunt ?? 0) > 0) extra += (ea.perEnemyTaunt as number) * tauntCount
  if ((ea.ifNoEnemyCreatures ?? 0) > 0 && enemyUnits.length === 0) extra += ea.ifNoEnemyCreatures as number
  return 1 + Math.max(0, extra)
}

export function canUnitAttack(g: GameState, s: Side, u: BoardUnit): { ok: boolean; reason?: string; reasonParams?: Record<string, string | number> } {
  if (u.isChampion) return { ok: false, reason: 'battleLog.err.championCannotAttack' }
  const limit = fieldEngine.attackLimit(g, s)
  if (P(g, s).attacksThisTurn >= limit) return { ok: false, reason: 'battleLog.err.fieldAttackLimit', reasonParams: { max: limit } }
  if (u.attacksUsed >= unitMaxAttacks(g, s, u)) return { ok: false, reason: 'battleLog.err.alreadyAttacked' }
  if (u.statuses.frozen) return { ok: false, reason: 'battleLog.err.unitFrozen' }
  if (u.statuses.stunned) return { ok: false, reason: 'battleLog.err.unitStunned' }
  if (u.auraCantAttack) return { ok: false, reason: 'battleLog.err.auraBlocksAttack' }
  if (u.summonedOnTurn === g.globalTurn && !(!u.statuses.silenced && (u.card.keywords.includes('sprint') || !!u.auraKw?.includes('sprint'))))
    return { ok: false, reason: 'battleLog.err.summoningSickness' }
  if (effectiveAtk(g, u) <= 0) return { ok: false, reason: 'battleLog.err.zeroAtk' }
  return { ok: true }
}

/** Ar atakos apribojimas leidžia šį taikinį. */
function attackTargetAllowed(g: GameState, r: AttackRestriction, t: TargetRef): boolean {
  switch (r) {
    case 'unitsOnly': return t.kind === 'unit'
    case 'championsOnly': {
      if (t.kind !== 'unit') return false
      const u = P(g, t.side).units.find((x) => x?.uid === t.uid)
      return !!u?.isChampion
    }
    case 'noPlayer': return t.kind !== 'player'
    case 'playerOnly': return t.kind === 'player'
    case 'artifactsOnly': return t.kind === 'artifact'
    default: return true
  }
}

/** Teisėti atakos taikiniai (Pasišaipymas + Sėlinimas + padaro atakos apribojimas). */
export function legalTargets(g: GameState, attackerSide: Side, attacker?: BoardUnit): TargetRef[] {
  const foes = enemySeats(g, attackerSide)  // 1v1: [other]; 2v2: abu priešų seat'ai
  const restriction = attacker?.card.gameplay?.attackRestriction
  const ignoreTaunt = !!attacker?.card.gameplay?.ignoreTaunt
  const apply = (list: TargetRef[]) => restriction ? list.filter((t) => attackTargetAllowed(g, restriction, t)) : list
  // Pasišaipymas: jei BET KURIS priešų seat'as turi taunt – privaloma pulti taunt
  const taunts: TargetRef[] = []
  for (const foe of foes) for (const u of P(g, foe).units) if (u && !u.statuses.silenced && (u.card.keywords.includes('taunt') || !!u.auraKw?.includes('taunt')) && !u.stealth) taunts.push({ kind: 'unit', side: foe, uid: u.uid })
  if (!ignoreTaunt && taunts.length > 0) return apply(taunts)
  const out: TargetRef[] = []
  for (const foe of foes) {
    for (const u of P(g, foe).units) if (u && !u.stealth) out.push({ kind: 'unit', side: foe, uid: u.uid })
    for (const a of P(g, foe).artifacts) if (a) out.push({ kind: 'artifact', side: foe, uid: a.uid })
  }
  // Lauko pasyvas: žaidėjo pulti negalima, kol jis turi bent vieną padarą
  const defSide = foes[0] ?? other(attackerSide)
  const foeHasUnits = foes.some((fs) => P(g, fs).units.some(Boolean))
  if (!(fieldEngine.unitsGuardPlayer(g, defSide) && foeHasUnits)) {
    out.push({ kind: 'player', side: defSide })  // priešų komandos HP
  }
  return apply(out)
}

function maybeTriggerReaction(g: GameState, defender: Side, attacker: BoardUnit, attackerSide: Side) {
  const dp = P(g, defender)
  // naujausia padėta reakcija suveikia pirma
  for (let i = dp.reactions.length - 1; i >= 0; i--) {
    const r = dp.reactions[i]
    if (!r) continue
    // Mapping-pagrįstos reakcijos suveikia per globalius trigerius (fireGlobalListeners),
    // todėl jų čia (legacy ataka) nešauname – kad nedubliuotųsi.
    if ((r.card.mappings ?? []).length > 0) continue
    dp.reactions[i] = null
    dp.discard.push(r.card)
    log(g, { t: 'reactionTrigger', side: defender, cardName: r.card.name, key: `battleLog.reactionBeforeAttack.${SK(defender)}`, params: { card: r.card.name } })
    const e = r.card.effect
    if (e?.damage) dealToUnit(g, attacker, attackerSide, e.damage, defender)
    else if (e) applyAutoEffect(g, defender, e, r.card.name)
    else dealToUnit(g, attacker, attackerSide, 1, defender)
    return
  }
}

export function attack(g: GameState, s: Side, attackerUid: string, target: TargetRef): PlayResult {
  if (g.winner) return { ok: false, reason: 'battleLog.err.gameOver' }
  g.rollContext = null
  if (g.active !== s) return { ok: false, reason: 'battleLog.err.notYourTurn' }
  const p = P(g, s)
  const u = p.units.find((x) => x?.uid === attackerUid)
  if (!u) return { ok: false, reason: 'battleLog.err.unitNotOnBoard' }
  const can = canUnitAttack(g, s, u)
  if (!can.ok) return { ok: false, reason: can.reason ?? '', reasonParams: can.reasonParams }
  const legal = legalTargets(g, s, u)
  const isLegal = legal.some((t) =>
    t.kind === target.kind && t.side === target.side && ('uid' in t ? t.uid === (target as { uid?: string }).uid : true))
  if (!isLegal) return { ok: false, reason: 'battleLog.err.tauntMustAttack' }

  u.attacksUsed += 1
  p.attacksThisTurn += 1
  g.rollContext = { kind: 'attack', actor: s, poisonedSides: { you: false, ai: false }, blessedSides: { you: false, ai: false } }
  if (g.rollContext.poisonedSides) g.rollContext.poisonedSides[s] = !!u.statuses.poisoned
  if (g.rollContext.blessedSides) g.rollContext.blessedSides[s] = !!u.statuses.blessed
  if (u.statuses.blessed) { delete u.statuses.blessed; log(g, { t: 'status', side: s, cardName: u.card.name, statusEvt: 'destroy', statusId: 'blessed', src: { side: s, uid: u.uid }, key: 'battleLog.blessedUsed', params: { card: u.card.name } }) }
  if (u.stealth) { u.stealth = false; log(g, { t: 'status', side: s, cardName: u.card.name, statusEvt: 'remove', statusId: 'stealth', src: { side: s, uid: u.uid }, key: 'battleLog.stealthEnd', params: { card: u.card.name } }) }
  const foe: Side = ('side' in target) ? target.side : other(s)  // 2v2: gynėjas pagal taikinio seat'ą
  const atk = effectiveAtk(g, u)
  const unfav = !!u.statuses.poisoned // Apnuodytas puola nepalankiai
  // onAttack mapping'ai (puolančiojo). useAttackTarget → efektas taikomas į atakuotą taikinį.
  for (const m of (u.card.mappings ?? [])) {
    if (m.trigger !== 'onAttack') continue
    const ct = m.useAttackTarget ? toResolved(target) : undefined
    applyMapping(gameApi, g, s, m, { sourceName: u.card.name, sourceUid: u.uid, chosenTarget: ct, depth: 1, allMappings: u.card.mappings ?? [] })
    if (g.winner) break
  }
  fireGlobalListeners(g, 'onAnyAttack', { side: s, subtype: u.card.subtype, faction: u.card.factionId })

  // Gynėjo reakcija (jei turi) – „paskutinis aktyvavęsis sprendžiamas pirmas"
  maybeTriggerReaction(g, foe, u, s)
  if (!p.units.some((x) => x?.uid === u.uid)) return { ok: true } // žuvo nuo reakcijos

  if (target.kind === 'unit') {
    const def = P(g, foe).units.find((x) => x?.uid === target.uid)
    if (!def) { log(g, { t: 'blocked', side: s, key: 'battleLog.targetInvalid' }); return { ok: true } }
    const defHadTaunt = def.card.keywords.includes('taunt') || !!def.auraKw?.includes('taunt')
    const defHadShield = !!def.shield
    log(g, { t: 'attack', side: s, cardName: u.card.name, key: 'battleLog.attackUnit', params: { card: u.card.name, atk, target: def.card.name }, src: { side: s, uid: u.uid }, tgt: { kind: 'unit', side: foe, uid: def.uid }, sound: 'attack' })
    // onAttacked mapping'ai (gynėjo). useAttackTarget → efektas taikomas į atakuotoją.
    if (!def.statuses.silenced) {
      const attackerRef = toResolved({ kind: 'unit', side: s, uid: u.uid })
      for (const m of (def.card.mappings ?? [])) {
        if (m.trigger !== 'onAttacked') continue
        const ct = m.useAttackTarget ? attackerRef : undefined
        applyMapping(gameApi, g, foe, m, { sourceName: def.card.name, sourceUid: def.uid, chosenTarget: ct, depth: 1, allMappings: def.card.mappings ?? [] })
        if (g.winner) break
      }
      if (!p.units.some((x) => x?.uid === u.uid)) return { ok: true }
    }
    if (g.rollContext?.kind === 'attack' && g.rollContext.poisonedSides) g.rollContext.poisonedSides[foe] = !!def.statuses.poisoned
    const defAtk = def.isChampion ? 0 : effectiveAtk(g, def)
    const defRetaliates = !def.statuses.frozen && defAtk > 0 // Sušaldytas nedaro atgalinės žalos
    // abu žalą daro vienu metu: puolančiojo žala gynėjui
    if (def.shield) {
      def.shield = false
      log(g, { t: 'damage', side: foe, cardName: def.card.name, value: 0, statusEvt: 'destroy', statusId: 'shield', src: { side: foe, uid: def.uid }, key: 'battleLog.shieldNullify', params: { card: def.card.name } })
    } else {
      const dmg = rollDamage(g, s, atk, ctxBias(g, s))
      def.hp -= dmg
      log(g, { t: 'damage', side: foe, cardName: def.card.name, value: dmg, key: 'battleLog.unitDamage', params: { card: def.card.name, dmg, hp: Math.max(0, def.hp), maxHp: def.maxHp } })
    }
    // atgalinė žala puolančiajam
    if (defRetaliates) {
      if (u.shield) {
        u.shield = false
        log(g, { t: 'damage', side: s, cardName: u.card.name, value: 0, statusEvt: 'destroy', statusId: 'shield', src: { side: s, uid: u.uid }, key: 'battleLog.shieldNullifyBack', params: { card: u.card.name } })
      } else {
        const back = rollDamage(g, foe, defAtk, ctxBias(g, foe))
        u.hp -= back
        log(g, { t: 'damage', side: s, cardName: u.card.name, value: back, key: 'battleLog.counterDamage', params: { card: u.card.name, dmg: back, hp: Math.max(0, u.hp), maxHp: u.maxHp } })
      }
    } else if (def.statuses.frozen) {
      log(g, { t: 'status', side: foe, cardName: def.card.name, status: 'frozen', key: 'battleLog.frozenNoCounter', params: { card: def.card.name } })
    }
    const defKilled = def.hp <= 0
    const gkc = g as unknown as { __killCredit?: KillCreditT }
    if (def.hp <= 0) { gkc.__killCredit = { side: s, uid: u.uid, name: u.card.name, mappings: u.card.mappings ?? [], depth: 0 }; killUnit(g, foe, def); gkc.__killCredit = undefined }
    if (u.hp <= 0) { gkc.__killCredit = { side: foe, uid: def.uid, name: def.card.name, mappings: def.card.mappings ?? [], depth: 0 }; killUnit(g, s, u); gkc.__killCredit = undefined }
    // Antros atakos aura: puolantysis sunaikino padarą ir pats išliko.
    if (defKilled && !def.isChampion && u.hp > 0 && p.units.some((x) => x?.uid === u.uid)) {
      grantSecondAttackIfAura(g, s, u, { taunt: defHadTaunt, shield: defHadShield })
    }
  } else if (target.kind === 'artifact') {
    const a = P(g, foe).artifacts.find((x) => x?.uid === target.uid)
    if (!a) return { ok: true }
    log(g, { t: 'attack', side: s, cardName: u.card.name, key: 'battleLog.attackArtifact', params: { card: u.card.name, target: a.card.name }, src: { side: s, uid: u.uid }, tgt: { kind: 'artifact', side: foe, uid: a.uid }, sound: 'attack' })
    dealToArtifact(g, a, foe, atk, s)
  } else {
    log(g, { t: 'attack', side: s, cardName: u.card.name, key: `battleLog.attackPlayer.${SK(foe)}`, params: { card: u.card.name }, src: { side: s, uid: u.uid }, tgt: { kind: 'player', side: foe }, sound: 'attack' })
    if (unfav) { const dmg = rollDamage(g, s, atk, ctxBias(g, s)); if (dmg > 0) { const left = applyPlayerDamage(g, foe, dmg); log(g, { t: 'damage', side: foe, value: dmg, key: `battleLog.playerDamage.${SK(foe)}`, params: { dmg, left } }); checkWin(g) } }
    else dealToPlayer(g, foe, atk, s)
  }
  checkWin(g)
  return { ok: true }
}

// ── Klonavimas (UI immutability) ──────────────────────────────────────────────

export function cloneState(g: GameState): GameState {
  return JSON.parse(JSON.stringify(g)) as GameState
}

// ── PvP tinklas: perspektyvos apvertimas + struktūruoti veiksmai ─────────────
/** Apverčia būseną svečio perspektyvai (jo padarai = 'you', host'o = 'ai'). */
export function swapPerspective(g: GameState): GameState {
  const c = cloneState(g)
  const tmp = c.you; c.you = c.ai; c.ai = tmp
  c.you.side = 'you'; c.ai.side = 'ai'
  c.active = other(c.active)
  if (c.winner) c.winner = other(c.winner)
  if (c.field) c.field.owner = other(c.field.owner)
  for (const e of c.log) {
    e.side = other(e.side)
    if (e.src) e.src.side = other(e.src.side)
    if (e.tgt && e.tgt.side) e.tgt.side = other(e.tgt.side)
  }
  if (c.pendingPeek) { c.pendingPeek.caster = other(c.pendingPeek.caster); c.pendingPeek.victim = other(c.pendingPeek.victim) }
  if (c.pendingReveal) c.pendingReveal.whoseDeck = other(c.pendingReveal.whoseDeck)
  if (c.pendingSummon) c.pendingSummon.caster = other(c.pendingSummon.caster)
  if (c.pendingChoice) { c.pendingChoice.caster = other(c.pendingChoice.caster); if (c.pendingChoice.chooser) c.pendingChoice.chooser = other(c.pendingChoice.chooser) }
  if (c.pendingCopy) { c.pendingCopy.caster = other(c.pendingCopy.caster); c.pendingCopy.options.forEach((o) => { o.side = other(o.side) }) }
  if (c.pendingReturn) c.pendingReturn.side = other(c.pendingReturn.side)
  if (c.pendingBattlecry) c.pendingBattlecry.side = other(c.pendingBattlecry.side)
  if (c.lastMill) c.lastMill.side = other(c.lastMill.side)
  // takeControl: perimtų padarų „kam grąžinti" pusė irgi apverčiama
  for (const p of [c.you, c.ai]) for (const u of p.units) { if (u?.control) u.control.from = other(u.control.from) }
  return c
}

/** Lauko pasyvo pendingReturn sprendimas: grąžina pasirinktą padarą (bet kurios pusės)
 *  jo savininkui į ranką. */
export function resolveReturnUnit(g: GameState, uid: string): { ok: boolean; reason?: string } {
  const pr = g.pendingReturn
  if (!pr) return { ok: false, reason: 'battleLog.err.noPendingReturn' }
  for (const sd of allSeats(g)) {
    const u = P(g, sd).units.find((x) => x?.uid === uid)
    if (u) {
      g.pendingReturn = null
      returnUnitToHandPrim(g, sd, u)
      recomputeAuras(g)
      return { ok: true }
    }
  }
  return { ok: false, reason: 'battleLog.err.unitNotFound' }
}

export type NetAction =
  | { t: 'play'; actor: Side; uid: string; target?: TargetRef; targets?: TargetRef[]; sacrificeUid?: string; tributeHandUid?: string; tributeHandUids?: string[] }
  | { t: 'attack'; actor: Side; uid: string; target: TargetRef }
  | { t: 'discardForGold'; actor: Side; uid: string }
  | { t: 'champ'; actor: Side; skillIndex: number; target?: TargetRef; targets?: TargetRef[] }
  | { t: 'endTurn'; actor: Side }
  | { t: 'resolveSummon'; uids: string[] }
  | { t: 'resolvePeek'; uids: string[] }
  | { t: 'resolveChoice'; index: number }
  | { t: 'resolveCopy'; uid: string }
  | { t: 'resolveReturn'; uid: string }
  | { t: 'resolveBattlecry'; target: TargetRef }
  | { t: 'swapChampPhase'; actor: Side; uid: string; phase: number }
  | { t: 'clearReveal' }

/** Pritaiko struktūruotą veiksmą (host'o autoritetinei būsenai). */
export function applyNetAction(g: GameState, a: NetAction): { ok: boolean; reason?: string } {
  switch (a.t) {
    case 'play': return playCard(g, a.actor, a.uid, { target: a.target, targets: a.targets, sacrificeUid: a.sacrificeUid, tributeHandUid: a.tributeHandUid, tributeHandUids: a.tributeHandUids })
    case 'attack': return attack(g, a.actor, a.uid, a.target)
    case 'discardForGold': return discardForGold(g, a.actor, a.uid)
    case 'champ': return useChampionAbility(g, a.actor, a.skillIndex, { target: a.target, targets: a.targets })
    case 'endTurn': { endTurn(g); if (!g.winner) beginTurn(g); return { ok: true } }
    case 'resolveSummon': return resolveSummonChoice(g, a.uids)
    case 'resolvePeek': return resolvePeekDiscard(g, a.uids)
    case 'resolveChoice': return resolveChoice(g, a.index)
    case 'resolveCopy': return resolveCopyEffect(g, a.uid)
    case 'resolveReturn': return resolveReturnUnit(g, a.uid)
    case 'resolveBattlecry': return resolvePendingBattlecry(g, a.target)
    case 'swapChampPhase': return swapChampionPhase(g, a.actor, a.uid, a.phase)
    case 'clearReveal': g.pendingReveal = null; return { ok: true }
  }
}

/** Apverčia veiksmo puses (svečio 'you'-koordinatės -> host'o koordinatės). */
export function swapAction(a: NetAction): NetAction {
  const sw = <T extends TargetRef | undefined>(t: T): T =>
    (t ? ({ ...t, side: other(t.side) } as T) : t)
  switch (a.t) {
    case 'play': return { ...a, actor: other(a.actor), target: sw(a.target), targets: a.targets?.map(sw) }
    case 'attack': return { ...a, actor: other(a.actor), target: sw(a.target) }
    case 'discardForGold': return { ...a, actor: other(a.actor) }
    case 'champ': return { ...a, actor: other(a.actor), target: sw(a.target), targets: a.targets?.map(sw) }
    case 'endTurn': return { ...a, actor: other(a.actor) }
    case 'swapChampPhase': return { ...a, actor: other(a.actor) }
    default: return a
  }
}
