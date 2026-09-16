'use client'

// ══════════════════════════════════════════════════════════════════════════════
// „Redaguoti profilį" — KOSMETIKOS PASIRINKIMAS (atstatyta po migracijos).
// Du tab'ai: Avataras · Kortų nugarėlė. Vienas duomenų šaltinis — useCosmetics
// store (katalogas + nuosavybė + aktyvūs), serverinė validacija per
// rvn_set_active_avatar / rvn_set_active_card_back.
//
// Taisyklės (audit Part 3):
//  • didelis aktyvaus vizualo preview (nugarėlė — tikru 1044/1416 kortos santykiu)
//  • turimi pirmiau, užrakinti po jų su gavimo paaiškinimu
//  • PASIRINKTA (auksinė, neinteraktyvi) / PASIRINKTI / užrakinta
//  • skeleton'ai kol kraunasi — jokio default'o mirgėjimo
//  • optimistinis atnaujinimas + rollback + toast; dvigubas paspaudimas blokuojamas
//  • jokių tuščių violetinių panelių ir jokių emoji, kai yra tikras asset'as
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { useEscClose } from '@/lib/useEscClose'
import { useT, useContent } from '@/lib/i18n/react'
import type { Cosmetic } from '@/lib/cosmetics'
import {
  useCosmetics, activeAvatarVisual, activeCardBackVisual,
  DEFAULT_CARD_BACK_SRC, LEGACY_CARD_BACK_SRC,
} from '@/lib/digital/cosmeticsStore'
import { useAccount } from '@/lib/digital/accountStore'
import { useActiveDeck } from '@/lib/digital/activeDeck'

const GOLD = '240,180,41'
const CARD_AR = '1044 / 1416' // kanoninis Ravenof kortos santykis (RavenofCardDetailModal)

type Tab = 'avatar' | 'card_back' | 'deck_avatars'

/** Kaip gaunamas užrakintas daiktas (be atsitiktinių spėjimų — žinomi šaltiniai). */
function lockHintKey(c: Cosmetic): { key: string; params?: Record<string, string | number> } {
  const lvl: Record<string, number> = { basic_card_back: 10, rare_card_back: 20, premium_card_back: 30, legendary_card_back: 40, prestige_card_back: 50, basic_player_avatar: 10, rare_player_avatar: 20, premium_player_avatar: 30, legendary_player_avatar: 40 }
  if (lvl[c.id]) return { key: 'profile.cosmetics.lockLevel', params: { level: lvl[c.id] } }
  if (c.priceGold > 0) return { key: 'profile.cosmetics.lockShopSilver', params: { price: c.priceGold } }
  return { key: 'profile.cosmetics.lockRewards' }
}

function Thumb({ c, kind, size }: { c: Cosmetic; kind: Tab; size: number }) {
  const [bad, setBad] = useState(false)
  const isBack = kind === 'card_back'
  const w = isBack ? size : size
  const h = isBack ? Math.round(size * (1416 / 1044)) : size
  return (
    <span className="relative flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: w, height: h, borderRadius: isBack ? 7 : 999,
        background: c.imageUrl && !bad ? '#0a0810' : (c.css ?? 'linear-gradient(160deg,#1a1325,#0a0810)'),
        border: '1px solid rgba(255,255,255,0.1)' }}>
      {c.imageUrl && !bad
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={c.imageUrl} alt="" onError={() => setBad(true)} className="w-full h-full object-cover" draggable={false} />
        : isBack
          // CSS nugarėlė NIEKADA ne tuščia — bent rėmelis + centrinis ženklas
          ? <span aria-hidden className="absolute inset-1 flex items-center justify-center" style={{ border: `1px solid rgba(${GOLD},0.35)`, borderRadius: 5 }}>
              <span style={{ width: '38%', aspectRatio: '1', borderRadius: 999, border: `1.5px solid rgba(${GOLD},0.5)`, transform: 'rotate(45deg)' }} />
            </span>
          : <span style={{ fontSize: Math.round(size * 0.45) }}>{c.emoji ?? '☠'}</span>}
    </span>
  )
}

export function ProfileCosmeticsModal({ onClose, initialTab = 'avatar' }: { onClose: () => void; initialTab?: Tab }) {
  const t = useT()
  const tc = useContent()
  useEscClose(onClose)
  const cos = useCosmetics()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null)

  useEffect(() => { void useCosmetics.getState().refresh() }, [])
  useEffect(() => { if (!toast) return; const h = setTimeout(() => setToast(null), 2200); return () => clearTimeout(h) }, [toast])

  const items = useMemo(() => {
    const list = cos.items.filter((c) => c.kind === (tab === 'deck_avatars' ? 'avatar' : tab))
    const ownedOf = (c: Cosmetic) => cos.owned.includes(c.id) || !!c.ownedByDefault
    // turimi pirmiau, tada užrakinti; abiejose grupėse — pagal sort/name (serverio tvarka)
    return [...list.filter(ownedOf), ...list.filter((c) => !ownedOf(c))]
  }, [cos.items, cos.owned, tab])

  const activeId = tab === 'card_back' ? cos.active.cardBack : cos.active.avatar
  const activeVis = tab === 'card_back' ? activeCardBackVisual(cos) : activeAvatarVisual(cos)
  // Kaladžių avatarai: turimi avatarai + kaladės iš activeDeck store
  const decks = useActiveDeck()
  useEffect(() => { if (tab === 'deck_avatars' && !decks.loaded && !decks.loading) void decks.refresh() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  const ownedAvatars = useMemo(() => cos.items.filter((c) => c.kind === 'avatar' && (cos.owned.includes(c.id) || !!c.ownedByDefault)), [cos.items, cos.owned])
  const [deckPick, setDeckPick] = useState<string | null>(null)
  const assignDeckAvatar = async (deckId: string, avatarId: string | null) => {
    playUiClick()
    const r = await useActiveDeck.getState().setDeckAvatar(deckId, avatarId)
    if (r.ok) { playSuccess(); setToast({ msg: t('profile.cosmetics.deckAvatarSet') }); setDeckPick(null) }
    else { playError(); setToast({ msg: t('profile.cosmetics.failedToast'), err: true }) }
  }

  const pick = async (c: Cosmetic) => {
    if (cos.busy || activeId === c.id) return
    playUiClick()
    const r = tab === 'avatar'
      ? await useCosmetics.getState().setActiveAvatar(c.id)
      : await useCosmetics.getState().setActiveCardBack(c.id)
    if (r.ok) {
      playSuccess()
      setToast({ msg: t('profile.cosmetics.selectedToast', { name: tc('cosmetic', c.id, 'name', c.name) }) })
      void useAccount.getState().refresh({ force: true })
    } else {
      playError()
      setToast({ msg: r.reason === 'locked' ? t('profile.cosmetics.lockedToast') : t('profile.cosmetics.failedToast'), err: true })
    }
  }

  const skeleton = (
    <div className="grid gap-2 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }} aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="rvn-skeleton" style={{ height: tab === 'card_back' ? 150 : 110, borderRadius: 10 }} />
      ))}
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2" role="dialog" aria-modal="true" aria-label={t('profile.cosmetics.title')}
      style={{ background: 'rgba(4,3,8,0.9)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col"
        style={{ width: 'min(960px, 98vw)', height: 'min(580px, 96vh)', borderRadius: 16,
          background: `radial-gradient(120% 60% at 50% 0%, rgba(${GOLD},0.08), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))`,
          border: `1.5px solid rgba(${GOLD},0.45)`, boxShadow: '0 18px 60px rgba(0,0,0,0.75)' }}>

        {/* Antraštė + tab'ai */}
        <div className="shrink-0 flex items-center gap-2 px-4 pt-3 pb-2" style={{ borderBottom: `1px solid rgba(${GOLD},0.18)` }}>
          <h2 style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 15, letterSpacing: '0.08em', margin: 0 }}>{t('profile.cosmetics.title')}</h2>
          <div className="flex ml-3" style={{ border: '1px solid rgba(255,255,255,0.14)' }}>
            {(['avatar', 'card_back', 'deck_avatars'] as const).map((k) => (
              <button key={k} onClick={() => { playUiClick(); setTab(k) }} aria-pressed={tab === k}
                style={{ minHeight: 36, padding: '0 14px', border: 0, cursor: 'pointer',
                  font: '700 11px var(--rvn-font-display)', letterSpacing: 1, textTransform: 'uppercase',
                  background: tab === k ? 'var(--ravenof-grad-gold, linear-gradient(180deg,#ffe28c,#f3b62c))' : 'transparent',
                  color: tab === k ? '#3a2406' : 'var(--text-muted)' }}>
                {t(k === 'avatar' ? 'profile.cosmetics.tabAvatar' : k === 'card_back' ? 'profile.cosmetics.tabCardBack' : 'profile.cosmetics.tabDeckAvatars')}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="rvn-press flex items-center justify-center rounded-full"
            style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
        </div>

        {tab === 'deck_avatars' ? (
          <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll p-3 flex flex-col" style={{ gap: 8 }}>
            <p style={{ font: '400 11.5px var(--rvn-font-body, sans-serif)', color: 'var(--text-muted)', margin: 0 }}>{t('profile.cosmetics.deckAvatarsHint')}</p>
            {!decks.loaded ? <div className="rvn-skeleton" style={{ height: 120, borderRadius: 10 }} />
              : decks.decks.length === 0 ? <p className="text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>{t('profile.cosmetics.deckNone')}</p>
              : decks.decks.map((d) => {
                const bound = d.boundAvatar ? ownedAvatars.find((a) => a.id === d.boundAvatar) ?? cos.items.find((a) => a.id === d.boundAvatar) ?? null : null
                const vis = bound ?? null
                const globalVis = activeAvatarVisual(cos)
                const open = deckPick === d.id
                return (
                  <div key={d.id} className="rounded-xl px-3 py-2" style={{ background: 'rgba(10,8,16,0.72)', border: `1px solid ${open ? `rgba(${GOLD},0.5)` : 'rgba(255,255,255,0.12)'}` }}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="relative overflow-hidden shrink-0 flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 999, border: `2px solid ${bound ? `rgb(${GOLD})` : 'rgba(255,255,255,0.18)'}`, background: '#0a0810' }}>
                        {(vis?.imageUrl ?? globalVis.url)
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={vis?.imageUrl ?? globalVis.url ?? ''} alt="" className="w-full h-full object-cover" draggable={false} />
                          : <span style={{ fontSize: 20 }}>{vis?.emoji ?? globalVis.emoji ?? '☠'}</span>}
                      </span>
                      <div className="min-w-0 flex-1" style={{ minWidth: 160 }}>
                        <p className="truncate" style={{ font: '700 13px var(--rvn-font-display)', color: d.factionColor ?? '#f3ead3', margin: 0 }}>{d.name}{d.id === decks.activeDeckId ? <span style={{ font: '700 8.5px var(--rvn-font-display)', letterSpacing: 1, color: 'var(--gold)', marginLeft: 8, textTransform: 'uppercase' }}>★ {t('decks.active.isActive')}</span> : null}</p>
                        <p style={{ font: '400 11px var(--rvn-font-body, sans-serif)', color: 'var(--text-muted)', margin: 0 }}>
                          {d.faction ?? '—'} · {bound ? tc('cosmetic', bound.id, 'name', bound.name) : `${t('profile.cosmetics.deckGlobal')} (${globalVis.id ? tc('cosmetic', globalVis.id, 'name', globalVis.name) : globalVis.name})`}
                        </p>
                      </div>
                      <span className="flex gap-1.5 shrink-0">
                        <button onClick={() => { playUiClick(); setDeckPick(open ? null : d.id) }} className="rvn-press px-3 py-1.5 rounded-lg" style={{ font: '700 10.5px var(--rvn-font-display)', letterSpacing: 1, textTransform: 'uppercase', background: open ? `rgb(${GOLD})` : `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.5)`, color: open ? '#3a2406' : 'var(--gold)', cursor: 'pointer' }}>
                          {open ? t('common.close') : t('profile.cosmetics.selectCta')}
                        </button>
                        {d.boundAvatar && <button onClick={() => void assignDeckAvatar(d.id, null)} className="rvn-press px-3 py-1.5 rounded-lg" style={{ font: '600 10.5px var(--rvn-font-body, sans-serif)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#c9bfa8', cursor: 'pointer' }}>{t('decks.active.useGlobal')}</button>}
                      </span>
                    </div>
                    {open && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {ownedAvatars.map((a) => (
                          <button key={a.id} title={tc('cosmetic', a.id, 'name', a.name)} onClick={() => void assignDeckAvatar(d.id, a.id)} className="rvn-press shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                            style={{ width: 48, height: 48, border: `2px solid ${d.boundAvatar === a.id ? `rgb(${GOLD})` : 'rgba(255,255,255,0.15)'}`, background: '#0a0810', cursor: 'pointer' }}>
                            {a.imageUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={a.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                              : <span style={{ fontSize: 20 }}>{a.emoji ?? '☠'}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        ) : (
        <div className="flex-1 min-h-0 flex gap-3 p-3">
          {/* KAIRĖ: didelis aktyvaus preview */}
          <div className="shrink-0 flex flex-col items-center gap-2 overflow-y-auto" style={{ width: 220 }}>
            {!cos.loaded ? (
              <div className="rvn-skeleton" style={{ width: tab === 'card_back' ? 170 : 160, height: tab === 'card_back' ? 231 : 160, borderRadius: tab === 'card_back' ? 10 : 999 }} />
            ) : tab === 'card_back' ? (
              <span className="relative overflow-hidden shrink-0" style={{ width: 170, aspectRatio: CARD_AR, borderRadius: 10,
                border: `2px solid rgba(${GOLD},0.55)`, boxShadow: `0 10px 30px rgba(0,0,0,0.7), 0 0 18px rgba(${GOLD},0.2)`,
                background: activeVis.url ? '#0a0810' : (activeVis.css ?? '#0a0810') }}>
                {activeVis.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeVis.url} alt={activeVis.name}
                    onError={(e) => { const el = e.currentTarget; if (el.src.indexOf('back.webp') < 0) el.src = el.src.includes('ravenof-default') ? LEGACY_CARD_BACK_SRC : DEFAULT_CARD_BACK_SRC }}
                    className="w-full h-full object-cover" draggable={false} />
                )}
              </span>
            ) : (
              <span className="relative overflow-hidden shrink-0 flex items-center justify-center" style={{ width: 160, height: 160, borderRadius: 999,
                border: `2.5px solid rgba(${GOLD},0.6)`, boxShadow: `0 0 22px rgba(${GOLD},0.25)`,
                background: activeVis.url ? '#0a0810' : 'radial-gradient(circle at 50% 32%, #3a2a4e, #0c0a14)' }}>
                {activeVis.url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={activeVis.url} alt={activeVis.name} className="w-full h-full object-cover" draggable={false} />
                  : <span style={{ fontSize: 64 }}>{activeVis.emoji ?? '☠'}</span>}
              </span>
            )}
            {cos.loaded && (
              <>
                <p className="text-center" style={{ font: '700 13px var(--rvn-font-display)', color: '#f3ead3', margin: 0 }}>
                  {activeVis.id ? tc('cosmetic', activeVis.id, 'name', activeVis.name) : activeVis.name}
                </p>
                <p className="text-center" style={{ font: '600 9px var(--rvn-font-display)', letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase', margin: 0 }}>
                  ★ {t('profile.cosmetics.selectedBadge')}
                </p>
              </>
            )}
          </div>

          {/* DEŠINĖ: grid — turimi pirmiau, užrakinti po jų */}
          <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll" style={{ paddingRight: 2 }}>
            {!cos.loaded ? skeleton : cos.error ? (
              <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>{t('progression.common.errorBody')}</p>
            ) : (
              <div className="grid gap-2 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))' }}>
                {items.map((c) => {
                  const owned = cos.owned.includes(c.id) || !!c.ownedByDefault
                  const selected = activeId === c.id
                  const hint = lockHintKey(c)
                  return (
                    <button key={c.id} onClick={() => owned && !selected ? void pick(c) : undefined}
                      disabled={cos.busy || (!owned) || selected}
                      aria-pressed={selected}
                      title={owned ? undefined : t(hint.key, hint.params)}
                      className="rvn-press relative flex flex-col items-center gap-1.5 p-2"
                      style={{ borderRadius: 10, cursor: owned && !selected ? 'pointer' : 'default',
                        background: 'rgba(10,8,16,0.72)',
                        border: selected ? `2px solid rgb(${GOLD})` : `1px solid ${owned ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'}`,
                        boxShadow: selected ? `0 0 14px rgba(${GOLD},0.4)` : 'none',
                        opacity: owned ? 1 : 0.55, minHeight: 44 }}>
                      <Thumb c={c} kind={tab} size={tab === 'card_back' ? 70 : 62} />
                      <span className="w-full text-center truncate" style={{ font: '600 9.5px var(--rvn-font-body, sans-serif)', color: '#f3ead3' }}>
                        {tc('cosmetic', c.id, 'name', c.name)}
                      </span>
                      {selected ? (
                        <span style={{ font: '800 8.5px var(--rvn-font-display)', letterSpacing: 1, color: '#3a2406', background: `rgb(${GOLD})`, padding: '2px 8px', borderRadius: 3, textTransform: 'uppercase' }}>★ {t('profile.cosmetics.selectedBadge')}</span>
                      ) : owned ? (
                        <span style={{ font: '700 8.5px var(--rvn-font-display)', letterSpacing: 1, color: 'var(--gold)', border: `1px solid rgba(${GOLD},0.5)`, padding: '2px 8px', borderRadius: 3, textTransform: 'uppercase' }}>{t('profile.cosmetics.selectCta')}</span>
                      ) : (
                        <span className="w-full text-center" style={{ font: '400 8px var(--rvn-font-body, sans-serif)', color: 'var(--text-muted)', lineHeight: 1.3 }}>🔒 {t(hint.key, hint.params)}</span>
                      )}
                    </button>
                  )
                })}
                {items.length === 0 && <p className="col-span-full text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>{t('common.cosmetics.categoryEmpty')}</p>}
              </div>
            )}
          </div>
        </div>
        )}

        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 14, padding: '7px 16px', borderRadius: 999, font: '600 11px var(--rvn-font-body, sans-serif)',
            background: 'rgba(10,8,16,0.96)', border: `1px solid ${toast.err ? 'rgba(198,85,99,0.6)' : `rgba(${GOLD},0.5)`}`, color: toast.err ? '#c65563' : 'var(--gold)' }}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>, document.body)
}
