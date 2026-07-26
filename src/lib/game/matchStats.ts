// ── Kovos telemetrija dienos užduotims ───────────────────────────────────────
// Vienas šaltinis: mūšio ŽURNALAS (GameEvent.key + t + side) ir galutinė būsena.
// Skaičiuojama TIK kovai pasibaigus, kliente; siunčiama per
// `reportMatchStats()` → `rvn_report_match_stats(p_stats jsonb)`.
// Jokių naujų lentelių: serveris tuos pačius skaičius perduoda
// `rvn__quests_progress()` pagal `objective_type`.
//
// SVARBU: filtruojam pagal `key`, o NE pagal lokalizuotą tekstą (žr. i18n Fazę 5).

import type { GameState, Side } from '@/lib/tutorial/engine'
import { P, other } from '@/lib/tutorial/engine'

export type MatchStatsPayload = {
  // esami (jau naudojami serveryje)
  creaturesPlayed: number
  spellsPlayed: number
  damageDealt: number
  // nauji
  faceDamage: number
  creaturesKilled: number
  cardsDrawn: number
  artifactsPlayed: number
  fieldPlayed: number
  reactionsSet: number
  reactionsTriggered: number
  battlecries: number
  lastwishes: number
  summonsByEffect: number
  statusesApplied: number
  healDone: number
  championAbilities: number
  goldSpent: number
  cursesActivated: number
  // kovos santrauka (win_fast / win_hp_remaining / win_flawless questams)
  turns: number
  hpRemaining: number
  hpLost: number
}

const startsWith = (k: string | undefined, p: string) => !!k && k.startsWith(p)

/** Surenka visą kovos telemetriją žaidėjo `me` požiūriu. */
export function collectMatchStats(g: GameState, me: Side = 'you'): MatchStatsPayload {
  const foe = other(me)
  const mine = P(g, me)
  let creaturesPlayed = 0, spellsPlayed = 0, artifactsPlayed = 0, fieldPlayed = 0
  let reactionsSet = 0, reactionsTriggered = 0, battlecries = 0, lastwishes = 0
  let summonsByEffect = 0, cardsDrawn = 0, championAbilities = 0, goldSpent = 0
  let damageDealt = 0, faceDamage = 0, creaturesKilled = 0, statusesApplied = 0
  let healDone = 0, cursesActivated = 0

  for (const e of g.log) {
    const k = e.key
    switch (e.t) {
      case 'play':
        if (e.side === me) {
          if (startsWith(k, 'battleLog.playUnit')) { creaturesPlayed++; goldSpent += e.value ?? 0 }
          else if (k === 'battleLog.summonByEffect' || k === 'battleLog.summonChosen') summonsByEffect++
        }
        break
      case 'spell':
        if (e.side === me && startsWith(k, 'battleLog.playSpell')) { spellsPlayed++; goldSpent += e.value ?? 0 }
        break
      case 'artifact':
        if (e.side === me && startsWith(k, 'battleLog.playArtifact')) { artifactsPlayed++; goldSpent += e.value ?? 0 }
        break
      case 'field':
        if (e.side === me && startsWith(k, 'battleLog.playField')) fieldPlayed++
        break
      case 'reactionSet':
        if (e.side === me) { reactionsSet++; goldSpent += e.value ?? 0 }
        break
      case 'reactionTrigger':
        if (e.side === me) reactionsTriggered++
        break
      case 'battlecry':
        if (e.side === me && startsWith(k, 'battleLog.battlecry')) battlecries++
        break
      case 'lastwish':
        if (e.side === me) lastwishes++
        break
      case 'ability':
        if (e.side === me) championAbilities++
        break
      case 'champion':
        if (e.side === me) goldSpent += e.value ?? 0
        break
      case 'draw':
        if (e.side === me) cardsDrawn++
        break
      case 'damage': {
        // `side` = kas GAVO žalos → mūsų padaryta žala = priešo pusės įrašai
        if (e.side === foe) {
          const v = e.value ?? 0
          damageDealt += v
          if (!e.cardName) faceDamage += v          // be kortos vardo = žala priešininkui (herojui)
        }
        break
      }
      case 'heal':
        if (e.side === me) healDone += e.value ?? 0
        break
      case 'death':
        if (e.side === foe) creaturesKilled++
        break
      case 'curse':
        if (e.side === foe) cursesActivated++       // prakeiksmas suveikė priešininko kaladėje
        break
      default: break
    }
    // būsenos, uždėtos priešo kortoms (statusEvt = struktūrizuotas VFX srautas)
    if (e.statusEvt === 'apply' && e.side === foe) statusesApplied++
  }

  return {
    creaturesPlayed, spellsPlayed, damageDealt,
    faceDamage, creaturesKilled, cardsDrawn, artifactsPlayed, fieldPlayed,
    reactionsSet, reactionsTriggered, battlecries, lastwishes, summonsByEffect,
    statusesApplied, healDone, championAbilities, goldSpent, cursesActivated,
    turns: g.globalTurn,
    hpRemaining: Math.max(0, mine.hp),
    hpLost: Math.max(0, mine.maxHp - mine.hp),
  }
}

/** Kaladės frakcija (dominuojanti) — `win_faction_match` questui. */
export function dominantFactionId(cards: { factionId?: number | null }[] | null | undefined): number | null {
  if (!cards || cards.length === 0) return null
  const cnt = new Map<number, number>()
  for (const c of cards) {
    const f = c.factionId ?? 0
    if (!f) continue
    cnt.set(f, (cnt.get(f) ?? 0) + 1)
  }
  let best: number | null = null, bestN = 0
  for (const [f, n] of cnt) if (n > bestN) { best = f; bestN = n }
  return best
}
