// ════════════════════════════════════════════════════════════════════════════
// TUTORIAL V3 — „Pilna naujo žaidėjo patirtis" (8 pamokos).
//
// Kanonas (TUTORIAL-V3-HANDOFF.md §2):
//   • Viena koncepcija = vienas žingsnis.
//   • Rodyk → sakyk → daryk → patvirtink: close-up (`zoom`) + pulsuojanti
//     rodyklė (`arrowStyle`) + balsas (`voiceId`) + žaidėjo veiksmas (`allow`).
//   • Balsas kalba IŠSAMIAI (`voiceText` = titrai), ekrane — 1–2 sakiniai (`text`).
//   • Niekada nebausk: gate blokuoja, `wrongHint` pataria, pralaimėti neįmanoma.
//
// Balso failai: `card-audio/tutorial/tut-{voiceId}.mp3` (ElevenLabs, Senasis
// Korvas). Jei failo dar nėra — pamoka veikia tyliai (auto-advance pagal tekstą).
// Kortos: TIKROS kolekcijos kortos (status='active'), parinktos pagal status/efektus –
// atskirų TUT kortų nebėra (2026-09-19). Čempiono fazė nurodoma „Vardas|2" (žr. cardPool.ts).
// Į DB sėjama per admin „Įkelti pamokas" (seedRebuild).
// ════════════════════════════════════════════════════════════════════════════

import type { LessonSeed, Dialogue, LessonStep } from '@/lib/tutorial2/lessonTypes'

const GUIDE = 'Senasis Korvas'

/** Trumpinys: Korvo replika su balsu ir titrais. */
const say = (voiceId: string, text: string, voiceText?: string): Dialogue => ({
  speaker: 'guide', name: GUIDE, text, voiceId, voiceText: voiceText ?? text,
})

// ════════════════════════════════════════════════════════════════════════════
// L1 — MŪŠIO LAUKAS IR PIRMOJI KORTA
// ════════════════════════════════════════════════════════════════════════════
const L1_STEPS: LessonStep[] = [
  { id: 'welcome', objective: 'Susipažink su mūšio lauku',
    dialogue: [say('l1-s01', 'Sveikas atvykęs į Ravenof, mokiny. Aš — Senasis Korvas.',
      'Sveikas atvykęs į Ravenof, mokiny. Aš — Senasis Korvas. Kadaise vedžiau kariuomenes per šiuos prakeiktus kraštus... o dabar vesiu tave. Nebijok — pradėsime nuo pačių pamatų.')],
    complete: { on: 'next' } },

  // ── Zonų turas su close-up ──
  { id: 'zone-hp-you',
    dialogue: [say('l1-s02', 'Štai tavo gyvybės. Pasieks nulį — kova baigta.',
      'Štai tavo gyvybės. Keturiasdešimt. Kai jos pasieks nulį — kova baigta. Saugok jas labiau nei auksą.')],
    highlight: [{ kind: 'anchor', anchor: 'hp-you' }], arrowTo: { kind: 'anchor', anchor: 'hp-you' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'hp-you' }, complete: { on: 'next' } },
  { id: 'zone-hp-ai',
    dialogue: [say('l1-s03', 'O čia — priešininko gyvybės. Jas ir nukalsime iki nulio.',
      'O čia — priešininko gyvybės. Mūsų tikslas paprastas: nukalti jas iki nulio.')],
    highlight: [{ kind: 'anchor', anchor: 'hp-ai' }], arrowTo: { kind: 'anchor', anchor: 'hp-ai' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'hp-ai' }, complete: { on: 'next' } },
  { id: 'zone-gold',
    dialogue: [say('l1-s04', 'Tavo auksas. Kiekviena korta kainuoja aukso.',
      'Tai tavo aukso atsargos. Auksas čia — ne turtas, o kvėpavimas. Kiekviena korta kainuoja aukso.')],
    highlight: [{ kind: 'anchor', anchor: 'gold' }], arrowTo: { kind: 'anchor', anchor: 'gold' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'gold' }, complete: { on: 'next' } },
  { id: 'zone-deck',
    dialogue: [say('l1-s05', 'Tavo kaladė — kas ėjimą traukiama po vieną kortą.',
      'Tavo kaladė. Iš jos kas ėjimą trauksi po vieną kortą. Kai kaladė ištuštės... apie tai vėliau. Tai nemaloni istorija.')],
    highlight: [{ kind: 'anchor', anchor: 'deck-you' }], arrowTo: { kind: 'anchor', anchor: 'deck-you' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'deck-you' }, complete: { on: 'next' } },
  { id: 'zone-discard',
    dialogue: [say('l1-s06', 'Kapinynas. Čia gula žuvusios kortos.',
      'Kapinynas. Žuvusios kortos gula čia. Kai kurios jėgos moka jas prikelti — bet tai gilesnė magija.')],
    highlight: [{ kind: 'anchor', anchor: 'discard-you' }], arrowTo: { kind: 'anchor', anchor: 'discard-you' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'discard-you' }, complete: { on: 'next' } },
  { id: 'zone-zmk',
    dialogue: [say('l1-s07', 'Žalos Modifikavimo Kortos — likimo pirštai. Apie jas vėliau.',
      'Šita maža kaladė — Žalos Modifikavimo Kortos. Likimo pirštai. Kol kas jų neliesk — supažindinsiu, kai ateis laikas kautis.')],
    highlight: [{ kind: 'anchor', anchor: 'zmk' }], arrowTo: { kind: 'anchor', anchor: 'zmk' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'zmk' }, complete: { on: 'next' } },

  // ── Aukso taisyklė ──
  { id: 'gold-rule', objective: 'Įsimink aukso taisyklę',
    dialogue: [say('l1-s08', 'Ėjimo numeris × 100 (iki 1000). Nepanaudotas auksas ėjimo gale PRADINGSTA.',
      'Dabar įsidėmėk aukso taisyklę. Pirmą ėjimą gauni šimtą. Antrą — du šimtus. Trečią — tris. Ir taip iki tūkstančio. Bet klausyk atidžiai: ėjimo pabaigoje nepanaudotas auksas pradingsta. Neišleisi — prarasi.')],
    highlight: [{ kind: 'anchor', anchor: 'gold' }], arrowTo: { kind: 'anchor', anchor: 'gold' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'gold' }, zoomLevel: 2.2, complete: { on: 'next' } },

  // ── Kortos anatomija ──
  { id: 'card-cost', objective: 'Pažink kortą',
    dialogue: [say('l1-s09', 'Skaičius kampe — kortos kaina auksu.', 'Pažvelk į kortą iš arčiau. Šis skaičius kampe — jos kaina auksu.')],
    highlight: [{ kind: 'handCard', cardName: 'Piratas žvalgas' }], arrowTo: { kind: 'handCard', cardName: 'Piratas žvalgas' }, arrowStyle: 'pulse',
    zoom: { kind: 'handCard', cardName: 'Piratas žvalgas' }, complete: { on: 'next' } },
  { id: 'card-atk',
    dialogue: [say('l1-s10', 'Žvaigždė — atakos jėga.',
      'Žvaigždė — atakos jėga. Tiek žalos ji kirs priešui.')],
    highlight: [{ kind: 'handCard', cardName: 'Piratas žvalgas' }],
    zoom: { kind: 'handCard', cardName: 'Piratas žvalgas' }, complete: { on: 'next' } },
  { id: 'card-hp',
    dialogue: [say('l1-s11', 'Širdis — gyvybės.', 'Širdis — gyvybės. Tiek žalos korta atlaikys, kol žus.')],
    highlight: [{ kind: 'handCard', cardName: 'Piratas žvalgas' }],
    zoom: { kind: 'handCard', cardName: 'Piratas žvalgas' }, complete: { on: 'next' } },
  { id: 'card-text',
    dialogue: [say('l1-s12', 'Tekstas apačioje — kortos galia. Jis visada svarbesnis už skaičius.',
      'O tekstas apačioje — jos galia. Kortos tekstas Ravenof\'e visada svarbesnis už skaičius. Visada.')],
    highlight: [{ kind: 'handCard', cardName: 'Piratas žvalgas' }],
    zoom: { kind: 'handCard', cardName: 'Piratas žvalgas' }, complete: { on: 'next' } },

  // ── Hold-to-view ──
  { id: 'hold-to-view', objective: 'Palaikyk pirštą ant kortos',
    dialogue: [say('l1-s13', 'Palaikyk pirštą ant kortos — ji priartės. Pabandyk.',
      'Nori apžiūrėti kortą? Palaikyk ant jos pirštą — ji priartės. Atleisi pirštą — dings. Paprasta. Pabandyk dabar.')],
    highlight: [{ kind: 'handCard', cardName: 'Piratas žvalgas' }], arrowTo: { kind: 'handCard', cardName: 'Piratas žvalgas' }, arrowStyle: 'pulse',
    wrongHint: 'Ne spausk — PALAIKYK pirštą (ar pelės mygtuką) ant kortos.',
    complete: { on: 'inspect' } },

  // ── Drag-to-play ──
  { id: 'drag-to-play', objective: 'Tempk kortą į mūšio lauką',
    dialogue: [say('l1-s14', 'Paimk kortą pirštu ir tempk aukštyn, į mūšio lauką.',
      'Metas pirmai kortai. Paimk ją pirštu ir tempk aukštyn, į mūšio lauką. Drąsiai.')],
    highlight: [{ kind: 'handCard', cardName: 'Piratas žvalgas' }, { kind: 'anchor', anchor: 'units-you' }],
    arrowFrom: { kind: 'handCard', cardName: 'Piratas žvalgas' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Piratas žvalgas' }],
    wrongHint: 'Tempk BŪTENT paryškintą kortą į savo padarų eilę.',
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Piratas žvalgas' } },
  { id: 'summon-sick',
    dialogue: [say('l1-s15', 'Puiku! Šį ėjimą jis dar negali pulti — iškvietimo liga.',
      'Puiku! Bet pastebėk — tavo padaras dar apsvaigęs nuo iškvietimo. Šį ėjimą jis pulti negali. Kariai tai vadina iškvietimo liga.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Piratas žvalgas' }],
    zoom: { kind: 'unit', side: 'you', cardName: 'Piratas žvalgas' }, complete: { on: 'next' } },

  // ── Ėjimo pabaiga ──
  { id: 'end-turn-1', objective: 'Baik ėjimą',
    dialogue: [say('l1-s16', 'Auksas nepersikelia. Spausk „Baigti ėjimą".',
      'Daugiau aukso neturi, tad baik ėjimą. Prisimink — auksas nepersikelia. Spausk „Baigti ėjimą".')],
    highlight: [{ kind: 'button', id: 'end-turn' }], arrowTo: { kind: 'button', id: 'end-turn' }, arrowStyle: 'pulse',
    allow: [{ kind: 'end-turn' }], wrongHint: 'Spausk paryškintą „Baigti ėjimą" mygtuką.',
    complete: { on: 'event', eventType: 'endTurn', side: 'you' } },
  { id: 'enemy-turn', objective: 'Stebėk priešą',
    dialogue: [say('l1-s17', 'Dabar eina priešininkas. Stebėk.',
      'Dabar eina priešininkas. Stebėk. Kartais geriausia pamoka — žiūrėti, ką daro priešas.')],
    // Priešas IŠKVIEČIA padarą, o ne tiesiog praleidžia ėjimą — kitaip „stebėk priešą"
    // atrodo kaip bug'as (QA 2026-08-18). runScripted paima kortą iš kaladės, jei
    // jos dar nėra rankoje, ir prireikus pridės aukso.
    enemyScript: [{ type: 'play', cardName: 'Goblinas žvalgas' }, { type: 'endTurn' }],
    complete: { on: 'enemyTurnDone' } },
  { id: 'gold-grows',
    dialogue: [say('l1-s18', 'Matai? Antras ėjimas — du šimtai aukso.',
      'Matai? Antras ėjimas — du šimtai aukso. Kas ėjimą vis daugiau. Vėliau galėsi žaisti po kelias kortas iš karto.')],
    highlight: [{ kind: 'anchor', anchor: 'gold' }], arrowTo: { kind: 'anchor', anchor: 'gold' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'gold' }, zoomLevel: 2.2, complete: { on: 'next' } },
  { id: 'play-second', objective: 'Sužaisk antrą padarą',
    dialogue: [say('sys-good-2', 'Sužaisk dar vieną padarą — dabar aukso užtenka.', 'Būtent taip.')],
    highlight: [{ kind: 'handCard', cardName: 'Ida' }],
    arrowFrom: { kind: 'handCard', cardName: 'Ida' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Ida' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Ida' } },
  { id: 'l1-outro',
    dialogue: [say('l1-s19', 'Užtenka pirmam kartui. Kitoje pamokoje — kaip kautis.',
      'Užtenka pirmam kartui. Įsimink: auksas kvėpuoja, kortos kainuoja, padarai serga iškvietimo liga. Kitoje pamokoje — kaip kautis. Eik pailsėk, mokiny.')],
    complete: { on: 'next' } },
]

const level1: LessonSeed = {
  seedKey: 'tut-v3-l1', slug: 'pamoka-1-musio-laukas', sortOrder: 0,
  title: '1. Mūšio laukas', subtitle: 'Zonos, auksas, pirmoji korta',
  description: 'Ekrano zonos, aukso taisyklė, kortos anatomija, „laikai–matai" ir tempimas į lentą.',
  icon: '🗺', estMinutes: 5, status: 'active',
  reward: { exp: 60, gold: 200, badge: 'tutorial-1' },
  config: {
    guideName: GUIDE, primer: false,
    setup: {
      disableZmk: true,
      player: { gold: 100, hand: ['Piratas žvalgas', 'Ida', 'Hokieg’as'],
                deck: ['Frieda', 'Ida', 'Piratas žvalgas', 'Hokieg’as', 'Frieda'] },
      enemy: { hp: 30, hand: [], deck: ['Goblinas žvalgas', 'Hikage', 'Goblinas žvalgas', 'Hikage'] },
    },
    steps: L1_STEPS,
  },
}

// ════════════════════════════════════════════════════════════════════════════
// L2 — ATAKA IR GYNYBA
// ════════════════════════════════════════════════════════════════════════════
const L2_STEPS: LessonStep[] = [
  { id: 'intro', objective: 'Išmok kautis',
    dialogue: [say('l2-s01', 'Grįžai. Šiandien išmoksi svarbiausio — kaip liejamas kraujas.',
      'Grįžai. Gerai. Šiandien išmoksi svarbiausio — kaip liejamas kraujas.')],
    complete: { on: 'next' } },
  { id: 'attack-weak', objective: 'Pulk silpniausią priešą',
    dialogue: [say('l2-s02', 'Paimk savo padarą ir tempk ant priešo. Pulk silpnąjį.',
      'Ataka paprasta: paimk savo padarą pirštu ir tempk ant priešo. Rodyklė parodys taikinį. Pabandyk — pulk silpnąjį.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Ida' }, { kind: 'unit', side: 'ai', cardName: 'Goblinas žvalgas' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Ida' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Goblinas žvalgas' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-unit', targetName: 'Goblinas žvalgas' }],
    wrongHint: 'Tempk paryškintą savo padarą ant paryškinto priešo.',
    complete: { on: 'event', eventType: 'attack', side: 'you' } },
  { id: 'clean-kill',
    dialogue: [say('l2-s03', 'Priešas krito — bet net žūdamas jis spėjo kirsti atgal.',
      'Priešas krito. Bet pažvelk į savo karį — jis irgi kruvinas. Ravenof\'e smūgiai kertami vienu metu: net mirdamas gynėjas spėja atsakyti. Vienintelis, kuris neatsako — sušaldytas.')],
    // Close-up į SAVO padarą: matosi, kad ir jis gavo atgal (žala kertama vienu metu).
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Ida' }],
    zoom: { kind: 'unit', side: 'you', cardName: 'Ida' },
    complete: { on: 'next' } },
  { id: 'retaliation-rule', objective: 'Suprask mainus',
    dialogue: [say('l2-s04', 'Kai puoli padarą — jis kerta atgal. Kiekviena ataka yra mainai.',
      'Bet dabar klausyk atidžiai, nes čia žūsta naujokai. Kai puoli padarą — jis kerta atgal. Tu gauni jo atakos žalą, nesvarbu, ar jis išgyvena. Kiekviena ataka yra mainai.')],
    highlight: [{ kind: 'unit', side: 'ai', cardName: 'Zombis klajoklis' }], arrowTo: { kind: 'unit', side: 'ai', cardName: 'Zombis klajoklis' }, arrowStyle: 'pulse',
    zoom: { kind: 'unit', side: 'ai', cardName: 'Zombis klajoklis' }, complete: { on: 'next' } },
  { id: 'trade-math',
    dialogue: [say('l2-s05', 'Jo 3/3 prieš tavo 4/4: jis žus, tau liks viena gyvybė. Visada skaičiuok.',
      'Pažvelk: jo ataka trys, gyvybės trys. Tavo — trys ir keturi. Pulsi — jis žus, bet tau liks viena gyvybė. Verta? Dažnai — taip. Bet visada skaičiuok.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Frieda' }, { kind: 'unit', side: 'ai', cardName: 'Zombis klajoklis' }],
    zoom: { kind: 'unit', side: 'you', cardName: 'Frieda' }, complete: { on: 'next' } },
  { id: 'trade-do', objective: 'Atlik mainus',
    dialogue: [say('l2-s06', 'Pulk. Pajusk mainus savo kailiu.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Frieda' }, { kind: 'unit', side: 'ai', cardName: 'Zombis klajoklis' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Frieda' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Zombis klajoklis' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-unit', targetName: 'Zombis klajoklis' }],
    complete: { on: 'event', eventType: 'attack', side: 'you' } },

  // ── ŽMK ──
  { id: 'zmk-intro', objective: 'Pažink Žalos Modifikavimo Kortas',
    apply: { enableZmk: true },
    dialogue: [say('l2-s07', 'Kiekvieną kartą, kai kertama žala, traukiama viena ŽMK.',
      'O dabar... Žalos Modifikavimo Kortos. Likimas. Kiekvieną kartą, kai kertama žala, traukiama viena šių kortų.')],
    highlight: [{ kind: 'anchor', anchor: 'zmk' }], arrowTo: { kind: 'anchor', anchor: 'zmk' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'zmk' }, zoomLevel: 2.2, complete: { on: 'next' } },
  { id: 'zmk-values',
    dialogue: [say('l2-s08', '+ didina, − mažina, ×2 dvigubina, ×0 — smūgis nueina vėjais.',
      'Pliusas — žala didesnė. Minusas — mažesnė. Kryžius du — žala dviguba. O kryžius nulis... smūgis nueina vėjais. Todėl Ravenof\'e net tikras kirtis niekada nėra tikras.')],
    highlight: [{ kind: 'anchor', anchor: 'zmk' }], zoom: { kind: 'anchor', anchor: 'zmk' }, zoomLevel: 2.2, complete: { on: 'next' } },
  { id: 'zmk-live',
    dialogue: [say('l2-s09', 'Nuo šiol likimo kortos maišosi į kiekvieną tavo smūgį.',
      'Nuo šiol likimo kortos maišosi į kiekvieną tavo smūgį. Priprask prie netikrumo — jis čia amžinas.')],
    complete: { on: 'next' } },

  // ── Ataka į veidą ──
  { id: 'go-face', objective: 'Kirsk tiesiai priešui',
    dialogue: [say('l2-s10', 'Kai kelias laisvas — tempk padarą ant priešo herbo.',
      'Kai priešo lenta tuščia — kirsk tiesiai į veidą. Tempk padarą ant priešo herbo. Tai kelias į pergalę.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Hokieg’as' }, { kind: 'anchor', anchor: 'hp-ai' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Hokieg’as' }, arrowTo: { kind: 'anchor', anchor: 'hp-ai' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-face' }],
    wrongHint: 'Tempk padarą ant PRIEŠO herbo viršuje.',
    complete: { on: 'event', eventType: 'attack', side: 'you' } },
  { id: 'end-turn', objective: 'Baik ėjimą ir pajusk priešo smūgį',
    dialogue: [say('sys-turn-enemy', 'Baik ėjimą. Priešo ėjimas — stebėk.', 'Priešo ėjimas. Stebėk.')],
    highlight: [{ kind: 'button', id: 'end-turn' }], arrowTo: { kind: 'button', id: 'end-turn' }, arrowStyle: 'pulse',
    allow: [{ kind: 'end-turn' }], complete: { on: 'event', eventType: 'endTurn', side: 'you' } },
  { id: 'enemy-hits',
    enemyScript: [{ type: 'attack', attackerCard: 'Wrosxa', face: true }, { type: 'endTurn' }],
    complete: { on: 'enemyTurnDone' } },
  { id: 'pain-lesson',
    dialogue: [say('l2-s11', 'Skauda? Gerai. Palikta priešo lenta artina TAVO pabaigą.',
      'Skauda? Gerai. Dabar žinai, ką jaučia priešas. Žala veidan artina pabaigą — bet palikta priešo lenta artina tavo pabaigą. Balansas, mokiny.')],
    highlight: [{ kind: 'anchor', anchor: 'hp-you' }], zoom: { kind: 'anchor', anchor: 'hp-you' }, complete: { on: 'next' } },
  { id: 'finish', objective: 'Užbaik priešą',
    dialogue: [say('l2-s12', 'Priešo gyvybės senka. Užbaik.', 'Priešo gyvybės senka. Užbaik. Nukalk jas iki nulio.')],
    allow: [{ kind: 'attack-any' }, { kind: 'play-unit' }, { kind: 'end-turn' }],
    complete: { on: 'win' } },
  { id: 'victory',
    dialogue: [say('sys-victory', 'Pergalė! Ravenof tavimi patenkintas.')],
    complete: { on: 'next' } },
]

const level2: LessonSeed = {
  seedKey: 'tut-v3-l2', slug: 'pamoka-2-ataka-gynyba', sortOrder: 1,
  title: '2. Ataka ir gynyba', subtitle: 'Mainai, atsakomasis smūgis, ŽMK',
  description: 'Atakos tempimas, atsakomasis smūgis, mainų skaičiavimas, Žalos Modifikavimo Kortos, žala į veidą.',
  icon: '⚔', estMinutes: 6, status: 'active',
  reward: { exp: 80, gold: 250, badge: 'tutorial-2' },
  config: {
    guideName: GUIDE,
    setup: {
      disableZmk: true,
      player: { gold: 300, board: ['Ida', 'Frieda', 'Hokieg’as'],
                hand: ['Piratas žvalgas'], deck: ['Ida', 'Frieda', 'Piratas žvalgas', 'Hokieg’as'] },
      enemy: { hp: 14, board: ['Goblinas žvalgas', 'Zombis klajoklis', 'Wrosxa'],
               deck: ['Hikage', 'Goblinas žvalgas', 'Hikage'] },
    },
    steps: L2_STEPS,
  },
}

// ════════════════════════════════════════════════════════════════════════════
// L3 — BURTAI, TAIKINIAI IR REAKCIJOS
// ════════════════════════════════════════════════════════════════════════════
const L3_STEPS: LessonStep[] = [
  { id: 'intro', objective: 'Išmok magiją',
    dialogue: [say('l3-s01', 'Kardai — ne vienintelis kelias. Šiandien — magija.')],
    complete: { on: 'next' } },
  { id: 'targeted-spell', objective: 'Mesk burtą į taikinį',
    dialogue: [say('l3-s02', 'Burtai suveikia iškart ir gula į kapinyną. Tempk jį ant priešo padaro.',
      'Burtai suveikia iškart ir gula į kapinyną. Vieni reikalauja taikinio, kiti — ne. Šis reikalauja. Tempk jį ant priešo padaro.')],
    highlight: [{ kind: 'handCard', cardName: 'Stingdantis kristalas' }, { kind: 'unit', side: 'ai', cardName: 'Zombis klajoklis' }],
    arrowFrom: { kind: 'handCard', cardName: 'Stingdantis kristalas' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Zombis klajoklis' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-spell', cardName: 'Stingdantis kristalas' }],
    complete: { on: 'event', eventType: 'spell', side: 'you', cardName: 'Stingdantis kristalas' } },
  { id: 'docked-preview',
    dialogue: [say('l3-s03', 'Tempiant kortos aprašymas lieka kairėje — skaityk jį renkantis taikinį.',
      'Pastebėjai? Kol tempi, kortos aprašymas lieka kairiajame krašte. Skaityk jį rinkdamasis taikinį — tekstas visada svarbiau už atmintį.')],
    complete: { on: 'next' } },
  { id: 'aoe', objective: 'Paleisk audrą (AOE)',
    dialogue: [say('l3-s04', 'Šis burtas taikinių nesirenka — kerta VISUS priešo padarus.',
      'O šis burtas — audra. Taikinių nesirenka: kerta visus priešo padarus iš karto. Tokie burtai brangūs, bet apverčia kovą. Paleisk.')],
    highlight: [{ kind: 'handCard', cardName: 'Ordino apsuptis' }, { kind: 'anchor', anchor: 'units-ai' }],
    arrowFrom: { kind: 'handCard', cardName: 'Ordino apsuptis' }, arrowTo: { kind: 'anchor', anchor: 'units-ai' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-spell', cardName: 'Ordino apsuptis' }],
    complete: { on: 'event', eventType: 'spell', side: 'you', cardName: 'Ordino apsuptis' } },
  { id: 'aoe-note',
    dialogue: [say('l3-s05', 'Gražu. Bet audros netaškyk tuščiai lentai.',
      'Gražu, tiesa? Bet įsimink — audros nešvaisto tuščiai lentai. Lauk, kol priešas išsistatys.')],
    complete: { on: 'next' } },
  { id: 'reaction-intro', objective: 'Paruošk spąstus',
    dialogue: [say('l3-s06', 'Reakcijos žaidžiamos UŽVERSTOS. Priešas jų nemato.',
      'Dabar — spąstai. Reakcijos. Jos žaidžiamos užverstos į šitą zoną. Priešas jų nemato. Ir nežino, kada suveiks.')],
    highlight: [{ kind: 'anchor', anchor: 'reactions-you' }], arrowTo: { kind: 'anchor', anchor: 'reactions-you' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'reactions-you' }, complete: { on: 'next' } },
  { id: 'reaction-set', objective: 'Padėk reakciją',
    dialogue: [say('l3-s07', 'Padėk reakciją. Tegul laukia tamsoje.')],
    highlight: [{ kind: 'handCard', cardName: 'Paslėpta galia' }, { kind: 'anchor', anchor: 'reactions-you' }],
    arrowFrom: { kind: 'handCard', cardName: 'Paslėpta galia' }, arrowTo: { kind: 'anchor', anchor: 'reactions-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-any', cardName: 'Paslėpta galia' }],
    complete: { on: 'event', eventType: 'reactionSet', side: 'you' } },
  { id: 'wait-for-trap', objective: 'Baik ėjimą ir lauk',
    dialogue: [say('l3-s08', 'Dabar lauk. Priešas puls. Ir tada...')],
    highlight: [{ kind: 'button', id: 'end-turn' }], arrowTo: { kind: 'button', id: 'end-turn' }, arrowStyle: 'pulse',
    allow: [{ kind: 'end-turn' }], complete: { on: 'event', eventType: 'endTurn', side: 'you' } },
  { id: 'trap-springs',
    // Prieš tai buvęs AOE nušluoja VISUS priešo padarus, tad spąstams reikia naujo
    // puolėjo — kitaip priešas nieko nedaro ir Korvas kalba, lyg spąstai suveiktų.
    apply: { addBoardAi: ['Hikage'] },
    enemyScript: [{ type: 'attack', attackerCard: 'Hikage', targetCard: 'Ida' }, { type: 'endTurn' }],
    complete: { on: 'enemyTurnDone' } },
  { id: 'trap-explain',
    dialogue: [say('l3-s09', 'ŠTAI! Reakcija smogė tam, kuris ją pažadino.',
      'Štai! Spąstai užsitrenkė! Reakcija smogė tam, kuris ją pažadino. Priešas dabar dukart pagalvos prieš puldamas.')],
    highlight: [{ kind: 'anchor', anchor: 'reactions-you' }], complete: { on: 'next' } },
  { id: 'finish', objective: 'Užbaik kovą',
    dialogue: [say('l3-s10', 'Reakcijos — tavo nematoma ranka. Užbaik kovą, mokiny.',
      'Reakcijos — tavo nematoma ranka. Gera kaladė visada turi bent porą. Užbaik kovą, mokiny.')],
    allow: [{ kind: 'attack-any' }, { kind: 'play-unit' }, { kind: 'play-spell' }, { kind: 'end-turn' }],
    complete: { on: 'win' } },
  { id: 'victory',
    dialogue: [say('sys-victory', 'Pergalė! Ravenof tavimi patenkintas.')],
    complete: { on: 'next' } },
]

const level3: LessonSeed = {
  seedKey: 'tut-v3-l3', slug: 'pamoka-3-burtai-reakcijos', sortOrder: 2,
  title: '3. Burtai ir reakcijos', subtitle: 'Taikiniai, AOE, spąstai',
  description: 'Burtai su taikiniu, AOE, docked peržiūra ir paslėptos reakcijos (spąstai).',
  icon: '✦', estMinutes: 7, status: 'active',
  reward: { exp: 100, gold: 300, cardMin: 'magic', badge: 'tutorial-3' },
  config: {
    guideName: GUIDE,
    setup: {
      disableZmk: true,
      player: { gold: 900, board: ['Ida', 'Frieda'],
                hand: ['Stingdantis kristalas', 'Ordino apsuptis', 'Paslėpta galia', 'Šviesos palaiminimas'],
                deck: ['Piratas žvalgas', 'Hokieg’as', 'Ida'] },
      enemy: { hp: 8, board: ['Hikage', 'Zombis klajoklis', 'Goblinas žvalgas'],
               deck: ['Hikage', 'Goblinas žvalgas'] },
    },
    steps: L3_STEPS,
  },
}

// ════════════════════════════════════════════════════════════════════════════
// L4 — ČEMPIONAS
// ════════════════════════════════════════════════════════════════════════════
const L4_STEPS: LessonStep[] = [
  { id: 'intro', objective: 'Pašauk čempioną',
    dialogue: [say('l4-s01', 'Šiandien ypatinga diena. Šiandien tu pašauksi ČEMPIONĄ.')],
    complete: { on: 'next' } },
  { id: 'tribute-rule',
    dialogue: [say('l4-s02', 'Čempionas reikalauja AUKOS: dvi kortos iš rankos ARBA vienas padaras nuo lentos.',
      'Čempionas — ne eilinis karys. Jis reikalauja aukos: dvi kortos iš rankos arba vienas tavo padaras nuo lentos. Rinkis atsargiai... arba atšauk, jei suabejosi — mygtukas apačioje.')],
    // Kalbant apie čempioną rodom BŪTENT jo kortą (o ne dažom visą ranką).
    showCard: 'Archimagas Lisarijus', complete: { on: 'next' } },
  { id: 'summon-champ', objective: 'Paaukok dvi kortas ir iškviesk čempioną',
    dialogue: [say('l4-s03', 'Paaukok dvi kortas. Tegul ateina.')],
    // Peržiūra jau uždaryta — dabar paryškinta TIK čempiono korta rankoje, o
    // tempiant ją savi padarai pulsuoja (galimos aukos).
    highlight: [{ kind: 'handCard', cardName: 'Archimagas Lisarijus' }],
    arrowFrom: { kind: 'handCard', cardName: 'Archimagas Lisarijus' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-any', cardName: 'Archimagas Lisarijus' }],
    wrongHint: 'Pradėk nuo paryškintos čempiono kortos — tada paaukok 2 kortas iš rankos arba padarą nuo lentos.',
    complete: { on: 'event', eventType: 'champion', side: 'you' } },
  { id: 'phases', objective: 'Pažvelk į fazes',
    dialogue: [say('l4-s04', 'Žvaigždės po juo — FAZĖS. Pirma fazė — tik pradžia.',
      'Štai jis. Pažvelk į žvaigždes po juo — tai fazės. Pirma fazė — tik pradžia.')],
    highlight: [{ kind: 'anchor', anchor: 'champion-you' }], arrowTo: { kind: 'anchor', anchor: 'champion-you' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'champion-you' }, zoomLevel: 2.0, complete: { on: 'next' } },
  { id: 'upgrade', objective: 'Pakelk čempioną į antrą fazę',
    apply: { goldYou: 1000 },
    dialogue: [say('l4-s05', 'Antra fazė — ATSKIRA korta: sumoki auksą ir vėl aukoji. Pirma fazė privalo stovėti lentoje.',
      'Čempionas auga ne pats. Antra fazė — atskira korta iš rankos: sumoki jos auksą ir vėl paaukoji. Bet įsidėmėk: pirmoji fazė privalo stovėti lentoje, kitaip antroji neateis. Trečioji — lygiai taip pat. Sužaisk antrąją fazę.')],
    highlight: [{ kind: 'handCard', cardName: 'Archimagas Lisarijus' }],
    arrowFrom: { kind: 'handCard', cardName: 'Archimagas Lisarijus' }, arrowTo: { kind: 'anchor', anchor: 'champion-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'upgrade-champion' }, { kind: 'play-any', cardName: 'Archimagas Lisarijus' }],
    wrongHint: 'Sužaisk antros fazės kortą ir paaukok dvi kortas iš rankos.',
    complete: { on: 'event', eventType: 'evolve', side: 'you' } },
  { id: 'skills',
    dialogue: [say('l4-s06', 'Pirmas įgūdis — nuo pradžių, antras — nuo antros fazės, trečias — pilnai užaugus.',
      'Dabar jo galios. Pirmas įgūdis atrakintas nuo pradžių. Antras — nuo antros fazės. Trečias — tik pilnai užaugus. Užrakintos galios pilkos — jų laikas dar ateis.')],
    highlight: [{ kind: 'anchor', anchor: 'champion-you' }], zoom: { kind: 'anchor', anchor: 'champion-you' }, complete: { on: 'next' } },
  { id: 'use-skill', objective: 'Panaudok čempiono galią',
    dialogue: [say('l4-s07', 'Kai kurios galios reikalauja taikinio — korta švytės. Panaudok pirmąją.',
      'Kai kurios galios kainuoja aukso. Kai kurios reikalauja taikinio — korta švytės, kol pasirinksi. Panaudok pirmąją galią dabar.')],
    highlight: [{ kind: 'anchor', anchor: 'champion-you' }], arrowTo: { kind: 'anchor', anchor: 'champion-you' }, arrowStyle: 'pulse',
    allow: [{ kind: 'use-champion' }],
    wrongHint: 'Bakstelėk savo čempioną ir pasirink pirmąjį gebėjimą.',
    complete: { on: 'event', eventType: 'ability', side: 'you' } },
  { id: 'phase-down',
    dialogue: [say('l4-s08', 'Ištraukei aukštesnę fazę per anksti? RANKOJE ją gali iškeisti į žemesnę. Lentoje stovinčio — ne.',
      'Ir dar viena gudrybė. Ištraukei trečią fazę, o čempiono lentoje dar nėra? Rankoje tą kortą gali iškeisti į žemesnę tos pačios giminės fazę — ji ateina iš kaladės ar kapinyno, kad išvis galėtum jį pašaukti. Bet įsidėmėk: jau stovinčio lentoje čempiono nuleisti žemyn negali. Fazės eina tik aukštyn.')],
    complete: { on: 'next' } },
  { id: 'finish', objective: 'Užbaik priešą',
    dialogue: [say('l4-s09', 'Čempionas krenta — kova nesibaigia, bet jo netektis skaudi. Užbaik priešą.',
      'Čempionas krenta — kova nesibaigia, bet jo netektis skaudi. Saugok jį. Užbaik priešą.')],
    allow: [{ kind: 'attack-any' }, { kind: 'play-unit' }, { kind: 'use-champion' }, { kind: 'end-turn' }],
    complete: { on: 'win' } },
  { id: 'victory',
    dialogue: [say('sys-victory', 'Pergalė! Ravenof tavimi patenkintas.')],
    complete: { on: 'next' } },
]

const level4: LessonSeed = {
  seedKey: 'tut-v3-l4', slug: 'pamoka-4-cempionas', sortOrder: 3,
  title: '4. Čempionas', subtitle: 'Tribute, fazės, gebėjimai',
  description: 'Čempiono iškvietimas per Tribute, fazės 300/600/900, gebėjimų atrakinimas ir taikiniai.',
  icon: '👑', estMinutes: 7, status: 'active',
  reward: { exp: 120, gold: 350, cardMin: 'unique', badge: 'tutorial-4' },
  config: {
    guideName: GUIDE,
    setup: {
      disableZmk: true,
      player: { gold: 1000, board: ['Frieda', 'Hokieg’as'],
                hand: ['Archimagas Lisarijus|1', 'Piratas žvalgas', 'Ida', 'Archimagas Lisarijus|2', 'Piratas žvalgas', 'Hokieg’as'],
                deck: ['Ida', 'Frieda', 'Piratas žvalgas'] },
      enemy: { hp: 10, board: ['Hikage'], deck: ['Goblinas žvalgas', 'Hikage'] },
    },
    steps: L4_STEPS,
  },
}

// ════════════════════════════════════════════════════════════════════════════
// L5 — ARTEFAKTAI, LAUKAS IR AUROS
// ════════════════════════════════════════════════════════════════════════════
const L5_STEPS: LessonStep[] = [
  { id: 'intro', objective: 'Tylios jėgos',
    dialogue: [say('l5-s01', 'Ne viskas kaunasi. Kai kas... tiesiog stovi ir keičia pasaulį.')],
    complete: { on: 'next' } },
  { id: 'artifact', objective: 'Padėk artefaktą',
    dialogue: [say('l5-s02', 'Artefaktai veikia kas ėjimą patys. Bet jie turi gyvybes — priešas gali juos SUDAUŽYTI.',
      'Artefaktai gula į savo zoną ir veikia kas ėjimą — patys. Bet įsidėmėk: jie turi gyvybes, ir priešas gali juos sudaužyti. Padėk artefaktą.')],
    highlight: [{ kind: 'handCard', cardName: 'Magmos širdis' }, { kind: 'anchor', anchor: 'artifacts-you' }],
    arrowFrom: { kind: 'handCard', cardName: 'Magmos širdis' }, arrowTo: { kind: 'anchor', anchor: 'artifacts-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-any', cardName: 'Magmos širdis' }],
    complete: { on: 'event', eventType: 'artifact', side: 'you' } },
  { id: 'artifact-works',
    dialogue: [say('l5-s03', 'Kiekvieno tavo ėjimo pradžioje jis dirbs tau. Nemokamai.',
      'Matai? Kiekvieno tavo ėjimo pradžioje jis dirbs tau. Nemokamai. Amžinai — arba kol stovi.')],
    highlight: [{ kind: 'anchor', anchor: 'artifacts-you' }], zoom: { kind: 'anchor', anchor: 'artifacts-you' }, complete: { on: 'next' } },
  { id: 'field', objective: 'Sužaisk lauko kortą',
    dialogue: [say('l5-s04', 'LAUKO korta keičia patį mūšio lauką. Žaisk ją ir žiūrėk atidžiai.')],
    highlight: [{ kind: 'handCard', cardName: 'Volkano papėdė' }, { kind: 'anchor', anchor: 'field' }],
    arrowFrom: { kind: 'handCard', cardName: 'Volkano papėdė' }, arrowTo: { kind: 'anchor', anchor: 'field' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-any', cardName: 'Volkano papėdė' }],
    complete: { on: 'event', eventType: 'field', side: 'you' } },
  { id: 'field-both',
    dialogue: [say('l5-s05', 'Arena pasikeitė. Lauko galia veikia ABU — ir tave.',
      'Pati arena pasikeitė... Lauko kortos galia veikia abu žaidėjus. Ir tave. Rinkis lauką, kuris tavo kaladei naudingesnis nei priešo.')],
    highlight: [{ kind: 'anchor', anchor: 'field' }], arrowTo: { kind: 'anchor', anchor: 'field' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'field' }, complete: { on: 'next' } },
  { id: 'field-replace', objective: 'Pakeisk lauką',
    apply: { goldYou: 1000 },
    dialogue: [say('l5-s06', 'Naujas laukas išstumia senąjį. Vienu metu — tik vienas pasaulis.')],
    highlight: [{ kind: 'handCard', cardName: 'Aukso kasykla' }, { kind: 'anchor', anchor: 'field' }],
    arrowFrom: { kind: 'handCard', cardName: 'Aukso kasykla' }, arrowTo: { kind: 'anchor', anchor: 'field' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-any', cardName: 'Aukso kasykla' }],
    complete: { on: 'event', eventType: 'field', side: 'you' } },
  { id: 'aura', objective: 'Iškviesk auros nešėją',
    dialogue: [say('l5-s07', 'AUROS: padaras stiprina savus vien BŪDAMAS lentoje (šis – Provokacijos padarus). Aura dingsta kartu su nešėju.',
      'Dar viena tyli jėga — auros. Kai kurie padarai vien būdami lentoje stiprina savus... ar nuodija priešus. Aura dingsta kartu su nešėju — todėl auros nešėjai visada pirmi taikiniai.')],
    highlight: [{ kind: 'handCard', cardName: 'Klausas' }],
    arrowFrom: { kind: 'handCard', cardName: 'Klausas' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Klausas' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Klausas' } },
  { id: 'aura-see',
    dialogue: [say('sys-good-1', 'Puiku. Pažvelk — riterio skaičiai paaugo.', 'Puiku.')],
    highlight: [{ kind: 'anchor', anchor: 'units-you' }], zoom: { kind: 'anchor', anchor: 'units-you' }, complete: { on: 'next' } },
  { id: 'finish', objective: 'Užbaik priešą',
    allow: [{ kind: 'attack-any' }, { kind: 'play-unit' }, { kind: 'play-spell' }, { kind: 'end-turn' }],
    complete: { on: 'win' } },
  { id: 'victory',
    dialogue: [say('sys-victory', 'Pergalė! Ravenof tavimi patenkintas.')],
    complete: { on: 'next' } },
]

const level5: LessonSeed = {
  seedKey: 'tut-v3-l5', slug: 'pamoka-5-artefaktai-laukas', sortOrder: 4,
  title: '5. Artefaktai ir laukas', subtitle: 'Artefaktai, lauko kortos, auros',
  description: 'Artefaktai (turi HP!), lauko kortos (veikia abu) ir pasyvios auros.',
  icon: '🏛', estMinutes: 6, status: 'active',
  reward: { exp: 140, gold: 350, cardMin: 'unique', badge: 'tutorial-5' },
  config: {
    guideName: GUIDE,
    setup: {
      disableZmk: true,
      player: { gold: 1000, board: ['Ida', 'Frieda', 'Riteris'],
                hand: ['Magmos širdis', 'Volkano papėdė', 'Aukso kasykla', 'Klausas', 'Piratas žvalgas'],
                deck: ['Piratas žvalgas', 'Hokieg’as'] },
      enemy: { hp: 10, board: ['Hikage'], deck: ['Goblinas žvalgas', 'Hikage'] },
    },
    steps: L5_STEPS,
  },
}

// ════════════════════════════════════════════════════════════════════════════
// L6 — BŪSENOS IR RAKTAŽODŽIAI (demonstracijų karuselė)
// ════════════════════════════════════════════════════════════════════════════
const L6_STEPS: LessonStep[] = [
  { id: 'intro', objective: 'Skaityk ženklus ant kortų',
    dialogue: [say('l6-s01', 'Būsenos laimi kovas dažniau nei kardai.',
      'Šiandien išmoksi skaityti ženklus ant kortų. Būsenos. Jos laimi kovas dažniau nei kardai.')],
    complete: { on: 'next' } },

  // ── ŠALTIS ──
  { id: 'freeze-cast', objective: 'Užšaldyk priešą',
    dialogue: [say('l6-s02', 'ŠALTIS: užšaldytas padaras NEATSAKO į smūgius. Užšaldyk priešą.',
      'Šaltis. Užšaldytas padaras neatsako į smūgius. Pulk jį — jis tylės. Ledo magai tuo ir gyvena.')],
    highlight: [{ kind: 'handCard', cardName: 'Ledo spindulys' }, { kind: 'unit', side: 'ai', cardName: 'Wrosxa' }],
    arrowFrom: { kind: 'handCard', cardName: 'Ledo spindulys' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Wrosxa' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-spell', cardName: 'Ledo spindulys' }],
    complete: { on: 'event', eventType: 'spell', side: 'you', cardName: 'Ledo spindulys' } },
  { id: 'freeze-attack', objective: 'Pulk užšaldytą — be atsako',
    dialogue: [say('sys-good-3', 'Dabar pulk jį. Atsakomojo smūgio nebus.', 'Gerai, mokiny.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Frieda' }, { kind: 'unit', side: 'ai', cardName: 'Wrosxa' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Frieda' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Wrosxa' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-unit', targetName: 'Wrosxa' }],
    complete: { on: 'event', eventType: 'attack', side: 'you' } },

  // ── APSVAIGIMAS ──
  { id: 'stun', objective: 'Apsvaigink priešą',
    apply: { addBoardAi: ['Hikage'], goldYou: 1000 },
    dialogue: [say('l6-s03', 'APSVAIGIMAS: padaras praleidžia savo ėjimą. Iškviesk kovotoją ir nurodyk taikinį.',
      'Apsvaigimas. Apsvaigintas padaras praleidžia savo ėjimą — nei puola, nei ginasi protingai. Nukalk jo sargą, kol miega.')],
    highlight: [{ kind: 'handCard', cardName: 'Takumi' }, { kind: 'unit', side: 'ai', cardName: 'Hikage' }],
    arrowFrom: { kind: 'handCard', cardName: 'Takumi' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Hikage' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Takumi' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Takumi' } },

  // ── NUODAI IR UGNIS ──
  { id: 'poison', objective: 'Apnuodyk',
    apply: { goldYou: 1000 },
    dialogue: [say('l6-s04', 'NUODAI: žala kas ėjimą IR nepalankios atakos — traukiamos dvi likimo kortos, galioja blogesnė.',
      'Nuodai ir ugnis ėda gyvybes kas ėjimą, po truputį. Bet nuodai kerta dukart: apnuodytas padaras dar ir puola nepalankiai — jam traukiamos dvi likimo kortos, o galioja blogesnė. Lėta mirtis — bet mirtis.')],
    highlight: [{ kind: 'handCard', cardName: 'Matriarchė Gorta' }],
    arrowFrom: { kind: 'handCard', cardName: 'Matriarchė Gorta' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Hikage' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Matriarchė Gorta' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Matriarchė Gorta' } },
  // ── SKYDAS IR SĖLINIMAS ──
  { id: 'shield-stealth', objective: 'Skydas ir sėlinimas',
    apply: { addBoardYou: ['Ordino pėstininkas', 'Toguchi'] },
    dialogue: [say('l6-s06', 'SKYDAS sugeria vieną smūgį pilnai. SĖLINIMAS slepia padarą, kol jis pats nesmogia.',
      'Skydas sugeria vieną smūgį pilnai. Sėlinimas slepia padarą nuo taikymosi, kol jis pats nesmogia.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Ordino pėstininkas' }, { kind: 'unit', side: 'you', cardName: 'Toguchi' }],
    zoom: { kind: 'unit', side: 'you', cardName: 'Ordino pėstininkas' }, complete: { on: 'next' } },

  // ── PROVOKACIJA ──
  { id: 'taunt', objective: 'Provokacija — siena',
    apply: { addBoardAi: ['Gorgonės golemas'] },
    dialogue: [say('l6-s07', 'PROVOKACIJA: kol jis lentoje — privalai pulti JĮ pirmiausia.',
      'Ir provokacija. Kol lentoje stovi provokuojantis padaras — privalai pulti jį pirmiausia. Jis — siena. Statyk sienas savo silpniems, griauk priešo sienas pirmas.')],
    highlight: [{ kind: 'unit', side: 'ai', cardName: 'Gorgonės golemas' }], arrowTo: { kind: 'unit', side: 'ai', cardName: 'Gorgonės golemas' }, arrowStyle: 'pulse',
    zoom: { kind: 'unit', side: 'ai', cardName: 'Gorgonės golemas' }, complete: { on: 'next' } },

  // ── NUTILDYMAS ──
  { id: 'silence', objective: 'Nutildyk sieną',
    apply: { goldYou: 1000 },
    dialogue: [say('l6-s05', 'NUTILDYMAS nuima nuo kortos VISKĄ — net Provokaciją. Iškviesk tarną ir nutildyk golemą.',
      'Nutildymas. Baisiausias iš visų. Nuima nuo kortos viską — tekstą, buffus, galias. Lieka tik kūnas ir skaičiai. Prieš galingą efektą — nutildymas.')],
    highlight: [{ kind: 'handCard', cardName: 'Nakties tarnas' }, { kind: 'unit', side: 'ai', cardName: 'Gorgonės golemas' }],
    arrowFrom: { kind: 'handCard', cardName: 'Nakties tarnas' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Gorgonės golemas' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Nakties tarnas' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Nakties tarnas' } },

  // ── SPRINTAS ──
  { id: 'sprint-play', objective: 'Sprintas: pulk tą patį ėjimą',
    apply: { addHandYou: ['Tsurano'], goldYou: 1000 },
    dialogue: [say('l6-s08', 'SPRINTAS leidžia pulti tą patį ėjimą — jokios iškvietimo ligos.',
      'Sprintas leidžia pulti tą patį ėjimą, kai iškviestas — jokios iškvietimo ligos. Greitis kainuoja, bet stebina.')],
    highlight: [{ kind: 'handCard', cardName: 'Tsurano' }],
    arrowFrom: { kind: 'handCard', cardName: 'Tsurano' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Tsurano' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Tsurano' } },
  { id: 'sprint-attack', objective: 'Pulk iškart',
    dialogue: [say('sys-good-1', 'O dabar — pulk juo iškart.', 'Puiku.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Tsurano' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Tsurano' }, arrowTo: { kind: 'anchor', anchor: 'units-ai' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-any' }],
    complete: { on: 'event', eventType: 'attack', side: 'you' } },

  // ── PALAIMINIMAS (pranašumas kitam smūgiui) ──
  { id: 'blessed', objective: 'Palaiminimas: kitas smūgis su pranašumu',
    // ŽMK įjungiam BŪTENT čia — pranašumas matomas tik traukiant tikras korteles.
    apply: { enableZmk: true, goldYou: 1000, addBoardYou: ['Ida'], addBoardAi: ['Zombis klajoklis'],
             setStatus: [{ side: 'you', cardName: 'Ida', status: 'blessed' }] },
    dialogue: [say('l6-s09', 'PALAIMINIMAS: kitas to padaro smūgis traukiamas su PRANAŠUMU — dvi likimo kortos, galioja geresnė.',
      'Ir šviesioji pusė — palaiminimas. Kitas to padaro smūgis traukiamas su pranašumu: likimas ištraukia dvi kortas, o galioja geresnė. Vienkartinis, bet dažnai lemiamas. Pulk juo ir pažiūrėk pats.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Ida' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Ida' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Zombis klajoklis' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-any' }],
    complete: { on: 'event', eventType: 'attack', side: 'you' } },

  // ── KOVOS ŠŪKSNIS ──
  { id: 'battlecry', objective: 'Kovos šūksnis: efektas iškviečiant',
    apply: { addHandYou: ['Šerkšnadūmis'], goldYou: 1000 },
    dialogue: [say('l6-s10', 'KOVOS ŠŪKSNIS suveikia TĄ AKIMIRKĄ, kai padaras iškviečiamas. Vieną kartą — bet iškart.',
      'Kovos šūksnis. Toks padaras smogia dar nespėjęs įsitvirtinti: efektas suveikia tą akimirką, kai jis iškviečiamas iš rankos. Vieną kartą — bet iškart, ir priešas nespėja pasiruošti. Iškviesk jį ir nurodyk taikinį.')],
    highlight: [{ kind: 'handCard', cardName: 'Šerkšnadūmis' }],
    arrowFrom: { kind: 'handCard', cardName: 'Šerkšnadūmis' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Šerkšnadūmis' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Šerkšnadūmis' } },

  // ── PASKUTINIS NORAS ──
  { id: 'lastwish', objective: 'Paskutinis noras: efektas žūstant',
    apply: { addBoardYou: ['Impas'], addBoardAi: ['Wrosxa'] },
    dialogue: [say('l6-s11', 'PASKUTINIS NORAS suveikia ŽŪSTANT. Pulk stipresnį — ir pamatysi, ką jis palieka.',
      'O paskutinis noras — priešingybė: jis suveikia tada, kai padaras žūsta. Todėl tokį padarą nužudyti kartais brangiau, nei palikti gyvą. Pulk juo stipresnį priešą ir pažiūrėk, ką jis tau paliks krisdamas.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Impas' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Impas' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Wrosxa' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-any' }],
    wrongHint: 'Pulk paryškintu skydnešiu — jis turi žūti, kad pamatytum Paskutinį norą.',
    complete: { on: 'event', eventType: 'lastwish', side: 'you' } },

  { id: 'outro',
    dialogue: [say('sys-good-3', 'Ženklus skaityti išmokai. Toliau — tamsioji pusė.', 'Gerai, mokiny.')],
    complete: { on: 'next' } },
]

const level6: LessonSeed = {
  seedKey: 'tut-v3-l6', slug: 'pamoka-6-busenos', sortOrder: 5,
  title: '6. Būsenos ir raktažodžiai', subtitle: 'Šaltis, nuodai, nutildymas, provokacija',
  description: 'Visos svarbios būsenos ir raktažodžiai — po vieną, su demonstracija.',
  icon: '❄', estMinutes: 7, status: 'active',
  reward: { exp: 160, gold: 400, cardMin: 'unique', badge: 'tutorial-6' },
  config: {
    guideName: GUIDE,
    setup: {
      disableZmk: true,
      player: { gold: 1000, board: ['Frieda'],
                hand: ['Ledo spindulys', 'Takumi', 'Matriarchė Gorta', 'Nakties tarnas'],
                deck: ['Piratas žvalgas', 'Ida', 'Impas', 'Hokieg’as'] },
      enemy: { hp: 40, board: ['Wrosxa'], deck: ['Hikage', 'Goblinas žvalgas', 'Zombis klajoklis'] },
    },
    steps: L6_STEPS,
  },
}

// ════════════════════════════════════════════════════════════════════════════
// L7 — DEMONŲ PRAKEIKSMAI
// ════════════════════════════════════════════════════════════════════════════
const L7_STEPS: LessonStep[] = [
  { id: 'intro', objective: 'Tamsioji pusė',
    dialogue: [say('l7-s01', 'Dabar... tamsioji pusė. Demonų menas. Prakeiksmai.')],
    complete: { on: 'next' } },
  { id: 'side-deck',
    dialogue: [say('l7-s02', 'Demonų kaladė turi ŠEŠĖLĮ — šoninę prakeiksmų kaladę (iki 20).',
      'Demonų kaladė turi šešėlį — šoninę prakeiksmų kaladę. Iki dvidešimties. Jie ne tavo rankoje — jie laukia savo valandos šalia.')],
    // Šoninė kaladė kovoje NErodoma (paslėpta informacija) — rodom savo kaladę,
    // šalia kurios „šešėlis" ir laukia; tekstas tai paaiškina.
    highlight: [{ kind: 'anchor', anchor: 'deck-you' }], arrowTo: { kind: 'anchor', anchor: 'deck-you' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'deck-you' }, complete: { on: 'next' } },
  { id: 'inject', objective: 'Įmaišyk prakeiksmus į priešo kaladę',
    dialogue: [say('l7-s03', 'Demonų efektai ĮMAIŠO prakeiksmus į PRIEŠO kaladę. Žiūrėk.',
      'Demonų efektai įmaišo prakeiksmus į priešo kaladę. Žiūrėk — štai jis, šliaužia į svetimą kaladę...')],
    highlight: [{ kind: 'handCard', cardName: 'Digolan’as' }, { kind: 'anchor', anchor: 'deck-ai' }],
    arrowFrom: { kind: 'handCard', cardName: 'Digolan’as' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Digolan’as' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Digolan’as' } },
  { id: 'inject-explain',
    dialogue: [say('l7-s04', 'Priešas trauks kortas... ir vieną dieną ištrauks TAVO prakeiksmą.',
      'O dabar gražiausia. Priešas trauks kortas... ir vieną dieną ištrauks tavo prakeiksmą. Tada jis suveiks. Jo rankoje. Jo ėjime.')],
    complete: { on: 'next' } },
  { id: 'end-turn', objective: 'Baik ėjimą — tegul traukia',
    apply: { seedEnemyDeckTop: ['Kraujo duoklė'] },
    dialogue: [say('sys-turn-enemy', 'Baik ėjimą. Priešo ėjimas — stebėk jo kaladę.', 'Priešo ėjimas. Stebėk.')],
    highlight: [{ kind: 'button', id: 'end-turn' }], arrowTo: { kind: 'button', id: 'end-turn' }, arrowStyle: 'pulse',
    allow: [{ kind: 'end-turn' }], complete: { on: 'event', eventType: 'endTurn', side: 'you' } },
  { id: 'curse-fires',
    enemyScript: [{ type: 'endTurn' }], complete: { on: 'enemyTurnDone' } },
  { id: 'curse-explain',
    dialogue: [say('l7-s05', 'Štai! Priešas net kortos negavo — vien skausmą.',
      'Štai! Girdi? Tai prakeiksmo balsas. Priešas net kortos negavo — vien skausmą.')],
    highlight: [{ kind: 'anchor', anchor: 'hp-ai' }], zoom: { kind: 'anchor', anchor: 'hp-ai' }, complete: { on: 'next' } },
  { id: 'outro',
    dialogue: [say('l7-s06', 'Demonų meistrai stato kaladas aplink tai. Tamsi simfonija.',
      'Demonų meistrai stato kaladas aplink tai: vieni efektai maišo prakeiksmus, kiti stiprėja jiems suveikus, treti baudžia priešą už kiekvieną ištrauktą kortą. Tamsi simfonija.')],
    complete: { on: 'next' } },
]

const level7: LessonSeed = {
  seedKey: 'tut-v3-l7', slug: 'pamoka-7-prakeiksmai', sortOrder: 6,
  title: '7. Demonų prakeiksmai', subtitle: 'Šoninė kaladė, įmaišymas, aktyvacija',
  description: 'Prakeiksmų šoninė kaladė, įmaišymas į priešo kaladę ir aktyvacija ištraukus.',
  icon: '🕯', estMinutes: 6, status: 'active',
  reward: { exp: 160, gold: 400, cardMin: 'epic', badge: 'tutorial-7' },
  config: {
    guideName: GUIDE,
    setup: {
      disableZmk: true,
      player: { gold: 600, board: ['Ida'],
                hand: ['Digolan’as', 'Gniuždantis žvilgsnis'],
                deck: ['Piratas žvalgas', 'Frieda', 'Hokieg’as'],
                curses: ['Kraujo duoklė', 'Šnabždėjimas po oda', 'Pragaro sutartis'] },
      enemy: { hp: 30, board: ['Hikage'], deck: ['Goblinas žvalgas', 'Hikage', 'Zombis klajoklis'] },
    },
    steps: L7_STEPS,
  },
}

// ════════════════════════════════════════════════════════════════════════════
// L8 — KOVOS PRADŽIA IR EKONOMIKA (vienintelė su coin toss + mulligan)
// ════════════════════════════════════════════════════════════════════════════
const L8_STEPS: LessonStep[] = [
  { id: 'intro', objective: 'Kas vyksta prieš kovą',
    dialogue: [say('l8-s01', 'Paskutinė pamoka — apie tai, kas vyksta PRIEŠ kovą ir kas laukia jos gale.')],
    complete: { on: 'next' } },
  { id: 'coin', objective: 'Likimas renkasi, kas pradeda',
    dialogue: [say('l8-s02', 'Kiekviena kova prasideda monetos metimu. Žalia — tu, raudona — priešas.',
      'Kiekviena tikra kova prasideda monetos metimu. Likimas renkasi, kas eina pirmas. Žalia — tu. Raudona — priešas.')],
    highlight: [{ kind: 'anchor', anchor: 'coin' }], arrowTo: { kind: 'anchor', anchor: 'coin' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'coin' }, complete: { on: 'next' } },
  { id: 'mulligan', objective: 'Pakeisk brangias pradines kortas',
    dialogue: [say('l8-s03', 'Pirmoji ranka: pažymėk kortas, kurias nori keisti. Brangios kortos pradžioje — balastas.',
      'Dabar — pirmoji ranka. Netinka? Pažymėk kortas, kurias nori keisti — jos grįš į kaladę, gausi naujas. Patarimas: brangios kortos pradžioje — balastas. Keisk jas.')],
    // Close-up į BRANGIAUSIĄ ranką kortą jau mulligano scenoje (data-pick-card).
    highlight: [{ kind: 'handCard', cardName: 'Ordino apsuptis' }],
    arrowTo: { kind: 'handCard', cardName: 'Ordino apsuptis' }, arrowStyle: 'pulse',
    zoom: { kind: 'handCard', cardName: 'Ordino apsuptis' },
    allow: [{ kind: 'mulligan' }],
    wrongHint: 'Pažymėk brangias kortas ir patvirtink apačioje.',
    complete: { on: 'mulliganDone' } },
  { id: 'cost-rule',
    dialogue: [say('l8-s04', 'Pirmais ėjimais teturėsi šimtą ar du. Ranka pilna brangenybių — ranka tuščia darbų.',
      'Prisimink kainos taisyklę: pirmais ėjimais teturėsi šimtą ar du. Ranka pilna brangenybių — ranka tuščia darbų.')],
    highlight: [{ kind: 'anchor', anchor: 'gold' }], zoom: { kind: 'anchor', anchor: 'gold' }, complete: { on: 'next' } },
  { id: 'sell', objective: 'Parduok kortą už +100',
    dialogue: [say('l8-s05', 'Kartą per ėjimą gali PARDUOTI kortą iš rankos už 100 aukso. Pabandyk.',
      'Užmiršau paminėti dar vieną monetą. Kartą per ėjimą gali parduoti kortą iš rankos už šimtą aukso. Nereikalinga korta virsta ankstyvu padaru. Meistrų triukas.')],
    highlight: [{ kind: 'button', id: 'discard-gold' }], arrowTo: { kind: 'button', id: 'discard-gold' }, arrowStyle: 'pulse',
    allow: [{ kind: 'discard-gold' }],
    wrongHint: 'Spausk „Parduoti kortą" ir pažymėk nereikalingą kortą rankoje.',
    complete: { on: 'event', eventType: 'discardGold', side: 'you' } },
  { id: 'fatigue-setup', objective: 'Baik ėjimą — pažiūrėsim į NUOVARGĮ',
    apply: { deckCountYou: 0 },
    dialogue: [say('l8-s06', 'Kai kaladė tuščia, o traukti privalai — NUOVARGIS: 1, paskui 2, paskui 3 žalos.',
      'Ir pabaiga, apie kurią žadėjau papasakoti. Kai kaladė ištuštėja, o tu privalai traukti — nuovargis. Pirmas tuščias traukimas — vienas skausmo. Antras — du. Trečias — trys... Ilga kova visada baigiasi — vienaip ar kitaip.')],
    highlight: [{ kind: 'anchor', anchor: 'deck-you' }], arrowTo: { kind: 'button', id: 'end-turn' }, arrowStyle: 'pulse',
    allow: [{ kind: 'end-turn' }], complete: { on: 'event', eventType: 'endTurn', side: 'you' } },
  { id: 'fatigue-show',
    // Priešas kerta į veidą — ėjimas turi būti matomas, ne tuščias (QA 2026-08-18).
    enemyScript: [{ type: 'attack', attackerCard: 'Hikage', face: true }, { type: 'endTurn' }],
    complete: { on: 'enemyTurnDone' } },
  { id: 'hand-limit',
    dialogue: [say('l8-s07', 'Rankoje telpa dešimt kortų. Vienuolikta sudegtų.',
      'Dar žinok: rankoje telpa dešimt kortų. Vienuolikta sudegtų. Netaupyk to, ko negali panešti.')],
    highlight: [{ kind: 'anchor', anchor: 'hand' }], complete: { on: 'next' } },
  { id: 'farewell',
    dialogue: [say('l8-s08', 'Tai viskas, ką galiu duoti žodžiais. Likusio išmokys pralaimėjimai. Eik.',
      'Tai viskas, ką galiu tau duoti žodžiais, mokiny. Likusio išmokys pralaimėjimai — jie geriausi mokytojai Ravenof\'e. Eik. Kaunu tavimi didžiuotis.')],
    complete: { on: 'next' } },
]

const level8: LessonSeed = {
  seedKey: 'tut-v3-l8', slug: 'pamoka-8-kovos-pradzia', sortOrder: 7,
  title: '8. Kovos pradžia ir ekonomika', subtitle: 'Moneta, mulliganas, +100, nuovargis',
  description: 'Monetos metimas, mulliganas, pardavimas už 100 aukso, nuovargis ir rankos limitas.',
  icon: '🪙', estMinutes: 5, status: 'active',
  reward: { exp: 200, gold: 500, boosters: 1, cardMin: 'epic', badge: 'tutorial-8', cosmetics: ['title-ravenof-mokinys'] },
  config: {
    guideName: GUIDE,
    matchStartFlow: true,
    setup: {
      disableZmk: true,
      player: { hand: ['Piratas žvalgas', 'Ordino apsuptis', 'Ida', 'Užnugario ataka', 'Hokieg’as'],
                deck: ['Frieda', 'Piratas žvalgas', 'Ida'] },
      enemy: { hp: 30, board: ['Hikage'], deck: ['Goblinas žvalgas', 'Hikage', 'Zombis klajoklis'] },
    },
    steps: L8_STEPS,
  },
}

export const tutorialLessonSeeds: LessonSeed[] = [level1, level2, level3, level4, level5, level6, level7, level8]

/** V2 pamokų seed_key'ai — po V3 sėjimo jos paslepiamos (progresas perkeliamas SQL'e). */
export const legacyLessonSeedKeys: string[] = ['tut-1-basics', 'tut-2-spells', 'tut-3-board', 'tut-4-tactics', 'tut-5-advanced']

/** Privalomos pamokos prieš graduation (kova su savo starter kalade). */
export const CORE_LESSON_KEYS: string[] = ['tut-v3-l1', 'tut-v3-l2', 'tut-v3-l3']

export default tutorialLessonSeeds
