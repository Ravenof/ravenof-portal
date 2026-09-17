// ── Preload: siauras, saugus tiltas į Steam ───────────────────────────────────
// window.ravenofDesktop.{platform, steamPlayer(), unlockAchievement(slug)}.
// Klientas (src/lib/digital/native.ts) gali tikrinti `window.ravenofDesktop` – kaip isNativeApp().
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('ravenofDesktop', {
  platform: process.platform,
  steamPlayer: () => ipcRenderer.invoke('steam:player'),
  unlockAchievement: (slug) => ipcRenderer.invoke('steam:unlock', slug),
  // OAuth (Google/Facebook): atidaryti sistemos naršyklę ir gauti ravenof:// grįžimą
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  onAuthCallback: (cb) => {
    const h = (_e, url) => cb(url)
    ipcRenderer.on('auth:callback', h)
    return () => ipcRenderer.removeListener('auth:callback', h)
  },
  // OTA bundle updater (logika main procese – apps/desktop/updater.js)
  updater: {
    info: () => ipcRenderer.invoke('updater:info'),
    download: (o) => ipcRenderer.invoke('updater:download', o),
    applyNext: (version) => ipcRenderer.invoke('updater:applyNext', version),
    applyNow: (version) => ipcRenderer.invoke('updater:applyNow', version),
    resetToBuiltin: () => ipcRenderer.invoke('updater:resetToBuiltin'),
    markReady: () => ipcRenderer.invoke('updater:markReady'),
    didFail: (version) => ipcRenderer.invoke('updater:didFail', version),
    onProgress: (cb) => {
      const h = (_e, pct) => cb(pct)
      ipcRenderer.on('updater:progress', h)
      return () => ipcRenderer.removeListener('updater:progress', h)
    },
  },
})
