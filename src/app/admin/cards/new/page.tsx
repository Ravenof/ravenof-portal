import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CardForm } from '@/components/admin/CardForm'

export const metadata = { title: 'Nauja korta | Admin' }

export default async function NewCardPage() {
  const supabase = await createClient()
  const [{ data: factions }, { data: cardTypes }, { data: rarities }, { data: cardList }] = await Promise.all([
    supabase.from('factions').select('*').order('sort_order'),
    supabase.from('card_types').select('*').order('sort_order'),
    supabase.from('rarities').select('*').order('sort_order'),
    supabase.from('cards').select('name').eq('status', 'active').order('name').limit(1000),
  ])
  const cardNames = Array.from(new Set(((cardList ?? []) as { name: string }[]).map((c) => c.name))).sort()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/admin/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            Admin kortos
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Nauja korta
          </span>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <CardForm
          cardId={null}
          factions={factions ?? []}
          cardTypes={cardTypes ?? []}
          rarities={rarities ?? []}
          cardNames={cardNames}
        />
      </div>
    </div>
  )
}
