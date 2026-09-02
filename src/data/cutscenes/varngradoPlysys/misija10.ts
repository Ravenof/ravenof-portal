// ════════════════════════════════════════════════════════════════════════════
// M10 „Paskutinis varpas" — V3 (finalinė)
// PRE „Dešimt dūžių" (26 beat'ai → 33 shots, ~4:30) +
// POST „Po mirties" (19 beat'ų → 24 shots, epilogas) + FAIL.
// LOCK: PRE baigiasi Belzatorui išlaužus vartus ir perskėlus varpo atramą —
// pirmas tikslas „Per 2 ėjimus išstumk Belzatorą iš varpo zonos ir
// stabilizuok atramą"; dūžių skaitiklis prasideda 0/10.
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m10pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // ── A. Tai, ką dar turime ──
    // 01 — Paskutinė duona (Prazaro gabalas lieka ant stalo)
    S('s01', `${A}/bg-varpo-kiemas.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(240,220,180,0.05)',
      camera: { startScale: 1, endScale: 1.05, duration: 8 },
      characters: [{ characterId: 'intendantas', pose: 'neutral', x: 62, height: 80, depth: 10, flip: true, dim: 0.1 }],
      text: null, holdMs: 2500,
    }),
    // 02 — Vaistai veikia
    C('s02a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 36, height: 84, depth: 11 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 66, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'gydytoja', text: { lt: 'Po mūšio ranka nebedirbs.', en: 'After the battle, this hand will not work again.' },
    }),
    C('s02b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 48, height: 88, depth: 12 }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Tada jai reikia dirbti iki mūšio pabaigos.', en: 'Then it needs to work until the battle ends.' },
      holdMs: 600,
    }),
    // 03 — Ordino likutis
    C('s03a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 56, height: 90, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'Trisdešimt du skydai.', en: 'Thirty-two shields.' },
    }),
    C('s03b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Užtenka vienai sienai.', en: 'Enough for one wall.' },
      holdMs: 500,
    }),
    // 04 — Sienų ataskaita (be epinio neigimo)
    C('s04', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 44, height: 88, depth: 12 }],
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Šiauriniai vartai pralaužti. Rytinis bokštas nebeatsako. Iki centrinės sienos — viena gatvė.', en: 'The north gates are breached. The east tower no longer answers. One street left to the central wall.' },
      holdMs: 800,
    }),
    // ── B. Kernius randa vieną kelią ──
    // 05 — Belzatoras ateina pats
    S('s05', `${A}/bg-krites-varngradas.svg`, {
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'smoke', intensity: 0.4 }],
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 24, height: 88, depth: 12 },
        { characterId: 'belzatoras', pose: 'neutral', x: 74, height: 62, bottom: 8, depth: 9, dim: 0.15, entrance: 'fade' },
      ],
      camera: { startScale: 1, endScale: 1.08, endX: 1, duration: 6 },
      speakerId: 'kernius', text: { lt: 'Jis ateina prie centrinės sienos.', en: 'He is coming to the central wall.' },
      holdMs: 600,
    }),
    // 06 — Žemėlapis baigėsi
    C('s06a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Vartų kelio neliko.', en: 'There is no gate road left.' },
    }),
    C('s06b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 56, height: 90, depth: 12, flip: true }],
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.28)' }],
      speakerId: 'kernius', text: { lt: 'Liko kelias, kuris nebuvo skirtas gyviesiems.', en: 'One road remains — a road never meant for the living.' },
      holdMs: 700,
    }),
    // 07 — Užmūryta šachta
    S('s07a', `${A}/bg-varpo-kiemas.svg`, {
      effects: [{ kind: 'dust', intensity: 0.25 }],
      characters: [{ characterId: 'archyvare', pose: 'neutral', x: 60, height: 82, depth: 11, flip: true }],
      camera: { startScale: 1.02, endScale: 1.08, startY: -1, endY: 1, duration: 5 },
      speakerId: 'archyvare',
      text: { lt: 'Juo vardų lenteles nešdavo į uolos kapus. Viršutinė dalis užgriuvusi.', en: 'Name tablets were carried down it to the rock tombs. The upper part has collapsed.' },
    }),
    C('s07b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 48, height: 90, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.3)' }],
      speakerId: 'kernius', text: { lt: 'Ne visa. Akis rodo tarpą už griūties.', en: 'Not all of it. The eye shows a gap beyond the fall.' },
    }),
    // 08 — Kodėl ne visas miestas
    C('s08a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Kiek žmonių spės?', en: 'How many will make it through?' },
    }),
    C('s08b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 56, height: 90, depth: 12, flip: true }],
      speakerId: 'kernius', text: { lt: 'Nedaug. Ir tik kol varpo siena stovi.', en: 'Not many. And only while the bell wall stands.' },
      holdMs: 800, // uždaro klausimą, kodėl tai ne masinė evakuacija
    }),
    // ── C. Kas bus išnešta ──
    // 09 — Išgyvenusieji (be žodžių: Gydytoja renka pagal tai, kas pralįs)
    S('s09', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 42, height: 84, depth: 11 }],
      tint: 'rgba(240,220,180,0.04)',
      text: null, holdMs: 1500,
    }),
    // 10 — Mergaitė su varnu (be žodžių: paduoda žaislą jaunesniam vaikui)
    C('s10', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'mergaite', pose: 'neutral', x: 50, height: 52, bottom: -6, depth: 10 }],
      tint: 'rgba(240,220,180,0.05)',
      text: null, holdMs: 1600,
    }),
    // 11 — Vardų knyga
    C('s11a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'archyvare', pose: 'neutral', x: 44, height: 86, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.2, color: 'rgba(240,220,180,0.25)' }],
      speakerId: 'archyvare', text: { lt: 'Jei knyga liks, jie ras vardus.', en: 'If the book stays, they will find the names.' },
    }),
    C('s11b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 54, height: 90, depth: 12, flip: true }],
      speakerId: 'kernius', text: { lt: 'Jei išnešim, Belzatoras nebežinos, ką perrašyti.', en: 'If we carry it out, Belzataras will not know what to rewrite.' },
      holdMs: 500,
    }),
    // 12 — Prazaro įsakymas Kerniui
    C('s12a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
        { characterId: 'kernius', pose: 'knyga', x: 66, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'kernius',
      text: { lt: 'Pirmą kartą iš bokšto pabėgau su žinia. Daugiau nebėgsiu.', en: 'The first time, I fled the tower with a message. I will not run again.' },
    }),
    C('s12b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
        { characterId: 'kernius', pose: 'knyga', x: 66, height: 86, depth: 11, flip: true, dim: 0.15 },
      ],
      speakerId: 'prazaras', text: { lt: 'Todėl šįkart ne bėgsi. Išneši vardus.', en: 'That is why this time you do not run. You carry out the names.' },
      holdMs: 700,
    }),
    // 13 — Kas išneš Prazarą
    C('s13a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'knyga', x: 52, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'O kas išneš tavo vardą?', en: 'And who carries out your name?' },
    }),
    C('s13b', `${A}/bg-varpo-kiemas.svg`, { // atverčia knygą — vardas jau gyvųjų gynėjų sąraše
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 42, height: 92, depth: 12 }],
      tint: 'rgba(240,220,180,0.05)',
      camera: { startScale: 1.03, endScale: 1.08, duration: 4, punchIn: true },
      speakerId: 'prazaras', text: { lt: 'Jis jau ten.', en: 'It is already there.' },
      holdMs: 1000, // vienintelė simboliškesnė replika — vaizdas paaiškina prasmę
    }),
    // ── D. Kas lieka ──
    // 14 — Gydytojos pasirinkimas
    C('s14a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
        { characterId: 'gydytoja', pose: 'neutral', x: 64, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Vesk juos per šachtą.', en: 'Lead them through the shaft.' },
    }),
    C('s14b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 46, height: 88, depth: 12 }],
      speakerId: 'gydytoja', text: { lt: 'Gydykloje dar yra žmonių.', en: 'There are still people in the infirmary.' },
    }),
    C('s14c', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Todėl jiems reikia gydytojos ir kitoje pusėje.', en: 'Which is why they need a healer on the other side too.' },
      holdMs: 800, // priima įsakymą ne iš karto; paima medicinos krepšį
    }),
    // 15 — Vartų kapitonas
    C('s15', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 46, height: 90, depth: 12 }],
      speakerId: 'vartu-kapitonas',
      text: { lt: 'Ketverias dienas sakiau, kada vartus užverti. Dabar liksiu prie paskutinių.', en: 'For four days I said when to close the gates. Now I stay at the last ones.' },
      holdMs: 800, // Prazaras nesiginčija — konfliktas uždaromas bendru sprendimu
    }),
    // 16 — Ordino kapitonas
    C('s16a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
        { characterId: 'kapitonas', pose: 'neutral', x: 66, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Tavo žmonės neprivalo mirti už Varngradą.', en: 'Your men do not have to die for Varngrad.' },
    }),
    C('s16b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 50, height: 92, depth: 12 }],
      speakerId: 'kapitonas',
      text: { lt: 'Jie miršta stabdydami Demonų ordą. Miesto vardas už mūsų nekeičia darbo.', en: 'They die stopping the Demon Horde. The name of the city behind us does not change the work.' },
      holdMs: 800,
    }),
    // ── E. Dešimties dūžių planas ──
    // 17 — Laiko matas
    C('s17', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Vienas dūžis — vienas praėjimo tarpas. Po dešimto paskutinis žmogus turi būti už griūties.', en: 'One toll — one passing interval. After the tenth, the last person must be beyond the fall.' },
    }),
    // 18 — Jei varpas sustos
    C('s18a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 58, height: 88, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'O jei varpas kris po devinto?', en: 'And if the bell falls after the ninth?' },
    }),
    C('s18b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada laikysim atramą rankomis.', en: 'Then we hold the beam with our hands.' },
      holdMs: 1000, // vėliau tampa realia gameplay mechanika
    }),
    // 19 — Pirmi žmonės leidžiasi (be žodžių)
    S('s19', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 32, height: 80, depth: 11 },
        { characterId: 'mergaite', pose: 'neutral', x: 56, height: 48, bottom: -8, depth: 10 },
        { characterId: 'kernius', pose: 'knyga', x: 80, height: 84, depth: 11, flip: true, dim: 0.15 },
      ],
      effects: [{ kind: 'dust', intensity: 0.25 }],
      text: null, holdMs: 1600,
    }),
    // 20 — Neskubintas atsisveikinimas
    C('s20a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12 },
        { characterId: 'kernius', pose: 'knyga', x: 66, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'prazaras',
      text: { lt: 'Dargis atsiuntė tave su pirmu perspėjimu. Tu išneši paskutinį.', en: 'Dargis sent you with the first warning. You will carry out the last.' },
    }),
    C('s20b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12, dim: 0.2 },
        { characterId: 'kernius', pose: 'knyga', x: 66, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'Kokį?', en: 'Which one?' },
    }),
    C('s20c', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Kad Varngradas žinojo, kas jį paliko.', en: 'That Varngrad knew who abandoned it.' },
      holdMs: 1200, // pauzė; Kernius nusileidžia į šachtą
    }),
    // ── F. Belzatoras prie vartų ──
    // 21 — Ranka ant virvės (be žodžių)
    S('s21', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      camera: { startScale: 1.02, endScale: 1.07, duration: 4 },
      text: null, holdMs: 1300, // pirmas dūžis dar nespėja suskambėti
    }),
    // 22 — Tyla už vartų
    C('s22', `${A}/bg-varpo-kiemas.svg`, {
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'embers', intensity: 0.4 }],
      camera: { startScale: 1.03, endScale: 1.08, duration: 3, punchIn: true },
      sfxUrl: null, // PLACEHOLDER: visi maži demonai nutyla; metalas aplink ranką parausta
      text: null, holdMs: 1400,
    }),
    // 23 — Jo pasiūlymas
    C('s23a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'belzatoras', pose: 'neutral', x: 60, height: 92, depth: 12, flip: true, entrance: 'fade' }],
      tint: 'rgba(200,30,30,0.12)',
      effects: [{ kind: 'embers', intensity: 0.45 }],
      speakerId: 'belzatoras',
      text: { lt: 'Atidaryk. Pietūs jau nusprendė, kad visi už tavęs mirę.', en: 'Open. The south has already decided that everyone behind you is dead.' },
    }),
    C('s23b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jie sprendžia, ką palikti. Aš sprendžiu, ką ginti.', en: 'They decide what to leave. I decide what to defend.' },
      holdMs: 1000,
    }),
    // 24 — Vartai lūžta
    S('s24', `${A}/bg-varpo-kiemas.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(200,30,30,0.14)',
      effects: [{ kind: 'embers', intensity: 0.55 }, { kind: 'smoke', intensity: 0.4 }],
      camera: { startScale: 1.05, endScale: 1.12, duration: 2, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: vartų centras įlinksta ir trūksta; geležies gabalai į kiemą
      text: null, holdMs: 1200,
    }),
    // 25 — Smūgis į varpą (ne į Prazarą!)
    C('s25', `${A}/bg-varpo-kiemas.svg`, {
      tint: 'rgba(200,30,30,0.12)',
      effects: [{ kind: 'dust', intensity: 0.55 }],
      camera: { startScale: 1.05, endScale: 1.11, duration: 2, shake: 'heavy' },
      characters: [{ characterId: 'belzatoras', pose: 'neutral', x: 58, height: 94, depth: 12, flip: true }],
      sfxUrl: null, // PLACEHOLDER: ginklas perskelia akmeninę siją; varpas pasvyra
      text: null, holdMs: 1200, // virvė išslysta iš Prazaro rankos
    }),
    // 26 — Pirmas gameplay tikslas → kova
    C('s26', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 26, height: 90, depth: 12 },
        { characterId: 'kapitonas', pose: 'kovinis', x: 48, height: 88, depth: 11 },
        { characterId: 'belzatoras', pose: 'neutral', x: 76, height: 92, depth: 12, flip: true, dim: 0.1 },
      ],
      effects: [{ kind: 'embers', intensity: 0.45 }, { kind: 'dust', intensity: 0.35 }],
      camera: { startScale: 1.04, endScale: 1.1, duration: 3, punchIn: true },
      speakerId: 'prazaras',
      text: { lt: 'Atstumkit jį nuo varpo! Pirmas dūžis prasidės tik tada, kai atrama laikys!', en: 'Push him away from the bell! The first toll begins only when the beam holds!' },
      holdMs: 700, // UI atsiranda; 0 ėjime atrama netenka HP, skaitiklis 0/10
    }),
  ],
}

export const m10post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // ── A. Tai, ką žaidėjas laimėjo ──
    // 01 — Dešimtas dūžis
    S('p01', `${A}/bg-varpo-kiemas.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.35 }],
      camera: { startScale: 1.02, endScale: 1.08, duration: 4, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: dešimtas dūžis — ilgas; per varpą eina įtrūkimas
      text: null, holdMs: 1600,
    }),
    // 02 — Uolos kapai
    S('p02', `${A}/bg-uolos-kapai.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'knyga', x: 42, height: 88, depth: 12, entrance: 'slide-left' },
        { characterId: 'gydytoja', pose: 'neutral', x: 72, height: 80, depth: 10, flip: true },
      ],
      effects: [{ kind: 'dust', intensity: 0.3 }],
      text: null, holdMs: 1500,
    }),
    // 03 — Paskutinis vaikas (mergaitė + jaunesnis vaikas su varnu)
    C('p03', `${A}/bg-uolos-kapai.svg`, {
      characters: [{ characterId: 'mergaite', pose: 'neutral', x: 50, height: 54, bottom: -6, depth: 10, entrance: 'slide-left' }],
      tint: 'rgba(240,220,180,0.05)',
      sfxUrl: null, // PLACEHOLDER: šachtos anga pradeda griūti
      text: null, holdMs: 1400,
    }),
    // 04 — Kernius užveria kelią (be žodžių: netenka kelio atgal savo sprendimu)
    C('p04', `${A}/bg-uolos-kapai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 44, height: 88, depth: 12 }],
      effects: [{ kind: 'dust', intensity: 0.45 }],
      camera: { startScale: 1.03, endScale: 1.07, duration: 3, shake: 'light' },
      sfxUrl: null, // PLACEHOLDER: ištraukiama paskutinė atrama; akmenys uždaro tunelį
      text: null, holdMs: 1400,
    }),
    // 05 — Belzatoras sužeistas
    S('p05', `${A}/bg-varpo-kiemas.svg`, {
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'smoke', intensity: 0.45 }, { kind: 'magic', intensity: 0.45, color: 'rgba(200,30,30,0.38)' }],
      characters: [{ characterId: 'belzatoras', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true, dim: 0.2 }],
      camera: { startScale: 1.04, endScale: 1.1, duration: 4 },
      text: null, holdMs: 1500, // raudonai juoda tuštuma; Orda praranda ritmą
    }),
    // 06 — Pergalės prasmė
    C('p06a', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'Dešimt.', en: 'Ten.' },
    }),
    C('p06b', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tiek ir reikėjo.', en: 'That is all we needed.' },
      holdMs: 900,
    }),
    // ── B. Miestas krinta po pergalės ──
    // 07 — Rytinė siena (griūtis PO pergalės)
    S('p07', `${A}/bg-krites-varngradas.svg`, {
      tint: 'rgba(200,30,30,0.09)',
      effects: [{ kind: 'smoke', intensity: 0.45 }],
      camera: { startScale: 1, endScale: 1.06, endX: -1, duration: 6 },
      sfxUrl: null, // PLACEHOLDER: didelė griūtis iš rytų; du signalai užgęsta
      text: null, holdMs: 1500,
    }),
    // 08 — Ne dar viena gynybos misija
    C('p08', `${A}/bg-varpo-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 38, height: 92, depth: 12 }],
      effects: [{ kind: 'embers', intensity: 0.35 }],
      speakerId: 'prazaras', text: { lt: 'Varpas darbą baigė. Kas dar gali stovėti — su manim į gatvę.', en: 'The bell has done its work. Whoever can still stand — with me, into the street.' },
      holdMs: 800,
    }),
    // 09 — Paskutinė bendra linija (likimas už kadro)
    S('p09', `${A}/bg-varpo-kiemas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 28, height: 88, depth: 12 },
        { characterId: 'kapitonas', pose: 'kovinis', x: 52, height: 86, depth: 11 },
        { characterId: 'vartu-kapitonas', pose: 'neutral', x: 76, height: 84, depth: 11, flip: true },
      ],
      effects: [{ kind: 'embers', intensity: 0.4 }, { kind: 'smoke', intensity: 0.3 }],
      camera: { startScale: 1.02, endScale: 1.07, duration: 5 },
      text: null, holdMs: 1600,
    }),
    // ── C. Inkvizicijos ataskaita ──
    // 10 — Kalva (nė vienas dalinys nejuda)
    S('p10', `${A}/bg-inkvizicijos-kalva.svg`, {
      tint: 'rgba(200,30,30,0.05)',
      effects: [{ kind: 'fog', intensity: 0.25 }],
      camera: { startScale: 1, endScale: 1.05, duration: 6 },
      text: null, holdMs: 1400,
    }),
    // 11 — Baltas sakinys
    C('p11a', `${A}/bg-inkvizicijos-kalva.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 58, height: 88, depth: 12, flip: true }],
      speakerName: { lt: 'Inkvizicijos raštininkas', en: 'Inquisition scribe' },
      text: { lt: 'Centrinė siena krenta. Judėjimo per pietinę liniją nėra.', en: 'The central wall is falling. No movement across the southern line.' },
    }),
    C('p11b', `${A}/bg-inkvizicijos-kalva.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'antspaudas', x: 56, height: 90, depth: 12, flip: true }],
      sfxUrl: null, // PLACEHOLDER: baltas antspaudas
      speakerId: 'inkvizitorius', text: { lt: 'Pažymėkit: izoliacija išlaikyta.', en: 'Record it: the isolation held.' },
      holdMs: 700,
    }),
    // 12 — Oficiali pabaiga (be žodžių: miestas mirė, protokolas veikė)
    C('p12', `${A}/bg-inkvizicijos-kalva.svg`, {
      tint: 'rgba(220,215,200,0.08)',
      camera: { startScale: 1.04, endScale: 1.08, duration: 4 },
      text: null, holdMs: 1300,
    }),
    // ── D. Vardai išliko ──
    // 13 — Knyga atverčiama
    S('p13a', `${A}/bg-uolos-kapai.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'knyga', x: 40, height: 88, depth: 12 },
        { characterId: 'archyvare', pose: 'neutral', x: 72, height: 80, depth: 10, flip: true },
      ],
      speakerId: 'archyvare', text: { lt: 'Ar Belzatoras gali juos rasti per knygą?', en: 'Can Belzataras find them through the book?' },
    }),
    C('p13b', `${A}/bg-uolos-kapai.svg`, {
      characters: [{ characterId: 'kernius', pose: 'knyga', x: 46, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Ne. Dabar vardai vėl priklauso jiems.', en: 'No. The names belong to them again now.' },
      holdMs: 700,
    }),
    // 14 — Gydytojos klausimas
    C('p14', `${A}/bg-uolos-kapai.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 36, height: 84, depth: 11 },
        { characterId: 'kernius', pose: 'knyga', x: 66, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'gydytoja', text: { lt: 'Kas liko viduje?', en: 'Who is left inside?' },
      holdMs: 1200, // Kernius neatsako skaičiumi — padeda ranką ant knygos
    }),
    // ── E. Miestas atsako ──
    // 15 — Pirmas vardas
    S('p15', `${A}/bg-katakombos.svg`, {
      effects: [{ kind: 'dust', intensity: 0.3 }],
      tint: 'rgba(240,220,180,0.05)',
      camera: { startScale: 1, endScale: 1.08, duration: 5, punchIn: true },
      sfxUrl: null, // PLACEHOLDER: ženklo likučiai nutrupa; išryškėja tikras vardas
      text: null, holdMs: 1400,
    }),
    // 16 — Pirmas judesys (akyse — baltas antspaudas, ne violetinė šviesa)
    S('p16', `${A}/bg-krites-varngradas.svg`, {
      tint: 'rgba(220,215,200,0.07)',
      effects: [{ kind: 'ash', intensity: 0.3 }],
      camera: { startScale: 1.04, endScale: 1.1, duration: 5 },
      text: null, holdMs: 1400,
    }),
    // 17 — Ne Ordos kariai (siluetai atsisuka į pietinę kalvą)
    S('p17', `${A}/bg-krites-varngradas.svg`, {
      tint: 'rgba(120,130,160,0.1)',
      effects: [{ kind: 'fog', intensity: 0.35 }],
      camera: { startScale: 1, endScale: 1.06, endX: 1, duration: 6 },
      text: null, holdMs: 1400,
    }),
    // 18 — Maršalo žiedas (veidas nerodomas)
    S('p18', `${A}/bg-varpo-kiemas.svg`, {
      tint: 'rgba(120,130,160,0.1)',
      effects: [{ kind: 'dust', intensity: 0.35 }],
      camera: { startScale: 1.06, endScale: 1.12, startY: 1, endY: 0, duration: 5, punchIn: true },
      sfxUrl: null, // PLACEHOLDER: iš griuvėsių išlenda ranka su sulaužytu maršalo žiedu
      text: null, holdMs: 1600,
    }),
    // 19 — Mirties maršo pradžia
    S('p19a', `${A}/bg-inkvizicijos-kalva.svg`, {
      tint: 'rgba(120,130,160,0.08)',
      effects: [{ kind: 'fog', intensity: 0.3 }],
      speakerName: { lt: 'Pasakotojas', en: 'Narrator' },
      text: {
        lt: 'Inkvizicija laukė, kol Varngradas numirs. Ji nepaklausė, ką miestas darys po mirties.',
        en: 'The Inquisition waited for Varngrad to die. It never asked what the city would do after death.',
      },
      holdMs: 800,
    }),
    S('p19b', `${A}/bg-krites-varngradas.svg`, {
      transition: { type: 'ink', duration: 600 },
      tint: 'rgba(90,140,220,0.06)',
      effects: [{ kind: 'ash', intensity: 0.4 }, { kind: 'magic', intensity: 0.3, color: 'rgba(120,180,255,0.25)' }],
      camera: { startScale: 1, endScale: 1.08, duration: 8 },
      musicUrl: null, // PLACEHOLDER: tyli epilogo muzika → Mirties maršo motyvas
      speakerName: { lt: 'Pasakotojas', en: 'Narrator' },
      text: {
        lt: 'Kai Varngrado vartai vėl atsivėrė, jo mirusieji ėjo ne prašyti pagalbos. Jie ėjo pas tuos, kurie vartus užvėrė.',
        en: 'When Varngrad’s gates opened again, its dead did not go to ask for help. They went to those who had closed the gates.',
      },
      holdMs: 1400, // juodas ekranas — kampanijos pabaiga
    }),
  ],
}

export const m10fail = [
  { characterName: 'Prazaras', text: 'Dūžių dar nėra. Pirma atitraukiam jį nuo varpo ir sutvirtinam siją.' },
]
