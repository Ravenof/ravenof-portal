'use client'

// ── Vieninga PARDUOTUVĖ: pakuotės · dienos kortos · starter kaladės · kosmetika ─
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getActivePacks, buyPack, type Pack } from '@/lib/economy'
import { getDailyDeal, buyDailyDealCard, getCosmetics, buyCosmetic, equipCosmetic,
  type DealCard, type Cosmetic, type CosmeticKind, type CosmeticsState } from '@/lib/cosmetics'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { rarityColor } from '@/lib/digital/rarity'
import { GameCard } from '@/components/ui/GameCard'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'

const oct = (b: number) =>
  `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`

type Cat = 'packs' | 'daily' | 'starter' | 'card_back' | 'board' | 'avatar'
const CATS: { key: Cat; label: string; col: string }[] = [
  { key: 'packs',     label: '🎁 Pakuotės',     col: '240,180,41' },
  { key: 'daily',     label: '🔥 Dienos kortos', col: '251,146,60' },
  { key: 'starter',   label: '🆓 Starter kaladės', col: '34,197,94' },
  { key: 'card_back', label: '🂠 Nugarėlės',     col: '96,165,250' },
  { key: 'board',     label: '▦ Lentos',         col: '139,92,246' },
  { key: 'avatar',    label: '😀 Avatarai',      col: '236,72,153' },
]

function DealArt({ card }: { card: DealCard }) {
  const [bad, setBad] = useState(false)
  const col = rarityColor(card.rarity)
  if (card.imageUrl && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={card.imageUrl} alt={card.name} onError={() => setBad(true)} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center" style={{ background: 'linear-gradient(160deg, #1a1325, #0a0810)' }}>
      <span className="text-2xl">🎴</span>
      <span className="text-[10px] font-bold leading-tight" style={{ color: '#fff' }}>{card.name}</span>
      <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: col }}>{card.rarity ?? ''}</span>
    </div>
  )
}

export function StoreModal({ gold, onClose, onChanged }: { gold: number; onClose: () => void; onChanged?: () => void }) {
  const [cat, setCat] = useState<Cat>('packs')
  const [localGold, setLocalGold] = useState(gold)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [packs, setPacks] = useState<Pack[]>([])
  const [packInv, setPackInv] = useState(0)
  const [deal, setDeal] = useState<DealCard[]>([])
  const [starters, setStarters] = useState<StarterDeck[]>([])
  const [cos, setCos] = useState<CosmeticsState | null>(null)

  useEffect(() => { setLocalGold(gold) }, [gold])
  useEffect(() => {
    getActivePacks().then(setPacks)
    getDailyDeal().then((d) => setDeal(d?.cards ?? []))
    getStarterDecks().then(setStarters)
    getCosmetics().then(setCos)
  }, [])

  const flash = (m: string) => setMsg(m)

  const doBuyPack = async (p: Pack) => {
    if (busy) return; setBusy(p.id); playUiClick()
    const r = await buyPack(p.id); setBusy(null)
    if ('error' in r) { playError(); flash(r.error === 'not enough gold' ? 'Per mažai aukso.' : 'Nepavyko nupirkti.'); return }
    playSuccess(); setLocalGold(r.gold); setPackInv(r.packs); flash('Pakuotė nupirkta! 🎁'); onChanged?.()
  }
  const doBuyDeal = async (c: DealCard) => {
    if (busy) return; setBusy(c.id); playUiClick()
    const r = await buyDailyDealCard(c.id); setBusy(null)
    if ('error' in r) { playError(); flash(r.error === 'not enough gold' ? 'Per mažai aukso.' : 'Nepavyko nupirkti.'); return }
    playSuccess(); setLocalGold(r.gold); setDeal((p) => p.map((x) => x.id === c.id ? { ...x, bought: true } : x)); flash(`${c.name} pridėta!`); onChanged?.()
  }
  const doClaimStarter = async (s: StarterDeck) => {
    if (busy) return; setBusy(s.id); playUiClick()
    const r = await claimStarterDeck(s.id); setBusy(null)
    if ('error' in r) { playError(); flash(r.error === 'already claimed' ? 'Jau paimta.' : 'Nepavyko paimti.'); return }
    playSuccess(); setStarters((p) => p.map((x) => x.id === s.id ? { ...x, claimed: true } : x)); flash('Kaladė sukurta „Mano kaladėse"! 🃏'); onChanged?.()
  }
  const doBuyCos = async (c: Cosmetic) => {
    if (busy) return; setBusy(c.id); playUiClick()
    const r = await buyCosmetic(c.id); setBusy(null)
    if ('error' in r) { playError(); flash(r.error === 'not enough gold' ? 'Per mažai aukso.' : 'Nepavyko nupirkti.'); return }
    playSuccess(); setLocalGold(r.gold); flash(`${c.name} nupirkta!`); onChanged?.(); getCosmetics().then(setCos)
  }
  const equippedFor = (kind: CosmeticKind) =>
    kind === 'card_back' ? cos?.equippedCardBack : kind === 'board' ? cos?.equippedBoard : cos?.equippedAvatar
  const doEquipCos = async (c: Cosmetic) => {
    if (busy) return; const isEq = equippedFor(c.kind) === c.id; setBusy(c.id); playUiClick()
    const ok = await equipCosmetic(c.kind, isEq ? null : c.id); setBusy(null)
    if (!ok) { playError(); return }
    playSuccess(); getCosmetics().then(setCos)
  }

  const cosItems = (cos?.items ?? []).filter((c) => c.kind === cat)

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)' }} onClick={onClose}>
      <div className="relative w-[min(560px,96vw)] max-h-[90vh]" style={{ clipPath: oct(16), background: 'rgba(240,180,41,0.5)', padding: 2.5 }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-6 overflow-y-auto max-h-[90vh]" style={{ clipPath: oct(15), background: 'radial-gradient(120% 70% at 50% 0%, rgba(240,180,41,0.13), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>
          <p className="text-lg font-bold mb-0.5 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>🛒 PARDUOTUVĖ</p>
          <p className="text-[11px] text-center mb-4" style={{ color: 'var(--text-muted)' }}>🪙 {localGold.toLocaleString()} aukso</p>

          {/* Kategorijų filtras */}
          <div className="flex flex-wrap gap-1.5 justify-center mb-4">
            {CATS.map((c) => (
              <button key={c.key} onClick={() => { playUiClick(); setCat(c.key); setMsg(null) }}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                style={{ background: cat === c.key ? `rgba(${c.col},0.25)` : 'rgba(0,0,0,0.4)', border: `1px solid ${cat === c.key ? `rgba(${c.col},0.65)` : 'rgba(255,255,255,0.1)'}`, color: cat === c.key ? `rgb(${c.col})` : 'var(--text-muted)' }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* PAKUOTĖS */}
          {cat === 'packs' && (
            <div className="space-y-3">
              {packs.map((p) => (
                <div key={p.id} className="px-3 py-3" style={{ clipPath: oct(10), background: 'linear-gradient(160deg, rgba(58,42,85,0.45), rgba(21,16,31,0.7))', border: '1px solid rgba(240,180,41,0.3)' }}>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>🎴 {p.name}</p>
                  {p.description && <p className="text-[10px] mt-0.5 mb-1 leading-snug" style={{ color: 'var(--text-muted)' }}>{p.description}</p>}
                  <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>10 kortų · 10-a visada Unikalus arba geresnė</p>
                  <button onClick={() => doBuyPack(p)} disabled={busy === p.id || localGold < p.price_gold}
                    className="w-full px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-95"
                    style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                    {busy === p.id ? 'Perkama…' : `Pirkti už 🪙 ${p.price_gold}`}
                  </button>
                </div>
              ))}
              {packs.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Pakuočių nėra.</p>}
              {packInv > 0 && (
                <Link href="/digital/album" onClick={() => { playUiClick(); onClose() }}
                  className="block w-full px-4 py-2.5 rounded-xl text-sm font-bold text-center transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(251,146,60,0.2)', border: '1px solid rgba(251,146,60,0.6)', color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>
                  🎁 Atplėšti albume (turi {packInv})
                </Link>
              )}
            </div>
          )}

          {/* DIENOS KORTOS */}
          {cat === 'daily' && (
            <>
              <p className="text-[10px] text-center mb-3" style={{ color: 'var(--text-muted)' }}>Atsinaujina kasdien · garantuotai ≥1 epiškumo+ korta</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {deal.map((c) => {
                  const col = rarityColor(c.rarity)
                  return (
                    <div key={c.id} className="flex flex-col items-center gap-2">
                      <GameCard glowColor={col} className="w-full">
                        <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: '5 / 7', border: `2px solid ${col}`, boxShadow: `0 0 12px ${col}88`, opacity: c.bought ? 0.55 : 1 }}>
                          <DealArt card={c} />
                          <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-center" style={{ background: 'rgba(0,0,0,0.78)' }}>
                            <p className="text-[9px] leading-tight truncate" style={{ color: '#fff' }}>{c.name}</p>
                            <p className="text-[7px] font-bold uppercase tracking-widest" style={{ color: col }}>{c.rarity ?? ''}</p>
                          </div>
                        </div>
                      </GameCard>
                      <button onClick={() => doBuyDeal(c)} disabled={c.bought || busy === c.id || localGold < c.priceGold}
                        className="w-full px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 hover:scale-[1.03] active:scale-95"
                        style={{ background: c.bought ? 'rgba(74,222,128,0.15)' : 'rgba(240,180,41,0.2)', border: `1px solid ${c.bought ? 'rgba(74,222,128,0.5)' : 'rgba(240,180,41,0.6)'}`, color: c.bought ? '#4ade80' : 'var(--gold)' }}>
                        {c.bought ? '✓ Nupirkta' : busy === c.id ? '…' : `🪙 ${c.priceGold}`}
                      </button>
                    </div>
                  )
                })}
              </div>
              {deal.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Šiandien pasiūlymo nėra.</p>}
            </>
          )}

          {/* STARTER KALADĖS */}
          {cat === 'starter' && (
            <div className="space-y-3">
              {starters.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-3" style={{ clipPath: oct(10), background: 'linear-gradient(160deg, rgba(34,197,94,0.16), rgba(21,16,31,0.7))', border: '1px solid rgba(34,197,94,0.35)' }}>
                  <div className="w-12 h-16 shrink-0 flex items-center justify-center rounded-lg overflow-hidden" style={{ background: 'linear-gradient(160deg,#14532d,#0a0810)', border: '1px solid rgba(34,197,94,0.3)' }}>
                    {s.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                      : <span className="text-2xl">🃏</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{s.name}</p>
                    <p className="text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>{s.faction ? s.faction + ' · ' : ''}{s.cardCount} kortų</p>
                  </div>
                  <button onClick={() => doClaimStarter(s)} disabled={s.claimed || busy === s.id}
                    className="px-3 py-2 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 hover:scale-[1.03] active:scale-95 shrink-0"
                    style={{ background: s.claimed ? 'rgba(74,222,128,0.15)' : 'rgba(34,197,94,0.22)', border: `1px solid ${s.claimed ? 'rgba(74,222,128,0.5)' : 'rgba(34,197,94,0.6)'}`, color: s.claimed ? '#4ade80' : '#86efac', fontFamily: 'var(--rvn-font-display)' }}>
                    {s.claimed ? '✓ Paimta' : busy === s.id ? '…' : s.priceGold > 0 ? `🪙 ${s.priceGold}` : 'NEMOKAMA'}
                  </button>
                </div>
              ))}
              {starters.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Starter kaladžių nėra.</p>}
            </div>
          )}

          {/* KOSMETIKA (nugarėlės / lentos / avatarai) */}
          {(cat === 'card_back' || cat === 'board' || cat === 'avatar') && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {cosItems.map((c) => {
                const owned = (cos?.owned ?? []).includes(c.id)
                const equipped = equippedFor(c.kind) === c.id
                return (
                  <div key={c.id} className="px-2.5 py-2.5" style={{ clipPath: oct(8), background: 'linear-gradient(160deg, rgba(58,42,85,0.4), rgba(21,16,31,0.7))', border: `1px solid ${equipped ? 'rgba(74,222,128,0.6)' : 'rgba(96,165,250,0.25)'}` }}>
                    <div className="h-16 w-full mb-2 flex items-center justify-center overflow-hidden" style={{ clipPath: oct(6), background: c.imageUrl ? '#0a0810' : (c.css ?? 'linear-gradient(160deg,#1a1325,#0a0810)'), border: '1px solid rgba(255,255,255,0.08)' }}>
                      {c.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                        : c.emoji ? <span className="text-3xl">{c.emoji}</span> : null}
                    </div>
                    <p className="text-[11px] font-bold truncate" style={{ color: '#f3ead3' }}>{c.name}</p>
                    <p className="text-[9px] mb-2 leading-snug h-6 overflow-hidden" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                    {owned ? (
                      <button onClick={() => doEquipCos(c)} disabled={busy === c.id}
                        className="w-full px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 hover:scale-[1.03] active:scale-95"
                        style={{ background: equipped ? 'rgba(74,222,128,0.18)' : 'rgba(96,165,250,0.22)', border: `1px solid ${equipped ? 'rgba(74,222,128,0.6)' : 'rgba(96,165,250,0.5)'}`, color: equipped ? '#4ade80' : '#93c5fd' }}>
                        {equipped ? '✓ Naudojama' : 'Naudoti'}
                      </button>
                    ) : (
                      <button onClick={() => doBuyCos(c)} disabled={busy === c.id || localGold < c.priceGold}
                        className="w-full px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 hover:scale-[1.03] active:scale-95"
                        style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)' }}>
                        🪙 {c.priceGold}
                      </button>
                    )}
                  </div>
                )
              })}
              {cosItems.length === 0 && <p className="col-span-full text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Kategorija tuščia.</p>}
            </div>
          )}

          {msg && <p className="text-[11px] text-center mt-3" style={{ color: 'var(--gold)' }}>{msg}</p>}
          <button onClick={() => { playUiClick(); onClose() }} className="mt-4 mx-auto block text-xs" style={{ color: 'var(--text-muted)' }}>Uždaryti</button>
        </div>
      </div>
    </div>
  )
}
