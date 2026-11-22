// ── Iš kapinyno į kaladę su tipo filtru ir pasirinkimu (Elvira Melvija, 826) ──
// Paleidimas: npm run game:test:gravedeck
import { createGame, beginTurn, P, gameApi, resolveChoice, type TutCard } from '../src/lib/tutorial/engine'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name, extra) } else { fail++; console.log('  ✗ FAIL:', name, extra) }
}
const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return { id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3, type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [], ...over } as TutCard
}
const filler = (n: number, tag: string) => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))
const spell = (name: string, gold: number) => mkCard({ name, uid: name, type: 'spell', gold })
function fresh() {
  const g = createGame(filler(10, 'Y'), filler(10, 'A'), 'you', { zmkDefs: ZMK0 as never })
  beginTurn(g)
  return g
}
const grave = () => [mkCard({ name: 'U1' }), spell('S1', 100), mkCard({ name: 'U2' }), spell('S2', 300), spell('S3', 200), mkCard({ name: 'U3' })]

console.log('◆ žmogus, filtras „burtas", renkasi 2 iš 3')
{
  const g = fresh(); const p = P(g, 'you'); p.discard = grave(); const deck0 = p.deck.length
  gameApi.returnGraveyardToDeck(g, 'you', 2, { cardType: 'spell', choose: true })
  const pc = g.pendingChoice
  check('atsidaro pasirinkimas', !!pc && pc.kind === 'tutorHand' && pc.dest === 'deck')
  check('siūlomi tik burtai', !!pc?.cards && pc.cards.length === 3 && pc.cards.every((c) => c.type === 'spell'))
  check('pavadinimo raktas ir likutis', pc?.title === 'battleLog.chooseCardToDeck' && pc?.titleParams?.n === 2)
  resolveChoice(g, pc!.cards!.findIndex((c) => c.name === 'S1'))
  check('po 1-o: antras pasirinkimas, liko 1', !!g.pendingChoice && g.pendingChoice.remaining === 1 && g.pendingChoice.cards!.length === 2)
  check('S1 jau nebesiūloma', !g.pendingChoice!.cards!.some((c) => c.name === 'S1'))
  resolveChoice(g, g.pendingChoice!.cards!.findIndex((c) => c.name === 'S3'))
  check('po 2-o: pasirinkimas uždarytas', !g.pendingChoice)
  check('kaladėje +2, abu pasirinkti burtai', p.deck.length === deck0 + 2 && ['S1', 'S3'].every((n) => p.deck.some((c) => c.name === n)))
  check('kapinyne liko S2 ir 3 padarai', p.discard.length === 4 && p.discard.some((c) => c.name === 'S2') && p.discard.filter((c) => c.type === 'unit').length === 3)
  check('ranka nepakito', !p.hand.some((c) => c.type === 'spell'))
}
console.log('◆ žmogus, burtų tiek pat kiek reikia → be pasirinkimo')
{
  const g = fresh(); const p = P(g, 'you'); p.discard = [mkCard({ name: 'U1' }), spell('S1', 100), spell('S2', 300)]
  gameApi.returnGraveyardToDeck(g, 'you', 2, { cardType: 'spell', choose: true })
  check('pasirinkimo nėra', !g.pendingChoice)
  check('abu burtai kaladėje, padaras liko', p.discard.length === 1 && p.discard[0].name === 'U1' && p.deck.filter((c) => c.type === 'spell').length === 2)
}
console.log('◆ kapinyne nėra burtų')
{
  const g = fresh(); const p = P(g, 'you'); p.discard = [mkCard({ name: 'U1' }), mkCard({ name: 'U2' })]; const d0 = p.deck.length
  gameApi.returnGraveyardToDeck(g, 'you', 2, { cardType: 'spell', choose: true })
  check('nieko neįvyksta', !g.pendingChoice && p.deck.length === d0 && p.discard.length === 2)
}
console.log('◆ DI: automatiškai brangiausi burtai')
{
  const g = fresh(); const p = P(g, 'ai'); p.discard = grave(); const d0 = p.deck.length
  gameApi.returnGraveyardToDeck(g, 'ai', 2, { cardType: 'spell', choose: true })
  check('be pasirinkimo', !g.pendingChoice)
  check('grąžinti S2 ir S3 (brangiausi)', p.deck.length === d0 + 2 && ['S2', 'S3'].every((n) => p.deck.some((c) => c.name === n)) && p.discard.some((c) => c.name === 'S1'))
}
console.log('◆ senas elgesys be parinkčių (viršutinės N)')
{
  const g = fresh(); const p = P(g, 'you'); p.discard = grave(); const d0 = p.deck.length
  gameApi.returnGraveyardToDeck(g, 'you', 2)
  check('2 viršutinės (U3, S3) kaladėje', !g.pendingChoice && p.deck.length === d0 + 2 && ['U3', 'S3'].every((n) => p.deck.some((c) => c.name === n)))
}
console.log(`\n${pass} pass, ${fail} fail`)
if (fail) process.exit(1)
