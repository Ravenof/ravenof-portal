// ── Virtualaus žaidimo gameplay konfigūracijos modelis ────────────────────────
// Šiuos tipus naudoja: admin mapping editorius, effect engine, target resolver,
// trigger system, field/curse/zmk engine. Saugoma cards.gameplay JSONB stulpelyje.

// ── Taikinių tipai ────────────────────────────────────────────────────────────
export type TargetType =
  | 'self'              // be taikinio / pats šaltinis / globalu
  | 'selfUnit'          // pati ši korta kovos lauke (šaltinio padaras)
  | 'ownPlayer'
  | 'enemyPlayer'
  | 'anyPlayer'
  | 'ownUnit'
  | 'enemyUnit'
  | 'anyUnit'
  | 'ownChampion'
  | 'enemyChampion'
  | 'anyChampion'
  | 'ownArtifact'
  | 'enemyArtifact'
  | 'anyArtifact'
  | 'activeField'
  | 'allOwnUnits'
  | 'allEnemyUnits'
  | 'allUnits'
  | 'allEnemyTargets'   // priešo padarai + artefaktai + žaidėjas
  | 'allOwnTargets'

export const TARGET_TYPES: { value: TargetType; label: string }[] = [
  { value: 'self',            label: 'Be taikinio / globalu' },
  { value: 'selfUnit',        label: 'Ši korta (savęs padaras)' },
  { value: 'ownPlayer',       label: 'Tavo žaidėjas' },
  { value: 'enemyPlayer',     label: 'Priešo žaidėjas' },
  { value: 'anyPlayer',       label: 'Bet kuris žaidėjas' },
  { value: 'ownUnit',         label: 'Tavo padaras' },
  { value: 'enemyUnit',       label: 'Priešo padaras' },
  { value: 'anyUnit',         label: 'Bet kuris padaras' },
  { value: 'ownChampion',     label: 'Tavo Čempionas' },
  { value: 'enemyChampion',   label: 'Priešo Čempionas' },
  { value: 'anyChampion',     label: 'Bet kuris Čempionas' },
  { value: 'ownArtifact',     label: 'Tavo artefaktas' },
  { value: 'enemyArtifact',   label: 'Priešo artefaktas' },
  { value: 'anyArtifact',     label: 'Bet kuris artefaktas' },
  { value: 'activeField',     label: 'Aktyvi lauko korta' },
  { value: 'allOwnUnits',     label: 'Visi tavo padarai' },
  { value: 'allEnemyUnits',   label: 'Visi priešo padarai' },
  { value: 'allUnits',        label: 'Visi padarai' },
  { value: 'allEnemyTargets', label: 'Visi priešo taikiniai' },
  { value: 'allOwnTargets',   label: 'Visi tavo taikiniai' },
]

// ── Efektų tipai ──────────────────────────────────────────────────────────────
export type EffectType =
  | 'damage' | 'heal' | 'destroy'
  | 'silence' | 'freeze' | 'stun' | 'poison' | 'burn'
  | 'taunt' | 'stealth' | 'shield'
  | 'buffAttack' | 'buffHealth' | 'debuffAttack' | 'debuffHealth'
  | 'drawCards' | 'discard'
  | 'summonFromHand' | 'summonFromDeck' | 'summonFromGraveyard'
  | 'returnToHand' | 'moveToGraveyard' | 'revive'
  | 'gainGold' | 'loseGold'
  | 'triggerCurse' | 'triggerZmk' | 'removeZmkCard' | 'mill' | 'returnGraveyardToDeck' | 'peekDiscard' | 'revealOwnDeck' | 'revealEnemyDeck' | 'selfToEnemyHand' | 'selfToOwnHand' | 'summonAdvanced'
  | 'spellDiscount' | 'buffSpellDamage'
  | 'chooseEffect' | 'tutorToHand'

export const EFFECT_TYPES: { value: EffectType; label: string; needsValue: boolean }[] = [
  { value: 'damage',              label: 'Žala',                       needsValue: true },
  { value: 'heal',                label: 'Gydymas',                    needsValue: true },
  { value: 'destroy',             label: 'Sunaikinti',                 needsValue: false },
  { value: 'silence',             label: 'Nutildyti',                  needsValue: false },
  { value: 'freeze',              label: 'Sušaldyti',                  needsValue: false },
  { value: 'stun',                label: 'Apsvaiginti',                needsValue: false },
  { value: 'poison',              label: 'Apnuodyti',                  needsValue: false },
  { value: 'burn',                label: 'Padegti',                    needsValue: false },
  { value: 'taunt',               label: 'Suteikti Pasišaipymą',       needsValue: false },
  { value: 'stealth',             label: 'Suteikti Sėlinimą',          needsValue: false },
  { value: 'shield',              label: 'Suteikti Magiškąjį skydą',   needsValue: false },
  { value: 'buffAttack',          label: '+ATK',                       needsValue: true },
  { value: 'buffHealth',          label: '+HP',                        needsValue: true },
  { value: 'debuffAttack',        label: '−ATK',                       needsValue: true },
  { value: 'debuffHealth',        label: '−HP',                        needsValue: true },
  { value: 'drawCards',           label: 'Traukti kortas',             needsValue: true },
  { value: 'discard',             label: 'Išmesti kortas',             needsValue: true },
  { value: 'summonFromHand',      label: 'Iškviesti iš rankos',        needsValue: false },
  { value: 'summonFromDeck',      label: 'Iškviesti iš kaladės',       needsValue: false },
  { value: 'summonFromGraveyard', label: 'Iškviesti iš kapinyno',        needsValue: false },
  { value: 'returnToHand',        label: 'Grąžinti į ranką',           needsValue: false },
  { value: 'moveToGraveyard',     label: 'Į kapinyną',          needsValue: false },
  { value: 'revive',              label: 'Prikelti',                   needsValue: false },
  { value: 'gainGold',            label: 'Gauti aukso',                needsValue: true },
  { value: 'loseGold',            label: 'Prarasti aukso',             needsValue: true },
  { value: 'triggerCurse',        label: 'Aktyvuoti prakeiksmą',       needsValue: true },
  { value: 'triggerZmk',          label: 'Traukti ŽMK',                needsValue: false },
  { value: 'removeZmkCard',       label: 'Pašalinti ŽMK kortą iš kaladės', needsValue: true },
  { value: 'mill',                label: 'Mill (kortos iš kaladės į kapinyną)', needsValue: true },
  { value: 'returnGraveyardToDeck', label: 'Grąžinti iš kapinyno į kaladę', needsValue: true },
  { value: 'peekDiscard',         label: 'Peržiūrėk N → pasirink K išmesti', needsValue: true },
  { value: 'revealOwnDeck',       label: 'Parodyk N savo kaladės viršaus', needsValue: true },
  { value: 'revealEnemyDeck',     label: 'Pažiūrėk N priešo kaladės viršaus', needsValue: true },
  { value: 'selfToEnemyHand',     label: 'Ši korta → priešo ranka (Paskutinis noras)', needsValue: false },
  { value: 'selfToOwnHand',       label: 'Ši korta → tavo ranka (Paskutinis noras)', needsValue: false },
  { value: 'summonAdvanced',      label: 'Iškviesti padarą (zonos+kaina+potipis)', needsValue: false },
  { value: 'spellDiscount',       label: 'Kito burto nuolaida (auksas)',    needsValue: true },
  { value: 'buffSpellDamage',     label: 'Burtų žala +X (savininkui)',      needsValue: true },
  { value: 'chooseEffect',        label: 'Pasirink 1 iš kelių efektų (pop-up)', needsValue: false },
  { value: 'tutorToHand',         label: 'Į ranką: burtas/korta pagal tipą (deck/kapinynas)', needsValue: false },
]

// ── Burtų tipai (ugnies/ledo/žaibo/funkcinis/nekromantijos/sustiprinimo/susilpninimo) ─
export type SpellType =
  | 'fire' | 'ice' | 'lightning' | 'functional' | 'necromancy' | 'buff' | 'debuff'

export const SPELL_TYPES: { value: SpellType; label: string; icon: string }[] = [
  { value: 'fire',       label: 'Ugnies',        icon: '🔥' },
  { value: 'ice',        label: 'Ledo',          icon: '❄' },
  { value: 'lightning',  label: 'Žaibo',         icon: '⚡' },
  { value: 'functional', label: 'Funkcinis',     icon: '⚙' },
  { value: 'necromancy', label: 'Nekromantijos', icon: '☠' },
  { value: 'buff',       label: 'Sustiprinimo',  icon: '⬆' },
  { value: 'debuff',     label: 'Susilpninimo',  icon: '⬇' },
]

// ── Trigger tipai ─────────────────────────────────────────────────────────────
export type TriggerType =
  | 'onPlay' | 'onSummon' | 'onCast'
  | 'onAttack' | 'onAttacked'
  | 'onDamageDealt' | 'onDamageReceived'
  | 'onHeal' | 'onDeath' | 'onDestroy'
  | 'onDraw' | 'onDiscard'
  | 'onTurnStart' | 'onTurnEnd'
  | 'onFieldEnter' | 'onFieldLeave'
  | 'onChampionSkill' | 'onArtifactActivated'
  | 'onAnyDeath' | 'onAnyAttack' | 'onAnySummon' | 'onAnyPlay'
  | 'custom'

export const TRIGGER_TYPES: { value: TriggerType; label: string }[] = [
  { value: 'onPlay',              label: 'Sužaidus kortą' },
  { value: 'onSummon',            label: 'Iškvietus (Kovos šūksnis)' },
  { value: 'onCast',              label: 'Panaudojus burtą' },
  { value: 'onAttack',            label: 'Atakuojant' },
  { value: 'onAttacked',          label: 'Kai puolamas' },
  { value: 'onDamageDealt',       label: 'Padarius žalą' },
  { value: 'onDamageReceived',    label: 'Gavus žalą' },
  { value: 'onHeal',              label: 'Pagydžius' },
  { value: 'onDeath',             label: 'Žūstant (Paskutinis noras)' },
  { value: 'onDestroy',           label: 'Sunaikinus' },
  { value: 'onDraw',              label: 'Ištraukus kortą' },
  { value: 'onDiscard',           label: 'Išmetus kortą' },
  { value: 'onTurnStart',         label: 'Ėjimo pradžioje' },
  { value: 'onTurnEnd',           label: 'Ėjimo pabaigoje' },
  { value: 'onFieldEnter',        label: 'Laukui atsiradus' },
  { value: 'onFieldLeave',        label: 'Laukui dingstant' },
  { value: 'onChampionSkill',     label: 'Čempiono gebėjimas' },
  { value: 'onArtifactActivated', label: 'Artefakto aktyvacija' },
  { value: 'onAnyDeath',          label: 'Kai sunaikinamas BET KURIS padaras (globalu)' },
  { value: 'onAnyAttack',         label: 'Kai BET KURIS padaras puola (globalu)' },
  { value: 'onAnySummon',         label: 'Kai iškviečiamas/prikeliamas BET KURIS padaras (globalu)' },
  { value: 'onAnyPlay',           label: 'Kai sužaidžiama BET KURI korta (globalu)' },
  { value: 'custom',              label: 'Custom (kodas)' },
]

// ── Animacijos / garsai / projectile ─────────────────────────────────────────
export type ProjectileType =
  | 'none' | 'fireball' | 'darkCurse' | 'healingGlow' | 'freezeBurst'
  | 'stunBurst' | 'destroyStrike' | 'arrow' | 'lightning' | 'poisonGlob'

export const PROJECTILE_TYPES: { value: ProjectileType; label: string; emoji: string }[] = [
  { value: 'none',          label: 'Be projectile',     emoji: '' },
  { value: 'fireball',      label: 'Ugnies kamuolys',   emoji: '🔥' },
  { value: 'darkCurse',     label: 'Tamsos prakeiksmas', emoji: '🟣' },
  { value: 'healingGlow',   label: 'Gydymo švytėjimas', emoji: '✨' },
  { value: 'freezeBurst',   label: 'Šalčio sprogimas',  emoji: '❄️' },
  { value: 'stunBurst',     label: 'Apsvaiginimas',     emoji: '💫' },
  { value: 'destroyStrike', label: 'Naikinantis smūgis', emoji: '⚔️' },
  { value: 'arrow',         label: 'Strėlė',            emoji: '🏹' },
  { value: 'lightning',     label: 'Žaibas',            emoji: '⚡' },
  { value: 'poisonGlob',    label: 'Nuodų gumulas',     emoji: '☣️' },
]

export type BattleSoundType =
  | 'attack' | 'spellCast' | 'impact' | 'draw' | 'curse' | 'field'
  | 'heal' | 'freeze' | 'death' | 'summon' | 'zmkFlip' | 'championSkill'

// ── Curse trigger konfigūracija ───────────────────────────────────────────────
export type CurseAppliesTo = 'caster' | 'opponent' | 'targetOwner' | 'chosenTarget' | 'random'

export type CurseTriggerConfig = {
  count: number                 // kiek curse kortų traukti
  appliesTo: CurseAppliesTo
  allowRandomTarget?: boolean   // random tik jei admin aiškiai leido
}

// ── Generiniai primityvai: metrikos, sąlygos, dinaminės reikšmės, selektoriai ─
export type MetricSource =
  | 'ownUnits' | 'enemyUnits' | 'allUnits'
  | 'ownWoundedUnits' | 'enemyWoundedUnits'
  | 'ownArtifacts' | 'enemyArtifacts'
  | 'ownHandCards' | 'enemyHandCards'
  | 'ownGraveyard' | 'enemyGraveyard'
  | 'ownDeck' | 'enemyDeck'
  | 'ownHp' | 'enemyHp' | 'ownGold' | 'enemyGold' | 'turnNumber'

export const METRIC_SOURCES: { value: MetricSource; label: string }[] = [
  { value: 'ownUnits',          label: 'Tavo padarų sk.' },
  { value: 'enemyUnits',        label: 'Priešo padarų sk.' },
  { value: 'allUnits',          label: 'Visų padarų sk.' },
  { value: 'ownWoundedUnits',   label: 'Tavo sužeistų padarų sk.' },
  { value: 'enemyWoundedUnits', label: 'Priešo sužeistų padarų sk.' },
  { value: 'ownArtifacts',      label: 'Tavo artefaktų sk.' },
  { value: 'enemyArtifacts',    label: 'Priešo artefaktų sk.' },
  { value: 'ownHandCards',      label: 'Tavo rankos kortų sk.' },
  { value: 'enemyHandCards',    label: 'Priešo rankos kortų sk.' },
  { value: 'ownGraveyard',      label: 'Tavo kapinyno sk.' },
  { value: 'enemyGraveyard',    label: 'Priešo kapinyno sk.' },
  { value: 'ownDeck',           label: 'Tavo kaladės sk.' },
  { value: 'enemyDeck',         label: 'Priešo kaladės sk.' },
  { value: 'ownHp',             label: 'Tavo HP' },
  { value: 'enemyHp',           label: 'Priešo HP' },
  { value: 'ownGold',           label: 'Tavo auksas' },
  { value: 'enemyGold',         label: 'Priešo auksas' },
  { value: 'turnNumber',        label: 'Ėjimo nr.' },
]

export type CompareOp = 'gte' | 'lte' | 'gt' | 'lt' | 'eq' | 'ne'
export const COMPARE_OPS: { value: CompareOp; label: string }[] = [
  { value: 'gte', label: '≥' }, { value: 'lte', label: '≤' },
  { value: 'gt', label: '>' }, { value: 'lt', label: '<' },
  { value: 'eq', label: '=' }, { value: 'ne', label: '≠' },
]

/** Sąlyga: efektas vyksta tik jei metrika op value (kitaip mapping praleidžiamas). */
export type EffectCondition = { source: MetricSource; op: CompareOp; value: number }

/** Dinaminė reikšmė: value = base + perEach * metrika (pvz. +3 už kiekvieną draugišką padarą). */
export type DynamicValue = { base: number; perEach: number; source: MetricSource }

/** Pavienio taikinio parinkimas pagal statą (vietoj auto „silpniausias"). */
export const SUBTYPE_OPTIONS: string[] = ['', 'ZOMBIE', 'GOBLIN', 'DEMON', 'ANGEL', 'INKVIZITORIUS', 'MISTIKAS', 'PLĖŠIKAS']

export type TargetSelect = 'highestHp' | 'lowestHp' | 'highestAtk' | 'lowestAtk' | 'highestCost' | 'lowestCost'
export const TARGET_SELECTS: { value: TargetSelect; label: string }[] = [
  { value: 'highestHp',   label: 'Daugiausiai HP' },
  { value: 'lowestHp',    label: 'Mažiausiai HP' },
  { value: 'highestAtk',  label: 'Daugiausiai ATT' },
  { value: 'lowestAtk',   label: 'Mažiausiai ATT' },
  { value: 'highestCost', label: 'Brangiausias' },
  { value: 'lowestCost',  label: 'Pigiausias' },
]

// ── Vienas efekto mapping'as ──────────────────────────────────────────────────
export type EffectMapping = {
  trigger: TriggerType
  effect: EffectType
  target: TargetType
  value?: number                // damage 2, draw 1, heal 3...
  requiresSelection?: boolean   // ar žaidėjas renkasi taikinį
  optional?: boolean            // ar efektas privalomas
  allowRandomTarget?: boolean   // jei reikia taikinio, bet leidžiam auto/random
  triggersCurse?: CurseTriggerConfig
  triggersZmk?: boolean         // ar žalai traukiamas ŽMK (default true damage tipo efektams)
  zmkValue?: '+0' | '+1' | '-1' | '+2' | '-2' | 'x2' | 'x0'  // removeZmkCard: kuri ŽMK korta šalinama
  zmkAppliesTo?: 'caster' | 'opponent'                      // removeZmkCard: kieno kaladė (default caster)
  animation?: string
  sound?: BattleSoundType
  projectile?: ProjectileType
  condition?: EffectCondition       // efektas vyksta tik jei sąlyga tenkinama
  dynamicValue?: DynamicValue       // value = base + perEach * metrika
  targetSelect?: TargetSelect       // pavienio taikinio parinkimas pagal statą
  hitCount?: number                 // kiek atskirų taikinių paveikti (auto/atsitiktinis; default 1)
  targetWoundedOnly?: boolean       // tik sužeisti padarai (hp < maxHp)
  targetSubtype?: string            // tik nurodyto potipio padarai (ZOMBIE/GOBLIN/DEMON)
  triggerSide?: 'own' | 'enemy' | 'any'  // globalus trigger: kieno įvykis aktyvuoja (savo/priešo/bet kuris)
  triggerSubtype?: string           // globalus trigger: tik šio potipio padaro įvykis aktyvuoja
  triggerSummonSource?: 'any' | 'graveyard' | 'deck' | 'hand' | 'play'  // onAnySummon: iš kur padaras atsirado
  summonCostMax?: number            // summon*: tik kortos su kaina <= reikšmė
  summonSubtype?: string            // summon*: tik šio potipio padarai
  summonCount?: number              // summon*: kiek iškviesti (default 1)
  summonZones?: ('hand' | 'deck' | 'discard')[]  // summonAdvanced: iš kurių zonų (eilės tvarka)
  summonCostMin?: number            // summonAdvanced: kaina >= reikšmė
  summonChoose?: boolean            // summonAdvanced: žaidėjas pats renkasi kortą (popup)
  summonNames?: string              // summonAdvanced: tik šios kortos (vardai per kablelį)
  peekCount?: number                // peekDiscard: kiek kortų peržiūrėti (default = value*2)
  sameTarget?: boolean              // follow-up (`then`): naudoti tą patį taikinį kaip tėvinis efektas
  onlyIfTargetDied?: boolean        // follow-up (`then`): vykdyti tik jei tėvinio efekto taikinys žuvo (pvz. Kamuolinis žaibas)
  chooseOne?: { label: string; mappings: EffectMapping[] }[]  // chooseEffect: variantai pop-up'e (žaidėjas renkasi 1)
  tutorZone?: 'deck' | 'discard' | 'both'  // tutorToHand: iš kur ieškoti (default both)
  tutorSpellType?: SpellType        // tutorToHand: tik šio burto tipo kortos (kitaip – bet kuri korta)
  tutorChoose?: boolean             // tutorToHand: žaidėjas pats renkasi (pop-up) vietoj atsitiktinės
  then?: EffectMapping[]            // follow-up grandinė: po šio efekto įvykdyti ir šiuos (paeiliui)
  note?: string
}

// ── Field konfigūracija ───────────────────────────────────────────────────────
export type FieldPassiveConfig = {
  spellCostDelta?: number        // burtai kainuoja +X aukso
  unitCostDelta?: number         // padarai kainuoja +X aukso
  atkDelta?: number              // visų padarų ATK +/−X
  attackLimitPerTurn?: number    // maks. atakų per ėjimą
  firstDamageReduction?: number  // pirma žala per ėjimą sumažinama X
  goldBonusPerTurn?: number      // papildomas auksas ėjimo pradžioje
}

export type FieldEffectConfig = {
  passive?: FieldPassiveConfig
  triggers?: EffectMapping[]     // onTurnStart / onTurnEnd / onSummon / onCast / onAttack / onDeath
  affectsBothPlayers?: boolean   // default true
  note?: string
}

// ── Pasyvi aura (veikia kol korta žaidime, be trigerio) ──────────────────────
export type PassiveAuraConfig = {
  enemyUnitDamageHealsOwner?: boolean  // visa žala priešo padarams pridedama prie savininko HP
  // Statų aura: kol korta (padaras/artefaktas) kovos lauke, nuolat buffina padarus
  auraAttack?: number                  // +ATK paveiktiems padarams
  auraHealth?: number                  // +HP (ir maxHP) paveiktiems padarams
  auraScope?: 'friendly' | 'enemy' | 'all'  // kuriuos padarus veikia (default: savus)
  auraSubtype?: string                 // tik šio potipio padarus (ZOMBIE/GOBLIN/…)
  auraIncludesSelf?: boolean           // ar veikia ir pačią auros kortą (default: ne)
  auraSilence?: boolean                // paveikti padarai nutildomi (efektai/raktažodžiai blokuojami)
  auraCantAttack?: boolean             // paveikti padarai negali atakuoti
  auraKeywords?: ('taunt' | 'shield' | 'stealth' | 'sprint')[]  // suteikiami raktažodžiai
  auraCostReduction?: number           // sumažina paveiktos pusės rankos kortų kainą (auksas)
  // ── Pranašumas / nepalankumas (ŽMK traukiama 2× ir imama geresnė/blogesnė) ──
  advAttack?: 'advantage' | 'disadvantage'   // paveiktų padarų ATAKŲ ŽMK traukimas
  advSpell?: 'advantage' | 'disadvantage'    // paveiktos pusės BURTŲ žalos ŽMK traukimas
  advSpellType?: SpellType                    // advSpell tik šio tipo burtams (kitaip – visiems)
  // ── Burtų vampyrizmas (Gydūnė Džilė): burto žala pridedama prie žaidėjo HP ──
  spellLifestealScope?: 'friendly' | 'enemy' | 'all'  // kieno burtų žala gydo tos pusės žaidėją
  // ── Alchemikų fortas: sužaidus burtą – grąžinti jį į savininko kaladę ──
  returnCastSpellScope?: 'friendly' | 'enemy' | 'all'  // kieno burtų sužaidimą gaudo (grąžina į kaladę)
}

// ── Čempiono skill (3 vnt; atrakinami pagal fazę: skill1=faze1, skill2=faze2, skill3=faze3) ──
export type ChampionSkill = { name?: string; mappings: EffectMapping[] }

// ── Pilna kortos gameplay konfigūracija (cards.gameplay JSONB) ────────────────
export type GameplayConfig = {
  virtualEnabled?: boolean        // default true
  spellType?: SpellType           // burto tipas (ugnis/ledas/žaibas/...); naudoja auras + Milva tipo atranka
  needsEffectMapping?: boolean    // adminui: kortai reikia suvesti efektus
  effectMappings?: EffectMapping[]
  fieldEffectConfig?: FieldEffectConfig      // jei type = Laukas
  championSkillConfig?: { skills?: ChampionSkill[]; mappings?: EffectMapping[] }  // jei Čempionas (3 skills; mappings = legacy 1 skill)
  artifactEffectConfig?: { mappings: EffectMapping[] } // jei Artefaktas
  passiveAura?: PassiveAuraConfig
  keywords?: ('sprint' | 'taunt' | 'shield' | 'stealth')[]  // statiniai padaro raktažodžiai
  canTriggerCurse?: boolean
  canTriggerZmk?: boolean
  animationType?: string
  soundType?: BattleSoundType
  projectileType?: ProjectileType
  tutorialTags?: string[]
}

// ── ŽMK kortos (zmk_cards lentelė) ───────────────────────────────────────────
export type ZmkMode = 'auto' | 'draw'

export type ZmkCardDef = {
  id: string
  name: string
  description: string | null
  value: '+0' | '+1' | '-1' | '+2' | '-2' | 'x2' | 'x0'
  count: number
  mode: ZmkMode
  image_url: string | null
  active: boolean
  sort_order: number
}

/** Saugus GameplayConfig parsinimas iš JSONB (nežinomi laukai ignoruojami). */
export function parseGameplayConfig(raw: unknown): GameplayConfig | null {
  if (!raw || typeof raw !== 'object') return null
  try {
    const g = raw as GameplayConfig
    if (g.effectMappings && !Array.isArray(g.effectMappings)) return null
    return g
  } catch {
    return null
  }
}
