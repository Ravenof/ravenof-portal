// ── Admin: vertimai (Fazė 8) ─────────────────────────────────────────────────
// Vienoje vietoje: kortų vertimai (card_translations + card_assets + balsai),
// DB turinio vertimai (content_translations) ir pilnumo ataskaita.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminI18nClient } from '@/components/admin/i18n/AdminI18nClient'

export const metadata = { title: 'Vertimai | Admin' }

const NAV = [
  { href: '/admin', label: '📊 Apžvalga' },
  { href: '/admin/cards', label: '🃏 Kortos' },
  { href: '/admin/i18n', label: '🌍 Vertimai' },
]

export default async function AdminI18nPage() {
  const supabase = await createClient()

  const [{ data: cards }, { data: cardTr }, { data: cardAssets }, { data: audio }, { data: content }] = await Promise.all([
    supabase.from('cards').select('id, card_number, name, description, effect_text, image_url, status')
      .neq('status', 'archived').order('card_number').limit(2000),
    supabase.from('card_translations').select('card_id, locale, name, description, effect_text, flavor_text, status'),
    supabase.from('card_assets').select('card_id, locale, asset_type, url').eq('asset_type', 'image'),
    supabase.from('localized_audio').select('id, owner_type, owner_id, locale, trigger, url, transcript, weight'),
    supabase.from('content_translations').select('owner_type, owner_id, locale, field, value'),
  ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-30 px-4 py-3" style={{ background: 'rgba(10,8,16,0.92)', borderBottom: '1px solid var(--bg-border)' }}>
        <nav className="flex items-center gap-1 flex-wrap">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ color: n.href === '/admin/i18n' ? 'var(--gold)' : 'var(--text-muted)', border: '1px solid ' + (n.href === '/admin/i18n' ? 'rgba(240,180,41,0.35)' : 'var(--bg-border)'), fontFamily: 'var(--rvn-font-display)' }}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <AdminI18nClient
        cards={(cards ?? []) as never}
        cardTranslations={(cardTr ?? []) as never}
        cardAssets={(cardAssets ?? []) as never}
        audio={(audio ?? []) as never}
        content={(content ?? []) as never}
      />
    </div>
  )
}
