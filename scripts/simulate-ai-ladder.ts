// ── DI lygių kopėčios ir kaladės statytojo patikra ───────────────────────────
// Paleidimas: node ... scripts/simulate-ai-ladder.ts <cards-export.json> [--games 8] [--faction 9] [--a hard] [--b normal] [--ms 100] [--demo]
// 1) Kaladės statytojas: kiekvienai frakcijai sustato kaladę ir patikrina taisykles (dydis, kopijų limitai, be prakeiksmų).
// 2) Tarpusavio kovos (Klasika): lygis A prieš lygį B tomis pačiomis kaladėmis, keičiantis pusėmis.
import { readFileSync } from 'node:fs'
import { createGame, beginTurn, endTurn, P, swapPerspective, parseEffect, detectKeywords, mapCardType, type TutCard, type GameState } from '../src/lib/tutorial/engine'
import { parseGameplayConfig } from '../src/lib/game/types'
import { aiNextAction, type AiDifficulty } from '../src/lib/tutorial/ai'
import { MASTER_CFG } from '../src/lib/tutorial/ai/aiMaster'
import { planStrategicDeck } from '../src/lib/tutorial/ai/aiDeckBuilder'

const args = process.argv.slice(2), file = args.find((a) => !a.startsWith('--') && a.endsWith('.json'))
const opt = (k: string, d: string) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d }
if (!file) { console.error('Nurodyk kortų eksporto failą'); process.exit(2) }
type Row = Record<string, unknown> & { name: string }
const rows = JSON.parse(readFileSync(file, 'utf8')) as Row[]
const all = rows.map((c) => { const kw = ((c.card_keywords as { keyword?: { name?: string } }[]) ?? []).map((k) => k.keyword?.name ?? '').filter(Boolean), text = [c.effect_text, c.description].filter(Boolean).join(' '), gameplay = parseGameplayConfig(c.gameplay)
  return { id: c.id, name: c.name, image: null, gold: c.gold_cost ?? 100, attack: c.attack, health: c.health, type: mapCardType((c.card_type as { name: string } | null)?.name, !!c.is_champion), subtype: c.subtype ?? null, championGroup: c.champion_group ?? null, championPhase: c.champion_phase ?? null,
    keywords: Array.from(new Set([...detectKeywords(kw, text), ...((gameplay?.keywords ?? []) as ReturnType<typeof detectKeywords>)])), effectText: text, rarityColor: '#fff', rarityName: (c.rarity as { name?: string } | null)?.name ?? null, factionColor: '#fff', factionId: (c.faction as { id?: number } | null)?.id ?? null, factionName: (c.faction as { name?: string } | null)?.name ?? null,
    effect: parseEffect(text), gameplay, mappings: gameplay?.virtualEnabled === false ? [] : gameplay?.effectMappings ?? [] } as unknown as Omit<TutCard, 'uid'> })
const factions = [...new Set(all.map((c) => (c as { factionId?: number }).factionId).filter((f): f is number => f != null && f !== 14))]
let pass = 0, fail = 0
const check = (n: string, ok: boolean, extra = '') => { if (ok) pass++; else { fail++; console.log('  ✗', n, extra) } }

console.log('◆ Kaladės statytojas')
for (const f of factions) {
  const pool = all.filter((c) => [f, 14].includes((c as { factionId?: number }).factionId ?? -1))
  const plan = planStrategicDeck(pool), d = plan.cards, cnt = new Map<string, number>(); for (const c of d) cnt.set(c.id, (cnt.get(c.id) ?? 0) + 1)
  const units = d.filter((c) => c.type === 'unit').length, avg = d.reduce((s, c) => s + c.gold, 0) / Math.max(1, d.length)
  console.log(`  ${(pool.find((c) => (c as { factionId?: number }).factionId === f) as { factionName?: string }).factionName}: ${plan.archetype}${plan.tribe ? ' · gentis ' + plan.tribe : ''}${plan.champion ? ' · čempionas ' + plan.champion : ''} · ${d.length} kortų, padarų ${units}, vid. kaina ${Math.round(avg)}`)
  check('dydis 30–40', d.length >= 30 && d.length <= 40, String(d.length))
  check('be prakeiksmų', !d.some((c) => c.type === 'curse'))
  check('kopijų limitai', [...cnt].every(([id, n]) => n <= (/epi|legend/i.test((d.find((c) => c.id === id) as { rarityName?: string }).rarityName ?? '') ? 1 : 2)), JSON.stringify([...cnt].filter(([, n]) => n > 2)))
  check('padarų ≥ 45 proc.', units >= d.length * 0.45, String(units))
  check('uid unikalūs', new Set(d.map((c) => c.uid)).size === d.length)
}

const N = Number(opt('games', '0')), A = opt('a', 'hard') as AiDifficulty, B = opt('b', 'normal') as AiDifficulty, ms = Number(opt('ms', '100'))
if (N > 0) {
  MASTER_CFG.normal.budget = ms; MASTER_CFG.hard.budget = Math.round(ms * 1.5)
  const fid = Number(opt('faction', String(factions[0])))
  const pool = all.filter((c) => [fid, 14].includes((c as { factionId?: number }).factionId ?? -1))
  const deck = planStrategicDeck(pool).cards
  // --demo: B žaidžia atsitiktine frakcijos kalade (kaip žaidime ne Sunkiame lygyje), A – susistatyta
  const demo = args.includes('--demo')
  const demoDeck = () => { const sh = [...pool].sort(() => Math.random() - 0.5), units = sh.filter((c) => c.type === 'unit'), others = sh.filter((c) => c.type !== 'unit' && c.type !== 'curse'); const pk: typeof pool = []
    for (let i = 0; pk.length < 22 && units.length > 0; i++) pk.push(units[i % units.length]); for (let i = 0; pk.length < 35 && i < others.length; i++) pk.push(others[i]); return pk }
  const fresh = (tag: string, forA = true) => (demo && !forA ? demoDeck() : demo ? planStrategicDeck(pool).cards : deck).map((c, i) => ({ ...c, uid: `${tag}${i}` }))
  let wa = 0, wb = 0, dr = 0
  console.log(`◆ ${A} prieš ${B}: ${N} kovų, frakcija ${fid}, biudžetas ${ms} ms`)
  for (let n = 0; n < N; n++) {
    const aIsAi = n % 2 === 0   // kas antrą kovą A sėdi 'ai' vietoje (ir pradeda)
    let g: GameState = createGame(fresh('y', !aIsAi), fresh('a', aIsAi), 'ai', { format: 'classic' } as never); beginTurn(g)
    let turns = 0
    while (!g.winner && turns < 60) {
      const seat = g.active, diff = (seat === 'ai') === aIsAi ? A : B
      if (seat === 'ai') { for (let k = 0; k < 14 && !g.winner; k++) if (!aiNextAction(g, { difficulty: diff })) break; if (!g.winner) { endTurn(g); beginTurn(g) } }
      else { let m = swapPerspective(g); for (let k = 0; k < 14 && !m.winner; k++) if (!aiNextAction(m, { difficulty: diff })) break; if (!m.winner) { endTurn(m); beginTurn(m) } g = swapPerspective(m) }
      turns++
    }
    const w = g.winner; const aWon = w ? ((w === 'ai') === aIsAi) : null
    if (aWon === true) wa++; else if (aWon === false) wb++; else dr++
    console.log(`  kova ${n + 1}: ${aWon === null ? 'lygiosios' : aWon ? A : B} (${turns} ėj., HP ${P(g, 'ai').hp}:${P(g, 'you').hp})`)
  }
  console.log(`REZULTATAS ${A} ${wa} : ${wb} ${B} (lygiosios ${dr})`)
}
console.log(`${pass} ✓ / ${fail} ✗`)
if (fail) process.exit(1)
