import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CardForm } from '@/components/admin/CardForm'

export const metadata = { title: 'Redaguoti korta | Admin' }

type Props = { params: Promise<{ cardId: string }> }

export default async function EditCardPage({ params }: Props) {
  const { cardId } = await params
  const supabase = await createClient()

  const { data: card } = await supabase
    .from('cards')
    .select('id, card_number, name, faction_id, card_type_id, rarity_id, gold_cost, attack, health, description, effect_text, image_url, is_champion, status')
    .eq('id', cardId)
    .single()

  if (!card) return notFound()

  const [{ data: factions }, { data: cardTypes }, { data: rarities }] = await Promise.all([
    supabase.from('factions').select('*').order('sort_order'),
    supabase.from('card_types').select('*').order('sort_order'),
    supabase.from('rarities').select('*').order('sort_order'),
  ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/admin/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Admin kortos
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold truncate" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            {card.name}
          </span>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <CardForm
          cardId={card.id}
          initialData={card}
          factions={factions ?? []}
          cardTypes={cardTypes ?? []}
          rarities={rarities ?? []}
        />
      </div>
    </div>
  )
}
