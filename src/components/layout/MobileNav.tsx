'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, BookOpen, CalendarDays, Map, User, Shield } from 'lucide-react'

// Routes kuriuose nerodome bottom nav
const HIDE_PREFIXES = [
  '/',          // homepage — turi savo nav
  '/admin',
  '/login',
  '/register',
  '/suspended',
  '/offline',
  '/packs',
  '/deck-builder',
]

// Nav items
const NAV_ITEMS = [
  { href: '/cards',    icon: LayoutGrid,   label: 'Kortos'    },
  { href: '/my-decks', icon: BookOpen,     label: 'Kaladės'   },
  { href: '/events',   icon: CalendarDays, label: 'Renginiai' },
  { href: '/lore',     icon: Map,          label: 'Atlasas'   },
  { href: '/rules',    icon: Shield,       label: 'Taisyklės' },
  { href: '/me',       icon: User,         label: 'Profilis'  },
]

// Routes grupuojami po kiekvienu nav item
const ROUTE_GROUPS: Record<string, string[]> = {
  '/cards':    ['/cards', '/my-cards'],
  '/my-decks': ['/my-decks'],
  '/events':   ['/events', '/community-decks', '/leaderboards', '/arena', '/life-tracker'],
  '/lore':     ['/lore'],
  '/rules':    ['/rules'],
  '/me':       ['/me', '/users', '/profile'],
}

function isActive(itemHref: string, pathname: string): boolean {
  // Exact match
  if (pathname === itemHref) return true
  // Group match
  const group = ROUTE_GROUPS[itemHref] ?? [itemHref]
  return group.some((prefix) =>
    prefix !== '/' && (pathname === prefix || pathname.startsWith(prefix + '/'))
  )
}

export function MobileNav() {
  const pathname = usePathname()

  // Hide on exact '/' and all hide prefixes
  const shouldHide =
    pathname === '/' ||
    HIDE_PREFIXES.some((p) => p !== '/' && pathname.startsWith(p))
  if (shouldHide) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background:     'rgba(7,7,15,0.96)',
        backdropFilter: 'blur(20px)',
        borderTop:      '1px solid rgba(240,180,41,0.12)',
        boxShadow:      '0 -4px 24px rgba(0,0,0,0.6)',
      }}
    >
      {/* Gold accent line */}
      <div style={{
        height:     '1px',
        background: 'linear-gradient(to right, transparent, rgba(240,180,41,0.25), transparent)',
        position:   'absolute',
        top: 0, left: 0, right: 0,
      }} />

      <div className="flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href, pathname)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all duration-150 relative"
              style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', minHeight: '56px' }}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: 'var(--gold)', boxShadow: '0 0 8px rgba(240,180,41,0.5)' }}
                />
              )}
              <Icon
                className="w-5 h-5 transition-transform"
                style={{ transform: active ? 'scale(1.1)' : 'scale(1)' }}
              />
              <span style={{
                fontSize:      '9px',
                letterSpacing: '0.06em',
                fontFamily:    'var(--rvn-font-display)',
                fontWeight:    active ? 600 : 400,
                textTransform: 'uppercase',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
