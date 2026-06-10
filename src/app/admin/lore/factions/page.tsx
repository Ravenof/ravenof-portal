import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { LORE_STATUS_COLORS } from '@/lib/loreAdmin'
import { deleteFaction } from '../actions'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'
import { FactionFormClient } from './FactionFormClient'

export const revalidate = 0
export const metadata = { title: 'Frakcijos — Atlaso valdymas' }

type SearchParams = Promise<{ action?: string; id?: string; error?: string }>

type Faction = {
  id: string; name: string; slug: string; color: string
  description: string | null; sort_order: number; status: string
}

export default async function FactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  const { data } = await supabase
    .from('lore_factions')
    .select('id,name,slug,color,description,sort_order,status')
    .order('sort_order', { ascending: true })
  const rows = (data ?? []) as Faction[]
  const editFaction = params.id ? rows.find((f) => f.id === params.id) : undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/lore" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Atlasas</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>⚔️ Frakcijos</span>
          <div className="flex-1" />
          <Link href="/admin/lore/factions?action=new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Nauja frakcija
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        {params.action === 'new' && !params.id && <FactionFormClient error={params.error} />}
        {editFaction && <FactionFormClient f={editFaction} error={params.error} />}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rows.length} frakcijų</p>

        {/* Usage note */}
        <div className="rounded-lg px-4 py-3 text-xs"
          style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)', color: 'var(--text-muted)' }}>
          Norėdami priskirti frakciją vietovei, eikite į <Link href="/admin/lore/locations" className="hover:opacity-80" style={{ color: 'var(--gold)' }}>Vietovės</Link> ir laukelyje <strong>Frakcijų ID</strong> įrašykite frakcijos <strong>slug</strong>.
        </div>

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Spalva', 'Pavadinimas', 'Slug', 'Statusas', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((f, i) => (
                <tr key={f.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2">
                    <div className="w-6 h-6 rounded-full border-2"
                      style={{ background: f.color, borderColor: f.color + '66' }} />
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium text-sm" style={{ color: f.color, fontFamily: 'var(--rvn-font-display)' }}>{f.name}</span>
                    {f.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{f.description}</p>}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{f.slug}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ background: (LORE_STATUS_COLORS[f.status] ?? '#6b7280') + '20', color: LORE_STATUS_COLORS[f.status] ?? '#6b7280' }}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/lore/factions?id=${f.id}`}
                        className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                        Redaguoti
                      </Link>
                      <LoreDeleteButton id={f.id} onDelete={deleteFaction} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Frakcijų dar nesukurta</div>
          )}
        </div>
      </div>
    </div>
  )
}
