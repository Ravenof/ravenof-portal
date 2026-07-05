// ── Kliento pusės vaizdų optimizacija prieš Supabase Storage įkėlimą ──────────
// Kortų art iš Figmos (x3 PNG) sveria ~2–4 MB. Konvertuojam į WebP (~120–180 KB,
// vizualiai neatskiriama) ir nustatom ilgą cache → drastiškai mažina Supabase
// „Cached Egress". Dimensijų beveik nemažinam (detailed view telefone su DPR3
// nori ~780–800 px), tik apribojam viršų, kad milžiniški originalai netaptų bomba.

export const CARD_MAX_W = 900          // saugu detailed view (≈780–800 px reikia); didesnius sumažina
export const CARD_WEBP_QUALITY = 0.82  // fotografiniam artui – nematomas skirtumas
export const LONG_CACHE = '31536000'   // 1 metai; failų vardai unikalūs (timestamp) → immutable saugu

export type OptimizedImage = { blob: Blob; ext: string; contentType: string; converted: boolean }

/**
 * Sumažina (jei platesnis nei maxW) ir konvertuoja į WebP naršyklėje.
 * Jei konversija nepavyksta arba WebP didesnis už originalą – grąžina originalą.
 */
export async function toWebp(file: File, opts?: { maxW?: number; quality?: number }): Promise<OptimizedImage> {
  const maxW = opts?.maxW ?? CARD_MAX_W
  const quality = opts?.quality ?? CARD_WEBP_QUALITY
  const fallback: OptimizedImage = { blob: file, ext: (file.name.split('.').pop() || 'png').toLowerCase(), contentType: file.type || 'application/octet-stream', converted: false }
  if (typeof document === 'undefined') return fallback
  let bitmap: ImageBitmap | null = null
  try { bitmap = await createImageBitmap(file) } catch { return fallback }
  try {
    const scale = bitmap.width > maxW ? maxW / bitmap.width : 1
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return fallback
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', quality))
    if (!blob || blob.size >= file.size) return fallback
    return { blob, ext: 'webp', contentType: 'image/webp', converted: true }
  } catch {
    return fallback
  } finally {
    bitmap?.close?.()
  }
}
