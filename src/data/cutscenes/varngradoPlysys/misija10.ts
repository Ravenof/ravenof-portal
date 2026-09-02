// ════════════════════════════════════════════════════════════════════════════
// M10 „Paskutinis varpas" — PRE „Dešimt dūžių" (~145 s) +
// POST „Po mirties" (~145 s, epilogas) + FAIL. Pagal MISIJA10 scenarijų.
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m10pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('s01', `${A}/bg-varpo-kiemas.svg`, { // paskutinės atsargos
      transition: { type: 'cut' },
      characters: [{ characterId: 'intendantas', pose: 'neutral', x: 60, height: 82, depth: 11, flip: true }],
      tint: 'rgba(240,220,180,0.05)',
      camera: { startScale: 1, endScale: 1.05, duration: 7 },
      text: null, holdMs: 1400,
    }),
    C('s02a', `${A}/bg-varpo-kiemas.svg`, { // sienos ataskaita
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 40, height: 88, depth: 12, entrance: 'slide-left' }],
      tint: 'rgba(200,30,30,0.06)',
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Šiauriniai vartai pralaužti. Rytinis bokštas nebeatsako. Iki centrinės sienos — viena gatvė.', en: 'The north gates are breached. The east tower no longer answers. One street left to the central wall.' },
    }),
    C('s02b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'Turiu trisdešimt du karius.', en: 'I have thirty-two soldiers.' },
    }),
    C('s02c', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Rytoj bus mažiau. Šiandien jų užtenka.', en: 'Tomorrow there will be fewer. Today they are enough.' },
      holdMs: 400,
    }),
    S('s03', `${A}/bg-krites-varngradas.svg`, { // jis atėjo
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'smoke', intensity: 0.4 }],
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 24, height: 88, depth: 12 },
        { characterId: 'belzatoras', pose: 'neutral', x: 74, height: 64, bottom: 8, depth: 9, dim: 0.15, entrance: 'fade' },
      ],
      camera: { startScale: 1, endScale: 1.08, endX: 1, duration: 6 },
      speakerId: 'kernius',
      text: { lt: 'Jis nebesiunčia kitų. Belzatoras ateina pats.', en: 'He is no longer sending others. Belzataras is coming himself.' },
      holdMs: 500,
    }),
    C('s04a', `${A}/bg-karo-kambarys.svg`, { // žemėlapis baigėsi
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Nė vieno vartų kelio.', en: 'Not one gate road left.' },
    }),
    C('s04b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 56, height: 90, depth: 12, flip: true }],
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.28)' }],
      speakerId: 'kernius', text: { lt: 'Yra kelias po varpu.', en: 'There is a road beneath the bell.' },
      holdMs: 400,
    }),
    S('s05a', `${A}/bg-varpo-kiemas.svg`, { // po varpu
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.02, endScale: 1.09, startY: -1, endY: 1, duration: 5 },
      characters: [{ characterId: 'archyvare', pose: 'neutral', x: 62, height: 82, depth: 11, flip: true }],
      speakerId: 'archyvare',
      text: { lt: 'Šita šachta jungė vardų saugyklą su uolos kapais. Ji užgriuvo prieš mano senelio laiką.', en: 'This shaft joined the name vault to the rock tombs. It collapsed before my grandfather’s time.' },
    }),
    C('s05b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Ne visa. Už griūties liko siauras tarpas.', en: 'Not all of it. Beyond the fall there is still a narrow gap.' },
    }),
    C('s06a', `${A}/bg-varpo-kiemas.svg`, { // ne evakuacijos kelias
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Kiek žmonių spės praeiti?', en: 'How many people can get through in time?' },
    }),
    C('s06b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 56, height: 90, depth: 12, flip: true }],
      speakerId: 'kernius', text: { lt: 'Nedaug. Ir tik kol siena virš mūsų dar stovi.', en: 'Not many. And only while the wall above us still stands.' },
      holdMs: 500,
    }),
    C('s07a', `${A}/bg-varpo-kiemas.svg`, { // kas išeis
      characters: [
        { characterId: 'prazaras', pose: 'isako', x: 30, height: 90, depth: 12 },
        { characterId: 'gydytoja', pose: 'neutral', x: 62, height: 76, depth: 10, flip: true, dim: 0.15 },
        { characterId: 'archyvare', pose: 'neutral', x: 82, height: 72, depth: 9, flip: true, dim: 0.2 },
      ],
      speakerId: 'prazaras', text: { lt: 'Jie eina pirmi. Kernius — paskutinis.', en: 'They go first. Kernius — last.' },
    }),
    C('s07b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'battle', x: 52, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Aš galiu laikyti sieną.', en: 'I can hold the wall.' },
      holdMs: 400,
    }),
    S('s08a', `${A}/bg-varpo-kiemas.svg`, { // vardų knyga
      characters: [{ characterId: 'archyvare', pose: 'neutral', x: 52, height: 86, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.2, color: 'rgba(240,220,180,0.25)' }],
      speakerId: 'prazaras', text: { lt: 'Tu išneši šitą.', en: 'You carry this out.' },
    }),
    C('s08b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 50, height: 90, depth: 12 }],
      speakerId: 'kernius',
      text: { lt: 'Pirmą kartą iš bokšto pabėgau su žinia. Daugiau nebėgsiu.', en: 'The first time, I fled the tower with a message. I will not run again.' },
    }),
    C('s09a', `${A}/bg-varpo-kiemas.svg`, { // ne bėgimas
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12 },
        { characterId: 'kernius', pose: 'knyga', x: 66, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Todėl šįkart ne bėgsi. Išneši vardus.', en: 'That is why this time you do not run. You carry out the names.' },
    }),
    C('s09b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12, dim: 0.2 },
        { characterId: 'kernius', pose: 'knyga', x: 66, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'O kas išneš jūsiškį?', en: 'And who carries out yours?' },
    }),
    C('s09c', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jis jau ten.', en: 'It is already there.' },
      holdMs: 600,
    }),
    C('s10a', `${A}/bg-varpo-kiemas.svg`, { // Ordino pasirinkimas
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 88, depth: 12 },
        { characterId: 'kapitonas', pose: 'neutral', x: 66, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Tavo žmonės dar gali eiti į šachtą.', en: 'Your men can still take the shaft.' },
    }),
    C('s10b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 52, height: 92, depth: 12 }],
      speakerId: 'kapitonas',
      text: { lt: 'Mano žmonės atėjo pralaužti apsupties. Bent vieną kelią dar pralaušim — Kerniui.', en: 'My men came to break a siege. We will break one more road open — for Kernius.' },
      holdMs: 500,
    }),
    C('s11a', `${A}/bg-varpo-kiemas.svg`, { // laiko matas
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Vienas dūžis — vienas jų žingsnis. Po dešimto šachta bus už jų.', en: 'One toll — one step of theirs. After the tenth, the shaft will be beyond them.' },
    }),
    C('s11b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'O jei siena kris po devinto?', en: 'And if the wall falls after the ninth?' },
    }),
    C('s11c', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada skambinsim iš griuvėsių.', en: 'Then we ring it from the rubble.' },
      holdMs: 500,
    }),
    S('s12', `${A}/bg-varpo-kiemas.svg`, { // pirmas dūžis
      effects: [{ kind: 'dust', intensity: 0.3 }],
      camera: { startScale: 1.02, endScale: 1.07, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: pirmas varpo dūžis per visą miestą
      text: null, holdMs: 1300,
    }),
    S('s13', `${A}/bg-varpo-kiemas.svg`, { // Belzatoro ranka ant vartų
      tint: 'rgba(200,30,30,0.12)',
      effects: [{ kind: 'embers', intensity: 0.45 }],
      characters: [{ characterId: 'belzatoras', pose: 'neutral', x: 62, height: 92, depth: 12, flip: true, entrance: 'fade' }],
      camera: { startScale: 1.03, endScale: 1.09, duration: 5, punchIn: true },
      speakerId: 'belzatoras',
      text: { lt: 'Atidaryk. Pietūs jau nusprendė, kad visi už tavęs mirę.', en: 'Open. The south has already decided that everyone behind you is dead.' },
    }),
    C('s14', `${A}/bg-varpo-kiemas.svg`, { // Prazaro atsakymas
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jie sprendžia, ką palikti. Aš sprendžiu, ką ginti.', en: 'They decide what to leave. I decide what to defend.' },
      holdMs: 500,
    }),
    C('s15', `${A}/bg-varpo-kiemas.svg`, { // antras dūžis, Kernius dingsta šachtoje
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 30, height: 90, depth: 12 },
        { characterId: 'kapitonas', pose: 'kovinis', x: 58, height: 88, depth: 11 },
      ],
      effects: [{ kind: 'dust', intensity: 0.35 }],
      sfxUrl: null, // PLACEHOLDER: antras varpo dūžis + suremiami skydai
      speakerId: 'prazaras', text: { lt: 'Dešimt dūžių. Nei vienu mažiau.', en: 'Ten tolls. Not one less.' },
    }),
    C('s16', `${A}/bg-varpo-kiemas.svg`, { // vartai lūžta
      tint: 'rgba(200,30,30,0.14)',
      effects: [{ kind: 'embers', intensity: 0.55 }, { kind: 'smoke', intensity: 0.4 }],
      camera: { startScale: 1.04, endScale: 1.12, duration: 2, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: vidinių vartų metalas lūžta
      text: null, holdMs: 1100,
    }),
  ],
}

export const m10post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    S('p01', `${A}/bg-varpo-kiemas.svg`, { // dešimtas dūžis
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.35 }],
      camera: { startScale: 1.02, endScale: 1.08, duration: 4, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: dešimtas dūžis, ilgas ir pilnas
      text: null, holdMs: 1500,
    }),
    S('p02', `${A}/bg-uolos-kapai.svg`, { // uolos kapai
      characters: [{ characterId: 'kernius', pose: 'knyga', x: 44, height: 88, depth: 12, entrance: 'slide-left' }],
      effects: [{ kind: 'dust', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: šachtos akmenų griūtis už nugaros
      text: null, holdMs: 1400,
    }),
    S('p03', `${A}/bg-varpo-kiemas.svg`, { // sužeistas valdovas
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'smoke', intensity: 0.45 }, { kind: 'magic', intensity: 0.4, color: 'rgba(200,30,30,0.35)' }],
      characters: [{ characterId: 'belzatoras', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true, dim: 0.2 }],
      camera: { startScale: 1.04, endScale: 1.1, duration: 4, shake: 'light' },
      text: null, holdMs: 1400,
    }),
    C('p04a', `${A}/bg-varpo-kiemas.svg`, { // pergalės riba
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'Jie išėjo.', en: 'They made it out.' },
    }),
    C('p04b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada laimėjom tai, dėl ko kovojom.', en: 'Then we won what we fought for.' },
      holdMs: 500,
    }),
    S('p05', `${A}/bg-krites-varngradas.svg`, { // kitos sienos griūva
      tint: 'rgba(200,30,30,0.09)',
      effects: [{ kind: 'smoke', intensity: 0.45 }],
      camera: { startScale: 1, endScale: 1.06, endX: -1, duration: 6 },
      sfxUrl: null, // PLACEHOLDER: tolimo miesto griūtys
      text: null, holdMs: 1300,
    }),
    C('p06', `${A}/bg-varpo-kiemas.svg`, { // likę gynėjai
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 34, height: 90, depth: 12 },
        { characterId: 'kapitonas', pose: 'kovinis', x: 62, height: 88, depth: 11 },
      ],
      effects: [{ kind: 'embers', intensity: 0.35 }],
      speakerId: 'prazaras', text: { lt: 'Varpas darbą baigė. Dabar laikom gatvę.', en: 'The bell has done its work. Now we hold the street.' },
      holdMs: 500,
    }),
    S('p07', `${A}/bg-inkvizicijos-kalva.svg`, { // užkarda stebi
      tint: 'rgba(200,30,30,0.05)',
      effects: [{ kind: 'fog', intensity: 0.25 }],
      camera: { startScale: 1, endScale: 1.05, duration: 6 },
      text: null, holdMs: 1300,
    }),
    C('p08a', `${A}/bg-inkvizicijos-kalva.svg`, { // ataskaita
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 88, depth: 12, flip: true }],
      speakerName: { lt: 'Inkvizicijos raštininkas', en: 'Inquisition scribe' },
      text: { lt: 'Centrinė siena krenta. Judėjimo per pietinę liniją nėra.', en: 'The central wall is falling. No movement across the southern line.' },
    }),
    C('p08b', `${A}/bg-inkvizicijos-kalva.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'antspaudas', x: 56, height: 90, depth: 12, flip: true }],
      sfxUrl: null, // PLACEHOLDER: balto vaško antspaudas
      speakerId: 'inkvizitorius', text: { lt: 'Pažymėkit: izoliacija išlaikyta.', en: 'Record it: the isolation held.' },
      holdMs: 600,
    }),
    S('p09', `${A}/bg-krites-varngradas.svg`, { // tyla, aušta
      tint: 'rgba(120,130,160,0.08)',
      effects: [{ kind: 'ash', intensity: 0.35 }],
      camera: { startScale: 1.05, endScale: 1, duration: 7 },
      musicUrl: null, // PLACEHOLDER: tyli epilogo muzika
      text: null, holdMs: 1600,
    }),
    S('p10a', `${A}/bg-uolos-kapai.svg`, { // knyga
      characters: [
        { characterId: 'kernius', pose: 'knyga', x: 40, height: 88, depth: 12 },
        { characterId: 'archyvare', pose: 'neutral', x: 72, height: 80, depth: 10, flip: true },
      ],
      speakerId: 'archyvare', text: { lt: 'Ar jie gali mus rasti per vardus?', en: 'Can they find us through the names?' },
    }),
    C('p10b', `${A}/bg-uolos-kapai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'knyga', x: 46, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Ne. Dabar vardai vėl priklauso jiems.', en: 'No. The names belong to them again now.' },
      holdMs: 600,
    }),
    S('p11', `${A}/bg-katakombos.svg`, { // po miestu — ženklas nutrupa
      effects: [{ kind: 'dust', intensity: 0.3 }],
      tint: 'rgba(240,220,180,0.05)',
      camera: { startScale: 1, endScale: 1.08, duration: 5, punchIn: true },
      text: null, holdMs: 1300,
    }),
    S('p12', `${A}/bg-krites-varngradas.svg`, { // pirmas judesys
      tint: 'rgba(220,215,200,0.07)',
      effects: [{ kind: 'ash', intensity: 0.3 }],
      camera: { startScale: 1.04, endScale: 1.1, duration: 5 },
      text: null, holdMs: 1300,
    }),
    S('p13', `${A}/bg-krites-varngradas.svg`, { // siluetai atsisuka į pietus
      tint: 'rgba(120,130,160,0.1)',
      effects: [{ kind: 'fog', intensity: 0.35 }],
      camera: { startScale: 1, endScale: 1.06, endX: 1, duration: 6 },
      text: null, holdMs: 1300,
    }),
    S('p14', `${A}/bg-varpo-kiemas.svg`, { // Prazaro ženklas — ranka iš griuvėsių
      tint: 'rgba(120,130,160,0.1)',
      effects: [{ kind: 'dust', intensity: 0.35 }],
      camera: { startScale: 1.06, endScale: 1.12, startY: 1, endY: 0, duration: 5, punchIn: true },
      text: null, holdMs: 1500,
    }),
    S('p15', `${A}/bg-inkvizicijos-kalva.svg`, { // Inkvizicijos klaida
      tint: 'rgba(120,130,160,0.08)',
      effects: [{ kind: 'fog', intensity: 0.3 }],
      speakerName: { lt: 'Pasakotojas', en: 'Narrator' },
      text: {
        lt: 'Inkvizicija laukė, kol Varngradas numirs. Ji nepaklausė, ką miestas darys po mirties.',
        en: 'The Inquisition waited for Varngrad to die. It never asked what the city would do after death.',
      },
    }),
    S('p16', `${A}/bg-krites-varngradas.svg`, { // Mirties maršo pradžia
      transition: { type: 'ink', duration: 600 },
      tint: 'rgba(90,140,220,0.06)',
      effects: [{ kind: 'ash', intensity: 0.4 }, { kind: 'magic', intensity: 0.3, color: 'rgba(120,180,255,0.25)' }],
      camera: { startScale: 1, endScale: 1.08, duration: 8 },
      musicUrl: null, // PLACEHOLDER: Mirties maršo motyvas
      speakerName: { lt: 'Pasakotojas', en: 'Narrator' },
      text: {
        lt: 'Varngradas nebegrįžo prašyti pagalbos. Jis grįžo jos atsiimti.',
        en: 'Varngrad did not come back to ask for help. It came back to take it.',
      },
      holdMs: 1200,
    }),
  ],
}

export const m10fail = [
  { characterName: 'Prazaras', text: 'Dar ne. Kernius vis dar po mumis. Laikykit varpą.' },
  { characterName: 'Ordino kapitonas', text: 'Pirma eilė prie vartų. Iš naujo.' },
]
