#!/usr/bin/env node
/**
 * ── Statinė LT tekstų paieška (Fazė 9) ──────────────────────────────────────
 * Ieško lietuviškų (diakritinių) tekstų UI failuose, kurie NĖRA komentaruose —
 * t. y. galimų nemigruotų eilučių. Regresijų saugiklis: naujas LT tekstas
 * komponente iškart matomas.
 *
 *   node scripts/i18n-scan-lt.mjs              # ataskaita
 *   node scripts/i18n-scan-lt.mjs --strict     # exit 1, jei rasta naujų (virš bazės)
 *
 * SĄMONINGAI IGNORUOJAMA: admin/* (LT paliktas), locales/*.json, kodo komentarai,
 * scrapinti moduliai (Team2v2/Coop), dev puslapiai, seed'ai (Fazė 4 likučiai).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'src')
const STRICT = process.argv.includes('--strict')

// Apimtis = /digital app (Fazės 1–8). Web portalas, adminas ir seed'ai – NE apimtyje.
const INCLUDE_PREFIX = [
  'src/app/digital', 'src/components/digital', 'src/components/tutorial', 'src/components/social',
  'src/lib/i18n', 'src/lib/digital', 'src/lib/gamification', 'src/lib/tutorial', 'src/lib/tutorial2',
  'src/lib/social', 'src/lib/cards', 'src/lib/ranked', 'src/lib/deck-validation.ts',
]
const IGNORE_DIRS = ['src/app/admin', 'src/components/admin', 'src/locales', 'src/app/dev']
// Sąmoningai LT (dokumentuota I18N-HANDOFF.md):
const IGNORE_FILES = [
  'src/components/digital/Team2v2Game.tsx',       // SCRAPPED iš nav
  'src/components/digital/DigitalCoop.tsx',
  'src/components/digital/DigitalPvp2v2.tsx',
  'src/lib/ranked/bots.ts',                       // botų vardai
  'src/lib/ranked/achievements.ts',               // LT = šaltinis, EN per content_translations
  'src/lib/digital/starterMeta.ts',               // dvikalbis registras
  'src/lib/gamification/rewardLabel.ts',          // rarity raktai (logika)
  'src/components/tutorial/PracticeButton.tsx',   // FACTION_DESC dvikalbis registras
  'src/components/tutorial/ArenaBackground.tsx',  // frakcijų LT vardai = logikos raktai
  'src/lib/tutorial/engine.ts',                   // STATUS_META/KEYWORD_META = LT fallback registrai
]
// AI vidiniai euristikų komentarai/raktai + kampanija (Fazės 4 likutis)
const IGNORE_MORE_PREFIX = ['src/lib/tutorial/ai/', 'src/components/digital/campaign/', 'src/lib/campaign']

const LT = /[ąčęėįšųūžĄČĘĖĮŠŲŪŽ]/

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const rel = relative(root, p).replace(/\\/g, '/')
    if (IGNORE_DIRS.some((d) => rel.startsWith(d))) continue
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(p) && !p.includes('.fuse_hidden')) out.push(p)
  }
  return out
}

/** Pašalina komentarus (// ir /* *\/) ir importų eilutes. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n')
}

const hits = []
for (const file of walk(SRC)) {
  const rel = relative(root, file).replace(/\\/g, '/')
  if (!INCLUDE_PREFIX.some((p) => rel === p || rel.startsWith(p))) continue
  if (IGNORE_FILES.includes(rel)) continue
  if (IGNORE_MORE_PREFIX.some((p) => rel.startsWith(p))) continue
  const raw = readFileSync(file, 'utf8')
  const code = stripComments(raw)
  code.split('\n').forEach((line, i) => {
    if (!LT.test(line)) return
    if (/^\s*import\s/.test(line)) return
    if (/console\.(warn|error|log|info)/.test(line)) return     // dev žinutės – leidžiama
    if (/data-testid|aria-hidden/.test(line) && !/['"`][^'"`]*[ąčęėįšųūž]/.test(line)) return
    // tik tekstas eilutėse arba JSX turinyje
    const inString = /(['"`])[^'"`]*[ąčęėįšųūžĄČĘĖĮŠŲŪŽ][^'"`]*\1/.test(line)
    const inJsx = />[^<>{}]*[ąčęėįšųūžĄČĘĖĮŠŲŪŽ][^<>{}]*</.test(line)
    if (!inString && !inJsx) return
    hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 110) })
  })
}

const byFile = hits.reduce((m, h) => { (m[h.file] ??= []).push(h); return m }, {})
for (const [f, list] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${f}  (${list.length})`)
  for (const h of list.slice(0, 8)) console.log(`  ${h.line}: ${h.text}`)
  if (list.length > 8) console.log(`  … dar ${list.length - 8}`)
}
console.log(`\ni18n LT skenavimas: ${hits.length} įtartinos eilutės ${Object.keys(byFile).length} failuose`)
if (STRICT && hits.length > 0) process.exit(1)
