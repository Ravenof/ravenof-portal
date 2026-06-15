// ── Tutorial scenarijus ───────────────────────────────────────────────────────
// Vedami žingsniai (pirmi 2 tavo ėjimai) + vienkartiniai mechanikos patarimai,
// pasirodantys pirmą kartą sutikus mechaniką laisvame žaidime.

export type TutAnchor =
  | 'center' | 'hand' | 'gold' | 'hp' | 'deck' | 'discard'
  | 'units-you' | 'units-ai' | 'zmk' | 'artifacts' | 'reactions'
  | 'field' | 'end-turn' | 'ai-area' | 'discard-gold'

// Žingsnis su require – laukiama žaidėjo veiksmo; be require – mygtukas „Toliau"
export type TutRequire = 'play-unit' | 'attack' | 'end-turn' | 'any-play'

export type TutStep = {
  id: string
  title: string
  text: string
  anchor: TutAnchor
  require?: TutRequire
}

export const GUIDED_STEPS: TutStep[] = [
  {
    id: 'welcome',
    title: 'Sveikas atvykęs į Ravenof! 🐦‍⬛',
    text: 'Tai mokomoji kova prieš priešininką, kuris žaidžia pagal taisykles. Aš paaiškinsiu viską žingsnis po žingsnio. Pralaimėti čia neįmanoma blogai – tai treniruotė!',
    anchor: 'center',
  },
  {
    id: 'goal',
    title: 'Žaidimo tikslas',
    text: 'Abu žaidėjai pradeda su 40 gyvybės taškų (HP). Laimi tas, kuris pirmasis priešininko HP sumažina iki 0. Savo HP matai apačioje, priešininko – viršuje.',
    anchor: 'hp',
  },
  {
    id: 'zones',
    title: 'Kovos laukas',
    text: 'Apačioje – tavo pusė: ranka, padarų zona (5 vietos), artefaktai (2), reakcijos (3). Viršuje – priešininko. Viduryje – bendra lauko kortos zona.',
    anchor: 'units-you',
  },
  {
    id: 'hand-intro',
    title: 'Tavo ranka',
    text: 'Čia tavo kortos – priešininkas jų nemato. Rankoje telpa iki 10 kortų. Užvesk / palaikyk ant kortos, kad apžiūrėtum iš arti.',
    anchor: 'hand',
  },
  {
    id: 'gold-intro',
    title: 'Aukso sistema ⚜',
    text: 'Kiekvieno ėjimo pradžioje gauni aukso: 1 ėjimas = 100, 2 ėjimas = 200... iki 1000. Kortos kainuoja auksą. SVARBU: nepanaudotas auksas ėjimo pabaigoje DINGSTA – išleisk!',
    anchor: 'gold',
  },
  {
    id: 'zmk-intro',
    title: 'ŽMK – žalos modifikatorių kaladė',
    text: 'Kaskart, kai daroma žala, traukiama ŽMK korta: +0, +1, −1, +2, −2, ×2 arba ×0. Tavo 4 ATK smūgis gali tapti 5... arba 0! Tai – Ravenof likimo kauliukas.',
    anchor: 'zmk',
  },
  {
    id: 'play-first-unit',
    title: 'Iškviesk padarą!',
    text: 'Spustelėk kortą rankoje, kurią gali sau leisti (kaina ⚜ kairiame kampe), ir ji bus iškviesta į padarų zoną. Padaras negali atakuoti tą patį ėjimą, kai iškviestas (nebent turi ▶ Sprintą).',
    anchor: 'hand',
    require: 'play-unit',
  },
  {
    id: 'discard-gold-tip',
    title: 'Patarimas: korta → auksas',
    text: 'Kartą per ėjimą gali išmesti 1 kortą iš rankos ir gauti +100 aukso. Spausk mygtuką „+100⚜" ir pasirink kortą – arba praleisk.',
    anchor: 'discard-gold',
  },
  {
    id: 'end-first-turn',
    title: 'Baik ėjimą',
    text: 'Kai nebeturi ką veikti (ar aukso), spausk „Baigti ėjimą". Tada eis priešininkas – stebėk, ką jis daro!',
    anchor: 'end-turn',
    require: 'end-turn',
  },
  {
    id: 'watch-ai',
    title: 'Priešininko ėjimas',
    text: 'Priešininkas traukia kortą, gauna auksą ir žaidžia pagal tas pačias taisykles. Stebėk jo veiksmus įvykių juostoje viduryje.',
    anchor: 'ai-area',
  },
  {
    id: 'turn2-attack',
    title: 'Laikas atakuoti! ⚔',
    text: 'Tavo padaras jau gali pulti: spustelėk SAVO padarą, tada pasirink taikinį – priešininko padarą arba jį patį. Puolant padarą abu traukia po ŽMK kortą ir žalą daro vienu metu!',
    anchor: 'units-you',
    require: 'attack',
  },
  {
    id: 'free-play',
    title: 'Toliau – tavo rankose! 🎴',
    text: 'Nuo dabar žaisk laisvai. Naujas mechanikas paaiškinsiu, kai jas pirmą kartą sutiksi. Sėkmės kovoje – tegul ŽMK būna tau palanki!',
    anchor: 'center',
  },
]

// ── Vienkartiniai mechanikos patarimai (trigger -> patarimas) ─────────────────

export type TipKey =
  | 'zmk-special' | 'taunt' | 'sprint' | 'stealth' | 'shield'
  | 'battlecry' | 'lastwish' | 'status-frozen' | 'status-stunned'
  | 'status-burning' | 'status-poisoned' | 'status-silenced'
  | 'reaction' | 'field' | 'champion' | 'evolve' | 'hand-burn'
  | 'curse' | 'coin' | 'artifact' | 'unfavorable'

export const MECHANIC_TIPS: Record<TipKey, { title: string; text: string }> = {
  'zmk-special': {
    title: 'ŽMK ×2 / ×0!',
    text: 'Ištraukta speciali ŽMK korta! ×2 padvigubina žalą, ×0 anuliuoja. Po jos visa ŽMK kaladė su kapinynu permaišoma iš naujo.',
  },
  taunt: {
    title: '⊙ Pasišaipymas',
    text: 'Kol lauke yra padaras su Pasišaipymu, visos atakos PRIVALO taikytis į jį. Burtams ir efektams tai negalioja – juos gali mesti kur nori.',
  },
  sprint: {
    title: '▶ Sprintas',
    text: 'Padaras su Sprintu gali atakuoti tą patį ėjimą, kai buvo iškviestas – jokio laukimo!',
  },
  stealth: {
    title: '◑ Sėlinimas',
    text: 'Šio padaro negalima pasirinkti taikiniu, kol jis pats neatakuoja. Po pirmos atakos Sėlinimas dingsta. AoE efektai jį vis tiek pasiekia.',
  },
  shield: {
    title: '✦★ Magiškasis skydas',
    text: 'Skydas anuliuoja KITĄ žalą, kurią patirtų šis taikinys – ŽMK net netraukiama. Po to skydas dingsta.',
  },
  battlecry: {
    title: '📣 Kovos šūksnis',
    text: 'Efektas suveikia iš karto, kai korta iškviečiama į lauką. Jei daro žalą – traukiama ŽMK korta.',
  },
  lastwish: {
    title: '🕯 Paskutinis noras',
    text: 'Efektas aktyvuojasi padarui žūstant, prieš jam keliaujant į kapinyną. Nutildytas padaras Paskutinio noro neaktyvuoja.',
  },
  'status-frozen': {
    title: '❄ Sušaldytas',
    text: 'Padaras praleidžia kitą veikimo galimybę: negali atakuoti IR nedaro atgalinės žalos, jei puolamas. Būsena baigiasi jo valdytojo kito ėjimo pabaigoje.',
  },
  'status-stunned': {
    title: '✦ Apsvaigintas',
    text: 'Padaras negali atakuoti, bet atgalinę žalą daro. Tuo ir skiriasi nuo Sušaldymo.',
  },
  'status-burning': {
    title: '🔥 Degantis',
    text: 'Kiekvieno savo ėjimo pradžioje padaras gauna 1 bazinę žalą (+ŽMK). Dega tol, kol žūsta arba būseną pašalina efektas.',
  },
  'status-poisoned': {
    title: '☠ Apnuodytas',
    text: 'Kaip Degantis (1 žala kas ėjimą + ŽMK), bet dar ir puola NEPALANKIAI: traukia 2 ŽMK kortas ir ima blogesnę.',
  },
  'status-silenced': {
    title: '🔇 Nutildytas',
    text: 'Kortos gebėjimai neveikia: pasyvūs efektai, Kovos šūksnis, Paskutinis noras – viskas blokuojama.',
  },
  reaction: {
    title: '⚡ Reakcija',
    text: 'Užversta korta su aukso žetonu. Priešininkas mato kainą, bet ne efektą. Suveikia, kai išsipildo sąlyga – pvz., prieš ataką. „Paskutinė padėta – sprendžiama pirma."',
  },
  field: {
    title: '🌍 Lauko korta',
    text: 'Globali korta, veikianti ABU žaidėjus. Vienu metu aktyvi tik viena – nauja pakeičia senąją.',
  },
  champion: {
    title: '⚜ Čempionas',
    text: 'Čempionas NĖRA padaras: neturi ATK, neatakuoja, bet turi galingus gebėjimus (1 kartą per ėjimą). Iškvietimas kainuoja auksą IR padaro auką. Turi 3 fazes.',
  },
  evolve: {
    title: '⚜ Evoliucija',
    text: 'Čempionas evoliucionuoja tiesiai kovos lauke (reikia fazės kortos rankoje + aukos) ir pilnai pagyja. Gebėjimai stiprėja su kiekviena faze!',
  },
  'hand-burn': {
    title: 'Rankos limitas!',
    text: 'Rankoje telpa tik 10 kortų – perteklius sudega ir keliauja tiesiai į kapinyną. Nešykštėk kortų žaisti!',
  },
  curse: {
    title: '🕸 Prakeiksmas',
    text: 'Prakeiksmas įmaišomas į TAVO kaladę kortų efektais. Ištraukei – efektas suveikia iš karto ir korta keliauja į kapinyną.',
  },
  coin: {
    title: '🪙 Monetos metimas',
    text: 'Rizikos efektas: ŽALIA pusė – sėkmė, RAUDONA – nesėkmė arba šalutinis poveikis. Konkretų rezultatą nurodo kortos tekstas.',
  },
  artifact: {
    title: '⭐ Artefaktas',
    text: 'Ilgalaikė korta artefaktų zonoje (maks. 2). Turi HP, gali būti atakuojama, bet pats neatakuoja. Veikia, kol sunaikinamas.',
  },
  unfavorable: {
    title: 'Nepalankiai',
    text: 'Traukiamos 2 ŽMK kortos ir imamas BLOGESNIS rezultatas veiksmą atliekančiam žaidėjui. Taip puola apnuodyti padarai.',
  },
}
