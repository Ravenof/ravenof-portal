import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type SearchParams = Promise<{ search?: string; faction?: string; type?: string; rarity?: string; status?: string }>

const STATUS_COLORS: Record<string, string> = {
  active:  '#22c55e',
  hidden:  '#f59e0b',
  draft:   '#6b7280',
  banned:  '#ef4444',
}

export default async function AdminCardsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()

  let q = supabase
    .from('cards')
    .select(`
      id, card_number, name, gold_cost, attack, health, status, is_champion,
      faction:factions ( id, name, color_hex ),
      card_type:card_types ( id, name ),
      rarity:rarities ( id, name, color_hex )
    `)

  if (params.search?.trim()) {
    q = q.or(`name.ilike.%${params.search}%,card_number.ilike.%${params.search}%,effect_text.ilike.%${params.search}%`)
  }
  if (params.faction) q = q.eq('faction_id', Number(params.faction))
  if (params.type)    q = q.eq('card_type_id', Number(params.type))
  if (params.rarity)  q = q.eq('rarity_id', Number(params.rarity))
  if (params.status)  q = q.eq('status', params.status)

  q = q.order('card_number', { ascending: true, nullsFirst: false }).order('name')

  const { data: cards, error } = await q

  const [{ data: factions }, { data: cardTypes }, { data: rarities }] = await Promise.all([
    supabase.from('factions').select('id, name').order('sort_order'),
    supabase.from('card_types').select('id, name').order('sort_order'),
    supabase.from('rarities').select('id, name').order('sort_order'),
  ])

  const rows = (cards ?? []) as unknown as {
    id: string; card_number: string | null; name: string; gold_cost: number | null
    attack: number | null; health: number | null; status: string; is_champion: boolean
    faction: { name: string; color_hex: string } | null
    card_type: { name: string } | null
    rarity: { name: string; color_hex: string } | null
  }[]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-2xl mx-auto flex items-center gap-4">
          <Link href="/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Kortu baze
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Admin Panel
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>
            ADMIN
          </span>
          <div className="flex-1" />
          <Link href="/admin/cards/import"
            className="text-sm px-4 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
            Importuoti CSV
          </Link>
          <Link href="/admin/cards/new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Nauja korta
          </Link>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#ef444420', color: '#ef4444' }}>
            Klaida: {error.message}
          </div>
        )}

        {/* Filters */}
        <form className="flex flex-wrap gap-2 mb-6">
          <input name="search" defaultValue={params.search ?? ''} placeholder="Iesko pagal pavadinima..."
            className="px-3 py-1.5 rounded-lg text-sm flex-1 min-w-48"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none' }} />
          <select name="status" defaultValue={params.status ?? ''}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', outline: 'none' }}>
            <option value="">Visi statusai</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="draft">Draft</option>
            <option value="banned">Banned</option>
          </select>
          <select name="faction" defaultValue={params.faction ?? ''}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', outline: 'none' }}>
            <option value="">Visos frakcijos</option>
            {(factions ?? []).map((f: { id: number; name: string }) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select name="type" defaultValue={params.type ?? ''}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', outline: 'none' }}>
            <option value="">Visi tipai</option>
            {(cardTypes ?? []).map((t: { id: number; name: string }) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select name="rarity" defaultValue={params.rarity ?? ''}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', outline: 'none' }}>
            <option value="">Visi retumai</option>
            {(rarities ?? []).map((r: { id: number; name: string }) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button type="submit" className="px-4 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
            Filtruoti
          </button>
          <Link href="/admin/cards" className="px-3 py-1.5 rounded-lg text-sm"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
            Reset
          </Link>
        </form>

        <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          {rows.length} kortu
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Nr.', 'Pavadinimas', 'Frakcija', 'Tipas', 'Retumas', 'Auksas', 'ATK', 'HP', 'Statusas', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((card, i) => (
                <tr key={card.id}
                  style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {card.card_number ?? '—'}
                  </td>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)', maxWidth: '180px' }}>
                    <span className="truncate block">
                      {card.is_champion && <span className="text-yellow-400 mr-1">★</span>}
                      {card.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {card.faction
                      ? <span className="px-1.5 py-0.5 rounded" style={{ background: card.faction.color_hex + '20', color: card.faction.color_hex }}>{card.faction.name}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {card.card_type?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {card.rarity
                      ? <span style={{ color: card.rarity.color_hex }}>{card.rarity.name}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-center" style={{ color: 'var(--gold)' }}>
                    {card.gold_cost ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-center" style={{ color: '#ef4444' }}>
                    {card.attack ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-center" style={{ color: '#22c55e' }}>
                    {card.health ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className="px-2 py-0.5 rounded font-medium"
                      style={{ background: (STATUS_COLORS[card.status] ?? '#6b7280') + '20', color: STATUS_COLORS[card.status] ?? '#6b7280' }}>
                      {card.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={'/admin/cards/' + card.id}
                      className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                      Redaguoti
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
              Kortu nerasta
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
