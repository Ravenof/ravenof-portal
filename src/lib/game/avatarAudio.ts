'use client'

// ── AvatarAudioManager ───────────────────────────────────────────────────────
// Battle balsai avatarams (fightStart/hit/defeat/victory/spellCast/lowHp/selected).
// Weighted random klipas, rate-limit per įvykį, gerbia SFX volume, vienas balso
// kanalas (be perkrovos), once-per-battle „defeat/fightStart/lowHp" ir t. t.

import { getSfxVolume } from '@/lib/settings'
import type { AvatarAudioMap, AvatarAudioEvent } from '@/lib/cosmetics'

let MAP: AvatarAudioMap = {}
const warm = new Map<string, HTMLAudioElement>()        // preload cache (HTTP warm)
const lastPlayed = new Map<string, number>()            // `${avatarId}:${event}` -> ts
const firedOnce = new Set<string>()                     // once-per-battle keys
let channel: HTMLAudioElement | null = null

const RATE_MS: Partial<Record<AvatarAudioEvent, number>> = { hit: 1800, spellCast: 2000, selected: 450 }
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
export function playAvatarAudio(avatarId: string | null | undefined, event: AvatarAudioEvent, opts?: { volume?: number }): void {
  if (!avatarId || !uiSoundOn()) return
  const clips = MAP[avatarId]?.[event]
  if (!clips?.length) return
  const key = avatarId + ':' + event
  if (ONCE.includes(event)) { if (firedOnce.has(key)) return; firedOnce.add(key) }
  const gap = RATE_MS[event]
  const now = Date.now()
  if (gap) { if (now - (lastPlayed.get(key) ?? 0) < gap) return; lastPlayed.set(key, now) }
  try {
    if (channel) { try { channel.pause() } catch { /* */ } }   // vienas balso kanalas
    const a = new Audio(pickWeighted(clips))
    a.volume = Math.max(0, Math.min(1, (opts?.volume ?? 0.85) * getSfxVolume()))
    channel = a
    void a.play().catch(() => { /* autoplay gali blokuoti */ })
  } catch { /* tyliai */ }
}

/** Nutildo grojantį avataro balsą (išeinant iš mūšio). */
export function stopAvatarAudio(): void {
  try { channel?.pause() } catch { /* */ }
  channel = null
}
