import Link from 'next/link'
import { getCachedUser } from '@/lib/supabase/server'
import { RankedClient } from '@/components/digital/ranked/RankedClient'

export const metadata = { title: 'Reitingo kova | Ravenof Digital' }

export default async function Page() {
  const user = await getCachedUser()
  if (!user) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad galėtum žaisti reitingo kovas.</p>
        <Link href="/login?next=/digital/ranked" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>Prisijungti</Link>
      </div>
    )
  }
  return <RankedClient />
}
