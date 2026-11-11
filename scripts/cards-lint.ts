// ── Visų kortų gameplay patikra prieš prod DB ────────────────────────────────
// Paleidimas:  npm run cards:lint            (visos aktyvios kortos; klaidos + įspėjimai)
//              npm run cards:lint -- --errors   (tik klaidos)
//              npm run cards:lint -- --selftest (taisyklių savikontrolė be tinklo)
// Skaito NEXT_PUBLIC_SUPABASE_URL / ANON_KEY iš .env.local (tik skaitymas).
// Išėjimo kodas 1, jei yra klaidų – tinka prieš release.
import { existsSync, readFileSync } from 'node:fs'
import { lintCardGameplay, lintSummary, type LintIssue } from '../src/lib/cards/gameplayLint'

const args = process.argv.slice(2)
if (args.includes('--selftest')) {
  let pass = 0, fail = 0
  const has = (iss: LintIssue[], code: string) => iss.some((i) => i.code === code)
  const check = (name: string, cond: boolean) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗ FAIL:', name) } }
  const M = (o: Record<string, unknown>) => ({ trigger: 'onSummon', effect: 'damage', target: 'enemyUnit', value: 1, ...o })
  check('švari korta – be pastabų', lintCardGameplay({ typeName: 'Padaras', effectText: 'Kovos šūksnis: 1 žala', gameplay: { effectMappings: [M({})] } }).length === 0)
  check('negyvas trigeris', has(lintCardGameplay({ typeName: 'Padaras', gameplay: { effectMappings: [M({ trigger: 'onDamageDealt' })] } }), 'deadTrigger'))
  check('nežinomas taikinys', has(lintCardGameplay({ gameplay: { effectMappings: [M({ target: 'nesamas' })] } }), 'unknownTarget'))
  check('chooseEffect be variantų', has(lintCardGameplay({ gameplay: { effectMappings: [M({ effect: 'chooseEffect' })] } }), 'chooseEmpty'))
  check('šaka be efekto (coinRed)', has(lintCardGameplay({ gameplay: { effectMappings: [M({ effect: 'coinFlip', coinRed: [{ target: 'self' }] })] } }), 'noEffect'))
  check('reikšmė nenurodyta šakoje', has(lintCardGameplay({ gameplay: { effectMappings: [M({ effect: 'coinFlip', coinGreen: [{ effect: 'drawCards', target: 'self' }] })] } }), 'valueMissing'))
  check('prakeiksmas be onCurseDrawn', has(lintCardGameplay({ typeName: 'Prakeiksmas', gameplay: { effectMappings: [M({ trigger: 'onPlay' })] } }), 'curseTrigger'))
  check('laukas su effectMappings', has(lintCardGameplay({ typeName: 'Laukas', gameplay: { effectMappings: [M({})] } }), 'fieldEffectMappings'))
  check('extraAttacks burtui', has(lintCardGameplay({ typeName: 'Burtas', gameplay: { extraAttacks: { base: 1 }, spellType: 'x' } }), 'extraAttacksNonUnit'))
  check('tekstas be konfigūracijos', has(lintCardGameplay({ typeName: 'Padaras', effectText: 'Kai atakuoja, negauna atgalinės žalos.', gameplay: {} }), 'textNoConfig'))
  check('vien raktažodis tekste – ne klaida', !has(lintCardGameplay({ typeName: 'Padaras', effectText: 'Pasišaipymas, Sprintas.', gameplay: {} }), 'textNoConfig'))
  check('Įsiūtis skaitosi kaip konfigūracija', !has(lintCardGameplay({ typeName: 'Padaras', effectText: 'Kol sužeistas +3', gameplay: { passiveAura: { enrageAttack: 3 } } }), 'textNoConfig'))
  check('čempiono gebėjimų efektai tikrinami', has(lintCardGameplay({ typeName: 'Čempionas', gameplay: { championSkillConfig: { skills: [{ name: 'a', mappings: [{ trigger: 'onChampionSkill', effect: 'nesamas', target: 'self' }] }] } } }), 'unknownEffect'))
  console.log(`\n${pass} ✓ / ${fail} ✗`); process.exit(fail ? 1 : 0)
}

const env: Record<string, string> = {}
for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
}
const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) { console.error('Trūksta NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (.env.local)'); process.exit(2) }

type Row = { name: string; card_number: string | null; effect_text: string | null; gameplay: unknown; card_types: { name: string } | null }
const rows: Row[] = []
const sel = encodeURIComponent('name,card_number,effect_text,gameplay,card_types(name)')
for (let from = 0; ; from += 1000) {
  const r = await fetch(`${url}/rest/v1/cards?select=${sel}&status=eq.active&order=name`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` } })
  if (!r.ok) { console.error('DB klaida', r.status, (await r.text()).slice(0, 200)); process.exit(2) }
  const d = (await r.json()) as Row[]
  rows.push(...d); if (d.length < 1000) break
}

const onlyErrors = args.includes('--errors')
let cardsWithErr = 0, cardsWithWarn = 0, totalErr = 0, totalWarn = 0
const byCode = new Map<string, number>()
for (const c of rows) {
  const issues = lintCardGameplay({ name: c.name, typeName: c.card_types?.name ?? null, effectText: c.effect_text, gameplay: c.gameplay })
  const shown = onlyErrors ? issues.filter((i) => i.level === 'error') : issues
  const { errors, warns } = lintSummary(issues)
  totalErr += errors; totalWarn += warns
  if (errors) cardsWithErr++; else if (warns) cardsWithWarn++
  for (const i of issues) byCode.set(i.code, (byCode.get(i.code) ?? 0) + 1)
  if (shown.length === 0) continue
  console.log(`\n${errors ? '✗' : '⚠'} ${c.name}  [${c.card_types?.name ?? '?'}]`)
  for (const i of shown) console.log(`    ${i.level === 'error' ? 'KLAIDA ' : 'pastaba'}  ${i.msg}`)
}
console.log(`\n══ ${rows.length} aktyvių kortų: ${cardsWithErr} su klaidomis (${totalErr}), ${cardsWithWarn} tik su pastabomis (${totalWarn}) ══`)
console.log([...byCode.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `   ${String(n).padStart(4)}  ${k}`).join('\n'))
process.exit(totalErr > 0 ? 1 : 0)
