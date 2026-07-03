// Patikrina, ką grąžina Supabase /render/image transformacija konkrečiai kortai.
// Naudojimas: node tools/check-transform.mjs [kortos vardas, default Ryu]
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rep = resolve(root, 'tools', 'img-report')
const env = (n) => (readFileSync(resolve(root, '.env.local'), 'utf8').match(new RegExp('^' + n + '=(.*)$', 'm')) ?? [])[1]?.trim()
const URL_BASE = env('NEXT_PUBLIC_SUPABASE_URL')
const KEY = env('NEXT_PUBLIC_SUPABASE_ANON_KEY') || env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
const NAME = process.argv[2] ?? 'Ryu'
const OBJ = '/storage/v1/object/public/'
const RENDER = '/storage/v1/render/image/public/'

const main = async () => {
  mkdirSync(rep, { recursive: true })
  const r = await fetch(`${URL_BASE}/rest/v1/cards?name=ilike.*${encodeURIComponent(NAME)}*&select=name,image_url&limit=3`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  const rows = await r.json()
  for (const c of rows) {
    console.log(`\n■ ${c.name}\n  URL: ${c.image_url}`)
    if (!c.image_url?.includes(OBJ)) { console.log('  (ne supabase storage – transformacija nenaudojama)'); continue }
    const orig = await fetch(c.image_url); const ob = Buffer.from(await orig.arrayBuffer())
    const om = await sharp(ob).metadata()
    console.log(`  Originalas: ${om.width}x${om.height} (${om.format})`)
    for (const q of ['width=360&quality=72', 'width=240&quality=72', 'width=360&quality=72&resize=contain']) {
      const turl = c.image_url.replace(OBJ, RENDER).split('?')[0] + '?' + q
      const t = await fetch(turl)
      if (!t.ok) { console.log(`  ?${q} → HTTP ${t.status} ${(await t.text()).slice(0, 120)}`); continue }
      const tb = Buffer.from(await t.arrayBuffer())
      const tm = await sharp(tb).metadata()
      const ratioO = (om.width / om.height).toFixed(3), ratioT = (tm.width / tm.height).toFixed(3)
      console.log(`  ?${q} → ${tm.width}x${tm.height} (${tm.format})  ratio ${ratioT} vs orig ${ratioO} ${ratioO === ratioT ? 'OK' : '!!! IŠKRAIPYTA'}`)
      writeFileSync(resolve(rep, `${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-t-${q.match(/width=(\d+)/)[1]}${q.includes('contain') ? '-contain' : ''}.jpg`),
        await sharp(tb).jpeg({ quality: 80 }).toBuffer())
    }
  }
}
main().catch((e) => console.error('KLAIDA:', e.message))
