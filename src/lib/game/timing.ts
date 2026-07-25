// ── Centrinės kovos sekų trukmės (vienas šaltinis UI'ui IR varikliui) ────────
// Šios konstantos naudojamos ir gameplay eilėje (engine tick'ai), ir animacijose.
// NIEKADA nedubliuoti skaičių komponentuose — importuoti iš čia.

/** Pauzė tarp Kovos šūksnio (battlecry) iškviečiamų padarų. Kiekvienas padaras
 *  į mūšio būseną įrašomas atskirai, praėjus šiam laikui (ne vien vizualiai). */
export const BATTLECRY_SEQUENTIAL_SUMMON_DELAY_MS = 700

/** Reakcijos grandinės animacijos trukmė: nuo reakcijos kortos atskleidimo iki
 *  grandinės apsivijimo apie taikinį. Efekto rezultatas rodomas tik po jos. */
export const REACTION_CHAIN_ANIMATION_DURATION_MS = 2000
