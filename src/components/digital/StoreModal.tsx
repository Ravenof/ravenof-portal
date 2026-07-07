'use client'

// ── PARDUOTUVĖ — pilnaekranis landscape overlay, 3 zonos:
// kairė kategorijos · centras prekių grid (scroll tik jame) · dešinė pasirinktos
// prekės preview + kaina + PIRKTI mygtukas (visada matomas).
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getActivePacks, buyPack, type Pack } from '@/lib/economy'
import { getDailyDeal, buyDailyDealCard, getCosmetics, buyCosmetic, equipCosmetic,
  type DealCard, type Cosmetic, type CosmeticKind, type CosmeticsState } from '@/lib/cosmetics'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { rarityColor } from '@/lib/digital/rarity'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { RvnIcon } from './ui/RvnIcon'
import { SmartImg } from '@/components/ui/SmartImg'
import { useEscClose } from '@/lib/useEscClose'

function hexRgb(hex: string): string {
  const h = (hex || '#9ca3af').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

type Cat = 'all' | 'packs' | 'daily' | 'starter' | 'card_back' | 'board' | 'avatar'
const CATS: { key: Cat; label: string; col: string }[] = [
  { key: 'all',       label: '✦ Visi',           col: '240,180,41' },
  { key: 'packs',     label: '🎁 Pakuotės',      col: '240,180,41' },
  { key: 'daily',     label: '🔥 Dienos kortos', col: '251,146,60' },
  { key: 'starter',   label: '🆓 Starter',        col: '34,197,94' },
  { key: 'card_back', label: '🂠 Nugarėlės',      col: '96,165,250' },
  { key: 'board',     label: '▦ Lentos',          col: '139,92,246' },
  { key: 'avatar',    label: '😀 Avatarai',       col: '236,72,153' },
]
const KIND_COL: Record<CosmeticKind, string> = { card_back: '96,165,250', board: '139,92,246', avatar: '236,72,153' }

type ProdState = 'buy' | 'done' | 'equip' | 'equipped'
type Prod = {
  key: string; cat: Exclude<Cat, 'all'>; title: string; sub?: string; accent: string
  img: { url?: string | null; css?: string | null; emoji?: string | null }
  /** 'cover' – užpildo plytelę (aukšti pack/starter vaizdai), default 'contain' */
  fit?: 'cover' | 'contain'
  actionLabel: string; state: ProdState; disabled: boolean; onAction: () => void
}

export function StoreModal({ gold, onClose, onChanged }: { gold: number; onClose: () => void; onChanged?: () => void }) {
  useEscClose(onClose)
  const [cat, setCat] = useState<Cat>('all')
  const [selKey, setSelKey] = useState<string | null>(null)
  const [localGold, setLocalGold] = useState(gold)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [packs, setPacks] = useState<Pack[]>([])
  const [packInv, setPackInv] = useState(0)
  const [deal, setDeal] = useState<DealCard[]>([])
  const [starters, setStarters] = useState<StarterDeck[]>([])
  const [cos, setCos] = useState<CosmeticsState | null>(null)

  useEffect(() => { setLocalGold(gold) }, [gold])
  useEffect(() => {
    Promise.all([getActivePacks(), getDailyDeal(), getStarterDecks(), getCosmetics()])
      .then(([p, d, s, c]) => { setPacks(p); setDeal(d?.cards ?? []); setStarters(s); setCos(c); setLoading(false) })
  }, [])

  const flash = (m: string, e = false) => { (e ? playError : playSuccess)(); setMsg(m) }
  const equippedFor = (k: CosmeticKind) =>
    k === 'card_back' ? cos?.equippedCardBack : k === 'board' ? cos?.equippedBoard : cos?.equippedAvatar

  // ── veiksmai ──
  const doBuyPack = async (p: Pack) => {
    if (busy) return; setBusy('pack:' + p.id); playUiClick()
    const r = await buyPack(p.id); setBusy(null)
    if ('error' in r) return flash(r.error === 'not enough gold' ? 'Per mažai aukso.' : 'Nepavyko nupirkti.', true)
    setLocalGold(r.gold); setPackInv(r.packs); flash('Pakuotė nupirkta! 🎁'); onChanged?.()
  }
  const doBuyDeal = async (c: DealCard) => {
    if (busy) return; setBusy('deal:' + c.id); playUiClick()
    const r = await buyDailyDealCard(c.id); setBusy(null)
    if ('error' in r) return flash(r.error === 'not enough gold' ? 'Per mažai aukso.' : 'Nepavyko nupirkti.', true)
    setLocalGold(r.gold); setDeal((p) => p.map((x) => x.id === c.id ? { ...x, bought: true } : x)); flash(`${c.name} pridėta!`); onChanged?.()
  }
  const doClaimStarter = async (s: StarterDeck) => {
    if (busy) return; setBusy('sd:' + s.id); playUiClick()
    const r = await claimStarterDeck(s.id); setBusy(null)
    if ('error' in r) return flash(r.error === 'already claimed' ? 'Jau paimta.' : 'Nepavyko paimti.', true)
    setStarters((p) => p.map((x) => x.id === s.id ? { ...x, claimed: true } : x)); flash('Kaladė sukurta „Mano kaladėse"! 🃏'); onChanged?.()
  }
  const doBuyCos = async (c: Cosmetic) => {
    if (busy) return; setBusy('cos:' + c.id); playUiClick()
    const r = await buyCosmetic(c.id); setBusy(null)
    if ('error' in r) return flash(r.error === 'not enough gold' ? 'Per mažai aukso.' : 'Nepavyko nupirkti.', true)
    setLocalGold(r.gold); flash(`${c.name} nupirkta!`); onChanged?.(); getCosmetics().then(setCos)
  }
  const doEquipCos = async (c: Cosmetic) => {
    if (busy) return; const eq = equippedFor(c.kind) === c.id; setBusy('cos:' + c.id); playUiClick()
    const ok = await equipCosmetic(c.kind, eq ? null : c.id); setBusy(null)
    if (!ok) return flash('Nepavyko.', true)
    playSuccess(); getCosmetics().then(setCos)
  }

  // ── prekės ──
  const products = useMemo<Prod[]>(() => {
    const out: Prod[] = []
    for (const p of packs) out.push({
      key: 'pack:' + p.id, cat: 'packs', title: p.name, sub: '10 kortų', accent: '240,180,41',
      img: { url: p.image_url, emoji: '🎴' }, fit: 'cover', actionLabel: `🪙 ${p.price_gold}`, state: 'buy',
      disabled: localGold < p.price_gold, onAction: () => doBuyPack(p),
    })
    for (const c of deal) out.push({
      key: 'deal:' + c.id, cat: 'daily', title: c.name, sub: c.rarity ?? undefined, accent: hexRgb(rarityColor(c.rarity)),
      img: { url: c.imageUrl, emoji: '🎴' },
      actionLabel: c.bought ? '✓ Nupirkta' : `🪙 ${c.priceGold}`, state: c.bought ? 'done' : 'buy',
      disabled: c.bought || localGold < c.priceGold, onAction: () => doBuyDeal(c),
    })
    for (const s of starters) out.push({
      key: 'sd:' + s.id, cat: 'starter', title: s.name, sub: `${s.cardCount} kortų`, accent: '34,197,94',
      img: { url: s.imageUrl, emoji: '🃏' }, fit: 'cover',
      actionLabel: s.claimed ? '✓ Paimta' : (s.priceGold > 0 ? `🪙 ${s.priceGold}` : 'NEMOKAMA'),
      state: s.claimed ? 'done' : 'buy', disabled: s.claimed, onAction: () => doClaimStarter(s),
    })
    for (const c of (cos?.items ?? [])) {
      const owned = (cos?.owned ?? []).includes(c.id)
      const equipped = equippedFor(c.kind) === c.id
      out.push({
        key: 'cos:' + c.id, cat: c.kind, title: c.name, accent: KIND_COL[c.kind],
        img: { url: c.imageUrl, css: c.css, emoji: c.emoji },
        actionLabel: owned ? (equipped ? '✓ Naudojama' : 'Naudoti') : `🪙 ${c.priceGold}`,
        state: owned ? (equipped ? 'equipped' : 'equip') : 'buy',
        disabled: !owned && localGold < c.priceGold, onAction: () => owned ? doEquipCos(c) : doBuyCos(c),
      })
    }
    return out
  }, [packs, deal, starters, cos, localGold]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = cat === 'all' ? products : products.filter((p) => p.cat === cat)
  const selected = shown.find((p) => p.key === selKey) ?? shown[0] ?? null

  const canAfford = selected ? !selected.disabled : false

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2" style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="relative w-[min(1150px,98vw)] h-[min(660px,96vh)]" style={{ borderRadius: 20, background: 'rgba(240,180,41,0.32)', padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col h-full" style={{ borderRadius: 19, background: 'radial-gradient(120% 60% at 50% 0%, rgba(240,180,41,0.13), rgba(10,8,16,0.98) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>

          {/* ── Antraštė ── */}
          <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
            <p className="font-bold inline-flex items-center gap-2" style={{ fontSize: 'clamp(14px,2.6vh,19px)', fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}><RvnIcon name="fi-shop" size={24} fallback={<span>🛒</span>} /> PARDUOTUVĖ</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                🪙 {localGold.toLocaleString()}
              </span>
              <button onClick={() => { playUiClick(); onClose() }} aria-label="Uždaryti" className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>✕</button>
            </div>
          </div>

          {/* ── 3 zonos ── */}
          <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(128px,0.7fr) minmax(0,2.4fr) minmax(200px,1fr)' }}>

            {/* KAIRĖ: kategorijos */}
            <div className="flex flex-col min-h-0 gap-1.5">
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5">
                {CATS.map((c) => (
                  <button key={c.key} onClick={() => { playUiClick(); setCat(c.key); setSelKey(null); setMsg(null) }}
                    className="rvn-press shrink-0 w-full text-left px-2.5 py-2 rounded-xl font-bold"
                    style={{ fontSize: 11, background: cat === c.key ? `rgba(${c.col},0.2)` : 'rgba(10,8,16,0.8)', border: `1px solid rgba(${c.col},${cat === c.key ? 0.7 : 0.3})`, color: cat === c.key ? `rgb(${c.col})` : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}>
                    {c.label}
                  </button>
                ))}
              </div>
              {packInv > 0 && (
                <Link href="/digital/collection" onClick={() => { playUiClick(); onClose() }}
                  className="shrink-0 block w-full px-2 py-2 rounded-xl font-bold text-center"
                  style={{ fontSize: 10, background: 'rgba(251,146,60,0.18)', border: '1px solid rgba(251,146,60,0.6)', color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>
                  🎁 Atplėšti ({packInv})
                </Link>
              )}
            </div>

            {/* CENTRAS: prekių grid */}
            <div className="min-h-0 overflow-y-auto">
              {loading && <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
              {!loading && shown.length === 0 && <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>Šioje kategorijoje prekių nėra.</p>}
              <div className="grid gap-2 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))' }}>
                {shown.map((p) => <ProductTile key={p.key} p={p} selected={selected?.key === p.key} onSelect={() => { playUiClick(); setSelKey(p.key); setMsg(null) }} />)}
              </div>
            </div>

            {/* DEŠINĖ: pasirinktos prekės preview + pirkti */}
            <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(240,180,41,0.22)' }}>
              {selected ? (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                    <ProductImage p={selected} />
                    <p className="font-bold leading-tight" style={{ fontSize: 14, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{selected.title}</p>
                    {selected.sub && <p className="uppercase tracking-widest" style={{ fontSize: 9, color: `rgb(${selected.accent})` }}>{selected.sub}</p>}
                    <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {selected.cat === 'packs' ? 'Pakuotėje — 10 kortų. Retesnės kortos krenta paskutiniame slote.'
                        : selected.cat === 'daily' ? 'Dienos pasiūlymas — pavienė korta tiesiai į kolekciją. Atsinaujina kasdien.'
                        : selected.cat === 'starter' ? 'Pilna paruošta kaladė — kortos pridedamos į kolekciją ir sukuriama kaladė.'
                        : selected.cat === 'card_back' ? 'Kortų nugarėlė — matoma kovose tau ir varžovui.'
                        : selected.cat === 'board' ? 'Kovos lentos išvaizda.'
                        : 'Profilio avataras.'}
                    </p>
                    {msg && <p className="text-center font-semibold py-1.5 px-2 rounded-lg" style={{ fontSize: 10.5, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>{msg}</p>}
                  </div>
                  <button onClick={selected.onAction} disabled={selected.disabled || busy === selected.key}
                    className="rvn-press shrink-0 mt-2 w-full rounded-xl font-bold disabled:opacity-45"
                    style={{ minHeight: 42, fontSize: 13, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em',
                      background: selected.state === 'done' || selected.state === 'equipped' ? 'rgba(74,222,128,0.15)' : canAfford ? 'linear-gradient(180deg,#ffe28c,#f3b62c)' : 'rgba(255,255,255,0.06)',
                      border: selected.state === 'done' || selected.state === 'equipped' ? '1px solid rgba(74,222,128,0.5)' : 'none',
                      color: selected.state === 'done' || selected.state === 'equipped' ? '#86efac' : canAfford ? '#3a2406' : 'var(--text-muted)' }}>
                    {busy === selected.key ? '…' : selected.state === 'buy' ? (selected.actionLabel.startsWith('🪙') ? `Pirkti · ${selected.actionLabel}` : selected.actionLabel === 'NEMOKAMA' ? 'Paimti nemokamai' : selected.actionLabel) : selected.actionLabel}
                  </button>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center px-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pasirink prekę, kad matytum detales.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductImage({ p }: { p: Prod }) {
  const [bad, setBad] = useState(false)
  const a = p.accent
  return (
    <div className="relative w-full rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
      style={{ aspectRatio: p.fit === 'cover' ? '3 / 3.4' : '1 / 1', maxHeight: 240, background: p.img.css ?? `radial-gradient(120% 100% at 50% 0%, rgba(${a},0.22), #0a0810 70%)`, border: `1.5px solid rgba(${a},0.5)` }}>
      {p.img.url && !bad ? (
        <SmartImg src={p.img.url} width={420} onFail={() => setBad(true)}
          className={`absolute inset-0 w-full h-full ${p.fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
      ) : p.img.emoji ? (
        <span className="text-6xl" style={{ filter: `drop-shadow(0 0 14px rgba(${a},0.5))` }}>{p.img.emoji}</span>
      ) : null}
    </div>
  )
}

function ProductTile({ p, selected, onSelect }: { p: Prod; selected: boolean; onSelect: () => void }) {
  const [bad, setBad] = useState(false)
  const a = p.accent
  const done = p.state === 'done' || p.state === 'equipped'
  const actCol = done ? '74,222,128' : a
  return (
    <button onClick={onSelect}
      className="group relative w-full overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{ borderRadius: 14, background: selected ? 'rgba(240,180,41,0.95)' : `rgba(${a},0.5)`, padding: 2, boxShadow: selected ? '0 0 14px rgba(240,180,41,0.45)' : 'none' }}>
      <div className="relative w-full flex flex-col" style={{ borderRadius: 13, background: '#0a0810' }}>
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '3 / 3.1', background: p.img.css ?? `radial-gradient(120% 100% at 50% 0%, rgba(${a},0.22), #0a0810 70%)` }}>
          {p.img.url && !bad ? (
            <SmartImg src={p.img.url} width={240} onFail={() => setBad(true)}
              className={`absolute inset-0 w-full h-full ${p.fit === 'cover' ? 'object-cover' : 'object-contain'}`}
              style={{ opacity: done ? 0.5 : 1, ...(p.fit === 'cover' ? { objectPosition: '50% 32%' } : null) }} />
          ) : p.img.emoji ? (
            <span className="absolute inset-0 flex items-center justify-center text-4xl" style={{ filter: `drop-shadow(0 0 10px rgba(${a},0.5))`, opacity: done ? 0.5 : 1 }}>{p.img.emoji}</span>
          ) : null}
        </div>
        <div className="px-1.5 pt-1 pb-1.5 shrink-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.4))' }}>
          <p className="font-bold leading-tight truncate text-left" style={{ fontSize: 10, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{p.title}</p>
          <span className="mt-0.5 flex w-full items-center justify-center px-1 py-0.5 rounded-md font-bold"
            style={{ fontSize: 9.5, background: `rgba(${actCol},0.16)`, border: `1px solid rgba(${actCol},0.5)`, color: `rgb(${actCol})`, fontFamily: 'var(--rvn-font-display)' }}>
            {p.actionLabel}
          </span>
        </div>
      </div>
    </button>
  )
}

// (senas TILE_H nebe naudojamas)
