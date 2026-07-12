'use client'

// ════════════════════════════════════════════════════════════════════════════
// RvnIcon — „drop-in" ikona. Bando įkelti /public/digital/icons/<name>.<ext>;
// jei failo NĖRA (arba dar neįkeltas) — automatiškai parodo atsarginę (lucide/
// emoji) ikoną. Taip gali dėti savo ikonas palaipsniui, be kodo keitimo.
//   Numatytas formatas: PNG su permatomu fonu. Nori SVG/WEBP? pakeisk ICON_EXT.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import type { ReactNode } from 'react'

export const ICON_BASE = '/digital/icons'
export const ICON_EXT = 'png'  // <-- vienas perjungiklis: 'png' | 'svg' | 'webp'
export const ICON_V = '7'      // cache-busting: padidink kai keiti ikonas (priverst. re-fetch)

export function RvnIcon({ name, fallback, size = 24, style, round }: {
  name: string
  fallback: ReactNode
  size?: number
  style?: React.CSSProperties
  round?: boolean
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback}</>
  return (
    <img
      src={`${ICON_BASE}/${name}.${ICON_EXT}?v=${ICON_V}`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', borderRadius: round ? '50%' : undefined, ...style }}
    />
  )
}
