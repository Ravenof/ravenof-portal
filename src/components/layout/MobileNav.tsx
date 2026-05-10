'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Swords, Users, Calendar, User } from 'lucide-react'

const HIDE_PREFIXES = ['/admin', '/login', '/register', '/deck-builder', '/life-tracker']

const NAV_ITEMS = [
  { href: '/cards',            icon: LayoutGrid, label: 'Kortos' },
  { href: '/my-decks',         icon: Swords,     label: 'Kaladės' },
  { href: '/community-decks',  icon: Users,      label: 'Viešos' },
  { href: '/events',           icon: Calendar,   label: 'Renginiai' },
  { href: '/me',               icon: User,       label: 'Profilis' },
]

export function MobileNav() {
  const pathname = usePathname()

  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t"
      style={{
        background: 'rgba(10,10,15,0.97)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--bg-border)',
      }}
    >
      <div className="flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-opacity"
              style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', minHeight: '52px' }}
            >
              <Icon className="w-5 h-5" />
              <span style={{ fontSize: '9px', letterSpacing: '0.02em' }}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
