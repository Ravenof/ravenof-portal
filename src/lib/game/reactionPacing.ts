// ── Reakcijų grandinės tempas per kovą (game-feel fazė 3) ───────────────────
// Pirmas suveikimas kovoje — pilnas spektaklis (~3.9 s). Vėlesni — kompaktiški
// (~2.4 s): kanoninis fazių eiliškumas nekinta, trumpėja tik trukmės.
//
// Būsena laikoma MODULYJE (kaip reactionSnapshots ir feelTelemetry), NE
// GameState — PvP broadcast payload'as nedidėja. Kiekvienas klientas
// kompresuoja savarankiškai; tai saugu, nes gameplay laukia SAVO lokalaus
// promise, o ne bendros trukmės tarp klientų.

let seenThisMatch = 0

/** Kovos pradžia (kviečiama kartu su resetFeelTelemetry). */
export function resetReactionPacing(): void {
  seenThisMatch = 0
}

/**
 * Užregistruoja rodomą reakciją ir grąžina, ar ji turi būti kompaktiška.
 * Kviesti VIENĄ kartą prieš kiekvieną `chainRef.play(...)`.
 */
export function nextReactionIsCompact(): boolean {
  const compact = seenThisMatch > 0
  seenThisMatch += 1
  return compact
}

/** Kiek reakcijų jau parodyta šioje kovoje (diagnostikai/testams). */
export function reactionsShownThisMatch(): number {
  return seenThisMatch
}
