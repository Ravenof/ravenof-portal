/**
 * Vienas navigacijos struktūros šaltinis (mobile + desktop).
 * Keičiant skiltis – keisti TIK čia.
 */

export type NavKey = 'cards' | 'decks' | 'kova' | 'digital' | 'arena' | 'atlas' | 'profile'

export type NavSection = {
  key: NavKey
  href: string
  label: string
  /** Maršrutų prefiksai, kurie pažymi šią skiltį kaip aktyvią. */
  group: string[]
}

/** Mobiliojo apatinio meniu skiltys (6 fiksuoti mygtukai). */
export const NAV_SECTIONS: NavSection[] = [
  { key: 'cards',   href: '/cards',        label: 'Kortos',   group: ['/cards', '/my-cards'] },
  { key: 'decks',   href: '/my-decks',     label: 'Kaladės',  group: ['/my-decks', '/deck-builder', '/community-decks'] },
  { key: 'kova',    href: '/life-tracker', label: 'Kova',     group: ['/life-tracker'] },
  { key: 'digital', href: '/digital',      label: 'Digital',  group: ['/digital'] },
  { key: 'arena',   href: '/arena',        label: 'Arena',    group: ['/arena', '/events', '/my-events', '/leaderboards'] },
  { key: 'atlas',   href: '/lore',         label: 'Atlasas',  group: ['/lore', '/rules'] },
  { key: 'profile', href: '/me',           label: 'Profilis', group: ['/me', '/users', '/profile'] },
]

/** Desktop viršutinės juostos nuorodos (turi vietos – Taisyklės atskirai). */
export const DESKTOP_LINKS: { href: string; label: string; group: string[] }[] = [
  { href: '/cards',        label: 'Kortos',    group: ['/cards', '/my-cards'] },
  { href: '/my-decks',     label: 'Kaladės',   group: ['/my-decks', '/deck-builder', '/community-decks'] },
  { href: '/life-tracker', label: 'Kova',      group: ['/life-tracker'] },
  { href: '/digital',      label: 'Digital',   group: ['/digital'] },
  { href: '/arena',        label: 'Arena',     group: ['/arena', '/events', '/my-events', '/leaderboards'] },
  { href: '/lore',         label: 'Atlasas',   group: ['/lore'] },
  { href: '/rules',        label: 'Taisyklės', group: ['/rules'] },
]

export function isNavActive(group: string[], pathname: string): boolean {
  return group.some((p) => pathname === p || pathname.startsWith(p + '/'))
}
