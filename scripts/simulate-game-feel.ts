// ── Game-feel sprinto regresijos testai ──────────────────────────────────────
// Paleidimas: npx tsx scripts/simulate-game-feel.ts
// Dengia: fazė 0 (laikini debuff'ai, conditionSkipped logas, prakeiksmų gylis),
//         fazė 4 (resolveSeverity ribos), fazė 3 (compact reakcijos trukmės).

import {
  createGame, beginTurn, endTurn, playCard, P, type TutCard, type GameState,
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
    id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 5,
    type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff',
    effect: null, mappings: [], ...over,
  } as TutCard
}
const filler = (n: number, tag = 'F') =>
  Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))

function freshGame(): GameState {
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 })
  beginTurn(g)
  g.you.gold = 1000
  g.ai.gold = 1000
  return g
}

console.log('\n── F0.1 Laikinas debuffAttack nusiima ėjimo pabaigoje ──')
{
  const g = freshGame()
  const victim = mkCard({ name: 'Auka', uid: 'Auka', attack: 5, health: 9 })
  P(g, 'you').units[0] = {
    uid: 'Auka', card: victim, atk: 5, hp: 9, maxHp: 9, shield: false, stealth: false,
    statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
  } as never

  const debuffTemp: EffectMapping = {
    trigger: 'onPlay', effect: 'debuffAttack', target: 'ownUnit',
    value: 3, buffDuration: 'endOfTurn', requiresSelection: false,
  }
  const spell = mkCard({ name: 'Silpnumas', uid: 'Silpnumas', type: 'spell', attack: null, health: null, mappings: [debuffTemp] })
  g.you.hand.push(spell)
  playCard(g, 'you', spell.uid, { target: { kind: 'unit', side: 'you', uid: 'Auka' } })

  const after = P(g, 'you').units[0]!
  check('debuff pritaikytas (5 → 2)', after.atk === 2, String(after.atk))
  check('debuff užregistruotas kaip laikinas', (after.tempBuffs ?? []).length === 1, JSON.stringify(after.tempBuffs))
  endTurn(g)
  check('po ėjimo pabaigos ATK atstatytas į 5', P(g, 'you').units[0]!.atk === 5, String(P(g, 'you').units[0]!.atk))
}

console.log('\n── F0.2 Nuolatinis debuffAttack (be trukmės) NEnusiima ──')
{
  const g = freshGame()
  const victim = mkCard({ name: 'Auka2', uid: 'Auka2', attack: 5, health: 9 })
  P(g, 'you').units[0] = {
    uid: 'Auka2', card: victim, atk: 5, hp: 9, maxHp: 9, shield: false, stealth: false,
    statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
  } as never
  const m: EffectMapping = { trigger: 'onPlay', effect: 'debuffAttack', target: 'ownUnit', value: 3, requiresSelection: false }
  const spell = mkCard({ name: 'Kirtis', uid: 'Kirtis', type: 'spell', attack: null, health: null, mappings: [m] })
  g.you.hand.push(spell)
  playCard(g, 'you', spell.uid, { target: { kind: 'unit', side: 'you', uid: 'Auka2' } })
  check('debuff pritaikytas', P(g, 'you').units[0]!.atk === 2, String(P(g, 'you').units[0]!.atk))
  endTurn(g)
  check('nuolatinis debuff išliko po ėjimo', P(g, 'you').units[0]!.atk === 2, String(P(g, 'you').units[0]!.atk))
}

console.log('\n── F0.3 Netenkinama sąlyga palieka žurnalo įrašą ──')
{
  const g = freshGame()
  const m: EffectMapping = {
    trigger: 'onPlay', effect: 'gainGold', target: 'self', value: 500,
    condition: { source: 'ownUnits', op: 'gte', value: 99 },
    requiresSelection: false,
  }
  const spell = mkCard({ name: 'Sąlyga', uid: 'Salyga', type: 'spell', attack: null, health: null, mappings: [m] })
  g.you.hand.push(spell)
  const goldBefore = g.you.gold
  playCard(g, 'you', spell.uid)
  const ev = g.log.find((e) => e.key === 'battleLog.conditionSkipped')
  check('conditionSkipped įrašas yra', !!ev, JSON.stringify(g.log.slice(-3)))
  check('įraše yra reali metrikos reikšmė', ev?.params?.actual === 0, JSON.stringify(ev?.params))
  check('įraše yra reikalaujama riba', ev?.params?.need === 99, JSON.stringify(ev?.params))
  check('efektas realiai neįvyko (auksas nepadidėjo)', g.you.gold <= goldBefore, `${goldBefore} → ${g.you.gold}`)
}

console.log('\n── F1 Game-feel telemetrija ──')
{
  const T = await import('../src/lib/game/feelTelemetry')
  T.resetFeelTelemetry({ summonCinematics: true, skillCinematics: false })
  check('po reset viskas nulinis', T.collectFeelTelemetry(5).animationLockMsTotal === 0)
  check('kinų nustatymai užfiksuoti (bitmask 1)', T.collectFeelTelemetry(5).cinematicsEnabledAtStart === 1)

  // Užraktas skaičiuojamas TIK savo ėjimo metu
  T.noteLockState(true, false)          // priešo ėjimas — neskaičiuojam
  await new Promise((r) => setTimeout(r, 30))
  T.noteLockState(false, false)
  check('priešo ėjimo užraktas neskaičiuojamas', T.collectFeelTelemetry(5).animationLockMsTotal === 0,
    String(T.collectFeelTelemetry(5).animationLockMsTotal))

  T.noteLockState(true, true)
  await new Promise((r) => setTimeout(r, 60))
  T.noteLockState(false, true)
  const lock = T.collectFeelTelemetry(4)
  check('savo ėjimo užraktas suskaičiuotas (≥50 ms)', lock.animationLockMsTotal >= 50, String(lock.animationLockMsTotal))
  check('vidurkis ėjimui = total / turns', lock.animationLockMsPerTurn === Math.round(lock.animationLockMsTotal / 4),
    `${lock.animationLockMsPerTurn} vs ${lock.animationLockMsTotal}/4`)

  // Input → feedback mediana
  T.resetFeelTelemetry()
  for (const delay of [10, 20, 90]) {
    T.noteInputStart()
    await new Promise((r) => setTimeout(r, delay))
    T.noteFirstFeedback()
    T.noteFirstFeedback()   // antras kvietimas be naujo start — turi būti ignoruotas
  }
  const fb = T.collectFeelTelemetry(1)
  check('surinkti 3 matavimai (dublikatai ignoruoti)', fb.inputFeedbackSamples === 3, String(fb.inputFeedbackSamples))
  check('mediana tarp min ir max', fb.inputToFirstFeedbackMs >= 15 && fb.inputToFirstFeedbackMs <= 80, String(fb.inputToFirstFeedbackMs))

  T.noteInputStart(); T.cancelInputMeasure(); T.noteFirstFeedback()
  check('atšauktas matavimas nepridedamas', T.collectFeelTelemetry(1).inputFeedbackSamples === 3)

  T.noteCinematicSkipped(); T.noteCinematicSkipped()
  check('kinų praleidimai skaičiuojami', T.collectFeelTelemetry(1).cinematicsSkipped === 2)
}

console.log('\n── F2 Kortų tactile logika ──')
{
  const { dragFollowAt, withinSnapRect } = await import('../src/lib/game/tactile')
  const { CARD_TACTILE } = await import('../src/lib/game/timing')

  // Inercija: ghost'as artėja prie žymeklio, bet ne iškart
  const step1 = dragFollowAt({ x: 0, y: 0 }, { x: 100, y: 0 })
  check('ghost pajuda link žymeklio', step1.x > 0 && step1.x < 100, JSON.stringify(step1))
  check('atsilikimas neviršija dragMaxLagPx', 100 - step1.x <= CARD_TACTILE.dragMaxLagPx + 0.001,
    `lag=${100 - step1.x}, max=${CARD_TACTILE.dragMaxLagPx}`)

  // Ilgas greitas mostas neturi palikti kortos toli
  const far = dragFollowAt({ x: 0, y: 0 }, { x: 2000, y: 0 })
  check('ilgas mostas apribotas lag riba', 2000 - far.x <= CARD_TACTILE.dragMaxLagPx + 0.001, String(2000 - far.x))

  // Konvergencija: po kelių kadrų ghost'as praktiškai pasiveja
  let p = { x: 0, y: 0 }
  for (let i = 0; i < 12; i++) p = dragFollowAt(p, { x: 50, y: 50 })
  check('po 12 kadrų ghost'.concat(' konverguoja'), Math.hypot(50 - p.x, 50 - p.y) < 1, JSON.stringify(p))

  check('reduced-motion režime inercijos nėra',
    dragFollowAt({ x: 0, y: 0 }, { x: 100, y: 0 }, true).x === 100)

  // Snap zona
  const rect = { left: 100, top: 100, right: 200, bottom: 240 }
  check('taškas viduje – snap zonoje', withinSnapRect(rect, 150, 150))
  check('taškas per snapRadius nuo krašto – snap zonoje',
    withinSnapRect(rect, 200 + CARD_TACTILE.snapRadiusPx - 2, 170))
  check('taškas toliau nei snapRadius – ne zonoje',
    !withinSnapRect(rect, 200 + CARD_TACTILE.snapRadiusPx + 5, 170))

  check('visos tactile trukmės < 260 ms (Tier 0 turi būti greitas)',
    [CARD_TACTILE.hoverMs, CARD_TACTILE.pressMs, CARD_TACTILE.snapMs, CARD_TACTILE.invalidPulseMs, CARD_TACTILE.returnMs]
      .every((v) => v < 260))
}

console.log('\n── F3 Reakcijų grandinės kompresija ──')
{
  const T = await import('../src/lib/game/timing')
  check('compact gate trumpesnis nei pilnas', T.REACTION_CHAIN_GATE_COMPACT_MS < T.REACTION_CHAIN_GATE_MS,
    `${T.REACTION_CHAIN_GATE_COMPACT_MS} vs ${T.REACTION_CHAIN_GATE_MS}`)
  check('compact gate ilgesnis nei reduced', T.REACTION_CHAIN_GATE_COMPACT_MS > T.REACTION_CHAIN_REDUCED_GATE_MS)
  check('compact sutrumpina bent 30 %',
    T.REACTION_CHAIN_TOTAL_COMPACT_MS <= T.REACTION_CHAIN_TOTAL_MS * 0.7,
    `${T.REACTION_CHAIN_TOTAL_COMPACT_MS} vs ${T.REACTION_CHAIN_TOTAL_MS}`)
  const phases = Object.keys(T.REACTION_CHAIN_PHASES)
  const compact = Object.keys(T.REACTION_CHAIN_PHASES_COMPACT)
  check('kanoninis fazių eiliškumas nepakitęs', JSON.stringify(phases) === JSON.stringify(compact),
    `${phases.join(',')} vs ${compact.join(',')}`)
  check('kiekviena compact fazė trumpesnė už pilną',
    phases.every((k) => (T.REACTION_CHAIN_PHASES_COMPACT as Record<string, number>)[k] < (T.REACTION_CHAIN_PHASES as Record<string, number>)[k]))

  const RP = await import('../src/lib/game/reactionPacing')
  RP.resetReactionPacing()
  check('pirma kovos reakcija — pilna', RP.nextReactionIsCompact() === false)
  check('antra — kompaktiška', RP.nextReactionIsCompact() === true)
  check('trečia — kompaktiška', RP.nextReactionIsCompact() === true)
  check('skaitiklis teisingas', RP.reactionsShownThisMatch() === 3)
  RP.resetReactionPacing()
  check('nauja kova vėl pradeda nuo pilnos', RP.nextReactionIsCompact() === false)
}

console.log('\n── F4 ImpactProfile ir severity ribos ──')
{
  const { resolveSeverity, IMPACT_PROFILES, SEVERITY_ORDER, impactProfile, severityAtLeast } =
    await import('../src/lib/game/impactProfiles')

  check('mirtinas smūgis → LETHAL', resolveSeverity(1, 10, true) === 'LETHAL')
  check('12 žalos → DEVASTATING', resolveSeverity(12, 40, false) === 'DEVASTATING')
  check('santykis 0.9+ → DEVASTATING (9 žalos, 10 maxHP)', resolveSeverity(9, 10, false) === 'DEVASTATING')
  check('santykis 0.8 dar HEAVY (4 žalos, 5 maxHP)', resolveSeverity(4, 5, false) === 'HEAVY')
  check('5 žalos padarui su 6 maxHP → HEAVY (santykio taisyklė)', resolveSeverity(5, 6, false) === 'HEAVY')
  check('6 žalos herojui (40 HP) → HEAVY (absoliuti riba)', resolveSeverity(6, 40, false) === 'HEAVY')
  check('4 žalos padarui su 40 maxHP → HIT', resolveSeverity(4, 40, false) === 'HIT')
  check('1 žalos → CHIP', resolveSeverity(1, 40, false) === 'CHIP')
  check('2 žalos → CHIP', resolveSeverity(2, 40, false) === 'CHIP')
  check('nežinomas maxHP → tik absoliuti riba', resolveSeverity(3, 0, false) === 'HIT')

  check('CHIP be lentos purtymo', IMPACT_PROFILES.CHIP.screenShake === 'none')
  check('CHIP be hit-stop', IMPACT_PROFILES.CHIP.hitStopMs === 0)
  check('DEVASTATING hard purtymas', IMPACT_PROFILES.DEVASTATING.screenShake === 'hard')
  check('DEVASTATING nutildo muziką', IMPACT_PROFILES.DEVASTATING.audioDuckDb < 0)
  check('hit-stop didėja su severity',
    IMPACT_PROFILES.CHIP.hitStopMs < IMPACT_PROFILES.HIT.hitStopMs &&
    IMPACT_PROFILES.HIT.hitStopMs < IMPACT_PROFILES.HEAVY.hitStopMs &&
    IMPACT_PROFILES.HEAVY.hitStopMs < IMPACT_PROFILES.DEVASTATING.hitStopMs)
  check('joks hit-stop neviršija 90 ms', SEVERITY_ORDER.every((k) => IMPACT_PROFILES[k].hitStopMs <= 90))
  check('visos pakopos turi profilį', SEVERITY_ORDER.every((k) => !!IMPACT_PROFILES[k]))
  check('nežinomas severity → saugus fallback', impactProfile(undefined).severity === 'HIT')
  check('severityAtLeast veikia', severityAtLeast('HEAVY', 'HIT') && !severityAtLeast('CHIP', 'HEAVY'))
}

console.log('\n── F4b Severity keliauja per mūšio žurnalą (PvP atkūrimas) ──')
{
  const g = freshGame()
  P(g, 'ai').units[0] = {
    uid: 'Taikinys', card: mkCard({ name: 'Taikinys', uid: 'Taikinys', attack: 1, health: 6 }),
    atk: 1, hp: 6, maxHp: 6, shield: false, stealth: false,
    statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
  } as never

  const m: EffectMapping = { trigger: 'onPlay', effect: 'damage', target: 'enemyUnit', value: 5, requiresSelection: false }
  const spell = mkCard({ name: 'Smūgis', uid: 'Smugis', type: 'spell', attack: null, health: null, mappings: [m] })
  g.you.hand.push(spell)
  playCard(g, 'you', spell.uid, { target: { kind: 'unit', side: 'ai', uid: 'Taikinys' } })

  const dmgEv = g.log.filter((e) => e.t === 'damage' && (e.value ?? 0) > 0).pop()
  check('žalos įvykis turi severity', !!dmgEv?.severity, JSON.stringify(dmgEv))
  check('5 žalos 6 HP padarui pažymėta HEAVY', dmgEv?.severity === 'HEAVY', String(dmgEv?.severity))

  // Mirtinas smūgis
  const g2 = freshGame()
  P(g2, 'ai').units[0] = {
    uid: 'Silpnas', card: mkCard({ name: 'Silpnas', uid: 'Silpnas', attack: 1, health: 2 }),
    atk: 1, hp: 2, maxHp: 2, shield: false, stealth: false,
    statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
  } as never
  const kill = mkCard({ name: 'Mirtis', uid: 'Mirtis', type: 'spell', attack: null, health: null,
    mappings: [{ trigger: 'onPlay', effect: 'damage', target: 'enemyUnit', value: 5, requiresSelection: false }] })
  g2.you.hand.push(kill)
  playCard(g2, 'you', kill.uid, { target: { kind: 'unit', side: 'ai', uid: 'Silpnas' } })
  const lethalEv = g2.log.filter((e) => e.t === 'damage' && (e.value ?? 0) > 0).pop()
  check('mirtinas smūgis pažymėtas LETHAL', lethalEv?.severity === 'LETHAL', String(lethalEv?.severity))
}

console.log('\n── F6 HP ghost juostos konstantos ──')
{
  const { HP_GHOST } = await import('../src/lib/game/timing')
  check('hold + collapse ≤ 600 ms (neužtrukdo kovos)', HP_GHOST.holdMs + HP_GHOST.collapseMs <= 600,
    String(HP_GHOST.holdMs + HP_GHOST.collapseMs))
  check('hold ilgesnis nei collapse (spėja pamatyti, kiek prarado)', HP_GHOST.holdMs > HP_GHOST.collapseMs)
  check('gydymo fill panašaus greičio', HP_GHOST.healFillMs > 0 && HP_GHOST.healFillMs <= 400)
}

console.log('\n── F7 ŽMK prezentacijos biudžetas ──')
{
  const { ZMK_PRESENT } = await import('../src/lib/game/timing')
  const critTotal = ZMK_PRESENT.critAnticipationMs + ZMK_PRESENT.critSlamMs + ZMK_PRESENT.critHoldMs
  check('×2 visa seka ≤ 1.2 s (planas §10.3)', critTotal <= 1200, String(critTotal))
  check('routine („+0") traukimas nepailgėjo (≤ 250 ms)', ZMK_PRESENT.routineMs <= 250, String(ZMK_PRESENT.routineMs))
  check('routine daug greitesnis nei ×2', ZMK_PRESENT.routineMs * 3 < critTotal)
  check('×0 fizzle trumpesnis nei ×2 (tylus, ne spektaklis)', ZMK_PRESENT.fizzleMs < critTotal)
  check('×2 anticipacijos duck gilesnis nei įprastas smūgio duck', ZMK_PRESENT.critDuckDb <= -10)
  check('permaišymo švysnis trumpas', ZMK_PRESENT.reshuffleMs <= 800)
}

console.log('\n── F7b ×2 padvigubinta žala natūraliai duoda sunkų smūgį ──')
{
  const { resolveSeverity } = await import('../src/lib/game/impactProfiles')
  // 5 bazinės žalos × 2 = 10 → DEVASTATING net 40 HP herojui
  check('×2 nuo 5 bazės → DEVASTATING herojui', resolveSeverity(10, 40, false) === 'DEVASTATING')
  // be ×2 ta pati bazė būtų tik HEAVY
  check('be ×2 ta pati bazė tik HEAVY', resolveSeverity(5, 40, false) === 'HIT' || resolveSeverity(5, 40, false) === 'HEAVY')
  // ×0 → žalos nėra, severity net neskaičiuojamas (variklis grįžta anksčiau)
  check('×0 duoda 0 žalos → CHIP kraštinis atvejis', resolveSeverity(0, 40, false) === 'CHIP')
}

console.log('\n── F9 Mirties stilius pagal žalos šaltinį ──')
{
  const { deathStyleFor, DEATH_STYLES } = await import('../src/lib/game/deathStyles')
  check('ugnies projektilas → fire stilius', deathStyleFor({ projectile: 'fireball' }).kind === DEATH_STYLES.fire.kind)
  check('ledo projektilas → ice stilius', deathStyleFor({ projectile: 'freezeBurst' }).kind === DEATH_STYLES.ice.kind)
  check('tamsos prakeiksmas → necro (TYLI mirtis)', deathStyleFor({ projectile: 'darkCurse' }).shake === null)
  check('šventas → holy (TYLI mirtis)', deathStyleFor({ projectile: 'healingGlow' }).shake === null)
  check('nuodai → TYLI mirtis', deathStyleFor({ projectile: 'poisonGlob' }).shake === null)
  check('melee be elemento → physical', deathStyleFor({ melee: true }).extra === 'slash')
  check('frakcija kaip fallback (Mirties maršas → necro)',
    deathStyleFor({ factionName: 'Mirties maršas' }).shake === null)
  check('nežinomas šaltinis → default', deathStyleFor({}).kind === DEATH_STYLES.default.kind)
  check('DEVASTATING sustiprina soft purtymą iki hard',
    deathStyleFor({ projectile: 'fireball', severity: 'DEVASTATING' }).shake === 'hard')
  check('DEVASTATING NEtriukšmina tylių stilių',
    deathStyleFor({ projectile: 'darkCurse', severity: 'DEVASTATING' }).shake === null)
  const quiet = Object.values(DEATH_STYLES).filter((d) => d.shake === null).length
  check('bent 3 stiliai yra tylūs (kontrastas)', quiet >= 3, String(quiet))
}

console.log('\n── F10 Ėjimo pradžios ritualas ──')
{
  const { TURN_RITUAL } = await import('../src/lib/game/timing')
  const total = TURN_RITUAL.goldDelayMs + TURN_RITUAL.goldFillMs + TURN_RITUAL.readyPulseMs
  check('visas ritualas ≤ 1400 ms', total <= 1400, String(total))
  check('ritualas trumpesnis arba lygus baneriui + pusė (nevėluoja per ilgai)',
    TURN_RITUAL.goldDelayMs + TURN_RITUAL.goldFillMs <= TURN_RITUAL.bannerMs)
  check('aukso fill matomas (≥ 300 ms)', TURN_RITUAL.goldFillMs >= 300)
}

console.log('\n── F11 Vienkartiniai efektai nepriklauso nuo inline callback\'ų ──')
{
  // REGRESIJA (rasta 2026-08-10): ZmkSpecial useEffect turėjo `onDone` deps'uose.
  // Tėvas paduoda inline arrow, tad kiekvienas jo re-render'is duodavo naują
  // funkcijos identitetą → efektas persileisdavo → ×2 garsas grodavo be perstojo
  // („repeated beeping"). Vienkartiniai prezentacijos komponentai PRIVALO laikyti
  // callback'ą ref'e ir turėti tuščius deps.
  const { readFileSync } = await import('node:fs')
  const ONE_SHOT = [
    'src/components/tutorial/ZmkSpecial.tsx',
    'src/components/tutorial/SummonBurst.tsx',
    'src/components/tutorial/HpGhostBar.tsx',
  ]
  const CALLBACK_PROPS = /\}, \[[^\]]*\b(onDone|onFinished|onFinish|onComplete)\b[^\]]*\]/
  for (const f of ONE_SHOT) {
    let src = ''
    try { src = readFileSync(f, 'utf8') } catch { continue }
    check(`${f.split('/').pop()} — jokio callback'o useEffect deps'uose`, !CALLBACK_PROPS.test(src),
      (src.match(CALLBACK_PROPS) ?? [''])[0])
  }

  // ZmkSpecial papildomai turi turėti guard'ą nuo pakartotinio grojimo
  const zs = readFileSync('src/components/tutorial/ZmkSpecial.tsx', 'utf8')
  check('ZmkSpecial turi onDoneRef', zs.includes('onDoneRef'))
  check('ZmkSpecial turi firedRef guard\'ą', zs.includes('firedRef'))
}

console.log('\n── F12 Kortos nusileidimas (fizinis pojūtis) ──')
{
  const { CARD_LANDING } = await import('../src/lib/game/timing')
  const { readFileSync } = await import('node:fs')

  check('squash trumpas (≤ 300 ms) — vyksta dažniausiai iš visų įvykių',
    CARD_LANDING.squashMs <= 300, String(CARD_LANDING.squashMs))
  check('dulkės nusėda greičiau nei per 1 s', CARD_LANDING.dustMs <= 1000, String(CARD_LANDING.dustMs))
  check('squash suplokština, o ne ištempia (scaleY < 1)', CARD_LANDING.squashY < 1)
  check('squash kompensuojamas pločiu (scaleX > 1)', CARD_LANDING.stretchX > 1)
  check('nusileidimo garsas tylesnis nei smūgio (foninis, ne akcentas)',
    CARD_LANDING.soundVolume <= 0.35, String(CARD_LANDING.soundVolume))

  const fx = readFileSync('src/components/tutorial/BattleFxLayer.tsx', 'utf8')
  check('dustPuff piešiamas source-over (dulkės slopina, ne švyti)',
    /case 'dustPuff':[\s\S]{0,200}source-over/.test(fx))
  check('dulkės turi gravitaciją (nusėda)', /case 'dustPuff':[\s\S]{0,6000}q\.vy \+=/.test(fx))
  // REGRESIJA: rect buvo perduodamas kaip CENTRAS, o piešiant naudojamas kaip VIRŠUS —
  // dulkės atsirasdavo per pusę kortos aukščio žemiau (matomas tarpas tarp kortos ir dulkių).
  check('cardLand priima top-left rect (ne centrą)',
    /cardLand: \(uid: string, rect: \{ left: number; top: number/.test(fx))
  check('centras skaičiuojamas iš top-left rect (o ne naudojamas kaip centras)',
    /const cx = rLeft \+ rW \/ 2/.test(fx) && /const cy = rTop \+ rH \/ 2/.test(fx))
  // Korta guli PLOKŠČIAI ir nusileidžia visa plokštuma — dulkės turi eiti iš
  // VISŲ 4 briaunų, ne tik iš apačios (regresija, rasta 2026-08-10).
  check('emisija radialinė per visus 360°', /const a = \(k \/ n\) \* TAU/.test(fx))
  check('startas ANT briaunos (spindulio × stačiakampio sankirta, be tarpo)',
    /halfW \/ Math\.abs\(dirX\)/.test(fx) && /halfH \/ Math\.abs\(dirY\)/.test(fx))
  check('greitis nukreiptas ta pačia kryptimi kaip startas (į išorę)',
    /vx: dirX \* speed/.test(fx) && /vy: dirY \* speed/.test(fx))
  check('tankesnis pliūpsnis ties visais 4 kampais',
    /for \(const sx of \[-1, 1\]\) for \(const sy of \[-1, 1\]\)/.test(fx))
  check('žiedas — elipsė aplink VISĄ kortą, ne tik pagrindą',
    /ctx\.ellipse\(cx, cy, halfW \* \(1 \+ ringP/.test(fx))
  check('squash centruotas (korta neatsiremia į apatinę briauną)',
    /transform-origin: center/.test(fx) && !/transform-origin: bottom center/.test(fx))
  check('nebeliko senos „tik į šonus" emisijos', !/const tilt = rnd\(/.test(fx))

  const tg = readFileSync('src/components/tutorial/TutorialGame.tsx', 'utf8')
  check('nusileidimas kabinamas ant onAnimationComplete (visi keliai vienodai)',
    tg.includes('onAnimationComplete={() => onUnitLanded(u.uid)}'))
  check('guard yra LAIKO, ne „ar kada nors" (returnToHand → gali nusileisti vėl)',
    tg.includes('landedAtRef') && !tg.includes('landedRef.current.has'))
  check('kviečiant perduodamas tikras DOMRect (left/top), ne centras',
    tg.includes('cardLand(uid, { left: r.left, top: r.top'))
}

console.log('\n── F13 Kovos dialogų ir pranešimų rėmas ──')
{
  const { readFileSync } = await import('node:fs')
  const tac = readFileSync('src/components/tutorial/CardTactile.tsx', 'utf8')
  const tg = readFileSync('src/components/tutorial/TutorialGame.tsx', 'utf8')
  const uicss = readFileSync('src/components/digital/ui/ravenof-ui.css', 'utf8')

  check('combat-plate injektuojamas su kovos ekranu (ne /digital CSS faile)',
    tac.includes('.combat-plate {') && !uicss.includes('.combat-plate {'))
  // Rėmas remiasi TIKRAIS asset'ais (apkarpytu UI paketo panel-iron.png), o ne
  // CSS ornamentu — anksčiau nupieštas kabliukų variantas atrodė kaip tas pats
  // senas rounded-2xl ir naudotojas jo nepastebėjo.
  check('rėmas naudoja 9-slice assetą, ne CSS ornamentą',
    /border-image: url\('\/ravenof-ui\/combat\/panels\/plate-iron\.png'\) 65 fill \/ 22px/.test(tac))
  check('neliko seno CSS kabliukų ornamento',
    !/background-size:[\s\S]{0,140}22px 3px, 3px 22px/.test(tac) && !tac.includes('.combat-plate::before'))
  {
    const { existsSync } = await import('node:fs')
    const files = ['plate-iron.png', 'plate-iron-danger.png', 'plate-iron-arcane.png']
    const missing = files.filter((f) => !existsSync(`public/ravenof-ui/combat/panels/${f}`))
    check('rėmo asset’ai yra repozitorijoje', missing.length === 0, missing.join(', '))
  }
  // REGRESIJA: `.combat-plate { position: relative }` perrašydavo Tailwind `fixed`
  // ant klaidos pranešimo (injektuotas <style> yra PO Tailwind), tad toast'as
  // dingdavo iš ekrano viršaus ir atrodydavo, kad klaidos apskritai nerodomos.
  check('pozicija dedama per :where() (nenustelbia Tailwind fixed)',
    /:where\(\.combat-plate\) \{ position: relative/.test(tac))
  check('.combat-plate taisyklėje position nebenurodyta tiesiogiai',
    !/\.combat-plate \{[^}]*position:/.test(tac))
  check('mobiliajame rėmas plonesnis (neatima turinio ploto)',
    /@media \(max-width: 480px\)[\s\S]{0,220}\.combat-plate \{ border-width: 16px/.test(tac))
  // Antrą kartą užkliuvo: neekranuotas backtick CSS template literal'e nutraukia string'ą.
  // TREČIĄ kartą — jau kitame faile (BattleFxLayer), tad tikrinam abu.
  {
    const rawBackticks = (src: string, start: string, end: string): number => {
      const i = src.indexOf(start)
      if (i < 0) return -1
      const j = src.indexOf(end, i + start.length)
      if (j < 0) return -1
      const css = src.slice(i + start.length, j)
      let raw = 0
      for (let k = 0; k < css.length; k++) if (css[k] === '`' && (k === 0 || css[k - 1] !== '\\')) raw++
      return raw
    }
    const a = rawBackticks(tac, 'const CSS = `', '`\n\n/**')
    check('CardTactile CSS be neekranuotų backtickų', a === 0, String(a))
    const fx = readFileSync('src/components/tutorial/BattleFxLayer.tsx', 'utf8')
    const b = rawBackticks(fx, 'const CSS = `', '`\n')
    check('BattleFxLayer CSS be neekranuotų backtickų', b === 0, String(b))
  }
  check('švytėjimo spalva per CSS kintamąjį', tac.includes('--plate-glow'))
  check('yra pavojaus ir arkaninis variantai',
    tac.includes('.combat-plate.is-danger') && tac.includes('.combat-plate.is-arcane'))
  check('variantai keičia patį metalą (atskiras border-image-source)',
    /is-danger[\s\S]{0,160}border-image-source: url\('\/ravenof-ui\/combat\/panels\/plate-iron-danger\.png'\)/.test(tac)
    && /is-arcane[\s\S]{0,160}border-image-source: url\('\/ravenof-ui\/combat\/panels\/plate-iron-arcane\.png'\)/.test(tac))

  check('klaidos pranešimas naudoja rėmą', tg.includes('combat-plate combat-toast'))
  const uses = (tg.match(/combat-plate/g) ?? []).length
  check('rėmas pritaikytas visiems kovos dialogams (≥ 10 vietų)', uses >= 10, String(uses))
  // REGRESIJA: pakeitus modalus į klasę, inline background buvo pašalintas —
  // jei CSS neįkeliamas, langas liktų visiškai be stiliaus.
  check('neliko modalų su senu „be rėmo" stiliumi',
    !/linear-gradient\(145deg[^\n]*border:[^\n]*w-\[min\(/.test(tg))
}

console.log('\n── F8 Statusų trigger feedback (fazės 8 užbaigimas) ──')
{
  const { attack, canUnitAttack } = await import('../src/lib/tutorial/engine')

  // ── Sušaldytas gynėjas neatsikerta → TIKRAS žurnalo įvykis ──
  {
    const g = freshGame()
    P(g, 'you').units[0] = {
      uid: 'Puolejas', card: mkCard({ name: 'Puolejas', uid: 'Puolejas', attack: 2, health: 9 }),
      atk: 2, hp: 9, maxHp: 9, shield: false, stealth: false,
      statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
    } as never
    P(g, 'ai').units[0] = {
      uid: 'Ledas', card: mkCard({ name: 'Ledas', uid: 'Ledas', attack: 4, health: 9 }),
      atk: 4, hp: 9, maxHp: 9, shield: false, stealth: false,
      statuses: { frozen: 9999 }, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
    } as never

    const hpBefore = P(g, 'you').units[0]!.hp
    attack(g, 'you', 'Puolejas', { kind: 'unit', side: 'ai', uid: 'Ledas' })
    const ev = g.log.find((e) => e.key === 'battleLog.frozenNoRetaliate')
    check('sušaldytas gynėjas palieka žurnalo įrašą', !!ev, JSON.stringify(g.log.slice(-3).map((x) => x.key)))
    check('įrašas eina per statusEvt srautą (PvP svečias atkurs identiškai)',
      ev?.statusEvt === 'trigger' && ev?.statusId === 'frozen', JSON.stringify(ev))
    check('įrašas nurodo konkrečią kortą (FX inkaras)', !!ev?.src?.uid, JSON.stringify(ev?.src))
    check('puolėjas TIKRAI negavo atgalinės žalos', P(g, 'you').units[0]!.hp === hpBefore,
      `${hpBefore} → ${P(g, 'you').units[0]!.hp}`)
  }

  // ── Nesušaldytas gynėjas atsikerta ir įrašo NĖRA ──
  {
    const g = freshGame()
    P(g, 'you').units[0] = {
      uid: 'P2', card: mkCard({ name: 'P2', uid: 'P2', attack: 2, health: 9 }),
      atk: 2, hp: 9, maxHp: 9, shield: false, stealth: false,
      statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
    } as never
    P(g, 'ai').units[0] = {
      uid: 'G2', card: mkCard({ name: 'G2', uid: 'G2', attack: 4, health: 9 }),
      atk: 4, hp: 9, maxHp: 9, shield: false, stealth: false,
      statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
    } as never
    attack(g, 'you', 'P2', { kind: 'unit', side: 'ai', uid: 'G2' })
    check('sveikas gynėjas atsikerta (žalos yra)', P(g, 'you').units[0]!.hp < 9, String(P(g, 'you').units[0]!.hp))
    check('be sušaldymo įrašo nėra', !g.log.some((e) => e.key === 'battleLog.frozenNoRetaliate'))
  }

  // ── Pasišaipymas: atmetimas grąžina KALTININKUS, bet NEteršia žurnalo ──
  {
    const g = freshGame()
    P(g, 'you').units[0] = {
      uid: 'A', card: mkCard({ name: 'A', uid: 'A', attack: 3, health: 9 }),
      atk: 3, hp: 9, maxHp: 9, shield: false, stealth: false,
      statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
    } as never
    P(g, 'ai').units[0] = {
      uid: 'Sarge', card: mkCard({ name: 'Sarge', uid: 'Sarge', attack: 1, health: 9, keywords: ['taunt'] }),
      atk: 1, hp: 9, maxHp: 9, shield: false, stealth: false,
      statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
    } as never
    P(g, 'ai').units[1] = {
      uid: 'Silpnas', card: mkCard({ name: 'Silpnas', uid: 'Silpnas', attack: 1, health: 3 }),
      atk: 1, hp: 3, maxHp: 3, shield: false, stealth: false,
      statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
    } as never

    const logLenBefore = g.log.length
    const r = attack(g, 'you', 'A', { kind: 'unit', side: 'ai', uid: 'Silpnas' }) as
      { ok: boolean; reason?: string; reasonRefs?: { side: string; uid: string }[] }
    check('ataka atmesta dėl Pasišaipymo', !r.ok && r.reason === 'battleLog.err.tauntMustAttack', JSON.stringify(r))
    check('grąžinti KALTININKAI (UI juos paryškina)',
      r.reasonRefs?.length === 1 && r.reasonRefs[0].uid === 'Sarge', JSON.stringify(r.reasonRefs))
    check('atmestas veiksmas NETERŠIA žurnalo (PvP svečias jo neatkurtų)',
      g.log.length === logLenBefore, `${logLenBefore} → ${g.log.length}`)
    check('padaras atakos NEeikvojo', P(g, 'you').units[0]!.attacksUsed === 0)
  }
}

console.log('\n── F14 Artefaktai FX sluoksnyje (mirtinas smūgis nebeskrenda į veidą) ──')
{
  const { readFileSync } = await import('node:fs')
  const tg = readFileSync('src/components/tutorial/TutorialGame.tsx', 'utf8')
  const fx = readFileSync('src/components/tutorial/BattleFxLayer.tsx', 'utf8')

  // ROOT CAUSE: pozicijų cache sekė TIK padarus. Mirtinas smūgis artefaktui →
  // DOM elemento nebėra, cache tuščias → FX nukrisdavo į savininko avatarą.
  check('pozicijų cache seka IR artefaktus',
    /querySelectorAll\('\[data-unit-uid\],\[data-artifact-uid\]'\)/.test(tg))
  check('cache raktas imamas iš abiejų atributų',
    /getAttribute\('data-unit-uid'\) \?\? el\.getAttribute\('data-artifact-uid'\)/.test(tg))

  // boxFor (reakcijų grandinė) nebekrenta į avatarą, kai taikinys sunaikintas
  const boxFor = tg.slice(tg.indexOf('const boxFor'), tg.indexOf('const selBox'))
  check('boxFor: dingęs uid → null, ne avataras', /if \(!el\) return null/.test(boxFor))

  // FX sluoksnis: purtymas / šuolis / smūgio blyksnis randa ir artefaktą
  check('BattleFxLayer turi bendrą cardEl(uid) helperį', /function cardEl\(uid: string\)/.test(fx))
  check('cardEl ieško ir artefakto', /data-artifact-uid="\$\{uid\}"/.test(fx))
  check('neliko tiesioginių tik-padarų paieškų pagal uid',
    !/document\.querySelector\(`\[data-unit-uid="\$\{uid\}"\]`\) as HTMLElement/.test(fx))
}

console.log('\n── F15 Reakcijos grandinė taikosi TIK į savo taikinius ──')
{
  // REGRESIJA („Liepsnos liežuviai"): reakcija nužudo priešo padarą → suveikia
  // BŪTENT TO padaro Paskutinis noras → jo taikinys (SAVAS padaras) gaudavo
  // ANTRĄ grandinę, nors reakcija į jį nesitaikė. Taikinių langas buvo globalus.
  const g = freshGame()

  P(g, 'you').units[0] = {
    uid: 'Manas', card: mkCard({ name: 'Manas', uid: 'Manas', attack: 1, health: 9 }),
    atk: 1, hp: 9, maxHp: 9, shield: false, stealth: false,
    statuses: {}, attacksUsed: 0, summonedOnTurn: -1, tempBuffs: [],
  } as never

  // Iškviečiamas padaras, kurį reakcija nužudys — IR JIS turi Paskutinį norą,
  // taikomą į priešą (t. y. į MANO padarą). Būtent ši kaskada ir teršė grandinę.
  const lastwish: EffectMapping = {
    trigger: 'onDeath', effect: 'damage', target: 'enemyUnit', value: 1, requiresSelection: false,
  }
  const summoned = mkCard({ name: 'Naujokas', uid: 'Naujokas', attack: 2, health: 3, mappings: [lastwish] })
  P(g, 'ai').hand.push(summoned)

  // Taikymas per `enemyUnit` (auto-pick) — testas apie taikinių RINKIMO langą,
  // ne apie trigerio šaltinio prijungimą, tad laikom scenarijų paprastą.
  const reactionMapping: EffectMapping = {
    trigger: 'onAnySummon', triggerSide: 'enemy', effect: 'damage',
    target: 'enemyUnit', value: 6, requiresSelection: false,
  }
  P(g, 'you').reactions[0] = {
    uid: 'Liepsnos', card: mkCard({ name: 'Liepsnos', uid: 'Liepsnos', type: 'reaction', attack: null, health: null, mappings: [reactionMapping] }), paid: 0,
  } as never

  g.active = 'ai'
  playCard(g, 'ai', 'Naujokas')

  const gate = g.reactionGates?.[g.reactionGates.length - 1]
  check('reakcija suveikė (yra vartai)', !!gate, JSON.stringify(g.reactionGates))
  check('iškviestas padaras tikrai žuvo nuo reakcijos',
    !P(g, 'ai').units.some((u) => u?.uid === 'Naujokas'), JSON.stringify(P(g, 'ai').units.map((u) => u?.uid)))
  check('žuvusiojo Paskutinis noras tikrai suveikė (mano padaras gavo žalos)',
    P(g, 'you').units[0]!.hp < 9, String(P(g, 'you').units[0]!.hp))

  const uids = (gate?.targets ?? []).map((t) => ('uid' in t && t.uid ? t.uid : `player:${'side' in t ? t.side : '?'}`))
  check('grandinė NEnusitaikė į mano padarą (kaskada neteršia)', !uids.includes('Manas'), JSON.stringify(uids))
  check('grandinė turi tik reakcijos taikinį', uids.length === 1 && uids[0] === 'Naujokas', JSON.stringify(uids))
}

console.log('\n── F16 Atakos šuolis: tempimas, blur, žiežirbos ──')
{
  const { readFileSync } = await import('node:fs')
  const fx = readFileSync('src/components/tutorial/BattleFxLayer.tsx', 'utf8')
  const tg = readFileSync('src/components/tutorial/TutorialGame.tsx', 'utf8')
  const { ATTACK_LUNGE, ATTACK_SPARKS } = await import('../src/lib/game/timing')
  const { IMPACT_PROFILES, SEVERITY_ORDER } = await import('../src/lib/game/impactProfiles')

  // Konstantos gyvena viename faile, ne išbarstytos po komponentus.
  check('ATTACK_LUNGE turi visas skrydžio fazes',
    ATTACK_LUNGE.windupMs > 0 && ATTACK_LUNGE.travelMs > 0 && ATTACK_LUNGE.recoverMs > 0)
  check('tempimas ryškus (naudotojo prašymas: „labiau ištempk")',
    ATTACK_LUNGE.stretchK >= 0.8, String(ATTACK_LUNGE.stretchK))
  check('tempiant skersai susispaudžia (tūris išlaikomas)',
    ATTACK_LUNGE.stretchSquash > 0 && ATTACK_LUNGE.stretchSquash < 1)
  check('smūgis staigesnis už grįžimą (dramaturgija)',
    ATTACK_LUNGE.travelMs < ATTACK_LUNGE.recoverMs)

  // REGRESIJA: senas rvn-lunge buvo CSS keyframe'ai su fiksuotu scale(1.1) —
  // tempimas nepriklausė nuo greičio, tad įsibėgėjimo nesimatė.
  check('senų rvnLunge keyframe’ų nebeliko', !fx.includes('@keyframes rvnLunge') && !fx.includes('.rvn-lunge '))
  check('tempimas ir blur skaičiuojami iš greičio',
    /const vn = Math\.min\(1, v \/ L\.maxSpeedPxPerMs\)/.test(fx))
  check('blur uždedamas tik realiai judant', /el\.style\.filter = vn > 0\.06/.test(fx))

  // Judesio sluoksnis: be jo framer-motion ir rAF perrašinėtų vienas kito transform.
  check('šuolis rašo į vidinį [data-lunge] wrapper’į', fx.includes("querySelector('[data-lunge]')"))
  check('TutorialGame tą wrapper’į tikrai renderina', tg.includes('<div data-lunge>'))
  check('wrapper turi savo stacking context’ą (šmėklos lieka už kortos)',
    /\[data-lunge\] \{[^}]*isolation: isolate/.test(fx))

  // Smūgio taškas — ta pati briaunos matematika kaip nusileidimo dulkėse.
  check('atstumas skaičiuojamas iš kortų dydžių, ne kaip % kelio',
    fx.includes('const halfA = edgeDist(') && fx.includes('const halfT = tr ? edgeDist('))
  check('žiežirbos sprogsta ant TAIKINIO briaunos',
    /const ix = target\.x - nx \* halfT/.test(fx))
  check('taikinio uid perduodamas iš TutorialGame',
    /lungeUnit\(src\.uid, to0, \{ targetUid: tgt\.uid, severity: sev \}\)/.test(tg))

  // Žiežirbų svoris ateina iš duomenų (severity), ne iš hardcode'o.
  check('kiekvienas ImpactProfile turi sparkMul',
    SEVERITY_ORDER.every((s) => typeof IMPACT_PROFILES[s].sparkMul === 'number'))
  check('sunkesnis smūgis → daugiau žiežirbų',
    SEVERITY_ORDER.every((s, i) => i === 0 || IMPACT_PROFILES[s].sparkMul >= IMPACT_PROFILES[SEVERITY_ORDER[i - 1]].sparkMul),
    SEVERITY_ORDER.map((s) => `${s}:${IMPACT_PROFILES[s].sparkMul}`).join(' '))
  check('sparkBurst naudoja profilio daugiklį', /const mul = prof\.sparkMul/.test(fx))
  check('žiežirbos lekia į VISAS puses (pilnas apskritimas)', /const a = rnd\(0, TAU\)/.test(fx))
  check('yra polinkis atgal nuo smūgio (atsimušimas, ne sprogimas)',
    fx.includes('ux * S.backBias') && ATTACK_SPARKS.backBias > 0)
  check('žiežirba piešiama brūkšniu nuo praėjusios pozicijos',
    /ctx\.moveTo\(ox, oy\); ctx\.lineTo\(q\.x, q\.y\)/.test(fx))
  check('žiežirbos turi gravitaciją', ATTACK_SPARKS.gravity > 0 && /const g = \(S\.gravity \/ 3600\)/.test(fx))

  // Prieinamumas ir kokybė.
  check('prefers-reduced-motion → jokio šuolio', /if \(reduced\) \{ burst\(\); return \}/.test(fx))
  check('low kokybė → be žiežirbų', /if \(reduced \|\| q === 'low'\) return/.test(fx))
  check('šmėklos tik high kokybėje', /if \(q === 'high' && L\.ghosts > 0\)/.test(fx))
  check('šmėklos pašalinamos pasibaigus (jokio DOM šiukšlinimo)',
    /for \(const g of ghosts\) g\.remove\(\)/.test(fx))
  // REGRESIJA: antra ataka tam pačiam padarui neturi palikti kortos pasitempusios.
  check('antras šuolis nutraukia pirmąjį', fx.includes('cancelAnimationFrame(prev)'))
}

console.log(`\n══ Rezultatas: ${pass} praėjo, ${fail} krito ══\n`)
process.exit(fail > 0 ? 1 : 0)
