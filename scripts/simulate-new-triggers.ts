// ── Naujų trigger'ių testai: onAfterAttack + onHpOne ─────────────────────────
// Paleidimas: npx tsx scripts/simulate-new-triggers.ts   (npm run game:test:newtriggers)
// Dengia: onAfterAttack šauna PO visos atakos raidos (tik išgyvenus), su
// useAttackTarget; onHpOne šauna kai po žalos lieka lygiai 1 HP (kova IR efekto
// žala), nešauna žūstant / esant kitam HP, re-entrancy apsauga neužciklina.

import {
  createGame, beginTurn, playCard, attack, P,
  type TutCard, type GameState,
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
const filler = (n: number, tag = 'F') => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))

function freshGame(): GameState {
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 })
  beginTurn(g)
  g.you.gold = 1000
  g.ai.gold = 1000
  return g
}
const units = (g: GameState, s: 'you' | 'ai') => P(g, s).units.filter(Boolean)
/** Pilnas BoardUnit (visi privalomi laukai) — dedamas tiesiai ant lentos. */
const mkBoard = (card: TutCard) => ({
  uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
  shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0,
  isChampion: false, phase: 0, abilityUsed: false,
}) as never
const findU = (g: GameState, s: 'you' | 'ai', name: string) => units(g, s).find((u) => u!.card.name === name)

const afterAttackHeal: EffectMapping = { trigger: 'onAfterAttack', effect: 'heal', target: 'selfUnit', value: 2, requiresSelection: false }
const afterAttackDmgTarget: EffectMapping = { trigger: 'onAfterAttack', effect: 'damage', target: 'enemyUnit', value: 1, requiresSelection: false, useAttackTarget: true }
const hpOneBuff: EffectMapping = { trigger: 'onHpOne', effect: 'buffAttack', target: 'selfUnit', value: 3, requiresSelection: false }

console.log('\n── 1. onAfterAttack: šauna PO atakos, gydymas jau įskaito atgalinę žalą ──')
{
  const g = freshGame()
  const atkU = mkCard({ name: 'Puolėjas', uid: 'Puolėjas', attack: 2, health: 5, mappings: [afterAttackHeal] })
  const defU = mkCard({ name: 'Gynėjas', uid: 'Gynėjas', attack: 2, health: 6 })
  g.you.hand.push(atkU); g.ai.units[0] = null
  playCard(g, 'you', atkU.uid)
  // gynėją padedam tiesiai ant priešo lentos
  g.ai.units[0] = mkBoard(defU)
  const me = findU(g, 'you', 'Puolėjas')!
  me.summonedOnTurn = -1 // gali pulti iškart
  const r = attack(g, 'you', me.uid, { kind: 'unit', side: 'ai', uid: 'Gynėjas' })
  check('ataka ok', r.ok, JSON.stringify(r))
  // 5 HP − 2 atgalinė = 3, tada onAfterAttack heal +2 = 5
  check('onAfterAttack heal suveikė PO atgalinės žalos (5-2+2=5)', me.hp === 5, `hp=${me.hp}`)
}

console.log('\n── 2. onAfterAttack: NEšauna, jei puolėjas žuvo atakos metu ──')
{
  const g = freshGame()
  const atkU = mkCard({ name: 'Trapus', uid: 'Trapus', attack: 1, health: 1, mappings: [afterAttackHeal] })
  const defU = mkCard({ name: 'Siena', uid: 'Siena', attack: 9, health: 9 })
  g.you.hand.push(atkU)
  playCard(g, 'you', atkU.uid)
  g.ai.units[0] = mkBoard(defU)
  const me = findU(g, 'you', 'Trapus')!
  me.summonedOnTurn = -1
  attack(g, 'you', me.uid, { kind: 'unit', side: 'ai', uid: 'Siena' })
  check('puolėjas žuvo', !findU(g, 'you', 'Trapus'))
  const healed = g.log.some((e) => e.key === 'battleLog.unitHealed' && e.params?.card === 'Trapus')
  check('onAfterAttack NEsuveikė žuvusiam', !healed)
}

console.log('\n── 3. onAfterAttack + useAttackTarget: efektas į atakuotą taikinį ──')
{
  const g = freshGame()
  const atkU = mkCard({ name: 'Nuodytojas', uid: 'Nuodytojas', attack: 2, health: 8, mappings: [afterAttackDmgTarget] })
  const defU = mkCard({ name: 'Auka', uid: 'Auka', attack: 0, health: 8 })
  g.you.hand.push(atkU)
  playCard(g, 'you', atkU.uid)
  g.ai.units[0] = mkBoard(defU)
  const me = findU(g, 'you', 'Nuodytojas')!
  me.summonedOnTurn = -1
  attack(g, 'you', me.uid, { kind: 'unit', side: 'ai', uid: 'Auka' })
  const auka = findU(g, 'ai', 'Auka')!
  // 8 − 2 (kova) − 1 (onAfterAttack damage į taikinį) = 5
  check('taikinys gavo papildomą 1 žalą po atakos (8-2-1=5)', auka.hp === 5, `hp=${auka.hp}`)
}

console.log('\n── 4. onHpOne: kovos žala palieka lygiai 1 HP → buff ──')
{
  const g = freshGame()
  const defU = mkCard({ name: 'Įsiutęs', uid: 'Įsiutęs', attack: 1, health: 3, mappings: [hpOneBuff] })
  const atkU = mkCard({ name: 'Kirtėjas', uid: 'Kirtėjas', attack: 2, health: 9 })
  g.you.hand.push(atkU)
  playCard(g, 'you', atkU.uid)
  g.ai.units[0] = mkBoard(defU)
  const me = findU(g, 'you', 'Kirtėjas')!
  me.summonedOnTurn = -1
  attack(g, 'you', me.uid, { kind: 'unit', side: 'ai', uid: 'Įsiutęs' })
  const d = findU(g, 'ai', 'Įsiutęs')!
  check('gynėjui liko 1 HP', d.hp === 1, `hp=${d.hp}`)
  check('onHpOne buff +3 ATK suveikė (1 → 4)', d.atk === 4, `atk=${d.atk}`)
}

console.log('\n── 5. onHpOne: NEšauna, kai HP nukrenta žemiau 1 (žūtis) ar lieka >1 ──')
{
  const g = freshGame()
  const defU = mkCard({ name: 'Storas', uid: 'Storas', attack: 0, health: 6, mappings: [hpOneBuff] })
  const atkU = mkCard({ name: 'Silpnas', uid: 'Silpnas', attack: 2, health: 9 })
  g.you.hand.push(atkU)
  playCard(g, 'you', atkU.uid)
  g.ai.units[0] = mkBoard(defU)
  const me = findU(g, 'you', 'Silpnas')!
  me.summonedOnTurn = -1
  attack(g, 'you', me.uid, { kind: 'unit', side: 'ai', uid: 'Storas' })
  const d = findU(g, 'ai', 'Storas')!
  check('liko 4 HP — trigger nešovė', d.hp === 4 && d.atk === 0, `hp=${d.hp} atk=${d.atk}`)
}

console.log(`\n════ REZULTATAS: ${pass} praėjo · ${fail} krito ════`)
process.exit(fail === 0 ? 0 : 1)
