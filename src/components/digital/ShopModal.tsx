'use client'

// ── Parduotuvė (multi-valiutė: Sidabras / Rubinai) — landscape 3 zonų overlay ─
// kairė sekcijos · centras prekių grid · dešinė pasirinktos prekės turinys + pirkimo CTA.
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
  const [selId, setSelId] = useState<number | null>(null)
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
  const selected = shown.find((i) => i.id === selId) ?? shown[0] ?? null

  if (typeof document === 'undefined') return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)', padding: 8 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col" style={{ width: 'min(1100px, 98vw)', height: 'min(640px, 96vh)', borderRadius: 20,
        background: 'radial-gradient(120% 60% at 50% 0%, rgba(240,180,41,0.1), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))',
        border: '1.5px solid rgba(240,180,41,0.5)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>

        {/* ── Antraštė ── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
          <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 'clamp(14px,2.6vh,19px)', letterSpacing: '0.08em' }}>PARDUOTUVĖ</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(203,213,225,0.35)', color: '#f3ead3' }}>🪙 {bal.silver.toLocaleString('lt-LT')}</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>💎 {bal.rubies.toLocaleString('lt-LT')}</span>
            <button onClick={() => { playUiClick(); onClose() }} aria-label="Uždaryti" className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── 3 zonos ── */}
        <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(120px,0.7fr) minmax(0,2.2fr) minmax(200px,1fr)' }}>

          {/* KAIRĖ: sekcijos */}
          <div className="min-h-0 overflow-y-auto flex flex-col gap-1.5">
            {SHOP_SECTIONS.map((s) => (
              <button key={s.key} onClick={() => { playUiClick(); setSection(s.key); setSelId(null); setToast(null) }}
                className="rvn-press shrink-0 w-full text-left px-2.5 py-2 rounded-xl font-bold"
                style={{ fontSize: 11, background: section === s.key ? 'rgba(240,180,41,0.2)' : 'rgba(10,8,16,0.8)', border: `1px solid ${section === s.key ? 'rgba(240,180,41,0.6)' : 'rgba(255,255,255,0.08)'}`, color: section === s.key ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}>{s.label}</button>
            ))}
          </div>

          {/* CENTRAS: prekės */}
          <div className="min-h-0 overflow-y-auto">
            {shown.length === 0 && <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>Šioje kategorijoje prekių nėra.</p>}
            <div className="grid gap-2 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {shown.map((it) => {
                const rc = it.rarity ? RARITY_COL[it.rarity] ?? '240,180,41' : '240,180,41'
                const sel = selected?.id === it.id
                return (
                  <button key={it.id} onClick={() => { playUiClick(); setSelId(it.id); setToast(null) }}
                    className="rvn-press rounded-xl p-2.5 text-left flex flex-col gap-1"
                    style={{ minHeight: 76, background: `linear-gradient(150deg, rgba(${rc},0.08), rgba(10,8,16,0.92))`, border: sel ? '1.5px solid rgba(240,180,41,0.9)' : `1px solid rgba(${rc},0.4)`, boxShadow: sel ? '0 0 12px rgba(240,180,41,0.35)' : 'none' }}>
                    <span className="block text-sm font-bold leading-tight" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{it.name}</span>
                    <span className="flex flex-wrap gap-x-2 gap-y-0.5">{it.payload.slice(0, 3).map((p, i) => { const c = rewardChip(p); return <span key={i} style={{ fontSize: 9.5, color: '#e8dcc0' }}>{c.icon} {c.label}</span> })}</span>
                    <span className="mt-auto flex gap-2" style={{ fontSize: 10, fontWeight: 800 }}>
                      {it.prices.silver != null && <span style={{ color: '#f3ead3' }}>🪙 {it.prices.silver}</span>}
                      {it.prices.rubies != null && <span style={{ color: '#fca5a5' }}>💎 {it.prices.rubies}</span>}
                      {it.prices.real_money != null && it.prices.silver == null && it.prices.rubies == null && <span style={{ color: 'var(--text-muted)' }}>€{it.prices.real_money.toFixed(2)}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* DEŠINĖ: pasirinkta prekė */}
          <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(240,180,41,0.22)' }}>
            {selected ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                  <p className="font-bold leading-tight" style={{ fontSize: 14, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{selected.name}</p>
                  {selected.description && <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{selected.description}</p>}
                  <div>
                    <p className="uppercase font-bold mb-1" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>Turinys</p>
                    <div className="flex flex-col gap-1">
                      {selected.payload.map((p, i) => { const c = rewardChip(p); return (
                        <span key={i} className="px-2 py-1 rounded-lg" style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e8dcc0' }}>{c.icon} {c.label}</span>
                      ) })}
                    </div>
                  </div>
                  {toast && <p className="text-center font-semibold py-1.5 px-2 rounded-lg" style={{ fontSize: 10.5, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>{toast}</p>}
                </div>
                <div className="shrink-0 mt-2 flex flex-col gap-1.5">
                  {selected.prices.silver != null && (
                    <button onClick={() => buy(selected, 'silver')} disabled={busy !== null || bal.silver < selected.prices.silver}
                      className="rvn-press w-full rounded-xl font-extrabold disabled:opacity-45" style={{ minHeight: 40, fontSize: 12, background: 'linear-gradient(180deg,#ffe28c,#f3b62c)', color: '#3a2406', fontFamily: 'var(--rvn-font-display)' }}>
                      {busy === selected.id ? '…' : `Pirkti 🪙 ${selected.prices.silver}`}
                    </button>
                  )}
                  {selected.prices.rubies != null && (
                    <button onClick={() => buy(selected, 'rubies')} disabled={busy !== null || bal.rubies < selected.prices.rubies}
                      className="rvn-press w-full rounded-xl font-extrabold disabled:opacity-45" style={{ minHeight: 40, fontSize: 12, background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.5)', fontFamily: 'var(--rvn-font-display)' }}>
                      {busy === selected.id ? '…' : `Pirkti 💎 ${selected.prices.rubies}`}
                    </button>
                  )}
                  {selected.prices.real_money != null && selected.prices.silver == null && selected.prices.rubies == null && (
                    <button disabled className="w-full rounded-xl font-extrabold" style={{ minHeight: 40, fontSize: 12, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>€{selected.prices.real_money.toFixed(2)} (netrukus)</button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center px-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pasirink prekę, kad matytum turinį.</div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
