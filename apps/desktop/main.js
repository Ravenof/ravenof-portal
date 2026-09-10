// ── Ravenof desktop shell (Electron) ─────────────────────────────────────────
// Serve'ina apps/digital/dist per savą app:// protokolą (SPA fallback į index.html),
// kad react-router keliai (/digital/...) ir absoliutūs asset'ai (/media/..., /ui3/...)
// veiktų kaip naršyklėje. Steam: steamworks.js (jei įdiegta ir yra steam_appid.txt).
const { app, BrowserWindow, protocol, net, shell, session, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { pathToFileURL } = require('node:url')
const steam = require('./steam')

const APP_ROOT = app.isPackaged ? path.join(process.resourcesPath, 'app') : path.resolve(__dirname, '../digital/dist')
const SCHEME = 'app'

protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }])

// Steam overlay reikalauja in-process GPU (žinomas Electron + Steamworks apribojimas).
app.commandLine.appendSwitch('in-process-gpu')
app.commandLine.appendSwitch('disable-direct-composition')

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  const abs = path.normalize(path.join(APP_ROOT, clean))
  if (!abs.startsWith(APP_ROOT)) return path.join(APP_ROOT, 'index.html')
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs
  return path.join(APP_ROOT, 'index.html')   // SPA fallback
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
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 1024, minHeight: 600,
    backgroundColor: '#0b0a09', title: 'Ravenof', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, nodeIntegration: false },
  })
  win.setMenuBarVisibility(false)
  // Išorinės nuorodos – sistemos naršyklėje; viduje lieka tik app:// ir Supabase auth redirect'ai.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(`${SCHEME}://`)) { e.preventDefault(); shell.openExternal(url) } })
  win.loadURL(`${SCHEME}://ravenof/digital`)
  mainWin = win
  win.on('closed', () => { if (mainWin === win) mainWin = null })
  win.webContents.on('did-finish-load', () => { if (pendingDeepLink) { const u = pendingDeepLink; pendingDeepLink = null; setTimeout(() => deliverDeepLink(u), 300) } })
  return win
}

app.whenReady().then(() => {
  protocol.handle(SCHEME, (req) => {
    const u = new URL(req.url)
    return net.fetch(pathToFileURL(resolveFile(u.pathname)).toString())
  })
  // Supabase auth cookies (@supabase/ssr) – app:// origin'e veikia kaip https.
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => cb({ responseHeaders: details.responseHeaders }))
  steam.init()
  ipcMain.handle('steam:player', () => steam.player())
  ipcMain.handle('steam:unlock', (_e, slug) => steam.unlock(String(slug)))
  ipcMain.handle('shell:openExternal', (_e, url) => { const u = String(url); if (/^https?:\/\//.test(u)) return shell.openExternal(u) })
  pendingDeepLink = deepLinkFromArgv(process.argv)
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { steam.shutdown(); app.quit() })
