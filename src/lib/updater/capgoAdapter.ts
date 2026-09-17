// ── Android / iOS adapteris: @capgo/capacitor-updater MANUAL režimu ───────────
// Pluginas gyvena native shell'e ir pasiekiamas per window.Capacitor.Plugins (kaip ir
// kiti pluginai – žr. src/lib/digital/native.ts), todėl jokio npm importo čia nėra ir
// web build'as nepaliečiamas. Capgo debesis NEnaudojamas: ką siųsti sprendžia
// rvn_get_release, pluginas tik parsiunčia, sudeda ir perjungia bundle'ą.
//
// Delta: `manifest` režime pluginas kiekvieną failą pirma ieško installerio (builtin)
// asset'uose ir ankstesniuose bundle'uose pagal SHA-256 – siunčiami tik pasikeitę failai.
import type { BundleManifest, ReleaseBundle, ShellInfo, UpdaterAdapter } from './types'

type CapgoBundle = { id: string; version: string; status: 'success' | 'error' | 'pending' | 'downloading' | 'deleted' | 'deleting' }
type CapgoPlugin = {
  notifyAppReady(): Promise<unknown>
  download(o: { url: string; version: string; manifest?: { file_name: string; file_hash: string; download_url: string }[] }): Promise<CapgoBundle>
  next(o: { id: string }): Promise<unknown>
  set(o: { id: string }): Promise<void>
  reset(o?: { toLastSuccessful?: boolean }): Promise<void>
  list(): Promise<{ bundles: CapgoBundle[] }>
  delete(o: { id: string }): Promise<void>
  setMultiDelay(o: { delayConditions: { kind: 'background' | 'kill' | 'nativeVersion' | 'date'; value?: string }[] }): Promise<void>
  addListener(name: 'download', cb: (e: { percent: number }) => void): Promise<{ remove: () => Promise<void> }>
}
type CapApp = { getInfo(): Promise<{ version: string; build: string }> }

function plugins(): { CapacitorUpdater?: CapgoPlugin; App?: CapApp } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = typeof window !== 'undefined' ? (window as any).Capacitor : null
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return null
  return cap.Plugins ?? null
}

export function capgoAvailable(): boolean { return !!plugins()?.CapacitorUpdater }

export function createCapgoAdapter(): UpdaterAdapter {
  const P = plugins()!.CapacitorUpdater!
  return {
    async info(): Promise<ShellInfo> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const platform = ((window as any).Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android') as ShellInfo['platform']
      let shellVersion = '0'
      try { shellVersion = (await plugins()?.App?.getInfo())?.version ?? '0' } catch { /* App pluginas nebūtinas */ }
      // android/app/build.gradle: versionName = "1.0.<APP_VERSION>" → builtin bundle'o versija = paskutinis segmentas
      const last = shellVersion.split('.').pop() ?? ''
      return { platform, shellVersion, builtinVersion: /^\d+$/.test(last) ? last : null }
    },

    async download(bundle: ReleaseBundle, onProgress) {
      const { bundles } = await P.list()
      const existing = bundles.find((b) => b.version === bundle.version)
      if (existing && (existing.status === 'success' || existing.status === 'pending')) return existing.id
      if (existing) { try { await P.delete({ id: existing.id }) } catch { /* jau ištrintas */ } }

      const res = await fetch(bundle.manifest_url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`manifest ${res.status}`)
      const manifest = (await res.json()) as BundleManifest
      if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error('empty manifest')

      const sub = await P.addListener('download', (e) => onProgress(Math.max(0, Math.min(100, e.percent))))
      try {
        const b = await P.download({
          url: bundle.manifest_url,          // pluginas reikalauja url; manifest režime zip nesiunčiamas
          version: bundle.version,
          manifest: manifest.files.map((f) => ({ file_name: f.file_name, file_hash: f.file_hash, download_url: f.download_url })),
        })
        return b.id
      } finally { void sub.remove() }
    },

    async applyNext(id) {
      // 'kill' – perjungti TIK po pilno app uždarymo. Be šito Capgo perjungtų vos app nuėjus į foną
      // (pvz. žaidėjas partijos metu atsiliepė į skambutį → grįžęs rastų persikrovusį žaidimą).
      try { await P.setMultiDelay({ delayConditions: [{ kind: 'kill' }] }) } catch { /* senesnė plugino versija */ }
      await P.next({ id })
    },
    async applyNow(id) { await P.set({ id }) },
    async resetToBuiltin() { await P.reset({ toLastSuccessful: false }) },
    async markReady() { await P.notifyAppReady() },
    // capacitor.config: autoDeleteFailed=false → nepavykęs bundle'as lieka sąraše su status 'error'
    async didFail(version) { const { bundles } = await P.list(); return bundles.some((b) => b.version === version && b.status === 'error') },
  }
}
