import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { CardStatsGrid } from '@/components/admin/CardStatsGrid'

export const metadata = { title: 'Greitas statų suvedimas | Admin' }

type SearchParams = Promise<{ faction?: string; missing?: string; status?: string }>

export default async function CardStatsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const user = await getCachedUser()
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') redirect('/admin/events')
  }

  let q = supabase
    .from('cards')
    .select('id, card_number, name, image_url, gold_cost, attack, health, rarity_id, card_type_id, faction:factions ( name )')
    .eq('status', params.status ?? 'active')

  if (params.faction) q = q.eq('faction_id', Number(params.faction))
  if (params.missing === 'cost') q = q.is('gold_cost', null)
  else if (params.missing === 'rarity') q = q.is('rarity_id', null)

  q = q.order('card_number', { ascending: true, nullsFirst: false }).limit(600)

  const [{ data: cards }, { data: factions }, { data: rarities }, { data: cardTypes }] = await Promise.all([
    q,
    supabase.from('factions').select('id, name').order('sort_order'),
    supabase.from('rarities').select('id, name').order('sort_order'),
    supabase.from('card_types').select('id, name').order('sort_order'),
  ])

  const rows = ((cards ?? []) as unknown as Array<{
    id: string; card_number: string | null; name: string; image_url: string | null
    gold_cost: number | null; attack: number | null; health: number | null
    rarity_id: number | null; card_type_id: number | null; faction: { name: string } | null
  }>).map((c) => ({ ...c, faction_name: c.faction?.name ?? null }))

  const selStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', outline: 'none' }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3" style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3 flex-wrap">
          <Link href="/admin/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>Admin kortos</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>Greitas statų suvedimas</span>
          <form className="flex items-center gap-2 ml-auto flex-wrap">
            <select name="faction" defaultValue={params.faction ?? ''} className="px-2 py-1 rounded text-xs" style={selStyle}>
              <option value="">Visos frakcijos</option>
              {(factions ?? []).map((f: { id: number; name: string }) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select name="missing" defaultValue={params.missing ?? ''} className="px-2 py-1 rounded text-xs" style={selStyle}>
              <option value="">Visos</option>
              <option value="cost">Tik be kainos</option>
              <option value="rarity">Tik be retumo</option>
            </select>
            <button type="submit" className="px-3 py-1 rounded text-xs font-semibold" style={{ background: 'var(--gold)', color: '#0a0a0f' }}>Filtruoti</button>
          </form>
        </div>
      </header>
      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          {rows.length} kortų · įvesk kainą/retumą/ATK/HP žiūrėdamas į paveikslą – išsaugoma automatiškai (✓).
        </p>
        <CardStatsGrid rows={rows} rarities={(rarities ?? []) as { id: number; name: string }[]} cardTypes={(cardTypes ?? []) as { id: number; name: string }[]} />
      </div>
    </div>
  )
}
