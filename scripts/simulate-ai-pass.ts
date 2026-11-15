// ── DI „praleistų progų" regresijos (2026-11-15) ─────────────────────────────
// Paleidimas: npm run game:test:aipass
// Iš tikrų kovų žurnalų (bot_match_logs #15, #16): sunkiausias botas baigdavo ėjimą,
// nors galėjo nemokamai pulti į veidą, naudingai prasikeisti, panaudoti čempiono
// gebėjimą ar išleisti auksą. Čia – tos pačios padėtys.
import { createGame, beginTurn, P, type TutCard, type GameState, type BoardUnit } from '../src/lib/tutorial/engine'
import { aiNextAction } from '../src/lib/tutorial/ai'
import { setRng, mulberry32 } from '../src/lib/game/rng'
import { planMasterTurn, bestLeftoverAction, MASTER_CFG, aiPlanStats, resetAiPlanStats } from '../src/lib/tutorial/ai/aiMaster'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name, extra) } else { fail++; console.log('  ✗ FAIL:', name, extra) }
}
const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return { id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3, type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [], ...over } as TutCard
}
const filler = (n: number, tag = 'F') => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}`, gold: 900 }))
const mkUnit = (c: TutCard, hp: number, over: Partial<BoardUnit> = {}): BoardUnit => ({
  uid: c.uid, card: c, atk: c.attack ?? 2, hp, maxHp: hp, shield: false, stealth: false,
  statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false, ...over,
} as BoardUnit)
function freshGame(): GameState {
  const g = createGame(filler(15, 'Y'), filler(15, 'A'), 'ai', { zmkDefs: ZMK0 as never })
  beginTurn(g)
  P(g, 'ai').hand = []; P(g, 'you').hand = filler(4, 'YH')
  return g
}
/** Sužaidžia viso boto ėjimo veiksmus; grąžina jų sąrašą. */
function playTurn(g: GameState, difficulty: 'normal' | 'hard'): string[] {
  const acts: string[] = []
  for (let i = 0; i < 20; i++) {
    const a = aiNextAction(g, { difficulty })
    if (!a) break
    acts.push(a.kind + ('cardName' in a && a.cardName ? ':' + a.cardName : ''))
    if (g.winner) break
  }
  return acts
}

for (const diff of ['hard', 'normal'] as const) {
  console.log(`◆ ${diff}: laisvas padaras, tuščia priešo lenta → puola į veidą`)
  {
    setRng(mulberry32(11))
    const g = freshGame()
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Zanara', uid: 'z1', attack: 1 }), 1)
    P(g, 'ai').gold = 0
    const hp0 = P(g, 'you').hp
    const acts = playTurn(g, diff)
    check('ataka įvyko', acts.some((a) => a.startsWith('attack')), acts.join(', ') || '(nieko)')
    check('priešo HP sumažėjo', P(g, 'you').hp < hp0, `${hp0} → ${P(g, 'you').hp}`)
  }

  console.log(`◆ ${diff}: 5/3 gali nukauti priešo čempioną 7/5 → keičiasi`)
  {
    setRng(mulberry32(12))
    const g = freshGame()
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Gorgone', uid: 'g1', attack: 5 }), 3)
    P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'Sauklys', uid: 's1', attack: 2 }), 2)
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Manufas', uid: 'm1', attack: 8 }), 5)
    P(g, 'you').units[1] = mkUnit(mkCard({ name: 'Gunteris', uid: 'c1', attack: 7, type: 'champion' }), 5, { isChampion: true, phase: 1, statuses: { poisoned: 2 } as never })
    P(g, 'ai').gold = 800
    P(g, 'ai').hand = [mkCard({ name: 'Brangus', uid: 'h9', gold: 900 })]
    const acts = playTurn(g, diff)
    const champAlive = P(g, 'you').units.some((u) => u?.uid === 'c1')
    check('botas puolė', acts.some((a) => a.startsWith('attack')), acts.join(', ') || '(nieko)')
    check('priešo čempionas ar 8/5 nukautas', !champAlive || !P(g, 'you').units.some((u) => u?.uid === 'm1'))
  }

  console.log(`◆ ${diff}: 1000 aukso ir įperkamas padaras rankoje → sužaidžia`)
  {
    setRng(mulberry32(13))
    const g = freshGame()
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Sauklys', uid: 's1', attack: 2 }), 2)
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Manufas', uid: 'm1', attack: 8 }), 5)
    P(g, 'you').units[1] = mkUnit(mkCard({ name: 'Manufas2', uid: 'm2', attack: 5 }), 5)
    P(g, 'you').units[2] = mkUnit(mkCard({ name: 'Gynejas', uid: 'd1', attack: 3 }), 2)
    P(g, 'ai').gold = 1000
    P(g, 'ai').hand = [mkCard({ name: 'Brangus', uid: 'h9', gold: 900, attack: 6, health: 6 }), mkCard({ name: 'Pigus', uid: 'h3', gold: 300, attack: 3, health: 3 })]
    const acts = playTurn(g, diff)
    check('sužaidė bent vieną kortą', acts.some((a) => a.startsWith('play')), acts.join(', ') || '(nieko)')
  }

  console.log(`◆ ${diff}: blogas keitimas (3/1 į 7/15) – NEPUOLA`)
  {
    setRng(mulberry32(14))
    const g = freshGame()
    P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Golemas', uid: 'q1', attack: 3 }), 1)
    P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Siena', uid: 'w1', attack: 7, keywords: ['taunt'] }), 15)
    P(g, 'ai').gold = 0
    const acts = playTurn(g, diff)
    check('savižudiškos atakos nėra', !P(g, 'ai').units.every((u) => !u), acts.join(', ') || '(nieko)')
  }
}

console.log('◆ Paieškai pritrūkus laiko planas pažymimas „starved", o ne „baigti ėjimą"')
{
  const g = freshGame()
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Zanara', uid: 'z1', attack: 5 }), 3)
  P(g, 'ai').gold = 0
  const p0 = planMasterTurn(g, { ...MASTER_CFG.hard, budget: 0 })
  check('biudžetas 0 → tuščias planas su starved', !!p0 && p0.seq.length === 0 && p0.starved === true)
  const p1 = planMasterTurn(g, MASTER_CFG.hard)
  check('normalus biudžetas → ne starved ir yra ataka', !!p1 && !p1.starved && p1.seq[0]?.type === 'attack')
}

console.log('◆ Su nuliniu biudžetu (lėtas įrenginys) botas vis tiek žaidžia – greedy')
{
  const saved = { hard: MASTER_CFG.hard.budget, normal: MASTER_CFG.normal.budget }
  MASTER_CFG.hard.budget = 0; MASTER_CFG.normal.budget = 0
  try {
    for (const diff of ['hard', 'normal'] as const) {
      resetAiPlanStats()
      const g = freshGame()
      P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Gorgone', uid: 'g1', attack: 5 }), 3)
      P(g, 'you').units[0] = mkUnit(mkCard({ name: 'Gunteris', uid: 'c1', attack: 7, type: 'champion' }), 5, { isChampion: true, phase: 1 })
      P(g, 'ai').gold = 1000
      P(g, 'ai').hand = [mkCard({ name: 'Pigus', uid: 'h3', gold: 300, attack: 3, health: 3 })]
      const acts = playTurn(g, diff)
      check(`${diff}: sužaidė kortą ir puolė`, acts.some((a) => a.startsWith('play')) && acts.some((a) => a.startsWith('attack')), acts.join(', ') || '(nieko)')
      check(`${diff}: paieška per ėjimą bandyta tik kartą`, aiPlanStats.plans === 1 && aiPlanStats.starved === 1, JSON.stringify(aiPlanStats))
    }
  } finally { MASTER_CFG.hard.budget = saved.hard; MASTER_CFG.normal.budget = saved.normal }
}

console.log('◆ Saugiklis bestLeftoverAction')
{
  const g = freshGame()
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'Zanara', uid: 'z1', attack: 1 }), 1)
  P(g, 'ai').gold = 0
  const a = bestLeftoverAction(g)
  check('laisva ataka į veidą randama', a?.d.type === 'attack' && a.d.target.kind === 'player', a ? `gain ${a.gain.toFixed(1)}` : 'null')

  const g2 = freshGame()
  P(g2, 'ai').units[0] = mkUnit(mkCard({ name: 'Golemas', uid: 'q1', attack: 3 }), 1)
  P(g2, 'you').units[0] = mkUnit(mkCard({ name: 'Siena', uid: 'w1', attack: 7, keywords: ['taunt'] }), 15)
  P(g2, 'ai').gold = 0
  check('savižudiška ataka nesiūloma', bestLeftoverAction(g2) === null)

  const g3 = freshGame()
  P(g3, 'ai').units[0] = mkUnit(mkCard({ name: 'Gorgone', uid: 'g1', attack: 5 }), 3)
  P(g3, 'you').units[0] = mkUnit(mkCard({ name: 'Gunteris', uid: 'c1', attack: 7, type: 'champion' }), 5, { isChampion: true, phase: 1 })
  P(g3, 'ai').gold = 0
  const a3 = bestLeftoverAction(g3)
  check('pelningas keitimas (5/3 nukauna čempioną 7/5) siūlomas', a3?.d.type === 'attack' && a3.d.target.kind === 'unit', a3 ? `gain ${a3.gain.toFixed(1)}` : 'null')

  const g4 = freshGame()
  P(g4, 'ai').gold = 500
  P(g4, 'ai').hand = [mkCard({ name: 'Pigus', uid: 'h3', gold: 300, attack: 3, health: 3 }), mkCard({ name: 'Burtas', uid: 'sp', gold: 200, type: 'spell' })]
  const a4 = bestLeftoverAction(g4)
  check('įperkamas padaras siūlomas, burtas – ne', a4?.d.type === 'play' && a4.d.uid === 'h3', a4 ? `${a4.d.type} gain ${a4.gain.toFixed(1)}` : 'null')

  const before = JSON.stringify([P(g3, 'ai').units[0]?.hp, P(g3, 'you').units[0]?.hp, P(g3, 'you').hp])
  bestLeftoverAction(g3)
  check('tikra būsena nepaliesta (dirba su klonais)', before === JSON.stringify([P(g3, 'ai').units[0]?.hp, P(g3, 'you').units[0]?.hp, P(g3, 'you').hp]))
}

console.log(`\n${pass} praėjo, ${fail} krito`)
if (fail) process.exit(1)
