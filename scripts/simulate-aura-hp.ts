// ── Auros HP testai (Eldoras sielų meistras bug'as) ──────────────────────────
// Paleidimas: npx tsx scripts/simulate-aura-hp.ts   (npm run game:test:aurahp)
// Bug'as: recomputeAuras nuimdavo tik maxHp, o pritaikydamas darydavo hp += aura,
// todėl sužeistas padaras KIEKVIENO perskaičiavimo metu pagydomas auros dydžiu.
import { createGame, beginTurn, recomputeAuras, P, type TutCard, type GameState } from '../src/lib/tutorial/engine'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗ FAIL:', name, extra) }
}
const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return { id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3, type: 'unit', keywords: [], effectText: '',
    rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [], ...over } as TutCard
}
const filler = (n: number, tag: string) => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))
const mkBoard = (card: TutCard) => ({ uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
  shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false }) as never
function freshGame(): GameState { const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 }); beginTurn(g); return g }

const eldoras = () => mkCard({ name: 'Eldoras', uid: 'Eldoras', attack: 3, health: 5, factionId: 6,
  gameplay: { passiveAura: { auraScope: 'friendly', auraAttack: 2, auraHealth: 2, auraFaction: 6, auraIncludesSelf: true } } } as never)
const zombie = () => mkCard({ name: 'Zombis', uid: 'Zombis', attack: 2, health: 4, factionId: 6 } as never)

console.log('\n── 1. Aura pritaikoma vieną kartą ──')
{
  const g = freshGame(); g.you.units = [mkBoard(eldoras()), mkBoard(zombie()), null, null, null] as never
  recomputeAuras(g)
  const [e, z] = P(g, 'you').units as any[]
  check('Eldoras 5/7', e.atk === 5 && e.hp === 7 && e.maxHp === 7, `${e.atk}/${e.hp}/${e.maxHp}`)
  check('Zombis 4/6', z.atk === 4 && z.hp === 6 && z.maxHp === 6, `${z.atk}/${z.hp}/${z.maxHp}`)
  recomputeAuras(g); recomputeAuras(g)
  check('pakartotinis perskaičiavimas nieko nekeičia', e.hp === 7 && e.maxHp === 7 && z.hp === 6)
}
console.log('\n── 2. Sužeistas padaras NEBEPAGYDOMAS perskaičiuojant (bug) ──')
{
  const g = freshGame(); g.you.units = [mkBoard(eldoras()), mkBoard(zombie()), null, null, null] as never
  recomputeAuras(g)
  const [e, z] = P(g, 'you').units as any[]
  e.hp -= 4; z.hp -= 3           // Eldoras 3/7, Zombis 3/6
  recomputeAuras(g); recomputeAuras(g); recomputeAuras(g)
  check('Eldoras lieka 3/7', e.hp === 3 && e.maxHp === 7, `${e.hp}/${e.maxHp}`)
  check('Zombis lieka 3/6', z.hp === 3 && z.maxHp === 6, `${z.hp}/${z.maxHp}`)
}
console.log('\n── 3. Auros šaltinis dingsta → HP apkarpomas, ne atimamas ──')
{
  const g = freshGame(); g.you.units = [mkBoard(eldoras()), mkBoard(zombie()), null, null, null] as never
  recomputeAuras(g)
  const z = (P(g, 'you').units as any[])[1]
  z.hp = 5                       // 5/6 (1 žala)
  g.you.units[0] = null; recomputeAuras(g)
  check('Zombis 2/4 → 4/4 (žala nusėda į buff\'ą)', z.atk === 2 && z.hp === 4 && z.maxHp === 4, `${z.atk}/${z.hp}/${z.maxHp}`)
  const z2 = z; z2.hp = 2        // 2/4 sužeistas
  g.you.units[0] = mkBoard(eldoras()); recomputeAuras(g)
  check('auros sugrįžimas: 2/4 → 4/6', z2.hp === 4 && z2.maxHp === 6, `${z2.hp}/${z2.maxHp}`)
}
console.log('\n── 4. Debuff aura gali nužudyti ──')
{
  const g = freshGame()
  const curse = mkCard({ name: 'Kenkėjas', uid: 'Kenkėjas', attack: 1, health: 5,
    gameplay: { passiveAura: { auraScope: 'enemy', auraHealth: -2 } } } as never)
  g.you.units = [mkBoard(curse), null, null, null, null] as never
  g.ai.units = [mkBoard(mkCard({ name: 'Silpnas', uid: 'Silpnas', attack: 1, health: 2 })), mkBoard(mkCard({ name: 'Stiprus', uid: 'Stiprus', attack: 1, health: 5 })), null, null, null] as never
  recomputeAuras(g)
  const alive = P(g, 'ai').units.filter(Boolean) as any[]
  check('Silpnas (2 HP) žūsta', !alive.some((u) => u.card.name === 'Silpnas'))
  const s = alive.find((u) => u.card.name === 'Stiprus')
  check('Stiprus 5 → 3/3', s && s.hp === 3 && s.maxHp === 3, s ? `${s.hp}/${s.maxHp}` : 'none')
  recomputeAuras(g)
  check('debuff nekaupiamas', s && s.hp === 3)
}
console.log(`\n${pass} pass, ${fail} fail`); if (fail) process.exit(1)
