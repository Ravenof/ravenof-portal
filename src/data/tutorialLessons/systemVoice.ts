// ════════════════════════════════════════════════════════════════════════════
// Tutorial V3 — sisteminės Korvo frazės (naudojamos VISOSE pamokose).
// Tekstai = TUTORIAL-V3-HANDOFF.md §7 „Sisteminės trumpos frazės".
// Failai: card-audio/tutorial/tut-{id}.mp3
// ════════════════════════════════════════════════════════════════════════════

export const SYSTEM_VOICE_LINES: Record<string, string> = {
  'sys-good-1': 'Puiku.',
  'sys-good-2': 'Būtent taip.',
  'sys-good-3': 'Gerai, mokiny.',
  'sys-wrong-1': 'Ne čia. Pažvelk, kur rodau.',
  'sys-wrong-2': 'Dar ne. Sek rodyklę.',
  'sys-wrong-3': 'Kantrybės — pirmiau tai, ką rodau.',
  'sys-turn-enemy': 'Priešo ėjimas. Stebėk.',
  'sys-victory': 'Pergalė! Ravenof tavimi patenkintas.',
}

/** Klaidingo veiksmo užuominos balsu (direktorius renkasi atsitiktinai). */
export const WRONG_VOICE_IDS = ['sys-wrong-1', 'sys-wrong-2', 'sys-wrong-3']
/** Pagyrimai (naudojami pamokų scenarijuose). */
export const GOOD_VOICE_IDS = ['sys-good-1', 'sys-good-2', 'sys-good-3']
