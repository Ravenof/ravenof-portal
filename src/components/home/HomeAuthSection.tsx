'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type UserInfo = { username: string; display_name: string | null } | null

// ── HomeAuthNav ───────────────────────────────────────────────────────────────

export function HomeAuthNav() {
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    // getSession() — lokalus skaitymas be tinklo užklausos
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setUserInfo(null); return }
      const { data } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', session.user.id)
        .maybeSingle()
      setUserInfo(data ?? null)
    })
  }, [])

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
          Kortų bazė
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

// ── HomeAuthCTA ───────────────────────────────────────────────────────────────

export function HomeAuthCTA() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
  }, [])

  if (isLoggedIn === null) return null

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

// ── HomeOnboardingSteps ───────────────────────────────────────────────────────

type Step = { icon: string; step: string; title: string; desc: string }

export function HomeOnboardingSteps({ steps }: { steps: Step[] }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
  }, [])

  // Kol auth kraunasi - rezervuojame vieta, kad nemirgetu sveciu vaizdas
  if (isLoggedIn === null) {
    return <section className="mb-12" style={{ minHeight: 320 }} aria-hidden />
  }

  // Guest: show full onboarding guide
  if (!isLoggedIn) {
    return (
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
            Kaip pradėti
          </h2>
          <div className="flex-1 h-px"
            style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.3), transparent)' }} />
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {steps.map((s, i) => (
            <div key={s.step}
              className="relative rounded-xl p-4"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 -right-1.5 w-3 h-px z-10"
                  style={{ background: 'rgba(240,180,41,0.25)' }} />
              )}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ background: 'rgba(240,180,41,0.08)', border: '1px solid rgba(240,180,41,0.15)' }}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold"
                      style={{ color: 'rgba(240,180,41,0.4)', fontFamily: 'var(--rvn-font-display)' }}>
                      {s.step}
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-tight mb-1"
                    style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                    {s.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3"
          style={{ padding: '20px', borderRadius: '12px', background: 'rgba(240,180,41,0.04)', border: '1px solid rgba(240,180,41,0.1)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}>
            Nori sekti savo kolekciją ir kurti kalades?
          </p>
          <div className="flex gap-2">
            <Link href="/register"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#92400e,#b45309)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.35)', fontFamily: 'var(--rvn-font-display)' }}>
              Registruotis nemokamai
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all hover:opacity-80"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}>
              Jau turiu paskyrą
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // Logged in: show quick-action bar
  const quickActions = [
    { href: '/cards',        icon: '🃏', label: 'Kortų bazė',    sub: 'Naršyk ir filtrink' },
    { href: '/deck-builder', icon: '⚗️',  label: 'Nauja kaladė', sub: 'Pradėk kurti'        },
    { href: '/my-decks',     icon: '📂', label: 'Mano kaladės', sub: 'Peržiūrėk visas'     },
    { href: '/me',           icon: '👤', label: 'Mano profilis', sub: 'XP ir ženkliukai'    },
  ]

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
          Tavo portalas
        </h2>
        <div className="flex-1 h-px"
          style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.3), transparent)' }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(({ href, icon, label, sub }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 p-3 rounded-xl transition-all hover:border-[rgba(240,180,41,0.3)]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}>
            <span className="text-xl shrink-0">{icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate"
                style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                {label}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
