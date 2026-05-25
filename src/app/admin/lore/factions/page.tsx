import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LORE_STATUS_COLORS } from '@/lib/loreAdmin'
import { saveFaction, deleteFaction } from '../actions'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'

export const revalidate = 0
export const metadata = { title: 'Frakcijos | Lore Atlas Admin' }

type SearchParams = Promise<{ action?: string; id?: string; error?: string }>

type Faction = {
  id: string; name: string; slug: string; color: string
  description: string | null; sort_order: number; status: string
}

const PRESET_COLORS = [
  '#d4af37','#ef4444','#8b5cf6','#3b82f6','#22c55e',
  '#f59e0b','#0ea5e9','#ec4899','#6b7280','#14b8a6',
]

function FactionForm({ f, error }: { f?: Faction; error?: string }) {
  return (
    <form action={saveFaction} className="space-y-4 p-5 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.2)' }}>
      <input type="hidden" name="_id" value={f?.id ?? ''} />

      <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
        {f ? 'Redaguoti frakciją' : 'Nauja frakcija'}
      </p>
      {error && <p className="text-xs px-3 py-2 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{error}</p>}

      {/* Name + slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pavadinimas *</label>
          <input name="name" required defaultValue={f?.name ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Slug *</label>
          <input name="slug" required defaultValue={f?.slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Spalva</label>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Custom hex input */}
          <div className="flex items-center gap-2">
            <input type="color" name="color" defaultValue={f?.color ?? '#d4af37'}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0.5"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>hex</span>
          </div>
          {/* Presets */}
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={(e) => {
                  const form = e.currentTarget.closest('form') as HTMLFormElement
                  const colorInput = form.querySelector<HTMLInputElement>('input[type="color"]')
                  if (colorInput) colorInput.value = c
                }}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: f?.color === c ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Aprašymas</label>
        <textarea name="description" rows={3} defaultValue={f?.description ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>

      {/* Status + sort */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Statusas</label>
          <select name="status" defaultValue={f?.status ?? 'draft'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Rikiavimas</label>
          <input name="sort_order" type="number" defaultValue={f?.sort_order ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {f ? 'Išsaugoti' : 'Sukurti'}
        </button>
        <Link href="/admin/lore/factions"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block' }}>
          Atšaukti
        </Link>
      </div>
    </form>
  )
}

export default async function FactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
        {params.action === 'new' && !params.id && <FactionForm error={params.error} />}
        {editFaction && <FactionForm f={editFaction} error={params.error} />}

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
