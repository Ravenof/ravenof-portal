import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/server'
import { FriendsClient } from '@/components/social/FriendsClient'

export const metadata = { title: 'Draugai | Ravenof Digital' }

export default async function DigitalFriendsPage() {
  const user = await getCachedUser()
  if (!user) redirect('/digital/login?next=/digital/friends')
  // Antraštė (‹ + DRAUGAI + N prisijungę) — kliente (patvirtintas UI, Fazė 3)
  return <FriendsClient />
}
