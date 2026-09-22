// ── Kovos žurnalas v2: variklio įvykiai → VEIKSMŲ kortelės ─────────────────
// Grynas modulis (be React, be i18n): `groupLog(log)` paverčia plokščią
// GameEvent[] sąrašą į LogAction[] — viena kortelė = vienas veiksmas (ataka,
// iškvietimas, burtas, šūksnis, noras, trigeris, reakcija, prakeiksmas…) su
// visomis jo pasekmėmis (ŽMK, žala, gydymas, buff'ai, statusai, žūtys).
// Ėjimo pradžia = antraštės kortelė, į kurią sutraukiami traukimai, ėjimo
// auksas ir „baigia ėjimą". Planas: KOVOS-ZURNALAS-V2-PLANAS.md.
//
// Taisyklės:
//  • šakninis įvykis pradeda naują kortelę; visi ne-šakniniai įvykiai
//    prilimpa prie paskutinės kortelės (ir prie jos `events` – detalėms);
//  • `zmk` įsimenamas ir priklijuojamas prie KITO žalos hit'o (variklio tvarka:
//    zmk → damage, visada);
//  • `battlecry` iš karto po `play` to paties padaro = raktažodis ant tos pačios
//    kortelės (ne nauja kortelė); kitais atvejais (killEffect, effect-summon
//    šūksnis) – atskira `battlecry` kortelė;
//  • `play` su summonByEffect/summonChosen/raiseFromGrave raktu = hit'as
//    „iškviesta" ant esamos kortelės, ne nauja kortelė.

import type { GameEvent, Side, ZmkValue } from '@/lib/tutorial/engine'

export type LogActionKind =
  | 'turn' | 'attack' | 'play' | 'spell' | 'artifact' | 'field' | 'champion' | 'skill'
  | 'battlecry' | 'lastwish' | 'trigger' | 'reaction' | 'curse' | 'other'

export type LogKeyword = 'battlecry' | 'lastwish' | 'trigger' | 'reaction' | 'curse'

export type LogHitType = 'dmg' | 'heal' | 'buff' | 'status' | 'death' | 'summon' | 'gold' | 'return' | 'block'

export type LogHit = {
  t: LogHitType
  value?: number
  zmk?: ZmkValue
  /** „3/5" po žalos/gydymo (iš params hp/maxHp), jei variklis davė. */
  hpAfter?: string
  statusId?: string
  statusEvt?: 'apply' | 'trigger' | 'remove' | 'destroy'
  /** buff: ATK/HP, gold: n. */
  label?: string
  /** žaidėjo (avataro) HP po žalos. */
  left?: number
}

export type LogRef = { name?: string; uid?: string; player?: Side; side?: Side }

export type LogTarget = LogRef & { hits: LogHit[] }

export type LogAction = {
  kind: LogActionKind
  side: Side
  /** šakninio įvykio indeksas žurnale – React raktas + dedup */
  atLog: number
  root: GameEvent
  source?: LogRef
  /** ataka į kitą padarą: abipusė (`⇄`) kai gynėjas atsikerta. */
  mutual?: boolean
  targets: LogTarget[]
  keyword?: LogKeyword
  /** kind='turn' */
  turn?: { n: number; side: Side; gold: number; draws: number }
  /** visi kortelės įvykiai (detalėms – eventText) */
  events: GameEvent[]
  /** filtrui „Svarbu" */
  important: boolean
  /** kortelės kaina (play/spell/artifact/champion) */
  cost?: number
}

const SUMMON_HIT_KEYS = new Set(['battleLog.summonByEffect', 'battleLog.summonChosen', 'battleLog.raiseFromGrave', 'battleLog.curseRaise'])
const TURN_GOLD_KEYS = /^battleLog\.turnGold/
const HIDDEN_KEYS = new Set(['battleLog.zmkSpecialReshuffle', 'battleLog.zmkReshuffle.you', 'battleLog.zmkReshuffle.ai'])

function refOf(e: GameEvent): LogRef {
  // attack / reactionTrigger: cardName = ŠALTINIS, tgt = taikinys (vardas – params.target arba vėliau iš damage)
  const srcIsCard = e.t === 'attack' || e.t === 'reactionTrigger'
  if (e.tgt) {
    if (e.tgt.kind === 'player') return { player: e.tgt.side ?? e.side, side: e.tgt.side ?? e.side }
    return { uid: e.tgt.uid, name: srcIsCard ? (e.params?.target != null ? String(e.params.target) : undefined) : e.cardName, side: e.tgt.side }
  }
  if (e.cardName && !srcIsCard) return { name: e.cardName, uid: e.src?.uid, side: e.src?.side ?? e.side }
  return { player: e.side, side: e.side }
}

function targetFor(a: LogAction, r: LogRef): LogTarget {
  let t: LogTarget | undefined
  if (r.player) t = a.targets.find((x) => x.player === r.player)
  else {
    if (r.uid) t = a.targets.find((x) => x.uid === r.uid)
    // attack/counter log'ai uid neneša – sujungiam pagal vardą ir užpildom trūkstamą uid/vardą
    if (!t && r.name) t = a.targets.find((x) => !x.player && x.name === r.name)
    if (!t && r.uid && !r.name) t = a.targets.find((x) => !x.player && !x.uid && x.side === r.side && a.targets.length === 1)
    if (t) { if (!t.uid && r.uid) t.uid = r.uid; if (!t.name && r.name) t.name = r.name }
  }
  if (!t) { t = { ...r, hits: [] }; a.targets.push(t) }
  return t
}

function newAction(kind: LogActionKind, e: GameEvent, idx: number, extra?: Partial<LogAction>): LogAction {
  return { kind, side: e.side, atLog: idx, root: e, targets: [], events: [e], important: false, ...extra }
}

export function groupLog(log: GameEvent[]): LogAction[] {
  const out: LogAction[] = []
  let cur: LogAction | null = null
  let turn: LogAction | null = null
  let pendingZmk: ZmkValue | undefined
  const push = (a: LogAction) => { out.push(a); cur = a; return a }
  const attach = (e: GameEvent) => { if (cur) cur.events.push(e); else if (turn) turn.events.push(e) }

  for (let i = 0; i < log.length; i++) {
    const e = log[i]
    const key = e.key ?? ''
    switch (e.t) {
      case 'startTurn': {
        const n = Number(e.params?.n ?? 0)
        turn = push(newAction('turn', e, i, { turn: { n, side: e.side, gold: 0, draws: 0 } }))
        cur = null
        continue
      }
      case 'draw': {
        if (turn && cur === null) { turn.turn!.draws += 1; turn.events.push(e) }
        else attach(e)
        continue
      }
      case 'gold': {
        if (TURN_GOLD_KEYS.test(key) && turn) { turn.turn!.gold += Number(e.value ?? e.params?.gold ?? 0); turn.events.push(e); continue }
        if (cur) { targetFor(cur, { player: e.side, side: e.side }).hits.push({ t: 'gold', value: e.value ?? Number(e.params?.gold ?? 0) }); cur.events.push(e) }
        else attach(e)
        continue
      }
      case 'endTurn': case 'mulligan': case 'deckEmpty': { attach(e); continue }
      case 'zmk': {
        if (e.zmk && key !== 'battleLog.zmkRemap' && key !== 'battleLog.zmkDraw') pendingZmk = (e.zmkPicked ?? e.zmk) as ZmkValue
        if (!HIDDEN_KEYS.has(key)) attach(e)
        continue
      }
      case 'attack': {
        const a = push(newAction('attack', e, i, { source: { name: e.cardName, uid: e.src?.uid, side: e.side } }))
        if (e.tgt) targetFor(a, refOf(e))
        continue
      }
      case 'play': {
        if (SUMMON_HIT_KEYS.has(key) && cur) { targetFor(cur, { name: e.cardName, uid: e.src?.uid, side: e.side }).hits.push({ t: 'summon' }); cur.events.push(e); continue }
        push(newAction('play', e, i, { source: { name: e.cardName, uid: e.src?.uid, side: e.side }, cost: e.value }))
        continue
      }
      case 'spell': {
        if (key === 'battleLog.spellCountered' || key === 'battleLog.counterReady') { attach(e); continue }
        push(newAction('spell', e, i, { source: { name: e.cardName, side: e.side }, cost: e.value, important: true }))
        continue
      }
      case 'artifact': {
        if (e.kw === 'trigger' || key === 'battleLog.artifactTrigger') { push(newAction('trigger', e, i, { source: { name: e.cardName, uid: e.src?.uid, side: e.side }, keyword: 'trigger', important: true })); continue }
        push(newAction('artifact', e, i, { source: { name: e.cardName, side: e.side }, cost: e.value }))
        continue
      }
      case 'field': {
        if (key.startsWith('battleLog.playField')) { push(newAction('field', e, i, { source: { name: e.cardName, side: e.side }, important: true })); continue }
        if (key === 'battleLog.fieldTrigger') { push(newAction('trigger', e, i, { source: { name: e.cardName, side: e.side }, keyword: 'trigger', important: true })); continue }
        attach(e); continue
      }
      case 'champion': {
        push(newAction('champion', e, i, { source: { name: e.cardName, side: e.side }, cost: e.value }))
        continue
      }
      case 'ability': {
        push(newAction('skill', e, i, { source: { name: e.cardName, uid: e.src?.uid, side: e.side }, important: true }))
        continue
      }
      case 'battlecry': {
        // šūksnis iš karto po SAVO iškvietimo → raktažodis ant tos pačios kortelės
        if (cur && cur.kind === 'play' && (cur.source?.uid ? cur.source.uid === e.src?.uid : cur.source?.name === e.cardName) && !cur.keyword) {
          cur.keyword = 'battlecry'; cur.important = true; cur.events.push(e); continue
        }
        if (key === 'battleLog.battlecryAwaitTarget' || key === 'battleLog.noTargetFallback') { attach(e); continue }
        push(newAction('battlecry', e, i, { source: { name: e.cardName, uid: e.src?.uid, side: e.side }, keyword: 'battlecry', important: true }))
        continue
      }
      case 'lastwish': {
        if (key === 'battleLog.lastwishChooseTarget') { attach(e); continue }
        push(newAction('lastwish', e, i, { source: { name: e.cardName, uid: e.src?.uid, side: e.side }, keyword: 'lastwish', important: true }))
        continue
      }
      case 'fxSource': {
        if (e.kw === 'trigger') { push(newAction('trigger', e, i, { source: { name: e.cardName, uid: e.src?.uid, side: e.side }, keyword: 'trigger', important: true })); continue }
        continue   // AoE markeris – be teksto, į detales nededam
      }
      case 'reactionTrigger': {
        const a = push(newAction('reaction', e, i, { source: { name: e.cardName, uid: e.src?.uid, side: e.side }, keyword: 'reaction', important: true }))
        if (e.tgt) targetFor(a, refOf(e))
        continue
      }
      case 'curse': {
        if (key.startsWith('battleLog.curseDrawn') || key === 'battleLog.curseForced') { push(newAction('curse', e, i, { source: { name: e.cardName, side: e.side }, keyword: 'curse', important: true })); continue }
        attach(e)
        // įmaišymas (cursePlant) – hit'as ant esamos kortelės
        if (cur && key === 'battleLog.cursePlant') targetFor(cur, { player: e.side === 'you' ? 'ai' : 'you' }).hits.push({ t: 'status', statusId: 'curse', label: e.cardName })
        continue
      }
      case 'damage': {
        if (!cur) { cur = push(newAction('other', e, i, { important: true })) ; cur.events.length = 0 }
        cur.events.push(e)
        const val = e.value ?? 0
        if (e.statusEvt === 'destroy' && e.statusId === 'shield') { targetFor(cur, refOf(e)).hits.push({ t: 'block', statusId: 'shield' }); pendingZmk = undefined; continue }
        if (key === 'battleLog.auraReduceDmg' || key === 'battleLog.auraDoublePlayerDmg' || key.startsWith('battleLog.overkill')) continue
        const tg = targetFor(cur, refOf(e))
        const hp = e.params?.hp, maxHp = e.params?.maxHp
        tg.hits.push({ t: 'dmg', value: val, zmk: pendingZmk, hpAfter: hp != null && maxHp != null ? `${hp}/${maxHp}` : undefined, left: e.params?.left != null ? Number(e.params.left) : undefined })
        pendingZmk = undefined
        cur.important = true
        continue
      }
      case 'heal': {
        if (!cur) { cur = push(newAction('other', e, i, { important: true })); cur.events.length = 0 }
        cur.events.push(e)
        if ((e.value ?? 0) > 0) { targetFor(cur, refOf(e)).hits.push({ t: 'heal', value: e.value }); cur.important = true }
        continue
      }
      case 'buff': {
        if (!cur) { cur = push(newAction('other', e, i, { important: true })); cur.events.length = 0 }
        cur.events.push(e)
        const tg = targetFor(cur, refOf(e))
        if (e.statusEvt) tg.hits.push({ t: 'status', statusId: e.statusId, statusEvt: e.statusEvt })
        else {
          const atk = e.params?.atk, hp = e.params?.hp
          if (atk != null) tg.hits.push({ t: 'buff', value: key.includes('lose') ? -Number(atk) : Number(atk), label: 'ATK' })
          if (hp != null) tg.hits.push({ t: 'buff', value: key.includes('lose') ? -Number(hp) : Number(hp), label: 'HP' })
          if (atk == null && hp == null && e.value != null) tg.hits.push({ t: 'buff', value: e.value })
        }
        cur.important = true
        continue
      }
      case 'status': {
        if (!cur) { cur = push(newAction('other', e, i, { important: true })); cur.events.length = 0 }
        cur.events.push(e)
        if (e.statusEvt && e.statusId) { targetFor(cur, refOf(e)).hits.push({ t: 'status', statusId: e.statusId, statusEvt: e.statusEvt }); cur.important = true }
        continue
      }
      case 'death': {
        if (!cur) { cur = push(newAction('other', e, i, { important: true })); cur.events.length = 0 }
        cur.events.push(e)
        // Paskutinio noro ŠALTINIO žūtis loguojama po noro efektų – žurnale ji priklauso
        // veiksmui, kuris jį nužudė (ankstesnei kortelei), ne noro kortelei.
        let home: LogAction = cur
        if (cur.kind === 'lastwish' && cur.source && (cur.source.uid ? cur.source.uid === e.src?.uid : cur.source.name === e.cardName)) {
          for (let j = out.length - 2; j >= 0; j--) { if (out[j].kind !== 'turn') { home = out[j]; break } }
        }
        targetFor(home, { name: e.cardName, uid: e.src?.uid, side: e.side }).hits.push({ t: 'death' })
        home.important = true
        continue
      }
      case 'returnHand': {
        if (cur) { cur.events.push(e); targetFor(cur, { name: e.cardName, uid: e.src?.uid, side: e.side }).hits.push({ t: 'return' }) }
        else attach(e)
        continue
      }
      case 'win': {
        push(newAction('other', e, i, { important: true }))
        continue
      }
      default: {
        // reactionSet, discardGold, coin, evolve, blocked, handBurn, fatigue, start…
        if (!key) { attach(e); continue }
        if (e.t === 'fatigue' || e.t === 'evolve' || e.t === 'coin' || e.t === 'start' || e.t === 'reactionSet' || e.t === 'discardGold') {
          push(newAction('other', e, i, { important: e.t === 'fatigue' || e.t === 'evolve' }))
        } else attach(e)
        continue
      }
    }
  }
  // abipusė ataka: gynėjas turi žalą IR puolėjas turi žalą
  for (const a of out) {
    if (a.kind === 'attack' && a.source) {
      const srcHit = a.targets.find((tg) => (a.source!.uid && tg.uid === a.source!.uid) || (!tg.uid && tg.name === a.source!.name))
      a.mutual = !!srcHit && srcHit.hits.some((h) => h.t === 'dmg' || h.t === 'block')
    }
  }
  return out
}

/** Paskutinės N kortelių (be ėjimo antraščių) – mobiliam strip'ui. */
export function lastActions(actions: LogAction[], n: number, filter: 'all' | 'important' = 'all'): LogAction[] {
  const res: LogAction[] = []
  for (let i = actions.length - 1; i >= 0 && res.length < n; i--) {
    const a = actions[i]
    if (a.kind === 'turn') continue
    if (filter === 'important' && !a.important) continue
    res.unshift(a)
  }
  return res
}
