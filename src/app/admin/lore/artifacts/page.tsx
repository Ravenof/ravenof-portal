import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LORE_STATUS_COLORS, formatCsvArray } from '@/lib/loreAdmin'
import { saveArtifact, deleteArtifact } from '../actions'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'

export const revalidate = 0
export const metadata = { title: 'Artefaktai | Lore Atlas Admin' }

type SearchParams = Promise<{ action?: string; id?: string; error?: string }>

type Art = {
  id: string; name: string; slug: string; artifact_type: string | null
  short_description: string | null; description: string | null
  current_location_slug: string | null; related_event_slugs: string[]
  related_card_numbers: string[]; image_url: string | null
  status: string; sort_order: number
}

function ArtifactForm({ art, error }: { art?: Art; error?: string }) {
  return (
    <form action={saveArtifact} className="space-y-4 p-5 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.2)' }}>
      <input type="hidden" name="_id" value={art?.id ?? ''} />

      <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
        {art ? 'Redaguoti artefaktą' : 'Naujas artefaktas'}
      </p>
      {error && <p className="text-xs px-3 py-2 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pavadinimas *</label>
          <input name="name" required defaultValue={art?.name ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Slug *</label>
          <input name="slug" required defaultValue={art?.slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Artefakto tipas</label>
          <input name="artifact_type" defaultValue={art?.artifact_type ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Dabartinė vietovė (slug)</label>
          <input name="current_location_slug" defaultValue={art?.current_location_slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Trumpas aprašymas</label>
        <input name="short_description" defaultValue={art?.short_description ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pilnas aprašymas</label>
        <textarea name="description" rows={4} defaultValue={art?.description ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Susijusių įvykių slugai (per kablelį)</label>
          <input name="related_event_slugs" defaultValue={formatCsvArray(art?.related_event_slugs ?? [])}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Susijusios kortos (per kablelį)</label>
          <input name="related_card_numbers" defaultValue={formatCsvArray(art?.related_card_numbers ?? [])}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Paveikslėlio URL</label>
          <input name="image_url" defaultValue={art?.image_url ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Statusas</label>
          <select name="status" defaultValue={art?.status ?? 'draft'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Rikiavimas</label>
          <input name="sort_order" type="number" defaultValue={art?.sort_order ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {art ? 'Išsaugoti' : 'Sukurti'}
        </button>
        <Link href="/admin/lore/artifacts"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block' }}>
          Atšaukti
        </Link>
      </div>
    </form>
  )
}

export default async function ArtifactsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  const { data } = await supabase
    .from('lore_artifacts')
    .select('id,name,slug,artifact_type,short_description,description,current_location_slug,related_event_slugs,related_card_numbers,image_url,status,sort_order')
    .order('sort_order', { ascending: true })
  const rows = (data ?? []) as Art[]
  const editArt = params.id ? rows.find((a) => a.id === params.id) : undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/lore" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Atlasas</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>🗡️ Artefaktai</span>
          <div className="flex-1" />
          <Link href="/admin/lore/artifacts?action=new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Naujas artefaktas
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        {params.action === 'new' && !params.id && <ArtifactForm error={params.error} />}
        {editArt && <ArtifactForm art={editArt} error={params.error} />}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rows.length} artefaktų</p>

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Pavadinimas', 'Tipas', 'Vietovė', 'Statusas', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((art, i) => (
                <tr key={art.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                    <span className="block">{art.name}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{art.slug}</span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{art.artifact_type ?? '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{art.current_location_slug ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="px-2 py-0.5 rounded font-medium"
                      style={{ background: (LORE_STATUS_COLORS[art.status] ?? '#6b7280') + '20', color: LORE_STATUS_COLORS[art.status] ?? '#6b7280' }}>
                      {art.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/lore/artifacts?id=${art.id}`}
                        className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                        Redaguoti
                      </Link>
                      <LoreDeleteButton id={art.id} onDelete={deleteArtifact} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Artefaktų dar nesukurta</div>
          )}
        </div>
      </div>
    </div>
  )
}
