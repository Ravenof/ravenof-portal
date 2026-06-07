import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LORE_STATUS_COLORS } from '@/lib/loreAdmin'
import { saveEra, deleteEra } from '../actions'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'

export const revalidate = 0
export const metadata = { title: 'Eros — Atlaso valdymas' }

type SearchParams = Promise<{ action?: string; id?: string; error?: string }>

type Era = {
  id: string; name: string; slug: string; description: string | null
  timeline_index: number; status: string; sort_order: number
}

function EraForm({ era, error }: { era?: Era; error?: string }) {
  return (
    <form
      action={saveEra}
      className="space-y-4 p-5 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.2)' }}
    >
      {/* Hidden ID for edit */}
      <input type="hidden" name="_id" value={era?.id ?? ''} />

      <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
        {era ? 'Redaguoti erą' : 'Nauja era'}
      </p>

      {error && (
        <p className="text-xs px-3 py-2 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pavadinimas *</label>
          <input name="name" required defaultValue={era?.name ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Slug * (unikalus URL identifikatorius)</label>
          <input name="slug" required defaultValue={era?.slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Aprašymas</label>
        <textarea name="description" rows={3} defaultValue={era?.description ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Timeline indeksas (0 = pirmoji era)</label>
          <input name="timeline_index" type="number" min={0} defaultValue={era?.timeline_index ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Rikiavimas</label>
          <input name="sort_order" type="number" defaultValue={era?.sort_order ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Statusas</label>
          <select name="status" defaultValue={era?.status ?? 'draft'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {era ? 'Išsaugoti' : 'Sukurti'}
        </button>
        <Link href="/admin/lore/eras"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block' }}>
          Atšaukti
        </Link>
      </div>
    </form>
  )
}

export default async function ErasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  const { data: eras } = await supabase
    .from('lore_eras')
    .select('id,name,slug,description,timeline_index,status,sort_order')
    .order('sort_order', { ascending: true })
  const rows = (eras ?? []) as Era[]
  const editEra = params.id ? rows.find((e) => e.id === params.id) : undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/lore" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Atlasas</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>🕰️ Eros</span>
          <div className="flex-1" />
          <Link href="/admin/lore/eras?action=new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Nauja era
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        {params.action === 'new' && !params.id && <EraForm error={params.error} />}
        {editEra && <EraForm era={editEra} error={params.error} />}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rows.length} erų</p>

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Pavadinimas', 'Slug', 'Indeksas', 'Statusas', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((era, i) => (
                <tr key={era.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{era.name}</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{era.slug}</td>
                  <td className="px-3 py-2 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{era.timeline_index}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="px-2 py-0.5 rounded font-medium"
                      style={{ background: (LORE_STATUS_COLORS[era.status] ?? '#6b7280') + '20', color: LORE_STATUS_COLORS[era.status] ?? '#6b7280' }}>
                      {era.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/lore/eras?id=${era.id}`}
                        className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                        Redaguoti
                      </Link>
                      <LoreDeleteButton id={era.id} onDelete={deleteEra} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Erų dar nesukurta</div>
          )}
        </div>
      </div>
    </div>
  )
}
