import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { savePeriod, deletePeriod } from '../actions'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'

export const revalidate = 0
export const metadata = { title: 'Periodai — Atlaso valdymas' }

type SearchParams = Promise<{ action?: string; id?: string; error?: string }>

type Period = {
  id: string; era_slug: string; name: string; slug: string
  description: string | null; timeline_index: number; status: string; sort_order: number
}

type Era = { slug: string; name: string; timeline_index: number }

const inputStyle = {
  background: 'var(--bg-base)',
  border: '1px solid var(--bg-border)',
  color: 'var(--text-primary)',
} as const

function PeriodForm({ period, eras, error }: { period?: Period; eras: Era[]; error?: string }) {
  return (
    <form action={savePeriod} className="space-y-4 p-5 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.2)' }}>
      <input type="hidden" name="_id" value={period?.id ?? ''} />

      <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
        {period ? 'Redaguoti periodą' : 'Naujas periodas'}
      </p>

      {error && (
        <p className="text-xs px-3 py-2 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pavadinimas *</label>
          <input name="name" required defaultValue={period?.name ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Slug *</label>
          <input name="slug" required defaultValue={period?.slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Era *</label>
          <select name="era_slug" required defaultValue={period?.era_slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
            <option value="">— pasirink erą —</option>
            {eras.map((e) => <option key={e.slug} value={e.slug}>{e.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Aprašymas</label>
        <textarea name="description" rows={2} defaultValue={period?.description ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Indeksas eros viduje (0 = pirmas)</label>
          <input name="timeline_index" type="number" defaultValue={period?.timeline_index ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Statusas</label>
          <select name="status" defaultValue={period?.status ?? 'published'}
            className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Rikiavimas</label>
          <input name="sort_order" type="number" defaultValue={period?.sort_order ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {period ? 'Išsaugoti' : 'Sukurti'}
        </button>
        <Link href="/admin/lore/periods"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block' }}>
          Atšaukti
        </Link>
      </div>
    </form>
  )
}

export default async function LorePeriodsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  const [{ data: periodsRaw }, { data: erasRaw }] = await Promise.all([
    supabase.from('lore_periods')
      .select('id,era_slug,name,slug,description,timeline_index,status,sort_order')
      .order('era_slug').order('timeline_index'),
    supabase.from('lore_eras').select('slug,name,timeline_index').order('timeline_index'),
  ])

  const rows = (periodsRaw ?? []) as Period[]
  const eras = (erasRaw ?? []) as Era[]
  const eraName: Record<string, string> = {}
  for (const e of eras) eraName[e.slug] = e.name
  const editPeriod = params.id ? rows.find((p) => p.id === params.id) : undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/lore" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Atlasas</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>🕰️ Periodai</span>
          <div className="flex-1" />
          <Link href="/admin/lore/periods?action=new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Naujas periodas
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Periodai — mažesni laikotarpiai eros viduje. Įvykiai gali būti priskirti periodui,
          o lokacijos gali turėti skirtingus aprašymus kiekvienam periodui.
        </p>

        {params.action === 'new' && !params.id && <PeriodForm eras={eras} error={params.error} />}
        {editPeriod && <PeriodForm period={editPeriod} eras={eras} error={params.error} />}

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Pavadinimas', 'Era', 'Indeksas', 'Statusas', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2 font-medium">
                    <span className="block">{p.name}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.slug}</span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{eraName[p.era_slug] ?? p.era_slug}</td>
                  <td className="px-3 py-2 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{p.timeline_index}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: p.status === 'published' ? '#22c55e' : 'var(--text-muted)' }}>{p.status}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Link href={'/admin/lore/periods?id=' + p.id}
                      className="text-xs px-2 py-1 rounded hover:opacity-70"
                      style={{ color: 'var(--gold)' }}>
                      Redaguoti
                    </Link>
                    <LoreDeleteButton id={p.id} onDelete={deletePeriod} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  Periodų dar nėra — sukurk pirmą.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
