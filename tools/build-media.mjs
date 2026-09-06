// ── Media bundle'as local-first app'ui ───────────────────────────────────────
// Paima rvn_media_manifest() (visi Supabase Storage failai su kind/tier/bytes),
// atsisiunčia į apps/digital/media/<bucket>/<kelias> ir parašo manifest.json
// (originalus URL → vietinis kelias). Vite kopijuoja apps/digital/media → dist/media
// (žr. vite.config.ts publicDir + media), runtime mediaShim.ts permeta URL'us.
//
// Paleidimas (Windows, su .env.local):
//   node tools/build-media.mjs                 # tier<=1 (esminiai: kortos, UI, garsai)
//   node tools/build-media.mjs --tier 2        # + video / HD (didelis bundle'as)
//   node tools/build-media.mjs --kinds card,audio
//   node tools/build-media.mjs --dry           # tik statistika
// Idempotentiška: jau esantys failai (pagal dydį) praleidžiami.
import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const argv = process.argv.slice(2)
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const MAX_TIER = Number(arg('--tier', '1'))
const KINDS = arg('--kinds', '').split(',').filter(Boolean)
const DRY = argv.includes('--dry')
const OUT = path.resolve('apps/digital/media')
const CONCURRENCY = 6

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) { console.error('Trūksta NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (.env.local)'); process.exit(1) }

const sb = createClient(url, key)
const { data, error } = await sb.rpc('rvn_media_manifest')
if (error) { console.error('rvn_media_manifest:', error.message); process.exit(1) }
const OBJ = '/storage/v1/object/public/'
let entries = (data ?? []).filter((e) => typeof e.url === 'string' && e.url.includes(OBJ))
entries = entries.filter((e) => (e.tier ?? 1) <= MAX_TIER && (KINDS.length === 0 || KINDS.includes(e.kind)))

const localPath = (u) => decodeURIComponent(u.slice(u.indexOf(OBJ) + OBJ.length)).replace(/[^A-Za-z0-9._\/-]/g, '_')
const totalBytes = entries.reduce((s, e) => s + (e.bytes || 0), 0)
const byKind = {}
for (const e of entries) byKind[e.kind] = (byKind[e.kind] || 0) + 1
console.log(`Manifestas: ${entries.length} failų, ~${(totalBytes / 1048576).toFixed(1)} MB (tier<=${MAX_TIER})`, byKind)
if (DRY) process.exit(0)

mkdirSync(OUT, { recursive: true })
const manifest = { version: 1, base: '/media/', generatedAt: new Date().toISOString(), files: {} }
let done = 0, skipped = 0, failed = 0
const queue = [...entries]
async function worker() {
  while (queue.length) {
    const e = queue.shift()
    const rel = localPath(e.url)
    const abs = path.join(OUT, rel)
    manifest.files[e.url] = rel
    try {
      if (existsSync(abs) && (!e.bytes || statSync(abs).size === e.bytes)) { skipped++; continue }
      const r = await fetch(e.url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      mkdirSync(path.dirname(abs), { recursive: true })
      await writeFile(abs, Buffer.from(await r.arrayBuffer()))
      done++
      if ((done + skipped) % 50 === 0) console.log(`  ${done + skipped}/${entries.length}…`)
    } catch (err) {
      failed++
      delete manifest.files[e.url]
      console.warn('  ✗', e.url, err.message)
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest))
console.log(`\n✓ ${done} atsisiųsta, ${skipped} jau buvo, ${failed} nepavyko → ${OUT} (manifest.json: ${Object.keys(manifest.files).length} įrašų)`)
