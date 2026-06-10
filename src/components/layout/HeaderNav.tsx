'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DESKTOP_LINKS, isNavActive } from '@/lib/nav'
import { GlobalSoundToggle } from '@/components/ui/GlobalSoundToggle'

const linkBase =
  'text-sm px-3 py-1.5 rounded-lg transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]'

/**
 * Bendra desktop viršutinės juostos navigacija.
 * Naudojama visų puslapių antraštėse – vienodos nuorodos visur.
 * Rodoma tik nuo lg (mobile/planšetė naudoja apatinį MobileNav).
 */
export function HeaderNav() {
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user))
  }, [])

  return (
    <nav className="hidden lg:flex items-center gap-2 flex-wrap justify-end">
      {DESKTOP_LINKS.map(({ href, label, group }) => {
        const active = isNavActive(group, pathname)
        return (
          <Link
            key={href}
            href={href}
            className={linkBase}
            style={{
              color: active ? 'var(--gold)' : 'var(--text-secondary)',
              border: '1px solid ' + (active ? 'rgba(240,180,41,0.35)' : 'var(--bg-border)'),
              fontFamily: 'var(--rvn-font-display)',
              fontSize: '11px',
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </Link>
        )
      })}

      <GlobalSoundToggle />

      {/* Auth dalis */}
      {loggedIn === null ? (
        <div style={{ width: 150, height: 30 }} />
      ) : loggedIn ? (
        <>
          <Link
            href="/me"
            className={linkBase}
            style={{
              color: isNavActive(['/me', '/users', '/profile'], pathname) ? 'var(--gold)' : 'var(--text-secondary)',
              border: '1px solid var(--bg-border)',
              fontFamily: 'var(--rvn-font-display)',
              fontSize: '11px',
            }}
          >
            Profilis
          </Link>
          <a
            href="/api/auth/signout"
            className="text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-70"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)', fontSize: '11px' }}
          >
            Atsijungti
          </a>
        </>
      ) : (
        <Link
          href="/login"
          className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-all hover:shadow-[0_0_10px_rgba(240,180,41,0.2)]"
          style={{
            background: 'linear-gradient(135deg,#92400e,#b45309)',
            color: 'var(--gold)',
            border: '1px solid rgba(240,180,41,0.3)',
            fontFamily: 'var(--rvn-font-display)',
            fontSize: '11px',
          }}
        >
          Prisijungti
        </Link>
      )}
    </nav>
  )
}
