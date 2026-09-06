// next/dynamic → React.lazy + Suspense. ssr:false ignoruojama (viskas kliente).
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'

type Loader<P> = () => Promise<{ default: ComponentType<P> } | ComponentType<P>>
type Opts = { ssr?: boolean; loading?: () => ReactNode }

export default function dynamic<P extends object>(loader: Loader<P>, opts?: Opts): ComponentType<P> {
  const Lazy = lazy(async () => {
    const m = await loader()
    return 'default' in m ? m : { default: m as ComponentType<P> }
  })
  const Fallback = opts?.loading
  return function Dynamic(props: P) {
    return <Suspense fallback={Fallback ? <Fallback /> : null}><Lazy {...(props as P)} /></Suspense>
  }
}
