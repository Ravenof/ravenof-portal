// ── Preload: siauras, saugus tiltas į Steam ───────────────────────────────────
// window.ravenofDesktop.{platform, steamPlayer(), unlockAchievement(slug)}.
// Klientas (src/lib/digital/native.ts) gali tikrinti `window.ravenofDesktop` – kaip isNativeApp().
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('ravenofDesktop', {
  platform: process.platform,
  steamPlayer: () => ipcRenderer.invoke('steam:player'),
  unlockAchievement: (slug) => ipcRenderer.invoke('steam:unlock', slug),
})
