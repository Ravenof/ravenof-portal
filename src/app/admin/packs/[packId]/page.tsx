import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { savePackCardPool, removeCardFromPool } from '../actions'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'
import { CardPoolPicker } from './CardPoolPicker'
import type { CardOption } from './CardPoolPicker'

export const revalidate = 0

type Params = Promise<{ packId: string }>

type PoolCard = {
  id: string
  card_id: string
  weight: number
  card: {
    id: string
    card_number: string | null
    name: string
    rarity: { name: string; color_hex: string } | null
    faction: { name: string; color_hex: string } | null
  } | null
}

type RawCard = {
  id: string
  card_number: string | null
  name: string
  rarity: { name: string; color_hex: string } | null
  faction: { name: string; color_hex: string } | null
}

export default async function PackDetailPage({ params }: { params: Params }) {
  const { packId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/cards?error=no_access')

  const { data: pack } = await supabase
    .from('card_packs')
    .select('id, name, cards_per_pack, daily_limit')
    .eq('id', packId)
    .single()
  if (!pack) notFound()

  const [{ data: poolRaw }, { data: allCardsRaw }] = await Promise.all([
    supabase
      .from('pack_card_pool')
      .select(`
        id, card_id, weight,
        card:cards ( id, card_number, name,
          rarity:rarities ( name, color_hex ),
          faction:factions ( name, color_hex )
        )
      `)
      .eq('pack_id', packId)
      .order('weight', { ascending: false }),
    supabase
      .from('cards')
      .select(`id, card_number, name, rarity:rarities ( name, color_hex ), faction:factions ( name, color_hex )`)
      .eq('status', 'active')
      .order('name'),
  ])

  const pool = (poolRaw ?? []) as unknown as PoolCard[]
  const allCards = (allCardsRaw ?? []) as unknown as RawCard[]

  const poolCardIds = pool.map((p) => p.card_id)

  const cardOptions: CardOption[] = allCards.map((c) => ({
    id: c.id,
    card_number: c.card_number,
    name: c.name,
    rarity_name: c.rarity?.name ?? null,
    rarity_color: c.rarity?.color_hex ?? null,
    faction_name: c.faction?.name ?? null,
  }))

  const addCardsAction = savePackCardPool.bind(null, packId)
  const removeAction = removeCardFromPool.bind(null, packId)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header
        className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/packs" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            &#x2190; Paketai
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span
            className="text-sm font-bold"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}
          >
            &#x1F0CF; {pack.name} &mdash; Kort&#x0173; baseinas
          </span>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-8">

        {/* Card picker */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.2)' }}
        >
          <div className="flex items-center gap-3 mb-1">
            <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
              Prid&#279;ti kort&#x0173; &#x012F; basein&#x0105;
            </p>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ({allCards.length} aktyvi&#x0173; kort&#x0173;)
            </span>
          </div>
          <CardPoolPicker
            cards={cardOptions}
            poolCardIds={poolCardIds}
            addCardsAction={addCardsAction}
          />
        </div>

        {/* Pool table */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2
              className="text-xs uppercase tracking-widest font-semibold"
              style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}
            >
              Kort&#x0173; baseinas ({pool.length} korteli&#x0173;)
            </h2>
            <div
              className="flex-1 h-px"
              style={{ background: 'linear-gradient(to right, rgba(240,180,41,0.2), transparent)' }}
            />
          </div>

          <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  {['Korta', 'Retenyb&#279;', 'Frakcija', 'Svoris', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-xs font-semibold"
                      style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
                      dangerouslySetInnerHTML={{ __html: h }}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {pool.map((row, i) => {
                  const c = row.card
                  return (
                    <tr
                      key={row.id}
                      style={{
                        background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                        borderBottom: '1px solid var(--bg-border)',
                      }}
                    >
                      <td className="px-3 py-2">
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {c?.name ?? '?'}
                        </span>
                        {c?.card_number && (
                          <span className="ml-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            #{c.card_number}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {c?.rarity && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: c.rarity.color_hex + '25',
                              color: c.rarity.color_hex,
                              border: `1px solid ${c.rarity.color_hex}55`,
                            }}
                          >
                            {c.rarity.name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {c?.faction?.name ?? '\u2014'}
                      </td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {row.weight}
                      </td>
                      <td className="px-3 py-2">
                        <LoreDeleteButton id={row.card_id} onDelete={removeAction} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {pool.length === 0 && (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Baseinas tu&#x0161;&#x010D;ias. Prid&#279;k korteli&#x0173;!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
