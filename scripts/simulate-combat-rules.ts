// ── Kovos taisyklių regresijos (754–755, auditas 2026-11-11) ─────────────────────
// Paleidimas: npx tsx scripts/simulate-combat-rules.ts   (npm run game:test:combatrules)
// Dengia: atakos žala eina per tuos pačius mažinimus/padarinius kaip burtų žala
// (žalos mažinimo aura, retreatAtHp, onAnyDamage), nutildyto puolėjo onAttack,
// apnuodyto puolėjo žala žaidėjui (×2 aura), degimo tikas mirusiam padarui,
// aura po atidėto prisikėlimo, nežinomas target, sušaldyto žurnalo dublis.
import { createGame, beginTurn, endTurn, attack, playCard, recomputeAuras, type TutCard, type GameState } from '../src/lib/tutorial/engine'

let pass = 0, fail = 0
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗ FAIL:', name, extra) }
}
const ZMK0 = [{ id: 'z', name: '+0', description: null, value: '+0' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
function mk(over: Record<string, unknown> & { name: string }): TutCard {
  return { id: over.name, uid: over.name, image: null, gold: 0, attack: 2, health: 3, type: 'unit', keywords: [], effectText: '',
    rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [], ...over } as TutCard
}
const filler = (n: number, tag: string) => Array.from({ length: n }, (_, i) => mk({ name: `${tag}${i}`, uid: `${tag}${i}` }))
const B = (card: TutCard, o: Record<string, unknown> = {}) => ({ uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1,
  shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false, ...o }) as never
const fresh = (): GameState => { const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZMK0 } as never); beginTurn(g); return g }
const row = (...u: unknown[]) => [...u, null, null, null, null, null].slice(0, 5) as never
const U = (g: GameState, side: 'you' | 'ai', i = 0) => g[side].units[i] as unknown as { hp: number; atk: number } | null
const PERM = 999999

console.log('\n── 1. Žalos mažinimo aura galioja ir atakos žalai ──')
{
  const g = fresh()
  g.ai.units = row(B(mk({ name: 'Tank', attack: 0, health: 10, gameplay: { passiveAura: { auraScope: 'friendly', auraDamageReductionPct: 50, auraIncludesSelf: true } } })))
  g.you.units = row(B(mk({ name: 'Att', attack: 4, health: 5 })))
  recomputeAuras(g)
  attack(g, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Tank' })
  check('4 ATK su 50 % aura → 10 − 2 = 8', U(g, 'ai')?.hp === 8, String(U(g, 'ai')?.hp))
}
console.log('\n── 2. retreatAtHp suveikia po kovos žalos ──')
{
  const g = fresh()
  g.ai.units = row(B(mk({ name: 'Ret', attack: 0, health: 5, gameplay: { retreatAtHp: 2 } })))
  g.you.units = row(B(mk({ name: 'Att', attack: 3, health: 5 })))
  const hand0 = g.ai.hand.length
  attack(g, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Ret' })
  check('padaras paliko lauką', !g.ai.units[0])
  check('ir grįžo į ranką', g.ai.hand.length === hand0 + 1 && g.ai.hand.some((c) => c.name === 'Ret'))
}
console.log('\n── 3. onAnyDamage šauna ir nuo kovos žalos ──')
{
  const g = fresh()
  const w = mk({ name: 'Watch', attack: 0, health: 9, mappings: [{ trigger: 'onAnyDamage', effect: 'gainGold', target: 'self', value: 100, requiresSelection: false }] })
  g.ai.units = row(B(w), B(mk({ name: 'Def', attack: 0, health: 9 })))
  g.you.units = row(B(mk({ name: 'Att', attack: 3, health: 5 })))
  const g0 = g.ai.gold
  attack(g, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Def' })
  check('klausytojas gavo auksą', g.ai.gold - g0 >= 100, String(g.ai.gold - g0))
}
console.log('\n── 4. Nutildytas puolėjas nevykdo onAttack ──')
{
  const mapAtk = [{ trigger: 'onAttack', effect: 'gainGold', target: 'self', value: 500, requiresSelection: false }]
  const g = fresh()
  g.you.units = row(B(mk({ name: 'Att', attack: 2, health: 5, mappings: mapAtk }), { statuses: { silenced: PERM } }))
  g.ai.units = row(B(mk({ name: 'Def', attack: 1, health: 9 })))
  const gold0 = g.you.gold; attack(g, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Def' })
  check('nutildytas: aukso negavo', g.you.gold === gold0, String(g.you.gold - gold0))
  const g2 = fresh()
  g2.you.units = row(B(mk({ name: 'Att', attack: 2, health: 5, mappings: mapAtk })))
  g2.ai.units = row(B(mk({ name: 'Def', attack: 1, health: 9 })))
  const gold2 = g2.you.gold; attack(g2, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Def' })
  check('nenutildytas: gavo 500', g2.you.gold - gold2 === 500, String(g2.you.gold - gold2))
}
console.log('\n── 5. Apnuodytas puolėjas į žaidėją — tas pats kelias (×2 aura) ──')
{
  const dbl = () => mk({ name: 'Dbl', attack: 0, health: 9, gameplay: { passiveAura: { auraHeroDamageDouble: true } } })
  const g = fresh(); g.you.units = row(B(mk({ name: 'Att', attack: 3, health: 5 })), B(dbl()))
  let h0 = g.ai.hp; attack(g, 'you', 'Att', { kind: 'player', side: 'ai' }); const normal = h0 - g.ai.hp
  const g2 = fresh(); g2.you.units = row(B(mk({ name: 'Att', attack: 3, health: 5 }), { statuses: { poisoned: PERM } }), B(dbl()))
  h0 = g2.ai.hp; attack(g2, 'you', 'Att', { kind: 'player', side: 'ai' }); const pois = h0 - g2.ai.hp
  check('sveikas: 3 × 2 = 6', normal === 6, String(normal))
  check('apnuodytas (ŽMK visos +0): irgi 6', pois === 6, String(pois))
}
console.log('\n── 6. Degimo tikas nepataiko į tame pačiame cikle žuvusį padarą ──')
{
  const g = fresh(); endTurn(g)
  const bomb = mk({ name: 'Bomb', attack: 1, health: 1, mappings: [{ trigger: 'onDeath', effect: 'damage', target: 'allOwnUnits', value: 5, requiresSelection: false }] })
  g.ai.units = row(B(bomb, { statuses: { burning: PERM } }), B(mk({ name: 'V', attack: 1, health: 2 }), { statuses: { burning: PERM } }))
  const l0 = g.log.length; beginTurn(g)
  const dv = g.log.slice(l0).filter((e) => e.t === 'damage' && e.cardName === 'V')
  check('V gavo tik Paskutinio noro žalą (1 įrašas)', dv.length === 1, JSON.stringify(dv.map((e) => e.value)))
}
console.log('\n── 7. Atidėtas prisikėlimas: aura nuimama iškart ──')
{
  const g = fresh()
  const src = mk({ name: 'Aura', attack: 1, health: 1, gameplay: { passiveAura: { auraScope: 'friendly', auraAttack: 2 } },
    mappings: [{ trigger: 'onDeath', effect: 'resurrectSelf', target: 'selfUnit', requiresSelection: false, resurrectTiming: 'startOfNextTurn' }] })
  g.ai.units = row(B(src), B(mk({ name: 'Bud', attack: 1, health: 9 })))
  g.you.units = row(B(mk({ name: 'Att', attack: 3, health: 5 })))
  recomputeAuras(g)
  check('prieš: draugas 1 + 2 = 3 ATK', U(g, 'ai', 1)?.atk === 3)
  attack(g, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Aura' })
  check('po šaltinio žūties: 1 ATK', U(g, 'ai', 1)?.atk === 1, String(U(g, 'ai', 1)?.atk))
}
console.log('\n── 8. Nežinomas target nenulaužia veiksmo ──')
{
  const g = fresh()
  g.you.hand.push(mk({ name: 'Sp', type: 'spell', gold: 0, mappings: [{ trigger: 'onPlay', effect: 'damage', target: 'nesamasTaikinys', value: 1, requiresSelection: false }] }))
  let threw = false
  try { playCard(g, 'you', 'Sp') } catch { threw = true }
  check('playCard neišmeta klaidos', !threw)
}
console.log('\n── 9. Sušaldytas gynėjas: vienas žurnalo įrašas ──')
{
  const g = fresh()
  g.ai.units = row(B(mk({ name: 'Def', attack: 2, health: 9 }), { statuses: { frozen: 99 } }))
  g.you.units = row(B(mk({ name: 'Att', attack: 3, health: 5 })))
  const l0 = g.log.length; attack(g, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Def' })
  const fr = g.log.slice(l0).filter((e) => /frozenNo/.test(e.key ?? ''))
  check('tik frozenNoRetaliate', fr.length === 1 && fr[0].key === 'battleLog.frozenNoRetaliate', JSON.stringify(fr.map((e) => e.key)))
  check('puolėjas žalos negavo', U(g, 'you')?.hp === 5)
}
console.log('\n── 10. Įprasta kova nepakito ──')
{
  const g = fresh()
  g.ai.units = row(B(mk({ name: 'Def', attack: 2, health: 9 })))
  g.you.units = row(B(mk({ name: 'Att', attack: 3, health: 5 })))
  attack(g, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Def' })
  check('gynėjas 9 − 3 = 6, puolėjas 5 − 2 = 3', U(g, 'ai')?.hp === 6 && U(g, 'you')?.hp === 3, `${U(g, 'ai')?.hp}/${U(g, 'you')?.hp}`)
}
console.log('\n── 11. Laikinas +HP baigdamasis gyvybės neatima (755) ──')
{
  const g = fresh()
  g.you.units = row(B(mk({ name: 'U', attack: 2, health: 2 })))
  g.you.hand.push(mk({ name: 'Sp', type: 'spell', gold: 0, mappings: [{ trigger: 'onPlay', effect: 'buffHealth', target: 'ownUnit', value: 3, requiresSelection: false, buffDuration: 'endOfTurn' }] }))
  playCard(g, 'you', 'Sp', { target: { kind: 'unit', side: 'you', uid: 'U' } })
  const u = g.you.units[0] as unknown as { hp: number; maxHp: number }
  check('po buff 5/5', u.hp === 5 && u.maxHp === 5, `${u.hp}/${u.maxHp}`)
  u.hp -= 3; endTurn(g)
  check('2/5 → buff baigiasi → 2/2 (ne 1/2)', u.hp === 2 && u.maxHp === 2, `${u.hp}/${u.maxHp}`)
  const g2 = fresh()
  g2.you.units = row(B(mk({ name: 'U', attack: 2, health: 2 })))
  g2.you.hand.push(mk({ name: 'Sp', type: 'spell', gold: 0, mappings: [{ trigger: 'onPlay', effect: 'buffHealth', target: 'ownUnit', value: 3, requiresSelection: false, buffDuration: 'endOfTurn' }] }))
  playCard(g2, 'you', 'Sp', { target: { kind: 'unit', side: 'you', uid: 'U' } }); endTurn(g2)
  const u2 = g2.you.units[0] as unknown as { hp: number; maxHp: number }
  check('nesužeistas 5/5 → 2/2', u2.hp === 2 && u2.maxHp === 2, `${u2.hp}/${u2.maxHp}`)
}
console.log('\n── 12. Paskutinio noro iškvietimas pilnoje lentoje gauna mirštančiojo vietą (755) ──')
{
  const g = fresh()
  const dier = mk({ name: 'Dier', attack: 1, health: 1, mappings: [{ trigger: 'onDeath', effect: 'summonFromDeck', target: 'self', requiresSelection: false, value: 1 }] })
  g.ai.units = row(B(dier), B(mk({ name: 'f1' })), B(mk({ name: 'f2' })), B(mk({ name: 'f3' })), B(mk({ name: 'f4' })))
  g.you.units = row(B(mk({ name: 'Att', attack: 3, health: 5 })))
  const grave0 = g.ai.discard.length
  attack(g, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Dier' })
  const names = g.ai.units.map((x) => (x as unknown as { card: TutCard } | null)?.card.name ?? null)
  check('lenta vėl pilna (5), be Dier', names.filter(Boolean).length === 5 && !names.includes('Dier'), JSON.stringify(names))
  check('Dier kapinyne', g.ai.discard.length === grave0 + 1 && g.ai.discard.some((c) => c.name === 'Dier'))
  check('nėra „zona pilna" įrašo', !g.log.some((e) => e.key === 'battleLog.zoneFullSummon'))
}
console.log('\n── 13. onAnyDamage + triggerOnSelfTarget: tik kai žalą gauna ŠI korta; oncePerTurn (755) ──')
{
  const g = fresh()
  const self = mk({ name: 'Ulv', attack: 0, health: 9, mappings: [{ trigger: 'onAnyDamage', effect: 'gainGold', target: 'self', value: 100, requiresSelection: false, triggerOnSelfTarget: true, oncePerTurn: true }] })
  g.ai.units = row(B(self), B(mk({ name: 'Kitas', attack: 0, health: 9 })))
  g.you.units = row(B(mk({ name: 'A1', attack: 1, health: 5 })), B(mk({ name: 'A2', attack: 1, health: 5 })), B(mk({ name: 'A3', attack: 1, health: 5 })))
  const g0 = g.ai.gold
  attack(g, 'you', 'A1', { kind: 'unit', side: 'ai', uid: 'Kitas' })
  check('žala kitam padarui – nesuveikia', g.ai.gold === g0, String(g.ai.gold - g0))
  attack(g, 'you', 'A2', { kind: 'unit', side: 'ai', uid: 'Ulv' })
  check('žala šiai kortai – suveikia', g.ai.gold - g0 === 100, String(g.ai.gold - g0))
  attack(g, 'you', 'A3', { kind: 'unit', side: 'ai', uid: 'Ulv' })
  check('antrą kartą tą patį ėjimą – ne', g.ai.gold - g0 === 100, String(g.ai.gold - g0))
}
console.log('\n── 14. Permapintos kortos: onAfterAttack susinaikinimas / grįžimas, Įsiūtis (755) ──')
{
  const g = fresh()
  g.you.units = row(B(mk({ name: 'Kazuma', attack: 2, health: 2, mappings: [{ trigger: 'onAfterAttack', effect: 'destroy', target: 'selfUnit', requiresSelection: false }] })),
    B(mk({ name: 'Natsumi', attack: 2, health: 2, mappings: [{ trigger: 'onAfterAttack', effect: 'returnToHand', target: 'selfUnit', requiresSelection: false }] })))
  g.ai.units = row(B(mk({ name: 'Def', attack: 0, health: 9 })))
  attack(g, 'you', 'Kazuma', { kind: 'unit', side: 'ai', uid: 'Def' })
  check('Kazuma po atakos susinaikino', !g.you.units[0] && g.you.discard.some((c) => c.name === 'Kazuma'))
  attack(g, 'you', 'Natsumi', { kind: 'unit', side: 'ai', uid: 'Def' })
  check('Natsumi po atakos grįžo į ranką', !g.you.units[1] && g.you.hand.some((c) => c.name === 'Natsumi'))
  const g2 = fresh()
  g2.ai.units = row(B(mk({ name: 'Vry', attack: 6, health: 7, gameplay: { passiveAura: { enrageAttack: 3 } } })))
  g2.you.units = row(B(mk({ name: 'Att', attack: 1, health: 20 })))
  recomputeAuras(g2)
  check('sveikas: 6 ATK', U(g2, 'ai')?.atk === 6, String(U(g2, 'ai')?.atk))
  attack(g2, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Vry' })
  check('sužeistas atakos: 9 ATK', U(g2, 'ai')?.atk === 9, String(U(g2, 'ai')?.atk))
}
console.log('\n── 15. Atakos pasyvai: skydas / sėlinimas / be atgalinės žalos (762) ──')
{
  const g = fresh()
  g.you.units = row(B(mk({ name: 'Furu', attack: 3, health: 4, gameplay: { attackWithShield: true } })),
    B(mk({ name: 'Harp', attack: 3, health: 2, gameplay: { noRetaliationDamage: true } })),
    B(mk({ name: 'Kei', attack: 1, health: 1, gameplay: { attackKeepsStealth: true } })),
    B(mk({ name: 'Tyl', attack: 3, health: 4, gameplay: { attackWithShield: true } }), { statuses: { silenced: PERM } }))
  g.ai.units = row(B(mk({ name: 'Def', attack: 2, health: 30 })))
  attack(g, 'you', 'Furu', { kind: 'unit', side: 'ai', uid: 'Def' })
  check('„puldamas turi skydą": atgalinė žala sugerta (4 HP)', U(g, 'you', 0)?.hp === 4, String(U(g, 'you', 0)?.hp))
  check('gynėjas žalą gavo (30 − 3)', U(g, 'ai')?.hp === 27, String(U(g, 'ai')?.hp))
  attack(g, 'you', 'Harp', { kind: 'unit', side: 'ai', uid: 'Def' })
  check('„negauna atgalinės žalos": 2 HP lieka', U(g, 'you', 1)?.hp === 2, String(U(g, 'you', 1)?.hp))
  attack(g, 'you', 'Kei', { kind: 'player', side: 'ai' })
  check('„puldamas turi Sėlinimą": po atakos stealth = true', (g.you.units[2] as unknown as { stealth: boolean }).stealth === true)
  attack(g, 'you', 'Tyl', { kind: 'unit', side: 'ai', uid: 'Def' })
  check('nutildytam pasyvas negalioja (4 − 2 = 2)', U(g, 'you', 3)?.hp === 2, String(U(g, 'you', 3)?.hp))
}
console.log('\n── 16. ŽMK „A veikia kaip B" aura ir iškvietimas „vietoje X" (762) ──')
{
  const ZP2 = [{ id: 'z', name: '+2', description: null, value: '+2' as const, count: 20, mode: 'auto' as const, image_url: null, active: true, sort_order: 1 }]
  const g = createGame(filler(30, 'X'), filler(30, 'A'), 'you', { zmkDefs: ZP2 } as never); beginTurn(g)
  g.you.units = row(B(mk({ name: 'Att', attack: 3, health: 9 })), B(mk({ name: 'Tomis', attack: 3, health: 1, gameplay: { passiveAura: { auraZmkRemapFrom: '+2', auraZmkRemapTo: 'x2' } } })))
  g.ai.units = row(B(mk({ name: 'Def', attack: 0, health: 30 })))
  attack(g, 'you', 'Att', { kind: 'unit', side: 'ai', uid: 'Def' })
  check('+2 skaičiuojama kaip ×2: 3 × 2 = 6 (ne 5)', U(g, 'ai')?.hp === 24, String(U(g, 'ai')?.hp))
  const g2 = fresh()
  g2.you.deck = [mk({ name: 'Šauklys', uid: 'Sk', attack: 2, health: 2, gameplay: { summonAlias: 'Zombis' } }), mk({ name: 'Kitas', uid: 'Kt' })]
  g2.you.hand.push(mk({ name: 'Kvietimas', type: 'spell', gold: 0, mappings: [{ trigger: 'onPlay', effect: 'summonAdvanced', target: 'self', requiresSelection: false, summonZones: ['deck'], summonNames: 'Zombis', summonCount: 1 }] }))
  playCard(g2, 'you', 'Kvietimas')
  check('„Zombio" iškvietimas paima kortą su alias „Zombis"', g2.you.units.some((x) => (x as unknown as { card: TutCard } | null)?.card.name === 'Šauklys'))
}
console.log('\n── 17. refreshAttacks: jau puolę padarai puola dar kartą + trauk už kiekvieną (762) ──')
{
  const g = fresh()
  g.you.units = row(B(mk({ name: 'A1', attack: 1, health: 5 })), B(mk({ name: 'A2', attack: 1, health: 5 })), B(mk({ name: 'A3', attack: 1, health: 5 })))
  g.ai.units = row(B(mk({ name: 'Def', attack: 0, health: 30 })))
  attack(g, 'you', 'A1', { kind: 'unit', side: 'ai', uid: 'Def' }); attack(g, 'you', 'A2', { kind: 'unit', side: 'ai', uid: 'Def' })
  g.you.hand.push(mk({ name: 'Taktikos', type: 'spell', gold: 0, mappings: [{ trigger: 'onPlay', effect: 'refreshAttacks', target: 'self', value: 1, requiresSelection: false }] }))
  const hand0 = g.you.hand.length
  playCard(g, 'you', 'Taktikos')
  check('2 puolę padarai vėl gali pulti', attack(g, 'you', 'A1', { kind: 'unit', side: 'ai', uid: 'Def' }).ok && attack(g, 'you', 'A2', { kind: 'unit', side: 'ai', uid: 'Def' }).ok)
  check('ištrauktos 2 kortos (ranka −1 burtas +2)', g.you.hand.length === hand0 - 1 + 2, `${hand0} -> ${g.you.hand.length}`)
  check('nepuolęs A3 turi tik savo vieną ataką', attack(g, 'you', 'A3', { kind: 'unit', side: 'ai', uid: 'Def' }).ok && !attack(g, 'you', 'A3', { kind: 'unit', side: 'ai', uid: 'Def' }).ok)
}
console.log(`\n${pass} ✓ / ${fail} ✗`); if (fail) process.exit(1)
