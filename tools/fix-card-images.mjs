// ── Kortų paveikslų skeneris / taisytojas (v2) ────────────────────────────────
// Aptinka: 1) EXIF pasukimą  2) gulsčią (landscape) kortą  3) didelius vienodus
// kraštus (print lapas su balta/juoda apvada – pvz. Ryu: portrait lapas,
// kuriame korta guli pasukta).
// Taisymas: EXIF normalizuojamas → nukerpami vienodi kraštai (trim) → jei po
// nukirpimo korta gulsčia, pasukama 90° (--dir cw|ccw).
//
// Naudojimas:
//   node tools/fix-card-images.mjs                      # dry-run ataskaita
//   node tools/fix-card-images.mjs --fix                # taiso visus įtartinus
//   node tools/fix-card-images.mjs --fix --only Ryu     # tik pagal vardą (CSV, dalis vardo)
//   node tools/fix-card-images.mjs --fix --card "Ryu"   # PRIVERSTINAI taiso kortą,
//                                                       # net jei detekcija jos nepagavo
//   node tools/fix-card-images.mjs --fix --dir ccw      # sukimo kryptis (default cw)
//
// Prieš/po peržiūra: tools/img-report/<vardas>-pries.jpg ir -po.jpg
// Pataisytas failas keliamas NAUJU vardu + atnaujinamas cards.image_url (CDN bypass).
// Reikia: SUPABASE_SERVICE_ROLE_KEY (env arba .env.local).

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const reportDir = resolve(root, 'tools', 'img-report')

function envLocal(name) {
  try {
    const m = readFileSync(resolve(root, '.env.local'), 'utf8').match(new RegExp('^' + name + '=(.*)$', 'm'))
    return m ? m[1].trim() : null
  } catch { return null }
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || envLocal('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || envLocal('SUPABASE_SERVICE_ROLE_KEY')
const ANON = envLocal('NEXT_PUBLIC_SUPABASE_ANON_KEY') || envLocal('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
const badService = SERVICE && (SERVICE.startsWith('sb_publishable_') || SERVICE === ANON)
const KEY = (!SERVICE || badService) ? ANON : SERVICE   // skaitymui (dry-run/--dump) užtenka anon
const CAN_WRITE = !!SERVICE && !badService
if (!URL_BASE || !KEY) {
  console.error('KLAIDA: trūksta NEXT_PUBLIC_SUPABASE_URL arba raktų (.env.local).')
  process.exit(1)
}
if (badService) console.error('DĖMESIO: SUPABASE_SERVICE_ROLE_KEY yra publishable/anon raktas – taisyti negalės.')

const args = process.argv.slice(2)
const FIX = args.includes('--fix')
const argVal = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null)
const DIR = argVal('--dir') ?? 'cw'
const ONLY = argVal('--only')?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) ?? null
const FORCE = argVal('--card')?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) ?? []
const DUMP = args.includes('--dump') // išsaugo VISŲ Supabase kortų miniatiūras į tools/img-report/
const ANGLE = DIR === 'ccw' ? 270 : 90
const TRIM_MIN_AREA = 0.06 // trim laikomas reikšmingu, jei nukerpama >6% ploto

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const OBJ = '/storage/v1/object/public/'

async function rest(path, init) {
  const r = await fetch(URL_BASE + '/rest/v1/' + path, { ...init, headers: { ...H, 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${await r.text()}`)
  return r.status === 204 ? null : r.json()
}

function parseStorage(url) {
  const i = url.indexOf(OBJ)
  if (i < 0) return null
  const tail = url.slice(i + OBJ.length).split('?')[0]
  const bucket = tail.slice(0, tail.indexOf('/'))
  return { bucket, path: decodeURIComponent(tail.slice(tail.indexOf('/') + 1)) }
}

/** Parsisiunčia, normalizuoja EXIF, pabando trim. Grąžina diagnostiką. */
async function analyze(url) {
  const r = await fetch(url.split('?')[0])
  if (!r.ok) return { error: 'HTTP ' + r.status }
  const buf = Buffer.from(await r.arrayBuffer())
  const meta = await sharp(buf).metadata()
  const exifRot = (meta.orientation ?? 1) > 1

  // EXIF normalizuotas pikselinis vaizdas – nuo jo skaičiuojam viską
  const base = await sharp(buf).rotate().toBuffer()
  const bm = await sharp(base).metadata()

  // trim: nukerpa vienodus kraštus (baltas/juodas print fonas)
  let trimmed = null, tm = null, trimFrac = 0
  try {
    trimmed = await sharp(base).trim({ threshold: 30 }).toBuffer()
    tm = await sharp(trimmed).metadata()
    trimFrac = 1 - (tm.width * tm.height) / (bm.width * bm.height)
  } catch { /* visiškai vienodas vaizdas ir pan. */ }

  const useTrim = trimmed && trimFrac >= TRIM_MIN_AREA
  const finalW = useTrim ? tm.width : bm.width
  const finalH = useTrim ? tm.height : bm.height
  const landscape = finalW > finalH

  return { buf, meta, base, bm, trimmed, tm, trimFrac, useTrim, landscape, exifRot }
}

async function buildFixed(a, forceRotate) {
  let img = sharp(a.useTrim ? a.trimmed : a.base)
  const m = a.useTrim ? a.tm : a.bm
  if (a.landscape || forceRotate) img = img.rotate(ANGLE)
  const fmt = a.meta.format === 'png' ? 'png' : a.meta.format === 'webp' ? 'webp' : 'jpeg'
  const out = await (fmt === 'png' ? img.png() : fmt === 'webp' ? img.webp({ quality: 92 }) : img.jpeg({ quality: 92 })).toBuffer()
  return { out, fmt, m }
}

async function upload(storage, out, fmt) {
  const ext = fmt === 'jpeg' ? 'jpg' : fmt
  const newPath = storage.path.replace(/\.[^.]+$/, '') + `-fixed-${Date.now()}.${ext}`
  const r = await fetch(`${URL_BASE}/storage/v1/object/${storage.bucket}/${newPath}`, {
    method: 'POST', headers: { ...H, 'Content-Type': `image/${fmt}`, 'x-upsert': 'true' }, body: out,
  })
  if (!r.ok) throw new Error('upload: HTTP ' + r.status + ' ' + (await r.text()))
  return `${URL_BASE}${OBJ}${storage.bucket}/${newPath}`
}

const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n)
const safe = (s) => s.replace(/[^a-z0-9ąčęėįšųūž]+/gi, '-').toLowerCase()

async function preview(name, suffix, buf) {
  try { writeFileSync(resolve(reportDir, `${safe(name)}-${suffix}.jpg`), await sharp(buf).resize({ width: 420 }).jpeg({ quality: 80 }).toBuffer()) } catch {}
}

async function main() {
  mkdirSync(reportDir, { recursive: true })
  const cards = await rest('cards?select=id,name,image_url&image_url=not.is.null&order=name')
  console.log(`Kortų su paveikslu: ${cards.length}. Kryptis: ${DIR}. Režimas: ${FIX ? 'FIX' : 'dry-run'}\n`)

  const suspects = []
  let skippedLocal = 0
  for (const c of cards) {
    const isForced = FORCE.some((q) => c.name.toLowerCase().includes(q))
    if (ONLY && !isForced && !ONLY.some((q) => c.name.toLowerCase().includes(q))) continue

    // /cards/... = lokalūs failai repo public/ kataloge – patikrinti atskirai, jie tvarkingi
    if (!/^https?:\/\//.test(c.image_url)) { skippedLocal++; continue }

    let a
    try { a = await analyze(c.image_url) } catch (e) { a = { error: e.message } }
    if (a.error) { console.log(`✗ ${pad(c.name, 30)} nepasiekiamas (${a.error})`); continue }

    if (DUMP) { await preview(c.name, 'dump', a.base); console.log(`↓ ${pad(c.name, 30)} ${a.meta.width}x${a.meta.height} → img-report`) }

    const reasons = []
    if (a.exifRot) reasons.push(`EXIF=${a.meta.orientation}`)
    if (a.useTrim) reasons.push(`KRAŠTAI ${(a.trimFrac * 100).toFixed(0)}%`)
    if (a.landscape) reasons.push('GULSČIA')
    if (isForced && reasons.length === 0) reasons.push('FORCE')

    if (reasons.length > 0) {
      suspects.push({ c, a, isForced })
      console.log(`⚠ ${pad(c.name, 30)} ${pad(a.meta.width + 'x' + a.meta.height, 12)} → ${reasons.join(', ')}`)
      await preview(c.name, 'pries', a.base)
    }
  }

  if (skippedLocal) console.log(`(praleista ${skippedLocal} kortų su lokaliais /cards/ failais – jie patikrinti, tvarkingi)`)
  if (suspects.length === 0) { console.log('✓ Įtartinų kortų nerasta. Jei žinai blogą kortą – paleisk su --card "vardas".'); return }
  console.log(`\nĮtartinų: ${suspects.length}. Peržiūra: tools/img-report/*-pries.jpg`)

  if (!FIX) { console.log('Dry-run. Taisymui: fix-card-images.bat arba node tools/fix-card-images.mjs --fix'); return }
  if (!CAN_WRITE) {
    console.error('KLAIDA: taisymui reikia SECRET rakto (service_role eyJ… arba sb_secret_…) – Supabase Dashboard → Settings → API keys.')
    process.exit(1)
  }

  for (const s of suspects) {
    const storage = parseStorage(s.c.image_url)
    if (!storage) { console.log(`— ${s.c.name}: ne Supabase storage URL, praleista`); continue }
    try {
      const { out, fmt } = await buildFixed(s.a, s.isForced && !s.a.landscape)
      await preview(s.c.name, 'po', out)
      const newUrl = await upload(storage, out, fmt)
      await rest(`cards?id=eq.${s.c.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ image_url: newUrl }) })
      console.log(`✓ ${s.c.name}: pataisyta → ${newUrl}`)
    } catch (e) {
      console.log(`✗ ${s.c.name}: ${e.message}`)
    }
  }
  console.log('\nBaigta. Prieš/po: tools/img-report/. Jei pasukta ne į tą pusę – pakartok su --only "vardas" --dir ccw.')
}

main().catch((e) => { console.error('KLAIDA:', e.message ?? e); process.exit(1) })
