import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LORE_STATUS_COLORS, formatCsvArray } from '@/lib/loreAdmin'
import { saveCharacter, deleteCharacter } from '../actions'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'

export const revalidate = 0
export const metadata = { title: 'Veikėjai — Atlaso valdymas' }

type SearchParams = Promise<{ action?: string; id?: string; error?: string }>

type Char = {
  id: string; name: string; slug: string; faction_id: string | null
  role: string | null; status_value: string | null
  short_description: string | null; description: string | null
  related_event_slugs: string[]; related_card_numbers: string[]
  image_url: string | null; status: string; sort_order: number
}

function CharForm({ ch, error }: { ch?: Char; error?: string }) {
  return (
    <form action={saveCharacter} className="space-y-4 p-5 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.2)' }}>
      <input type="hidden" name="_id" value={ch?.id ?? ''} />

      <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
        {ch ? 'Redaguoti veikėją' : 'Naujas veikėjas'}
      </p>
      {error && <p className="text-xs px-3 py-2 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Vardas *</label>
          <input name="name" required defaultValue={ch?.name ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Slug *</label>
          <input name="slug" required defaultValue={ch?.slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Frakcijos ID</label>
          <input name="faction_id" defaultValue={ch?.faction_id ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Rolė / titulas</label>
          <input name="role" defaultValue={ch?.role ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Gyvybingumo statusas</label>
          <select name="status_value" defaultValue={ch?.status_value ?? 'unknown'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="unknown">unknown</option>
            <option value="alive">alive</option>
            <option value="dead">dead</option>
            <option value="missing">missing</option>
            <option value="legendary">legendary</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Trumpas aprašymas</label>
        <input name="short_description" defaultValue={ch?.short_description ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pilnas aprašymas</label>
        <textarea name="description" rows={4} defaultValue={ch?.description ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Susijusių įvykių slugai (per kablelį)</label>
          <input name="related_event_slugs" defaultValue={formatCsvArray(ch?.related_event_slugs ?? [])}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Susijusios kortos (per kablelį)</label>
          <input name="related_card_numbers" defaultValue={formatCsvArray(ch?.related_card_numbers ?? [])}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Paveikslėlio URL</label>
          <input name="image_url" defaultValue={ch?.image_url ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Statusas</label>
          <select name="status" defaultValue={ch?.status ?? 'draft'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Rikiavimas</label>
          <input name="sort_order" type="number" defaultValue={ch?.sort_order ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {ch ? 'Išsaugoti' : 'Sukurti'}
        </button>
        <Link href="/admin/lore/characters"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block' }}>
          Atšaukti
        </Link>
      </div>
    </form>
  )
}

export default async function CharactersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  const { data } = await supabase
    .from('lore_characters')
    .select('id,name,slug,faction_id,role,status_value,short_description,description,related_event_slugs,related_card_numbers,image_url,status,sort_order')
    .order('sort_order', { ascending: true })
  const rows = (data ?? []) as Char[]
  const editCh = params.id ? rows.find((c) => c.id === params.id) : undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/lore" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Atlasas</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>👤 Veikėjai</span>
          <div className="flex-1" />
          <Link href="/admin/lore/characters?action=new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Naujas veikėjas
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        {params.action === 'new' && !params.id && <CharForm error={params.error} />}
        {editCh && <CharForm ch={editCh} error={params.error} />}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rows.length} veikėjų</p>

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Vardas', 'Frakcija', 'Rolė', 'Gyvybingumas', 'Statusas', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((ch, i) => (
                <tr key={ch.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                    <span className="block">{ch.name}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{ch.slug}</span>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{ch.faction_id ?? '—'}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{ch.role ?? '—'}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{ch.status_value ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="px-2 py-0.5 rounded font-medium"
                      style={{ background: (LORE_STATUS_COLORS[ch.status] ?? '#6b7280') + '20', color: LORE_STATUS_COLORS[ch.status] ?? '#6b7280' }}>
                      {ch.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/lore/characters?id=${ch.id}`}
                        className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                        Redaguoti
                      </Link>
                      <LoreDeleteButton id={ch.id} onDelete={deleteCharacter} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Veikėjų dar nesukurta</div>
          )}
        </div>
      </div>
    </div>
  )
}
