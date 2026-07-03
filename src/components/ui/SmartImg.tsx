'use client'

// ── SmartImg: <img> su Supabase thumb transformacija ir fallback grandine ─────
// 1) bando sumažintą /render/image URL (greitas, mažas)
// 2) nepavykus — originalą (ir išjungia transformus visai sesijai)
// 3) nepavykus ir jam — praneša onFail (komponentas rodo savo placeholder)
import { useEffect, useState } from 'react'
import { thumbUrl, markTransformsBroken } from '@/lib/img'

export function SmartImg({ src, width, quality, onFail, alt = '', ...rest }: {
  src: string
  width: number
  quality?: number
  onFail?: () => void
  alt?: string
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width'>) {
  const [cur, setCur] = useState<string>(() => thumbUrl(src, width, quality) ?? src)
  useEffect(() => { setCur(thumbUrl(src, width, quality) ?? src) }, [src, width, quality])
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cur} alt={alt} loading="lazy" decoding="async" draggable={false}
      onError={() => {
        if (cur !== src) { markTransformsBroken(); setCur(src) }
        else onFail?.()
      }}
      {...rest} />
  )
}
