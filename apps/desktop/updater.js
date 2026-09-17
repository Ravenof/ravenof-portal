// ── Ravenof desktop: OTA bundle updater (Electron MAIN procesas) ─────────────
// Installeryje (resources/app) guli „builtin" bundle'as. Atnaujinimai – tai TIK pasikeitę failai,
// sudėti į  %APPDATA%/Ravenof/bundles/<versija>/ ; app:// handler'is pirma ieško ten, tada builtin'e.
// Todėl kasdieniam update'ui naujo EXE nereikia, o atnaujinimas sveria kelis MB, ne ~300 MB.
//
// Savisauga („trial"): naujai įjungtas bundle'as per TRIAL_MS turi iškviesti markReady() (tai daro
// src/lib/updater/core.ts, kai žaidimas užsikrovė). Jei ne – arba jei app buvo uždaryta/nulūžo
// nepatvirtinus – bundle'as pažymimas blogu ir grįžtama į ankstesnį. Updater'is gyvena ČIA, ne
// bundle'e, todėl sugadintas bundle'as negali sugadinti paties atnaujinimo mechanizmo.
//
// Ką siųsti ir kada – sprendžia renderer'is pagal rvn_get_release (kanalai admin → tester → stable).
const { app, net } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const crypto = require('node:crypto')

const TRIAL_MS = 20_000
const CONCURRENCY = 6
const KEEP_BAD_MS = 24 * 3600_000

let APP_ROOT = ''
let ROOT = ''            // …/userData/bundles
let STATE_FILE = ''
let state = { shellVersion: '', active: null, previous: null, pending: null, trial: false, bad: {} }
let trialTimer = null
let onRevert = () => {}  // main.js: perkrauti langą po automatinio grįžimo
let downloading = null

const log = (...a) => console.log('[updater]', ...a)
const dirOf = (version) => path.join(ROOT, String(version).replace(/[^A-Za-z0-9._-]/g, '_'))
const save = () => { try { fs.mkdirSync(ROOT, { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(state)) } catch (e) { log('state save failed', e.message) } }
const hasBundle = (version) => !!version && fs.existsSync(path.join(dirOf(version), 'bundle.json'))

function sha256File(abs) {
  return new Promise((res, rej) => { const h = crypto.createHash('sha256'); fs.createReadStream(abs).on('data', (d) => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej) })
}
/** Saugus santykinis kelias (be .., be absoliučių) → absoliutus kelias `base` viduje arba null. */
function safeJoin(base, rel) {
  const clean = String(rel).replace(/\\/g, '/')
  if (!clean || clean.startsWith('/') || clean.split('/').some((s) => s === '..' || s === '')) return null
  const abs = path.normalize(path.join(base, clean))
  return abs.startsWith(base + path.sep) ? abs : null
}

function failActive(reason) {
  const bad = state.active
  if (!bad) { state.trial = false; save(); return }
  log(`bundle ${bad} rejected (${reason}) → back to ${hasBundle(state.previous) ? state.previous : 'builtin'}`)
  state.bad[bad] = Date.now()
  state.active = hasBundle(state.previous) ? state.previous : null
  state.previous = null
  state.trial = false
  save()
}

function activatePending() {
  if (!state.pending) return false
  if (!hasBundle(state.pending)) { state.pending = null; save(); return false }
  state.previous = state.active
  state.active = state.pending
  state.pending = null
  state.trial = true
  save()
  log(`activated ${state.active} (trial)`)
  return true
}

function cleanup() {
  try {
    const keep = new Set([state.active, state.previous, state.pending].filter(Boolean).map((v) => path.basename(dirOf(v))))
    for (const name of fs.readdirSync(ROOT)) {
      const abs = path.join(ROOT, name)
      if (!fs.statSync(abs).isDirectory() || keep.has(name)) continue
      fs.rmSync(abs, { recursive: true, force: true })
    }
    for (const [v, t] of Object.entries(state.bad)) if (Date.now() - t > KEEP_BAD_MS) delete state.bad[v]
    save()
  } catch { /* nekritiška */ }
}

/** Kviesti app.whenReady() pradžioje, PRIEŠ kuriant langą. */
function init(appRoot, hooks = {}) {
  APP_ROOT = appRoot
  ROOT = path.join(app.getPath('userData'), 'bundles')
  STATE_FILE = path.join(ROOT, 'state.json')
  onRevert = hooks.onRevert || onRevert
  try { state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) } } catch { /* pirmas paleidimas */ }
  state.bad = state.bad || {}

  // Įdiegtas naujas installeris → jo builtin laikom naujausiu, senus OTA bundle'us metam (kaip Capgo resetWhenUpdate).
  if (state.shellVersion !== app.getVersion()) {
    log(`shell ${state.shellVersion || '-'} → ${app.getVersion()}: reset to builtin`)
    state = { shellVersion: app.getVersion(), active: null, previous: null, pending: null, trial: false, bad: {} }
    save()
  }
  // Praeitą kartą bundle'as taip ir nepatvirtino, kad užsikrovė (nulūžo / uždarytas per trial) → atmetam.
  if (state.trial) failActive('not confirmed on previous run')
  if (state.active && !hasBundle(state.active)) { state.active = null; save() }
  activatePending()
  cleanup()
}

/** Kviesti po kiekvieno lango užkrovimo (did-finish-load). */
function armTrial() {
  clearTimeout(trialTimer)
  if (!state.trial) return
  trialTimer = setTimeout(() => {
    if (!state.trial) return
    failActive(`no markReady within ${TRIAL_MS} ms`)
    onRevert()
  }, TRIAL_MS)
}

function markReady() {
  clearTimeout(trialTimer)
  if (state.trial) { state.trial = false; save(); log(`bundle ${state.active} confirmed`) }
}

/** app:// failo paieška: aktyvus OTA bundle'as → builtin. Grąžina absoliutų kelią arba null. */
function resolve(relPath) {
  if (state.active) {
    const abs = safeJoin(dirOf(state.active), relPath)
    if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs
  }
  return null
}

function builtinVersion() {
  try { return String(JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'version.json'), 'utf8')).version) } catch { return null }
}

async function fetchBuffer(url) {
  if (!/^https:\/\//.test(url)) throw new Error('only https downloads allowed')
  const res = await net.fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Atsisiunčia bundle'ą: tik failus, kurių nėra builtin'e / aktyviame bundle'e tuo pačiu hash'u. */
async function download({ version, manifestUrl }, onProgress = () => {}) {
  if (downloading) return downloading
  downloading = (async () => {
    try {
      version = String(version)
      if (hasBundle(version)) return { ok: true }
      const manifest = JSON.parse((await fetchBuffer(manifestUrl)).toString('utf8'))
      const files = Array.isArray(manifest.files) ? manifest.files : []
      if (!files.length) throw new Error('empty manifest')
      if (String(manifest.version) !== version) throw new Error(`manifest version ${manifest.version} != ${version}`)

      const finalDir = dirOf(version)
      const tmpDir = finalDir + '.tmp'
      await fsp.rm(tmpDir, { recursive: true, force: true })
      await fsp.mkdir(tmpDir, { recursive: true })
      const activeDir = state.active ? dirOf(state.active) : null
      const placed = {}
      let done = 0
      const queue = [...files]
      const worker = async () => {
        while (queue.length) {
          const f = queue.shift()
          const hash = String(f.file_hash || '').toLowerCase()
          if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error(`bad hash for ${f.file_name}`)
          const dest = safeJoin(tmpDir, f.file_name)
          if (!dest) throw new Error(`unsafe path ${f.file_name}`)
          const builtinAbs = safeJoin(APP_ROOT, f.file_name)
          if (builtinAbs && fs.existsSync(builtinAbs) && (await sha256File(builtinAbs)) === hash) {
            placed[f.file_name] = 'builtin'                       // jau yra installeryje – nieko nedarom
          } else {
            await fsp.mkdir(path.dirname(dest), { recursive: true })
            const prevAbs = activeDir ? safeJoin(activeDir, f.file_name) : null
            if (prevAbs && fs.existsSync(prevAbs) && (await sha256File(prevAbs)) === hash) {
              await fsp.copyFile(prevAbs, dest)                   // nepasikeitė nuo dabartinio OTA bundle'o
            } else {
              const buf = await fetchBuffer(f.download_url)
              const got = crypto.createHash('sha256').update(buf).digest('hex')
              if (got !== hash) throw new Error(`hash mismatch ${f.file_name}`)
              await fsp.writeFile(dest, buf)
            }
            placed[f.file_name] = 'ota'
          }
          done++
          if (done % 20 === 0 || done === files.length) onProgress(Math.round((done / files.length) * 100))
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, worker))
      if (placed['index.html'] !== 'ota' && placed['index.html'] !== 'builtin') throw new Error('manifest has no index.html')
      await fsp.writeFile(path.join(tmpDir, 'bundle.json'), JSON.stringify({ version, createdAt: new Date().toISOString(), files: placed }))
      await fsp.rm(finalDir, { recursive: true, force: true })
      await fsp.rename(tmpDir, finalDir)
      log(`downloaded ${version}: ${Object.values(placed).filter((x) => x === 'ota').length} changed / ${files.length} files`)
      return { ok: true }
    } catch (e) {
      log('download failed:', e.message)
      return { ok: false, error: e.message }
    } finally { downloading = null }
  })()
  return downloading
}

function applyNext(version) { version = String(version); if (hasBundle(version)) { state.pending = version; save() } }
/** Grąžina true, jei reikia perkrauti langą. */
function applyNow(version) { applyNext(version); return activatePending() }
function resetToBuiltin() { state.active = null; state.previous = null; state.pending = null; state.trial = false; save(); return true }

function info() { return { shellVersion: app.getVersion(), builtinVersion: builtinVersion(), activeVersion: state.active } }
function didFail(version) { return !!state.bad[String(version)] }

module.exports = { init, armTrial, markReady, resolve, download, applyNext, applyNow, resetToBuiltin, info, didFail }
