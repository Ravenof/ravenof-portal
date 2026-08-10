// ── Minimalus `@/` alias resolver Node --experimental-strip-types paleidimams ─
// Leidžia paleisti TS simuliacijas be tsx/vitest (bash sandbox neturi tinklo).
// Naudojimas: node --experimental-strip-types --import ./scripts/alias-loader.mjs scripts/x.ts
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./alias-hooks.mjs', pathToFileURL('./scripts/'))
