// esbuild: apps/server/src/index.ts + src/lib/tutorial/engine.ts (alias @/ → src) → dist/index.js
import { build } from 'esbuild'
import path from 'node:path'
const repo = path.resolve(import.meta.dirname, '../..')
await build({
  entryPoints: [path.join(repo, 'apps/server/src/index.ts')],
  outfile: path.join(repo, 'apps/server/dist/index.mjs'),
  bundle: true, platform: 'node', target: 'node22', format: 'esm',
  alias: { '@': path.join(repo, 'src') },
  external: ['ws', 'jose'],
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'info',
})
