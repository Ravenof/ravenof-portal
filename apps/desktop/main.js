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
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { steam.shutdown(); app.quit() })
