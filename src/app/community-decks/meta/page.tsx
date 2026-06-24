import Link from 'next/link'
import Image from 'next/image'
import { HeaderNav } from '@/components/layout/HeaderNav'
import { createClient } from '@/lib/supabase/server'
import { getFactionColor } from '@/lib/utils'

export const metadata = { title: 'Meta statistika | Bendruomenės kaladės' }
export const revalidate = 120

type CardRow = { id: string; name: string; card_number: string | null; image_url: string | null; faction_id: number | null; rarity: { name: string; color_hex: string } | null }

export default async function MetaPage() {
  const supabase = await createClient()

  // 1) Viešos kaladės (ribojam 500, kad užklausa būtų greita)
  const { data: pubDecks } = await supabase
    .from('decks').select('id, faction_id').eq('visibility', 'public').limit(500)
  const decks = (pubDecks ?? []) as { id: string; faction_id: number | null }[]
  const deckIds = decks.map((d) => d.id)
  const totalDecks = decks.length

  // 2) Frakcijų populiarumas (pagal kaladžių sk.)
  const facCount: Record<string, number> = {}
  for (const d of decks) { const k = String(d.faction_id ?? 0); facCount[k] = (facCount[k] ?? 0) + 1 }

  // 3) Kortų naudojimas viešose kaladėse
  const usage: Record<string, { decks: number; copies: number }> = {}
  if (deckIds.length > 0) {
    const { data: dc } = await supabase.from('deck_cards').select('deck_id, card_id, quantity').in('deck_id', deckIds)
    for (const r of (dc ?? []) as { card_id: string; quantity: number }[]) {
      const u = usage[r.card_id] ?? { decks: 0, copies: 0 }
      u.decks += 1; u.copies += r.quantity; usage[r.card_id] = u
    }
  }
  const topCardIds = Object.entries(usage).sort((a, b) => b[1].decks - a[1].decks).slice(0, 30).map(([id]) => id)

  // 4) Kortų + frakcijų detalės
  const [{ data: cardRows }, { data: facRows }] = await Promise.all([
    topCardIds.length > 0
      ? supabase.from('cards').select('id, name, card_number, image_url, faction_id, rarity:rarities ( name, color_hex )').in('id', topCardIds)
      : Promise.resolve({ data: [] as CardRow[] }),
    supabase.from('factions').select('id, name, color_hex'),
  ])
  const cardById = new Map((cardRows as unknown as CardRow[] ?? []).map((c) => [c.id, c]))
  const facById = new Map(((facRows ?? []) as { id: number; name: string; color_hex: string }[]).map((f) => [f.id, f]))
  const topFactions = Object.entries(facCount).map(([k, n]) => ({ id: Number(k), n })).sort((a, b) => b.n - a.n)
  const maxFac = topFactions[0]?.n || 1
  const topCards = topCardIds.map((id) => ({ card: cardById.get(id), use: usage[id] })).filter((x) => x.card)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header className="sticky top-0 z-20 border-b px-4 py-3" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-3 flex-wrap">
          <Link href="/community-decks" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Bendruomenės kaladės</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1 className="rvn-page-title text-lg flex-1">📊 Meta statistika</h1>
          <HeaderNav />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-8">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pagal {totalDecks} viešų kaladžių.</p>

        {/* Frakcijos */}
        <section>
          <h2 className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Populiariausios frakcijos</h2>
          <div className="space-y-2 max-w-2xl">
            {topFactions.map(({ id, n }) => {
              const f = facById.get(id)
              const col = getFactionColor(f?.color_hex)
              return (
                <div key={id} className="flex items-center gap-3">
                  <span className="text-sm w-40 truncate" style={{ color: 'var(--text-primary)' }}>{f?.name ?? 'Nėra frakcijos'}</span>
                  <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.round((n / maxFac) * 100)}%`, background: col }} />
                  </div>
                  <span className="text-xs w-16 text-right" style={{ color: 'var(--text-muted)' }}>{n} kal.</span>
                </div>
              )
            })}
            {topFactions.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nėra viešų kaladžių.</p>}
          </div>
        </section>

        {/* Kortos */}
        <section>
          <h2 className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Populiariausios kortos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {topCards.map(({ card, use }, i) => {
              const c = card!
              const rc = c.rarity?.color_hex || '#9ca3af'
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                  <span className="text-xs w-5 text-right font-bold" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  <div className="relative w-10 h-14 rounded overflow-hidden shrink-0" style={{ border: `1px solid ${rc}` }}>
                    {c.image_url
                      ? <Image src={c.image_url} alt={c.name} fill className="object-cover" sizes="40px" unoptimized />
                      : <div className="w-full h-full flex items-center justify-center text-base" style={{ background: '#0a0810' }}>🎴</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                    <p className="text-[11px]" style={{ color: rc }}>{c.rarity?.name ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{use.decks}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>kaladžių</p>
                  </div>
                </div>
              )
            })}
            {topCards.length === 0 && <p className="text-sm col-span-full" style={{ color: 'var(--text-muted)' }}>Nėra duomenų.</p>}
          </div>
        </section>
      </main>
    </div>
  )
}
