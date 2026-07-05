// ════════════════════════════════════════════════════════════════════════════
//  Ravenof — Storage paveikslų egress optimizacija (WebP + ilgas cache)
//  Apima VISAS paveikslų lenteles: kortos, booster pakuotės, kosmetika
//  (nugarėlės/lentos/avatarai), starter kaladės, žaidėjų avatarai.
//   • PNG/JPG → WebP (≤900 px, q82) + cacheControl 1 metai, atnaujina DB URL
//   • jau WebP → atnaujina cacheControl į 1 metus (seni upload'ai turėjo 1h)
//   • render/image URL DB pakeičia į tiesioginį object URL
//  Bucket'ą atpažįsta pats iš URL (card-images, avatars, ir pan.).
//  Idempotentiška. Senų failų netrina. SAUGU: be --fix nieko nekeičia.
//
//  Naudojimas (ravenof-portal kataloge):
//    npm i -D sharp
//    set SUPABASE_URL=hrfkelcoxnfpvdynkxtw            (arba pilnas https URL)
//    set SUPABASE_SERVICE_ROLE_KEY=eyJ...             (service_role, NE anon)
//    node tools/optimize-media.mjs                    (DRY-RUN)
//    node tools/optimize-media.mjs --fix              (vykdyti)
//  Flag'ai: --fix, --limit=N, --table=cosmetics, --no-recache
// ════════════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

let URL = (process.env.SUPABASE_URL || '').trim()
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
if (!URL || !KEY) { console.error('❌ Trūksta SUPABASE_URL arba SUPABASE_SERVICE_ROLE_KEY (env).'); process.exit(1) }
if (!/^https?:\/\//i.test(URL)) URL = URL.includes('.') ? `https://${URL}` : `https://${URL}.supabase.co`
URL = URL.replace(/\/+$/, '')
console.log('Supabase:', URL)

const FIX = process.argv.includes('--fix')
const RECACHE = !process.argv.includes('--no-recache')
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1]) || Infinity
const ONLY_TABLE = (process.argv.find((a) => a.startsWith('--table=')) || '').split('=')[1] || null

const MAX_W = 900
const QUALITY = 82
const OBJ_RE = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/
const RENDER_RE = /\/storage\/v1\/render\/image\/public\/([^/]+)\/([^?]+)/

// Visos DB lentelės su paveikslų URL stulpeliais (id = pirminis raktas)
const TARGETS = [
  { table: 'cards',         col: 'image_url',  id: 'id' },
  { table: 'card_packs',    col: 'image_url',  id: 'id' },  // booster pakuotės
  { table: 'cosmetics',     col: 'image_url',  id: 'id' },  // nugarėlės / lentos / avatarai
  { table: 'starter_decks', col: 'image_url',  id: 'id' },  // starter kaladės
  { table: 'profiles',      col: 'avatar_url', id: 'id' },  // žaidėjų avatarai
].filter((t) => !ONLY_TABLE || t.table === ONLY_TABLE)

let sharp
try { sharp = (await import('sharp')).default } catch { console.error('❌ Trūksta „sharp". Paleisk: npm i -D sharp'); process.exit(1) }

const sb = createClient(URL, KEY, { auth: { persistSession: false } })
const fmt = (b) => (b / 1024).toFixed(0) + ' KB'

let totalOld = 0, totalNew = 0, converted = 0, recached = 0, noimg = 0, external = 0, failed = 0

for (const t of TARGETS) {
  const { data: rows, error } = await sb.from(t.table).select(`${t.id}, ${t.col}`)
  if (error) { console.error(`⚠️  ${t.table}: ${error.message}${error.cause ? ' — ' + (error.cause.message || error.cause) : ''}`); continue }
  console.log(`\n── ${t.table} (${rows.length} įrašų) ──`)
  let n = 0
  for (const row of rows) {
    if (n >= LIMIT) break
    const url = row[t.col]
    if (!url || typeof url !== 'string') { noimg++; continue }
    let m = url.match(OBJ_RE), usesRender = false
    if (!m) { const r = url.match(RENDER_RE); if (r) { m = r; usesRender = true } }
    if (!m) { external++; continue }              // išorinis (pvz. Google avataras) – praleidžiam
    const bucket = m[1]
    const path = decodeURIComponent(m[2].split('?')[0])
    const isWebp = path.toLowerCase().endsWith('.webp')
    const objUrl = sb.storage.from(bucket).getPublicUrl(path).data.publicUrl

    // ── jau WebP: atnaujinam cache (+ DB, jei buvo render URL) ──
    if (isWebp) {
      if (!RECACHE && !usesRender) { continue }
      n++
      try {
        if (FIX) {
          if (RECACHE) {
            const { data: blob, error: dErr } = await sb.storage.from(bucket).download(path)
            if (!dErr && blob) {
              const buf = Buffer.from(await blob.arrayBuffer())
              await sb.storage.from(bucket).upload(path, buf, { upsert: true, contentType: 'image/webp', cacheControl: '31536000' })
            }
          }
          if (usesRender) await sb.from(t.table).update({ [t.col]: objUrl }).eq(t.id, row[t.id])
        }
        recached++
      } catch (e) { console.log(`  ⚠️  ${bucket}/${path}: ${e.message}`); failed++ }
      continue
    }

    // ── PNG/JPG → WebP ──
    n++
    try {
      const { data: blob, error: dErr } = await sb.storage.from(bucket).download(path)
      if (dErr || !blob) { console.log(`  ⚠️  ${bucket}/${path}: nepavyko parsiųsti`); failed++; continue }
      const inBuf = Buffer.from(await blob.arrayBuffer())
      const out = await sharp(inBuf).resize({ width: MAX_W, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer()
      totalOld += inBuf.length; totalNew += out.length
      const pct = Math.round((1 - out.length / inBuf.length) * 100)
      const newPath = path.replace(/\.[^./]+$/, '') + '.webp'
      console.log(`  ↓ ${bucket}/${path}  ${fmt(inBuf.length)} → ${fmt(out.length)} (${pct}%)`)
      if (FIX) {
        const { error: uErr } = await sb.storage.from(bucket).upload(newPath, out, { upsert: true, contentType: 'image/webp', cacheControl: '31536000' })
        if (uErr) { console.log(`     ⚠️ upload: ${uErr.message}`); failed++; continue }
        const pub = sb.storage.from(bucket).getPublicUrl(newPath).data.publicUrl
        const { error: updErr } = await sb.from(t.table).update({ [t.col]: pub }).eq(t.id, row[t.id])
        if (updErr) { console.log(`     ⚠️ DB update: ${updErr.message}`); failed++; continue }
      }
      converted++
    } catch (e) { console.log(`  ⚠️  ${bucket}/${path}: ${e.message}`); failed++ }
  }
}

console.log('\n════════════════ SANTRAUKA ════════════════')
console.log(`Mode:        ${FIX ? 'FIX (įrašyta)' : 'DRY-RUN (nieko nekeista)'}`)
console.log(`Konvertuota PNG→WebP: ${converted}   Atnaujintas webp cache: ${recached}`)
console.log(`Be paveikslo: ${noimg}   Išorinis/kitas URL: ${external}   Klaidos: ${failed}`)
console.log(`PNG konversijos dydis: ${fmt(totalOld)} → ${fmt(totalNew)}  (sutaupyta ${totalOld ? Math.round((1 - totalNew / totalOld) * 100) : 0}%)`)
if (!FIX && (converted || recached)) console.log('\n👉 Jei tinka — paleisk dar kartą su  --fix')
