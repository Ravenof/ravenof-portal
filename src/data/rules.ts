export type RuleBlockType =
  | 'paragraph'
  | 'list'
  | 'table'
  | 'callout'
  | 'example'
  | 'warning'
  | 'cardSlot'
  | 'tokenGrid'
  | 'battlefieldDiagram'
  | 'quickReference'
  | 'dmdBlock'
  | 'cardTypeGrid'
  | 'championBlock'
  | 'goldProgression'
  | 'cardAnatomy'

export interface RuleBlock {
  type: RuleBlockType
  text?: string
  items?: string[]
  headers?: string[]
  rows?: string[][]
  calloutVariant?: 'important' | 'example' | 'warning' | 'quick'
  label?: string
}

export type RuleCategory =
  | 'pagrindai'
  | 'kaladė'
  | 'kortos'
  | 'kova'
  | 'žala'
  | 'čempionai'
  | 'statusai'
  | '2v2'
  | 'papildoma'

export interface RuleSection {
  id: string
  number: string
  title: string
  summary?: string
  category: RuleCategory
  content: RuleBlock[]
  relatedTerms?: string[]
}

export const RULES_SECTIONS: RuleSection[] = [
  {
    id: 'apie-zaidima',
    number: '1',
    title: 'Apie žaidimą ir tikslas',
    summary: 'Ravenof: Second Edition – dviejų žaidėjų kolekcinis kortų žaidimas tamsiame fantastiniame pasaulyje.',
    category: 'pagrindai',
    relatedTerms: ['HP', 'tikslas', '1v1', '2v2', 'laimėjimas'],
    content: [
      {
        type: 'paragraph',
        text: 'Ravenof: Second Edition yra dviejų žaidėjų (arba dviejų komandų) kolekcinis kortų žaidimas, vykstantis tamsiame fantastiniame pasaulyje, kuriame susiduria skirtingos frakcijos. Žaidėjai sudaro savo kaladę, pasirenka frakciją ir kovoja prieš priešininką – naudodami padarus, burtus, artefaktus ir kitus efektus siekia sumažinti priešininko gyvybės taškus iki nulio.',
      },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Tikslas',
        text: 'Laimi tas, kuris pirmas sumažina priešininko HP iki 0 arba žemiau.',
      },
      {
        type: 'list',
        items: [
          '1v1: kiekvienas žaidėjas pradeda su 40 HP.',
          '2v2: kiekviena komanda turi 60 bendrų HP.',
          'Žaidėjo HP negali viršyti pradinio maksimumo.',
        ],
      },
    ],
  },
  {
    id: 'komponentai',
    number: '2',
    title: 'Komponentai',
    summary: 'Kortų kaladės, Damage Modifier Deck, aukso monetos ir statusų žetonai.',
    category: 'pagrindai',
    relatedTerms: ['kaladė', 'DMD', 'Damage Modifier Deck', 'monetos', 'žetonai'],
    content: [
      {
        type: 'paragraph',
        text: 'Kiekvienas žaidėjas turi savo kortų kaladę (30–40 kortų) ir atskirą Damage Modifier Deck (20 kortų).',
      },
      { type: 'dmdBlock' },
      {
        type: 'paragraph',
        text: 'Aukso monetos: 10 monetų kiekvienam žaidėjui. Kiekviena moneta = 100 aukso.',
      },
      { type: 'tokenGrid' },
    ],
  },
  {
    id: 'kaladės-kurimas',
    number: '3',
    title: 'Kaladės kūrimas',
    summary: 'Kaladę sudaro 30–40 kortų. Tik viena frakcija + Neutralios kortos. Kopijų limitai pagal retumą.',
    category: 'kaladė',
    relatedTerms: ['kaladė', 'frakcija', 'Neutralios', 'Universalios', 'retumas', 'kopijų limitas'],
    content: [
      {
        type: 'list',
        items: [
          'Kaladę turi sudaryti 30–40 kortų.',
          'Galima naudoti tik vienos frakcijos kortas ir Neutralias / Universalias kortas.',
          'Dviejų skirtingų frakcijų kortų maišyti negalima.',
        ],
      },
      {
        type: 'table',
        label: 'Kortų kopijų limitai',
        headers: ['Retumas', 'Kopijų limitas kaladėje'],
        rows: [
          ['Paprasta', 'iki 2'],
          ['Magiška', 'iki 2'],
          ['Reta', 'iki 2'],
          ['Epiška', '1'],
          ['Legendinė', '1'],
          ['Čempionas', 'pagal savo retumą'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        text: 'Čempionai: Epiškas = 1 kopija, Legendinis = 1 kopija. To paties Čempiono kovos lauke negali būti daugiau nei 1 – skirtingų gali būti keli.',
      },
    ],
  },
  {
    id: 'frakcijos',
    number: '4',
    title: 'Frakcijos',
    summary: 'Frakcija nustato žaidimo stilių ir mechanikas. 8 unikalios frakcijos + Neutralios kortos.',
    category: 'kaladė',
    relatedTerms: ['frakcija', 'Demonų Orda', 'Mirties Maršas', 'Goblinų Gauja', 'Mistikos Melodija', 'Neutralios'],
    content: [
      {
        type: 'paragraph',
        text: 'Frakcija nustato žaidimo stilių ir turimas mechanikas. Kaladėje galima naudoti tik vienos frakcijos kortas ir Neutralias kortas.',
      },
      {
        type: 'table',
        label: 'Frakcijų stiliai',
        headers: ['Frakcija', 'Stilius ir mechanikos'],
        rows: [
          ['Demonų Orda', 'Sabotažas, prakeiksmai, priešininko kaladės ardymas. Psichologinis spaudimas ir tamsioji kontrolė.'],
          ['Mirties Maršas', 'Armijos plėtimas, kapinyno naudojimas, undead nuolatinis spaudimas.'],
          ['Plėšikų Naktis', 'Tempo, aukso vogimas, savos ekonomikos stiprinimas, greiti sprendimai.'],
          ['Goblinų Gauja', 'Chaosas, greita agresija, didelė rizika – efektai su šalutiniu poveikiu.'],
          ['Mistikos Melodija', 'Burtai, kontrolė, AoE žala, magiškos sinergijos ir reakcijos.'],
          ['Rytų Vėjas', 'Sėlinimas, tikslūs smūgiai, Pasišaipymo apėjimas, greitas tempo.'],
          ['Šviesos Pulkas', 'Gynyba, Pasišaipymas, Magiškasis skydas, struktūruotas board control.'],
          ['Inkvizicijos Legionas', 'Gydymas, buff\'ai, palaikymas, šviesos / tikėjimo sinergijos.'],
          ['Neutralios / Universalios', 'Tinka su bet kuria frakcija. Universalūs efektai, mažiau sinergijų.'],
        ],
      },
    ],
  },
  {
    id: 'kaip-skaityti-korta',
    number: '5',
    title: 'Kaip skaityti kortą',
    summary: 'Kiekviena korta turi: kainą, pavadinimą, tipą, frakciją, efektą, ATK, HP ir retumą.',
    category: 'kortos',
    relatedTerms: ['kaina', 'ATK', 'HP', 'retumas', 'frakcija', 'efekto tekstas'],
    content: [
      { type: 'cardAnatomy' },
      {
        type: 'list',
        items: [
          'Iškvietimo kaina: Kiek aukso mokama (viršuje dešinėje: aukso moneta).',
          'Pavadinimas: Kortos identifikatorius.',
          'Kortų tipas: Ikonėlė: Padaras, Burtas, Artefaktas ir kt.',
          'Frakcija: Kuriai frakcijai priklauso korta.',
          'Efekto tekstas: Kortų gebėjimai. Keyword\'ai paryškintu šriftu.',
          'ATK (⚔): Puolimo taškai – žalos kiekis atakuojant.',
          'HP (♥): Gyvybės taškai – kiek žalos atlaikoma.',
          'Retumas: Nurodo kopijų limitą kaladėje.',
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Pastaba',
        text: '+X/+Y formatas: Kairysis = ATK, dešinysis = HP. Pvz.: +1/0 = +1 ATK.',
      },
    ],
  },
  {
    id: 'kortu-tipai',
    number: '6',
    title: 'Kortų tipai',
    summary: '7 kortų tipai: Padaras, Burtas, Artefaktas, Prakeiksmas, Reakcija, Laukas, Čempionas.',
    category: 'kortos',
    relatedTerms: ['Padaras', 'Burtas', 'Artefaktas', 'Prakeiksmas', 'Reakcija', 'Laukas', 'Čempionas'],
    content: [
      { type: 'cardTypeGrid' },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Padaras',
        text: 'Pagrindinis kovos lauko vienetas su ATK ir HP. Negali pulti tą patį ėjimą – išskyrus Sprintą. Vienu metu iki 5 padarų (įskaitant Čempioną). HP = 0 → kapinynas.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Burtas',
        text: 'Vienkartinė korta su momentišku efektu. Sumoki kainą → efektas → kapinynas. Jei daro žalą – kiekvienam taikiniui atskira DMD korta.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Artefaktas',
        text: 'Ilgalaikė korta, kuri lieka kovos lauke. Turi HP, neturi ATK (nebent korta nurodo kitaip). Vienu metu iki 2 artefaktų. HP = 0 → kapinynas.',
      },
      {
        type: 'callout',
        calloutVariant: 'warning',
        label: 'Prakeiksmas',
        text: 'Įmaišomas į priešininko kaladę. Priešininkui ištraukus – efektas aktyvuojasi iš karto. Negalima suvaidinti iš rankos. Demonų Orda vs. Demonų Orda: prakeiksmai dedami atversti, jei abu žaidėjai turi skirtingus card sleeves.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Reakcija',
        text: 'Dedama užversta su kainos žetonu viršuje. Aktyvuojasi automatiškai kai išsipildo sąlyga. Žetonas rodo kainos dydį – priešininkas žino kiek kainavo, bet nežino efekto.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Laukas',
        text: 'Globali korta, keičianti kovos sąlygas visam laukui. Neturi HP. Gali būti tik 1 aktyvi Lauko korta – nauja pakeičia senąją.',
      },
    ],
  },
  {
    id: 'damage-modifier-deck',
    number: '7',
    title: 'Damage Modifier Deck',
    summary: 'Žalos modifikatorių kaladė – 20 kortų, traukiama kiekvieną kartą kai daroma žala.',
    category: 'žala',
    relatedTerms: ['DMD', 'Damage Modifier Deck', 'žala', 'modifikatorius', 'x2', 'x0', 'permaišymas'],
    content: [
      {
        type: 'paragraph',
        text: 'Kiekvienas žaidėjas turi atskirą 20 kortų Damage Modifier Deck. Ji naudojama kiekvieną kartą, kai daroma žala.',
      },
      { type: 'dmdBlock' },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Svarbu',
        text: 'Jei vienas efektas daro žalą keliems taikiniams – kiekvienam taikiniui traukiama ATSKIRA Damage Modifier korta.',
      },
      {
        type: 'list',
        items: [
          'Panaudotos kortos keliauja į discard pilą.',
          'Kaladė permaišoma (su discard pila) TIK ištraukus ×2 arba ×0.',
          'Žala negali nukristi žemiau 0. Nulinė žala negydo.',
          'Magiškojo skydo atveju žala blokuojama – DMD korta NETRAUKIAMA.',
          'Jei žala = 0, bet efektas turi papildomų veikimų (pvz., statusas) – jie VIS TIEK pritaikomi.',
        ],
      },
      {
        type: 'table',
        label: 'Žalos pavyzdžiai',
        headers: ['Situacija', 'Skaičiavimas', 'Rezultatas'],
        rows: [
          ['ATK 4, DMD: +1', '4 + 1', '5 žala'],
          ['ATK 2, DMD: −1', '2 − 1', '1 žala'],
          ['Efektas 1 žala, DMD: −2', '1 − 2 → min 0', '0 žala (negydo)'],
          ['ATK 3, DMD: ×2', '3 × 2, DMD permaišoma', '6 žala'],
          ['ATK 5, DMD: ×0', '5 × 0, DMD permaišoma', '0 žala'],
          ['Burtas 3 žala, 2 taikiniai', '2 atskiros DMD kortos', 'Kiekvienas gauna skirtingą'],
          ['Kovos ataka', 'Puolantysis ir ginantysis traukia savo kortą', '2 DMD kortos iš viso'],
        ],
      },
    ],
  },
  {
    id: 'kovos-laukas',
    number: '8',
    title: 'Kovos laukas',
    summary: 'Zonos: Kaladė, Kapinynas, Ranka (maks. 10), Padarų zona (maks. 5), Artefaktai (maks. 2), Reakcijos, Lauko korta, DMD.',
    category: 'pagrindai',
    relatedTerms: ['kovos laukas', 'kapinynas', 'ranka', 'padarų zona', 'artefaktai', 'reakcijos', 'lauko korta', 'DMD'],
    content: [
      {
        type: 'table',
        label: 'Kovos lauko zonos',
        headers: ['Zona', 'Aprašymas', 'Limitas'],
        rows: [
          ['Kaladės zona', 'Tavo kortų kaladė. Laikoma užversta.', '—'],
          ['Kapinynas', 'Panaudotos / žuvusios kortos. Atviras – abu žaidėjai mato.', '—'],
          ['Ranka', 'Tavo kortos. Priešininkas nemato.', 'maks. 10'],
          ['Padarų zona', 'Padarai ir Čempionas.', 'maks. 5'],
          ['Artefaktų zona', 'Aktyvūs artefaktai.', 'maks. 2'],
          ['Reakcijų zona', 'Reakcijų kortos – užverstos su kainos žetonu.', '—'],
          ['Lauko kortos zona', '1 aktyvi Lauko korta. Bendra abiem žaidėjams.', 'maks. 1'],
          ['Damage Modifier Deck', 'Atskira 20 kortų kaladė. Užversta.', '—'],
          ['DMD discard', 'Panaudotos DMD kortos.', '—'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'warning',
        text: 'Rankoje daugiau nei 10 kortų: perteklinės kortos (žaidėjo pasirinkimu) iš karto keliauja į kapinyną.',
      },
      { type: 'battlefieldDiagram' },
    ],
  },
  {
    id: 'pasiruosimas',
    number: '9',
    title: 'Pasiruošimas žaidimui',
    summary: 'Sumaišyk kaladę, DMD, išsirink kas pradeda, ištrauk pradinę ranką, nustatyk HP.',
    category: 'pagrindai',
    relatedTerms: ['mulligan', 'pradinė ranka', 'HP', 'DMD', 'pirmumas'],
    content: [
      {
        type: 'list',
        items: [
          '1. Sumaišykite kaladę. Kiekvienas žaidėjas sumaišo savo kaladę ir duoda priešininkui ją perkirsti.',
          '2. Sumaišykite DMD. Kiekvienas žaidėjas sumaišo savo 20 kortų Damage Modifier Deck.',
          '3. Išsirinkite, kas pradeda. Moneta, žirklės-popierius-akmuo, arba: pralaimėjęs paskutinį žaidimą renkasi pirmumas.',
          '4. Traukite pradinę ranką. Pirmasis žaidėjas: 4 kortos. Antrasis žaidėjas: 5 kortos.',
          '5. Mulligan (neprivalomas). Visas kortas galima įmaišyti atgal ir ištraukti naują ranką. Tik 1 kartą.',
          '6. Nustatykite HP. 1v1: 40 HP. 2v2: 60 bendrų HP komandai.',
        ],
      },
    ],
  },
  {
    id: 'ejimo-struktura',
    number: '10',
    title: 'Ėjimo struktūra',
    summary: '5 fazės: ėjimo pradžia → kortų traukimas → aukso gavimas → pagrindinė fazė → ėjimo pabaiga.',
    category: 'pagrindai',
    relatedTerms: ['ėjimas', 'fazė', 'kortų traukimas', 'pagrindinė fazė', 'ėjimo pabaiga', 'auksas'],
    content: [
      {
        type: 'table',
        label: 'Ėjimo fazės',
        headers: ['Fazė', 'Aprašymas'],
        rows: [
          ['1. Ėjimo pradžia', 'Aktyvuojasi ėjimo pradžios efektai: artefaktai, Degantis, Apnuodytas ir kt.'],
          ['2. Kortų traukimas', 'Traukiama 1 korta. Rankos limitas: 10 kortų – perteklius į kapinyną.'],
          ['3. Aukso gavimas', 'Gaunamas auksas pagal ėjimo numerį.'],
          ['4. Pagrindinė fazė', 'Veiksmų laisva tvarka kol užtenka aukso.'],
          ['5. Ėjimo pabaiga', 'Ėjimo pabaigos efektai. Nepanaudotas auksas dingsta.'],
        ],
      },
      {
        type: 'table',
        label: 'Galimi veiksmai pagrindinėje fazėje',
        headers: ['Veiksmas', 'Aprašymas'],
        rows: [
          ['Iškviesti padarą', 'Sumoki kainą → į padarų zoną. Tą ėjimą negali pulti (išskyrus Sprintą).'],
          ['Žaisti burtą', 'Sumoki kainą → efektas → kapinynas.'],
          ['Žaisti artefaktą', 'Sumoki kainą → į artefaktų zoną (maks. 2).'],
          ['Dėti reakciją', 'Sumoki kainą → užversta į reakcijų zoną + kainos žetonas.'],
          ['Žaisti prakeiksumą', 'Sumoki kainą → priešininkas įsimaišo į kaladę.'],
          ['Žaisti lauko kortą', 'Sumoki kainą → pakeičia esamą Lauko kortą.'],
          ['Iškviesti Čempioną (P1)', 'Sumoki kainą + Tribute.'],
          ['Evoliucionuoti Čempioną (P2/P3)', 'Sumoki kainą + Tribute → Čempionas pilnai pagyja.'],
          ['Naudoti Čempiono gebėjimą', '1 kartą per ėjimą.'],
          ['Pulti padaru', 'Kiekvienas padaras – 1 puolimas per ėjimą.'],
          ['Išmesti kortą dėl aukso', '+100 aukso už 1 kortą, 1 kartą per ėjimą.'],
        ],
      },
    ],
  },
  {
    id: 'aukso-sistema',
    number: '11',
    title: 'Aukso sistema',
    summary: 'Auksas auga po 100 kiekvieną ėjimą. Nepersikelia. 1 kortos išmetimas = +100 aukso.',
    category: 'pagrindai',
    relatedTerms: ['auksas', 'aukso sistema', 'kaina', 'ėjimas', 'ekonomika'],
    content: [
      { type: 'goldProgression' },
      {
        type: 'list',
        items: [
          'Nepanaudotas auksas į kitą ėjimą nepersikelia.',
          'Kortų kainos visada 100–1000 aukso intervalais.',
          'Kartą per ėjimą: išmeti 1 kortą iš rankos → +100 aukso.',
          'Aukso efektai veikia tik tą ėjimą (nebent korta nurodo kitaip).',
        ],
      },
    ],
  },
  {
    id: 'kovos-ir-zalos-taisykles',
    number: '12',
    title: 'Kovos ir žalos taisyklės',
    summary: 'Puolimo taikiniai, Pasišaipymas, žalos skaičiavimas, atgalinė žala, Magiškasis skydas.',
    category: 'kova',
    relatedTerms: ['puolimas', 'ataka', 'žala', 'Pasišaipymas', 'atgalinė žala', 'Magiškasis skydas', 'DMD'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Puolimo taikiniai',
        text: 'Priešininko padaras, žaidėjas, artefaktas arba Čempionas. Kiekvienas padaras gali pulti 1 kartą per ėjimą. Negali pulti tą patį ėjimą, kai buvo iškviestas (išskyrus Sprintą).',
      },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Pasišaipymas ir prioritetas',
        text: 'Jei kovos lauke yra priešininko padaras su Pasišaipymu – VISOS atakos privalo rinktis jį. Galioja atakoms į visus taikinius. Burtams ir efektams NEGALIOJA.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Žalos skaičiavimas',
        text: 'Puolant padarą: abu vienu metu daro žalą vienas kitam – kiekvienas traukia savo DMD kortą. Puolant žaidėją / artefaktą / Čempioną: puolantysis daro žalą su savo DMD korta, atgalinės žalos negauna.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Pavyzdys',
        text: 'Padaras 3/5 puola padarą 2/4. Puolantysis → DMD: +0 → 3 žala. Ginantysis → DMD: +1 → 3 žala. HP: 5−3=2 ir 4−3=1. Abu išgyvena.',
      },
      {
        type: 'list',
        items: [
          'Jei žala = 0 arba ×0, bet efektas turi papildomų veikimų (statusas ir kt.) – jie VIS TIEK pritaikomi.',
          'Žaidėjo HP negali viršyti pradinio maksimumo.',
          'Padarų ATK ir HP gali būti didinti be ribos.',
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Magiškasis skydas ir DMD',
        text: 'Magiškojo skydo atveju žala blokuojama, DMD korta NETRAUKIAMA. Po blokavimo Magiškasis skydas pašalinamas. Puolantysis vis tiek gauna atgalinę žalą (su savo DMD korta).',
      },
    ],
  },
  {
    id: 'cempionai',
    number: '13',
    title: 'Čempionai',
    summary: 'Galingiausias kortų tipas su 3 fazėmis ir gebėjimais. Neturi ATK. Naudoja Tribute iškvietimui.',
    category: 'čempionai',
    relatedTerms: ['Čempionas', 'Phase 1', 'Phase 2', 'Phase 3', 'Tribute', 'gebėjimai', 'fazės'],
    content: [
      { type: 'championBlock' },
    ],
  },
  {
    id: 'keyword-ai',
    number: '14',
    title: 'Raktažodžiai (Keyword\'ai)',
    summary: 'Sprintas, Pasišaipymas, Magiškasis skydas, Sėlinimas, Kovos šūksnis, Paskutinis noras, Pasyvus, Palaiminimas.',
    category: 'kortos',
    relatedTerms: ['Sprintas', 'Pasišaipymas', 'Magiškasis skydas', 'Sėlinimas', 'Kovos šūksnis', 'Paskutinis noras', 'Palaiminimas', 'keyword'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '▶ Sprintas',
        text: 'Padaras gali pulti TĄ PATĮ ėjimą, kai buvo iškviestas.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '⊙ Pasišaipymas',
        text: 'Visos priešininko atakos privalo rinktis šį padarą kaip taikinį. Burtams ir efektams negalioja. Keli Pasišaipymo padarai – priešininkas renkasi kurį pulti.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '✦★ Magiškasis skydas',
        text: 'Pirmą kartą gavęs žalą – jos nepatiria, DMD netraukiama. Po blokavimo Magiškasis skydas pašalinamas. Puolantysis vis tiek gauna atgalinę žalą.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '◑ Sėlinimas',
        text: 'Negali būti pasirinktas taikiniui kol pats neatakuoja. Pašalinamas po pirmos atakos. Neapsaugo nuo AoE efektų (pvz., „visiems priešininko padarams").',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Kovos šūksnis',
        text: 'Aktyvuojasi iš karto, kai korta iškviečiama į kovos lauką. Jei daro žalą – traukiama DMD korta.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Paskutinis noras',
        text: 'Aktyvuojasi kai padaro HP = 0. Efektas įvyksta PRIEŠ kortai keliaujant į kapinyną.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Pasyvus (∞)',
        text: 'Veikia nuolat kol korta yra kovos lauke. Palikus kovos lauką – nustoja veikti iš karto.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '🕊 Palaiminimas',
        text: 'Padaras traukia 2 DMD kortas ir pasirenka geresnį rezultatą kitai atakai. Po atakos Palaiminimas dingsta.',
      },
    ],
  },
  {
    id: 'statusai',
    number: '15',
    title: 'Statusai',
    summary: 'Laikini efektai: Sušaldytas ❄, Degantis 🔥, Apnuodytas ☠, Apsvaigintas ✦, Nutildytas 🔇.',
    category: 'statusai',
    relatedTerms: ['Sušaldytas', 'Degantis', 'Apnuodytas', 'Apsvaigintas', 'Nutildytas', 'statusas', 'žetonas'],
    content: [
      {
        type: 'paragraph',
        text: 'Statusai yra laikini efektai, žymimi žetonais ant kortos. Statusai negali kauptis. Padarui žūstant – visi statusai dingsta.',
      },
      {
        type: 'table',
        label: 'Statusų poveikiai',
        headers: ['Statusas', 'Žetonas', 'Poveikis', 'Trukmė', 'Pašalinimas'],
        rows: [
          ['Sušaldytas', '❄', 'Negali atakuoti. Čempionas negali naudoti gebėjimų.', '1 ėjimas', 'Automatiškai arba efektu.'],
          ['Degantis', '🔥', 'Patiria žalą (DMD) kiekvieno valdytojo ėjimo pradžioje.', 'Neterminuota', 'Efektu arba žūtis.'],
          ['Apnuodytas', '☠', 'Patiria žalą (DMD) kiekvieno valdytojo ėjimo pradžioje.', 'Neterminuota', 'Efektu arba žūtis.'],
          ['Apsvaigintas', '✦', 'Negali atakuoti. Čempionas negali naudoti gebėjimų.', '1 ėjimas', 'Automatiškai arba efektu.'],
          ['Nutildytas', '🔇', 'Efektai sustoja (pasyvūs, Kovos šūksnis, Paskutinis noras). Gebėjimai blokuojami.', 'Neterminuota', 'Efektu arba žūtis.'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        text: 'Degantis ir Apnuodytas abi traukia DMD kortą kiekvieną ėjimą. Skirtumas – efektų sinergijose (Ugnis vs Nuodai tipo kortose).',
      },
    ],
  },
  {
    id: 'efektu-tipai',
    number: '16',
    title: 'Efektų ir magijos tipai',
    summary: 'Ugnis, Ledas, Žaibas, Gydymas, Pastiprinimas, Nekrotinis, Susilpninimas, Nuodai, Coinflip ir kt.',
    category: 'kortos',
    relatedTerms: ['Ugnis', 'Ledas', 'Žaibas', 'Gydymas', 'Nekrotinis', 'Nuodai', 'Coinflip', 'magija', 'efektas'],
    content: [
      {
        type: 'paragraph',
        text: 'Efektų tipai yra klasifikacija sinergijoms ir sąveikoms. Viena korta gali turėti kelis tipus.',
      },
      {
        type: 'table',
        label: 'Efektų tipai',
        headers: ['Tipas', 'Aprašymas'],
        rows: [
          ['Ugnis', 'Šiluminė žala, Degimo statusas, ugnies sinergijos.'],
          ['Ledas', 'Šaltoji žala, Sušaldymo statusas, ledo sinergijos.'],
          ['Žaibas', 'Elektros žala, greiti smūgiai, grandinių efektai.'],
          ['Gydymas', 'HP atkūrimas žaidėjui ar padarui.'],
          ['Pastiprinimas', 'ATK, HP ar kitų statistikų didinimas.'],
          ['Nekrotinis', 'Tamsioji žala, kapinyno sinergijos, undead efektai.'],
          ['Susilpninimas', 'ATK, HP ar kitų statistikų mažinimas.'],
          ['Nuodai', 'Periodinė žala, Apnuodymo statusas.'],
          ['Artefaktas', 'Artefaktų sukūrimas, sąveika ar stiprinimas.'],
          ['Trigeris', 'Efektai, aktyvuojami išsipildžius sąlygai.'],
          ['Sinergija', 'Efektai, veikiantys kartu su kitomis kortomis ar tipais.'],
          ['Utility', 'Pagalbiniai efektai: kortų traukimas, auksas, judėjimas.'],
          ['Apsvaiginimas', 'Efektai, suteikiantys Apsvaiginimo statusą.'],
          ['Nutildymas', 'Efektai, suteikiantys Nutildymo statusą.'],
          ['Coinflip', 'Metamas žalos sekimo žetonas: žalia pusė = vienas efektas, raudona = kitas.'],
        ],
      },
    ],
  },
  {
    id: 'efektu-aktyvacija',
    number: '17',
    title: 'Efektų aktyvacijos tvarka',
    summary: 'Principas: „Paskutinis įvykęs – pirmas išsprendžiamas." Stack sistema.',
    category: 'kova',
    relatedTerms: ['stack', 'efektų tvarka', 'reakcija', 'aktyvacija', 'eilė'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'important',
        text: 'Principas: „Paskutinis įvykęs – pirmas išsprendžiamas." Kai vienu metu aktyvuojasi keli efektai, paskutinis pridėtas išsprendžiamas pirmas.',
      },
      {
        type: 'list',
        items: [
          'Žaidėjas aktyvuoja efektą (pvz., burtą).',
          'Jei šis sukelia kitą (pvz., reakcija) – naujasis pridedamas į eilės viršų.',
          'Sprendžiamas viršuje esantis efektas, tada kitas ir t. t.',
          'DMD korta traukiama tuo metu, kai žala išsprendžiama – ne iš anksto.',
          'Korta keliauja į kapinyną tik po to, kai visi jos efektai išsprendžiami.',
          'Paskutinis noras aktyvuojasi prieš kortai patenkant į kapinyną.',
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Pavyzdys',
        text: 'Žaidėjas žaidžia burtą (A). Priešininkas aktyvuoja reakciją (B). Sprendžiama: B → A.',
      },
    ],
  },
  {
    id: 'taikiniai',
    number: '18',
    title: 'Taikinių sąvokos',
    summary: 'Tavo padarai, draugiški padarai, visi padarai, priešininko padarai – svarbūs skirtumai.',
    category: 'kova',
    relatedTerms: ['taikinys', 'draugiški', 'priešininko padarai', 'Sėlinimas', 'AoE'],
    content: [
      {
        type: 'table',
        label: 'Taikinių terminija',
        headers: ['Terminas', 'Reikšmė'],
        rows: [
          ['Tavo padarai', 'Tik tavo padarai. Neapima sąjungininko (2v2).'],
          ['Draugiški padarai', 'Tavo ir sąjungininko padarai. Neapima efektą turinčio padaro.'],
          ['Visi padarai', 'Visi kovos lauke esantys padarai – tavo, sąjungininko ir priešininkų.'],
          ['Priešininko padarai', 'Visi priešininko (ar priešininkų komandos) padarai.'],
          ['Tam tikros frakcijos padarai', 'Tik nurodytos frakcijos padarai (pvz., Zombiai, Goblinai).'],
          ['Taikinys', 'Vienas pasirinktas padaras, žaidėjas, artefaktas arba Čempionas.'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'warning',
        text: 'Sėlinimo padarai NEGALI būti taikiniais net jei efektas nurodo „visus priešininko padarus".',
      },
    ],
  },
  {
    id: '2v2-taisykles',
    number: '19',
    title: '2v2 taisyklės',
    summary: 'Komandos 60 bendri HP. Ėjimų eilė: A1 → B1 → A2 → B2. Draugiški padarai apima abi komandos puses.',
    category: '2v2',
    relatedTerms: ['2v2', 'komanda', 'draugiški padarai', 'prakeiksmas', 'ėjimų eilė'],
    content: [
      {
        type: 'list',
        items: [
          'Kiekviena komanda turi 60 bendrų HP.',
          'Ėjimų eilė: Komanda A (ž.1) → Komanda B (ž.1) → Komanda A (ž.2) → Komanda B (ž.2).',
          '„Draugiški padarai" apima ABU komandos žaidėjų padarus.',
          '„Tavo padarai" = tik to konkretaus žaidėjo padarai.',
          'Prakeiksmas įmaišomas į PASIRINKTĄ priešininko kaladę.',
        ],
      },
    ],
  },
  {
    id: 'papildomos-taisykles',
    number: '20',
    title: 'Papildomos taisyklės',
    summary: 'Kaladė nesiatnaujina automatiškai. Žalos minimumas 0. Aukso efektai tik tą ėjimą.',
    category: 'papildoma',
    relatedTerms: ['kapinynas', 'HP maksimumas', 'ATK', 'auksas', 'kortų efektai'],
    content: [
      {
        type: 'list',
        items: [
          'Kaladė nesiatnaujina automatiškai – kortos iš kapinyno negrįžta, nebent specialus efektas leidžia.',
          'Žaidėjo HP negali viršyti pradinio maksimumo.',
          'Padarų ATK ir HP gali būti didinti be viršutinės ribos.',
          'Daroma žala nesustoja ties 0: taikinys gali žūti ir efektas vis tiek baigti skaičiavimą.',
          'Aukso efektai veikia tik tą ėjimą, nebent korta aiškiai nurodo kitaip.',
          'Kortų efektų sąlygos tikrinamos efekto aktyvavimo metu.',
        ],
      },
    ],
  },
]

export const RULE_CATEGORIES: { id: RuleCategory | 'viskas'; label: string }[] = [
  { id: 'viskas',    label: 'Viskas'     },
  { id: 'pagrindai', label: 'Pagrindai'  },
  { id: 'kaladė',    label: 'Kaladė'     },
  { id: 'kortos',    label: 'Kortos'     },
  { id: 'kova',      label: 'Kova'       },
  { id: 'žala',      label: 'Žala'       },
  { id: 'čempionai', label: 'Čempionai'  },
  { id: 'statusai',  label: 'Statusai'   },
  { id: '2v2',       label: '2v2'        },
  { id: 'papildoma', label: 'Papildoma'  },
]

export const QUICK_LINKS = [
  { label: 'Kaip laimėti?',         href: '#apie-zaidima'           },
  { label: 'Kaip veikia DMD?',      href: '#damage-modifier-deck'   },
  { label: 'Kaip veikia Čempionai?', href: '#cempionai'             },
  { label: 'Kiek kortų kaladėje?',  href: '#kaladės-kurimas'        },
  { label: 'Ką reiškia statusai?',  href: '#statusai'               },
]
