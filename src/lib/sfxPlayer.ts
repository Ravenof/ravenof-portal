// ── Bendras SFX grotuvas (WebAudio buferiai + HTMLAudio atsarga) ─────────────
// Naudoja ui-sound.ts (portalo UI) ir game/soundManager.ts (kova).
//
//  • Failų sąrašas – iš sugeneruoto manifesto (tools/gen-sound-manifest.mjs), tad
//    grojami tik egzistuojantys failai: jokių 404 spėjimų ir jokios „sintezės
//    vietoj tikro garso" sesijos pradžioje.
//  • WebAudio buferiai: tas pats garsas gali PERSIDENGTI (AoE į 3 taikinius = 3
//    smūgiai, o ne vienas nukirptas), mažesnis vėlavimas telefone ir lengvas
//    aukščio (pitch) atsitiktinumas, kad pasikartojantis garsas neskambėtų kaip kopija.
//  • Kol buferis dar nedekoduotas (pirmas grojimas) arba WebAudio neveikia – HTMLAudio.
//  • Jei failas vis tiek nepasiekiamas – kviečiamas onFail (sintezės atsarga).
import { getSfxVolume } from '@/lib/settings'
import manifest from '@/lib/game/soundManifest.json'

const FILES: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(manifest as Record<string, string[]>).map(([dir, list]) => [dir, new Set(list)]),
)

/** Ar `/sounds/<dir>/<file>.mp3` yra manifeste. Katalogams, kurių manifestas neseka, grąžina true. */
export function sfxExists(url: string): boolean {
  const m = /^\/sounds\/([^/]+)\/([^/]+)$/.exec(url)
  if (!m) return true
  const set = FILES[m[1]]
  return set ? set.has(m[2]) : true
}

/** Visi esami garso variantai: `<base>.mp3` ir `<base>-N.mp3` nurodytame kataloge. */
export function sfxVariants(dir: string, base: string): string[] {
  const set = FILES[dir]
  if (!set) return []
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^${esc}(-\\d+)?\\.mp3$`, 'i')
  return [...set].filter((f) => re.test(f)).map((f) => `/sounds/${dir}/${f}`)
}

// ── Bendras AudioContext (ir sintezei, ir failams) ───────────────────────────
let _ctx: AudioContext | null = null
export function getSharedAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_ctx) {
      const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      _ctx = new Ctor()
    }
    return _ctx
  } catch { return null }
}

const buffers = new Map<string, AudioBuffer>()
const loading = new Map<string, Promise<AudioBuffer | null>>()
const noBuffer = new Set<string>()                   // dekoduoti nepavyko → tik HTMLAudio
const dead = new Set<string>()                       // failas nepasiekiamas → nebebandom
const htmlPool = new Map<string, HTMLAudioElement>()

export function isSfxDead(url: string): boolean { return dead.has(url) }

function loadBuffer(url: string): Promise<AudioBuffer | null> {
  const have = buffers.get(url)
  if (have) return Promise.resolve(have)
  if (noBuffer.has(url) || dead.has(url)) return Promise.resolve(null)
  let p = loading.get(url)
  if (p) return p
  const ctx = getSharedAudioCtx()
  if (!ctx || typeof fetch === 'undefined') return Promise.resolve(null)
  p = fetch(url)
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer() })
    .then((ab) => new Promise<AudioBuffer>((res, rej) => { try { const pr = ctx.decodeAudioData(ab, res, rej); if (pr && typeof pr.catch === 'function') pr.catch(rej) } catch (e) { rej(e) } }))
    .then((buf) => { buffers.set(url, buf); return buf })
    .catch(() => { noBuffer.add(url); return null })
    .finally(() => { loading.delete(url) })
  loading.set(url, p)
  return p
}

/** Iš anksto užkrauna ir dekoduoja garsus (tyliai; klaidos ignoruojamos). */
export function preloadSfx(urls: string[]): void {
  if (typeof window === 'undefined') return
  for (const u of urls) if (sfxExists(u)) void loadBuffer(u)
}

function playHtml(url: string, vol: number, onFail?: () => void): void {
  try {
    let a = htmlPool.get(url)
    if (!a) {
      a = new Audio(url)
      a.preload = 'auto'
      a.addEventListener('error', () => { dead.add(url); htmlPool.delete(url) })
      htmlPool.set(url, a)
    }
    a.volume = vol
    a.currentTime = 0
    const p = a.play()
    if (p) p.catch(() => { if (!dead.has(url)) { dead.add(url); onFail?.() } })
  } catch { dead.add(url); onFail?.() }
}

export type SfxOpts = {
  /** Atsitiktinis aukščio nuokrypis (0.05 = ±5 %). Tik WebAudio keliu. */
  pitchJitter?: number
  /** Kviečiama, jei failo nepavyko sugroti (sintezės atsarga). */
  onFail?: () => void
}

/** Groja vieną failą. `volume` 0..1 – dar dauginamas iš žaidėjo SFX garsumo. */
export function playSfxUrl(url: string, volume: number, opts?: SfxOpts): void {
  if (typeof window === 'undefined') return
  if (dead.has(url)) { opts?.onFail?.(); return }
  const vol = Math.max(0, Math.min(1, volume * getSfxVolume()))
  if (vol <= 0) return
  const ctx = getSharedAudioCtx()
  const buf = buffers.get(url)
  if (ctx && buf) {
    const start = () => {
      try {
        const src = ctx.createBufferSource()
        src.buffer = buf
        const j = opts?.pitchJitter ?? 0
        if (j > 0) src.playbackRate.value = 1 + (Math.random() * 2 - 1) * j
        const gain = ctx.createGain()
        gain.gain.value = vol
        src.connect(gain); gain.connect(ctx.destination)
        src.start()
      } catch { playHtml(url, vol, opts?.onFail) }
    }
    if (ctx.state === 'running') start()
    else ctx.resume().then(start).catch(() => playHtml(url, vol, opts?.onFail))
    return
  }
  // Buferio dar nėra: šį kartą – HTMLAudio, o fone dekoduojam kitam kartui.
  if (ctx && !noBuffer.has(url)) void loadBuffer(url)
  playHtml(url, vol, opts?.onFail)
}
