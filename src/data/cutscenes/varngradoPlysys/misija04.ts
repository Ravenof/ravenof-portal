// ════════════════════════════════════════════════════════════════════════════
// M4 „Trys varpai" — PRE „Ne trys puolimai" (~45 s) +
// POST „Po gatvėmis" (~50 s) + FAIL. Pagal MISIJA04 scenarijų.
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m04pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('s01', `${A}/bg-karo-kambarys.svg`, { // pirmas varpas
      transition: { type: 'cut' },
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: šiaurinių vartų varpas
      speakerId: 'vartu-kapitonas', text: { lt: 'Vartai vėl puolami.', en: 'The gates are under attack again.' },
    }),
    C('s02', `${A}/bg-karo-kambarys.svg`, { // antras varpas
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: žemesnis grūdų aikštės varpas
      speakerName: { lt: 'Sargybinis', en: 'Watchman' },
      text: { lt: 'Ugnis prie sandėlių.', en: 'Fire at the granaries.' },
    }),
    C('s03', `${A}/bg-karo-kambarys.svg`, { // trečias varpas
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: skubus gydyklos varpelis
      speakerId: 'gydytoja',
      text: { lt: 'Jie lipa pro lavonų lataką. Sužeistųjų neišnešim laiku.', en: 'They are climbing through the corpse chute. We cannot move the wounded in time.' },
    }),
    C('s04a', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 70, height: 82, depth: 10, flip: true },
      ],
      speakerId: 'vartu-kapitonas', text: { lt: 'Kur siunčiam rezervą?', en: 'Where do we send the reserve?' },
    }),
    C('s04b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'isako', x: 32, height: 90, depth: 12 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 70, height: 82, depth: 10, flip: true, dim: 0.2 },
      ],
      speakerId: 'prazaras', text: { lt: 'Dalink į tris.', en: 'Split it in three.' },
    }),
    C('s04c', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'isako', x: 32, height: 90, depth: 12, dim: 0.2 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 70, height: 82, depth: 10, flip: true },
      ],
      speakerId: 'vartu-kapitonas', text: { lt: 'Tada niekur neužteks.', en: 'Then it will not be enough anywhere.' },
    }),
    C('s04d', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 40, height: 94, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Užteks ten, kur stovėsim.', en: 'It will be enough wherever we stand.' },
      holdMs: 400,
    }),
    S('s05a', `${A}/bg-karo-kambarys.svg`, { // Kerniaus akis mato gijas
      characters: [{ characterId: 'kernius', pose: 'akis', x: 60, height: 92, depth: 12, entrance: 'fade' }],
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.02, endScale: 1.07, duration: 5, punchIn: true },
      speakerId: 'kernius', text: { lt: 'Ne trys puolimai. Viena ranka.', en: 'Not three attacks. One hand.' },
    }),
    C('s05b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 60, height: 92, depth: 12, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 26, height: 88, depth: 11 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kas ją valdo?', en: 'Who commands it?' },
    }),
    C('s05c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 60, height: 94, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.32)' }],
      speakerId: 'kernius', text: { lt: 'Kol kas — ne aš.', en: 'For now — not me.' },
      holdMs: 500,
    }),
    C('s06', `${A}/bg-miesto-gatve.svg`, { // miesto rytojus
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 30, height: 88, depth: 12 }],
      effects: [{ kind: 'embers', intensity: 0.4 }],
      speakerId: 'prazaras',
      text: {
        lt: 'Jie renkasi, ko mums reikės rytoj. Neleiskim jiems sulaukti ryto.',
        en: 'They are choosing what we will need tomorrow. Let us not let them see the morning.',
      },
      holdMs: 600,
    }),
  ],
}

export const m04post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('p01a', `${A}/bg-miesto-gatve.svg`, { // trys atsakymai
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: trys trumpi varpų signalai
      speakerId: 'vartu-kapitonas', text: { lt: 'Puolimas traukiasi.', en: 'The attack is receding.' },
    }),
    C('p01b', `${A}/bg-miesto-gatve.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jie nesitraukia. Jie jau rado, ko ieškojo.', en: 'They are not retreating. They already found what they were looking for.' },
      holdMs: 400,
    }),
    S('p02', `${A}/bg-karo-kambarys.svg`, { // gijos žemyn
      characters: [{ characterId: 'kernius', pose: 'akis', x: 58, height: 92, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.3)' }],
      speakerId: 'kernius', text: { lt: 'Visos trys eina žemyn.', en: 'All three run downward.' },
    }),
    C('p03a', `${A}/bg-karo-kambarys.svg`, { // senasis planas
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 72, height: 80, depth: 10, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Kas ten?', en: 'What is down there?' },
    }),
    C('p03b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12, dim: 0.2 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 72, height: 80, depth: 10, flip: true },
      ],
      speakerId: 'vartu-kapitonas', text: { lt: 'Seniausia miesto laidojimo vieta.', en: 'The oldest burial ground of the city.' },
      holdMs: 400,
    }),
    C('p04', `${A}/bg-karo-kambarys.svg`, { // ko jie ieško
      characters: [{ characterId: 'kernius', pose: 'akis', x: 56, height: 94, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      speakerId: 'kernius', text: { lt: 'Jie neieško silpnos sienos.', en: 'They are not looking for a weak wall.' },
    }),
    S('p05', `${A}/bg-katakombos.svg`, { // mirusieji
      transition: { type: 'wipe-diagonal', duration: 480 },
      effects: [{ kind: 'dust', intensity: 0.3 }],
      tint: 'rgba(200,30,30,0.06)',
      speakerId: 'kernius', text: { lt: 'Mūsų mirusiųjų.', en: 'Our dead.' },
      holdMs: 700,
    }),
    C('p06', `${A}/bg-katakombos.svg`, { // žemyn
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 34, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 68, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'prazaras',
      text: { lt: 'Parodysi kelią. Aš pasirūpinsiu, kad akis nevestų viena.', en: 'You show the way. I will make sure the eye does not lead alone.' },
      holdMs: 600,
    }),
  ],
}

export const m04fail = [
  { characterName: 'Vartų kapitonas', text: 'Liko vienas.' },
  { characterName: 'Prazaras', text: 'Kol skamba bent vienas, miestas dar gali duoti įsakymus. Pergrupuokit.' },
]
