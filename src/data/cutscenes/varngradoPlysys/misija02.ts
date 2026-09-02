// ════════════════════════════════════════════════════════════════════════════
// M2 „Paskutinis pranešėjas" — V3
// PRE „Balsas kelyje" (14 beat'ų → 19 shots, ~2:20) +
// POST „Kam atidaryti vartus" (13 beat'ų → 18 shots) + FAIL.
// LOCK: PRE baigiasi demonui išplėšus žinios vamzdelį — pirmas tikslas
// „Per 2 ėjimus susigrąžink Dargio žinią".
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, A1, CAST, S, C } from './cast'

export const m02pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // ── A. Po bokštu ──
    // 01 — Kritimas
    S('s01a', `${A1}/bg-slaitas.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'rain', intensity: 0.4 }, { kind: 'fog', intensity: 0.3 }],
      tint: 'rgba(240,80,40,0.06)',
      camera: { startScale: 1.04, endScale: 1, startY: -1, endY: 0, duration: 5 },
      characters: [{ characterId: 'kernius', pose: 'begantis', x: 42, height: 74, bottom: -8, depth: 11, entrance: 'slide-up' }],
      sfxUrl: null, // PLACEHOLDER: kritimas šlaitu; trys Tomo lanko šūviai; po trečio — tyla
      text: null, holdMs: 2500,
    }),
    // 02 — Pirmas pasirinkimas (Dargio prisiminimas)
    C('s02a', `${A1}/bg-slaitas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 36, height: 88, depth: 12 }],
      effects: [{ kind: 'rain', intensity: 0.35 }],
      speakerName: { lt: 'Dargio prisiminimas', en: 'Dargis, remembered' },
      text: { lt: 'Bokštas jau prarastas. Žinia — dar ne.', en: 'The tower is already lost. The message is not.' },
      holdMs: 1000,
    }),
    C('s02b', `${A1}/bg-slaitas.svg`, { // nusisuka ir bėga — be žodžių
      characters: [{ characterId: 'kernius', pose: 'begantis', x: 52, height: 86, depth: 12 }],
      effects: [{ kind: 'rain', intensity: 0.35 }, { kind: 'fog', intensity: 0.3 }],
      camera: { startScale: 1.04, endScale: 1.08, endX: 1, duration: 4 },
      text: null, holdMs: 900,
    }),
    // ── B. Balsas žino jo vardą ──
    // 03 — Senas kelias (maži įspaudai priešinga kryptimi)
    S('s03', `${A}/bg-kelias-bokstas.svg`, {
      effects: [{ kind: 'rain', intensity: 0.35 }, { kind: 'fog', intensity: 0.4 }],
      camera: { startScale: 1, endScale: 1.06, startY: 1, endY: 0, duration: 6 },
      text: null, holdMs: 1400,
    }),
    // 04 — Sesers balsas
    C('s04a', `${A}/bg-kelias-bokstas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'begantis', x: 40, height: 88, depth: 12 }],
      speakerName: { lt: 'Sesers balsas', en: 'His sister’s voice' },
      text: { lt: 'Kerniau. Tu pavargai. Grįžk namo.', en: 'Kernius. You are tired. Come home.' },
    }),
    C('s04b', `${A}/bg-kelias-bokstas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 40, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Mano namai — priešais.', en: 'My home is ahead.' },
      holdMs: 500,
    }),
    // 05 — Balsas taisosi
    C('s05a', `${A}/bg-kelias-bokstas.svg`, {
      tint: 'rgba(138,92,246,0.05)',
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 46, height: 90, depth: 12 }],
      speakerName: { lt: 'Sesers balsas', en: 'His sister’s voice' },
      text: { lt: 'Tada palik žinią. Aš nunešiu.', en: 'Then leave the message. I will carry it.' },
    }),
    C('s05b', `${A}/bg-kelias-bokstas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 46, height: 92, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Tu nežinai, kam ji skirta.', en: 'You do not know who it is for.' },
      holdMs: 800, // balsas nutyla — rado melo ribą
    }),
    // ── C. Belzatoro žvilgsnis ──
    // 06 — Plyšio šešėlis (1,5 s hold be teksto)
    S('s06', `${A}/bg-plysys-belzatoras.svg`, {
      transition: { type: 'wipe-diagonal', duration: 460 },
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'fog', intensity: 0.35 }, { kind: 'magic', intensity: 0.3, color: 'rgba(200,30,30,0.3)' }],
      camera: { startScale: 1, endScale: 1.07, duration: 5, punchIn: true },
      text: null, holdMs: 1500,
    }),
    // 07 — Juoda akis (dvigubas vaizdas)
    C('s07a', `${A}/bg-kelias-bokstas.svg`, {
      tint: 'rgba(138,92,246,0.09)',
      effects: [{ kind: 'magic', intensity: 0.45, color: 'rgba(138,92,246,0.4)' }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 50, height: 92, depth: 12 }],
      camera: { startScale: 1.04, endScale: 1.1, duration: 3, punchIn: true },
      speakerId: 'belzatoras', speakerName: { lt: 'Belzatoro balsas — Kerniaus balsu', en: 'Belzataras’ voice — in Kernius’ own' },
      text: { lt: 'Dargio žinia nepasieks vartų.', en: 'Dargis’ message will not reach the gates.' },
    }),
    C('s07b', `${A}/bg-kelias-bokstas.svg`, { // parkrinta — be žodžių
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 72, bottom: -10, depth: 11 }],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.35)' }, { kind: 'rain', intensity: 0.3 }],
      camera: { startScale: 1.05, endScale: 1.08, duration: 2, shake: 'light' },
      text: null, holdMs: 900,
    }),
    // 08 — Skausmas grąžina
    C('s08', `${A}/bg-kelias-bokstas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 88, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Vadinasi, žinia tau svarbi.', en: 'So the message matters to you.' },
      holdMs: 700, // faktas sau, ne herojiškas atsikirtimas
    }),
    // ── D. Kelias uždaromas ──
    // 09 — Tiltelis
    S('s09', `${A}/bg-tiltelis.svg`, {
      effects: [{ kind: 'fog', intensity: 0.35 }],
      camera: { startScale: 1, endScale: 1.06, endX: 1, duration: 6 },
      text: null, holdMs: 1300,
    }),
    // 10 — Pirmi kūnai
    C('s10a', `${A}/bg-tiltelis.svg`, {
      characters: [{ characterId: 'sargybinis', pose: 'neutral', x: 38, height: 58, bottom: -14, depth: 10, dim: 0.25 }],
      speakerName: { lt: 'Sužeistas sargybinis', en: 'Wounded watchman' },
      text: { lt: 'Ne per tiltą. Po juo.', en: 'Not over the bridge. Under it.' },
      holdMs: 800, // jo ranka nukrinta
    }),
    // 11 — Apsuptas kelias (naujo priešo reveal ≥1,2 s be teksto)
    S('s11', `${A}/bg-tiltelis.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(200,30,30,0.08)',
      effects: [{ kind: 'fog', intensity: 0.35 }, { kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.3)' }],
      characters: [
        { characterId: 'belzatoras', pose: 'demonas', x: 60, height: 44, bottom: 12, depth: 9, entrance: 'slide-up' },
        { characterId: 'kernius', pose: 'battle', x: 24, height: 84, depth: 12 },
      ],
      camera: { startScale: 1.02, endScale: 1.08, duration: 3 },
      text: null, holdMs: 1200,
    }),
    // ── E. Fizinis lūžis ──
    // 12 — Pirmas susidūrimas (be žodžių, smūgis + parbloškimas)
    C('s12', `${A}/bg-tiltelis.svg`, {
      effects: [{ kind: 'dust', intensity: 0.45 }],
      camera: { startScale: 1.05, endScale: 1.1, duration: 2, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: ieties smūgis; keturkojis parbloškia Kernių
      characters: [{ characterId: 'kernius', pose: 'battle', x: 40, height: 78, bottom: -8, depth: 11 }],
      text: null, holdMs: 1000,
    }),
    // 13 — Žinia išplėšiama
    C('s13a', `${A}/bg-tiltelis.svg`, {
      effects: [{ kind: 'dust', intensity: 0.35 }],
      characters: [
        { characterId: 'kernius', pose: 'battle', x: 26, height: 74, bottom: -10, depth: 11, dim: 0.15 },
        { characterId: 'belzatoras', pose: 'demonas', x: 64, height: 38, bottom: 4, depth: 9 },
      ],
      sfxUrl: null, // PLACEHOLDER: perrėžtas diržas, vamzdelis nurieda akmenimis
      text: null, holdMs: 1100,
    }),
    C('s13b', `${A}/bg-tiltelis.svg`, {
      tint: 'rgba(200,30,30,0.08)',
      speakerId: 'belzatoras', speakerName: { lt: 'Belzatoro balsas', en: 'Belzataras’ voice' },
      text: { lt: 'Dabar gali grįžti į bokštą.', en: 'Now you may go back to your tower.' },
      holdMs: 500,
    }),
    // 14 — Kernius keliasi → kova
    C('s14', `${A}/bg-tiltelis.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'battle', x: 30, height: 90, depth: 12 },
        { characterId: 'belzatoras', pose: 'demonas', x: 70, height: 36, bottom: 2, depth: 9, dim: 0.1 },
      ],
      camera: { startScale: 1.04, endScale: 1.09, duration: 3, punchIn: true },
      speakerId: 'kernius', text: { lt: 'Pirmiausia — žinia.', en: 'The message first.' },
      holdMs: 700, // kovos UI atsiranda ant tos pačios kompozicijos
    }),
  ],
}

export const m02post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // 01 — Dvidešimt žingsnių
    S('p01', `${A}/bg-vartai-isore.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'fog', intensity: 0.35 }, { kind: 'rain', intensity: 0.25 }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 42, height: 66, bottom: -12, depth: 11 }],
      text: null, holdMs: 1500,
    }),
    // 02 — Protokolas
    C('p02a', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 64, height: 76, bottom: 12, depth: 10, flip: true }],
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Nakties protokolas. Durų neatidarom, kol nepatikrintas.', en: 'Night protocol. The door stays shut until he is checked.' },
    }),
    C('p02b', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 88, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Patikrinsim viduje. Atidarykit mažąsias duris.', en: 'We check him inside. Open the small door.' },
    }),
    // 03 — Kapitono prieštaravimas
    C('p03a', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 62, height: 84, depth: 11, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Jei jis pažymėtas, įleisime žymę kartu.', en: 'If he is marked, we let the mark in with him.' },
    }),
    C('p03b', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 90, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Jei paliksim, prarasim ir žmogų, ir tai, ką jis atnešė.', en: 'If we leave him, we lose the man and what he carried.' },
      holdMs: 500,
    }),
    // 04 — Durys (be žodžių; nagai į geležį)
    S('p04', `${A}/bg-vartu-kiemas.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: durys prasiveria, užsidaro; nagai į išorinę geležį
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 40, height: 70, bottom: -8, depth: 11 },
        { characterId: 'sargybinis', pose: 'neutral', x: 70, height: 82, depth: 10, flip: true, dim: 0.2 },
      ],
      text: null, holdMs: 1300,
    }),
    // 05 — Gydytoja
    C('p05a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 64, height: 82, depth: 11, flip: true },
        { characterId: 'kernius', pose: 'akis', x: 34, height: 76, bottom: -6, depth: 11 },
      ],
      speakerId: 'gydytoja', text: { lt: 'Jį reikia surišti ir išnešti nuo vartų.', en: 'He needs to be bound and carried away from the gates.' },
    }),
    C('p05b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 34, height: 80, depth: 11 },
        { characterId: 'prazaras', pose: 'neutral', x: 70, height: 88, depth: 12, flip: true, dim: 0.15 },
      ],
      speakerId: 'kernius', text: { lt: 'Pirmiausia perskaityk.', en: 'Read it first.' },
      holdMs: 400,
    }),
    // 06 — Dargio žinia
    S('p06', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 44, height: 92, depth: 12 }],
      tint: 'rgba(240,220,180,0.05)',
      camera: { startScale: 1.03, endScale: 1.08, duration: 5, punchIn: true },
      speakerName: { lt: 'Dargio žinia', en: 'Dargis’ message' },
      text: { lt: 'Jei ši žinia pasiekė vartus, jūs jau esate pirmoji linija.', en: 'If this message has reached the gates, you are already the first line.' },
      holdMs: 1000,
    }),
    // 07 — Orda
    C('p07a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 40, height: 88, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Ne kariuomenė. Orda. Ir ji kalba mūsų balsais.', en: 'Not an army. A horde. And it speaks in our voices.' },
    }),
    C('p07b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'neutral', x: 32, height: 86, depth: 11, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 68, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Kieno balsu kalbėjo tau?', en: 'Whose voice did it use on you?' },
      holdMs: 900, // Kernius neatsako — pirmas jų tylos beat'as
    }),
    // 08 — Juodoji akis
    C('p08a', `${A}/bg-vartu-kiemas.svg`, {
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 48, height: 92, depth: 12 }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 4, punchIn: true },
      speakerId: 'kernius', text: { lt: 'Belzatoras mane matė.', en: 'Belzataras has seen me.' },
    }),
    C('p08b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Tada nuo šiol sakysi, ką matai tu. Ne ką sako jis.', en: 'Then from now on you tell us what you see. Not what he says.' },
      holdMs: 1000,
    }),
    // 09 — Gydytojos sąlyga
    C('p09a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 56, height: 86, depth: 12, flip: true }],
      speakerId: 'gydytoja', text: { lt: 'Jis lieka mano priežiūroje.', en: 'He stays in my care.' },
    }),
    C('p09b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Ir mano apklausoje. Nuo žmonių atskirkit. Nuo manęs — ne.', en: 'And in my questioning. Keep him from the crowd. Not from me.' },
      holdMs: 500,
    }),
    // 10 — Miestas keliamas
    S('p10', `${A}/bg-miesto-gatve.svg`, {
      effects: [{ kind: 'embers', intensity: 0.3 }],
      camera: { startScale: 1, endScale: 1.06, endX: -1, duration: 6 },
      sfxUrl: null, // PLACEHOLDER: ginklinės, žaizdrai, tvarsčiai — miestas keliasi
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 30, height: 88, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Pakelkite miestą. Raitelį Ordinui. Raitelį Inkvizicijai.', en: 'Raise the city. A rider to the Order. A rider to the Inquisition.' },
    }),
    // 11 — Žmonės kelyje
    S('p11', `${A}/bg-vartai-isore.svg`, {
      effects: [{ kind: 'fog', intensity: 0.35 }],
      tint: 'rgba(240,180,41,0.05)',
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 62, height: 84, depth: 11, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Pabėgėliai. Už jų irgi juda kažkas.', en: 'Refugees. Something moves behind them too.' },
    }),
    // 12 — Iki trečio varpo
    C('p12a', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 62, height: 86, depth: 11, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Užveriam dabar ir išlaikom sieną.', en: 'We close now and hold the wall.' },
    }),
    C('p12b', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Po trečio varpo. Iki jo įleidžiam savus.', en: 'After the third bell. Until then, our own come in.' },
      holdMs: 1000,
    }),
    // 13 — Pirmas varpas (mergaitė su varnu pirmą kartą)
    S('p13', `${A}/bg-vartai-isore.svg`, {
      effects: [{ kind: 'fog', intensity: 0.3 }],
      characters: [{ characterId: 'mergaite', pose: 'neutral', x: 74, height: 46, bottom: -4, depth: 9, entrance: 'fade' }],
      sfxUrl: null, // PLACEHOLDER: pirmas varpo dūžis
      text: null, holdMs: 1500,
    }),
  ],
}

export const m02fail = [
  { characterName: 'Kernius', text: 'Jis dar čia. Pirmiausia vamzdelis, tada kelias.' },
]
