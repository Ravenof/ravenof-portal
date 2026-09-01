// ════════════════════════════════════════════════════════════════════════════
// MISIJA 01 — „Raudonasis signalas" (PRE motion-comic, ~2 min) — SCENARIJAUS V2
// Kampanija „Varngrado plyšys". Šiaurinis sargybos bokštas, senasis kelias.
// Scenarijaus 14 kadrų → 27 runtime beat'ai (1 replika = 1 beat'as; kalbėtojų
// kaitos toje pačioje kompozicijoje — `cut` perėjimai; žr. TURINIO GIDĄ).
// Scenos tikslas (5 kabliukai): kalnas pulsuoja → raudonas signalas → dūmai
// sustoja → grėsmė veikia protus (Rimas) → kažkas JAU bokšte (durys).
// Pabaiga: durys lūžta, kietas kirpimas → iškart kova (be užtemimo).
// Artwork/audio = PLACEHOLDER (public/campaign/raudonasis-signalas/*).
// ════════════════════════════════════════════════════════════════════════════

import type { MotionComicDef } from '@/lib/campaign/motionComic'

const A = '/campaign/raudonasis-signalas'

export const raudonasisSignalasCutscene: MotionComicDef = {
  version: 1,
  // PLACEHOLDER audio (įkelk per admin ir pakeisk):
  musicUrl: null,      // tyli žema tema; 05 kadre — žemas styginių pulsas
  ambientUrl: null,    // vėjas + medinių bokšto dalių girgždesys
  typewriter: true,
  autoAdvanceAfterVoice: false,
  characters: [
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
  ],
  shots: [
    // ═══ 01 KADRAS — Kalnas pulsuoja (0:00–0:08) ═══
    {
      id: 's01a', // vietos įrašas
      background: `${A}/bg-laukai.svg`,
      effects: [{ kind: 'fog', intensity: 0.4 }],
      camera: { startScale: 1, endScale: 1.02, duration: 4 },
      transition: { type: 'cut' },
      text: {
        lt: 'Šiaurinis sargybos bokštas — senasis Varngrado kelias.',
        en: 'Northern watchtower — the old Varngrad road.',
      },
      voiceUrl: null,
      holdMs: 500,
    },
    {
      id: 's01b',
      background: `${A}/bg-laukai.svg`,
      effects: [{ kind: 'fog', intensity: 0.4 }],
      camera: { startScale: 1.02, endScale: 1.06, endX: -1, duration: 7 },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: žemas beveik negirdimas dūžis; antras dūžis kadro gale
      text: {
        lt: 'Pirmasis ženklas buvo tai, kad Vethago Kalnas pradėjo pulsuoti.',
        en: 'The first sign was that Mount Vethago began to pulse.',
      },
      voiceUrl: null,
      holdMs: 700,
    },
    // ═══ 02 KADRAS — Kernius pamato (0:08–0:16) ═══
    {
      id: 's02',
      background: `${A}/bg-vidus.svg`,
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 66, height: 92, depth: 12 }],
      tint: 'rgba(200,30,30,0.05)',
      camera: { startScale: 1.05, endScale: 1.02, startX: -1.2, endX: 1.2, duration: 7 },
      transition: { type: 'fade', duration: 450 },
      speakerId: 'kernius',
      text: {
        lt: 'Tomai. Prieik. Ir žiūrėk į šlaitą, ne į viršūnę.',
        en: 'Tomas. Come here. And watch the slope, not the peak.',
      },
      voiceUrl: null,
    },
    // ═══ 03 KADRAS — Antras liudininkas (0:16–0:25; 3 beat'ai) ═══
    {
      id: 's03a',
      background: `${A}/bg-plysys.svg`,
      characters: [
        { characterId: 'tomas', pose: 'neutral', x: 22, height: 74, depth: 10 },
        { characterId: 'kernius', pose: 'neutral', x: 78, height: 76, depth: 11, flip: true },
      ],
      camera: { startScale: 1, endScale: 1.03, duration: 5 },
      transition: { type: 'fade', duration: 400 },
      ambientUrl: null, // PLACEHOLDER: vėjas trumpam nutyla
      speakerId: 'tomas',
      text: { lt: 'Debesų šešėlis.', en: 'A cloud shadow.' },
      voiceUrl: null,
    },
    {
      id: 's03b',
      background: `${A}/bg-plysys.svg`,
      characters: [
        { characterId: 'tomas', pose: 'neutral', x: 22, height: 74, depth: 10 },
        { characterId: 'kernius', pose: 'neutral', x: 78, height: 76, depth: 11, flip: true },
      ],
      camera: { startScale: 1.03, endScale: 1.05, duration: 4 },
      transition: { type: 'cut' },
      speakerId: 'kernius',
      text: { lt: 'Debesys nepulsuoja.', en: 'Clouds do not pulse.' },
      voiceUrl: null,
    },
    {
      id: 's03c', // raudona linija pailgėja
      background: `${A}/bg-plysys.svg`,
      characters: [
        { characterId: 'tomas', pose: 'neutral', x: 22, height: 74, depth: 10 },
        { characterId: 'kernius', pose: 'neutral', x: 78, height: 76, depth: 11, flip: true, dim: 0.2 },
      ],
      camera: { startScale: 1.05, endScale: 1.08, endY: -1, duration: 3, punchIn: true },
      transition: { type: 'cut' },
      speakerId: 'tomas',
      speakerName: { lt: 'Tomas, jau garsiau', en: 'Tomas, louder now' },
      text: { lt: 'Dargi.', en: 'Dargis.' },
      voiceUrl: null,
    },
    // ═══ 04 KADRAS — Dargis tikrina (0:25–0:34; akies stambus planas) ═══
    {
      id: 's04a',
      background: `${A}/dargis-akis.svg`,
      camera: { startScale: 1, endScale: 1.06, duration: 6 },
      transition: { type: 'fade', duration: 420 },
      speakerName: { lt: 'Dargis', en: 'Dargis' },
      text: { lt: 'Kiek kartų judėjo?', en: 'How many times has it moved?' },
      voiceUrl: null,
    },
    {
      id: 's04b',
      background: `${A}/dargis-akis.svg`,
      camera: { startScale: 1.06, endScale: 1.08, duration: 3 },
      transition: { type: 'cut' },
      speakerName: { lt: 'Kernius', en: 'Kernius' },
      text: { lt: 'Tris. Kaskart stipriau.', en: 'Three. Stronger each time.' },
      voiceUrl: null,
    },
    // ═══ 05 KADRAS — Sprendimas (0:34–0:44; 3 beat'ai) ═══
    {
      id: 's05a', // linija prasiveria kaip žaizda
      background: `${A}/bg-plysys.svg`,
      characters: [{ characterId: 'dargis', pose: 'neutral', x: 26, height: 88, depth: 13 }],
      effects: [{ kind: 'fog', intensity: 0.25 }],
      camera: { startScale: 1.02, endScale: 1.05, duration: 5 },
      transition: { type: 'fade', duration: 400 },
      musicUrl: null, // PLACEHOLDER: prasideda žemas styginių pulsas
      speakerId: 'dargis',
      text: { lt: 'Užkurkit raudoną signalą.', en: 'Light the red signal.' },
      voiceUrl: null,
    },
    {
      id: 's05b',
      background: `${A}/bg-plysys.svg`,
      characters: [
        { characterId: 'dargis', pose: 'neutral', x: 26, height: 88, depth: 13 },
        { characterId: 'tomas', pose: 'neutral', x: 74, height: 78, depth: 10, flip: true },
      ],
      camera: { startScale: 1.05, endScale: 1.06, duration: 4 },
      transition: { type: 'cut' },
      speakerId: 'tomas',
      text: { lt: 'Raudoną leidžiam tik kariuomenei.', en: 'The red one is only for an army.' },
      voiceUrl: null,
    },
    {
      id: 's05c',
      background: `${A}/bg-plysys.svg`,
      characters: [
        { characterId: 'dargis', pose: 'neutral', x: 26, height: 88, depth: 13 },
        { characterId: 'tomas', pose: 'neutral', x: 74, height: 78, depth: 10, flip: true, dim: 0.25 },
      ],
      camera: { startScale: 1.06, endScale: 1.08, duration: 4 },
      transition: { type: 'cut' },
      speakerId: 'dargis',
      text: {
        lt: 'Kariuomenę galima suskaičiuoti. Ši grėsmė gali būti dar didesnė. Kurk.',
        en: 'An army can be counted. This threat may be greater still. Light it.',
      },
      voiceUrl: null,
      holdMs: 400,
    },
    // ═══ 06 KADRAS — Signalas (0:44–0:53) ═══
    {
      id: 's06',
      background: `${A}/bg-signalas.svg`,
      characters: [
        { characterId: 'dargis', pose: 'neutral', x: 24, height: 70, depth: 11, dim: 0.25 },
        { characterId: 'kernius', pose: 'neutral', x: 78, height: 64, depth: 9, dim: 0.3, flip: true },
      ],
      effects: [{ kind: 'embers', intensity: 0.6 }],
      tint: 'rgba(200,30,30,0.10)',
      camera: { startScale: 1.05, endScale: 1, endY: -1, duration: 6 },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: liepsnos šūvis, pilama derva, skubūs žingsniai
      speakerId: 'dargis',
      text: {
        lt: 'Kerniau, stebėk Varngradą. Dvi atsakomosios ugnys — ir žinosim, kad mus pamatė.',
        en: 'Kernius, watch Varngrad. Two answering fires — and we know they saw us.',
      },
      voiceUrl: null,
    },
    // ═══ 07 KADRAS — Taisyklės nebeveikia (0:53–1:02; 3 beat'ai) ═══
    {
      id: 's07a',
      background: `${A}/bg-dumai.svg`,
      camera: { startScale: 1.04, endScale: 1, startY: 2, endY: -2, duration: 7 },
      transition: { type: 'fade', duration: 550 },
      ambientUrl: null, // PLACEHOLDER: visas aplinkos garsas prislopsta
      speakerName: { lt: 'Kernius', en: 'Kernius' },
      text: { lt: 'Dūmai sustojo.', en: 'The smoke has stopped.' },
      voiceUrl: null,
    },
    {
      id: 's07b',
      background: `${A}/bg-dumai.svg`,
      camera: { startScale: 1, endScale: 1.02, duration: 4 },
      transition: { type: 'cut' },
      speakerName: { lt: 'Tomas', en: 'Tomas' },
      text: { lt: 'Bet vėjas vis dar pučia į pietus.', en: 'But the wind still blows south.' },
      voiceUrl: null,
    },
    {
      id: 's07c', // Dargis pakelia ranką, pajunta vėją
      background: `${A}/bg-dumai.svg`,
      characters: [{ characterId: 'dargis', pose: 'profile', x: 24, height: 78, depth: 12, entrance: 'fade' }],
      camera: { startScale: 1.02, endScale: 1.05, duration: 4 },
      transition: { type: 'cut' },
      speakerId: 'dargis',
      text: { lt: 'Ragą.', en: 'The horn.' },
      voiceUrl: null,
      holdMs: 500,
    },
    // ═══ 08 KADRAS — Rimas neatsako (1:02–1:11) ═══
    {
      id: 's08',
      background: `${A}/bg-vidus.svg`,
      characters: [{ characterId: 'rimas', pose: 'klupo', x: 38, height: 72, depth: 11 }],
      effects: [{ kind: 'magic', intensity: 0.25, color: 'rgba(138,92,246,0.25)' }],
      camera: { startScale: 1.02, endScale: 1.07, endX: -1, duration: 6 },
      transition: { type: 'fade', duration: 420 },
      sfxUrl: null, // PLACEHOLDER: žema giesmė iš šiaurės, vibracija akmenyse
      speakerId: 'dargis',
      speakerName: { lt: 'Dargis', en: 'Dargis' },
      text: { lt: 'Rimai. Ragą.', en: 'Rimas. The horn.' },
      voiceUrl: null,
      holdMs: 600,
    },
    // ═══ 09 KADRAS — Svetimas balsas (1:11–1:22; 5 beat'ai) ═══
    {
      id: 's09a', // Rimas pakelia galvą — juoda akis
      background: `${A}/bg-vidus.svg`,
      characters: [{ characterId: 'rimas', pose: 'neutral', x: 50, height: 100, bottom: -4, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.04, endScale: 1.1, endY: -1, duration: 5, punchIn: true },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: silpnas dvigubas balso aidas
      speakerId: 'rimas',
      speakerName: { lt: 'Rimas / svetimas balsas', en: 'Rimas / a foreign voice' },
      text: { lt: 'Mažieji eina pirmi. Jie tikrina, ar mes ginsimės.', en: 'The little ones go first. They test whether we will fight back.' },
      voiceUrl: null,
    },
    {
      id: 's09b',
      background: `${A}/bg-vidus.svg`,
      characters: [
        { characterId: 'rimas', pose: 'neutral', x: 66, height: 92, bottom: -4, depth: 11 },
        { characterId: 'kernius', pose: 'neutral', x: 22, height: 80, depth: 12 },
      ],
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.05, endScale: 1.06, duration: 4 },
      transition: { type: 'cut' },
      speakerId: 'kernius',
      text: { lt: 'Kas eina?', en: 'Who goes?' },
      voiceUrl: null,
    },
    {
      id: 's09c', // Rimas žiūri į grindis po Kernium
      background: `${A}/bg-vidus.svg`,
      characters: [{ characterId: 'rimas', pose: 'neutral', x: 50, height: 100, bottom: -4, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.45, color: 'rgba(138,92,246,0.35)' }],
      camera: { startScale: 1.08, endScale: 1.1, duration: 3 },
      transition: { type: 'cut' },
      speakerId: 'rimas',
      speakerName: { lt: 'Rimas / svetimas balsas', en: 'Rimas / a foreign voice' },
      text: { lt: 'Tie, kurie jau čia.', en: 'The ones already here.' },
      voiceUrl: null,
      holdMs: 500,
    },
    {
      id: 's09d', // Dargio smūgis rankena
      background: `${A}/bg-vidus.svg`,
      characters: [
        { characterId: 'dargis', pose: 'kalavijas', x: 32, height: 92, depth: 14, entrance: 'slide-left' },
        { characterId: 'rimas', pose: 'neutral', x: 72, height: 76, bottom: -14, depth: 10, dim: 0.4 },
      ],
      camera: { startScale: 1.05, endScale: 1.06, duration: 3, shake: 'light' },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: rankenos smūgis į smilkinį
      speakerId: 'dargis',
      text: { lt: 'Nekalbėk su juo.', en: 'Do not talk to it.' },
      voiceUrl: null,
    },
    {
      id: 's09e', // krisdamas sušnabžda
      background: `${A}/bg-vidus.svg`,
      characters: [{ characterId: 'rimas', pose: 'klupo', x: 56, height: 58, bottom: -6, depth: 9, dim: 0.3 }],
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.28)' }],
      camera: { startScale: 1.06, endScale: 1.09, endY: 1.5, duration: 4 },
      transition: { type: 'cut' },
      speakerName: { lt: 'Rimas, krisdamas / svetimas balsas', en: 'Rimas, falling / a foreign voice' },
      text: { lt: 'Septyni viršuje. Vienas apačioje.', en: 'Seven above. One below.' },
      voiceUrl: null,
      holdMs: 800,
    },
    // ═══ 10 KADRAS — Pirmas smūgis (1:22–1:31) ═══
    {
      id: 's10',
      background: `${A}/bg-vidus.svg`,
      characters: [
        { characterId: 'tomas', pose: 'neutral', x: 30, height: 80, depth: 11 },
        { characterId: 'dargis', pose: 'kalavijas', x: 72, height: 86, depth: 12, flip: true, dim: 0.2 },
      ],
      effects: [{ kind: 'dust', intensity: 0.5 }],
      camera: { startScale: 1.03, endScale: 1.05, duration: 5, shake: 'light' },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: sunkus smūgis į ąžuolą → absoliuti tyla
      speakerId: 'tomas',
      text: { lt: 'Niekas nepriėjo prie bokšto.', en: 'No one approached the tower.' },
      voiceUrl: null,
      holdMs: 700,
    },
    // ═══ 11 KADRAS — Ragas (1:31–1:41; 2 beat'ai) ═══
    {
      id: 's11a',
      background: `${A}/bg-laukai.svg`,
      characters: [{ characterId: 'kernius', pose: 'ragas', x: 26, height: 88, depth: 13 }],
      effects: [{ kind: 'fog', intensity: 0.35 }],
      camera: { startScale: 1.01, endScale: 1.05, endX: 1.2, duration: 6 },
      transition: { type: 'fade', duration: 420 },
      sfxUrl: null, // PLACEHOLDER: ilgas žemas rago signalas per laukus... jokio atsako
      speakerId: 'kernius',
      text: { lt: 'Jie turėjo atsakyti.', en: 'They should have answered.' },
      voiceUrl: null,
      holdMs: 600,
    },
    {
      id: 's11b',
      background: `${A}/bg-laukai.svg`,
      characters: [
        { characterId: 'kernius', pose: 'ragas', x: 26, height: 88, depth: 13, dim: 0.2 },
        { characterId: 'dargis', pose: 'profile', x: 74, height: 84, depth: 12, flip: true },
      ],
      camera: { startScale: 1.05, endScale: 1.06, duration: 3 },
      transition: { type: 'cut' },
      speakerId: 'dargis',
      text: { lt: 'Dar kartą.', en: 'Again.' },
      voiceUrl: null,
    },
    // ═══ 12 KADRAS — Atsakymas iš apačios (1:41–1:50; be dialogo) ═══
    {
      id: 's12',
      background: `${A}/bg-durys.svg`,
      effects: [{ kind: 'dust', intensity: 0.6 }, { kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1, endScale: 1.06, duration: 6, shake: 'light' },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: antrą rago signalą nutraukia smūgis; lūžtantis medis; tylus juokas
      text: null,
      holdMs: 2000,
    },
    // ═══ 13 KADRAS — Dargio įsakymai (1:50–1:59) ═══
    {
      id: 's13',
      background: `${A}/bg-vidus.svg`,
      characters: [
        { characterId: 'dargis', pose: 'kalavijas', x: 22, height: 86, depth: 14 },
        { characterId: 'tomas', pose: 'lankas', x: 48, height: 78, depth: 11 },
        { characterId: 'kernius', pose: 'battle', x: 70, height: 76, depth: 9 },
        { characterId: 'sargybinis', pose: 'neutral', x: 88, height: 68, depth: 7, dim: 0.2 },
      ],
      camera: { startScale: 1.06, endScale: 1.02, duration: 5 },
      transition: { type: 'cut' },
      musicUrl: null, // PLACEHOLDER: pulsas pagreitėja (kovinė tema — tęsis misijoje)
      sfxUrl: null,   // PLACEHOLDER: strėlė ant templės, ieties galas, kalavijas
      speakerId: 'dargis',
      text: {
        lt: 'Tomai, lanką. Kerniau, neatsitrauk nuo ugnies. Kiti — su manim.',
        en: 'Tomas, the bow. Kernius, stay by the fire. The rest — with me.',
      },
      voiceUrl: null,
    },
    // ═══ 14 KADRAS — Perėjimas į kovą (1:59–2:08) ═══
    {
      id: 's14a', // durys skilinėja, juodi pirštai; Dargis užstoja kitus
      background: `${A}/bg-laiptai.svg`,
      characters: [
        { characterId: 'dargis', pose: 'nugara', x: 44, height: 96, bottom: -6, depth: 16 },
        { characterId: 'tomas', pose: 'lankas', x: 18, height: 62, depth: 8, dim: 0.3 },
        { characterId: 'kernius', pose: 'battle', x: 74, height: 60, depth: 7, dim: 0.3 },
      ],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.32)' }, { kind: 'dust', intensity: 0.4 }],
      camera: { startScale: 1, endScale: 1.07, duration: 5 },
      transition: { type: 'fade', duration: 400 },
      speakerId: 'dargis',
      text: { lt: 'Varngrado vyrai. Prie laiptų.', en: 'Men of Varngrad. To the stairs.' },
      voiceUrl: null,
      holdMs: 500,
    },
    {
      id: 's14b', // paskutinis smūgis — durys lūžta; kietas kirpimas į kovą
      background: `${A}/bg-laiptai.svg`,
      characters: [
        { characterId: 'dargis', pose: 'nugara', x: 44, height: 98, bottom: -8, depth: 16 },
      ],
      effects: [{ kind: 'magic', intensity: 0.55, color: 'rgba(138,92,246,0.4)' }, { kind: 'dust', intensity: 0.6 }],
      tint: 'rgba(138,92,246,0.08)',
      camera: { startScale: 1.07, endScale: 1.1, duration: 2, shake: 'heavy' },
      transition: { type: 'cut' },
      sfxUrl: null, // PLACEHOLDER: galutinis durų lūžis — ŽAIDIME pratęsti šį SFX pirmu kovos garsu
      text: null,
      holdMs: 900,
    },
  ],
}

// ════════════════════════════════════════════════════════════════════════════
// MISIJOS „RAUDONASIS SIGNALAS" scenario JSON (Node → Advanced JSON → scenario).
// „Septyni viršuje. Vienas apačioje." — septyni gynėjai, vienas jau bokšte:
// pirmoji banga ateina IŠ APAČIOS 1 ėjimą (tas „vienas apačioje"), toliau
// mažieji bangomis. Išlaikyk bokštą 5 ėjimus; signalinė ugnis = objektas.
// PAKEISK <demon-uuid-*> tikrais Demonų kortų id (admin → Kortos).
// ════════════════════════════════════════════════════════════════════════════
export const raudonasisSignalasScenario = {
  survivalTurns: 5,
  objectives: [
    { id: 'ugnis', kind: 'relic', label: 'Signalinė ugnis', hp: 15, maxHp: 15, side: 'player' },
  ],
  waves: [
    { id: 'vienas-apacioje', name: 'Vienas apačioje', triggerType: 'turn', turn: 1, spawnSide: 'gate', warningText: 'Vienas apačioje!', exactUnits: ['<demon-uuid-boss>'] },
    { id: 'mazieji1', name: 'Mažieji eina pirmi', triggerType: 'turn', turn: 2, spawnSide: 'top', warningText: 'Mažieji eina pirmi!', exactUnits: ['<demon-uuid-1>', '<demon-uuid-1>'] },
    { id: 'mazieji2', name: 'Antra banga', triggerType: 'turn', turn: 4, spawnSide: 'top', warningText: 'Jie tikrina, ar mes ginsimės!', exactUnits: ['<demon-uuid-1>', '<demon-uuid-2>'] },
  ],
  rules: [
    // pirmoji kovos replika — tęsia cutscene toną
    { trigger: 'onBattleStart', once: true, actions: [{ type: 'dialogue', text: 'Tomai, lanką! Kerniau — nuo ugnies nė žingsnio. Signalas privalo degti.', characterName: 'Dargis' }] },
    // demonai spaudžia signalinę ugnį kas ėjimą
    { trigger: 'onTurnEnd', everyTurns: 1, actions: [{ type: 'damageObjective', objectiveId: 'ugnis', amount: 2 }] },
    // desperacija žemame HP
    { trigger: 'onCondition', once: true, conditions: [{ lhs: 'playerHp', op: '<=', rhs: 10 }], actions: [{ type: 'dialogue', text: 'Laikykitės! Varngradas dar neatsakė — ugnis turi degti!', characterName: 'Dargis' }] },
  ],
}
