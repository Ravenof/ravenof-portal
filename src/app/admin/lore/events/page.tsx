import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { LORE_STATUS_COLORS } from '@/lib/loreAdmin'
import { saveLoreEvent, deleteLoreEvent } from '../actions'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'
import { RelationPicker } from '@/components/admin/lore/RelationPicker'

export const revalidate = 0
export const metadata = { title: 'Įvykiai — Atlaso valdymas' }

type SearchParams = Promise<{ action?: string; id?: string; error?: string }>

type LoreEv = {
  id: string; title: string; slug: string; summary: string | null
  full_text: string | null; era_slug: string | null; timeline_index: number
  location_slug: string | null; faction_ids: string[]; character_slugs: string[]
  artifact_slugs: string[]; related_card_numbers: string[]
  source_type: string | null; source_title: string | null
  event_type: string | null; status: string; sort_order: number
  image_url: string | null; audio_url: string | null
  period_slug: string | null; previous_event_slug: string | null
}

type Opt = { value: string; label: string; hint?: string }
type FormOpts = {
  eras:       Opt[]
  periods:    { value: string; label: string; era: string }[]
  locations:  Opt[]
  characters: Opt[]
  artifacts:  Opt[]
  factions:   Opt[]
  cards:      Opt[]
  events:     Opt[]
}

function EventForm({ ev, error, opts }: { ev?: LoreEv; error?: string; opts: FormOpts }) {
  return (
    <form action={saveLoreEvent} className="space-y-4 p-5 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.2)' }}>
      <input type="hidden" name="_id" value={ev?.id ?? ''} />

      <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
        {ev ? 'Redaguoti įvykį' : 'Naujas įvykis'}
      </p>
      {error && <p className="text-xs px-3 py-2 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pavadinimas *</label>
          <input name="title" required defaultValue={ev?.title ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Slug *</label>
          <input name="slug" required defaultValue={ev?.slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Era</label>
          <select name="era_slug" defaultValue={ev?.era_slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="">— be eros —</option>
            {opts.eras.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Periodas (eros viduje)</label>
          <select name="period_slug" defaultValue={ev?.period_slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="">— be periodo —</option>
            {opts.periods.map((o) => <option key={o.value} value={o.value}>{o.era} → {o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Timeline indeksas (tvarka periode)</label>
          <input name="timeline_index" type="number" defaultValue={ev?.timeline_index ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Vietovė</label>
          <select name="location_slug" defaultValue={ev?.location_slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="">— be vietovės —</option>
            {opts.locations.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>⛓️ Sekė po įvykio (grandinė: one event leads to another)</label>
          <select name="previous_event_slug" defaultValue={ev?.previous_event_slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="">— grandinės pradžia / nesusieta —</option>
            {opts.events.filter((o) => o.value !== ev?.slug).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Santrauka</label>
        <textarea name="summary" rows={2} defaultValue={ev?.summary ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pilnas tekstas</label>
        <textarea name="full_text" rows={5} defaultValue={ev?.full_text ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <RelationPicker name="faction_ids" label="Frakcijos" options={opts.factions} defaultValue={ev?.faction_ids ?? []} />
        <RelationPicker name="character_slugs" label="Veikėjai" options={opts.characters} defaultValue={ev?.character_slugs ?? []} />
        <RelationPicker name="artifact_slugs" label="Artefaktai" options={opts.artifacts} defaultValue={ev?.artifact_slugs ?? []} />
        <RelationPicker name="related_card_numbers" label="Susijusios kortos" options={opts.cards} defaultValue={ev?.related_card_numbers ?? []} />
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Šaltinio tipas</label>
          <input name="source_type" defaultValue={ev?.source_type ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Šaltinio pavadinimas</label>
          <input name="source_title" defaultValue={ev?.source_title ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Nuotraukos URL</label>
          <input name="image_url" defaultValue={ev?.image_url ?? ''} placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Soundtrack URL (mp3/ogg)</label>
          <input name="audio_url" defaultValue={ev?.audio_url ?? ''} placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Įvykio tipas</label>
          <input name="event_type" defaultValue={ev?.event_type ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Statusas</label>
          <select name="status" defaultValue={ev?.status ?? 'draft'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Rikiavimas</label>
          <input name="sort_order" type="number" defaultValue={ev?.sort_order ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {ev ? 'Išsaugoti' : 'Sukurti'}
        </button>
        <Link href="/admin/lore/events"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block' }}>
          Atšaukti
        </Link>
      </div>
    </form>
  )
}

export default async function LoreEventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  const { data } = await supabase
    .from('lore_events')
    .select('id,title,slug,summary,full_text,era_slug,timeline_index,location_slug,faction_ids,character_slugs,artifact_slugs,related_card_numbers,source_type,source_title,event_type,image_url,audio_url,period_slug,previous_event_slug,status,sort_order')
    .order('timeline_index', { ascending: true })
  const rows = (data ?? []) as LoreEv[]
  const editEv = params.id ? rows.find((e) => e.id === params.id) : undefined

  // Opcijos formos ryšiams (bendra mapinimo sistema)
  const [erasR, periodsR, locsR, charsR, artsR, factsR, cardsR] = await Promise.all([
    supabase.from('lore_eras').select('slug,name').order('timeline_index'),
    supabase.from('lore_periods').select('slug,name,era_slug').order('era_slug').order('timeline_index').then((r) => r, () => ({ data: null })),
    supabase.from('lore_locations').select('slug,name').order('name'),
    supabase.from('lore_characters').select('slug,name').order('name'),
    supabase.from('lore_artifacts').select('slug,name').order('name'),
    supabase.from('lore_factions').select('slug,name').order('sort_order').then((r) => r, () => ({ data: null })),
    supabase.from('cards').select('card_number,name').eq('status', 'active').order('name'),
  ])

  const eraNameBySlug: Record<string, string> = {}
  for (const e of ((erasR.data ?? []) as { slug: string; name: string }[])) eraNameBySlug[e.slug] = e.name

  const opts: FormOpts = {
    eras:       ((erasR.data ?? []) as { slug: string; name: string }[]).map((e) => ({ value: e.slug, label: e.name })),
    periods:    (((periodsR.data ?? []) as { slug: string; name: string; era_slug: string }[]))
                  .map((pp) => ({ value: pp.slug, label: pp.name, era: eraNameBySlug[pp.era_slug] ?? pp.era_slug })),
    locations:  ((locsR.data ?? []) as { slug: string; name: string }[]).map((l) => ({ value: l.slug, label: l.name })),
    characters: ((charsR.data ?? []) as { slug: string; name: string }[]).map((c) => ({ value: c.slug, label: c.name })),
    artifacts:  ((artsR.data ?? []) as { slug: string; name: string }[]).map((a) => ({ value: a.slug, label: a.name })),
    factions:   ((factsR.data ?? []) as { slug: string; name: string }[]).map((f) => ({ value: f.slug, label: f.name })),
    cards:      ((cardsR.data ?? []) as { card_number: string; name: string }[]).map((c) => ({ value: c.card_number, label: c.name, hint: c.card_number })),
    events:     rows.filter((e) => e.status !== 'archived').map((e) => ({ value: e.slug, label: e.title })),
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/lore" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Atlasas</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>⚡ Įvykiai</span>
          <div className="flex-1" />
          <Link href="/admin/lore/events?action=new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Naujas įvykis
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        {params.action === 'new' && !params.id && <EventForm error={params.error} opts={opts} />}
        {editEv && <EventForm ev={editEv} error={params.error} opts={opts} />}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rows.length} įvykių</p>

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Pavadinimas', 'Era / Vietovė', 'Indeksas', 'Statusas', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((ev, i) => (
                <tr key={ev.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)', maxWidth: '200px' }}>
                    <span className="block truncate">{ev.title}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{ev.slug}</span>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {ev.era_slug ?? '—'} {ev.location_slug ? `· ${ev.location_slug}` : ''}
                  </td>
                  <td className="px-3 py-2 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{ev.timeline_index}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="px-2 py-0.5 rounded font-medium"
                      style={{ background: (LORE_STATUS_COLORS[ev.status] ?? '#6b7280') + '20', color: LORE_STATUS_COLORS[ev.status] ?? '#6b7280' }}>
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/admin/lore/events?id=${ev.id}`}
                        className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                        Redaguoti
                      </Link>
                      <LoreDeleteButton id={ev.id} onDelete={deleteLoreEvent} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Įvykių dar nesukurta</div>
          )}
        </div>
      </div>
    </div>
  )
}
