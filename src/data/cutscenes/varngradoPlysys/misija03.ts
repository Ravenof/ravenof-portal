// ════════════════════════════════════════════════════════════════════════════
// M3 „Vartai prieš aušrą" — V3
// PRE „Iki trečio varpo" (16 beat'ų → 22 shots, ~2:35) +
// POST „Tie, kuriuos įleidome" (11 beat'ų → 14 shots) + FAIL.
// LOCK: PRE baigiasi demonui užšokus ant vežimo ir grandinei užstrigus —
// pirmas tikslas „Nuimk demoną nuo vežimo ir sunaikink grandinės kablį".
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m03pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // ── A. Vartai dar atviri ──
    // 01 — Raudona aušra (establishing)
    S('s01', `${A}/bg-vartai-isore.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(200,30,30,0.09)',
      effects: [{ kind: 'fog', intensity: 0.4 }],
      camera: { startScale: 1, endScale: 1.06, endX: -1, duration: 8 },
      sfxUrl: null, // PLACEHOLDER: grandinės kelia mažąsias groteles
      text: null, holdMs: 2500,
    }),
    // 02 — Mechanizmo kaina
    C('s02a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 36, height: 88, depth: 12 },
        { characterId: 'prazaras', pose: 'neutral', x: 70, height: 88, depth: 12, flip: true, dim: 0.15 },
      ],
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Atidaryti galim dar kartą. Jei grandinė užstrigs, vartai liks ten, kur bus.', en: 'We can open once more. If the chain jams, the gates stay wherever they are.' },
    }),
    C('s02b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 36, height: 88, depth: 12, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 70, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Tada neužstrigs.', en: 'Then it will not jam.' },
    }),
    C('s02c', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 44, height: 90, depth: 12 }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Tai ne įsakymas metalui.', en: 'That is not an order metal obeys.' },
      holdMs: 600, // Prazaras priima pastabą
    }),
    // 03 — Pirma grupė
    S('s03', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'isako', x: 30, height: 88, depth: 12 },
        { characterId: 'gydytoja', pose: 'neutral', x: 66, height: 80, depth: 10, flip: true },
      ],
      effects: [{ kind: 'dust', intensity: 0.2 }],
      speakerId: 'prazaras',
      text: { lt: 'Patikra einant. Kas paeina — į vidinę aikštę. Kas ne — pas gydytoją.', en: 'Check them as they walk. Whoever can walk — inner square. Whoever cannot — to the healer.' },
    }),
    // ── B. Žmonės ir grėsmė artėja kartu ──
    // 04 — Atstumai
    C('s04', `${A}/bg-vartai-isore.svg`, {
      effects: [{ kind: 'fog', intensity: 0.4 }],
      tint: 'rgba(200,30,30,0.07)',
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 32, height: 88, depth: 12 }],
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Pirmi viduje. Antra grupė už dviejų šimtų žingsnių. Vežimas — dar toliau.', en: 'First group inside. Second, two hundred paces out. The wagon — farther still.' },
      holdMs: 500, // už vežimo rūke — žemi juodi siluetai
    }),
    // 05 — Kernius pabunda
    S('s05a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 38, height: 74, bottom: -8, depth: 11 },
        { characterId: 'gydytoja', pose: 'neutral', x: 70, height: 80, depth: 10, flip: true },
      ],
      effects: [{ kind: 'magic', intensity: 0.2, color: 'rgba(138,92,246,0.2)' }],
      speakerId: 'kernius', text: { lt: 'Jie šaukia vartų sargybinių vardais.', en: 'They are calling out the gate guards’ names.' },
    }),
    C('s05b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 38, height: 74, bottom: -8, depth: 11, dim: 0.2 },
        { characterId: 'gydytoja', pose: 'neutral', x: 70, height: 80, depth: 10, flip: true },
      ],
      speakerId: 'gydytoja', text: { lt: 'Tu neturėtum stovėti.', en: 'You should not be on your feet.' },
    }),
    C('s05c', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 86, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'O jūs neturėtumėt atsakyti.', en: 'And you should not answer them.' },
      holdMs: 500,
    }),
    // 06 — Pirmas varpas
    S('s06', `${A}/bg-vartai-isore.svg`, {
      effects: [{ kind: 'fog', intensity: 0.35 }],
      sfxUrl: null, // PLACEHOLDER: pirmas varpas; minia bėga greičiau
      text: null, holdMs: 1400,
    }),
    // 07 — Kapitono sprendimas (žiūronas, vežime — mergaitė)
    C('s07a', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 60, height: 86, depth: 12, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Uždarom po antros grupės. Vežimas nespės.', en: 'We close after the second group. The wagon will not make it.' },
    }),
    C('s07b', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Kas jame?', en: 'Who is in it?' },
    }),
    C('s07c', `${A}/bg-vartai-isore.svg`, { // žiūrone: sužeistieji, vaikai, mergaitė su varnu
      characters: [{ characterId: 'mergaite', pose: 'neutral', x: 52, height: 56, bottom: 0, depth: 10, entrance: 'fade' }],
      tint: 'rgba(240,220,180,0.05)',
      camera: { startScale: 1.06, endScale: 1.12, duration: 4, punchIn: true },
      speakerId: 'vartu-kapitonas', text: { lt: 'Ne kariai.', en: 'Not soldiers.' },
    }),
    C('s07d', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Todėl patys vartų neatsikovos.', en: 'Which is why they cannot fight their way in themselves.' },
      holdMs: 1000,
    }),
    // ── C. Sąmoninga rizika ──
    // 08 — Antras varpas (kapitonas pastato sargybinius prie mechanizmo)
    S('s08', `${A}/bg-vartu-kiemas.svg`, {
      effects: [{ kind: 'dust', intensity: 0.2 }],
      sfxUrl: null, // PLACEHOLDER: antras varpas
      characters: [
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 40, height: 86, depth: 12 },
        { characterId: 'sargybinis', pose: 'neutral', x: 70, height: 80, depth: 10, flip: true },
      ],
      text: null, holdMs: 1300, // pirmas kartas, kai jis padeda rizikai pavykti
    }),
    // 09 — Balsų spąstai
    C('s09a', `${A}/bg-vartu-kiemas.svg`, {
      tint: 'rgba(138,92,246,0.05)',
      speakerName: { lt: 'Mirusio sargybinio balsas', en: 'A dead guard’s voice' },
      text: { lt: 'Atidarykit šonines duris. Mes grįžtam.', en: 'Open the side door. We are coming back.' },
    }),
    C('s09b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'sargybinis', pose: 'neutral', x: 32, height: 82, depth: 11, dim: 0.15 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 86, depth: 12, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'Neatsakyk. Jis nežino, kurias duris naudojot.', en: 'Do not answer. It does not know which door you used.' },
      holdMs: 600, // sargybinis atitraukia ranką
    }),
    // 10 — Prazaras patiki konkrečiu faktu
    C('s10a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 68, height: 84, depth: 11, flip: true, dim: 0.15 },
      ],
      speakerId: 'prazaras', text: { lt: 'Gali atskirti balsą?', en: 'Can you tell the voices apart?' },
    }),
    C('s10b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 88, depth: 12, dim: 0.2 },
        { characterId: 'kernius', pose: 'akis', x: 68, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'kernius',
      text: { lt: 'Ne visada. Bet jis žino tik tai, ką girdėjau aš arba jo pažymėti žmonės.', en: 'Not always. But it only knows what I have heard, or what its marked ones have.' },
    }),
    C('s10c', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada sakyk tik tai, kuo esi tikras.', en: 'Then say only what you are sure of.' },
      holdMs: 800,
    }),
    // ── D. Paskutinis vežimas ──
    // 11 — Rūkas praplyšta (banga už vežimo)
    S('s11', `${A}/bg-vartai-isore.svg`, {
      tint: 'rgba(200,30,30,0.09)',
      effects: [{ kind: 'fog', intensity: 0.45 }],
      camera: { startScale: 1.02, endScale: 1.08, duration: 4 },
      characters: [{ characterId: 'belzatoras', pose: 'demonas', x: 82, height: 30, bottom: 6, depth: 8, dim: 0.3 }],
      text: null, holdMs: 1400,
    }),
    // 12 — Trečias varpas prasideda
    C('s12a', `${A}/bg-vartai-isore.svg`, {
      sfxUrl: null, // PLACEHOLDER: pirmas trečio varpo dūžis
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 60, height: 86, depth: 12, flip: true }],
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Jei lauksim dar, vartai neužsidarys prieš bangą.', en: 'If we wait longer, the gates will not close before the wave.' },
    }),
    C('s12b', `${A}/bg-vartai-isore.svg`, { // mergaitė uždengia sužeistąjį apsiaustu
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Laukiam vežimo.', en: 'We wait for the wagon.' },
      holdMs: 1000,
    }),
    // ── E. Mūšis prasideda ──
    // 13 — Demonas ant vežimo (be žodžių)
    S('s13', `${A}/bg-vartai-isore.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'dust', intensity: 0.45 }],
      camera: { startScale: 1.04, endScale: 1.1, duration: 2, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: demonas užšoka ant vežimo; vadeliotojas numetamas
      characters: [{ characterId: 'belzatoras', pose: 'demonas', x: 58, height: 40, bottom: 8, depth: 9, entrance: 'slide-up' }],
      text: null, holdMs: 1200,
    }),
    // 14 — Grandinė užstringa
    C('s14', `${A}/bg-vartu-kiemas.svg`, {
      effects: [{ kind: 'dust', intensity: 0.4 }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 2, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: kaulinis kablys į grandinę; krumpliaratis sustoja
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 42, height: 88, depth: 12 }],
      text: null, holdMs: 1100,
    }),
    // 15 — Du pirmi tikslai
    C('s15', `${A}/bg-vartai-isore.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 36, height: 92, depth: 12 }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 3, punchIn: true },
      speakerId: 'prazaras',
      text: { lt: 'Vienas būrys prie vežimo. Kitas — prie grandinės. Vartų nenuleidžiam, kol žmonės ne viduje.', en: 'One squad to the wagon. One to the chain. The gates stay up until the people are inside.' },
      holdMs: 700,
    }),
    // 16 — Smūgis (nagai virš mergaitės + skeveldra) → kova
    C('s16', `${A}/bg-vartai-isore.svg`, {
      tint: 'rgba(200,30,30,0.12)',
      effects: [{ kind: 'dust', intensity: 0.5 }],
      camera: { startScale: 1.05, endScale: 1.12, duration: 2, shake: 'heavy' },
      characters: [
        { characterId: 'belzatoras', pose: 'demonas', x: 56, height: 42, bottom: 8, depth: 9 },
        { characterId: 'mergaite', pose: 'neutral', x: 44, height: 34, bottom: -4, depth: 8, dim: 0.1 },
      ],
      sfxUrl: null, // PLACEHOLDER: kablys trūkteli grandinę, nulūžta skeveldra
      text: null, holdMs: 1000, // UI atsiranda dar prieš nagams nusileidžiant
    }),
  ],
}

export const m03post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // 01 — Grotos krinta
    S('p01', `${A}/bg-vartu-kiemas.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.4 }],
      camera: { startScale: 1.03, endScale: 1.06, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: geležis trenkiasi į akmenį; nagai lieka kitoje pusėje
      text: null, holdMs: 1500,
    }),
    // 02 — Kapitono rankos
    C('p02a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 44, height: 90, depth: 12 }],
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Dar viena tokia naktis, ir mechanizmo nebeturėsim.', en: 'One more night like this and we will have no mechanism left.' },
    }),
    C('p02b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 32, height: 86, depth: 11, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 68, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Bet šituos žmones turim.', en: 'But we have these people.' },
      holdMs: 500,
    }),
    // 03 — Mergaitė (be dialogo: varno sparnas)
    S('p03', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 34, height: 84, depth: 11 },
        { characterId: 'mergaite', pose: 'neutral', x: 56, height: 52, bottom: -6, depth: 10 },
        { characterId: 'prazaras', pose: 'neutral', x: 80, height: 86, depth: 12, flip: true, dim: 0.15 },
      ],
      tint: 'rgba(240,220,180,0.05)',
      text: null, holdMs: 1600,
    }),
    // 04 — Kerniaus patikra
    C('p04a', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 40, height: 86, depth: 12 },
        { characterId: 'gydytoja', pose: 'neutral', x: 72, height: 80, depth: 10, flip: true },
      ],
      speakerId: 'gydytoja', text: { lt: 'Tu pats sustojai.', en: 'You stopped yourself.' },
    }),
    C('p04b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 88, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Dar galiu.', en: 'I still can.' },
      holdMs: 600, // pirmas mažas gydytojos požiūrio pasikeitimas
    }),
    // 05 — Kaina mieste (be žodžių)
    S('p05', `${A}/bg-miesto-gatve.svg`, {
      effects: [{ kind: 'fog', intensity: 0.25 }],
      camera: { startScale: 1, endScale: 1.05, endX: 1, duration: 6 },
      text: null, holdMs: 1400,
    }),
    // 06 — Pirmas atsakymas (mėlyna ugnis)
    S('p06', `${A}/bg-siena-horizontas.svg`, {
      tint: 'rgba(90,140,220,0.09)',
      effects: [{ kind: 'fog', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: mėlyno mithrilo stingeris
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 34, height: 88, depth: 12 }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Ordinas gavo žinią.', en: 'The Order got the message.' },
    }),
    // 07 — Antras atsakymas (arklys be raitelio)
    S('p07', `${A}/bg-vartu-kiemas.svg`, {
      effects: [{ kind: 'fog', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: pasiklydusios kanopos
      text: null, holdMs: 1500,
    }),
    // 08 — Vienas žodis
    C('p08a', `${A}/bg-vartu-kiemas.svg`, {
      tint: 'rgba(220,215,200,0.07)',
      camera: { startScale: 1.05, endScale: 1.1, duration: 3, punchIn: true },
      speakerName: { lt: 'Raštas', en: 'The writ' },
      text: { lt: 'IZOLIUOTI.', en: 'ISOLATE.' },
      holdMs: 900,
    }),
    C('p08b', `${A}/bg-vartu-kiemas.svg`, {
      characters: [
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 64, height: 84, depth: 11, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12, dim: 0.15 },
      ],
      speakerId: 'vartu-kapitonas', text: { lt: 'Kiek karių jie siunčia?', en: 'How many soldiers are they sending?' },
    }),
    C('p08c', `${A}/bg-vartu-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Kol kas — vieną žodį.', en: 'For now — one word.' },
      holdMs: 700,
    }),
    // 09–10 — Pirma diena / vakaro maistas (laiko slinktis; mergaitė duonos eilėje)
    S('p09', `${A}/bg-miesto-gatve.svg`, {
      effects: [{ kind: 'embers', intensity: 0.2 }],
      tint: 'rgba(240,180,41,0.05)',
      camera: { startScale: 1.04, endScale: 1, duration: 7 },
      characters: [
        { characterId: 'mergaite', pose: 'neutral', x: 62, height: 48, bottom: -6, depth: 10 },
        { characterId: 'sargybinis', pose: 'neutral', x: 78, height: 74, depth: 10, flip: true, dim: 0.2 },
      ],
      sfxUrl: null, // PLACEHOLDER: pirmos apgulties dienos duona
      text: null, holdMs: 1600,
    }),
    // 11 — Po grindiniu (juoda gija — trys kryptys)
    S('p10', `${A}/bg-katakombos.svg`, {
      transition: { type: 'wipe-diagonal', duration: 500 },
      tint: 'rgba(200,30,30,0.06)',
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(200,30,30,0.3)' }, { kind: 'dust', intensity: 0.25 }],
      camera: { startScale: 1, endScale: 1.08, startY: -1, endY: 1, duration: 6 },
      text: null, holdMs: 1600, // viršuje niekas jos nemato → perėjimas į 4 misiją
    }),
  ],
}

export const m03fail = [
  { characterName: 'Vartų kapitonas', text: 'Grandinė dar laiko.' },
  { characterName: 'Prazaras', text: 'Tada grąžinam būrį prie vežimo ir bandom dar kartą.' },
]
