'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Parduotuvė → RUBINAI: 7 paketai už tikrus pinigus (Google Play Billing).
// Paketai iš iap_products (base_amount + bonus_amount, price_eur atsarginė kaina);
// tikra lokalizuota kaina – iš Google Play (getStorePrices). Rubinus suteikia TIK
// serveris (verify-receipt), klientas niekada pats nepriskaičiuoja.
// Paveikslėliai: image_url arba /ravenof-ui/shop/rubies/rubies-<base>.webp
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/react'
import { formatNumber } from '@/lib/i18n/core'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { listRubyPacks, getStorePrices, buyProduct, recoverGooglePurchases, billingAvailable, type IapPack } from '@/lib/digital/iap'
import { useAccount } from '@/lib/digital/accountStore'

const RUBY = '/ravenof-ui/currencies/cur-rubies.png?v=2'
const artOf = (p: IapPack) => p.image_url || `/ravenof-ui/shop/rubies/rubies-${p.base_amount ?? 100}.webp`
const totalOf = (p: IapPack) => {
  const it = (p.payload as { type?: string; currency?: string; amount?: number }[] | null)?.find((x) => x?.currency === 'rubies')
  return it?.amount ?? (p.base_amount ?? 0) + (p.bonus_amount ?? 0)
}

const CSS = `
.rvn-rp{position:relative;display:flex;flex-direction:column;align-items:stretch;border-radius:10px;cursor:pointer;text-align:center;
  background:radial-gradient(90% 70% at 50% 38%,rgba(190,40,55,.26) 0%,transparent 65%),linear-gradient(180deg,rgba(26,18,34,.95),rgba(12,9,18,.97));
  border:1px solid rgba(200,70,85,.28);box-shadow:0 10px 26px rgba(0,0,0,.5);transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .25s,box-shadow .25s;overflow:visible}
.rvn-rp:hover:not(.busy),.rvn-rp:focus-visible{transform:translateY(-4px);border-color:rgba(235,95,110,.7);box-shadow:0 16px 36px rgba(0,0,0,.6),0 0 30px rgba(220,50,70,.28)}
.rvn-rp-art{position:relative;width:100%;aspect-ratio:1/1}
.rvn-rp-art img{position:absolute;inset:6%;width:88%;height:88%;object-fit:contain;filter:drop-shadow(0 12px 16px rgba(0,0,0,.7)) drop-shadow(0 0 14px rgba(220,40,60,.28));transition:transform .3s cubic-bezier(.2,.8,.2,1),filter .3s}
.rvn-rp:hover .rvn-rp-art img{transform:translateY(-6px) scale(1.05);filter:drop-shadow(0 18px 20px rgba(0,0,0,.75)) drop-shadow(0 0 22px rgba(235,60,80,.6))}
.rvn-rp-glow{position:absolute;left:12%;right:12%;bottom:4%;height:16%;border-radius:50%;background:radial-gradient(ellipse,rgba(220,40,60,.55),transparent 70%);filter:blur(8px);opacity:.6;transition:opacity .3s}
.rvn-rp:hover .rvn-rp-glow{opacity:1}
.rvn-rp-bonus{position:absolute;top:-8px;right:-6px;z-index:3;font:800 12px var(--ravenof-font-display);letter-spacing:.04em;padding:4px 9px;border-radius:999px;color:#1a0f04;background:linear-gradient(180deg,#ffe08a,#d4a33b);box-shadow:0 4px 12px rgba(0,0,0,.55),0 0 12px rgba(212,163,59,.45)}
.rvn-rp-amt{display:flex;align-items:center;justify-content:center;gap:6px;font:800 var(--fs) var(--ravenof-font-display);color:#ffd9dd;text-shadow:0 2px 8px rgba(0,0,0,.8),0 0 14px rgba(220,50,70,.45);letter-spacing:.02em}
.rvn-rp-amt img{width:calc(var(--fs) * 1.05);height:calc(var(--fs) * 1.05);object-fit:contain}
.rvn-rp-sub{font:600 11px var(--ravenof-font-body);color:var(--ravenof-gold);min-height:15px}
.rvn-rp-buy{margin-top:auto;border-radius:7px;font:800 var(--bfs) var(--ravenof-font-display);letter-spacing:.06em;color:#1a0f04;background:linear-gradient(180deg,#ffe08a,#d4a33b 60%,#b5852a);border:0;box-shadow:0 4px 12px rgba(0,0,0,.5);transition:filter .2s}
.rvn-rp:hover .rvn-rp-buy{filter:brightness(1.1)}
.rvn-rp.off .rvn-rp-buy{background:rgba(255,255,255,.08);color:var(--ravenof-text-secondary);box-shadow:none}
.rvn-rp.busy{cursor:progress}
.rvn-rp-spin{position:absolute;inset:0;z-index:4;display:grid;place-items:center;background:rgba(6,4,10,.6);border-radius:10px}
@media (prefers-reduced-motion: reduce){.rvn-rp,.rvn-rp-art img{transition:none}}
`

export function RubyPacks({ desktop: D, onToast, onPurchased }: { desktop: boolean; onToast: (m: string) => void; onPurchased?: () => void }) {
  const t = useT()
  const [packs, setPacks] = useState<IapPack[] | null>(null)
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const canBuy = billingAvailable()

  const refreshWallet = useCallback(() => { void useAccount.getState().refresh({ force: true }); onPurchased?.() }, [onPurchased])

  useEffect(() => {
    let alive = true
    listRubyPacks().then(async (ps) => {
      if (!alive) return
      setPacks(ps)
      const pr = await getStorePrices(ps.map((p) => p.product_id))
      if (alive) setPrices(pr)
      // Nutrūkę / vėliau apmokėti pirkiniai – įskaitom atidarius sekciją (po kainų, ne lygiagrečiai)
      const n = await recoverGooglePurchases()
      if (alive && n > 0) { playSuccess(); onToast(t('shop.rubies.recovered', { count: n })); refreshWallet() }
    })
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buy = async (p: IapPack) => {
    if (busy) return
    playUiClick()
    if (!canBuy) { onToast(t('shop.rubies.unavailable')); return }
    setBusy(p.product_id)
    const r = await buyProduct(p.product_id)
    setBusy(null)
    if (r.ok) { playSuccess(); onToast(t('shop.rubies.success', { count: formatNumber(totalOf(p)) })); refreshWallet(); return }
    if (r.reason === 'cancelled') return
    playError()
    onToast(t(r.reason === 'pending' ? 'shop.rubies.pending' : r.reason === 'unavailable' ? 'shop.rubies.unavailable' : 'shop.rubies.failed'))
  }

  if (packs === null) return <div className="flex justify-center py-12"><span className="ravenof-spinner" style={{ width: 36, height: 36 }} /></div>
  if (packs.length === 0) return <p className="text-center py-8" style={{ font: `400 ${D ? 15 : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('shop.categoryEmpty')}</p>

  return (
    <div className="flex flex-col" style={{ gap: D ? 14 : 8 }}>
      <style>{CSS}</style>
      {!canBuy && <p style={{ margin: 0, font: `500 ${D ? 13 : 10.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('shop.rubies.androidOnly')}</p>}
      <div className="grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${D ? 176 : 112}px, 1fr))`, gap: D ? '22px 16px' : '14px 8px', paddingTop: 8 }}>
        {packs.map((p) => {
          const bonusPct = p.base_amount && p.bonus_amount ? Math.round((p.bonus_amount / p.base_amount) * 100) : 0
          const price = prices[p.product_id] ?? (p.price_eur != null ? `${formatNumber(Number(p.price_eur), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—')
          return (
            <button key={p.product_id} type="button" onClick={() => buy(p)} disabled={!!busy && busy !== p.product_id}
              className={'rvn-rp' + (canBuy ? '' : ' off') + (busy === p.product_id ? ' busy' : '')}
              style={{ padding: D ? '10px 12px 12px' : '6px 7px 8px', gap: D ? 6 : 4, ['--fs' as string]: D ? '22px' : '15px', ['--bfs' as string]: D ? '14px' : '11px' }}
              aria-label={`${formatNumber(totalOf(p))} · ${price}`}>
              {bonusPct > 0 && <span className="rvn-rp-bonus">+{bonusPct}%</span>}
              <span className="rvn-rp-art">
                <span className="rvn-rp-glow" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={artOf(p)} alt="" draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).src = RUBY }} />
              </span>
              <span className="rvn-rp-amt">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={RUBY} alt="" draggable={false} />{formatNumber(totalOf(p))}
              </span>
              <span className="rvn-rp-sub">{p.bonus_amount > 0 ? t('shop.rubies.bonusAmount', { base: formatNumber(p.base_amount ?? 0), bonus: formatNumber(p.bonus_amount) }) : ' '}</span>
              <span className="rvn-rp-buy" style={{ padding: D ? '9px 8px' : '6px 4px' }}>{price}</span>
              {busy === p.product_id && <span className="rvn-rp-spin"><span className="ravenof-spinner" style={{ width: 30, height: 30 }} /></span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
