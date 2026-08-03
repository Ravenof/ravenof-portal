// ── castEffectFromGraveyard testai: panaudok kapinyno kortos efektą iškart ────
// Paleidimas: npx tsx scripts/simulate-cast-from-grave.ts  (npm run game:test:castgrave)
// Dengia: pop-up parinktys iš abiejų kapinynų, trigger filtras (battlecry /
// lastwish / visi), resolveCopy vykdymas, AI auto, „nėra tinkamų kortų" atvejis.

import {
  createGame, beginTurn, playCard, resolveCopyEffect, P,
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
const mkBoard = (card: TutCard) => ({
  uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
  shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0,
  isChampion: false, phase: 0, abilityUsed: false,
}) as never
const findU = (g: GameState, s: 'you' | 'ai', name: string) => P(g, s).units.filter(Boolean).find((u) => u!.card.name === name)

// Kapinyno kortos su skirtingais efektais:
const bcDmg: EffectMapping = { trigger: 'onSummon', effect: 'damage', target: 'enemyUnit', value: 3, requiresSelection: false }
const lwHeal: EffectMapping = { trigger: 'onDeath', effect: 'heal', target: 'self', value: 4, requiresSelection: false }
const graveBc = () => mkCard({ name: 'Ugniakalvis', uid: 'Ugniakalvis', mappings: [bcDmg] })
const graveLw = () => mkCard({ name: 'Gydūnė', uid: 'Gydūnė', mappings: [lwHeal] })

// Burtas: panaudok efektą iš bet kurio kapinyno (be filtro)
const castAny = (): TutCard => mkCard({ name: 'Aidas', uid: 'Aidas', type: 'spell', gold: 100, mappings: [{ trigger: 'onCast', effect: 'castEffectFromGraveyard', target: 'self', requiresSelection: false }] })

console.log('\n── 1. Be filtro: parinktys iš ABIEJŲ kapinynų, resolve vykdo efektą ──')
{
  const g = freshGame()
  g.you.discard.push(graveLw())        // sava kapinyno korta (onDeath heal)
  g.ai.discard.push(graveBc())         // priešo kapinyno korta (onSummon dmg)
  g.ai.units[0] = mkBoard(mkCard({ name: 'Auka', uid: 'Auka', attack: 0, health: 9 }))
  g.you.hand.push(castAny())
  const r = playCard(g, 'you', 'Aidas')
  check('burtas sužaistas, laukiama pasirinkimo', r.ok && g.pendingCopy?.mode === 'cast', JSON.stringify(g.pendingCopy?.mode))
  check('parinktys iš abiejų kapinynų (2)', g.pendingCopy?.options.length === 2, `n=${g.pendingCopy?.options.length}`)
  resolveCopyEffect(g, 'Ugniakalvis')  // pasirenkam PRIEŠO kapinyno battlecry
  check('priešo kortos efektas įvykdytas (9−3=6)', findU(g, 'ai', 'Auka')!.hp === 6, `hp=${findU(g, 'ai', 'Auka')?.hp}`)
  check('pendingCopy išspręstas', !g.pendingCopy)
  check('kapinyno korta LIKO kapinyne (nekopijuojama į lauką)', g.ai.discard.some((c) => c.uid === 'Ugniakalvis'))
}

console.log('\n── 2. Filtras battlecry: rodomos TIK kortos su Kovos šūksniu ──')
{
  const g = freshGame()
  g.you.discard.push(graveLw())
  g.ai.discard.push(graveBc())
  const spell = mkCard({ name: 'AidasBC', uid: 'AidasBC', type: 'spell', gold: 100, mappings: [{ trigger: 'onCast', effect: 'castEffectFromGraveyard', target: 'self', requiresSelection: false, castTriggerFilter: 'battlecry' }] })
  g.you.hand.push(spell)
  playCard(g, 'you', 'AidasBC')
  check('tik 1 parinktis (Gydūnės onDeath atfiltruotas)', g.pendingCopy?.options.length === 1 && g.pendingCopy.options[0].card.uid === 'Ugniakalvis', JSON.stringify(g.pendingCopy?.options.map((o) => o.card.uid)))
}

console.log('\n── 3. Filtras lastwish: vykdomas tik onDeath efektas ──')
{
  const g = freshGame()
  g.you.hp = 20
  g.you.discard.push(graveLw())
  g.ai.discard.push(graveBc())
  const spell = mkCard({ name: 'AidasLW', uid: 'AidasLW', type: 'spell', gold: 100, mappings: [{ trigger: 'onCast', effect: 'castEffectFromGraveyard', target: 'self', requiresSelection: false, castTriggerFilter: 'lastwish' }] })
  g.you.hand.push(spell)
  playCard(g, 'you', 'AidasLW')
  check('tik 1 parinktis (Gydūnė)', g.pendingCopy?.options.length === 1 && g.pendingCopy.options[0].card.uid === 'Gydūnė', JSON.stringify(g.pendingCopy?.options.map((o) => o.card.uid)))
  resolveCopyEffect(g, 'Gydūnė')
  check('Paskutinio noro heal +4 (20→24)', g.you.hp === 24, `hp=${g.you.hp}`)
}

console.log('\n── 4. Nėra tinkamų kortų → blokuota, be pop-up ──')
{
  const g = freshGame()
  g.you.discard.push(graveLw())  // tik onDeath
  const spell = mkCard({ name: 'AidasT', uid: 'AidasT', type: 'spell', gold: 100, mappings: [{ trigger: 'onCast', effect: 'castEffectFromGraveyard', target: 'self', requiresSelection: false, castTriggerFilter: 'battlecry', copyFromSide: 'own' }] })
  g.you.hand.push(spell)
  const r = playCard(g, 'you', 'AidasT')
  check('sužaista be pop-up', r.ok && !g.pendingCopy, JSON.stringify(g.pendingCopy ?? null))
  check('užfiksuotas „nėra taikinio" log', g.log.some((e) => e.key === 'battleLog.castFxNoGraveTarget'))
}

console.log('\n── 5. AI: auto-pasirenka ir įvykdo be pop-up ──')
{
  const g = freshGame()
  g.you.units[0] = mkBoard(mkCard({ name: 'ManoPadaras', uid: 'ManoPadaras', attack: 0, health: 9 }))
  g.you.discard.push(graveBc())  // AI ims iš PRIEŠO (mano) kapinyno
  const spell = mkCard({ name: 'AidasAI', uid: 'AidasAI', type: 'spell', gold: 100, mappings: [{ trigger: 'onCast', effect: 'castEffectFromGraveyard', target: 'self', requiresSelection: false }] })
  g.active = 'ai'
  g.ai.hand.push(spell)
  playCard(g, 'ai', 'AidasAI')
  check('be pop-up (AI auto)', !g.pendingCopy)
  check('efektas įvykdytas prieš mano padarą (9−3=6)', findU(g, 'you', 'ManoPadaras')!.hp === 6, `hp=${findU(g, 'you', 'ManoPadaras')?.hp}`)
}


console.log('\n── 6. Izmoris: glwActivateNow=false — TIK nukopijuoja kaip savo Paskutinį norą ──')
{
  const g = freshGame()
  g.you.hp = 20
  g.you.discard.push(graveLw())  // Gydūnė: onDeath heal self +4
  const izmoris = mkCard({
    name: 'Izmoris', uid: 'Izmoris', attack: 3, health: 5, keywords: ['battlecry'],
    mappings: [{ trigger: 'onSummon', effect: 'activateLastwishFromGraveyard', target: 'self', requiresSelection: false, copyFromSide: 'any', glwActivateNow: false }],
  })
  g.you.hand.push(izmoris)
  playCard(g, 'you', 'Izmoris')
  check('pop-up laukia (mode lastwish)', g.pendingCopy?.mode === 'lastwish' && g.pendingCopy.glwActivateNow === false, JSON.stringify(g.pendingCopy?.mode))
  resolveCopyEffect(g, 'Gydūnė')
  check('efektas NEaktyvuotas iškart (hp liko 20)', g.you.hp === 20, `hp=${g.you.hp}`)
  const iz = findU(g, 'you', 'Izmoris')!
  check('Izmoris gavo onDeath mapping (kopija)', (iz.card.mappings ?? []).some((m) => m.trigger === 'onDeath' && m.effect === 'heal'))
}

console.log('\n── 7. glwActivateNow default (true): elgesys nepakitęs — aktyvuoja iškart ──')
{
  const g = freshGame()
  g.you.hp = 20
  g.you.discard.push(graveLw())
  const senas = mkCard({
    name: 'Senas', uid: 'Senas', attack: 3, health: 5, keywords: ['battlecry'],
    mappings: [{ trigger: 'onSummon', effect: 'activateLastwishFromGraveyard', target: 'self', requiresSelection: false, copyFromSide: 'any' }],
  })
  g.you.hand.push(senas)
  playCard(g, 'you', 'Senas')
  resolveCopyEffect(g, 'Gydūnė')
  check('senasis elgesys: aktyvuota iškart (20→24)', g.you.hp === 24, `hp=${g.you.hp}`)
  const sn = findU(g, 'you', 'Senas')!
  check('ir nukopijuota kaip Paskutinis noras', (sn.card.mappings ?? []).some((m) => m.trigger === 'onDeath' && m.effect === 'heal'))
}

console.log(`\n════ REZULTATAS: ${pass} praėjo · ${fail} krito ════`)
process.exit(fail === 0 ? 0 : 1)
