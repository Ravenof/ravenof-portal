import { createGame, beginTurn, playCard, swapPerspective, resolveChoice, resolvePendingLastwish, applyNetAction, swapAction, P, type TutCard, type GameState } from '../src/lib/tutorial/engine'
import type { EffectMapping } from '../src/lib/game/types'
let ok=0,bad=0; const check=(n:string,c:boolean,x='')=>{ if(c){ok++;console.log('  ✓',n)}else{bad++;console.log('  ✗',n,x)} }
const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
function mkCard(over: Partial<TutCard> & { name: string }): TutCard {
  return {
    id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3,
    type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff',
    effect: null, mappings: [], ...over,
  } as TutCard
}
const filler = (n: number, tag = 'F') => Array.from({ length: n }, (_, i) => mkCard({ name: `${tag}${i}`, uid: `${tag}${i}` }))

const spell=(uid:string)=>mkCard({name:uid,uid,type:'spell',mappings:[{trigger:'onCast',effect:'damage',target:'enemyPlayer',value:1,requiresSelection:false} as EffectMapping]})
const valt=()=>mkCard({name:'Valt',uid:'valt',health:8,mappings:[{trigger:'onSummon',effect:'tutorToHand',target:'self',tutorZone:'discard',tutorCardType:'spell',tutorChoose:true} as EffectMapping]})
for (const pvp of [true,false]) {
  const g = createGame(filler(20,'Y'), filler(20,'A'), 'ai', { zmkDefs: ZMK0 as never, humanAi: pvp })
  beginTurn(g); g.ai.gold=1000
  g.ai.discard.push(spell('s1'),spell('s2')); g.ai.hand.push(valt())
  const r=playCard(g,'ai','valt')
  if (pvp) {
    check('PvP: svečio (ai) iškvietimas kuria pasirinkimą', r.ok && g.pendingChoice?.kind==='tutorHand' && g.pendingChoice.caster==='ai', JSON.stringify({r,pc:g.pendingChoice?.kind}))
    const gv=swapPerspective(g)
    check('svečio vaizde rinkėjas = you', (gv.pendingChoice?.chooser ?? gv.pendingChoice?.caster)==='you')
    const idx=g.pendingChoice!.cards!.findIndex(c=>c.uid==='s2')
    applyNetAction(g, swapAction({t:'resolveChoice',index:idx}))
    check('pasirinktas burtas svečio rankoje', g.ai.hand.some(c=>c.uid==='s2') && !g.ai.hand.some(c=>c.uid==='s1') && !g.pendingChoice, g.ai.hand.map(c=>c.uid).join(','))
  } else {
    check('prieš DI: ai renkasi automatiškai (be lango)', r.ok && !g.pendingChoice && g.ai.hand.some(c=>c.uid==='s1'||c.uid==='s2'))
  }
}
{ // Elementų kamuoliai svečiui: ARBA langas + rankiniai taikiniai
  const ek=mkCard({ name:'EK', uid:'ek', type:'spell', mappings:[{ value:4,effect:'damage',target:'enemyUnit',trigger:'onPlay',hitCount:2,targetTypes:['anyUnit','anyArtifact','anyChampion'],requiresSelection:true,triggersZmk:false,
    chooseAlt:[{ value:6,effect:'damage',target:'enemyUnit',trigger:'onPlay',targetTypes:['anyUnit','anyPlayer'],requiresSelection:true,triggersZmk:false }] } as EffectMapping] })
  const g = createGame(filler(20,'Y'), filler(20,'A'), 'ai', { zmkDefs: ZMK0 as never, humanAi: true })
  beginTurn(g); g.ai.gold=1000
  const mkU=(uid:string)=>({ uid, card: mkCard({name:uid,uid,health:9}), atk:2,hp:9,maxHp:9,shield:false,stealth:false,statuses:{},summonedOnTurn:0,attacksUsed:0,isChampion:false,phase:0,abilityUsed:false })
  g.you.units[0]=mkU('h1') as GameState['you']['units'][0]
  g.ai.hand.push(ek)
  const r=playCard(g,'ai','ek')
  check('EK svečiui: ARBA langas', r.ok && !!g.pendingChoice && g.pendingChoice.chooser==='ai', JSON.stringify(r))
  applyNetAction(g,{t:'resolveChoice',index:1})
  check('EK -6 šaka: laukiama svečio taikinio', g.pendingLastwish?.side==='ai' && g.you.hp===g.you.maxHp && g.you.units[0]!.hp===9)
  // svečias savo vaizde renkasi PRIEŠO (host'o) žaidėją: {player, side:'ai'} → swapAction → 'you'
  const rr=applyNetAction(g, swapAction({t:'resolveLastwish',targets:[{kind:'player',side:'ai'}]}))
  check('EK: -6 į veidą (host žaidėjas), padaras nepaliestas', rr.ok && g.you.hp===g.you.maxHp-6 && g.you.units[0]!.hp===9, `${g.you.hp}/${g.you.maxHp} u=${g.you.units[0]!.hp}`)
}
{ // Paskutinis noras: ši korta → savo kaladė (selfToOwnDeck)
  const g = createGame(filler(20,'Y'), filler(20,'A'), 'you', { zmkDefs: ZMK0 as never })
  beginTurn(g); g.you.gold=1000
  const w=mkCard({name:'Wynsa',uid:'wyn',health:1,mappings:[{trigger:'onDeath',effect:'selfToOwnDeck',target:'self'} as EffectMapping]})
  const boom=mkCard({name:'Boom',uid:'boom',type:'spell',mappings:[{trigger:'onCast',effect:'damage',target:'allEnemyUnits',value:5,triggersZmk:false,requiresSelection:false} as EffectMapping]})
  g.ai.units[0]={ uid:'wyn', card:w, atk:1,hp:1,maxHp:1,shield:false,stealth:false,statuses:{},summonedOnTurn:0,attacksUsed:0,isChampion:false,phase:0,abilityUsed:false } as GameState['you']['units'][0]
  const before=g.ai.deck.length
  g.you.hand.push(boom); const r=playCard(g,'you','boom')
  check('Wynsa žuvo ir grįžo į kaladę (ne kapinyną, ne ranką)', r.ok && !g.ai.units[0] && g.ai.deck.length===before+1 && g.ai.deck.some(c=>c.uid==='wyn') && !g.ai.discard.some(c=>c.uid==='wyn') && !g.ai.hand.some(c=>c.uid==='wyn'), JSON.stringify({r,d:g.ai.deck.length,before}))
}
console.log(`${ok} ✓ / ${bad} ✗`); if(bad) process.exit(1)
