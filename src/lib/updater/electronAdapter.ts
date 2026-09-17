// ── Desktop adapteris: visa logika Electron MAIN procese (apps/desktop/updater.js) ──
// Renderer'is tik perduoda, ką siųsti. Privalumas prieš Android: updater'is gyvena apvalkale,
// ne bundle'e, todėl sugadintas bundle'as negali sugadinti paties atnaujinimo.
import type { ReleaseBundle, ShellInfo, UpdaterAdapter } from './types'

type DesktopUpdaterBridge = {
  info(): Promise<{ shellVersion: string; builtinVersion: string | null; activeVersion: string | null }>
  download(o: { version: string; manifestUrl: string }): Promise<{ ok: true } | { ok: false; error: string }>
  applyNext(version: string): Promise<void>
  applyNow(version: string): Promise<void>
  resetToBuiltin(): Promise<void>
  markReady(): Promise<void>
  didFail(version: string): Promise<boolean>
  onProgress(cb: (percent: number) => void): () => void
}

function bridge(): DesktopUpdaterBridge | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((window as any).ravenofDesktop?.updater as DesktopUpdaterBridge | undefined) ?? null
}

export function electronUpdaterAvailable(): boolean { return !!bridge() }

export function createElectronAdapter(): UpdaterAdapter {
  const B = bridge()!
  return {
    async info(): Promise<ShellInfo> {
      const i = await B.info()
      return { platform: 'desktop', shellVersion: i.shellVersion, builtinVersion: i.builtinVersion }
    },
    async download(bundle: ReleaseBundle, onProgress) {
      const off = B.onProgress(onProgress)
      try {
        const r = await B.download({ version: bundle.version, manifestUrl: bundle.manifest_url })
        if (!r.ok) throw new Error(r.error)
        return bundle.version
      } finally { off() }
    },
    applyNext: (id) => B.applyNext(id),
    applyNow: (id) => B.applyNow(id),
    resetToBuiltin: () => B.resetToBuiltin(),
    markReady: () => B.markReady(),
    didFail: (version) => B.didFail(version),
  }
}
