import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { LORE_STATUS_COLORS, formatCsvArray } from '@/lib/loreAdmin'
import { saveLocation, deleteLocation } from '../actions'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'
import { AdminMapPicker } from '@/components/admin/lore/AdminMapPicker'

export const revalidate = 0
export const metadata = { title: 'Vietovės — Atlaso valdymas' }

type SearchParams = Promise<{ action?: string; id?: string; error?: string }>

type Loc = {
  id: string; name: string; slug: string; type: string
  short_description: string | null; description: string | null
  x: number; y: number; region: string | null
  faction_ids: string[]; related_event_ids: string[]
  related_character_ids: string[]; related_artifact_ids: string[]
  related_card_numbers: string[]; first_era_index: number
  image_url: string | null; ambient_url: string | null; status: string; sort_order: number
}

const LOCATION_TYPES = ['unknown','city','ruins','dungeon','forest','mountain','coast','plains','island','fortress','temple','portal']

type PeriodOpt = { slug: string; name: string; eraName: string }
type LocState = { period_slug: string; description: string | null; image_url: string | null }

function LocationForm({ loc, error, allLocations, periods = [], states = [] }: {
  loc?: Loc; error?: string; allLocations: Loc[]
  periods?: PeriodOpt[]
  states?: LocState[]
}) {
  const stateBySlug: Record<string, LocState> = {}
  for (const s of states) stateBySlug[s.period_slug] = s

  return (
    <form action={saveLocation} className="space-y-5 p-5 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.2)' }}>
      <input type="hidden" name="_id" value={loc?.id ?? ''} />

      <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
        {loc ? 'Redaguoti vietovę' : 'Nauja vietovė'}
      </p>
      {error && <p className="text-xs px-3 py-2 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{error}</p>}

      {/* Row 1: name + slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pavadinimas *</label>
          <input name="name" required defaultValue={loc?.name ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Slug *</label>
          <input name="slug" required defaultValue={loc?.slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      {/* Row 2: type + region + first_era_index */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tipas</label>
          <select name="type" defaultValue={loc?.type ?? 'unknown'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            {LOCATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Regionas</label>
          <input name="region" defaultValue={loc?.region ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pirmoji era (indeksas)</label>
          <input name="first_era_index" type="number" min={0} defaultValue={loc?.first_era_index ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      {/* Interactive map picker — sets hidden x/y inputs */}
      <AdminMapPicker
        initialX={loc?.x ?? 50}
        initialY={loc?.y ?? 50}
        currentId={loc?.id}
        existingLocations={allLocations.map((l) => ({ id: l.id, name: l.name, x: l.x, y: l.y, slug: l.slug }))}
      />

      {/* Short description */}
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Trumpas aprašymas</label>
        <input name="short_description" defaultValue={loc?.short_description ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>

      {/* Full description */}
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pilnas aprašymas</label>
        <textarea name="description" rows={4} defaultValue={loc?.description ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>

      {/* Arrays */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Frakcijų ID (per kablelį)</label>
          <input name="faction_ids" defaultValue={formatCsvArray(loc?.faction_ids ?? [])}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Susijusių kortų numeriai (per kablelį)</label>
          <input name="related_card_numbers" defaultValue={formatCsvArray(loc?.related_card_numbers ?? [])}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Susijusių įvykių ID (per kablelį)</label>
          <input name="related_event_ids" defaultValue={formatCsvArray(loc?.related_event_ids ?? [])}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Veikėjų ID (per kablelį)</label>
          <input name="related_character_ids" defaultValue={formatCsvArray(loc?.related_character_ids ?? [])}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Artefaktų ID (per kablelį)</label>
          <input name="related_artifact_ids" defaultValue={formatCsvArray(loc?.related_artifact_ids ?? [])}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Paveikslėlio URL</label>
          <input name="image_url" defaultValue={loc?.image_url ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Ambient garso URL (mp3/ogg)</label>
          <input name="ambient_url" defaultValue={loc?.ambient_url ?? ''} placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      {/* ── Periodiniai aprašymai (carry-forward) ── */}
      {periods.length > 0 && (
        <div className="space-y-3 p-4 rounded-xl" style={{ background: 'var(--bg-base)', border: '1px dashed rgba(240,180,41,0.25)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
            ⏳ Aprašymai pagal periodą
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Palik lauką tuščią, jei aprašymas nesikeitė — atlasas automatiškai rodys paskutinį
            užpildytą įrašą iš ankstesnių periodų (carry-forward). Užpildyk tik tuos periodus,
            kuriuose vietovė pasikeitė.
          </p>
          {periods.map((pp) => (
            <div key={pp.slug} className="grid grid-cols-1 sm:grid-cols-[1fr_240px] gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                  {pp.eraName} → <b>{pp.name}</b>
                </label>
                <textarea name={'state_desc_' + pp.slug} rows={2}
                  defaultValue={stateBySlug[pp.slug]?.description ?? ''}
                  placeholder="(tuščia = rodomas ankstesnis aprašymas)"
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Nuotraukos URL (šiam periodui)</label>
                <input name={'state_img_' + pp.slug}
                  defaultValue={stateBySlug[pp.slug]?.image_url ?? ''}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status + sort */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Statusas</label>
          <select name="status" defaultValue={loc?.status ?? 'draft'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Rikiavimas</label>
          <input name="sort_order" type="number" defaultValue={loc?.sort_order ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {loc ? 'Išsaugoti' : 'Sukurti'}
        </button>
        <Link href="/admin/lore/locations"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block' }}>
          Atšaukti
        </Link>
      </div>
    </form>
  )
}

export default async function LocationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  const { data } = await supabase
    .from('lore_locations')
    .select('id,name,slug,type,short_description,description,x,y,region,faction_ids,related_event_ids,related_character_ids,related_artifact_ids,related_card_numbers,first_era_index,image_url,ambient_url,status,sort_order')
    .order('sort_order', { ascending: true })
  const rows = (data ?? []) as Loc[]
  const editLoc = params.id ? rows.find((l) => l.id === params.id) : undefined

  // Periodai + redaguojamos lokacijos periodinės būsenos
  const [periodsR, erasR, statesR] = await Promise.all([
    supabase.from('lore_periods').select('slug,name,era_slug').order('era_slug').order('timeline_index').then((r) => r, () => ({ data: null })),
    supabase.from('lore_eras').select('slug,name'),
    editLoc
      ? supabase.from('lore_location_states').select('period_slug,description,image_url').eq('location_slug', editLoc.slug).then((r) => r, () => ({ data: null }))
      : Promise.resolve({ data: null }),
  ])
  const eraNm: Record<string, string> = {}
  for (const e of ((erasR.data ?? []) as { slug: string; name: string }[])) eraNm[e.slug] = e.name
  const periodOpts = (((periodsR.data ?? []) as { slug: string; name: string; era_slug: string }[]))
    .map((pp) => ({ slug: pp.slug, name: pp.name, eraName: eraNm[pp.era_slug] ?? pp.era_slug }))
  const locStates = ((statesR.data ?? []) as { period_slug: string; description: string | null; image_url: string | null }[])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/lore" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Atlasas</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>🗺️ Vietovės</span>
          <div className="flex-1" />
          <Link href="/admin/lore/locations?action=new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Nauja vietovė
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        {params.action === 'new' && !params.id && <LocationForm error={params.error} allLocations={rows} periods={periodOpts} />}
        {editLoc && <LocationForm loc={editLoc} error={params.error} allLocations={rows} periods={periodOpts} states={locStates} />}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rows.length} vietovių</p>

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Pavadinimas', 'Tipas', 'X/Y', 'Era', 'Statusas', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((loc, i) => (
                <tr key={loc.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)', maxWidth: '180px' }}>
                    <span className="block truncate">{loc.name}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{loc.slug}</span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{loc.type}</td>
                  <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{loc.x},{loc.y}</td>
                  <td className="px-3 py-2 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{loc.first_era_index}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="px-2 py-0.5 rounded font-medium"
                      style={{ background: (LORE_STATUS_COLORS[loc.status] ?? '#6b7280') + '20', color: LORE_STATUS_COLORS[loc.status] ?? '#6b7280' }}>
                      {loc.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/lore/locations?id=${loc.id}`}
                        className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                        Redaguoti
                      </Link>
                      <LoreDeleteButton id={loc.id} onDelete={deleteLocation} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Vietovių dar nesukurta</div>
          )}
        </div>
      </div>
    </div>
  )
}
