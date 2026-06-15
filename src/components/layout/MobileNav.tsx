'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Layers, Swords, Gamepad2, Trophy, Map, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NAV_SECTIONS, isNavActive, type NavKey } from '@/lib/nav'

// Ikonos pagal skilties raktą
const ICONS: Record<NavKey, LucideIcon> = {
  cards:   LayoutGrid,
  decks:   Layers,
  kova:    Swords,
  digital: Gamepad2,
  arena:   Trophy,
  atlas:   Map,
  profile: User,
}

// Maršrutai, kuriuose apatinis meniu nerodomas (pilno ekrano įrankiai / auth)
const HIDE_PREFIXES = [
  '/admin',
  '/login',
  '/register',
  '/suspended',
  '/offline',
  '/deck-builder',
]

export function MobileNav() {
  const pathname = usePathname()

  const shouldHide =
    pathname === '/' || HIDE_PREFIXES.some((p) => pathname.startsWith(p))
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
      <div style={{
        height:     '1px',
        background: 'linear-gradient(to right, transparent, rgba(240,180,41,0.25), transparent)',
        position:   'absolute',
        top: 0, left: 0, right: 0,
      }} />

      <div className="flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV_SECTIONS.map(({ key, href, label, group }) => {
          const Icon = ICONS[key]
          const active = isNavActive(group, pathname)
          return (
            <Link
              key={key}
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
