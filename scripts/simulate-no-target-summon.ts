// ── Iškvietimas, kai kovos šūksniui reikia taikinio, bet TINKAMO nėra ─────────
// Pvz. Dr. Krudžas: „+1/0 kitam ZOMBIE padarui lauke". Be zombių lauke padaras
// turi būti iškviečiamas, o efektas – praleistas (ne įstrigti laukiant taikinio).
// Paleidimas: npm run game:test:notarget
import { createGame, beginTurn, playCard, P, type TutCard, type GameState } from '../src/lib/tutorial/engine'

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
function game(): GameState { const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 }); beginTurn(g); g.you.gold = 1000; return g }
const krudzas = () => mkCard({ name: 'Dr. Krudžas', uid: 'KRU', gold: 200, keywords: ['battlecry'],
  mappings: [{ trigger: 'onSummon', effect: 'buffAttack', value: 1, target: 'ownUnit', requiresSelection: true, targetSubtype: 'ZOMBIE' }] } as Partial<TutCard> & { name: string })

console.log('\n── 1. Lauke tik ne-zombiai → iškviečiamas be taikinio, nieko nepaveikia ──')
{
  const g = game()
  g.you.units[0] = mkBoard(mkCard({ name: 'Riteris', uid: 'R', subtype: 'HUMAN' } as Partial<TutCard> & { name: string }))
  g.you.hand.push(krudzas())
  const r = playCard(g, 'you', 'KRU')
  check('play ok', r.ok, JSON.stringify(r))
  check('Krudžas lauke', P(g, 'you').units.some((u) => u?.uid === 'KRU'))
  check('nelaukia taikinio', !g.pendingBattlecry, JSON.stringify(g.pendingBattlecry))
  check('Riteris nepaveiktas', P(g, 'you').units.find((u) => u?.uid === 'R')?.atk === 2)
}
console.log('\n── 2. Tuščias laukas → iškviečiamas ──')
{
  const g = game(); g.you.hand.push(krudzas())
  const r = playCard(g, 'you', 'KRU')
  check('play ok', r.ok && P(g, 'you').units.some((u) => u?.uid === 'KRU'), JSON.stringify(r))
}
console.log('\n── 3. Yra zombis → pasirinktas taikinys gauna +1 ──')
{
  const g = game()
  g.you.units[0] = mkBoard(mkCard({ name: 'Zombis', uid: 'Z', subtype: 'ZOMBIE' } as Partial<TutCard> & { name: string }))
  g.you.hand.push(krudzas())
  const r = playCard(g, 'you', 'KRU', { target: { kind: 'unit', side: 'you', uid: 'Z' } })
  check('play ok', r.ok, JSON.stringify(r))
  check('zombis 3 ATK', P(g, 'you').units.find((u) => u?.uid === 'Z')?.atk === 3, String(P(g, 'you').units.find((u) => u?.uid === 'Z')?.atk))
}
console.log('\n── 4. Ne-zombis kaip taikinys atmetamas ──')
{
  const g = game()
  g.you.units[0] = mkBoard(mkCard({ name: 'Riteris', uid: 'R', subtype: 'HUMAN' } as Partial<TutCard> & { name: string }))
  g.you.hand.push(krudzas())
  const r = playCard(g, 'you', 'KRU', { target: { kind: 'unit', side: 'you', uid: 'R' } })
  check('atmesta', !r.ok)
}
console.log('\n── 5. Krudžas pats ZOMBIS, kitų zombių nėra → savęs nestiprina ──')
{
  const g = game()
  const k = krudzas(); (k as { subtype?: string }).subtype = 'ZOMBIE'
  g.you.hand.push(k)
  const r = playCard(g, 'you', 'KRU')
  check('play ok', r.ok, JSON.stringify(r))
  check('Krudžas ATK nepakito (2)', P(g, 'you').units.find((u) => u?.uid === 'KRU')?.atk === 2, String(P(g, 'you').units.find((u) => u?.uid === 'KRU')?.atk))
}
console.log('\n── 6. AI žaidžia Krudžą (zombis) su kitu zombiu → stiprina KITĄ ──')
{
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'ai', { zmkDefs: ZMK0 }); beginTurn(g); g.ai.gold = 1000
  g.ai.units[0] = mkBoard(mkCard({ name: 'Zombis', uid: 'Z2', subtype: 'ZOMBIE' } as Partial<TutCard> & { name: string }))
  const k = krudzas(); (k as { subtype?: string }).subtype = 'ZOMBIE'; g.ai.hand.push(k)
  const r = playCard(g, 'ai', 'KRU')
  check('play ok', r.ok, JSON.stringify(r))
  check('kitas zombis 3 ATK', P(g, 'ai').units.find((u) => u?.uid === 'Z2')?.atk === 3)
  check('Krudžas 2 ATK', P(g, 'ai').units.find((u) => u?.uid === 'KRU')?.atk === 2)
}
console.log(`\n${pass} ok, ${fail} fail`)
if (fail) process.exit(1)
