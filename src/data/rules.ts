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
  // ─── 1. APIE ŽAIDIMĄ ────────────────────────────────────────────────────
  {
    id: 'apie-zaidima',
    number: '1',
    title: 'Apie žaidimą ir tikslas',
    summary: 'Ravenof: Antrasis leidimas – dviejų žaidėjų kolekcinis kortų žaidimas tamsiame fantastiniame pasaulyje.',
    category: 'tikslas',
    relatedTerms: ['HP', 'gyvybės taškai', 'tikslas', '1v1', '2v2', 'laimėjimas'],
    content: [
      {
        type: 'paragraph',
        text: 'Ravenof: Antrasis leidimas yra dviejų žaidėjų (arba dviejų komandų) kolekcinis kortų žaidimas, vykstantis tamsiame fantastiniame pasaulyje, kuriame susiduria skirtingos frakcijos. Žaidėjai sudaro savo kaladę, pasirenka frakciją ir kovoja prieš priešininką - naudodami padarus, burtus, artefaktus ir kitus efektus, siekia sumažinti priešininko gyvybės taškus iki nulio.',
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
    ],
  },

  // ─── 2. KOMPONENTAI ─────────────────────────────────────────────────────
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
        text: 'Kiekvienas žaidėjas turi savo kortų kaladę (30–40 kortų) ir atskirą Žalos modifikatorių kaladę (ŽMK) iš 20 kortų.',
      },
      { type: 'dmdBlock' },
      {
        type: 'paragraph',
        text: 'Aukso monetos: 10 monetų kiekvienam žaidėjui. Kiekviena moneta = 100 aukso.',
      },
      {
        type: 'paragraph',
        text: 'Būsenų žetonai: naudojami gyvybės taškams, pastiprinimams ir susilpninimams ir būsenoms sekti. Kiekvienas žetonas turi dvi puses.',
      },
      { type: 'tokenGrid' },
    ],
  },

  // ─── 3. KALADĖS KŪRIMAS ─────────────────────────────────────────────────
  {
    id: 'kaladės-kurimas',
    number: '3',
    title: 'Kaladės sudarymas',
    summary: 'Kaladę sudaro 30–40 kortų. Leidžiama naudoti tik vienos frakcijos kortas ir neutralias kortas. Kopijų kiekiai priklauso nuo retumo.',
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
          ['Paprasta',   'Iki 2'],
          ['Magiška',    'Iki 2'],
          ['Unikalus',   'Iki 2'],
          ['Epiška',     '1'],
          ['Legendinė',  '1'],
          ['Čempionas unikalus',  'Iki 2'],
          ['Čempionas legendinis', '1'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        text: 'Čempionai: unikalus retumas = iki 2 kopijų kaladėje, legendinis retumas = 1 kopija kaladėje. To paties Čempiono kovos lauke negali būti daugiau nei vienas - skirtingų Čempionų gali būti keli.',
      },
    ],
  },


  // ─── RETUMAI ─────────────────────────────────────────────────────────────
  {
    id: 'retumai',
    number: '3b',
    title: 'Retumų sistema',
    summary: '5 retumų lygiai: Paprasta, Magiška, Unikalus, Epiškas, Legendinis. Kiekvienas žymimas deimanto simboliu.',
    category: 'kaladė',
    relatedTerms: ['retumas', 'paprasta', 'magiška', 'unikalus', 'epiškas', 'legendinis', 'deimantas', 'kopijų limitas'],
    content: [
      { type: 'rarityBlock' },
      {
        type: 'paragraph',
        text: 'Kortos retumas nurodomas deimanto simboliu ant kortos. Kuo aukštesnis retumas, tuo galingesnis efektas ir mažesnis kopijų skaičius kaladėje.',
      },
    ],
  },

  // ─── 4. FRAKCIJOS ───────────────────────────────────────────────────────
  {
    id: 'frakcijos',
    number: '4',
    title: 'Frakcijos',
    summary: 'Frakcija nustato žaidimo stilių ir mechanikas. 8 unikalios frakcijos ir neutralios kortos.',
    category: 'frakcijos',
    relatedTerms: ['frakcija', 'Demonų Orda', 'Mirties Maršas', 'Goblinų Gauja', 'Mistikos Melodija', 'neutralios', 'negyvėliai', 'Monetos metimas'],
    content: [
      {
        type: 'paragraph',
        text: 'Frakcija nustato žaidimo stilių ir turimas mechanikas. Kaladėje leidžiama naudoti tik vienos frakcijos kortas ir neutralias kortas.',
      },
      {
        type: 'table',
        label: 'Frakcijų stiliai ir mechanikos',
        headers: ['Frakcija', 'Stilius ir mechanikos'],
        rows: [
          ['Demonų Orda',        'Sabotažas, prakeiksmai, priešininko kaladės ardymas. Psichologinis spaudimas ir tamsioji kontrolė.'],
          ['Mirties Maršas',     'Armijos plėtimas, panaudotų kortų krūvos naudojimas, negyvėlių nuolatinis spaudimas.'],
          ['Plėšikų Naktis',     'Iniciatyva, aukso vogimas, savos ekonomikos stiprinimas, greiti sprendimai.'],
          ['Goblinų Gauja',      'Chaosas, greita agresija, didelė rizika - kortos dažnai naudoja Monetos metimą, kurio nesėkmė gali sukelti šalutinį poveikį pačiam žaidėjui.'],
          ['Mistikos Melodija',  'Burtai, kontrolė, masinis žalos padarymas, magiškos sinergijos ir reakcijos.'],
          ['Rytų Vėjas',         'Sėlinimas, tikslūs smūgiai, apėjimas Pasišaipymo, greitas žaidimo tempas.'],
          ['Šviesos Pulkas',     'Gynyba, Pasišaipymas, Magiškasis skydas, struktūruota kovos lauko pozicija ir kontrolė.'],
          ['Inkvizicijos Legionas', 'Gydymas, pastiprinimas, palaikymas, šviesos sinergijos.'],
          ['Neutralios / Universalios', 'Tinka su bet kuria frakcija. Universalūs efektai, mažiau sinergijų.'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Goblinų Gauja - rizikos mechanika',
        text: 'Goblinų kortos dažnai remiasi rizika, greičiu ir Monetos metimu. Jos gali suteikti daugiau vertės nei įprastos kortos už tą pačią kainą, tačiau nesėkmės atveju gali sukelti šalutinį poveikį pačiam žaidėjui. Tai yra sąmoninga frakcijos identiteto dalis.',
      },
    ],
  },

  // ─── 5. KAIP SKAITYTI KORTĄ ─────────────────────────────────────────────
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
        type: 'list',
        items: [
          'Aukso kaina: kiek aukso reikia sumokėti norint išžaisti kortą (nurodyta viršutiniame dešiniajame kampe).',
          'Pavadinimas: kortos identifikatorius.',
          'Kortų tipas: ikonėlė rodo tipą - Padaras, Burtas, Artefaktas ir kt.',
          'Frakcija: kuriai frakcijai priklauso korta.',
          'Efekto tekstas: kortos gebėjimai. Raktažodžiai paryškintu šriftu.',
          'ATK (⚔): puolimo taškai - žalos kiekis atakuojant.',
          'Gyvybės taškai (♥): kiek žalos korta atlaikoma prieš žūdama.',
          'Retumas: nurodo, kiek kopijų leidžiama turėti kaladėje.',
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Pastaba: modifikatorių formatas',
        text: '+X/+Y formatas nurodo ATK ir gyvybių taškų modifikatorius. Kairysis skaičius = ATK pokytis, dešinysis = gyvybių taškų pokytis. Pvz.: +1/0 reiškia +1 ATK.',
      },
    ],
  },

  // ─── 6. KORTŲ TIPAI ─────────────────────────────────────────────────────
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
        calloutVariant: 'quick',
        label: 'Padaras',
        text: 'Pagrindinis kovos lauko vienetas su ATK ir gyvybės taškais. Negali atakuoti tą patį ėjimą, kai buvo iškviestas - išskyrus padarus su Sprintu. Vienu metu kovos lauke gali būti iki 5 padarų (įskaitant Čempioną). Gyvybės taškams nukritusse iki 0, padaras keliauja į panaudotų kortų krūvą.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Burtas',
        text: 'Vienkartinė korta su momentišku efektu. Žaidėjas sumoka aukso kainą, efektas aktyvuojamas, korta keliauja į panaudotų kortų krūvą, nebent kortos tekstas nurodo kitaip. Jei burtas padaro žalą - kiekvienam taikiniui traukiama atskira Žalos modifikatorių korta.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Artefaktas',
        text: 'Ilgalaikė korta, kuri lieka kovos lauke ir nuolat veikia. Turi gyvybės taškus, bet neturi ATK, nebent kortos tekstas nurodo kitaip. Vienu metu gali būti aktyvūs iki 2 žaidėjo artefaktų. Gyvybės taškams nukritus iki 0, artefaktas keliauja į panaudotų kortų krūvą.',
      },
      {
        type: 'callout',
        calloutVariant: 'warning',
        label: 'Prakeiksmas',
        text: 'Korta, kuri trukdo priešininkui - įmaišoma į jo kaladę. Žaidėjas sumoka aukso kainą, o priešininkas įsimaišo kortą į savo kaladę. Priešininkui ištraukus prakeiksmą - efektas iš karto aktyvuojamas, korta keliauja į panaudotų kortų krūvą. Prakeiksmo negalima žaisti tiesiai iš rankos. Pastaba: kai abi pusės žaidžia Demonų Ordą ir abi naudoja kortų įmautės - prakeiksmai dedami atversti.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Reakcija',
        text: 'Reakcija yra užversta korta, kuri aktyvuojasi tada, kai išsipildo jos sąlyga. Reakciją galima padėti tik savo pagrindinės fazės metu, sumokėjus aukso kainą. Ji lieka užversta su žalos sekimo žetonu viršuje - žetonas rodo REALIAI sumokėtą kainą (ne bazinę). Priešininkas mato, kiek kainavo, bet nežino efekto. Kai sąlyga išsipildoma, reakcija atverčiama, efektas išsprendžiamas, korta keliauja į panaudotų kortų krūvą. Reakcija gali aktyvuotis tiek žaidėjo, tiek priešininko ėjimo metu. Jei vienu metu gali aktyvuotis kelios reakcijos - pirmiausia sprendžiama ta, kuri aktyvavosi paskutinė. Vienu metu galima turėti iki 3 reakcijų.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Laukas',
        text: 'Globali korta, keičianti kovos sąlygas visam laukui. Neturi gyvybės taškų. Vienu metu gali būti aktyvios tik viena lauko korta - nauja pakeičia senąją. Efektas veikia abu žaidėjus, nebent kortos tekstas nurodo kitaip.',
      },
    ],
  },

  // ─── 7. ŽALOS MODIFIKATORIŲ KALADĖ ─────────────────────────────────────
  {
    id: 'zalos-modifikatoriaus-kalade',
    number: '7',
    title: 'Žalos modifikatorių kaladė (ŽMK)',
    summary: 'ŽMK - 20 kortų kaladė, traukiama kiekvieną kartą kai daroma žala. Nustato, ar žala padidėja, sumažėja ar pasikeičia.',
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
        text: 'Jei vienas efektas daro žalą keliems taikiniams - kiekvienam taikiniui traukiama atskira Žalos modifikatorių korta.',
      },
      {
        type: 'list',
        items: [
          'Panaudotos ŽMK kortos keliauja į ŽMK kapinyną.',
          'Jei reikia traukti ŽMK kortą, bet ŽMK kaladė tuščia - ŽMK kapinynas permaišoma ir suformuojama nauja ŽMK kaladė.',
          'Ištraukus ×2 arba ×0 kortą - ŽMK permaišoma su panaudotų kortų krūva nedelsiant po žalos išsprendimo.',
          'Žala negali nukristi žemiau 0. Nulinė žala negydo.',
          'Magiškojo skydo atveju žala blokuojama - ŽMK korta netraukiama.',
          'Jei žala = 0, bet efektas turi papildomų veiksmų (pvz., būsenos suteikimas) - jie vis tiek pritaikomi.',
        ],
      },
      {
        type: 'table',
        label: 'Žalos skaičiavimo pavyzdžiai',
        headers: ['Situacija', 'Skaičiavimas', 'Rezultatas'],
        rows: [
          ['ATK 4, ŽMK: +1',              '4 + 1',                      '5 žala'],
          ['ATK 2, ŽMK: −1',              '2 − 1',                      '1 žala'],
          ['Efektas 1 žala, ŽMK: −2',     '1 − 2 → min. 0',             '0 žala (negydo)'],
          ['ATK 3, ŽMK: ×2',              '3 × 2, ŽMK permaišoma',      '6 žala'],
          ['ATK 5, ŽMK: ×0',              '5 × 0, ŽMK permaišoma',      '0 žala'],
          ['Burtas 3 žala, 2 taikiniai',  '2 atskiros ŽMK kortos',       'Kiekvienas gauna skirtingą rezultatą'],
          ['Kovos ataka',                 'Abu žaidėjai traukia savo ŽMK kortą', '2 ŽMK kortos iš viso'],
        ],
      },
    ],
  },

  // ─── 8. KOVOS LAUKAS ────────────────────────────────────────────────────
  {
    id: 'kovos-laukas',
    number: '8',
    title: 'Žaidimo zonos',
    summary: 'Zonos: pagrindinė kaladė, panaudotų kortų krūva, ranka (maks. 10), padarų zona (maks. 5), artefaktai (maks. 2), reakcijos, lauko korta, ŽMK.',
    category: 'zonos',
    relatedTerms: ['kovos laukas', 'panaudotų kortų krūva', 'ranka', 'padarų zona', 'artefaktai', 'reakcijos', 'lauko korta', 'ŽMK', 'pagrindinė kaladė'],
    content: [
      {
        type: 'table',
        label: 'Kovos lauko zonos',
        headers: ['Zona', 'Aprašymas', 'Maks. limitas'],
        rows: [
          ['Pagrindinė kaladė',       'Žaidėjo kortų kaladė. Laikoma užversta.',                                        ' - '],
          ['Panaudotų kortų krūva',   'Panaudotos ir žuvusios kortos. Atvira - abu žaidėjai mato.',                      ' - '],
          ['Ranka',                   'Žaidėjo kortos. Priešininkas jų nematytoja.',                                      'Maks. 10'],
          ['Padarų zona',             'Padarai ir Čempionas.',                                                            'Maks. 5'],
          ['Artefaktų zona',          'Aktyvūs artefaktai.',                                                              'Maks. 2'],
          ['Reakcijų zona',           'Reakcijų kortos - užverstos su aukojimo žetonu, rodančiu realiai sumokėtą kainą.', 'Maks. 3'],
          ['Lauko kortos zona',       'Aktyvi lauko korta. Bendra abiem žaidėjams.',                                     'Maks. 1'],
          ['Žalos modifikatorių kaladė (ŽMK)', 'Atskira 20 kortų kaladė. Laikoma užversta.',                           ' - '],
          ['Panaudotų ŽMK kortų krūva', 'Panaudotos ŽMK kortos.',                                                       ' - '],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'warning',
        text: 'Jei rankoje yra daugiau nei 10 kortų - perteklinės kortos (žaidėjo pasirinkimu) iš karto keliauja į panaudotų kortų krūvą.',
      },
      { type: 'battlefieldDiagram' },
    ],
  },

  // ─── 9. PASIRUOŠIMAS ────────────────────────────────────────────────────
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
          '3. Nuspręskite, kas pradeda. Metant monetą, žaidžiant žirkles-popierių-akmenį arba: pralaimėjęs paskutinį žaidimą renkasi, ar pradeda.',
          '4. Ištraukite pradinę ranką. Pirmasis žaidėjas traukia 4 kortas. Antrasis žaidėjas traukia 5 kortas.',
          '5. Pradinės rankos keitimas (neprivalomas). Visos kortos gali būti įmaišytos atgal ir ištraukta nauja ranka. Galima tik 1 kartą.',
          '6. Nustatykite gyvybės taškus. 1v1: 40 gyvybės taškų. 2v2: 60 bendrų gyvybės taškų komandai.',
        ],
      },
    ],
  },

  // ─── 10. ĖJIMO STRUKTŪRA ────────────────────────────────────────────────
  {
    id: 'ejimo-struktura',
    number: '10',
    title: 'Ėjimo struktūra',
    summary: '5 fazės: ėjimo pradžia → kortos traukimas → aukso gavimas → pagrindinė fazė → ėjimo pabaiga.',
    category: 'eiga',
    relatedTerms: ['ėjimas', 'fazė', 'kortos traukimas', 'pagrindinė fazė', 'ėjimo pabaiga', 'auksas'],
    content: [
      {
        type: 'table',
        label: 'Ėjimo fazių tvarka',
        headers: ['Fazė', 'Aprašymas'],
        rows: [
          ['1. Ėjimo pradžia',   'Aktyvuojasi ėjimo pradžios efektai: artefaktai, Degantis, Apnuodytas ir kt.'],
          ['2. Kortos traukimas','Žaidėjas traukia 1 kortą. Rankos limitas: 10 kortų - perteklius keliauja į panaudotų kortų krūvą.'],
          ['3. Aukso gavimas',   'Gaunamas auksas pagal ėjimo numerį (žr. skyrių „Aukso sistema").'],
          ['4. Pagrindinė fazė', 'Veiksmai atliekami bet kokia tvarka, kol žaidėjui užtenka aukso.'],
          ['5. Ėjimo pabaiga',   'Aktyvuojasi ėjimo pabaigos efektai. Nepanaudotas auksas dingsta.'],
        ],
      },
      {
        type: 'table',
        label: 'Galimi veiksmai pagrindinėje fazėje',
        headers: ['Veiksmas', 'Aprašymas'],
        rows: [
          ['Iškviesti padarą',               'Sumokama aukso kaina → padaras perkeliamas į padarų zoną. Tą ėjimą jis negali atakuoti, išskyrus padarus su Sprintu.'],
          ['Panaudoti burtą',                'Sumokama aukso kaina → efektas aktyvuojamas → korta keliauja į panaudotų kortų krūvą.'],
          ['Padėti artefaktą',               'Sumokama aukso kaina → artefaktas perkeliamas į artefaktų zoną (maks. 2).'],
          ['Padėti reakciją',                'Sumokama aukso kaina → reakcija padedama užversta į reakcijų zoną su kainos žetonu.'],
          ['Panaudoti prakeiksmą',           'Sumokama aukso kaina → priešininkas įsimaišo kortą į savo kaladę.'],
          ['Žaisti lauko kortą',             'Sumokama aukso kaina → nauja lauko korta pakeičia esamą.'],
          ['Iškviesti Čempioną (1 fazė)',    'Sumokama aukso kaina ir aukojimas.'],
          ['Evoliucionuoti Čempioną (2/3 f.)', 'Sumokama aukso kaina ir aukojimas → Čempionas pilnai pagyja.'],
          ['Naudoti Čempiono gebėjimą',      '1 kartą per ėjimą.'],
          ['Atakuoti padaru',                'Kiekvienas padaras gali atakuoti 1 kartą per ėjimą.'],
          ['Išmesti kortą dėl aukso',        '+100 aukso už 1 iš rankos išmestą kortą. Galima 1 kartą per ėjimą.'],
        ],
      },
    ],
  },

  // ─── 11. AUKSO SISTEMA ──────────────────────────────────────────────────
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
          'Kortų aukso kainos visada išreiškiamos 100–1000 aukso intervalais.',
          'Kartą per ėjimą žaidėjas gali išmesti 1 kortą iš rankos ir gauti +100 aukso. Tai galima daryti jau pirmuoju ėjimu.',
          'Šis papildomas auksas gali viršyti einamojo ėjimo aukso ribą (pvz., 1 ėjime galima turėti 200 aukso).',
          'Aukso efektai veikia tik tą ėjimą, nebent kortos tekstas nurodo kitaip.',
        ],
      },
    ],
  },

  // ─── 12. KOVOS IR ŽALOS TAISYKLĖS ───────────────────────────────────────
  {
    id: 'kovos-ir-zalos-taisykles',
    number: '12',
    title: 'Kova ir žala',
    summary: 'Atakos taikiniai, Pasišaipymas, žalos skaičiavimas su ŽMK, atgalinė žala, Magiškasis skydas.',
    category: 'kova',
    relatedTerms: ['ataka', 'žala', 'Pasišaipymas', 'atgalinė žala', 'Magiškasis skydas', 'ŽMK'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Galimi atakos taikiniai',
        text: 'Priešininko padaras, priešininkas (žaidėjas), priešininko artefaktas arba Čempionas. Kiekvienas padaras gali atakuoti 1 kartą per ėjimą. padaras negali atakuoti tą patį ėjimą, kai buvo iškviestas - išskyrus padarus su Sprintu.',
      },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Pasišaipymas ir prioritetas',
        text: 'Jei kovos lauke yra priešininko padaras su Pasišaipymu - visos atakos privalo rinktis jį kaip taikinį. Ši taisyklė galioja atakoms į visus taikinius. Burtams ir kitiems efektams negalioja. Jei kovos lauke yra keli Pasišaipymo padarai - žaidėjas renkasi, kurį iš jų pulti.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Žalos skaičiavimas',
        text: 'padaras atakuoja padarą: abu žaidėjai vienu metu daro žalą vienas kitam - kiekvienas traukia savo ŽMK kortą. padaras atakuoja žaidėją, artefaktą arba Čempioną: puolantysis daro žalą su savo ŽMK korta, atgalinės žalos negauna.',
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Pavyzdys',
        text: 'Padaras 3/5 atakuoja padarą 2/4. Puolantysis traukia ŽMK: +0 → daro 3 žalos. Ginantysis traukia ŽMK: +1 → daro 3 žalos. Po atakos: puolančiojo liko 5−3=2 gyvybės taškų, ginančiojo - 4−3=1. Abu išgyvena.',
      },
      {
        type: 'list',
        items: [
          'Jei žala = 0 arba ×0, bet efektas turi papildomų veiksmų (pvz., būsenos suteikimas) - jie vis tiek pritaikomi.',
          'Žaidėjo gyvybės taškai negali viršyti pradinio maksimumo.',
          'Padarų ATK ir gyvybės taškai gali būti didinti be viršutinės ribos.',
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Magiškasis skydas',
        text: 'Magiškojo skydo atveju žala blokuojama - ŽMK korta netraukiama. Po blokavimo Magiškasis skydas pašalinamas. Atgalinę žalą puolantysis gauna TIKTAI jei ginantysis buvo padaras (ne žaidėjas, ne artefaktas). Atgalinė žala skaičiuojama pagal ginančiojo padarų ATK reikšmę ir GINANČIOJO ŽMK kortą.',
      },
    ],
  },

  // ─── 13. ČEMPIONAI ──────────────────────────────────────────────────────
  {
    id: 'cempionai',
    number: '13',
    title: 'Čempionai',
    summary: 'Galingiausias kortų tipas su 3 fazėmis ir gebėjimais. Neturi ATK. Naudoja aukojimą iškvietimui.',
    category: 'čempionai',
    relatedTerms: ['Čempionas', '1 fazė', '2 fazė', '3 fazė', 'aukojimas', 'gebėjimai', 'fazės'],
    content: [
      {
        type: 'paragraph',
        text: 'Čempionas neturi ATK reikšmės - jis turi tik gyvybės taškus ir gebėjimus. Čempionas negali atlikti įprastos atakos, nebent kortos tekstas nurodo kitaip.',
      },
      {
        type: 'paragraph',
        text: 'Per vieną savo ėjimą žaidėjas gali panaudoti tik vieną to Čempiono gebėjimą. Gebėjimą galima naudoti tą patį ėjimą, kai Čempionas buvo iškviestas, jei kortos tekstas nenurodo kitaip. Kortos tekstas nurodo, nuo kurios fazės konkretūs gebėjimai yra pasiekiami.',
      },
      { type: 'championBlock' },
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Evoliucija - reikalinga korta rankoje',
        text: 'Norint evoliucionuoti Čempioną į 2 arba 3 fazę, žaidėjas turi rankoje turėti tos fazės Čempiono kortą. Čempionas evoliucionuoja tiesiogiai būdamas kovos lauke - jis negrįžta į ranką.',
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
        text: '1 fazė paprastai kainuoja 600 aukso + aukojimas, todėl realiai tai ~5 ėjimas. 2 fazė - 700, 3 fazė - 800. Aukso riba 10+ ėjime = 1000. Teoriškai galima evoliucionuoti kelis kartus per vieną ėjimą, tačiau praktiškai tai beveik neįmanoma.',
      },
    ],
  },

  // ─── 14. RAKTAŽODŽIAI ───────────────────────────────────────────────────
  {
    id: 'raktazodziai',
    number: '14',
    title: 'Raktažodžiai',
    summary: 'Sprintas, Pasišaipymas, Magiškasis skydas, Sėlinimas, Kovos šūksnis, Paskutinis noras, Pasyvus, Palaiminimas.',
    category: 'raktažodžiai',
    relatedTerms: ['Sprintas', 'Pasišaipymas', 'Magiškasis skydas', 'Sėlinimas', 'Kovos šūksnis', 'Paskutinis noras', 'Palaiminimas', 'raktažodžiai', 'keyword'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '▶ Sprintas',
        text: 'padaras gali atakuoti tą patį ėjimą, kai buvo iškviestas.',
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
        text: 'Pirmą kartą gavęs žalos - jos nepatiria, ŽMK korta netraukiama. Po blokavimo Magiškasis skydas pašalinamas. Puolantysis vis tiek gauna atgalinę žalą.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '◑ Sėlinimas',
        text: 'šis padaras negali būti pasirinktas kaip konkretus taikinys, kol pats neatakuoja arba kol kortos tekstas nenurodo kitaip. Sėlinimas pašalinamas po pirmos atakos. Sėlinimas neapsaugo nuo masinių efektų, kurie neprašo pasirinkti konkretaus taikinio, pvz.: „visi priešininko padarai gauna 1 žalos".',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Kovos šūksnis',
        text: 'Aktyvuojasi iš karto, kai korta iškviečiama į kovos lauką. Jei daro žalą - traukiama ŽMK korta.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Paskutinis noras',
        text: 'Aktyvuojasi kai padaro gyvybės taškai nukrinta iki 0. Efektas įvyksta prieš kortai keliaujant į panaudotų kortų krūvą.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: 'Pasyvus (∞)',
        text: 'Veikia nuolat kol korta yra kovos lauke. Kortai palikus kovos lauką - gebėjimas nustoja veikti iš karto.',
      },
      {
        type: 'callout',
        calloutVariant: 'quick',
        label: '🕊 Palaiminimas',
        text: 'padaras traukia 2 ŽMK kortas ir pasirenka geresnį rezultatą kitai atakai. Po atakos Palaiminimas pašalinamas.',
      },
    ],
  },

  // ─── 15. BŪSENŲ EFEKTAI ─────────────────────────────────────────────────
  {
    id: 'busenų-efektai',
    number: '15',
    title: 'Būsenų efektai',
    summary: 'Laikini efektai: Sušaldytas ❄, Degantis 🔥, Apnuodytas ☠, Apsvaigintas ✦, Nutildytas 🔇.',
    category: 'būsenos',
    relatedTerms: ['Sušaldytas', 'Degantis', 'Apnuodytas', 'Apsvaigintas', 'Nutildytas', 'būsena', 'žetonas', 'būsena'],
    content: [
      {
        type: 'paragraph',
        text: 'Būsenų efektai yra laikini, žymimi žetonais ant kortos. Tos pačios būsenos žetonai nesikaupia - taikoma ta pati būsena. Padarui žūstant - visi būsenų žetonai pašalinami.',
      },
      {
        type: 'table',
        label: 'Būsenų poveikiai',
        headers: ['Būsena', 'Žetonas', 'Poveikis', 'Trukmė', 'Pašalinimas'],
        rows: [
          ['Sušaldytas', '❄', 'Negali atakuoti. Čempionas negali naudoti gebėjimų.', '1 ėjimas', 'Automatiškai ėjimo pradžioje arba specialiu efektu.'],
          ['Degantis',   '🔥', 'Savo valdytojo ėjimo pradžioje patiria žalą (traukiama ŽMK korta).', 'Neterminuota', 'Specialiu efektu arba žūtis.'],
          ['Apnuodytas', '☠',  'Savo valdytojo ėjimo pradžioje patiria žalą (traukiama ŽMK korta).', 'Neterminuota', 'Specialiu efektu arba žūtis.'],
          ['Apsvaigintas','✦', 'Negali atakuoti. Čempionas negali naudoti gebėjimų.', '1 ėjimas', 'Automatiškai ėjimo pradžioje arba specialiu efektu.'],
          ['Nutildytas', '🔇', 'Kortos gebėjimai neveikia (pasyvūs, Kovos šūksnis, Paskutinis noras). Čempiono gebėjimai blokuojami.', 'Neterminuota', 'Specialiu efektu arba žūtis.'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        text: 'Degantis ir Apnuodytas abu sukelia žalą kiekvieną ėjimą. Skirtumas - efektų sinergijose: tam tikros kortos reaguoja tik į Ugnies arba tik į Nuodų efektą.',
      },
    ],
  },

  // ─── 16. EFEKTŲ TIPAI ───────────────────────────────────────────────────
  {
    id: 'efektu-tipai',
    number: '16',
    title: 'Efektų ir magijos tipai',
    summary: 'Ugnis, Ledas, Žaibas, Gydymas, Pastiprinimas, Nekrotinis, Susilpninimas, Nuodai, Monetos metimas ir kt.',
    category: 'kortų-tipai',
    relatedTerms: ['Ugnis', 'Ledas', 'Žaibas', 'Gydymas', 'Nekrotinis', 'Nuodai', 'Monetos metimas', 'Coinflip', 'magija', 'efektas', 'poveikis keliems taikiniams'],
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
          ['Ugnis',          'Šiluminė žala, Degimo būsena, ugnies sinergijos.'],
          ['Ledas',          'Šaltoji žala, Sušaldymo būsena, ledo sinergijos.'],
          ['Žaibas',         'Elektros žala, greiti smūgiai, grandinių efektai.'],
          ['Gydymas',        'Gyvybės taškų atkūrimas žaidėjui ar padarui.'],
          ['Pastiprinimas',  'ATK, gyvybės taškų ar kitų reikšmių didinimas.'],
          ['Nekrotinis',     'Tamsioji žala, panaudotų kortų krūvos sinergijos, negyvėlių efektai.'],
          ['Susilpninimas',  'ATK, gyvybės taškų ar kitų reikšmių mažinimas.'],
          ['Nuodai',         'Periodinė žala, Apnuodijimo būsena.'],
          ['Artefaktas',     'Artefaktų kūrimas, sąveika ar stiprinimas.'],
          ['Suaktyvinimas',  'Efektai, aktyvuojami išsipildžius konkrečiai sąlygai.'],
          ['Sinergija',      'Efektai, veikiantys kartu su kitomis kortomis ar tipais.'],
          ['Pagalbiniai',    'Pagalbiniai efektai: kortos traukimas, auksas, judėjimas.'],
          ['Apsvaiginimas',  'Efektai, suteikiantys Apsvaiginimo būseną.'],
          ['Nutildymas',     'Efektai, suteikiantys Nutildymo būseną.'],
          ['Monetos metimas','Kai korta nurodo Monetos metimą - mesk žalos sekimo žetoną. Žalia pusė = sėkmingas efektas, raudona = nesėkmė arba šalutinis poveikis. Goblinų Gauja dažnai naudoja šią mechaniką.'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'example',
        label: 'Monetos metimas',
        text: 'Kai korta nurodo atlikti Monetos metimą, mesk žalos sekimo žetoną. Žalia pusė reiškia sėkmingą efektą, raudona - nesėkmę arba šalutinį poveikį. Konkretų rezultatą visada nurodo kortos tekstas. Goblinų Gauja dažnai naudoja šią mechaniką: jų kortos gali turėti labai stiprius efektus, tačiau nesėkmės atveju efektas gali atsisukti prieš patį žaidėją.',
      },
    ],
  },

  // ─── 17. EFEKTŲ AKTYVACIJOS TVARKA ─────────────────────────────────────
  {
    id: 'efektu-aktyvacija',
    number: '17',
    title: 'Efektų sprendimo eilė',
    summary: 'Principas: „Paskutinis aktyvavęsis - išsprendžiamas pirmasis." Efektai sprendžiami eilės tvarka.',
    category: 'kova',
    relatedTerms: ['efektų eilė', 'efektų tvarka', 'reakcija', 'aktyvacija', 'eilė', 'stack'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'important',
        text: 'Principas: „Paskutinis aktyvavęsis - išsprendžiamas pirmasis." Kai vienu metu aktyvuojasi keli efektai, paskutinis pridėtas išsprendžiamas pirmasis.',
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
        text: 'Žaidėjas panaudoja burtą (A). Priešininkas aktyvuoja reakciją (B). Sprendžiama eilės tvarka: B → A.',
      },
    ],
  },

  // ─── 18. TAIKINIAI ──────────────────────────────────────────────────────
  {
    id: 'taikiniai',
    number: '18',
    title: 'Taikinių sąvokos',
    summary: 'Savo padarai, draugiški padarai, visi padarai, priešininko padarai - svarbūs skirtumai.',
    category: 'taikiniai',
    relatedTerms: ['taikinys', 'draugiški', 'priešininko padarai', 'Sėlinimas', 'poveikis keliems taikiniams'],
    content: [
      {
        type: 'table',
        label: 'Taikinių terminija',
        headers: ['Terminas', 'Reikšmė'],
        rows: [
          ['Savo padarai',               'Tik to žaidėjo padarai. Neapima sąjungininko (2v2 režime).'],
          ['Draugiški padarai',           'To žaidėjo ir sąjungininko padarai. Neapima efektą turinčio padaro.'],
          ['Visi padarai',               'Visi kovos lauke esantys padarai - savo, sąjungininko ir priešininkų.'],
          ['Priešininko padarai',         'Visi priešininko (ar priešininkų komandos) padarai.'],
          ['Tam tikros frakcijos padarai','Tik nurodytos frakcijos padarai (pvz., Zombiai, Goblinai).'],
          ['Taikinys',                   'Vienas pasirinktas padaras, žaidėjas, artefaktas arba Čempionas.'],
        ],
      },
      {
        type: 'callout',
        calloutVariant: 'warning',
        text: 'Sėlinimo padarai negali būti pasirenkami kaip konkretūs taikiniai, tačiau juos paveikia efektai, kurie taikomi keliems taikiniams vienu metu (pvz.: „visi priešininko padarai gauna 1 žalos").',
      },
    ],
  },

  // ─── 19. 2V2 ────────────────────────────────────────────────────────────
  {
    id: '2v2-taisykles',
    number: '19',
    title: '2v2 taisyklės',
    summary: 'Komandos 60 bendrų gyvybės taškų. Ėjimų eilė: A1 → B1 → A2 → B2.',
    category: '2v2',
    relatedTerms: ['2v2', 'komanda', 'draugiški padarai', 'prakeiksmas', 'ėjimų eilė'],
    content: [
      {
        type: 'list',
        items: [
          'Kiekviena komanda turi 60 bendrų gyvybės taškų.',
          'Ėjimų eilė: Komanda A (1 žaidėjas) → Komanda B (1 žaidėjas) → Komanda A (2 žaidėjas) → Komanda B (2 žaidėjas).',
          '„Draugiški padarai" apima abiejų komandos žaidėjų padarus.',
          '„Savo padarai" reiškia tik to konkretaus žaidėjo padarus.',
          'Prakeiksmas įmaišomas į pasirinktą priešininko kaladę.',
        ],
      },
    ],
  },

  // ─── 20. PAPILDOMOS TAISYKLĖS ───────────────────────────────────────────
  {
    id: 'papildomos-taisykles',
    number: '20',
    title: 'Papildomos taisyklės ir DUK',
    summary: 'Kaladė neatsinaujina automatiškai. Tuščia kaladė. Žalos minimumas 0. Aukso efektai tik tą ėjimą.',
    category: 'duk',
    relatedTerms: ['tuščia kaladė', 'gyvybės taškų maksimumas', 'ATK', 'auksas', 'kortų efektai'],
    content: [
      {
        type: 'callout',
        calloutVariant: 'important',
        label: 'Tuščia pagrindinė kaladė',
        text: 'Jei žaidėjas turi traukti kortą, bet jo pagrindinė kaladė tuščia - jis kortos netraukia. Tai savaime nepralaimi žaidimo, nebent kortos tekstas nurodo kitaip.',
      },
      {
        type: 'list',
        items: [
          'Kaladė neatsinaujina automatiškai - kortos iš panaudotų kortų krūvos negrįžta, nebent specialus efektas tai leidžia.',
          'Žala padarams išlieka visam laikui - padarų gyvybės taškai tarp ėjimų neatsinaujina. Žalą galima sumažinti tik gydymo efektais.',
          'Žaidėjo gyvybės taškai negali viršyti pradinio maksimumo.',
          'Padarų ATK ir gyvybės taškai gali būti didinami be viršutinės ribos.',
          'Žala nesustoja ties 0: taikinys gali žūti ir efektas vis tiek baigti skaičiavimą.',
          'Aukso efektai veikia tik tą ėjimą, nebent kortos tekstas aiškiai nurodo kitaip.',
          'Kortų efektų sąlygos tikrinamos efekto aktyvavimo metu.',
        ],
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
  { label: 'Kaip laimėti?',              href: '#apie-zaidima'                  },
  { label: 'Kaip veikia ŽMK?',           href: '#zalos-modifikatoriaus-kalade'  },
  { label: 'Kaip veikia Čempionai?',     href: '#cempionai'                     },
  { label: 'Kiek kortų kaladėje?',       href: '#kaladės-kurimas'               },
  { label: 'Ką reiškia būsenų efektai?', href: '#busenų-efektai'                },
]
