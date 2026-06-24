import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HeaderNav } from '@/components/layout/HeaderNav'
import { getCachedUser } from '@/lib/supabase/server'
import { FriendsClient } from '@/components/social/FriendsClient'

export const metadata = { title: 'Draugai' }

export default async function FriendsPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login?next=/friends')
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header className="sticky top-0 z-20 border-b px-4 py-3" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-3 flex-wrap">
          <Link href="/digital" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Digital</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1 className="rvn-page-title text-lg flex-1">👥 Draugai</h1>
          <HeaderNav />
        </div>
      </header>
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <FriendsClient />
      </main>
    </div>
  )
}
