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
  | 'castSpell'         // dabar žaidžiamas burtas (counter/nutildymas; tik onAnyCast reakcijai)

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
  { value: 'castSpell',       label: 'Dabar žaidžiamas burtas (nutildyti/atšaukti)' },
]

// ── Efektų tipai ──────────────────────────────────────────────────────────────
export type EffectType =
  | 'damage' | 'heal' | 'destroy'
  | 'silence' | 'freeze' | 'stun' | 'poison' | 'burn' | 'cleanse'
  | 'taunt' | 'stealth' | 'shield' | 'sprint'
  | 'buffAttack' | 'buffHealth' | 'debuffAttack' | 'debuffHealth'
  | 'drawCards' | 'drawUntilHand' | 'discard'
  | 'summonFromHand' | 'summonFromDeck' | 'summonFromGraveyard'
  | 'returnToHand' | 'moveToGraveyard' | 'revive'
  | 'gainGold' | 'loseGold'
  | 'triggerCurse' | 'triggerZmk' | 'removeZmkCard' | 'mill' | 'returnGraveyardToDeck' | 'peekDiscard' | 'revealOwnDeck' | 'revealEnemyDeck' | 'selfToEnemyHand' | 'selfToOwnHand' | 'summonAdvanced'
  | 'spellDiscount' | 'buffSpellDamage' | 'cardCostMod'
  | 'chooseEffect' | 'tutorToHand'
  | 'coinFlip' | 'loseGoldNextTurn'
  | 'copyEffectFromGraveyard'
  | 'reflectToAttacker'
  | 'resurrectSelf'
  | 'takeControl'
  | 'forceCurseActivation'
  | 'activateLastwishFromGraveyard'
  | 'turnCostDiscount'

export const EFFECT_TYPES: { value: EffectType; label: string; needsValue: boolean; group: string }[] = [
  // ── Kova ──
  { value: 'damage',              label: 'Žala',                       needsValue: true,  group: 'Kova' },
  { value: 'destroy',             label: 'Sunaikinti',                 needsValue: false, group: 'Kova' },
  { value: 'reflectToAttacker',   label: 'Atspindėti puolėją: sunaikinti puolantį padarą + jo ATK į jo žaidėją (onAttacked)', needsValue: false, group: 'Kova' },
  // ── Gydymas ──
  { value: 'heal',                label: 'Gydymas',                    needsValue: true,  group: 'Gydymas' },
  { value: 'revive',              label: 'Prikelti',                   needsValue: false, group: 'Gydymas' },
  { value: 'resurrectSelf',       label: 'Prisikelti pačiam: onDeath – žūstant (Paskutinis noras); onAnyCurse – iš kapinyno kaskart aktyvavus prakeiksmą', needsValue: false, group: 'Gydymas' },
  // ── Statusai ──
  { value: 'burn',                label: 'Padegti',                    needsValue: false, group: 'Statusai' },
  { value: 'poison',              label: 'Apnuodyti',                  needsValue: false, group: 'Statusai' },
  { value: 'freeze',              label: 'Sušaldyti',                  needsValue: false, group: 'Statusai' },
  { value: 'stun',                label: 'Apsvaiginti',                needsValue: false, group: 'Statusai' },
  { value: 'silence',             label: 'Nutildyti',                  needsValue: false, group: 'Statusai' },
  { value: 'taunt',               label: 'Suteikti Pasišaipymą',       needsValue: false, group: 'Statusai' },
  { value: 'stealth',             label: 'Suteikti Sėlinimą',          needsValue: false, group: 'Statusai' },
  { value: 'shield',              label: 'Suteikti Magiškąjį skydą',   needsValue: false, group: 'Statusai' },
  { value: 'sprint',              label: 'Suteikti Sprintą',           needsValue: false, group: 'Statusai' },
  { value: 'cleanse',             label: 'Nuimti būsenas / raktažodžius (dispel: gali nuimti ir Magišką skydą, Pasišaipymą, Sėlinimą, Sprintą)', needsValue: false, group: 'Statusai' },
  // ── Statai ──
  { value: 'buffAttack',          label: '+ATK',                       needsValue: true,  group: 'Statai' },
  { value: 'buffHealth',          label: '+HP',                        needsValue: true,  group: 'Statai' },
  { value: 'debuffAttack',        label: '−ATK',                       needsValue: true,  group: 'Statai' },
  { value: 'debuffHealth',        label: '−HP',                        needsValue: true,  group: 'Statai' },
  // ── Kortų traukimas ir ranka ──
  { value: 'drawCards',           label: 'Traukti kortas',             needsValue: true,  group: 'Kortų traukimas ir ranka' },
  { value: 'drawUntilHand',       label: 'Traukti kol rankoje bus X kortų', needsValue: true, group: 'Kortų traukimas ir ranka' },
  { value: 'discard',             label: 'Išmesti kortas',             needsValue: true,  group: 'Kortų traukimas ir ranka' },
  { value: 'peekDiscard',         label: 'Peržiūrėk N → pasirink K išmesti', needsValue: true, group: 'Kortų traukimas ir ranka' },
  { value: 'returnToHand',        label: 'Grąžinti į ranką',           needsValue: false, group: 'Kortų traukimas ir ranka' },
  { value: 'tutorToHand',         label: 'Į ranką: burtas/korta pagal tipą (deck/kapinynas)', needsValue: false, group: 'Kortų traukimas ir ranka' },
  { value: 'selfToOwnHand',       label: 'Ši korta → tavo ranka (Paskutinis noras)', needsValue: false, group: 'Kortų traukimas ir ranka' },
  { value: 'selfToEnemyHand',     label: 'Ši korta → priešo ranka (Paskutinis noras)', needsValue: false, group: 'Kortų traukimas ir ranka' },
  // ── Iškvietimas ──
  { value: 'summonFromHand',      label: 'Iškviesti iš rankos',        needsValue: false, group: 'Iškvietimas' },
  { value: 'summonFromDeck',      label: 'Iškviesti iš kaladės',       needsValue: false, group: 'Iškvietimas' },
  { value: 'summonFromGraveyard', label: 'Iškviesti iš kapinyno',      needsValue: false, group: 'Iškvietimas' },
  { value: 'summonAdvanced',      label: 'Iškviesti padarą (zonos+kaina+potipis)', needsValue: false, group: 'Iškvietimas' },
  // ── Kaladė ir kapinynas ──
  { value: 'mill',                label: 'Mill (kortos iš kaladės į kapinyną)', needsValue: true, group: 'Kaladė ir kapinynas' },
  { value: 'moveToGraveyard',     label: 'Į kapinyną',                 needsValue: false, group: 'Kaladė ir kapinynas' },
  { value: 'returnGraveyardToDeck', label: 'Grąžinti iš kapinyno į kaladę', needsValue: true, group: 'Kaladė ir kapinynas' },
  { value: 'copyEffectFromGraveyard', label: 'Kopijuoti efektą iš kapinyno padaro (pop-up)', needsValue: false, group: 'Kaladė ir kapinynas' },
  { value: 'activateLastwishFromGraveyard', label: 'Aktyvuoti kapinyno padaro Paskutinį norą (pop-up); jei pažymėta – šios kortos Paskutinis noras pakartoja tą patį efektą', needsValue: false, group: 'Kaladė ir kapinynas' },
  { value: 'revealOwnDeck',       label: 'Parodyk N savo kaladės viršaus', needsValue: true, group: 'Kaladė ir kapinynas' },
  { value: 'revealEnemyDeck',     label: 'Pažiūrėk N priešo kaladės viršaus', needsValue: true, group: 'Kaladė ir kapinynas' },
  { value: 'triggerCurse',        label: 'Įmaišyti prakeiksmų į kaladę (aktyvuojasi ištraukus)', needsValue: true, group: 'Kaladė ir kapinynas' },
  { value: 'triggerZmk',          label: 'Traukti ŽMK',                needsValue: false, group: 'Kaladė ir kapinynas' },
  { value: 'removeZmkCard',       label: 'Pašalinti ŽMK kortą iš kaladės', needsValue: true, group: 'Kaladė ir kapinynas' },
  { value: 'forceCurseActivation', label: 'Priverstinai aktyvuoti atsitiktinį įmaišytą prakeiksmą (iš priešo kaladės; value = kiek)', needsValue: true, group: 'Kaladė ir kapinynas' },
  // ── Auksas ir kainos ──
  { value: 'gainGold',            label: 'Gauti aukso',                needsValue: true,  group: 'Auksas ir kainos' },
  { value: 'loseGold',            label: 'Prarasti aukso',             needsValue: true,  group: 'Auksas ir kainos' },
  { value: 'loseGoldNextTurn',    label: 'Priešas praranda X aukso kito ėjimo pradžioje', needsValue: true, group: 'Auksas ir kainos' },
  { value: 'spellDiscount',       label: 'Kito burto nuolaida (auksas)', needsValue: true, group: 'Auksas ir kainos' },
  { value: 'cardCostMod',         label: 'Sekanti korta kainuoja +/− (auksas; gali pagal tipą)', needsValue: true, group: 'Auksas ir kainos' },
  { value: 'turnCostDiscount',    label: 'Šį ėjimą VISOS kortos kainuoja X pigiau (bet ne pigiau nei Y)', needsValue: true, group: 'Auksas ir kainos' },
  // ── Specialūs ──
  { value: 'chooseEffect',        label: 'Pasirink 1 iš kelių efektų (pop-up)', needsValue: false, group: 'Specialūs' },
  { value: 'coinFlip',            label: 'Monetos metimas (žalia/raudona → 2 efektai)', needsValue: false, group: 'Specialūs' },
  { value: 'takeControl',         label: 'Perimti priešo padarą į savo pusę (trukmė: visam laikui / iki ėjimo pabaigos / iki kito savo ėjimo)', needsValue: false, group: 'Specialūs' },
]

/** Grupės tvarka admin dropdown'e */
export const EFFECT_GROUP_ORDER = ['Kova', 'Gydymas', 'Statusai', 'Statai', 'Kortų traukimas ir ranka', 'Iškvietimas', 'Kaladė ir kapinynas', 'Auksas ir kainos', 'Specialūs']

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
  | 'onDraw' | 'onDiscard' | 'onCurseDrawn'
  | 'onTurnStart' | 'onTurnEnd'
  | 'onFieldEnter' | 'onFieldLeave'
  | 'onChampionSkill' | 'onArtifactActivated'
  | 'onAnyDeath' | 'onAnyAttack' | 'onAnySummon' | 'onAnyPlay'
  | 'onAnyDamage' | 'onAnyHeal' | 'onAnyDraw' | 'onAnyDiscard' | 'onAnyStatus' | 'onAnyGold' | 'onAnyTurnStart' | 'onAnyTurnEnd'
  | 'onAnyCast' | 'onAnyArtifact' | 'onAnyChampion' | 'onAnyCurse'
  | 'onOpponentGoldEmpty'
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
  { value: 'onDestroy',           label: 'Sunaikinus taikinį (šis padaras/burtas nužudo)' },
  { value: 'onDraw',              label: 'Ištraukus kortą' },
  { value: 'onCurseDrawn',        label: 'Kai auka ištraukia šį prakeiksmą (aktyvacija)' },
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
  { value: 'onAnyCast',           label: 'Kai panaudojamas BET KURIS burtas (globalu)' },
  { value: 'onAnyArtifact',       label: 'Kai padedamas BET KURIS artefaktas (globalu)' },
  { value: 'onAnyChampion',       label: 'Kai iškviečiamas/evoliucionuoja BET KURIS Čempionas (globalu)' },
  { value: 'onAnyDamage',         label: 'Kai BET KAS gauna žalą (globalu)' },
  { value: 'onAnyHeal',           label: 'Kai BET KAS pagydomas (globalu)' },
  { value: 'onAnyDraw',           label: 'Kai BET KAS traukia kortą (globalu)' },
  { value: 'onAnyDiscard',        label: 'Kai BET KAS išmeta į kapinyną (globalu)' },
  { value: 'onAnyStatus',         label: 'Kai BET KAM uždedama būsena (globalu)' },
  { value: 'onAnyGold',           label: 'Kai BET KAS gauna aukso (globalu)' },
  { value: 'onAnyTurnStart',      label: 'Kiekvieno ėjimo pradžioje (abiejų žaidėjų)' },
  { value: 'onAnyTurnEnd',        label: 'Kiekvieno ėjimo pabaigoje (abiejų žaidėjų)' },
  { value: 'onAnyCurse',          label: 'Kai aktyvuojamas BET KURIS prakeiksmas (globalu)' },
  { value: 'onOpponentGoldEmpty', label: 'Kai priešininkas išnaudoja visą auksą (globalu)' },
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
  | 'heal' | 'freeze' | 'death' | 'summon' | 'zmkFlip' | 'championSkill' | 'explosion'

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
  | 'lastDamageDealt' | 'destroyedTargetsHp'

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
  { value: 'lastDamageDealt',   label: 'Padaryta žala (grandinėje, šio efekto)' },
  { value: 'destroyedTargetsHp',label: 'Sunaikintų taikinių HP suma (grandinėje)' },
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
  targetTypes?: TargetType[]     // keli taikinių tipai (union); žaidėjas renkasi iš visų pažymėtų (varnelės)
  applyToAllTypes?: boolean      // targetTypes: true = paveikti VISUS pažymėtus (AoE); false/undef = žaidėjas renkasi 1 (ARBA)
  value?: number                // damage 2, draw 1, heal 3...
  requiresSelection?: boolean   // ar žaidėjas renkasi taikinį
  optional?: boolean            // ar efektas privalomas
  allowRandomTarget?: boolean   // jei reikia taikinio, bet leidžiam auto/random
  triggersCurse?: CurseTriggerConfig
  triggersZmk?: boolean         // ar žalai traukiamas ŽMK (default true damage tipo efektams)
  overflowToPlayer?: boolean    // žala padarui: perteklinė (virš taikinio HP) žala pereina taikinio žaidėjui
  zmkValue?: '+0' | '+1' | '-1' | '+2' | '-2' | 'x2' | 'x0'  // removeZmkCard: kuri ŽMK korta šalinama
  zmkAppliesTo?: 'caster' | 'opponent'                      // removeZmkCard: kieno kaladė (default caster)
  goldAppliesTo?: 'caster' | 'opponent'                     // gainGold/loseGold: kam taikoma (default: gain→caster, lose→opponent)
  costModDelta?: number                                     // cardCostMod: kainos pokytis (+ brangiau, − pigiau)
  costModCardType?: 'any' | 'unit' | 'spell' | 'artifact' | 'reaction' | 'field'  // cardCostMod: kuriam kortos tipui
  costModAppliesTo?: 'caster' | 'opponent'                  // cardCostMod: kieno sekančiai kortai (default caster)
  animation?: string
  sound?: BattleSoundType
  projectile?: ProjectileType
  condition?: EffectCondition       // efektas vyksta tik jei sąlyga tenkinama
  dynamicValue?: DynamicValue       // value = base + perEach * metrika
  targetSelect?: TargetSelect       // pavienio taikinio parinkimas pagal statą
  hitCount?: number                 // kiek atskirų taikinių paveikti (auto/atsitiktinis; default 1)
  targetWoundedOnly?: boolean       // tik sužeisti padarai (hp < maxHp)
  targetSubtype?: string            // tik nurodyto potipio padarai (ZOMBIE/GOBLIN/DEMON)
  targetFaction?: number            // tik nurodytos frakcijos padarai (faction id)
  triggerSide?: 'own' | 'enemy' | 'any'  // globalus trigger: kieno įvykis aktyvuoja (savo/priešo/bet kuris)
  triggerSubtype?: string           // globalus trigger: tik šio potipio padaro įvykis aktyvuoja
  triggerFaction?: number           // globalus trigger: tik šios frakcijos padaro įvykis aktyvuoja
  triggerSummonSource?: 'any' | 'graveyard' | 'deck' | 'hand' | 'play'  // onAnySummon: iš kur padaras atsirado
  summonCostMax?: number            // summon*: tik kortos su kaina <= reikšmė
  summonSubtype?: string            // summon*: tik šio potipio padarai
  summonFaction?: number            // summon*: tik šios frakcijos padarai
  summonCount?: number              // summon*: kiek iškviesti (default 1)
  summonZones?: ('hand' | 'deck' | 'discard')[]  // summonAdvanced: iš kurių zonų (eilės tvarka)
  summonCostMin?: number            // summonAdvanced: kaina >= reikšmė
  summonChoose?: boolean            // summonAdvanced: žaidėjas pats renkasi kortą (popup)
  summonNames?: string              // summonAdvanced: tik šios kortos (vardai per kablelį)
  peekCount?: number                // peekDiscard: kiek kortų peržiūrėti (default = value*2)
  sameTarget?: boolean              // follow-up (`then`): naudoti tą patį taikinį kaip tėvinis efektas
  useAttackTarget?: boolean         // onAttack/onAttacked: efektas taikomas į kovos taikinį (atakuotą padarą / atakuotoją)
  resurrectHp1?: boolean            // resurrectSelf: prisikelia su 1 HP (vietoj pilno)
  oncePerGame?: boolean             // resurrectSelf: suveikia tik kartą per žaidimą
  /**
   * resurrectSelf: KADA prisikelia.
   *   'immediate'        – iškart vietoje mirties (numatytoji, senas elgesys)
   *   'endOfTurn'        – šio ėjimo pabaigoje (padaras iki tol guli kapinyne)
   *   'startOfNextTurn'  – savininko kito ėjimo pradžioje
   */
  resurrectTiming?: 'immediate' | 'endOfTurn' | 'startOfNextTurn'
  resurrectAtkMod?: number          // resurrectSelf: ATK pokytis prisikėlus (+/−)
  resurrectHpMod?: number           // resurrectSelf: HP pokytis prisikėlus (+/−; taikoma ir su resurrectHp1)
  resurrectStatuses?: ('frozen' | 'burning' | 'poisoned' | 'stunned' | 'silenced' | 'blessed')[]  // resurrectSelf: būsenos, uždedamos prisikėlus
  onlyIfTargetDied?: boolean        // follow-up (`then`): vykdyti tik jei tėvinio efekto taikinys žuvo (pvz. Kamuolinis žaibas)
  chooseOne?: { label: string; mappings: EffectMapping[] }[]  // chooseEffect: variantai pop-up'e (žaidėjas renkasi 1)
  chooseBy?: 'caster' | 'opponent'  // chooseEffect: kas renkasi – kerėtojas (default) ar priešininkas/auka (pvz. prakeiksmui)
  coinGreen?: EffectMapping[]       // coinFlip: efektai, kai iškrinta ŽALIA pusė
  coinRed?: EffectMapping[]         // coinFlip: efektai, kai iškrinta RAUDONA pusė
  triggerSpellType?: SpellType      // globalus trigger (onAnyCast): tik šio tipo burtas aktyvuoja
  tutorZone?: 'deck' | 'discard' | 'both'  // tutorToHand: iš kur ieškoti (default both)
  tutorSpellType?: SpellType        // tutorToHand: tik šio burto tipo kortos (kitaip – bet kuri korta)
  tutorCardType?: 'unit' | 'spell' | 'champion' | 'artifact' | 'field'  // tutorToHand: tik šio kortos tipo (padaras/burtas/čempionas/artefaktas/laukas)
  tutorChoose?: boolean             // tutorToHand: žaidėjas pats renkasi (pop-up) vietoj atsitiktinės
  copyFromSide?: 'own' | 'enemy' | 'any'  // copyEffectFromGraveyard / activateLastwishFromGraveyard: iš kurio kapinyno rinktis (default any)
  glwRepeatOnDeath?: boolean        // activateLastwishFromGraveyard: šios kortos Paskutinis noras – aktyvuoti tą patį efektą dar kartą (default: taip)
  costFloor?: number                // turnCostDiscount: minimali kaina Y (nuolaida nenuleis žemiau šios ribos)
  then?: EffectMapping[]            // follow-up grandinė: po šio efekto įvykdyti ir šiuos (paeiliui)
  // ── Nauji card-mapping praplėtimai ──
  buffDuration?: 'permanent' | 'endOfTurn' | 'untilNextTurn' | 'thisAttack'  // buffAttack/buffHealth: laikinas boost ('thisAttack' – tik šios atakos metu, onAttack); takeControl: valdymo trukmė
  cleanseStatuses?: ('frozen' | 'burning' | 'poisoned' | 'stunned' | 'silenced' | 'blessed' | 'shield' | 'taunt' | 'stealth' | 'sprint')[]  // cleanse: kurias būsenas/raktažodžius nuimti (shield/taunt/stealth/sprint = pozityvų dispel); TUŠČIA = visos NEIGIAMOS būsenos
  reviveDestroyedTarget?: boolean   // then po destroy/onDeath: prikelti BŪTENT sunaikintą taikinį (ne atsitiktinį)
  reviveToSide?: 'own' | 'enemy'    // kam atitenka prikeltas padaras (default own)
  drawFromGraveyard?: boolean       // drawCards: traukti iš kapinyno (atsitiktinė), o ne iš kaladės
  drawCardType?: 'unit' | 'spell' | 'champion' | 'artifact' | 'field'  // drawCards: tik šio tipo kortą
  drawKeep?: number                 // drawCards: traukti `value`, pasilikti `drawKeep` (pop-up), kitas išmesti
  drawAppliesTo?: 'caster' | 'opponent' | 'both'  // drawCards/drawUntilHand: kas traukia (numatyta caster = šaltinis)
  targetSummoned?: boolean          // then: taikinys = ką tik šio efekto iškviestas padaras (raktažodžiui suteikti)
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
  creatureCap?: number           // padarų zonos limitas (Platusis laukas: 10 vietoj 5)
  battlecryTwice?: boolean       // Kovos šūksniai (onPlay/onSummon battlecry) suveikia 2 kartus
  destroySummonedWithLastwish?: boolean  // iškviestas padaras su Paskutiniu noru (onDeath) žūsta iškart
  exileOnDeath?: boolean         // sunaikintos kortos PAŠALINAMOS iš žaidimo (ne į kapinyną)
  unitsGuardPlayer?: boolean     // negalima pulti žaidėjo, kol jo pusėje yra bent vienas padaras
  globalSilence?: boolean        // visi padarai nutildyti, kol laukas aktyvus
  returnUnitAtTurnStart?: boolean // ėjimo pradžioje žaidėjas grąžina vieną SAVO padarą į ranką
}

export type FieldEffectConfig = {
  passive?: FieldPassiveConfig
  triggers?: EffectMapping[]     // onTurnStart / onTurnEnd / onSummon / onCast / onAttack / onDeath
  affectsBothPlayers?: boolean   // default true
  backgroundUrl?: string | null  // arenos fonas: sužaidus lauką arena pasikeičia į šį vaizdą (admin upload)
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
  auraFaction?: number                 // tik šios frakcijos padarus (faction id)
  auraIncludesSelf?: boolean           // ar veikia ir pačią auros kortą (default: ne)
  auraSilence?: boolean                // paveikti padarai nutildomi (efektai/raktažodžiai blokuojami)
  auraCantAttack?: boolean             // paveikti padarai negali atakuoti
  auraKeywords?: ('taunt' | 'shield' | 'stealth' | 'sprint')[]  // suteikiami raktažodžiai
  auraStatuses?: ('frozen' | 'burning' | 'poisoned' | 'stunned')[]  // paveikti padarai NUOLAT turi šias būsenas, kol aura aktyvi
  auraFromGraveyardOnly?: boolean      // aura veikia TIK padarus, iškviestus/prikeltus iš kapinyno
  auraRequiresKeyword?: 'taunt' | 'shield' | 'stealth' | 'sprint'  // SĄLYGA: aura veikia tik padarus su šiuo raktažodžiu (pvz. +1/+1 tik taunt padarams)
  auraCostReduction?: number           // sumažina paveiktos pusės rankos kortų kainą (auksas)
  // ── Pranašumas / nepalankumas (ŽMK traukiama 2× ir imama geresnė/blogesnė) ──
  advAttack?: 'advantage' | 'disadvantage'   // paveiktų padarų ATAKŲ ŽMK traukimas
  advSpell?: 'advantage' | 'disadvantage'    // paveiktos pusės BURTŲ žalos ŽMK traukimas
  advSpellType?: SpellType                    // advSpell tik šio tipo burtams (kitaip – visiems)
  // ── Burtų vampyrizmas (Gydūnė Džilė): burto žala pridedama prie žaidėjo HP ──
  spellLifestealScope?: 'friendly' | 'enemy' | 'all'  // kieno burtų žala gydo tos pusės žaidėją
  // ── Alchemikų fortas: sužaidus burtą – grąžinti jį į savininko kaladę ──
  returnCastSpellScope?: 'friendly' | 'enemy' | 'all'  // kieno burtų sužaidimą gaudo (grąžina į kaladę)
  // ── Statusų imunitetas (aura): paveikti padarai NEGAUNA pasirinktų būsenų ──
  auraStatusImmunity?: boolean         // įjungia imunitetą; kurias būsenas blokuoja – žr. sąrašą žemiau
  auraStatusImmunityStatuses?: ('frozen' | 'burning' | 'poisoned' | 'stunned' | 'silenced')[]  // TUŠČIA = visos neigiamos
  // ── Įsiūtis (savasis pasyvas): kol padaras SUŽEISTAS (hp < maxHp) — +ATK ──
  enrageAttack?: number                // +X ATK kol sužeistas; pagijus iki pilno – priedas dingsta
  // ── Herojų žalos dvigubinimas (aura): žala BET KURIAM žaidėjui ×2 ──
  auraHeroDamageDouble?: boolean       // kol korta lauke – abiejų žaidėjų gaunama žala dviguba
  // ── Žalos mažinimas procentais (aura): paveiktiems padarams žala −X% ──
  auraDamageReductionPct?: number      // 0–100; paveiktų padarų gaunama žala sumažinama X%
  // ── Nemirtingumas (aura): paveikti padarai negali žūti – lieka su 1 HP ──
  auraImmortal?: boolean               // paveikti padarai nežūsta (HP nukrenta iki min. 1)
  // ── Burtų žalos priedas (aura): paveiktos pusės burtai daro +X žalos ──
  auraSpellDamage?: number             // +X žalos paveiktos pusės burtams
  auraSpellType?: SpellType            // auraSpellDamage tik šio tipo burtams (kitaip – visiems)
  // ── Antra ataka (aura): sunaikinęs padarą ataka – gali pulti dar kartą ──
  auraSecondAttack?: boolean           // paveiktas padaras, sunaikinęs priešo padarą, gali pulti dar kartą tą patį ėjimą
  auraSecondAttackCond?: 'any' | 'taunt' | 'shield'  // sąlyga: bet kuris / tik su Pasišaipymu / tik su Magišku skydu
}

// ── Premium kino pop-up (PremiumCinematics) ──────────────────────────────────
// Du tipai: „summon" (Legendinis/Čempionas iškvietimas) ir „championSkill".
// Failai saugomi card-cinematics bucket'e (WebM + MP4 fallback + poster); DB
// laiko tik URL + metaduomenis. Logika: lib/game/cinematics.ts + cinematicQueue.ts.
export type CinematicFrameTheme =
  | 'default' | 'undead' | 'demon' | 'holy' | 'mystic' | 'goblin' | 'pirate' | 'eastern' | 'inquisition'

export const CINEMATIC_FRAME_THEMES: { value: CinematicFrameTheme; label: string }[] = [
  { value: 'default',     label: 'Numatytas (plienas)' },
  { value: 'undead',      label: 'Nemirėliai (Mirties maršas)' },
  { value: 'demon',       label: 'Demonai (Demonų orda)' },
  { value: 'holy',        label: 'Šventieji (Šviesos pulkas)' },
  { value: 'mystic',      label: 'Mistika (Mistikos melodija)' },
  { value: 'goblin',      label: 'Goblinai (Vryhioko gauja)' },
  { value: 'pirate',      label: 'Piratai (Plėšikų naktis)' },
  { value: 'eastern',     label: 'Rytai (Rytų vėjas)' },
  { value: 'inquisition', label: 'Inkvizicija (Inkvizicijos legionas)' },
]

export type CinematicTriggerSource =
  | 'playedFromHand' | 'summonedByEffect' | 'revived' | 'copied' | 'generated'

export const CINEMATIC_TRIGGER_SOURCES: { value: CinematicTriggerSource; label: string }[] = [
  { value: 'playedFromHand',   label: 'Sužaista iš rankos' },
  { value: 'summonedByEffect', label: 'Iškviesta efekto' },
  { value: 'revived',          label: 'Prikelta' },
  { value: 'copied',           label: 'Nukopijuota' },
  { value: 'generated',        label: 'Sugeneruota' },
]

export const CINEMATIC_MAX_BYTES = 5 * 1024 * 1024        // siūlomas hard max (UI)
export const CINEMATIC_WARN_BYTES = 2 * 1024 * 1024       // warn jei didesnis
export const CINEMATIC_MAX_DURATION_MS = 4000
export const CINEMATIC_MIN_DURATION_MS_SUMMON = 1500
export const CINEMATIC_MIN_DURATION_MS_SKILL = 1000
export const CINEMATIC_DEFAULT_DURATION_MS_SUMMON = 2600
export const CINEMATIC_DEFAULT_DURATION_MS_SKILL = 2200

export type SummonCinematic = {
  enabled: boolean
  webm?: string
  mp4?: string
  poster?: string
  durationMs?: number
  titleOverride?: string
  frameTheme?: CinematicFrameTheme
  triggerSources?: CinematicTriggerSource[]
  cropX?: number   // 0..100 fokuso taškas X (object-position) vertikaliam (mobile) rėmui
  cropY?: number   // 0..100 fokuso taškas Y
  uploadedAt?: string
  updatedAt?: string
}

export type SkillCinematic = {
  enabled: boolean
  webm?: string
  mp4?: string
  poster?: string
  durationMs?: number
  titleOverride?: string
  frameTheme?: CinematicFrameTheme
  cropX?: number   // 0..100 fokuso taškas X (object-position) vertikaliam (mobile) rėmui
  cropY?: number   // 0..100 fokuso taškas Y
  uploadedAt?: string
  updatedAt?: string
}

// ── Čempiono skill (3 vnt; atrakinami pagal fazę: skill1=faze1, skill2=faze2, skill3=faze3) ──
export type ChampionSkill = { name?: string; mappings: EffectMapping[]; cinematic?: SkillCinematic }

// ── Atakos taikinio apribojimas (statinis padaro nustatymas) ─────────────────
export type AttackRestriction = 'unitsOnly' | 'championsOnly' | 'noPlayer' | 'playerOnly' | 'artifactsOnly'
export const ATTACK_RESTRICTIONS: { value: AttackRestriction; label: string }[] = [
  { value: 'unitsOnly',     label: 'Tik padarus' },
  { value: 'championsOnly', label: 'Tik Čempionus' },
  { value: 'noPlayer',      label: 'Negali pulti žaidėjo tiesiogiai' },
  { value: 'playerOnly',    label: 'Tik žaidėją tiesiogiai' },
  { value: 'artifactsOnly', label: 'Tik artefaktus' },
]

// ── Iškvietimo (summon) pilno lauko vizualūs efektai ─────────────────────────
export type SummonEffectType =
  | 'eclipse' | 'necroticSmoke' | 'lightning' | 'massFreeze'
  | 'fire' | 'explosion' | 'poisonCloud' | 'earthquake'
  | 'shadowSurge' | 'hellfire' | 'frostNova' | 'bloodRitual'
  | 'soulRelease' | 'voidRip' | 'plague' | 'arcaneDeto'
  | 'emberStorm' | 'boneEruption' | 'cursedBrand' | 'spectralWail'
  | 'moltenShatter' | 'deathPulse'

export const SUMMON_EFFECTS: { value: SummonEffectType; label: string; icon: string }[] = [
  { value: 'eclipse',       label: 'Tamsa (piktoji)',       icon: '🌑' },
  { value: 'shadowSurge',   label: 'Šešėlių antplūdis',     icon: '🌫️' },
  { value: 'voidRip',       label: 'Tuštumos plyšys',       icon: '🕳️' },
  { value: 'necroticSmoke', label: 'Nekrotinis dūmas',      icon: '💜' },
  { value: 'spectralWail',  label: 'Vaiduoklių aimana',     icon: '👻' },
  { value: 'soulRelease',   label: 'Sielų išlaisvinimas',   icon: '🕯️' },
  { value: 'deathPulse',    label: 'Mirties banga',         icon: '⚰️' },
  { value: 'boneEruption',  label: 'Kaulų išsiveržimas',    icon: '💀' },
  { value: 'lightning',     label: 'Nužaibavimas',          icon: '⚡' },
  { value: 'arcaneDeto',    label: 'Arkaninis sprogimas',   icon: '🔮' },
  { value: 'cursedBrand',   label: 'Prakeikimo ženklas',    icon: '🩸' },
  { value: 'bloodRitual',   label: 'Kraujo ritualas',       icon: '⛧' },
  { value: 'massFreeze',    label: 'Masinis užšaldymas',    icon: '❄️' },
  { value: 'frostNova',     label: 'Ledo nova',             icon: '🧊' },
  { value: 'fire',          label: 'Ugnis',                 icon: '🔥' },
  { value: 'hellfire',      label: 'Pragaro ugnis',         icon: '👹' },
  { value: 'emberStorm',    label: 'Žarijų audra',          icon: '✨' },
  { value: 'moltenShatter', label: 'Lavos skilimas',        icon: '🌋' },
  { value: 'explosion',     label: 'Sprogimas',             icon: '💥' },
  { value: 'poisonCloud',   label: 'Nuodų debesis',         icon: '☠️' },
  { value: 'plague',        label: 'Maras',                 icon: '🦠' },
  { value: 'earthquake',    label: 'Žemės drebėjimas',      icon: '🪨' },
]

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
  attackRestriction?: AttackRestriction  // padaras gali pulti tik tam tikrus taikinius
  ignoreTaunt?: boolean                  // gali pulti tiesiogiai – ignoruoja priešo Pasišaipymą (taunt)
  extraAttacks?: {                        // papildomos atakos per ėjimą (be šios bazinė = 1)
    base?: number                         // visada +N
    ifEnemyTaunt?: number                 // +N jei priešas turi bent 1 taunt kūrinį
    perEnemyTaunt?: number                // +N × priešo taunt kūrinių skaičius (dinaminis)
    ifNoEnemyCreatures?: number           // +N jei priešas neturi kūrinių
  }
  synergy?: {                             // veikia kai ŠIS ir partneris abu kovos lauke
    withNames?: string                    // partnerių kortų vardai (kableliais)
    withFaction?: number                  // arba bet kuris šios frakcijos narys (faction id)
    buffAttack?: number                   // +ATK kol abu lauke
    buffHealth?: number                   // +HP kol abu lauke
    keywords?: ('sprint' | 'taunt' | 'shield' | 'stealth')[]  // suteikiami raktažodžiai
  }
  canTriggerCurse?: boolean
  canTriggerZmk?: boolean
  animationType?: string
  soundType?: BattleSoundType
  voiceLines?: string[]            // iškvietimo balsai: keli mp3/ogg URL, grojami atsitiktinai per voiceManager
  summonCinematic?: SummonCinematic // Premium kino pop-up (Legendiniams/Čempionams) — žr. lib/game/cinematics.ts
  summonEffect?: SummonEffectType  // pilno lauko vizualus efektas iškviečiant kortą
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
