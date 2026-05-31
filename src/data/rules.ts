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
  | 'rarityBlock'
  | 'factionGrid'
  | 'effectTypeGrid'

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
  | 'tikslas'
  | 'pasiruosimas'
  | 'zonos'
  | 'kaladė'
  | 'frakcijos'
  | 'kortų-tipai'
  | 'eiga'
  | 'kova'
  | 'zmk'
  | 'čempionai'
  | 'raktažodžiai'
  | 'būsenos'
  | 'reakcijos'
  | 'taikiniai'
  | '2v2'
  | 'duk'

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

  // ─── 1. APIE ŽAIDIMĄ ─────────────────────────────────────────────────────
  {
    id: 'apie-zaidima',
    number: '1',
    title: 'Apie žaidimą ir tikslas',
    summary: 'Ravenof: Antrasis leidimas - dviejų žaidėjų kolekcinis kortų žaidimas tamsiame fantastiniame pasaulyje.',
    category: 'tikslas',
    relatedTerms: ['HP', 'gyvybės taškai', 'tikslas', '1v1', '2v2', 'laimėjimas'],
    content: [
      {
        type: 'paragraph',
        text: 'Ravenof: Antrasis leidimas - dviejų žaidėjų arba dviejų komandų kolekcinis kortų žaidimas tamsiame fantastiniame pasaulyje. Žaidėjai kuria frakcijos kaladę, valdo padarus, burtus, artefaktus ir Čempionus, siekdami sumažinti priešininko gyvybės taškus iki 0.',
      },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Tikslas',
        text: 'Laimi tas žaidėjas, kuris pirmasis sumažina priešininko gyvybės taškus iki 0 arba žemiau.',
      },
      {
        type: 'list',
        items: [
          '1v1: kiekvienas žaidėjas pradeda su 40 gyvybės taškų.',
          '2v2: kiekviena komanda turi 60 bendrų gyvybės taškų.',
          'Žaidėjo gyvybės taškai negali viršyti pradinio maksimumo.',
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Kortos tekstas turi pirmenybę',
        text: 'Kortos tekstas turi pirmenybę prieš bendras taisykles. Jei korta leidžia atlikti veiksmą, kurio bendros taisyklės įprastai neleistų, vadovaujamasi kortos tekstu.',
      },
    ],
  },

  // ─── 2. KOMPONENTAI ──────────────────────────────────────────────────────
  {
    id: 'komponentai',
    number: '2',
    title: 'Komponentai',
    summary: 'Kortų kaladės, Žalos modifikatorių kaladė (ŽMK), aukso monetos ir būsenų žetonai.',
    category: 'pasiruosimas',
    relatedTerms: ['kaladė', 'ŽMK', 'Žalos modifikatorių kaladė', 'monetos', 'žetonai', 'DMD'],
    content: [
      {
        type: 'paragraph',
        text: 'Kiekvienas žaidėjas turi savo kortų kaladę (30-40 kortų) ir atskirą Žalos modifikatorių kaladę (ŽMK) iš 20 kortų. Žalos modifikatorių kaladė (ŽMK) - 20 kortų kaladė, naudojama žalai modifikuoti. Pilnos ŽMK taisyklės pateiktos ŽMK skyriuje.',
      },
      { type: 'dmdBlock' },
      {
        type: 'paragraph',
        text: 'Aukso monetos: 10 monetų kiekvienam žaidėjui. Kiekviena moneta = 100 aukso.',
      },
      {
        type: 'paragraph',
        text: 'Būsenų žetonai: naudojami gyvybės taškams, pastiprinimams, susilpninimams ir būsenoms sekti. Kiekvienas žetonas turi dvi puses.',
      },
      { type: 'tokenGrid' },
    ],
  },

  // ─── 3. KALADĖS KŪRIMAS ──────────────────────────────────────────────────
  {
    id: 'kaladės-kurimas',
    number: '3',
    title: 'Kaladės sudarymas',
    summary: 'Kaladę sudaro 30-40 kortų. Leidžiama naudoti tik vienos frakcijos kortas ir neutralias kortas. Kopijų kiekiai priklauso nuo retumo.',
    category: 'kaladė',
    relatedTerms: ['kaladė', 'frakcija', 'neutralios', 'universalios', 'retumas', 'kopijų limitas'],
    content: [
      {
        type: 'list',
        items: [
          'Kaladę turi sudaryti nuo 30 iki 40 kortų.',
          'Leidžiama naudoti tik vienos frakcijos kortas ir neutralias arba universalias kortas.',
          'Dviejų skirtingų frakcijų kortų vienoje kaladėje maišyti negalima.',
        ],
      },
      {
        type: 'table',
        label: 'Kortų kopijų kiekiai kaladėje',
        headers: ['Retumas', 'Maks. kopijų skaičius'],
        rows: [
          ['Paprasta',              'Iki 2'],
          ['Magiška',               'Iki 2'],
          ['Unikalus',              'Iki 2'],
          ['Epiška',                '1'],
          ['Legendinė',             '1'],
          ['Čempionas unikalus',    'Iki 2'],
          ['Čempionas legendinis',  '1'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        text: 'To paties Čempiono kovos lauke negali būti daugiau nei vienas. Skirtingų Čempionų gali būti keli.',
      },
    ],
  },

  // ─── 3b. RETUMAI ─────────────────────────────────────────────────────────
  {
    id: 'retumai',
    number: '3b',
    title: 'Retumų sistema',
    summary: '5 retumų lygiai: Paprasta, Magiška, Unikalus, Epiškas, Legendinis. Žymimi deimanto simboliu.',
    category: 'kaladė',
    relatedTerms: ['retumas', 'paprasta', 'magiška', 'unikalus', 'epiškas', 'legendinis', 'deimantas', 'kopijų limitas'],
    content: [
      { type: 'rarityBlock' },
      {
        type: 'paragraph',
        text: 'Kortos retumas nurodomas deimanto simboliu ant kortos. Kuo aukštesnis retumas, tuo galingesnis efektas ir mažesnis leidžiamų kopijų skaičius kaladėje.',
      },
    ],
  },

  // ─── 4. FRAKCIJOS ────────────────────────────────────────────────────────
  {
    id: 'frakcijos',
    number: '4',
    title: 'Frakcijos',
    summary: 'Frakcija nustato kaladės žaidimo stilių ir sinergijas. 8 unikalios frakcijos ir neutralios kortos.',
    category: 'frakcijos',
    relatedTerms: ['frakcija', 'Demonų Orda', 'Mirties Maršas', 'Goblinų Gauja', 'Mistikos Melodija', 'neutralios', 'negyvėliai', 'Monetos metimas'],
    content: [
      {
        type: 'paragraph',
        text: 'Frakcija nustato kaladės žaidimo stilių, pagrindines mechanikas ir sinergijas. Kaladėje galima naudoti tik vienos pasirinktos frakcijos kortas ir neutralias / universalias kortas.',
      },
      { type: 'factionGrid' },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Goblinų Gauja - Monetos metimas',
        text: 'Goblinų Gaujos kortos gali suteikti daugiau vertės nei įprastos kortos už tą pačią kainą, tačiau nesėkmės atveju gali sukelti šalutinį poveikį pačiam žaidėjui. Tai yra sąmoninga frakcijos identiteto dalis.',
      },
    ],
  },

  // ─── 5. KAIP SKAITYTI KORTĄ ──────────────────────────────────────────────
  {
    id: 'kaip-skaityti-korta',
    number: '5',
    title: 'Kaip skaityti kortą',
    summary: 'Kiekviena korta turi: aukso kainą, pavadinimą, tipą, frakciją, efekto tekstą, ATK, gyvybės taškus ir retumą.',
    category: 'kortų-tipai',
    relatedTerms: ['aukso kaina', 'ATK', 'gyvybės taškai', 'retumas', 'frakcija', 'efekto tekstas'],
    content: [
      { type: 'cardAnatomy' },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Efektų moduliatorių formatas',
        text: 'Efektuose įrašas +X/+Y reiškia puolimo ir gyvybės taškų pokytį. Pirmas skaičius keičia puolimą, antras - gyvybės taškus. Pvz.: +1/0 reiškia +1 ATK ir 0 gyvybės taškų pokytis.',
      },
    ],
  },

  // ─── 6. KORTŲ TIPAI ──────────────────────────────────────────────────────
  {
    id: 'kortu-tipai',
    number: '6',
    title: 'Kortų tipai',
    summary: '7 kortų tipai: Padaras, Burtas, Artefaktas, Prakeiksmas, Reakcija, Laukas, Čempionas.',
    category: 'kortų-tipai',
    relatedTerms: ['Padaras', 'Burtas', 'Artefaktas', 'Prakeiksmas', 'Reakcija', 'Laukas', 'Čempionas', 'kortų tipai'],
    content: [
      { type: 'cardTypeGrid' },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Kortų tipai nesutampa',
        text: 'Efektai, nukreipti į konkretų kortų tipą, veikia TIK tą tipą. Pvz.: efektas, nurodantis "padaras", neveikia Čempiono ar artefakto. Efektai, nurodantys "bet kuris taikinys", gali paveikti žaidėją, padarą, Čempioną arba artefaktą.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Padaras',
        text: 'Pagrindinis kovos lauko vienetas su ATK ir gyvybės taškais. Negali atakuoti tą patį ėjimą, kai buvo iškviestas, išskyrus padarus su Sprintu. Vienu metu kovos lauke gali būti iki 5 padarų (įskaitant Čempioną). Gyvybės taškams nukritus iki 0, padaras keliauja į panaudotų kortų krūvą.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Burtas',
        text: 'Vienkartinė korta su momentišku efektu. Žaidėjas sumoka aukso kainą, efektas aktyvuojamas, korta keliauja į panaudotų kortų krūvą, nebent kortos tekstas nurodo kitaip. Jei burtas padaro žalą - kiekvienam taikiniui traukiama atskira ŽMK korta.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Artefaktas',
        text: 'Ilgalaikė korta, kuri lieka kovos lauke ir nuolat veikia. Turi gyvybės taškus, bet neturi ATK, nebent kortos tekstas nurodo kitaip. Vienu metu gali būti aktyvūs iki 2 artefaktų. Gyvybės taškams nukritus iki 0, artefaktas keliauja į panaudotų kortų krūvą.',
      },
      {
        type: 'callout',
        calloutVariant: 'warning',
        label: 'Prakeiksmas',
        text: 'Korta, kuri trukdo priešininkui - įmaišoma į jo kaladę. Priešininkui ištraukus prakeiksmą - efektas iš karto aktyvuojamas, korta keliauja į panaudotų kortų krūvą. Prakeiksmo negalima žaisti tiesiai iš rankos. Jei abu žaidėjai žaidžia Demonų Ordos kaladėmis, prakeiksmai įmaišomi atversti - taip lengviau atskirti, kuri korta priklauso kuriam žaidėjui. Kai prakeiksmas ištraukiamas, jis išsprendžiamas pagal įprastas taisykles.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Reakcija',
        text: 'Užversta korta, kuri aktyvuojasi tada, kai išsipildo jos sąlyga. Padedama tik pagrindinės fazės metu, sumokėjus aukso kainą. Lieka užversta su aukso / kainos žetonu viršuje - žetonas rodo realiai sumokėtą kainą. Priešininkas mato, kiek kainavo, bet nežino efekto. Jei vienu metu gali aktyvuotis kelios reakcijos - pirmiausia sprendžiama ta, kuri aktyvavosi paskutinė. Vienu metu galima turėti iki 3 reakcijų.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Laukas',
        text: 'Globali korta, keičianti kovos sąlygas visam laukui. Neturi gyvybės taškų. Vienu metu gali būti aktyvios tik viena lauko korta - nauja pakeičia senąją. Efektas veikia abu žaidėjus, nebent kortos tekstas nurodo kitaip.',
      },
    ],
  },

  // ─── 7. ŽALOS MODIFIKATORIŲ KALADĖ ──────────────────────────────────────
  {
    id: 'zalos-modifikatoriaus-kalade',
    number: '7',
    title: 'Žalos modifikatorių kaladė (ŽMK)',
    summary: 'ŽMK - 20 kortų kaladė, traukiama kiekvieną kartą kai daroma žala.',
    category: 'zmk',
    relatedTerms: ['ŽMK', 'Žalos modifikatorių kaladė', 'žala', 'modifikatorius', 'DMD', 'x2', 'x0', 'permaišymas', 'ŽMK kapinynas'],
    content: [
      {
        type: 'paragraph',
        text: 'Kiekvienas žaidėjas turi atskirą Žalos modifikatorių kaladę (ŽMK) iš 20 kortų. Ji traukiama kiekvieną kartą, kai daroma žala.',
      },
      { type: 'dmdBlock' },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Keli taikiniai',
        text: 'Jei vienas efektas daro žalą keliems taikiniams - kiekvienam taikiniui traukiama atskira ŽMK korta.',
      },
      {
        type: 'list',
        items: [
          'Panaudotos ŽMK kortos keliauja į ŽMK kapinyną.',
          'Jei ištraukiama ×2 arba ×0 korta, pirmiausia iki galo išsprendžiama ta žala. Tada ši korta kartu su ŽMK kapilyno kortomis permaišoma ir suformuojama nauja ŽMK kaladė prieš kitą ŽMK traukimą.',
          'Žalos reikšmė niekada negali būti mažesnė nei 0. Jei ŽMK ar kitas efektas sumažintų žalą žemiau 0, ji laikoma 0. Neigiama žala negydo.',
          'Magiškojo skydo atveju žala blokuojama - ŽMK korta netraukiama.',
          'Jei žala = 0, bet efektas turi papildomų veiksmų (pvz., būsenos suteikimas) - jie vis tiek pritaikomi.',
          'Jei efektas turi kelias dalis, taikinio žūtis nesustabdo likusių to efekto dalių, nebent kortos tekstas nurodo kitaip.',
        ],
      },
      {
        type: 'table',
        label: 'Žalos skaičiavimo pavyzdžiai',
        headers: ['Situacija', 'Skaičiavimas', 'Rezultatas'],
        rows: [
          ['ATK 4, ŽMK: +1',             '4 + 1',               '5 žala'],
          ['ATK 2, ŽMK: -1',             '2 - 1',               '1 žala'],
          ['Efektas 1 žala, ŽMK: -2',    '1 - 2 = min. 0',      '0 žala (negydo)'],
          ['ATK 3, ŽMK: ×2',             '3 × 2, ŽMK permaišoma','6 žala'],
          ['ATK 5, ŽMK: ×0',             '5 × 0, ŽMK permaišoma','0 žala'],
          ['Burtas 3 žala, 2 taikiniai', '2 atskiros ŽMK kortos','Kiekvienas gauna skirtingą rezultatą'],
          ['Kovos ataka',                'Abu traukia savo ŽMK', '2 ŽMK kortos iš viso'],
        ],
      },
    ],
  },

  // ─── 8. KOVOS LAUKAS ─────────────────────────────────────────────────────
  {
    id: 'kovos-laukas',
    number: '8',
    title: 'Žaidimo zonos',
    summary: 'Pagrindinė kaladė, panaudotų kortų krūva, ranka (maks. 10), padarų zona (maks. 5), artefaktai (maks. 2), reakcijos (maks. 3), lauko korta, ŽMK.',
    category: 'zonos',
    relatedTerms: ['kovos laukas', 'panaudotų kortų krūva', 'ranka', 'padarų zona', 'artefaktai', 'reakcijos', 'lauko korta', 'ŽMK', 'pagrindinė kaladė'],
    content: [
      {
        type: 'table',
        label: 'Kovos lauko zonos',
        headers: ['Zona', 'Aprašymas', 'Maks.'],
        rows: [
          ['Pagrindinė kaladė',      'Žaidėjo kortų kaladė. Laikoma užversta.',                                       '-'],
          ['Panaudotų kortų krūva',  'Panaudotos ir žuvusios kortos. Atvira - abu žaidėjai mato.',                     '-'],
          ['Ranka',                  'Žaidėjo kortos. Priešininkas jų nemato.',                                        '10'],
          ['Padarų zona',            'Padarai ir Čempionas.',                                                          '5'],
          ['Artefaktų zona',         'Aktyvūs artefaktai.',                                                            '2'],
          ['Reakcijų zona',          'Reakcijų kortos - užverstos su aukso / kainos žetonu.',                         '3'],
          ['Lauko kortos zona',      'Aktyvi lauko korta. Bendra abiem žaidėjams.',                                   '1'],
          ['ŽMK',                   'Žalos modifikatorių kaladė. Laikoma užversta.',                                   '-'],
          ['ŽMK kapinynas',         'Panaudotos ŽMK kortos.',                                                          '-'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'warning',
        label: 'Pilnos zonos taisyklė',
        text: 'Jei zona pilna, į ją negalima padėti naujos kortos. Žaidėjas negali savo noru pašalinti savo padaro, artefakto ar reakcijos vien tam, kad padarytų vietos, nebent kortos tekstas aiškiai tai leidžia. Jei efektas turėtų padėti kortą į pilną zoną, ta efekto dalis neįvyksta.',
      },
      {
        type: 'callout',
        calloutVariant: 'warning',
        text: 'Jei rankoje yra daugiau nei 10 kortų - perteklinės kortos (žaidėjo pasirinkimu) iš karto keliauja į panaudotų kortų krūvą.',
      },
      { type: 'battlefieldDiagram' },
    ],
  },

  // ─── 9. PASIRUOŠIMAS ─────────────────────────────────────────────────────
  {
    id: 'pasiruosimas',
    number: '9',
    title: 'Pasiruošimas žaidimui',
    summary: 'Sumaišyk kaladę ir ŽMK, nuspręsk kas pradeda, ištrauk pradinę ranką, nustatyk gyvybės taškus.',
    category: 'pasiruosimas',
    relatedTerms: ['pradinės rankos keitimas', 'pradinė ranka', 'gyvybės taškai', 'ŽMK', 'pirmumas'],
    content: [
      {
        type: 'list',
        items: [
          '1. Sumaišykite kaladę. Kiekvienas žaidėjas sumaišo savo kaladę ir duoda priešininkui ją perkirsti.',
          '2. Sumaišykite ŽMK. Kiekvienas žaidėjas sumaišo savo 20 kortų Žalos modifikatorių kaladę.',
          '3. Nuspręskite, kas pradeda. Metant monetą, žaidžiant žirkles-popierių-akmenį arba: pralaimėjęs paskutinį žaidimą renkasi pradžią.',
          '4. Ištraukite pradinę ranką. Pirmasis žaidėjas traukia 4 kortas. Antrasis žaidėjas traukia 5 kortas. Antrasis žaidėjas turi vieną papildomą kortą kaip kompensaciją už tai, kad žaidžia antras.',
          '5. Pradinės rankos keitimas (neprivalomas). Visos kortos gali būti įmaišytos atgal ir ištraukta nauja ranka. Galima tik 1 kartą.',
          '6. Nustatykite gyvybės taškus. 1v1: 40 gyvybės taškų. 2v2: 60 bendrų gyvybės taškų komandai.',
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Pirmas ėjimas',
        text: 'Savo pirmo ėjimo pradžioje kiekvienas žaidėjas traukia 1 kortą kaip įprastai ir gauna 100 aukso. Kortą galima išmesti dėl papildomo +100 aukso jau pirmuoju ėjimu.',
      },
    ],
  },

  // ─── GREITA PRADŽIA ──────────────────────────────────────────────────────
  {
    id: 'greita-pradzya',
    number: '9b',
    title: 'Greita pradžia - pirmo ėjimo pavyzdys',
    summary: 'Pirmo ėjimo eiga žingsnis po žingsnio.',
    category: 'pasiruosimas',
    relatedTerms: ['pirmasis ėjimas', 'greita pradžia', 'auksas', 'kortos traukimas'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Pirmasis žaidėjas - pirmas ėjimas',
        text: 'Turima 4 kortos rankoje. Ėjimo pradžioje traukiama 1 korta (dabar 5 kortos). Gaunamas 100 aukso. Galima išmesti 1 kortą ir gauti papildomą +100 aukso (iš viso 200 aukso). Tada galima išžaisti 100 arba 200 aukso kainuojančią kortą. Jei iškviečiamas padaras, jis negali atakuoti tą patį ėjimą, nebent turi Sprintą. Ėjimo pabaigoje nepanaudotas auksas dingsta.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Antrasis žaidėjas - pirmas ėjimas',
        text: 'Turima 5 kortos rankoje. Ėjimo pradžioje traukiama 1 korta (dabar 6 kortos). Gaunamas 100 aukso. Galima išmesti 1 kortą ir gauti +100 aukso. Toliau veiksmai tokie patys kaip ir pirmajam žaidėjui.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Kaip išžaisti kortą',
        text: 'Norėdamas išžaisti kortą iš rankos, žaidėjas sumoka jos aukso kainą, įvykdo kortos tipo veiksmą ir pritaiko kortos tekstą. Jei kortos tekstas prieštarauja bendroms taisyklėms, kortos tekstas turi pirmenybę.',
      },
    ],
  },

  // ─── 10. ĖJIMO STRUKTŪRA ─────────────────────────────────────────────────
  {
    id: 'ejimo-struktura',
    number: '10',
    title: 'Ėjimo struktūra',
    summary: '5 fazės: ėjimo pradžia, kortos traukimas, aukso gavimas, pagrindinė fazė, ėjimo pabaiga.',
    category: 'eiga',
    relatedTerms: ['ėjimas', 'fazė', 'kortos traukimas', 'pagrindinė fazė', 'ėjimo pabaiga', 'auksas'],
    content: [
      {
        type: 'table',
        label: 'Ėjimo fazių tvarka',
        headers: ['Fazė', 'Aprašymas'],
        rows: [
          ['1. Ėjimo pradžia',    'Aktyvuojasi ėjimo pradžios efektai: artefaktai, Degantis, Apnuodytas ir kt. Būsenos, trunkančios 1 ėjimą, pašalinamos.'],
          ['2. Kortos traukimas', 'Žaidėjas traukia 1 kortą. Rankos limitas: 10 kortų - perteklius keliauja į panaudotų kortų krūvą.'],
          ['3. Aukso gavimas',    'Gaunamas auksas pagal ėjimo numerį (žr. skyrių "Aukso sistema").'],
          ['4. Pagrindinė fazė',  'Veiksmai atliekami bet kokia tvarka, kol žaidėjui užtenka aukso.'],
          ['5. Ėjimo pabaiga',    'Aktyvuojasi ėjimo pabaigos efektai. Nepanaudotas auksas dingsta.'],
        ],
      },
      {
        type: 'table',
        label: 'Galimi veiksmai pagrindinėje fazėje',
        headers: ['Veiksmas', 'Aprašymas'],
        rows: [
          ['Iškviesti padarą',                 'Sumokama aukso kaina - padaras perkeliamas į padarų zoną. Tą ėjimą jis negali atakuoti, išskyrus su Sprintu.'],
          ['Panaudoti burtą',                  'Sumokama aukso kaina - efektas aktyvuojamas - korta keliauja į panaudotų kortų krūvą.'],
          ['Padėti artefaktą',                 'Sumokama aukso kaina - artefaktas perkeliamas į artefaktų zoną (maks. 2).'],
          ['Padėti reakciją',                  'Sumokama aukso kaina - reakcija padedama užversta į reakcijų zoną su aukso / kainos žetonu.'],
          ['Panaudoti prakeiksmą',             'Sumokama aukso kaina - priešininkas įsimaišo kortą į savo kaladę.'],
          ['Žaisti lauko kortą',               'Sumokama aukso kaina - nauja lauko korta pakeičia esamą.'],
          ['Iškviesti Čempioną (1 fazė)',      'Sumokama aukso kaina ir aukojimas.'],
          ['Evoliucionuoti Čempioną (2/3 f.)', 'Sumokama aukso kaina ir aukojimas. Čempionas pilnai pagyja.'],
          ['Naudoti Čempiono gebėjimą',        '1 kartą per ėjimą.'],
          ['Atakuoti padaru',                  'Kiekvienas padaras gali atakuoti 1 kartą per ėjimą.'],
          ['Išmesti kortą dėl aukso',          '+100 aukso už 1 kortą iš rankos. 1 kartą per ėjimą. Galima jau pirmame ėjime.'],
        ],
      },
    ],
  },

  // ─── 11. AUKSO SISTEMA ───────────────────────────────────────────────────
  {
    id: 'aukso-sistema',
    number: '11',
    title: 'Aukso sistema',
    summary: 'Auksas auga 100 per kiekvieną ėjimą. Nepersikelia į kitą ėjimą. 1 kortos išmetimas = +100 aukso.',
    category: 'eiga',
    relatedTerms: ['auksas', 'aukso sistema', 'kaina', 'ėjimas', 'ekonomika'],
    content: [
      { type: 'goldProgression' },
      {
        type: 'list',
        items: [
          'Nepanaudotas auksas į kitą ėjimą nepersikelia.',
          'Kortų aukso kainos visada 100-1000 aukso intervalais.',
          'Kartą per ėjimą žaidėjas gali išmesti 1 kortą iš rankos ir gauti +100 aukso.',
          'Šis papildomas auksas gali viršyti einamojo ėjimo aukso ribą (pvz., 1 ėjime galima turėti 200 aukso).',
          'Aukso efektai veikia tik tą ėjimą, nebent kortos tekstas nurodo kitaip.',
        ],
      },
    ],
  },

  // ─── 12. KOVA IR ŽALA ────────────────────────────────────────────────────
  {
    id: 'kovos-ir-zalos-taisykles',
    number: '12',
    title: 'Kova ir žala',
    summary: 'Atakos taikiniai, Pasišaipymas, žalos skaičiavimas su ŽMK, atgalinė žala.',
    category: 'kova',
    relatedTerms: ['ataka', 'žala', 'Pasišaipymas', 'atgalinė žala', 'Magiškasis skydas', 'ŽMK'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Galimi atakos taikiniai',
        text: 'Priešininko padaras, priešininkas (žaidėjas), priešininko artefaktas arba Čempionas. Kiekvienas padaras gali atakuoti 1 kartą per ėjimą. Padaras negali atakuoti tą patį ėjimą, kai buvo iškviestas, išskyrus su Sprintu.',
      },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Pasišaipymas ir prioritetas',
        text: 'Jei kovos lauke yra priešininko padaras su Pasišaipymu - visos atakos privalo rinktis jį. Burtams ir kitiems efektams negalioja. Jei kovos lauke yra keli Pasišaipymo padarai - žaidėjas renkasi, kurį pulti.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Žalos skaičiavimas kovoje',
        text: 'Padaras atakuoja padarą: abu vienu metu daro žalą vienas kitam - kiekvienas traukia savo ŽMK kortą. Padaras atakuoja žaidėją, artefaktą arba Čempioną: puolantysis daro žalą su savo ŽMK korta, atgalinės žalos negauna.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Kovos pavyzdys',
        text: 'Padaras 3/5 atakuoja padarą 2/4. Puolantysis traukia ŽMK: +0, daro 3 žalos. Ginantysis traukia ŽMK: +1, daro 3 žalos. Rezultatas: puolančiojo liko 5-3=2, ginančiojo - 4-3=1 gyvybės taškų. Abu išgyvena.',
      },
      {
        type: 'list',
        items: [
          'Žalos padarams išlieka visam laikui - padarų gyvybės taškai tarp ėjimų neatsinaujina. Žalą galima sumažinti tik gydymo efektais.',
          'Žaidėjo gyvybės taškai negali viršyti pradinio maksimumo.',
          'Padarų ATK ir gyvybės taškai gali būti didinami be viršutinės ribos.',
          'Jei efektas turi kelias dalis, taikinio žūtis nesustabdo likusių to efekto dalių, nebent kortos tekstas nurodo kitaip.',
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Taikinio negaliojimas',
        text: 'Jei efektui išsisprendžiant jo pasirinktas taikinys nebėra galiojantis (pvz., jau žuvo), ta efekto dalis neįvyksta. Kitos efekto dalys vis tiek išsprendžiamos, jei jos nepriklauso nuo to taikinio.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Vienu metu žūstantys padarai',
        text: 'Jei vienu metu žūsta keli padarai su Paskutiniu noru, jų efektai aktyvuojami pagal padarų vietą lentoje iš kairės į dešinę, žiūrint iš jų valdytojo pusės.',
      },
    ],
  },

  // ─── 13. ČEMPIONAI ───────────────────────────────────────────────────────
  {
    id: 'cempionai',
    number: '13',
    title: 'Čempionai',
    summary: 'Atskiras kortų tipas su 3 fazėmis ir gebėjimais. Neturi ATK. Visi 3 gebėjimai pasiekiami nuo 1 fazės.',
    category: 'čempionai',
    relatedTerms: ['Čempionas', '1 fazė', '2 fazė', '3 fazė', 'aukojimas', 'gebėjimai', 'fazės'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Čempionas nėra Padaras',
        text: 'Čempionas yra atskiras kortų tipas. Jis nėra laikomas padaru, net jei yra padedamas padarų zonoje. Efektai, kurie nurodo "padaras", neveikia Čempiono, nebent kortos tekstas aiškiai nurodo "padaras arba Čempionas", "Čempionas" arba "bet kuris taikinys". Tas pats principas galioja artefaktams.',
      },
      {
        type: 'paragraph',
        text: 'Čempionas neturi ATK reikšmės - turi tik gyvybės taškus ir gebėjimus. Negali atlikti įprastos atakos, nebent kortos tekstas nurodo kitaip.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Gebėjimai',
        text: 'Čempionas turi 3 gebėjimus. Visi 3 gebėjimai yra pasiekiami nuo 1 fazės. Per vieną savo ėjimą žaidėjas gali panaudoti tik 1 to Čempiono gebėjimą. Gebėjimą galima naudoti tą patį ėjimą, kai Čempionas buvo iškviestas. Fazių stiprėjimas keičia Čempiono statistiką ir gebėjimų reikšmes pagal kortos tekstą.',
      },
      { type: 'championBlock' },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Evoliucija - reikalinga korta rankoje',
        text: 'Norint evoliucionuoti Čempioną į 2 arba 3 fazę, žaidėjas turi rankoje turėti tos fazės Čempiono kortą. Čempionas evoliucionuoja tiesiogiai kovos lauke - negrįžta į ranką.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Paaukotų kortų kelionė',
        text: 'Paaukoti padarai iš kovos lauko ir paaukotos kortos iš rankos keliauja į panaudotų kortų krūvą - ne iš žaidimo.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Aukso realybė',
        text: '1 fazė paprastai kainuoja 600 aukso + aukojimas, todėl realiai tai 5+ ėjimas. 2 fazė - 700, 3 fazė - 800. Aukso riba 10+ ėjime = 1000.',
      },
    ],
  },

  // ─── 14. RAKTAŽODŽIAI ────────────────────────────────────────────────────
  {
    id: 'raktazodziai',
    number: '14',
    title: 'Raktažodžiai',
    summary: 'Sprintas, Pasišaipymas, Magiškasis skydas, Sėlinimas, Kovos šūksnis, Paskutinis noras, Pasyvus.',
    category: 'raktažodžiai',
    relatedTerms: ['Sprintas', 'Pasišaipymas', 'Magiškasis skydas', 'Sėlinimas', 'Kovos šūksnis', 'Paskutinis noras', 'raktažodžiai', 'keyword'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '▶ Sprintas',
        text: 'Padaras gali atakuoti tą patį ėjimą, kai buvo iškviestas.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '⊙ Pasišaipymas',
        text: 'Visos priešininko atakos privalo rinktis šį padarą kaip taikinį. Burtams ir kitiems efektams negalioja. Jei kovos lauke yra keli Pasišaipymo padarai - priešininkas renkasi, kurį pulti.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '✦★ Magiškasis skydas',
        text: 'Magiškasis skydas anuliuoja kitą žalą, kurią patirtų šį skydą turintis taikinys. Po to Magiškasis skydas pašalinamas. Visi kiti kovos ar efekto veiksmai vyksta įprastai.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '◑ Sėlinimas',
        text: 'Šis padaras negali būti pasirinktas kaip konkretus taikinys, kol pats neatakuoja arba kol kortos tekstas nenurodo kitaip. Sėlinimas pašalinamas po pirmos atakos. Sėlinimas neapsaugo nuo efektų, kurie neprašo pasirinkti konkretaus taikinio (pvz.: "visi priešininko padarai gauna 1 žalos").',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Kovos šūksnis',
        text: 'Aktyvuojasi iš karto, kai korta iškviečiama į kovos lauką. Jei daro žalą - traukiama ŽMK korta. Kovos šūksnis nesuveikia, jei korta į kovos lauką patenka jau būdama Nutildyta.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Paskutinis noras',
        text: 'Aktyvuojasi kai padaro gyvybės taškai nukrinta iki 0. Efektas įvyksta prieš kortai keliaujant į panaudotų kortų krūvą. Jei korta žūsta būdama Nutildyta, jos Paskutinis noras neaktyvuojamas.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Pasyvus (∞)',
        text: 'Veikia nuolat kol korta yra kovos lauke. Kortai palikus kovos lauką - gebėjimas nustoja veikti iš karto.',
      },
    ],
  },

  // ─── 15. BŪSENŲ EFEKTAI ──────────────────────────────────────────────────
  {
    id: 'busenų-efektai',
    number: '15',
    title: 'Būsenų efektai',
    summary: 'Sušaldytas, Degantis, Apnuodytas, Apsvaigintas, Nutildytas. Būsena, trunkanti 1 ėjimą, pašalinama valdytojo sekančio ėjimo pradžioje.',
    category: 'būsenos',
    relatedTerms: ['Sušaldytas', 'Degantis', 'Apnuodytas', 'Apsvaigintas', 'Nutildytas', 'būsena', 'žetonas', 'nepalankiai'],
    content: [
      {
        type: 'paragraph',
        text: 'Būsenų efektai yra laikini, žymimi žetonais ant kortos. Tos pačios būsenos žetonai nesikaupia. Padarui žūstant - visi būsenų žetonai pašalinami. Būsena, kuri trunka 1 ėjimą, pašalinama jos valdytojo sekančio ėjimo pradžioje, nebent kortos tekstas nurodo kitaip.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '❄ Sušaldytas',
        text: 'Padaras praleidžia savo kitą veikimo galimybę: negali atakuoti ir nedaro atgalinės žalos. Jei Sušaldytas taikinys yra Čempionas, jis negali naudoti gebėjimo. Sušaldymas pašalinamas to taikinio valdytojo sekančio ėjimo pradžioje.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '✦ Apsvaigintas',
        text: 'Padaras praleidžia savo kitą veikimo galimybę: negali atakuoti. Jei Apsvaigintas taikinys yra Čempionas, jis negali naudoti gebėjimo. Apsvaigintas padaras vis tiek daro atgalinę žalą, jei yra puolamas. Apsvaiginimas pašalinamas to taikinio valdytojo sekančio ėjimo pradžioje.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '🔥 Degantis',
        text: 'Kiekvieno savo ėjimo pradžioje šis taikinys patiria 1 bazinę žalą. Šiai žalai traukiama ŽMK korta. Degantis nepašalinamas automatiškai - trunka tol, kol pašalinamas efektu arba padaras žūsta.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '☠ Apnuodytas',
        text: 'Kiekvieno savo ėjimo pradžioje šis taikinys patiria 1 bazinę žalą. Šiai žalai traukiama ŽMK korta. Apnuodytas padaras puola nepalankiai. Apnuodijimas nepašalinamas automatiškai - trunka tol, kol pašalinamas efektu arba padaras žūsta.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '🔇 Nutildytas',
        text: 'Kortos gebėjimai neveikia: pasyvūs efektai sustoja, Kovos šūksnis nesuveikia (jei padaras patenka į lauką jau Nutildytas), Paskutinis noras neaktyvuojamas. Čempiono gebėjimai blokuojami. Nutildymas neveikia jau išspręstų efektų: jei padaro Kovos šūksnis jau įvyko, vėlesnis Nutildymas jo neatšaukia.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Nepalankiai - apibrėžimas',
        text: 'Nepalankiai - kai traukiamos 2 ŽMK kortos ir pasirenkamas blogesnis rezultatas tam žaidėjui, kuris atlieka veiksmą.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Sušaldytas vs Apsvaigintas',
        text: 'Pagrindinis skirtumas: Sušaldytas padaras nedaro atgalinės žalos, jei puolamas. Apsvaigintas padaras vis tiek daro atgalinę žalą.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Degantis vs Apnuodytas',
        text: 'Abu sukelia 1 bazinę žalą + ŽMK kiekvieną ėjimą. Skirtumas - Apnuodytas padaras puola nepalankiai, ir tam tikros kortos reaguoja tik į Ugnies arba tik į Nuodų efektą.',
      },
    ],
  },

  // ─── 16. EFEKTŲ TIPAI ────────────────────────────────────────────────────
  {
    id: 'efektu-tipai',
    number: '16',
    title: 'Efektų ir magijos tipai',
    summary: 'Ugnis, Ledas, Žaibas, Gydymas, Pastiprinimas, Nekrotinis, Susilpninimas, Nuodai, Monetos metimas ir kt.',
    category: 'kortų-tipai',
    relatedTerms: ['Ugnis', 'Ledas', 'Žaibas', 'Gydymas', 'Nekrotinis', 'Nuodai', 'Monetos metimas', 'Coinflip', 'magija', 'efektas'],
    content: [
      {
        type: 'paragraph',
        text: 'Efektų tipai yra klasifikacija sinergijoms ir sąveikoms. Viena korta gali turėti kelis tipus.',
      },
      { type: 'effectTypeGrid' },
      {
        type: 'table',
        label: 'Efektų tipai',
        headers: ['', 'Tipas', 'Aprašymas'],
        rows: [
          ['🔥', 'Ugnis',            'Šiluminė žala, Degimo būsena, ugnies sinergijos.'],
          ['❄️', 'Ledas',            'Šaltoji žala, Sušaldymo būsena, ledo sinergijos.'],
          ['⚡', 'Žaibas',           'Elektros žala, greiti smūgiai, grandinių efektai.'],
          ['💚', 'Gydymas',          'Gyvybės taškų atkūrimas. Gali veikti padarus, Čempionus ir artefaktus, jei kortos tekstas leidžia.'],
          ['⬆️', 'Pastiprinimas',    'ATK, gyvybės taškų ar kitų reikšmių didinimas.'],
          ['☠️', 'Nekrotinis',       'Tamsioji žala, panaudotų kortų krūvos sinergijos, negyvėlių efektai.'],
          ['⬇️', 'Susilpninimas',    'ATK, gyvybės taškų ar kitų reikšmių mažinimas.'],
          ['☣️', 'Nuodai',           'Periodinė žala, Apnuodijimo būsena.'],
          ['⭐', 'Artefaktas',       'Artefaktų kūrimas, sąveika ar stiprinimas.'],
          ['🔔', 'Suaktyvinimas',    'Efektai, aktyvuojami išsipildžius konkrečiai sąlygai.'],
          ['🔗', 'Sinergija',        'Efektai, veikiantys kartu su kitomis kortomis ar tipais.'],
          ['🔧', 'Pagalbiniai',      'Pagalbiniai efektai: kortų traukimas, auksas, judėjimas.'],
          ['💫', 'Apsvaiginimas',    'Efektai, suteikiantys Apsvaiginimo būseną.'],
          ['🔇', 'Nutildymas',       'Efektai, suteikiantys Nutildymo būseną.'],
          ['🪙', 'Monetos metimas',  'Rizikos efektas, kurio tikslų rezultatą nurodo kortos tekstas.'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Monetos metimas',
        text: 'Kai korta nurodo atlikti Monetos metimą, mesk žalos sekimo žetoną. Žalia pusė reiškia sėkmingą efektą, raudona - nesėkmę arba šalutinį poveikį. Konkretų rezultatą nurodo kortos tekstas. Goblinų Gauja dažnai naudoja šią mechaniką.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Gydymo taisyklės',
        text: 'Gydymas atkuria prarastus gyvybės taškus, bet negali viršyti dabartinio taikinio maksimalaus HP. Jei efektas suteikia +HP, jis padidina taikinio maksimalų HP tol, kol efektas galioja. Kai laikinas +HP efektas baigiasi, iš taikinio dabartinio HP atimama tiek HP, kiek buvo suteikta tuo efektu. +HP efektai nedidina žaidėjo maksimalių gyvybės taškų, nebent kortos tekstas aiškiai nurodo kitaip.',
      },
    ],
  },

  // ─── 17. EFEKTŲ AKTYVACIJOS TVARKA ──────────────────────────────────────
  {
    id: 'efektu-aktyvacija',
    number: '17',
    title: 'Efektų sprendimo eilė',
    summary: 'Principas: "Paskutinis aktyvavęsis - išsprendžiamas pirmasis."',
    category: 'kova',
    relatedTerms: ['efektų eilė', 'efektų tvarka', 'reakcija', 'aktyvacija', 'eilė', 'stack'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'important',
        text: 'Principas: "Paskutinis aktyvavęsis - išsprendžiamas pirmasis." Kai vienu metu aktyvuojasi keli efektai, paskutinis pridėtas išsprendžiamas pirmasis.',
      },
      {
        type: 'list',
        items: [
          'Žaidėjas aktyvuoja efektą (pvz., burtą).',
          'Jei šis sukelia kitą efektą (pvz., reakciją) - naujasis pridedamas į eilės viršų.',
          'Sprendžiamas viršuje esantis efektas, tada kitas ir t. t.',
          'ŽMK korta traukiama tuo metu, kai žala išsprendžiama - ne iš anksto.',
          'Korta keliauja į panaudotų kortų krūvą tik po to, kai visi jos efektai išsprendžiami.',
          'Paskutinis noras aktyvuojasi prieš kortai patenkant į panaudotų kortų krūvą.',
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Pavyzdys',
        text: 'Žaidėjas panaudoja burtą (A). Priešininkas aktyvuoja reakciją (B). Sprendžiama: B, tada A.',
      },
    ],
  },

  // ─── 18. TAIKINIAI ───────────────────────────────────────────────────────
  {
    id: 'taikiniai',
    number: '18',
    title: 'Taikinių sąvokos',
    summary: 'Savo padarai, draugiški padarai, visi padarai, priešininko padarai - svarbūs skirtumai.',
    category: 'taikiniai',
    relatedTerms: ['taikinys', 'draugiški', 'priešininko padarai', 'Sėlinimas'],
    content: [
      {
        type: 'table',
        label: 'Taikinių terminija',
        headers: ['Terminas', 'Reikšmė'],
        rows: [
          ['Savo padarai',                'Tik to žaidėjo padarai. Neapima sąjungininko (2v2 režime).'],
          ['Draugiški padarai',            'To žaidėjo ir sąjungininko valdomi padarai, išskyrus patį efektą turintį padarą. Padaras pats sau nėra laikomas draugišku padaru.'],
          ['Visi padarai',                'Visi kovos lauke esantys padarai - savo, sąjungininko ir priešininkų.'],
          ['Priešininko padarai',          'Visi priešininko (ar priešininkų komandos) padarai.'],
          ['Tam tikros frakcijos padarai', 'Tik nurodytos frakcijos padarai (pvz., Zombiai, Goblinai).'],
          ['Taikinys',                    'Vienas pasirinktas padaras, žaidėjas, artefaktas arba Čempionas.'],
          ['Bet kuris taikinys',          'Gali apimti žaidėją, padarą, Čempioną arba artefaktą - pagal kontekstą.'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'warning',
        text: 'Sėlinimo padarai negali būti pasirenkami kaip konkretūs taikiniai, tačiau juos paveikia efektai, kurie taikomi visai grupei be pasirinkimo (pvz.: "visi priešininko padarai gauna 1 žalos").',
      },
    ],
  },

  // ─── 19. 2V2 ─────────────────────────────────────────────────────────────
  {
    id: '2v2-taisykles',
    number: '19',
    title: '2v2 taisyklės',
    summary: 'Komandos 60 bendrų gyvybės taškų. Ėjimų eilė: A1 - B1 - A2 - B2.',
    category: '2v2',
    relatedTerms: ['2v2', 'komanda', 'draugiški padarai', 'prakeiksmas', 'ėjimų eilė'],
    content: [
      {
        type: 'list',
        items: [
          'Kiekviena komanda turi 60 bendrų gyvybės taškų.',
          'Ėjimų eilė: Komanda A (1 žaidėjas) - Komanda B (1 žaidėjas) - Komanda A (2 žaidėjas) - Komanda B (2 žaidėjas).',
          '"Draugiški padarai" apima abiejų komandos žaidėjų padarus, išskyrus patį efektą turintį padarą.',
          '"Savo padarai" reiškia tik to konkretaus žaidėjo padarus.',
          'Prakeiksmas įmaišomas į pasirinktą priešininko kaladę.',
        ],
      },
    ],
  },

  // ─── 20. DUK / PAPILDOMOS TAISYKLĖS ─────────────────────────────────────
  {
    id: 'papildomos-taisykles',
    number: '20',
    title: 'Papildomos taisyklės ir DUK',
    summary: 'Tuščia kaladė - nuovargio žala. Gydymas ir HP. Pilnos zonos. Kaladė neatsinaujina.',
    category: 'duk',
    relatedTerms: ['tuščia kaladė', 'nuovargio žala', 'gyvybės taškų maksimumas', 'ATK', 'auksas', 'kortų efektai', 'pilna zona'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Tuščia pagrindinė kaladė - nuovargio žala',
        text: 'Jei žaidėjas turi traukti kortą, bet jo pagrindinė kaladė tuščia, jis kortos netraukia ir patiria nuovargio žalą. Pirmą kartą patiria 1 bazinę žalą, antrą kartą - 2 bazinę žalą, trečią kartą - 3 bazinę žalą ir taip toliau. Kiekvienai nuovargio žalai traukiama ŽMK korta.',
      },
      {
        type: 'list',
        items: [
          'Kaladė neatsinaujina automatiškai - kortos iš panaudotų kortų krūvos negrįžta, nebent specialus efektas tai leidžia.',
          'Žalos padarams išlieka visam laikui - tarp ėjimų neatsinaujina. Žalą galima sumažinti tik gydymo efektais.',
          'Žaidėjo gyvybės taškai negali viršyti pradinio maksimumo.',
          'Padarų ATK ir gyvybės taškai gali būti didinami be viršutinės ribos.',
          'Aukso efektai veikia tik tą ėjimą, nebent kortos tekstas aiškiai nurodo kitaip.',
          'Kortų efektų sąlygos tikrinamos efekto aktyvavimo metu.',
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Kortos tekstas turi pirmenybę',
        text: 'Kortos tekstas turi pirmenybę prieš bendras taisykles. Jei korta leidžia atlikti veiksmą, kurio bendros taisyklės įprastai neleistų, vadovaujamasi kortos tekstu.',
      },
    ],
  },
]

export const RULE_CATEGORIES: { id: RuleCategory | 'viskas'; label: string }[] = [
  { id: 'viskas',       label: 'Viskas'                    },
  { id: 'tikslas',      label: 'Žaidimo tikslas'           },
  { id: 'pasiruosimas', label: 'Pasiruošimas'              },
  { id: 'zonos',        label: 'Žaidimo zonos'             },
  { id: 'kaladė',       label: 'Kaladės sudarymas'         },
  { id: 'frakcijos',    label: 'Frakcijų mechanikos'       },
  { id: 'kortų-tipai',  label: 'Kortų tipai'               },
  { id: 'eiga',         label: 'Žaidimo eiga'              },
  { id: 'kova',         label: 'Kova ir žala'              },
  { id: 'zmk',          label: 'Žalos modifikatorių kaladė'},
  { id: 'čempionai',    label: 'Čempionai'                 },
  { id: 'raktažodžiai', label: 'Raktažodžiai'              },
  { id: 'būsenos',      label: 'Būsenų efektai'            },
  { id: 'reakcijos',    label: 'Reakcijos'                 },
  { id: 'taikiniai',    label: 'Taikiniai'                 },
  { id: '2v2',          label: '2v2'                       },
  { id: 'duk',          label: 'DUK'                       },
]

export const QUICK_LINKS = [
  { label: 'Kaip laimėti?',              href: '#apie-zaidima'                 },
  { label: 'Kaip veikia ŽMK?',           href: '#zalos-modifikatoriaus-kalade' },
  { label: 'Kaip veikia Čempionai?',     href: '#cempionai'                    },
  { label: 'Greita pradžia',             href: '#greita-pradzya'               },
  { label: 'Ką reiškia būsenų efektai?', href: '#busenų-efektai'               },
]
