// ── Paslėptos informacijos redagavimas ───────────────────────────────────────
// Klientui siunčiama būsena, kurioje PRIEŠO ranka ir kaladė – tik korpusai
// (uid + tipas; be pavadinimo, paveikslo, efektų). Kliento UI rodo nugarėles pagal
// skaičių, o engine'as kliente priešo kortų neskaičiuoja (serveris autoritetingas).
// Prakeiksmų side deck'as taip pat slepiamas. Log'as lieka – jame tik įvykę faktai.
import type { GameState, TutCard, Side } from '@/lib/tutorial/engine'

const STUB = (c: TutCard): TutCard => ({
  id: 'hidden', uid: c.uid, name: '', image: null, gold: 0, attack: null, health: null, type: 'unit',
  keywords: [], effectText: '', rarityColor: '#444', factionColor: '#444', effect: null, mappings: [],
} as unknown as TutCard)

export function redactForSeat(g: GameState, seat: Side): GameState {
  const opp: Side = seat === 'you' ? 'ai' : 'you'
  const copy: GameState = JSON.parse(JSON.stringify(g))
  const p = opp === 'you' ? copy.you : copy.ai
  p.hand = p.hand.map(STUB)
  p.deck = p.deck.map(STUB)
  p.curses = p.curses.map(STUB)
  // Savo kaladės TVARKA irgi slepiama (kad nebūtų „žinau, ką trauksiu"): maišom tik atvaizdavimui.
  const me = seat === 'you' ? copy.you : copy.ai
  me.deck = [...me.deck].sort((a, b) => a.uid.localeCompare(b.uid))
  return copy
}
