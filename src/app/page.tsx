import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/public'
import { HomeAuthNav, HomeAuthCTA } from '@/components/home/HomeAuthSection'

// ISR: 5 min cache — veikia nes nėra cookies() iškvietimo
export const revalidate = 300

type EventRow = { id: string; title: string; starts_at: string; event_type: string; location: string | null; capacity: number | null }
type DeckRow  = { id: string; name: string; score: number; card_count: number; faction: { name: string; color_hex: string } | null; author: string }

const SECTIONS = [
  { href: '/cards',           icon: '🃏', label: 'Kortų bazė',       desc: 'Visa kortų kolekcija su filtrais ir statistika'  },
  { href: '/deck-builder',    icon: '⚗️',  label: 'Kaladžių kūrėjas', desc: 'Kurkite ir dalinkitės savo kaladėmis'            },
  { href: '/community-decks', icon: '📚', label: 'Viešos kaladės',   desc: 'Žiūrėkite ir balsuokite už geriausias kaladės'   },
  { href: '/events',          icon: '📅', label: 'Renginiai',         desc: 'Turnyrai, susitikimai ir kiti žaidėjų renginiai' },
  { href: '/leaderboards',    icon: '🏆', label: 'Topai',             desc: 'Geriausių žaidėjų ir kaladžių reitingai'         },
  { href: '/life-tracker',    icon: '⚔️',  label: 'Kova',             desc: 'Gyvenimo taškų skaičiuoklė porai ar komandai'   },
]

function hexColor(hex: string | undefined) {
  if (!hex) return '#b8860b'
  return '#' + hex.replace('#', '')
}

async function getHomeData() {
  const supabase = createPublicClient()
  const now = new Date().toISOString()

  // Single wave — faction + author embedded via JOIN, no sequential round-trips
  const [
    { count: totalCards },
    { count: totalUsers },
    { count: totalDecks },
    { data: upcomingRaw },
    { data: topDecksRaw },
  ] = await Promise.all([
    supabase.from('cards').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('decks').select('id', { count: 'exact', head: true }).eq('visibility', 'public'),
    supabase.from('events').select('id, title, starts_at, event_type, location, capacity')
      .gte('starts_at', now).neq('status', 'draft').order('starts_at').limit(3),
    supabase
      .from('decks')
      .select('id, name, score, card_count, faction:factions(name, color_hex), owner:profiles!user_id(username, display_name)')
      .eq('visibility', 'public')
      .order('score', { ascending: false })
      .limit(3),
  ])

  type RawDeck = {
    id: string
    name: string
    score: number
    card_count: number
    faction: { name: string; color_hex: string } | null
    owner: { username: string; display_name: string | null } | null
  }

  const topDecks: DeckRow[] = ((topDecksRaw ?? []) as unknown as RawDeck[]).map((d) => ({
    id: d.id,
    name: d.name,
    score: d.score,
    card_count: d.card_count,
    faction: d.faction ?? null,
    author: d.owner ? (d.owner.display_name ?? d.owner.username) : '—',
  }))

  return {
    totalCards: totalCards ?? 0,
    totalUsers: totalUsers ?? 0,
    totalDecks: totalDecks ?? 0,
    upcomingEvents: (upcomingRaw ?? []) as EventRow[],
    topDecks,
  }
}

export default async function HomePage() {
  const { totalCards, totalUsers, totalDecks, upcomingEvents, topDecks } = await getHomeData()

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* BG orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,180,41,0.04) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-screen-xl mx-auto px-4">

        {/* ── NAV ─────────────────────────────────────────────── */}
        <nav className="flex items-center justify-between py-5">
          <span className="text-lg font-bold tracking-widest" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            RAVENOF
          </span>
          {/* User nav — client component, loads after hydration */}
          <HomeAuthNav />
        </nav>

        {/* ── HERO ────────────────────────────────────────────── */}
        <section className="text-center py-16 sm:py-24 space-y-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to right, transparent, rgba(240,180,41,0.4))' }} />
            <span style={{ color: 'rgba(240,180,41,0.5)', fontSize: '10px', letterSpacing: '0.3em', fontFamily: 'var(--rvn-font-display)' }}>&#9633; &#9633; &#9633;</span>
            <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to left, transparent, rgba(240,180,41,0.4))' }} />
          </div>

          <h1 className="rvn-page-title text-5xl sm:text-7xl tracking-widest">RAVENOF</h1>

          <p className="text-base sm:text-lg tracking-widest uppercase max-w-md mx-auto"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.2em' }}>
            Fantasy kortų žaidimas
          </p>

          <div style={{ height: '1px', width: '200px', background: 'linear-gradient(to right, transparent, var(--gold), transparent)', margin: '0 auto' }} />

          {/* Stats — ISR cached */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
            {[
              { n: totalCards, label: 'kortos'   },
              { n: totalUsers, label: 'žaidėjai' },
              { n: totalDecks, label: 'kaladės'  },
            ].map(({ n, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{n}</p>
                <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.12em' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/cards"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#92400e,#b45309)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.35)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', boxShadow: '0 0 20px rgba(240,180,41,0.12)' }}>
              🃏 Kortų bazė
            </Link>
            {/* Auth-dependent CTA — client side */}
            <HomeAuthCTA />
          </div>
        </section>

        {/* ── UPCOMING EVENTS ─────────────────────────────────── */}
        {upcomingEvents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
                Artėjantys renginiai
              </h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.3), transparent)' }} />
              <Link href="/events" className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>visi →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingEvents.map((ev) => {
                const d = new Date(ev.starts_at)
                const isTourn = ev.event_type === 'tournament'
                return (
                  <Link key={ev.id} href={'/events/' + ev.id}
                    className="block rounded-xl p-4 transition-all hover:border-[rgba(240,180,41,0.25)]"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-base">{isTourn ? '🏆' : '📅'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: isTourn ? 'rgba(240,180,41,0.1)' : 'rgba(52,211,153,0.1)', color: isTourn ? 'var(--gold)' : '#34d399', border: '1px solid ' + (isTourn ? 'rgba(240,180,41,0.2)' : 'rgba(52,211,153,0.2)'), fontSize: '10px', fontFamily: 'var(--rvn-font-display)' }}>
                        {isTourn ? 'Turnyras' : 'Renginys'}
                      </span>
                    </div>
                    <p className="font-semibold text-sm leading-tight mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                      {ev.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {d.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' })} · {d.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}
                      {ev.location ? ' · ' + ev.location : ''}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── TOP DECKS ───────────────────────────────────────── */}
        {topDecks.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
                Populiariausios kaladės
              </h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.3), transparent)' }} />
              <Link href="/community-decks" className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>visos →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topDecks.map((deck, i) => {
                const c = hexColor(deck.faction?.color_hex)
                return (
                  <Link key={deck.id} href={'/community-decks/' + deck.id}
                    className="block rounded-xl p-4 transition-all hover:border-[rgba(240,180,41,0.25)]"
                    style={{ background: 'var(--bg-surface)', border: '1px solid ' + c + '25', textDecoration: 'none' }}>
                    <div className="h-0.5 rounded-full mb-3 -mt-1" style={{ background: c, opacity: 0.5 }} />
                    <div className="flex items-start gap-2">
                      <span className="text-lg font-bold shrink-0" style={{ fontFamily: 'var(--rvn-font-display)', color: 'rgba(240,180,41,0.3)' }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>{deck.name}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{deck.author}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: c }}>{deck.faction?.name ?? '—'}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5" style={{ color: 'var(--gold)' }}>▲ {deck.score}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── SECTIONS GRID ───────────────────────────────────── */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
              Portalo sekcijos
            </h2>
            <div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SECTIONS.map(({ href, icon, label, desc }) => (
              <Link key={href} href={href}
                className="flex flex-col gap-2 p-4 rounded-xl transition-all hover:border-[rgba(240,180,41,0.25)] hover:bg-[var(--bg-elevated)] group"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}>
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)', letterSpacing: '0.03em' }}>{label}</span>
                <span className="text-xs leading-relaxed hidden lg:block" style={{ color: 'var(--text-muted)' }}>{desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────── */}
        <footer className="border-t py-6 text-center" style={{ borderColor: 'var(--bg-border)' }}>
          <p className="text-xs tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.15em' }}>
            RAVENOF · COMPANION PORTALAS
          </p>
        </footer>

      </div>
    </main>
  )
}
