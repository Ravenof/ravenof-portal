// ── Kortų paveikslų skeneris / taisytojas ─────────────────────────────────────
// Skenuoja cards.image_url (ir packs.image_url – tik ataskaitai):
//   • EXIF orientacija ≠ 1  → pataisoma automatiškai (auto-orient)
//   • landscape (w > h)     → korta gulsčia; --fix pasuka 90° (--dir cw|ccw)
//   • report only           → labai balti kraštai / print bleed neaptinkami,
//                             tokius (pvz. „Atsitraukimas") reikia re-upload'inti
//
// Naudojimas:
//   node tools/fix-card-images.mjs                    # dry-run ataskaita
//   node tools/fix-card-images.mjs --fix              # taiso visus įtartinus
//   node tools/fix-card-images.mjs --fix --only Ryu   # tik nurodytas (dalis vardo, CSV)
//   node tools/fix-card-images.mjs --fix --dir ccw    # sukimo kryptis (default cw)
//
// Pataisytas failas įkeliamas NAUJU vardu (…-fixed-<laikas>.<ext>) ir
// cards.image_url atnaujinamas – taip apeinamas Supabase CDN kešas.
// Reikia: SUPABASE_SERVICE_ROLE_KEY (env arba .env.local).

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function envLocal(name) {
  try {
    const m = readFileSync(resolve(root, '.env.local'), 'utf8').match(new RegExp('^' + name + '=(.*)$', 'm'))
    return m ? m[1].trim() : null
  } catch { return null }
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || envLocal('NEXT_PUBLIC_SUPABASE_URL')
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envLocal('SUPABASE_SERVICE_ROLE_KEY')
if (!URL_BASE || !KEY) {
  console.error('Trūksta NEXT_PUBLIC_SUPABASE_URL arba SUPABASE_SERVICE_ROLE_KEY (env / .env.local).')
  process.exit(1)
}

const args = process.argv.slice(2)
const FIX = args.includes('--fix')
const DIR = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : 'cw'
const ONLY = args.includes('--only')
  ? args[args.indexOf('--only') + 1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  : null
const ANGLE = DIR === 'ccw' ? 270 : 90

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
  const rest = url.slice(i + OBJ.length).split('?')[0]
  const bucket = rest.slice(0, rest.indexOf('/'))
  return { bucket, path: decodeURIComponent(rest.slice(rest.indexOf('/') + 1)) }
}

async function inspect(url) {
  const r = await fetch(url.split('?')[0])
  if (!r.ok) return { error: 'HTTP ' + r.status }
  const buf = Buffer.from(await r.arrayBuffer())
  const meta = await sharp(buf).metadata()
  return { buf, meta }
}

async function uploadFixed(storage, buf, meta, rotateAngle) {
  let img = sharp(buf).rotate() // pritaiko EXIF
  if (rotateAngle) img = img.rotate(rotateAngle)
  const fmt = meta.format === 'png' ? 'png' : meta.format === 'webp' ? 'webp' : 'jpeg'
  const out = await (fmt === 'png' ? img.png() : fmt === 'webp' ? img.webp({ quality: 92 }) : img.jpeg({ quality: 92 })).toBuffer()
  const ext = fmt === 'jpeg' ? 'jpg' : fmt
  const newPath = storage.path.replace(/\.[^.]+$/, '') + `-fixed-${Date.now()}.${ext}`
  const r = await fetch(`${URL_BASE}/storage/v1/object/${storage.bucket}/${newPath}`, {
    method: 'POST', headers: { ...H, 'Content-Type': `image/${fmt}`, 'x-upsert': 'true' }, body: out,
  })
  if (!r.ok) throw new Error('upload: HTTP ' + r.status + ' ' + (await r.text()))
  return `${URL_BASE}${OBJ}${storage.bucket}/${newPath}`
}

const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n)

async function main() {
  const cards = await rest('cards?select=id,name,image_url&image_url=not.is.null&order=name')
  const packs = await rest('packs?select=id,name,image_url&image_url=not.is.null').catch(() => [])
  console.log(`Kortų su paveikslu: ${cards.length}, pakuočių: ${packs.length}\n`)

  const suspects = []
  for (const c of cards) {
    const { buf, meta, error } = await inspect(c.image_url)
    if (error) { console.log(`✗ ${pad(c.name, 30)} nepasiekiamas (${error})`); continue }
    const exifRot = (meta.orientation ?? 1) > 1
    // matmenys PO exif (5-8 orientacijos apkeičia w/h)
    const [w, h] = (meta.orientation ?? 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height]
    const landscape = w > h
    if (exifRot || landscape) {
      suspects.push({ c, buf, meta, exifRot, landscape })
      console.log(`⚠ ${pad(c.name, 30)} ${pad(meta.width + 'x' + meta.height, 12)} ${exifRot ? `EXIF=${meta.orientation} ` : ''}${landscape ? 'GULSČIA' : ''}`)
    }
  }
  for (const p of packs) {
    const { meta, error } = await inspect(p.image_url)
    if (!error && meta.width > meta.height) console.log(`⚠ [pack] ${pad(p.name, 24)} ${meta.width}x${meta.height} GULSČIA (taisyti per admin)`)
  }

  if (suspects.length === 0) { console.log('✓ Įtartinų kortų nerasta.'); return }
  console.log(`\nĮtartinų kortų: ${suspects.length}`)

  if (!FIX) { console.log('Dry-run. Taisymui: node tools/fix-card-images.mjs --fix  [--only vardas] [--dir cw|ccw]'); return }

  for (const s of suspects) {
    if (ONLY && !ONLY.some((q) => s.c.name.toLowerCase().includes(q))) continue
    const storage = parseStorage(s.c.image_url)
    if (!storage) { console.log(`— ${s.c.name}: ne Supabase storage URL, praleista`); continue }
    try {
      // EXIF taisosi vien .rotate(); gulsčiai dar +90°/-90°
      const angle = s.landscape ? ANGLE : 0
      const newUrl = await uploadFixed(storage, s.buf, s.meta, angle)
      await rest(`cards?id=eq.${s.c.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ image_url: newUrl }) })
      console.log(`✓ ${s.c.name}: pataisyta (${angle ? 'pasukta ' + (DIR === 'ccw' ? '-90°' : '+90°') : 'EXIF'}) → ${newUrl}`)
    } catch (e) {
      console.log(`✗ ${s.c.name}: ${e.message}`)
    }
  }
  console.log('\nBaigta. Jei korta pasukta į priešingą pusę – paleisk dar kartą su --only "vardas" --dir ccw (arba cw).')
  console.log('Print-bleed / balti kraštai (pvz. Atsitraukimas) netaisomi automatiškai – re-upload per admin.')
}

main().catch((e) => { console.error(e); process.exit(1) })
