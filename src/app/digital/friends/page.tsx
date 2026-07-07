import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/server'
import { FriendsClient } from '@/components/social/FriendsClient'

export const metadata = { title: 'Draugai | Ravenof Digital' }

export default async function DigitalFriendsPage() {
  const user = await getCachedUser()
  if (!user) redirect('/login?next=/digital/friends')
  return (
    <div className="h-full flex flex-col min-h-0" style={{ gap: 'clamp(4px,1vh,10px)' }}>
      <div className="text-center shrink-0">
        <div className="rvn-disp font-black uppercase leading-none" style={{ fontSize: 'clamp(16px,3.2vh,28px)', color: '#93c5fd', letterSpacing: '0.04em' }}>Draugai</div>
        <div style={{ fontSize: 'clamp(9px,1.4vh,12px)', color: 'var(--text-muted)' }}>Žinutės, mainai ir kvietimai į kovą</div>
      </div>
      <div className="flex-1 min-h-0">
        <FriendsClient />
      </div>
    </div>
  )
}
