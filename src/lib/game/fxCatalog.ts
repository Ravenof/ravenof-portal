// ── FX katalogas (be DOM kodo – saugu importuoti serveryje ir tipuose) ───────
// Skrydžiai, smūgiai ir iškvietimo choreografijos, kurias groja fxStage.ts.
// Peržiūra ir derinimas: /dev/fx (arba ravenof-fx-preview-v3.html).

export type FxProjId =
  | 'fireball' | 'ice' | 'lightning' | 'poison' | 'shadow' | 'holy' | 'arrow'
  | 'healWisp' | 'goldMotes' | 'orb'

export type FxImpactId =
  | 'fireBurst' | 'iceShatter' | 'freeze' | 'shock' | 'poisonSplash' | 'shadowImplode'
  | 'seal' | 'holyFlare' | 'arrowHit' | 'bloom' | 'surge' | 'dome' | 'orbHit'

export type SummonFxId =
  | 'meteor' | 'frostNova' | 'heroLanding' | 'hellRise' | 'thunder' | 'shadowStep'
  | 'holyDescent' | 'graveBurst' | 'portal' | 'tornado' | 'vines' | 'bloodRitual'
  | 'clockwork' | 'mirror' | 'sandWipe' | 'tidal' | 'dragonBreath' | 'starfall'
  | 'voidRift' | 'swordRing' | 'ambush' | 'bomb' | 'warDrums' | 'chains' | 'thread'
  | 'scroll' | 'phoenix' | 'eclipse' | 'swamp' | 'bats'

export const FX_PROJECTILES: { value: FxProjId; label: string }[] = [
  { value: 'fireball', label: 'Ugnies kamuolys' }, { value: 'ice', label: 'Ledo šukė' },
  { value: 'lightning', label: 'Žaibas' }, { value: 'poison', label: 'Nuodų gniužulas' },
  { value: 'shadow', label: 'Šešėlio strėlė' }, { value: 'holy', label: 'Šventas spindulys' },
  { value: 'arrow', label: 'Strėlė' }, { value: 'healWisp', label: 'Gydymo srovė' },
  { value: 'goldMotes', label: 'Galios kibirkštys' }, { value: 'orb', label: 'Frakcijos rutulys' },
]

export const FX_IMPACTS: { value: FxImpactId; label: string }[] = [
  { value: 'fireBurst', label: 'Ugnies sprogimas' }, { value: 'iceShatter', label: 'Ledo skilimas' },
  { value: 'freeze', label: 'Įšalimas (ledo luitas)' }, { value: 'shock', label: 'Elektros iškrova' },
  { value: 'poisonSplash', label: 'Nuodų tėkšlys' }, { value: 'shadowImplode', label: 'Šešėlio susitraukimas' },
  { value: 'seal', label: 'Nutildymo antspaudas' }, { value: 'holyFlare', label: 'Šviesos žybsnis' },
  { value: 'arrowHit', label: 'Strėlės dūris' }, { value: 'bloom', label: 'Gydymo žiedas' },
  { value: 'surge', label: 'Galios antplūdis' }, { value: 'dome', label: 'Skydo kupolas' },
  { value: 'orbHit', label: 'Rutulio smūgis' },
]

/** `landMs` – kada korta „nusileidžia" (nuo starto). Po jo prasideda kortos efektai (Kovos šūksnis). */
export const SUMMON_FX: { value: SummonFxId; label: string; group: string; landMs: number }[] = [
  { value: 'meteor', label: 'Meteoro smūgis', group: 'ugnis', landMs: 520 },
  { value: 'dragonBreath', label: 'Drakono kvapas', group: 'ugnis', landMs: 840 },
  { value: 'phoenix', label: 'Fenikso atgimimas', group: 'ugnis', landMs: 1440 },
  { value: 'hellRise', label: 'Iš pragaro gelmių', group: 'pragaras', landMs: 1470 },
  { value: 'bloodRitual', label: 'Kraujo ritualas', group: 'kraujas', landMs: 1480 },
  { value: 'frostNova', label: 'Ledo nova', group: 'ledas', landMs: 520 },
  { value: 'tidal', label: 'Potvynio banga', group: 'vanduo', landMs: 930 },
  { value: 'thunder', label: 'Žaibo smūgis', group: 'žaibas', landMs: 470 },
  { value: 'tornado', label: 'Viesulas', group: 'vėjas', landMs: 1200 },
  { value: 'sandWipe', label: 'Smėlio audra', group: 'smėlis', landMs: 1150 },
  { value: 'heroLanding', label: 'Herojaus nusileidimas', group: 'jėga', landMs: 380 },
  { value: 'warDrums', label: 'Karo būgnai', group: 'karas', landMs: 990 },
  { value: 'swordRing', label: 'Kalavijų ratas', group: 'plienas', landMs: 930 },
  { value: 'chains', label: 'Grandinių nutraukimas', group: 'geležis', landMs: 1250 },
  { value: 'holyDescent', label: 'Šviesos nužengimas', group: 'šviesa', landMs: 1080 },
  { value: 'eclipse', label: 'Užtemimas', group: 'dangus', landMs: 1560 },
  { value: 'starfall', label: 'Žvaigždynas', group: 'žvaigždės', landMs: 1260 },
  { value: 'portal', label: 'Arkaninis portalas', group: 'arkana', landMs: 1120 },
  { value: 'scroll', label: 'Ritinio išvyniojimas', group: 'raštai', landMs: 980 },
  { value: 'mirror', label: 'Veidrodžio šukės', group: 'stiklas', landMs: 450 },
  { value: 'voidRift', label: 'Tuštumos plyšys', group: 'tuštuma', landMs: 1000 },
  { value: 'shadowStep', label: 'Šešėlių žingsnis', group: 'šešėliai', landMs: 800 },
  { value: 'ambush', label: 'Pasala', group: 'šešėliai', landMs: 270 },
  { value: 'bats', label: 'Šikšnosparnių spiečius', group: 'naktis', landMs: 900 },
  { value: 'graveBurst', label: 'Iš kapo', group: 'mirtis', landMs: 520 },
  { value: 'swamp', label: 'Pelkės burbulai', group: 'nuodai', landMs: 1380 },
  { value: 'vines', label: 'Šaknų pynė', group: 'gamta', landMs: 1180 },
  { value: 'clockwork', label: 'Mechaninis surinkimas', group: 'mechanika', landMs: 1000 },
  { value: 'bomb', label: 'Parako statinė', group: 'goblinai', landMs: 1000 },
  { value: 'thread', label: 'Voro siūlas', group: 'vorai', landMs: 1030 },
]

const LAND = new Map(SUMMON_FX.map((s) => [s.value, s.landMs]))
export function summonLandMs(id: SummonFxId | null | undefined): number { return id ? LAND.get(id) ?? 0 : 0 }
export function isSummonFxId(v: unknown): v is SummonFxId { return typeof v === 'string' && LAND.has(v as SummonFxId) }
export function isFxImpactId(v: unknown): v is FxImpactId { return typeof v === 'string' && FX_IMPACTS.some((x) => x.value === v) }

/** Senų (v2, SummonBurst) efektų atitikmenys – kortos su senu `summonEffect` automatiškai gauna v3 choreografiją. */
export const LEGACY_SUMMON_MAP: Record<string, SummonFxId> = {
  eclipse: 'eclipse', necroticSmoke: 'shadowStep', lightning: 'thunder', massFreeze: 'frostNova',
  fire: 'dragonBreath', explosion: 'bomb', poisonCloud: 'swamp', earthquake: 'heroLanding',
  shadowSurge: 'shadowStep', hellfire: 'hellRise', frostNova: 'frostNova', bloodRitual: 'bloodRitual',
  soulRelease: 'graveBurst', voidRip: 'voidRift', plague: 'swamp', arcaneDeto: 'portal',
  emberStorm: 'phoenix', boneEruption: 'graveBurst', cursedBrand: 'chains', spectralWail: 'bats',
  moltenShatter: 'meteor', deathPulse: 'graveBurst',
}

/** Numatytoji choreografija pagal frakciją – naudojama TIK Legendinėms kortoms ir čempionams be savo nustatymo. */
export function factionSummonFx(factionName?: string | null): SummonFxId {
  const n = factionName ?? ''
  if (/mirt|mar[šs]/i.test(n)) return 'graveBurst'
  if (/mistik|melodij/i.test(n)) return 'portal'
  if (/inkviz|legion/i.test(n)) return 'holyDescent'
  if (/[šs]vies|pulk/i.test(n)) return 'swordRing'
  if (/demon|orda/i.test(n)) return 'hellRise'
  if (/goblin|gauj/i.test(n)) return 'bomb'
  if (/pl[ėe][šs]ik|nakt/i.test(n)) return 'ambush'
  if (/ryt|v[ėe]j/i.test(n)) return 'tornado'
  return 'heroLanding'
}

/** Esamas `ProjectileType` (admin) → fxStage skrydis + numatytasis smūgis. */
export const PROJECTILE_TO_FX: Record<string, { proj: FxProjId; impact: FxImpactId }> = {
  fireball: { proj: 'fireball', impact: 'fireBurst' }, darkCurse: { proj: 'shadow', impact: 'shadowImplode' },
  healingGlow: { proj: 'healWisp', impact: 'bloom' }, freezeBurst: { proj: 'ice', impact: 'iceShatter' },
  stunBurst: { proj: 'lightning', impact: 'shock' }, destroyStrike: { proj: 'shadow', impact: 'shadowImplode' },
  arrow: { proj: 'arrow', impact: 'arrowHit' }, lightning: { proj: 'lightning', impact: 'shock' },
  poisonGlob: { proj: 'poison', impact: 'poisonSplash' },
}

/** Statuso uždėjimas → skrydis iš šaltinio + trumpas smūgis (nuolatinį vaizdą piešia CardStatusVfxLayer). */
export const STATUS_TO_FX: Record<string, { proj: FxProjId; impact: FxImpactId }> = {
  frozen: { proj: 'ice', impact: 'freeze' }, stunned: { proj: 'lightning', impact: 'shock' },
  burning: { proj: 'fireball', impact: 'fireBurst' }, poisoned: { proj: 'poison', impact: 'poisonSplash' },
  silenced: { proj: 'shadow', impact: 'seal' }, blessed: { proj: 'holy', impact: 'holyFlare' },
  shield: { proj: 'holy', impact: 'dome' }, taunt: { proj: 'goldMotes', impact: 'surge' },
  sprint: { proj: 'goldMotes', impact: 'surge' }, stealth: { proj: 'shadow', impact: 'shadowImplode' },
  cantAttack: { proj: 'shadow', impact: 'seal' }, immortal: { proj: 'holy', impact: 'holyFlare' },
}

// ── Čempionų gebėjimų FX (fxStage SKILLS) ────────────────────────────────────
// Kiekvienas gebėjimas = užtaisymo spektaklis ant čempiono + savas „smūgis" kiekvienam
// taikiniui (keičia įprastą skrydį). Gebėjimas tarp fazių tas pats – keičiasi tik skaičiai.
export type SkillFxId =
  | 'prazar1' | 'prazar2' | 'prazar3' | 'gald1' | 'gald2' | 'gald3' | 'zert1' | 'zert2' | 'zert3'
  | 'lisa1' | 'lisa2' | 'lisa3' | 'juod1' | 'juod2' | 'juod3' | 'golem1' | 'golem2' | 'golem3'
  | 'skrag1' | 'skrag2' | 'skrag3'

/** `castMs` – po kiek ms nuo starto gali prasidėti gebėjimo efektai (smūgiai į taikinius). */
export const SKILL_FX: { value: SkillFxId; label: string; champion: string; castMs: number }[] = [
  { value: 'prazar1', label: 'Maro prakeiksmas', champion: 'Prazaras', castMs: 700 },
  { value: 'prazar2', label: 'Prikėlimas', champion: 'Prazaras', castMs: 800 },
  { value: 'prazar3', label: 'Zombių kariauna', champion: 'Prazaras', castMs: 1000 },
  { value: 'gald1', label: 'Nefilimo teismas', champion: 'Galdrianas', castMs: 700 },
  { value: 'gald2', label: 'Šventas skydas', champion: 'Galdrianas', castMs: 650 },
  { value: 'gald3', label: 'Dangaus malonė', champion: 'Galdrianas', castMs: 1000 },
  { value: 'zert1', label: 'Prakeiksmų paktas', champion: "Zertahul'as", castMs: 800 },
  { value: 'zert2', label: 'Impų šauksmas', champion: "Zertahul'as", castMs: 700 },
  { value: 'zert3', label: 'Sielų deginimas', champion: "Zertahul'as", castMs: 950 },
  { value: 'lisa1', label: 'Tuštumos ietis', champion: 'Lisarijus', castMs: 750 },
  { value: 'lisa2', label: 'Arkaninė apsauga', champion: 'Lisarijus', castMs: 650 },
  { value: 'lisa3', label: 'Ledo audra', champion: 'Lisarijus', castMs: 1000 },
  { value: 'juod1', label: 'Duoklė', champion: 'Juodasmakris', castMs: 850 },
  { value: 'juod2', label: 'Pirmyn!', champion: 'Juodasmakris', castMs: 650 },
  { value: 'juod3', label: 'Patrankų salvė', champion: 'Juodasmakris', castMs: 700 },
  { value: 'golem1', label: 'Žemės drebėjimas', champion: 'Dorianos golemas', castMs: 620 },
  { value: 'golem2', label: 'Akmens tvirtovė', champion: 'Dorianos golemas', castMs: 800 },
  { value: 'golem3', label: 'Sutriuškinimas', champion: 'Dorianos golemas', castMs: 900 },
  { value: 'skrag1', label: 'Liepsnosvaidis', champion: "Skrag'as", castMs: 700 },
  { value: 'skrag2', label: 'Parakas visiems', champion: "Skrag'as", castMs: 650 },
  { value: 'skrag3', label: 'Bombų lietus', champion: "Skrag'as", castMs: 900 },
]
const SKILL_CAST = new Map(SKILL_FX.map((s) => [s.value, s.castMs]))
export function isSkillFxId(v: unknown): v is SkillFxId { return typeof v === 'string' && SKILL_CAST.has(v as SkillFxId) }
export function skillCastMs(id: SkillFxId | null | undefined): number { return id ? SKILL_CAST.get(id) ?? 0 : 0 }

const CHAMP_KEYS: [RegExp, string][] = [
  [/prazar/i, 'prazar'], [/galdrian/i, 'gald'], [/zertahul/i, 'zert'], [/lisarij/i, 'lisa'],
  [/juodasmakr/i, 'juod'], [/golem/i, 'golem'], [/skrag/i, 'skrag'],
]
/** Čempiono raktas FX sistemai (gebėjimai, fazės keitimo virsmas). Nežinomam – null. */
export function championKey(championName: string | null | undefined): string | null {
  if (!championName) return null
  for (const [re, key] of CHAMP_KEYS) if (re.test(championName)) return key
  return null
}
export const CHAMPION_FX_KEYS = CHAMP_KEYS.map(([, k]) => k)

/** Numatytasis gebėjimo FX pagal čempiono vardą ir gebėjimo numerį (0..2). Nežinomam čempionui – null (įprasti efektai). */
export function defaultSkillFx(championName: string | null | undefined, skillIndex: number): SkillFxId | null {
  if (!championName || skillIndex < 0 || skillIndex > 2) return null
  for (const [re, key] of CHAMP_KEYS) if (re.test(championName)) { const id = `${key}${skillIndex + 1}`; return isSkillFxId(id) ? id : null }
  return null
}
