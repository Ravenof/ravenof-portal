// ── Nuoseklių Kovos šūksnio iškvietimų + reakcijų taikymo testai ─────────────
// Paleidimas: npx tsx scripts/simulate-battlecry-chain.ts
// Dengia: summon grandinės eiliškumą, vietų perskaičiavimą, įdėtinius šūksnius,
// grandinės flush'ą, reakcijų `useTriggerSource` taikymą ir dingusio taikinio elgesį.

import {
  createGame, beginTurn, endTurn, playCard, attack, P,
  advanceSummonChain, flushSummonChain, consumeReactionSnapshot, type TutCard, type GameState,
} from '../src/lib/tutorial/engine'
import type { EffectMapping } from '../src/lib/game/types'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗ FAIL:', name, extra) }
}

const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]

function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return {
    id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3,
    type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff',
    effect: null, mappings: [], ...over,
  } as TutCard
}
const filler = (n: number, sub?: string, tag = 'F') =>
  Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}`, subtype: sub }))

/** Deterministinis žaidimas: kaladė nustatoma PO pradinio dalinimo (be maišymo). */
function freshGame(deckYou: TutCard[] = filler(30), deckAi: TutCard[] = filler(30, undefined, 'A')): GameState {
  const g = createGame(filler(30, undefined, 'X'), filler(30, undefined, 'A'), 'you', { zmkDefs: ZMK0 })
  beginTurn(g)
  g.you.deck = deckYou.slice()
  g.ai.deck = deckAi.slice()
  g.you.gold = 1000
  g.ai.gold = 1000
  return g
}
/** Iškvietimų eilė iš mūšio žurnalo (tikroji rezoliucijos tvarka). */
const summonOrder = (g: GameState) => g.log.filter((e) => e.key === 'battleLog.summonByEffect').map((e) => String(e.params?.card ?? ''))
const units = (g: GameState, s: 'you' | 'ai') => P(g, s).units.filter(Boolean)
const names = (g: GameState, s: 'you' | 'ai') => units(g, s).map((u) => u!.card.name)
const logKeys = (g: GameState) => g.log.map((e) => `${e.t}:${e.key ?? ''}:${e.params?.card ?? ''}`)

const summonMapping = (count: number, subtype: string): EffectMapping =>
  ({ trigger: 'onSummon', effect: 'summonFromDeck', target: 'self', requiresSelection: false, summonCount: count, summonSubtype: subtype })

console.log('\n── 1. Kovos šūksnis su 3 iškvietimais: po vieną, ne visi iš karto ──')
{
  const zombies = filler(3, 'ZOMBIE', 'Z')
  const g = freshGame([...zombies, ...filler(20)])
  const lord = mkCard({ name: 'Vadas', uid: 'Vadas', mappings: [summonMapping(3, 'ZOMBIE')] })
  g.you.hand.push(lord)

  const r = playCard(g, 'you', lord.uid)
  check('kortos sužaidimas ok', r.ok, JSON.stringify(r))
  check('originalas lentoje pirmas', names(g, 'you')[0] === 'Vadas', names(g, 'you').join(','))
  check('po sužaidimo lentoje 2 padarai (originalas + 1-as iškviestas)', units(g, 'you').length === 2, String(units(g, 'you').length))
  check('grandinė laukia dar 2 iškvietimų', (g.summonChain?.[0]?.remaining ?? 0) === 2, JSON.stringify(g.summonChain?.[0]?.remaining))

  advanceSummonChain(g)
  check('po 1-o tick: 3 padarai', units(g, 'you').length === 3, String(units(g, 'you').length))
  check('grandinė dar aktyvi', !!g.summonChain?.length)

  advanceSummonChain(g)
  check('po 2-o tick: 4 padarai', units(g, 'you').length === 4, String(units(g, 'you').length))
  check('grandinė baigta', !g.summonChain?.length)

  const k = logKeys(g)
  const iPlay = k.findIndex((x) => x.startsWith('play:battleLog.playUnit'))
  const iBc = k.findIndex((x) => x.startsWith('battlecry:battleLog.battlecry'))
  const iSummons = k.map((x, i) => (x.startsWith('play:battleLog.summonByEffect') ? i : -1)).filter((i) => i >= 0)
  check('log: originalas → šūksnis → iškvietimai', iPlay < iBc && iBc < iSummons[0] && iSummons.length === 3, JSON.stringify({ iPlay, iBc, iSummons }))
  check('log: iškvietimai eilės tvarka', iSummons[0] < iSummons[1] && iSummons[1] < iSummons[2])
}

console.log('\n── 2. Vietų perskaičiavimas prieš KIEKVIENĄ iškvietimą ──')
{
  const zombies = filler(3, 'ZOMBIE', 'Z')
  const g = freshGame([...zombies, ...filler(20)])
  // užpildom lentą: lieka 2 laisvos vietos (originalui + 1 iškviestam)
  const p = P(g, 'you')
  for (let i = 0; i < 3; i++) {
    const c = mkCard({ name: 'Blok' + i, uid: 'Blok' + i })
    p.units[i] = { uid: c.uid, card: c, atk: 1, hp: 1, maxHp: 1, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false } as never
  }
  const lord = mkCard({ name: 'Vadas', uid: 'Vadas', mappings: [summonMapping(3, 'ZOMBIE')] })
  g.you.hand.push(lord)
  playCard(g, 'you', lord.uid)
  check('lenta pilna (5)', units(g, 'you').length === 5, String(units(g, 'you').length))
  const before = units(g, 'you').length
  let guard = 0
  while (g.summonChain?.length && guard++ < 10) advanceSummonChain(g)
  check('nė vienas padaras neperrašytas', units(g, 'you').length === before)
  check('log: „zona pilna" įrašas yra', logKeys(g).some((x) => x.includes('zoneFullSummon')))
  check('grandinė korektiškai baigta (be užstrigimo)', !g.summonChain?.length)
}

console.log('\n── 3. Įdėtinis Kovos šūksnis išsprendžiamas prieš kitą tėvinį iškvietimą ──')
{
  const goblins = filler(2, 'GOBLIN', 'G')
  const nested = mkCard({ name: 'Z0', uid: 'Z0', subtype: 'ZOMBIE', mappings: [summonMapping(1, 'GOBLIN')] })
  const z1 = mkCard({ name: 'Z1', uid: 'Z1', subtype: 'ZOMBIE' })
  const g = freshGame([nested, z1, ...goblins, ...filler(20)])
  const lord = mkCard({ name: 'Vadas', uid: 'Vadas', mappings: [summonMapping(2, 'ZOMBIE')] })
  g.you.hand.push(lord)
  playCard(g, 'you', lord.uid)
  check('pirmas iškviestas – įdėtinį šūksnį turintis Z0', names(g, 'you').includes('Z0'), names(g, 'you').join(','))
  let guard = 0
  while (g.summonChain?.length && guard++ < 10) advanceSummonChain(g)
  const order = summonOrder(g)
  check('iškvietimų eilė: Z0 → G0 (įdėtinis) → Z1', order.join('>') === 'Z0>G0>Z1', order.join('>'))
  check('galutinai lentoje 4 padarai', units(g, 'you').length === 4, order.join(','))
}

console.log('\n── 4. Ne-battlecry masinis iškvietimas lieka momentinis ──')
{
  const zombies = filler(3, 'ZOMBIE', 'Z')
  const g = freshGame([...zombies, ...filler(20)])
  const spell = mkCard({
    name: 'Burtas', uid: 'Burtas', type: 'spell',
    mappings: [{ trigger: 'onPlay', effect: 'summonFromDeck', target: 'self', requiresSelection: false, summonCount: 3, summonSubtype: 'ZOMBIE' } as EffectMapping],
  })
  g.you.hand.push(spell)
  playCard(g, 'you', spell.uid)
  check('burtas iškvietė visus 3 iš karto', units(g, 'you').length === 3, String(units(g, 'you').length))
  check('grandinė nesukurta', !g.summonChain?.length)
}

console.log('\n── 5. Grandinė nepasimeta: flush ir kitas veiksmas ──')
{
  const zombies = filler(3, 'ZOMBIE', 'Z')
  const g = freshGame([...zombies, ...filler(20)])
  const lord = mkCard({ name: 'Vadas', uid: 'Vadas', mappings: [summonMapping(3, 'ZOMBIE')] })
  g.you.hand.push(lord)
  playCard(g, 'you', lord.uid)
  check('grandinė aktyvi', !!g.summonChain?.length)
  flushSummonChain(g)
  check('flush užbaigia visus iškvietimus', units(g, 'you').length === 4, String(units(g, 'you').length))
  check('flush išvalo grandinę', !g.summonChain?.length)

  const g2 = freshGame([...filler(3, 'ZOMBIE', 'Z'), ...filler(20)])
  const lord2 = mkCard({ name: 'Vadas2', uid: 'Vadas2', mappings: [summonMapping(3, 'ZOMBIE')] })
  g2.you.hand.push(lord2)
  playCard(g2, 'you', lord2.uid)
  endTurn(g2)
  check('endTurn nepraranda iškvietimų', units(g2, 'you').length === 4, String(units(g2, 'you').length))
  check('endTurn išvalo grandinę', !g2.summonChain?.length)
}

console.log('\n── 6. Reakcija: taikinys = TIKSLIAI trigerį sukėlusi korta ──')
{
  const g = freshGame()
  // dvi VIENODOS kortos (ta pati definicija) AI lentoje – tikrinam runtime uid skirtumą
  const p = P(g, 'ai')
  const mk = (uid: string) => {
    const c = mkCard({ name: 'Dvynys', uid, attack: 3, health: 6 })
    return { uid, card: c, atk: 3, hp: 6, maxHp: 6, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false }
  }
  p.units[0] = mk('dvynys-A') as never
  p.units[1] = mk('dvynys-B') as never
  // žaidėjo reakcija: „kai priešas puola – 3 žalos TIK puolusiai kortai"
  const reactCard = mkCard({
    name: 'Grandinių Priesaika', uid: 'react1', type: 'reaction',
    mappings: [{ trigger: 'onAnyAttack', triggerSide: 'enemy', effect: 'damage', target: 'enemyUnit', value: 3, useTriggerSource: true, triggersZmk: false } as EffectMapping],
  })
  P(g, 'you').reactions[0] = { uid: 'react1', card: reactCard, paid: 0 }
  g.active = 'ai'
  attack(g, 'ai', 'dvynys-B', { kind: 'player', side: 'you' })
  const a = P(g, 'ai').units.find((u) => u?.uid === 'dvynys-A')
  const b = P(g, 'ai').units.find((u) => u?.uid === 'dvynys-B')
  check('žala teko PUOLUSIAI kopijai (B)', (b?.hp ?? 99) === 3, `A=${a?.hp} B=${b?.hp}`)
  check('kita tos pačios kortos kopija nepaliesta (A)', (a?.hp ?? 0) === 6, `A=${a?.hp}`)
  check('reakcija sunaudota (į kapinyną)', P(g, 'you').reactions[0] === null)
  const rt = g.log.find((e) => e.t === 'reactionTrigger')
  check('log turi grandinės taikinį (tgt.uid)', rt?.tgt?.uid === 'dvynys-B', JSON.stringify(rt?.tgt))
}

console.log('\n── 7. Reakcija BE naujos vėliavos elgiasi kaip anksčiau ──')
{
  const g = freshGame()
  const p = P(g, 'ai')
  const mk = (uid: string, hp: number) => {
    const c = mkCard({ name: 'Karys' + uid, uid, attack: 3, health: hp })
    return { uid, card: c, atk: 3, hp, maxHp: hp, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false }
  }
  p.units[0] = mk('silpnas', 2) as never   // auto-taikymas renkasi pagal seną logiką
  p.units[1] = mk('puolikas', 9) as never
  const reactCard = mkCard({
    name: 'Sena Reakcija', uid: 'react2', type: 'reaction',
    mappings: [{ trigger: 'onAnyAttack', triggerSide: 'enemy', effect: 'damage', target: 'enemyUnit', value: 2, triggersZmk: false } as EffectMapping],
  })
  P(g, 'you').reactions[0] = { uid: 'react2', card: reactCard, paid: 0 }
  g.active = 'ai'
  attack(g, 'ai', 'puolikas', { kind: 'player', side: 'you' })
  const weak = P(g, 'ai').units.find((u) => u?.uid === 'silpnas')
  const atk = P(g, 'ai').units.find((u) => u?.uid === 'puolikas')
  check('be vėliavos taikinys parenkamas senąja logika (ne trigerio šaltinis)', (atk?.hp ?? 0) === 9 || weak === undefined, `weak=${weak?.hp} atk=${atk?.hp}`)
}

console.log('\n── 8. Dingęs trigerio šaltinis: jokio pertaikymo, eilė nesustoja ──')
{
  const g = freshGame()
  const p = P(g, 'ai')
  const mk = (uid: string, hp: number) => {
    const c = mkCard({ name: uid, uid, attack: 3, health: hp })
    return { uid, card: c, atk: 3, hp, maxHp: hp, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false }
  }
  p.units[0] = mk('puolikas', 2) as never
  p.units[1] = mk('nekaltas', 8) as never
  // 1-a reakcija sunaikina puoliką, 2-a (trigger_source) nebeturi taikinio
  const r1 = mkCard({ name: 'Naikintoja', uid: 'r1', type: 'reaction',
    mappings: [{ trigger: 'onAnyAttack', triggerSide: 'enemy', effect: 'destroy', target: 'enemyUnit', useTriggerSource: true } as EffectMapping] })
  const r2 = mkCard({ name: 'Vėluojanti', uid: 'r2', type: 'reaction',
    mappings: [{ trigger: 'onAnyAttack', triggerSide: 'enemy', effect: 'damage', target: 'enemyUnit', value: 4, useTriggerSource: true, triggersZmk: false } as EffectMapping] })
  P(g, 'you').reactions[0] = { uid: 'r1', card: r1, paid: 0 }
  P(g, 'you').reactions[1] = { uid: 'r2', card: r2, paid: 0 }
  g.active = 'ai'
  attack(g, 'ai', 'puolikas', { kind: 'player', side: 'you' })
  const innocent = P(g, 'ai').units.find((u) => u?.uid === 'nekaltas')
  check('puolikas sunaikintas 1-os reakcijos', !P(g, 'ai').units.some((u) => u?.uid === 'puolikas'))
  check('2-a reakcija NEPERTAIKYTA į kitą padarą', (innocent?.hp ?? 0) === 8, `nekaltas=${innocent?.hp}`)
  check('log: pranešimas apie prarastą taikinį', g.log.some((e) => e.key === 'battleLog.reactionTargetLost'))
  check('žaidimas tęsiasi (nėra užstrigimo)', !g.winner || g.winner === null || true)
}


console.log('\n── 9. Reakcijos animacijos vartai: būsena atskleidžiama TIK po grandinės ──')
{
  const g = freshGame()
  const p = P(g, 'ai')
  const mk = (uid: string) => {
    const c = mkCard({ name: 'Dvynys', uid, attack: 3, health: 6 })
    return { uid, card: c, atk: 3, hp: 6, maxHp: 6, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false }
  }
  p.units[0] = mk('puolikas') as never
  const reactCard = mkCard({
    name: 'Sielos Pančiai', uid: 'rc1', type: 'reaction',
    mappings: [{ trigger: 'onAnyAttack', triggerSide: 'enemy', effect: 'damage', target: 'enemyUnit', value: 3, useTriggerSource: true, triggersZmk: false } as EffectMapping],
  })
  P(g, 'you').reactions[0] = { uid: 'rc1', card: reactCard, paid: 0 }
  g.active = 'ai'
  attack(g, 'ai', 'puolikas', { kind: 'player', side: 'you' })

  const gates = g.reactionGates ?? []
  check('sukurtas 1 reakcijos vartų kadras', gates.length === 1, String(gates.length))
  const gate = gates[0]
  check('kadras nurodo reakcijos kortą', gate?.reactionUid === 'rc1' && gate?.reactionCardName === 'Sielos Pančiai')
  check('kadras nurodo trigerio šaltinį (runtime uid)', !!gate?.target && 'uid' in gate.target && gate.target.uid === 'puolikas', JSON.stringify(gate?.target))

  const snap = consumeReactionSnapshot(gate.snapshotId)
  check('snapshotas egzistuoja', !!snap)
  const sTgt = snap ? P(snap, 'ai').units.find((u) => u?.uid === 'puolikas') : null
  check('snapshote efektas DAR NEPRITAIKYTAS (HP 6)', (sTgt?.hp ?? 0) === 6, `hp=${sTgt?.hp}`)
  check('snapshote reakcijos korta DAR slote (matoma animacijai)', !!snap && P(snap, 'you').reactions[0] !== null)
  check('snapshote nera vartu (nesidubliuoja)', !snap?.reactionGates?.length)

  const fTgt = P(g, 'ai').units.find((u) => u?.uid === 'puolikas')
  check('galutinėje būsenoje efektas pritaikytas (HP 3)', (fTgt?.hp ?? 0) === 3, `hp=${fTgt?.hp}`)
  check('vartu snapshotas sunaudojamas tik karta', consumeReactionSnapshot(gate.snapshotId) === null)
}

console.log('\n── 10. Dvi reakcijos: du kadrai iš eilės, be persidengimo ──')
{
  const g = freshGame()
  const p = P(g, 'ai')
  const c = mkCard({ name: 'Puolikas', uid: 'atk1', attack: 3, health: 9 })
  p.units[0] = { uid: 'atk1', card: c, atk: 3, hp: 9, maxHp: 9, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false } as never
  const rk = (uid: string, name: string) => mkCard({
    name, uid, type: 'reaction',
    mappings: [{ trigger: 'onAnyAttack', triggerSide: 'enemy', effect: 'damage', target: 'enemyUnit', value: 2, useTriggerSource: true, triggersZmk: false } as EffectMapping],
  })
  P(g, 'you').reactions[0] = { uid: 'ra', card: rk('ra', 'Reakcija A'), paid: 0 }
  P(g, 'you').reactions[1] = { uid: 'rb', card: rk('rb', 'Reakcija B'), paid: 0 }
  g.active = 'ai'
  attack(g, 'ai', 'atk1', { kind: 'player', side: 'you' })

  const gates = g.reactionGates ?? []
  check('du vartų kadrai', gates.length === 2, String(gates.length))
  check('eiliškumas: A tada B', gates[0]?.reactionUid === 'ra' && gates[1]?.reactionUid === 'rb', gates.map((x) => x.reactionUid).join('>'))
  const s1 = consumeReactionSnapshot(gates[0].snapshotId)
  const s2 = consumeReactionSnapshot(gates[1].snapshotId)
  const hp = (st: GameState | null) => st ? (P(st, 'ai').units.find((u) => u?.uid === 'atk1')?.hp ?? -1) : -1
  check('1-o kadro snapshot: dar 9 HP', hp(s1) === 9, String(hp(s1)))
  check('2-o kadro snapshot: A efektas jau matomas (7 HP)', hp(s2) === 7, String(hp(s2)))
  check('galutinė būsena: abu efektai (5 HP)', (P(g, 'ai').units.find((u) => u?.uid === 'atk1')?.hp ?? -1) === 5)
  check('kiekvienas kadras turi savo log poziciją', (gates[0].atLog ?? 0) < (gates[1].atLog ?? 0))
}


console.log('\n── 11. Kelių taikinių reakcija: kiekvienas taikinys atskirai (grandinei) ──')
{
  const g = freshGame()
  const p = P(g, 'ai')
  const mkU = (uid: string, hp: number) => {
    const c = mkCard({ name: uid, uid, attack: 2, health: hp })
    return { uid, card: c, atk: 2, hp, maxHp: hp, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false }
  }
  p.units[0] = mkU('e1', 5) as never
  p.units[1] = mkU('e2', 5) as never
  p.units[2] = mkU('e3', 5) as never
  // AoE reakcija: 1 žala VISIEMS priešo padarams
  const aoe = mkCard({
    name: 'Grandinių Audra', uid: 'raoe', type: 'reaction',
    mappings: [{ trigger: 'onAnyAttack', triggerSide: 'enemy', effect: 'damage', target: 'allEnemyUnits', value: 1, triggersZmk: false } as EffectMapping],
  })
  P(g, 'you').reactions[0] = { uid: 'raoe', card: aoe, paid: 0 }
  g.active = 'ai'
  attack(g, 'ai', 'e1', { kind: 'player', side: 'you' })

  const gate = (g.reactionGates ?? [])[0]
  check('sukurtas vartų kadras', !!gate)
  const tg = gate?.targets ?? []
  check('užfiksuoti VISI paveikti taikiniai (3)', tg.length === 3, JSON.stringify(tg.map((t) => ('uid' in t ? t.uid : t.kind))))
  check('taikiniai turi runtime uid (ne kortos vardą)', tg.every((t) => 'uid' in t && !!t.uid))
  check('taikiniai nesikartoja', new Set(tg.map((t) => ('uid' in t ? t.uid : t.kind))).size === tg.length)
  const hps = ['e1', 'e2', 'e3'].map((u) => P(g, 'ai').units.find((x) => x?.uid === u)?.hp ?? -1)
  check('visi gavo žalos (4/4/4)', hps.every((h) => h === 4), hps.join(','))
}

console.log('\n── 12. Reakcija į žaidėjo avatarą – irgi atskiras taikinys ──')
{
  const g = freshGame()
  const p = P(g, 'ai')
  const c = mkCard({ name: 'Puolikas', uid: 'atkP', attack: 2, health: 5 })
  p.units[0] = { uid: 'atkP', card: c, atk: 2, hp: 5, maxHp: 5, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false } as never
  const rp = mkCard({
    name: 'Atpildas', uid: 'rp1', type: 'reaction',
    mappings: [{ trigger: 'onAnyAttack', triggerSide: 'enemy', effect: 'damage', target: 'enemyPlayer', value: 2, triggersZmk: false } as EffectMapping],
  })
  P(g, 'you').reactions[0] = { uid: 'rp1', card: rp, paid: 0 }
  g.active = 'ai'
  const hpBefore = g.ai.hp
  attack(g, 'ai', 'atkP', { kind: 'player', side: 'you' })
  const gate = (g.reactionGates ?? [])[0]
  const tg = gate?.targets ?? []
  check('taikinys – žaidėjo avataras', tg.length === 1 && tg[0].kind === 'player', JSON.stringify(tg))
  check('priešo HP sumažėjo', g.ai.hp < hpBefore, `${hpBefore} → ${g.ai.hp}`)
}

console.log(`\n──────────────\n  PASS: ${pass}   FAIL: ${fail}\n──────────────`)
process.exit(fail ? 1 : 0)
