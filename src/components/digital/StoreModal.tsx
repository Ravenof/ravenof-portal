'use client'

// ── PARDUOTUVĖ (perdaryta nuo nulio) — visos prekės tinklelyje, filtrai viršuje ─
// Plytelė: FIKSUOTO px aukščio mygtukas (kad CSS Grid eilutės nepersidengtų),
// viršuje paveikslas (object-contain), apačioje pavadinimas + kaina/veiksmas.
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
  actionLabel: string; state: ProdState; disabled: boolean; onAction: () => void
}

export function StoreModal({ gold, onClose, onChanged }: { gold: number; onClose: () => void; onChanged?: () => void }) {
  const [cat, setCat] = useState<Cat>('all')
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
      img: { url: p.image_url, emoji: '🎴' }, actionLabel: `🪙 ${p.price_gold}`, state: 'buy',
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
      img: { url: s.imageUrl, emoji: '🃏' },
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

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="relative w-[min(640px,97vw)] max-h-[92vh]" style={{ borderRadius: 20, background: 'rgba(240,180,41,0.32)', padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col max-h-[92vh]" style={{ borderRadius: 19, background: 'radial-gradient(120% 60% at 50% 0%, rgba(240,180,41,0.13), rgba(10,8,16,0.98) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>

          {/* Antraštė + filtrai */}
          <div className="px-5 pt-5 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-bold inline-flex items-center gap-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}><RvnIcon name="fi-shop" size={24} fallback={<span>🛒</span>} /> PARDUOTUVĖ</p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                🪙 {localGold.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATS.map((c) => (
                <button key={c.key} onClick={() => { playUiClick(); setCat(c.key); setMsg(null) }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-transform hover:scale-105 active:scale-95"
                  style={{ background: cat === c.key ? `rgba(${c.col},0.22)` : 'rgba(10,8,16,0.9)', border: `1px solid rgba(${c.col},${cat === c.key ? 0.7 : 0.4})`, color: cat === c.key ? `rgb(${c.col})` : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}>
                  {c.label}
                </button>
              ))}
            </div>
            {packInv > 0 && (
              <Link href="/digital/collection" onClick={() => { playUiClick(); onClose() }}
                className="mt-3 block w-full px-4 py-2 rounded-xl text-xs font-bold text-center transition-transform hover:scale-[1.01]"
                style={{ background: 'rgba(251,146,60,0.18)', border: '1px solid rgba(251,146,60,0.6)', color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>
                🎁 Atplėšti albume (turi {packInv})
              </Link>
            )}
          </div>

          {/* Tinklelis */}
          <div className="px-5 pb-4 flex-1 min-h-0 overflow-y-auto">
            {loading && <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
            {!loading && shown.length === 0 && <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>Šioje kategorijoje prekių nėra.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shown.map((p) => <ProductTile key={p.key} p={p} busy={busy === p.key} />)}
            </div>
          </div>

          {/* Apačia */}
          <div className="px-5 py-2.5 shrink-0 flex items-center justify-between" style={{ borderTop: '1px solid rgba(240,180,41,0.15)' }}>
            <span className="text-[11px]" style={{ color: msg ? 'var(--gold)' : 'var(--text-muted)' }}>{msg ?? `${shown.length} prekių`}</span>
            <button onClick={() => { playUiClick(); onClose() }} className="text-xs" style={{ color: 'var(--text-muted)' }}>Uždaryti</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const TILE_H = 246  // fiksuotas px aukštis – kad grid eilutės nepersidengtų

function ProductTile({ p, busy }: { p: Prod; busy: boolean }) {
  const [bad, setBad] = useState(false)
  const a = p.accent
  const done = p.state === 'done' || p.state === 'equipped'
  const actCol = done ? '74,222,128' : a
  return (
    <button onClick={p.onAction} disabled={p.disabled || busy}
      className="group relative w-full overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-default"
      style={{ height: TILE_H, borderRadius: 14, background: `rgba(${a},0.5)`, padding: 2 }}>
      <div className="relative h-full w-full flex flex-col" style={{ borderRadius: 13, background: '#0a0810' }}>
        {/* paveikslas (užima didžiąją dalį) */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
          style={{ background: p.img.css ?? `radial-gradient(120% 100% at 50% 0%, rgba(${a},0.22), #0a0810 70%)` }}>
          {p.img.url && !bad ? (
            <SmartImg src={p.img.url} width={360} onFail={() => setBad(true)} className="absolute inset-0 w-full h-full object-contain" style={{ opacity: done ? 0.5 : 1 }} />
          ) : p.img.emoji ? (
            <span className="text-4xl" style={{ filter: `drop-shadow(0 0 10px rgba(${a},0.5))`, opacity: done ? 0.5 : 1 }}>{p.img.emoji}</span>
          ) : null}
        </div>
        {/* apačia: pavadinimas + kaina/veiksmas */}
        <div className="px-2 pt-1.5 pb-2 shrink-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.4))' }}>
          <p className="text-[11px] font-bold leading-tight truncate text-left" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{p.title}</p>
          {p.sub && <p className="text-[8px] uppercase tracking-widest truncate text-left mb-1" style={{ color: `rgb(${a})` }}>{p.sub}</p>}
          <span className="mt-0.5 flex w-full items-center justify-center px-2 py-1 rounded-lg text-[11px] font-bold"
            style={{ background: p.disabled && !done ? 'rgba(255,255,255,0.05)' : `rgba(${actCol},0.18)`, border: `1px solid rgba(${actCol},${p.disabled && !done ? 0.25 : 0.6})`, color: p.disabled && !done ? 'var(--text-muted)' : `rgb(${actCol})`, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}>
            {busy ? '…' : p.actionLabel}
          </span>
        </div>
      </div>
    </button>
  )
}
