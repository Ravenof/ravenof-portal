// ── Kovų prieš DI žurnalas (DI gerinimui) ────────────────────────────────────
// Po kiekvienos kovos prieš botą į `bot_match_logs` įrašomas suspaustas ėjimų žurnalas ir būsenos nuotrauka
// kiekvieno ėjimo pradžioje (HP, auksas, ranka, lenta). Iš to matosi, KĄ botas darė ir ko nepadarė
// (nepanaudotas auksas, rankoje užsilikusios kortos, praleistos atakos) – ko santraukos lentelė `matches` neparodo.
// Tyliai: jokia klaida čia negali paveikti kovos ar atlygių. Lentelė – migracija 20261112_bot_match_logs.sql.
import type { GameState, Side, BoardUnit, TutCard } from '@/lib/tutorial/engine'
import { P } from '@/lib/tutorial/engine'
import { createClient } from '@/lib/supabase/client'
import { APP_VERSION } from '@/lib/version'

export type TurnSnap = { n: number; a: Side; you: SideSnap; ai: SideSnap }
type SideSnap = { hp: number; gold: number; deck: number; hand: number | string[]; units: string[]; art: string[]; react: number | string[] }

const unitStr = (u: BoardUnit) => `${u.card.name} ${u.atk}/${u.hp}${u.isChampion ? ' Č' + u.phase : ''}${u.shield ? ' S' : ''}${u.stealth ? ' H' : ''}${Object.keys(u.statuses).filter((k) => (u.statuses as Record<string, unknown>)[k]).map((k) => ' ' + k).join('')}`
function sideSnap(g: GameState, s: Side, open: boolean): SideSnap {
  const p = P(g, s)
  return {
    hp: p.hp, gold: p.gold, deck: p.deck.length,
    hand: open ? p.hand.map((c) => `${c.name} (${c.gold})`) : p.hand.length,   // boto ranka – vardais; žaidėjo – tik kiekis
    units: p.units.filter((u): u is BoardUnit => !!u).map(unitStr),
    art: p.artifacts.filter(Boolean).map((a) => `${a!.card.name} ${a!.hp}`),
    react: open ? p.reactions.filter(Boolean).map((r) => r!.card.name) : p.reactions.filter(Boolean).length,
  }
}
/** Būsenos nuotrauka (kviečiama ėjimo pradžioje ir kovos gale). */
export function snapTurn(g: GameState): TurnSnap { return { n: g.globalTurn, a: g.active, you: sideSnap(g, 'you', false), ai: sideSnap(g, 'ai', true) } }

const SKIP = new Set(['fxSource', 'zmkReshuffle', 'coin'])
/** Suspaustas žurnalas: [pusė, tipas, korta, reikšmė, raktas, taikinys]. */
export function compactLog(g: GameState): (string | number | null)[][] {
  const out: (string | number | null)[][] = []
  for (const e of g.log as unknown as { t: string; side: Side; cardName?: string; value?: number; key?: string; params?: Record<string, string | number> }[]) {
    if (SKIP.has(e.t)) continue
    const tgt = e.params && typeof e.params.target === 'string' ? e.params.target : null
    out.push([e.side === 'ai' ? 'B' : 'Z', e.t, e.cardName ?? null, e.value ?? null, (e.key ?? '').replace('battleLog.', '') || null, tgt])
  }
  return out
}
const deckList = (cards: TutCard[] | null | undefined): Record<string, number> => { const m: Record<string, number> = {}; for (const c of cards ?? []) m[c.name] = (m[c.name] ?? 0) + 1; return m }

export async function uploadBotMatchLog(a: {
  g: GameState; clientMatchId: string; mode: string; difficulty?: string; opponentDeck?: string | null; format?: string
  durationSeconds: number; snaps: TurnSnap[]; aiDeck: TutCard[] | null; playerDeck: TutCard[] | null; aiDeckKind: string
}): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const log = compactLog(a.g)
    if (log.length > 4000) log.length = 4000
    await supabase.from('bot_match_logs').insert({
      user_id: user.id, client_match_id: a.clientMatchId || null, app_version: APP_VERSION, mode: a.mode,
      difficulty: a.difficulty ?? null, opponent_deck: a.opponentDeck ?? null, ai_deck_kind: a.aiDeckKind, format: a.format ?? 'zmk',
      result: a.g.winner === 'you' ? 'win' : 'loss', turns: a.g.globalTurn, duration_seconds: a.durationSeconds,
      player_hp: P(a.g, 'you').hp, ai_hp: P(a.g, 'ai').hp,
      ai_deck: deckList(a.aiDeck), player_deck: deckList(a.playerDeck), snaps: [...a.snaps.slice(0, 200), snapTurn(a.g)], log,
    })
  } catch { /* žurnalas neprivalomas */ }
}
