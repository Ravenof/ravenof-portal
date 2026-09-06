// /digital – DigitalHub su kliente nustatytu loggedIn (Next versijoje – getCachedUser serveryje).
import { useEffect, useState } from 'react'
import { DigitalHub } from '@/components/digital/DigitalHub'
import { createClient } from '@/lib/supabase/client'

export default function HubScreen() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  useEffect(() => {
    let alive = true
    const sb = createClient()
    sb.auth.getSession().then(({ data }) => { if (alive) setLoggedIn(!!data.session) })
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { if (alive) setLoggedIn(!!s) })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])
  if (loggedIn === null) return null
  return <DigitalHub loggedIn={loggedIn} />
}
