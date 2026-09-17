// ── Kliento updater'io tipai (OTA bundle'ai) ─────────────────────────────────
// Planas: claude/release-rollback-updater-planas.md; serveris: supabase/migrations/20260918_app_releases.sql

export type ReleaseBundle = {
  version: string
  version_num: number
  manifest_url: string
  files_count: number
  size_bytes: number
  engine_version: number
  notes_lt: string | null
  notes_en: string | null
  mandatory: boolean
}

/** rvn_get_release atsakymas */
export type ReleaseInfo = {
  channel: 'admin' | 'tester' | 'stable'
  maintenance: boolean
  maintenance_message_lt: string | null
  maintenance_message_en: string | null
  min_shell_version: string | null
  shell_outdated: boolean
  shell_download_url: string | null
  pvp_server_url: string | null
  flags: Record<string, boolean>
  bundle: ReleaseBundle | null
}

export type ManifestEntry = { file_name: string; file_hash: string; download_url: string; size?: number }
export type BundleManifest = { version: string; files: ManifestEntry[] }

export type ShellInfo = {
  platform: 'android' | 'ios' | 'desktop'
  /** APK versionName / Electron app versija */
  shellVersion: string
  /** APP_VERSION, su kuria buvo surinktas installeris (builtin bundle'as); null – nežinoma */
  builtinVersion: string | null
}

/** Platformos adapteris: Capgo (Android/iOS) arba Electron main procesas. */
export interface UpdaterAdapter {
  info(): Promise<ShellInfo>
  /** Atsisiunčia bundle'ą (tik pasikeitusius failus). Grąžina adapterio vidinį id. */
  download(bundle: ReleaseBundle, onProgress: (percent: number) => void): Promise<string>
  /** Įsigalios per KITĄ šaltą paleidimą (niekada partijos viduryje). */
  applyNext(id: string): Promise<void>
  /** Įsigalioja iškart – app persikrauna. */
  applyNow(id: string): Promise<void>
  /** Grįžti į installerio (builtin) bundle'ą – app persikrauna. */
  resetToBuiltin(): Promise<void>
  /** „Aš užsikroviau" – be šito per appReadyTimeout shell'as pats grįžta į ankstesnį bundle'ą. */
  markReady(): Promise<void>
  /** Ar shell'as atmetė šią versiją (neužsikrovė laiku ir buvo grąžinta ankstesnė)? */
  didFail(version: string): Promise<boolean>
}

export type UpdaterPhase =
  | 'idle'          // nieko nevyksta / viskas naujausia
  | 'checking'
  | 'downloading'   // fone arba blokuojančiai (žr. blocking)
  | 'ready'         // atsisiųsta, įsigalios per kitą paleidimą; galima „Atnaujinti dabar"
  | 'applying'
  | 'maintenance'
  | 'shell_outdated'
  | 'error'

export type UpdaterState = {
  phase: UpdaterPhase
  /** true → UI rodo pilno ekrano užsklandą */
  blocking: boolean
  percent: number
  release: ReleaseInfo | null
  target: ReleaseBundle | null
  readyId: string | null
  error: string | null
}
