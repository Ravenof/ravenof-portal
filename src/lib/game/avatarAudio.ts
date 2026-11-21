'use client'

// ── AvatarAudioManager ───────────────────────────────────────────────────────
// Battle balsai avatarams (fightStart/hit/defeat/victory/spellCast/lowHp/selected).
// Weighted random klipas, rate-limit per įvykį, gerbia SFX volume, vienas balso
// kanalas (be perkrovos), once-per-battle „defeat/fightStart/lowHp" ir t. t.

import { getSfxVolume } from '@/lib/settings'
import { duckMusic } from './musicManager'
import type { AvatarAudioMap, AvatarAudioEvent } from '@/lib/cosmetics'

let MAP: AvatarAudioMap = {}

/** 823: kol avataras kalba – muzika pritildoma (−10 dB); trukmė patikslinama, kai žinomas klipo ilgis. */
function duckFor(a: HTMLAudioElement): void {
  try {
    duckMusic(-10, 2200)
    const ext = () => { if (isFinite(a.duration) && a.duration > 0) duckMusic(-10, Math.round(a.duration * 1000) + 250) }
    if (a.readyState >= 1) ext(); else a.addEventListener('loadedmetadata', ext, { once: true })
  } catch { /* tyliai */ }
}
const warm = new Map<string, HTMLAudioElement>()        // preload cache (HTTP warm)
const lastPlayed = new Map<string, number>()            // `${avatarId}:${event}` -> ts
const firedOnce = new Set<string>()                     // once-per-battle keys
let channel: HTMLAudioElement | null = null
/** Mokymų režimas: avatarų vienetės nutildomos, kad netrukdytų Korvo pasakojimui. */
let muted = false

const RATE_MS: Partial<Record<AvatarAudioEvent, number>> = { hit: 1800, bigHit: 2500, spellCast: 2000, selected: 450, attack: 6000, kill: 9000, idle: 45000, timer: 15000 }
/** Foniniai įvykiai: nepertraukia jau skambančios frazės (savo ar varžovo) – tiesiog praleidžiami. */
const LOW: AvatarAudioEvent[] = ['attack', 'kill', 'idle', 'spellCast', 'timer']
const lastUrl = new Map<string, string>()               // paskutinis variantas – kad nesikartotų iš eilės
let seqToken = 0                                        // dialogo eilė (playAvatarSequence)
const busy = () => !!channel && !channel.paused && !channel.ended
const ONCE: AvatarAudioEvent[] = ['fightStart', 'defeat', 'victory', 'lowHp']

function uiSoundOn(): boolean {
  if (typeof window === 'undefined') return false
  return getSfxVolume() > 0
}

function warmLoad(url: string): void {
  if (warm.has(url)) return
  try { const a = new Audio(); a.preload = 'auto'; a.src = url; warm.set(url, a) } catch { /* tyliai */ }
}

/** Nustato dabartinio mūšio avatarų garsų žemėlapį + pašildo pirmus klipus. */
export function setAvatarAudioMap(map: AvatarAudioMap | null | undefined): void {
  MAP = map ?? {}
  for (const aid of Object.keys(MAP)) {
    const evs = MAP[aid]
    for (const ev of Object.keys(evs) as AvatarAudioEvent[]) {
      const clips = evs[ev]
      if (clips?.length) warmLoad(clips[0].url)
    }
  }
}

/** Mūšio pradžioje – nunulinam rate-limit ir once-per-battle žymas. */
export function resetAvatarAudio(): void {
  lastPlayed.clear()
  firedOnce.clear()
}

function pickWeighted(clips: { url: string; weight: number }[]): string {
  const tot = clips.reduce((s, c) => s + Math.max(1, c.weight), 0)
  let r = Math.random() * tot
  for (const c of clips) { r -= Math.max(1, c.weight); if (r <= 0) return c.url }
  return clips[clips.length - 1].url
}

/** Sugroja avataro balsą įvykiui (jei yra; su rate-limit / once apsauga). */
/**
 * Laikinai nutildo AVATARŲ vienetes (kortų balsai per voiceManager NELIEČIAMI).
 * Naudoja V3 mokymai: Senasis Korvas kalba visą pamoką, avatarų šūksniai jį užgožia.
 */
export function setAvatarVoiceMuted(v: boolean): void {
  muted = v
  if (v) stopAvatarAudio()
}

export function isAvatarVoiceMuted(): boolean { return muted }

export function playAvatarAudio(avatarId: string | null | undefined, event: AvatarAudioEvent, opts?: { volume?: number }): void {
  if (muted) return
  if (!avatarId || !uiSoundOn()) return
  // senesni avatarai turi tik 'hit' – didelis smūgis jiems skamba kaip paprastas
  if (event === 'bigHit' && !MAP[avatarId]?.bigHit?.length) event = 'hit'
  const clips = MAP[avatarId]?.[event]
  if (!clips?.length) return
  const key = avatarId + ':' + event
  if (ONCE.includes(event)) { if (firedOnce.has(key)) return; firedOnce.add(key) }
  if (LOW.includes(event) && busy()) return
  const gap = RATE_MS[event]
  const now = Date.now()
  if (gap) { if (now - (lastPlayed.get(key) ?? 0) < gap) return; lastPlayed.set(key, now) }
  try {
    seqToken++                                                 // nutraukia dialogo eilę, jei tokia buvo
    if (channel) { try { channel.pause() } catch { /* */ } }   // vienas balso kanalas
    const prev = lastUrl.get(key)
    const pool = clips.length > 1 && prev ? clips.filter((c) => c.url !== prev) : clips
    const url = pickWeighted(pool); lastUrl.set(key, url)
    const a = new Audio(url)
    a.volume = Math.max(0, Math.min(1, (opts?.volume ?? 0.85) * getSfxVolume()))
    channel = a
    duckFor(a)
    void a.play().catch(() => { /* autoplay gali blokuoti */ })
  } catch { /* tyliai */ }
}

const clipNo = (url: string, i: number) => { const m = url.match(/-(\d+)\.mp3(?:\?.*)?$/); return m ? Number(m[1]) : i + 1 }

/** Kokius variantų numerius avataras turi šiam įvykiui (po admino pataisų). Tuščia – klipų nėra. */
export function avatarClipVariants(avatarId: string | null | undefined, event: AvatarAudioEvent): number[] {
  const clips = avatarId ? MAP[avatarId]?.[event] : null
  return clips?.length ? clips.map((c, i) => clipNo(c.url, i)) : []
}

/**
 * Sugroja KONKRETŲ variantą (emocijos, laikmačio replikos – tekstas kaspine turi sutapti su balsu).
 * Be rate-limit (ribas valdo kvietėjas); nutraukia kitą frazę. Jei tokio varianto nėra – tyla.
 */
export function playAvatarClip(avatarId: string | null | undefined, event: AvatarAudioEvent, variant: number, opts?: { volume?: number }): boolean {
  if (muted || !avatarId || !uiSoundOn()) return false
  const clips = MAP[avatarId]?.[event]
  const c = clips?.find((x, i) => clipNo(x.url, i) === variant)
  if (!c) return false
  try {
    seqToken++
    if (channel) { try { channel.pause() } catch { /* */ } }
    const a = new Audio(c.url)
    a.volume = Math.max(0, Math.min(1, (opts?.volume ?? 0.85) * getSfxVolume()))
    channel = a
    duckFor(a)
    lastPlayed.set(avatarId + ':' + event, Date.now())
    void a.play().catch(() => { /* autoplay gali blokuoti */ })
    return true
  } catch { return false }
}

/** Ar šiuo metu skamba avataro frazė (naudojama atsitiktinėms replikoms – jos neturi lipti ant kitų). */
export function isAvatarVoiceBusy(): boolean { return busy() }

/** Pažymi once-per-battle įvykį kaip jau suvaidintą (pvz. fightStart, kai vietoj jo skamba dialogas). */
export function markAvatarAudioFired(avatarId: string | null | undefined, event: AvatarAudioEvent): void {
  if (avatarId) firedOnce.add(avatarId + ':' + event)
}

/** Sugroja klipų eilę iš eilės (mini dialogas). Bet koks kitas avataro balsas eilę nutraukia. */
export function playAvatarSequence(urls: string[], opts?: { volume?: number; gapMs?: number }): void {
  if (muted || !uiSoundOn() || !urls.length) return
  const token = ++seqToken
  const step = (i: number) => {
    if (token !== seqToken || i >= urls.length) return
    try {
      if (channel) { try { channel.pause() } catch { /* */ } }
      const a = new Audio(urls[i])
      a.volume = Math.max(0, Math.min(1, (opts?.volume ?? 0.85) * getSfxVolume()))
      channel = a
      duckFor(a)
      const next = () => window.setTimeout(() => step(i + 1), opts?.gapMs ?? 280)
      a.onended = next
      a.onerror = next
      void a.play().catch(() => { /* autoplay gali blokuoti */ })
    } catch { /* tyliai */ }
  }
  step(0)
}

/** Nutildo grojantį avataro balsą (išeinant iš mūšio). */
export function stopAvatarAudio(): void {
  seqToken++
  try { channel?.pause() } catch { /* */ }
  channel = null
}
