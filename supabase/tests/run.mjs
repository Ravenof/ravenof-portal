#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  Progression v2 — SQL integraciniai testai prieš tikrą PostgreSQL.
//  Naudojimas:
//    PGHOST=/tmp/pgsock PGPORT=55432 PGUSER=postgres node supabase/tests/run.mjs
//  Aplinka: lokalus Postgres 16 (žr. docs/PROGRESSION-BACKEND-IMPLEMENTATION.md).
//  Stendas: supabase/tests/_bootstrap.sql (produkcijos formos schema snapshot)
//           + supabase/migrations/20260840..20260845_progression_*.sql
// ════════════════════════════════════════════════════════════════════════════
import { execFileSync, execFile } from 'node:child_process'
import { promisify } from 'node:util'
const execFileP = promisify(execFile)
import fs from 'node:fs'
import path from 'node:path'

const DB = process.env.RVN_TEST_DB ?? 'rvntest'
const ROOT = process.cwd()
const MIGRATIONS = fs.readdirSync(path.join(ROOT, 'supabase/migrations'))
  .filter((f) => /^2026084\d_.*\.sql$/.test(f)).sort()

function psql(args, opts = {}) {
  return execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts,
  })
}
const q = (sql) => psql(['-d', DB, '-tAc', sql]).trim()

console.log('── stendas: schema + migracijos ──')
psql(['-d', 'postgres', '-tAc', `drop database if exists ${DB}`])
psql(['-d', 'postgres', '-tAc', `create database ${DB}`])
psql(['-d', DB, '-f', 'supabase/tests/_bootstrap.sql'])
for (const m of MIGRATIONS) {
  psql(['-d', DB, '-f', path.join('supabase/migrations', m)])
  console.log('   ✓', m)
}

// ── mini test runner ────────────────────────────────────────────────────────
let pass = 0, fail = 0
const failures = []
function check(name, fn) {
  try {
    fn()
    pass++; console.log('   ✓', name)
  } catch (e) {
    fail++; failures.push({ name, message: String(e.message ?? e).split('\n').slice(0, 6).join('\n') })
    console.log('   ✗', name)
  }
}
function eq(actual, expected, what = '') {
  if (String(actual) !== String(expected)) {
    throw new Error(`${what || 'reikšmė'}: laukta ${JSON.stringify(expected)}, gauta ${JSON.stringify(actual)}`)
  }
}
function truthy(v, what = '') { if (!v) throw new Error(`${what}: laukta teisinga reikšmė, gauta ${JSON.stringify(v)}`) }

// SQL vykdymas konkretaus vartotojo vardu (auth.uid() stubas per GUC)
function asUser(uid, sql) {
  return q(`set local role none; select set_config('test.uid','${uid}',true); ${sql}`)
}
function rpc(uid, call) {
  const out = psql(['-d', DB, '-tAc',
    `begin; select set_config('test.uid','${uid}',false); select ${call}; commit;`])
  const lines = out.trim().split('\n').filter(Boolean)
  return JSON.parse(lines[lines.length - 1])
}
function sql(s) { return q(s) }

// tikra lygiagreti apkrova: N atskirų psql procesų vienu metu
async function parallelRpc(uid, call, n) {
  const jobs = Array.from({ length: n }, () => execFileP('psql', ['-X', '-q', '-d', DB, '-tAc',
    `begin; select set_config('test.uid','${uid}',false); select ${call}; commit;`],
    { encoding: 'utf8' }).then((r) => r.stdout.trim()).catch((e) => 'ERR:' + String(e.stderr ?? e.message)))
  return Promise.all(jobs)
}

// vykdymas kaip `authenticated` rolė (RLS patikroms)
function asAuthenticated(uid, s) {
  const out = psql(['-d', DB, '-tAc',
    `begin; select set_config('test.uid','${uid}',false); set local role authenticated; ${s}; commit;`]).trim()
  const lines = out.split('\n').filter(Boolean)
  return lines[lines.length - 1] ?? ''
}
function json(s) { const r = q(s); return r ? JSON.parse(r) : null }

const files = fs.readdirSync(path.join(ROOT, 'supabase/tests'))
  .filter((f) => /^test_.*\.mjs$/.test(f)).sort()

const ctx = { q, psql, rpc, sql, json, check, eq, truthy, asUser, parallelRpc, asAuthenticated, DB }

for (const f of files) {
  console.log(`\n── ${f} ──`)
  const mod = await import(path.join(ROOT, 'supabase/tests', f))
  await mod.run(ctx)
}

console.log(`\n════ REZULTATAS: ${pass} praėjo · ${fail} krito ════`)
for (const f of failures) console.log(`  ✗ ${f.name}\n    ${f.message.replace(/\n/g, '\n    ')}`)
process.exit(fail === 0 ? 0 : 1)
