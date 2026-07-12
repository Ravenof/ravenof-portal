// ── Curse engine — Demonų prakeiksmų side deck ───────────────────────────────
// Prakeiksmai NĖRA pagrindinėje kaladėje. Demonai turi atskirą side deck'ą.
// Kai efektas (triggersCurse mapping'as) leidžia "įmaišyti" prakeiksmą:
//   1) prakeiksmas imamas iš CASTER (kerėtojo) side deck'o,
//   2) įmaišomas į PRIEŠININKO (victim) pagrindinę kaladę atsitiktinėje vietoje,
//   3) kai priešininkas tą prakeiksmą ИŠTRAUKIA — aktyvuojasi jo efektas (žr.
//      drawCards engine.ts: curse tipo korta paleidžia savo mapping'us aukai).

import type { GameApi } from './effectEngine'
import type { GameState, Side, TutCard } from '@/lib/tutorial/engine'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Side deck statyba iš curse tipo kortų (imam kiek yra, maks. 20). */
export function buildCurseDeck(curseCards: TutCard[], suffix: string): TutCard[] {
  return shuffle(curseCards.slice(0, 20).map((c, i) => ({ ...c, uid: `${c.id}-curse-${suffix}-${i}` })))
}

/**
 * "Įmaišo" `count` prakeiksmų: ima iš CASTER side deck'o ir įdeda į VICTIM
 * pagrindinę kaladę atsitiktinėje vietoje. Efektas NEaktyvuojamas iškart –
 * jis suveiks tada, kai auka prakeiksmą ištrauks (engine.drawCards).
 * Tuščias caster side deck → warning log, žaidimas tęsiasi.
 *
 * `victim` – kam įmaišomas prakeiksmas (priešininkui). Caster = priešinga pusė.
 */
export function activateCurses(api: GameApi, g: GameState, victim: Side, count: number, srcName: string, _depth: number): void {
  const caster: Side = victim === 'you' ? 'ai' : 'you'
  const casterP = caster === 'you' ? g.you : g.ai
  const victimP = victim === 'you' ? g.you : g.ai
  for (let i = 0; i < count; i++) {
    const curse = casterP.curses.pop()
    if (!curse) {
      api.log(g, { t: 'blocked', side: caster, key: 'battleLog.curseDeckEmpty', params: { src: srcName } })
      return
    }
    const idx = Math.floor(Math.random() * (victimP.deck.length + 1))
    victimP.deck.splice(idx, 0, curse)
    api.log(g, {
      t: 'curse', side: victim, cardName: curse.name,
      key: 'battleLog.cursePlant',
      params: { src: srcName, card: curse.name, owner: victim === 'you' ? '$t:battleLog.sideGen.you' : '$t:battleLog.sideGen.ai' },
    })
  }
}
