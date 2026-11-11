// ── Visų kortų elgsenos patikra tikrame variklyje ────────────────────────────
// Paleidimas: npm run cards:sweep -- <cards-export.json> [--games 90] [--out sweep.json]
// Įėjimas – cards lentelės eksportas (tie patys laukai kaip žaidimo užklausoje). Kiekviena korta paleidžiama
// ATSKIROJE paruoštoje situacijoje (savi ir priešo padarai, kapinynas, ranka) ir jai sukeliami visi jos trigeriai:
// sužaidimas, ataka, ėjimo pabaiga/pradžia, burtai, iškvietimas, mirtis, čempiono gebėjimai. Tikrinama, ar po to
// kas nors įvyko. Metodas – palyginimas: ta pati situacija paleidžiama su tikra korta ir su jos „tuščia“ kopija
// (tie patys skaičiai ir raktažodžiai, be efektų). Jei po trigerio būsena ir žurnalas nesiskiria – efektas nieko nepadarė.
// Formatas – Klasika (be ŽMK), kad žala būtų deterministinė.
import { readFileSync, writeFileSync } from 'node:fs'
import { createGame, beginTurn, endTurn, P, playCard, attack, useChampionAbility, championSkills, parseEffect, detectKeywords, mapCardType, type TutCard, type GameState } from '../src/lib/tutorial/engine'
import { parseGameplayConfig } from '../src/lib/game/types'

const args = process.argv.slice(2), file = args.find((a) => !a.startsWith('--'))
const opt = (k: string, d: number) => { const i = args.indexOf('--' + k); return i >= 0 ? Number(args[i + 1]) : d }
const outFile = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : null })()
if (!file) { console.error('Nurodyk kortų eksporto failą'); process.exit(2) }
type Row = { id: string; name: string; card_number: string | null; gold_cost: number | null; attack: number | null; health: number | null; effect_text: string | null; description: string | null; is_champion: boolean | null; subtype: string | null; champion_group: string | null; champion_phase: number | null; gameplay: unknown; card_type: { name: string } | null; rarity: { name: string | null; color_hex: string | null } | null; faction: { id: number; name: string; color_hex: string | null } | null; card_keywords: { keyword: { name: string } | null }[] | null }
const rows = JSON.parse(readFileSync(file, 'utf8')) as Row[]
function mapRow(c: Row): TutCard {
  const kw = (c.card_keywords ?? []).map((k) => k.keyword?.name ?? '').filter(Boolean), text = [c.effect_text, c.description].filter(Boolean).join(' '), gameplay = parseGameplayConfig(c.gameplay)
  return { id: c.id, uid: c.id, name: c.name, image: null, gold: c.gold_cost ?? 100, attack: c.attack, health: c.health, type: mapCardType(c.card_type?.name, !!c.is_champion), subtype: c.subtype ?? null,
    championGroup: c.champion_group ?? null, championPhase: c.champion_phase ?? null, keywords: Array.from(new Set([...detectKeywords(kw, text), ...((gameplay?.keywords ?? []) as ReturnType<typeof detectKeywords>)])),
    effectText: text, rarityColor: '#fff', rarityName: c.rarity?.name ?? null, factionColor: '#fff', factionId: c.faction?.id ?? null, factionName: c.faction?.name ?? null, effect: parseEffect(text), gameplay,
    mappings: gameplay?.virtualEnabled === false ? [] : gameplay?.effectMappings ?? [], needsMapping: !gameplay?.effectMappings?.length && !!text } as unknown as TutCard
}
const all = rows.map(mapRow)
const key = (c: TutCard) => c.name + ((c as { championPhase?: number | null }).championPhase ? '|' + (c as { championPhase?: number }).championPhase : '')
const curses = all.filter((c) => c.type === 'curse'), pool = all.filter((c) => c.type !== 'curse')
const byName = new Map<string, TutCard[]>(); for (const c of all) byName.set(c.name, [...(byName.get(c.name) ?? []), c])


type Ev = { t: string; key?: string; cardName?: string; kw?: string }
type Trig = { trigger: string; conditional: boolean; effect: string }
const IMM = new Set(['onSummon', 'onPlay', 'onCast'])
const STAGES: Record<string, string[]> = {
  onAttack: ['attack'], onAfterAttack: ['attack'], onAnyAttack: ['attack', 'oppAttack'], onDestroy: ['attack'], onAttacked: ['oppAttack'],
  onAnyDamage: ['castDmg', 'attack', 'oppCast', 'oppAttack'], onAnyHeal: ['castHeal', 'castHealX'], onAnyStatus: ['castFreeze', 'castShieldOwn'], onAnyCast: ['castDmg', 'castHeal', 'castFreeze', 'castBuffX', 'castHealX', 'oppCast'],
  onAnySummon: ['summonOwn', 'oppSummon'], onTurnEnd: ['endTurn1', 'endTurn2'], onTurnStart: ['beginOpp', 'beginOwn'], onDraw: ['beginOwn', 'beginOpp'], onAnyDraw: ['beginOwn', 'beginOpp'], onAnyGold: ['beginOwn', 'beginOpp'],
  onDeath: ['attack', 'castDmg', 'oppCast', 'oppAttack', 'deathOther', 'deathSelf', 'endTurn1', 'beginOpp', 'endTurn2', 'beginOwn'], onAnyDeath: ['deathOther', 'attack', 'oppAttack', 'deathSelf'],
}
const mapsOf = (c: TutCard): Trig[] => { const out: Trig[] = []; for (const m of (c.mappings ?? []) as unknown as Record<string, unknown>[]) if (typeof m.trigger === 'string') out.push({ trigger: m.trigger, conditional: !!m.condition || !!m.targetWoundedOnly, effect: String(m.effect) }); return out }
let n = 0
const van = (ref: TutCard, o: Record<string, unknown> = {}): TutCard => ({ id: 'v' + ++n, uid: 'v' + n, name: 'Manekenas', image: null, gold: 100, attack: 2, health: 5, type: 'unit', keywords: [], effectText: '', rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [],
  factionId: (ref as { factionId?: number | null }).factionId ?? null, factionName: (ref as { factionName?: string | null }).factionName ?? null, subtype: (ref as { subtype?: string | null }).subtype ?? null, ...o }) as unknown as TutCard
const B = (card: TutCard, o: Record<string, unknown> = {}) => ({ uid: card.uid, card, atk: card.attack ?? 0, hp: card.health ?? 1, maxHp: card.health ?? 1, shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0, isChampion: false, phase: 0, abilityUsed: false, ...o }) as never
const namesOf = (c: TutCard): string[] => { const out = new Set<string>(); const walk = (m: unknown) => { if (Array.isArray(m)) m.forEach(walk); else if (m && typeof m === 'object') { const o = m as Record<string, unknown>; for (const k of ['summonNames', 'summonName', 'cardName', 'tutorName']) if (typeof o[k] === 'string') String(o[k]).split(/[,;]/).forEach((x) => x.trim() && out.add(x.trim())); for (const v of Object.values(o)) walk(v) } }; walk(c.mappings); walk(c.gameplay); return [...out] }
const spell = (ref: TutCard, m: Record<string, unknown>) => van(ref, { type: 'spell', attack: null, health: null, gold: 0, mappings: [{ trigger: 'onPlay', requiresSelection: false, value: 1, triggersZmk: false, ...m }] })
type Vec = Record<string, number>
function digest(g: GameState): Vec {
  const d: Vec = {}; const gg = g as unknown as Record<string, unknown>
  for (const s of ['ai', 'you'] as const) { const p = P(g, s) as unknown as Record<string, unknown> & { units: (Record<string, unknown> | null)[]; hand: unknown[]; deck: unknown[]; discard: unknown[]; artifacts: unknown[]; reactions: unknown[] }
    d[s + '.hp'] = p.hp as number; d[s + '.maxHp'] = p.maxHp as number; d[s + '.gold'] = p.gold as number; d[s + '.hand'] = p.hand.length; d[s + '.deck'] = p.deck.length; d[s + '.grave'] = p.discard.length
    d[s + '.art'] = p.artifacts.filter(Boolean).length; d[s + '.react'] = p.reactions.filter(Boolean).length; d[s + '.curses'] = ((p.curses as unknown[]) ?? []).length; d[s + '.costMods'] = ((p.nextCardCostMods as unknown[]) ?? []).length + (p.turnCostDiscount ? 1 : 0)
    let hp = 0, atk = 0, mx = 0, cnt = 0, sh = 0, st = 0, stat = 0, kw = 0, au = 0
    for (const u of p.units) { if (!u) continue; cnt++; hp += u.hp as number; atk += u.atk as number; mx += u.maxHp as number; if (u.shield) sh++; if (u.stealth) st++; stat += Object.values((u.statuses as Record<string, unknown>) ?? {}).filter(Boolean).length; kw += (((u.card as { keywords?: unknown[] }).keywords) ?? []).length + ((u.grantedKeywords as unknown[]) ?? []).length; au += (u.attacksUsed as number) ?? 0 }
    Object.assign(d, { [s + '.u.n']: cnt, [s + '.u.hp']: hp, [s + '.u.atk']: atk, [s + '.u.max']: mx, [s + '.u.shield']: sh, [s + '.u.stealth']: st, [s + '.u.status']: stat, [s + '.u.kw']: kw, [s + '.u.used']: au }) }
  d.field = gg.field ? 1 : 0
  for (const k of ['pendingPeek', 'pendingArrange', 'pendingReveal', 'pendingSummon', 'pendingChoice', 'pendingCopy', 'pendingReturn', 'pendingBattlecry', 'pendingLastwish']) d[k] = gg[k] ? 1 : 0
  d.pendingResurrect = ((gg.pendingResurrect as unknown[]) ?? []).length
  return d
}
type Run = { play: string; stages: Record<string, Vec>; announce: Set<string>; blocked: Record<string, string[]>; skills: string[]; crash: string | null }
function run(card: TutCard): Run {
  const out: Run = { play: 'ok', stages: {}, announce: new Set(), blocked: {}, skills: [], crash: null }
  let stage = 'setup'
  try {
    const g: GameState = createGame(Array.from({ length: 30 }, () => van(card)), Array.from({ length: 30 }, () => van(card)), 'ai', { format: 'classic', curseCards: curses.slice(0, 8).map((x, i) => ({ ...x, uid: 'cu' + i })) } as never); beginTurn(g)
    const me = P(g, 'ai'), op = P(g, 'you'); me.hp = 30; op.hp = 30
    const v1 = van(card), v2 = van(card), e1 = van(card), e2 = van(card), e3 = van(card)
    me.units = [B(v1, { hp: 3 }), B(v2), null, null, null] as never; op.units = [B(e1), B(e2, { hp: 2 }), B(e3), null, null] as never
    me.discard.push(van(card), van(card), van(card), spell(card, { effect: 'damage', target: 'enemyUnit' })); op.discard.push(van(card), van(card))
    me.hand = [van(card), van(card), van(card)]; op.hand = [van(card), van(card), van(card)]
    // kortos, kurias efektai kviečia pagal vardą (Zombis, Skeletas…): po kopiją kaladėje, rankoje ir kapinyne
    for (const nm of namesOf(card)) { const ref = byName.get(nm)?.[0]; if (!ref) continue; me.deck.unshift({ ...ref, uid: 'd' + ++n } as TutCard, { ...ref, uid: 'd' + ++n } as TutCard); me.discard.push({ ...ref, uid: 'd' + ++n } as TutCard, { ...ref, uid: 'd' + ++n } as TutCard); me.hand.push({ ...ref, uid: 'd' + ++n } as TutCard) }
    op.artifacts[0] = { uid: 'oa', card: van(card, { type: 'artifact', attack: null, health: 3 }), hp: 3, maxHp: 3 } as never
    const c = { ...card, uid: 'X' } as TutCard
    const st = (name: string, fn: () => void) => { stage = name; me.gold = 5000; op.gold = 5000; const a = digest(g), n0 = g.log.length; fn(); const b = digest(g), v: Vec = {}
      for (const k of Object.keys(b)) if (b[k] !== a[k]) v[k] = b[k] - a[k]
      const ev = g.log.slice(n0) as unknown as Ev[]
      for (const e of ev) { if (e.t !== 'fxSource') v['log.' + e.t] = (v['log.' + e.t] ?? 0) + 1; if (e.t === 'blocked') (out.blocked[name] ??= []).push((e.key ?? '?').replace('battleLog.', '')) }
      if (ev.some((e) => e.cardName === card.name && (e.kw === 'trigger' || e.t === 'lastwish' || e.t === 'reactionTrigger' || e.t === 'battlecry' || e.t === 'artifact'))) out.announce.add(name)
      out.stages[name] = v }
    const unit = () => me.units.find((u) => u?.uid === 'X') as unknown as { uid: string; hp: number; summonedOnTurn: number; attacksUsed: number; statuses: Record<string, unknown>; abilityUsed: boolean; shield: boolean } | undefined
    const phase = (card as { championPhase?: number | null }).championPhase ?? 0
    if (card.type === 'champion') { me.units[2] = B(c, { isChampion: true, phase: phase || 1 }) as never; out.play = 'placed'; st('play', () => { /* padėta tiesiai */ }) }
    else { me.hand.push(c); st('play', () => { const r = playCard(g, 'ai', 'X') as { ok: boolean; reason?: string }; if (!r.ok) out.play = String(r.reason ?? '?').replace('battleLog.err.', '') }) }
    if (out.play === 'ok' || out.play === 'placed') {
      const cu = unit()
      if (cu && card.type === 'champion') championSkills(cu as never).forEach((s, i) => { if (!s.unlocked) { out.skills.push(`${i + 1}:užrakintas`); return } cu.abilityUsed = false; cu.statuses = {}
        let r = { ok: false } as { ok: boolean; reason?: string }; st('skill' + (i + 1), () => { r = useChampionAbility(g, 'ai', i) as { ok: boolean; reason?: string } }); out.skills.push(`${i + 1}:${r.ok ? 'ok' : 'klaida:' + String(r.reason ?? '').replace('battleLog.err.', '')}`) })
      for (const [nm, m] of [['castDmg', { effect: 'damage', target: 'enemyUnit' }], ['castHeal', { effect: 'heal', target: 'ownUnit' }], ['castFreeze', { effect: 'freeze', target: 'enemyUnit' }]] as const) { const sp = spell(card, m); me.hand.push(sp); st(nm, () => { playCard(g, 'ai', sp.uid) }) }
      // burtai, nutaikyti į PAČIĄ kortą („kai ant jo panaudojamas burtas“) ir statusas draugiškam padarui
      { const u = unit(); if (u) { for (const [nm, m] of [['castBuffX', { effect: 'buffAttack', target: 'ownUnit' }], ['castHealX', { effect: 'heal', target: 'ownUnit' }]] as const) { const sp = spell(card, { ...m, requiresSelection: true }); me.hand.push(sp); if (nm === 'castHealX' && u.hp > 1) u.hp -= 1; st(nm, () => { playCard(g, 'ai', sp.uid, { target: { kind: 'unit', side: 'ai', uid: 'X' } }) }) } }
        const o1 = me.units.find((x) => x && (x as unknown as { uid: string }).uid !== 'X') as unknown as { uid: string } | undefined, sp = spell(card, { effect: 'shield', target: 'ownUnit', requiresSelection: true }); me.hand.push(sp)
        st('castShieldOwn', () => { if (o1) playCard(g, 'ai', sp.uid, { target: { kind: 'unit', side: 'ai', uid: o1.uid } }) }) }
      { const vu = van(card); me.hand.push(vu); if (me.units.every(Boolean)) me.units[4] = null as never; st('summonOwn', () => { playCard(g, 'ai', vu.uid) }) }
      { const u = unit(); if (u) { u.summonedOnTurn = -1; u.attacksUsed = 0; u.statuses = {} } const t = op.units.find((x) => x && (x as unknown as { hp: number }).hp <= 2) ?? op.units.find(Boolean)
        st('attack', () => { if (u && t) attack(g, 'ai', 'X', { kind: 'unit', side: 'you', uid: (t as unknown as { uid: string }).uid }) }) }
      st('endTurn1', () => { endTurn(g) }); st('beginOpp', () => { beginTurn(g) })
      { const ou = van(card), os = spell(card, { effect: 'damage', target: 'enemyUnit' }); op.hand.push(ou, os); if (op.units.every(Boolean)) op.units[4] = null as never
        st('oppSummon', () => { playCard(g, 'you', ou.uid) }); st('oppCast', () => { playCard(g, 'you', os.uid) })
        const a = op.units.find((x) => x && (x as unknown as { summonedOnTurn: number }).summonedOnTurn < 0) as unknown as { uid: string; attacksUsed: number; statuses: Record<string, unknown> } | undefined
        const tg = unit() ?? (me.units.find(Boolean) as unknown as { uid: string } | undefined)
        st('oppAttack', () => { if (a && tg) { a.attacksUsed = 0; a.statuses = {}; attack(g, 'you', a.uid, { kind: 'unit', side: 'ai', uid: tg.uid }) } }) }
      st('endTurn2', () => { endTurn(g) }); st('beginOwn', () => { beginTurn(g) })
      { const o2 = me.units.find((x) => x && (x as unknown as { uid: string }).uid !== 'X') as unknown as { uid: string; hp: number } | undefined
        const sp = spell(card, { effect: 'damage', target: 'ownUnit', value: 9, requiresSelection: true }); me.hand.push(sp); st('deathOther', () => { if (o2) { o2.hp = 1; (o2 as unknown as { shield: boolean; statuses: Record<string, unknown> }).shield = false; (o2 as unknown as { statuses: Record<string, unknown> }).statuses = {}; playCard(g, 'ai', sp.uid, { target: { kind: 'unit', side: 'ai', uid: o2.uid } }) } })
        const u = unit(), sp2 = spell(card, { effect: 'damage', target: 'ownUnit', value: 9, requiresSelection: true }); me.hand.push(sp2); st('deathSelf', () => { if (u) { u.hp = 1; u.shield = false; u.statuses = {}; playCard(g, 'ai', sp2.uid, { target: { kind: 'unit', side: 'ai', uid: 'X' } }); const still = unit(); if (still) { still.hp = 1; still.attacksUsed = 0; still.summonedOnTurn = -1; const t = op.units.find(Boolean) as unknown as { uid: string } | undefined; if (t) attack(g, 'ai', 'X', { kind: 'unit', side: 'you', uid: t.uid }) } } else if (card.type === 'artifact') { const ar = me.artifacts.findIndex((x) => (x as unknown as { uid?: string } | null)?.uid === 'X'); if (ar >= 0) { const os2 = spell(card, { effect: 'destroy', target: 'enemyArtifact' }); op.hand.push(os2); /* artefakto sunaikinimas tikrinamas atskirai */ } } }) }
    }
  } catch (e) { out.crash = stage + ': ' + String((e as Error)?.stack ?? e).split('\n').slice(0, 3).join(' | ').slice(0, 260) }
  return out
}
// skelbimo įrašai (kovos šūksnis, paskutinis noras, reakcijos/artefakto suveikimas) – dar ne pokytis: efektas gali būti paskelbtas ir nieko nepadaryti
const ANN = ['log.battlecry', 'log.lastwish', 'log.reactionTrigger', 'log.artifact', 'log.trigger']
const core = (v?: Vec) => JSON.stringify(Object.entries(v ?? {}).filter(([k]) => !ANN.includes(k)).sort())
const same = (a?: Vec, b?: Vec) => core(a) === core(b)
const strip = (c: TutCard): TutCard => ({ ...c, mappings: [], effect: null, effectText: '', gameplay: (c.gameplay && (c.gameplay as { keywords?: unknown }).keywords) ? { keywords: (c.gameplay as { keywords?: unknown }).keywords } : null }) as unknown as TutCard
type Res = { name: string; type: string; text: string; play: string; crash: string | null; immediate: string; blocked: string[]; passive: boolean; trig: { trigger: string; state: string; conditional: boolean; effects: string }[]; skills: string[] }
function probe(card: TutCard): Res {
  const real = run(card), ctl = run(strip(card)), maps = mapsOf(card)
  const name = card.name + ((card as { championPhase?: number | null }).championPhase ? '|' + (card as { championPhase?: number }).championPhase : '')
  const diff = (s: string) => !same(real.stages[s], ctl.stages[s])
  const onlyBlocked = (s: string) => { const a = { ...(real.stages[s] ?? {}) }, b = { ...(ctl.stages[s] ?? {}) }; delete a['log.blocked']; delete b['log.blocked']; return same(a, b) && (real.blocked[s]?.length ?? 0) > 0 }
  const res: Res = { name, type: card.type, text: (card.effectText ?? '').slice(0, 170), play: real.play, crash: real.crash ?? (ctl.crash ? 'CTL ' + ctl.crash : null), immediate: 'n/a', blocked: [], passive: false, trig: [], skills: [] }
  const REACT = ['beginOpp', 'oppSummon', 'oppCast', 'oppAttack', 'endTurn2', 'beginOwn'], CASTS = ['castDmg', 'castHeal', 'castFreeze', 'castBuffX', 'castHealX', 'oppCast']
  const late = card.type === 'reaction' || card.type === 'artifact' || card.type === 'field'
  const imm = maps.filter((m) => IMM.has(m.trigger) && !(card.type === 'unit' && m.trigger === 'onCast'))
  if (imm.length && (real.play === 'ok')) { res.immediate = onlyBlocked('play') ? 'blocked' : diff('play') ? 'fired' : real.announce.has('play') && card.type !== 'artifact' && card.type !== 'reaction' && card.type !== 'field' ? 'silent' : late && (card.type === 'reaction' ? REACT : CASTS).some((s) => diff(s) && !onlyBlocked(s)) ? 'fired' : 'silent'; res.blocked = [...new Set(real.blocked.play ?? [])] }
  const g = card.gameplay as Record<string, unknown> | null
  res.passive = !!g && ['passiveAura', 'fieldEffectConfig', 'extraAttacks', 'attackWithShield', 'secondAttackVsShield', 'noRetaliationDamage', 'retreatAtHp', 'attackKeepsStealth', 'attackRestriction', 'ignoreTaunt', 'synergy'].some((k) => g[k] != null && g[k] !== false)
  const seen = new Map<string, Trig[]>(); for (const m of maps) { const t = card.type === 'unit' && m.trigger === 'onCast' ? 'onAnyCast' : m.trigger; if ((!IMM.has(t)) && t !== 'onChampionSkill') seen.set(t, [...(seen.get(t) ?? []), m]) }
  for (const [t, ms] of seen) { const sts = card.type === 'reaction' ? REACT : STAGES[t]; const state = !sts ? 'netikrinta' : sts.some((s) => diff(s) && !onlyBlocked(s)) ? 'fired' : sts.some((s) => real.announce.has(s)) ? 'paskelbta, bet be pokyčio' : sts.some((s) => onlyBlocked(s)) ? 'blocked:' + [...new Set(sts.flatMap((s) => real.blocked[s] ?? []))].join('+') : 'nieko'
    res.trig.push({ trigger: t, state, conditional: ms.every((m) => m.conditional), effects: [...new Set(ms.map((m) => m.effect))].join('+') }) }
  if (card.type === 'champion') res.skills = real.skills.map((s, i) => /:ok$/.test(s) ? (diff('skill' + (i + 1)) ? (onlyBlocked('skill' + (i + 1)) ? s.replace(':ok', ':blocked:' + (real.blocked['skill' + (i + 1)] ?? []).join('+')) : s) : s.replace(':ok', ':be pokyčio')) : s)
  return res
}
// savikontrolė: ta pati tuščia korta du kartus turi duoti identišką rezultatą (kitaip matavimas nepatikimas)
{ const t = strip(pool.find((c) => c.type === 'unit')!); const a = run(t), b = run(t); const bad = Object.keys(a.stages).filter((s) => !same(a.stages[s], b.stages[s])); if (bad.length) console.log('DĖMESIO: nedeterministiniai etapai:', bad.join(',')) }
const dbg = (() => { const i = args.indexOf('--debug'); return i >= 0 ? args[i + 1] : null })()
if (dbg) { const c = pool.find((x) => x.name === dbg)!; const r = run(c), k = run(strip(c)); console.log('play', r.play, 'crash', r.crash); for (const sname of Object.keys(r.stages)) console.log(sname.padEnd(14), JSON.stringify(r.stages[sname]), same(r.stages[sname], k.stages[sname]) ? '' : '  ≠ CTL ' + JSON.stringify(k.stages[sname])); process.exit(0) }
const out = pool.map(probe)
// „išimk vieną“: kortoms su keliais efektais – ar KIEKVIENAS efektas (ir jo „then“ grandinė) ką nors keičia bent viename etape
const deadMaps: { name: string; type: string; idx: number; part: string; trigger: string; effect: string; target: string; text: string }[] = []
for (const card of pool) { const ms = (card.mappings ?? []) as unknown as Record<string, unknown>[]; const variants: { idx: number; part: string; maps: unknown[] }[] = []
  ms.forEach((m, i) => { if (ms.length > 1) variants.push({ idx: i, part: 'efektas', maps: ms.filter((_, j) => j !== i) }); if (Array.isArray(m.then) && m.then.length) (m.then as unknown[]).forEach((_, k) => variants.push({ idx: i, part: 'then#' + (k + 1), maps: ms.map((x, j) => j === i ? { ...x, then: (x.then as unknown[]).filter((__, q) => q !== k) } : x) })) })
  if (!variants.length) continue
  const real = run(card); if (real.crash) continue
  for (const v of variants) { const alt = run({ ...card, mappings: v.maps, gameplay: card.gameplay ? { ...(card.gameplay as object), effectMappings: v.maps } : card.gameplay } as unknown as TutCard)
    const names = new Set([...Object.keys(real.stages), ...Object.keys(alt.stages)]); if ([...names].every((sn) => same(real.stages[sn], alt.stages[sn])) && real.play === alt.play) { const m = v.part === 'efektas' ? ms[v.idx] : (ms[v.idx].then as Record<string, unknown>[])[Number(v.part.slice(5)) - 1]
      deadMaps.push({ name: key(card), type: card.type, idx: v.idx, part: v.part, trigger: String(m.trigger ?? ms[v.idx].trigger), effect: String(m.effect), target: String(m.target), text: (card.effectText ?? '').slice(0, 150) }) } } }
const rep = {
  cards: out.length,
  crashed: out.filter((r) => r.crash).map((r) => ({ name: r.name, crash: r.crash })),
  playFail: out.filter((r) => r.play !== 'ok' && r.play !== 'placed').map((r) => ({ name: r.name, type: r.type, reason: r.play, text: r.text })),
  immediateSilent: out.filter((r) => r.immediate === 'silent').map((r) => ({ name: r.name, type: r.type, text: r.text })),
  immediateBlocked: out.filter((r) => r.immediate === 'blocked').map((r) => ({ name: r.name, type: r.type, blocked: r.blocked, text: r.text })),
  trigProblem: out.flatMap((r) => r.trig.filter((t) => t.state !== 'fired' && t.state !== 'netikrinta' && !t.conditional).map((t) => ({ name: r.name, type: r.type, trigger: t.trigger, state: t.state, effects: t.effects, text: r.text }))),
  trigConditional: out.flatMap((r) => r.trig.filter((t) => t.state !== 'fired' && t.state !== 'netikrinta' && t.conditional).map((t) => ({ name: r.name, trigger: t.trigger, state: t.state, effects: t.effects }))),
  trigUntested: out.flatMap((r) => r.trig.filter((t) => t.state === 'netikrinta').map((t) => ({ name: r.name, trigger: t.trigger }))),
  deadMaps,
  skillProblems: out.filter((r) => r.skills.some((s) => !/:ok$|užrakintas/.test(s))).map((r) => ({ name: r.name, skills: r.skills })),
}
if (outFile) writeFileSync(outFile, JSON.stringify({ rep, out }, null, 1))
console.log(JSON.stringify(Object.fromEntries(Object.entries(rep).map(([k, v]) => [k, Array.isArray(v) ? v.length : v]))))
