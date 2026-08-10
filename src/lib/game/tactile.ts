// ── Tactile sluoksnio gryna logika (be DOM/JSX) ──────────────────────────────
// Atskirta nuo `components/tutorial/CardTactile.tsx`, kad būtų testuojama be
// React/JSX (bash sandbox paleidžia TS per node --experimental-strip-types).

import { CARD_TACTILE as T } from './timing'

/** Ar `prefers-reduced-motion: reduce` (SSR-saugu). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

/**
 * Tempimo inercija: ghost'as vejasi žymeklį (lerp), bet niekada neatsilieka
 * daugiau nei `dragMaxLagPx` — kitaip ilgas greitas mostas paliktų kortą toli.
 * `reduced = true` (arba prefers-reduced-motion) → be inercijos.
 */
export function dragFollowAt(
  cur: { x: number; y: number },
  target: { x: number; y: number },
  reduced = false,
): { x: number; y: number } {
  if (reduced) return { ...target }
  let nx = cur.x + (target.x - cur.x) * T.dragLerp
  let ny = cur.y + (target.y - cur.y) * T.dragLerp
  const dx = target.x - nx, dy = target.y - ny
  const d = Math.hypot(dx, dy)
  if (d > T.dragMaxLagPx) {
    const k = (d - T.dragMaxLagPx) / d
    nx += dx * k
    ny += dy * k
  }
  return { x: nx, y: ny }
}

/** Ar taškas patenka į stačiakampio magnetinę snap zoną. */
export function withinSnapRect(
  r: { left: number; top: number; right: number; bottom: number },
  x: number,
  y: number,
): boolean {
  const cx = Math.max(r.left, Math.min(x, r.right))
  const cy = Math.max(r.top, Math.min(y, r.bottom))
  return Math.hypot(x - cx, y - cy) <= T.snapRadiusPx
}
