// ── Ravenof: kliento bundle'o publikavimas (OTA) ─────────────────────────────
// Paima apps/digital/dist, suskaičiuoja kiekvieno failo SHA-256, įkelia TIK naujus/pakeistus
// failus į Supabase Storage bucket'ą `app-bundles` (content-addressed: files/<sha256>.<ext>),
// parašo manifestą manifests/<versija>.json ir užregistruoja bundle'ą per
// rvn_admin_release_publish → jis VISADA patenka tik į `admin` kanalą.
// Į tester / stable keliama tik iš /admin/releases (mygtukas „Patvirtinti").
//
// Naudojimas (Windows, repo šaknyje; patogiau per release.bat):
//   node tools/publish-bundle.mjs                      # build + publish (versija = src/lib/version.ts APP_VERSION)
//   node tools/publish-bundle.mjs --skip-build         # naudoti jau esamą apps/digital/dist
//   node tools/publish-bundle.mjs --dry                # tik parodyti, kas būtų įkelta
//   node tools/publish-bundle.mjs --notes-lt "..." --notes-en "..." --engine 2
//   node tools/publish-bundle.mjs --min-shell-android 1.0.700 --min-shell-desktop 0.2.0
//   node tools/publish-bundle.mjs --mark-baseline android|desktop [--skip-build]
//        ↑ kviesti KASKART, kai išdalini naują APK / EXE: įsimena, kokie failai yra installeryje,
//          kad jų nereikėtų kelti į Storage (klientas juos pasiima iš savo installerio).
//   node tools/publish-bundle.mjs --upload-all         # ignoruoti baseline – įkelti viską (saugiausia, bet ~300 MB)
//
// Prisijungimas: ADMIN vartotojas (profiles.role='admin'). Service-role rakto NEREIKIA.
//   .env.publish.local (gitignored):  RAVENOF_ADMIN_EMAIL=...  RAVENOF_ADMIN_PASSWORD=...
//   arba įves paklaustas terminale.
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const ROOT = process.cwd()
const DIST = path.resolve(ROOT, 'apps/digital/dist')
const BASELINE_DIR = path.resolve(ROOT, 'apps/digital/baselines')
const CACHE_FILE = path.resolve(ROOT, 'tools/.publish-cache.json')
const BUCKET = 'app-bundles'
const MAX_FILE_BYTES = 50 * 1024 * 1024        // Supabase numatytasis vieno failo limitas
const CONCURRENCY = 4

// ── env ──────────────────────────────────────────────────────────────────────
for (const f of ['.env.publish.local', '.env.local', '.env']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const argv = process.argv.slice(2)
const has = (k) => argv.includes(k)
const arg = (k, d = '') => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d }
const DRY = has('--dry')
const MARK = arg('--mark-baseline')
const die = (msg) => { console.error('\n[X] ' + msg); process.exit(1) }

// ── versija ──────────────────────────────────────────────────────────────────
const verSrc = readFileSync(path.resolve(ROOT, 'src/lib/version.ts'), 'utf8')
const VERSION = (verSrc.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1]
if (!VERSION) die('Nerandu APP_VERSION faile src/lib/version.ts')

// ── build ────────────────────────────────────────────────────────────────────
if (!has('--skip-build')) {
  console.log(`[1/5] Build (npm run app:build) – versija ${VERSION}`)
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'app:build'], { stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) die('app:build nepavyko – nieko nepublikuota.')
} else console.log('[1/5] Build praleistas (--skip-build)')
if (!existsSync(path.join(DIST, 'index.html'))) die('apps/digital/dist/index.html nėra – pirma paleisk build.')

// Saugiklis: dist'e sukompiliuota versija turi sutapti su APP_VERSION (kitaip publikuotum seną build'ą nauju numeriu).
{
  const assetsDir = path.join(DIST, 'assets')
  const needle = new RegExp(`["'\`]${VERSION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\`]`)
  const found = existsSync(assetsDir) && readdirSync(assetsDir).filter((f) => f.endsWith('.js')).some((f) => needle.test(readFileSync(path.join(assetsDir, f), 'utf8')))
  if (!found && !has('--force')) die(`dist'e nerandu versijos '${VERSION}' – dist pasenęs? Paleisk be --skip-build (arba --force, jei tikrai žinai).`)
}

// ── failų sąrašas + hash'ai ──────────────────────────────────────────────────
console.log('[2/5] Skaičiuoju SHA-256…')
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name)
    const st = statSync(abs)
    if (st.isDirectory()) walk(abs, out)
    else if (st.isFile()) out.push({ abs, rel: path.relative(DIST, abs).split(path.sep).join('/'), size: st.size })
  }
  return out
}
const sha256 = (abs) => new Promise((res, rej) => { const h = createHash('sha256'); createReadStream(abs).on('data', (d) => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej) })
const files = walk(DIST).filter((f) => !f.rel.endsWith('.map') && f.rel !== '_redirects')
for (const f of files) f.hash = await sha256(f.abs)
const totalBytes = files.reduce((s, f) => s + f.size, 0)
console.log(`      ${files.length} failų, ${(totalBytes / 1048576).toFixed(1)} MB`)

// ── --mark-baseline: tik įsimenam ir išeinam ─────────────────────────────────
if (MARK) {
  if (!['android', 'desktop'].includes(MARK)) die('--mark-baseline android | desktop')
  mkdirSync(BASELINE_DIR, { recursive: true })
  const out = { platform: MARK, version: VERSION, markedAt: new Date().toISOString(), files: Object.fromEntries(files.map((f) => [f.rel, f.hash])) }
  writeFileSync(path.join(BASELINE_DIR, `${MARK}.json`), JSON.stringify(out))
  console.log(`[OK] Baseline '${MARK}' įsimintas (versija ${VERSION}, ${files.length} failų) → apps/digital/baselines/${MARK}.json`)
  console.log('     Įkomitink šį failą – nuo jo priklauso, kurių failų nereikia kelti į Storage.')
  process.exit(0)
}

// ── ką galima praleisti: failas tuo pačiu keliu ir hash'u yra VISUOSE baseline'uose ──
const baselines = existsSync(BASELINE_DIR) ? readdirSync(BASELINE_DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(path.join(BASELINE_DIR, f), 'utf8'))) : []
const inAllBaselines = (f) => !has('--upload-all') && baselines.length > 0 && baselines.every((b) => b.files[f.rel] === f.hash)
if (baselines.length === 0 && !has('--upload-all')) {
  console.log('      (!) Nėra apps/digital/baselines/*.json → bus keliami VISI failai. Išdalinęs APK/EXE paleisk --mark-baseline.')
} else if (baselines.length) console.log('      Baseline: ' + baselines.map((b) => `${b.platform}@${b.version}`).join(', '))

// media/* failai jau guli Supabase Storage originaliu URL (media/manifest.json: originalus URL → vietinis kelias) – nekeliam antrą kartą
const mediaOrigin = new Map()
try {
  const mm = JSON.parse(readFileSync(path.join(DIST, 'media/manifest.json'), 'utf8'))
  for (const [url, local] of Object.entries(mm.files || {})) mediaOrigin.set('media/' + local, url)
} catch { /* dist be vietinės media – tiek to */ }

// ── Supabase prisijungimas (admin) ───────────────────────────────────────────
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!SB_URL || !SB_KEY) die('Trūksta NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (.env.local)')
const publicUrl = (p) => `${SB_URL}/storage/v1/object/public/${BUCKET}/${p}`
const ext = (rel) => { const e = path.extname(rel).toLowerCase(); return /^\.[a-z0-9]{1,8}$/.test(e) ? e : '' }
const storagePath = (f) => `files/${f.hash.slice(0, 2)}/${f.hash}${ext(f.rel)}`

const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : { uploaded: {} }
const plan = files.map((f) => {
  const origin = mediaOrigin.get(f.rel)
  if (origin) return { ...f, url: origin, action: 'origin' }
  const p = storagePath(f)
  if (inAllBaselines(f)) return { ...f, url: publicUrl(p), action: 'baseline' }
  if (cache.uploaded[p]) return { ...f, url: publicUrl(p), action: 'cached' }
  return { ...f, url: publicUrl(p), action: 'upload', storagePath: p }
})
const toUpload = plan.filter((f) => f.action === 'upload')
const uploadBytes = toUpload.reduce((s, f) => s + f.size, 0)
console.log(`[3/5] Įkelti reikia ${toUpload.length} failų (${(uploadBytes / 1048576).toFixed(2)} MB); ` +
  `baseline'e ${plan.filter((f) => f.action === 'baseline').length}, jau įkelta ${plan.filter((f) => f.action === 'cached').length}, media iš originalo ${plan.filter((f) => f.action === 'origin').length}`)
const tooBig = toUpload.filter((f) => f.size > MAX_FILE_BYTES)
if (tooBig.length) die('Per dideli failai (>50 MB) Storage\'ui: ' + tooBig.map((f) => f.rel).join(', '))
if (DRY) { for (const f of toUpload.slice(0, 40)) console.log('      + ' + f.rel); if (toUpload.length > 40) console.log(`      … ir dar ${toUpload.length - 40}`); console.log('[DRY] nieko nepakeista.'); process.exit(0) }

const ask = (q, hidden = false) => new Promise((res) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  if (hidden) rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s) }   // nerodyti slaptažodžio
  rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); res(a.trim()) })
})
const email = process.env.RAVENOF_ADMIN_EMAIL || await ask('Admin el. paštas: ')
const password = process.env.RAVENOF_ADMIN_PASSWORD || await ask('Slaptažodis: ', true)
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: true } })
{
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) die('Prisijungti nepavyko: ' + error.message + '\n    (Jei admin paskyra tik per Google – Supabase Dashboard → Authentication → vartotojui nustatyk slaptažodį.)')
  const { data: ov, error: e2 } = await sb.rpc('rvn_admin_release_overview')
  if (e2) die('Ši paskyra ne admin arba migracija 20260918_app_releases.sql dar nepritaikyta: ' + e2.message)
  if ((ov?.bundles ?? []).some((b) => b.version === VERSION)) die(`Bundle'as ${VERSION} jau publikuotas. Bundle'ai nekeičiami – padidink APP_VERSION (src/lib/version.ts).`)
}

// ── upload ───────────────────────────────────────────────────────────────────
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.cur': 'image/x-icon' }
console.log('[4/5] Keliu failus…')
let done = 0, failed = 0
const queue = [...toUpload]
async function worker() {
  while (queue.length) {
    const f = queue.shift()
    let ok = false, lastErr = ''
    for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
      const { error } = await sb.storage.from(BUCKET).upload(f.storagePath, readFileSync(f.abs), { contentType: MIME[ext(f.rel)] || 'application/octet-stream', cacheControl: '31536000', upsert: false })
      if (!error || /exists|duplicate/i.test(error.message || '')) ok = true
      else { lastErr = error.message; await new Promise((r) => setTimeout(r, 800 * attempt)) }
    }
    if (ok) { cache.uploaded[f.storagePath] = 1; done++ } else { failed++; console.error(`      [X] ${f.rel}: ${lastErr}`) }
    if ((done + failed) % 25 === 0) { process.stdout.write(`      ${done + failed}/${toUpload.length}\r`); writeFileSync(CACHE_FILE, JSON.stringify(cache)) }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
writeFileSync(CACHE_FILE, JSON.stringify(cache))
if (failed) die(`${failed} failų neįkelta – bundle'as NEUŽREGISTRUOTAS. Paleisk dar kartą (jau įkelti praleidžiami).`)

// ── manifestas + registracija ────────────────────────────────────────────────
console.log('[5/5] Manifestas + registracija…')
const manifest = plan.map((f) => ({ file_name: f.rel, file_hash: f.hash, download_url: f.url, size: f.size }))
const manifestPath = `manifests/${VERSION}.json`
{
  const body = Buffer.from(JSON.stringify({ version: VERSION, generatedAt: new Date().toISOString(), files: manifest }))
  const { error } = await sb.storage.from(BUCKET).upload(manifestPath, body, { contentType: 'application/json', cacheControl: '31536000', upsert: false })
  if (error && !/exists|duplicate/i.test(error.message || '')) die('Manifesto įkelti nepavyko: ' + error.message)
}
let gitSha = ''
try { gitSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* be git – tiek to */ }
const { data, error } = await sb.rpc('rvn_admin_release_publish', { p: {
  version: VERSION, git_sha: gitSha, manifest_url: publicUrl(manifestPath), files_count: files.length, size_bytes: totalBytes,
  engine_version: Number(arg('--engine', '1')) || 1,
  min_shell_android: arg('--min-shell-android'), min_shell_desktop: arg('--min-shell-desktop'),
  requires_migration: arg('--requires-migration'), notes_lt: arg('--notes-lt'), notes_en: arg('--notes-en'),
} })
if (error) die('Registracija nepavyko: ' + error.message)
console.log(`\n[OK] Bundle'as ${data.version} publikuotas į kanalą '${data.channel}'.`)
console.log('     Dabar jį gauna TIK adminai. Patikrink žaidime, tada /admin/releases → „Patvirtinti → tester".')
