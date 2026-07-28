#!/usr/bin/env node
/**
 * ── detectKeywords() tiesos lentelė ─────────────────────────────────────────
 *   node scripts/test-keyword-detection.mjs
 *
 * KODĖL: raktažodžiai spėjami iš kortos teksto. Kortos, kurios Pasišaipymą ar
 * Magišką skydą mini kaip TAIKINĮ („sunaikina padarą su Pasišaipymu"), tą
 * raktažodį gaudavo pačios. Testas saugo abi puses: kad taikinio paminėjimas
 * NEsuteiktų savybės, o tikra savybė tekste – suteiktų.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = mkdtempSync(join(tmpdir(), 'rvn-kw-'))
const tsc = join(REPO, 'node_modules', 'typescript', 'bin', 'tsc')
if (!existsSync(tsc)) { console.error('✖ typescript nerastas'); process.exit(1) }
const cfg = join(OUT, 'tsconfig.json')
writeFileSync(cfg, JSON.stringify({
  compilerOptions: { target: 'ES2020', module: 'CommonJS', moduleResolution: 'node', esModuleInterop: true,
    skipLibCheck: true, noEmitOnError: false, strict: false, jsx: 'react-jsx',
    outDir: join(OUT, 'out'), baseUrl: REPO, paths: { '@/*': ['src/*'] } },
  files: [join(REPO, 'src/lib/tutorial/engine.ts')],
}))
try { execFileSync(process.execPath, [tsc, '-p', cfg], { stdio: 'pipe' }) } catch { /* tipų klaidos nekliudo emit'ui */ }
const emitted = join(OUT, 'out', 'tutorial', 'engine.js')
if (!existsSync(emitted)) { console.error('✖ nepavyko sukompiliuoti engine.ts'); process.exit(1) }

const require_ = createRequire(pathToFileURL(join(OUT, 'x.cjs')))
const Module = require_('module')
const orig = Module._resolveFilename
Module._resolveFilename = function (req, ...rest) {
  if (req.startsWith('@/locales/')) req = join(REPO, 'src', req.slice(2))
  else if (req.startsWith('@/lib/')) req = join(OUT, 'out', req.slice('@/lib/'.length))
  return orig.call(this, req, ...rest)
}
const { detectKeywords } = require_(emitted)

const CASES = [
  // [aprašymas, DB raktažodžiai, tekstas, laukiami raktažodžiai]
  ['Taikinys su Pasišaipymu – korta jo NEGAUNA', [], 'Kovos šūksnis: sunaikina priešo padarą su Pasišaipymu.', ['battlecry']],
  ['Taikinys su Magišku skydu – NEGAUNA skydo', [], 'Sunaikina visus padarus su Magišku skydu.', []],
  ['Priešo Sėlinimas – NEGAUNA sėlinimo', [], 'Atskleidžia priešo padarus su Sėlinimu.', []],
  ['Turintys Pasišaipymą – NEGAUNA', [], 'Padaro 3 žalos visiems turintiems Pasišaipymą.', []],
  ['Be Pasišaipymo – NEGAUNA', [], 'Sunaikina padarą be Pasišaipymo.', []],
  ['Sava savybė tekste – GAUNA', [], 'Pasišaipymas. Šis padaras traukia atakas.', ['taunt']],
  ['Sava savybė + taikinys tame pačiame tekste – GAUNA', [], 'Sprintas. Sunaikina padarą su Pasišaipymu.', ['sprint', 'battlecry'].filter((x) => x === 'sprint')],
  ['DB sąrašas visada patikimas', ['Pasišaipymas'], 'Sunaikina padarą su Magišku skydu.', ['taunt']],
  ['Kovos šūksnis atpažįstamas', [], 'Kovos šūksnis: traukia kortą.', ['battlecry']],
  ['Paskutinis noras atpažįstamas', [], 'Paskutinis noras: padaro 2 žalos.', ['lastwish']],
  ['Magiškas skydas kaip sava savybė', ['Magiškasis skydas'], null, ['shield']],
  ['Tuščia korta – nieko', [], null, []],
]

let bad = 0
for (const [name, names, text, want] of CASES) {
  const got = detectKeywords(names, text)
  const ok = got.length === want.length && want.every((w) => got.includes(w))
  if (!ok) { bad++; console.error(`✖ ${name}\n    laukta [${want}], gauta [${got}]`) }
  else console.log(`✓ ${name}`)
}
console.log(bad === 0 ? `\n✓ Raktažodžių atpažinimas: ${CASES.length} atvejai OK` : `\n✖ Nepraėjo: ${bad}`)
process.exit(bad ? 1 : 0)
