// ── `@/` alias + JSON importų hook'ai (Node --experimental-strip-types) ──────
// Bash sandbox neturi tinklo, tad tsx/vitest neprieinami. Šie hook'ai leidžia
// paleisti TS simuliacijas tiesiai per node: `npm run game:test:feel`.
import { pathToFileURL } from 'node:url'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const SRC = pathToFileURL(path.resolve(process.cwd(), 'src') + '/').href

const EXTLESS = /\.(ts|tsx|mjs|js|json)$/

export async function resolve(specifier, context, next) {
  const spec = specifier.startsWith('@/') ? SRC + specifier.slice(2) : specifier
  const relative = spec.startsWith('.') || spec.startsWith('file:')
  if (relative && !EXTLESS.test(spec)) {
    // Bundler stiliaus importai be plėtinio: pabandom .ts, tada .tsx, tada index.ts
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      try { return await next(spec + ext, context) } catch { /* bandom kitą */ }
    }
  }
  return next(spec, context)
}

export async function load(url, context, next) {
  if (url.endsWith('.json')) {
    const source = await readFile(new URL(url), 'utf8')
    return { format: 'module', shortCircuit: true, source: `export default ${source}` }
  }
  return next(url, context)
}
