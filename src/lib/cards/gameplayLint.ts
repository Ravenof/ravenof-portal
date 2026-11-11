// ── Kortos gameplay konfigūracijos patikra (lint) ────────────────────────────
// Viena taisyklių vieta: naudoja admin kortos redaktorius (gyvas įspėjimų blokas)
// ir `npm run cards:lint` (visa prod DB). Tikrina tai, ką variklis REALIAI vykdo –
// kad „sumapinta, bet neveikia" kortos nebesikauptų (auditas 2026-11-11).
import { EFFECT_TYPES, TRIGGER_TYPES, TARGET_TYPES, type EffectMapping } from '@/lib/game/types'

export type LintLevel = 'error' | 'warn'
export type LintIssue = { level: LintLevel; code: string; msg: string }

/** Trigeriai, kurie yra tipų sąraše, bet variklis jų niekada nešauna. */
export const DEAD_TRIGGERS: ReadonlySet<string> = new Set(['onDamageDealt', 'onDamageReceived', 'onHeal', 'onDiscard', 'onArtifactActivated', 'custom'])
/** Kuo pakeisti negyvą trigerį (rodoma įspėjime). */
const DEAD_HINT: Record<string, string> = {
  onDamageDealt: 'naudok „Po atakos" (onAfterAttack)',
  onDamageReceived: 'naudok „Kai BET KAS gauna žalą" + varnelę „Tik kai žalą gauna ŠI korta", arba Įsiūtį (passiveAura.enrageAttack)',
  onHeal: 'naudok „Kai BET KAS pagydomas" + varnelę „Tik kai pagydoma ŠI korta"',
  onDiscard: 'naudok „Kai BET KAS išmeta kortą" (onAnyDiscard)',
}

const EFFECTS = new Set<string>(EFFECT_TYPES.map((e) => e.value))
const NEEDS_VALUE = new Set<string>(EFFECT_TYPES.filter((e) => e.needsValue).map((e) => e.value))
const TRIGGERS = new Set<string>(TRIGGER_TYPES.map((t) => t.value))
const TARGETS = new Set<string>(TARGET_TYPES.map((t) => t.value))

type Loose = Record<string, unknown>
export type LintCard = {
  name?: string | null
  /** Kortos tipo pavadinimas (Padaras / Burtas / Laukas / Artefaktas / Reakcija / Prakeiksmas / Čempionas). Nežinant – tipo taisyklės praleidžiamos. */
  typeName?: string | null
  effectText?: string | null
  gameplay?: unknown
}

const BRANCH_KEYS = ['then', 'noTargetThen', 'chooseAlt', 'coinGreen', 'coinRed'] as const

function walk(m: unknown, path: string, top: boolean, cb: (m: Loose, path: string, top: boolean) => void): void {
  if (!m || typeof m !== 'object') return
  const x = m as Loose
  cb(x, path, top)
  for (const k of BRANCH_KEYS) {
    const v = x[k]
    if (Array.isArray(v)) v.forEach((c, i) => walk(c, `${path}.${k}[${i}]`, false, cb))
    else if (v && typeof v === 'object') walk(v, `${path}.${k}`, false, cb)
  }
  if (Array.isArray(x.chooseOne)) {
    x.chooseOne.forEach((br, i) => (Array.isArray(br) ? br : [br]).forEach((c, j) => walk(c, `${path}.variantas${i + 1}[${j}]`, false, cb)))
  }
}

const KEYWORD_ONLY = /^((pasišaipymas|sprintas|sėlinimas|magišk\S* skydas|skydas|kovos šūksnis|paskutinis noras)[\s,.;:–-]*)+$/i

/** Grąžina kortos konfigūracijos problemas. Tuščias masyvas = švaru. */
export function lintCardGameplay(card: LintCard): LintIssue[] {
  const out: LintIssue[] = []
  const add = (level: LintLevel, code: string, msg: string) => { out.push({ level, code, msg }) }
  const g = (card.gameplay && typeof card.gameplay === 'object' ? card.gameplay : {}) as Loose
  const type = card.typeName ?? null
  const text = (card.effectText ?? '').trim()

  const tops: { m: unknown; where: string }[] = []
  const em = Array.isArray(g.effectMappings) ? g.effectMappings : []
  em.forEach((m, i) => tops.push({ m, where: `efektas ${i + 1}` }))
  const art = (g.artifactEffectConfig as Loose | undefined)?.mappings
  if (Array.isArray(art)) art.forEach((m, i) => tops.push({ m, where: `artefakto efektas ${i + 1}` }))
  const fld = (g.fieldEffectConfig as Loose | undefined)?.triggers
  if (Array.isArray(fld)) fld.forEach((m, i) => tops.push({ m, where: `lauko trigeris ${i + 1}` }))
  const skills = (g.championSkillConfig as Loose | undefined)?.skills
  if (Array.isArray(skills)) skills.forEach((s, si) => { const ms = (s as Loose)?.mappings; if (Array.isArray(ms)) ms.forEach((m, i) => tops.push({ m, where: `gebėjimas ${si + 1}, efektas ${i + 1}` })) })

  const triggers = new Set<string>()
  for (const { m, where } of tops) {
    walk(m, where, true, (x, path, top) => {
      const eff = x.effect as string | undefined
      const tr = x.trigger as string | undefined
      const tg = x.target as string | undefined
      const tts = Array.isArray(x.targetTypes) ? (x.targetTypes as string[]) : []
      if (!eff) add('error', 'noEffect', `${path}: nenurodytas efektas – ši dalis nieko nedarys`)
      else if (!EFFECTS.has(eff)) add('error', 'unknownEffect', `${path}: nežinomas efektas „${eff}"`)
      if (top) {
        if (!tr) add('error', 'noTrigger', `${path}: nenurodytas trigeris`)
        else if (!TRIGGERS.has(tr)) add('error', 'unknownTrigger', `${path}: nežinomas trigeris „${tr}"`)
        else if (DEAD_TRIGGERS.has(tr)) add('error', 'deadTrigger', `${path}: trigerio „${tr}" variklis niekada nešauna – efektas NEVEIKS${DEAD_HINT[tr] ? ` (${DEAD_HINT[tr]})` : ''}`)
        if (tr) triggers.add(tr)
      }
      if (tg && !TARGETS.has(tg)) add('error', 'unknownTarget', `${path}: nežinomas taikinys „${tg}"`)
      for (const t of tts) if (!TARGETS.has(t)) add('error', 'unknownTarget', `${path}: nežinomas taikinys „${t}"`)
      if (eff && !tg && tts.length === 0) add('warn', 'noTarget', `${path}: „${eff}" be taikinio`)
      if (eff && NEEDS_VALUE.has(eff) && !x.dynamicValue) {
        if (x.value === 0) add('warn', 'valueZero', `${path}: „${eff}" su reikšme 0`)
        else if (x.value == null) add('warn', 'valueMissing', `${path}: „${eff}" be reikšmės (bus naudojama 1)`)
      }
      if (eff === 'chooseEffect' && !(Array.isArray(x.chooseOne) && x.chooseOne.length > 0)) add('error', 'chooseEmpty', `${path}: „pasirink vieną" be variantų`)
      if (eff === 'coinFlip' && !x.coinGreen && !x.coinRed) add('error', 'coinEmpty', `${path}: monetos metimas be šakų`)
      if (x.triggerOnSelfTarget && top && tr && tr !== 'onAnyCast' && tr !== 'onAnyDamage' && tr !== 'onAnyHeal') add('warn', 'selfTargetIgnored', `${path}: „tik ŠI korta" veikia tik su onAnyCast / onAnyDamage / onAnyHeal`)
      if (x.oncePerTurn && top && tr && !tr.startsWith('onAny')) add('warn', 'oncePerTurnIgnored', `${path}: „kartą per ėjimą" veikia tik su globaliais (onAny…) trigeriais`)
    })
  }

  // ── Tipo taisyklės ──
  const pa = g.passiveAura as Loose | undefined
  const hasPassiveAura = !!pa && Object.keys(pa).length > 0
  if (type === 'Prakeiksmas' && tops.length > 0 && !triggers.has('onCurseDrawn')) add('error', 'curseTrigger', 'Prakeiksmas be „onCurseDrawn" trigerio – jis nežaidžiamas iš rankos, tad efektas nesuveiks')
  if (type === 'Laukas') {
    if (em.length > 0) add('error', 'fieldEffectMappings', 'Lauko kortos „effectMappings" variklis nevykdo – naudok lauko trigerius (fieldEffectConfig)')
    if (hasPassiveAura) add('error', 'fieldPassiveAura', 'Lauko kortai „passiveAura" neveikia – naudok lauko pasyvus (fieldEffectConfig.passive)')
  }
  if (type && type !== 'Padaras' && type !== 'Čempionas' && g.extraAttacks) add('error', 'extraAttacksNonUnit', '„Papildomos atakos" skaitomos tik padarams')
  if (type === 'Padaras' && triggers.has('onPlay') && !triggers.has('onSummon')) add('warn', 'unitOnPlay', 'Padaras su „onPlay" vietoj „onSummon" – nesuveiks, jei bus iškviestas efektu')
  if (type === 'Burtas' && !g.spellType) add('warn', 'spellNoType', 'Burtas be burto tipo – „onAnyCast" filtrai pagal tipą jo nemato')
  if (type === 'Reakcija' && tops.length === 0) add('warn', 'reactionNoMapping', 'Reakcija be efektų – veiks tik senas teksto parseris')
  if (type === 'Čempionas' && Array.isArray(skills)) {
    const empty = skills.filter((s) => !Array.isArray((s as Loose)?.mappings) || ((s as Loose).mappings as unknown[]).length === 0).length
    if (skills.length > 0 && empty === skills.length) add('warn', 'champNoSkills', 'Čempionas be nė vieno sumapinto gebėjimo')
  }

  // ── Tekstas vs konfigūracija ──
  const hasAnyConfig = tops.length > 0 || hasPassiveAura || !!g.extraAttacks || !!(g.fieldEffectConfig as Loose | undefined)?.passive
    || !!g.attackRestriction || !!g.ignoreTaunt || !!g.retreatAtHp || !!g.secondAttackVsShield
  if (text && !hasAnyConfig && !KEYWORD_ONLY.test(text)) add('error', 'textNoConfig', 'Korta turi efekto tekstą, bet jokios konfigūracijos – žaidime ji be efekto')
  if (text && tops.length > 0) {
    if (/kovos šūksnis/i.test(text) && !triggers.has('onSummon') && !triggers.has('onPlay')) add('warn', 'battlecryNoTrigger', 'Tekste „Kovos šūksnis", bet nėra onSummon / onPlay efekto')
    if (/paskutinis noras/i.test(text) && !triggers.has('onDeath')) add('warn', 'lastwishNoTrigger', 'Tekste „Paskutinis noras", bet nėra onDeath efekto')
  }
  if (g.needsEffectMapping && hasAnyConfig) add('warn', 'needsFlagStale', 'Varnelė „reikia sumapinti" dar uždėta, nors konfigūracija jau yra')
  return out
}

export function lintSummary(issues: LintIssue[]): { errors: number; warns: number } {
  let errors = 0, warns = 0
  for (const i of issues) { if (i.level === 'error') errors++; else warns++ }
  return { errors, warns }
}
export type { EffectMapping }
