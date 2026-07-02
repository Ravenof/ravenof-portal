import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/server'
import { FriendsClient } from '@/components/social/FriendsClient'
import { PageHero } from '@/components/digital/ui/HubKit'

export const metadata = { title: 'Draugai | Ravenof Digital' }

export default async function DigitalFriendsPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login?next=/digital/friends')
  return (
    <div className="space-y-3">
      <PageHero compact icon={<span style={{ fontSize: 30 }}>👥</span>} accent="96,165,250" title="DRAUGAI" sub="Žinutės, mainai ir kvietimai į kovą" />
      <FriendsClient />
    </div>
  )
}
