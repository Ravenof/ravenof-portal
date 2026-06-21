// ── Ravenof Digital — vartotojo nustatymai (garsumas, efektai) ───────────────
// Atskiri muzikos / SFX garsumo lygiai + summon efektų jungiklis. Standalone
// modulis (be priklausomybių nuo audio variklių, kad nebūtų ciklų). Šaltinis —
// localStorage (greitas pritaikymas); papildomai sinchronizuojama su DB per
// vartotoją (žr. settings-sync.ts), kad išliktų ir kitame įrenginyje.

const K_MUSIC = 'rvn-music-volume'
const K_SFX = 'rvn-sfx-volume'
const K_SUMMON = 'rvn-summon-fx'

export const DEFAULT_MUSIC_VOLUME = 0.32 // muzika tylesnė už SFX (kaip anksčiau)
export const DEFAULT_SFX_VOLUME = 1.0
export const DEFAULT_SUMMON_FX = true

export type DigitalSettings = {
  musicVolume: number      // 0..1
  sfxVolume: number        // 0..1
  summonFxEnabled: boolean
}

let _music: number | null = null
let _sfx: number | null = null
let _summon: boolean | null = null
const listeners = new Set<(s: DigitalSettings) => void>()

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function readNum(key: string, def: number): number {
  if (typeof window === 'undefined') return def
  try { const r = window.localStorage.getItem(key); return r === null ? def : clamp01(parseFloat(r)) } catch { return def }
}
function readBool(key: string, def: boolean): boolean {
  if (typeof window === 'undefined') return def
  try { const r = window.localStorage.getItem(key); return r === null ? def : r === '1' } catch { return def }
}

export function getMusicVolume(): number {
  if (_music === null) _music = readNum(K_MUSIC, DEFAULT_MUSIC_VOLUME)
  return _music
}
export function getSfxVolume(): number {
  if (_sfx === null) _sfx = readNum(K_SFX, DEFAULT_SFX_VOLUME)
  return _sfx
}
export function isSummonFxEnabled(): boolean {
  if (_summon === null) _summon = readBool(K_SUMMON, DEFAULT_SUMMON_FX)
  return _summon
}

export function getSettings(): DigitalSettings {
  return { musicVolume: getMusicVolume(), sfxVolume: getSfxVolume(), summonFxEnabled: isSummonFxEnabled() }
}

function notify(): void {
  const s = getSettings()
  listeners.forEach((cb) => { try { cb(s) } catch { /* */ } })
}

export function setMusicVolume(v: number): void {
  _music = clamp01(v)
  try { window.localStorage.setItem(K_MUSIC, String(_music)) } catch { /* */ }
  notify()
}
export function setSfxVolume(v: number): void {
  _sfx = clamp01(v)
  try { window.localStorage.setItem(K_SFX, String(_sfx)) } catch { /* */ }
  notify()
}
export function setSummonFxEnabled(v: boolean): void {
  _summon = !!v
  try { window.localStorage.setItem(K_SUMMON, _summon ? '1' : '0') } catch { /* */ }
  notify()
}

/** Pritaiko nustatymus iš DB (be re-notify kilpos su saugojimu). silent=true praleidžia listener'ius. */
export function hydrateSettings(s: Partial<DigitalSettings> | null | undefined): void {
  if (!s) return
  if (typeof s.musicVolume === 'number') { _music = clamp01(s.musicVolume); try { window.localStorage.setItem(K_MUSIC, String(_music)) } catch { /* */ } }
  if (typeof s.sfxVolume === 'number') { _sfx = clamp01(s.sfxVolume); try { window.localStorage.setItem(K_SFX, String(_sfx)) } catch { /* */ } }
  if (typeof s.summonFxEnabled === 'boolean') { _summon = s.summonFxEnabled; try { window.localStorage.setItem(K_SUMMON, _summon ? '1' : '0') } catch { /* */ } }
  notify()
}

/** Prenumerata pakeitimams — grąžina unsubscribe. */
export function subscribeSettings(cb: (s: DigitalSettings) => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
