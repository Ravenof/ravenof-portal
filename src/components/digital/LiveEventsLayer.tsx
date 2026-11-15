'use client'

// ── Live eventų sluoksnis ────────────────────────────────────────────────────
//   • <LiveEventsLayer/>  – layout'e: pilno ekrano pop-up įjungus žaidimą,
//     evento langas paspaudus banerį, evento parduotuvė.
//   • <LiveEventBanner/>  – mažas baneris pradžios ekrane (iškirpta paveikslo juosta).
// Duomenys – useLiveEvents (lib/digital/liveEvents.ts). Kol migracija nepaleista
// arba eventų nėra, nieko nerodoma.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { useLocale } from '@/lib/i18n/react'
import { emitWalletChanged } from '@/lib/digital/native'
import { getNoviceState } from '@/lib/digital/novice'
import {
  useLiveEvents, pickPopupEvent, markEventSeen, eventTitle, eventBody, formatRemaining, rewardLabel, multiplierLabel,
  getEventShop, buyEventShopItem, type LiveEvent, type EventReward, type EventShopItem,
} from '@/lib/digital/liveEvents'

const L = (locale: string, lt: string, en: string) => (locale === 'en' ? en : lt)

function useNow(stepMs = 30000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), stepMs); return () => clearInterval(i) }, [stepMs])
  return now
}

function focusPos(e: { imageFocus: [number, number] | null }): string {
  const f = e.imageFocus ?? [50, 50]
  return `${f[0] ?? 50}% ${f[1] ?? 50}%`
}

function TokenGlyph({ size = 12 }: { size?: number }) {
  return <span aria-hidden style={{ display: 'inline-block', width: size, height: size, transform: 'rotate(45deg)', background: 'linear-gradient(135deg,#9be7ff,#5a7bff)', boxShadow: '0 0 6px rgba(120,170,255,.7)', flex: '0 0 auto' }} />
}

function RewardChips({ rewards, locale, dim = false }: { rewards: EventReward[]; locale: string; dim?: boolean }) {
  if (!rewards?.length) return null
  return (
    <div className="flex flex-wrap" style={{ gap: 6 }}>
      {rewards.map((r, i) => (
        <span key={i} className="inline-flex items-center" style={{ gap: 6, padding: '5px 10px', font: '600 12px var(--ravenof-font-body)', color: dim ? 'var(--ravenof-text-secondary)' : 'var(--ravenof-text-primary)', background: 'rgba(7,6,10,.72)', border: '1px solid rgba(212,163,59,.4)' }}>
          {r.type === 'event_tokens' && <TokenGlyph />}
          {rewardLabel(r, locale)}
        </span>
      ))}
    </div>
  )
}

// ── Evento langas (pilnas ekranas) ───────────────────────────────────────────
function EventScreen({ event, onClose }: { event: LiveEvent; onClose: () => void }) {
  const locale = useLocale()
  const router = useRouter()
  const now = useNow(15000)
  const { claim, skewMs, tokens, openShop } = useLiveEvents()
  const [busy, setBusy] = useState(false)
  const [granted, setGranted] = useState<EventReward[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const c = event.claim
  const remaining = event.endsAt ? new Date(event.endsAt).getTime() - (now + skewMs) : null
  const mult = multiplierLabel(event, locale)

  const doClaim = useCallback(async () => {
    if (busy) return
    setBusy(true); setErr(null)
    const r = await claim(event.id)
    setBusy(false)
    if (r.ok) { setGranted(r.granted ?? []); emitWalletChanged(); try { playSuccess() } catch { /* garsas niekada nelaužia UI */ } }
    else setErr(r.error === 'already_claimed' ? L(locale, 'Šiandien jau atsiimta.', 'Already claimed today.') : L(locale, 'Nepavyko atsiimti. Bandyk dar kartą.', 'Could not claim. Try again.'))
  }, [busy, claim, event.id, locale])

  const go = () => { playUiClick(); onClose(); if (event.ctaRoute) router.push(event.ctaRoute) }

  return (
    <div className="fixed inset-0 flex" style={{ zIndex: 260, background: '#07060a' }} role="dialog" aria-modal="true" data-testid="live-event-screen">
      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.imageUrl} alt="" className="absolute inset-0" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focusPos(event) }} />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(7,6,10,.94) 0%, rgba(7,6,10,.78) 34%, rgba(7,6,10,.18) 68%, rgba(7,6,10,.05) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,6,10,.35) 0%, rgba(7,6,10,0) 30%, rgba(7,6,10,.75) 100%)' }} />
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 4, background: event.accent }} />

      <div className="relative flex flex-col justify-center" style={{ width: 'min(560px, 62vw)', padding: 'clamp(16px, 4vh, 44px) clamp(18px, 4vw, 56px)', gap: 'clamp(8px, 1.6vh, 16px)' }}>
        <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
          <span style={{ font: '700 11px var(--ravenof-font-body)', letterSpacing: 3, textTransform: 'uppercase', color: '#07060a', background: event.accent, padding: '3px 10px' }}>{L(locale, 'Eventas', 'Event')}</span>
          {remaining != null && <span style={{ font: '500 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{L(locale, 'Liko', 'Ends in')} {formatRemaining(remaining, locale)}</span>}
        </div>
        <h2 style={{ font: '700 clamp(24px, 5.4vh, 46px) var(--ravenof-font-display)', lineHeight: 1.05, color: 'var(--ravenof-text-primary)', textShadow: '0 3px 18px rgba(0,0,0,.9)', margin: 0 }}>{eventTitle(event, locale)}</h2>
        {eventBody(event, locale) && <p style={{ font: '400 clamp(13px, 2.3vh, 17px) var(--ravenof-font-body)', lineHeight: 1.45, color: 'var(--ravenof-text-secondary)', margin: 0, maxWidth: 460 }}>{eventBody(event, locale)}</p>}
        {mult && <div style={{ font: '700 clamp(15px, 2.8vh, 22px) var(--ravenof-font-display)', color: event.accent }}>{mult}</div>}

        {c && c.mode === 'calendar' && c.calendar && (
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {c.calendar.map((_, i) => {
              const done = i < (c.claimedDays ?? 0) + (granted ? 0 : 0)
              const today = i === (c.claimedDays ?? 0) && c.claimable
              return (
                <span key={i} title={(c.calendar![i] ?? []).map((r) => rewardLabel(r, locale)).join(', ')} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', font: '700 13px var(--ravenof-font-display)', color: done ? '#07060a' : today ? event.accent : 'var(--ravenof-text-secondary)', background: done ? event.accent : 'rgba(7,6,10,.7)', border: `1px solid ${today || done ? event.accent : 'rgba(255,255,255,.18)'}` }}>
                  {done ? '✓' : i + 1}
                </span>
              )
            })}
          </div>
        )}

        {c && !granted && c.rewards?.length > 0 && (
          <div>
            <div style={{ font: '500 10px var(--ravenof-font-body)', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)', marginBottom: 6 }}>
              {c.mode === 'calendar' ? L(locale, `${c.day} diena iš ${c.total}`, `Day ${c.day} of ${c.total}`) : L(locale, 'Dovana', 'Gift')}
            </div>
            <RewardChips rewards={c.rewards} locale={locale} dim={!c.claimable} />
          </div>
        )}
        {granted && (
          <div data-testid="live-event-granted">
            <div style={{ font: '700 13px var(--ravenof-font-display)', letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-success-bright, #5fd6a8)', marginBottom: 6 }}>{L(locale, 'Atsiimta', 'Claimed')}</div>
            <RewardChips rewards={granted} locale={locale} />
          </div>
        )}
        {err && <div style={{ font: '500 12px var(--ravenof-font-body)', color: '#f08a8a' }}>{err}</div>}

        <div className="flex flex-wrap items-center" style={{ gap: 10, marginTop: 'clamp(4px, 1.4vh, 14px)' }}>
          {c?.claimable && !granted ? (
            <button className="ravenof-btn ravenof-btn-primary" disabled={busy} onClick={() => { playUiClick(); void doClaim() }} data-testid="live-event-claim">
              {busy ? L(locale, 'Atsiimama…', 'Claiming…') : L(locale, 'Atsiimti', 'Claim')}
            </button>
          ) : event.ctaRoute ? (
            <button className="ravenof-btn ravenof-btn-primary" onClick={go}>{L(locale, 'Pirmyn', 'Go')}</button>
          ) : null}
          <button className="ravenof-btn ravenof-btn-secondary" onClick={() => { playUiClick(); onClose() }} data-testid="live-event-close">{L(locale, 'Uždaryti', 'Close')}</button>
          <button onClick={() => { playUiClick(); onClose(); openShop(true) }} className="inline-flex items-center" style={{ gap: 7, background: 'none', border: 0, cursor: 'pointer', font: '600 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', padding: '6px 4px' }}>
            <TokenGlyph /> {tokens} · {L(locale, 'Evento parduotuvė', 'Event shop')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Evento parduotuvė ────────────────────────────────────────────────────────
function EventShop({ onClose }: { onClose: () => void }) {
  const locale = useLocale()
  const [items, setItems] = useState<EventShopItem[] | null>(null)
  const [tokens, setTokens] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(() => { getEventShop().then((s) => { setItems(s?.items ?? []); setTokens(s?.tokens ?? 0) }) }, [])
  useEffect(() => { load() }, [load])

  const buy = async (it: EventShopItem) => {
    if (busy) return
    setBusy(it.id); setMsg(null)
    const r = await buyEventShopItem(it.id)
    setBusy(null)
    if (r.ok) { try { playSuccess() } catch { /* */ } emitWalletChanged(); setMsg(L(locale, 'Nupirkta.', 'Purchased.')); load() }
    else setMsg(r.error === 'not_enough' ? L(locale, 'Neužtenka žetonų.', 'Not enough tokens.') : r.error === 'owned' ? L(locale, 'Jau turi.', 'Already owned.') : r.error === 'limit' ? L(locale, 'Pasiektas limitas.', 'Limit reached.') : L(locale, 'Nepavyko nupirkti.', 'Purchase failed.'))
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 262, background: 'rgba(4,3,8,.86)' }} role="dialog" aria-modal="true" data-testid="event-shop" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col" style={{ width: 'min(880px, 94vw)', maxHeight: '90vh', background: 'var(--ravenof-bg-surface, #14111a)', border: '1px solid var(--ravenof-border-strong, #3d3345)' }}>
        <div className="flex items-center justify-between shrink-0" style={{ padding: '12px 16px', borderBottom: '1px solid var(--ravenof-border-hairline, #2a2430)' }}>
          <div>
            <div style={{ font: '700 18px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{L(locale, 'Evento parduotuvė', 'Event shop')}</div>
            <div style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{L(locale, 'Žetonus gauni iš eventų. Jie niekur nedingsta.', 'Tokens come from events. They never expire.')}</div>
          </div>
          <div className="flex items-center" style={{ gap: 14 }}>
            <span className="inline-flex items-center" style={{ gap: 7, font: '700 15px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}><TokenGlyph size={13} /> {tokens}</span>
            <button className="ravenof-btn ravenof-btn-secondary" onClick={() => { playUiClick(); onClose() }}>{L(locale, 'Uždaryti', 'Close')}</button>
          </div>
        </div>
        {msg && <div className="shrink-0" style={{ padding: '6px 16px', font: '500 12px var(--ravenof-font-body)', color: 'var(--ravenof-gold-bright, #f2c45a)' }}>{msg}</div>}
        <div className="min-h-0 overflow-y-auto" style={{ padding: 14 }}>
          {items == null && <div style={{ color: 'var(--ravenof-text-secondary)', font: '400 13px var(--ravenof-font-body)' }}>{L(locale, 'Kraunama…', 'Loading…')}</div>}
          {items != null && items.length === 0 && <div style={{ color: 'var(--ravenof-text-secondary)', font: '400 13px var(--ravenof-font-body)' }}>{L(locale, 'Parduotuvė kol kas tuščia.', 'The shop is empty for now.')}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {(items ?? []).map((it) => {
              const soldOut = it.owned || (it.limit != null && it.bought >= it.limit)
              const cant = soldOut || tokens < it.price
              const name = (locale === 'en' && it.nameEn) ? it.nameEn : it.nameLt
              return (
                <div key={it.id} className="flex flex-col" style={{ background: 'var(--ravenof-bg-surface-2, #1b1722)', border: '1px solid var(--ravenof-border-hairline, #2a2430)', opacity: soldOut ? 0.55 : 1 }}>
                  <div style={{ height: 96, display: 'grid', placeItems: 'center', background: '#0c0a11', overflow: 'hidden' }}>
                    {it.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={it.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      : <span style={{ font: '700 22px var(--ravenof-font-display)', color: 'var(--ravenof-text-secondary)' }}>{it.kind === 'currency' ? it.amount : '◆'}</span>}
                  </div>
                  <div style={{ padding: '8px 9px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <div style={{ font: '600 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)', lineHeight: 1.25, minHeight: 30 }}>{name}</div>
                    <button disabled={cant || busy === it.id} onClick={() => { playUiClick(); void buy(it) }} className="inline-flex items-center justify-center" style={{ gap: 6, padding: '6px 8px', font: '700 12px var(--ravenof-font-display)', cursor: cant ? 'default' : 'pointer', color: cant ? 'var(--ravenof-text-secondary)' : 'var(--ravenof-on-gold, #1a1206)', background: cant ? 'rgba(255,255,255,.05)' : 'var(--ravenof-grad-gold, linear-gradient(180deg,#f2c45a,#c8962e))', border: '1px solid rgba(212,163,59,.45)' }}>
                      {soldOut ? L(locale, it.owned ? 'Turi' : 'Išpirkta', it.owned ? 'Owned' : 'Sold out') : <><TokenGlyph size={10} /> {it.price}</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sluoksnis layout'e ───────────────────────────────────────────────────────
export function LiveEventsLayer({ enabled }: { enabled: boolean }) {
  const pathname = usePathname()
  const { loaded, events, refresh, openEventId, openEvent, shopOpen, openShop } = useLiveEvents()
  const [popupId, setPopupId] = useState<string | null>(null)
  const [holdForLessons, setHoldForLessons] = useState<boolean | null>(null)
  const [plainShown, setPlainShown] = useState(false)

  // Užkrovimas: prisijungus, grįžus į langą ir kas 5 min. (laimingoji valanda įsijungia pati)
  useEffect(() => {
    if (!enabled) return
    void refresh()
    const onVis = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVis)
    const i = setInterval(() => { void refresh() }, 5 * 60 * 1000)
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(i) }
  }, [enabled, refresh])

  // Naujokui iki 1 pamokos pop-up nerodomas (kaip ir kasdieniai atlygiai)
  useEffect(() => {
    if (!enabled) return
    getNoviceState().then((n) => setHoldForLessons(!!n && n.novice && !n.lesson1Done)).catch(() => setHoldForLessons(false))
  }, [enabled])

  // Pop-up tik pradžios ekrane, po vieną
  useEffect(() => {
    if (!enabled || !loaded || holdForLessons !== false) return
    if (pathname !== '/digital' || popupId || openEventId || shopOpen) return
    const e = pickPopupEvent(events)
    if (!e) return
    // Per vieną žaidimo įjungimą: visos laukiančios dovanos, bet tik VIENAS paprastas
    // evento pop-up – kiti dar nematyti parodomi kitą kartą (baneryje jie matomi iškart).
    if (!e.claim?.claimable) { if (plainShown) return; setPlainShown(true) }
    setPopupId(e.id)
  }, [enabled, loaded, holdForLessons, pathname, events, popupId, openEventId, shopOpen, plainShown])

  const shownId = openEventId ?? popupId
  const shown = useMemo(() => events.find((e) => e.id === shownId) ?? null, [events, shownId])

  const close = useCallback(() => {
    if (shown) markEventSeen(shown)
    setPopupId(null); openEvent(null)
  }, [shown, openEvent])

  // Pop-up'as dingsta, jei eventas baigėsi, kol buvo atidarytas
  useEffect(() => { if (shownId && loaded && !shown) { setPopupId(null); openEvent(null) } }, [shownId, loaded, shown, openEvent])

  if (!enabled) return null
  return (
    <>
      {shown && <EventScreen key={shown.id + shown.occurrence} event={shown} onClose={close} />}
      {shopOpen && <EventShop onClose={() => openShop(false)} />}
    </>
  )
}

// ── Mažas baneris pradžios ekrane ────────────────────────────────────────────
export function LiveEventBanner({ desktop }: { desktop: boolean }) {
  const locale = useLocale()
  const now = useNow(30000)
  const { loaded, events, tokens, skewMs, openEvent, openShop } = useLiveEvents()
  const [idx, setIdx] = useState(0)

  // Keli eventai – keičiasi kas 6 s
  useEffect(() => {
    if (events.length < 2) { setIdx(0); return }
    const i = setInterval(() => setIdx((v) => (v + 1) % events.length), 6000)
    return () => clearInterval(i)
  }, [events.length])

  if (!loaded) return null
  const e = events[idx % Math.max(1, events.length)] ?? null

  if (!e) {
    if (tokens <= 0) return null
    return (
      <button onClick={() => { playUiClick(); openShop(true) }} className="ravenof-press shrink-0 inline-flex items-center justify-between" data-testid="live-event-banner"
        style={{ width: '100%', gap: 8, padding: desktop ? '10px 16px' : '5px 10px', background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', cursor: 'pointer', font: `600 ${desktop ? 13 : 10}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>
        <span>{L(locale, 'Evento parduotuvė', 'Event shop')}</span>
        <span className="inline-flex items-center" style={{ gap: 6 }}><TokenGlyph size={desktop ? 11 : 9} /> {tokens}</span>
      </button>
    )
  }

  const remaining = e.endsAt ? new Date(e.endsAt).getTime() - (now + skewMs) : null
  const mult = multiplierLabel(e, locale)
  const sub = e.claim?.claimable ? L(locale, 'Dovana laukia – atsiimk', 'Gift ready – claim it') : mult || eventBody(e, locale)

  return (
    <button onClick={() => { playUiClick(); openEvent(e.id) }} className="ravenof-press relative overflow-hidden text-left" data-testid="live-event-banner"
      style={{ width: '100%', flex: desktop ? '1 1 0' : '0 0 auto', minHeight: desktop ? 96 : 38, maxHeight: desktop ? 190 : 38, border: `1px solid ${e.accent}`, background: '#0c0a11', cursor: 'pointer', padding: 0 }}>
      {e.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.imageUrl} alt="" className="absolute inset-0" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focusPos(e) }} />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(7,6,10,.93) 0%, rgba(7,6,10,.7) 45%, rgba(7,6,10,.15) 100%)' }} />
      <div className="relative flex items-center justify-between h-full" style={{ gap: 10, padding: desktop ? '12px 16px' : '4px 10px' }}>
        <span className="min-w-0 flex flex-col" style={{ gap: desktop ? 4 : 0 }}>
          {desktop && <span style={{ font: '700 9px var(--ravenof-font-body)', letterSpacing: 2.5, textTransform: 'uppercase', color: e.accent }}>{L(locale, 'Eventas', 'Event')}{events.length > 1 ? ` ${idx % events.length + 1}/${events.length}` : ''}</span>}
          <span className="truncate" style={{ font: `700 ${desktop ? 18 : 11}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)', textShadow: '0 2px 8px rgba(0,0,0,.9)' }}>{eventTitle(e, locale)}</span>
          {(desktop || e.claim?.claimable) && sub && <span className="truncate" style={{ font: `${e.claim?.claimable ? 600 : 400} ${desktop ? 12 : 9}px var(--ravenof-font-body)`, color: e.claim?.claimable ? e.accent : 'var(--ravenof-text-secondary)' }}>{sub}</span>}
        </span>
        <span className="shrink-0 flex flex-col items-end" style={{ gap: 3 }}>
          {remaining != null && <span style={{ font: `600 ${desktop ? 12 : 9}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)', background: 'rgba(7,6,10,.7)', padding: desktop ? '3px 8px' : '1px 6px', border: '1px solid rgba(255,255,255,.14)' }}>{formatRemaining(remaining, locale)}</span>}
          {desktop && tokens > 0 && <span className="inline-flex items-center" style={{ gap: 5, font: '600 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}><TokenGlyph size={9} /> {tokens}</span>}
        </span>
      </div>
    </button>
  )
}
