// next/image → paprastas <img>. Optimizacijos nėra – asset'ai jau optimizuoti bundle'e.
import { forwardRef, type ImgHTMLAttributes } from 'react'
type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string; fill?: boolean; priority?: boolean; quality?: number; unoptimized?: boolean; sizes?: string }
const Image = forwardRef<HTMLImageElement, Props>(function Image({ fill, priority, quality, unoptimized, style, ...rest }, ref) {
  const s = fill ? { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const, ...style } : style
  return <img ref={ref} loading={priority ? 'eager' : 'lazy'} style={s} {...rest} />
})
export default Image
