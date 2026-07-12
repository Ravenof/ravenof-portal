'use client'

// ══════════════════════════════════════════════════════════════════════════════
// ActiveDeckSelectorModal — globalus aktyvios kaladės pasirinkimas.
// Horizontali fokusuojanti karuselė (kaladės kaip fizinės dėžutės ant stalo) +
// detalių panelė (validacija tekstu+ikona, NUSTATYTI AKTYVIA / REDAGUOTI) +
// AVATARAS ŠIAI KALADEI (globalus / pasirinkti / nuimti — decks.bound_avatar).
// Pasiekiamas iš: Home kortelės, kovos setup santraukų, kaladžių sąrašo.
// Uždarius be patvirtinimo aktyvi kaladė NEKEIČIAMA.
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useActiveDeck, deckValidity, type ActiveDeckInfo } from '@/lib/digital/activeDeck'
import { HorizontalFocusCarousel } from '@/components/digital/ui/HorizontalFocusCarousel'
import { getCosmetics, type Cosmetic } from '@/lib/cosmetics'
import { SmartImg } from '@/components/ui/SmartImg'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { useEscClose } from '@/lib/useEscClose'
import { useT } from '@/lib/i18n/react'
import { formatDate } from '@/lib/i18n/core'

const GOLD = '240,180,41'

function DeckTile({ d, active, focused, pending }: { d: ActiveDeckInfo; active: boolean; focused: boolean; pending: boolean }) {
  const t = useT()
  const v = deckValidity(d)
  const col = d.factionColor ?? '#f0b429'
  return (
    <div className="relative overflow-hidden" data-pending={pending || undefined} style={{ aspectRatio: '3/4', borderRadius: 14,
      border: `2px solid ${pending ? '#4ade80' : focused ? col : 'rgba(255,255,255,0.14)'}`,
      boxShadow: pending ? `0 10px 30px rgba(0,0,0,0.7), 0 0 22px rgba(74,222,128,0.5), inset 0 0 0 1.5px rgba(74,222,128,0.8)` : focused ? `0 10px 30px rgba(0,0,0,0.7), 0 0 22px ${col}55` : '0 6px 18px rgba(0,0,0,0.55)',
      background: `linear-gradient(165deg, ${col}22, #0d0a14 70%)` }}>
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.5 }}>
        {d.factionIcon ? <SmartImg src={d.factionIcon} width={140} alt="" style={{ width: '52%', objectFit: 'contain' }} /> : <span style={{ fontSize: 40 }}>🎴</span>}
      </div>
      {active && <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full font-bold" style={{ fontSize: 8.5, background: 'rgba(52,211,153,0.92)', color: '#06281c' }}>{t('decks.active.badge')}</span>}
      {pending && !active && <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full font-bold" style={{ fontSize: 8.5, background: 'rgba(74,222,128,0.25)', border: '1px solid rgba(74,222,128,0.8)', color: '#4ade80' }}>{t('decks.active.picked')}</span>}
      {d.boundAvatar && <span className="absolute top-1.5 right-1.5" title={t('home.deckHasAvatar')} style={{ fontSize: 12 }}>👤</span>}
      <div className="absolute inset-x-0 bottom-0 px-2 pt-5 pb-1.5" style={{ background: 'linear-gradient(0deg, rgba(5,4,9,0.97) 55%, transparent)' }}>
        <p className="font-extrabold leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={d.name}>{d.name}</p>
        <p className="truncate" style={{ fontSize: 9, color: col }}>{d.faction ?? '—'} · {t('decks.cardsShort', { count: d.cardCount })}</p>
        <p style={{ fontSize: 9, color: v.valid ? '#4ade80' : '#fbbf24' }}>{v.valid ? t('decks.active.readyBattle') : `⚠ ${v.reason}`}</p>
      </div>
    </div>
  )
}

export function ActiveDeckSelectorModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const router = useRouter()
  const st = useActiveDeck()
  const [focus, setFocus] = useState(0)
  // ATSKIRTOS būsenos: persisted (serveris) / focused (centre) / pending (sąmoningai pažymėta)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [avatars, setAvatars] = useState<Cosmetic[]>([])
  const [avatarPick, setAvatarPick] = useState(false)
  const [busy, setBusy] = useState(false)
  useEscClose(onClose)

  useEffect(() => {
    void st.refresh()
    getCosmetics().then((c) => { if (c) setAvatars((c.items ?? []).filter((x) => x.kind === 'avatar' && ((c.owned ?? []).includes(x.id) || x.ownedByDefault))) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // pradinis fokusas = aktyvi kaladė
  useEffect(() => {
    if (!st.loaded || st.decks.length === 0) return
    const i = st.decks.findIndex((d) => d.id === st.activeDeckId)
    if (i >= 0) setFocus(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.loaded])

  const cur = st.decks[Math.min(focus, Math.max(0, st.decks.length - 1))] ?? null
  const v = deckValidity(cur)
  const isActive = !!cur && cur.id === st.activeDeckId
  const boundAvatarObj = useMemo(() => avatars.find((a) => a.id === cur?.boundAvatar) ?? null, [avatars, cur?.boundAvatar])

  const setActive = async () => {
    const target = st.decks.find((d) => d.id === (pendingId ?? cur?.id)) ?? cur
    if (!target || busy || target.id === st.activeDeckId) return
    setBusy(true)
    const r = await st.setActive(target.id)
    setBusy(false)
    if (r.ok) { playSuccess(); setPendingId(null) } else playError()
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[340] flex items-center justify-center p-2" style={{ background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)' }} onClick={onClose} role="dialog" aria-modal="true" aria-label={t('decks.active.modalAria')}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col" data-testid="active-deck-modal"
        style={{ width: 'min(980px, 98vw)', height: 'min(560px, 96vh)', borderRadius: 20,
          background: `radial-gradient(120% 60% at 50% 0%, rgba(${GOLD},0.1), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))`,
          border: `1.5px solid rgba(${GOLD},0.5)`, boxShadow: '0 18px 60px rgba(0,0,0,0.75)' }}>
        <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-1.5">
          <h2 style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 'clamp(13px,2.6vh,17px)', letterSpacing: '0.08em' }}>{t('decks.active.modalTitle')}</h2>
          <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="rvn-press flex items-center justify-center rounded-full" style={{ width: 30, height: 30, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
        </div>

        {!st.loaded ? (
          <p className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
        ) : st.decks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
            <span style={{ fontSize: 30 }}>🎴</span>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('decks.active.noDecks')}</p>
            <button onClick={() => { playUiClick(); onClose(); router.push('/digital/decks?tab=builder') }} className="rvn-press px-5 py-2 rounded-xl text-sm font-bold" style={{ background: `rgba(${GOLD},0.15)`, border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}>{t('decks.active.createDeck')}</button>
          </div>
        ) : (
          <>
            {/* karuselė */}
            <div className="shrink-0">
              <HorizontalFocusCarousel
                items={st.decks} keyOf={(d) => d.id} focus={focus} onFocus={setFocus}
                onPick={(d) => { setPendingId(d.id) }}
                itemWidth={150} ariaLabel={t('decks.active.carouselAria')} edgePad="34%"
                renderItem={(d, { focused }) => <DeckTile d={d} active={d.id === st.activeDeckId} focused={focused} pending={d.id === pendingId} />} />
            </div>

            {/* detalės + veiksmai */}
            {cur && (
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 pt-1.5">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="min-w-0 flex-1" style={{ minWidth: 200 }}>
                    <p className="font-black" style={{ fontFamily: 'var(--rvn-font-display)', color: cur.factionColor ?? 'var(--gold)', fontSize: 15, lineHeight: 1.25 }}>{cur.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cur.faction ?? t('decks.active.noFaction')} · {t('decks.cardsShort', { count: cur.cardCount })}{cur.updatedAt ? ` · ${t('decks.active.edited', { date: formatDate(cur.updatedAt) })}` : ''}</p>
                    <p data-testid="deck-validity" className="mt-0.5 font-bold" style={{ fontSize: 11.5, color: v.valid ? '#4ade80' : '#fbbf24' }}>{v.valid ? t('decks.active.readyBattle') : `⚠ ${v.reason}`}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button data-testid="set-active" onClick={() => void setActive()} disabled={busy || (pendingId ?? cur.id) === st.activeDeckId}
                      className="rvn-press px-4 rounded-xl font-extrabold disabled:opacity-50"
                      style={{ height: 40, fontSize: 12.5, fontFamily: 'var(--rvn-font-display)',
                        background: isActive ? 'rgba(52,211,153,0.16)' : 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)',
                        color: isActive ? '#4ade80' : '#3a2406', border: isActive ? '1px solid rgba(52,211,153,0.5)' : '1px solid #ffeaa6' }}>
                      {(pendingId ?? cur.id) === st.activeDeckId ? '★ AKTYVI' : busy ? 'Saugoma…' : '★ NUSTATYTI AKTYVIA'}
                    </button>
                    <button onClick={() => { playUiClick(); onClose(); router.push('/digital/decks?tab=builder&deck=' + cur.id) }}
                      className="rvn-press px-4 rounded-xl font-bold" style={{ height: 40, fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', color: '#e8dfc8' }}>
                      ✎ Redaguoti
                    </button>
                  </div>
                </div>

                {/* avataras šiai kaladei */}
                <div className="mt-2.5 rounded-xl px-3 py-2" style={{ background: 'rgba(10,8,16,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold" style={{ fontSize: 10.5, color: 'var(--gold)', letterSpacing: '0.06em' }}>{t('decks.active.avatarForDeck')}</p>
                    <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#c9bfa8' }}>
                      {boundAvatarObj
                        ? <>{boundAvatarObj.imageUrl ? <SmartImg src={boundAvatarObj.imageUrl} width={48} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} /> : <span>{boundAvatarObj.emoji ?? '👤'}</span>}{boundAvatarObj.name}</>
                        : t('decks.active.globalAvatarUsed')}
                    </span>
                    <span className="ml-auto flex gap-1.5">
                      <button data-testid="avatar-pick" onClick={() => { playUiClick(); setAvatarPick((x) => !x) }} className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold" style={{ background: `rgba(${GOLD},0.12)`, border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}>{avatarPick ? t('decks.active.collapse') : t('decks.active.pickAvatar')}</button>
                      {cur.boundAvatar && (
                        <button onClick={async () => { playUiClick(); await st.setDeckAvatar(cur.id, null) }} className="px-2.5 py-1 rounded-lg text-[10.5px]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#c9bfa8' }}>{t('decks.active.useGlobal')}</button>
                      )}
                    </span>
                  </div>
                  {avatarPick && (
                    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                      {avatars.length === 0 && <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{t('decks.active.noAvatars')}</p>}
                      {avatars.map((a) => (
                        <button key={a.id} title={a.name} onClick={async () => { playUiClick(); const r = await st.setDeckAvatar(cur.id, a.id); if (r.ok) playSuccess() }}
                          className="shrink-0 rounded-full overflow-hidden" style={{ width: 40, height: 40, border: `2px solid ${cur.boundAvatar === a.id ? 'var(--gold)' : 'rgba(255,255,255,0.15)'}` }}>
                          {a.imageUrl ? <SmartImg src={a.imageUrl} width={80} alt={a.name} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center" style={{ background: a.css ?? '#241a35', fontSize: 18 }}>{a.emoji ?? '👤'}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>, document.body)
}

// ── Kompaktiška aktyvios kaladės santrauka kovos setup ekranams ───────────────
export function ActiveDeckSummary({ accent = GOLD, invalidHint, compact }: { accent?: string; invalidHint?: string; compact?: boolean }) {
  const t = useT()
  const st = useActiveDeck()
  const [open, setOpen] = useState(false)
  useEffect(() => { if (!st.loaded && !st.loading) void st.refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const d = st.decks.find((x) => x.id === st.activeDeckId) ?? null
  const v = deckValidity(d)
  return (
    <>
      <div data-testid="active-deck-summary" className="flex items-center min-w-0" style={{ background: 'rgba(10,8,16,0.6)', border: `1px solid rgba(${accent},0.35)`, borderRadius: compact ? 10 : 12, padding: compact ? '4px 10px' : '8px 12px', gap: compact ? 8 : 10 }}>
        <span className="shrink-0" style={{ fontSize: compact ? 14 : 18 }}>🎴</span>
        {compact ? (
          <span className="min-w-0 flex-1 flex items-baseline gap-1.5">
            <span className="truncate font-bold shrink-0" style={{ fontSize: 12, color: '#f3ead3', maxWidth: '45%' }} title={d?.name ?? undefined}>
              {!st.loaded ? t('common.loading') : d ? d.name : t('decks.active.noActive')}
            </span>
            <span className="truncate" style={{ fontSize: 10, color: v.valid ? '#4ade80' : '#fbbf24' }}>
              {d ? `${d.faction ?? '—'} · ${t('decks.cardsShort', { count: d.cardCount })} · ` : ''}{v.valid ? t('decks.active.ready') : `⚠ ${invalidHint ?? v.reason}`}
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold" style={{ fontSize: 12.5, color: '#f3ead3' }} title={d?.name ?? undefined}>
              {!st.loaded ? t('common.loading') : d ? d.name : t('decks.active.noActive')}
            </span>
            <span className="block truncate" style={{ fontSize: 10, color: v.valid ? '#4ade80' : '#fbbf24' }}>
              {d ? `${d.faction ?? '—'} · ${t('decks.cardsShort', { count: d.cardCount })} · ` : ''}{v.valid ? t('decks.active.ready') : `⚠ ${invalidHint ?? v.reason}`}
            </span>
          </span>
        )}
        <button data-testid="change-deck" onClick={() => { playUiClick(); setOpen(true) }}
          className="rvn-press shrink-0 rounded-lg font-bold" style={{ fontSize: compact ? 10 : 11, padding: compact ? '3px 10px' : '6px 12px', background: `rgba(${accent},0.14)`, border: `1px solid rgba(${accent},0.5)`, color: `rgb(${accent})` }}>
          {t('decks.active.change')}
        </button>
      </div>
      {open && <ActiveDeckSelectorModal onClose={() => setOpen(false)} />}
    </>
  )
}
