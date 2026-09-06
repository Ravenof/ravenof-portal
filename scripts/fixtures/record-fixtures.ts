// ── Fixture įrašymas: TS variklis → JSON „aukso etalonas" Godot/C# portui ───
// Paleidimas: npm run fixtures:record            (sintetinės kortos, visada veikia)
//             npm run fixtures:record -- --real  (fixtures/cards.json iš fixtures:export-cards)
//             npm run fixtures:record -- --games 20 --seed 100
//
// Kiekvienas fixture = viena pilna partija: seed, kaladės (pilni TutCard),
// veiksmų seka (NetAction) ir būsenos momentinė nuotrauka po KIEKVIENO veiksmo.
// C# Ravenof.Rules.Tests replay'ina tuos pačius veiksmus su tuo pačiu mulberry32
// seed'u ir lygina nuotraukas. Nesutapimas = porto klaida (arba TS pakeitimas –
// tada fixture'ai perrašomi sąmoningai ir commit'inami kartu su pakeitimu).
//
// 'ai' pusė – tikras DI (decideAiTurn, easy/normal/hard), 'you' pusė – paprasta
// deterministinė politika (žaidžia ką gali, atakuoja ką gali). Randomness'as
// eina TIK per src/lib/game/rng.ts.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import {
  createGame, applyNetAction, canAfford, canUnitAttack, legalTargets, P, other,
  parseEffect, detectKeywords, mapCardType,
  type TutCard, type GameState, type NetAction, type TargetRef, type Side, type BoardUnit,
} from '../../src/lib/tutorial/engine'
import { decideAiTurn } from '../../src/lib/tutorial/ai/aiEngine'
import type { AiDifficulty } from '../../src/lib/tutorial/ai/aiTypes'
import { parseGameplayConfig, type EffectMapping } from '../../src/lib/game/types'
import { seedRng, mulberry32 } from '../../src/lib/game/rng'

const FIXTURE_VERSION = 1
const MAX_STEPS = 600
const MAX_GLOBAL_TURNS = 80

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const arg = (k: string, d: string) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const REAL = argv.includes('--real')
const GAMES = Number(arg('--games', '12'))
const SEED0 = Number(arg('--seed', '1'))
const OUT = path.resolve(arg('--out', 'fixtures'))

// ── Kortų šaltinis ───────────────────────────────────────────────────────────
type Row = {
  id: string; name: string; image_url: string | null; gold_cost: number | null
  attack: number | null; health: number | null; effect_text: string | null; description: string | null
  is_champion: boolean | null; subtype: string | null; champion_group: string | null; champion_phase: number | null
  gameplay: unknown
  card_type: { name: string } | null
  rarity: { name: string | null; color_hex: string | null } | null
  faction: { id: number; name: string; color_hex: string | null } | null
  card_keywords: { keyword: { name: string } | null }[] | null
  card_number?: string | null
  status?: string | null
}

/** Veidrodis scenarioCards.mapRow BE lokalizacijos (fixture'ai visada LT). */
function mapRow(c: Row): Omit<TutCard, 'uid'> {
  const kwNames = (c.card_keywords ?? []).map((k) => k.keyword?.name ?? '').filter(Boolean)
  const text = [c.effect_text, c.description].filter(Boolean).join(' ')
  const gameplay = parseGameplayConfig(c.gameplay)
  return {
    id: c.id, name: c.name, image: null, gold: c.gold_cost ?? 100,
    attack: c.attack, health: c.health, type: mapCardType(c.card_type?.name, !!c.is_champion),
    subtype: c.subtype ?? null, championGroup: c.champion_group ?? null, championPhase: c.champion_phase ?? null,
    keywords: Array.from(new Set([...detectKeywords(kwNames, text), ...((gameplay?.keywords ?? []) as ReturnType<typeof detectKeywords>)])),
    effectText: text, rarityColor: c.rarity?.color_hex ?? '#d4af37', rarityName: c.rarity?.name ?? null,
    factionColor: c.faction?.color_hex ?? '#d4af37', factionId: c.faction?.id ?? null, factionName: c.faction?.name ?? null,
    effect: parseEffect(text), gameplay,
    mappings: gameplay?.virtualEnabled === false ? [] : gameplay?.effectMappings ?? [],
    needsMapping: !gameplay?.effectMappings?.length && !!text,
  } as Omit<TutCard, 'uid'>
}

function synthPool(): Omit<TutCard, 'uid'>[] {
  const base = (name: string, o: Partial<TutCard>): Omit<TutCard, 'uid'> => ({
    id: name, name, image: null, gold: 100, attack: 2, health: 3, type: 'unit', keywords: [],
    effectText: '', rarityColor: '#fff', factionColor: '#fff', effect: null, mappings: [], ...o,
  } as Omit<TutCard, 'uid'>)
  const m = (trigger: string, effect: string, target: string, value: number, extra: Record<string, unknown> = {}) =>
    ({ trigger, effect, target, value, triggersZmk: false, ...extra }) as unknown as EffectMapping
  return [
    base('Kareivis', { gold: 100, attack: 2, health: 2 }),
    base('Skydininkas', { gold: 200, attack: 1, health: 5, keywords: ['taunt'] }),
    base('Zvalgas', { gold: 100, attack: 3, health: 1, keywords: ['sprint'] }),
    base('Sargybinis', { gold: 300, attack: 3, health: 4, keywords: ['shield'] }),
    base('Seselis', { gold: 200, attack: 4, health: 2, keywords: ['stealth'] }),
    base('Riteris', { gold: 400, attack: 4, health: 5 }),
    base('Milzinas', { gold: 600, attack: 6, health: 7, keywords: ['taunt'] }),
    base('Sauklys', { gold: 300, attack: 2, health: 3, keywords: ['battlecry'], mappings: [m('onSummon', 'damage', 'enemyUnit', 2)] }),
    base('Gydytoja', { gold: 300, attack: 1, health: 4, keywords: ['battlecry'], mappings: [m('onSummon', 'heal', 'ownPlayer', 3)] }),
    base('Kerstas', { gold: 200, attack: 2, health: 2, keywords: ['lastwish'], mappings: [m('onDeath', 'damage', 'enemyPlayer', 2)] }),
    base('Ugnies kamuolys', { type: 'spell', gold: 300, attack: null, health: null, mappings: [m('onCast', 'damage', 'enemyUnit', 3)] }),
    base('Zaibas', { type: 'spell', gold: 200, attack: null, health: null, mappings: [m('onCast', 'damage', 'enemyPlayer', 2)] }),
    base('Palaiminimas', { type: 'spell', gold: 200, attack: null, health: null, mappings: [m('onCast', 'buffAttack', 'ownUnit', 2)] }),
    base('Gaisras', { type: 'spell', gold: 500, attack: null, health: null, mappings: [m('onCast', 'damage', 'allEnemyUnits', 2)] }),
    base('Isminties gurksnis', { type: 'spell', gold: 200, attack: null, health: null, mappings: [m('onCast', 'draw', 'ownPlayer', 2)] }),
  ]
}

function loadPool(): { pool: Omit<TutCard, 'uid'>[]; source: string } {
  const f = path.resolve('fixtures/cards.json')
  if (REAL) {
    if (!existsSync(f)) throw new Error('fixtures/cards.json nerastas – paleisk: npm run fixtures:export-cards')
    const rows = JSON.parse(readFileSync(f, 'utf8')) as Row[]
    const pool = rows
      .filter((r) => (r.status ?? 'published') !== 'hidden' && !(r.card_number ?? '').startsWith('TUT-'))
      .map(mapRow)
      .filter((c) => c.type !== 'curse' && c.type !== 'champion')  // v1: bazinis pool'as; čempionai/prakeiksmai – atskiri fixture'ai
    return { pool, source: `cards.json (${pool.length} kortų)` }
  }
  return { pool: synthPool(), source: 'synthetic' }
}

// ── Deterministinis kaladės rinkimas ─────────────────────────────────────────
function buildDeck(pool: Omit<TutCard, 'uid'>[], rnd: () => number, tag: string, size = 30): TutCard[] {
  const deck: TutCard[] = []
  const counts = new Map<string, number>()
  let guard = 0
  while (deck.length < size && guard++ < 5000) {
    const base = pool[Math.floor(rnd() * pool.length)]
    const n = counts.get(base.id) ?? 0
    if (n >= 3) continue
    counts.set(base.id, n + 1)
    deck.push({ ...base, uid: `${tag}${deck.length}-${base.id}` })
  }
  return deck
}

// ── Momentinė nuotrauka ──────────────────────────────────────────────────────
function unitSnap(u: BoardUnit | null) {
  if (!u) return null
  return {
    uid: u.uid, atk: u.atk, hp: u.hp, maxHp: u.maxHp, shield: u.shield, stealth: u.stealth,
    statuses: Object.keys(u.statuses).sort(), summonedOnTurn: u.summonedOnTurn, attacksUsed: u.attacksUsed,
    auraAtk: u.auraAtk ?? 0, auraHp: u.auraHp ?? 0,
  }
}
function sideSnap(g: GameState, s: Side) {
  const p = P(g, s)
  return {
    hp: p.hp, gold: p.gold, fatigue: p.fatigue ?? 0, turnNumber: p.turnNumber,
    hand: p.hand.map((c) => c.uid), deck: p.deck.map((c) => c.uid), discard: p.discard.map((c) => c.uid),
    units: p.units.map(unitSnap), artifacts: p.artifacts.map((a) => (a ? { uid: a.uid, hp: a.hp } : null)),
    reactions: p.reactions.map((r) => (r ? r.uid : null)), zmk: p.zmk.length, zmkGrave: [...p.zmkGrave],
  }
}
function snapshot(g: GameState) {
  const s = {
    active: g.active, globalTurn: g.globalTurn, winner: g.winner, logLen: g.log.length,
    field: g.field ? { uid: g.field.card.uid, owner: g.field.owner } : null,
    pending: {
      mulligan: !!g.pendingMulligan, summon: !!g.pendingSummon, peek: !!g.pendingPeek, arrange: !!g.pendingArrange,
      reveal: !!g.pendingReveal, choice: !!g.pendingChoice, copy: !!g.pendingCopy, ret: !!g.pendingReturn,
      battlecry: !!g.pendingBattlecry, lastwish: !!g.pendingLastwish, summonChain: (g.summonChain?.length ?? 0) > 0,
    },
    you: sideSnap(g, 'you'), ai: sideSnap(g, 'ai'),
  }
  const canonical = JSON.stringify(s)
  return { ...s, hash: createHash('sha256').update(canonical).digest('hex').slice(0, 16) }
}

// ── Politikos ────────────────────────────────────────────────────────────────
type Step = { i: number; action: NetAction; ok: boolean; reason?: string; snapshot: ReturnType<typeof snapshot> }

class Recorder {
  steps: Step[] = []
  g: GameState
  constructor(g: GameState) { this.g = g }
  apply(a: NetAction): boolean {
    const r = applyNetAction(this.g, a)
    this.steps.push({ i: this.steps.length, action: a, ok: r.ok, reason: r.reason, snapshot: snapshot(this.g) })
    return r.ok
  }
}

function firstEnemyUnit(g: GameState, s: Side): TargetRef | null {
  const u = P(g, other(s)).units.find((x): x is BoardUnit => !!x)
  return u ? { kind: 'unit', side: other(s), uid: u.uid } : null
}
function firstOwnUnit(g: GameState, s: Side): TargetRef | null {
  const u = P(g, s).units.find((x): x is BoardUnit => !!x)
  return u ? { kind: 'unit', side: s, uid: u.uid } : null
}

/** Automatiškai išsprendžia visus laukiančius pasirinkimus (deterministiškai: pirmas variantas). */
function resolvePending(rec: Recorder): boolean {
  const g = rec.g
  let did = false
  let guard = 0
  while (guard++ < 50) {
    if (g.winner) return did
    if (g.summonChain?.length) { rec.apply({ t: 'advanceSummon' }); did = true; continue }
    if (g.pendingReveal) { rec.apply({ t: 'clearReveal' }); did = true; continue }
    if (g.pendingSummon) { rec.apply({ t: 'resolveSummon', uids: g.pendingSummon.options.slice(0, g.pendingSummon.choose).map((o) => o.card.uid) }); did = true; continue }
    if (g.pendingPeek) { rec.apply({ t: 'resolvePeek', uids: g.pendingPeek.cards.slice(0, g.pendingPeek.choose).map((c) => c.uid) }); did = true; continue }
    if (g.pendingArrange) { rec.apply({ t: 'resolveArrange', uids: g.pendingArrange.cards.map((c) => c.uid) }); did = true; continue }
    if (g.pendingChoice) { rec.apply({ t: 'resolveChoice', index: 0 }); did = true; continue }
    if (g.pendingCopy) { rec.apply({ t: 'resolveCopy', uid: g.pendingCopy.options[0]?.card.uid ?? '' }); did = true; continue }
    if (g.pendingReturn) { const t = firstOwnUnit(g, g.pendingReturn.side); if (t && t.kind === 'unit') rec.apply({ t: 'resolveReturn', uid: t.uid }); else g.pendingReturn = null; did = true; continue }
    if (g.pendingBattlecry) {
      const s = g.pendingBattlecry.side
      const cands: TargetRef[] = [firstEnemyUnit(g, s), { kind: 'player', side: other(s) }, firstOwnUnit(g, s), { kind: 'player', side: s }].filter((x): x is TargetRef => !!x)
      let ok = false
      for (const t of cands) { if (rec.apply({ t: 'resolveBattlecry', target: t })) { ok = true; break } }
      if (!ok) g.pendingBattlecry = null
      did = true; continue
    }
    if (g.pendingLastwish) {
      const s = g.pendingLastwish.side
      const cands: TargetRef[] = [firstEnemyUnit(g, s), { kind: 'player', side: other(s) }, firstOwnUnit(g, s)].filter((x): x is TargetRef => !!x)
      let ok = false
      for (const t of cands) { if (rec.apply({ t: 'resolveLastwish', targets: [t] })) { ok = true; break } }
      if (!ok) g.pendingLastwish = null
      did = true; continue
    }
    return did
  }
  return did
}

/** 'you' pusė: paprasta deterministinė politika. */
function scriptedTurn(rec: Recorder) {
  const g = rec.g
  const s: Side = 'you'
  let guard = 0
  while (guard++ < 40 && !g.winner && g.active === s) {
    resolvePending(rec)
    if (g.winner || g.active !== s) return
    const p = P(g, s)
    // 1) sužaisk pirmą įperkamą kortą
    let played = false
    for (const c of [...p.hand]) {
      if (!canAfford(g, s, c)) continue
      if (c.type === 'curse') continue
      const tries: (TargetRef | undefined)[] = [undefined, firstEnemyUnit(g, s) ?? undefined, { kind: 'player', side: other(s) }, firstOwnUnit(g, s) ?? undefined]
      for (const t of tries) {
        if (t === undefined && tries.indexOf(t) !== 0) continue
        if (rec.apply({ t: 'play', actor: s, uid: c.uid, target: t })) { played = true; break }
      }
      if (played) break
    }
    if (played) continue
    // 2) atakuok: taunt/legalus pirmas; veidas – jei galima
    let attacked = false
    for (const u of p.units) {
      if (!u) continue
      if (!canUnitAttack(g, s, u).ok) continue
      const lt = legalTargets(g, s, u)
      if (!lt.length) continue
      const face = lt.find((t) => t.kind === 'player')
      const target = (u.atk >= 4 && face) ? face : lt[0]
      if (rec.apply({ t: 'attack', actor: s, uid: u.uid, target })) { attacked = true; break }
    }
    if (attacked) continue
    break
  }
  resolvePending(rec)
  if (!g.winner && g.active === s) rec.apply({ t: 'endTurn', actor: s })
}

/** 'ai' pusė: tikras DI per decideAiTurn → NetAction (veidrodis aiNextAction ciklui). */
function aiTurn(rec: Recorder, difficulty: AiDifficulty) {
  const g = rec.g
  const s: Side = 'ai'
  let guard = 0
  while (guard++ < 40 && !g.winner && g.active === s) {
    resolvePending(rec)
    if (g.winner || g.active !== s) return
    const ranked = decideAiTurn(g, { difficulty })
    let acted = false
    for (const a of ranked) {
      if (a.score <= 0) break
      const d = a.descriptor
      let ok = false
      if (d.type === 'ability') ok = rec.apply({ t: 'champ', actor: s, skillIndex: d.skillIndex, target: d.target, targets: d.targets })
      else if (d.type === 'play') ok = rec.apply({ t: 'play', actor: s, uid: d.uid, target: d.opts?.target, targets: d.opts?.targets, sacrificeUid: d.opts?.sacrificeUid })
      else if (d.type === 'attack') ok = rec.apply({ t: 'attack', actor: s, uid: d.uid, target: d.target })
      else if (d.type === 'discardGold') ok = rec.apply({ t: 'discardForGold', actor: s, uid: d.uid })
      if (ok) { acted = true; break }
    }
    if (!acted) break
  }
  resolvePending(rec)
  if (!g.winner && g.active === s) rec.apply({ t: 'endTurn', actor: s })
}

// ── Partija ──────────────────────────────────────────────────────────────────
function recordGame(idx: number, seed: number, pool: Omit<TutCard, 'uid'>[], source: string) {
  const difficulty: AiDifficulty = (['easy', 'normal', 'hard'] as const)[idx % 3]
  const first: Side = idx % 2 === 0 ? 'you' : 'ai'
  const deckRnd = mulberry32(seed * 7919 + 17)
  const deckYou = buildDeck(pool, deckRnd, 'Y')
  const deckAi = buildDeck(pool, deckRnd, 'A')

  seedRng(seed)
  const g = createGame(deckYou, deckAi, first, { mulligan: true })
  const rec = new Recorder(g)
  const initial = snapshot(g)

  if (g.pendingMulligan) rec.apply({ t: 'mulligan', actor: 'you', uids: g.you.hand.slice(0, 1).map((c) => c.uid) })

  let guard = 0
  while (!g.winner && rec.steps.length < MAX_STEPS && g.globalTurn <= MAX_GLOBAL_TURNS && guard++ < 400) {
    if (g.active === 'you') scriptedTurn(rec)
    else aiTurn(rec, difficulty)
  }

  return {
    version: FIXTURE_VERSION,
    name: `game${String(idx + 1).padStart(2, '0')}-seed${seed}-${difficulty}`,
    source, seed, first, difficulty,
    opts: { mulligan: true, zmkDefs: null },
    decks: { you: deckYou, ai: deckAi },
    initial,
    steps: rec.steps,
    final: { winner: g.winner, globalTurn: g.globalTurn, steps: rec.steps.length, youHp: g.you.hp, aiHp: g.ai.hp },
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
const { pool, source } = loadPool()
mkdirSync(OUT, { recursive: true })
const index: { file: string; seed: number; difficulty: string; winner: Side | null; steps: number; globalTurn: number }[] = []
for (let i = 0; i < GAMES; i++) {
  const seed = SEED0 + i
  const fx = recordGame(i, seed, pool, source)
  const file = `${fx.name}.json`
  writeFileSync(path.join(OUT, file), JSON.stringify(fx, null, 1))
  index.push({ file, seed, difficulty: fx.difficulty, winner: fx.final.winner, steps: fx.final.steps, globalTurn: fx.final.globalTurn })
  console.log(`✓ ${file}  winner=${fx.final.winner ?? '—'}  steps=${fx.final.steps}  turns=${fx.final.globalTurn}`)
}
writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ version: FIXTURE_VERSION, source, generatedBy: 'scripts/fixtures/record-fixtures.ts', games: index }, null, 2))
console.log(`\n${GAMES} fixture'ai → ${OUT} (${source})`)
