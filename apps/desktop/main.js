// ── Ravenof desktop shell (Electron) ─────────────────────────────────────────
// Serve'ina apps/digital/dist per savą app:// protokolą (SPA fallback į index.html),
// kad react-router keliai (/digital/...) ir absoliutūs asset'ai (/media/..., /ui3/...)
// veiktų kaip naršyklėje. Steam: steamworks.js (jei įdiegta ir yra steam_appid.txt).
const { app, BrowserWindow, protocol, net, shell, session, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { pathToFileURL } = require('node:url')
const steam = require('./steam')
const updater = require('./updater')   // OTA bundle'ai: userData/bundles/<versija> virš builtin (žr. updater.js)

const APP_ROOT = app.isPackaged ? path.join(process.resourcesPath, 'app') : path.resolve(__dirname, '../digital/dist')
const SCHEME = 'app'

protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }])

// Steam overlay reikalauja in-process GPU (žinomas Electron + Steamworks apribojimas).
app.commandLine.appendSwitch('in-process-gpu')
app.commandLine.appendSwitch('disable-direct-composition')

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  // 1) aktyvus OTA bundle'as (tik pasikeitę failai)  2) builtin (installeris)  3) SPA fallback į index.html (OTA → builtin)
  const ota = updater.resolve(clean.replace(/^\/+/, ''))
  if (ota) return ota
  const abs = path.normalize(path.join(APP_ROOT, clean))
  if (abs.startsWith(APP_ROOT) && fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs
  return updater.resolve('index.html') || path.join(APP_ROOT, 'index.html')
}

// ── Deep link `ravenof://auth/callback?code=…` (Google/Facebook prisijungimas) ─
// Supabase po OAuth nukreipia sistemos naršyklę į ravenof://…; Windows/Linux
// paleidžia antrą instanciją su URL argv'e → single-instance lock persiunčia jį čia.
// Dev (`npm start`) naudoja atskirą userData katalogą, kad nesipjautų su įdiegta
// programa (tas pats vardas → tas pats %APPDATA% → „Unable to move the cache" +
// single-instance lock iškart uždaro dev langą, jei įdiegtoji veikia).
if (!app.isPackaged) app.setPath('userData', app.getPath('userData') + '-dev')

const DEEP_SCHEME = 'ravenof'
let mainWin = null
let userToggled = false
function windowPrefsPath() { try { return path.join(app.getPath('userData'), 'window.json') } catch { return null } }
function readWindowPrefs() { try { const p = windowPrefsPath(); return p && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {} } catch { return {} } }
function writeWindowPrefs(o) { userToggled = true; try { const p = windowPrefsPath(); if (p) fs.writeFileSync(p, JSON.stringify({ ...readWindowPrefs(), ...o })) } catch { /* */ } }
let pendingDeepLink = null
function deepLinkFromArgv(argv) { return (argv || []).find((a) => typeof a === 'string' && a.startsWith(`${DEEP_SCHEME}://`)) || null }
function deliverDeepLink(url) {
  if (!url) return
  if (mainWin && !mainWin.isDestroyed()) {
    if (mainWin.isMinimized()) mainWin.restore()
    mainWin.focus()
    mainWin.webContents.send('auth:callback', url)
  } else pendingDeepLink = url
}
if (process.defaultApp && process.argv.length >= 2) app.setAsDefaultProtocolClient(DEEP_SCHEME, process.execPath, [path.resolve(process.argv[1])])
else app.setAsDefaultProtocolClient(DEEP_SCHEME)
if (!app.requestSingleInstanceLock()) { app.quit() }
else {
  app.on('second-instance', (_e, argv) => deliverDeepLink(deepLinkFromArgv(argv)))
  app.on('open-url', (e, url) => { e.preventDefault(); deliverDeepLink(url) })   // macOS
}

function createWindow() {
  // Pilnas ekranas VISADA (ne tik kovoje) – kaip žaidime. F11 / Alt+Enter perjungia į langą ir atgal,
  // pasirinkimas įsimenamas userData/window.json. Pirmas paleidimas – pilnas ekranas.
  const prefs = readWindowPrefs()
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 1024, minHeight: 600,
    fullscreen: prefs.fullscreen !== false,
    backgroundColor: '#0b0a09', title: 'Ravenof', autoHideMenuBar: true, icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, nodeIntegration: false },
  })
  win.setMenuBarVisibility(false)
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return
    const f11 = input.key === 'F11'
    const altEnter = input.alt && (input.key === 'Enter' || input.code === 'Enter')
    if (f11 || altEnter) { e.preventDefault(); win.setFullScreen(!win.isFullScreen()); writeWindowPrefs({ fullscreen: win.isFullScreen() }) }
  })
  // HTML5 fullscreen (kovos requestFullscreen/exitFullscreen) neturi išmesti lango iš pilno ekrano
  win.on('leave-full-screen', () => { if (prefs.fullscreen !== false && !userToggled) setTimeout(() => { if (!win.isDestroyed() && !win.isFullScreen()) win.setFullScreen(true) }, 50) })
  win.on('enter-full-screen', () => { userToggled = false })
  // Išorinės nuorodos – sistemos naršyklėje; viduje lieka tik app:// ir Supabase auth redirect'ai.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(`${SCHEME}://`)) { e.preventDefault(); shell.openExternal(url) } })
  win.loadURL(`${SCHEME}://ravenof/digital`)
  mainWin = win
  win.on('closed', () => { if (mainWin === win) mainWin = null })
  win.webContents.on('did-finish-load', () => { updater.armTrial(); if (pendingDeepLink) { const u = pendingDeepLink; pendingDeepLink = null; setTimeout(() => deliverDeepLink(u), 300) } })
  return win
}

app.whenReady().then(() => {
  // OTA: atmesti nepatvirtintą bundle'ą / įjungti laukiantį – PRIEŠ kuriant langą. onRevert – perkrauti po automatinio grįžimo.
  updater.init(APP_ROOT, { onRevert: () => { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.reloadIgnoringCache() } })
  protocol.handle(SCHEME, async (req) => {
    const u = new URL(req.url)
    const res = await net.fetch(pathToFileURL(resolveFile(u.pathname)).toString())
    // Be kešo: failai jau diske (greita), o po atnaujinimo Chromium kitaip rodytų senus asset'us.
    const headers = new Headers(res.headers)
    headers.set('Cache-Control', 'no-store')
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
  })
  // Supabase auth cookies (@supabase/ssr) – app:// origin'e veikia kaip https.
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => cb({ responseHeaders: details.responseHeaders }))
  steam.init()
  ipcMain.handle('steam:player', () => steam.player())
  ipcMain.handle('steam:unlock', (_e, slug) => steam.unlock(String(slug)))
  ipcMain.handle('shell:openExternal', (_e, url) => { const u = String(url); if (/^https?:\/\//.test(u)) return shell.openExternal(u) })
  // ── OTA updater IPC (renderer: src/lib/updater/electronAdapter.ts) ──
  const reloadWin = () => { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.reloadIgnoringCache() }
  ipcMain.handle('updater:info', () => updater.info())
  ipcMain.handle('updater:download', (e, o) => updater.download({ version: String(o?.version), manifestUrl: String(o?.manifestUrl) }, (pct) => { if (!e.sender.isDestroyed()) e.sender.send('updater:progress', pct) }))
  ipcMain.handle('updater:applyNext', (_e, v) => updater.applyNext(v))
  ipcMain.handle('updater:applyNow', (_e, v) => { if (updater.applyNow(v)) setTimeout(reloadWin, 50) })
  ipcMain.handle('updater:resetToBuiltin', () => { if (updater.resetToBuiltin()) setTimeout(reloadWin, 50) })
  ipcMain.handle('updater:markReady', () => updater.markReady())
  ipcMain.handle('updater:didFail', (_e, v) => updater.didFail(v))
  pendingDeepLink = deepLinkFromArgv(process.argv)
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { steam.shutdown(); app.quit() })
