// ════════════════════════════════════════════════════════════════════════════
// MISIJA 01 — „Raudonasis signalas" — SCENARIJAUS V3
// PRE „Naktis, kuri turėjo būti rami" (18 beat'ų → 27 runtime shots, ~3 min) +
// POST „Žinia dar neprarasta" (10 beat'ų → 14 shots) + FAIL + scenario.
// V3 principas: PRE baigiasi JAU prasidėjusia kova — durys lūžta, demonas
// įsikimba į laiptus, kablys smogia į signalą; UI atsiranda ant to paties kadro.
// CUTSCENE→GAMEPLAY LOCK: paskutinis vaizdas = pasviręs signalo stovas su juodu
// kabliu; 0 ėjimo įvykis = kablys daro 2 žalą signalui; pirmas tikslas —
// „Nutrauk kablį ir apsaugok raudoną signalą".
// Artwork/audio = PLACEHOLDER (public/campaign/raudonasis-signalas/*).
// ════════════════════════════════════════════════════════════════════════════

import type { MotionComicDef, MCShot, MCCharacterDef } from '@/lib/campaign/motionComic'

const A = '/campaign/raudonasis-signalas'

const M1CAST: MCCharacterDef[] = [
  {
    id: 'kernius', name: { lt: 'Kernius', en: 'Kernius' }, accentColor: 'rgb(200,150,60)',
    poses: { neutral: `${A}/kernius-neutral.svg`, battle: `${A}/kernius-battle.svg`, ragas: `${A}/kernius-ragas.svg` },
  },
  {
    id: 'tomas', name: { lt: 'Tomas', en: 'Tomas' }, accentColor: 'rgb(120,150,190)',
    poses: { neutral: `${A}/tomas-neutral.svg`, lankas: `${A}/tomas-lankas.svg` },
  },
  {
    id: 'dargis', name: { lt: 'Dargis', en: 'Dargis' }, accentColor: 'rgb(168,160,160)',
    poses: { neutral: `${A}/dargis-speaking.svg`, profile: `${A}/dargis-profile.svg`, kalavijas: `${A}/dargis-kalavijas.svg`, nugara: `${A}/dargis-nugara.svg` },
  },
  {
    id: 'rimas', name: { lt: 'Rimas', en: 'Rimas' }, accentColor: 'rgb(138,92,246)',
    poses: { neutral: `${A}/rimas-apsestas.svg`, klupo: `${A}/rimas-klupo.svg` },
  },
  {
    id: 'sargybinis', name: { lt: 'Sargybinis', en: 'Watchman' }, accentColor: 'rgb(110,120,140)',
    poses: { neutral: `${A}/sargybinis.svg` },
  },
]

/** Bazinis kadras: fade + lėtas 5 % push. */
const S = (id: string, background: string, over: Partial<MCShot> = {}): MCShot => ({
  id, background,
  transition: { type: 'fade', duration: 420 },
  camera: { startScale: 1, endScale: 1.05, duration: 6 },
  voiceUrl: null, // PLACEHOLDER: VO įkeliamas per admin
  ...over,
})

/** Tos pačios kompozicijos tęsinys — kietas cut. */
const C = (id: string, background: string, over: Partial<MCShot> = {}): MCShot =>
  S(id, background, { transition: { type: 'cut' }, camera: { startScale: 1.04, endScale: 1.06, duration: 4 }, ...over })

export const raudonasisSignalasCutscene: MotionComicDef = {
  version: 1,
  musicUrl: null,      // PLACEHOLDER: tyli žema tema, nuo 04 beat'o — žemas styginių pulsas
  ambientUrl: null,    // PLACEHOLDER: vėjas + lietus + medinių bokšto dalių girgždesys
  typewriter: true,
  autoAdvanceAfterVoice: false,
  characters: M1CAST,
  shots: [
    // ═══ A. ĮPRASTA PAMAINA ═══
    // 01 — Bokštas prieš audrą (establishing, 2,5 s hold be teksto)
    S('s01', `${A}/bg-laukai.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'rain', intensity: 0.35 }, { kind: 'fog', intensity: 0.35 }],
      camera: { startScale: 1, endScale: 1.06, endY: -1, duration: 8 },
      text: null, holdMs: 2500,
    }),
    // 02 — Keturi žmonės
    C('s02a', `${A}/bg-vidus.svg`, {
      characters: [
        { characterId: 'tomas', pose: 'neutral', x: 22, height: 80, depth: 10 },
        { characterId: 'rimas', pose: 'klupo', x: 46, height: 62, bottom: -8, depth: 9, dim: 0.2 },
        { characterId: 'dargis', pose: 'neutral', x: 68, height: 84, depth: 11, dim: 0.15 },
        { characterId: 'kernius', pose: 'neutral', x: 88, height: 78, depth: 10, flip: true, dim: 0.2 },
      ],
      speakerId: 'tomas',
      text: { lt: 'Jei lietus nesustos, rytą nuo kelio nieko nematysim.', en: 'If the rain does not stop, we will see nothing from the road by morning.' },
    }),
    C('s02b', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'dargis', pose: 'neutral', x: 56, height: 88, depth: 12 }],
      speakerId: 'dargis', text: { lt: 'Todėl žiūrim dabar.', en: 'So we look now.' },
    }),
    // 03 — Pamainos pabaiga
    C('s03', `${A}/bg-vidus.svg`, {
      characters: [
        { characterId: 'dargis', pose: 'neutral', x: 34, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'neutral', x: 72, height: 82, depth: 10, flip: true },
      ],
      speakerId: 'dargis', text: { lt: 'Kerniau, paskutinis ratas. Tada keičia Tomas.', en: 'Kernius, last round. Then Tomas takes over.' },
      holdMs: 400,
    }),

    // ═══ B. PIRMAS NETEISINGAS DALYKAS ═══
    // 04 — Kalnas pajuda (1,5 s hold be teksto, tada Kerniaus replika)
    S('s04a', `${A}/bg-plysys.svg`, {
      effects: [{ kind: 'fog', intensity: 0.3 }, { kind: 'magic', intensity: 0.25, color: 'rgba(200,30,30,0.25)' }],
      tint: 'rgba(200,30,30,0.05)',
      camera: { startScale: 1.02, endScale: 1.06, duration: 5 },
      sfxUrl: null, // PLACEHOLDER: žemas, vos girdimas pulsas
      text: null, holdMs: 1500,
    }),
    C('s04b', `${A}/bg-plysys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 24, height: 84, depth: 11 }],
      tint: 'rgba(200,30,30,0.05)',
      speakerId: 'kernius',
      text: { lt: 'Pirmasis ženklas buvo tai, kad Vethago’o Kalnas pradėjo pulsuoti.', en: 'The first sign was that Mount Vethago began to pulse.' },
    }),
    // 05 — Tomas patikrina
    C('s05a', `${A}/bg-plysys.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'neutral', x: 24, height: 84, depth: 11, dim: 0.2 },
        { characterId: 'tomas', pose: 'neutral', x: 58, height: 82, depth: 10 },
      ],
      speakerId: 'tomas', text: { lt: 'Debesų šešėlis.', en: 'A cloud shadow.' },
    }),
    C('s05b', `${A}/bg-plysys.svg`, { // antras pulsas — mato abu
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(200,30,30,0.3)' }],
      tint: 'rgba(200,30,30,0.07)',
      camera: { startScale: 1.04, endScale: 1.08, duration: 3, punchIn: true },
      sfxUrl: null, // PLACEHOLDER: antras pulsas, garsesnis
      characters: [
        { characterId: 'kernius', pose: 'neutral', x: 24, height: 84, depth: 11 },
        { characterId: 'tomas', pose: 'neutral', x: 58, height: 82, depth: 10, dim: 0.2 },
      ],
      speakerId: 'kernius', text: { lt: 'Debesys nepulsuoja.', en: 'Clouds do not pulse.' },
      holdMs: 500,
    }),
    // 06 — Dargis netiki aklai (dubuo su vandeniu)
    S('s06a', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'dargis', pose: 'profile', x: 40, height: 88, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: trečias pulsas + virpantis vanduo dubenyje
      effects: [{ kind: 'magic', intensity: 0.2, color: 'rgba(200,30,30,0.2)' }],
      speakerId: 'dargis', text: { lt: 'Kiek kartų?', en: 'How many times?' },
    }),
    C('s06b', `${A}/bg-vidus.svg`, {
      characters: [
        { characterId: 'dargis', pose: 'profile', x: 40, height: 88, depth: 12, dim: 0.2 },
        { characterId: 'kernius', pose: 'neutral', x: 72, height: 82, depth: 10, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'Trys. Vienodais tarpais.', en: 'Three. Evenly spaced.' },
      holdMs: 600, // Dargis pasirašo žurnalą ir pažymi tris brūkšnius
    }),

    // ═══ C. TAISYKLĖS NEBEVEIKIA ═══
    // 07 — Raudonas signalas
    S('s07a', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'dargis', pose: 'neutral', x: 44, height: 90, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: metalinės dėžės atrakinimas
      speakerId: 'dargis', text: { lt: 'Užkurkit raudoną signalą.', en: 'Light the red signal.' },
    }),
    C('s07b', `${A}/bg-vidus.svg`, {
      characters: [
        { characterId: 'dargis', pose: 'neutral', x: 30, height: 86, depth: 11, dim: 0.2 },
        { characterId: 'tomas', pose: 'neutral', x: 66, height: 84, depth: 10, flip: true },
      ],
      speakerId: 'tomas', text: { lt: 'Raudoną leidžiam tik kariuomenei.', en: 'Red is only for an army.' },
    }),
    C('s07c', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'dargis', pose: 'neutral', x: 44, height: 92, depth: 12 }],
      speakerId: 'dargis',
      text: { lt: 'Kariuomenę galima suskaičiuoti. Ši grėsmė gali būti dar didesnė. Kurk.', en: 'An army can be counted. This threat may be greater still. Light it.' },
      holdMs: 1000, // svarbaus sprendimo replika
    }),
    // 08 — Ugnis pakyla
    S('s08', `${A}/bg-signalas.svg`, {
      effects: [{ kind: 'embers', intensity: 0.5 }],
      tint: 'rgba(240,80,40,0.1)',
      camera: { startScale: 1, endScale: 1.06, endY: -1, duration: 5 },
      sfxUrl: null, // PLACEHOLDER: suberiama druska, ugnis suraudonuoja
      characters: [{ characterId: 'dargis', pose: 'neutral', x: 28, height: 86, depth: 11 }],
      speakerId: 'dargis',
      text: { lt: 'Dvi atsakomosios ugnys reikš, kad miestas mus pamatė.', en: 'Two answering fires will mean the city has seen us.' },
    }),
    // 09 — Dūmai sustoja
    S('s09a', `${A}/bg-dumai.svg`, {
      effects: [{ kind: 'embers', intensity: 0.35 }],
      tint: 'rgba(240,80,40,0.07)',
      camera: { startScale: 1.02, endScale: 1.07, duration: 5, punchIn: true },
      characters: [{ characterId: 'tomas', pose: 'neutral', x: 70, height: 84, depth: 11, flip: true }],
      speakerId: 'tomas', text: { lt: 'Vėjas nepasikeitė.', en: 'The wind has not changed.' },
    }),
    C('s09b', `${A}/bg-dumai.svg`, {
      characters: [{ characterId: 'dargis', pose: 'profile', x: 36, height: 90, depth: 12 }],
      speakerId: 'dargis', text: { lt: 'Ne.', en: 'No.' },
      holdMs: 700,
    }),
    // 10 — Rimas nustoja melstis
    S('s10a', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'rimas', pose: 'klupo', x: 48, height: 70, bottom: -6, depth: 11 }],
      effects: [{ kind: 'magic', intensity: 0.25, color: 'rgba(138,92,246,0.25)' }],
      sfxUrl: null, // PLACEHOLDER: malda nutrūksta vidury žodžio; amuleto grandinėlės įtempimas
      text: null, holdMs: 1200,
    }),
    C('s10b', `${A}/bg-vidus.svg`, {
      characters: [
        { characterId: 'rimas', pose: 'klupo', x: 48, height: 70, bottom: -6, depth: 11, dim: 0.2 },
        { characterId: 'dargis', pose: 'neutral', x: 78, height: 86, depth: 12, flip: true },
      ],
      speakerId: 'dargis', text: { lt: 'Rimai. Ragą.', en: 'Rimas. The horn.' },
      holdMs: 600, // Rimas neatsako
    }),

    // ═══ D. GRĖSMĖ JAU VIDUJE ═══
    // 11 — Svetima akis
    S('s11a', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'rimas', pose: 'neutral', x: 50, height: 92, depth: 12, entrance: 'fade' }],
      effects: [{ kind: 'smoke', intensity: 0.35 }, { kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.35)' }],
      tint: 'rgba(138,92,246,0.06)',
      camera: { startScale: 1.04, endScale: 1.1, duration: 4, punchIn: true },
      speakerId: 'rimas', speakerName: { lt: 'Rimas / svetimas balsas', en: 'Rimas / a foreign voice' },
      text: { lt: 'Mažieji eina pirmi. Jie tikrina, ar mes ginsimės.', en: 'The little ones go first. They test whether we will fight.' },
    }),
    C('s11b', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 34, height: 88, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Kas eina?', en: 'Who goes?' },
    }),
    C('s11c', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'rimas', pose: 'neutral', x: 52, height: 94, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.45, color: 'rgba(138,92,246,0.4)' }],
      speakerId: 'rimas', speakerName: { lt: 'Rimas / svetimas balsas', en: 'Rimas / a foreign voice' },
      text: { lt: 'Tie, kurie jau čia.', en: 'Those who are already here.' },
      holdMs: 700,
    }),
    // 12 — Skaičius
    C('s12a', `${A}/bg-vidus.svg`, {
      characters: [
        { characterId: 'dargis', pose: 'kalavijas', x: 38, height: 90, depth: 12 },
        { characterId: 'rimas', pose: 'neutral', x: 72, height: 84, depth: 10, flip: true, dim: 0.2 },
      ],
      speakerId: 'dargis', text: { lt: 'Nekalbėk su juo.', en: 'Do not speak with it.' },
    }),
    C('s12b', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'rimas', pose: 'neutral', x: 52, height: 94, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.45, color: 'rgba(138,92,246,0.4)' }],
      speakerId: 'rimas', speakerName: { lt: 'Rimas / svetimas balsas', en: 'Rimas / a foreign voice' },
      text: { lt: 'Septyni viršuje. Vienas apačioje.', en: 'Seven above. One below.' },
      holdMs: 900, // Tomas suskaičiuoja — septyni
    }),
    // 13 — Pirmas smūgis
    S('s13', `${A}/bg-vidus.svg`, {
      effects: [{ kind: 'dust', intensity: 0.4 }],
      camera: { startScale: 1.03, endScale: 1.08, duration: 2, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: smūgis į apatines duris + Dargio rankenos smūgis
      characters: [
        { characterId: 'dargis', pose: 'kalavijas', x: 40, height: 90, depth: 12 },
        { characterId: 'rimas', pose: 'klupo', x: 70, height: 60, bottom: -10, depth: 10, flip: true, dim: 0.3 },
      ],
      speakerId: 'dargis', text: { lt: 'Ragą. Dabar.', en: 'The horn. Now.' },
      holdMs: 500,
    }),
    // 14 — Signalas miestui
    S('s14', `${A}/bg-slaitas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'ragas', x: 40, height: 90, depth: 12 }],
      effects: [{ kind: 'rain', intensity: 0.3 }, { kind: 'fog', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: rago garsas, grįžtantis per greitai — lyg į sieną
      text: null, holdMs: 1400, // Varngradas dar neatsako
    }),

    // ═══ E. MŪŠIS JAU PRASIDEDA ═══
    // 15 — Durys linksta
    S('s15a', `${A}/bg-durys.svg`, {
      effects: [{ kind: 'dust', intensity: 0.45 }, { kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.02, endScale: 1.09, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: antras smūgis, skląstis iššoka; trys juodi pirštai
      characters: [{ characterId: 'tomas', pose: 'neutral', x: 26, height: 84, depth: 11 }],
      speakerId: 'tomas', text: { lt: 'Niekas nepriėjo prie bokšto.', en: 'No one approached the tower.' },
    }),
    C('s15b', `${A}/bg-durys.svg`, {
      characters: [{ characterId: 'dargis', pose: 'kalavijas', x: 60, height: 90, depth: 12, flip: true }],
      speakerId: 'dargis', text: { lt: 'Vadinasi, jie neatėjo keliu.', en: 'Then they did not come by the road.' },
      holdMs: 500,
    }),
    // 16 — Aiškus planas (kiekviena replika atskiru close-up)
    C('s16a', `${A}/bg-laiptai.svg`, {
      characters: [{ characterId: 'dargis', pose: 'kalavijas', x: 42, height: 92, depth: 12 }],
      speakerId: 'dargis',
      text: { lt: 'Tomai, lanką. Kerniau, neatsitrauk nuo ugnies. Kiti — su manim.', en: 'Tomas, your bow. Kernius, do not leave the fire. The rest — with me.' },
    }),
    C('s16b', `${A}/bg-laiptai.svg`, {
      characters: [{ characterId: 'dargis', pose: 'nugara', x: 46, height: 90, depth: 12 }],
      camera: { startScale: 1.04, endScale: 1.08, startY: -1, endY: 1, duration: 4 },
      speakerId: 'dargis', text: { lt: 'Varngrado vyrai. Prie laiptų.', en: 'Men of Varngrad. To the stairs.' },
      holdMs: 1000,
    }),
    // 17 — Pirmas priešas (durys lūžta; 0,8 s pasekmės hold)
    S('s17', `${A}/bg-laiptai.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.55 }, { kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.35)' }],
      tint: 'rgba(138,92,246,0.07)',
      camera: { startScale: 1.05, endScale: 1.11, duration: 2, shake: 'heavy' },
      characters: [
        { characterId: 'sargybinis', pose: 'neutral', x: 24, height: 80, depth: 10, dim: 0.2 },
        { characterId: 'tomas', pose: 'lankas', x: 78, height: 84, depth: 11, flip: true },
      ],
      sfxUrl: null, // PLACEHOLDER: durys lūžta; strėlė; juoda ranka ją pagauna
      text: null, holdMs: 1200,
    }),
    // 18 — Smūgis į signalą → kova
    C('s18', `${A}/bg-signalas.svg`, {
      effects: [{ kind: 'embers', intensity: 0.6 }, { kind: 'dust', intensity: 0.4 }],
      tint: 'rgba(240,80,40,0.1)',
      camera: { startScale: 1.05, endScale: 1.12, duration: 2, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: juodas kablys trenkia į stovą, žarijos byra
      characters: [{ characterId: 'dargis', pose: 'kalavijas', x: 26, height: 88, depth: 11 }],
      speakerId: 'dargis', text: { lt: 'Kerniau — ugnį! Mes laikom laiptus!', en: 'Kernius — the fire! We hold the stairs!' },
      holdMs: 700, // kovos UI atsiranda ant šio vaizdo — juodo ekrano nėra
    }),
  ],
}

// ════════════════════════════════════════════════════════════════════════════
// POST — „Žinia dar neprarasta" (10 beat'ų → 14 shots, ~2 min)
// ════════════════════════════════════════════════════════════════════════════
export const raudonasisSignalasPost: MotionComicDef = {
  version: 1,
  musicUrl: null,      // PLACEHOLDER: išsekusi, tyli tema
  ambientUrl: null,    // PLACEHOLDER: tolimas nagų skrebenimas iš apačios
  typewriter: true,
  autoAdvanceAfterVoice: false,
  characters: M1CAST,
  shots: [
    // 01 — Trumpa tyla
    S('p01', `${A}/bg-laiptai.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: apačioje — daugiau nagų nei liko gynėjų
      text: null, holdMs: 1600,
    }),
    // 02 — Atsakymas iš miesto (viena ugnis)
    S('p02a', `${A}/bg-laukai.svg`, {
      tint: 'rgba(240,80,40,0.06)',
      effects: [{ kind: 'rain', intensity: 0.25 }, { kind: 'fog', intensity: 0.3 }],
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 28, height: 86, depth: 11 }],
      speakerId: 'kernius', text: { lt: 'Jie matė signalą. Kodėl tik viena?', en: 'They saw the signal. Why only one?' },
    }),
    C('p02b', `${A}/bg-laukai.svg`, {
      characters: [{ characterId: 'dargis', pose: 'neutral', x: 62, height: 88, depth: 12, flip: true }],
      speakerId: 'dargis',
      text: { lt: 'Nes signalas pasakė „pavojus“. Jis nepasakė, kas atėjo.', en: 'Because the signal said "danger". It did not say what has come.' },
      holdMs: 500,
    }),
    // 03 — Žurnalo lapas
    S('p03', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'dargis', pose: 'profile', x: 42, height: 90, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: plėšiamas žurnalo lapas
      text: null, holdMs: 1300, // trys pulsai, sustingę dūmai, Rimo žodžiai, durų laikas
    }),
    // 04 — Raudonas antspaudas
    C('p04', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'dargis', pose: 'neutral', x: 44, height: 92, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: bokšto ženklo antspaudas ant vamzdelio
      speakerId: 'dargis', text: { lt: 'Prazarui. Ne sargybai prie vartų. Jam į rankas.', en: 'To Prazaras. Not to the gate watch. Into his hands.' },
      holdMs: 500,
    }),
    // 05 — Kerniaus atsisakymas
    C('p05a', `${A}/bg-vidus.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'neutral', x: 32, height: 88, depth: 12 },
        { characterId: 'dargis', pose: 'neutral', x: 68, height: 86, depth: 11, flip: true, dim: 0.2 },
      ],
      speakerId: 'kernius', text: { lt: 'Jei aš išeisiu, prie ugnies liks vienu mažiau.', en: 'If I leave, the fire will have one less defender.' },
    }),
    C('p05b', `${A}/bg-vidus.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'neutral', x: 32, height: 88, depth: 12, dim: 0.2 },
        { characterId: 'dargis', pose: 'neutral', x: 68, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'dargis', text: { lt: 'Bokštas jau prarastas. Žinia — dar ne.', en: 'The tower is already lost. The message is not.' },
      holdMs: 1000,
    }),
    // 06 — Tomas lieka (trys strėlės)
    C('p06a', `${A}/bg-vidus.svg`, {
      characters: [{ characterId: 'tomas', pose: 'lankas', x: 46, height: 88, depth: 12 }],
      speakerId: 'tomas', text: { lt: 'Pasakyk mieste, kad raudoną užkūriau ne per anksti.', en: 'Tell them in the city that I did not light the red too soon.' },
    }),
    C('p06b', `${A}/bg-vidus.svg`, {
      characters: [
        { characterId: 'tomas', pose: 'lankas', x: 60, height: 84, depth: 11, dim: 0.2 },
        { characterId: 'kernius', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'kernius', text: { lt: 'Pasakysi pats.', en: 'You will tell them yourself.' },
      holdMs: 700, // Tomas neatsako. Grįžta prie laiptų.
    }),
    // 07 — Dargio paskutinis įsakymas
    S('p07', `${A}/bg-slaitas.svg`, {
      characters: [{ characterId: 'dargis', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      effects: [{ kind: 'rain', intensity: 0.35 }],
      speakerId: 'dargis',
      text: { lt: 'Nesustok dėl balso. Nesustok dėl mūsų. Sustosi prie Prazaro.', en: 'Do not stop for a voice. Do not stop for us. You stop at Prazaras.' },
      holdMs: 1000,
    }),
    // 08 — Išėjimas (be žodžių)
    C('p08', `${A}/bg-slaitas.svg`, {
      effects: [{ kind: 'rain', intensity: 0.35 }, { kind: 'dust', intensity: 0.25 }],
      sfxUrl: null, // PLACEHOLDER: liukas užsiveria
      text: null, holdMs: 1200,
    }),
    // 09 — Bokštas už nugaros
    S('p09', `${A}/bg-laukai.svg`, {
      tint: 'rgba(240,80,40,0.09)',
      effects: [{ kind: 'rain', intensity: 0.3 }, { kind: 'embers', intensity: 0.3 }],
      camera: { startScale: 1.05, endScale: 1, duration: 5, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: naujas smūgis viršuje; raudona ugnis užstoja angą
      text: null, holdMs: 1400,
    }),
    // 10 — Kitas garsas (sesers balsas)
    C('p10', `${A}/bg-slaitas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'battle', x: 34, height: 90, depth: 12 }],
      effects: [{ kind: 'rain', intensity: 0.3 }, { kind: 'fog', intensity: 0.35 }],
      camera: { startScale: 1.02, endScale: 1.08, endX: -1, duration: 5 },
      speakerName: { lt: 'Sesers balsas', en: 'His sister’s voice' },
      text: { lt: 'Kerniau. Grįžk.', en: 'Kernius. Come back.' },
      holdMs: 900, // Kernius nesustoja → perėjimas į 2 misiją
    }),
  ],
}

export const raudonasisSignalasFail = [
  { characterName: 'Dargis', text: 'Dar dega. Kerniau, kablį. Kiti — atgal į liniją.' },
]

// ════════════════════════════════════════════════════════════════════════════
// MISIJOS scenario JSON (Node → Advanced JSON → scenario) — V3.
// LOCK: 0 ėjimo įvykis = juodas kablys daro 2 žalą signalui; kol kablys gyvas,
// signalas kas ėjimą praranda 2 HP. Vidurio lūžis 4 ėjime (atsakomoji ugnis),
// 6 ėjime — latakas ir pergalė. PAKEISK <demon-uuid-*> tikrais kortų id.
// ════════════════════════════════════════════════════════════════════════════
export const raudonasisSignalasScenario = {
  survivalTurns: 6,
  objectives: [
    { id: 'ugnis', kind: 'relic', label: 'Raudonas signalas', hp: 18, maxHp: 18, side: 'player' },
    { id: 'kablys', kind: 'relic', label: 'Juodas kablys', hp: 6, maxHp: 6, side: 'enemy' },
  ],
  waves: [
    { id: 'vienas-apacioje', name: 'Vienas apačioje', triggerType: 'turn', turn: 1, spawnSide: 'gate', warningText: 'Vienas apačioje!', exactUnits: ['<demon-uuid-boss>'] },
    { id: 'mazieji1', name: 'Mažieji eina pirmi', triggerType: 'turn', turn: 2, spawnSide: 'top', warningText: 'Mažieji eina pirmi!', exactUnits: ['<demon-uuid-1>', '<demon-uuid-1>'] },
    { id: 'mazieji2', name: 'Antra banga', triggerType: 'turn', turn: 4, spawnSide: 'top', warningText: 'Jie tikrina, ar mes ginsimės!', exactUnits: ['<demon-uuid-1>', '<demon-uuid-2>'] },
  ],
  rules: [
    // 0 ėjimas — kablio smūgis (LOCK: tęsia paskutinį cutscene kadrą)
    { trigger: 'onBattleStart', once: true, actions: [
      { type: 'damageObjective', objectiveId: 'ugnis', amount: 2 },
      { type: 'dialogue', text: 'Pirmiausia kablį. Be ugnies miestas mūsų nematys.', characterName: 'Dargis' },
    ] },
    // kablys tempia signalą kas ėjimą (runtime turėtų stabdyti, kai kablys sunaikintas)
    { trigger: 'onTurnEnd', everyTurns: 1, actions: [{ type: 'damageObjective', objectiveId: 'ugnis', amount: 2 }] },
    // 2 ėjimas — Rimo svetimas balsas
    { trigger: 'onTurnStart', turn: 2, once: true, actions: [
      { type: 'dialogue', text: 'Kerniau, Tomas jau mirė.', characterName: 'Rimas / svetimas balsas' },
      { type: 'dialogue', text: 'Balsas meluoja. Žiūrėk į mane.', characterName: 'Dargis' },
    ] },
    // vidurio lūžis 4 ėjime — atsakomoji ugnis
    { trigger: 'onTurnStart', turn: 4, once: true, actions: [
      { type: 'dialogue', text: 'Viena ugnis. Jie pamatė.', characterName: 'Kernius' },
    ] },
    // 6 ėjimas — latakas
    { trigger: 'onTurnStart', turn: 6, once: true, actions: [
      { type: 'dialogue', text: 'Kerniau, prie latako. Tu nebesaugai bokšto. Tu neši žinią.', characterName: 'Dargis' },
    ] },
    // desperacija žemame HP
    { trigger: 'onCondition', once: true, conditions: [{ lhs: 'playerHp', op: '<=', rhs: 10 }], actions: [{ type: 'dialogue', text: 'Tada tarp jų ir ugnies stovim mes.', characterName: 'Dargis' }] },
  ],
}
