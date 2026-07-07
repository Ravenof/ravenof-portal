'use client'

// ── CampaignList — landscape: kampanijų kortelės grid'e (cover kairėje) ───────
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadCampaigns } from '@/lib/campaign/missionLoader'
import { playUiClick } from '@/lib/ui-sound'
import type { Campaign } from '@/lib/campaign/types'

const GOLD = '240,180,41'

export function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  useEffect(() => { loadCampaigns().then(setCampaigns) }, [])

  return (
    <div className="h-full flex flex-col min-h-0" style={{ gap: 'clamp(4px,1vh,10px)' }}>
      <div className="text-center shrink-0">
        <div className="rvn-disp font-black uppercase leading-none" style={{ fontSize: 'clamp(16px,3.2vh,28px)', color: 'var(--gold)', letterSpacing: '0.04em' }}>🗺️ Kampanija</div>
        <div style={{ fontSize: 'clamp(9px,1.4vh,12px)', color: 'var(--text-muted)' }}>Vienas žaidėjas. Istorijos misijos Ravenof pasaulio žemėlapyje.</div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {campaigns === null ? (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Kol kas nėra aktyvių kampanijų.</p>
        ) : (
          <div className="grid gap-2.5 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))' }}>
            {campaigns.map((c) => (
              <Link key={c.id} href={`/digital/campaign/${c.slug}`} onClick={() => playUiClick()}
                className="rvn-press flex rounded-2xl overflow-hidden"
                style={{ minHeight: 118, border: `1px solid rgba(${GOLD},0.3)`, background: 'rgba(10,8,16,0.85)' }}>
                <span className="relative shrink-0 overflow-hidden" style={{ width: 132 }}>
                  {c.coverImageUrl
                    ? <img src={c.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.92 }} />
                    : <span className="absolute inset-0 flex items-center justify-center text-4xl" style={{ background: `radial-gradient(120% 90% at 50% 20%, rgba(${GOLD},0.14), rgba(10,8,16,0.98) 70%)` }}>🗺️</span>}
                  <span aria-hidden className="absolute inset-y-0 right-0" style={{ width: 26, background: 'linear-gradient(90deg, transparent, rgba(10,8,16,0.95))' }} />
                </span>
                <span className="flex-1 min-w-0 px-3.5 py-3 flex flex-col">
                  <h2 className="font-bold leading-tight" style={{ fontSize: 15, fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{c.title}</h2>
                  {c.subtitle && <p className="mt-0.5 truncate" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{c.subtitle}</p>}
                  {c.description && <p className="mt-1 leading-snug line-clamp-2" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{c.description}</p>}
                  <span className="flex gap-1.5 mt-auto pt-2 flex-wrap">
                    {c.relatedFactions.slice(0, 4).map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded" style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{f}</span>
                    ))}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
