import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0
export const metadata = { title: 'Lore Atlas Admin | Ravenof' }

const SECTIONS = [
  { href: '/admin/lore/eras',       icon: '🕰️', label: 'Eros',       desc: 'Laiko eros ir periodai' },
  { href: '/admin/lore/factions',   icon: '⚔️',  label: 'Frakcijos',  desc: 'Grupės ir organizacijos su spalvomis' },
  { href: '/admin/lore/locations',  icon: '🗺️', label: 'Vietovės',   desc: 'Žemėlapio žymekliai ir aprašymai' },
  { href: '/admin/lore/events',     icon: '⚡',  label: 'Įvykiai',    desc: 'Istoriniai ir siužeto įvykiai' },
  { href: '/admin/lore/characters', icon: '👤',  label: 'Veikėjai',   desc: 'Personažai ir jų istorija' },
  { href: '/admin/lore/artifacts',  icon: '🗡️', label: 'Artefaktai', desc: 'Galingi daiktai ir reliktos' },
]

export default async function AdminLoreDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  // Fetch counts in parallel
  const [erasRes, factionsRes, locsRes, eventsRes, charsRes, artsRes] = await Promise.all([
    supabase.from('lore_eras').select('id', { count: 'exact', head: true }),
    supabase.from('lore_factions').select('id', { count: 'exact', head: true }),
    supabase.from('lore_locations').select('id', { count: 'exact', head: true }),
    supabase.from('lore_events').select('id', { count: 'exact', head: true }),
    supabase.from('lore_characters').select('id', { count: 'exact', head: true }),
    supabase.from('lore_artifacts').select('id', { count: 'exact', head: true }),
  ])

  const counts: Record<string, number> = {
    '/admin/lore/eras':       erasRes.count     ?? 0,
    '/admin/lore/factions':   factionsRes.count ?? 0,
    '/admin/lore/locations':  locsRes.count     ?? 0,
    '/admin/lore/events':     eventsRes.count   ?? 0,
    '/admin/lore/characters': charsRes.count    ?? 0,
    '/admin/lore/artifacts':  artsRes.count     ?? 0,
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header
        className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center gap-4 flex-wrap">
          <Link href="/admin" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Admin
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            📖 Lore Atlas
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>ADMIN</span>
          <div className="flex-1" />
          <Link href="/admin/lore/import"
            className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: 'var(--gold)' }}>
            📥 XML Import
          </Link>
          <Link href="/lore" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Peržiūrėti Atlasą →
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

        {/* Section cards */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
              Lore kategorijos
            </h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.3), transparent)' }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECTIONS.map(({ href, icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl p-5 transition-all hover:border-[rgba(240,180,41,0.3)]"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl mb-2">{icon}</p>
                    <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                      {label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                  <span
                    className="text-xl font-bold shrink-0"
                    style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}
                  >
                    {counts[href]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick info */}
        <div
          className="rounded-xl px-5 py-4 text-sm"
          style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)', color: 'var(--text-muted)' }}
        >
          <p className="font-semibold mb-1" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>ℹ️  Kaip veikia</p>
          <p>Tik <strong>published</strong> statusas yra matomas viešame /lore puslapyje. Kurkite įrašus kaip <strong>draft</strong> ir publikuokite kai bus paruošta. Jei Supabase nėra jokių published lore duomenų, /lore naudoja atsarginį src/data/lore.ts failą.</p>
        </div>
      </div>
    </div>
  )
}
