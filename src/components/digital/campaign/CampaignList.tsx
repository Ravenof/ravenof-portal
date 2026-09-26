'use client'

// ── CampaignList — patvirtintas UI (Fazė 3, campaign-default.png) ─────────────
// Full-bleed: ‹ atgal + KAMPANIJA + sub. Skyrių stulpeliai: romėniškas numeris,
// artas su gradientu, pavadinimas, frakcija, BOSAS eilutė, progreso juosta
// (žalia įveikta / auksinė vykstanti) ir CTA (KARTOTI / TĘSTI / PRADĖTI).
// SĄMONINGA DEVIACIJA: „UŽRAKINTA" būsenos nėra — gyvos sistemos kampanijos
// tarpusavyje nerakinamos (mazgų atrakinimas veikia žemėlapio ekrane).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loadCampaigns, loadFullCampaign, loadProgress } from '@/lib/campaign/missionLoader'
import { playUiClick } from '@/lib/ui-sound'
import type { Campaign } from '@/lib/campaign/types'
import { useT } from '@/lib/i18n/react'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import { DT } from '@/components/digital/ui/deskTokens'

// Skyriaus akcento spalvos (patvirtinta FAC paletė, cikliškai pagal indeksą)
const CHAPTER_COLORS = ['#6F8562', '#7650A4', '#4E8A7C', '#8D2D38', '#526FAE', '#A85C32', '#D4A33B', '#6B6577']

function toRoman(n: number): string {
  const map: [number, string][] = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''; let v = Math.max(1, Math.min(50, Math.round(n)))
  for (const [num, sym] of map) while (v >= num) { out += sym; v -= num }
  return out
}

type Meta = { total: number; done: number; boss: string | null }

export function CampaignList() {
  const t = useT()
  const router = useRouter()
  // Desktop: skyriai adaptyviame tinklelyje (eilutės lūžta, be horizontalaus scroll), natūralaus aukščio kortelės
  const { desktop: D } = useDesktopUi()
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [meta, setMeta] = useState<Record<string, Meta>>({})

  useEffect(() => {
    loadCampaigns().then(async (cs) => {
      setCampaigns(cs)
      // Progresas + bosas kiekvienai kampanijai (mažas sąrašas — lygiagrečiai)
      const entries = await Promise.all(cs.map(async (c) => {
        try {
          const [full, prog] = await Promise.all([loadFullCampaign(c.id), loadProgress(c.id)])
          if (!full) return [c.id, { total: 0, done: 0, boss: null }] as const
          const battle = full.nodes.filter((n) => n.missionType !== 'STORY_ONLY')
          const doneIds = new Set(prog?.completedNodeIds ?? [])
          const boss = full.nodes.find((n) => n.missionType === 'BOSS_BATTLE')?.title ?? null
          return [c.id, { total: battle.length, done: battle.filter((n) => doneIds.has(n.id)).length, boss }] as const
        } catch { return [c.id, { total: 0, done: 0, boss: null }] as const }
      }))
      setMeta(Object.fromEntries(entries))
    })
  }, [])

  return (
    <div className="ravenof-body ravenof-in h-full flex flex-col min-h-0" style={{ padding: D ? `${DT.sp.xl}px ${DT.pagePadX}px` : '12px 20px 14px max(20px, env(safe-area-inset-left, 0px))' }}>
      <div className={D ? 'w-full flex-1 min-h-0 flex flex-col' : 'contents'} style={D ? { maxWidth: DT.contentMax, margin: '0 auto', gap: DT.sp.xl } : undefined}>
      {/* Antraštė */}
      <div className="flex items-center shrink-0" style={{ gap: D ? DT.sp.lg : 10, paddingBottom: D ? 0 : 10 }}>
        <button onClick={() => { playUiClick(); router.push('/digital') }} aria-label={t('common.back')} className="ravenof-iconbtn" style={{ fontSize: D ? 22 : 16 }}>‹</button>
        <div>
          <div style={{ font: `700 ${D ? DT.fs.h1 : 15}px var(--ravenof-font-display)`, letterSpacing: D ? 2 : 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('battle.campaign.title')}</div>
          <div style={{ font: `400 ${D ? DT.fs.help : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', marginTop: D ? 4 : undefined }}>{t('battle.campaign.subtitle')}</div>
        </div>
      </div>

      <div className={D ? 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden ravenof-scroll' : 'flex-1 min-h-0 overflow-x-auto ravenof-scroll'}>
        {campaigns === null ? (
          <div className="h-full flex items-center justify-center"><span className="ravenof-spinner" style={{ width: 40, height: 40 }} /></div>
        ) : campaigns.length === 0 ? (
          <p className="text-center py-8" style={{ font: `400 ${D ? DT.fs.body : 13}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('battle.campaign.empty')}</p>
        ) : (
          <div className={D ? 'rvn-d-grid' : 'h-full flex'} style={D ? ({ '--min': '260px', '--max': '340px', '--gap': '20px', justifyContent: 'start' } as React.CSSProperties) : { gap: 14, minWidth: 'min-content' }}>
            {campaigns.map((c, i) => {
              const col = CHAPTER_COLORS[i % CHAPTER_COLORS.length]
              const m = meta[c.id]
              const done = m?.done ?? 0
              const total = m?.total ?? 0
              const complete = total > 0 && done >= total
              const inProgress = done > 0 && !complete
              const barColor = complete ? 'var(--ravenof-success)' : 'var(--ravenof-gold)'
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <Link key={c.id} href={`/digital/campaign/${c.slug}`} onClick={() => playUiClick()}
                  className="ravenof-press relative flex flex-col overflow-hidden shrink-0"
                  style={{ ...(D ? { minHeight: 440 } : { flex: '1 0 220px', maxWidth: 320, minWidth: 220 }), border: inProgress ? '1px solid var(--ravenof-gold)' : '1px solid var(--ravenof-border-strong)', background: 'var(--ravenof-bg-surface)' }}>
                  {/* artas */}
                  {c.coverImageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={c.coverImageUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ opacity: 0.5 }} />
                  )}
                  <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(0deg, rgba(7,6,10,0.96) 30%, rgba(7,6,10,0.45) 60%, rgba(7,6,10,0.25) 100%)' }} />

                  {/* romėniškas skyrius */}
                  <span className="relative flex items-baseline" style={{ gap: 8, padding: D ? '16px 18px 0' : '12px 14px 0' }}>
                    <span style={{ font: `700 ${D ? 28 : 22}px var(--ravenof-font-display)`, color: col }}>{toRoman(i + 1)}</span>
                    <span style={{ font: `${D ? 600 : 500} ${D ? DT.fs.label : 9}px var(--ravenof-font-body)`, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)' }}>{t('battle.campaign.chapter')}</span>
                  </span>

                  <span className="relative flex-1" />

                  <span className="relative" style={{ padding: D ? '0 18px 18px' : '0 14px 12px' }}>
                    <span className={D ? 'block rvn-clamp2' : 'block'} style={{ font: `700 ${D ? 20 : 17}px${D ? '/1.25' : ''} var(--ravenof-font-display)`, letterSpacing: 0.5, color: 'var(--ravenof-text-primary)', textTransform: 'uppercase' }}>{c.title}</span>
                    {c.relatedFactions.length > 0 && (
                      <span className="block truncate" style={{ font: `400 ${D ? DT.fs.help : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', marginTop: D ? 4 : 3 }}>{c.relatedFactions.slice(0, 2).join(' · ')}</span>
                    )}
                    {m?.boss && (
                      <span className="block truncate" style={{ marginTop: D ? 10 : 6 }}>
                        <span style={{ font: `${D ? 600 : 500} ${D ? DT.fs.label : 9}px var(--ravenof-font-body)`, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)' }}>{t('battle.campaign.boss')} </span>
                        <span style={{ font: `700 ${D ? 15 : 13}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)' }}>{m.boss}</span>
                      </span>
                    )}
                    {/* progreso juosta */}
                    <span className="block" style={{ height: D ? 6 : 5, background: 'var(--ravenof-border-strong)', marginTop: D ? 12 : 8, position: 'relative' }}>
                      <span style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: barColor }} />
                    </span>
                    <span className="block" style={{ font: `400 ${D ? DT.fs.help : 10.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', marginTop: D ? 6 : 4 }}>
                      {complete ? t('battle.campaign.completed') : t('battle.campaign.progressOf', { done, total })}
                    </span>
                    {/* CTA */}
                    <span className="block" style={{ marginTop: D ? 14 : 8 }}>
                      {complete ? (
                        <span className="block text-center" style={{ font: `700 ${D ? 13 : 12}px var(--ravenof-font-display)`, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--ravenof-success)', borderTop: '1px solid var(--ravenof-border-strong)', borderBottom: '1px solid var(--ravenof-border-strong)', padding: D ? '13px 0' : '9px 0' }}>{t('battle.campaign.replay')}</span>
                      ) : (
                        <span className="block text-center" style={{ font: `800 ${D ? 14 : 13}px var(--ravenof-font-display)`, letterSpacing: 2.5, textTransform: 'uppercase', background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', padding: D ? '14px 0' : '11px 0', clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)', boxShadow: 'var(--ravenof-shadow-gold-btn)' }}>{inProgress ? t('battle.campaign.continue') : t('battle.campaign.start')}</span>
                      )}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
