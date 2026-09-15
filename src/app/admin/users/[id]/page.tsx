import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { AdminPlayerProfile, type PlayerOverview, type PlayerMatch, type PlayerCard } from '@/components/admin/AdminPlayerProfile'

// ── Admin: vieno žaidėjo profilis (statistika, kovos, kolekcija, ekonomika, klaidos) ──
// Duomenys: rvn_admin_player_overview / _matches / _collection (SECURITY DEFINER, tikrina is_admin()).

export default async function AdminPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/admin/events')

  const [ov, ms, col, bugs] = await Promise.all([
    supabase.rpc('rvn_admin_player_overview', { p_user: id }),
    supabase.rpc('rvn_admin_player_matches', { p_user: id, p_limit: 100, p_offset: 0 }),
    supabase.rpc('rvn_admin_player_collection', { p_user: id }),
    supabase.from('bug_reports').select('id, created_at, category, severity, title, status, platform, app_version').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
  ])
  const overview = ov.data as PlayerOverview | null
  if (ov.error || !overview?.profile) {
    if (ov.error) console.error('[admin/users/id]', ov.error.message)
    notFound()
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3" style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/users" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Vartotojai</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            {overview.profile.display_name ?? overview.profile.username}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>@{overview.profile.username}</span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>ADMIN</span>
        </div>
      </header>
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        <AdminPlayerProfile
          overview={overview}
          matches={(ms.data as PlayerMatch[] | null) ?? []}
          collection={(col.data as PlayerCard[] | null) ?? []}
          bugs={(bugs.data as { id: number; created_at: string; category: string; severity: string; title: string; status: string; platform: string | null; app_version: string | null }[] | null) ?? []}
          isSelf={id === user.id}
        />
      </div>
    </div>
  )
}
