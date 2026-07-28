#!/usr/bin/env node
/**
 * ── mappingNeedsSelection() tiesos lentelė ──────────────────────────────────
 *   node scripts/test-target-selection.mjs
 *
 * KODĖL ŠIS TESTAS YRA: ši funkcija sprendžia, ar UI prašys žaidėjo nurodyti
 * taikinį. Ji lūžo du kartus iš eilės — perkėlus `requiresSelection` patikrą per
 * aukštai, taikinio ėmė prašyti efektai, kurie jo neturi („Traukti kortas"),
 * o paskui ir AoE efektai („apsvaiginti visus priešo padarus"). Abu atvejai
 * praeidavo tipų tikrinimą ir lint'ą — sulaužymą pastebėdavo tik žaidėjas.
 *
 * Testas kompiliuoja TIKRĄ effectEngine.ts (ne kopiją) ir paleidžia atvejus.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = mkdtempSync(join(tmpdir(), 'rvn-sel-'))
const tsc = join(REPO, 'node_modules', 'typescript', 'bin', 'tsc')
if (!existsSync(tsc)) { console.error('✖ typescript nerastas node_modules'); process.exit(1) }

const cfg = join(OUT, 'tsconfig.json')
writeFileSync(cfg, JSON.stringify({
  compilerOptions: {
    target: 'ES2020', module: 'CommonJS', moduleResolution: 'node', esModuleInterop: true,
    skipLibCheck: true, noEmitOnError: false, strict: false, jsx: 'react-jsx',
    outDir: join(OUT, 'out'), baseUrl: REPO, paths: { '@/*': ['src/*'] },
  },
  files: [join(REPO, 'src/lib/game/effectEngine.ts')],
}))
try { execFileSync(process.execPath, [tsc, '-p', cfg], { stdio: 'pipe' }) } catch { /* tipų klaidos nekliudo emit'ui */ }

const emitted = join(OUT, 'out', 'game', 'effectEngine.js')
if (!existsSync(emitted)) { console.error('✖ nepavyko sukompiliuoti effectEngine.ts'); process.exit(1) }

// tsc emit'e lieka „@/..." alias'ai — nukreipiam juos į sukompiliuotus failus / locales
const require_ = createRequire(pathToFileURL(join(OUT, 'x.cjs')))
const Module = require_('module')
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, ...rest) {
  if (req.startsWith('@/locales/')) req = join(REPO, 'src', req.slice(2))
  else if (req.startsWith('@/lib/')) req = join(OUT, 'out', req.slice('@/lib/'.length))
  return origResolve.call(this, req, ...rest)
}
const { mappingNeedsSelection } = require_(emitted)

const CASES = [
  ['AoE: apsvaiginti visus priešo padarus (+ užsilikęs requiresSelection)', { trigger: 'onSummon', effect: 'stun', target: 'allEnemyUnits', requiresSelection: true }, false],
  ['AoE: žala visiems padarams', { trigger: 'onCast', effect: 'damage', target: 'allUnits', requiresSelection: true }, false],
  ['AoE: buff visiems saviems', { trigger: 'onSummon', effect: 'buffAttack', target: 'allOwnUnits', requiresSelection: true }, false],
  ['Be taikinio: traukti kortas', { trigger: 'onSummon', effect: 'drawCards', target: 'ownPlayer', requiresSelection: true }, false],
  ['Be taikinio: auksas', { trigger: 'onSummon', effect: 'gainGold', target: 'ownPlayer', requiresSelection: true }, false],
  ['Be taikinio: išmesti kortas', { trigger: 'onCast', effect: 'discard', target: 'enemyPlayer', requiresSelection: true }, false],
  ['Be taikinio: ŽMK perkėlimas', { trigger: 'onCast', effect: 'remapZmkValue', target: 'ownPlayer', requiresSelection: true }, false],
  ['Be taikinio: kortos kainos nuolaida', { trigger: 'onCast', effect: 'turnCostDiscount', target: 'ownPlayer', requiresSelection: true }, false],
  // Iškvietimai patys renkasi KORTĄ atskiru langu (summonChoose), o ne lentos
  // taikinį — todėl net su „Žaidėjas renkasi" taikinio prašyti negalima.
  ['Iškvietimas iš kaladės + užsilikęs requiresSelection', { trigger: 'onSummon', effect: 'summonFromDeck', target: 'ownUnit', requiresSelection: true }, false],
  ['Iškvietimas iš kapinyno + užsilikęs requiresSelection', { trigger: 'onDeath', effect: 'summonFromGraveyard', target: 'ownUnit', requiresSelection: true }, false],
  ['Prikėlimas + užsilikęs requiresSelection', { trigger: 'onDeath', effect: 'revive', target: 'ownUnit', requiresSelection: true }, false],
  ['Rankinis: sunaikinti 2 padarus (zombis golemas)', { trigger: 'onDeath', effect: 'destroy', target: 'enemyUnit', requiresSelection: true, hitCount: 2 }, true],
  ['Rankinis: gydymas pasirinktam (help + aiškus žymėjimas)', { trigger: 'onSummon', effect: 'heal', target: 'ownUnit', requiresSelection: true }, true],
  ['Nutylėjimas: žala vienam priešo padarui', { trigger: 'onCast', effect: 'damage', target: 'enemyUnit' }, true],
  ['Nutylėjimas atšauktas: žala, bet auto', { trigger: 'onCast', effect: 'damage', target: 'enemyUnit', requiresSelection: false }, false],
  ['Reakcija naudoja trigerio šaltinį', { trigger: 'onAnyPlay', effect: 'damage', target: 'enemyUnit', useTriggerSource: true, requiresSelection: true }, false],
  ['Nutylėjimas: gydymas savam (help → auto)', { trigger: 'onSummon', effect: 'heal', target: 'ownUnit' }, false],
  ['Prikelti be aiškaus žymėjimo → auto', { trigger: 'onDeath', effect: 'revive', target: 'ownUnit' }, false],
  ['Kovos šūksnis: iškviesti padarą (Elė) – be taikinio', { trigger: 'onSummon', effect: 'summonAdvanced', target: 'ownUnit', requiresSelection: true, summonChoose: true }, false],
]

let bad = 0
for (const [name, m, want] of CASES) {
  const got = mappingNeedsSelection(m)
  if (got !== want) { bad++; console.error(`✖ ${name}\n    laukta ${want}, gauta ${got}`) }
  else console.log(`✓ ${name}`)
}
console.log(bad === 0 ? `\n✓ Taikinio parinkimas: ${CASES.length} atvejai OK` : `\n✖ Nepraėjo: ${bad}`)
process.exit(bad ? 1 : 0)
