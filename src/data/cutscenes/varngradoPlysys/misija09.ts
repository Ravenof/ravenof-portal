// ════════════════════════════════════════════════════════════════════════════
// M9 „Būtinoji kaina" — PRE „Mūsų vežimai" (~85 s) +
// POST „Paskutinis tiltas" (~85 s) + FAIL. Pagal MISIJA09 scenarijų.
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m09pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('s01', `${A}/bg-karo-kambarys.svg`, { // dvi dienos
      transition: { type: 'cut' },
      characters: [{ characterId: 'intendantas', pose: 'neutral', x: 58, height: 86, depth: 12, flip: true }],
      sfxUrl: null, // PLACEHOLDER: dalijamos duonos peilis, tylus kambarys
      speakerId: 'intendantas',
      text: { lt: 'Taip maitinsim gynėjus rytoj. Poryt dalinti nebebus ko.', en: 'This is how we feed the defenders tomorrow. The day after, there will be nothing left to share.' },
    }),
    C('s02a', `${A}/bg-karo-kambarys.svg`, { // pasirinkimai
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Jei liksim, badausim. Jei eisime, jie vadins mus užkrėstais.', en: 'If we stay, we starve. If we go, they will call us infected.' },
    }),
    C('s02b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 60, height: 88, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'Jie jau taip vadina.', en: 'They already do.' },
    }),
    C('s02c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada bent parsineškim grūdų.', en: 'Then at least let us bring back grain.' },
      holdMs: 400,
    }),
    C('s03a', `${A}/bg-karo-kambarys.svg`, { // krovinys
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 52, height: 88, depth: 12 }],
      speakerId: 'kernius',
      text: { lt: 'Trys vežimai. Mūsų antspaudas, mūsų užsakymo numeriai.', en: 'Three wagons. Our seal, our order numbers.' },
    }),
    C('s03b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'intendantas', pose: 'neutral', x: 58, height: 86, depth: 12, flip: true }],
      speakerId: 'intendantas',
      text: { lt: 'Vieno užtektų gydyklai. Dviejų — miestui dar kelioms dienoms.', en: 'One would cover the infirmary. Two — the city for a few more days.' },
      holdMs: 400,
    }),
    C('s04', `${A}/bg-karo-kambarys.svg`, { // ne mūšis
      characters: [
        { characterId: 'prazaras', pose: 'isako', x: 32, height: 90, depth: 12 },
        { characterId: 'kapitonas', pose: 'neutral', x: 70, height: 84, depth: 10, flip: true, dim: 0.15 },
      ],
      speakerId: 'prazaras',
      text: { lt: 'Einam dėl vežimų. Kas pasitraukia, to nesivejam. Kas padeda ginklą, to neliečiam.', en: 'We go for the wagons. Whoever retreats, we do not chase. Whoever lays down arms, we do not touch.' },
    }),
    S('s05a', `${A}/bg-karo-kambarys.svg`, { // Kerniaus perspėjimas
      characters: [{ characterId: 'kernius', pose: 'akis', x: 54, height: 92, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.02, endScale: 1.08, duration: 5, punchIn: true },
      speakerId: 'kernius', text: { lt: 'Belzatoras irgi žino apie tiltą.', en: 'Belzataras knows about the bridge too.' },
    }),
    C('s05b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 62, height: 86, depth: 11, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kada jo kariai bus čia?', en: 'When will his soldiers be here?' },
    }),
    C('s05c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 54, height: 92, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Kai abi pusės jau bus pradėjusios kovą.', en: 'Once both sides have already begun to fight.' },
      holdMs: 500,
    }),
    S('s06', `${A}/bg-uzkarda.svg`, { // prieš aušrą
      effects: [{ kind: 'fog', intensity: 0.4 }],
      camera: { startScale: 1, endScale: 1.06, endX: 1, duration: 6 },
      text: null, holdMs: 1300,
    }),
    C('s07', `${A}/bg-uzkarda.svg`, { // baltas perspėjimas
      tint: 'rgba(220,215,200,0.08)',
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 76, bottom: 16, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Dar vienas žingsnis, ir jūsų būrys bus laikomas grėsme karantino linijai.', en: 'One more step and your company will be treated as a threat to the quarantine line.' },
    }),
    C('s08a', `${A}/bg-uzkarda.svg`, { // kam priklauso
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 34, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Atiduokit mūsų vežimus. Atsitrauksim su jais.', en: 'Hand over our wagons. We will withdraw with them.' },
    }),
    C('s08b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 76, bottom: 16, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Viskas karantino pusėje priklauso Inkvizicijos kontrolei.', en: 'Everything on the quarantine side belongs to Inquisition control.' },
    }),
    C('s09a', `${A}/bg-uzkarda.svg`, { // sprendimas jau priimtas
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 42, height: 92, depth: 12 }],
      speakerId: 'kapitonas',
      text: { lt: 'Tu palieki miestą badauti, kol už jo sienos stovi jo maistas.', en: 'You leave a city to starve while its food stands outside its wall.' },
    }),
    C('s09b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 76, bottom: 16, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Miestas jau prarastas. Atsargos bus nukreiptos ten, kur dar gali ką nors išgelbėti.', en: 'The city is already lost. The supplies will go where they can still save something.' },
      holdMs: 500,
    }),
    C('s10a', `${A}/bg-uzkarda.svg`, { // paskutinis pasiūlymas
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Atverk vartus. Mes paimsim tik tai, kas pažymėta Varngradui.', en: 'Open the gates. We take only what is marked for Varngrad.' },
    }),
    C('s10b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 78, bottom: 14, depth: 9, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Grįžkit į izoliuotą zoną.', en: 'Return to the isolated zone.' },
      holdMs: 500,
    }),
    S('s11a', `${A}/bg-tiltas.svg`, { // žingsnis
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 38, height: 92, depth: 12 }],
      effects: [{ kind: 'fog', intensity: 0.3 }],
      speakerId: 'prazaras',
      text: { lt: 'Jūs mus paskelbėt grėsme dar prieš mums ateinant.', en: 'You declared us a threat before we even arrived.' },
    }),
    C('s11b', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 42, height: 94, depth: 12 }],
      camera: { startScale: 1.05, endScale: 1.09, duration: 3, punchIn: true },
      speakerId: 'prazaras', text: { lt: 'Vežimus. Ne kerštą.', en: 'The wagons. Not revenge.' },
      holdMs: 600,
    }),
    C('s12', `${A}/bg-krovinio-kiemas.svg`, { // prasiveržimas
      tint: 'rgba(90,140,220,0.07)',
      effects: [{ kind: 'dust', intensity: 0.4 }],
      characters: [
        { characterId: 'kapitonas', pose: 'kovinis', x: 30, height: 90, depth: 12 },
        { characterId: 'prazaras', pose: 'kalavijas', x: 62, height: 88, depth: 11, flip: true },
      ],
      camera: { startScale: 1.03, endScale: 1.08, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: skydų susidūrimas
      text: null, holdMs: 1000,
    }),
  ],
}

export const m09post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('p01', `${A}/bg-tiltas.svg`, { // du vežimai miesto pusėje
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: vežimų grandinės
      text: null, holdMs: 1300,
    }),
    C('p02', `${A}/bg-tiltas.svg`, { // likęs krovinys
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12 },
        { characterId: 'kapitonas', pose: 'kovinis', x: 70, height: 84, depth: 10, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Palik vežimą. Pereik dabar.', en: 'Leave the wagon. Cross now.' },
    }),
    C('p03', `${A}/bg-krovinio-kiemas.svg`, { // demonai kieme
      effects: [{ kind: 'smoke', intensity: 0.4 }],
      tint: 'rgba(200,30,30,0.08)',
      characters: [{ characterId: 'belzatoras', pose: 'demonas', x: 76, height: 40, bottom: 4, depth: 8, dim: 0.25 }],
      camera: { startScale: 1.02, endScale: 1.08, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: demoniškas flango signalas
      text: null, holdMs: 1100,
    }),
    C('p04a', `${A}/bg-tiltas.svg`, { // baltas dagtis
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true }],
      sfxUrl: null, // PLACEHOLDER: deganti dagtis
      speakerId: 'kapitonas', text: { lt: 'Ant tilto dar jų žmonės.', en: 'Their own people are still on the bridge.' },
    }),
    C('p04b', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jis jau įrašė juos į kainą.', en: 'He has already written them into the price.' },
      holdMs: 500,
    }),
    S('p05', `${A}/bg-tiltas-sugriuves.svg`, { // sprogimas
      transition: { type: 'cut' },
      effects: [{ kind: 'smoke', intensity: 0.55 }, { kind: 'dust', intensity: 0.5 }],
      camera: { startScale: 1.06, endScale: 1.12, duration: 2, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: tilto sprogimas ir akmenų griūtis
      text: null, holdMs: 1400,
    }),
    C('p06a', `${A}/bg-tiltas-sugriuves.svg`, { // toje pačioje pusėje
      effects: [{ kind: 'dust', intensity: 0.35 }],
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
        { characterId: 'kapitonas', pose: 'neutral', x: 68, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Tavo vyrai liko mūsų pusėje.', en: 'Your men are on our side now.' },
    }),
    C('p06b', `${A}/bg-tiltas-sugriuves.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12, dim: 0.2 },
        { characterId: 'kapitonas', pose: 'neutral', x: 68, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'kapitonas',
      text: { lt: 'Šiandien jūsų pusė vienintelė dar kovojo su Orda.', en: 'Today yours was the only side still fighting the Horde.' },
      holdMs: 500,
    }),
    S('p07', `${A}/bg-tiltas-sugriuves.svg`, { // apsiaustas vaikui — be žodžių
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 48, height: 86, depth: 12 }],
      tint: 'rgba(240,220,180,0.05)',
      text: null, holdMs: 1300,
    }),
    C('p08a', `${A}/bg-karo-kambarys.svg`, { // kelioms dienoms
      characters: [{ characterId: 'intendantas', pose: 'neutral', x: 58, height: 86, depth: 12, flip: true }],
      speakerId: 'intendantas', text: { lt: 'Jei dalinsim tik gynėjams — keturios dienos.', en: 'If we share only with the defenders — four days.' },
    }),
    C('p08b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'intendantas', pose: 'neutral', x: 62, height: 84, depth: 11, flip: true, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Dalinsim visiems.', en: 'We share with everyone.' },
    }),
    C('p08c', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'intendantas', pose: 'neutral', x: 62, height: 84, depth: 11, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12, dim: 0.2 },
      ],
      speakerId: 'intendantas', text: { lt: 'Tada dvi.', en: 'Then two.' },
    }),
    C('p08d', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada turim dvi.', en: 'Then two is what we have.' },
      holdMs: 500,
    }),
    S('p09', `${A}/bg-siena-horizontas.svg`, { // juoda akis — siluetas šiaurėje
      tint: 'rgba(200,30,30,0.09)',
      effects: [{ kind: 'smoke', intensity: 0.35 }],
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 28, height: 88, depth: 12 },
        { characterId: 'belzatoras', pose: 'demonas', x: 78, height: 48, bottom: 6, depth: 8, dim: 0.2, entrance: 'fade' },
      ],
      camera: { startScale: 1, endScale: 1.07, endX: 1, duration: 6 },
      text: null, holdMs: 1200,
    }),
    C('p10a', `${A}/bg-siena-horizontas.svg`, { // ko jis laukė
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 92, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.3)' }],
      speakerId: 'kernius', text: { lt: 'Jis pajudėjo.', en: 'He has moved.' },
    }),
    C('p10b', `${A}/bg-siena-horizontas.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 60, height: 88, depth: 11, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kas?', en: 'Who?' },
    }),
    C('p10c', `${A}/bg-siena-horizontas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 92, depth: 12 }],
      speakerId: 'kernius',
      text: { lt: 'Belzatoras. Jis laukė, kol uždarys paskutinį kelią.', en: 'Belzataras. He was waiting for the last road to be closed.' },
    }),
    C('p11a', `${A}/bg-tiltas-sugriuves.svg`, { // kodėl
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Ko laukė?', en: 'Waiting for what?' },
    }),
    C('p11b', `${A}/bg-tiltas-sugriuves.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 56, height: 90, depth: 12, flip: true }],
      speakerId: 'kernius', text: { lt: 'Kad neturėtume kur trauktis.', en: 'For us to have nowhere left to retreat.' },
      holdMs: 600,
    }),
    S('p12', `${A}/bg-siena-horizontas.svg`, { // pirmas varpo dūžis
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'embers', intensity: 0.4 }],
      camera: { startScale: 1.02, endScale: 1.08, duration: 4, punchIn: true },
      sfxUrl: null, // PLACEHOLDER: vienas finalinis Varngrado varpo dūžis
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 32, height: 90, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Visus prie centrinės sienos. Šiąnakt maisto turim. Dabar reikia ryto.', en: 'Everyone to the central wall. Tonight we have food. Now we need the morning.' },
      holdMs: 700,
    }),
  ],
}

export const m09fail = [
  { characterName: 'Prazaras', text: 'Palikit vežimą, ne žmones. Persirikiuojam.' },
  { characterName: 'Ordino kapitonas', text: 'Kitą kartą pirmi paimam vaistus. Aš laikysiu tiltą.' },
]
