// ── PvP veiksmų teisių patikra (756, auditas 2026-11-11) ─────────────────────
// Paleidimas: npx tsx scripts/simulate-pvp-guard.ts   (npm run game:test:pvpguard)
// Host režime svečias ('ai' seat) negali veikti host'o vardu, ne savo ėjime,
// baigti svetimo ėjimo ar spręsti svetimų pasirinkimų.
import { createGame, beginTurn, applyNetAction, type TutCard, type GameState, type NetAction } from '../src/lib/tutorial/engine'
import { netActionNotAllowed } from '../src/lib/pvp/guard'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗ FAIL:', name, extra) }
}
function mk(name: string): TutCard {
  return { id: name, uid: name, name, image: null, gold: 0, attack: 2, health: 3, type: 'unit', keywords: [], effectText: '',
    rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [] } as unknown as TutCard
}
const filler = (n: number, tag: string) => Array.from({ length: n }, (_, i) => mk(`${tag}${i}`))
const fresh = (first: 'you' | 'ai'): GameState => { const g = createGame(filler(30, 'X'), filler(30, 'A'), first); beginTurn(g); return g }
const ok = (g: GameState, a: NetAction) => netActionNotAllowed(g, 'ai', a) === null

console.log('\n── Host\'o ėjimas (active = you) ──')
{
  const g = fresh('you')
  const hostCard = g.you.hand[0].uid, guestCard = g.ai.hand[0].uid
  check('svečias negali baigti host\'o ėjimo (actor ai)', !ok(g, { t: 'endTurn', actor: 'ai' }))
  check('svečias negali apsimesti host\'u (endTurn actor you)', !ok(g, { t: 'endTurn', actor: 'you' }))
  check('svečias negali žaisti host\'o kortos host\'o vardu', !ok(g, { t: 'play', actor: 'you', uid: hostCard }))
  check('svečias negali žaisti savo kortos ne savo ėjime', !ok(g, { t: 'play', actor: 'ai', uid: guestCard }))
  check('attack / champ / discardForGold / swapChampPhase – ne', !ok(g, { t: 'attack', actor: 'ai', uid: 'x', target: { kind: 'player', side: 'you' } })
    && !ok(g, { t: 'champ', actor: 'ai', skillIndex: 0 }) && !ok(g, { t: 'discardForGold', actor: 'ai', uid: guestCard }) && !ok(g, { t: 'swapChampPhase', actor: 'ai', uid: 'x', phase: 2 }))
  check('advanceSummon iš tinklo nepriimamas', !ok(g, { t: 'advanceSummon' }))
  check('resolveChoice be laukiančio pasirinkimo host\'o ėjime – ne', !ok(g, { t: 'resolveChoice', index: 0 }))
  check('šiukšlė vietoje veiksmo – ne', !ok(g, null as unknown as NetAction) && !ok(g, { t: 'nesamas' } as unknown as NetAction))
  // variklis pats: ne aktyvios pusės endTurn nebebaigia ėjimo
  const r = applyNetAction(g, { t: 'endTurn', actor: 'ai' })
  check('applyNetAction endTurn ne aktyviai pusei atmetamas, active nepakito', !r.ok && g.active === 'you', JSON.stringify(r))
}
console.log('\n── Svečio ėjimas (active = ai) ──')
{
  const g = fresh('ai')
  const guestCard = g.ai.hand[0].uid, hostCard = g.you.hand[0].uid
  check('svečias gali žaisti savo kortą', ok(g, { t: 'play', actor: 'ai', uid: guestCard }))
  check('svečias gali baigti SAVO ėjimą', ok(g, { t: 'endTurn', actor: 'ai' }))
  check('bet ne host\'o vardu', !ok(g, { t: 'play', actor: 'you', uid: hostCard }) && !ok(g, { t: 'endTurn', actor: 'you' }))
  const r = applyNetAction(g, { t: 'endTurn', actor: 'ai' })
  check('applyNetAction endTurn aktyviai pusei veikia', r.ok && g.active === 'you')
}
console.log('\n── Pasirinkimai (pending) ──')
{
  const g = fresh('you')
  g.pendingChoice = { caster: 'you' } as never
  check('host\'o pasirinkimo svečias nesprendžia', !ok(g, { t: 'resolveChoice', index: 0 }))
  g.pendingChoice = { caster: 'you', chooser: 'ai' } as never
  check('jei rinktis turi svečias (chooser) – gali ir host\'o ėjime', ok(g, { t: 'resolveChoice', index: 0 }))
  g.pendingChoice = null
  g.pendingLastwish = { side: 'ai', cardName: 'x', mappings: [] }
  check('savo Paskutinio noro taikinį – gali', ok(g, { t: 'resolveLastwish', targets: [] }))
  g.pendingLastwish = { side: 'you', cardName: 'x', mappings: [] }
  check('host\'o Paskutinio noro – ne', !ok(g, { t: 'resolveLastwish', targets: [] }))
  g.pendingReveal = { caster: 'ai' } as never
  check('clearReveal – tik savo peržiūrai', ok(g, { t: 'clearReveal' }))
  g.pendingReveal = { caster: 'you' } as never
  check('clearReveal svetimai – ne', !ok(g, { t: 'clearReveal' }))
}
console.log('\n── Mulligan ──')
{
  const g = fresh('you')
  g.pendingMulligan = { you: true, ai: true, auto: false }
  check('kol laukiama svečio keitimo – gali', ok(g, { t: 'mulligan', actor: 'ai', uids: [] }))
  check('host\'o vardu – ne', !ok(g, { t: 'mulligan', actor: 'you', uids: [] }))
  g.pendingMulligan = { you: true, ai: false, auto: false }
  check('jau atlikęs – antrą kartą ne', !ok(g, { t: 'mulligan', actor: 'ai', uids: [] }))
}
console.log(`\n${pass} ✓ / ${fail} ✗`); if (fail) process.exit(1)
