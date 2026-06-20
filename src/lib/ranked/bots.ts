// ── Ravenof Reitingo kova — botų katalogas (Source of Truth) ─────────────────
// 20 botų, kurie atrodo kaip tikri online žaidėjai (Discord/MMO/card-game stilius).
// SVARBU: vardai NĖRA lore personažai. Boto tapatybė rodoma TIK admin/debug rėžime.
// Šie duomenys atspindi DB lentelę ranked_bots (seed migracijoje turi sutapti).

import type { MedalTier } from './rank'
import { stepFromRank } from './rank'

export type StrategyType =
  | 'aggro' | 'control' | 'tempo' | 'curse' | 'stealth' | 'defensive' | 'midrange'

export type Intensity = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'

/** DB factions.slug → rodomas frakcijos vardas. */
export const FACTION_SLUG_TO_NAME: Record<string, string> = {
  'mirties-marsas': 'Mirties maršas',
  'vryhioko-gauja': 'Goblinų Gauja',
  'sviesos-pulkas': 'Šviesos pulkas',
  'mistikos-melodija': 'Mistikos melodija',
  'demonu-orda': 'Demonų orda',
  'plesiku-naktis': 'Plėšikų naktis',
  'rytu-vejas': 'Rytų vėjas',
  'inkvizicijos-legionas': 'Inkvizicijos legionas',
}

export type RankedBot = {
  /** Stabilus identifikatorius (taip pat seed'inamas botId pamatui). */
  slug: string
  name: string
  avatar: string // emoji vietos rezervas (vėliau gali būti paveikslėlis)
  /** Frakcijos slug DB; null = mišri/universali (kovai parenkama atsitiktinė frakcija). */
  factionSlug: string | null
  faction: string // rodomas vardas
  strategyType: StrategyType
  aggression: Intensity
  controlPreference: Intensity
  tradePreference: Intensity
  riskTolerance: Intensity
  /** Pradinis rango žingsnis (gali kisti pagal rezultatus). */
  rankStep: number
  /** Sunkumo modifikatorius perduodamas engine AI (0=easy..2=hard mapinama žemiau). */
  difficultyModifier: 'easy' | 'normal' | 'hard'
  /** Trumpas „asmenybės" pojūtis (admin/debug). */
  personality: string
  deckName: string
}

const R = (n: number, m: MedalTier) => stepFromRank(n, m)

export const RANKED_BOTS: RankedBot[] = [
  { slug: 'shadowrook', name: 'ShadowRook', avatar: '🪦', factionSlug: 'mirties-marsas', faction: 'Mirties maršas',
    strategyType: 'control', aggression: 'low', controlPreference: 'high', tradePreference: 'high', riskTolerance: 'low',
    rankStep: R(12, 'silver'), difficultyModifier: 'hard', personality: 'Ramus laiptų grindintojas, mėgsta lėtas kalades.', deckName: 'Lėtas kapinynas' },
  { slug: 'lootgoblin69', name: 'LootGoblin69', avatar: '👺', factionSlug: 'vryhioko-gauja', faction: 'Goblinų Gauja',
    strategyType: 'aggro', aggression: 'very_high', controlPreference: 'low', tradePreference: 'low', riskTolerance: 'very_high',
    rankStep: R(34, 'bronze'), difficultyModifier: 'normal', personality: 'Chaotiškas goblinas, lekia į veidą ir lošia.', deckName: 'Goblinų antplūdis' },
  { slug: 'silvertilt', name: 'SilverTilt', avatar: '🛡️', factionSlug: 'sviesos-pulkas', faction: 'Šviesos pulkas',
    strategyType: 'midrange', aggression: 'medium', controlPreference: 'medium', tradePreference: 'high', riskTolerance: 'low',
    rankStep: R(20, 'gold'), difficultyModifier: 'hard', personality: 'Rimtas ranked žaidėjas, švarūs ėjimai.', deckName: 'Disciplinuotas midrange' },
  { slug: 'nomananocry', name: 'NoManaNoCry', avatar: '🔮', factionSlug: 'mistikos-melodija', faction: 'Mistikos melodija',
    strategyType: 'control', aggression: 'medium', controlPreference: 'high', tradePreference: 'medium', riskTolerance: 'medium',
    rankStep: R(18, 'bronze'), difficultyModifier: 'hard', personality: 'Burtų mėgėjas, kantrus value žaidimas.', deckName: 'Šalčio kontrolė' },
  { slug: 'cursedealer', name: 'CurseDealer', avatar: '🕯️', factionSlug: 'demonu-orda', faction: 'Demonų orda',
    strategyType: 'curse', aggression: 'medium', controlPreference: 'high', tradePreference: 'medium', riskTolerance: 'medium',
    rankStep: R(22, 'silver'), difficultyModifier: 'hard', personality: 'Erzinantis kontrolininkas, mėgsta trikdyti.', deckName: 'Prakeiksmų sandoris' },
  { slug: 'piratewifi', name: 'PirateWifi', avatar: '🏴‍☠️', factionSlug: 'plesiku-naktis', faction: 'Plėšikų naktis',
    strategyType: 'tempo', aggression: 'high', controlPreference: 'medium', tradePreference: 'medium', riskTolerance: 'medium',
    rankStep: R(28, 'gold'), difficultyModifier: 'normal', personality: 'Žaidžia greitai, baudžia klaidas.', deckName: 'Plėšikų tempas' },
  { slug: 'sneak-exe', name: 'Sneak.exe', avatar: '🥷', factionSlug: 'rytu-vejas', faction: 'Rytų vėjas',
    strategyType: 'stealth', aggression: 'medium', controlPreference: 'medium', tradePreference: 'low', riskTolerance: 'low',
    rankStep: R(15, 'silver'), difficultyModifier: 'hard', personality: 'Asasinas, laukia lethal lango.', deckName: 'Tylus durklas' },
  { slug: 'healmepls', name: 'HealMePls', avatar: '✨', factionSlug: 'inkvizicijos-legionas', faction: 'Inkvizicijos legionas',
    strategyType: 'defensive', aggression: 'low', controlPreference: 'high', tradePreference: 'high', riskTolerance: 'low',
    rankStep: R(24, 'bronze'), difficultyModifier: 'normal', personality: 'Support mėgėjas, ilgi žaidimai.', deckName: 'Atkaklus gynėjas' },
  { slug: 'topdecktomas', name: 'TopdeckTomas', avatar: '🍀', factionSlug: 'plesiku-naktis', faction: 'Plėšikų naktis',
    strategyType: 'tempo', aggression: 'high', controlPreference: 'medium', tradePreference: 'medium', riskTolerance: 'medium',
    rankStep: R(30, 'silver'), difficultyModifier: 'normal', personality: 'Laimingas laiptų žaidėjas, visad ištraukia.', deckName: 'Godus tempas' },
  { slug: 'graveyardenjoyer', name: 'GraveyardEnjoyer', avatar: '⚰️', factionSlug: 'mirties-marsas', faction: 'Mirties maršas',
    strategyType: 'midrange', aggression: 'medium', controlPreference: 'medium', tradePreference: 'medium', riskTolerance: 'medium',
    rankStep: R(19, 'gold'), difficultyModifier: 'normal', personality: 'Mėgsta kapinyno mechanikas ir recursion.', deckName: 'Negyvėlių roj' },
  { slug: 'tauntpolice', name: 'TauntPolice', avatar: '🚧', factionSlug: 'sviesos-pulkas', faction: 'Šviesos pulkas',
    strategyType: 'defensive', aggression: 'low', controlPreference: 'high', tradePreference: 'high', riskTolerance: 'low',
    rankStep: R(26, 'bronze'), difficultyModifier: 'normal', personality: 'Blokuoja viską, verčia tradinti.', deckName: 'Taunt siena' },
  { slug: 'laggywizard', name: 'LaggyWizard', avatar: '🧙', factionSlug: 'mistikos-melodija', faction: 'Mistikos melodija',
    strategyType: 'control', aggression: 'high', controlPreference: 'medium', tradePreference: 'medium', riskTolerance: 'medium',
    rankStep: R(21, 'silver'), difficultyModifier: 'normal', personality: 'Magas su sprogstamais ėjimais.', deckName: 'Sprogstanti magija' },
  { slug: 'pactenjoyer', name: 'PactEnjoyer', avatar: '😈', factionSlug: 'demonu-orda', faction: 'Demonų orda',
    strategyType: 'curse', aggression: 'medium', controlPreference: 'high', tradePreference: 'medium', riskTolerance: 'medium',
    rankStep: R(17, 'bronze'), difficultyModifier: 'hard', personality: 'Mėgsta dark pact / curse, sunku žaisti prieš.', deckName: 'Prakeiksmų krūva' },
  { slug: 'faceisplace', name: 'FaceIsPlace', avatar: '💥', factionSlug: 'vryhioko-gauja', faction: 'Goblinų Gauja',
    strategyType: 'aggro', aggression: 'very_high', controlPreference: 'very_low', tradePreference: 'very_low', riskTolerance: 'very_high',
    rankStep: R(33, 'silver'), difficultyModifier: 'normal', personality: 'Klasikinis aggro, ignoruoja lentą.', deckName: 'Tik į veidą' },
  { slug: 'critkestas', name: 'CritKestas', avatar: '🎯', factionSlug: 'rytu-vejas', faction: 'Rytų vėjas',
    strategyType: 'stealth', aggression: 'medium', controlPreference: 'medium', tradePreference: 'low', riskTolerance: 'low',
    rankStep: R(14, 'gold'), difficultyModifier: 'hard', personality: 'Burst žaidėjas, vienas švarus kill.', deckName: 'Apskaičiuotas smūgis' },
  { slug: 'buffdaddylt', name: 'BuffDaddyLT', avatar: '💪', factionSlug: 'inkvizicijos-legionas', faction: 'Inkvizicijos legionas',
    strategyType: 'defensive', aggression: 'low', controlPreference: 'high', tradePreference: 'high', riskTolerance: 'low',
    rankStep: R(23, 'gold'), difficultyModifier: 'normal', personality: 'Mėgsta buff stacking ir apsaugotus padarus.', deckName: 'Metodiškas sustain' },
  { slug: 'deckgoblin', name: 'DeckGoblin', avatar: '🎒', factionSlug: 'plesiku-naktis', faction: 'Plėšikų naktis',
    strategyType: 'midrange', aggression: 'medium', controlPreference: 'medium', tradePreference: 'medium', riskTolerance: 'medium',
    rankStep: R(27, 'silver'), difficultyModifier: 'normal', personality: 'Praktiškas laiptų žaidėjas, prisitaiko.', deckName: 'Adaptyvus midrange' },
  { slug: 'whispermain', name: 'WhisperMain', avatar: '🌑', factionSlug: 'demonu-orda', faction: 'Demonų orda',
    strategyType: 'curse', aggression: 'medium', controlPreference: 'high', tradePreference: 'medium', riskTolerance: 'medium',
    rankStep: R(16, 'silver'), difficultyModifier: 'hard', personality: 'Debuff/control main.', deckName: 'Šnabždesių kontrolė' },
  { slug: 'afk-baron', name: 'AFK_Baron', avatar: '🪑', factionSlug: null, faction: 'Universalus',
    strategyType: 'midrange', aggression: 'medium', controlPreference: 'low', tradePreference: 'medium', riskTolerance: 'low',
    rankStep: R(40, 'bronze'), difficultyModifier: 'easy', personality: 'Casual žaidėjas, paprastas bet ne beviltiškas.', deckName: 'Paprasta kreivė' },
  { slug: 'rankgremlin', name: 'RankGremlin', avatar: '👹', factionSlug: null, faction: 'Mišri kaladė',
    strategyType: 'control', aggression: 'high', controlPreference: 'high', tradePreference: 'high', riskTolerance: 'low',
    rankStep: R(5, 'gold'), difficultyModifier: 'hard', personality: 'Sweaty ranked grinder — stipriausias botas laiptuose.', deckName: 'Aukšto rango bosas' },
]

export const RANKED_BOT_BY_SLUG = new Map(RANKED_BOTS.map((b) => [b.slug, b]))

/** engine AI sunkumas pagal boto modifikatorių. */
export function botDifficulty(b: RankedBot): 'easy' | 'normal' | 'hard' {
  return b.difficultyModifier
}
