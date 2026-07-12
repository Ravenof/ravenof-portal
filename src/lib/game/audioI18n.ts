'use client'

// ── Lokalizuotas balsų audio (Fazė 7) ───────────────────────────────────────
// Šaltinis: lentelė `localized_audio` (owner_type card|avatar, locale, trigger).
// Legacy: cards.gameplay.voiceLines ir avatar_audio lieka kaip LT fallback'as,
// jei lentelėje eilučių dar nėra (migracija juos perkelia, bet fallback saugesnis).
//
// Fallback politika (nustatymai): pasirinkta kalba → (jei leidžiama) LT → tyla.

import { createClient } from '@/lib/supabase/client'
import { getLocale } from '@/lib/i18n/core'
import { getVoiceLocale, isVoiceFallbackLtEnabled } from '@/lib/settings'
import type { SupportedLocale } from '@/lib/i18n/config'
import type { AvatarAudioEvent, AvatarAudioMap } from '@/lib/cosmetics'

export type AudioOwner = 'card' | 'avatar'
export type Clip = { url: string; weight?: number; transcript?: string | null }
type OwnerMap = Record<string, Record<string, Clip[]>>   // owner_id -> trigger -> clips

const cache = new Map<string, OwnerMap>()                // `${owner}:${locale}` -> map
const inflight = new Map<string, Promise<OwnerMap>>()

/** Kokia kalba grojami balsai: nustatymas 'auto' = UI kalba. */
export function voiceLocale(): SupportedLocale {
  const v = getVoiceLocale()
  return v === 'auto' ? getLocale() : v
}

async function fetchMap(owner: AudioOwner, ids: string[], locale: SupportedLocale): Promise<OwnerMap> {
  if (ids.length === 0) return {}
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('rvn_get_localized_audio', {
      p_owner_type: owner, p_ids: ids, p_locale: locale,
    })
    if (error) throw error
    return (data as OwnerMap) ?? {}
  } catch (e) {
    console.warn('[audio i18n] nepavyko užkrauti balsų:', e)
    return {}
  }
}

/** Užkrauna balsus konkretiems owner'iams (kova: kortos/avatarai). */
export async function loadVoices(owner: AudioOwner, ids: (string | null | undefined)[], locale = voiceLocale()): Promise<void> {
  const clean = Array.from(new Set(ids.filter((x): x is string => !!x)))
  if (clean.length === 0) return
  const key = `${owner}:${locale}`
  const have = cache.get(key) ?? {}
  const missing = clean.filter((id) => !(id in have))
  if (missing.length === 0) return
  const k2 = `${key}:${missing.slice(0, 3).join(',')}:${missing.length}`
  let p = inflight.get(k2)
  if (!p) { p = fetchMap(owner, missing, locale); inflight.set(k2, p) }
  const fresh = await p
  inflight.delete(k2)
  const merged: OwnerMap = { ...have }
  for (const id of missing) merged[id] = fresh[id] ?? {}    // tuščias objektas = „tikrinta, nėra"
  cache.set(key, merged)
}

function clipsFrom(owner: AudioOwner, id: string, trigger: string, locale: SupportedLocale): Clip[] | null {
  const m = cache.get(`${owner}:${locale}`)?.[id]
  if (!m) return null                     // dar neužkrauta
  const c = m[trigger]
  return c && c.length ? c : []           // [] = užkrauta, bet klipų nėra
}

/**
 * Kortos iškvietimo balsai dabartine balsų kalba.
 * `ltFallback` = cards.gameplay.voiceLines (legacy LT).
 * Grąžina [] jei kalbos balsų nėra ir LT fallback išjungtas → tyla.
 */
export function cardVoiceUrls(cardId: string | null | undefined, ltFallback?: string[] | null): string[] {
  if (!cardId) return ltFallback ?? []
  const loc = voiceLocale()
  const own = clipsFrom('card', cardId, 'summon', loc)
  if (own && own.length) return own.map((c) => c.url)
  if (loc === 'lt') return ltFallback ?? []
  // pasirinkta kalba balsų neturi
  if (!isVoiceFallbackLtEnabled()) return []                       // tyla (sąmoningas pasirinkimas)
  const lt = clipsFrom('card', cardId, 'summon', 'lt')
  if (lt && lt.length) return lt.map((c) => c.url)
  return ltFallback ?? []
}

/**
 * Avatarų garsų žemėlapis mūšiui: lokalizuotas + LT fallback (jei leidžiama).
 * `ltMap` = esamas `rvn_get_avatar_audio` rezultatas (LT).
 */
export function avatarMapFor(ids: (string | null | undefined)[], ltMap: AvatarAudioMap): AvatarAudioMap {
  const loc = voiceLocale()
  if (loc === 'lt') return ltMap
  const out: AvatarAudioMap = {}
  for (const id of ids) {
    if (!id) continue
    const localized = cache.get(`avatar:${loc}`)?.[id]
    const hasLocalized = localized && Object.keys(localized).length > 0
    if (hasLocalized) {
      const evs: AvatarAudioMap[string] = {}
      for (const [ev, clips] of Object.entries(localized)) {
        evs[ev as AvatarAudioEvent] = clips.map((c) => ({ url: c.url, weight: c.weight ?? 1 }))
      }
      out[id] = evs
    } else if (isVoiceFallbackLtEnabled() && ltMap[id]) {
      out[id] = ltMap[id]
    }
    // kitu atveju – tyla šiam avatarui
  }
  return out
}

/** Prieinamumui/subtitrams: klipo transkripcija (jei suvesta). */
export function voiceTranscript(owner: AudioOwner, id: string, trigger: string, url: string): string | null {
  const loc = voiceLocale()
  const clips = clipsFrom(owner, id, trigger, loc) ?? clipsFrom(owner, id, trigger, 'lt') ?? []
  return clips.find((c) => c.url === url)?.transcript ?? null
}

/** Testams. */
export function __resetVoiceCache(): void { cache.clear(); inflight.clear() }
