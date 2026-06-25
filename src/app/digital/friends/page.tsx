import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/server'
import { FriendsClient } from '@/components/social/FriendsClient'

export const metadata = { title: 'Draugai | Ravenof Digital' }

export default async function DigitalFriendsPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login?next=/digital/friends')
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>👥 Draugai</h1>
      <FriendsClient />
    </div>
  )
}
