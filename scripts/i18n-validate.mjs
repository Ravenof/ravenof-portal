#!/usr/bin/env node
// ── Ravenof i18n validacija: npm run i18n:validate ───────────────────────────
// Kategorijos ataskaitoje:
//   ERROR                – blokuoja (parity, interpolacija, raktų nutekėjimas kode,
//                          nežinomi raktai, LT „hardcode" UI eilutėse)
//   WARNING              – įtartina (nenaudojami raktai, LT skaičių priesagos)
//   CONTENT MISSING      – trūksta EN turinio/asset'o (DB / PNG) → fallback LT
//   INTENTIONAL EXCLUSION – kortų vardai, kaladžių vardai, kanoniniai vardai
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = join(REPO, 'src', 'locales')
const SRC_DIR = join(REPO, 'src')
const report = { ERROR: [], WARNING: [], 'CONTENT MISSING': [], 'INTENTIONAL EXCLUSION': [] }
const add = (cat, msg) => report[cat].push(msg)
const SRC = 'lt', TARGETS = ['en']

const flat = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  typeof v === 'object' && v !== null ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]])
const params = (s) => [...String(s).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(',')
// pluralinius variantus lyginti pagal bazinį raktą (lt turi _few/_many, en – ne)
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '')

let errors = 0, warnings = 0
const files = readdirSync(join(ROOT, SRC)).filter((f) => f.endsWith('.json'))

for (const f of files) {
  const lt = Object.fromEntries(flat(JSON.parse(readFileSync(join(ROOT, SRC, f), 'utf8'))))
  for (const target of TARGETS) {
    let tr
    try { tr = Object.fromEntries(flat(JSON.parse(readFileSync(join(ROOT, target, f), 'utf8')))) }
    catch { console.error(`✖ [${target}] trūksta failo ${f}`); errors++; continue }
    const ltBases = new Set(Object.keys(lt).map(base))
    const trBases = new Set(Object.keys(tr).map(base))
    for (const b of ltBases) if (!trBases.has(b)) { console.error(`✖ [${target}/${f}] trūksta rakto: ${b}`); errors++ }
    for (const b of trBases) if (!ltBases.has(b)) { console.warn(`⚠ [${target}/${f}] perteklinis raktas: ${b}`); warnings++ }
    for (const [k, v] of Object.entries(tr)) {
      if (v === '' || v == null) { console.error(`✖ [${target}/${f}] tuščia reikšmė: ${k}`); errors++ }
      const ltv = lt[k] ?? lt[base(k) + '_other'] ?? lt[base(k)]
      if (ltv !== undefined && params(ltv) !== params(v)) {
        console.error(`✖ [${target}/${f}] parametrų neatitikimas "${k}": lt(${params(ltv)}) vs ${target}(${params(v)})`); errors++
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2) KODO PATIKROS: raktų nutekėjimas, nežinomi raktai, LT hardcode, skaičiai
// ══════════════════════════════════════════════════════════════════════════════
const LOCALES = Object.fromEntries(files.map((f) => [f.replace('.json', ''),
  JSON.parse(readFileSync(join(ROOT, SRC, f), 'utf8'))]))
const ALL_KEYS = new Set(files.flatMap((f) =>
  flat(JSON.parse(readFileSync(join(ROOT, SRC, f), 'utf8'))).map(([k]) => `${f.replace('.json', '')}.${k}`)))
const KEY_BASES = new Set([...ALL_KEYS].map(base))

// /digital apimtis (kaip i18n-scan-lt.mjs)
const INCLUDE = ['src/app/digital', 'src/components/digital', 'src/components/tutorial', 'src/components/social',
  'src/lib/i18n', 'src/lib/digital', 'src/lib/gamification', 'src/lib/tutorial', 'src/lib/tutorial2',
  'src/lib/social', 'src/lib/cards', 'src/lib/ranked', 'src/lib/rewards']
const SKIP_FILES = [
  'src/components/digital/Team2v2Game.tsx', 'src/components/digital/DigitalCoop.tsx',
  'src/components/digital/DigitalPvp2v2.tsx', 'src/lib/ranked/bots.ts',
  'src/lib/ranked/achievements.ts', 'src/lib/digital/starterMeta.ts',
  'src/components/tutorial/PracticeButton.tsx', 'src/components/tutorial/ArenaBackground.tsx',
  'src/lib/tutorial/engine.ts', 'src/lib/i18n/config.ts',
]
const SKIP_PREFIX = ['src/lib/tutorial/ai/', 'src/components/digital/campaign/', 'src/lib/tutorial2/seedRebuild']

// Sąmoningos išimtys su priežastimi (rodomos „INTENTIONAL EXCLUSION")
const ALLOWLIST = [
  { file: 'src/components/digital/onboarding/StarterDeckOnboarding.tsx', contains: 'TYPE_ORDER', reason: 'card-type-logic-key' },
  { file: 'src/components/tutorial/TutorialGame.tsx', contains: 'ŽMK ${', reason: 'game-term-zmk' },
  { file: 'src/components/tutorial2/TutorialHub.tsx', contains: 'enemyName', reason: 'db-content-faction-name' },
]

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const rel = relative(REPO, p).replace(/\\/g, '/')
    if (rel.includes('.fuse_hidden')) continue
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(p)) out.push(rel)
  }
  return out
}
const inScope = (rel) => INCLUDE.some((i) => rel.startsWith(i)) && !SKIP_FILES.includes(rel) && !SKIP_PREFIX.some((p) => rel.startsWith(p))
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')

// LT žodynas (be diakritikų irgi!) — bendriniai UI žodžiai
const LT_WORDS = /\b(Atsiimt\w*|Turima|Naudojama|Naudoti|Pirkti|PIRKTI|Atpl[ėe]\w*|Turinys|TURINYS|Aktyvi|AKTYVI|Redaguoti|Lygis|LYGIS|Nemok\w*|Pasas|PASAS|Nugar[ėe]l\w*|Avataras|Sezono|Kraunama|Saugoma|kort[ųu]|pak\.|Pradėti|Reitingas|Draugiška|Prieš AI|Žaisti)\b/
const LT_CHARS = /[ąčęėįšųūžĄČĘĖĮŠŲŪŽ]/

for (const rel of walk(SRC_DIR)) {
  if (!inScope(rel)) continue
  const raw = readFileSync(join(REPO, rel), 'utf8')
  const code = strip(raw)

  // (a) nežinomi raktai: t('ns.key') kurio nėra locales
  for (const m of code.matchAll(/\bt(?:Global|t)?\(\s*'([a-z][\w.-]*\.[\w.-]+)'/g)) {
    const k = m[1]
    if (!ALL_KEYS.has(k) && !KEY_BASES.has(k) && !k.startsWith('battleLog.err.')) {
      add('ERROR', `nežinomas raktas ${k} (${rel})`)
    }
  }
  // (b) raktų nutekėjimas: raktas paduotas į JSX be t()  → {SOMETHING_KEY} arba .toUpperCase() ant rakto
  for (const m of code.matchAll(/\{([A-Z_]+\[[^\]]+\])(\.toUpperCase\(\))?\}/g)) {
    add('WARNING', `galimas rakto nutekėjimas: ${m[1]} (${rel}) — patikrink ar apgaubta t()`)
  }
  // (c) LT tekstas JSX/eilutėse (tik matomas tekstas: eilutės literalai ir JSX turinys)
  code.split('\n').forEach((line, i) => {
    if (/^\s*import\s/.test(line) || /console\.(warn|error|log|info)/.test(line)) return
    const allow = ALLOWLIST.find((a) => a.file === rel && line.includes(a.contains))
    if (allow) { add('INTENTIONAL EXCLUSION', `${rel}:${i + 1} — ${allow.reason}`); return }
    const strings = [...line.matchAll(/(['"`])((?:(?!\1)[^\\])*)\1/g)].map((m) => m[2])
    const jsxText = [...line.matchAll(/>([^<>{}]{2,})</g)].map((m) => m[1])
    const visible = [...strings, ...jsxText].filter((v) => !/^[\w./#?=+-]*$/.test(v))
    const hit = visible.find((v) => LT_CHARS.test(v) || LT_WORDS.test(v))
    if (hit) add('ERROR', `LT tekstas kode: ${rel}:${i + 1} → „${hit.trim().slice(0, 60)}"`)
  })
  // (d) LT skaičių priesagos šablonuose
  for (const m of code.matchAll(/`[^`]*\$\{[^}]+\}\s*(kort[ųu]|pak\.|d\.|val\.)/g)) {
    add('WARNING', `LT skaičiaus priesaga šablone (${rel}) — naudok pluralinį raktą`)
  }
}

// (e) nenaudojami raktai (dinamiškai sudaromi raktai – praleidžiami)
const codeAll = walk(SRC_DIR).filter((r) => !r.includes('.fuse_hidden')).map((r) => readFileSync(join(REPO, r), 'utf8')).join('\n')
// dinaminiai prefiksai: `battleLog.playUnit.${...}` / `statusEffects.${st}.name`
const DYN = new Set()
for (const m of codeAll.matchAll(/[`'"]([\w]+(?:\.[\w]+)*)\.?\$\{/g)) DYN.add(m[1])
for (const m of codeAll.matchAll(/[`'"]([\w]+)\.\$\{/g)) DYN.add(m[1])
const isDynamic = (k) => [...DYN].some((d) => k === d || k.startsWith(d + '.'))
for (const k of KEY_BASES) {
  if (isDynamic(k)) continue
  const short = k.split('.').slice(1).join('.')
  if (!codeAll.includes(`'${k}'`) && !codeAll.includes(`\`${k}\``) && !codeAll.includes(short)) {
    add('WARNING', `nenaudojamas raktas: ${k}`)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3) LOKALIZUOTI ASSET'AI (PNG su įkeptu tekstu)
// ══════════════════════════════════════════════════════════════════════════════
try {
  const reg = readFileSync(join(REPO, 'src/lib/i18n/assets.ts'), 'utf8')
  for (const m of reg.matchAll(/(\w+):\s*\{\s*lt:\s*'([^']+)',\s*en:\s*(null|'[^']+'),\s*bakedText:\s*(true|false)/g)) {
    const [, key, ltPath, enRaw, baked] = m
    if (baked === 'true' && enRaw === 'null') {
      add('CONTENT MISSING', `EN asset'o nėra: ${key} (LT: ${ltPath}) → EN režime rodomas HTML tekstas`)
    } else if (enRaw !== 'null') {
      const f = enRaw.slice(1, -1).split('?')[0]
      if (!existsSync(join(REPO, 'public', f))) add('ERROR', `EN asset'as registre yra, bet failo nėra: ${f}`)
    }
  }
} catch { /* registro nėra */ }

// ══════════════════════════════════════════════════════════════════════════════
// 4) SĄMONINGOS IŠIMTYS
// ══════════════════════════════════════════════════════════════════════════════
add('INTENTIONAL EXCLUSION', 'kortų vardai — verčiami atskirai (card_translations, npm run cards:i18n)')
add('INTENTIONAL EXCLUSION', 'žaidėjų kaladžių vardai — vartotojo turinys, neverčiami')
add('INTENTIONAL EXCLUSION', 'kanoniniai personažų vardai — paliekami originalūs')
add('INTENTIONAL EXCLUSION', 'pokalbių žinutės — vartotojo turinys')
add('INTENTIONAL EXCLUSION', 'server metadata.title (LT) — vertimas padarytų route dynamic')

// ── Ataskaita ────────────────────────────────────────────────────────────────
for (const cat of ['ERROR', 'WARNING', 'CONTENT MISSING', 'INTENTIONAL EXCLUSION']) {
  const list = report[cat]
  if (!list.length) continue
  console.log(`\n── ${cat} (${list.length}) ──`)
  for (const m of list.slice(0, cat === 'WARNING' ? 40 : 200)) console.log(`  ${m}`)
  if (list.length > 40 && cat === 'WARNING') console.log(`  … dar ${list.length - 40}`)
}
errors += report.ERROR.length
warnings += report.WARNING.length

const total = files.reduce((s, f) => s + flat(JSON.parse(readFileSync(join(ROOT, SRC, f), 'utf8'))).length, 0)
console.log(`\ni18n: ${files.length} namespace, ${total} LT raktų · ERROR: ${errors} · WARNING: ${warnings} · CONTENT MISSING: ${report['CONTENT MISSING'].length}`)
process.exit(errors ? 1 : 0)
