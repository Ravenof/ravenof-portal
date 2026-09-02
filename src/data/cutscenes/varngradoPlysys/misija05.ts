// ════════════════════════════════════════════════════════════════════════════
// M5 „Juodoji akis" — V3
// PRE „Vardas, kuris atsako" (17 beat'ų → 23 shots, ~2:50) +
// POST „Du atsakymai" (11 beat'ų → 14 shots) + FAIL.
// LOCK: PRE baigiasi vardo grandinei sugriebus Kernių — pirmas tikslas
// „Per 2 ėjimus nutrauk Kerniaus vardo grandinę".
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m05pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // ── A. Nusileidimas ──
    // 01 — Po miesto triukšmu (establishing)
    S('s01', `${A}/bg-katakombos.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.3 }],
      camera: { startScale: 1, endScale: 1.06, startY: -1, endY: 1, duration: 8 },
      sfxUrl: null, // PLACEHOLDER: varpai viršuje tolsta, žingsnių aidas
      text: null, holdMs: 2500,
    }),
    // 02 — Tikri vardai
    C('s02a', `${A}/bg-katakombos.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'neutral', x: 66, height: 84, depth: 11, flip: true, dim: 0.15 },
      ],
      speakerId: 'prazaras',
      text: { lt: 'Čia rašomi visi, kurie mirė gindami miestą. Ne tik tie, kuriems pastato statulas.', en: 'Everyone who died defending the city is written here. Not only those who get statues.' },
      holdMs: 500, // Kernius perbraukia vieną vardą pirštais
    }),
    // 03 — Susitarimas
    C('s03a', `${A}/bg-katakombos.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 90, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Jei akis rodys kelią, sakai jį garsiai. Jei pradėsi kalbėti ne savo balsu, sustabdau.', en: 'If the eye shows a path, you say it out loud. If you start speaking in a voice not your own, I stop you.' },
    }),
    C('s03b', `${A}/bg-katakombos.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 58, height: 88, depth: 12, flip: true }],
      speakerId: 'kernius', text: { lt: 'Kaip?', en: 'How?' },
    }),
    C('s03c', `${A}/bg-katakombos.svg`, { // rodo tvarstį ir metalinę plokštelę, ne kalaviją
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Pirmiausia uždengiu. Kalavijas — tik jei to nebeužteks.', en: 'First, I cover it. The sword — only if that is no longer enough.' },
      holdMs: 1000,
    }),
    // ── B. Akis atveriama sąmoningai ──
    // 04 — Pirmas žvilgsnis
    S('s04a', `${A}/bg-katakombos.svg`, {
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.35)' }],
      tint: 'rgba(138,92,246,0.05)',
      characters: [{ characterId: 'kernius', pose: 'akis', x: 50, height: 92, depth: 12 }],
      camera: { startScale: 1.02, endScale: 1.08, duration: 4, punchIn: true },
      speakerId: 'kernius', text: { lt: 'Trys gijos. Visos veda į vardų kriptą.', en: 'Three threads. All of them lead to the name crypt.' },
    }),
    C('s04b', `${A}/bg-katakombos.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 62, height: 86, depth: 11, flip: true, dim: 0.15 },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kieno balsu tai pasakei?', en: 'Whose voice did you just use?' },
    }),
    C('s04c', `${A}/bg-katakombos.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 50, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Savo.', en: 'My own.' },
      holdMs: 700,
    }),
    // 05 — Dargio vardas
    S('s05a', `${A}/bg-katakombos.svg`, { // tuščia vieta sienoje naujiems žuvusiesiems
      tint: 'rgba(138,92,246,0.06)',
      speakerName: { lt: 'Dargio balsas', en: 'Dargis’ voice' },
      text: { lt: 'Kerniau, atidaryk duris. Mes likom kitoje pusėje.', en: 'Kernius, open the door. We were left on the other side.' },
      holdMs: 500, // Kernius sustoja
    }),
    C('s05b', `${A}/bg-katakombos.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Ar taip jis būtų prašęs?', en: 'Is that how he would have asked?' },
    }),
    C('s05c', `${A}/bg-katakombos.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 56, height: 90, depth: 12, flip: true }],
      speakerId: 'kernius', text: { lt: 'Ne. Jis būtų liepęs neatsukti nugaros.', en: 'No. He would have ordered me not to turn my back.' },
      holdMs: 800, // eina toliau
    }),
    // ── C. Ką daro ženklai ──
    // 06 — Pirmos durys (reveal be teksto)
    S('s06', `${A}/bg-kriptos-antspaudai.svg`, {
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(200,30,30,0.3)' }],
      tint: 'rgba(200,30,30,0.06)',
      camera: { startScale: 1, endScale: 1.07, duration: 5, punchIn: true },
      sfxUrl: null, // PLACEHOLDER: akmenyje braižomi ženklai
      text: null, holdMs: 1300,
    }),
    // 07 — Vienas vardas išnyksta
    C('s07a', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Ką jis rašo?', en: 'What is it writing?' },
    }),
    C('s07b', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 60, height: 88, depth: 12, flip: true }],
      speakerId: 'kernius', text: { lt: 'Tą patį vardą ant visų kapų.', en: 'The same name on every grave.' },
    }),
    // 08 — Belzatoras (be didelio efektų pliūpsnio — svarbi išvada)
    C('s08', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 52, height: 92, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Belzatoras.', en: 'Belzataras.' },
      holdMs: 1000, // trumpa tyla
    }),
    // 09 — Pasekmė
    C('s09a', `${A}/bg-kriptos-antspaudai.svg`, {
      sfxUrl: null, // PLACEHOLDER: už durų sujuda kaulai
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jei jis baigs perrašyti?', en: 'And if he finishes rewriting them?' },
    }),
    C('s09b', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'kernius', text: { lt: 'Kai jie kelsis, atsilieps jo vardu.', en: 'When they rise, they will answer to his name.' },
      holdMs: 900, // Prazaras pažvelgia į šimtus kapų
    }),
    // ── D. Trys antspaudai ──
    // 10 — Kripta atsiveria (be žodžių)
    S('s10', `${A}/bg-kriptos-antspaudai.svg`, {
      transition: { type: 'wipe-left', duration: 420 },
      effects: [{ kind: 'magic', intensity: 0.45, color: 'rgba(200,30,30,0.35)' }, { kind: 'dust', intensity: 0.25 }],
      tint: 'rgba(200,30,30,0.08)',
      camera: { startScale: 1.02, endScale: 1.08, duration: 4 },
      text: null, holdMs: 1300,
    }),
    // 11 — Ne akmuo
    C('s11', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 32, height: 90, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 86, depth: 11, flip: true },
      ],
      sfxUrl: null, // PLACEHOLDER: kalavijas atšoka nuo akmens
      speakerId: 'kernius',
      text: { lt: 'Ne į ženklą. Smūgis turi kirsti tada, kai gija atsiveria.', en: 'Not at the sigil. The blow must land the moment the thread opens.' },
    }),
    // 12 — Kaina Kerniui
    C('s12a', `${A}/bg-kriptos-antspaudai.svg`, {
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.35)' }],
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 46, height: 90, depth: 12 },
        { characterId: 'prazaras', pose: 'neutral', x: 78, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Tavo vardas?', en: 'Your name?' },
    }),
    C('s12b', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 48, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Kernius. Šiaurinio bokšto sargybinis.', en: 'Kernius. Watchman of the northern tower.' },
      holdMs: 800, // Prazaras dar neuždengia akies
    }),
    // ── E. Prakeiksmas griebia atsakymą ──
    // 13 — Tuščia vieta prisipildo (KERNIUS ant sienos)
    S('s13', `${A}/bg-kriptos-antspaudai.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'magic', intensity: 0.55, color: 'rgba(200,30,30,0.4)' }],
      camera: { startScale: 1.04, endScale: 1.1, duration: 2, punchIn: true },
      sfxUrl: null, // PLACEHOLDER: gija smogia į vardą sienoje
      text: null, holdMs: 1200,
    }),
    // 14 — Vardo grandinė (Kernius parkrinta)
    C('s14', `${A}/bg-kriptos-antspaudai.svg`, {
      effects: [{ kind: 'magic', intensity: 0.5, color: 'rgba(200,30,30,0.4)' }, { kind: 'dust', intensity: 0.3 }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 2, shake: 'light' },
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 72, bottom: -10, depth: 11 }],
      text: null, holdMs: 1100,
    }),
    // 15 — Išėjimas užsirakina
    C('s15', `${A}/bg-kriptos-antspaudai.svg`, {
      effects: [{ kind: 'dust', intensity: 0.4 }],
      camera: { startScale: 1.05, endScale: 1.08, duration: 2, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: kriptos durys trenkiasi
      text: null, holdMs: 1000,
    }),
    // 16 — Pirmi perrašyti mirusieji (reveal ≥1,2 s)
    S('s16', `${A}/bg-kriptos-antspaudai.svg`, {
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(200,30,30,0.35)' }, { kind: 'fog', intensity: 0.3 }],
      characters: [
        { characterId: 'belzatoras', pose: 'demonas', x: 68, height: 46, bottom: 4, depth: 9, entrance: 'fade', dim: 0.2 },
        { characterId: 'kernius', pose: 'akis', x: 30, height: 70, bottom: -12, depth: 11, dim: 0.1 },
      ],
      text: null, holdMs: 1300, // jie nepuola Prazaro — eina prie pririšto Kerniaus
    }),
    // 17 — Pirmas tikslas → kova
    C('s17a', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 36, height: 92, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 76, bottom: -8, depth: 11 },
      ],
      camera: { startScale: 1.04, endScale: 1.09, duration: 3, punchIn: true },
      speakerId: 'prazaras',
      text: { lt: 'Kerniau, sakyk, kada ji atsiveria. Kiti — atitraukit nuo jo mirusiuosius!', en: 'Kernius, call it when it opens. The rest — pull the dead away from him!' },
    }),
    C('s17b', `${A}/bg-kriptos-antspaudai.svg`, {
      effects: [{ kind: 'magic', intensity: 0.5, color: 'rgba(138,92,246,0.4)' }],
      camera: { startScale: 1.05, endScale: 1.11, duration: 2, shake: 'light' },
      characters: [{ characterId: 'kernius', pose: 'akis', x: 50, height: 92, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Dabar!', en: 'Now!' },
      holdMs: 700, // Prazaras smogia — UI atsiranda smūgio viduryje
    }),
  ],
}

export const m05post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // 01 — Vardai grįžta
    S('p01', `${A}/bg-kriptos-antspaudai.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(240,220,180,0.06)',
      effects: [{ kind: 'dust', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: juodos raidės byra nuo sienų
      text: null, holdMs: 1500,
    }),
    // 02 — Kerniaus vardas (be žodžių: nubraukia savo vardą)
    C('p02', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 48, height: 88, depth: 12 }],
      text: null, holdMs: 1300, // gyvųjų vardai čia neturi likti
    }),
    // 03 — Prazaro patikra
    C('p03a', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 86, depth: 11, flip: true, dim: 0.15 },
      ],
      speakerId: 'prazaras', text: { lt: 'Tavo vardas?', en: 'Your name?' },
    }),
    C('p03b', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 52, height: 88, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Kernius.', en: 'Kernius.' },
    }),
    C('p03c', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 32, height: 88, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Ką matai?', en: 'What do you see?' },
    }),
    C('p03d', `${A}/bg-kriptos-antspaudai.svg`, {
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.3)' }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 52, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Kur traukiasi jo dūmas.', en: 'Where his smoke is retreating.' },
      holdMs: 800, // Prazaras nuleidžia plokštelę — tylus pasitikėjimo žingsnis
    }),
    // 04 — Į paviršių
    S('p04', `${A}/bg-katakombos.svg`, {
      effects: [{ kind: 'smoke', intensity: 0.35 }],
      camera: { startScale: 1.06, endScale: 1, startY: 1, endY: -1, duration: 5 },
      sfxUrl: null, // PLACEHOLDER: tolima raitelių kanopų banga viršuje
      text: null, holdMs: 1300,
    }),
    // 05 — Mėlynas pleištas
    S('p05', `${A}/bg-apsupties-laukas.svg`, {
      tint: 'rgba(90,140,220,0.1)',
      effects: [{ kind: 'fog', intensity: 0.3 }],
      camera: { startScale: 1, endScale: 1.06, endX: -1, duration: 6 },
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 28, height: 86, depth: 12 }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Ordinas atėjo.', en: 'The Order has come.' },
    }),
    // 06 — Pirma reali pagalba (be žodžių: raiteliai kerta liniją)
    C('p06', `${A}/bg-apsupties-laukas.svg`, {
      tint: 'rgba(90,140,220,0.09)',
      effects: [{ kind: 'dust', intensity: 0.4 }],
      camera: { startScale: 1.03, endScale: 1.08, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: mithrilo smūgiai; keli raiteliai krinta
      text: null, holdMs: 1300,
    }),
    // 07 — Balta stovykla
    S('p07', `${A}/bg-inkvizicijos-kalva.svg`, {
      effects: [{ kind: 'fog', intensity: 0.25 }],
      camera: { startScale: 1, endScale: 1.05, endX: 1, duration: 6 },
      characters: [{ characterId: 'kernius', pose: 'akis', x: 24, height: 86, depth: 12 }],
      text: null, holdMs: 1400, // balti skydai nukreipti į kelią iš miesto
    }),
    // 08 — Kas atvyko pirmas
    C('p08a', `${A}/bg-inkvizicijos-kalva.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 32, height: 88, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Kada jie pastatė palapines?', en: 'When did they pitch those tents?' },
    }),
    C('p08b', `${A}/bg-inkvizicijos-kalva.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 62, height: 84, depth: 11, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Prieš Ordino signalą.', en: 'Before the Order’s signal.' },
      holdMs: 500,
    }),
    // 09 — Kodėl nejuda
    C('p09', `${A}/bg-inkvizicijos-kalva.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada jie atėjo ne prie mūsų sienos.', en: 'Then it is not our wall they came for.' },
      holdMs: 800,
    }),
    // 10 — Reikalingas sprendimas (Ordino kapitonas su sulaužyta vėliava)
    S('p10', `${A}/bg-apsupties-laukas.svg`, {
      tint: 'rgba(90,140,220,0.07)',
      effects: [{ kind: 'fog', intensity: 0.3 }, { kind: 'dust', intensity: 0.3 }],
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 44, height: 90, depth: 12 }],
      text: null, holdMs: 1300, // rodo į vartus; už jo pergrupuojama banga
    }),
    // 11 — Atverti kelią
    C('p11', `${A}/bg-siena-horizontas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Paruošk mažąsias duris. Atversim jas tada, kai turėsim ką įleisti.', en: 'Ready the small door. We open it when we have someone to let in.' },
      holdMs: 800, // perėjimas į 6 misiją
    }),
  ],
}

export const m05fail = [
  { characterName: 'Kernius', text: 'Dar matau savo raides.' },
  { characterName: 'Prazaras', text: 'Tada pirmiausia nutraukiam tavo jungtį. Dar kartą.' },
]
