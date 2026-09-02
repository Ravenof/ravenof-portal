// ════════════════════════════════════════════════════════════════════════════
// M8 „Užvertas pietų kelias" — V3
// PRE „Žmonės prie baltos linijos" (19 beat'ų → 24 shots, ~3:10) +
// POST „Miestas, kurio nebėra" (14 beat'ų → 18 shots) + FAIL.
// LOCK: PRE baigiasi sunkiajam demonui apvertus galinį vežimą — pirmas tikslas
// „Per 3 ėjimus išlaisvink abu prispaustus civilius".
// ════════════════════════════════════════════════════════════════════════════
import type { MotionComicDef } from '@/lib/campaign/motionComic'
import { A, CAST, S, C } from './cast'

export const m08pre: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // ── A. Kolona dar tikisi vartų ──
    // 01 — Kelias į pietus (establishing)
    S('s01', `${A}/bg-tiltas.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'fog', intensity: 0.45 }],
      camera: { startScale: 1, endScale: 1.06, endX: -1, duration: 8 },
      sfxUrl: null, // PLACEHOLDER: vežimų ratų girgždesys rūke
      text: null, holdMs: 2500,
    }),
    // 02 — Gydytojos sąrašas (kontrastas 7 misijos chorui)
    C('s02', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 38, height: 86, depth: 12 }],
      effects: [{ kind: 'fog', intensity: 0.35 }],
      sfxUrl: null, // PLACEHOLDER: žmonės atsako savo vardais
      text: null, holdMs: 1400,
    }),
    // 03 — Medinis varnas (be dialogo: Kernius padeda užrišti mazgą)
    C('s03', `${A}/bg-tiltas.svg`, {
      characters: [
        { characterId: 'mergaite', pose: 'neutral', x: 42, height: 50, bottom: -6, depth: 10 },
        { characterId: 'kernius', pose: 'neutral', x: 66, height: 82, depth: 11, flip: true },
      ],
      tint: 'rgba(240,220,180,0.05)',
      text: null, holdMs: 1500, // žaislo neima tamsia rankos puse
    }),
    // 04 — Prazaro tikslas
    C('s04a', `${A}/bg-tiltas.svg`, {
      characters: [
        { characterId: 'kapitonas', pose: 'neutral', x: 62, height: 88, depth: 12, flip: true },
        { characterId: 'prazaras', pose: 'neutral', x: 28, height: 88, depth: 12, dim: 0.15 },
      ],
      speakerId: 'kapitonas', text: { lt: 'Po vakarykščio įsakymo jie neatidarys.', en: 'After yesterday’s order they will not open.' },
    }),
    C('s04b', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Tada atsisakys gydytojai, žiūrėdami į jos pacientus.', en: 'Then they will refuse a healer while looking at her patients.' },
      holdMs: 700,
    }),
    // ── B. Užkarda saugo ne nuo Ordos ──
    // 05 — Balta siena (reveal)
    S('s05', `${A}/bg-uzkarda.svg`, {
      tint: 'rgba(220,215,200,0.07)',
      effects: [{ kind: 'fog', intensity: 0.4 }],
      camera: { startScale: 1, endScale: 1.06, duration: 6 },
      text: null, holdMs: 1600, // visi lankai nukreipti Varngrado pusėn
    }),
    // 06 — Patikros prašymas
    C('s06', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 90, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Varngrado sužeistieji. Atidarykit patikros vartus.', en: 'Wounded of Varngrad. Open the inspection gates.' },
    }),
    // 07 — Gydytoja siūlo sąlygas
    C('s07', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 42, height: 88, depth: 12 }],
      speakerId: 'gydytoja',
      text: { lt: 'Tikrinkit po vieną. Palikit tarp mūsų dvidešimt žingsnių. Aš ateisiu pirma.', en: 'Check us one by one. Keep twenty paces between us. I will come first.' },
      holdMs: 1200, // inkvizitorius neatsako iš karto — tyla pabūna
    }),
    // 08 — Atsakymas
    C('s08a', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 74, bottom: 16, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Iš izoliuotos zonos nepriimamas nė vienas žmogus ir joks krovinys.', en: 'No person and no cargo is accepted out of the isolated zone.' },
    }),
    C('s08b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 44, height: 90, depth: 12 }],
      speakerId: 'gydytoja', text: { lt: 'Tai ne patikra.', en: 'That is not an inspection.' },
    }),
    C('s08c', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 74, bottom: 16, depth: 9, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Tai izoliacija.', en: 'It is isolation.' },
      holdMs: 700,
    }),
    // 09 — Ordino ženklas
    C('s09a', `${A}/bg-uzkarda.svg`, {
      tint: 'rgba(90,140,220,0.06)',
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 40, height: 92, depth: 12 }],
      speakerId: 'kapitonas', text: { lt: 'Vežimuose yra ir mano sužeistųjų.', en: 'Some of my wounded are in those wagons too.' },
    }),
    C('s09b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 62, height: 74, bottom: 16, depth: 9, flip: true }],
      speakerId: 'inkvizitorius', text: { lt: 'Jie pasirinko likti rizikos zonoje.', en: 'They chose to remain in the risk zone.' },
      holdMs: 800, // kapitonas nuleidžia ženklą
    }),
    // ── C. Grėsmė ateina iš užnugario ──
    // 10 — Kerniaus akis
    S('s10', `${A}/bg-tiltas.svg`, {
      effects: [{ kind: 'magic', intensity: 0.35, color: 'rgba(138,92,246,0.3)' }, { kind: 'fog', intensity: 0.35 }],
      characters: [{ characterId: 'kernius', pose: 'akis', x: 46, height: 90, depth: 12 }],
      speakerId: 'kernius', text: { lt: 'Jie ateina keliu, kuriuo atėjom mes.', en: 'They are coming down the road we came by.' },
    }),
    // 11 — Prašymas dengti
    C('s11', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Jūs turit aukštį ir švarią šūvio liniją. Dengiam civilius — šaudykit virš mūsų.', en: 'You have the height and a clean firing line. We cover the civilians — shoot over us.' },
      holdMs: 800, // lankininkai nepakelia lankų
    }),
    // 12 — Inkvizicijos riba
    C('s12a', `${A}/bg-uzkarda.svg`, {
      sfxUrl: null, // PLACEHOLDER: perspėjimo ragas
      tint: 'rgba(220,215,200,0.08)',
      speakerName: { lt: 'Inkvizicijos sargybos balsas', en: 'Inquisition sentry voice' },
      text: { lt: 'Neperžengti baltos linijos. Priartėję bus laikomi karantino pažeidėjais.', en: 'Do not cross the white line. Whoever approaches will be treated as a quarantine violator.' },
    }),
    C('s12b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 38, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Mes prašom ne įeiti. Mes prašom šaudyti į Ordą.', en: 'We are not asking to enter. We are asking you to shoot at the Horde.' },
      holdMs: 900, // atsakymo nėra
    }),
    // ── D. Kolona ruošiasi viena ──
    // 13 — Vežimus ratu
    C('s13', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 34, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Priekinį vežimą į kairę. Vaistus į vidurį. Galinį apsukam paskutinį.', en: 'Front wagon left. Medicine to the middle. The rear one turns last.' },
    }),
    // 14 — Žmonės supranta (mergaitė žiūri į sieną, neklausia)
    S('s14', `${A}/bg-uzkarda.svg`, {
      characters: [
        { characterId: 'gydytoja', pose: 'neutral', x: 34, height: 84, depth: 11 },
        { characterId: 'mergaite', pose: 'neutral', x: 58, height: 48, bottom: -6, depth: 10 },
      ],
      tint: 'rgba(240,220,180,0.04)',
      text: null, holdMs: 1400,
    }),
    // 15 — Pirmi maži demonai
    S('s15', `${A}/bg-tiltas.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(200,30,30,0.07)',
      effects: [{ kind: 'fog', intensity: 0.4 }, { kind: 'dust', intensity: 0.35 }],
      characters: [{ characterId: 'kapitonas', pose: 'kovinis', x: 36, height: 90, depth: 12 }],
      sfxUrl: null, // PLACEHOLDER: greiti demonai iš griovių; galinis vežimas nespėja apsisukti
      text: null, holdMs: 1200,
    }),
    // ── E. Mūšis prasideda ──
    // 16 — Sunkusis demonas (reveal ≥1,2 s)
    S('s16', `${A}/bg-uzkarda.svg`, {
      transition: { type: 'cut' },
      tint: 'rgba(200,30,30,0.1)',
      effects: [{ kind: 'fog', intensity: 0.35 }, { kind: 'dust', intensity: 0.4 }],
      characters: [{ characterId: 'belzatoras', pose: 'demonas', x: 58, height: 54, bottom: 6, depth: 9, entrance: 'slide-up' }],
      camera: { startScale: 1.03, endScale: 1.09, duration: 3 },
      text: null, holdMs: 1300,
    }),
    // 17 — Vežimas apvirsta
    C('s17', `${A}/bg-uzkarda.svg`, {
      effects: [{ kind: 'dust', intensity: 0.55 }],
      camera: { startScale: 1.05, endScale: 1.12, duration: 2, shake: 'heavy' },
      characters: [{ characterId: 'mergaite', pose: 'neutral', x: 38, height: 44, bottom: -10, depth: 9, dim: 0.1 }],
      sfxUrl: null, // PLACEHOLDER: vežimas virsta; ratas nulūžta; du civiliai prispausti
      text: null, holdMs: 1200,
    }),
    // 18 — Dvi grėsmės (lankai pakyla, demonas ruošiasi antram smūgiui)
    C('s18', `${A}/bg-uzkarda.svg`, {
      tint: 'rgba(220,215,200,0.06)',
      effects: [{ kind: 'dust', intensity: 0.35 }],
      characters: [
        { characterId: 'prazaras', pose: 'kalavijas', x: 28, height: 88, depth: 12 },
        { characterId: 'kapitonas', pose: 'kovinis', x: 52, height: 86, depth: 11 },
        { characterId: 'belzatoras', pose: 'demonas', x: 78, height: 48, bottom: 6, depth: 9 },
      ],
      text: null, holdMs: 1100,
    }),
    // 19 — Aiškus pirmas įsakymas → kova
    C('s19a', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 42, height: 84, depth: 12 }],
      speakerId: 'gydytoja', text: { lt: 'Vežimą reikia pakelti. Jie dar gyvi.', en: 'The wagon must be lifted. They are still alive.' },
    }),
    C('s19b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      camera: { startScale: 1.04, endScale: 1.09, duration: 3, punchIn: true },
      speakerId: 'prazaras',
      text: { lt: 'Ordinas laiko sunkųjį. Varngradas kelia vežimą. Nė vienas neperžengia baltos linijos.', en: 'The Order holds the heavy one. Varngrad lifts the wagon. No one crosses the white line.' },
      holdMs: 700, // UI atsiranda; 0 ėjimo metu demonas dar kartą stumteli vežimą
    }),
  ],
}

export const m08post: MotionComicDef = {
  version: 1, musicUrl: null, ambientUrl: null, typewriter: true, autoAdvanceAfterVoice: false,
  characters: CAST,
  shots: [
    // 01 — Po kovos
    S('p01', `${A}/bg-uzkarda.svg`, {
      transition: { type: 'cut' },
      effects: [{ kind: 'smoke', intensity: 0.3 }],
      tint: 'rgba(200,30,30,0.04)',
      camera: { startScale: 1, endScale: 1.05, duration: 7 },
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 40, height: 82, depth: 11 }],
      text: null, holdMs: 1500, // vartai nė karto nebuvo praverti
    }),
    // 02 — Antras prašymas
    C('p02', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 42, height: 88, depth: 12 }],
      speakerId: 'gydytoja',
      text: { lt: 'Jūs matėt, kad puolė demonai. Dabar patikrinkit žmones.', en: 'You saw it was demons who attacked. Now inspect the people.' },
    }),
    // 03 — Galutinis atsakymas
    C('p03a', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 76, bottom: 14, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Sprendimas nepriklauso nuo vieno mūšio rezultato.', en: 'The decision does not depend on the outcome of one battle.' },
    }),
    C('p03b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 44, height: 90, depth: 12 }],
      speakerId: 'gydytoja', text: { lt: 'Žmonių gyvybės priklausė.', en: 'People’s lives did.' },
      holdMs: 800, // grįžta prie kolonos, daugiau neprašo
    }),
    // 04 — Varngradas prarastas
    C('p04', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'antspaudas', x: 58, height: 78, bottom: 14, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Varngradas laikomas prarastu. Iš izoliuotos zonos nepriimamas nė vienas žmogus ir joks krovinys.', en: 'Varngrad is deemed lost. No person and no cargo is accepted out of the isolated zone.' },
    }),
    // 05 — Kas nusprendė
    C('p05a', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Prarastu kam? Mes ką tik apgynėm jūsų vartus nuo tos pačios Ordos.', en: 'Lost to whom? We just defended your gates from the same Horde.' },
    }),
    C('p05b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'inkvizitorius', pose: 'neutral', x: 60, height: 76, bottom: 14, depth: 9, flip: true }],
      speakerId: 'inkvizitorius',
      text: { lt: 'Likęs Ravenoras negali rizikuoti dėl vieno miesto. Tai būtinoji kaina.', en: 'The rest of Ravenor cannot risk itself for one city. It is the necessary price.' },
      holdMs: 500,
    }),
    // 06 — Kieno vardas
    C('p06a', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'isako', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Kaina turi žmogų, kuris ją sumoka. Šitame įsakyme jo vardo nėra.', en: 'A price has a person who pays it. His name is not in this order.' },
    }),
    C('p06b', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 56, height: 90, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'Yra. Varngradas.', en: 'It is. Varngrad.' },
      holdMs: 800,
    }),
    // 07 — Linija valoma (dega aptvaras ir virvės)
    S('p07', `${A}/bg-uzkarda.svg`, {
      tint: 'rgba(240,120,40,0.09)',
      effects: [{ kind: 'embers', intensity: 0.5 }],
      sfxUrl: null, // PLACEHOLDER: uždegamas tuščias patikros aptvaras
      text: null, holdMs: 1400, // valo vietą, kurioje patys nieko nepriėmė
    }),
    // 08 — Mergaitė (be dialogo: pasislenka, kad tilptų sužeistasis)
    C('p08', `${A}/bg-uzkarda.svg`, {
      characters: [{ characterId: 'mergaite', pose: 'neutral', x: 50, height: 52, bottom: -6, depth: 10 }],
      tint: 'rgba(240,220,180,0.05)',
      text: null, holdMs: 1500,
    }),
    // 09 — Kroviniai už sienos
    C('p09', `${A}/bg-krovinio-kiemas.svg`, {
      characters: [{ characterId: 'kernius', pose: 'akis', x: 28, height: 88, depth: 12 }],
      effects: [{ kind: 'magic', intensity: 0.3, color: 'rgba(138,92,246,0.28)' }],
      speakerId: 'kernius', text: { lt: 'Už jų sienos — mūsų ženklas.', en: 'Behind their wall — our mark.' },
    }),
    // 10 — Kas vežimuose
    C('p10', `${A}/bg-krovinio-kiemas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 60, height: 90, depth: 12, flip: true }],
      speakerId: 'kapitonas',
      text: { lt: 'Grūdai, tvarsčiai ir lempų aliejus. Siunta, kuri turėjo būti mieste vakar.', en: 'Grain, bandages and lamp oil. The shipment that should have been in the city yesterday.' },
    }),
    // 11 — Ne tik užvertas kelias
    C('p11', `${A}/bg-krovinio-kiemas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 36, height: 92, depth: 12 }],
      speakerId: 'prazaras',
      text: { lt: 'Jie ne tik mūsų neišleidžia. Jie sulaikė tai, kas turėjo mus išlaikyti gyvus.', en: 'They are not just keeping us in. They seized what was meant to keep us alive.' },
      holdMs: 600,
    }),
    // 12 — Kiek liko
    C('p12', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'gydytoja', pose: 'neutral', x: 42, height: 86, depth: 12 }],
      speakerId: 'gydytoja',
      text: { lt: 'Vaistų užteks iki ryto. Maisto — dviem dienom, jei sumažinsim porcijas.', en: 'Medicine will last until morning. Food — two days, if we cut the portions.' },
      holdMs: 500,
    }),
    // 13 — Sprendimas grįžti
    C('p13a', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'prazaras', pose: 'neutral', x: 34, height: 92, depth: 12 }],
      speakerId: 'prazaras', text: { lt: 'Rytoj jų neprašysim. Pasiimsim tai, kas jau mūsų.', en: 'Tomorrow we will not ask. We will take what is already ours.' },
    }),
    C('p13b', `${A}/bg-tiltas.svg`, {
      characters: [{ characterId: 'kapitonas', pose: 'neutral', x: 60, height: 88, depth: 12, flip: true }],
      speakerId: 'kapitonas', text: { lt: 'Tada einam naktį. Dieną jų lankai turės per daug šviesos.', en: 'Then we go at night. By day their bows have too much light.' },
      holdMs: 600,
    }),
    // 14 — Kolona apsisuka
    S('p14', `${A}/bg-siena-horizontas.svg`, {
      transition: { type: 'wipe-diagonal', duration: 500 },
      effects: [{ kind: 'smoke', intensity: 0.35 }, { kind: 'fog', intensity: 0.3 }],
      tint: 'rgba(200,30,30,0.06)',
      camera: { startScale: 1.05, endScale: 1, duration: 7 },
      text: null, holdMs: 1600, // už jų — užverti vartai, prieš juos — juodas dūmas; į 9 misiją
    }),
  ],
}

export const m08fail = [
  { characterName: 'Gydytoja', text: 'Jie dar kvėpuoja.' },
  { characterName: 'Prazaras', text: 'Tada pirmiausia sija. Sunkųjį laikom atokiau ir bandom dar kartą.' },
]
