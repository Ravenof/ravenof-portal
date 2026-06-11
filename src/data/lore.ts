// ─── Lore Atlas — static data (v1) ───────────────────────────────────────────
// To add new content: append to the relevant array and give it a unique id.
// Coordinates (x, y) are percentages of the map container (0–100).

// ── Types ────────────────────────────────────────────────────────────────────

export type LoreEra = {
  id: string
  name: string
  index: number        // 0 = earliest, used for timeline filtering
  color: string        // accent color for this era
  description: string
}

export type LoreFaction = {
  id: string
  name: string
  color: string        // hex
  description?: string
}

export type LorePeriod = {
  id: string           // period slug
  eraId: string        // era slug
  name: string
  index: number        // timeline_index eros viduje
  description?: string
}

export type LoreLocationState = {
  periodId: string
  order: number        // globali chronologinė pozicija
  description: string
  imageUrl?: string
}

export type LoreLocation = {
  id: string
  name: string
  type: 'miestas' | 'griuvėsiai' | 'miškas' | 'tvirtovė' | 'uostas' | 'plyšys' | 'slėnis'
  x: number            // % from left
  y: number            // % from top
  description: string
  factionId?: string
  firstEraIndex: number // visible from this era onwards (inclusive)
  eventIds: string[]
  characterIds: string[]
  artifactIds: string[]
  relatedCards: { name: string; cardNumber: string }[]
  imageUrl?: string
  ambientUrl?: string   // aplinkos garsas pasirinkus lokaciją
  factionIds?: string[] // visos frakcijos (filtras tikrina visas, ne tik pirmą)
  states?: LoreLocationState[]  // aprašymai pagal periodą (chronologine tvarka)
}

export type LoreEvent = {
  id: string
  name: string
  eraIndex: number     // which era this happened in
  locationId: string
  description: string
  imageUrl?: string
  audioUrl?: string    // event soundtrack
  periodId?: string        // mažesnis laikotarpis eros viduje
  prevEventId?: string     // grandinė: po kurio įvykio seka šis
  characterIds?: string[]  // dalyvaujantys veikėjai (slug)
  order?: number           // globali chronologinė pozicija (era→periodas→įvykis)
}

export type LoreCharacter = {
  id: string
  name: string
  title?: string
  factionId?: string
  description: string
}

export type LoreArtifact = {
  id: string
  name: string
  description: string
  locationId?: string
}

// ── Eros ─────────────────────────────────────────────────────────────────────

export const loreEras: LoreEra[] = [
  {
    id: 'era-0',
    index: 0,
    name: 'Prieš Tylą',
    color: '#6366f1',
    description: 'Laikas prieš didįjį nutilimą — kai pasaulis dar skambėjo senaisiais balsais.',
  },
  {
    id: 'era-1',
    index: 1,
    name: 'Pirmieji Ženklai',
    color: '#8b5cf6',
    description: 'Pirmieji tamsos ženklai pasirodo pakrančių miestuose. Žvejai randa keistus randus.',
  },
  {
    id: 'era-2',
    index: 2,
    name: 'Prazaro Pabudimas',
    color: '#dc2626',
    description: 'Senovinis blogis Prazaras atsibunda iš tūkstantmečio miego po žeme.',
  },
  {
    id: 'era-3',
    index: 3,
    name: 'Užtvindyti',
    color: '#0ea5e9',
    description: 'Vandenynas prarijia senuosius uostus. Druskos Vagys plaukia iš nežinomų krantų.',
  },
  {
    id: 'era-4',
    index: 4,
    name: 'Karo Metai',
    color: '#f59e0b',
    description: 'Frakcijos susiduria atvirame kare. Senasis Miškas dega. Bastionai laiko gynybą.',
  },
]

// ── Frakcijos ─────────────────────────────────────────────────────────────────

export const loreFactions: LoreFaction[] = [
  { id: 'mirties',      name: 'Mirties Ordinas',  color: '#7c3aed' },
  { id: 'sviesuoliai',  name: 'Šviesos Pulkas',   color: '#f59e0b' },
  { id: 'demonai',      name: 'Demonų Orda',       color: '#dc2626' },
  { id: 'plesikaiai',   name: 'Plėšikų Gauja',    color: '#16a34a' },
  { id: 'druskos',      name: 'Druskos Vagys',     color: '#0ea5e9' },
]

// ── Vietovės ─────────────────────────────────────────────────────────────────
// To add a location: copy one object, give new id, adjust x/y coords and link ids.

export const loreLocations: LoreLocation[] = [
  {
    id: 'loc-sirveta',
    name: 'Sirvėta',
    type: 'miestas',
    x: 42,
    y: 35,
    description:
      'Seniausia Ravenof žemių gyvenvietė. Sirvėta stovi ties trijų upių santaka ir nuo seno buvo prekyviečių centras. Jos griuvėsiuose tebegyvena miestas — bet jau kitas.',
    factionId: 'sviesuoliai',
    firstEraIndex: 0,
    eventIds: ['evt-sirvetos-aidai', 'evt-pirmasis-susidurimas'],
    characterIds: ['char-vilius', 'char-aurelionas'],
    artifactIds: ['art-vardai'],
    relatedCards: [
      { name: 'Sirvėtos Sargas', cardNumber: 'RVN-001' },
      { name: 'Upių Ragana',     cardNumber: 'RVN-012' },
    ],
  },
  {
    id: 'loc-uostas',
    name: 'Užtvindytas Uostas',
    type: 'griuvėsiai',
    x: 22,
    y: 58,
    description:
      'Kadaise didžiausias Ravenof uostas, dabar pusiau panirė vandenyno bangose. Tik aukščiausi bokštai kyšo virš vandens. Jūreiviai vengia šios vietos — iš po vandens girdisi balsai.',
    factionId: 'druskos',
    firstEraIndex: 3,
    eventIds: ['evt-uosto-uztvindymas'],
    characterIds: ['char-kapitonas'],
    artifactIds: ['art-inkaras'],
    relatedCards: [
      { name: 'Nuskendęs Kapitonas', cardNumber: 'RVN-034' },
    ],
  },
  {
    id: 'loc-druskos',
    name: 'Druskos Vagis',
    type: 'uostas',
    x: 15,
    y: 44,
    description:
      'Plaukiojantis miestas — šimtai laivų sutvirtintų grandinėmis. Druskos Vagiai čia perka, parduoda ir saugo paslaptis. Niekas nežino, iš kur jie atplaukė.',
    factionId: 'druskos',
    firstEraIndex: 2,
    eventIds: ['evt-druskos-atvykimas'],
    characterIds: ['char-kapitonas'],
    artifactIds: ['art-inkaras'],
    relatedCards: [
      { name: 'Druskos Vagies Žvalgas', cardNumber: 'RVN-022' },
      { name: 'Jūros Kontrabandininkas', cardNumber: 'RVN-023' },
    ],
  },
  {
    id: 'loc-miskas',
    name: 'Senasis Miškas',
    type: 'miškas',
    x: 65,
    y: 28,
    description:
      'Miškas, kuris yra senesnis už bet kurią frakciją. Medžiai čia auga atgal — šaknys ore, viršūnės žemėje. Miško dvasia nepriima svetimų, tačiau Prazaras rastas kaip tik čia.',
    factionId: undefined,
    firstEraIndex: 0,
    eventIds: ['evt-prazaro-zenklai'],
    characterIds: ['char-prazaras'],
    artifactIds: [],
    relatedCards: [
      { name: 'Miško Sargybinis',  cardNumber: 'RVN-045' },
      { name: 'Apverstas Ąžuolas', cardNumber: 'RVN-046' },
    ],
  },
  {
    id: 'loc-bastionas',
    name: 'Šviesos Pulko Bastionas',
    type: 'tvirtovė',
    x: 55,
    y: 62,
    description:
      'Šviesos Pulko kariuomenės tvirtovė pietuose. Aukso statiniai, kuriuos saulė apšviečia bet kokiu oru. Čia treniruojami šviesos riteriai ir saugomi paimti artefaktai.',
    factionId: 'sviesuoliai',
    firstEraIndex: 1,
    eventIds: ['evt-pirmasis-susidurimas'],
    characterIds: ['char-aurelionas'],
    artifactIds: ['art-vardai'],
    relatedCards: [
      { name: 'Šviesos Riteris',   cardNumber: 'RVN-055' },
      { name: 'Bastiono Archyvas', cardNumber: 'RVN-056' },
    ],
  },
  {
    id: 'loc-itrukas',
    name: 'Demonų Įtrūkis',
    type: 'plyšys',
    x: 78,
    y: 70,
    description:
      'Žemės plyšys, atsiradęs Prazaro pabudimo naktį. Iš gelmių kyla karštis ir juodi dūmai. Demonų Orda laiko perimetrą — bet ar saugo, ar tarnauja?',
    factionId: 'demonai',
    firstEraIndex: 2,
    eventIds: ['evt-prazaro-zenklai', 'evt-pirmasis-susidurimas'],
    characterIds: ['char-prazaras'],
    artifactIds: [],
    relatedCards: [
      { name: 'Demonų Orda Sargas', cardNumber: 'RVN-067' },
      { name: 'Plyšio Šauklys',     cardNumber: 'RVN-068' },
    ],
  },
]

// ── Įvykiai ──────────────────────────────────────────────────────────────────

export const loreEvents: LoreEvent[] = [
  {
    id: 'evt-sirvetos-aidai',
    name: 'Sirvėtos Aidai',
    eraIndex: 0,
    locationId: 'loc-sirveta',
    description:
      'Mieste pradedami girdėti keisti aidai iš požeminių rūsių. Senos moterys teigia, kad tai kalbasi mirę.',
  },
  {
    id: 'evt-prazaro-zenklai',
    name: 'Prazaro Pabudimo Ženklai',
    eraIndex: 2,
    locationId: 'loc-miskas',
    description:
      'Senajame Miške pradeda džiūti medžiai iš vidurio. Žemė dega po kojomis. Prazaro vardas rastas išraižytas ant visų medžių žievių.',
  },
  {
    id: 'evt-druskos-atvykimas',
    name: 'Druskos Vagių Atvykimas',
    eraIndex: 2,
    locationId: 'loc-druskos',
    description:
      'Horizontas prisipildo laivų. Druskos Vagiai atplaukia iš niekur — be vėliavų, be vardo, su pilnais triumais keistų prekių.',
  },
  {
    id: 'evt-uosto-uztvindymas',
    name: 'Uosto Užtvindymas',
    eraIndex: 3,
    locationId: 'loc-uostas',
    description:
      'Per naktį vandenynas pakyla per dešimt metrų ir prarija senąjį uostą. Išgyvena tik tie, kurie buvo aukščiau.',
  },
  {
    id: 'evt-pirmasis-susidurimas',
    name: 'Pirmasis Susidūrimas su Mirties Maršu',
    eraIndex: 4,
    locationId: 'loc-bastionas',
    description:
      'Pirmą kartą Šviesos Pulkas susiduria su organizuotu Mirties Ordino žygiu. Bastionas laiko gynybą. Aurelionas veda kontrataką.',
  },
]

// ── Veikėjai ─────────────────────────────────────────────────────────────────

export const loreCharacters: LoreCharacter[] = [
  {
    id: 'char-prazaras',
    name: 'Prazaras',
    title: 'Senovinis Blogis',
    factionId: 'demonai',
    description:
      'Niekas nežino, kuo jis buvo prieš užmiegant. Kai atsibunda, žemė pamena jo pėdas. Kalba be žodžių — tik per svajones ir įtrūkimus.',
  },
  {
    id: 'char-vilius',
    name: 'Vilius',
    title: 'Sirvėtos Archyvistas',
    factionId: 'sviesuoliai',
    description:
      'Senas vyras, kuris užrašo viską. Jo rankraščiai yra vienintelis istorinis šaltinis apie laikotarpį prieš Tylą. Pats teigia nieko neprisimenant.',
  },
  {
    id: 'char-aurelionas',
    name: 'Aurelionas',
    title: 'Šviesos Pulko Generolas',
    factionId: 'sviesuoliai',
    description:
      'Kariuomenės vadas, kuris laimi mūšius ne jėga, o kantrybe. Sako, kad laukia — bet ko, niekam nesako.',
  },
  {
    id: 'char-kapitonas',
    name: 'Druskos Vagies Kapitonas',
    title: 'Kapitonas be Vardo',
    factionId: 'druskos',
    description:
      'Vienintelis Druskos Vagių atstovas, kuris kalba su krantu. Jo tikrasis vardas nežinomas — Druskos Vagiai mini tik „Kapitoną".',
  },
]

// ── Artefaktai ───────────────────────────────────────────────────────────────

export const loreArtifacts: LoreArtifact[] = [
  {
    id: 'art-vardai',
    name: 'Pamirštų Vardų Ženklas',
    locationId: 'loc-bastionas',
    description:
      'Auksinė plokštė su išraižytais vardais — bet jų neįmanoma perskaityti. Kiekvieną rytą raidės būna kitokios. Bastionas saugo jį kaip šventą relikvą.',
  },
  {
    id: 'art-inkaras',
    name: 'Druskos Vagies Inkaras',
    locationId: 'loc-uostas',
    description:
      'Milžiniškas inkaras, rastas užtvindyto uosto gelmėse. Ant jo iškalta žemėlapis — bet žemės, kurios nėra jokiame atlase.',
  },
]

// ── Lookup helpers ────────────────────────────────────────────────────────────

export function getEraByIndex(index: number): LoreEra | undefined {
  return loreEras.find((e) => e.index === index)
}

export function getLocationById(id: string): LoreLocation | undefined {
  return loreLocations.find((l) => l.id === id)
}

export function getEventsForLocation(locationId: string): LoreEvent[] {
  return loreEvents.filter((e) => e.locationId === locationId)
}

export function getCharacterById(id: string): LoreCharacter | undefined {
  return loreCharacters.find((c) => c.id === id)
}

export function getArtifactById(id: string): LoreArtifact | undefined {
  return loreArtifacts.find((a) => a.id === id)
}

export function getFactionById(id: string): LoreFaction | undefined {
  return loreFactions.find((f) => f.id === id)
}
