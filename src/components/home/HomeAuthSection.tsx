'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type UserInfo = { username: string; display_name: string | null } | null

export function HomeAuthNav() {
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined) // undefined = loading

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setUserInfo(null); return }
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .maybeSingle()
      setUserInfo(data ?? null)
    })
  }, [])

  // Loading — rodo placeholder kad išvengtų layout shift
  if (userInfo === undefined) {
    return (
      <div className="flex items-center gap-2">
        <div style={{ width: 80, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ width: 90, height: 30, borderRadius: 8, background: 'rgba(146,64,14,0.3)' }} />
      </div>
    )
  }

  if (userInfo) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/me"
          className="text-xs px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}>
          {userInfo.display_name ?? userInfo.username}
        </Link>
        <Link href="/cards"
          className="text-xs px-4 py-1.5 rounded-lg font-semibold"
          style={{ background: 'linear-gradient(135deg,#92400e,#b45309)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.3)', fontFamily: 'var(--rvn-font-display)' }}>
          Portalas
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login"
        className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
        style={{ color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}>
        Prisijungti
      </Link>
      <Link href="/register"
        className="text-xs px-4 py-1.5 rounded-lg font-semibold"
        style={{ background: 'linear-gradient(135deg,#92400e,#b45309)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.3)', fontFamily: 'var(--rvn-font-display)' }}>
        Registruotis
      </Link>
    </div>
  )
}

export function HomeAuthCTA() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  if (isLoggedIn === null) return null // Negeneruojame placeholder, CTA bloke jau yra Kortų bazė

  if (isLoggedIn) {
    return (
      <Link href="/deck-builder"
        className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all active:scale-95 hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
        style={{ background: 'transparent', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
        + Nauja kaladė
      </Link>
    )
  }

  return (
    <Link href="/register"
      className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all active:scale-95 hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
      style={{ background: 'transparent', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
      Prisijunk nemokamai
    </Link>
  )
}
