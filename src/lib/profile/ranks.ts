// ⚠️ GENERUOTAS FAILAS — nekeisk ranka.
// Šaltinis: asffa/asset-maps/ranked-manifest.csv · generatorius: scripts/gen-handoff-registries.mjs
// Rangų progresija: 50 Bronze → 50 Silver → 50 Gold → 49 Bronze → … → 1 Gold.

export type RankTier = 'bronze' | 'silver' | 'gold'
export const RANK_TIERS: RankTier[] = ['bronze', 'silver', 'gold']

export type RankDef = {
  /** Progresijos eilė nuo įėjimo (1 = 50-as rangas, 50 = 1-as rangas). */
  order: number
  /** Rango numeris: 50 = įėjimas, 1 = aukščiausias. */
  rank: number
  nameLt: string
  badgeFile: string
}

export const RANKS: RankDef[] = [
  { order: 1, rank: 50, nameLt: 'Atvykėlis', badgeFile: 'rank-50-atvykelis.webp' },
  { order: 2, rank: 49, nameLt: 'Pelenų klajūnas', badgeFile: 'rank-49-pelenu-klajunas.webp' },
  { order: 3, rank: 48, nameLt: 'Priesaikos davėjas', badgeFile: 'rank-48-priesaikos-davejas.webp' },
  { order: 4, rank: 47, nameLt: 'Karo mokinys', badgeFile: 'rank-47-karo-mokinys.webp' },
  { order: 5, rank: 46, nameLt: 'Skydo nešėjas', badgeFile: 'rank-46-skydo-nesejas.webp' },
  { order: 6, rank: 45, nameLt: 'Ašmenų mokinys', badgeFile: 'rank-45-asmenu-mokinys.webp' },
  { order: 7, rank: 44, nameLt: 'Pirmojo kraujo karys', badgeFile: 'rank-44-pirmojo-kraujo-karys.webp' },
  { order: 8, rank: 43, nameLt: 'Išbandytasis', badgeFile: 'rank-43-isbandytasis.webp' },
  { order: 9, rank: 42, nameLt: 'Arenos kovotojas', badgeFile: 'rank-42-arenos-kovotojas.webp' },
  { order: 10, rank: 41, nameLt: 'Geležies kumštis', badgeFile: 'rank-41-gelezies-kumstis.webp' },
  { order: 11, rank: 40, nameLt: 'Nakties sargas', badgeFile: 'rank-40-nakties-sargas.webp' },
  { order: 12, rank: 39, nameLt: 'Kautynių žinovas', badgeFile: 'rank-39-kautyniu-zinovas.webp' },
  { order: 13, rank: 38, nameLt: 'Mūšio karys', badgeFile: 'rank-38-musio-karys.webp' },
  { order: 14, rank: 37, nameLt: 'Vėliavos gynėjas', badgeFile: 'rank-37-veliavos-gynejas.webp' },
  { order: 15, rank: 36, nameLt: 'Plieno karys', badgeFile: 'rank-36-plieno-karys.webp' },
  { order: 16, rank: 35, nameLt: 'Kraujo užgrūdintas', badgeFile: 'rank-35-kraujo-uzgrudintas.webp' },
  { order: 17, rank: 34, nameLt: 'Arenos veteranas', badgeFile: 'rank-34-arenos-veteranas.webp' },
  { order: 18, rank: 33, nameLt: 'Mūšio sargas', badgeFile: 'rank-33-musio-sargas.webp' },
  { order: 19, rank: 32, nameLt: 'Priesaikos riteris', badgeFile: 'rank-32-priesaikos-riteris.webp' },
  { order: 20, rank: 31, nameLt: 'Geležinis riteris', badgeFile: 'rank-31-gelezinis-riteris.webp' },
  { order: 21, rank: 30, nameLt: 'Kardų žinovas', badgeFile: 'rank-30-kardu-zinovas.webp' },
  { order: 22, rank: 29, nameLt: 'Skydo žinovas', badgeFile: 'rank-29-skydo-zinovas.webp' },
  { order: 23, rank: 28, nameLt: 'Kovų medžiotojas', badgeFile: 'rank-28-kovu-medziotojas.webp' },
  { order: 24, rank: 27, nameLt: 'Lauko taktikas', badgeFile: 'rank-27-lauko-taktikas.webp' },
  { order: 25, rank: 26, nameLt: 'Karo taktikas', badgeFile: 'rank-26-karo-taktikas.webp' },
  { order: 26, rank: 25, nameLt: 'Pergalių kalvis', badgeFile: 'rank-25-pergaliu-kalvis.webp' },
  { order: 27, rank: 24, nameLt: 'Vėliavnešys', badgeFile: 'rank-24-veliavanesys.webp' },
  { order: 28, rank: 23, nameLt: 'Būrio vadas', badgeFile: 'rank-23-burio-vadas.webp' },
  { order: 29, rank: 22, nameLt: 'Arenos kapitonas', badgeFile: 'rank-22-arenos-kapitonas.webp' },
  { order: 30, rank: 21, nameLt: 'Karo kapitonas', badgeFile: 'rank-21-karo-kapitonas.webp' },
  { order: 31, rank: 20, nameLt: 'Mūšio meistras', badgeFile: 'rank-20-musio-meistras.webp' },
  { order: 32, rank: 19, nameLt: 'Plieno meistras', badgeFile: 'rank-19-plieno-meistras.webp' },
  { order: 33, rank: 18, nameLt: 'Arenos maršalas', badgeFile: 'rank-18-arenos-marsalas.webp' },
  { order: 34, rank: 17, nameLt: 'Kovų valdovas', badgeFile: 'rank-17-kovu-valdovas.webp' },
  { order: 35, rank: 16, nameLt: 'Ravenoro riteris', badgeFile: 'rank-16-ravenoro-riteris.webp' },
  { order: 36, rank: 15, nameLt: 'Ravenoro taktikas', badgeFile: 'rank-15-ravenoro-taktikas.webp' },
  { order: 37, rank: 14, nameLt: 'Ravenoro strategas', badgeFile: 'rank-14-ravenoro-strategas.webp' },
  { order: 38, rank: 13, nameLt: 'Vėliavų vadas', badgeFile: 'rank-13-veliavu-vadas.webp' },
  { order: 39, rank: 12, nameLt: 'Arenos vadas', badgeFile: 'rank-12-arenos-vadas.webp' },
  { order: 40, rank: 11, nameLt: 'Karo vadas', badgeFile: 'rank-11-karo-vadas.webp' },
  { order: 41, rank: 10, nameLt: 'Didysis taktikas', badgeFile: 'rank-10-didysis-taktikas.webp' },
  { order: 42, rank: 9, nameLt: 'Didysis strategas', badgeFile: 'rank-09-didysis-strategas.webp' },
  { order: 43, rank: 8, nameLt: 'Arenos meistras', badgeFile: 'rank-08-arenos-meistras.webp' },
  { order: 44, rank: 7, nameLt: 'Karo meistras', badgeFile: 'rank-07-karo-meistras.webp' },
  { order: 45, rank: 6, nameLt: 'Ravenoro maršalas', badgeFile: 'rank-06-ravenoro-marsalas.webp' },
  { order: 46, rank: 5, nameLt: 'Legendų varžovas', badgeFile: 'rank-05-legendu-varzovas.webp' },
  { order: 47, rank: 4, nameLt: 'Čempionų siaubas', badgeFile: 'rank-04-cempionu-siaubas.webp' },
  { order: 48, rank: 3, nameLt: 'Ravenoro čempionas', badgeFile: 'rank-03-ravenoro-cempionas.webp' },
  { order: 49, rank: 2, nameLt: 'Vainikuotasis', badgeFile: 'rank-02-vainikuotasis.webp' },
  { order: 50, rank: 1, nameLt: 'Ravenoro legenda', badgeFile: 'rank-01-ravenoro-legenda.webp' },
]

const BY_RANK = new Map<number, RankDef>(RANKS.map((r) => [r.rank, r]))
export const rankDef = (rankNumber: number): RankDef | null => BY_RANK.get(rankNumber) ?? null

/** Rango ženklo iliustracija (apatinis sluoksnis). */
export const rankBadgeSrc = (rankNumber: number): string | null => {
  const d = BY_RANK.get(rankNumber)
  return d ? `/ravenof-ui/ranks/badges/${d.badgeFile}` : null
}
/** Pakopos rėmas (VIRŠUTINIS sluoksnis; bendras visiems rangams). */
export const rankFrameSrc = (tier: RankTier): string => `/ravenof-ui/ranks/frames/${tier}-frame.webp`

/** Bendras žingsnis 1..150 (1 = 50 Bronze, 150 = 1 Gold) – palyginimams/progresui. */
export function rankStepIndex(rankNumber: number, tier: RankTier): number {
  const d = BY_RANK.get(rankNumber)
  if (!d) return 0
  return (d.order - 1) * 3 + RANK_TIERS.indexOf(tier) + 1
}
/** Kitas rangas progresijoje (Bronze → Silver → Gold → aukštesnis rangas). */
export function nextRankStep(rankNumber: number, tier: RankTier): { rank: number; tier: RankTier } | null {
  const ti = RANK_TIERS.indexOf(tier)
  if (ti < 2) return { rank: rankNumber, tier: RANK_TIERS[ti + 1] }
  const d = BY_RANK.get(rankNumber)
  if (!d || d.order >= RANKS.length) return null
  return { rank: RANKS[d.order].rank, tier: 'bronze' }
}
/** Profilio etiketė: „50 RANGAS · Atvykėlis". */
export const rankLabel = (rankNumber: number): string => {
  const d = BY_RANK.get(rankNumber)
  return d ? `${d.rank} RANGAS · ${d.nameLt}` : `${rankNumber} RANGAS`
}
