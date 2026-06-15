// ── Trigger system ────────────────────────────────────────────────────────────
// Vykdo lentos (padarų, artefaktų, lauko) mapping'us pagal trigger tipą.
// Naudoja effect engine; rekursijos gylis ribojamas ten pat.

import type { GameApi } from './effectEngine'
import { applyMappings } from './effectEngine'
import { fieldTriggers } from './fieldEngine'
import type { GameState, Side } from '@/lib/tutorial/engine'

/**
 * Iššauna trigger'į visai pusės lentai:
 * padarai (Nutildyti praleidžiami) → artefaktai → lauko korta.
 */
export function fireTrigger(api: GameApi, g: GameState, side: Side, trigger: string, depth = 0): void {
  const p = side === 'you' ? g.you : g.ai
  for (const u of [...p.units]) {
    if (g.winner) return
    if (!u || u.statuses.silenced) continue
    // Kovos šūksnis (onSummon/onPlay) suveikia TIK sužaidus tą kortą (apdorojama playCard inline),
    // o ne kai lauke sužaidžiamas kitas padaras – todėl per lentos „sweep" jų nebešauname.
    if (trigger === 'onSummon' || trigger === 'onPlay') continue
    const mappings = u.card.mappings ?? []
    if (mappings.some((m) => m.trigger === trigger)) {
      applyMappings(api, g, side, mappings, trigger, { sourceName: u.card.name, sourceUid: u.uid, depth })
    }
  }
  for (const a of [...p.artifacts]) {
    if (g.winner) return
    if (!a) continue
    const mappings = a.card.gameplay?.artifactEffectConfig?.mappings ?? a.card.mappings ?? []
    if (mappings.some((m) => m.trigger === trigger)) {
      api.log(g, { t: 'artifact', side, cardName: a.card.name, msg: `Artefaktas „${a.card.name}" suveikia.` })
      applyMappings(api, g, side, mappings, trigger, { sourceName: a.card.name, sourceUid: a.uid, depth })
    }
  }
  // lauko korta veikia abu – trigger'is šaunamas aktyvios pusės vardu
  const ft = fieldTriggers(g, trigger)
  if (ft.length > 0 && g.field) {
    api.log(g, { t: 'field', side, cardName: g.field.card.name, msg: `🌍 Laukas „${g.field.card.name}" suveikia.` })
    for (const m of ft) {
      if (g.winner) return
      applyMappings(api, g, side, [m], trigger, { sourceName: g.field.card.name, depth })
    }
  }
}
