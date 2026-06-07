import Link from 'next/link'
import { HeaderNav } from '@/components/layout/HeaderNav'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Arena' }
export const revalidate = 60

export default async function ArenaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const SECTIONS = [
    {
      href:    '/community-decks',
      emoji:   '📚',
      title:   'Viešos kaladės',
      desc:    'Naršyk bendruomenės sukurtas kaladesir įsikvėpk naujoms strategijoms.',
      color:   '#b45309',
      border:  'rgba(240,180,41,0.25)',
    },
    {
      href:    '/leaderboards',
      emoji:   '🏆',
      title:   'Topai',
      desc:    'Lygis, kortos, patiktukai, renginiai — pamatyk, kas lyderiauja Ravenof pasaulyje.',
      color:   '#d4af37',
      border:  'rgba(212,175,55,0.3)',
    },
    {
      href:    '/events',
      emoji:   '⚔️',
      title:   'Renginiai',
      desc:    'Artėjantys turnyrai ir praeiti renginiai. Registruokis ir varžykis.',
      color:   '#7c3aed',
      border:  'rgba(124,58,237,0.25)',
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background:     'rgba(7,7,15,0.95)',
          backdropFilter: 'blur(16px)',
          borderColor:    'rgba(240,180,41,0.1)',
          boxShadow:      '0 1px 0 rgba(240,180,41,0.06)',
        }}
      >
        <h1
          className="text-lg font-bold"
          style={{
            fontFamily:    'var(--rvn-font-display)',
            color:         'var(--gold)',
            textShadow:    '0 0 16px rgba(240,180,41,0.3)',
            letterSpacing: '0.06em',
          }}
        >
          🏟️ Arena
        </h1>
        <HeaderNav />
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-8 space-y-4">
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.02em' }}
        >
          Bendruomenės erdvė — kaladės, topai ir renginiai
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group rounded-2xl p-6 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(240,180,41,0.08)]"
              style={{
                background: 'var(--bg-surface)',
                border:     '1px solid ' + s.border,
              }}
            >
              {/* color accent bar */}
              <div className="h-0.5 rounded-full w-10 mb-1" style={{ background: s.color, opacity: 0.7 }} />

              <div className="text-3xl">{s.emoji}</div>

              <h2
                className="text-base font-bold"
                style={{
                  fontFamily:    'var(--rvn-font-display)',
                  color:         'var(--text-primary)',
                  letterSpacing: '0.04em',
                }}
              >
                {s.title}
              </h2>

              <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>
                {s.desc}
              </p>

              <span
                className="text-xs font-semibold mt-1 transition-colors group-hover:text-[var(--gold)]"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}
              >
                Peržiūrėti →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}