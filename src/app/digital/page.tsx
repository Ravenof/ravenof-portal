import { getCachedUser } from '@/lib/supabase/server'
import { DigitalHub } from '@/components/digital/DigitalHub'

export const metadata = { title: 'Ravenof Digital' }

export default async function DigitalPage() {
  const user = await getCachedUser()
  return <DigitalHub loggedIn={!!user} />
}
