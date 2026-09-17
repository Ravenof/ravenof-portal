// ── Kliento updater'io branduolys (bendras Android + Desktop) ────────────────
// Eiga per paleidimą:
//   1) rvn_get_release(platforma, shell versija, APP_VERSION)  – kanalą parenka SERVERIS pagal rolę
//   2) markReady()  – pasakom shell'ui „užsikroviau" (kitaip per appReadyTimeout jis pats grįžta atgal)
//   3) maintenance / shell_outdated → blokuojantis ekranas
//   4) kitas bundle'as → siunčiam; privalomas – iškart ir blokuojančiai, neprivalomas – fone,
//      įsigalioja per kitą šaltą paleidimą arba hub'e paspaudus „Atnaujinti dabar"
//
// SVARBU (Android): šis kodas gyvena pačiame bundle'e. Jei jis sulūš – klientas įstrigs toje
// versijoje ir išgelbės tik naujas APK. Todėl: jokių importų iš žaidimo kodo (tik supabase
// klientas + version), viskas try/catch, o markReady() kviečiamas TIK kai 1 žingsnis baigėsi
// (atsakymu arba tvarkingu timeout'u) – t. y. kai įrodyta, kad updater'is šiame bundle'e gyvas.
import { create } from 'zustand'
import { APP_VERSION } from '@/lib/version'
import { createClient } from '@/lib/supabase/client'
import { capgoAvailable, createCapgoAdapter } from './capgoAdapter'
import { electronUpdaterAvailable, createElectronAdapter } from './electronAdapter'
import type { ReleaseBundle, ReleaseInfo, ShellInfo, UpdaterAdapter, UpdaterState } from './types'

const CHECK_TIMEOUT_MS = 6_000
const RECHECK_MS = 15 * 60_000
const BAD_TTL_MS = 24 * 3600_000
const LS_PENDING = 'rvn.updater.pending'   // { version, from, at } – ką bandėm pritaikyti
const LS_BAD = 'rvn.updater.bad'           // { [version]: timestamp } – šiame įrenginyje neužsikrovę bundle'ai
/** Keliai, kuriuose vyksta partija – čia niekada neperkraunam ir nerodom blokuojančio ekrano. */
const BATTLE_PATH = /^\/digital\/(pve|pvp|ranked|tutorial)(\/|$)/

export const useUpdater = create<UpdaterState>(() => ({
  phase: 'idle', blocking: false, percent: 0, release: null, target: null, readyId: null, error: null,
}))
const set = (p: Partial<UpdaterState>) => useUpdater.setState(p)

let adapter: UpdaterAdapter | null = null
let shell: ShellInfo | null = null
let readyMarked = false
let busy = false
let started = false

function pickAdapter(): UpdaterAdapter | null {
  try {
    if (electronUpdaterAvailable()) return createElectronAdapter()
    if (capgoAvailable()) return createCapgoAdapter()
  } catch { /* nėra shell'o */ }
  return null
}

const lsGet = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d } catch { return d } }
const lsSet = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* kvota */ } }
const lsDel = (k: string) => { try { localStorage.removeItem(k) } catch { /* */ } }

function isBad(version: string): boolean {
  const bad = lsGet<Record<string, number>>(LS_BAD, {})
  return !!bad[version] && Date.now() - bad[version] < BAD_TTL_MS
}
const inBattle = () => typeof location !== 'undefined' && BATTLE_PATH.test(location.pathname)

async function report(event: string, bundleVersion: string | null, fromVersion: string | null, detail?: string) {
  try {
    await createClient().rpc('rvn_report_update_event', {
      p_event: event, p_bundle_version: bundleVersion, p_from_version: fromVersion,
      p_platform: shell?.platform ?? null, p_shell_version: shell?.shellVersion ?? null, p_detail: detail ?? null,
    })
  } catch { /* telemetrija niekada neturi trukdyti */ }
}

/** Šio JS konteksto žymė: pending įrašas iš TO PATIES konteksto reiškia „dar neperkrauta". */
const BOOT_ID = Math.random().toString(36).slice(2)
type Pending = { version: string; from: string; at: number; boot: string }
const markPending = (version: string) => lsSet(LS_PENDING, { version, from: APP_VERSION, at: Date.now(), boot: BOOT_ID } satisfies Pending)

/** Ar praėjęs bandymas pritaikyti bundle'ą pavyko? (localStorage išlieka tarp bundle'ų – tas pats origin.) */
async function settlePending() {
  const p = lsGet<Pending | null>(LS_PENDING, null)
  if (!p || p.boot === BOOT_ID) return
  if (p.version === APP_VERSION) { lsDel(LS_PENDING); void report('applied', p.version, p.from); return }
  // Laukėm p.version, bet sukasi kita. Ar shell'as ją atmetė (neužsikrovė per appReadyTimeout)?
  let failed = false
  try { failed = await adapter!.didFail(p.version) } catch { /* */ }
  if (failed) {
    const bad = lsGet<Record<string, number>>(LS_BAD, {}); bad[p.version] = Date.now(); lsSet(LS_BAD, bad)
    lsDel(LS_PENDING)
    void report('rolled_back', p.version, APP_VERSION, 'bundle did not confirm ready')
  } else if (Date.now() - p.at > 7 * 86400_000) lsDel(LS_PENDING)   // taip ir nepritaikyta – pamirštam
}

async function fetchRelease(): Promise<ReleaseInfo | null> {
  const call = createClient().rpc('rvn_get_release', {
    p_platform: shell?.platform ?? null, p_shell_version: shell?.shellVersion ?? null, p_bundle_version: APP_VERSION,
  })
  const timeout = new Promise<null>((res) => setTimeout(() => res(null), CHECK_TIMEOUT_MS))
  const r = await Promise.race([call, timeout])
  if (!r || (r as { error?: unknown }).error) return null
  return ((r as { data: unknown }).data as ReleaseInfo) ?? null
}

/**
 * „Šis bundle'as geras" → shell'as nebegrįš atgal. NEpatvirtinam, jei žaidimo medis nulūžo per
 * paleidimą (AppErrorBoundary pažymi window.__RAVENOF_BOOT_FAILED__) – tada shell'as po
 * appReadyTimeout pats grąžins ankstesnį bundle'ą.
 */
async function confirmBundle() {
  if (readyMarked || !adapter) return
  if ((window as unknown as { __RAVENOF_BOOT_FAILED__?: boolean }).__RAVENOF_BOOT_FAILED__) return
  readyMarked = true
  try { await adapter.markReady() } catch { /* */ }
  void settlePending()
}

function wants(b: ReleaseBundle | null): b is ReleaseBundle {
  if (!b || b.version === APP_VERSION || isBad(b.version)) return false
  // Žemyn leidžiamės tik kai privaloma (rollback / atšauktas bundle'as). Taip šviežiai surinktas
  // installeris su naujesniu builtin nebus „atnaujintas" atgal į senesnį kanalo bundle'ą.
  return b.version_num > (Number(APP_VERSION) || 0) || b.mandatory
}

async function applyNowInternal(id: string, target: ReleaseBundle) {
  set({ phase: 'applying', blocking: true })
  markPending(target.version)
  if (shell?.builtinVersion && target.version === shell.builtinVersion) await adapter!.resetToBuiltin()
  else await adapter!.applyNow(id)
}

/** Pagrindinis patikrinimas. Saugu kviesti bet kada; vienu metu vyksta tik vienas. */
export async function checkForUpdate(): Promise<void> {
  if (!adapter || busy) return
  busy = true
  try {
    if (useUpdater.getState().phase === 'idle' || useUpdater.getState().phase === 'error') set({ phase: 'checking', error: null })
    shell ??= await adapter.info()
    const rel = await fetchRelease()

    // (2) updater'is šiame bundle'e veikia (gavo atsakymą arba tvarkingai nulūžo į offline) → patvirtinam bundle'ą
    await confirmBundle()

    if (!rel) { if (useUpdater.getState().phase === 'checking') set({ phase: 'idle' }); return }   // offline – žaidžiam su tuo, ką turim
    set({ release: rel })

    if (rel.maintenance) { set({ phase: 'maintenance', blocking: !inBattle() }); return }
    if (rel.shell_outdated) { set({ phase: 'shell_outdated', blocking: !inBattle() }); void report('shell_outdated', rel.bundle?.version ?? null, APP_VERSION); return }

    const target = rel.bundle
    if (!wants(target)) {
      const ph = useUpdater.getState().phase
      if (ph === 'checking' || ph === 'maintenance' || ph === 'shell_outdated') set({ phase: 'idle', blocking: false })
      return
    }
    {
      const cur = useUpdater.getState()
      if (cur.phase === 'ready' && cur.target?.version === target.version && cur.readyId) {
        // jau atsisiųsta; jei tapo privaloma (arba buvo atidėta dėl partijos) – pritaikom dabar
        if (target.mandatory && !inBattle()) await applyNowInternal(cur.readyId, target)
        return
      }
    }

    // Tikslas = installerio builtin → nieko siųsti nereikia, tiesiog grįžtam į jį.
    if (shell.builtinVersion && target.version === shell.builtinVersion) {
      if (target.mandatory && !inBattle()) { await applyNowInternal('builtin', target); return }
      set({ phase: 'ready', target, readyId: 'builtin', blocking: false }); return
    }

    const mustBlock = target.mandatory && !inBattle()
    set({ phase: 'downloading', target, percent: 0, blocking: mustBlock })
    let id: string
    try {
      id = await adapter.download(target, (percent) => set({ percent }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      void report(/hash|checksum/i.test(msg) ? 'checksum_failed' : 'download_failed', target.version, APP_VERSION, msg)
      // Neprivalomas – tyliai bandysim vėliau; privalomas – parodom klaidą su „Bandyti dar kartą".
      set(target.mandatory ? { phase: 'error', error: msg, blocking: mustBlock } : { phase: 'idle', blocking: false })
      return
    }
    void report('downloaded', target.version, APP_VERSION)

    if (target.mandatory && !inBattle()) { await applyNowInternal(id, target); return }
    markPending(target.version)
    await adapter.applyNext(id)
    set({ phase: 'ready', readyId: id, blocking: false, percent: 100 })
  } catch (e) {
    set({ phase: 'error', error: e instanceof Error ? e.message : String(e), blocking: false })
  } finally {
    busy = false
    // Bet kokiu atveju bandom patvirtinti – pats žaidimas užsikrovė, o updater'io klaida jau užfiksuota.
    await confirmBundle()
  }
}

/** Mygtukas „Atnaujinti dabar" (rodomas tik ne partijoje). */
export async function applyReadyUpdateNow(): Promise<void> {
  const { phase, readyId, target } = useUpdater.getState()
  if (!adapter || phase !== 'ready' || !readyId || !target || inBattle()) return
  try { await applyNowInternal(readyId, target) } catch (e) { set({ phase: 'error', error: e instanceof Error ? e.message : String(e), blocking: false }) }
}

/** Kviesti vieną kartą po pirmo render'io (apps/digital/src/UpdateLayer.tsx). Web'e – no-op. */
export function startUpdater(): void {
  if (started || typeof window === 'undefined') return
  started = true
  adapter = pickAdapter()
  if (!adapter) return
  void checkForUpdate()
  setInterval(() => { if (document.visibilityState === 'visible') void checkForUpdate() }, RECHECK_MS)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void checkForUpdate() })
  // Prisijungus pasikeičia rolė → gali pasikeisti kanalas (adminas / testeris gauna savo bundle'ą).
  try { createClient().auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') void checkForUpdate() }) } catch { /* */ }
  // Išėjus iš partijos – pritaikom atidėtus blokuojančius dalykus (maintenance / privalomas update).
  let lastPath = location.pathname
  setInterval(() => {
    if (location.pathname === lastPath) return
    const wasBattle = BATTLE_PATH.test(lastPath); lastPath = location.pathname
    if (wasBattle && !inBattle()) void checkForUpdate()
  }, 2_000)
}
