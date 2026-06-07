import Link from 'next/link'
import { createPublicClient } from '@/lib/supabase/public'
import { HomeAuthNav, HomeAuthCTA, HomeOnboardingSteps } from '@/components/home/HomeAuthSection'

// ISR: 5 min cache
export const revalidate = 300

type EventRow        = { id: string; title: string; starts_at: string; event_type: string; location: string | null; capacity: number | null }
type DeckRow         = { id: string; name: string; score: number; card_count: number; faction: { name: string; color_hex: string } | null; author: string }
type AnnouncementRow = { id: string; title: string; slug: string; summary: string | null; type: string; pinned: boolean; published_at: string }

const QUICK_LINKS = [
  { href: '/cards',           icon: '🃏', label: 'Kortų bazė'       },
  { href: '/deck-builder',    icon: '⚗️',  label: 'Kaladžių kūrėjas' },
  { href: '/community-decks', icon: '📚', label: 'Viešos kaladės'   },
  { href: '/events',          icon: '📅', label: 'Renginiai'         },
  { href: '/leaderboards',    icon: '🏆', label: 'Topai'             },
  { href: '/life-tracker',    icon: '⚔️',  label: 'Kova'             },
  { href: '/lore',            icon: '📖', label: 'Atlasas'           },
  { href: '/rules',           icon: '🛡️',  label: 'Taisyklės'         },
  { href: '/packs',           icon: '📦', label: 'Paketai'           },
]

const STEPS = [
  { icon: '🃏', step: '01', title: 'Naršyk kortų bazę',       desc: 'Peržiūrėk visas korteles, filtruok pagal frakciją, retenybę ar vertę' },
  { icon: '📦', step: '02', title: 'Pažymėk savo korteles',   desc: 'Pažymėk kurias korteles jau turi — portalas sekroja tavo kolekciją' },
  { icon: '⚗️',  step: '03', title: 'Sukurk kaladę',           desc: 'Kaladžių kūrėjas neleis įdėti kortų kurių neturi ir patikrins taisykles' },
  { icon: '📅', step: '04', title: 'Dalyvauk renginiuose',    desc: 'Registruokis į turnyrus, gauk XP ir klik į lyderių lentelę' },
]

function hexColor(hex: string | undefined) {
  if (!hex) return '#b8860b'
  return '#' + hex.replace('#', '')
}

async function getHomeData() {
  const supabase = createPublicClient()
  const now = new Date().toISOString()

  const [
    { count: totalCards },
    { count: totalUsers },
    { count: totalDecks },
    { data: upcomingRaw },
    { data: topDecksRaw },
    { data: announcementsRaw },
  ] = await Promise.all([
    supabase.from('cards').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('decks').select('id', { count: 'exact', head: true }).eq('visibility', 'public'),
    supabase.from('events').select('id, title, starts_at, event_type, location, capacity')
      .gte('starts_at', now).neq('status', 'draft').order('starts_at').limit(3),
    supabase.from('decks').select('id, name, score, card_count, faction_id, user_id')
      .eq('visibility', 'public').order('score', { ascending: false }).limit(3),
    supabase.from('announcements')
      .select('id, title, slug, summary, type, pinned, published_at')
      .lte('published_at', now)
      .or('expires_at.is.null,expires_at.gt.' + now)
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(4),
  ])

  const deckRows = (topDecksRaw ?? []) as { id: string; name: string; score: number; card_count: number; faction_id: number | null; user_id: string }[]
  let topDecks: DeckRow[] = []
  if (deckRows.length > 0) {
    const fIds = [...new Set(deckRows.map((d) => d.faction_id).filter(Boolean))]
    const uIds = [...new Set(deckRows.map((d) => d.user_id))]
    const [{ data: facs }, { data: owners }] = await Promise.all([
      fIds.length > 0 ? supabase.from('factions').select('id, name, color_hex').in('id', fIds) : Promise.resolve({ data: [] }),
      supabase.from('profiles').select('id, username, display_name').in('id', uIds),
    ])
    const fMap: Record<number, { name: string; color_hex: string }> = {}
    for (const f of (facs ?? [])) fMap[f.id] = f
    const oMap: Record<string, string> = {}
    for (const o of (owners ?? [])) oMap[o.id] = o.display_name ?? o.username
    topDecks = deckRows.map((d) => ({
      id: d.id, name: d.name, score: d.score, card_count: d.card_count,
      faction: d.faction_id ? (fMap[d.faction_id] ?? null) : null,
      author: oMap[d.user_id] ?? '—',
    }))
  }

  return {
    totalCards: totalCards ?? 0,
    totalUsers: totalUsers ?? 0,
    totalDecks: totalDecks ?? 0,
    upcomingEvents: (upcomingRaw ?? []) as EventRow[],
    topDecks,
    announcements: (announcementsRaw ?? []) as AnnouncementRow[],
  }
}

const ANN_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  news:    { bg: 'rgba(56,189,248,0.06)',  border: 'rgba(56,189,248,0.2)',  text: '#38bdf8', icon: '📰' },
  update:  { bg: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.2)', text: '#a78bfa', icon: '⚙️'  },
  event:   { bg: 'rgba(52,211,153,0.06)',  border: 'rgba(52,211,153,0.2)',  text: '#34d399', icon: '📅' },
  warning: { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)', text: '#fbbf24', icon: '⚠️' },
}

export default async function HomePage() {
  const { totalCards, totalUsers, totalDecks, upcomingEvents, topDecks, announcements } = await getHomeData()

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* BG orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', width: '900px', height: '900px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,180,41,0.04) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.03) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-screen-xl mx-auto px-4">

        {/* NAV */}
        <nav className="flex items-center justify-between py-5">
          <span className="text-lg font-bold tracking-widest" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            RAVENOF
          </span>
          <HomeAuthNav />
        </nav>

        {/* HERO */}
        <section className="text-center py-14 sm:py-20 space-y-5">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to right, transparent, rgba(240,180,41,0.4))' }} />
            <span style={{ color: 'rgba(240,180,41,0.45)', fontSize: '10px', letterSpacing: '0.3em', fontFamily: 'var(--rvn-font-display)' }}>□ □ □</span>
            <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to left, transparent, rgba(240,180,41,0.4))' }} />
          </div>

          <h1 className="rvn-page-title text-5xl sm:text-7xl tracking-widest">RAVENOF</h1>

          <p className="text-sm sm:text-base tracking-widest uppercase max-w-sm mx-auto"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.18em' }}>
            Fantasy kortų žaidimas
          </p>

          <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Companion portalas: naršyk korteles, pažymėk kolekciją, kurkite kalades ir dalyvauk turnyruose.
          </p>

          <div style={{ height: '1px', width: '160px', background: 'linear-gradient(to right, transparent, var(--gold), transparent)', margin: '0 auto' }} />

          {/* STATS */}
          <div className="flex items-center justify-center gap-8 sm:gap-14 flex-wrap">
            {[
              { n: totalCards, label: 'kortos'  },
              { n: totalUsers, label: 'žaidėjai' },
              { n: totalDecks, label: 'kaladės'  },
            ].map(({ n, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{n}</p>
                <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.12em' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link href="/cards"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#92400e,#b45309)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.35)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em', boxShadow: '0 0 20px rgba(240,180,41,0.12)' }}>
              🃏 Kortų bazė
            </Link>
            <HomeAuthCTA />
          </div>
        </section>

        {/* ANNOUNCEMENTS — pinned/important first */}
        {announcements.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
                Skelbimai
              </h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.3), transparent)' }} />
            </div>
            <div className="space-y-2">
              {announcements.map((ann) => {
                const s = ANN_COLORS[ann.type] ?? ANN_COLORS.news
                return (
                  <div key={ann.id} className="flex items-start gap-3 rounded-xl px-4 py-3"
                    style={{ background: s.bg, border: '1px solid ' + s.border }}>
                    {ann.pinned && <span className="shrink-0 text-xs mt-0.5" style={{ color: s.text }}>📌</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                        <span className="mr-1.5">{s.icon}</span>{ann.title}
                      </p>
                      {ann.summary && (
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{ann.summary}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(ann.published_at).toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ONBOARDING STEPS — shows for guests, quick links for logged-in */}
        <HomeOnboardingSteps steps={STEPS} />

        {/* UPCOMING EVENTS */}
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
                const isTourn = ev.event_type === 'turnyras'
                return (
                  <Link key={ev.id} href={'/events/' + ev.id}
                    className="block rounded-xl p-4 transition-all hover:border-[rgba(240,180,41,0.25)]"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-base">{isTourn ? '🏆' : '📅'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: isTourn ? 'rgba(240,180,41,0.1)' : 'rgba(52,211,153,0.1)', color: isTourn ? 'var(--gold)' : '#34d399', border: '1px solid ' + (isTourn ? 'rgba(240,180,41,0.2)' : 'rgba(52,211,153,0.2)'), fontSize: '10px', fontFamily: 'var(--rvn-font-display)' }}>
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

        {/* TOP DECKS */}
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

        {/* QUICK NAV */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
              Visos sekcijos
            </h2>
            <div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map(({ href, icon, label }) => (
              <Link key={href} href={href}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:border-[rgba(240,180,41,0.3)] hover:text-[var(--gold)]"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', textDecoration: 'none' }}>
                <span>{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t py-6 text-center" style={{ borderColor: 'var(--bg-border)' }}>
          <p className="text-xs tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.15em' }}>
            RAVENOF · COMPANION PORTALAS
          </p>
        </footer>

      </div>
    </main>
  )
}
