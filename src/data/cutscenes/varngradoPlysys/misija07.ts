// ════════════════════════════════════════════════════════════════════════════
// M7 „Balto vaško įsakymas" — PRE „Paruoštas sprendimas" (~100 s) +
// POST „Miestas apsuptas" (~70 s) + FAIL. Pagal MISIJA07 scenarijų.
// Tarybos salė = bg-karo-kambarys (bendras kampanijos fonas).
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m07pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('s01', `${A}/bg-karo-kambarys.svg`, { // tarybos salė — dvi pusės
      transition: { type: 'cut' },
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 22, height: 86, depth: 12 },
        { characterId: 'kapitonas', pose: 'neutral', x: 50, height: 82, depth: 11 },
        { characterId: 'inkvizitorius', pose: 'neutral', x: 78, height: 86, depth: 12, flip: true },
      ],
      camera: { startScale: 1, endScale: 1.06, duration: 7 },
      text: null, holdMs: 1400,
    }),
    C('s02a', `${A}/bg-karo-kambarys.svg`, { // pirmoji sąlyga
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Visi išoriniai keliai uždaromi. Niekas neišeina be mūsų patikros.', en: 'All outer roads are closed. No one leaves without our inspection.' },
    }),
    C('s02b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Patikrai vartų užverti nereikia.', en: 'Inspection does not require sealed gates.' },
    }),
    C('s03', `${A}/bg-karo-kambarys.svg`, { // antroji sąlyga
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Visi paliesti juodo dūmo izoliuojami. Jūsų sargybinis perduodamas mums.', en: 'Everyone touched by the black smoke is isolated. Your watchman is handed over to us.' },
    }),
    C('s04a', `${A}/bg-karo-kambarys.svg`, { // Kernius prie sienos
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 90, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.25, color: 'rgba(138,92,246,0.25)' }],
      speakerId: 'kernius',
      text: { lt: 'Jei būčiau jų vartai, jie jau būtų šitoje salėje.', en: 'If I were their gate, they would already be in this hall.' },
    }),
    C('s04b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 34, height: 86, depth: 11, dim: 0.2 },
        { characterId: 'inkvizitorius', pose: 'neutral', x: 70, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'inkvizitorius', text: { lt: 'Jie jau buvo tavo akyje.', en: 'They were already in your eye.' },
      holdMs: 400,
    }),
    C('s05a', `${A}/bg-karo-kambarys.svg`, { // Ordinas
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 44, height: 90, depth: 12 }],
      speakerId: 'kapitonas',
      text: { lt: 'Demonai stovi už sienos. Mano vyrai juos matė ir kraujavo prieš juos.', en: 'The demons stand outside the wall. My men saw them and bled against them.' },
    }),
    C('s05b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Už sienos esančią grėsmę galima apšaudyti. Mieste esančios — ne.', en: 'A threat outside the wall can be shot at. One inside the city cannot.' },
    }),
    C('s06a', `${A}/bg-karo-kambarys.svg`, { // ko atėjote
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Atėjot padėti miestui ar nuspręsti, kiek jo galima prarasti?', en: 'Did you come to help the city or to decide how much of it can be lost?' },
    }),
    C('s06b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 92, depth: 12, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Atėjau užtikrinti, kad vieno miesto nelaimė netaptų viso Ravenoro nelaime.', en: 'I came to ensure that one city’s disaster does not become all of Ravenor’s.' },
      holdMs: 500,
    }),
    S('s07', `${A}/bg-karo-kambarys.svg`, { // pirmas ženklas
      characters: [{ characterId: 'kernius', pose: 'akis', x: 52, height: 92, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.03, endScale: 1.08, duration: 3, punchIn: true },
      sfxUrl: null, // PLACEHOLDER: metalinio dubens kritimas + choras po grindimis
      speakerId: 'kernius', text: { lt: 'Tylos.', en: 'Quiet.' },
      holdMs: 700,
    }),
    S('s08', `${A}/bg-gydykla.svg`, { // gydykla — choras
      transition: { type: 'wipe-left', duration: 380 },
      effects: [{ kind: 'smoke', intensity: 0.4 }],
      tint: 'rgba(200,30,30,0.07)',
      sfxUrl: null, // PLACEHOLDER: vienu ritmu kalbantis choras
      speakerName: { lt: 'Užvaldytųjų choras', en: 'Chorus of the possessed' },
      text: { lt: 'Atidarykit.', en: 'Open.' },
      holdMs: 600,
    }),
    C('s09', `${A}/bg-gydykla.svg`, { // Inkvizicijos sprendimas
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 30, height: 90, depth: 12 }],
      effects: [{ kind: 'smoke', intensity: 0.35 }],
      speakerId: 'inkvizitorius', text: { lt: 'Ugnį į gydyklą.', en: 'Fire on the infirmary.' },
    }),
    C('s10a', `${A}/bg-gydykla.svg`, { // Prazaras užstoja duris
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 44, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Pirmiausia atskirsim žmones nuo demonų.', en: 'First we separate the people from the demons.' },
    }),
    C('s10b', `${A}/bg-gydykla.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 30, height: 88, depth: 12, dim: 0.2 },
        { characterId: 'inkvizitorius', pose: 'neutral', x: 70, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'inkvizitorius', text: { lt: 'O jei neatskirsi?', en: 'And if you cannot?' },
    }),
    C('s10c', `${A}/bg-gydykla.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 40, height: 94, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada deginsi likusius. Ne anksčiau.', en: 'Then you burn what remains. Not before.' },
      holdMs: 500,
    }),
    S('s11', `${A}/bg-gydykla.svg`, { // grindys lūžta
      effects: [{ kind: 'dust', intensity: 0.5 }, { kind: 'smoke', intensity: 0.35 }],
      camera: { startScale: 1.02, endScale: 1.08, duration: 3, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: grindų lūžis
      text: null, holdMs: 1100,
    }),
    C('s12', `${A}/bg-gydykla.svg`, { // trys pusės
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 28, height: 90, depth: 12 },
        { characterId: 'kapitonas', pose: 'kovinis', x: 52, height: 88, depth: 11 },
        { characterId: 'inkvizitorius', pose: 'neutral', x: 80, height: 82, depth: 10, flip: true, dim: 0.25 },
      ],
      effects: [{ kind: 'smoke', intensity: 0.3 }],
      speakerId: 'kapitonas',
      text: { lt: 'Pirma išgelbėjam gyvus. Po to galėsit ginčytis, kam jie priklauso.', en: 'First we save the living. Then you can argue over who they belong to.' },
      holdMs: 500,
    }),
  ],
}

export const m07post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('p01', `${A}/bg-gydykla.svg`, { // išgelbėti
      transition: { type: 'cut' },
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 60, height: 82, depth: 11, flip: true }],
      tint: 'rgba(240,220,180,0.05)',
      text: null, holdMs: 1300,
    }),
    S('p02', `${A}/bg-karo-kambarys.svg`, { // baltas vaškas
      characters: [
        { characterId: 'inkvizitorius', pose: 'antspaudas', x: 64, height: 88, depth: 12, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Antspaudas buvo paruoštas prieš išpuolį.', en: 'The seal was prepared before the attack.' },
    }),
    C('p03a', `${A}/bg-karo-kambarys.svg`, { // ne įrodymas
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Išpuolis tik patvirtino, kad sprendimas teisingas.', en: 'The attack only confirmed the decision was right.' },
    }),
    C('p03b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Ne. Jis tik davė jums sakinį, kurį galėsit parašyti po sprendimu.', en: 'No. It only gave you a sentence to write beneath the decision.' },
      holdMs: 400,
    }),
    C('p04', `${A}/bg-karo-kambarys.svg`, { // izoliacija
      characters: [{ characterId: 'inkvizitorius', pose: 'antspaudas', x: 58, height: 92, depth: 12, flip: true }],
      sfxUrl: null, // PLACEHOLDER: balto vaško antspaudas
      camera: { startScale: 1.04, endScale: 1.1, duration: 4, punchIn: true },
      speakerId: 'inkvizitorius',
      text: { lt: 'Nuo šios akimirkos nė vienas Varngrado gyventojas neperžengs pietinės užkardos.', en: 'From this moment no resident of Varngrad crosses the southern barricade.' },
      holdMs: 500,
    }),
    C('p05a', `${A}/bg-karo-kambarys.svg`, { // Ordino klausimas
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 42, height: 90, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'O mūsų sužeistieji?', en: 'And our wounded?' },
    }),
    C('p05b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Jie įžengė į izoliuotą zoną savo valia.', en: 'They entered the isolated zone of their own will.' },
      holdMs: 500,
    }),
    S('p06', `${A}/bg-miesto-gatve.svg`, { // išėjimas — kariai traukiasi į pietus
      effects: [{ kind: 'fog', intensity: 0.3 }],
      camera: { startScale: 1.05, endScale: 1, duration: 6 },
      sfxUrl: null, // PLACEHOLDER: tolstantys Inkvizicijos būgnai
      text: null, holdMs: 1300,
    }),
    S('p07', `${A}/bg-karo-kambarys.svg`, { // žemėlapis
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 62, height: 88, depth: 12, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Jie nestato linijos prieš Ordą.', en: 'They are not building a line against the Horde.' },
    }),
    C('p08a', `${A}/bg-karo-kambarys.svg`, { // kas apsuptas
      characters: [{ characterId: 'kernius', pose: 'akis', x: 54, height: 90, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      speakerId: 'kernius', text: { lt: 'Jie paliko vieną tarpą.', en: 'They left one gap.' },
    }),
    C('p08b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 62, height: 86, depth: 11, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kur?', en: 'Where?' },
    }),
    C('p09a', `${A}/bg-karo-kambarys.svg`, { // pietų kelias
      characters: [{ characterId: 'kernius', pose: 'akis', x: 54, height: 92, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Čia. Kol kas.', en: 'Here. For now.' },
      holdMs: 400,
    }),
    C('p09b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Ruoškit sužeistuosius. Patikrinsim, ar jų vartai skirti žmonėms.', en: 'Ready the wounded. We will see whether their gates are meant for people.' },
      holdMs: 600,
    }),
  ],
}

export const m07fail = [
  { characterName: 'Prazaras', text: 'Jie dar gyvi.' },
  { characterName: 'Ordino kapitonas', text: 'Tada dar ne vėlu. Į židinį dar kartą.' },
]
