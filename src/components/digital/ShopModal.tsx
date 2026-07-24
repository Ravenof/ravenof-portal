'use client'

// ── PARDUOTUVĖ (patvirtintas UI, Fazė 2 — shop-packs.png): pilno ekrano overlay
// (rail lieka matomas), kairė kategorijų juosta · centras dienos pasiūlymas +
// prekių grid · pirkimas per patvirtinimo dialogą (prototipo SHOP CONFIRM).
// DB sekcijos (shop_items: pakuotės/nugarėlės/avatarai/kaladės/rubinai) +
// Dienos kortos (daily deal) + Starter kaladės — viskas VIENOJE vietoje.
// Senas StoreModal (auksinė parduotuvė) išimtas — šis modalas atidaromas ir iš
// tab bar „Parduotuvė", ir iš Hub, ir per requestOpenStore eventą.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RewardChip } from '@/components/digital/ui/RewardBits'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { useEscClose } from '@/lib/useEscClose'
import { getBalances, getPackInventory, getActivePacks, type Balances } from '@/lib/economy'
import { getShop, purchaseShopItem, SHOP_SECTIONS, PURCHASE_ERR_KEY, type ShopItem } from '@/lib/gamification/shop'
import { useT, useContent } from '@/lib/i18n/react'
import { getDailyDeal, buyDailyDealCard, getCosmetics, type DealCard } from '@/lib/cosmetics'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { RAVENOF_ASSET, ravenofRarityColor } from './ui/RavenofKit'
import { SmartImg } from '@/components/ui/SmartImg'

type Sel = { t: 'shop'; id: number } | { t: 'deal'; id: string } | { t: 'starter'; id: string }
type Section = { key: string; labelKey: string }
// 'decks' DB sekcija pašalinta (faction_deck prekių niekada nebuvo — tuščia
// kategorija klaidino; kalades parduoda Starter sekcija žemiau)
const ALL_SECTIONS: Section[] = [
  ...SHOP_SECTIONS.filter((s) => s.key !== 'decks').map((s) => ({ key: s.key, labelKey: s.labelKey })),
  { key: 'daily', labelKey: 'shop.sections.daily' },
  { key: 'starter', labelKey: 'shop.sections.starter' },
]

export function ShopModal({ onClose, onPurchased }: { onClose: () => void; onPurchased?: () => void }) {
  const t = useT()
  const tc = useContent()
  useEscClose(onClose)
  const [items, setItems] = useState<ShopItem[]>([])
  const [deal, setDeal] = useState<DealCard[]>([])
  const [starters, setStarters] = useState<StarterDeck[]>([])
  const [bal, setBal] = useState<Balances>({ silver: 0, rubies: 0, essence: 0 })
  // kosmetikos vizualai + nuosavybė (kad parduotuvė rodytų TIKRUS daiktus)
  const [cosVis, setCosVis] = useState<Record<string, { imageUrl: string | null; css: string | null; emoji: string | null; kind: string }>>({})
  const [cosOwned, setCosOwned] = useState<Set<string>>(new Set())
  // tikrų card_packs vaizdai (shop pack prekės su payload item_id = pako uuid)
  const [packImgs, setPackImgs] = useState<Record<string, string | null>>({})
  const [packInv, setPackInv] = useState(0)
  const [section, setSection] = useState('packs')
  const [sel, setSel] = useState<Sel | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date(); const mid = new Date(now); mid.setHours(24, 0, 0, 0)
      const mins = Math.max(0, Math.floor((mid.getTime() - now.getTime()) / 60000))
      setCountdown(`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`)
    }
    tick(); const i = setInterval(tick, 30_000); return () => clearInterval(i)
  }, [])

  const refresh = useCallback(() => {
    getShop().then(setItems)
    getBalances().then((b) => { if (b) setBal(b) })
    getDailyDeal().then((d) => setDeal(d?.cards ?? []))
    getStarterDecks().then((s) => setStarters(s ?? []))
    getPackInventory().then((inv) => setPackInv(Object.values(inv).reduce((a, b) => a + b, 0)))
    getActivePacks().then((ps) => setPackImgs(Object.fromEntries(ps.map((pk) => [pk.id, pk.image_url ?? null]))))
    getCosmetics().then((c) => {
      if (!c) return
      const m: Record<string, { imageUrl: string | null; css: string | null; emoji: string | null; kind: string }> = {}
      for (const it of c.items) m[it.id] = { imageUrl: it.imageUrl ?? null, css: it.css ?? null, emoji: it.emoji ?? null, kind: it.kind }
      setCosVis(m); setCosOwned(new Set(c.owned))
    })
  }, [])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t) }, [toast])

  const flash = (m: string, err = false) => { (err ? playError : playSuccess)(); setToast(m) }

  const buyShop = useCallback(async (it: ShopItem, cur: 'silver' | 'rubies') => {
    if (busy) return; setBusy(true); playUiClick()
    const r = await purchaseShopItem(it.id, cur)
    if (r && 'ok' in r) { flash(t('shop.purchased', { name: shopName(it) })); onPurchased?.(); refresh() }
    else if (r && 'error' in r) flash(PURCHASE_ERR_KEY[r.error] ? t(PURCHASE_ERR_KEY[r.error]) : t('shop.buyFailed'), true)
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, refresh, onPurchased])

  const buyDeal = useCallback(async (c: DealCard) => {
    if (busy) return; setBusy(true); playUiClick()
    const r = await buyDailyDealCard(c.id)
    if ('error' in r) flash(r.error === 'not enough gold' ? t('shop.notEnoughSilver') : t('shop.buyFailed'), true)
    else { flash(t('shop.addedToCollection', { name: tc('cosmetic', c.id, 'name', c.name) })); onPurchased?.(); refresh() }
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, refresh, onPurchased])

  const claimStarter = useCallback(async (s: StarterDeck) => {
    if (busy) return; setBusy(true); playUiClick()
    const r = await claimStarterDeck(s.id)
    if ('error' in r) flash(r.error === 'already claimed' ? t('shop.alreadyClaimed') : t('shop.claimFailed'), true)
    else { flash(t('shop.deckCreated')); onPurchased?.(); refresh() }
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, refresh, onPurchased])

  const shopShown = useMemo(() => {
    const types = SHOP_SECTIONS.find((s) => s.key === section)?.types ?? []
    return items.filter((i) => types.includes(i.itemType))
  }, [items, section])

  const selShop = sel?.t === 'shop' ? items.find((i) => i.id === sel.id) ?? null : null
  const selDeal = sel?.t === 'deal' ? deal.find((c) => c.id === sel.id) ?? null : null
  const selStarter = sel?.t === 'starter' ? starters.find((s) => s.id === sel.id) ?? null : null

  // kosmetikos prekės vizualas pagal payload item_id
  const cosIdOf = (it: ShopItem): string | null => {
    if (it.itemType !== 'card_back' && it.itemType !== 'player_avatar') return null
    const pid = (it.payload[0] as { item_id?: string } | undefined)?.item_id
    return pid ?? null
  }
  const visOf = (it: ShopItem) => { const id = cosIdOf(it); return id ? cosVis[id] ?? null : null }
  const packImgOf = (it: ShopItem): string | null => {
    if (it.itemType !== 'pack') return null
    const pid = (it.payload[0] as { item_id?: string } | undefined)?.item_id
    return pid ? packImgs[pid] ?? null : null
  }
  const ownedShopItem = (it: ShopItem) => { const id = cosIdOf(it); return id ? cosOwned.has(id) : false }

  // Vienas vertimų šaltinis: jei prekė = kosmetika, imam KOSMETIKOS įrašą
  // (tas pats, kurį rodo Kosmetikos kolekcija), tik tada shop_item.
  const shopName = (it: ShopItem) => {
    const cid = cosIdOf(it)
    const base = tc('shop_item', it.slug, 'name', it.name)
    return cid ? tc('cosmetic', cid, 'name', base) : base
  }
  const shopDesc = (it: ShopItem) => {
    const cid = cosIdOf(it)
    const base = tc('shop_item', it.slug, 'description', it.description)
    return cid ? tc('cosmetic', cid, 'description', base) : base
  }

  // Kategorijų akcentų spalvos (patvirtintas UI — kairė juosta su border-left)
  const SEC_ACCENT: Record<string, string> = {
    packs: 'var(--ravenof-gold)', backs: 'var(--ravenof-fac-mistikos)', avatars: 'var(--ravenof-success)',
    rubies: 'var(--ravenof-danger)', daily: 'var(--ravenof-gold-bright)', starter: 'var(--ravenof-rar-epic)', decks: 'var(--ravenof-rar-epic)',
  }

  const priceRow = (silver?: number | null, rubies?: number | null, state?: { label: string; color: string } | null) => (
    <div className="shrink-0 flex items-center justify-center" style={{ gap: 5, padding: '6px 4px', borderTop: '1px solid var(--ravenof-border-hairline)', background: 'rgba(7,6,10,.6)' }}>
      {state ? <span style={{ font: '700 11px var(--ravenof-font-body)', color: state.color }}>{state.label}</span> : <>
        {silver != null && <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`${RAVENOF_ASSET}/currencies/cur-silver.png`} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} /><span style={{ font: '700 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>{silver}</span></>}
        {silver != null && rubies != null && <span style={{ color: 'var(--ravenof-text-secondary)', fontSize: 9 }}>/</span>}
        {rubies != null && <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`${RAVENOF_ASSET}/currencies/cur-rubies.png`} alt="" style={{ width: 13, height: 14, objectFit: 'contain' }} /><span style={{ font: '700 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>{rubies}</span></>}
      </>}
    </div>
  )

  const tileFrame = (key: string | number, onOpen: () => void, art: React.ReactNode, name: string, sub: string | null, price: React.ReactNode, dim = false) => (
    <button key={key} onClick={onOpen} className="ravenof-press relative flex flex-col overflow-hidden text-left" style={{ minHeight: 0, border: '1px solid var(--ravenof-border-hairline)', background: 'var(--ravenof-bg-surface-2)', cursor: 'pointer', opacity: dim ? 0.6 : 1, padding: 0 }}>
      <span className="relative flex-1 block" style={{ minHeight: 90 }}>
        {art}
        <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(7,6,10,.9))' }} />
        <span className="absolute" style={{ left: 8, bottom: 5, right: 6 }}>
          <span className="block truncate" style={{ font: '700 12px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{name}</span>
          {sub && <span className="block truncate" style={{ font: '400 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{sub}</span>}
        </span>
      </span>
      {price}
    </button>
  )

  // ── Patvirtinimo dialogas (prototipo SHOP CONFIRM) ──
  const confirmDialog = (() => {
    if (!sel) return null
    const close = () => { playUiClick(); setSel(null) }
    let name = '', sub: string | null = null, body: React.ReactNode = null
    const actions: React.ReactNode[] = []
    if (selShop) {
      name = shopName(selShop); sub = shopDesc(selShop)
      body = (
        <div className="flex flex-col" style={{ gap: 4, marginTop: 10 }}>
          {selShop.payload.map((pl, pi) => (
            <span key={pi} className="px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ravenof-border-hairline)' }}><RewardChip it={pl} size={15} textSize={10.5} /></span>
          ))}
        </div>
      )
      if (ownedShopItem(selShop)) actions.push(<div key="own" style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', color: 'var(--ravenof-success-bright)', border: '1px solid #6F856255', padding: 11 }}>{t('shop.ownedEquip')}</div>)
      else {
        if (selShop.prices.silver != null) {
          const enough = bal.silver >= selShop.prices.silver
          actions.push(<button key="s" onClick={() => { if (enough) void buyShop(selShop, 'silver').then(() => setSel(null)) }} disabled={busy || !enough} style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, color: enough ? 'var(--ravenof-on-gold)' : '#5e5868', background: enough ? 'var(--ravenof-grad-gold)' : 'var(--ravenof-bg-elevated)', padding: 11, border: 0, cursor: enough ? 'pointer' : 'default', clipPath: 'polygon(7px 0,100% 0,calc(100% - 7px) 100%,0 100%)', textTransform: 'uppercase' }}>{busy ? '…' : t('shop.buyGold', { price: selShop.prices.silver })}</button>)
        }
        if (selShop.prices.rubies != null) {
          const enough = bal.rubies >= selShop.prices.rubies
          actions.push(<button key="r" onClick={() => { if (enough) void buyShop(selShop, 'rubies').then(() => setSel(null)) }} disabled={busy || !enough} style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, color: enough ? 'var(--ravenof-text-primary)' : '#5e5868', background: enough ? 'linear-gradient(180deg,#a53a47,var(--ravenof-danger))' : 'var(--ravenof-bg-elevated)', padding: 11, border: 0, cursor: enough ? 'pointer' : 'default', clipPath: 'polygon(7px 0,100% 0,calc(100% - 7px) 100%,0 100%)', textTransform: 'uppercase' }}>{busy ? '…' : t('shop.buyRubies', { price: selShop.prices.rubies })}</button>)
        }
        if (selShop.prices.real_money != null && selShop.prices.silver == null && selShop.prices.rubies == null) {
          actions.push(<div key="rm" style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', color: 'var(--ravenof-text-secondary)', border: '1px solid var(--ravenof-border-strong)', padding: 11 }}>{t('shop.comingSoon', { price: selShop.prices.real_money.toFixed(2) })}</div>)
        }
      }
    } else if (selDeal) {
      name = tc('cosmetic', selDeal.id, 'name', selDeal.name); sub = t('shop.dailyDealInfo')
      const enough = bal.silver >= selDeal.priceGold
      body = selDeal.imageUrl ? (
        <div className="relative mx-auto overflow-hidden" style={{ width: 110, aspectRatio: '2.5/3.5', marginTop: 10, border: `1px solid ${ravenofRarityColor(selDeal.rarity)}`, borderRadius: 5 }}>
          <SmartImg src={selDeal.imageUrl} width={220} className="absolute inset-0 w-full h-full object-cover" />
        </div>
      ) : null
      if (selDeal.bought) actions.push(<div key="b" style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', color: 'var(--ravenof-success-bright)', border: '1px solid #6F856255', padding: 11 }}>{t('shop.purchasedShort')}</div>)
      else actions.push(<button key="buy" onClick={() => { if (enough) void buyDeal(selDeal).then(() => setSel(null)) }} disabled={busy || !enough} style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, color: enough ? 'var(--ravenof-on-gold)' : '#5e5868', background: enough ? 'var(--ravenof-grad-gold)' : 'var(--ravenof-bg-elevated)', padding: 11, border: 0, cursor: enough ? 'pointer' : 'default', clipPath: 'polygon(7px 0,100% 0,calc(100% - 7px) 100%,0 100%)', textTransform: 'uppercase' }}>{busy ? '…' : t('shop.buyGold', { price: selDeal.priceGold })}</button>)
    } else if (selStarter) {
      name = tc('starter_deck', selStarter.id, 'name', selStarter.name)
      sub = selStarter.description ? tc('starter_deck', selStarter.id, 'description', selStarter.description) : t('shop.starterInfo')
      const enough = selStarter.priceGold <= 0 || bal.silver >= selStarter.priceGold
      if (selStarter.claimed) actions.push(<div key="c" style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', color: 'var(--ravenof-success-bright)', border: '1px solid #6F856255', padding: 11 }}>{t('shop.claimedShort')}</div>)
      else actions.push(<button key="buy" onClick={() => { if (enough) void claimStarter(selStarter).then(() => setSel(null)) }} disabled={busy || !enough} style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, color: enough ? 'var(--ravenof-on-gold)' : '#5e5868', background: enough ? 'var(--ravenof-grad-gold)' : 'var(--ravenof-bg-elevated)', padding: 11, border: 0, cursor: enough ? 'pointer' : 'default', clipPath: 'polygon(7px 0,100% 0,calc(100% - 7px) 100%,0 100%)', textTransform: 'uppercase' }}>{busy ? '…' : selStarter.priceGold > 0 ? t('shop.buyGold', { price: selStarter.priceGold }) : t('shop.claimFree')}</button>)
    }
    const insufficient = (selShop && !ownedShopItem(selShop) && selShop.prices.silver != null && bal.silver < selShop.prices.silver && (selShop.prices.rubies == null || bal.rubies < selShop.prices.rubies))
      || (selDeal && !selDeal.bought && bal.silver < selDeal.priceGold)
      || (selStarter && !selStarter.claimed && selStarter.priceGold > 0 && bal.silver < selStarter.priceGold)
    return (
      <>
        <div className="absolute inset-0" style={{ zIndex: 85, background: 'rgba(4,3,7,.78)', backdropFilter: 'blur(3px)' }} onClick={close} />
        <div className="ravenof-panel" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 86, width: 330, maxWidth: '92vw', padding: '26px 28px', animation: 'ravenofFound .3s ease' }}>
          <div style={{ font: '700 14px var(--ravenof-font-display)', letterSpacing: '.5px', color: 'var(--ravenof-text-primary)', textAlign: 'center' }}>{name}</div>
          {sub && <div style={{ font: '400 11.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', textAlign: 'center', marginTop: 4, maxHeight: 62, overflow: 'hidden' }}>{sub}</div>}
          {body}
          {insufficient && <div style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-danger)', textAlign: 'center', marginTop: 8 }}>{t('shop.notEnoughSilver')}</div>}
          {toast && <div style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-gold)', textAlign: 'center', marginTop: 8 }}>{toast}</div>}
          <div className="flex" style={{ gap: 8, marginTop: 14 }}>
            <button onClick={close} style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-text-secondary)', border: '1px solid var(--ravenof-border-strong)', background: 'none', padding: 11, cursor: 'pointer', textTransform: 'uppercase' }}>{t('common.cancel')}</button>
            {actions}
          </div>
        </div>
      </>
    )
  })()

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="ravenof-body" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'calc(74px + max(18px, env(safe-area-inset-left, 0px)))', zIndex: 60, background: 'var(--ravenof-bg-base)', display: 'flex', flexDirection: 'column', padding: '10px 20px 12px 16px', paddingRight: 'max(20px, env(safe-area-inset-right, 0px))', animation: 'ravenofIn .3s ease', borderLeft: '1px solid rgba(212,163,59,0.18)' }}>
      {/* ── Antraštė ── */}
      <div className="flex items-center shrink-0" style={{ gap: 10, paddingBottom: 8, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div style={{ font: '700 15px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('shop.title')}</div>
        <div className="flex-1" />
        <div className="flex items-center" style={{ gap: 5, font: '600 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${RAVENOF_ASSET}/currencies/cur-silver.png`} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />{bal.silver.toLocaleString('lt-LT')}
        </div>
        <div className="flex items-center" style={{ gap: 5, font: '600 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${RAVENOF_ASSET}/currencies/cur-rubies.png`} alt="" style={{ width: 13, height: 14, objectFit: 'contain' }} />{bal.rubies.toLocaleString('lt-LT')}
        </div>
      </div>

      <div className="flex-1 flex min-h-0" style={{ gap: 12 }}>
        {/* ── KAIRĖ: kategorijos ── */}
        <div className="flex flex-col shrink-0" style={{ width: 128, gap: 4 }}>
          <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll flex flex-col" style={{ gap: 4 }}>
            {ALL_SECTIONS.map((sc) => {
              const active = section === sc.key
              return (
                <button key={sc.key} onClick={() => { playUiClick(); setSection(sc.key); setSel(null); setToast(null) }}
                  className="ravenof-press flex items-center shrink-0 text-left" style={{ gap: 8, padding: '9px 10px', minHeight: 36,
                    border: `1px solid ${active ? 'var(--ravenof-border-strong)' : 'var(--ravenof-border-hairline)'}`,
                    borderLeft: `2px solid ${SEC_ACCENT[sc.key] ?? 'var(--ravenof-border-strong)'}`,
                    background: active ? 'var(--ravenof-bg-surface)' : 'transparent', cursor: 'pointer' }}>
                  <span style={{ font: '600 11px var(--ravenof-font-body)', color: active ? 'var(--ravenof-text-primary)' : 'var(--ravenof-text-secondary)' }}>{t(sc.labelKey).replace(/^[^\p{L}]+\s*/u, '')}</span>
                </button>
              )
            })}
          </div>
          {packInv > 0 && (
            <Link href="/digital/collection" onClick={() => { playUiClick(); onClose() }}
              className="ravenof-press shrink-0 block w-full text-center" style={{ font: '700 10px var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-on-gold)', background: 'var(--ravenof-grad-gold)', padding: '8px 6px', clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)', textTransform: 'uppercase' }}>
              {t('shop.openPacks', { count: packInv })}
            </Link>
          )}
        </div>

        {/* ── CENTRAS ── */}
        <div className="flex-1 flex flex-col min-w-0" style={{ gap: 8 }}>
          {/* Dienos pasiūlymo juosta → Dienos kortos */}
          <button onClick={() => { playUiClick(); setSection('daily'); setSel(null) }} className="ravenof-press relative shrink-0 overflow-hidden text-left" style={{ height: 56, border: '1px solid rgba(212,163,59,.35)', clipPath: 'polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)', cursor: 'pointer', background: 'none', padding: 0, width: '100%' }}>
            <span className="absolute inset-0" style={{ background: `url('${RAVENOF_ASSET}/modes/mode-ranked.webp') no-repeat 50% 30% / cover` }} />
            <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(7,6,10,.94) 30%,rgba(7,6,10,.4))' }} />
            <span className="relative h-full flex items-center" style={{ gap: 12, padding: '0 14px' }}>
              <span>
                <span className="block" style={{ font: '500 8.5px var(--ravenof-font-body)', letterSpacing: 2, color: 'var(--ravenof-gold)', textTransform: 'uppercase' }}>{t('shop.dailyOffer')}</span>
                <span className="block" style={{ font: '700 13px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{t('shop.sections.daily').replace(/^[^\p{L}]+\s*/u, '')}</span>
              </span>
              <span className="flex-1" />
              <span style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('shop.endsIn')} {countdown}</span>
            </span>
          </button>

          {/* Prekės */}
          <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll">
            {section === 'daily' ? (
              deal.length === 0 ? <p className="text-center py-8" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('shop.dealLoading')}</p> : (
                <div className="grid content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 8 }}>
                  {deal.map((c) => tileFrame(c.id, () => { playUiClick(); setSel({ t: 'deal', id: c.id }); setToast(null) },
                    c.imageUrl ? <SmartImg src={c.imageUrl} width={240} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 12%' }} /> : <span className="absolute inset-0 flex items-center justify-center text-3xl" style={{ background: 'var(--ravenof-bg-surface)' }}>🎴</span>,
                    tc('cosmetic', c.id, 'name', c.name), gcRarity(c.rarity),
                    priceRow(c.bought ? null : c.priceGold, null, c.bought ? { label: t('shop.purchasedShort'), color: 'var(--ravenof-success-bright)' } : null), c.bought))}
                </div>
              )
            ) : section === 'starter' ? (
              <div className="grid content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                {starters.map((st) => tileFrame(st.id, () => { playUiClick(); setSel({ t: 'starter', id: st.id }); setToast(null) },
                  st.imageUrl ? <SmartImg src={st.imageUrl} width={240} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 12%' }} /> : <span className="absolute inset-0 flex items-center justify-center text-3xl" style={{ background: 'var(--ravenof-bg-surface)' }}>🃏</span>,
                  tc('starter_deck', st.id, 'name', st.name), st.faction ?? null,
                  priceRow(st.claimed ? null : (st.priceGold > 0 ? st.priceGold : null), null, st.claimed ? { label: t('shop.claimedShort'), color: 'var(--ravenof-success-bright)' } : st.priceGold <= 0 ? { label: t('shop.free'), color: 'var(--ravenof-success-bright)' } : null), st.claimed))}
              </div>
            ) : (
              <>
                {shopShown.length === 0 && <p className="text-center py-8" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('shop.categoryEmpty')}</p>}
                <div className="grid content-start" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {shopShown.map((it) => {
                    const vis = visOf(it)
                    const packImg = packImgOf(it)
                    const owned = ownedShopItem(it)
                    const art = packImg
                      ? <SmartImg src={packImg} width={260} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 12%' }} />
                      : vis?.imageUrl
                        ? <SmartImg src={vis.imageUrl} width={260} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 20%' }} />
                        : vis?.css
                          ? <span className="absolute inset-0" style={{ background: vis.css }} />
                          : <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(160deg,#1a1325,#0a0810)', fontSize: 28 }}>{vis?.emoji ?? '🛒'}</span>
                    return tileFrame(it.id, () => { playUiClick(); setSel({ t: 'shop', id: it.id }); setToast(null) }, art,
                      shopName(it), shopDesc(it),
                      priceRow(owned ? null : it.prices.silver, owned ? null : it.prices.rubies, owned ? { label: t('shop.owned'), color: 'var(--ravenof-success-bright)' } : (it.prices.silver == null && it.prices.rubies == null && it.prices.real_money != null ? { label: `€${it.prices.real_money.toFixed(2)}`, color: 'var(--ravenof-text-secondary)' } : null)), owned)
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {confirmDialog}
      {toast && !sel && (
        <div className="ravenof-toast" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))', zIndex: 160 }}>{toast}</div>
      )}
    </div>,
    document.body,
  )
}

/** Retumo etiketė daily kortoms (LT pavadinimas iš DB — rodom kaip yra). */
function gcRarity(r: string | null): string | null { return r }
