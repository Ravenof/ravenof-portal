'use client'

// ── Ravenof Digital — kortų albumas (binderis su besiverčiančiais puslapiais) ──
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { playCardFlip, playUiClick } from '@/lib/ui-sound'
import { getWallet, getActivePack, type Wallet } from '@/lib/economy'
import { PackOpen } from './PackOpen'
import { rarityColor } from '@/lib/digital/rarity'

const PER_PAGE = 9 // 3x3 binderio kišenės

type OwnedCard = {
  card_id: string; card_number: string | null; name: string; image_url: string | null
  faction: string | null; faction_color: string | null
  rarity: string | null; rarity_color: string | null; sort_order: number | null
  quantity: number
}

function Pocket({ c }: { c: OwnedCard | null }) {
  const [bad, setBad] = useState(false)
  if (!c) return <div className="rounded-md" style={{ aspectRatio: '2.5 / 3.5', border: '1px dashed rgba(240,180,41,0.18)', background: 'rgba(240,180,41,0.02)' }} />
  const col = rarityColor(c.rarity)
  const href = '/cards/' + encodeURIComponent(c.card_number ?? c.card_id)
  return (
    <Link href={href} className="relative block rounded-md overflow-hidden group" style={{ aspectRatio: '2.5 / 3.5', border: `2px solid ${col}`, boxShadow: `0 0 8px ${col}44` }}>
      {c.image_url && !bad
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={c.image_url} alt={c.name} onError={() => setBad(true)} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform" draggable={false} />
        : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center" style={{ background: 'linear-gradient(160deg,#1a1325,#0a0810)' }}>
            <span className="text-base">🎴</span><span className="text-[8px] leading-tight" style={{ color: '#fff' }}>{c.name}</span>
          </div>}
      <span className="absolute top-1 right-1 px-1.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: col, border: `1px solid ${col}` }}>×{c.quantity}</span>
      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.78)' }}>
        <p className="text-[8px] leading-tight truncate" style={{ color: '#fff' }}>{c.name}</p>
      </div>
    </Link>
  )
}

export function DigitalAlbum() {
  const [cards, setCards] = useState<OwnedCard[] | null>(null)
  const [loggedOut, setLoggedOut] = useState(false)
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState(1)
  const [wallet, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [pack, setPack] = useState<{ id: string; name: string; price_gold: number } | null>(null)
  const [opening, setOpening] = useState(false)

  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) setWallet(w) }) }, [])

  const loadCards = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoggedOut(true); setCards([]); return }
    const { data } = await supabase.from('user_collections')
      .select('card_id, quantity, card:cards ( card_number, name, image_url, faction:factions ( name, color_hex ), rarity:rarities ( name, color_hex, sort_order ) )')
      .eq('user_id', user.id).gt('quantity', 0)
    type Row = { card_id: string; quantity: number; card: { card_number: string | null; name: string; image_url: string | null; faction: { name: string; color_hex: string } | null; rarity: { name: string; color_hex: string; sort_order: number } | null } | null }
    const list: OwnedCard[] = ((data as unknown as Row[]) ?? []).filter((r) => r.card).map((r) => ({
      card_id: r.card_id, card_number: r.card!.card_number, name: r.card!.name, image_url: r.card!.image_url,
      faction: r.card!.faction?.name ?? null, faction_color: r.card!.faction?.color_hex ?? null,
      rarity: r.card!.rarity?.name ?? null, rarity_color: r.card!.rarity?.color_hex ?? null, sort_order: r.card!.rarity?.sort_order ?? null,
      quantity: r.quantity,
    }))
    list.sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0) || a.name.localeCompare(b.name))
    setCards(list)
  }, [])

  useEffect(() => { loadCards(); refreshWallet(); getActivePack().then(setPack) }, [loadCards, refreshWallet])

  const pageCount = Math.max(1, Math.ceil((cards?.length ?? 0) / PER_PAGE))
  const clampedPage = Math.min(page, pageCount - 1)
  const pocketCards = useMemo(() => {
    const start = clampedPage * PER_PAGE
    const slice = (cards ?? []).slice(start, start + PER_PAGE)
    return Array.from({ length: PER_PAGE }, (_, i) => slice[i] ?? null)
  }, [cards, clampedPage])

  const go = (d: number) => {
    const next = clampedPage + d
    if (next < 0 || next >= pageCount) return
    playCardFlip(); setDir(d); setPage(next)
  }

  if (cards === null) return <p className="text-center text-sm py-16" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>📖 KORTŲ ALBUMAS</h1>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cards.length} kortų</span>
      </div>

      {loggedOut ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad matytum kolekciją. <Link href="/login?next=/digital/album" className="underline" style={{ color: 'var(--gold)' }}>Prisijungti</Link></p>
      ) : cards.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>Albumas tuščias — atplėšk pakuotę žemiau 🎁</p>
      ) : (
        <>
          {/* Binderio puslapis */}
          <div className="relative mx-auto max-w-[460px]" style={{ perspective: 1500 }}>
            <div className="relative" style={{ clipPath: 'polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px)', background: 'rgba(240,180,41,0.4)', padding: 3 }}>
              <div className="p-3" style={{ clipPath: 'polygon(13px 0,calc(100% - 13px) 0,100% 13px,100% calc(100% - 13px),calc(100% - 13px) 100%,13px 100%,0 calc(100% - 13px),0 13px)', background: 'radial-gradient(120% 70% at 50% 0%, rgba(240,180,41,0.08), rgba(10,8,16,0.96) 60%), linear-gradient(160deg,#1a1228,#0a0810)' }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={clampedPage}
                    initial={{ rotateY: dir > 0 ? 75 : -75, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: dir > 0 ? -75 : 75, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ transformOrigin: dir > 0 ? 'left center' : 'right center', transformStyle: 'preserve-3d' }}
                    className="grid grid-cols-3 gap-2">
                    {pocketCards.map((c, i) => <Pocket key={i} c={c} />)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Puslapių valdymas */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => go(-1)} disabled={clampedPage === 0} className="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-30" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>‹</button>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}>{clampedPage + 1} / {pageCount}</span>
            <button onClick={() => go(1)} disabled={clampedPage >= pageCount - 1} className="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-30" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>›</button>
          </div>
        </>
      )}

      {/* Apatinė juosta: auksas + pakuotės + atidaryti */}
      <div className="relative mx-auto max-w-[460px]" style={{ clipPath: 'polygon(12px 0,calc(100% - 12px) 0,100% 12px,100% calc(100% - 12px),calc(100% - 12px) 100%,12px 100%,0 calc(100% - 12px),0 12px)', background: 'rgba(251,146,60,0.45)', padding: 2.5 }}>
        <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ clipPath: 'polygon(11px 0,calc(100% - 11px) 0,100% 11px,100% calc(100% - 11px),calc(100% - 11px) 100%,11px 100%,0 calc(100% - 11px),0 11px)', background: 'linear-gradient(160deg,#1a1228,#0a0810)' }}>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            🪙 <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{wallet.gold.toLocaleString('lt-LT')}</span>
            <span className="mx-1.5 opacity-40">·</span>
            🎁 <span style={{ color: '#fdba74', fontWeight: 700 }}>{wallet.packs}</span> pak.
          </div>
          {wallet.packs > 0 && pack ? (
            <button onClick={() => { playUiClick(); setOpening(true) }} className="px-4 py-2 rounded-xl text-xs font-bold transition-transform hover:scale-[1.03] active:scale-95" style={{ background: 'rgba(251,146,60,0.2)', border: '1px solid rgba(251,146,60,0.6)', color: '#fdba74', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>🎁 Atidaryti pakuotę</button>
          ) : (
            <Link href="/digital" onClick={() => playUiClick()} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(240,180,41,0.12)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Pirkti parduotuvėje</Link>
          )}
        </div>
      </div>

      {opening && pack && (
        <PackOpen packId={pack.id} packName={pack.name}
          onClose={() => { setOpening(false); refreshWallet() }}
          onOpened={() => { refreshWallet(); loadCards() }} />
      )}
    </div>
  )
}
