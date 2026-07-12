#!/usr/bin/env node
// ── Ravenof i18n validacija: npm run i18n:validate ───────────────────────────
// Tikrina: trūkstamus/perteklinius EN raktus, interpolation parametrų
// neatitikimus, tuščias reikšmes. Exit 1 jei yra kritinių problemų.
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
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

const total = files.reduce((s, f) => s + flat(JSON.parse(readFileSync(join(ROOT, SRC, f), 'utf8'))).length, 0)
console.log(`\ni18n: ${files.length} namespace, ${total} LT raktų · klaidos: ${errors} · įspėjimai: ${warnings}`)
process.exit(errors ? 1 : 0)
