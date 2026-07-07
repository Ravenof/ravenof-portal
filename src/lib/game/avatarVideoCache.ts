// ── Avatarų idle-video lokalus cache ──────────────────────────────────────────
// Video parsiunčiami į Cache Storage (persistuoja tarp sesijų, t.y. „local
// storage" įrenginyje) ir grojami iš blob object-URL — pasileidimas momentinis,
// be tinklo užklausos ir be WebView „play" placeholder'io.

const mem = new Map<string, string>()          // url -> objectURL (šios sesijos)
const inflight = new Map<string, Promise<string>>()
// v2: bendras cache su SW/downloader'iu — „Išvalyti atsisiųstą turinį" ir
// storage apskaita mato viską vienoje vietoje (offline planas F4).
const CACHE_NAME = 'rvn-media-v1'
// vienkartinis senojo atskiro cache išvalymas (failai persisiųs į bendrą)
if (typeof caches !== 'undefined') { try { void caches.delete('rvn-avatar-videos-v1') } catch { /* */ } }

async function fetchToObjectUrl(url: string): Promise<string> {
  // 1) Cache Storage (jei prieinamas)
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME)
      let res = await cache.match(url)
      if (!res) {
        const net = await fetch(url)
        if (net.ok) { await cache.put(url, net.clone()); res = net }
      }
      if (res) {
        const blob = await res.blob()
        const obj = URL.createObjectURL(blob)
        mem.set(url, obj)
        return obj
      }
    }
  } catch { /* cache API neprieinamas – krentam į paprastą fetch */ }
  // 2) fallback: tiesiog fetch į blob (be persist)
  try {
    const r = await fetch(url)
    if (r.ok) {
      const obj = URL.createObjectURL(await r.blob())
      mem.set(url, obj)
      return obj
    }
  } catch { /* */ }
  return url // paskutinis fallback — originalus URL
}

/** Grąžina lokaliai cache'uotą object-URL (parsiunčia, jei dar nėra). */
export function getCachedVideoUrl(url: string): Promise<string> {
  const m = mem.get(url)
  if (m) return Promise.resolve(m)
  const inf = inflight.get(url)
  if (inf) return inf
  const p = fetchToObjectUrl(url).finally(() => inflight.delete(url))
  inflight.set(url, p)
  return p
}

/** Iš anksto parsiunčia avatarų video (kviesti mūšio pradžioje). */
export function preloadAvatarVideos(urls: string[]): void {
  for (const u of urls.slice(0, 6)) void getCachedVideoUrl(u)
}
