// ════════════════════════════════════════════════════════════════════════════
// M2 „Paskutinis pranešėjas" — PRE „Žvilgsnis iš plyšio" (~55 s) +
// POST „Pirmoji linija" (~85 s) + FAIL. Pagal MISIJA02 scenarijų.
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, A1, CAST, S, C } from './cast'

export const m02pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('s01', `${A}/bg-kelias-bokstas.svg`, { // Kernius bėga nuo bokšto
      transition: { type: 'cut' },
      characters: [{ characterId: 'kernius', pose: 'begantis', x: 30, height: 78, depth: 12 }],
      effects: [{ kind: 'rain', intensity: 0.5 }, { kind: 'fog', intensity: 0.3 }],
      camera: { startScale: 1, endScale: 1.05, endX: 1, duration: 7 },
      sfxUrl: null, // PLACEHOLDER: kvėpavimas, lietus, tolimi smūgiai bokšte
      text: null, holdMs: 1600,
    }),
    S('s02a', `${A}/bg-kelias-bokstas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'begantis', x: 34, height: 82, depth: 12 }],
      effects: [{ kind: 'rain', intensity: 0.5 }],
      speakerName: { lt: 'Sesers balsas', en: "His sister's voice" },
      text: { lt: 'Kerniau. Tu pavargai. Grįžk namo.', en: 'Kernius. You are tired. Come home.' },
    }),
    C('s02b', `${A}/bg-kelias-bokstas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'begantis', x: 34, height: 82, depth: 12 }],
      effects: [{ kind: 'rain', intensity: 0.5 }],
      speakerId: 'kernius', text: { lt: 'Tu ne ji.', en: 'You are not her.' },
    }),
    S('s03', `${A1}/bg-vidus.svg`, { // Dargio prisiminimas
      characters: [{ characterId: 'dargis', pose: 'kalavijas', x: 60, height: 92, depth: 12 }],
      tint: 'rgba(203,182,138,0.10)',
      camera: { startScale: 1.03, endScale: 1.08, duration: 4, punchIn: true },
      speakerName: { lt: 'Dargio prisiminimas', en: "Dargis's memory" },
      text: { lt: 'Nebėk nuo balso. Bėk dėl miesto.', en: 'Do not run from the voice. Run for the city.' },
    }),
    S('s04', `${A}/bg-kelias-bokstas.svg`, { // bokštas sprogsta
      transition: { type: 'cut' },
      effects: [{ kind: 'magic', intensity: 0.6, color: 'rgba(138,92,246,0.4)' }, { kind: 'embers', intensity: 0.5 }],
      camera: { startScale: 1.02, endScale: 1.06, duration: 3, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: tolimo bokšto sprogimas
      text: null, holdMs: 1400,
    }),
    S('s05', `${A}/bg-plysys-belzatoras.svg`, { // Belzatoras pamato
      transition: { type: 'wipe-diagonal', duration: 500 },
      effects: [{ kind: 'ash', intensity: 0.4 }],
      camera: { startScale: 1, endScale: 1.08, duration: 6, punchIn: true },
      speakerName: { lt: 'Belzatoro balsas, Kerniaus balsu', en: "Belzataras's voice, in Kernius's voice" },
      text: { lt: 'Dargio žinia nepasieks vartų.', en: "Dargis's message will not reach the gates." },
      holdMs: 500,
    }),
    C('s06', `${A}/bg-kelias-bokstas.svg`, { // kraujas — ištrūksta iš žvilgsnio
      characters: [{ characterId: 'kernius', pose: 'akis', x: 40, height: 90, depth: 12 }],
      effects: [{ kind: 'rain', intensity: 0.4 }],
      camera: { startScale: 1.05, endScale: 1.07, duration: 3, shake: 'light' },
      speakerId: 'kernius',
      text: { lt: 'Tada teks juos pažadinti be jos.', en: 'Then I will have to wake them without it.' },
    }),
    C('s07', `${A}/bg-kelias-bokstas.svg`, { // kelias užsidaro
      characters: [
        { characterId: 'kernius', pose: 'battle', x: 24, height: 84, depth: 12 },
        { characterId: 'belzatoras', pose: 'demonas', x: 76, height: 42, bottom: 2, depth: 14, entrance: 'fade' },
      ],
      effects: [{ kind: 'fog', intensity: 0.4 }],
      speakerId: 'kernius',
      text: { lt: 'Žinia pirma. Aš — po jos.', en: 'The message first. Me — after it.' },
      holdMs: 600,
    }),
  ],
}

export const m02post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('p01', `${A}/bg-vartai-isore.svg`, { // dvidešimt žingsnių
      transition: { type: 'cut' },
      characters: [{ characterId: 'kernius', pose: 'begantis', x: 38, height: 56, bottom: -10, depth: 10, dim: 0.25 }],
      effects: [{ kind: 'fog', intensity: 0.35 }],
      speakerName: { lt: 'Vartų sargybinis', en: 'Gate watchman' },
      text: { lt: 'Nakties protokolas. Durų neatidarom.', en: 'Night protocol. We do not open the doors.' },
    }),
    S('p02a', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 68, height: 88, depth: 13, entrance: 'fade' }],
      speakerId: 'prazaras', text: { lt: 'Atidarykit mažąsias duris.', en: 'Open the small doors.' },
    }),
    C('p02b', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 68, height: 88, depth: 13 }],
      speakerName: { lt: 'Vartų sargybinis', en: 'Gate watchman' },
      text: { lt: 'Jis gali būti užkrėstas.', en: 'He may be infected.' },
    }),
    C('p02c', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 68, height: 92, depth: 13 }],
      camera: { startScale: 1.05, endScale: 1.08, duration: 4, punchIn: true },
      speakerId: 'prazaras',
      text: {
        lt: 'Protokolą parašė žmonės, kurie miega už trijų sienų. Aš stoviu ant pirmosios.',
        en: 'The protocol was written by men who sleep behind three walls. I stand on the first.',
      },
      holdMs: 400,
    }),
    S('p03', `${A}/bg-vartu-kiemas.svg`, { // viduje
      characters: [
        { characterId: 'kernius', pose: 'begantis', x: 44, height: 70, bottom: -8, depth: 11 },
        { characterId: 'gydytoja', pose: 'neutral', x: 72, height: 78, depth: 10, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'Prazarui. Tik jam.', en: 'For Prazaras. Only him.' },
    }),
    C('p04', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'neutral', x: 34, height: 82, depth: 11 },
        { characterId: 'prazaras', pose: 'neutral', x: 70, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'kernius',
      text: { lt: 'Kalnas atsivėrė. Ne kariuomenė. Orda.', en: 'The mountain has opened. Not an army. The Horde.' },
      holdMs: 400,
    }),
    C('p05a', `${A}/bg-vartu-kiemas.svg`, { // juodoji akis atsiskleidžia
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 96, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 4, punchIn: true },
      speakerId: 'gydytoja', text: { lt: 'Atgal! Jis užkrėstas.', en: 'Back! He is infected.' },
    }),
    C('p05b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 96, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      speakerId: 'kernius',
      text: { lt: 'Jie kalba mirusiųjų balsais. Neatsakinėkit.', en: 'They speak with the voices of the dead. Do not answer them.' },
    }),
    C('p06a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 34, height: 86, depth: 11 },
        { characterId: 'prazaras', pose: 'neutral', x: 70, height: 90, depth: 12, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'Belzatoras mane matė.', en: 'Belzataras saw me.' },
      holdMs: 500,
    }),
    C('p06b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 34, height: 86, depth: 11, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 70, height: 92, depth: 12, flip: true },
      ],
      speakerId: 'prazaras',
      text: { lt: 'Tada tegu mato, kam atnešei žinią.', en: 'Then let him see who you brought the message to.' },
    }),
    S('p07', `${A}/bg-vartu-kiemas.svg`, { // Dargio eilutės
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 50, height: 92, depth: 12 }],
      tint: 'rgba(203,182,138,0.06)',
      speakerName: { lt: 'Dargio balsas', en: "Dargis's voice" },
      text: {
        lt: 'Vethago Kalnas atsivėrė. Demonai perėjo į mūsų pusę. Jei ši žinia pasiekė vartus, jūs jau esate pirmoji linija.',
        en: 'Mount Vethago has opened. The demons have crossed to our side. If this message reached the gates, you are already the first line.',
      },
      holdMs: 600,
    }),
    C('p08', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'isako', x: 40, height: 92, depth: 12 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 76, height: 80, depth: 10, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Pakelkite visą miestą.', en: 'Raise the whole city.' },
    }),
    S('p09', `${A}/bg-vartai-isore.svg`, { // karo varpai
      effects: [{ kind: 'embers', intensity: 0.35 }],
      musicUrl: null, // PLACEHOLDER: karo varpų ritmas
      camera: { startScale: 1.04, endScale: 1, duration: 6 },
      speakerId: 'prazaras',
      text: {
        lt: 'Raitelius į pietus. Po vieną Ordinui ir Inkvizicijai. Pabėgėlius rinkti prie vidinių aikščių.',
        en: 'Riders south. One to the Order, one to the Inquisition. Gather refugees at the inner squares.',
      },
    }),
    C('p10a', `${A}/bg-vartai-isore.svg`, { // horizonte tamsi linija
      effects: [{ kind: 'fog', intensity: 0.3 }],
      tint: 'rgba(200,30,30,0.07)',
      speakerId: 'vartu-kapitonas', text: { lt: 'Užverti vartus?', en: 'Seal the gates?' },
    }),
    C('p10b', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 }],
      tint: 'rgba(200,30,30,0.07)',
      speakerId: 'prazaras',
      text: { lt: 'Po trečio varpo. Iki jo — įleidžiam savus.', en: 'After the third bell. Until then — we let our own in.' },
      holdMs: 700,
    }),
  ],
}

/** FAIL — 2 VN beat'ai (suvedami admin'e kaip VN žingsniai). */
export const m02fail = [
  { characterName: 'Kernius', text: 'Dar ne. Žinia vis dar pas mane.' },
  { characterName: null, text: 'Jis atsistoja. (Bandyti dar kartą)' },
]
