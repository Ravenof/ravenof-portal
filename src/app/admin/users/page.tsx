import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserRoleForm } from '@/components/admin/UserRoleForm'
import { getLevelTitleForXp } from '@/lib/gamification/levels'

type SearchParams = Promise<{ q?: string; role?: string }>

const ROLE_COLORS: Record<string, string> = {
  admin:           '#ef4444',
  event_moderator: '#a78bfa',
  user:            '#6b7280',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/events')

  let q = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, role, created_at, xp_total, level')
    .order('created_at', { ascending: false })

  if (params.role) q = q.eq('role', params.role)
  if (params.q) q = q.ilike('username', `%${params.q}%`)

  const { data: users, error } = await q.limit(200)
  const rows = (users ?? []) as {
    id: string; username: string; display_name: string | null
    role: string; created_at: string; xp_total: number; level: number
  }[]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Kortos
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <Link href="/admin/events" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Renginiai
          </Link>
          <Link href="/admin/achievements" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Pasiekimai
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Vartotojai
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>ADMIN</span>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#ef444420', color: '#ef4444' }}>
            Klaida: {error.message}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap items-center">
          <form method="GET" className="flex gap-2">
            <input
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Ieškoti pagal username..."
              className="text-sm px-3 py-1.5 rounded-lg outline-none"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-primary)',
                width: '220px',
              }}
            />
            {params.role && <input type="hidden" name="role" value={params.role} />}
            <button type="submit"
              className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
              Ieškoti
            </button>
          </form>

          <div className="flex gap-2">
            {[['', 'Visi'], ['admin', 'Admin'], ['event_moderator', 'Moderatoriai'], ['user', 'Vartotojai']].map(([val, label]) => (
              <Link key={val} href={val ? `/admin/users?role=${val}` : '/admin/users'}
                className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{
                  background: params.role === val || (!params.role && val === '') ? 'var(--gold)' : 'var(--bg-elevated)',
                  color: params.role === val || (!params.role && val === '') ? '#0a0a0f' : 'var(--text-secondary)',
                  border: '1px solid var(--bg-border)',
                }}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{rows.length} vartotojų</div>

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Vartotojas', 'Rolė', 'Lygis / XP', 'Registracija', 'Keisti rolę'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u, i) => (
                <tr key={u.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2">
                    <div>
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {u.display_name ?? u.username}
                      </span>
                      <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ background: (ROLE_COLORS[u.role] ?? '#6b7280') + '20', color: ROLE_COLORS[u.role] ?? '#6b7280' }}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>Lv{u.level} · {u.xp_total.toLocaleString()} XP</span>
                    <span className="block" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{getLevelTitleForXp(u.xp_total)}</span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    {u.id === user?.id ? (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>— (tu)</span>
                    ) : (
                      <UserRoleForm userId={u.id} currentRole={u.role} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
              Vartotojų nerasta
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
