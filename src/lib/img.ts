// ── Vaizdų thumb'ai per Supabase image transformations ───────────────────────
// Pilno dydžio kortų/parduotuvės vaizdai (dažnai >1 MB) traukiami į mažus
// langelius — pagrindinis lėto krovimo kaltininkas. Šis helperis paverčia
// storage URL į /render/image su width/quality. Jei transformacijos projekte
// neįjungtos (free tier) — pirmam failui nepavykus, visam session'ui grįžtama
// prie originalų (jokių dvigubų užklausų po pirmos).

let transformsBroken = false
export function markTransformsBroken(): void { transformsBroken = true }
export function transformsAvailable(): boolean { return !transformsBroken }

const OBJ = '/storage/v1/object/public/'
const RENDER = '/storage/v1/render/image/public/'

/** Grąžina sumažintą URL arba null (jei ne supabase storage / transformai neveikia). */
export function thumbUrl(url: string | null | undefined, width: number, quality = 72): string | null {
  if (!url || transformsBroken) return null
  const i = url.indexOf(OBJ)
  if (i < 0) return null
  // Kanoniniai bucket'ai: 240 arba 480 — kad SW media cache'e (rvn-media-v1)
  // vienam failui būtų max 2 variantai, o ne po vieną kiekvienam UI dydžiui.
  width = width <= 240 ? 240 : 480
  // resize=contain BŪTINA: be jo Supabase keičia tik plotį, o aukštį palieka –
  // grąžina per aukštį iškirptą juostą (pvz. 1088x1475 → 360x1475). Patikrinta check-transform.mjs
  return url.slice(0, i) + RENDER + url.slice(i + OBJ.length) + `?width=${width}&quality=${quality}&resize=contain`
}
