'use client'

// ── Lokalizuoti meno asset'ai (Fazė 10) ─────────────────────────────────────
// Kai kuriuose PNG tekstas ĮKEPTAS (ŽAISTI DABAR, Pradėti kovą, REITINGAS…).
// EN režime toks LT paveikslėlis NERODOMAS — vietoje jo renderinamas HTML
// tekstas (jokio teksto ant teksto, jokio LT teksto angliškoje sąsajoje).
// Kai atsiras EN asset'as — užtenka jį įrašyti `LOCALIZED_ASSETS` registre.

import { useLocale, useT } from '@/lib/i18n/react'
import { localizedAsset, NEUTRAL_CTA, type LocalizedAssetKey } from '@/lib/i18n/assets'

/** Antraštės art (arba HTML antraštė, jei kalbai asset'o nėra). */
export function ArtHeading({ assetKey, labelKey, height, className, style }: {
  assetKey: LocalizedAssetKey; labelKey: string; height: string
  className?: string; style?: React.CSSProperties
}) {
  const locale = useLocale()
  const t = useT()
  const src = localizedAsset(assetKey, locale)
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={t(labelKey)} className={className} style={{ height, width: 'auto', ...style }} />
  }
  return (
    <span className={'rvn-disp font-black uppercase ' + (className ?? '')}
      style={{
        fontSize: `calc(${height} * 0.78)`, lineHeight: 1, letterSpacing: '0.06em',
        background: 'linear-gradient(180deg,#ffe9a8,#f3b62c 55%,#c5841a)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        textShadow: '0 2px 10px rgba(0,0,0,0.55)', ...style,
      }}>
      {t(labelKey)}
    </span>
  )
}

/** CTA mygtuko art. Nesant kalbos asset'o – neutralus rėmelis + HTML tekstas. */
export function ArtCta({ assetKey, labelKey, className, style, imgStyle }: {
  assetKey: LocalizedAssetKey; labelKey: string
  className?: string; style?: React.CSSProperties; imgStyle?: React.CSSProperties
}) {
  const locale = useLocale()
  const t = useT()
  const src = localizedAsset(assetKey, locale)
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={t(labelKey)} className={className} style={imgStyle} />
  }
  return (
    <span className={'relative block ' + (className ?? '')} style={{ lineHeight: 0, ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={NEUTRAL_CTA} alt="" aria-hidden className="block w-full" style={imgStyle} />
      <span className="absolute inset-0 flex items-center justify-center rvn-disp font-black uppercase"
        style={{ fontSize: 'clamp(11px,2vh,17px)', letterSpacing: '0.08em', color: '#3a2406', lineHeight: 1, padding: '0 8%' }}>
        {t(labelKey)}
      </span>
    </span>
  )
}

/** Kovos režimo kortelės art. Nesant kalbos asset'o – CSS kortelė su HTML tekstu. */
export function ArtModeCard({ assetKey, labelKey, accent, onError }: {
  assetKey: LocalizedAssetKey; labelKey: string; accent: string; onError?: () => void
}) {
  const locale = useLocale()
  const t = useT()
  const src = localizedAsset(assetKey, locale)
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" aria-hidden loading="eager" onError={onError}
      className="block w-full h-full pointer-events-none select-none"
      style={{ objectFit: 'contain', objectPosition: 'center' }} />
  }
  return (
    <span className="flex items-center justify-center w-full h-full rvn-disp font-black uppercase select-none"
      style={{
        borderRadius: 12, letterSpacing: '0.1em', fontSize: 'clamp(9px,1.6vh,13px)', color: '#f3ead3',
        background: `linear-gradient(150deg, ${accent}2e, rgba(10,8,16,0.92))`,
        border: `1px solid ${accent}99`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 10px ${accent}44`,
        textShadow: '0 1px 6px rgba(0,0,0,0.8)',
      }}>
      {t(labelKey)}
    </span>
  )
}
