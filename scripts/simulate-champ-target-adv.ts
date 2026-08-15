// ── Čempiono kelių taikinių gebėjimas + advAttackSelfOnly regresijos ─────────
// Paleidimas: npm run game:test:champtarget
// Dengia: useChampionAbility su targets[] (hitCount 2, requiresSelection) —
// žala TIK pasirinktiems; neteisėtas taikinys atmetamas PRIEŠ panaudojimą;
// advAttackSelfOnly — pranašumas galioja tik pačiai auros kortai puolant.

import {
  createGame, beginTurn, attack, useChampionAbility, P,
  type TutCard, type GameState, type BoardUnit,
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
const mkUnit = (c: TutCard, hp: number, over: Partial<BoardUnit> = {}): BoardUnit => ({
  uid: c.uid, card: c, atk: c.attack ?? 2, hp, maxHp: hp, shield: false, stealth: false,
  statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false, ...over,
} as BoardUnit)

function freshGame(): GameState {
  const g = createGame(filler(15, 'Y'), filler(15, 'A'), 'you', { zmkDefs: ZMK0 as never })
  beginTurn(g)
  return g
}

console.log('◆ Čempiono gebėjimas su 2 pasirinktais taikiniais')
{
  const g = freshGame()
  const champCard = mkCard({
    name: 'Prazaras Testinis', uid: 'champ1', type: 'champion',
    gameplay: {
      championSkillConfig: {
        skills: [{
          name: 'Dvigubas kirtis',
          mappings: [{ trigger: 'onChampionSkill', effect: 'damage', target: 'enemyUnit', value: 2, hitCount: 2, requiresSelection: true, triggersZmk: false } as EffectMapping],
        }],
      },
    } as never,
  })
  P(g, 'you').units[0] = mkUnit(champCard, 12, { isChampion: true, phase: 1 })
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'E1', uid: 'e1' }), 5)
  P(g, 'ai').units[1] = mkUnit(mkCard({ name: 'E2', uid: 'e2' }), 5)
  P(g, 'ai').units[2] = mkUnit(mkCard({ name: 'E3', uid: 'e3' }), 5)
  const r = useChampionAbility(g, 'you', 0, { targets: [{ kind: 'unit', side: 'ai', uid: 'e1' }, { kind: 'unit', side: 'ai', uid: 'e2' }] })
  check('gebėjimas ok', r.ok, JSON.stringify(r))
  const hp = (uid: string) => P(g, 'ai').units.find((u) => u?.uid === uid)?.hp
  check('žala teko 1-am pasirinktam (e1)', hp('e1') === 3, `e1=${hp('e1')}`)
  check('žala teko 2-am pasirinktam (e2)', hp('e2') === 3, `e2=${hp('e2')}`)
  check('nepasirinktas (e3) NEPALIESTAS — ne random', hp('e3') === 5, `e3=${hp('e3')}`)
}
{
  // Neteisėtas taikinys (savas padaras enemyUnit aibei) atmetamas PRIEŠ panaudojimą
  const g = freshGame()
  const champCard = mkCard({
    name: 'Prazaras Testinis', uid: 'champ2', type: 'champion',
    gameplay: {
      championSkillConfig: {
        skills: [{
          name: 'Dvigubas kirtis',
          mappings: [{ trigger: 'onChampionSkill', effect: 'damage', target: 'enemyUnit', value: 2, hitCount: 2, requiresSelection: true, triggersZmk: false } as EffectMapping],
        }],
      },
    } as never,
  })
  P(g, 'you').units[0] = mkUnit(champCard, 12, { isChampion: true, phase: 1 })
  P(g, 'you').units[1] = mkUnit(mkCard({ name: 'Savas', uid: 'savas' }), 5)
  P(g, 'ai').units[0] = mkUnit(mkCard({ name: 'E1', uid: 'e1b' }), 5)
  const r = useChampionAbility(g, 'you', 0, { targets: [{ kind: 'unit', side: 'you', uid: 'savas' }, { kind: 'unit', side: 'ai', uid: 'e1b' }] })
  check('neteisėtas taikinys atmetamas', !r.ok, JSON.stringify(r))
  const ch = P(g, 'you').units.find((u) => u?.uid === 'champ2')
  check('gebėjimas NEsunaudotas (galima rinktis iš naujo)', ch?.abilityUsed === false)
  check('savas padaras nepaliestas', P(g, 'you').units.find((u) => u?.uid === 'savas')?.hp === 5)
}

console.log('◆ advAttackSelfOnly — pranašumas tik pačiai kortai')
{
  const g = freshGame()
  const aura = mkCard({
    name: 'Chaoso Tarnaite', uid: 'tarnaite',
    gameplay: { passiveAura: { advAttack: 'advantage', advAttackSelfOnly: true } } as never,
  })
  P(g, 'you').units[0] = mkUnit(aura, 6)
  P(g, 'you').units[1] = mkUnit(mkCard({ name: 'Kitas', uid: 'kitas' }), 6)
  const before1 = P(g, 'you').zmk.length
  attack(g, 'you', 'kitas', { kind: 'player', side: 'ai' })
  const used1 = before1 - P(g, 'you').zmk.length
  check('KITAS padaras puola BE pranašumo (1 ŽMK korta)', used1 === 1, `used=${used1}`)
  const before2 = P(g, 'you').zmk.length
  attack(g, 'you', 'tarnaite', { kind: 'player', side: 'ai' })
  const used2 = before2 - P(g, 'you').zmk.length
  check('PATI aura korta puola SU pranašumu (2 ŽMK kortos)', used2 === 2, `used=${used2}`)
}
{
  // Kontrolė: be selfOnly vėliavos pranašumas lieka visai pusei (senas elgesys)
  const g = freshGame()
  const aura = mkCard({
    name: 'Sena Aura', uid: 'sena',
    gameplay: { passiveAura: { advAttack: 'advantage' } } as never,
  })
  P(g, 'you').units[0] = mkUnit(aura, 6)
  P(g, 'you').units[1] = mkUnit(mkCard({ name: 'Kitas2', uid: 'kitas2' }), 6)
  const before = P(g, 'you').zmk.length
  attack(g, 'you', 'kitas2', { kind: 'player', side: 'ai' })
  const used = before - P(g, 'you').zmk.length
  check('be vėliavos kitas padaras puola SU pranašumu (2 ŽMK kortos)', used === 2, `used=${used}`)
}

console.log(`\n${pass} ✓ / ${fail} ✗`)
process.exit(fail ? 1 : 0)
