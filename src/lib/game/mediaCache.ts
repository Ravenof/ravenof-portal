// ── Bendras media cache helperis (offline planas F4) ─────────────────────────
// cache-first į rvn-media-v1 — tą patį, kurį pildo SW v4 ir mediaDownloader.
// Naudoti vietoj fetch() audio/video failams: veikia ir kontekstuose be SW.
export async function cachedFetch(url: string): Promise<Response> {
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open('rvn-media-v1')
      const hit = await cache.match(url)
      if (hit) return hit
      const net = await fetch(url)
      if (net.ok && net.status === 200) { try { await cache.put(url, net.clone()) } catch { /* kvota */ } }
      return net
    }
  } catch { /* cache API neprieinamas */ }
  return fetch(url)
}
