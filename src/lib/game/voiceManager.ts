// ── Per-kortos „iškvietimo balsų" variklis ────────────────────────────────────
// Kiekviena korta gali turėti kelis garso failus (cards.gameplay.voiceLines).
// Iškviečiant kortą sugroja VIENĄ atsitiktinį. Suprojektuota taip, kad NEvalgytų
// resurso ir NEsukeltų lag:
//
//   1. LAZY — failai NEpreloadinami visi iš anksto. Atsisiunčiama+dekoduojama tik
//      tada, kai tos kortos balso pirmą kartą reikia (arba prefetch ant „draw").
//   2. CACHE — dekoduotas AudioBuffer laikomas atmintyje ir naudojamas pakartotinai,
//      tad antras to paties balso grojimas yra momentinis (jokio tinklo/dekodo).
//   3. LRU RIBA — talpykla apribota (MAX_CACHE), seniausias buferis išmetamas, kad
//      atmintis nesikauptų net su šimtais kortų.
//   4. IN-FLIGHT DEDUP — tuo pačiu metu vykstantys to paties URL prašymai sujungiami
//      į vieną fetch.
//   5. VIENAS BALSO KANALAS — naujas balsas nutildo ankstesnį, tad greitai metant
//      daug kortų garsai nesusikaupia į kakofoniją ir neapkrauna CPU.
//   6. Paiso globalaus garso jungiklio (isUiSoundEnabled) — kaip ir ui-sound.

import { isUiSoundEnabled } from '@/lib/ui-sound'

// Maks. dekoduotų buferių talpykloje. Trumpi balsai (1–3 s, mono) ~0.2–0.5 MB.
const MAX_CACHE = 24

let _ctx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_ctx) {
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      _ctx = new Ctor()
    }
    return _ctx
  } catch {
    return null
  }
}

// url -> dekoduotas buferis (Map išlaiko įterpimo tvarką → LRU)
const buffers = new Map<string, AudioBuffer>()
// url -> vykstantis fetch (dedup)
const inflight = new Map<string, Promise<AudioBuffer | null>>()
// url, kurių nepavyko įkelti (nebandom kartoti)
const failed = new Set<string>()
// cardId -> paskutinis grotas url (kad nekartotume to paties iš eilės)
const lastByCard = new Map<string, string>()

let currentSource: AudioBufferSourceNode | null = null

function lruGet(url: string): AudioBuffer | undefined {
  const b = buffers.get(url)
  if (b) { buffers.delete(url); buffers.set(url, b) } // pakeliam į „naujausių" galą
  return b
}

function lruSet(url: string, b: AudioBuffer): void {
  buffers.set(url, b)
  if (buffers.size > MAX_CACHE) {
    const oldest = buffers.keys().next().value
    if (oldest !== undefined) buffers.delete(oldest)
  }
}

function load(url: string): Promise<AudioBuffer | null> {
  if (failed.has(url)) return Promise.resolve(null)
  const cached = lruGet(url)
  if (cached) return Promise.resolve(cached)
  const existing = inflight.get(url)
  if (existing) return existing
  const ctx = getCtx()
  if (!ctx) return Promise.resolve(null)

  const p = (async (): Promise<AudioBuffer | null> => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const arr = await res.arrayBuffer()
      const buf = await ctx.decodeAudioData(arr)
      lruSet(url, buf)
      return buf
    } catch {
      failed.add(url)
      return null
    } finally {
      inflight.delete(url)
    }
  })()

  inflight.set(url, p)
  return p
}

function pickRandom(urls: string[], cardId: string): string {
  if (urls.length === 1) return urls[0]
  const last = lastByCard.get(cardId)
  let pick = urls[Math.floor(Math.random() * urls.length)]
  // pora bandymų išvengti to paties balso du kartus iš eilės
  for (let i = 0; i < 3 && pick === last; i++) {
    pick = urls[Math.floor(Math.random() * urls.length)]
  }
  lastByCard.set(cardId, pick)
  return pick
}

/**
 * Pašildo talpyklą be grojimo — kviesk kai korta patenka į ranką (ant „draw"),
 * kad summon metu balsas suskambėtų momentiškai. Įkelia TIK pirmą variantą, kad
 * neeikvotų daug atminties/tinklo.
 */
export function prefetchCardVoice(urls?: string[] | null): void {
  if (!urls?.length) return
  if (typeof window === 'undefined' || !isUiSoundEnabled()) return
  void load(urls[0])
}

/**
 * Sugroja vieną atsitiktinį kortos balsą. Saugu kviesti dažnai — lazy, cache'inta,
 * vienas kanalas. Negroja jei garsas išjungtas arba balsų nėra.
 */
export async function playCardVoice(
  urls: string[] | null | undefined,
  opts?: { cardId?: string; volume?: number },
): Promise<void> {
  if (!urls?.length) return
  if (typeof window === 'undefined' || !isUiSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state !== 'running') {
    try { await ctx.resume() } catch { return }
  }
  const url = pickRandom(urls, opts?.cardId ?? '')
  const buf = await load(url)
  if (!buf || !isUiSoundEnabled()) return

  // vienas balso kanalas: nutildom ankstesnį
  try { currentSource?.stop() } catch { /* tyliai */ }

  try {
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = opts?.volume ?? 0.7
    src.connect(gain)
    gain.connect(ctx.destination)
    src.onended = () => { if (currentSource === src) currentSource = null }
    currentSource = src
    src.start()
  } catch { /* tyliai */ }
}

/** Nutildo šiuo metu grojantį balsą (pvz. išeinant iš mūšio). */
export function stopCardVoice(): void {
  try { currentSource?.stop() } catch { /* tyliai */ }
  currentSource = null
}
