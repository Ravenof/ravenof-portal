// ── Virtualaus žaidimo gameplay konfigūracijos modelis ────────────────────────
// Šiuos tipus naudoja: admin mapping editorius, effect engine, target resolver,
// trigger system, field/curse/zmk engine. Saugoma cards.gameplay JSONB stulpelyje.

// ── Taikinių tipai ────────────────────────────────────────────────────────────
export type TargetType =
  | 'self'              // be taikinio / pats šaltinis / globalu
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
  | 'triggerCurse' | 'triggerZmk' | 'removeZmkCard'

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
  { value: 'summonFromGraveyard', label: 'Iškviesti iš krūvos',        needsValue: false },
  { value: 'returnToHand',        label: 'Grąžinti į ranką',           needsValue: false },
  { value: 'moveToGraveyard',     label: 'Į panaudotų krūvą',          needsValue: false },
  { value: 'revive',              label: 'Prikelti',                   needsValue: false },
  { value: 'gainGold',            label: 'Gauti aukso',                needsValue: true },
  { value: 'loseGold',            label: 'Prarasti aukso',             needsValue: true },
  { value: 'triggerCurse',        label: 'Aktyvuoti prakeiksmą',       needsValue: true },
  { value: 'triggerZmk',          label: 'Traukti ŽMK',                needsValue: false },
  { value: 'removeZmkCard',       label: 'Pašalinti ŽMK kortą iš kaladės', needsValue: true },
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
}

// ── Pilna kortos gameplay konfigūracija (cards.gameplay JSONB) ────────────────
export type GameplayConfig = {
  virtualEnabled?: boolean        // default true
  needsEffectMapping?: boolean    // adminui: kortai reikia suvesti efektus
  effectMappings?: EffectMapping[]
  fieldEffectConfig?: FieldEffectConfig      // jei type = Laukas
  championSkillConfig?: { mappings: EffectMapping[] }  // jei Čempionas
  artifactEffectConfig?: { mappings: EffectMapping[] } // jei Artefaktas
  passiveAura?: PassiveAuraConfig
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
