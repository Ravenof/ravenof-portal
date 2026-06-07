import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deletePack } from './actions'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'
import { PackForm } from './PackForm'

export const revalidate = 0
export const metadata = { title: 'Paketai | Admin' }

type SearchParams = Promise<{ action?: string; id?: string }>

type Pack = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  cards_per_pack: number
  daily_limit: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export default async function AdminPacksPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/cards?error=no_access')

  const { data } = await supabase
    .from('card_packs')
    .select('id,name,description,image_url,cards_per_pack,daily_limit,is_active,sort_order,created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
  const packs = (data ?? []) as Pack[]
  const editPack = params.id ? packs.find((p) => p.id === params.id) : undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Admin</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            📦 Kortelų paketai
          </span>
          <div className="flex-1" />
          <Link href="/admin/packs?action=new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Naujas paketas
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        {params.action === 'new' && !params.id && <PackForm />}
        {editPack && <PackForm pack={editPack} />}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{packs.length} paketų</p>

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Pavadinimas', 'Kort./paket.', 'Limit./d.', 'Rikiavimas', 'Aktyvus', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packs.map((pack, i) => (
                <tr key={pack.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{pack.name}</span>
                    {pack.description && (
                      <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{pack.description.slice(0, 60)}{pack.description.length > 60 ? '...' : ''}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{pack.cards_per_pack}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {pack.daily_limit === 0 ? 'Neribotas' : pack.daily_limit}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{pack.sort_order}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{
                        background: pack.is_active ? 'rgba(52,211,153,0.12)' : 'rgba(107,114,128,0.15)',
                        color: pack.is_active ? '#34d399' : '#9ca3af',
                      }}>
                      {pack.is_active ? 'Aktyvus' : 'Paslėptas'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link href={`/admin/packs/${pack.id}`}
                        className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', whiteSpace: 'nowrap' }}>
                        Kortos
                      </Link>
                      <Link href={`/admin/packs?id=${pack.id}`}
                        className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                        Redaguoti
                      </Link>
                      <LoreDeleteButton id={pack.id} onDelete={deletePack} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {packs.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Paketų dar nėra</div>
          )}
        </div>
      </div>
    </div>
  )
}
