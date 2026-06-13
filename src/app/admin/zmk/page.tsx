import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { ZmkAdminClient } from './ZmkAdminClient'

export const metadata = { title: 'ŽMK kortos | Admin' }

export default async function AdminZmkPage() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') redirect('/admin/events')
  }

  const { data: cards, error } = await supabase.from('zmk_cards').select('*').order('sort_order').order('name')

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin" className="text-xs" style={{ color: 'var(--text-muted)' }}>← Admin</Link>
        <h1 className="text-xl font-black" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
          ŽMK kortos
        </h1>
      </div>
      <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)' }}>
        Žalos modifikatorių kaladė virtualiam žaidimui. Auto – modifikatorius pritaikomas automatiškai;
        Draw – žaidėjas pats atverčia kortą. Pakeitimai galioja naujoms kovoms.
      </p>
      {error ? (
        <p className="text-sm p-4 rounded-lg" style={{ background: '#ef444415', color: '#ef4444' }}>
          Nepavyko užkrauti: {error.message}. Ar paleista supabase/gameplay_v1.sql migracija?
        </p>
      ) : (
        <ZmkAdminClient cards={cards ?? []} />
      )}
    </div>
  )
}
