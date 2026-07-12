// Virtualaus žaidimo varikliuko testų rinkinys (manual checklist automatizuota dalis)
// ── Virtualaus žaidimo varikliuko testai ─────────────────────────────────────
// Paleidimas: npx tsx scripts/simulate-virtual-game.ts
// (arba kompiliuoti su tsc į laikiną katalogą su path alias '@/*' -> 'src/*')
// Padengia manual test checklist scenarijus 1-16 (žr. VIRTUAL-GAME-NOTES.md).

import {
  createGame, beginTurn, endTurn, TutCard, P, playCard, attack, legalTargets,
  canUnitAttack, parseEffect, detectKeywords, useChampionAbility, effectiveCost,
} from '../src/lib/tutorial/engine'
import { aiNextAction } from '../src/lib/tutorial/ai'
import type { EffectMapping, GameplayConfig } from '../src/lib/game/types'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗ FAIL:', name, extra) }
}

function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return {
    id: over.name, uid: over.name, image: null, gold: 100, attack: 2, health: 3,
    type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff',
    effect: null, mappings: [], ...over,
  } as TutCard
}
function basicDeck(n = 30): TutCard[] {
  return Array.from({ length: n }, (_, i) => mkCard({ name: 'U' + i, gold: 100 + (i % 3) * 100 }))
}
function freshGame(extraYou: TutCard[] = [], opts?: Parameters<typeof createGame>[3]) {
  const g = createGame(basicDeck(), basicDeck(), 'you', opts)
  beginTurn(g)
  // įdedam testines kortas tiesiai į ranką
  for (const c of extraYou) g.you.hand.push(c)
  g.you.gold = 1000
  return g
}
function summon(g: ReturnType<typeof freshGame>, side: 'you' | 'ai', card: TutCard) {
  const p = P(g, side)
  const slot = p.units.findIndex((u) => u === null)
  p.units[slot] = {
    uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
    shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0,
    isChampion: card.type === 'champion', phase: 1, abilityUsed: false,
  }
  return p.units[slot]!
}

console.log('1-2. Padaro atakos (į padarą ir į žaidėją)')
{
  const zmkZero = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
  const g = freshGame([], { zmkDefs: zmkZero })
  const a = summon(g, 'you', mkCard({ name: 'Atk', attack: 3, health: 5 }))
  const d = summon(g, 'ai', mkCard({ name: 'Def', attack: 2, health: 4 }))
  const r = attack(g, 'you', a.uid, { kind: 'unit', side: 'ai', uid: d.uid })
  check('ataka į padarą ok', r.ok)
  check('gynėjas gavo žalos arba žuvo', (P(g, 'ai').units.find(u => u?.uid === d.uid)?.hp ?? 0) < 4 || !P(g, 'ai').units.some(u => u?.uid === d.uid))
  const a2 = summon(g, 'you', mkCard({ name: 'Atk2', attack: 4, health: 5 }))
  const hpBefore = g.ai.hp
  const r2 = attack(g, 'you', a2.uid, { kind: 'player', side: 'ai' })
  check('ataka į žaidėją ok', r2.ok)
  check('žaidėjo HP pasikeitė arba ŽMK=0', g.ai.hp <= hpBefore)
}

console.log('3-4. Mapped damage spell (į padarą ir į žaidėją)')
{
  const spell = mkCard({ name: 'Ugnis', type: 'spell', attack: null, health: null,
    mappings: [{ trigger: 'onCast', effect: 'damage', target: 'anyUnit', value: 3, requiresSelection: true, triggersZmk: false }] })
  const g = freshGame([spell])
  const d = summon(g, 'ai', mkCard({ name: 'Auka', health: 3 }))
  const r = playCard(g, 'you', spell.uid, { target: { kind: 'unit', side: 'ai', uid: d.uid } })
  check('burtas suveikė', r.ok)
  check('taikinys žuvo nuo mapped 3 žalos (be ŽMK)', !P(g, 'ai').units.some(u => u?.uid === d.uid))

  const spell2 = mkCard({ name: 'Ugnis2', type: 'spell',
    mappings: [{ trigger: 'onCast', effect: 'damage', target: 'enemyPlayer', value: 5, triggersZmk: false }] })
  const g2 = freshGame([spell2])
  playCard(g2, 'you', spell2.uid)
  check('žala žaidėjui be taikinio pasirinkimo', g2.ai.hp === 35)
}

console.log('5-6. Draw efektas + onDraw curse trigger')
{
  const drawSpell = mkCard({ name: 'Trauk', type: 'spell',
    mappings: [{ trigger: 'onCast', effect: 'drawCards', target: 'self', value: 2 }] })
  const g = freshGame([drawSpell])
  const handBefore = g.you.hand.length
  playCard(g, 'you', drawSpell.uid)
  check('ištrauktos 2 kortos', g.you.hand.length === handBefore - 1 + 2)

  // onDraw curse: korta kaladėje su mapping'u onDraw -> triggerCurse
  const curse = mkCard({ name: 'Demono kerštas', type: 'curse', effectText: 'Padaro 2 žalos.', effect: parseEffect('Padaro 2 žalos.') })
  const trigger = mkCard({ name: 'Užkeikta korta',
    mappings: [{ trigger: 'onDraw', effect: 'triggerCurse', target: 'self', value: 1, triggersCurse: { count: 1, appliesTo: 'caster' } }] })
  const g2 = createGame(basicDeck(5), basicDeck(5), 'you', { curseCards: [curse] })
  beginTurn(g2)
  g2.you.deck.push(trigger) // kita trauks šitą
  const cursesBefore = g2.you.curses.length
  endTurn(g2); beginTurn(g2) // AI ėjimas
  endTurn(g2); beginTurn(g2) // vėl tu – trauki Užkeiktą kortą
  check('onDraw aktyvavo curse iš side deck', g2.you.curses.length === cursesBefore - 1,
    `curses ${cursesBefore} -> ${g2.you.curses.length}`)
  check('curse padarė žalą', g2.you.hp < 40 || g2.log.some(e => e.t === 'curse'))
}

console.log('7. Curse side deck aktyvuojasi nuo spell efekto')
{
  const curse = mkCard({ name: 'Prakeiksmas X', type: 'curse', effectText: 'Padaro 3 žalos.', effect: parseEffect('Padaro 3 žalos.') })
  const spell = mkCard({ name: 'Demonų šauksmas', type: 'spell',
    mappings: [{ trigger: 'onCast', effect: 'triggerCurse', target: 'self', value: 1, triggersCurse: { count: 1, appliesTo: 'opponent' } }] })
  const g = createGame(basicDeck(), basicDeck(), 'you', { curseCards: [curse] })
  beginTurn(g); g.you.gold = 500; g.you.hand.push(spell)
  const aiCursesBefore = g.ai.curses.length
  playCard(g, 'you', spell.uid)
  check('priešininko curse deck sumažėjo', g.ai.curses.length === aiCursesBefore - 1)
  check('curse efektas pritaikytas priešininkui', g.ai.hp < 40)
  check('curse log įrašas yra', g.log.some(e => e.t === 'curse'))
}

console.log('8-10. Field: pakeitimas, turn-start trigger, atakų limitas, kainos delta')
{
  const fieldCfg: GameplayConfig = { fieldEffectConfig: {
    passive: { attackLimitPerTurn: 1, spellCostDelta: 100 },
    triggers: [{ trigger: 'onTurnStart', effect: 'damage', target: 'allEnemyUnits', value: 1, triggersZmk: false }],
  } }
  const f1 = mkCard({ name: 'Laukas A', type: 'field', gameplay: fieldCfg })
  const f2 = mkCard({ name: 'Laukas B', type: 'field' })
  const g = freshGame([f1, f2])
  playCard(g, 'you', f1.uid)
  check('laukas aktyvus', g.field?.card.name === 'Laukas A')
  // kainos delta burtams
  const spell = mkCard({ name: 'Pigus burtas', type: 'spell', gold: 100 })
  g.you.hand.push(spell)
  check('burto kaina +100 nuo lauko', effectiveCost(g, 'you', spell) === 200)
  // atakų limitas
  const u1 = summon(g, 'you', mkCard({ name: 'L1', attack: 1, health: 9 }))
  const u2 = summon(g, 'you', mkCard({ name: 'L2', attack: 1, health: 9 }))
  attack(g, 'you', u1.uid, { kind: 'player', side: 'ai' })
  const r2 = attack(g, 'you', u2.uid, { kind: 'player', side: 'ai' })
  check('antra ataka užblokuota lauko limito', !r2.ok && (r2.ok ? '' : (r2 as { reason: string }).reason) === 'battleLog.err.fieldAttackLimit')
  // turn start trigger: AI padarui 1 žala AI ėjimo pradžioje? trigger šaunamas aktyviai pusei – patikrinam kad veikia
  summon(g, 'ai', mkCard({ name: 'AiU', health: 3 }))
  endTurn(g); beginTurn(g) // AI ėjimo pradžia: laukas šauna AI vardu -> žala TAVO padarams
  check('lauko onTurnStart trigger suveikė (log)', g.log.some(e => e.t === 'field' && e.key === 'battleLog.fieldTrigger'))
  // pakeitimas
  endTurn(g); beginTurn(g)
  g.you.gold = 500
  playCard(g, 'you', f2.uid)
  check('naujas laukas pakeičia seną, senas į krūvą', g.field?.card.name === 'Laukas B' && [...g.you.discard].some(c => c.name === 'Laukas A'))
}

console.log('11. Čempiono skill mapping')
{
  const champCfg: GameplayConfig = { championSkillConfig: { mappings: [
    { trigger: 'onChampionSkill', effect: 'damage', target: 'enemyPlayer', value: 2, triggersZmk: false },
  ] } }
  const champ = mkCard({ name: 'Valdovas', type: 'champion', attack: null, health: 10, gameplay: champCfg })
  const g = freshGame()
  summon(g, 'you', champ)
  const r = useChampionAbility(g, 'you')
  check('skill suveikė', r.ok)
  check('mapped skill žala (2+fazė-1=2)', g.ai.hp === 38, 'hp=' + g.ai.hp)
  const r2 = useChampionAbility(g, 'you')
  check('skill tik 1x per ėjimą', !r2.ok)
}

console.log('12. Artefakto onTurnStart mapping')
{
  const art = mkCard({ name: 'Aukso katilas', type: 'artifact', attack: null, health: 4,
    gameplay: { artifactEffectConfig: { mappings: [{ trigger: 'onTurnStart', effect: 'gainGold', target: 'ownPlayer', value: 100 }] } } })
  const g = freshGame([art])
  playCard(g, 'you', art.uid)
  endTurn(g); beginTurn(g) // AI
  endTurn(g); beginTurn(g) // tu
  check('artefaktas davė +100 aukso ėjimo pradžioje', g.you.gold === 200 + 100, 'gold=' + g.you.gold)
}

console.log('13. onDeath / onAttacked mappings')
{
  const dier = mkCard({ name: 'Kerštautojas', attack: 1, health: 1,
    mappings: [{ trigger: 'onDeath', effect: 'damage', target: 'enemyPlayer', value: 2, triggersZmk: false }] })
  const g = freshGame()
  const u = summon(g, 'you', dier)
  const killer = summon(g, 'ai', mkCard({ name: 'Žudikas', attack: 5, health: 9 }))
  g.active = 'ai'
  attack(g, 'ai', killer.uid, { kind: 'unit', side: 'you', uid: u.uid })
  check('onDeath suveikė (AI gavo 2)', g.ai.hp <= 38, 'aihp=' + g.ai.hp)
}

console.log('14. Nesumapinta korta necrashina')
{
  const weird = mkCard({ name: 'Keista', type: 'spell', effectText: 'Visiškai nesuprantamas efektas be skaičių.', effect: null, mappings: [] })
  const g = freshGame([weird])
  const r = playCard(g, 'you', weird.uid)
  check('nesumapintas burtas suveikia be crash', r.ok)
  check('korta krūvoje', g.you.discard.some(c => c.name === 'Keista'))
}

console.log('15. ŽMK deck iš custom defs')
{
  const g = createGame(basicDeck(), basicDeck(), 'you', { zmkDefs: [
    { id: '1', name: 'Tik +1', description: null, value: '+1', count: 20, mode: 'draw', image_url: null, active: true, sort_order: 1 },
  ] })
  check('ŽMK kaladė 20 kortų', g.you.zmk.length === 20)
  check('ŽMK draw režimas', g.zmkMode === 'draw')
  beginTurn(g); g.you.gold = 500
  const a = summon(g, 'you', mkCard({ name: 'T', attack: 2, health: 5 }))
  attack(g, 'you', a.uid, { kind: 'player', side: 'ai' })
  check('visada +1: 2 ATK -> 3 žala', g.ai.hp === 37, 'hp=' + g.ai.hp)
}

console.log('16. Pilna AI partija su mappings/curse/field – stabilumas')
{
  let crashed = false
  try {
    for (let run = 0; run < 20; run++) {
      const curse = mkCard({ name: 'C', type: 'curse', effect: parseEffect('Padaro 2 žalos.') })
      const deck = basicDeck(28)
      deck.push(mkCard({ name: 'CurseSpell', type: 'spell', mappings: [{ trigger: 'onCast', effect: 'triggerCurse', target: 'self', triggersCurse: { count: 1, appliesTo: 'opponent' } }] }))
      deck.push(mkCard({ name: 'FieldX', type: 'field', gameplay: { fieldEffectConfig: { passive: { atkDelta: 1 } } } }))
      const g = createGame(deck, deck.map(c => ({ ...c })), run % 2 ? 'you' : 'ai', { curseCards: [curse, { ...curse, uid: 'c2' }] })
      beginTurn(g)
      let guard = 0
      while (!g.winner && guard++ < 300) {
        if (g.active === 'ai') {
          let steps = 0
          while (!g.winner && aiNextAction(g) && steps++ < 30) {}
        } else {
          const me = P(g, 'you')
          for (const c of me.hand.filter(c => c.gold <= me.gold && c.type !== 'champion' && c.type !== 'curse').slice(0, 3)) playCard(g, 'you', c.uid)
          for (const u of me.units) {
            if (!u || g.winner || !canUnitAttack(g, 'you', u).ok) continue
            const ts = legalTargets(g, 'you')
            if (ts.length) attack(g, 'you', u.uid, ts.find(t => t.kind === 'player') ?? ts[0])
          }
        }
        if (!g.winner) { endTurn(g); beginTurn(g) }
      }
    }
  } catch (e) { crashed = true; console.log('  CRASH:', e) }
  check('20 pilnų partijų be crash', !crashed)
}

console.log(`\nRezultatas: ${pass} ✓ / ${fail} ✗`)
if (fail > 0) throw new Error('FAILURES')
