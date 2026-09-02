// ════════════════════════════════════════════════════════════════════════════
// M8 „Užvertas pietų kelias" — PRE „Kita sienos pusė" (~60 s) +
// POST „Miestas, kurio nebėra" (~80 s) + FAIL. Pagal MISIJA08 scenarijų.
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m08pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('s01', `${A}/bg-tiltas.svg`, { // kolona rūke
      transition: { type: 'cut' },
      effects: [{ kind: 'fog', intensity: 0.45 }],
      camera: { startScale: 1, endScale: 1.06, endX: -1, duration: 7 },
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 26, height: 86, depth: 12 },
        { characterId: 'kernius', pose: 'neutral', x: 74, height: 78, depth: 10, flip: true, dim: 0.15 },
      ],
      sfxUrl: null, // PLACEHOLDER: vežimų ratų girgždesys + prislopinti balsai
      text: null, holdMs: 1400,
    }),
    C('s02', `${A}/bg-uzkarda.svg`, { // balta siena
      effects: [{ kind: 'fog', intensity: 0.4 }],
      tint: 'rgba(220,215,200,0.06)',
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Varngrado sužeistieji. Atidarykit patikros vartus.', en: 'Wounded of Varngrad. Open the inspection gates.' },
    }),
    C('s03', `${A}/bg-uzkarda.svg`, { // ne į tą pusę
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'Jie saugo ne kelią į miestą.', en: 'It is not the road to the city they are guarding.' },
      holdMs: 400,
    }),
    S('s04a', `${A}/bg-uzkarda.svg`, { // atsakymas nuo sienos
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 74, bottom: 18, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Izoliuotos zonos gyventojai sienos neperžengs. Grąžinkit koloną.', en: 'Residents of the isolated zone will not cross the wall. Turn the column back.' },
    }),
    C('s04b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Už mūsų — Orda.', en: 'Behind us is the Horde.' },
    }),
    C('s04c', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 74, bottom: 18, depth: 9, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Todėl vartai ir uždaryti.', en: 'That is exactly why the gates are closed.' },
      holdMs: 500,
    }),
    S('s05', `${A}/bg-tiltas.svg`, { // pirmas smūgis
      effects: [{ kind: 'fog', intensity: 0.4 }, { kind: 'dust', intensity: 0.4 }],
      tint: 'rgba(200,30,30,0.07)',
      camera: { startScale: 1.02, endScale: 1.07, duration: 3, shake: 'light' },
      characters: [{ characterId: 'belzatoras', pose: 'demonas', x: 82, height: 34, bottom: 2, depth: 8, dim: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: demonų banga iš rūko
      text: null, holdMs: 1100,
    }),
    C('s06', `${A}/bg-uzkarda.svg`, { // prašymas
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 40, height: 92, depth: 12 }],
      tint: 'rgba(90,140,220,0.06)',
      speakerId: 'kapitonas',
      text: { lt: 'Jūs turit švarią šūvio liniją. Dengiam civilius — šaudykit virš mūsų.', en: 'You have a clean firing line. We cover the civilians — shoot over us.' },
    }),
    C('s07', `${A}/bg-uzkarda.svg`, { // įspėjimas
      sfxUrl: null, // PLACEHOLDER: Inkvizicijos perspėjimo ragas
      tint: 'rgba(220,215,200,0.08)',
      speakerName: { lt: 'Inkvizicijos sargybos balsas', en: 'Inquisition sentry voice' },
      text: { lt: 'Nepriartėkit prie užkardos. Kitas žingsnis bus laikomas pažeidimu.', en: 'Do not approach the barricade. The next step will be treated as a violation.' },
      holdMs: 400,
    }),
    C('s08a', `${A}/bg-tiltas.svg`, { // Prazaro sprendimas
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 34, height: 92, depth: 12 }],
      effects: [{ kind: 'fog', intensity: 0.3 }],
      speakerId: 'prazaras', text: { lt: 'Vežimus ratu. Sužeistuosius į vidurį.', en: 'Wagons in a circle. Wounded to the middle.' },
    }),
    C('s08b', `${A}/bg-tiltas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'isako', x: 34, height: 92, depth: 12, dim: 0.2 },
        { characterId: 'kapitonas', pose: 'neutral', x: 70, height: 84, depth: 10, flip: true },
      ],
      speakerId: 'kapitonas', text: { lt: 'O vartai?', en: 'And the gates?' },
    }),
    C('s08c', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 40, height: 94, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jie jau atsakė. Dabar atsakom tiems, kurie puola.', en: 'They have already answered. Now we answer those who attack.' },
      holdMs: 400,
    }),
    S('s09', `${A}/bg-uzkarda.svg`, { // tarp dviejų sienų
      effects: [{ kind: 'fog', intensity: 0.4 }],
      tint: 'rgba(200,30,30,0.05)',
      camera: { startScale: 1.05, endScale: 1.1, duration: 4 },
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 30, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Varngradas, prie vežimų.', en: 'Varngrad, to the wagons.' },
      holdMs: 600,
    }),
  ],
}

export const m08post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('p01', `${A}/bg-uzkarda.svg`, { // po kovos
      transition: { type: 'cut' },
      effects: [{ kind: 'smoke', intensity: 0.3 }],
      tint: 'rgba(200,30,30,0.04)',
      camera: { startScale: 1, endScale: 1.05, duration: 7 },
      text: null, holdMs: 1400,
    }),
    C('p02', `${A}/bg-uzkarda.svg`, { // antras prašymas
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 40, height: 88, depth: 12 }],
      speakerId: 'gydytoja', text: { lt: 'Turim sužeistų vaikų. Patikrinkit juos po vieną.', en: 'We have wounded children. Inspect them one by one.' },
      holdMs: 700,
    }),
    C('p03', `${A}/bg-uzkarda.svg`, { // įsakymas
      characters: [{ characterId: 'inkvizitorius', pose: 'antspaudas', x: 60, height: 78, bottom: 14, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Varngradas laikomas prarastu. Iš izoliuotos zonos nepriimamas nė vienas žmogus ir joks krovinys.', en: 'Varngrad is deemed lost. No person and no cargo is accepted out of the isolated zone.' },
    }),
    C('p04a', `${A}/bg-uzkarda.svg`, { // žodis
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Prarastu kam? Mes vis dar stovim.', en: 'Lost to whom? We are still standing.' },
    }),
    C('p04b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 78, bottom: 14, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Likęs Ravenoras negali rizikuoti dėl vieno miesto. Tai būtinoji kaina.', en: 'The rest of Ravenor cannot risk itself for one city. It is the necessary price.' },
      holdMs: 400,
    }),
    C('p05a', `${A}/bg-uzkarda.svg`, { // kieno kaina
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Kaina turi žmogų, kuris ją sumoka. Šitame įsakyme jo vardo nėra.', en: 'A price has a person who pays it. His name is not in this order.' },
    }),
    C('p05b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 56, height: 90, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'Yra. Varngradas.', en: 'It is. Varngrad.' },
      holdMs: 600,
    }),
    S('p06', `${A}/bg-uzkarda.svg`, { // valymas — deganti riba
      effects: [{ kind: 'embers', intensity: 0.5 }],
      tint: 'rgba(240,120,40,0.09)',
      sfxUrl: null, // PLACEHOLDER: uždegama patikros riba
      speakerId: 'inkvizitorius', text: { lt: 'Iki sutemų pasitraukit už išorinės žymos.', en: 'Withdraw beyond the outer mark by nightfall.' },
    }),
    C('p07', `${A}/bg-krovinio-kiemas.svg`, { // atsargų vežimai pro plyšį
      characters: [{ characterId: 'kernius', pose: 'akis', x: 26, height: 88, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.28)' }],
      speakerId: 'kernius', text: { lt: 'Maršale. Už jų sienos — mūsų ženklas.', en: 'Marshal. Behind their wall — our mark.' },
    }),
    C('p08', `${A}/bg-krovinio-kiemas.svg`, { // kas juose
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 62, height: 90, depth: 12, flip: true }],
      speakerId: 'kapitonas',
      text: { lt: 'Grūdai, tvarsčiai ir aliejus. Siunta, kuri turėjo pasiekti miestą prieš tris dienas.', en: 'Grain, bandages and oil. The shipment that should have reached the city three days ago.' },
    }),
    C('p09', `${A}/bg-krovinio-kiemas.svg`, { // ne sulaikyta
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jie ne tik uždarė kelią. Jie sulaikė mūsų atsargas.', en: 'They did not just close the road. They seized our supplies.' },
      holdMs: 500,
    }),
    C('p10a', `${A}/bg-tiltas.svg`, { // grįžimas
      effects: [{ kind: 'fog', intensity: 0.35 }],
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 64, height: 86, depth: 11, flip: true }],
      sfxUrl: null, // PLACEHOLDER: lėtas kolonos grįžimo ritmas
      speakerId: 'kapitonas', text: { lt: 'Mieste maisto liko dviem dienom.', en: 'The city has food for two days.' },
    }),
    C('p10b', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada rytoj parsivešim tai, kas jau mūsų.', en: 'Then tomorrow we bring back what is already ours.' },
      holdMs: 500,
    }),
    S('p11', `${A}/bg-siena-horizontas.svg`, { // baltas ir juodas žiedai
      transition: { type: 'wipe-diagonal', duration: 500 },
      effects: [{ kind: 'smoke', intensity: 0.35 }, { kind: 'embers', intensity: 0.3 }],
      tint: 'rgba(200,30,30,0.06)',
      camera: { startScale: 1.06, endScale: 1, duration: 7 },
      text: null, holdMs: 1600,
    }),
  ],
}

export const m08fail = [
  { characterName: 'Prazaras', text: 'Sutraukit likusius vežimus. Nė vieno žmogaus nepaliekam prie jų sienos.' },
  { characterName: 'Ordino kapitonas', text: 'Ratas mažesnis. Linija tvirtesnė. Dar kartą.' },
]
