import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { BackfillClient } from './BackfillClient'

export const metadata = { title: 'Admin – Pasiekimai' }

export default async function AdminAchievementsPage() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/admin')

  // Stats
  const [{ count: totalBadges }, { count: totalEarned }, { count: totalUsers }] =
    await Promise.all([
      supabase.from('badges').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('user_badges').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pasiekimai</h1>
        <p className="text-sm text-neutral-400">Achievement Expansion v1 valdymas</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-center">
          <div className="text-3xl font-bold text-amber-400">{totalBadges ?? 0}</div>
          <div className="mt-1 text-xs text-neutral-400">Aktyvių pasiekimų</div>
        </div>
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{totalEarned ?? 0}</div>
          <div className="mt-1 text-xs text-neutral-400">Iš viso uždirbta</div>
        </div>
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{totalUsers ?? 0}</div>
          <div className="mt-1 text-xs text-neutral-400">Vartotojų</div>
        </div>
      </div>

      {/* Backfill */}
      <BackfillClient />

      {/* Info */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4 text-sm text-neutral-400">
        <p className="font-medium text-neutral-300">Kaip veikia backfill:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Kiekvienam vartotojui paleidžia <code className="text-amber-300">award_user_badges()</code></li>
          <li>XP nesidubliuoja — kiekvienas pasiekimas apdovanojamas tik vieną kartą</li>
          <li>Čempionų fazių ir frakcijų pasiekimai kol kas neautomatizuoti (nėra DB duomenų)</li>
          <li>Saugu paleisti kelis kartus iš eilės</li>
        </ul>
      </div>
    </div>
  )
}
