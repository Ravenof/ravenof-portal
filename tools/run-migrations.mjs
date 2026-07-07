// ════════════════════════════════════════════════════════════════════════════
//  Ravenof — ekonomikos migracijų paleidimas (20260810–20260818) per Postgres
//  Naudoja DATABASE_URL (Supabase connection string). Paleidžia failus eilės
//  tvarka. Idempotentiška (create if not exists / on conflict / create or replace),
//  tad pakartotinis paleidimas saugus. Sustoja ties pirma klaida.
//
//  Naudojimas: run-migrations.bat  (jis prašo DATABASE_URL ir įdiegia „pg")
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const URLc = (process.env.DATABASE_URL || '').trim()
if (!URLc) { console.error('❌ Trūksta DATABASE_URL (Supabase connection string).'); process.exit(1) }

let pg
try { pg = await import('pg') } catch { console.error('❌ Trūksta „pg". Paleisk: npm i -D pg'); process.exit(1) }
const { Client } = pg.default ?? pg

const dir = 'supabase/migrations'
// tik ekonomikos migracijos 20260810..20260819, eilės tvarka
const files = readdirSync(dir).filter((f) => /^2026081[0-9]_.*\.sql$/.test(f)).sort()
if (files.length === 0) { console.error('❌ Nerasta migracijų 2026081x'); process.exit(1) }
console.log('Migracijos eilės tvarka:\n  ' + files.join('\n  ') + '\n')

const client = new Client({ connectionString: URLc, ssl: { rejectUnauthorized: false } })
try {
  await client.connect()
  console.log('✓ Prisijungta prie DB\n')
} catch (e) { console.error('❌ Nepavyko prisijungti:', e.message); process.exit(1) }

let okCount = 0
for (const f of files) {
  const sql = readFileSync(path.join(dir, f), 'utf8')
  process.stdout.write(`→ ${f} … `)
  try {
    await client.query(sql)
    console.log('✓')
    okCount++
  } catch (e) {
    console.log('❌')
    console.error(`\n   KLAIDA (${f}):\n   ${e.message}\n`)
    console.error('   Sustabdyta. Pataisyk ir paleisk vėl (jau pritaikytos migr. persileis be žalos).')
    await client.end()
    process.exit(1)
  }
}
await client.end()
console.log(`\n✅ Baigta. Sėkmingai pritaikyta: ${okCount}/${files.length}`)
