// ── secondAttackVsShield testai (Gilez'as: MAGSHIELD turinčius puola 2 kartus) ──
// Paleidimas: npx tsx scripts/simulate-shield-attack.ts  (npm run game:test:shieldatk)

import {
  createGame, beginTurn, endTurn, attack, P,
  type TutCard, type GameState,
} from '../src/lib/tutorial/engine'

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
const filler = (n: number, tag = 'F') => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))

function freshGame(): GameState {
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 })
  beginTurn(g)
  g.you.gold = 1000
  g.ai.gold = 1000
  return g
}
const mkBoard = (card: TutCard, shield = false) => ({
  uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
  shield, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0,
  isChampion: false, phase: 0, abilityUsed: false,
}) as never
const findU = (g: GameState, s: 'you' | 'ai', name: string) => P(g, s).units.filter(Boolean).find((u) => u!.card.name === name)

const gilez = (flag = true) => mkCard({
  name: 'Gilezas', uid: 'Gilezas', attack: 4, health: 12,
  gameplay: flag ? { secondAttackVsShield: true } : undefined,
} as Partial<TutCard> & { name: string })

console.log('\n── 1. Taikinys su MAGSHIELD: skydas nukrenta, ataka grąžinama, antras smūgis pasiekia ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(gilez())
  g.ai.units[0] = mkBoard(mkCard({ name: 'Skydinis', uid: 'Skydinis', attack: 0, health: 20 }), true)
  const r1 = attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'Skydinis' })
  check('1-a ataka ok', r1.ok, JSON.stringify(r1))
  check('skydas nukrito, žalos nėra (20)', findU(g, 'ai', 'Skydinis')!.hp === 20 && !findU(g, 'ai', 'Skydinis')!.shield)
  const r2 = attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'Skydinis' })
  check('2-a ataka tą patį ėjimą LEIDŽIAMA', r2.ok, JSON.stringify(r2))
  check('antras smūgis pataikė (20→16)', findU(g, 'ai', 'Skydinis')!.hp === 16, `hp=${findU(g, 'ai', 'Skydinis')?.hp}`)
  const r3 = attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'Skydinis' })
  check('3-ia ataka ATMESTA (1×/ėjimą)', !r3.ok, JSON.stringify(r3))
}

console.log('\n── 2. Be pasyvo: skydas nukrenta ir ėjimas baigtas ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(gilez(false))
  g.ai.units[0] = mkBoard(mkCard({ name: 'Skydinis2', uid: 'Skydinis2', attack: 0, health: 20 }), true)
  attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'Skydinis2' })
  const r2 = attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'Skydinis2' })
  check('2-a ataka ATMESTA be pasyvo', !r2.ok, JSON.stringify(r2))
}

console.log('\n── 3. Taikinys BE skydo: papildomos atakos nėra ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(gilez())
  g.ai.units[0] = mkBoard(mkCard({ name: 'Paprastas', uid: 'Paprastas', attack: 0, health: 20 }))
  attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'Paprastas' })
  const r2 = attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'Paprastas' })
  check('2-a ataka ATMESTA (taikinys be MAGSHIELD)', !r2.ok, JSON.stringify(r2))
  check('žala 20→16', findU(g, 'ai', 'Paprastas')!.hp === 16, `hp=${findU(g, 'ai', 'Paprastas')?.hp}`)
}

console.log('\n── 4. Du skydiniai taikiniai tą patį ėjimą → tik VIENA papildoma ataka ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(gilez())
  g.ai.units[0] = mkBoard(mkCard({ name: 'S1', uid: 'S1', attack: 0, health: 20 }), true)
  g.ai.units[1] = mkBoard(mkCard({ name: 'S2', uid: 'S2', attack: 0, health: 20 }), true)
  const r1 = attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'S1' })
  const r2 = attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'S2' })
  const r3 = attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'S1' })
  check('1-a ir 2-a atakos ok', r1.ok && r2.ok)
  check('3-ia ATMESTA (be begalinės grandinės)', !r3.ok, JSON.stringify(r3))
}

console.log('\n── 5. Kitą ėjimą pasyvas vėl veikia ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(gilez())
  g.ai.units[0] = mkBoard(mkCard({ name: 'S3', uid: 'S3', attack: 0, health: 40 }), true)
  attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'S3' })
  attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'S3' })
  endTurn(g); beginTurn(g)   // ai
  endTurn(g); beginTurn(g)   // you
  findU(g, 'ai', 'S3')!.shield = true      // skydas atstatytas (pvz. aura)
  const r1 = attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'S3' })
  const r2 = attack(g, 'you', 'Gilezas', { kind: 'unit', side: 'ai', uid: 'S3' })
  check('naują ėjimą vėl 2 atakos', r1.ok && r2.ok, JSON.stringify([r1, r2]))
}

console.log(`\n── REZULTATAS: ${pass} pass, ${fail} fail ──\n`)
process.exit(fail ? 1 : 0)
