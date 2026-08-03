// ── Rankinio taikinio VALIDACIJOS testai (variklio pusė) ─────────────────────
// Paleidimas: npx tsx scripts/simulate-target-validation.ts  (npm run game:test:targetcheck)
// Dengia: mapping'as su targetHasStatus (pvz. „sunaikink padarą su Provoke")
// NEBEgali būti taikomas į bet ką — playCard / resolvePendingBattlecry atmeta
// netinkamą taikinį NEpakeisdami būsenos (auksas/ranka/pending lieka).

import {
  createGame, beginTurn, playCard, resolvePendingBattlecry, useChampionAbility, P,
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
const mkBoard = (card: TutCard) => ({
  uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
  shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0,
  isChampion: false, phase: 0, abilityUsed: false,
}) as never
const findU = (g: GameState, s: 'you' | 'ai', name: string) => units(g, s).find((u) => u!.card.name === name)

// „Sunaikink priešo padarą su Provoke" — žaidėjas renkasi taikinį
const destroyTaunt: EffectMapping = { trigger: 'onCast', effect: 'destroy', target: 'enemyUnit', requiresSelection: true, targetHasStatus: 'taunt' }
// Kovos šūksnis: 2 žalos padarui su Provoke
const bcDmgTaunt: EffectMapping = { trigger: 'onSummon', effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: true, targetHasStatus: 'taunt' }

console.log('\n── 1. Burtas „destroy + tik Provoke": netinkamas taikinys ATMETAMAS ──')
{
  const g = freshGame()
  const spell = mkCard({ name: 'Egzekucija', uid: 'Egzekucija', type: 'spell', gold: 300, mappings: [destroyTaunt] })
  g.you.hand.push(spell)
  g.ai.units[0] = mkBoard(mkCard({ name: 'Provokas', uid: 'Provokas', keywords: ['taunt'], health: 4 }))
  g.ai.units[1] = mkBoard(mkCard({ name: 'Paprastas', uid: 'Paprastas', health: 4 }))
  const goldBefore = g.you.gold
  const r1 = playCard(g, 'you', spell.uid, { target: { kind: 'unit', side: 'ai', uid: 'Paprastas' } })
  check('atmetė be-Provoke taikinį', !r1.ok && r1.reason === 'battleLog.err.invalidTarget', JSON.stringify(r1))
  check('auksas nenuskaičiuotas', g.you.gold === goldBefore, `gold=${g.you.gold}`)
  check('korta liko rankoje', g.you.hand.some((c) => c.uid === 'Egzekucija'))
  check('padaras nesunaikintas', !!findU(g, 'ai', 'Paprastas'))
  const r2 = playCard(g, 'you', spell.uid, { target: { kind: 'unit', side: 'ai', uid: 'Provokas' } })
  check('Provoke taikinys priimtas', r2.ok, JSON.stringify(r2))
  check('Provoke padaras sunaikintas', !findU(g, 'ai', 'Provokas'))
}

console.log('\n── 2. Kovos šūksnis su filtru: netinkamas pasirinkimas → pending LIEKA ──')
{
  const g = freshGame()
  // pendingBattlecry kuriamas special summon'ų metu (fireEntryMappings) — testui
  // padarą dedam ant lentos ir pending nustatom tiesiogiai (kaip po iškvietimo).
  const u = mkCard({ name: 'Baudėjas', uid: 'Baudėjas', keywords: ['battlecry'], mappings: [bcDmgTaunt] })
  g.you.units[0] = mkBoard(u)
  g.ai.units[0] = mkBoard(mkCard({ name: 'Provokas2', uid: 'Provokas2', keywords: ['taunt'], health: 5 }))
  g.ai.units[1] = mkBoard(mkCard({ name: 'Paprastas2', uid: 'Paprastas2', health: 5 }))
  g.pendingBattlecry = { side: 'you', uid: 'Baudėjas', rounds: 1, idx: [0] }
  const r1 = resolvePendingBattlecry(g, { kind: 'unit', side: 'ai', uid: 'Paprastas2' })
  check('atmetė be-Provoke taikinį', !r1.ok && r1.reason === 'battleLog.err.invalidTarget', JSON.stringify(r1))
  check('pendingBattlecry LIKO (renkamasi iš naujo)', g.pendingBattlecry?.uid === 'Baudėjas')
  check('niekas negavo žalos', findU(g, 'ai', 'Paprastas2')!.hp === 5 && findU(g, 'ai', 'Provokas2')!.hp === 5)
  const r2 = resolvePendingBattlecry(g, { kind: 'unit', side: 'ai', uid: 'Provokas2' })
  check('Provoke taikinys priimtas', r2.ok)
  check('Provoke padaras gavo 2 žalos (5→3)', findU(g, 'ai', 'Provokas2')!.hp === 3, `hp=${findU(g, 'ai', 'Provokas2')?.hp}`)
  check('pending išspręstas', !g.pendingBattlecry)
}

console.log('\n── 3. Sėlinantis priešo padaras – rankiniu būdu netaikomas ──')
{
  const g = freshGame()
  const spell = mkCard({ name: 'Strėlė', uid: 'Strėlė', type: 'spell', gold: 100, mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: true }] })
  g.you.hand.push(spell)
  g.ai.units[0] = mkBoard(mkCard({ name: 'Šešėlis', uid: 'Šešėlis', health: 4 }))
  const sh = findU(g, 'ai', 'Šešėlis')! as { stealth: boolean }
  sh.stealth = true
  const r = playCard(g, 'you', spell.uid, { target: { kind: 'unit', side: 'ai', uid: 'Šešėlis' } })
  check('sėlinantis taikinys atmestas', !r.ok && r.reason === 'battleLog.err.invalidTarget', JSON.stringify(r))
}

console.log('\n── 4. Be filtro – bet kuris priešo padaras tebėra teisėtas ──')
{
  const g = freshGame()
  const spell = mkCard({ name: 'Ugnis', uid: 'Ugnis', type: 'spell', gold: 100, mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: true }] })
  g.you.hand.push(spell)
  g.ai.units[0] = mkBoard(mkCard({ name: 'Betkas', uid: 'Betkas', health: 4 }))
  const r = playCard(g, 'you', spell.uid, { target: { kind: 'unit', side: 'ai', uid: 'Betkas' } })
  check('paprastas taikinys priimtas', r.ok, JSON.stringify(r))
  check('gavo 2 žalos (4→2)', findU(g, 'ai', 'Betkas')!.hp === 2, `hp=${findU(g, 'ai', 'Betkas')?.hp}`)
}


console.log('\n── 5. Čempiono skill su rankiniu taikiniu: vykdo į pasirinktą, atmeta netinkamą ──')
{
  const g = freshGame()
  const champ = mkCard({ name: 'Lisarijus', uid: 'Lisarijus', attack: 2, health: 9, mappings: [
    { trigger: 'onSummon', effect: 'damage', target: 'enemyUnit', value: 2, requiresSelection: true, targetHasStatus: 'taunt' },
  ] })
  const cu = mkBoard(champ) as { isChampion: boolean; phase: number; uid: string }
  cu.isChampion = true; cu.phase = 1
  g.you.units[0] = cu as never
  g.ai.units[0] = mkBoard(mkCard({ name: 'ProvokasC', uid: 'ProvokasC', keywords: ['taunt'], health: 6 }))
  g.ai.units[1] = mkBoard(mkCard({ name: 'PaprastasC', uid: 'PaprastasC', health: 6 }))
  const r1 = useChampionAbility(g, 'you', 0, { target: { kind: 'unit', side: 'ai', uid: 'PaprastasC' } })
  check('atmetė be-Provoke taikinį', !r1.ok && r1.reason === 'battleLog.err.invalidTarget', JSON.stringify(r1))
  const chAfter = findU(g, 'you', 'Lisarijus')! as { abilityUsed: boolean }
  check('gebėjimas NEpažymėtas panaudotu', chAfter.abilityUsed === false)
  const r2 = useChampionAbility(g, 'you', 0, { target: { kind: 'unit', side: 'ai', uid: 'ProvokasC' } })
  check('Provoke taikinys priimtas', r2.ok, JSON.stringify(r2))
  check('žala į PASIRINKTĄ taikinį (6→4)', findU(g, 'ai', 'ProvokasC')!.hp === 4, `hp=${findU(g, 'ai', 'ProvokasC')?.hp}`)
  check('kitas nepaliestas', findU(g, 'ai', 'PaprastasC')!.hp === 6)
}

console.log(`\n════ REZULTATAS: ${pass} praėjo · ${fail} krito ════`)
process.exit(fail === 0 ? 0 : 1)
