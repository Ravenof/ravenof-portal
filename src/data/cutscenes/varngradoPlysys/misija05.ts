// ════════════════════════════════════════════════════════════════════════════
// M5 „Juodoji akis" — PRE „Vardai ant akmens" (~60 s) +
// POST „Du atsakymai" (~55 s) + FAIL. Pagal MISIJA05 scenarijų.
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m05pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('s01a', `${A}/bg-katakombos.svg`, { // nusileidimas
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.3 }],
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 84, depth: 11, flip: true },
      ],
      sfxUrl: null, // PLACEHOLDER: katakombų aidas
      speakerId: 'prazaras', text: { lt: 'Jei akis lieps sukti ne ten, sakai garsiai.', en: 'If the eye tells you to turn the wrong way, you say it out loud.' },
    }),
    C('s01b', `${A}/bg-katakombos.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12, dim: 0.2 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'Ji neliepia. Ji rodo.', en: 'It does not command. It shows.' },
    }),
    C('s02a', `${A}/bg-katakombos.svg`, { // gydytojos perspėjimas
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 40, height: 86, depth: 11 },
        { characterId: 'gydytoja', pose: 'neutral', x: 72, height: 80, depth: 10, flip: true },
      ],
      speakerId: 'gydytoja', text: { lt: 'Kuo ilgiau žiūri, tuo mažiau tos akies lieka tavo.', en: 'The longer you look, the less of that eye remains yours.' },
    }),
    C('s02b', `${A}/bg-katakombos.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Todėl paskubėkim.', en: 'Then let us hurry.' },
      holdMs: 400,
    }),
    S('s03a', `${A}/bg-kriptos-antspaudai.svg`, { // pirmosios durys
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(200,30,30,0.28)' }],
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: akmenyje braižomi ženklai
      speakerId: 'prazaras', text: { lt: 'Ar gali perskaityti?', en: 'Can you read it?' },
    }),
    C('s03b', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 62, height: 88, depth: 12, flip: true }],
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      speakerId: 'kernius', text: { lt: 'Galiu matyti, ką jis daro.', en: 'I can see what it is doing.' },
    }),
    C('s04', `${A}/bg-kriptos-antspaudai.svg`, { // perrašymas
      camera: { startScale: 1.05, endScale: 1.12, duration: 5, punchIn: true },
      effects: [{ kind: 'magic', intensity: 0.45, color: 'rgba(200,30,30,0.32)' }],
      speakerId: 'kernius', text: { lt: 'Jis nerašo ant kapų. Jis perrašo juos.', en: 'It is not writing on the graves. It is rewriting them.' },
    }),
    C('s05', `${A}/bg-kriptos-antspaudai.svg`, { // vienas vardas
      characters: [{ characterId: 'kernius', pose: 'akis', x: 54, height: 94, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.5, color: 'rgba(200,30,30,0.35)' }],
      tint: 'rgba(200,30,30,0.08)',
      camera: { startScale: 1.06, endScale: 1.1, duration: 3, punchIn: true },
      speakerId: 'kernius', text: { lt: 'Belzatoras.', en: 'Belzataras.' },
      holdMs: 700,
    }),
    C('s06a', `${A}/bg-kriptos-antspaudai.svg`, { // pasekmė
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 68, height: 84, depth: 11, flip: true, dim: 0.2 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kas nutiks, jei baigs?', en: 'What happens if it finishes?' },
    }),
    C('s06b', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12, dim: 0.2 },
        { characterId: 'kernius', pose: 'akis', x: 68, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'Kai mirusieji atsikels, atsilieps jo vardu.', en: 'When the dead rise, they will answer to his name.' },
      holdMs: 400,
    }),
    S('s07', `${A}/bg-kriptos-antspaudai.svg`, { // trys žymės
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(200,30,30,0.3)' }],
      camera: { startScale: 1, endScale: 1.07, endX: 1, duration: 5 },
      sfxUrl: null, // PLACEHOLDER: dvigubi mirusiųjų balsai už durų
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 32, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada vardus paliekam jų savininkams.', en: 'Then the names stay with their owners.' },
    }),
    C('s08', `${A}/bg-kriptos-antspaudai.svg`, { // pirmas antspaudas
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 30, height: 92, depth: 12 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 86, depth: 11, flip: true },
      ],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 3, shake: 'light' },
      speakerId: 'kernius', text: { lt: 'Smūgis ten. Ne į akmenį — į juodą giją.', en: 'Strike there. Not the stone — the black thread.' },
      holdMs: 500,
    }),
  ],
}

export const m05post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('p01', `${A}/bg-kriptos-antspaudai.svg`, { // sugrįžę vardai
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.25 }],
      tint: 'rgba(240,220,180,0.05)',
      sfxUrl: null, // PLACEHOLDER: antspaudo trūkimas, nutrūkstančios gijos
      text: null, holdMs: 1500,
    }),
    C('p02a', `${A}/bg-kriptos-antspaudai.svg`, { // dūmas veržiasi į akį
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 46, height: 80, bottom: -6, depth: 11 },
        { characterId: 'prazaras', pose: 'neutral', x: 76, height: 86, depth: 12, flip: true },
      ],
      effects: [{ kind: 'smoke', intensity: 0.45 }],
      speakerId: 'prazaras', text: { lt: 'Užmerk.', en: 'Close it.' },
    }),
    C('p02b', `${A}/bg-kriptos-antspaudai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 50, height: 90, depth: 12 }],
      effects: [{ kind: 'smoke', intensity: 0.4 }],
      speakerId: 'kernius', text: { lt: 'Jei užmerksiu, nematysiu, kur jis traukiasi.', en: 'If I close it, I will not see where it retreats.' },
    }),
    C('p03', `${A}/bg-katakombos.svg`, { // gija kyla į paviršių
      effects: [{ kind: 'smoke', intensity: 0.35 }],
      camera: { startScale: 1.06, endScale: 1, startY: 1, endY: -1, duration: 5 },
      speakerId: 'kernius', text: { lt: 'Kažkas pralaužė išorinį žiedą.', en: 'Something has broken the outer ring.' },
      holdMs: 400,
    }),
    S('p04', `${A}/bg-siena-horizontas.svg`, { // mėlyna šviesa
      tint: 'rgba(90,140,220,0.1)',
      effects: [{ kind: 'fog', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: mėlyno mithrilo stingeris + tolimas raitelių griausmas
      speakerId: 'vartu-kapitonas', text: { lt: 'Ordinas.', en: 'The Order.' },
    }),
    C('p05', `${A}/bg-siena-horizontas.svg`, { // pagalba
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12 }],
      tint: 'rgba(90,140,220,0.08)',
      speakerId: 'prazaras', text: { lt: 'Atidarysim vartus, kai jie nuvalys kelią.', en: 'We will open the gates once they clear the road.' },
      holdMs: 400,
    }),
    S('p06', `${A}/bg-inkvizicijos-kalva.svg`, { // antra stovykla
      effects: [{ kind: 'fog', intensity: 0.25 }],
      camera: { startScale: 1, endScale: 1.06, endX: 1, duration: 6 },
      characters: [{ characterId: 'kernius', pose: 'akis', x: 24, height: 88, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Ne jie vieni.', en: 'They are not alone.' },
    }),
    C('p07a', `${A}/bg-inkvizicijos-kalva.svg`, { // kodėl nejuda
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 70, height: 82, depth: 10, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Inkvizicija atvyko anksčiau.', en: 'The Inquisition arrived first.' },
    }),
    C('p07b', `${A}/bg-inkvizicijos-kalva.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12, dim: 0.2 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 70, height: 82, depth: 10, flip: true },
      ],
      speakerId: 'vartu-kapitonas', text: { lt: 'Tai kodėl Ordinas pirmas prie mūsų sienos?', en: 'Then why is the Order first at our wall?' },
    }),
    C('p08', `${A}/bg-inkvizicijos-kalva.svg`, { // Prazaras neatsako — nejudanti stovykla
      camera: { startScale: 1.04, endScale: 1.1, duration: 5 },
      effects: [{ kind: 'fog', intensity: 0.3 }],
      text: null, holdMs: 1300,
    }),
  ],
}

export const m05fail = [
  { characterName: 'Kernius', text: 'Dar matau jų jungtis.' },
  { characterName: 'Prazaras', text: 'Tada kol matai, mes dar galim jas nutraukti.' },
]
