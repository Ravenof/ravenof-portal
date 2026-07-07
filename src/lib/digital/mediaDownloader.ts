// ── Offline media cache Fazė 3 — „Atsisiųsti žaidimo turinį" varikliukas ──────
// Ima manifestą (rvn_media_manifest), lygina su rvn-media-v1 Cache Storage
// (tą patį skaito/pildo SW v4) ir siunčia trūkstamus failus eile (concurrency 4).
// Progresas baitais iš manifesto bytes. Atšaukimas per AbortSignal-like flag.
import { createClient } from '@/lib/supabase/client'

export const MEDIA_CACHE = 'rvn-media-v1'

export type ManifestEntry = { url: string; kind: string; tier: number; bytes: number }
export type DlProgress = {
  totalFiles: number; doneFiles: number
  totalBytes: number; doneBytes: number
  failed: number; running: boolean
}

export async function getMediaManifest(): Promise<ManifestEntry[]> {
  const { data, error } = await createClient().rpc('rvn_media_manifest')
  if (error) { console.warn('[media] manifest:', error.message); return [] }
  return (data as ManifestEntry[]) ?? []
}

/** Kurių manifesto failų dar nėra cache — grąžina trūkstamus. */
export async function diffMissing(entries: ManifestEntry[]): Promise<ManifestEntry[]> {
  if (typeof caches === 'undefined') return entries
  const cache = await caches.open(MEDIA_CACHE)
  const keys = await cache.keys()
  const have = new Set(keys.map((r) => r.url))
  return entries.filter((e) => !have.has(e.url))
}

export type DlHandle = { cancel: () => void; promise: Promise<DlProgress> }

/** Siunčia trūkstamus failus į rvn-media-v1. onProgress kviečiamas po kiekvieno failo. */
export function downloadMedia(missing: ManifestEntry[], onProgress: (p: DlProgress) => void): DlHandle {
  let cancelled = false
  const totalBytes = missing.reduce((s, e) => s + (e.bytes || 0), 0)
  const p: DlProgress = { totalFiles: missing.length, doneFiles: 0, totalBytes, doneBytes: 0, failed: 0, running: true }

  const promise = (async () => {
    const cache = await caches.open(MEDIA_CACHE)
    const queue = [...missing]
    const CONCURRENCY = 4
    const worker = async () => {
      while (!cancelled) {
        const e = queue.shift()
        if (!e) return
        try {
          const res = await fetch(e.url)
          if (res.ok && res.status === 200) await cache.put(new Request(e.url), res)
          else p.failed++
        } catch { p.failed++ }
        p.doneFiles++; p.doneBytes += e.bytes || 0
        onProgress({ ...p })
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
    p.running = false
    onProgress({ ...p })
    return p
  })()

  return { cancel: () => { cancelled = true }, promise }
}

/** Kiek failų jau turime cache + kiek vietos užima visa origin storage. */
export async function cachedMediaInfo(): Promise<{ files: number; usageBytes: number | null; quotaBytes: number | null }> {
  let files = 0
  try { const c = await caches.open(MEDIA_CACHE); files = (await c.keys()).length } catch { /* */ }
  let usageBytes: number | null = null, quotaBytes: number | null = null
  try {
    const est = await navigator.storage?.estimate?.()
    usageBytes = est?.usage ?? null; quotaBytes = est?.quota ?? null
  } catch { /* */ }
  return { files, usageBytes, quotaBytes }
}

export async function clearMediaCache(): Promise<boolean> {
  try { return await caches.delete(MEDIA_CACHE) } catch { return false }
}

export const fmtMB = (b: number) => b >= 1024 * 1024 * 1024
  ? (b / 1024 / 1024 / 1024).toFixed(1) + ' GB'
  : Math.max(1, Math.round(b / 1024 / 1024)) + ' MB'
