'use client'

// ── Dienos kortų pasiūlymas — kasdien atsinaujina, ≥1 epic+ korta ─────────────
import { useEffect, useState } from 'react'
import { getDailyDeal, buyDailyDealCard, type DealCard } from '@/lib/cosmetics'
import { rarityColor } from '@/lib/digital/rarity'
import { GameCard } from '@/components/ui/GameCard'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { useT, useCardI18n } from '@/lib/i18n/react'

function DealArt({ card }: { card: DealCard }) {
  const cx = useCardI18n()
  const [bad, setBad] = useState(false)
  const col = rarityColor(card.rarity)
  const img = cx.image(card.id, card.imageUrl)
  const nm = cx.name(card.id, card.name)
  if (img && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt={nm} onError={() => setBad(true)} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center" style={{ background: 'linear-gradient(160deg, #1a1325, #0a0810)' }}>
      <span className="text-2xl">🎴</span>
      <span className="text-[10px] font-bold leading-tight" style={{ color: '#fff' }}>{nm}</span>
      <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: col }}>{card.rarity ?? ''}</span>
    </div>
  )
}

export function DailyDealModal({ gold, onClose, onSpent }: { gold: number; onClose: () => void; onSpent?: () => void }) {
  const t = useT()
  const cx = useCardI18n()
  const [cards, setCards] = useState<DealCard[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [localGold, setLocalGold] = useState(gold)

  const reload = () => getDailyDeal().then((d) => { setCards(d?.cards ?? []); setLoading(false) })
  useEffect(() => { reload() }, [])

  const doBuy = async (c: DealCard) => {
    if (busy) return
    setBusy(c.id); playUiClick()
    const r = await buyDailyDealCard(c.id)
    setBusy(null)
    if ('error' in r) { playError(); setMsg(r.error === 'not enough gold' ? t('common.cosmetics.notEnoughGold') : t('common.cosmetics.buyFailed')); return }
    playSuccess(); setLocalGold(r.gold); setMsg(t('common.dailyDeal.added', { name: cx.name(c.id, c.name) }))
    setCards((prev) => prev.map((x) => x.id === c.id ? { ...x, bought: true } : x)); onSpent?.()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="relative w-[min(480px,95vw)] max-h-[88vh]" style={{ borderRadius: 18, background: 'rgba(251,146,60,0.32)', padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-6 overflow-y-auto max-h-[88vh]" style={{ borderRadius: 17, background: 'radial-gradient(120% 90% at 50% 0%, rgba(251,146,60,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>
          <p className="text-lg font-bold mb-0.5 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: '#fdba74', letterSpacing: '0.08em' }}>{t('common.dailyDeal.title')}</p>
          <p className="text-[11px] text-center mb-4" style={{ color: 'var(--text-muted)' }}>Atsinaujina kasdien · 🪙 {localGold.toLocaleString()} aukso</p>

          {loading && <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>}

          <div className="grid grid-cols-2 gap-3">
            {cards.map((c) => {
              const col = rarityColor(c.rarity)
              return (
                <div key={c.id} className="flex flex-col items-center gap-2">
                  <GameCard glowColor={col} className="w-full">
                    <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: '5 / 7', border: `2px solid ${col}`, boxShadow: `0 0 12px ${col}88`, opacity: c.bought ? 0.55 : 1 }}>
                      <DealArt card={c} />
                      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-center" style={{ background: 'rgba(0,0,0,0.78)' }}>
                        <p className="text-[10px] leading-tight truncate" style={{ color: '#fff' }}>{cx.name(c.id, c.name)}</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: col }}>{c.rarity ?? ''}</p>
                      </div>
                    </div>
                  </GameCard>
                  <button onClick={() => doBuy(c)} disabled={c.bought || busy === c.id || localGold < c.priceGold}
                    className="w-full px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 hover:scale-[1.03] active:scale-95"
                    style={{ background: c.bought ? 'rgba(74,222,128,0.15)' : 'rgba(240,180,41,0.2)', border: `1px solid ${c.bought ? 'rgba(74,222,128,0.5)' : 'rgba(240,180,41,0.6)'}`, color: c.bought ? '#4ade80' : 'var(--gold)' }}>
                    {c.bought ? '✓ Nupirkta' : busy === c.id ? '…' : `🪙 ${c.priceGold}`}
                  </button>
                </div>
              )
            })}
          </div>

          {msg && <p className="text-[11px] text-center mt-3" style={{ color: '#fdba74' }}>{msg}</p>}
          <button onClick={() => { playUiClick(); onClose() }} className="mt-4 mx-auto block text-xs" style={{ color: 'var(--text-muted)' }}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  )
}
