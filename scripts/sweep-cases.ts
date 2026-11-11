// Tiksliniai scenarijai kortoms, kurių bendras sweep'as negali patikrinti (specifiniai trigeriai).
// Paleidimas: node ... scripts/sweep-cases.ts <cards.json>
import { readFileSync } from 'node:fs'
import { createGame, beginTurn, endTurn, P, playCard, attack, parseEffect, detectKeywords, mapCardType, type TutCard, type GameState } from '../src/lib/tutorial/engine'
import { parseGameplayConfig } from '../src/lib/game/types'
type Row = Record<string, unknown> & { name: string }
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8')) as Row[]
function mapRow(c: Row): TutCard {
  const kw = ((c.card_keywords as { keyword?: { name?: string } }[]) ?? []).map((k) => k.keyword?.name ?? '').filter(Boolean), text = [c.effect_text, c.description].filter(Boolean).join(' '), gameplay = parseGameplayConfig(c.gameplay)
  return { id: c.id, uid: c.id, name: c.name, image: null, gold: c.gold_cost ?? 100, attack: c.attack, health: c.health, type: mapCardType((c.card_type as { name: string } | null)?.name, !!c.is_champion), subtype: c.subtype ?? null,
    championGroup: c.champion_group ?? null, championPhase: c.champion_phase ?? null, keywords: Array.from(new Set([...detectKeywords(kw, text as string), ...((gameplay?.keywords ?? []) as ReturnType<typeof detectKeywords>)])),
    effectText: text, rarityColor: '#fff', rarityName: null, factionColor: '#fff', factionId: (c.faction as { id?: number } | null)?.id ?? null, factionName: (c.faction as { name?: string } | null)?.name ?? null, effect: parseEffect(text as string), gameplay,
    mappings: gameplay?.virtualEnabled === false ? [] : gameplay?.effectMappings ?? [] } as unknown as TutCard
}
const all = rows.map(mapRow), by = (n: string) => { const c = all.find((x) => x.name === n); if (!c) throw new Error('nėra ' + n); return c }
const curses = all.filter((c) => c.type === 'curse')
let n = 0
const van = (o: Record<string, unknown> = {}): TutCard => ({ id: 'v' + ++n, uid: 'v' + n, name: 'Manekenas', image: null, gold: 100, attack: 2, health: 5, type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [], factionId: null, subtype: null, ...o }) as unknown as TutCard
const B = (card: TutCard, o: Record<string, unknown> = {}) => ({ uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false, ...o }) as never
const spell = (m: Record<string, unknown>, gp: Record<string, unknown> = {}) => van({ type: 'spell', attack: null, health: null, gold: 0, gameplay: gp, mappings: [{ trigger: 'onPlay', requiresSelection: false, value: 1, triggersZmk: false, ...m }] })
const snap = (g: GameState) => { const o: Record<string, unknown> = {}; for (const s of ['ai', 'you'] as const) { const p = P(g, s) as unknown as { hp: number; maxHp: number; gold: number; hand: unknown[]; deck: unknown[]; discard: unknown[]; units: ({ card: { name: string }; atk: number; hp: number; shield: boolean; statuses: Record<string, unknown>; card2?: unknown } | null)[] }
  o[s] = `hp${p.hp}/${p.maxHp} h${p.hand.length} d${p.deck.length} g${p.discard.length} | ` + p.units.filter(Boolean).map((u) => `${u!.card.name.slice(0, 12)} ${u!.atk}/${u!.hp}${u!.shield ? 'S' : ''}${Object.keys(u!.statuses).filter((k) => u!.statuses[k]).join('')}${(u!.card as unknown as { keywords: string[] }).keywords.join('')}`).join(', ') } return o }
type Ctx = { g: GameState; me: ReturnType<typeof P>; op: ReturnType<typeof P>; X: TutCard; put: (c?: TutCard, o?: Record<string, unknown>) => void }
const only = process.argv[3]
function scen(title: string, cardName: string, setup: (c: Ctx) => void, act: (c: Ctx) => void) {
  if ((only === 'new' && !NEW) || (only === 'p770' && !P770) || (only !== 'p770' && P770)) return
  try {
    const g: GameState = createGame(Array.from({ length: 30 }, () => van()), Array.from({ length: 30 }, () => van()), 'ai', { format: 'classic', curseCards: curses.slice(0, 8).map((x, i) => ({ ...x, uid: 'cu' + i })) } as never); beginTurn(g)
    const me = P(g, 'ai'), op = P(g, 'you'); me.hp = 20; op.hp = 20; me.gold = 5000; op.gold = 5000
    me.units = [B(van()), B(van()), null, null, null] as never; op.units = [B(van()), B(van()), null, null, null] as never
    const X = { ...by(cardName), uid: 'X' } as TutCard
    const put = (c: TutCard = X, o: Record<string, unknown> = {}) => { if (c.type === 'artifact') (me.artifacts as unknown[])[0] = { uid: c.uid, card: c, hp: c.health ?? 3, maxHp: c.health ?? 3 }; else (me.units as unknown[])[2] = B(c, { hp: 20, maxHp: 20, ...o }) }
    const ctx = { g, me, op, X, put }; setup(ctx); const a = snap(g), n0 = g.log.length; act(ctx); const b = snap(g)
    const ev = (g.log.slice(n0) as unknown as { t: string; key?: string; cardName?: string; value?: number }[]).filter((e) => e.t !== 'fxSource').map((e) => `${e.t}${e.cardName ? '(' + e.cardName.slice(0, 14) + ')' : ''}${e.t === 'blocked' ? ':' + e.key : ''}${e.value != null ? '=' + e.value : ''}`)
    console.log(`\n## ${cardName} — ${title}`); for (const s of ['ai', 'you']) if (a[s] !== b[s]) console.log(`   ${s}: ${a[s]}\n     →  ${b[s]}`); console.log('   log:', ev.join(' · ') || '—')
  } catch (e) { console.log(`\n## ${cardName} — ${title}\n   CRASH ${(e as Error).message}`) }
}
let NEW = false, P770 = false
const killOwn = (c: Ctx, i = 0) => { const sp = spell({ effect: 'damage', target: 'ownUnit', value: 50, requiresSelection: true }); c.me.hand.push(sp); const u = c.me.units[i] as unknown as { uid: string }; playCard(c.g, 'ai', sp.uid, { target: { kind: 'unit', side: 'ai', uid: u.uid } }) }
const sub = (c: Ctx, st: string | null, i = 0) => { const u = c.me.units[i] as unknown as { card: TutCard }; u.card = { ...u.card, subtype: st } as TutCard }
const buffX = (c: Ctx) => { const sp = spell({ effect: 'buffAttack', target: 'ownUnit', value: 1, requiresSelection: true }, { spellType: 'buff' }); c.me.hand.push(sp); playCard(c.g, 'ai', sp.uid, { target: { kind: 'unit', side: 'ai', uid: 'X' } }) }
const revive = (c: Ctx, card: TutCard) => { c.me.discard.length = 0; c.me.discard.push(card); const sp = spell({ effect: 'revive', target: 'ownPlayer' }); c.me.hand.push(sp); playCard(c.g, 'ai', sp.uid) }
const oppTurn = (c: Ctx) => { endTurn(c.g); beginTurn(c.g); c.op.gold = 5000 }

scen('žūsta savas padaras', 'Asagi', (c) => c.put(), (c) => killOwn(c))
scen('žūsta savas ZOMBIE padaras (Zombis kaladėje/kapinyne)', 'Ramturas prakeiktasis', (c) => { c.put(); sub(c, c.X.subtype ?? 'ZOMBIE'); const z = all.find((x) => x.name === 'Zombis'); if (z) { c.me.deck.unshift({ ...z, uid: 'z1' } as TutCard); c.me.discard.push({ ...z, uid: 'z2' } as TutCard) } else console.log('   (nėra kortos „Zombis")') }, (c) => killOwn(c))
scen('žūsta savas padaras', 'Įšventinimo kalavijas', (c) => c.put(), (c) => killOwn(c))
scen('žūsta savas padaras', 'Nekromanto amuletas', (c) => c.put(), (c) => killOwn(c))
scen('stiprinimo burtas ant jos', 'Elenora Kraujošviesa', (c) => c.put(), buffX)
scen('stiprinimo burtas ant jo', 'Inkvizicijos riteris', (c) => c.put(), buffX)
scen('iškviečiamas savas ANGEL padaras', 'Bernardas Gynėjas', (c) => c.put(), (c) => { const v = van({ subtype: 'ANGEL' }); c.me.hand.push(v); playCard(c.g, 'ai', v.uid) })
scen('iškviečiamas antras „Bernardas Gynėjas"', 'Bernardas Gynėjas', (c) => c.put(), (c) => { const v = { ...by('Bernardas Gynėjas'), uid: 'B2' } as TutCard; c.me.hand.push(v); playCard(c.g, 'ai', v.uid) })
scen('padaras prikeliamas iš kapinyno', 'Kapinių žibintas', (c) => c.put(), (c) => revive(c, van()))
scen('pats prikeliamas iš kapinyno', 'Vergvaldys Zaragas', () => {}, (c) => revive(c, c.X))
scen('kitas padaras prikeliamas iš kapinyno (Zaragas lentoje)', 'Vergvaldys Zaragas', (c) => c.put(), (c) => revive(c, van()))
scen('priešininkas gauna monetų efektu', 'Gylis Paslaptingasis', (c) => { c.put(); oppTurn(c) }, (c) => { const sp = spell({ effect: 'gainGold', target: 'ownPlayer', value: 100 }); c.op.hand.push(sp); playCard(c.g, 'you', sp.uid) })
scen('priešininkas atima monetas iš manęs', 'Gylis Paslaptingasis', (c) => { c.put(); oppTurn(c) }, (c) => { const sp = spell({ effect: 'loseGold', target: 'enemyPlayer', value: 100 }); c.op.hand.push(sp); playCard(c.g, 'you', sp.uid) })
scen('ištraukiama pati Liliana', 'Mergelė Liliana', (c) => { c.me.deck.unshift(c.X) }, (c) => { oppTurn(c); endTurn(c.g); beginTurn(c.g) })
scen('Liliana lentoje, traukiama kita korta', 'Mergelė Liliana', (c) => c.put(), (c) => { oppTurn(c); endTurn(c.g); beginTurn(c.g) })
scen('priešas atakuoja mano padarą', 'Heilderbergo bokštas', (c) => { c.put(); oppTurn(c) }, (c) => { const a = c.op.units[0] as unknown as { uid: string; summonedOnTurn: number }; const t = c.me.units[0] as unknown as { uid: string }; attack(c.g, 'you', a.uid, { kind: 'unit', side: 'ai', uid: t.uid }) })
scen('priešas atakuoja mano žaidėją', 'Heilderbergo bokštas', (c) => { c.put(); c.me.units = [null, null, null, null, null] as never; oppTurn(c) }, (c) => { const a = c.op.units[0] as unknown as { uid: string }; attack(c.g, 'you', a.uid, { kind: 'player', side: 'ai' } as never) })
scen('priešas atakuoja patį bokštą', 'Heilderbergo bokštas', (c) => { c.put(); oppTurn(c) }, (c) => { const a = c.op.units[0] as unknown as { uid: string }; attack(c.g, 'you', a.uid, { kind: 'artifact', side: 'ai', uid: 'X' } as never) })
scen('ėjimo pabaiga, priešas be padarų', 'Gieldrimas Saulytė', (c) => { c.put(); c.op.units = [null, null, null, null, null] as never }, (c) => endTurn(c.g))
scen('sužaidžiama (2 savi padarai)', 'Šventintas vanduo', (c) => { c.me.hand.push(c.X) }, (c) => { playCard(c.g, 'ai', 'X') })
scen('sužaidžiama', 'Kontrpuolimas', (c) => { c.me.hand.push(c.X); (c.me.units[0] as unknown as { hp: number }).hp = 2 }, (c) => { playCard(c.g, 'ai', 'X') })
scen('sužaidžiama', 'Dūmų uždanga', (c) => { c.me.hand.push(c.X) }, (c) => { const r = playCard(c.g, 'ai', 'X'); console.log('   play →', JSON.stringify(r)) })
NEW = true
const taunt = (c: Ctx, i = 0) => { const u = c.op.units[i] as unknown as { card: TutCard }; u.card = { ...u.card, keywords: ['taunt'] } as unknown as TutCard }
const play = (c: Ctx, t?: unknown) => { c.me.hand.push(c.X); const r = playCard(c.g, 'ai', 'X', t ? { target: t } as never : undefined); console.log('   play →', JSON.stringify(r), 'pending:', Object.keys(c.g).filter((k) => k.startsWith('pending') && (c.g as unknown as Record<string, unknown>)[k] && !(Array.isArray((c.g as unknown as Record<string, unknown>)[k]) && !((c.g as unknown as Record<string, unknown[]>)[k]).length)).join(',')) }
const eu = (c: Ctx, i = 0) => ({ kind: 'unit', side: 'you', uid: (c.op.units[i] as unknown as { uid: string }).uid })
for (const nm of ['Kankintojo Kirvis', 'Oglor’as Klaidintojas', 'Rajūnas Pak-erael’is']) {
  scen('priešininkas ištraukia prakeiksmą', nm, (c) => { if (nm.startsWith('Oglor')) c.me.discard.push(c.X); else c.put(); c.op.deck.push({ ...curses[0], uid: 'cz' } as TutCard) }, (c) => { endTurn(c.g); beginTurn(c.g) })
}
scen('ištraukiama pati Liliana', 'Mergelė Liliana', (c) => { c.me.deck.push(c.X) }, (c) => { oppTurn(c); endTurn(c.g); beginTurn(c.g) })
scen('sunaikina priešo padarą ataka (pati sužeista)', 'Gazzar’a', (c) => { c.put(c.X, { hp: 10, maxHp: 20 }); (c.op.units[0] as unknown as { hp: number }).hp = 1 }, (c) => { attack(c.g, 'ai', 'X', eu(c) as never) })
scen('miršta, yra sužeistų savų', 'Dulvydas Dėtė', (c) => { c.put(c.X, { hp: 1 }); (c.me.units[0] as unknown as { hp: number }).hp = 2 }, (c) => killOwn(c, 2))
scen('miršta, priešas be padarų', 'Rikito', (c) => { c.put(c.X, { hp: 1 }); c.op.units = [null, null, null, null, null] as never }, (c) => killOwn(c, 2))
scen('priešas turi Pasišaipymo padarą', 'Gitori', (c) => taunt(c), (c) => play(c, eu(c)))
scen('priešas turi Pasišaipymo padarą', 'Ribe', (c) => taunt(c), (c) => play(c, eu(c)))
scen('taikinys su Pasišaipymu', 'Sadakumo', (c) => taunt(c), (c) => play(c, eu(c)))
scen('taikinys BE Pasišaipymo', 'Sadakumo', () => {}, (c) => play(c, eu(c)))
scen('kapinyne ZOMBIE ≤200 (frakcija 6)', 'Vėlių šauklė', (c) => { c.me.discard.push(van({ subtype: 'ZOMBIE', factionId: 6, gold: 100 })) }, (c) => play(c))
scen('kapinyne padaras su Paskutiniu noru', 'Nekrobaronas Izmoris', (c) => { c.me.discard.push(van({ keywords: ['lastwish'], mappings: [{ trigger: 'onDeath', effect: 'damage', target: 'enemyPlayer', value: 2, requiresSelection: false }] })) }, (c) => play(c))
scen('priešo kapinyne padaras su efektu', 'Regnaras Mėgdžiotojas', (c) => { c.op.discard.push(van({ mappings: [{ trigger: 'onSummon', effect: 'damage', target: 'enemyPlayer', value: 2, requiresSelection: false }] })) }, (c) => play(c))
scen('lentoje: žūsta bet kuris padaras', 'Regnaras Mėgdžiotojas', (c) => c.put(), (c) => killOwn(c))
scen('visi 2/5 padarai', 'Mirties šauksmas', () => {}, (c) => play(c))
scen('artefaktas sunaikinamas priešo ataka', 'Sprogiosios statinės', (c) => { c.put(); (c.me.artifacts[0] as unknown as { hp: number }).hp = 1; oppTurn(c) }, (c) => { attack(c.g, 'you', (c.op.units[0] as unknown as { uid: string }).uid, { kind: 'artifact', side: 'ai', uid: 'X' } as never) })
scen('taikinys – priešo padaras 2/5', 'Leisk man!', () => {}, (c) => play(c, eu(c)))
scen('taikinys – priešo žaidėjas', 'Leisk man!', () => {}, (c) => play(c, { kind: 'player', side: 'you' }))
scen('padėta reakcija; priešas sužaidžia burtą', 'Stichijų skydas', (c) => { c.me.hand.push(c.X); playCard(c.g, 'ai', 'X'); oppTurn(c) }, (c) => { const sp = spell({ effect: 'damage', target: 'enemyPlayer', value: 3 }); c.op.hand.push(sp); playCard(c.g, 'you', sp.uid) })
scen('padėta reakcija; priešas atakuoja mano padarą', 'Netikras atsitraukimas', (c) => { c.me.hand.push(c.X); playCard(c.g, 'ai', 'X'); oppTurn(c) }, (c) => { attack(c.g, 'you', (c.op.units[0] as unknown as { uid: string }).uid, { kind: 'unit', side: 'ai', uid: (c.me.units[0] as unknown as { uid: string }).uid } as never); endTurn(c.g); beginTurn(c.g) })
scen('padėta reakcija; priešas atakuoja', 'Dūmų uždanga', (c) => { c.me.hand.push(c.X); playCard(c.g, 'ai', 'X'); oppTurn(c) }, (c) => { attack(c.g, 'you', (c.op.units[0] as unknown as { uid: string }).uid, { kind: 'unit', side: 'ai', uid: (c.me.units[0] as unknown as { uid: string }).uid } as never) })
scen('padėta reakcija; priešas sužaidžia burtą', 'Dūmų uždanga', (c) => { c.me.hand.push(c.X); playCard(c.g, 'ai', 'X'); oppTurn(c) }, (c) => { const sp = spell({ effect: 'damage', target: 'enemyPlayer', value: 3 }); c.op.hand.push(sp); playCard(c.g, 'you', sp.uid) })
// Visos reakcijos: padedama, tada priešininkas iškviečia padarą, sužaidžia burtą, atakuoja; tada mano ėjimas (burtas, iškvietimas, ataka)
if (only === 'react') for (const rc of all.filter((x) => x.type === 'reaction')) {
  const g: GameState = createGame(Array.from({ length: 30 }, () => van()), Array.from({ length: 30 }, () => van()), 'ai', { format: 'classic' } as never); beginTurn(g)
  const me = P(g, 'ai'), op = P(g, 'you'); me.gold = 5000; me.units = [B(van()), B(van()), null, null, null] as never; op.units = [B(van()), B(van()), null, null, null] as never
  const X = { ...rc, uid: 'X' } as TutCard; me.hand.push(X); playCard(g, 'ai', 'X'); const fired: string[] = []
  const step = (nm: string, fn: () => void) => { const n0 = g.log.length; try { fn() } catch (e) { fired.push(nm + ':CRASH ' + (e as Error).message.slice(0, 60)) } if ((g.log.slice(n0) as unknown as { t: string; cardName?: string }[]).some((e) => e.t === 'reactionTrigger' && e.cardName === rc.name)) fired.push(nm) }
  endTurn(g); beginTurn(g); op.gold = 5000
  step('priešo iškvietimas', () => { const v = van(); op.hand.push(v); playCard(g, 'you', v.uid) })
  step('priešo burtas', () => { const sp = spell({ effect: 'damage', target: 'enemyUnit', value: 1 }); op.hand.push(sp); playCard(g, 'you', sp.uid, { target: { kind: 'unit', side: 'ai', uid: (me.units[0] as unknown as { uid: string }).uid } } as never) })
  step('priešo ataka', () => { attack(g, 'you', (op.units[0] as unknown as { uid: string }).uid, { kind: 'unit', side: 'ai', uid: (me.units[0] as unknown as { uid: string }).uid } as never) })
  step('mano padaro žūtis', () => { const sp = spell({ effect: 'damage', target: 'enemyUnit', value: 50 }); op.hand.push(sp); playCard(g, 'you', sp.uid, { target: { kind: 'unit', side: 'ai', uid: (me.units[1] as unknown as { uid: string }).uid } } as never) })
  endTurn(g); beginTurn(g); me.gold = 5000
  step('mano burtas', () => { const sp = spell({ effect: 'damage', target: 'enemyUnit', value: 1 }); me.hand.push(sp); playCard(g, 'ai', sp.uid, { target: { kind: 'unit', side: 'you', uid: (op.units[1] as unknown as { uid: string }).uid } } as never) })
  step('mano iškvietimas', () => { const v = van(); me.hand.push(v); playCard(g, 'ai', v.uid) })
  const still = (me.reactions as unknown[]).some((r) => (r as { uid?: string } | null)?.uid === 'X')
  console.log(`${fired.length ? 'OK  ' : 'NIEKADA'} | ${rc.name} | trig: ${[...new Set(((rc.mappings ?? []) as unknown as { trigger: string; triggerSide?: string }[]).map((m) => m.trigger + (m.triggerSide ? '/' + m.triggerSide : '')))].join(',')} | suveikė: ${fired.join(', ') || '—'}${still ? ' | liko slote' : ''} | ${(rc.effectText ?? '').slice(0, 110)}`)
}
// Prakeiksmai: kiekvienas ištraukiamas mano ėjimo pradžioje
if (only === 'curse') for (const cc of curses) {
  try { const g: GameState = createGame(Array.from({ length: 30 }, () => van()), Array.from({ length: 30 }, () => van()), 'ai', { format: 'classic' } as never); beginTurn(g)
    const me = P(g, 'ai'), op = P(g, 'you'); me.hp = 20; op.hp = 20; me.units = [B(van()), B(van()), null, null, null] as never; op.units = [B(van()), B(van()), null, null, null] as never; me.discard.push(van(), van())
    endTurn(g); beginTurn(g); endTurn(g); me.deck.push({ ...cc, uid: 'C' } as TutCard); me.gold = 500; const a = snap(g), g0 = me.gold, n0 = g.log.length; beginTurn(g); const b = snap(g)
    const ev = (g.log.slice(n0) as unknown as { t: string; cardName?: string; value?: number; key?: string }[]).filter((e) => !['fxSource', 'startTurn', 'draw'].includes(e.t) && !(e.t === 'gold' && /turn|income/i.test(e.key ?? ''))).map((e) => e.t + (e.value != null ? '=' + e.value : '') + (e.t === 'blocked' ? ':' + e.key : ''))
    const pend = Object.keys(g).filter((k) => k.startsWith('pending') && (g as unknown as Record<string, unknown>)[k] && !(Array.isArray((g as unknown as Record<string, unknown>)[k]) && !((g as unknown as Record<string, unknown[]>)[k]).length))
    console.log(`CURSE | ${cc.name} | ${[...new Set(((cc.mappings ?? []) as unknown as { trigger: string; effect: string; target: string; value?: number }[]).map((m) => `${m.trigger}:${m.effect}→${m.target}${m.value != null ? '=' + m.value : ''}`))].join('; ') || 'BE EFEKTŲ'} | ai ${a.ai === b.ai ? '=' : a.ai + ' → ' + b.ai} | you ${a.you === b.you ? '=' : 'pakito'} | auksas ${g0}→${me.gold} | ${ev.join(',')} ${pend.join(',')} | ${(cc.effectText ?? '').slice(0, 90)}`)
  } catch (e) { console.log('CURSE CRASH', cc.name, (e as Error).message.slice(0, 100)) } }
// 770 pataisų patikra (paleisti su pataisytu eksportu): node ... sweep-cases.ts cards770.json p770
P770 = true
const oppSpell = (c: Ctx) => { const sp = spell({ effect: 'damage', target: 'enemyPlayer', value: 3 }, { spellType: 'damage' }); c.op.hand.push(sp); playCard(c.g, 'you', sp.uid) }
scen('padėta; priešas sužaidžia burtą (−3 man)', 'Sprogstanti magija', (c) => { c.me.hand.push(c.X); playCard(c.g, 'ai', 'X'); oppTurn(c) }, oppSpell)
scen('padėta; priešas sužaidžia burtą (−3 man)', 'Stichijų skydas', (c) => { c.me.hand.push(c.X); playCard(c.g, 'ai', 'X'); oppTurn(c) }, oppSpell)
scen('sužaidžiama kaip burtas', 'Dūmų uždanga', () => {}, (c) => play(c))
scen('sužaidžiama, savi sužeisti', 'Meditacija', (c) => { (c.me.units[0] as unknown as { hp: number }).hp = 1; (c.me.units[1] as unknown as { hp: number }).hp = 3 }, (c) => play(c))
scen('padaras prikeliamas iš kapinyno', 'Kapinių žibintas', (c) => c.put(), (c) => revive(c, van()))
scen('Liliana lentoje, traukiu kortą', 'Mergelė Liliana', (c) => c.put(), (c) => { oppTurn(c); endTurn(c.g); beginTurn(c.g) })
scen('yra aktyvus priešo laukas', 'Išeinam', (c) => { const f = all.find((x) => x.type === 'field'); if (f) { oppTurn(c); c.op.hand.push({ ...f, uid: 'F' } as TutCard); console.log('   laukas:', f.name, JSON.stringify(playCard(c.g, 'you', 'F'))); endTurn(c.g); beginTurn(c.g); c.me.gold = 5000 } }, (c) => { console.log('   field prieš:', !!(c.g as unknown as { field?: unknown }).field); play(c); console.log('   field po:', !!(c.g as unknown as { field?: unknown }).field) })
scen('sužaidžiama', 'Šventintas vanduo', () => {}, (c) => play(c))
scen('sužaidžiama esant pilnam HP', 'Šventintas vanduo', (c) => { c.me.hp = 40 }, (c) => play(c))
