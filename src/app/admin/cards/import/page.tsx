import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ImportClient } from './ImportClient'

export const metadata = { title: 'CSV Import | Admin' }

export default async function ImportPage() {
  const supabase = await createClient()

  const [{ data: factions }, { data: cardTypes }, { data: rarities }] = await Promise.all([
    supabase.from('factions').select('id, name').order('sort_order'),
    supabase.from('card_types').select('id, name').order('sort_order'),
    supabase.from('rarities').select('id, name').order('sort_order'),
  ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header
        className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-screen-lg mx-auto flex items-center gap-3">
          <Link href="/admin/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Admin kortos
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span
            className="text-sm font-semibold"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
          >
            CSV Import
          </span>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-6 py-8">
        <ImportClient
          factions={(factions ?? []) as { id: number; name: string }[]}
          cardTypes={(cardTypes ?? []) as { id: number; name: string }[]}
          rarities={(rarities ?? []) as { id: number; name: string }[]}
        />
      </div>
    </div>
  )
}
