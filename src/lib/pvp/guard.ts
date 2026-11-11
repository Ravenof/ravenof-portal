// ── PvP veiksmų teisių patikra (host režimas) ────────────────────────────────
// Host'as yra autoritetas, o svečio veiksmai ateina tinklu – jais pasitikėti
// negalima. Iki 756 host'as tikrino tik resolve* veiksmus; `play / attack /
// champ / endTurn / discardForGold / swapChampPhase` priimdavo su bet kokiu
// `actor`, tad pakeistas klientas galėjo baigti host'o ėjimą ar žaisti jo kortomis.
//
// Ta pati logika kaip dedikuoto serverio `notAllowed` (apps/server/src/index.ts) –
// keičiant vieną, pakeisk ir kitą.
import type { GameState, NetAction, Side } from '@/lib/tutorial/engine'

/**
 * Ar `seat` žaidėjas gali atlikti veiksmą `a` (host'o koordinatėmis).
 * Grąžina `null`, jei galima, arba i18n raktą (battleLog.err.*) – kodėl ne.
 *  • veiksmai su actor: actor PRIVALO būti pats seat ir seat turi būti aktyvus;
 *  • mulligan: actor = seat, kol laukiama jo keitimo;
 *  • resolve*: tik tas, kurio pasirinkimo laukiama (be aiškaus savininko – aktyvus seat);
 *  • clearReveal: tik peržiūros šeimininkas;
 *  • advanceSummon: tik host'as (jo UI laikmatis) – iš tinklo nepriimamas.
 */
export function netActionNotAllowed(g: GameState, seat: Side, a: NetAction): string | null {
  const NO = 'battleLog.err.notYourTurn'
  if (!a || typeof a !== 'object' || typeof (a as { t?: unknown }).t !== 'string') return NO
  if (a.t === 'advanceSummon') return NO
  if (a.t === 'clearReveal') return g.pendingReveal?.caster === seat ? null : NO
  const actor = (a as { actor?: Side }).actor
  if (a.t === 'mulligan') return actor === seat && g.pendingMulligan?.[seat as 'you' | 'ai'] ? null : NO
  if (a.t === 'play' || a.t === 'attack' || a.t === 'champ' || a.t === 'endTurn' || a.t === 'discardForGold' || a.t === 'swapChampPhase') {
    return actor === seat && g.active === seat ? null : NO
  }
  const owner: Side | undefined =
    a.t === 'resolveSummon' ? g.pendingSummon?.caster :
    a.t === 'resolvePeek' ? g.pendingPeek?.caster :
    a.t === 'resolveArrange' ? g.pendingArrange?.caster :
    a.t === 'resolveCopy' ? g.pendingCopy?.caster :
    a.t === 'resolveReturn' ? g.pendingReturn?.side :
    a.t === 'resolveBattlecry' ? g.pendingBattlecry?.side :
    a.t === 'resolveLastwish' ? g.pendingLastwish?.side :
    a.t === 'resolveChoice' ? (g.pendingChoice?.chooser ?? g.pendingChoice?.caster) :
    undefined
  if (owner === undefined && !a.t.startsWith('resolve')) return NO   // nežinomas veiksmo tipas
  return (owner ?? g.active) === seat ? null : NO
}
