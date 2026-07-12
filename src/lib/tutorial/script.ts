// ── Tutorial scenarijus ───────────────────────────────────────────────────────
// Vedami žingsniai (pirmi 2 tavo ėjimai) + vienkartiniai mechanikos patarimai,
// pasirodantys pirmą kartą sutikus mechaniką laisvame žaidime.

export type TutAnchor =
  | 'center' | 'hand' | 'gold' | 'hp' | 'deck' | 'discard'
  | 'units-you' | 'units-ai' | 'zmk' | 'artifacts' | 'reactions'
  | 'field' | 'end-turn' | 'ai-area' | 'discard-gold'

// Žingsnis su require – laukiama žaidėjo veiksmo; be require – mygtukas „Toliau"
export type TutRequire = 'play-unit' | 'attack' | 'end-turn' | 'any-play'

export type TutStep = {
  id: string
  /** i18n raktai (battle.guided.*) – NE gatavas tekstas. */
  title: string
  text: string
  anchor: TutAnchor
  require?: TutRequire
}

export const GUIDED_STEPS: TutStep[] = [
  {
    id: 'welcome',
    title: 'battle.guided.welcome.title',
    text: 'battle.guided.welcome.text',
    anchor: 'center',
  },
  {
    id: 'goal',
    title: 'battle.guided.goal.title',
    text: 'battle.guided.goal.text',
    anchor: 'hp',
  },
  {
    id: 'zones',
    title: 'battle.guided.zones.title',
    text: 'battle.guided.zones.text',
    anchor: 'units-you',
  },
  {
    id: 'hand-intro',
    title: 'battle.guided.hand-intro.title',
    text: 'battle.guided.hand-intro.text',
    anchor: 'hand',
  },
  {
    id: 'gold-intro',
    title: 'battle.guided.gold-intro.title',
    text: 'battle.guided.gold-intro.text',
    anchor: 'gold',
  },
  {
    id: 'zmk-intro',
    title: 'battle.guided.zmk-intro.title',
    text: 'battle.guided.zmk-intro.text',
    anchor: 'zmk',
  },
  {
    id: 'play-first-unit',
    title: 'battle.guided.play-first-unit.title',
    text: 'battle.guided.play-first-unit.text',
    anchor: 'hand',
    require: 'play-unit',
  },
  {
    id: 'discard-gold-tip',
    title: 'battle.guided.discard-gold-tip.title',
    text: 'battle.guided.discard-gold-tip.text',
    anchor: 'discard-gold',
  },
  {
    id: 'end-first-turn',
    title: 'battle.guided.end-first-turn.title',
    text: 'battle.guided.end-first-turn.text',
    anchor: 'end-turn',
    require: 'end-turn',
  },
  {
    id: 'watch-ai',
    title: 'battle.guided.watch-ai.title',
    text: 'battle.guided.watch-ai.text',
    anchor: 'ai-area',
  },
  {
    id: 'turn2-attack',
    title: 'battle.guided.turn2-attack.title',
    text: 'battle.guided.turn2-attack.text',
    anchor: 'units-you',
    require: 'attack',
  },
  {
    id: 'free-play',
    title: 'battle.guided.free-play.title',
    text: 'battle.guided.free-play.text',
    anchor: 'center',
  },
]

// ── Vienkartiniai mechanikos patarimai (trigger -> patarimas) ─────────────────

export type TipKey =
  | 'zmk-special' | 'taunt' | 'sprint' | 'stealth' | 'shield'
  | 'battlecry' | 'lastwish' | 'status-frozen' | 'status-stunned'
  | 'status-burning' | 'status-poisoned' | 'status-silenced'
  | 'reaction' | 'field' | 'champion' | 'evolve' | 'hand-burn'
  | 'curse' | 'coin' | 'artifact' | 'unfavorable'

/** Reikšmės = i18n raktai (battle.tips.*). */
export const MECHANIC_TIPS: Record<TipKey, { title: string; text: string }> = {
  'zmk-special': {
    title: 'battle.tips.zmk-special.title',
    text: 'battle.tips.zmk-special.text',
  },
  taunt: {
    title: 'battle.tips.taunt.title',
    text: 'battle.tips.taunt.text',
  },
  sprint: {
    title: 'battle.tips.sprint.title',
    text: 'battle.tips.sprint.text',
  },
  stealth: {
    title: 'battle.tips.stealth.title',
    text: 'battle.tips.stealth.text',
  },
  shield: {
    title: 'battle.tips.shield.title',
    text: 'battle.tips.shield.text',
  },
  battlecry: {
    title: 'battle.tips.battlecry.title',
    text: 'battle.tips.battlecry.text',
  },
  lastwish: {
    title: 'battle.tips.lastwish.title',
    text: 'battle.tips.lastwish.text',
  },
  'status-frozen': {
    title: 'battle.tips.status-frozen.title',
    text: 'battle.tips.status-frozen.text',
  },
  'status-stunned': {
    title: 'battle.tips.status-stunned.title',
    text: 'battle.tips.status-stunned.text',
  },
  'status-burning': {
    title: 'battle.tips.status-burning.title',
    text: 'battle.tips.status-burning.text',
  },
  'status-poisoned': {
    title: 'battle.tips.status-poisoned.title',
    text: 'battle.tips.status-poisoned.text',
  },
  'status-silenced': {
    title: 'battle.tips.status-silenced.title',
    text: 'battle.tips.status-silenced.text',
  },
  reaction: {
    title: 'battle.tips.reaction.title',
    text: 'battle.tips.reaction.text',
  },
  field: {
    title: 'battle.tips.field.title',
    text: 'battle.tips.field.text',
  },
  champion: {
    title: 'battle.tips.champion.title',
    text: 'battle.tips.champion.text',
  },
  evolve: {
    title: 'battle.tips.evolve.title',
    text: 'battle.tips.evolve.text',
  },
  'hand-burn': {
    title: 'battle.tips.hand-burn.title',
    text: 'battle.tips.hand-burn.text',
  },
  curse: {
    title: 'battle.tips.curse.title',
    text: 'battle.tips.curse.text',
  },
  coin: {
    title: 'battle.tips.coin.title',
    text: 'battle.tips.coin.text',
  },
  artifact: {
    title: 'battle.tips.artifact.title',
    text: 'battle.tips.artifact.text',
  },
  unfavorable: {
    title: 'battle.tips.unfavorable.title',
    text: 'battle.tips.unfavorable.text',
  },
}
