// ════════════════════════════════════════════════════════════════════════════
// M6 „Mėlyno mithrilo aušra" — PRE „Pirmi prie vartų" (~75 s) +
// POST „Ne pagalba" (~70 s) + FAIL. Pagal MISIJA06 scenarijų.
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m06pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('s01', `${A}/bg-apsupties-laukas.svg`, { // mėlynas pleištas
      transition: { type: 'cut' },
      tint: 'rgba(90,140,220,0.1)',
      effects: [{ kind: 'fog', intensity: 0.35 }],
      camera: { startScale: 1, endScale: 1.07, endX: -1, duration: 6 },
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 34, height: 90, depth: 12, entrance: 'slide-left' }],
      sfxUrl: null, // PLACEHOLDER: raitelių kanopos + mithrilo smūgiai
      speakerId: 'kapitonas',
      text: { lt: 'Iki vartų. Nestokit dėl tų, kurie krinta už nugaros.', en: 'To the gates. Do not stop for those who fall behind you.' },
    }),
    S('s02a', `${A}/bg-siena-horizontas.svg`, { // ant sienos
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 68, height: 82, depth: 10, flip: true },
      ],
      speakerId: 'vartu-kapitonas', text: { lt: 'Atidarom?', en: 'Do we open?' },
    }),
    C('s02b', `${A}/bg-siena-horizontas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 68, height: 82, depth: 10, flip: true, dim: 0.2 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kai tarp jų ir vartų neliks ragų.', en: 'When there are no horns left between them and the gates.' },
      holdMs: 400,
    }),
    S('s03a', `${A}/bg-apsupties-laukas.svg`, { // pirmas kontaktas
      tint: 'rgba(90,140,220,0.08)',
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 40, height: 92, depth: 12 }],
      effects: [{ kind: 'dust', intensity: 0.4 }],
      camera: { startScale: 1.02, endScale: 1.07, duration: 4, shake: 'light' },
      speakerId: 'kapitonas', text: { lt: 'Atidarykit — įvesiu raitelius!', en: 'Open up — I will bring the riders in!' },
    }),
    C('s03b', `${A}/bg-siena-horizontas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Nuvalyk kelią — atidarysiu.', en: 'Clear the road — I will open.' },
    }),
    C('s04a', `${A}/bg-apsupties-laukas.svg`, { // trumpas įvertinimas
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 42, height: 92, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'Protingas.', en: 'Smart.' },
    }),
    C('s04b', `${A}/bg-siena-horizontas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Gyvas.', en: 'Alive.' },
      holdMs: 500,
    }),
    S('s05', `${A}/bg-siena-horizontas.svg`, { // Kerniaus akis nuo sienos
      characters: [{ characterId: 'kernius', pose: 'akis', x: 56, height: 90, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.02, endScale: 1.08, duration: 5, punchIn: true },
      speakerId: 'kernius',
      text: { lt: 'Kapitone! Už trečios eilės. Tas didysis valdo likusius.', en: 'Captain! Behind the third row. The big one commands the rest.' },
    }),
    C('s06', `${A}/bg-apsupties-laukas.svg`, { // naujas taikinys
      tint: 'rgba(90,140,220,0.08)',
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 36, height: 92, depth: 12 }],
      effects: [{ kind: 'dust', intensity: 0.35 }],
      speakerId: 'kapitonas', text: { lt: 'Girdėjot žmogų su juoda akim. Į didįjį.', en: 'You heard the man with the black eye. On the big one.' },
    }),
    S('s07', `${A}/bg-inkvizicijos-kalva.svg`, { // pietinė kalva
      effects: [{ kind: 'fog', intensity: 0.25 }],
      camera: { startScale: 1, endScale: 1.05, endX: 1, duration: 6 },
      speakerId: 'vartu-kapitonas', text: { lt: 'Jie mato tą patį, ką mes.', en: 'They see the same thing we do.' },
    }),
    C('s08a', `${A}/bg-apsupties-laukas.svg`, { // kas atvyko pirmas
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'Inkvizicija atvyko prieš aušrą.', en: 'The Inquisition arrived before dawn.' },
    }),
    C('s08b', `${A}/bg-siena-horizontas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada kodėl jūs pirmi prie vartų?', en: 'Then why are you first at the gates?' },
      holdMs: 600,
    }),
    C('s09', `${A}/bg-apsupties-laukas.svg`, { // pralaužimas
      tint: 'rgba(90,140,220,0.1)',
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 30, height: 90, depth: 12 }],
      effects: [{ kind: 'dust', intensity: 0.45 }],
      camera: { startScale: 1.03, endScale: 1.08, duration: 3, shake: 'light' },
      speakerId: 'prazaras',
      text: { lt: 'Kai kelias atsivers — mažąsias duris. Sužeistuosius pirmus.', en: 'When the road opens — the small door. Wounded first.' },
      holdMs: 500,
    }),
  ],
}

export const m06post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('p01a', `${A}/bg-vartu-kiemas.svg`, { // sužeistieji pirmi
      transition: { type: 'cut' },
      characters: [
        { characterId: 'kapitonas', pose: 'neutral', x: 64, height: 88, depth: 12, flip: true, entrance: 'slide-right' },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      sfxUrl: null, // PLACEHOLDER: vartų grandinės + neštuvai
      speakerId: 'kapitonas', text: { lt: 'Maniau, pirmiausia įleisit kardus.', en: 'I thought you would let the swords in first.' },
    }),
    C('p01b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kapitonas', pose: 'neutral', x: 64, height: 88, depth: 12, flip: true, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kardai gali palaukti. Kraujas — ne.', en: 'Swords can wait. Blood cannot.' },
      holdMs: 400,
    }),
    C('p02a', `${A}/bg-vartu-kiemas.svg`, { // du vadai
      characters: [
        { characterId: 'kapitonas', pose: 'neutral', x: 66, height: 90, depth: 12, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
      ],
      speakerId: 'kapitonas', text: { lt: 'Kiek dienų laikotės?', en: 'How many days have you held?' },
    }),
    C('p02b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kapitonas', pose: 'neutral', x: 66, height: 90, depth: 12, flip: true, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Dar neskaičiuojam.', en: 'We have not started counting.' },
      holdMs: 400,
    }),
    S('p03', `${A}/bg-vartai-isore.svg`, { // balta vėliava
      effects: [{ kind: 'fog', intensity: 0.3 }],
      tint: 'rgba(220,215,200,0.07)',
      characters: [{ characterId: 'pasiuntinys', pose: 'neutral', x: 52, height: 84, depth: 11, entrance: 'fade' }],
      text: null, holdMs: 1200,
    }),
    C('p04', `${A}/bg-vartu-kiemas.svg`, { // įsakymas
      characters: [{ characterId: 'pasiuntinys', pose: 'neutral', x: 54, height: 88, depth: 12 }],
      speakerId: 'pasiuntinys',
      text: { lt: 'Pagal vyresniojo inkvizitoriaus įsakymą perimame sanitarinę šiaurės kontrolę.', en: 'By order of the Senior Inquisitor we assume sanitary control of the north.' },
    }),
    C('p05a', `${A}/bg-vartu-kiemas.svg`, { // vaistai
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
        { characterId: 'pasiuntinys', pose: 'neutral', x: 68, height: 84, depth: 11, flip: true, dim: 0.2 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kiek vežimų vaistų atsivežėt?', en: 'How many wagons of medicine did you bring?' },
    }),
    C('p05b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12, dim: 0.2 },
        { characterId: 'pasiuntinys', pose: 'neutral', x: 68, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'pasiuntinys', text: { lt: 'Nė vieno.', en: 'None.' },
    }),
    C('p06a', `${A}/bg-vartu-kiemas.svg`, { // kareiviai
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
        { characterId: 'pasiuntinys', pose: 'neutral', x: 68, height: 84, depth: 11, flip: true, dim: 0.2 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kiek kareivių?', en: 'How many soldiers?' },
    }),
    C('p06b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12, dim: 0.2 },
        { characterId: 'pasiuntinys', pose: 'neutral', x: 68, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'pasiuntinys', text: { lt: 'Pakankamai, kad niekas neišeitų.', en: 'Enough that no one leaves.' },
      holdMs: 500,
    }),
    C('p07a', `${A}/bg-vartu-kiemas.svg`, { // Ordino reakcija
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 40, height: 92, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'Orda yra šiaurėje.', en: 'The Horde is in the north.' },
    }),
    C('p07b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'pasiuntinys', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'pasiuntinys', text: { lt: 'Užkratas — ne kryptis.', en: 'Contagion is not a direction.' },
      holdMs: 400,
    }),
    C('p08', `${A}/bg-vartu-kiemas.svg`, { // pamato Kernių
      characters: [
        { characterId: 'pasiuntinys', pose: 'neutral', x: 32, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 70, height: 86, depth: 11, flip: true },
      ],
      effects: [{ kind: 'magic', intensity: 0.25, color: 'rgba(138,92,246,0.25)' }],
      speakerId: 'pasiuntinys', text: { lt: 'Štai kodėl vartai liks užverti.', en: 'That is why the gates will stay shut.' },
      holdMs: 500,
    }),
    S('p09', `${A}/bg-vartu-kiemas.svg`, { // taryba
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 38, height: 92, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: balto vaško įsakymo stingeris
      camera: { startScale: 1.02, endScale: 1.08, duration: 5, punchIn: true },
      speakerId: 'prazaras',
      text: { lt: 'Tavo vyresnysis nori uždaryti mūsų miestą — tegu ateina ir pasako tai jame.', en: 'Your superior wants to close our city — let him come and say it inside it.' },
      holdMs: 700,
    }),
  ],
}

export const m06fail = [
  { characterName: 'Prazaras', text: 'Vartų neatidarykit. Surinkit jų raitelius.' },
  { characterName: 'Ordino kapitonas', text: 'Dar kartą. Šįsyk per vidurį.' },
]
