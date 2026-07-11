// ── Centrinis starter kaladžių / frakcijų onboarding meta modelis ─────────────
// Naudojamas naujoko starter pasirinkime (lore, stiprybės, silpnybės, sudėtingumas).
// Raktas = factions.id (6–13). Tekstai rašyti visiškai naujam žaidėjui — be
// vidinių terminų. Jei frakcija nerasta pagal id, bandoma pagal pavadinimo regex.

export type StarterMeta = {
  label: string            // trumpas žaidimo stiliaus šūkis (uždarytai dėžei)
  intro: string            // lore įvadas (1–2 sakiniai)
  playstyle: string        // kaip žaidžiasi (paprastai)
  strengths: string[]
  weaknesses: string[]
  recommendedFor: string
  complexity: 1 | 2 | 3    // 1 = paprasta pradžia, 3 = reikia patirties
}

const META: Record<number, StarterMeta & { match: RegExp }> = {
  6: {
    match: /mirt|mar[šs]/i, label: 'Mirtis ir prisikėlimas',
    intro: 'Mirties maršo nekromantai žino: kritęs karys — tik laikinai pailsėjęs karys.',
    playstyle: 'Lėtas, atsparus stilius — tavo padarai grįžta iš kapinyno, o priešas pavargsta juos naikinti.',
    strengths: ['Padarai grįžta iš kapinyno', 'Ilgos kovos', 'Nauda iš sunaikintų padarų'],
    weaknesses: ['Greitas ankstyvas spaudimas', 'Kapinyno trikdymas'],
    recommendedFor: 'Kantriems žaidėjams, mėgstantiems lėtai auginti galingas kombinacijas.',
    complexity: 2,
  },
  7: {
    match: /pl[ėe][šs]ik|nakt/i, label: 'Spąstai ir apiplėšimai',
    intro: 'Plėšikų naktis gyvena šešėliuose — smūgis iš pasalos visada skaudesnis.',
    playstyle: 'Greitas tempas: smok pirmas, rink auksą ir spęsk spąstus netikėtiems posūkiams.',
    strengths: ['Greitos atakos', 'Papildomas auksas', 'Netikėti spąstai'],
    weaknesses: ['Ilgos, lėtos kovos', 'Masinis lentos valymas'],
    recommendedFor: 'Mėgstantiems agresyvų, rizikingą žaidimą ir greitus sprendimus.',
    complexity: 2,
  },
  8: {
    match: /vryhiok|gauj|goblin/i, label: 'Agresyvus spiečius',
    intro: 'Vryhioko gauja neklausia kiek priešų — klausia, ar visiems užteks.',
    playstyle: 'Užpildyk lentą pigiais padarais ir užgriūk priešą skaičiumi anksčiau, nei jis spės atsitiesti.',
    strengths: ['Daug pigių padarų', 'Ankstyvas spaudimas', 'Lengva išmokti'],
    weaknesses: ['Masinė žala visiems', 'Vėlyvos, stiprios kortos'],
    recommendedFor: 'Naujokams — paprasčiausia pradžia — ir tiems, kas mėgsta pulti.',
    complexity: 1,
  },
  9: {
    match: /demon|orda/i, label: 'Aukos ir prakeiksmai',
    intro: 'Demonų orda už galią moka krauju — savu arba tavo.',
    playstyle: 'Aukok savus padarus ir kišk prakeiksmus į priešo kaladę — kiekvienas jo ėjimas taps rizika.',
    strengths: ['Prakeiksmai priešo kaladėje', 'Galia už aukas', 'Spaudimas per visą kovą'],
    weaknesses: ['Savo gyvybės kaina', 'Prakeiksmų pašalinimas'],
    recommendedFor: 'Mėgstantiems tamsius derinius ir spaudimą iš kelių pusių.',
    complexity: 3,
  },
  10: {
    match: /inkviz|legion/i, label: 'Kontrolė ir šarvai',
    intro: 'Inkvizicijos legionas nešvaisto jėgų — kiekviena grėsmė sunaikinama tiksliai ir negailestingai.',
    playstyle: 'Atlaikyk smūgius šarvuotais gynėjais, naikink pavojingiausias priešo kortas ir bausk už burtus.',
    strengths: ['Tvirti gynėjai', 'Grėsmių naikinimas', 'Apsauga nuo burtų'],
    weaknesses: ['Lėta pradžia', 'Daug smulkių priešų'],
    recommendedFor: 'Metodiškiems žaidėjams, mėgstantiems kontroliuoti kovos eigą.',
    complexity: 2,
  },
  11: {
    match: /[šs]vies|pulk/i, label: 'Gynyba ir gydymas',
    intro: 'Šviesos pulkas tiki: išgyvenk audrą — ir aušra bus tavo.',
    playstyle: 'Gydyk, denk skydais ir laimėk ilgą kovą, kai priešo jėgos išseks.',
    strengths: ['Gydymas ir skydai', 'Ilgos kovos', 'Atsparumas agresijai'],
    weaknesses: ['Lėtas žalos darymas', 'Gydymo ribojimas'],
    recommendedFor: 'Gynybinio stiliaus mėgėjams, kurie laimi ištverme.',
    complexity: 1,
  },
  12: {
    match: /mistik|melodij/i, label: 'Burtų kombinacijos',
    intro: 'Mistikos melodijai kova — tai partitūra: kiekvienas burtas turi suskambėti laiku.',
    playstyle: 'Grandink burtus vieną po kito — teisinga seka gali apversti visą kovą per vieną ėjimą.',
    strengths: ['Galingi burtai', 'Kombinacijų sprogimai', 'Lankstumas'],
    weaknesses: ['Silpni padarai', 'Burtų nutildymas'],
    recommendedFor: 'Patyrusiems žaidėjams, mėgstantiems planuoti kelis ėjimus į priekį.',
    complexity: 3,
  },
  13: {
    match: /ryt|v[ėe]j/i, label: 'Tikslumas ir tempas',
    intro: 'Rytų vėjas moko: laimi ne stipriausias, o tas, kuris smogia reikiamu metu.',
    playstyle: 'Tiksli žala, greiti padarai ir tempo kontrolė — visada žingsniu priekyje priešo.',
    strengths: ['Tiksli žala', 'Tempo kontrolė', 'Subalansuota pradžia'],
    weaknesses: ['Riboti masiniai atsakai', 'Labai tvirti gynėjai'],
    recommendedFor: 'Mėgstantiems apgalvotą, techninį žaidimą.',
    complexity: 2,
  },
}

const FALLBACK: StarterMeta = {
  label: 'Subalansuota pradžia',
  intro: 'Subalansuota kaladė — visko po truputį, kad pažintum žaidimą.',
  playstyle: 'Universalus stilius be didelių silpnybių — gera pirmoji kaladė.',
  strengths: ['Universalumas', 'Lengva išmokti'],
  weaknesses: ['Be ryškios specializacijos'],
  recommendedFor: 'Visiems naujiems žaidėjams.',
  complexity: 1,
}

export function starterMetaFor(factionId: number | null, name?: string | null): StarterMeta {
  if (factionId != null && META[factionId]) return META[factionId]
  if (name) { const hit = Object.values(META).find((m) => m.match.test(name)); if (hit) return hit }
  return FALLBACK
}

export const COMPLEXITY_LABEL: Record<1 | 2 | 3, string> = { 1: 'Paprasta', 2: 'Vidutinė', 3: 'Sudėtinga' }
