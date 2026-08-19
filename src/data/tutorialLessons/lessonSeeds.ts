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
// Kortos: TUT-### (migracijos 20260717 + 20260871), status='hidden'.
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
    highlight: [{ kind: 'handCard', cardName: 'Naujokas kareivis' }], arrowTo: { kind: 'handCard', cardName: 'Naujokas kareivis' }, arrowStyle: 'pulse',
    zoom: { kind: 'handCard', cardName: 'Naujokas kareivis' }, complete: { on: 'next' } },
  { id: 'card-atk',
    dialogue: [say('l1-s10', 'Žvaigždė — atakos jėga.',
      'Žvaigždė — atakos jėga. Tiek žalos ji kirs priešui.')],
    highlight: [{ kind: 'handCard', cardName: 'Naujokas kareivis' }],
    zoom: { kind: 'handCard', cardName: 'Naujokas kareivis' }, complete: { on: 'next' } },
  { id: 'card-hp',
    dialogue: [say('l1-s11', 'Širdis — gyvybės.', 'Širdis — gyvybės. Tiek žalos korta atlaikys, kol žus.')],
    highlight: [{ kind: 'handCard', cardName: 'Naujokas kareivis' }],
    zoom: { kind: 'handCard', cardName: 'Naujokas kareivis' }, complete: { on: 'next' } },
  { id: 'card-text',
    dialogue: [say('l1-s12', 'Tekstas apačioje — kortos galia. Jis visada svarbesnis už skaičius.',
      'O tekstas apačioje — jos galia. Kortos tekstas Ravenof\'e visada svarbesnis už skaičius. Visada.')],
    highlight: [{ kind: 'handCard', cardName: 'Naujokas kareivis' }],
    zoom: { kind: 'handCard', cardName: 'Naujokas kareivis' }, complete: { on: 'next' } },

  // ── Hold-to-view ──
  { id: 'hold-to-view', objective: 'Palaikyk pirštą ant kortos',
    dialogue: [say('l1-s13', 'Palaikyk pirštą ant kortos — ji priartės. Pabandyk.',
      'Nori apžiūrėti kortą? Palaikyk ant jos pirštą — ji priartės. Atleisi pirštą — dings. Paprasta. Pabandyk dabar.')],
    highlight: [{ kind: 'handCard', cardName: 'Naujokas kareivis' }], arrowTo: { kind: 'handCard', cardName: 'Naujokas kareivis' }, arrowStyle: 'pulse',
    wrongHint: 'Ne spausk — PALAIKYK pirštą (ar pelės mygtuką) ant kortos.',
    complete: { on: 'inspect' } },

  // ── Drag-to-play ──
  { id: 'drag-to-play', objective: 'Tempk kortą į mūšio lauką',
    dialogue: [say('l1-s14', 'Paimk kortą pirštu ir tempk aukštyn, į mūšio lauką.',
      'Metas pirmai kortai. Paimk ją pirštu ir tempk aukštyn, į mūšio lauką. Drąsiai.')],
    highlight: [{ kind: 'handCard', cardName: 'Naujokas kareivis' }, { kind: 'anchor', anchor: 'units-you' }],
    arrowFrom: { kind: 'handCard', cardName: 'Naujokas kareivis' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Naujokas kareivis' }],
    wrongHint: 'Tempk BŪTENT paryškintą kortą į savo padarų eilę.',
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Naujokas kareivis' } },
  { id: 'summon-sick',
    dialogue: [say('l1-s15', 'Puiku! Šį ėjimą jis dar negali pulti — iškvietimo liga.',
      'Puiku! Bet pastebėk — tavo padaras dar apsvaigęs nuo iškvietimo. Šį ėjimą jis pulti negali. Kariai tai vadina iškvietimo liga.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Naujokas kareivis' }],
    zoom: { kind: 'unit', side: 'you', cardName: 'Naujokas kareivis' }, complete: { on: 'next' } },

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
    enemyScript: [{ type: 'play', cardName: 'Goblinų skautas' }, { type: 'endTurn' }],
    complete: { on: 'enemyTurnDone' } },
  { id: 'gold-grows',
    dialogue: [say('l1-s18', 'Matai? Antras ėjimas — du šimtai aukso.',
      'Matai? Antras ėjimas — du šimtai aukso. Kas ėjimą vis daugiau. Vėliau galėsi žaisti po kelias kortas iš karto.')],
    highlight: [{ kind: 'anchor', anchor: 'gold' }], arrowTo: { kind: 'anchor', anchor: 'gold' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'gold' }, zoomLevel: 2.2, complete: { on: 'next' } },
  { id: 'play-second', objective: 'Sužaisk antrą padarą',
    dialogue: [say('sys-good-2', 'Sužaisk dar vieną padarą — dabar aukso užtenka.', 'Būtent taip.')],
    highlight: [{ kind: 'handCard', cardName: 'Kaimo gynėjas' }],
    arrowFrom: { kind: 'handCard', cardName: 'Kaimo gynėjas' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Kaimo gynėjas' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Kaimo gynėjas' } },
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
      player: { gold: 100, hand: ['Naujokas kareivis', 'Kaimo gynėjas', 'Sienos lankininkas'],
                deck: ['Geležinis sargas', 'Kaimo gynėjas', 'Naujokas kareivis', 'Sienos lankininkas', 'Geležinis sargas'] },
      enemy: { hp: 30, hand: [], deck: ['Goblinų skautas', 'Urvų padaras', 'Goblinų skautas', 'Urvų padaras'] },
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
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Kaimo gynėjas' }, { kind: 'unit', side: 'ai', cardName: 'Goblinų skautas' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Kaimo gynėjas' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Goblinų skautas' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-unit', targetName: 'Goblinų skautas' }],
    wrongHint: 'Tempk paryškintą savo padarą ant paryškinto priešo.',
    complete: { on: 'event', eventType: 'attack', side: 'you' } },
  { id: 'clean-kill',
    dialogue: [say('l2-s03', 'Priešas krito — bet net žūdamas jis spėjo kirsti atgal.',
      'Priešas krito. Bet pažvelk į savo karį — jis irgi kruvinas. Ravenof\'e smūgiai kertami vienu metu: net mirdamas gynėjas spėja atsakyti. Vienintelis, kuris neatsako — sušaldytas.')],
    // Close-up į SAVO padarą: matosi, kad ir jis gavo atgal (žala kertama vienu metu).
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Kaimo gynėjas' }],
    zoom: { kind: 'unit', side: 'you', cardName: 'Kaimo gynėjas' },
    complete: { on: 'next' } },
  { id: 'retaliation-rule', objective: 'Suprask mainus',
    dialogue: [say('l2-s04', 'Kai puoli padarą — jis kerta atgal. Kiekviena ataka yra mainai.',
      'Bet dabar klausyk atidžiai, nes čia žūsta naujokai. Kai puoli padarą — jis kerta atgal. Tu gauni jo atakos žalą, nesvarbu, ar jis išgyvena. Kiekviena ataka yra mainai.')],
    highlight: [{ kind: 'unit', side: 'ai', cardName: 'Plėšrus žvėris' }], arrowTo: { kind: 'unit', side: 'ai', cardName: 'Plėšrus žvėris' }, arrowStyle: 'pulse',
    zoom: { kind: 'unit', side: 'ai', cardName: 'Plėšrus žvėris' }, complete: { on: 'next' } },
  { id: 'trade-math',
    dialogue: [say('l2-s05', 'Jo 3/3 prieš tavo 3/4: jis žus, tau liks viena gyvybė. Visada skaičiuok.',
      'Pažvelk: jo ataka trys, gyvybės trys. Tavo — trys ir keturi. Pulsi — jis žus, bet tau liks viena gyvybė. Verta? Dažnai — taip. Bet visada skaičiuok.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Geležinis sargas' }, { kind: 'unit', side: 'ai', cardName: 'Plėšrus žvėris' }],
    zoom: { kind: 'unit', side: 'you', cardName: 'Geležinis sargas' }, complete: { on: 'next' } },
  { id: 'trade-do', objective: 'Atlik mainus',
    dialogue: [say('l2-s06', 'Pulk. Pajusk mainus savo kailiu.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Geležinis sargas' }, { kind: 'unit', side: 'ai', cardName: 'Plėšrus žvėris' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Geležinis sargas' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Plėšrus žvėris' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-unit', targetName: 'Plėšrus žvėris' }],
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
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Sienos lankininkas' }, { kind: 'anchor', anchor: 'hp-ai' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Sienos lankininkas' }, arrowTo: { kind: 'anchor', anchor: 'hp-ai' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-face' }],
    wrongHint: 'Tempk padarą ant PRIEŠO herbo viršuje.',
    complete: { on: 'event', eventType: 'attack', side: 'you' } },
  { id: 'end-turn', objective: 'Baik ėjimą ir pajusk priešo smūgį',
    dialogue: [say('sys-turn-enemy', 'Baik ėjimą. Priešo ėjimas — stebėk.', 'Priešo ėjimas. Stebėk.')],
    highlight: [{ kind: 'button', id: 'end-turn' }], arrowTo: { kind: 'button', id: 'end-turn' }, arrowStyle: 'pulse',
    allow: [{ kind: 'end-turn' }], complete: { on: 'event', eventType: 'endTurn', side: 'you' } },
  { id: 'enemy-hits',
    enemyScript: [{ type: 'attack', attackerCard: 'Akmeninis golemas', face: true }, { type: 'endTurn' }],
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
      player: { gold: 300, board: ['Kaimo gynėjas', 'Geležinis sargas', 'Sienos lankininkas'],
                hand: ['Naujokas kareivis'], deck: ['Kaimo gynėjas', 'Geležinis sargas', 'Naujokas kareivis', 'Sienos lankininkas'] },
      enemy: { hp: 14, board: ['Goblinų skautas', 'Plėšrus žvėris', 'Akmeninis golemas'],
               deck: ['Urvų padaras', 'Goblinų skautas', 'Urvų padaras'] },
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
    highlight: [{ kind: 'handCard', cardName: 'Ugnies sviedinys' }, { kind: 'unit', side: 'ai', cardName: 'Plėšrus žvėris' }],
    arrowFrom: { kind: 'handCard', cardName: 'Ugnies sviedinys' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Plėšrus žvėris' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-spell', cardName: 'Ugnies sviedinys' }],
    complete: { on: 'event', eventType: 'spell', side: 'you', cardName: 'Ugnies sviedinys' } },
  { id: 'docked-preview',
    dialogue: [say('l3-s03', 'Tempiant kortos aprašymas lieka kairėje — skaityk jį renkantis taikinį.',
      'Pastebėjai? Kol tempi, kortos aprašymas lieka kairiajame krašte. Skaityk jį rinkdamasis taikinį — tekstas visada svarbiau už atmintį.')],
    complete: { on: 'next' } },
  { id: 'aoe', objective: 'Paleisk audrą (AOE)',
    dialogue: [say('l3-s04', 'Šis burtas taikinių nesirenka — kerta VISUS priešo padarus.',
      'O šis burtas — audra. Taikinių nesirenka: kerta visus priešo padarus iš karto. Tokie burtai brangūs, bet apverčia kovą. Paleisk.')],
    highlight: [{ kind: 'handCard', cardName: 'Ašmenų pūga' }, { kind: 'anchor', anchor: 'units-ai' }],
    arrowFrom: { kind: 'handCard', cardName: 'Ašmenų pūga' }, arrowTo: { kind: 'anchor', anchor: 'units-ai' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-spell', cardName: 'Ašmenų pūga' }],
    complete: { on: 'event', eventType: 'spell', side: 'you', cardName: 'Ašmenų pūga' } },
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
    highlight: [{ kind: 'handCard', cardName: 'Spąstų kilpa' }, { kind: 'anchor', anchor: 'reactions-you' }],
    arrowFrom: { kind: 'handCard', cardName: 'Spąstų kilpa' }, arrowTo: { kind: 'anchor', anchor: 'reactions-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-any', cardName: 'Spąstų kilpa' }],
    complete: { on: 'event', eventType: 'reactionSet', side: 'you' } },
  { id: 'wait-for-trap', objective: 'Baik ėjimą ir lauk',
    dialogue: [say('l3-s08', 'Dabar lauk. Priešas puls. Ir tada...')],
    highlight: [{ kind: 'button', id: 'end-turn' }], arrowTo: { kind: 'button', id: 'end-turn' }, arrowStyle: 'pulse',
    allow: [{ kind: 'end-turn' }], complete: { on: 'event', eventType: 'endTurn', side: 'you' } },
  { id: 'trap-springs',
    enemyScript: [{ type: 'attack', attackerCard: 'Urvų padaras', targetCard: 'Kaimo gynėjas' }, { type: 'endTurn' }],
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
      player: { gold: 900, board: ['Kaimo gynėjas', 'Geležinis sargas'],
                hand: ['Ugnies sviedinys', 'Ašmenų pūga', 'Spąstų kilpa', 'Gydanti šviesa'],
                deck: ['Naujokas kareivis', 'Sienos lankininkas', 'Kaimo gynėjas'] },
      enemy: { hp: 8, board: ['Urvų padaras', 'Plėšrus žvėris', 'Goblinų skautas'],
               deck: ['Urvų padaras', 'Goblinų skautas'] },
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
    highlight: [{ kind: 'anchor', anchor: 'hand' }], zoom: { kind: 'anchor', anchor: 'hand' }, complete: { on: 'next' } },
  { id: 'summon-champ', objective: 'Paaukok dvi kortas ir iškviesk čempioną',
    dialogue: [say('l4-s03', 'Paaukok dvi kortas. Tegul ateina.')],
    highlight: [{ kind: 'handCard', cardName: 'Korvo mokinys' }], arrowTo: { kind: 'handCard', cardName: 'Korvo mokinys' }, arrowStyle: 'pulse',
    allow: [{ kind: 'play-any', cardName: 'Korvo mokinys' }],
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
    highlight: [{ kind: 'handCard', cardName: 'Korvo riteris' }], arrowTo: { kind: 'handCard', cardName: 'Korvo riteris' }, arrowStyle: 'pulse',
    allow: [{ kind: 'upgrade-champion' }, { kind: 'play-any', cardName: 'Korvo riteris' }],
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
      player: { gold: 1000, board: ['Geležinis sargas', 'Sienos lankininkas'],
                hand: ['Korvo mokinys', 'Naujokas kareivis', 'Kaimo gynėjas', 'Korvo riteris', 'Naujokas kareivis', 'Sienos lankininkas'],
                deck: ['Kaimo gynėjas', 'Geležinis sargas', 'Naujokas kareivis'] },
      enemy: { hp: 10, board: ['Urvų padaras'], deck: ['Goblinų skautas', 'Urvų padaras'] },
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
    highlight: [{ kind: 'handCard', cardName: 'Senovinis vimpelas' }, { kind: 'anchor', anchor: 'artifacts-you' }],
    arrowFrom: { kind: 'handCard', cardName: 'Senovinis vimpelas' }, arrowTo: { kind: 'anchor', anchor: 'artifacts-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-any', cardName: 'Senovinis vimpelas' }],
    complete: { on: 'event', eventType: 'artifact', side: 'you' } },
  { id: 'artifact-works',
    dialogue: [say('l5-s03', 'Kiekvieno tavo ėjimo pradžioje jis dirbs tau. Nemokamai.',
      'Matai? Kiekvieno tavo ėjimo pradžioje jis dirbs tau. Nemokamai. Amžinai — arba kol stovi.')],
    highlight: [{ kind: 'anchor', anchor: 'artifacts-you' }], zoom: { kind: 'anchor', anchor: 'artifacts-you' }, complete: { on: 'next' } },
  { id: 'field', objective: 'Sužaisk lauko kortą',
    dialogue: [say('l5-s04', 'LAUKO korta keičia patį mūšio lauką. Žaisk ją ir žiūrėk atidžiai.')],
    highlight: [{ kind: 'handCard', cardName: 'Prakeiktas laukas' }, { kind: 'anchor', anchor: 'field' }],
    arrowFrom: { kind: 'handCard', cardName: 'Prakeiktas laukas' }, arrowTo: { kind: 'anchor', anchor: 'field' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-any', cardName: 'Prakeiktas laukas' }],
    complete: { on: 'event', eventType: 'field', side: 'you' } },
  { id: 'field-both',
    dialogue: [say('l5-s05', 'Arena pasikeitė. Lauko galia veikia ABU — ir tave.',
      'Pati arena pasikeitė... Lauko kortos galia veikia abu žaidėjus. Ir tave. Rinkis lauką, kuris tavo kaladei naudingesnis nei priešo.')],
    highlight: [{ kind: 'anchor', anchor: 'field' }], arrowTo: { kind: 'anchor', anchor: 'field' }, arrowStyle: 'pulse',
    zoom: { kind: 'anchor', anchor: 'field' }, complete: { on: 'next' } },
  { id: 'field-replace', objective: 'Pakeisk lauką',
    apply: { goldYou: 1000 },
    dialogue: [say('l5-s06', 'Naujas laukas išstumia senąjį. Vienu metu — tik vienas pasaulis.')],
    highlight: [{ kind: 'handCard', cardName: 'Šventyklos kiemas' }, { kind: 'anchor', anchor: 'field' }],
    arrowFrom: { kind: 'handCard', cardName: 'Šventyklos kiemas' }, arrowTo: { kind: 'anchor', anchor: 'field' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-any', cardName: 'Šventyklos kiemas' }],
    complete: { on: 'event', eventType: 'field', side: 'you' } },
  { id: 'aura', objective: 'Iškviesk auros nešėją',
    dialogue: [say('l5-s07', 'AUROS: padaras stiprina savus vien BŪDAMAS lentoje. Aura dingsta kartu su nešėju.',
      'Dar viena tyli jėga — auros. Kai kurie padarai vien būdami lentoje stiprina savus... ar nuodija priešus. Aura dingsta kartu su nešėju — todėl auros nešėjai visada pirmi taikiniai.')],
    highlight: [{ kind: 'handCard', cardName: 'Vėliavnešys Aurėjas' }],
    arrowFrom: { kind: 'handCard', cardName: 'Vėliavnešys Aurėjas' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Vėliavnešys Aurėjas' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Vėliavnešys Aurėjas' } },
  { id: 'aura-see',
    dialogue: [say('sys-good-1', 'Puiku. Pažvelk — tavo padarų skaičiai paaugo.', 'Puiku.')],
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
      player: { gold: 1000, board: ['Kaimo gynėjas', 'Geležinis sargas'],
                hand: ['Senovinis vimpelas', 'Prakeiktas laukas', 'Šventyklos kiemas', 'Vėliavnešys Aurėjas', 'Naujokas kareivis'],
                deck: ['Naujokas kareivis', 'Sienos lankininkas'] },
      enemy: { hp: 10, board: ['Urvų padaras'], deck: ['Goblinų skautas', 'Urvų padaras'] },
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
    dialogue: [say('l6-s02', 'ŠALTIS: užšaldytas padaras NEATSAKO į smūgius. Užšaldyk golemą.',
      'Šaltis. Užšaldytas padaras neatsako į smūgius. Pulk jį — jis tylės. Ledo magai tuo ir gyvena.')],
    highlight: [{ kind: 'handCard', cardName: 'Ledo gniaužtai' }, { kind: 'unit', side: 'ai', cardName: 'Akmeninis golemas' }],
    arrowFrom: { kind: 'handCard', cardName: 'Ledo gniaužtai' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Akmeninis golemas' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-spell', cardName: 'Ledo gniaužtai' }],
    complete: { on: 'event', eventType: 'spell', side: 'you', cardName: 'Ledo gniaužtai' } },
  { id: 'freeze-attack', objective: 'Pulk užšaldytą — be atsako',
    dialogue: [say('sys-good-3', 'Dabar pulk jį. Atsakomojo smūgio nebus.', 'Gerai, mokiny.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Geležinis sargas' }, { kind: 'unit', side: 'ai', cardName: 'Akmeninis golemas' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Geležinis sargas' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Akmeninis golemas' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-unit', targetName: 'Akmeninis golemas' }],
    complete: { on: 'event', eventType: 'attack', side: 'you' } },

  // ── APSVAIGIMAS ──
  { id: 'stun', objective: 'Apsvaigink priešą',
    apply: { addBoardAi: ['Urvų padaras'], goldYou: 1000 },
    dialogue: [say('l6-s03', 'APSVAIGIMAS: padaras praleidžia savo ėjimą.',
      'Apsvaigimas. Apsvaigintas padaras praleidžia savo ėjimą — nei puola, nei ginasi protingai. Nukalk jo sargą, kol miega.')],
    highlight: [{ kind: 'handCard', cardName: 'Trenksmas' }, { kind: 'unit', side: 'ai', cardName: 'Urvų padaras' }],
    arrowFrom: { kind: 'handCard', cardName: 'Trenksmas' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Urvų padaras' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-spell', cardName: 'Trenksmas' }],
    complete: { on: 'event', eventType: 'spell', side: 'you', cardName: 'Trenksmas' } },

  // ── NUODAI IR UGNIS ──
  { id: 'poison', objective: 'Apnuodyk',
    apply: { goldYou: 1000 },
    dialogue: [say('l6-s04', 'NUODAI: žala kas ėjimą IR nepalankios atakos — traukiamos dvi likimo kortos, galioja blogesnė.',
      'Nuodai ir ugnis ėda gyvybes kas ėjimą, po truputį. Bet nuodai kerta dukart: apnuodytas padaras dar ir puola nepalankiai — jam traukiamos dvi likimo kortos, o galioja blogesnė. Lėta mirtis — bet mirtis.')],
    highlight: [{ kind: 'handCard', cardName: 'Nuodų dūmai' }],
    arrowFrom: { kind: 'handCard', cardName: 'Nuodų dūmai' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Urvų padaras' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-spell', cardName: 'Nuodų dūmai' }],
    complete: { on: 'event', eventType: 'spell', side: 'you', cardName: 'Nuodų dūmai' } },
  { id: 'burn', objective: 'Padek',
    dialogue: [say('sys-good-2', 'O dabar — ugnis.', 'Būtent taip.')],
    highlight: [{ kind: 'handCard', cardName: 'Liepsnos antspaudas' }],
    arrowFrom: { kind: 'handCard', cardName: 'Liepsnos antspaudas' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Akmeninis golemas' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-spell', cardName: 'Liepsnos antspaudas' }],
    complete: { on: 'event', eventType: 'spell', side: 'you', cardName: 'Liepsnos antspaudas' } },

  // ── SKYDAS IR SĖLINIMAS ──
  { id: 'shield-stealth', objective: 'Skydas ir sėlinimas',
    apply: { addBoardYou: ['Skydo naujokas', 'Šešėlių žvalgas'] },
    dialogue: [say('l6-s06', 'SKYDAS sugeria vieną smūgį pilnai. SĖLINIMAS slepia padarą, kol jis pats nesmogia.',
      'Skydas sugeria vieną smūgį pilnai. Sėlinimas slepia padarą nuo taikymosi, kol jis pats nesmogia.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Skydo naujokas' }, { kind: 'unit', side: 'you', cardName: 'Šešėlių žvalgas' }],
    zoom: { kind: 'unit', side: 'you', cardName: 'Skydo naujokas' }, complete: { on: 'next' } },

  // ── PROVOKACIJA ──
  { id: 'taunt', objective: 'Provokacija — siena',
    apply: { addBoardAi: ['Urvų sargas'] },
    dialogue: [say('l6-s07', 'PROVOKACIJA: kol jis lentoje — privalai pulti JĮ pirmiausia.',
      'Ir provokacija. Kol lentoje stovi provokuojantis padaras — privalai pulti jį pirmiausia. Jis — siena. Statyk sienas savo silpniems, griauk priešo sienas pirmas.')],
    highlight: [{ kind: 'unit', side: 'ai', cardName: 'Urvų sargas' }], arrowTo: { kind: 'unit', side: 'ai', cardName: 'Urvų sargas' }, arrowStyle: 'pulse',
    zoom: { kind: 'unit', side: 'ai', cardName: 'Urvų sargas' }, complete: { on: 'next' } },

  // ── NUTILDYMAS ──
  { id: 'silence', objective: 'Nutildyk sieną',
    apply: { goldYou: 1000 },
    dialogue: [say('l6-s05', 'NUTILDYMAS nuima nuo kortos VISKĄ — net Provokaciją. Nutildyk sargą.',
      'Nutildymas. Baisiausias iš visų. Nuima nuo kortos viską — tekstą, buffus, galias. Lieka tik kūnas ir skaičiai. Prieš galingą efektą — nutildymas.')],
    highlight: [{ kind: 'handCard', cardName: 'Tylos antspaudas' }, { kind: 'unit', side: 'ai', cardName: 'Urvų sargas' }],
    arrowFrom: { kind: 'handCard', cardName: 'Tylos antspaudas' }, arrowTo: { kind: 'unit', side: 'ai', cardName: 'Urvų sargas' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-spell', cardName: 'Tylos antspaudas' }],
    complete: { on: 'event', eventType: 'spell', side: 'you', cardName: 'Tylos antspaudas' } },

  // ── SPRINTAS ──
  { id: 'sprint-play', objective: 'Sprintas: pulk tą patį ėjimą',
    apply: { addHandYou: ['Vėjo raitelis'], goldYou: 1000 },
    dialogue: [say('l6-s08', 'SPRINTAS leidžia pulti tą patį ėjimą — jokios iškvietimo ligos.',
      'Sprintas leidžia pulti tą patį ėjimą, kai iškviestas — jokios iškvietimo ligos. Greitis kainuoja, bet stebina.')],
    highlight: [{ kind: 'handCard', cardName: 'Vėjo raitelis' }],
    arrowFrom: { kind: 'handCard', cardName: 'Vėjo raitelis' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Vėjo raitelis' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Vėjo raitelis' } },
  { id: 'sprint-attack', objective: 'Pulk iškart',
    dialogue: [say('sys-good-1', 'O dabar — pulk juo iškart.', 'Puiku.')],
    highlight: [{ kind: 'unit', side: 'you', cardName: 'Vėjo raitelis' }],
    arrowFrom: { kind: 'unit', side: 'you', cardName: 'Vėjo raitelis' }, arrowTo: { kind: 'anchor', anchor: 'units-ai' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'attack-any' }],
    complete: { on: 'event', eventType: 'attack', side: 'you' } },
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
      player: { gold: 1000, board: ['Geležinis sargas'],
                hand: ['Ledo gniaužtai', 'Trenksmas', 'Nuodų dūmai', 'Liepsnos antspaudas', 'Tylos antspaudas'],
                deck: ['Naujokas kareivis', 'Kaimo gynėjas', 'Sienos lankininkas'] },
      enemy: { hp: 40, board: ['Akmeninis golemas'], deck: ['Urvų padaras', 'Goblinų skautas', 'Plėšrus žvėris'] },
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
    highlight: [{ kind: 'handCard', cardName: 'Prakeiksmų šauklys' }, { kind: 'anchor', anchor: 'deck-ai' }],
    arrowFrom: { kind: 'handCard', cardName: 'Prakeiksmų šauklys' }, arrowTo: { kind: 'anchor', anchor: 'units-you' }, arrowStyle: 'drag-path',
    allow: [{ kind: 'play-unit', cardName: 'Prakeiksmų šauklys' }],
    complete: { on: 'event', eventType: 'play', side: 'you', cardName: 'Prakeiksmų šauklys' } },
  { id: 'inject-explain',
    dialogue: [say('l7-s04', 'Priešas trauks kortas... ir vieną dieną ištrauks TAVO prakeiksmą.',
      'O dabar gražiausia. Priešas trauks kortas... ir vieną dieną ištrauks tavo prakeiksmą. Tada jis suveiks. Jo rankoje. Jo ėjime.')],
    complete: { on: 'next' } },
  { id: 'end-turn', objective: 'Baik ėjimą — tegul traukia',
    apply: { seedEnemyDeckTop: ['Kraujo prakeiksmas'] },
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
      player: { gold: 600, board: ['Kaimo gynėjas'],
                hand: ['Prakeiksmų šauklys', 'Tamsos ženklas'],
                deck: ['Naujokas kareivis', 'Geležinis sargas', 'Sienos lankininkas'],
                curses: ['Kraujo prakeiksmas', 'Silpnumo prakeiksmas', 'Alkio prakeiksmas'] },
      enemy: { hp: 30, board: ['Urvų padaras'], deck: ['Goblinų skautas', 'Urvų padaras', 'Plėšrus žvėris'] },
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
    highlight: [{ kind: 'handCard', cardName: 'Ašmenų pūga' }],
    arrowTo: { kind: 'handCard', cardName: 'Ašmenų pūga' }, arrowStyle: 'pulse',
    zoom: { kind: 'handCard', cardName: 'Ašmenų pūga' },
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
    enemyScript: [{ type: 'attack', attackerCard: 'Urvų padaras', face: true }, { type: 'endTurn' }],
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
      player: { hand: ['Naujokas kareivis', 'Ašmenų pūga', 'Kaimo gynėjas', 'Mirtinas smūgis', 'Sienos lankininkas'],
                deck: ['Geležinis sargas', 'Naujokas kareivis', 'Kaimo gynėjas'] },
      enemy: { hp: 30, board: ['Urvų padaras'], deck: ['Goblinų skautas', 'Urvų padaras', 'Plėšrus žvėris'] },
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
