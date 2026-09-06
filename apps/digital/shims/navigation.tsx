// next/navigation → react-router. Palaikoma: useRouter, usePathname, useSearchParams, redirect, notFound, useParams.
import { useMemo } from 'react'
import { useNavigate, useLocation, useSearchParams as useRRSearchParams, useParams as useRRParams, Navigate } from 'react-router-dom'

export function useRouter() {
  const navigate = useNavigate()
  return useMemo(() => ({
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => { /* SPA: nėra serverio duomenų – no-op; ekranai patys refetch'ina */ },
    prefetch: () => { /* no-op */ },
  }), [navigate])
}

export function usePathname(): string { return useLocation().pathname }

/** Next ReadonlyURLSearchParams suderinamas objektas. */
export function useSearchParams(): URLSearchParams {
  const [sp] = useRRSearchParams()
  return sp
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  return useRRParams() as unknown as T
}

/**
 * redirect() Next'e meta specialią klaidą; SPA'oje – navigacija per window.location
 * (naudojama tik puslapių lygyje: album → collection, deck → decks). Komponentas,
 * kuris nori deklaratyvaus redirect'o, gali naudoti <RedirectTo/>.
 */
export function redirect(href: string): never {
  if (typeof window !== 'undefined') {
    const base = window.location.pathname
    if (base !== href.split('?')[0]) window.history.replaceState(null, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  throw new RedirectSignal(href)
}
export class RedirectSignal extends Error { constructor(public href: string) { super(`redirect:${href}`) } }
export function RedirectTo({ href }: { href: string }) { return <Navigate to={href} replace /> }

export function notFound(): never { throw new Error('notFound') }
export function useSelectedLayoutSegment(): string | null { return null }
export function useSelectedLayoutSegments(): string[] { return [] }
