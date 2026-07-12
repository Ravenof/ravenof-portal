import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getCachedUser } from '@/lib/supabase/server'

export const revalidate = 0
export const metadata = { title: 'Administravimas' }

const NAV = [
  { href: '/admin',               label: '📊 Apžvalga'    },
  { href: '/admin/cards',         label: '🃏 Kortos'        },
  { href: '/admin/shop',          label: '🛒 Parduotuvė'    },
  { href: '/admin/economy',       label: '💰 Ekonomika'     },
  { href: '/admin/zmk',           label: '🎲 ŽMK kortos'    },
  { href: '/admin/events',        label: '📅 Renginiai'     },
  { href: '/admin/lore',          label: '📖 Atlasas'       },
  { href: '/admin/campaigns',     label: '🗺️ Kampanijos'    },
  { href: '/admin/announcements', label: '📰 Skelbimai'     },
  { href: '/admin/users',         label: '👥 Naudotojai'    },
  { href: '/admin/achievements',  label: '🏅 Pasiekimai'    },
  { href: '/admin/tutorial',      label: '🎓 Mokymai'       },
  { href: '/admin/i18n',          label: '🌍 Vertimai'      },
]

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
    >
      <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p className="text-3xl font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: color ?? 'var(--gold)' }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'event_moderator'].includes(profile.role ?? '')) redirect('/cards?error=no_access')
  if (profile.role === 'event_moderator') redirect('/admin/events')

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    usersRes,
    newUsersRes,
    cardsActiveRes,
    cardsHiddenRes,
    decksPublicRes,
    decksTotalRes,
    eventsUpcomingRes,
    eventsTotalRes,
    regsRes,
    topDecksRes,
    topUsersRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('cards').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('cards').select('id', { count: 'exact', head: true }).eq('status', 'hidden'),
    supabase.from('decks').select('id', { count: 'exact', head: true }).eq('visibility', 'public'),
    supabase.from('decks').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('id', { count: 'exact', head: true }).gte('starts_at', new Date().toISOString()),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('event_registrations').select('id', { count: 'exact', head: true }).in('status', ['registered', 'attended']),
    supabase.from('decks').select('id, name, score, user_id').eq('visibility', 'public').order('score', { ascending: false }).limit(5),
    supabase.from('profiles').select('id, username, display_name, level, xp_total').order('xp_total', { ascending: false }).limit(5),
  ])

  const totalUsers     = usersRes.count ?? 0
  const newUsers       = newUsersRes.count ?? 0
  const activeCards    = cardsActiveRes.count ?? 0
  const hiddenCards    = cardsHiddenRes.count ?? 0
  const publicDecks    = decksPublicRes.count ?? 0
  const totalDecks     = decksTotalRes.count ?? 0
  const upcomingEvents = eventsUpcomingRes.count ?? 0
  const totalEvents    = eventsTotalRes.count ?? 0
  const totalRegs      = regsRes.count ?? 0

  type DeckRow = { id: string; name: string; score: number; user_id: string }
  type UserRow = { id: string; username: string; display_name: string | null; level: number; xp_total: number }

  const topDecks = (topDecksRes.data ?? []) as DeckRow[]
  const topUsers = (topUsersRes.data ?? []) as UserRow[]

  const deckOwnerIds = [...new Set(topDecks.map((d) => d.user_id))]
  const { data: deckOwners } = deckOwnerIds.length > 0
    ? await supabase.from('profiles').select('id, username, display_name').in('id', deckOwnerIds)
    : { data: [] }
  const ownerMap: Record<string, string> = {}
  for (const o of (deckOwners ?? [])) ownerMap[o.id] = o.display_name ?? o.username

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ background: 'rgba(7,7,15,0.97)', backdropFilter: 'blur(16px)', borderColor: 'rgba(240,180,41,0.1)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/me" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              ← Profilis
            </Link>
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            <h1
              className="text-lg font-bold"
              style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em' }}
            >
              🛡 Admin panelė
            </h1>
          </div>
          <nav className="flex items-center gap-1 flex-wrap">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                dangerouslySetInnerHTML={{ __html: label }}
                style={{ color: href === '/admin' ? 'var(--gold)' : 'var(--text-muted)', border: '1px solid ' + (href === '/admin' ? 'rgba(240,180,41,0.35)' : 'var(--bg-border)'), background: href === '/admin' ? 'rgba(240,180,41,0.08)' : 'transparent', fontFamily: 'var(--rvn-font-display)' }}
              />
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-8">

        {/* Stats */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
              Bendri skaičiai
            </h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.3), transparent)' }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Viso naudotojų" value={totalUsers} sub={'+' + newUsers + ' per 7d.'} />
            <StatCard label="Aktyvios kortos" value={activeCards} sub={hiddenCards + ' paslėpta'} color="var(--text-primary)" />
            <StatCard label="Viešos kaladės" value={publicDecks} sub={'iš ' + totalDecks + ' viso'} color="#a78bfa" />
            <StatCard label="Artėjantys renginiai" value={upcomingEvents} sub={'iš ' + totalEvents + ' viso'} color="#34d399" />
            <StatCard label="Registracijos" value={totalRegs} color="#fb923c" />
          </div>
        </div>

        {/* Top kaladės + Top žaidėjai */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
                Top kaladės (pagal balsus)
              </h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.2), transparent)' }} />
            </div>
            <div className="space-y-2">
              {topDecks.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nėra viešų kaladžių.</p>
              )}
              {topDecks.map((deck, i) => (
                <Link
                  key={deck.id}
                  href={'/community-decks/' + deck.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:border-[rgba(240,180,41,0.2)]"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}
                >
                  <span className="text-xs w-5 text-right font-bold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
                    {i + 1}.
                  </span>
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
                    {deck.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ownerMap[deck.user_id] ?? '—'}</span>
                  <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--gold)' }}>
                    ▲ {deck.score}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/admin/cards"
              className="block text-xs mt-3 text-center transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              Visos viešos kaladės →
            </Link>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
                Top žaidėjai (pagal XP)
              </h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.2), transparent)' }} />
            </div>
            <div className="space-y-2">
              {topUsers.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nėra žaidėjų.</p>
              )}
              {topUsers.map((u, i) => (
                <Link
                  key={u.id}
                  href={'/users/' + encodeURIComponent(u.username)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:border-[rgba(240,180,41,0.2)]"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}
                >
                  <span className="text-xs w-5 text-right font-bold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
                    {i + 1}.
                  </span>
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
                    {u.display_name ?? u.username}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(240,180,41,0.12)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.25)', fontFamily: 'var(--rvn-font-display)' }}
                  >
                    Lv. {u.level}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {u.xp_total.toLocaleString('lt-LT')} XP
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/admin/users"
              className="block text-xs mt-3 text-center transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              Visi naudotojai →
            </Link>
          </div>
        </div>

        {/* Greitos nuorodos */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
              Greitos nuorodos
            </h2>
            <div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {[
              { href: '/admin/cards/new',                label: '+ Nauja korta',    color: 'var(--gold)'           },
              { href: '/admin/shop',                     label: '🛒 Parduotuvė',     color: '#fbbf24'               },
              { href: '/admin/ranked',                 label: '🏆 Reitingo kova', color: '#fca5a5'               },
              { href: '/admin/cards/import',             label: '↑ Importuoti', color: 'var(--text-secondary)' },
              { href: '/admin/events/new',               label: '+ Renginys',        color: '#34d399'               },
              { href: '/admin/announcements?action=new', label: '+ Skelbimas',       color: '#38bdf8'               },
              { href: '/admin/lore',                     label: '📖 Atlasas', color: '#818cf8'               },
              { href: '/admin/achievements',             label: '🏅 Pasiekimai', color: '#a78bfa'            },
              { href: '/admin/users',                    label: '👥 Naudotojai', color: 'var(--text-secondary)' },
            ].map(({ href, label, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-center px-3 py-3 rounded-xl text-xs font-medium transition-all hover:border-[rgba(240,180,41,0.2)] text-center"
                dangerouslySetInnerHTML={{ __html: label }}
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color, fontFamily: 'var(--rvn-font-display)', textDecoration: 'none' }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
