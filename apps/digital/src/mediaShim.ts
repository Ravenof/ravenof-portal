// ── Vietinių media failų shim'as (app bundle) ─────────────────────────────────
// Problema: kortų paveikslai, garsai, balsai, video ateina iš DB kaip ABSOLIUTŪS
// Supabase Storage URL'ai ir naudojami 30+ vietų (<img src>, new Audio(), fetch,
// backgroundImage). Local-first bundle'e tie failai jau guli dist/media/ (žr.
// tools/build-media.mjs) – šis shim'as permeta užklausas į vietinius failus
// VIENOJE vietoje, nekeičiant bendro src/ kodo.
//
// Mechanizmas: media/manifest.json (originalus URL → vietinis kelias) + patch'ai:
//   • Element.setAttribute('src'|'href'|'poster', …)  – React img/audio/video/source
//   • HTMLImageElement/HTMLMediaElement/HTMLSourceElement .src setter – new Audio().src = …
//   • window.Audio(url)                                – soundManager, ui-sound
//   • window.fetch(url)                                – avatarVideoCache
//   • CSSStyleDeclaration.backgroundImage setter       – arenos fonai
// Jei URL nėra manifeste – elgsena nepakitusi (tinklas / SW cache).
// Web versijoje (Next) šis failas NEnaudojamas.

export type LocalMediaManifest = { version: number; base: string; files: Record<string, string> }

let map: Map<string, string> = new Map()
let base = '/media/'

export function localMediaCount(): number { return map.size }
export function hasLocalMedia(url: string): boolean { return map.has(normalize(url)) }

function normalize(url: string): string {
  // thumbUrl() variantai (/render/image/…?width=…) → originalus objektas
  const i = url.indexOf('/storage/v1/render/image/public/')
  if (i >= 0) return url.slice(0, i) + '/storage/v1/object/public/' + url.slice(i + '/storage/v1/render/image/public/'.length).split('?')[0]
  return url.split('#')[0]
}

export function resolveLocal(url: unknown): unknown {
  if (typeof url !== 'string' || url.length < 8) return url
  if (!url.includes('/storage/v1/')) return url
  const local = map.get(normalize(url))
  return local ? base + local : url
}

/** Užkrauna manifestą (jei yra) ir įjungia patch'us. Kviesti PRIEŠ render'ą. */
export async function installMediaShim(): Promise<void> {
  try {
    const r = await fetch('/media/manifest.json', { cache: 'no-store' })
    if (!r.ok) return
    const m = (await r.json()) as LocalMediaManifest
    base = m.base || '/media/'
    map = new Map(Object.entries(m.files))
  } catch { return }
  if (map.size === 0) return
  ;(window as unknown as { __RAVENOF_LOCAL_MEDIA__?: Set<string> }).__RAVENOF_LOCAL_MEDIA__ = new Set(map.keys())
  patch()
}

function patch() {
  const rw = (v: unknown) => resolveLocal(v)
  // 1) setAttribute
  const setAttr = Element.prototype.setAttribute
  Element.prototype.setAttribute = function (name: string, value: string) {
    if ((name === 'src' || name === 'poster' || name === 'href') && typeof value === 'string') value = rw(value) as string
    return setAttr.call(this, name, value)
  }
  // 2) .src setteriai
  for (const proto of [HTMLImageElement.prototype, HTMLMediaElement.prototype, HTMLSourceElement.prototype]) {
    const d = Object.getOwnPropertyDescriptor(proto, 'src')
    if (d?.set) Object.defineProperty(proto, 'src', { ...d, set(v: string) { d.set!.call(this, rw(v)) } })
  }
  const pd = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'poster')
  if (pd?.set) Object.defineProperty(HTMLVideoElement.prototype, 'poster', { ...pd, set(v: string) { pd.set!.call(this, rw(v)) } })
  // 3) new Audio(url)
  const OrigAudio = window.Audio
  const PatchedAudio = function (this: HTMLAudioElement, src?: string) {
    const a = new OrigAudio()
    if (src !== undefined) a.src = rw(src) as string
    return a
  } as unknown as typeof Audio
  PatchedAudio.prototype = OrigAudio.prototype
  window.Audio = PatchedAudio
  // 4) fetch
  const origFetch = window.fetch.bind(window)
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') return origFetch(rw(input) as string, init)
    if (input instanceof URL) return origFetch(rw(input.href) as string, init)
    return origFetch(input, init)
  }) as typeof fetch
  // 5) style.backgroundImage = url(...)
  const bd = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'backgroundImage')
  if (bd?.set) Object.defineProperty(CSSStyleDeclaration.prototype, 'backgroundImage', {
    ...bd,
    set(v: string) {
      if (typeof v === 'string' && v.includes('/storage/v1/')) v = v.replace(/url\((['"]?)([^'")]+)\1\)/g, (_m, q, u) => `url(${q}${rw(u)}${q})`)
      bd.set!.call(this, v)
    },
  })
}
