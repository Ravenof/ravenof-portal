// ════════════════════════════════════════════════════════════════════════════
// M9 „Būtinoji kaina" — V3
// PRE „Ko neatiduoda badaujantis miestas" (20 beat'ų → 25 shots, ~3:20) +
// POST „Paskutinis tiltas" (15 beat'ų → 19 shots) + FAIL.
// LOCK: PRE baigiasi pirmai Inkvizicijos strėlei smogus į Ordino skydą ir
// Belzatoro bangai pasirodžius užnugaryje — pirmas tikslas
// „Per 3 ėjimus pralaužk kelią iki pirmo vežimo".
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m09pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // ── A. Dvi dienos ──
    // 01 — Du kepalai
    S('s01', `${A}/bg-karo-kambarys.svg`, {
      transition: { type: 'cut' },
      characters: [{ characterId: 'intendantas', pose: 'neutral', x: 58, height: 86, depth: 12, flip: true }],
      camera: { startScale: 1, endScale: 1.06, duration: 7 },
      sfxUrl: null, // PLACEHOLDER: peilis pjauna duoną vis smulkiau; tylus kambarys
      speakerId: 'intendantas',
      text: { lt: 'Rytoj taip maitinsim miestą. Poryt dalinti nebebus ko.', en: 'Tomorrow we feed the city like this. The day after, there is nothing left to share.' },
      holdMs: 800,
    }),
    // 02 — Gydyklos skaičius
    C('s02', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 40, height: 84, depth: 11 },
        { characterId: 'prazaras', pose: 'neutral', x: 72, height: 88, depth: 12, flip: true, dim: 0.15 },
      ],
      speakerId: 'gydytoja', text: { lt: 'Vaistai baigsis anksčiau už duoną.', en: 'The medicine runs out before the bread.' },
      holdMs: 700, // Prazaras žiūri į vežimų vietą žemėlapyje
    }),
    // 03 — Ką reiškia neiti
    C('s03a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Jei liksim, žmonės mirs be mūšio.', en: 'If we stay, people die without a battle.' },
    }),
    C('s03b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 60, height: 88, depth: 12, flip: true }],
      speakerId: 'kapitonas',
      text: { lt: 'Jei eisime, Inkvizicija vadins mus užkrėstais užpuolikais.', en: 'If we go, the Inquisition calls us infected raiders.' },
    }),
    C('s03c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Jie jau taip vadina. Skirtumas tas, ar grįšim su maistu.', en: 'They already do. The difference is whether we come back with food.' },
      holdMs: 700,
    }),
    // ── B. Ribos prieš mūšį ──
    // 04 — Trys vežimai
    C('s04', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'neutral', x: 50, height: 88, depth: 12 }],
      speakerId: 'kernius',
      text: { lt: 'Trys vežimai. Grūdai, vaistai ir aliejus. Visi su mūsų užsakymo numeriais.', en: 'Three wagons. Grain, medicine and oil. All with our order numbers.' },
    }),
    // 05 — Prazaro taisyklės
    C('s05', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Einam dėl krovinio. Kas pasitraukia, to nesivejam. Kas padeda ginklą, tam paliekam kelią. Už linijos į stovyklą neinam.', en: 'We go for the cargo. Whoever retreats, we do not chase. Whoever lays down arms gets a way out. We do not go past the line into their camp.' },
      holdMs: 1000,
    }),
    // 06 — Ordino kapitono klausimas
    C('s06a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 58, height: 88, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'O jei jie pirmi paleis strėlę?', en: 'And if they loose the first arrow?' },
    }),
    C('s06b', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Skydai priims strėlę. Mes vis tiek einam iki vežimų, ne iki jų gerklių.', en: 'The shields take the arrow. We still go as far as the wagons, not their throats.' },
      holdMs: 700, // kapitonas linkteli
    }),
    // ── C. Belzatoras laukia ──
    // 07 — Tamsi gija žemėlapyje
    S('s07a', `${A}/bg-karo-kambarys.svg`, {
      effects: [{ kind: 'magic', intensity: 0.4, color: 'rgba(138,92,246,0.32)' }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 52, height: 92, depth: 12 }],
      camera: { startScale: 1.03, endScale: 1.08, duration: 4, punchIn: true },
      speakerId: 'kernius', text: { lt: 'Belzatoras irgi juda prie tilto.', en: 'Belzataras is moving toward the bridge too.' },
    }),
    C('s07b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 64, height: 86, depth: 11, flip: true, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kiek turim laiko?', en: 'How much time do we have?' },
    }),
    C('s07c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 52, height: 92, depth: 12 }],
      speakerId: 'kernius',
      text: { lt: 'Jis neskuba. Laukia, kol pradėsim vieni kitus silpninti.', en: 'He is in no hurry. He waits for us to start weakening each other.' },
      holdMs: 700,
    }),
    // 08 — Prazaras pakeičia planą
    C('s08', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Kernius saugo tiltą. Jei Orda pasirodys, nepuolam giliau. Apsukam vežimus ir traukiamės.', en: 'Kernius guards the bridge. If the Horde appears, we push no deeper. We turn the wagons and withdraw.' },
      holdMs: 800,
    }),
    // ── D. Prie užkardos ──
    // 09 — Senasis malūno tiltas (establishing)
    S('s09', `${A}/bg-tiltas.svg`, {
      effects: [{ kind: 'fog', intensity: 0.4 }],
      camera: { startScale: 1, endScale: 1.06, endX: 1, duration: 7 },
      text: null, holdMs: 2200, // už tilto — trys vežimai ir baltų skydų linija
    }),
    // 10 — Paskutinis prašymas
    C('s10', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 34, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Atiduokit Varngradui pažymėtus vežimus. Pasiimsim juos ir grįšim į miestą.', en: 'Hand over the wagons marked for Varngrad. We take them and return to the city.' },
    }),
    // 11 — Inkvizicijos pozicija
    C('s11a', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 76, bottom: 16, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Kroviniai perimti karantino reikmėms. Atsitraukit nuo linijos.', en: 'The cargo has been seized for quarantine needs. Withdraw from the line.' },
    }),
    C('s11b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Karantino reikmė — išlaikyti žmones gyvus.', en: 'Quarantine’s need is to keep people alive.' },
    }),
    C('s11c', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 76, bottom: 16, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Ne tada, kai jų išlikimas didina bendrą riziką.', en: 'Not when their survival increases the overall risk.' },
      holdMs: 500,
    }),
    // 12 — Tikroji kaina (ramiai, be piktadariško close-up)
    C('s12a', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 42, height: 92, depth: 12 }],
      speakerId: 'kapitonas',
      text: { lt: 'Tu palieki miestą badauti, kad galėtum pasakyti, jog izoliacija veikia.', en: 'You are letting a city starve so you can say the isolation works.' },
    }),
    C('s12b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 78, bottom: 14, depth: 9, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Miestas jau įtrauktas į leistinus nuostolius.', en: 'The city is already counted among the permissible losses.' },
      holdMs: 900,
    }),
    // 13 — Prazaro atsakymas
    C('s13', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Tada nebeturit priežasties laikyti jo maisto.', en: 'Then you no longer have a reason to hold its food.' },
      holdMs: 600, // žengia ant tilto
    }),
    // ── E. Mūšį pradeda ne Prazaro kalavijas ──
    // 14 — Pirmas perspėjimas
    C('s14', `${A}/bg-uzkarda.svg`, {
      tint: 'rgba(220,215,200,0.07)',
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 76, bottom: 16, depth: 9, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Kitas žingsnis bus laikomas puolimu.', en: 'The next step will be treated as an attack.' },
    }),
    // 15 — Kitas žingsnis
    C('s15', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'kalavijas', x: 40, height: 94, depth: 12 }],
      camera: { startScale: 1.04, endScale: 1.08, duration: 3 },
      speakerId: 'prazaras', text: { lt: 'Vežimus. Ne kerštą.', en: 'The wagons. Not revenge.' },
      holdMs: 1000, // įsakymas jo žmonėms, ne replika Inkvizitoriui
    }),
    // 16 — Pirmoji strėlė (0,8 s pasekmės hold)
    S('s16', `${A}/bg-tiltas.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.4 }],
      tint: 'rgba(220,215,200,0.06)',
      camera: { startScale: 1.05, endScale: 1.1, duration: 2, shake: 'light' },
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 46, height: 92, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: strėlė perskelia mithrilo skydo išorinį sluoksnį
      text: null, holdMs: 1200, // kova su žmonėmis jau realiai prasidėjo
    }),
    // 17 — Skydų susidūrimas
    C('s17', `${A}/bg-tiltas.svg`, {
      effects: [{ kind: 'dust', intensity: 0.4 }],
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 40, height: 92, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: skydas į skydų liniją
      speakerId: 'kapitonas', text: { lt: 'Kelias iki vežimų. Linijos nevykit.', en: 'A path to the wagons. Do not rout their line.' },
    }),
    // 18 — Belzatoro banga
    S('s18', `${A}/bg-tiltas.svg`, {
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'fog', intensity: 0.35 }, { kind: 'magic', intensity: 0.35, color: 'rgba(200,30,30,0.3)' }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 90, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: žemas ne žmonių ragas; griovyje užsidega akys
      speakerId: 'kernius', text: { lt: 'Orda už mūsų. Jis sulaukė pirmos strėlės.', en: 'The Horde is behind us. He waited for the first arrow.' },
      holdMs: 500,
    }),
    // 19 — Tiltas tampa spąstais (be žodžių)
    C('s19', `${A}/bg-tiltas.svg`, {
      tint: 'rgba(200,30,30,0.09)',
      effects: [{ kind: 'dust', intensity: 0.4 }],
      characters: [{ characterId: 'belzatoras', pose: 'demonas', x: 76, height: 42, bottom: 4, depth: 9, entrance: 'slide-up' }],
      camera: { startScale: 1.03, endScale: 1.08, duration: 3 },
      text: null, holdMs: 1200, // Inkvizicija priekyje, Orda užnugaryje, vežimai už kelių eilių
    }),
    // 20 — Tiesioginis tikslas → kova
    C('s20', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 34, height: 92, depth: 12 }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 3, punchIn: true },
      speakerId: 'prazaras',
      text: { lt: 'Pralaužiam iki vežimų. Kerniau, laikyk kelią atgal. Jei tiltas užsidarys — paliekam krovinį, ne žmones.', en: 'We break through to the wagons. Kernius, hold the way back. If the bridge closes — we leave the cargo, not the people.' },
      holdMs: 700, // 0 ėjime demonas užblokuoja atsitraukimo langelį
    }),
  ],
}

export const m09post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // 01 — Du vežimai
    S('p01', `${A}/bg-tiltas.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'dust', intensity: 0.3 }],
      sfxUrl: null, // PLACEHOLDER: vežimų grandinės; sužeistieji nuo tilto
      text: null, holdMs: 1500,
    }),
    // 02 — Trečias krovinys
    C('p02', `${A}/bg-tiltas.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12 },
        { characterId: 'kapitonas', pose: 'kovinis', x: 68, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Palik vežimą. Pereik dabar.', en: 'Leave the wagon. Cross now.' },
      holdMs: 500,
    }),
    // 03 — Paskutinis žmogus (be žodžių: pirmiausia — pasidavęs Inkvizicijos karys)
    S('p03', `${A}/bg-tiltas.svg`, {
      effects: [{ kind: 'dust', intensity: 0.35 }],
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 48, height: 90, depth: 12 }],
      text: null, holdMs: 1400, // tik tada šoka pats
    }),
    // 04 — Sprogimas
    S('p04', `${A}/bg-tiltas-sugriuves.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'smoke', intensity: 0.55 }, { kind: 'dust', intensity: 0.5 }],
      camera: { startScale: 1.06, endScale: 1.12, duration: 2, shake: 'heavy' },
      sfxUrl: null, // PLACEHOLDER: tilto sprogimas ir akmenų griūtis
      text: null, holdMs: 1500,
    }),
    // 05 — Užvertas ir jiems (be žodžių: Inkvizicija traukiasi nuo Ordos)
    C('p05', `${A}/bg-tiltas-sugriuves.svg`, {
      effects: [{ kind: 'smoke', intensity: 0.4 }, { kind: 'fog', intensity: 0.3 }],
      tint: 'rgba(200,30,30,0.06)',
      camera: { startScale: 1.02, endScale: 1.07, endX: 1, duration: 5 },
      text: null, holdMs: 1300,
    }),
    // 06 — Ordino pusė
    C('p06a', `${A}/bg-tiltas-sugriuves.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12 },
        { characterId: 'kapitonas', pose: 'neutral', x: 66, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Tavo būrys liko Varngrade.', en: 'Your company is in Varngrad now.' },
    }),
    C('p06b', `${A}/bg-tiltas-sugriuves.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 30, height: 90, depth: 12, dim: 0.2 },
        { characterId: 'kapitonas', pose: 'neutral', x: 66, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'kapitonas',
      text: { lt: 'Šiandien tai vienintelė pusė, kuri dar kovojo su Orda.', en: 'Today it is the only side that still fought the Horde.' },
      holdMs: 600,
    }),
    // 07 — Ne priesaika (be žodžių: strėlė numetama ant tilto krašto)
    S('p07', `${A}/bg-tiltas-sugriuves.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 48, height: 88, depth: 12 }],
      tint: 'rgba(90,140,220,0.05)',
      text: null, holdMs: 1400,
    }),
    // 08 — Grūdai atidaromi
    S('p08a', `${A}/bg-miesto-gatve.svg`, {
      characters: [{ characterId: 'intendantas', pose: 'neutral', x: 58, height: 86, depth: 12, flip: true }],
      sfxUrl: null, // PLACEHOLDER: prapjaunama vežimo danga; žmonės laukia, niekas nepuola
      speakerId: 'intendantas', text: { lt: 'Jei dalinsim visiems — dvi dienos.', en: 'If we share with everyone — two days.' },
    }),
    C('p08b', `${A}/bg-miesto-gatve.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Dalinsim visiems.', en: 'We share with everyone.' },
      holdMs: 700,
    }),
    // 09 — Vaistai (be žodžių: pirmas buteliukas — vaikui iš 8 misijos vežimo)
    S('p09', `${A}/bg-gydykla.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 40, height: 84, depth: 11 },
        { characterId: 'mergaite', pose: 'neutral', x: 64, height: 48, bottom: -6, depth: 10 },
      ],
      tint: 'rgba(240,220,180,0.05)',
      text: null, holdMs: 1400,
    }),
    // 10 — Trumpa pergalė (be žodžių: pilnas duonos gabalas nepaliestas)
    S('p10', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 42, height: 88, depth: 12 }],
      camera: { startScale: 1, endScale: 1.05, duration: 6 },
      text: null, holdMs: 1400,
    }),
    // 11 — Kerniaus akis pasikeičia
    C('p11', `${A}/bg-karo-kambarys.svg`, {
      effects: [{ kind: 'magic', intensity: 0.45, color: 'rgba(200,30,30,0.32)' }],
      tint: 'rgba(200,30,30,0.06)',
      characters: [{ characterId: 'kernius', pose: 'akis', x: 52, height: 92, depth: 12 }],
      camera: { startScale: 1.03, endScale: 1.09, duration: 3, punchIn: true },
      text: null, holdMs: 1200, // nebe daug mažų gijų — viena didelė, į centrinę sieną
    }),
    // 12 — Jis pajudėjo
    C('p12a', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 50, height: 92, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Belzatoras pajudėjo.', en: 'Belzataras has moved.' },
    }),
    C('p12b', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'kernius', pose: 'akis', x: 62, height: 86, depth: 11, flip: true, dim: 0.2 },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12 },
      ],
      speakerId: 'prazaras', text: { lt: 'Kada pasieks sieną?', en: 'When does he reach the wall?' },
    }),
    C('p12c', `${A}/bg-karo-kambarys.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 50, height: 92, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Iki aušros.', en: 'By dawn.' },
      holdMs: 600,
    }),
    // 13 — Ko jis laukė
    C('p13', `${A}/bg-tiltas-sugriuves.svg`, {
      effects: [{ kind: 'fog', intensity: 0.3 }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 56, height: 90, depth: 12, flip: true }],
      speakerId: 'kernius', text: { lt: 'Jis laukė, kol neliks kelio trauktis.', en: 'He waited until there was no road left to retreat by.' },
      holdMs: 800,
    }),
    // 14 — Paskutinis planas (duona Kerniui — žmogiška replika prieš finalą)
    C('p14', `${A}/bg-karo-kambarys.svg`, {
      characters: [
        { characterId: 'prazaras', pose: 'neutral', x: 32, height: 90, depth: 12 },
        { characterId: 'kernius', pose: 'neutral', x: 66, height: 86, depth: 11, flip: true },
      ],
      speakerId: 'prazaras', text: { lt: 'Valgyk. Po valandos eisim prie varpo.', en: 'Eat. In an hour we go to the bell.' },
      holdMs: 800,
    }),
    // 15 — Susirinkimo ženklas
    S('p15', `${A}/bg-siena-horizontas.svg`, {
      tint: 'rgba(200,30,30,0.08)',
      effects: [{ kind: 'embers', intensity: 0.35 }],
      camera: { startScale: 1.02, endScale: 1.08, duration: 5 },
      sfxUrl: null, // PLACEHOLDER: vienas lėtas susirinkimo dūžis (dar ne evakuacijos)
      text: null, holdMs: 1600, // perėjimas į 10 misiją
    }),
  ],
}

export const m09fail = [
  { characterName: 'Prazaras', text: 'Paliekam krovinį, ne žmogų. Pirma atveriam kelią atgal.' },
]
