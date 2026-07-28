#!/usr/bin/env node
/**
 * ── Kovos šūksnis specialiai iškviestiems padarams ──────────────────────────
 *   node scripts/test-battlecry-summon.mjs
 *
 * Šūksnis privalo suveikti VISAIS iškvietimo keliais, ne tik sužaidus kortą:
 * prikėlus iš kapinyno, iškvietus iš kaladės/rankos efektu ir padarui
 * prisikėlus pačiam (resurrectSelf). Anksčiau padaras buvo ieškomas pagal
 * kortos objekto tapatybę – lentoje esant kitai to paties objekto kopijai
 * šūksnis galėjo tyliai dingti.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = mkdtempSync(join(tmpdir(), 'rvn-bc-'))
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
const E = require_(emitted)

// triggersZmk:false – kad žala būtų deterministinė (kitaip ŽMK kortos ją pakeistų)
const BC = (v) => [{ trigger: 'onSummon', effect: 'damage', target: 'enemyPlayer', value: v, triggersZmk: false }]
const card = (uid, name, mappings, keywords) => ({
  uid, id: uid, name, type: 'unit', gold: 1, attack: 2, health: 3,
  keywords: keywords ?? ['battlecry'], effect: null, subtype: null, factionId: null,
  gameplay: null, mappings, image: null, description: null,
})
const unit = (c) => ({ uid: c.uid, card: c, atk: 2, hp: 3, maxHp: 3, statuses: {}, attacksUsed: 0,
  canAttack: true, isChampion: false, phase: 1, abilityUsed: false, shield: false, stealth: false, summonedFrom: 'play' })

let bad = 0
const check = (n, got, want) => { const ok = got === want; if (!ok) bad++; console[ok ? 'log' : 'error'](`${ok ? '✓' : '✖'} ${n} — laukta ${want}, gauta ${got}`) }

// 1) prikėlimas iš kapinyno
{
  const g = E.createGame([], [], 'you')
  const c = card('rev', 'Prikeltas', BC(3))
  g.you.discard.push(c)
  const before = g.ai.hp
  E.gameApi.reviveCards(g, 'you', [c])
  check('prikėlus iš kapinyno šūksnis suveikia', before - g.ai.hp, 3)
}
// 2) iškvietimas iš kaladės efektu
{
  const g = E.createGame([], [], 'you')
  g.you.deck.push(card('dk', 'Iš kaladės', BC(2)))
  const before = g.ai.hp
  E.gameApi.summonFromZone(g, 'you', 'deck', { count: 1 })
  check('iškvietus iš kaladės šūksnis suveikia', before - g.ai.hp, 2)
}
// 3) resurrectSelf – padaras prisikelia pats
{
  const g = E.createGame([], [], 'you')
  const c = card('rs', 'Feniksas', [
    { trigger: 'onDeath', effect: 'resurrectSelf', target: 'self', resurrectHp1: true },
    ...BC(3),
  ])
  g.you.units[0] = unit(c)
  const before = g.ai.hp
  E.gameApi.killUnit(g, 'you', g.you.units[0])
  check('prisikėlus pačiam šūksnis suveikia', before - g.ai.hp, 3)
}
// 4) dvi kopijos vienu metu – abu šūksniai
{
  const g = E.createGame([], [], 'you')
  const before = g.ai.hp
  E.gameApi.reviveCards(g, 'you', [card('a', 'A', BC(1)), card('b', 'B', BC(1))])
  check('dvi prikeltos kortos – abu šūksniai', before - g.ai.hp, 2)
}
// 5) lentoje jau stovi NUTILDYTA to paties objekto kopija – naujo šūksnis vis tiek suveikia
{
  const g = E.createGame([], [], 'you')
  const c = card('dup', 'Dvynys', BC(2))
  const old = unit(c); old.statuses.silenced = 9999
  g.you.units[0] = old
  const before = g.ai.hp
  E.gameApi.reviveCards(g, 'you', [c])
  check('nutildyta kopija lentoje netrukdo naujam šūksniui', before - g.ai.hp, 2)
}
console.log(bad === 0 ? `\n✓ Kovos šūksnis iškvietus: 5 atvejai OK` : `\n✖ Nepraėjo: ${bad}`)
process.exit(bad ? 1 : 0)
