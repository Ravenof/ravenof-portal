// ════════════════════════════════════════════════════════════════════════════
// M7 „Balto vaško įsakymas" — V3
// PRE „Sprendimas, parašytas iš anksto" (21 beat'as → 27 shots, ~3:30) +
// POST „Balta riba" (13 beat'ų → 17 shots) + FAIL.
// LOCK: PRE baigiasi demonui tempiant Gydytoją ir degant užuolaidai — pirmas
// tikslas „Per 2 ėjimus išlaisvink Gydytoją ir užgesink pirmą ugnį".
// Tarybos salė = bg-karo-kambarys (bendras kampanijos fonas).
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m07pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // ── A. Prieš tarybą ──
    // 01 — Kerniaus patikra
    S('s01a', `${A}/bg-gydykla.svg`, {
      transition: { type: 'cut' },
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 36, height: 84, depth: 11 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'gydytoja', text: { lt: 'Vakar būčiau liepusi tave užrakinti.', en: 'Yesterday I would have had you locked up.' },
    }),
    C('s01b', `${A}/bg-gydykla.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 36, height: 84, depth: 11, dim: 0.2 },
        { characterId: 'kernius', pose: 'akis', x: 66, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'Šiandien?', en: 'And today?' },
    }),
    C('s01c', `${A}/bg-gydykla.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 44, height: 88, depth: 12 }],
      speakerId: 'gydytoja',
      text: { lt: 'Šiandien mačiau, ką būtume praradę katakombose.', en: 'Today I saw what we would have lost in the catacombs.' },
      holdMs: 700, // vis tiek užveržia plokštelę — pasitikėjimas nereiškia neatsargumo
    }),
    // 02 — Kas dalyvaus
    C('s02a', `${A}/bg-gydykla.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 36, height: 86, depth: 12 },
        { characterId: 'prazaras', pose: 'neutral', x: 70, height: 88, depth: 12, flip: true },
      ],
      speakerId: 'gydytoja', text: { lt: 'Jis nėra įrodymas nei vienai pusei. Jis sužeistas žmogus.', en: 'He is not evidence for either side. He is a wounded man.' },
    }),
    C('s02b', `${A}/bg-gydykla.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 40, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Todėl jis kalbės pats.', en: 'Which is why he will speak for himself.' },
      holdMs: 700,
    }),
    // ── B. Inkvizicijos sąlygos ──
    // 03 — Tarybos stalas (establishing; neatplėštas ritinys su baltu vašku)
    S('s03', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 20, height: 86, depth: 12 },
        { characterId: 'kernius', pose: 'neutral', x: 40, height: 80, depth: 11, dim: 0.15 },
        { characterId: 'kapitonas', pose: 'neutral', x: 58, height: 82, depth: 11, dim: 0.15 },
        { characterId: 'inkvizitorius', pose: 'neutral', x: 82, height: 86, depth: 12, flip: true },
      ],
      camera: { startScale: 1, endScale: 1.06, duration: 7 },
      text: null, holdMs: 2500,
    }),
    // 04 — Izoliacija
    C('s04a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Visi išoriniai keliai uždaromi. Žmonės ir kroviniai lieka rizikos zonoje iki patikros pabaigos.', en: 'All outer roads close. People and cargo remain in the risk zone until inspection ends.' },
    }),
    C('s04b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Kiek truks patikra?', en: 'How long will the inspection take?' },
    }),
    C('s04c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Kol neliks plitimo rizikos.', en: 'Until there is no risk of spread.' },
      holdMs: 700, // sąmoningai neapibrėžtas terminas
    }),
    // 05 — Ko reikia miestui
    C('s05a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 90, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Mums reikia trijų vaistų vežimų ir maisto. Patikrinkit krovinį, nepalikdami jo už sienos.', en: 'We need three wagons of medicine and food. Inspect the cargo without leaving it outside the wall.' },
    }),
    C('s05b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Joks krovinys neįžengs, kol mieste yra aktyvus demoniškas žymėjimas.', en: 'No cargo enters while active demonic marking remains in the city.' },
    }),
    // 06 — Kernius
    C('s06a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Sargybinis perduodamas mums.', en: 'The watchman is handed over to us.' },
    }),
    C('s06b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 44, height: 90, depth: 12 }],
      speakerId: 'kernius',
      text: { lt: 'Jei būčiau vartai, jie jau būtų šitoje salėje.', en: 'If I were their gate, they would already be in this hall.' },
    }),
    C('s06c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Jie jau buvo tavo akyje.', en: 'They were already in your eye.' },
      holdMs: 600,
    }),
    // 07 — Prazaro riba
    C('s07a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Kernius lieka Varngrade. Gali jį patikrinti čia, dalyvaujant mūsų gydytojai.', en: 'Kernius stays in Varngrad. You may examine him here, with our healer present.' },
    }),
    C('s07b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Tai ne derybų punktas.', en: 'That is not a point of negotiation.' },
    }),
    C('s07c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada neįtraukit jo į derybas.', en: 'Then keep him out of the negotiation.' },
      holdMs: 800,
    }),
    // ── C. Ordinas nėra Inkvizicija ──
    // 08 — Kapitono žmonės
    C('s08a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 42, height: 90, depth: 12 }],
      speakerId: 'kapitonas',
      text: { lt: 'Mano vyrai perėjo tą pačią demonų liniją. Juos irgi uždarysit mieste?', en: 'My men crossed the same demon line. Will you seal them in the city too?' },
    }),
    C('s08b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Jie patys įžengė į rizikos zoną.', en: 'They entered the risk zone of their own accord.' },
    }),
    C('s08c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 44, height: 92, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'Nes už jos buvo žmonių.', en: 'Because there were people behind it.' },
      holdMs: 600,
    }),
    // 09 — Būtinoji kaina dar nepasakyta
    C('s09a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Vieno miesto išgelbėjimas negali kelti pavojaus visam Ravenorui.', en: 'Saving one city cannot endanger all of Ravenor.' },
    }),
    C('s09b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Kol kas jūs negelbėjat nei vieno, nei kito.', en: 'So far you are saving neither.' },
      holdMs: 700,
    }),
    // ── D. Dingstis atsiranda ──
    // 10 — Metalinis dubuo
    S('s10', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 50, height: 92, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      camera: { startScale: 1.03, endScale: 1.08, duration: 3, punchIn: true },
      sfxUrl: null, // PLACEHOLDER: metalinio dubens kritimas gydykloje
      speakerId: 'kernius', text: { lt: 'Tylos.', en: 'Quiet.' },
      holdMs: 700,
    }),
    // 11 — Vienodas balsas
    C('s11', `${A}/bg-karo-kambarys.svg`, {
      tint: 'rgba(200,30,30,0.06)',
      sfxUrl: null, // PLACEHOLDER: keli žmonės vienu ritmu taria tą patį žodį
      speakerName: { lt: 'Užvaldytųjų choras', en: 'Chorus of the possessed' },
      text: { lt: 'Atidarykit.', en: 'Open.' },
      holdMs: 800,
    }),
    // 12 — Gydytoja viena
    S('s12a', `${A}/bg-gydykla.svg`, {
      transition: { type: 'wipe-left', duration: 380 },
      effects: [{ kind: 'smoke', intensity: 0.35 }],
      tint: 'rgba(200,30,30,0.06)',
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 40, height: 86, depth: 12 }],
      speakerId: 'gydytoja', text: { lt: 'Žiūrėk į mane. Pasakyk savo vardą.', en: 'Look at me. Say your name.' },
      holdMs: 800, // iš burnos išeina juodas dūmas
    }),
    // 13 — Inkvizitoriaus sprendimas
    C('s13', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 56, height: 92, depth: 12, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Užverti duris. Paruošti ugnį.', en: 'Seal the doors. Ready the fire.' },
      holdMs: 500, // deglai jau apvynioti alyvuotu audiniu
    }),
    // 14 — Įsakymas buvo numatytas
    C('s14a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Deglus atsinešėt į tarybą.', en: 'You brought torches to a council.' },
    }),
    C('s14b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Atėjome pasiruošę galimam protrūkiui.', en: 'We came prepared for a possible outbreak.' },
    }),
    C('s14c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Atėjot pasiruošę vienam atsakymui.', en: 'You came prepared for one answer.' },
      holdMs: 800,
    }),
    // ── E. Mūšis jau gydykloje ──
    // 15 — Pirmas žmogus sugriebiamas
    S('s15', `${A}/bg-gydykla.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'smoke', intensity: 0.4 }],
      tint: 'rgba(200,30,30,0.07)',
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 44, height: 84, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: užvaldytas sugriebia riešą; ji šaukia jį vardu
      text: null, holdMs: 1200,
    }),
    // 16 — Grindys lūžta
    C('s16', `${A}/bg-gydykla.svg`, {
      effects: [{ kind: 'dust', intensity: 0.5 }, { kind: 'smoke', intensity: 0.35 }],
      camera: { startScale: 1.03, endScale: 1.09, duration: 2, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: latako grotos; maži demonai iš apačios
      text: null, holdMs: 1100,
    }),
    // 17 — Pirmas deglas
    C('s17', `${A}/bg-gydykla.svg`, {
      tint: 'rgba(240,120,40,0.1)',
      effects: [{ kind: 'embers', intensity: 0.5 }],
      camera: { startScale: 1.04, endScale: 1.08, duration: 2 },
      sfxUrl: null, // PLACEHOLDER: deglas pro duris; užsidega užuolaida
      text: null, holdMs: 1100,
    }),
    // 18 — Prazaras pasirenka metodą
    C('s18', `${A}/bg-gydykla.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 36, height: 92, depth: 12 }],
      effects: [{ kind: 'embers', intensity: 0.35 }, { kind: 'smoke', intensity: 0.3 }],
      speakerId: 'prazaras',
      text: { lt: 'Gesinam ugnį. Smogiam į dūmo židinį. Sužeistųjų nežudom.', en: 'Put out the fire. Strike the smoke’s source. We do not kill the wounded.' },
      holdMs: 1000,
    }),
    // 19 — Inkvizicijos terminas
    C('s19a', `${A}/bg-gydykla.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 88, depth: 12, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Jei per tris minutes patalpa nebus švari, ją sudeginsim iš išorės.', en: 'If the room is not clean in three minutes, we burn it from the outside.' },
    }),
    C('s19b', `${A}/bg-gydykla.svg`, {
      characters: [
        { characterId: 'kapitonas', pose: 'kovinis', x: 40, height: 90, depth: 12 },
        { characterId: 'prazaras', pose: 'kalavijas', x: 70, height: 88, depth: 11, flip: true, dim: 0.1 },
      ],
      speakerId: 'kapitonas', text: { lt: 'Tada turim tris minutes anksčiau už jūsų ugnį.', en: 'Then we have three minutes before your fire.' },
      holdMs: 500,
    }),
    // 20 — Gydytoja tempiama (be žodžių)
    S('s20', `${A}/bg-gydykla.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'smoke', intensity: 0.45 }, { kind: 'dust', intensity: 0.35 }],
      tint: 'rgba(200,30,30,0.09)',
      camera: { startScale: 1.05, endScale: 1.1, duration: 2, shake: 'light' },
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 48, height: 66, bottom: -14, depth: 11 }],
      sfxUrl: null, // PLACEHOLDER: demonas tempia už kojos link angos
      text: null, holdMs: 1100,
    }),
    // 21 — Tiesioginis handoff → kova
    C('s21', `${A}/bg-gydykla.svg`, {
      effects: [{ kind: 'embers', intensity: 0.4 }, { kind: 'dust', intensity: 0.35 }],
      camera: { startScale: 1.05, endScale: 1.11, duration: 2, shake: 'heavy' },
      characters: [
        { characterId: 'prazaras', pose: 'isako', x: 32, height: 92, depth: 12 },
        { characterId: 'gydytoja', pose: 'neutral', x: 62, height: 64, bottom: -14, depth: 11 },
      ],
      sfxUrl: null, // PLACEHOLDER: kalavijas įsminga į grindis tarp nagų ir kojos
      speakerId: 'prazaras',
      text: { lt: 'Pirma Gydytoja. Tada ugnis. Kerniau — rask židinį!', en: 'The Healer first. Then the fire. Kernius — find the source!' },
      holdMs: 700, // UI atsiranda ant šios kompozicijos; Prazaras lieka be ginklo
    }),
  ],
}

export const m07post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // 01 — Tikri balsai
    S('p01a', `${A}/bg-gydykla.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(240,220,180,0.05)',
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 60, height: 82, depth: 11, flip: true }],
      speakerName: { lt: 'Sužeistasis', en: 'Wounded man' },
      text: { lt: 'Ar aš ką nors sužeidžiau?', en: 'Did I hurt anyone?' },
    }),
    C('p01b', `${A}/bg-gydykla.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 48, height: 86, depth: 12 }],
      speakerId: 'gydytoja', text: { lt: 'Ne. Dabar gulėk.', en: 'No. Now lie still.' },
      holdMs: 700, // pirmiausia nuraminti, ne kaltinti
    }),
    // 02 — Ugnis sustabdyta (be žodžių: laukia daugiau deglų)
    S('p02', `${A}/bg-gydykla.svg`, {
      effects: [{ kind: 'smoke', intensity: 0.3 }],
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 42, height: 88, depth: 12 }],
      text: null, holdMs: 1300,
    }),
    // 03 — Įsakymas atverčiamas
    S('p03', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'inkvizitorius', pose: 'antspaudas', x: 62, height: 88, depth: 12, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Jis parašytas prieš išpuolį.', en: 'It was written before the attack.' },
    }),
    // 04 — Dingstis, ne priežastis
    C('p04a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Išpuolis patvirtino, kad priemonės būtinos.', en: 'The attack confirmed that the measures are necessary.' },
    }),
    C('p04b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Ne. Jis tik davė sakinį, kurį įrašysit po jau priimtu sprendimu.', en: 'No. It only gave you a sentence to write under a decision already made.' },
      holdMs: 600,
    }),
    // 05 — Antspaudas
    C('p05', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'antspaudas', x: 58, height: 92, depth: 12, flip: true }],
      sfxUrl: null, // PLACEHOLDER: balto vaško antspaudas
      camera: { startScale: 1.04, endScale: 1.1, duration: 4, punchIn: true },
      speakerId: 'inkvizitorius',
      text: { lt: 'Nuo šios akimirkos nė vienas Varngrado gyventojas neperžengs pietinės užkardos.', en: 'From this moment no resident of Varngrad crosses the southern barricade.' },
      holdMs: 800,
    }),
    // 06 — Ordino žmonės
    C('p06a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 42, height: 90, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'O mano sužeistieji?', en: 'And my wounded?' },
    }),
    C('p06b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 58, height: 90, depth: 12, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Jie įžengė į rizikos zoną savo valia.', en: 'They entered the risk zone of their own will.' },
      holdMs: 700, // kapitonas pasiima žuvusiųjų ženklus — diskusija jam baigta
    }),
    // 07 — Išėjimas iš miesto (be žodžių)
    S('p07', `${A}/bg-miesto-gatve.svg`, {
      effects: [{ kind: 'fog', intensity: 0.3 }],
      camera: { startScale: 1.05, endScale: 1, duration: 6 },
      sfxUrl: null, // PLACEHOLDER: tolstantys Inkvizicijos būgnai
      text: null, holdMs: 1300,
    }),
    // 08 — Žemėlapio žiedai
    S('p08', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'vartu-kapitonas', pose: 'neutral', x: 60, height: 88, depth: 12, flip: true }],
      speakerId: 'vartu-kapitonas', text: { lt: 'Jų ietys nukreiptos į miestą.', en: 'Their spears are pointed at the city.' },
      holdMs: 500,
    }),
    // 09 — Vienas tarpas
    C('p09', `${A}/bg-karo-kambarys.svg`, {
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 52, height: 92, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Vienas kelias dar neuždarytas.', en: 'One road is still open.' },
      holdMs: 500,
    }),
    // 10 — Gydytojos pasiūlymas
    C('p10', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 46, height: 88, depth: 12 }],
      speakerId: 'gydytoja',
      text: { lt: 'Nuvesiu sužeistuosius. Jei jų tikslas patikra, tegul patikrina mane pirmą.', en: 'I will lead the wounded. If inspection is their goal, let them inspect me first.' },
      holdMs: 500,
    }),
    // 11 — Kas važiuos (mergaitė tarp jų; daugiau tvarsčių nei reikia)
    S('p11a', `${A}/bg-miesto-gatve.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 32, height: 84, depth: 11 },
        { characterId: 'mergaite', pose: 'neutral', x: 56, height: 48, bottom: -6, depth: 10 },
        { characterId: 'kernius', pose: 'neutral', x: 80, height: 84, depth: 11, flip: true },
      ],
      speakerId: 'kernius', text: { lt: 'Tu nemanai, kad grįšim.', en: 'You do not think we are coming back.' },
    }),
    C('p11b', `${A}/bg-miesto-gatve.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 44, height: 88, depth: 12 }],
      speakerId: 'gydytoja',
      text: { lt: 'Manau, kad jiems teks pasakyti „ne“ žiūrint į žmones.', en: 'I think they will have to say "no" while looking at the people.' },
      holdMs: 800,
    }),
    // 12 — Prazaras važiuoja kartu
    C('p12', `${A}/bg-miesto-gatve.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada išgirsim atsakymą visi.', en: 'Then we will all hear the answer.' },
      holdMs: 500,
    }),
    // 13 — Pietų kelias
    S('p13', `${A}/bg-tiltas.svg`, {
      effects: [{ kind: 'fog', intensity: 0.35 }],
      camera: { startScale: 1, endScale: 1.06, endX: 1, duration: 7 },
      text: null, holdMs: 1500, // tolumoje — balta užkarda; perėjimas į 8 misiją
    }),
  ],
}

export const m07fail = [
  { characterName: 'Prazaras', text: 'Ji dar čia. Pirmas būrys traukia ją, antras gesina ugnį.' },
]
