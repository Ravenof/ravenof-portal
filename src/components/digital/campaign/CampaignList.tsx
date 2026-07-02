'use client'

// ── CampaignList — player Campaign Mode landing: grid of available campaigns ──
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadCampaigns } from '@/lib/campaign/missionLoader'
import { playUiClick } from '@/lib/ui-sound'
import type { Campaign } from '@/lib/campaign/types'
import { PageHero } from '../ui/HubKit'

const GOLD = '240,180,41'

export function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  useEffect(() => { loadCampaigns().then(setCampaigns) }, [])

  return (
    <div className="max-w-md mx-auto space-y-4">
      <PageHero icon={<span style={{ fontSize: 44 }}>🗺️</span>} accent={GOLD}
        title="KAMPANIJA" sub="Vienas žaidėjas. Istorijos misijos Ravenof pasaulio žemėlapyje." />

      {campaigns === null ? (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Kol kas nėra aktyvių kampanijų.</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link key={c.id} href={`/digital/campaign/${c.slug}`} onClick={() => playUiClick()}
              className="block rounded-2xl overflow-hidden transition-transform active:scale-[0.99]"
              style={{ border: `1px solid rgba(${GOLD},0.3)`, background: 'rgba(10,8,16,0.85)' }}>
              {c.coverImageUrl && <img src={c.coverImageUrl} alt={c.title} className="w-full h-28 object-cover" style={{ opacity: 0.9 }} />}
              <div className="px-4 py-3">
                <h2 className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{c.title}</h2>
                {c.subtitle && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{c.subtitle}</p>}
                {c.description && <p className="text-[12px] mt-1.5 leading-snug line-clamp-2" style={{ color: 'var(--text-muted)' }}>{c.description}</p>}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {c.relatedFactions.slice(0, 4).map((f) => (
                    <span key={f} className="text-[9px] px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{f}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
