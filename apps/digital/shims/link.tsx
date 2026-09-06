// next/link → react-router Link. Išoriniai / mailto / hash – paprastas <a>.
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string | { pathname?: string; query?: Record<string, string | number | undefined> }
  prefetch?: boolean | null
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
  passHref?: boolean
  legacyBehavior?: boolean
  children?: ReactNode
}

type UrlObject = { pathname?: string; query?: Record<string, string | number | undefined> }
function toHref(h: string | UrlObject): string {
  if (typeof h === 'string') return h
  const q = h.query ? Object.entries(h.query).filter(([, v]) => v !== undefined).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&') : ''
  return (h.pathname ?? '') + (q ? `?${q}` : '')
}

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, children, ...rest }, ref) {
  const to = toHref(href)
  const external = /^(https?:)?\/\//.test(to) || to.startsWith('mailto:') || to.startsWith('tel:')
  if (external) return <a ref={ref} href={to} {...rest}>{children}</a>
  return <RouterLink ref={ref} to={to} replace={replace} {...rest}>{children}</RouterLink>
})
export default Link
