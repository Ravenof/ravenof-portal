'use client'

// ── PARDUOTUVĖ (vieninga; konsolidacija 2026-07-07) — landscape 3 zonų overlay:
// kairė sekcijos · centras prekių grid · dešinė preview + pirkimo CTA (pinned).
// DB sekcijos (shop_items: pakuotės/nugarėlės/avatarai/kaladės/rubinai) +
// Dienos kortos (daily deal) + Starter kaladės — viskas VIENOJE vietoje.
// Senas StoreModal (auksinė parduotuvė) išimtas — šis modalas atidaromas ir iš
// tab bar „Parduotuvė", ir iš Hub, ir per requestOpenStore eventą.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RewardChip } from '@/components/digital/ui/RewardBits'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { useEscClose } from '@/lib/useEscClose'
import { getBalances, getPackInventory, getActivePacks, type Balances } from '@/lib/economy'
import { getShop, purchaseShopItem, SHOP_SECTIONS, PURCHASE_ERR_KEY, type ShopItem } from '@/lib/gamification/shop'
import { useT, useContent } from '@/lib/i18n/react'
import { getDailyDeal, buyDailyDealCard, getCosmetics, type DealCard } from '@/lib/cosmetics'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { rarityColor } from '@/lib/digital/rarity'
import { SmartImg } from '@/components/ui/SmartImg'

const RARITY_COL: Record<string, string> = { basic: '148,163,184', rare: '96,165,250', premium: '139,92,246', epic: '139,92,246', legendary: '240,180,41' }

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
  // auto-select pirmas sekcijos elementas
  const effShop = selShop ?? (section !== 'daily' && section !== 'starter' ? shopShown[0] ?? null : null)
  const effDeal = selDeal ?? (section === 'daily' ? deal[0] ?? null : null)
  const effStarter = selStarter ?? (section === 'starter' ? starters[0] ?? null : null)

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

  if (typeof document === 'undefined') return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)', padding: 8 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col" style={{ width: 'min(1100px, 98vw)', height: 'min(640px, 96vh)', borderRadius: 20,
        background: 'radial-gradient(120% 60% at 50% 0%, rgba(240,180,41,0.1), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))',
        border: '1.5px solid rgba(240,180,41,0.5)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>

        {/* ── Antraštė ── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
          <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 'clamp(14px,2.6vh,19px)', letterSpacing: '0.08em' }}>{t('shop.title')}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(203,213,225,0.35)', color: '#f3ead3' }}>🪙 {bal.silver.toLocaleString('lt-LT')}</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>💎 {bal.rubies.toLocaleString('lt-LT')}</span>
            <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── 3 zonos ── */}
        <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(130px,0.72fr) minmax(0,2.2fr) minmax(210px,1fr)' }}>

          {/* KAIRĖ: sekcijos */}
          <div className="flex flex-col min-h-0 gap-1.5">
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5">
              {ALL_SECTIONS.map((s) => (
                <button key={s.key} onClick={() => { playUiClick(); setSection(s.key); setSel(null); setToast(null) }}
                  className="rvn-press shrink-0 w-full text-left px-2.5 py-2 rounded-xl font-bold"
                  style={{ fontSize: 11, background: section === s.key ? 'rgba(240,180,41,0.2)' : 'rgba(10,8,16,0.8)', border: `1px solid ${section === s.key ? 'rgba(240,180,41,0.6)' : 'rgba(255,255,255,0.08)'}`, color: section === s.key ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}>{t(s.labelKey)}</button>
              ))}
            </div>
            {packInv > 0 && (
              <Link href="/digital/collection" onClick={() => { playUiClick(); onClose() }}
                className="shrink-0 block w-full px-2 py-2 rounded-xl font-bold text-center"
                style={{ fontSize: 10, background: 'rgba(251,146,60,0.18)', border: '1px solid rgba(251,146,60,0.6)', color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>
                {t('shop.openPacks', { count: packInv })}
              </Link>
            )}
          </div>

          {/* CENTRAS: prekės */}
          <div className="min-h-0 overflow-y-auto">
            {section === 'daily' ? (
              deal.length === 0 ? <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>{t('shop.dealLoading')}</p> : (
                <div className="grid gap-2 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))' }}>
                  {deal.map((c) => {
                    const col = rarityColor(c.rarity)
                    const isSel = effDeal?.id === c.id
                    return (
                      <button key={c.id} onClick={() => { playUiClick(); setSel({ t: 'deal', id: c.id }); setToast(null) }}
                        className="rvn-press relative rounded-xl overflow-hidden text-left"
                        style={{ aspectRatio: '2.5/3.9', border: isSel ? '2px solid rgba(240,180,41,0.95)' : `2px solid ${col}66`, boxShadow: isSel ? '0 0 12px rgba(240,180,41,0.4)' : 'none', opacity: c.bought ? 0.55 : 1 }}>
                        {c.imageUrl ? <SmartImg src={c.imageUrl} width={240} className="absolute inset-0 w-full h-full object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-3xl" style={{ background: '#15101f' }}>🎴</span>}
                        <span className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
                          <span className="block truncate font-bold" style={{ fontSize: 9.5, color: '#fff' }}>{tc('cosmetic', c.id, 'name', c.name)}</span>
                          <span className="block font-bold" style={{ fontSize: 9.5, color: c.bought ? '#4ade80' : 'var(--gold)' }}>{c.bought ? '✓ Nupirkta' : `🪙 ${c.priceGold}`}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            ) : section === 'starter' ? (
              <div className="grid gap-2 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {starters.map((s) => {
                  const isSel = effStarter?.id === s.id
                  return (
                    <button key={s.id} onClick={() => { playUiClick(); setSel({ t: 'starter', id: s.id }); setToast(null) }}
                      className="rvn-press relative rounded-xl overflow-hidden text-left"
                      style={{ aspectRatio: '3/3.6', border: isSel ? '2px solid rgba(240,180,41,0.95)' : '1px solid rgba(34,197,94,0.4)', boxShadow: isSel ? '0 0 12px rgba(240,180,41,0.4)' : 'none', opacity: s.claimed ? 0.55 : 1 }}>
                      {s.imageUrl ? <SmartImg src={s.imageUrl} width={240} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 30%' }} /> : <span className="absolute inset-0 flex items-center justify-center text-3xl" style={{ background: '#15101f' }}>🃏</span>}
                      <span className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
                        <span className="block truncate font-bold" style={{ fontSize: 10, color: '#fff' }}>{tc('starter_deck', s.id, 'name', s.name)}</span>
                        <span className="block font-bold" style={{ fontSize: 9.5, color: s.claimed ? '#4ade80' : s.priceGold > 0 ? 'var(--gold)' : '#86efac' }}>{s.claimed ? '✓ Paimta' : s.priceGold > 0 ? `🪙 ${s.priceGold}` : t('shop.free')}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <>
                {shopShown.length === 0 && <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>{t('shop.categoryEmpty')}</p>}
                <div className="grid gap-2 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                  {shopShown.map((it) => {
                    const rc = it.rarity ? RARITY_COL[it.rarity] ?? '240,180,41' : '240,180,41'
                    const isSel = effShop?.id === it.id
                    const vis = visOf(it)
                    const owned = ownedShopItem(it)
                    return (
                      <button key={it.id} onClick={() => { playUiClick(); setSel({ t: 'shop', id: it.id }); setToast(null) }}
                        className="rvn-press rounded-xl p-2.5 text-left flex flex-col gap-1"
                        style={{ minHeight: 76, background: `linear-gradient(150deg, rgba(${rc},0.08), rgba(10,8,16,0.92))`, border: isSel ? '1.5px solid rgba(240,180,41,0.9)' : `1px solid rgba(${rc},0.4)`, boxShadow: isSel ? '0 0 12px rgba(240,180,41,0.35)' : 'none', opacity: owned ? 0.65 : 1 }}>
                        {packImgOf(it) && (
                          <span className="relative mx-auto block overflow-hidden shrink-0 rounded-lg" style={{ width: 74, height: 96, border: '1px solid rgba(240,180,41,0.35)' }}>
                            <SmartImg src={packImgOf(it)!} width={160} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 32%' }} />
                          </span>
                        )}
                        {vis && (
                          <span className="relative mx-auto flex items-center justify-center overflow-hidden shrink-0"
                            style={{ width: vis.kind === 'avatar' ? 54 : 46, height: vis.kind === 'avatar' ? 54 : 64, borderRadius: vis.kind === 'avatar' ? 999 : 7,
                              background: vis.imageUrl ? '#0a0810' : (vis.css ?? 'linear-gradient(160deg,#1a1325,#0a0810)'), border: vis.kind === 'avatar' ? '2px solid rgba(240,180,41,0.5)' : '1px solid rgba(255,255,255,0.12)' }}>
                            {vis.imageUrl
                              ? <SmartImg src={vis.imageUrl} width={120} className="absolute inset-0 w-full h-full object-cover" />
                              : (vis.emoji && <span className="text-xl">{vis.emoji}</span>)}
                          </span>
                        )}
                        <span className="block text-sm font-bold leading-tight" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{shopName(it)}</span>
                        {!vis && <span className="flex flex-wrap gap-x-2 gap-y-0.5">{it.payload.slice(0, 3).map((p, i) => <span key={i}><RewardChip it={p} size={13} textSize={9.5} /></span>)}</span>}
                        <span className="mt-auto flex gap-2" style={{ fontSize: 10, fontWeight: 800 }}>
                          {owned ? <span style={{ color: '#4ade80' }}>{t('shop.owned')}</span> : <>
                            {it.prices.silver != null && <span style={{ color: '#f3ead3' }}>🪙 {it.prices.silver}</span>}
                            {it.prices.rubies != null && <span style={{ color: '#fca5a5' }}>💎 {it.prices.rubies}</span>}
                            {it.prices.real_money != null && it.prices.silver == null && it.prices.rubies == null && <span style={{ color: 'var(--text-muted)' }}>€{it.prices.real_money.toFixed(2)}</span>}
                          </>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* DEŠINĖ: pasirinkta prekė */}
          <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(240,180,41,0.22)' }}>
            {effDeal ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                  <div className="relative w-full rounded-xl overflow-hidden shrink-0 mx-auto" style={{ aspectRatio: '2.5/3.5', maxWidth: 170, border: `2px solid ${rarityColor(effDeal.rarity)}`, boxShadow: `0 0 14px ${rarityColor(effDeal.rarity)}44` }}>
                    {effDeal.imageUrl ? <SmartImg src={effDeal.imageUrl} width={340} className="absolute inset-0 w-full h-full object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-4xl" style={{ background: '#15101f' }}>🎴</span>}
                  </div>
                  <p className="font-bold text-center" style={{ fontSize: 13, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{effDeal.name}</p>
                  <p className="text-center" style={{ fontSize: 10, color: rarityColor(effDeal.rarity) }}>{effDeal.rarity ?? ''}{effDeal.faction ? ` · ${effDeal.faction}` : ''}</p>
                  <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{t('shop.dailyDealInfo')}</p>
                  {toast && <p className="text-center font-semibold py-1.5 px-2 rounded-lg" style={{ fontSize: 10.5, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>{toast}</p>}
                </div>
                <button onClick={() => buyDeal(effDeal)} disabled={busy || effDeal.bought || bal.silver < effDeal.priceGold}
                  className="rvn-press shrink-0 mt-2 w-full rounded-xl font-extrabold disabled:opacity-45"
                  style={{ minHeight: 42, fontSize: 12.5, fontFamily: 'var(--rvn-font-display)', background: effDeal.bought ? 'rgba(74,222,128,0.15)' : 'linear-gradient(180deg,#ffe28c,#f3b62c)', border: effDeal.bought ? '1px solid rgba(74,222,128,0.5)' : 'none', color: effDeal.bought ? '#86efac' : '#3a2406' }}>
                  {busy ? '…' : effDeal.bought ? t('shop.purchasedShort') : t('shop.buyGold', { price: effDeal.priceGold })}
                </button>
              </>
            ) : effStarter ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                  <div className="relative w-full rounded-xl overflow-hidden shrink-0" style={{ aspectRatio: '3/3.2', border: '1.5px solid rgba(34,197,94,0.5)' }}>
                    {effStarter.imageUrl ? <SmartImg src={effStarter.imageUrl} width={420} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 30%' }} /> : <span className="absolute inset-0 flex items-center justify-center text-4xl" style={{ background: '#15101f' }}>🃏</span>}
                  </div>
                  <p className="font-bold" style={{ fontSize: 13, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{tc('starter_deck', effStarter.id, 'name', effStarter.name)}</p>
                  <p style={{ fontSize: 10, color: '#86efac' }}>{effStarter.faction ?? ''} · {effStarter.cardCount} kortų</p>
                  {effStarter.description && <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{tc('starter_deck', effStarter.id, 'description', effStarter.description)}</p>}
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{t('shop.starterInfo')}</p>
                  {toast && <p className="text-center font-semibold py-1.5 px-2 rounded-lg" style={{ fontSize: 10.5, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>{toast}</p>}
                </div>
                <button onClick={() => claimStarter(effStarter)} disabled={busy || effStarter.claimed || (effStarter.priceGold > 0 && bal.silver < effStarter.priceGold)}
                  className="rvn-press shrink-0 mt-2 w-full rounded-xl font-extrabold disabled:opacity-45"
                  style={{ minHeight: 42, fontSize: 12.5, fontFamily: 'var(--rvn-font-display)', background: effStarter.claimed ? 'rgba(74,222,128,0.15)' : 'linear-gradient(180deg,#ffe28c,#f3b62c)', border: effStarter.claimed ? '1px solid rgba(74,222,128,0.5)' : 'none', color: effStarter.claimed ? '#86efac' : '#3a2406' }}>
                  {busy ? '…' : effStarter.claimed ? t('shop.claimedShort') : effStarter.priceGold > 0 ? t('shop.buyGold', { price: effStarter.priceGold }) : t('shop.claimFree')}
                </button>
              </>
            ) : effShop ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                  {(() => { const img = packImgOf(effShop); return img ? (
                    <span className="relative mx-auto block overflow-hidden shrink-0 mt-1 rounded-xl" style={{ width: 132, height: 172, border: '1.5px solid rgba(240,180,41,0.45)', boxShadow: '0 0 18px rgba(240,180,41,0.2)' }}>
                      <SmartImg src={img} width={280} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 32%' }} />
                    </span>
                  ) : null })()}
                  {(() => { const vis = visOf(effShop); return vis ? (
                    <span className="relative mx-auto flex items-center justify-center overflow-hidden shrink-0 mt-1"
                      style={{ width: vis.kind === 'avatar' ? 120 : 118, height: vis.kind === 'avatar' ? 120 : 160, borderRadius: vis.kind === 'avatar' ? 999 : 12,
                        background: vis.imageUrl ? '#0a0810' : (vis.css ?? 'linear-gradient(160deg,#1a1325,#0a0810)'),
                        border: vis.kind === 'avatar' ? '2.5px solid rgba(240,180,41,0.6)' : '1.5px solid rgba(240,180,41,0.35)', boxShadow: '0 0 18px rgba(240,180,41,0.2)' }}>
                      {vis.imageUrl
                        ? <SmartImg src={vis.imageUrl} width={260} className="absolute inset-0 w-full h-full object-cover" />
                        : (vis.emoji && <span style={{ fontSize: 46 }}>{vis.emoji}</span>)}
                    </span>
                  ) : null })()}
                  <p className="font-bold leading-tight" style={{ fontSize: 14, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{shopName(effShop)}</p>
                  {shopDesc(effShop) && <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{shopDesc(effShop)}</p>}
                  <div>
                    <p className="uppercase font-bold mb-1" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>{t('shop.contents')}</p>
                    <div className="flex flex-col gap-1">
                      {effShop.payload.map((p, i) => (
                        <span key={i} className="px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}><RewardChip it={p} size={16} textSize={10.5} /></span>
                      ))}
                    </div>
                  </div>
                  {toast && <p className="text-center font-semibold py-1.5 px-2 rounded-lg" style={{ fontSize: 10.5, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>{toast}</p>}
                </div>
                <div className="shrink-0 mt-2 flex flex-col gap-1.5">
                  {ownedShopItem(effShop) && (
                    <div className="w-full rounded-xl py-2.5 text-center font-bold" style={{ fontSize: 12, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.45)', color: '#86efac', fontFamily: 'var(--rvn-font-display)' }}>{t('shop.ownedEquip')}</div>
                  )}
                  {!ownedShopItem(effShop) && effShop.prices.silver != null && (
                    <button onClick={() => buyShop(effShop, 'silver')} disabled={busy || bal.silver < effShop.prices.silver}
                      className="rvn-press w-full rounded-xl font-extrabold disabled:opacity-45" style={{ minHeight: 40, fontSize: 12, background: 'linear-gradient(180deg,#ffe28c,#f3b62c)', color: '#3a2406', fontFamily: 'var(--rvn-font-display)' }}>
                      {busy ? '…' : t('shop.buyGold', { price: effShop.prices.silver })}
                    </button>
                  )}
                  {!ownedShopItem(effShop) && effShop.prices.rubies != null && (
                    <button onClick={() => buyShop(effShop, 'rubies')} disabled={busy || bal.rubies < effShop.prices.rubies}
                      className="rvn-press w-full rounded-xl font-extrabold disabled:opacity-45" style={{ minHeight: 40, fontSize: 12, background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.5)', fontFamily: 'var(--rvn-font-display)' }}>
                      {busy ? '…' : t('shop.buyRubies', { price: effShop.prices.rubies })}
                    </button>
                  )}
                  {effShop.prices.real_money != null && effShop.prices.silver == null && effShop.prices.rubies == null && (
                    <button disabled className="w-full rounded-xl font-extrabold" style={{ minHeight: 40, fontSize: 12, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>{t('shop.comingSoon', { price: effShop.prices.real_money.toFixed(2) })}</button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center px-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('shop.pickItem')}</div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
