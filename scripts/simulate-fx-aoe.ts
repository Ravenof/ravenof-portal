// ── FX žymės AoE efektams (768) ───────────────────────────────────────────────
// Paleidimas: npm run game:test:fxaoe
// Tikrina, kad variklis teisingai pažymi zonos efektus vaizdui (fxSource: aoe / aoeKind / aoeFx / aoeUids)
// ir kad žymė NEkeičia žaidimo būsenos.
import { createGame, beginTurn, playCard, type TutCard, type GameState } from '../src/lib/tutorial/engine'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗ FAIL:', name, extra) } }
const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
function mk(over: Record<string, unknown> & { name: string }): TutCard {
  return { id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 5, type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [], ...over } as TutCard
}
const filler = (n: number, tag: string) => Array.from({ length: n }, (_, i) => mk({ name: `${tag}${i}`, uid: `${tag}${i}` }))
const B = (card: TutCard) => ({ uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false }) as never
const row = (...u: unknown[]) => [...u, null, null, null, null, null].slice(0, 5) as never
type Ev = { t: string; aoe?: boolean; aoeKind?: string; aoeFx?: string; aoeUids?: string[] }
function cast(mapping: Record<string, unknown>, enemies = 3, own = 3): { g: GameState; fx: Ev[] } {
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 } as never); beginTurn(g)
  g.ai.units = row(...Array.from({ length: enemies }, (_, i) => B(mk({ name: 'E' + i }))))
  g.you.units = row(...Array.from({ length: own }, (_, i) => B(mk({ name: 'O' + i }))))
  g.you.hand.push(mk({ name: 'Sp', type: 'spell', gold: 0, mappings: [{ trigger: 'onPlay', requiresSelection: false, value: 1, ...mapping }] }))
  const n0 = g.log.length
  playCard(g, 'you', 'Sp')
  return { g, fx: (g.log.slice(n0) as unknown as Ev[]).filter((e) => e.t === 'fxSource' && (e.aoe || e.aoeKind)) }
}
console.log('\n── 1. Ne žalos efektai visai zonai gauna žymę su numatytuoju AoE ──')
for (const [effect, target, want] of [['buffAttack', 'allOwnUnits', 'radiance'], ['shield', 'allOwnUnits', 'radiance'], ['freeze', 'allEnemyUnits', 'blizzard'], ['stun', 'allEnemyUnits', 'chain'], ['poison', 'allEnemyUnits', 'toxic'], ['debuffAttack', 'allEnemyUnits', 'void'], ['silence', 'allEnemyUnits', 'void']] as const) {
  const { fx } = cast({ effect, target })
  const m = fx.find((e) => e.aoeKind === effect)
  check(`${effect} → ${want}, 3 padarai`, !!m && m.aoeFx === want && m.aoeUids?.length === 3 && !m.aoe, JSON.stringify(fx))
}
console.log('\n── 2. Admin parinkimas ──')
{ const { fx } = cast({ effect: 'buffAttack', target: 'allOwnUnits', fxAoe: 'bloom' }); check('fxAoe perrašo numatytąjį', fx.some((e) => e.aoeKind === 'buffAttack' && e.aoeFx === 'bloom'), JSON.stringify(fx)) }
{ const { fx } = cast({ effect: 'buffAttack', target: 'allOwnUnits', fxAoe: 'none' }); check("fxAoe 'none' – žymės nėra", fx.length === 0, JSON.stringify(fx)) }
{ const { fx } = cast({ effect: 'damage', target: 'allEnemyUnits', fxAoe: 'reap' }); check('AoE žala: aoe + parinktas aoeFx', fx.some((e) => e.aoe && e.aoeFx === 'reap'), JSON.stringify(fx)) }
{ const { fx } = cast({ effect: 'damage', target: 'allEnemyUnits' }); check('AoE žala be parinkimo: aoe, aoeFx tuščias', fx.length === 1 && !!fx[0].aoe && !fx[0].aoeFx && !fx[0].aoeKind, JSON.stringify(fx)) }
console.log('\n── 3. Kada žymės NEturi būti ──')
{ const { fx } = cast({ effect: 'buffAttack', target: 'allOwnUnits' }, 3, 1); check('vienas padaras zonoje – žymės nėra', fx.length === 0, JSON.stringify(fx)) }
{ const { fx } = cast({ effect: 'drawCards', target: 'self' }); check('efektas be zonos vaizdo (drawCards) – žymės nėra', fx.length === 0, JSON.stringify(fx)) }
{ const { fx } = cast({ effect: 'returnToHand', target: 'allEnemyUnits' }); check('efektas be numatytojo AoE (returnToHand) – žymės nėra', fx.length === 0, JSON.stringify(fx)) }
console.log('\n── 4. Žymė nekeičia žaidimo būsenos ──')
{ const a = cast({ effect: 'buffAttack', target: 'allOwnUnits', value: 2 }).g, b = cast({ effect: 'buffAttack', target: 'allOwnUnits', value: 2, fxAoe: 'none' }).g
  const atk = (g: GameState) => g.you.units.map((u) => (u as unknown as { atk: number } | null)?.atk ?? null).join()
  check('+2 ATK visiems vienodai su žyme ir be jos', atk(a) === atk(b) && atk(a).startsWith('4,4,4'), atk(a) + ' | ' + atk(b)) }
console.log(`\n${pass} ✓ / ${fail} ✗`); process.exit(fail ? 1 : 0)
