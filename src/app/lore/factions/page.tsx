import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Shield } from 'lucide-react'

export const revalidate = 60
export const metadata = { title: 'Frakcijos — Atlasas' }

type Faction = {
  id: string; name: string; slug: string; color: string
  description: string | null; sort_order: number
}

export default async function LoreFactionsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('lore_factions')
    .select('id,name,slug,color,description,sort_order')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })

  const factions = (data ?? []) as Faction[]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/lore" className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={13} />
            <span>Atlasas</span>
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold flex items-center gap-2"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            <Shield size={15} />
            Frakcijos
          </span>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            Frakcijos &amp; Organizacijos
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Galingos grupuotės, formuojančios Ravenof pasaulio politiką ir likimą.
          </p>
        </div>

        {factions.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-4">⚔️</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Frakcijų informacija dar nepaskelbta
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {factions.map((f) => (
              <Link
                key={f.id}
                href={`/lore/factions/${f.slug}`}
                className="group block rounded-xl p-5 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${f.color}33`,
                  boxShadow: `0 0 0 0 ${f.color}00`,
                }}
              >
                {/* Color stripe + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: f.color + '22',
                      border: `2px solid ${f.color}88`,
                      boxShadow: `0 0 12px ${f.color}33`,
                    }}
                  >
                    <Shield size={18} style={{ color: f.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate"
                      style={{ fontFamily: 'var(--rvn-font-display)', color: f.color }}>
                      {f.name}
                    </p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {f.slug}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {f.description && (
                  <p className="text-xs leading-relaxed line-clamp-3"
                    style={{ color: 'var(--text-secondary)' }}>
                    {f.description}
                  </p>
                )}

                {/* Arrow */}
                <div className="mt-3 flex items-center justify-end">
                  <span className="text-xs transition-transform duration-200 group-hover:translate-x-1"
                    style={{ color: f.color + '99' }}>
                    Skaityti daugiau →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
