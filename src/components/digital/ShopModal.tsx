'use client'

// ── Parduotuvė (multi-valiutė: Sidabras / Rubinai; jokių real-money-only) ─────
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { rewardChip } from '@/lib/gamification/monthlyLogin'
import { getBalances, type Balances } from '@/lib/economy'
import { getShop, purchaseShopItem, SHOP_SECTIONS, PURCHASE_ERR_LT, type ShopItem } from '@/lib/gamification/shop'

const RARITY_COL: Record<string, string> = { basic: '148,163,184', rare: '96,165,250', premium: '139,92,246', epic: '139,92,246', legendary: '240,180,41' }

export function ShopModal({ onClose, onPurchased }: { onClose: () => void; onPurchased?: () => void }) {
  const [items, setItems] = useState<ShopItem[]>([])
  const [bal, setBal] = useState<Balances>({ silver: 0, rubies: 0, essence: 0 })
  const [section, setSection] = useState('packs')
  const [busy, setBusy] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const refresh = useCallback(() => { getShop().then(setItems); getBalances().then((b) => { if (b) setBal(b) }) }, [])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t) }, [toast])

  const buy = useCallback(async (it: ShopItem, cur: 'silver' | 'rubies') => {
    if (busy) return; setBusy(it.id); playUiClick()
    const r = await purchaseShopItem(it.id, cur)
    if (r && 'ok' in r) { playSuccess(); setToast(`Nupirkta: ${it.name}`); onPurchased?.(); refresh() }
    else if (r && 'error' in r) setToast(PURCHASE_ERR_LT[r.error] ?? 'Nepavyko nupirkti.')
    setBusy(null)
  }, [busy, refresh, onPurchased])

  const shown = useMemo(() => {
    const types = SHOP_SECTIONS.find((s) => s.key === section)?.types ?? []
    return items.filter((i) => types.includes(i.itemType))
  }, [items, section])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)', padding: 10 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, 97vw)', maxHeight: '94vh', display: 'flex', flexDirection: 'column', borderRadius: 20, padding: 16,
        background: 'radial-gradient(120% 60% at 50% 0%, rgba(240,180,41,0.1), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))',
        border: '1.5px solid rgba(240,180,41,0.5)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>

        <div className="flex items-center justify-between mb-2 shrink-0">
          <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 18 }}>Parduotuvė</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#f3ead3' }}>🪙 {bal.silver.toLocaleString('lt-LT')}</span>
            <span className="text-xs font-bold" style={{ color: '#fca5a5' }}>💎 {bal.rubies.toLocaleString('lt-LT')}</span>
            <button onClick={() => { playUiClick(); onClose() }} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex gap-1.5 mb-2 shrink-0 overflow-x-auto pb-1">
          {SHOP_SECTIONS.map((s) => (
            <button key={s.key} onClick={() => { playUiClick(); setSection(s.key) }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap"
              style={{ background: section === s.key ? 'rgba(240,180,41,0.2)' : 'rgba(255,255,255,0.04)', color: section === s.key ? 'var(--gold)' : 'var(--text-muted)', border: `1px solid ${section === s.key ? 'rgba(240,180,41,0.5)' : 'transparent'}` }}>{s.label}</button>
          ))}
        </div>

        <div className="overflow-y-auto space-y-2 pr-1" style={{ flex: 1 }}>
          {shown.map((it) => {
            const rc = it.rarity ? RARITY_COL[it.rarity] ?? '240,180,41' : '240,180,41'
            return (
              <div key={it.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: `linear-gradient(150deg, rgba(${rc},0.08), rgba(10,8,16,0.92))`, border: `1px solid rgba(${rc},0.4)` }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{it.name}</div>
                  {it.description && <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{it.description}</div>}
                  <div className="flex flex-wrap gap-1 mt-1">{it.payload.map((p, i) => { const c = rewardChip(p); return <span key={i} className="text-[10px]" style={{ color: '#e8dcc0' }}>{c.icon} {c.label}</span> })}</div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {it.prices.silver != null && (
                    <button onClick={() => buy(it, 'silver')} disabled={busy !== null} className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold" style={{ background: 'linear-gradient(180deg,#ffe28c,#f3b62c)', color: '#3a2406', opacity: bal.silver < it.prices.silver ? 0.5 : 1 }}>🪙 {it.prices.silver}</button>
                  )}
                  {it.prices.rubies != null && (
                    <button onClick={() => buy(it, 'rubies')} disabled={busy !== null} className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold" style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.5)', opacity: bal.rubies < it.prices.rubies ? 0.5 : 1 }}>💎 {it.prices.rubies}</button>
                  )}
                  {it.prices.real_money != null && it.prices.silver == null && it.prices.rubies == null && (
                    <button disabled className="px-3 py-1.5 rounded-lg text-[11px] font-extrabold" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>€{it.prices.real_money.toFixed(2)}</button>
                  )}
                </div>
              </div>
            )
          })}
          {shown.length === 0 && <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>Šioje kategorijoje prekių nėra.</p>}
        </div>

        {toast && <div className="shrink-0 mt-2 text-center text-[11px] font-semibold py-2 rounded-lg" style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>{toast}</div>}
      </div>
    </div>,
    document.body,
  )
}
