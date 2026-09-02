// ════════════════════════════════════════════════════════════════════════════
// M3 „Vartai prieš aušrą" — PRE „Iki trečio varpo" (~60 s) +
// POST „Varngradas keliasi" (~70 s) + FAIL. Pagal MISIJA03 scenarijų.
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m03pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('s01', `${A}/bg-vartai-isore.svg`, { // raudona aušra, bėga žmonės
      transition: { type: 'cut' },
      effects: [{ kind: 'fog', intensity: 0.35 }],
      tint: 'rgba(200,30,30,0.08)',
      camera: { startScale: 1, endScale: 1.05, endX: -1, duration: 7 },
      speakerId: 'vartu-kapitonas',
      text: {
        lt: 'Pirma grupė už penkių šimtų žingsnių. Už jų juda dar kažkas.',
        en: 'First group five hundred paces out. Something else is moving behind them.',
      },
    }),
    C('s02a', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 }],
      tint: 'rgba(200,30,30,0.08)',
      speakerId: 'prazaras', text: { lt: 'Kiek laiko iki trečio varpo?', en: 'How long until the third bell?' },
    }),
    C('s02b', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12, dim: 0.2 }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Mažiau, negu jiems reikia.', en: 'Less than they need.' },
      holdMs: 400,
    }),
    S('s03a', `${A}/bg-vartu-kiemas.svg`, { // Kernius guli, juodoji akis seka
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 40, height: 74, bottom: -10, depth: 11 },
        { characterId: 'gydytoja', pose: 'neutral', x: 72, height: 78, depth: 10, flip: true },
      ],
      effects: [{ kind: 'magic', intensity: 0.25, color: 'rgba(138,92,246,0.25)' }],
      speakerId: 'kernius', text: { lt: 'Jie ne tarp žmonių.', en: 'They are not among the people.' },
    }),
    C('s03b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 40, height: 74, bottom: -10, depth: 11 },
        { characterId: 'gydytoja', pose: 'neutral', x: 72, height: 78, depth: 10, flip: true },
      ],
      speakerId: 'gydytoja', text: { lt: 'Tau reikia gulėti.', en: 'You need to lie down.' },
    }),
    C('s03c', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 88, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.3)' }],
      speakerId: 'kernius', text: { lt: 'Jie eina jų balsais.', en: 'They walk in their voices.' },
      holdMs: 500,
    }),
    S('s04', `${A}/bg-vartai-isore.svg`, { // pirmas varpas
      sfxUrl: null, // PLACEHOLDER: pirmas varpo dūžis + minia
      effects: [{ kind: 'fog', intensity: 0.3 }],
      text: null, holdMs: 1400,
    }),
    C('s05a', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 70, height: 86, depth: 12, flip: true }],
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Jei lauksim visų, įleisim ir tai, kas juos vejasi.', en: 'If we wait for everyone, we let in what hunts them too.' },
    }),
    C('s05b', `${A}/bg-vartai-isore.svg`, {
      characters: [
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 70, height: 86, depth: 12, flip: true, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 13 },
      ],
      speakerId: 'prazaras',
      text: { lt: 'Jei užversim dabar, paliksim savus kartu su tuo.', en: 'If we seal them now, we leave our own out there with it.' },
    }),
    S('s06', `${A}/bg-vartai-isore.svg`, { // antras varpas, siluetas veja žmogų
      characters: [{ characterId: 'belzatoras', pose: 'demonas', x: 80, height: 30, bottom: 4, depth: 8, dim: 0.3 }],
      tint: 'rgba(200,30,30,0.1)',
      sfxUrl: null, // PLACEHOLDER: antras varpas
      speakerId: 'prazaras',
      text: { lt: 'Šaudykit virš bėgančiųjų. Vartų dar neuždarom.', en: 'Shoot over the runners. The gates stay open.' },
    }),
    C('s07', `${A}/bg-vartai-isore.svg`, { // paskutinė grupė ir banga
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 32, height: 90, depth: 12 }],
      effects: [{ kind: 'fog', intensity: 0.35 }],
      speakerId: 'prazaras', text: { lt: 'Po trečio varpo. Ne anksčiau.', en: 'After the third bell. Not before.' },
      holdMs: 500,
    }),
    C('s08', `${A}/bg-vartai-isore.svg`, { // trečio varpo pirmas dūžis — į kovą
      effects: [{ kind: 'dust', intensity: 0.4 }],
      camera: { startScale: 1.05, endScale: 1.09, duration: 2, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: trečio varpo dūžis; perėjimas į kovą be užtemimo
      text: null, holdMs: 900,
    }),
  ],
}

export const m03post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('p01a', `${A}/bg-vartai-isore.svg`, { // vartai trenkiasi
      transition: { type: 'cut' },
      camera: { startScale: 1.03, endScale: 1.05, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: vartai trenkiasi į akmenį
      speakerId: 'vartu-kapitonas', text: { lt: 'Šiaurė uždaryta.', en: 'The north is closed.' },
    }),
    C('p01b', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 88, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Ne. Tik vartai.', en: 'No. Only the gates.' },
      holdMs: 500,
    }),
    S('p02', `${A}/bg-karo-kambarys.svg`, { // žemėlapis
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras',
      text: {
        lt: 'Kalvius prie vyrių. Lankininkus ant pirmos sienos. Pabėgėlius skirstyti po vidines aikštes.',
        en: 'Smiths to the hinges. Archers on the first wall. Refugees to the inner squares.',
      },
    }),
    S('p03a', `${A}/bg-vartu-kiemas.svg`, { // Kerniui riša akį
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 40, height: 84, depth: 11 },
        { characterId: 'gydytoja', pose: 'neutral', x: 70, height: 80, depth: 10, flip: true },
      ],
      effects: [{ kind: 'magic', intensity: 0.25, color: 'rgba(138,92,246,0.25)' }],
      speakerId: 'gydytoja', text: { lt: 'Jis turi būti izoliuotas.', en: 'He must be isolated.' },
    }),
    C('p03b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 40, height: 84, depth: 11, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 72, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'prazaras',
      text: { lt: 'Kai atsibus, izoliuosit nuo minios. Ne nuo manęs.', en: 'When he wakes, isolate him from the crowd. Not from me.' },
      holdMs: 400,
    }),
    S('p04', `${A}/bg-siena-horizontas.svg`, { // du raiteliai
      effects: [{ kind: 'fog', intensity: 0.25 }],
      speakerId: 'prazaras',
      text: {
        lt: 'Vienas Ordinui. Vienas Inkvizicijai. Tas, kuris grįš pirmas, pasakys, kuo jie mus laiko.',
        en: 'One to the Order. One to the Inquisition. Whoever returns first will tell us what they think we are.',
      },
    }),
    C('p05', `${A}/bg-siena-horizontas.svg`, { // mėlynas signalas
      tint: 'rgba(90,140,220,0.08)',
      sfxUrl: null, // PLACEHOLDER: mėlyno signalo stingeris
      speakerId: 'vartu-kapitonas', text: { lt: 'Ordinas perskaitė.', en: 'The Order has read it.' },
      holdMs: 400,
    }),
    S('p06', `${A}/bg-vartu-kiemas.svg`, { // grįžta arklys be raitelio
      effects: [{ kind: 'fog', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: pasiklydusios kanopos
      text: null, holdMs: 1500,
    }),
    C('p07a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 36, height: 90, depth: 12 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 72, height: 82, depth: 10, flip: true },
      ],
      speakerId: 'vartu-kapitonas', text: { lt: 'Ką jie siunčia?', en: 'What do they send?' },
    }),
    C('p07b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 44, height: 94, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Įsakymą.', en: 'An order.' },
      holdMs: 500,
    }),
    C('p08', `${A}/bg-karo-kambarys.svg`, { // IZOLIUOTI + trys varpai
      tint: 'rgba(220,215,200,0.06)',
      camera: { startScale: 1.05, endScale: 1.1, duration: 3, punchIn: true },
      sfxUrl: null, // PLACEHOLDER: trys skirtingi pavojaus varpai
      speakerName: { lt: 'Raštas', en: 'The writ' },
      text: { lt: 'IZOLIUOTI.', en: 'ISOLATE.' },
      holdMs: 900,
    }),
  ],
}

export const m03fail = [
  { characterName: 'Vartų kapitonas', text: 'Pirmąsias duris prarandam.' },
  { characterName: 'Prazaras', text: 'Duris — taip. Žmonių — ne. Pergrupuokit lankininkus.' },
]
