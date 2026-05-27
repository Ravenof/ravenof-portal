import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0
export const metadata = { title: 'Admin Dashboard | Ravenof' }

const NAV = [
  { href: '/admin',               label: '&#x1F4CA; Dashboard'    },
  { href: '/admin/cards',         label: '&#x1F0CF; Kortos'        },
  { href: '/admin/events',        label: '&#x1F4C5; Renginiai'     },
  { href: '/admin/lore',          label: '&#x1F4D6; Atlasas'       },
  { href: '/admin/announcements', label: '&#x1F4F0; Skelbimai'     },
  { href: '/admin/packs',         label: '&#x1F4E6; Paketai'       },
  { href: '/admin/users',         label: '&#x1F465; Naudotojai'    },
  { href: '/admin/achievements',  label: '&#x1F3C5; Pasiekimai'    },
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
  const { data: { user } } = await supabase.auth.getUser()
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
              &#x2190; Profilis
            </Link>
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            <h1
              className="text-lg font-bold"
              style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em' }}
            >
              &#x1F6E1; Admin panel&#279;
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
              Bendri skai&#269;iai
            </h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.3), transparent)' }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Viso naudotoj&#x0173;" value={totalUsers} sub={'+' + newUsers + ' per 7d.'} />
            <StatCard label="Aktyvios kortos" value={activeCards} sub={hiddenCards + ' pasl&#279;pta'} color="var(--text-primary)" />
            <StatCard label="Vie&#353;os kalad&#279;s" value={publicDecks} sub={'i&#353; ' + totalDecks + ' viso'} color="#a78bfa" />
            <StatCard label="Art&#279;jantys renginiai" value={upcomingEvents} sub={'i&#353; ' + totalEvents + ' viso'} color="#34d399" />
            <StatCard label="Registracijos" value={totalRegs} color="#fb923c" />
          </div>
        </div>

        {/* Top kaladės + Top žaidėjai */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
                Top kalad&#279;s (pagal balsus)
              </h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.2), transparent)' }} />
            </div>
            <div className="space-y-2">
              {topDecks.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>N&#279;ra vie&#353;&#x0173; kalad&#382;i&#x0173;.</p>
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
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ownerMap[deck.user_id] ?? '&#x2014;'}</span>
                  <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--gold)' }}>
                    &#x25B2; {deck.score}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/admin/cards"
              className="block text-xs mt-3 text-center transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              Visos vie&#353;os kalad&#279;s &#x2192;
            </Link>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
                Top &#382;aid&#279;jai (pagal XP)
              </h2>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.2), transparent)' }} />
            </div>
            <div className="space-y-2">
              {topUsers.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>N&#279;ra &#382;aid&#279;j&#x0173;.</p>
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
              Visi naudotojai &#x2192;
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
              { href: '/admin/cards/import',             label: '&#x2191; Importuoti', color: 'var(--text-secondary)' },
              { href: '/admin/events/new',               label: '+ Renginys',        color: '#34d399'               },
              { href: '/admin/announcements?action=new', label: '+ Skelbimas',       color: '#38bdf8'               },
              { href: '/admin/packs',                    label: '&#x1F4E6; Paketai', color: '#fb923c'               },
              { href: '/admin/lore',                     label: '&#x1F4D6; Atlasas', color: '#818cf8'               },
              { href: '/admin/achievements',             label: '&#x1F3C5; Pasiekimai', color: '#a78bfa'            },
              { href: '/admin/users',                    label: '&#x1F465; Naudotojai', color: 'var(--text-secondary)' },
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
