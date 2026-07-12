'use client'

// ── Mainų langas (pop-up): abu deda kortas, abu patvirtina → apsikeitimas ─────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tradeGet, tradeSetOffer, tradeConfirm, tradeCancel, type TradeState } from '@/lib/trade'
import { myCollection, type OwnedCard } from '@/lib/market'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'

function Art({ url, name }: { url: string | null; name: string }) {
  const [bad, setBad] = useState(false)
  if (url && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} onError={() => setBad(true)} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
  }
  return <div className="absolute inset-0 flex items-center justify-center text-lg" style={{ background: '#0a0810' }}>🎴</div>
}

export function TradeWindow({ tradeId, onClose }: { tradeId: string; onClose: () => void }) {
  const tt = useT()
  const [t, setT] = useState<TradeState | null>(null)
  const [coll, setColl] = useState<OwnedCard[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const closedRef = useRef(false)

  const refresh = useCallback(async () => {
    const s = await tradeGet(tradeId); if (!s) return
    setT(s)
    if ((s.status === 'completed' || s.status === 'cancelled') && !closedRef.current) {
      closedRef.current = true
      if (s.status === 'completed') { playSuccess(); setNote(tt('social.trade.done')) } else { setNote(tt('social.trade.cancelled')) }
      setTimeout(onClose, 1600)
    }
  }, [tradeId, onClose])

  useEffect(() => { myCollection().then(setColl); refresh(); const iv = setInterval(refresh, 1300); return () => clearInterval(iv) }, [refresh])

  const myOffer = t ? (t.me === 'a' ? t.aOffer : t.bOffer) : []
  const theirOffer = t ? (t.me === 'a' ? t.bOffer : t.aOffer) : []
  const myConfirmed = t ? (t.me === 'a' ? t.aConfirmed : t.bConfirmed) : false
  const theirConfirmed = t ? (t.me === 'a' ? t.bConfirmed : t.aConfirmed) : false
  const theirName = t ? (t.me === 'a' ? t.bName : t.aName) : ''

  const qtyMap = useMemo(() => { const m: Record<string, number> = {}; for (const c of coll) m[c.cardId] = c.quantity; return m }, [coll])
  const countIn = (arr: string[], id: string) => arr.filter((x) => x === id).length

  const setOffer = async (next: string[]) => { setBusy(true); await tradeSetOffer(tradeId, next); await refresh(); setBusy(false) }
  const addCard = (c: OwnedCard) => { if (busy || !t || t.status !== 'active') return; if (countIn(myOffer, c.cardId) >= (qtyMap[c.cardId] ?? 0)) return; playUiClick(); setOffer([...myOffer, c.cardId]) }
  const removeAt = (idx: number) => { if (busy) return; playUiClick(); const n = [...myOffer]; n.splice(idx, 1); setOffer(n) }
  const toggleConfirm = async () => {
    if (busy || !t) return; setBusy(true); playUiClick()
    const r = await tradeConfirm(tradeId, !myConfirmed); setBusy(false)
    if ('error' in r) { playError(); setNote(r.error) ; await refresh(); return }
    await refresh()
  }
  const cancel = async () => { playUiClick(); await tradeCancel(tradeId); onClose() }

  const cardOf = (id: string) => t?.cards[id]
  const Offer = ({ cards, mine }: { cards: string[]; mine: boolean }) => (
    <div className="grid grid-cols-4 gap-1.5 min-h-[80px] p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--bg-border)' }}>
      {cards.map((id, i) => { const c = cardOf(id); return (
        <button key={id + i} disabled={!mine} onClick={() => mine && removeAt(i)} className="relative rounded overflow-hidden disabled:cursor-default" style={{ aspectRatio: '5 / 7', border: `1px solid ${c?.rarityColor || '#555'}` }} title={mine ? tt('social.trade.remove') : c?.name}>
          <Art url={c?.imageUrl ?? null} name={c?.name ?? '?'} />
        </button>
      ) })}
      {cards.length === 0 && <span className="col-span-4 text-[10px] self-center text-center" style={{ color: 'var(--text-muted)' }}>{tt('social.trade.empty')}</span>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={cancel}>
      <div className="w-full max-w-lg rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }} onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-bold mb-2 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{tt('social.trade.title', { name: theirName ?? '…' })}</p>
        {!t || t.status === 'pending' ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>{t?.status === 'pending' ? tt('social.trade.waitingAccept') : tt('common.loading')}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-[11px] font-bold mb-1" style={{ color: myConfirmed ? '#4ade80' : 'var(--text-secondary)' }}>{tt('social.trade.yourOffer')} {myConfirmed ? '✓' : ''}</p>
                <Offer cards={myOffer} mine />
              </div>
              <div>
                <p className="text-[11px] font-bold mb-1" style={{ color: theirConfirmed ? '#4ade80' : 'var(--text-secondary)' }}>{tt('social.trade.theirOffer', { name: theirName ?? '…' })} {theirConfirmed ? '✓' : ''}</p>
                <Offer cards={theirOffer} mine={false} />
              </div>
            </div>

            <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{tt('social.trade.yourCollection')}</p>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto mb-3">
              {coll.map((c) => { const avail = (qtyMap[c.cardId] ?? 0) - countIn(myOffer, c.cardId); return (
                <button key={c.cardId} onClick={() => addCard(c)} disabled={avail <= 0 || t.status !== 'active'} className="relative rounded overflow-hidden disabled:opacity-30 transition-transform hover:scale-105" style={{ aspectRatio: '5 / 7', border: `1px solid ${c.rarityColor || '#555'}` }} title={c.name}>
                  <Art url={c.imageUrl} name={c.name} />
                  {avail > 1 && <span className="absolute bottom-0 right-0 px-1 text-[8px] font-bold" style={{ background: 'rgba(0,0,0,0.8)', color: '#fff' }}>{avail}</span>}
                </button>
              ) })}
              {coll.length === 0 && <span className="col-span-full text-[10px] text-center py-3" style={{ color: 'var(--text-muted)' }}>{tt('social.trade.collectionEmpty')}</span>}
            </div>

            {note && <p className="text-xs text-center mb-2" style={{ color: 'var(--gold)' }}>{note}</p>}
            <div className="flex gap-2 justify-between">
              <button onClick={cancel} className="px-3 py-2 rounded-lg text-xs" style={{ color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>{tt('social.trade.cancel')}</button>
              <button onClick={toggleConfirm} disabled={busy || t.status !== 'active'} className="px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ background: myConfirmed ? 'rgba(74,222,128,0.18)' : 'rgba(240,180,41,0.2)', border: `1px solid ${myConfirmed ? 'rgba(74,222,128,0.6)' : 'rgba(240,180,41,0.6)'}`, color: myConfirmed ? '#4ade80' : 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                {myConfirmed ? tt('social.trade.confirmed') : tt('social.trade.confirm')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
