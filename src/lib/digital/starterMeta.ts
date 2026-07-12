// ── Centrinis starter kaladžių / frakcijų onboarding meta modelis ─────────────
// Naudojamas naujoko starter pasirinkime (lore, stiprybės, silpnybės, sudėtingumas).
// Raktas = factions.id (6–13). Tekstai rašyti visiškai naujam žaidėjui — be
// vidinių terminų. Jei frakcija nerasta pagal id, bandoma pagal pavadinimo regex.
//
// i18n: turinys laikomas per-locale objektuose (LT = šaltinis, EN = draft
// vertimas). starterMetaFor() grąžina aktyvios kalbos variantą.

import { getLocale } from '@/lib/i18n/core'
import type { SupportedLocale } from '@/lib/i18n/config'

export type StarterMeta = {
  label: string            // trumpas žaidimo stiliaus šūkis (uždarytai dėžei)
  intro: string            // lore įvadas (1–2 sakiniai)
  playstyle: string        // kaip žaidžiasi (paprastai)
  strengths: string[]
  weaknesses: string[]
  recommendedFor: string
  complexity: 1 | 2 | 3    // 1 = paprasta pradžia, 3 = reikia patirties
}

type MetaEntry = { match: RegExp; complexity: 1 | 2 | 3; i18n: Record<SupportedLocale, Omit<StarterMeta, 'complexity'>> }

const META: Record<number, MetaEntry> = {
  6: {
    match: /mirt|mar[šs]/i, complexity: 2,
    i18n: {
      lt: {
        label: 'Mirtis ir prisikėlimas',
        intro: 'Mirties maršo nekromantai žino: kritęs karys — tik laikinai pailsėjęs karys.',
        playstyle: 'Lėtas, atsparus stilius — tavo padarai grįžta iš kapinyno, o priešas pavargsta juos naikinti.',
        strengths: ['Padarai grįžta iš kapinyno', 'Ilgos kovos', 'Nauda iš sunaikintų padarų'],
        weaknesses: ['Greitas ankstyvas spaudimas', 'Kapinyno trikdymas'],
        recommendedFor: 'Kantriems žaidėjams, mėgstantiems lėtai auginti galingas kombinacijas.',
      },
      en: {
        label: 'Death and resurrection',
        intro: 'The necromancers of the Death March know: a fallen warrior is merely a warrior at rest.',
        playstyle: 'A slow, resilient style — your creatures return from the graveyard while the enemy exhausts itself destroying them.',
        strengths: ['Creatures return from the graveyard', 'Long battles', 'Value from destroyed creatures'],
        weaknesses: ['Fast early pressure', 'Graveyard disruption'],
        recommendedFor: 'Patient players who love slowly building powerful combos.',
      },
    },
  },
  7: {
    match: /pl[ėe][šs]ik|nakt/i, complexity: 2,
    i18n: {
      lt: {
        label: 'Spąstai ir apiplėšimai',
        intro: 'Plėšikų naktis gyvena šešėliuose — smūgis iš pasalos visada skaudesnis.',
        playstyle: 'Greitas tempas: smok pirmas, rink auksą ir spęsk spąstus netikėtiems posūkiams.',
        strengths: ['Greitos atakos', 'Papildomas auksas', 'Netikėti spąstai'],
        weaknesses: ['Ilgos, lėtos kovos', 'Masinis lentos valymas'],
        recommendedFor: 'Mėgstantiems agresyvų, rizikingą žaidimą ir greitus sprendimus.',
      },
      en: {
        label: 'Traps and heists',
        intro: 'The Night of Thieves lives in the shadows — a strike from ambush always cuts deeper.',
        playstyle: 'Fast tempo: hit first, gather gold and lay traps for unexpected turns.',
        strengths: ['Fast attacks', 'Extra gold', 'Surprise traps'],
        weaknesses: ['Long, slow battles', 'Mass board clears'],
        recommendedFor: 'Players who enjoy aggressive, risky play and quick decisions.',
      },
    },
  },
  8: {
    match: /vryhiok|gauj|goblin/i, complexity: 1,
    i18n: {
      lt: {
        label: 'Agresyvus spiečius',
        intro: 'Vryhioko gauja neklausia kiek priešų — klausia, ar visiems užteks.',
        playstyle: 'Užpildyk lentą pigiais padarais ir užgriūk priešą skaičiumi anksčiau, nei jis spės atsitiesti.',
        strengths: ['Daug pigių padarų', 'Ankstyvas spaudimas', 'Lengva išmokti'],
        weaknesses: ['Masinė žala visiems', 'Vėlyvos, stiprios kortos'],
        recommendedFor: 'Naujokams — paprasčiausia pradžia — ir tiems, kas mėgsta pulti.',
      },
      en: {
        label: 'Aggressive swarm',
        intro: "The Vryhiok Gang never asks how many enemies there are — only whether there'll be enough for everyone.",
        playstyle: 'Fill the board with cheap creatures and overwhelm the enemy with numbers before they can recover.',
        strengths: ['Many cheap creatures', 'Early pressure', 'Easy to learn'],
        weaknesses: ['Mass damage to all', 'Late, powerful cards'],
        recommendedFor: 'Newcomers — the simplest start — and anyone who loves to attack.',
      },
    },
  },
  9: {
    match: /demon|orda/i, complexity: 3,
    i18n: {
      lt: {
        label: 'Aukos ir prakeiksmai',
        intro: 'Demonų orda už galią moka krauju — savu arba tavo.',
        playstyle: 'Aukok savus padarus ir kišk prakeiksmus į priešo kaladę — kiekvienas jo ėjimas taps rizika.',
        strengths: ['Prakeiksmai priešo kaladėje', 'Galia už aukas', 'Spaudimas per visą kovą'],
        weaknesses: ['Savo gyvybės kaina', 'Prakeiksmų pašalinimas'],
        recommendedFor: 'Mėgstantiems tamsius derinius ir spaudimą iš kelių pusių.',
      },
      en: {
        label: 'Sacrifice and curses',
        intro: 'The Demon Horde pays for power in blood — its own, or yours.',
        playstyle: "Sacrifice your own creatures and slip curses into the enemy's deck — every draw becomes a gamble.",
        strengths: ["Curses in the enemy's deck", 'Power from sacrifices', 'Pressure all battle long'],
        weaknesses: ['Costs your own health', 'Curse removal'],
        recommendedFor: 'Players who enjoy dark combos and pressure from many angles.',
      },
    },
  },
  10: {
    match: /inkviz|legion/i, complexity: 2,
    i18n: {
      lt: {
        label: 'Kontrolė ir šarvai',
        intro: 'Inkvizicijos legionas nešvaisto jėgų — kiekviena grėsmė sunaikinama tiksliai ir negailestingai.',
        playstyle: 'Atlaikyk smūgius šarvuotais gynėjais, naikink pavojingiausias priešo kortas ir bausk už burtus.',
        strengths: ['Tvirti gynėjai', 'Grėsmių naikinimas', 'Apsauga nuo burtų'],
        weaknesses: ['Lėta pradžia', 'Daug smulkių priešų'],
        recommendedFor: 'Metodiškiems žaidėjams, mėgstantiems kontroliuoti kovos eigą.',
      },
      en: {
        label: 'Control and armor',
        intro: 'The Inquisition Legion wastes no strength — every threat is eliminated precisely and mercilessly.',
        playstyle: "Weather the blows with armored defenders, destroy the enemy's most dangerous cards and punish spellcasting.",
        strengths: ['Sturdy defenders', 'Threat removal', 'Protection against spells'],
        weaknesses: ['Slow start', 'Swarms of small enemies'],
        recommendedFor: 'Methodical players who like to control the flow of battle.',
      },
    },
  },
  11: {
    match: /[šs]vies|pulk/i, complexity: 1,
    i18n: {
      lt: {
        label: 'Gynyba ir gydymas',
        intro: 'Šviesos pulkas tiki: išgyvenk audrą — ir aušra bus tavo.',
        playstyle: 'Gydyk, denk skydais ir laimėk ilgą kovą, kai priešo jėgos išseks.',
        strengths: ['Gydymas ir skydai', 'Ilgos kovos', 'Atsparumas agresijai'],
        weaknesses: ['Lėtas žalos darymas', 'Gydymo ribojimas'],
        recommendedFor: 'Gynybinio stiliaus mėgėjams, kurie laimi ištverme.',
      },
      en: {
        label: 'Defense and healing',
        intro: 'The Regiment of Light believes: survive the storm — and the dawn is yours.',
        playstyle: "Heal, shield and win the long battle once the enemy's strength runs dry.",
        strengths: ['Healing and shields', 'Long battles', 'Resilience against aggression'],
        weaknesses: ['Slow damage output', 'Healing counters'],
        recommendedFor: 'Fans of defensive play who win through endurance.',
      },
    },
  },
  12: {
    match: /mistik|melodij/i, complexity: 3,
    i18n: {
      lt: {
        label: 'Burtų kombinacijos',
        intro: 'Mistikos melodijai kova — tai partitūra: kiekvienas burtas turi suskambėti laiku.',
        playstyle: 'Grandink burtus vieną po kito — teisinga seka gali apversti visą kovą per vieną ėjimą.',
        strengths: ['Galingi burtai', 'Kombinacijų sprogimai', 'Lankstumas'],
        weaknesses: ['Silpni padarai', 'Burtų nutildymas'],
        recommendedFor: 'Patyrusiems žaidėjams, mėgstantiems planuoti kelis ėjimus į priekį.',
      },
      en: {
        label: 'Spell combos',
        intro: 'To the Melody of Mysticism, battle is a musical score: every spell must ring out on time.',
        playstyle: 'Chain spells one after another — the right sequence can flip the whole battle in a single turn.',
        strengths: ['Powerful spells', 'Combo explosions', 'Flexibility'],
        weaknesses: ['Weak creatures', 'Spell silencing'],
        recommendedFor: 'Experienced players who love planning several turns ahead.',
      },
    },
  },
  13: {
    match: /ryt|v[ėe]j/i, complexity: 2,
    i18n: {
      lt: {
        label: 'Tikslumas ir tempas',
        intro: 'Rytų vėjas moko: laimi ne stipriausias, o tas, kuris smogia reikiamu metu.',
        playstyle: 'Tiksli žala, greiti padarai ir tempo kontrolė — visada žingsniu priekyje priešo.',
        strengths: ['Tiksli žala', 'Tempo kontrolė', 'Subalansuota pradžia'],
        weaknesses: ['Riboti masiniai atsakai', 'Labai tvirti gynėjai'],
        recommendedFor: 'Mėgstantiems apgalvotą, techninį žaidimą.',
      },
      en: {
        label: 'Precision and tempo',
        intro: 'The East Wind teaches: it is not the strongest who wins, but the one who strikes at the right moment.',
        playstyle: 'Precise damage, fast creatures and tempo control — always one step ahead of the enemy.',
        strengths: ['Precise damage', 'Tempo control', 'Balanced start'],
        weaknesses: ['Limited mass answers', 'Very sturdy defenders'],
        recommendedFor: 'Players who enjoy thoughtful, technical play.',
      },
    },
  },
}

const FALLBACK: Record<SupportedLocale, Omit<StarterMeta, 'complexity'>> = {
  lt: {
    label: 'Subalansuota pradžia',
    intro: 'Subalansuota kaladė — visko po truputį, kad pažintum žaidimą.',
    playstyle: 'Universalus stilius be didelių silpnybių — gera pirmoji kaladė.',
    strengths: ['Universalumas', 'Lengva išmokti'],
    weaknesses: ['Be ryškios specializacijos'],
    recommendedFor: 'Visiems naujiems žaidėjams.',
  },
  en: {
    label: 'Balanced start',
    intro: 'A balanced deck — a bit of everything, so you can get to know the game.',
    playstyle: 'A universal style with no big weaknesses — a great first deck.',
    strengths: ['Versatility', 'Easy to learn'],
    weaknesses: ['No sharp specialization'],
    recommendedFor: 'All new players.',
  },
}

function resolve(entry: MetaEntry): StarterMeta {
  const loc = getLocale()
  return { ...(entry.i18n[loc] ?? entry.i18n.lt), complexity: entry.complexity }
}

export function starterMetaFor(factionId: number | null, name?: string | null): StarterMeta {
  if (factionId != null && META[factionId]) return resolve(META[factionId])
  if (name) { const hit = Object.values(META).find((m) => m.match.test(name)); if (hit) return resolve(hit) }
  return { ...(FALLBACK[getLocale()] ?? FALLBACK.lt), complexity: 1 }
}

export function complexityLabel(c: 1 | 2 | 3): string {
  const L: Record<SupportedLocale, Record<1 | 2 | 3, string>> = {
    lt: { 1: 'Paprasta', 2: 'Vidutinė', 3: 'Sudėtinga' },
    en: { 1: 'Simple', 2: 'Medium', 3: 'Advanced' },
  }
  return (L[getLocale()] ?? L.lt)[c]
}

/** @deprecated naudok complexityLabel() — paliktas suderinamumui, LT reikšmės. */
export const COMPLEXITY_LABEL: Record<1 | 2 | 3, string> = { 1: 'Paprasta', 2: 'Vidutinė', 3: 'Sudėtinga' }
