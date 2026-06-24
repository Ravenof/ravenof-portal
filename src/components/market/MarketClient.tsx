'use client'

// ── Aukcionas — „turgus su kortomis ant stalų" (naršyk / parduok / mano) ──────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getWallet } from '@/lib/economy'
import { rarityColor } from '@/lib/digital/rarity'
import { browseListings, myListings, listCard, cancelListing, buyListing, myCollection,
  type Listing, type MyListing, type OwnedCard } from '@/lib/market'
import { CardLightbox } from '@/components/rules/CardLightbox'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'

function CardArt({ url, name }: { url: string | null; name: string }) {
  const [bad, setBad] = useState(false)
  if (url && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} onError={() => setBad(true)} className="absolute inset-0 w-full h-full object-contain" draggable={false} />
  }
  return <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1 text-center" style={{ background: 'linear-gradient(160deg,#1a1325,#0a0810)' }}>
    <span className="text-xl">🎴</span><span className="text-[9px] font-bold leading-tight" style={{ color: '#fff' }}>{name}</span>
  </div>
}

type Tab = 'browse' | 'sell' | 'mine'

export function MarketClient() {
  const [tab, setTab] = useState<Tab>('browse')
  const [gold, setGold] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [qCard, setQCard] = useState('')
  const [qSeller, setQSeller] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [mine, setMine] = useState<MyListing[]>([])
  const [coll, setColl] = useState<OwnedCard[]>([])
  const [sellSel, setSellSel] = useState<OwnedCard | null>(null)
  const [price, setPrice] = useState('')
  const [collQ, setCollQ] = useState('')
  const [detail, setDetail] = useState<{ src: string; alt: string } | null>(null)
  const lpRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshGold = useCallback(() => { getWallet().then((w) => w && setGold(w.gold)) }, [])
  const doBrowse = useCallback(() => { browseListings(qCard, qSeller).then(setListings) }, [qCard, qSeller])
  const lp = (url: string | null, name: string) => ({
    onPointerDown: () => { if (!url) return; lpRef.current = setTimeout(() => { lpRef.current = null; setDetail({ src: url, alt: name }) }, 420) },
    onPointerUp: () => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } },
    onPointerLeave: () => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } },
  })
  const viewStall = (seller: string | null) => { if (!seller) return; playUiClick(); setQSeller(seller); setQCard(''); setTab('browse'); browseListings('', seller).then(setListings) }

  useEffect(() => { refreshGold(); doBrowse() }, [refreshGold]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'mine') myListings().then(setMine); if (tab === 'sell') myCollection().then(setColl) }, [tab])

  const flash = (m: string, e = false) => { (e ? playError : playSuccess)(); setMsg(m); setTimeout(() => setMsg(null), 2600) }

  const buy = async (l: Listing) => {
    if (busy) return; setBusy(l.id); playUiClick()
    const r = await buyListing(l.id); setBusy(null)
    if ('error' in r) return flash(r.error === 'not enough gold' ? 'Per mažai aukso.' : r.error, true)
    setGold(r.gold); setListings((p) => p.filter((x) => x.id !== l.id)); flash(`${l.name} nupirkta!`)
  }
  const sell = async () => {
    if (!sellSel || busy) return
    const p = parseInt(price, 10)
    if (!p || p <= 0) return flash('Įvesk kainą.', true)
    setBusy('sell'); playUiClick()
    const r = await listCard(sellSel.cardId, p); setBusy(null)
    if ('error' in r) return flash(r.error, true)
    flash(`${sellSel.name} įdėta į aukcioną!`); setSellSel(null); setPrice(''); myCollection().then(setColl); doBrowse()
  }
  const cancel = async (m: MyListing) => {
    if (busy) return; setBusy(m.id); playUiClick()
    const r = await cancelListing(m.id); setBusy(null)
    if ('error' in r) return flash('Nepavyko atšaukti.', true)
    setMine((p) => p.filter((x) => x.id !== m.id)); flash(`${m.name} grąžinta į kolekciją.`)
  }

  const collShown = useMemo(() => coll.filter((c) => !collQ || c.name.toLowerCase().includes(collQ.toLowerCase())), [coll, collQ])

  const TABS: { k: Tab; l: string }[] = [{ k: 'browse', l: '🛒 Naršyti' }, { k: 'sell', l: '🏷️ Parduoti' }, { k: 'mine', l: '📦 Mano' }]
  const board = { background: 'linear-gradient(160deg,#1c130c,#0d0805)', border: '1px solid rgba(146,84,40,0.5)' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => { playUiClick(); setTab(t.k) }} className="px-3 py-1.5 rounded-full text-xs font-bold transition-transform hover:scale-105"
              style={{ background: tab === t.k ? 'rgba(240,180,41,0.2)' : 'var(--bg-surface)', border: '1px solid ' + (tab === t.k ? 'rgba(240,180,41,0.6)' : 'var(--bg-border)'), color: tab === t.k ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>{t.l}</button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold" style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.55)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>🪙 {gold.toLocaleString()}</span>
      </div>

      {msg && <p className="text-xs text-center" style={{ color: 'var(--gold)' }}>{msg}</p>}

      {tab === 'browse' && (
        <>
          <div className="flex gap-2 flex-wrap">
            <input value={qCard} onChange={(e) => setQCard(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doBrowse()} placeholder="Ieškoti kortos…" className="flex-1 min-w-[140px] px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
            <input value={qSeller} onChange={(e) => setQSeller(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doBrowse()} placeholder="Pardavėjas…" className="w-36 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
            <button onClick={() => { playUiClick(); doBrowse() }} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)' }}>Ieškoti</button>
          </div>
          {qSeller && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)' }}>
              <span className="text-xs" style={{ color: '#93c5fd' }}>🏪 {qSeller} stalas</span>
              <button onClick={() => { setQSeller(''); browseListings(qCard, '').then(setListings) }} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Visi stalai ✕</button>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {listings.map((l) => {
              const col = rarityColor(l.rarity)
              return (
                <div key={l.id} className="rounded-lg p-2 flex flex-col" style={board}>
                  <div {...lp(l.imageUrl, l.name)} className="relative w-full overflow-hidden rounded cursor-pointer" style={{ height: 200, border: `2px solid ${col}`, background: '#0d0805' }}><CardArt url={l.imageUrl} name={l.name} /></div>
                  <p className="text-[11px] font-bold truncate mt-1.5" style={{ color: '#f3ead3' }}>{l.name}</p>
                  <button onClick={() => viewStall(l.seller)} className="text-[9px] truncate text-left hover:underline" style={{ color: '#93c5fd' }}>@{l.seller ?? '?'}</button>
                  <button onClick={() => buy(l)} disabled={busy === l.id || gold < l.price}
                    className="mt-1.5 w-full px-2 py-1.5 rounded-lg text-xs font-bold transition-transform hover:scale-[1.03] disabled:opacity-40"
                    style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                    {busy === l.id ? '…' : `🪙 ${l.price}`}
                  </button>
                </div>
              )
            })}
            {listings.length === 0 && <p className="col-span-full text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Nieko nerasta turguje.</p>}
          </div>
        </>
      )}

      {tab === 'sell' && (
        <>
          {sellSel ? (
            <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <div className="relative w-20 h-28 rounded overflow-hidden shrink-0" style={{ border: `2px solid ${rarityColor(sellSel.rarity)}` }}><CardArt url={sellSel.imageUrl} name={sellSel.name} /></div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{sellSel.name}</p>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Turi: {sellSel.quantity}</p>
                <div className="flex gap-2 items-center flex-wrap">
                  <input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Kaina 🪙" className="w-28 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
                  <button onClick={sell} disabled={busy === 'sell'} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50" style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)' }}>{busy === 'sell' ? '…' : 'Įdėti į aukcioną'}</button>
                  <button onClick={() => { setSellSel(null); setPrice('') }} className="text-xs" style={{ color: 'var(--text-muted)' }}>Atšaukti</button>
                </div>
              </div>
            </div>
          ) : (
            <input value={collQ} onChange={(e) => setCollQ(e.target.value)} placeholder="Ieškoti savo kortos…" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
          )}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
            {collShown.map((c) => {
              const col = rarityColor(c.rarity)
              return (
                <button key={c.cardId} onClick={() => { playUiClick(); setSellSel(c) }} className="relative rounded overflow-hidden transition-transform hover:scale-105" style={{ height: 110, border: `2px solid ${col}` }}>
                  <CardArt url={c.imageUrl} name={c.name} />
                  {c.quantity > 1 && <span className="absolute top-0.5 right-0.5 px-1 rounded text-[9px] font-bold" style={{ background: 'rgba(0,0,0,0.8)', color: '#fff' }}>×{c.quantity}</span>}
                </button>
              )
            })}
            {coll.length === 0 && <p className="col-span-full text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Tavo kolekcija tuščia.</p>}
          </div>
        </>
      )}

      {tab === 'mine' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {mine.map((m) => {
            const col = rarityColor(m.rarity)
            return (
              <div key={m.id} className="rounded-lg p-2 flex flex-col" style={board}>
                <div {...lp(m.imageUrl, m.name)} className="relative w-full overflow-hidden rounded cursor-pointer" style={{ height: 200, border: `2px solid ${col}`, background: '#0d0805' }}><CardArt url={m.imageUrl} name={m.name} /></div>
                <p className="text-[11px] font-bold truncate mt-1.5" style={{ color: '#f3ead3' }}>{m.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--gold)' }}>🪙 {m.price}</p>
                <button onClick={() => cancel(m)} disabled={busy === m.id} className="mt-1.5 w-full px-2 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>{busy === m.id ? '…' : 'Atšaukti'}</button>
              </div>
            )
          })}
          {mine.length === 0 && <p className="col-span-full text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Neturi aktyvių listing&apos;ų.</p>}
        </div>
      )}
      {detail && <CardLightbox src={detail.src} alt={detail.alt} onClose={() => setDetail(null)} />}
    </div>
  )
}
