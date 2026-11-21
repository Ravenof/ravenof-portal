import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { AvatarVoicesClient } from './AvatarVoicesClient'

export const revalidate = 0
export const metadata = { title: 'Avatarų balsai | Admin' }

export default async function AdminAvatarVoicesPage() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(7,7,15,0.97)', backdropFilter: 'blur(16px)', borderColor: 'rgba(240,180,41,0.1)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Admin</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em' }}>🎙 Avatarų balsai</h1>
        </div>
      </header>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <AvatarVoicesClient />
      </div>
    </div>
  )
}
