// ════════════════════════════════════════════════════════════════════════════
// Cutscene media cache — balso įrašai / muzika / SFX saugomi ŽAIDĖJO ĮRENGINYJE
// per Cache API (CacheStorage). Veikia naršyklėje ir Capacitor (Android) web-
// view: parsisiųstas failas lieka telefone tarp sesijų, tad kartojant cutscene
// ar grojant offline tinklo nebereikia. Nepavykus — tyliai grįžta prie tiesio-
// ginio URL (kešas niekada ne load-bearing).
// ════════════════════════════════════════════════════════════════════════════

import type { MotionComicDef } from './motionComic'
import type { Cutscene } from './types'

const CACHE_NAME = 'rvn-cutscene-media-v1'

/** url → objectURL, kad tas pats blob'as nebūtų kuriamas kelis kartus. */
const objUrls = new Map<string, string>()

function cacheable(url: string | null | undefined): url is string {
  return !!url && !url.startsWith('blob:') && !url.startsWith('data:')
}

/**
 * Grąžina lokaliai kešuotą media URL (blob:) arba originalų URL, jei kešuoti
 * nepavyko. Pirmą kartą failas parsiunčiamas ir įrašomas į CacheStorage —
 * kitą kartą (net po programos perkrovimo) imamas iš įrenginio disko.
 */
export async function cachedMediaUrl(url: string | null | undefined): Promise<string | null> {
  if (!cacheable(url)) return url ?? null
  const hit = objUrls.get(url)
  if (hit) return hit
  try {
    if (typeof caches === 'undefined') return url
    const cache = await caches.open(CACHE_NAME)
    let res = await cache.match(url)
    if (!res) {
      const fetched = await fetch(url, { mode: 'cors' })
      if (!fetched.ok || fetched.type === 'opaque') return url
      try { await cache.put(url, fetched.clone()) } catch { /* pilnas diskas ir pan. */ }
      res = fetched
    }
    const blob = await res.blob()
    const obj = URL.createObjectURL(blob)
    objUrls.set(url, obj)
    return obj
  } catch {
    return url
  }
}

/** Fone parsiunčia ir įrašo į įrenginio kešą (be objectURL kūrimo). */
export function precacheCutsceneMedia(urls: (string | null | undefined)[]): void {
  if (typeof caches === 'undefined') return
  const list = urls.filter(cacheable)
  if (!list.length) return
  void (async () => {
    try {
      const cache = await caches.open(CACHE_NAME)
      for (const url of list) {
        try {
          if (await cache.match(url)) continue
          const res = await fetch(url, { mode: 'cors' })
          if (res.ok && res.type !== 'opaque') await cache.put(url, res)
        } catch { /* tyliai — pvz., offline */ }
      }
    } catch { /* */ }
  })()
}

/** Atlaisvina objectURL'us (kešas diske LIEKA). Kviesti cutscene pabaigoje. */
export function releaseCutsceneMedia(): void {
  for (const obj of objUrls.values()) {
    try { URL.revokeObjectURL(obj) } catch { /* */ }
  }
  objUrls.clear()
}

/** Surenka visus motion-comic definicijos audio URL precache'ui. */
export function collectMotionComicAudio(def: MotionComicDef): string[] {
  const out: (string | null | undefined)[] = [def.musicUrl, def.ambientUrl]
  for (const s of def.shots ?? []) out.push(s.voiceUrl, s.sfxUrl, s.musicUrl, s.ambientUrl)
  return out.filter(cacheable)
}

/** Surenka seno VN formato cutscene audio URL precache'ui. */
export function collectVnCutsceneAudio(c: Cutscene): string[] {
  const out: (string | null | undefined)[] = [c.musicUrl, c.ambientUrl]
  for (const s of c.steps ?? []) out.push(s.voiceUrl)
  return out.filter(cacheable)
}
