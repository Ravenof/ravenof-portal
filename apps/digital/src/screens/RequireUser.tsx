// Serverio `getCachedUser() || redirect('/digital/login?next=…')` kliento ekvivalentas.
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function useUser(): { user: User | null; loading: boolean } {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true })
  useEffect(() => {
    let alive = true
    const sb = createClient()
    sb.auth.getSession().then(({ data }) => { if (alive) setState({ user: data.session?.user ?? null, loading: false }) })
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { if (alive) setState({ user: s?.user ?? null, loading: false }) })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])
  return state
}

export function RequireUser({ children }: { children: (user: User) => ReactNode }) {
  const { user, loading } = useUser()
  const loc = useLocation()
  if (loading) return null
  if (!user) return <Navigate to={`/digital/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return <>{children(user)}</>
}
