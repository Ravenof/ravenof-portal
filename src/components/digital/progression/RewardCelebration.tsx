'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Atlygio atsiėmimo „celebration" overlay (dienos dovana, questai, skrynia,
// sezono kelias, kortos pasirinkimas). Vienas globalus host'as (/digital layout),
// kviečiamas per celebrateRewards(). Seka: pritemimas + spinduliai → antraštė
// „įsispaudžia" → plytelės iškyla po vieną (žiedai, kibirkštys, count-up,
// blizgesys) → „Tęsti". Uždarant monetos nuskrenda į header'io balansus.
// Korta rodoma kaip TIKRA korta (portretas), ne ikona.
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveRewardVisualV2 } from '@/lib/rewards/rewardVisuals'
import { formatNumber } from '@/lib/i18n/core'
import { useT } from '@/lib/i18n/react'
import { playSuccess, playUiClick } from '@/lib/ui-sound'
import { RavenofBannerButton, ravenofRarityColor, ravenofRarityGem } from '@/components/digital/ui/RavenofKit'
import type { GrantedReward } from '@/lib/progression/types'

export type CelebrationItem =
  | { kind: 'reward'; reward: GrantedReward }
  | { kind: 'card'; name: string; imageUrl: string | null; rarity: string; sub?: string }
  | { kind: 'booster'; count: number; label: string }
  | { kind: 'pack'; name: string; imageUrl: string | null; label: string }

export type CelebrationRequest = { kicker: string; title: string; titleAccent?: string; items: CelebrationItem[] }

const EVENT = 'rvn:celebrate'
/** Parodo atlygio celebration'ą (host'as – DigitalLayout). Tušti items ignoruojami. */
export function celebrateRewards(req: CelebrationRequest): void {
  if (typeof window === 'undefined' || req.items.length === 0) return
  window.dispatchEvent(new CustomEvent<CelebrationRequest>(EVENT, { detail: req }))
}
/** Patogus wrapper'is: GrantedReward[] → items (be nulinių sumų). */
export function rewardItems(rewards: GrantedReward[] | undefined | null): CelebrationItem[] {
  return (rewards ?? []).filter((r) => !('amount' in r) || r.amount > 0).map((reward) => ({ kind: 'reward', reward }))
}

const CSS = `
.rvn-cele{position:fixed;inset:0;z-index:520;display:flex;align-items:center;justify-content:center;background:rgba(4,3,7,0);animation:rvnCeleIn .35s ease forwards;overflow:hidden;cursor:pointer}
@keyframes rvnCeleIn{to{background:rgba(4,3,7,.9)}}
.rvn-cele.out{animation:rvnCeleOut .3s ease forwards;pointer-events:none}
@keyframes rvnCeleOut{to{opacity:0}}
.rvn-cele-rays{position:absolute;left:50%;top:50%;width:240vmax;height:240vmax;margin:-120vmax 0 0 -120vmax;pointer-events:none;opacity:0;background:repeating-conic-gradient(rgba(212,163,59,.05) 0 6deg,transparent 6deg 18deg);animation:rvnRaysIn .8s ease .15s forwards,rvnRaysSpin 60s linear infinite;-webkit-mask:radial-gradient(circle at center,#000 0%,rgba(0,0,0,.6) 30%,transparent 62%);mask:radial-gradient(circle at center,#000 0%,rgba(0,0,0,.6) 30%,transparent 62%)}
@keyframes rvnRaysIn{to{opacity:1}}@keyframes rvnRaysSpin{to{transform:rotate(360deg)}}
.rvn-cele-glow{position:absolute;left:50%;top:50%;width:70vmin;height:70vmin;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(242,196,90,.28),rgba(242,196,90,.08) 40%,transparent 70%);opacity:0;animation:rvnRaysIn 1s ease .2s forwards}
.rvn-cele-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,rgba(255,240,200,.55),transparent 55%);opacity:0;animation:rvnFlash .6s ease .55s;pointer-events:none}
@keyframes rvnFlash{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
.rvn-cele-ember{position:absolute;bottom:-10px;width:4px;height:4px;border-radius:50%;background:#F2C45A;box-shadow:0 0 8px 2px rgba(242,196,90,.7);opacity:0;animation:rvnEmber linear infinite;pointer-events:none}
@keyframes rvnEmber{0%{transform:translate(0,0) scale(1);opacity:0}10%{opacity:.9}100%{transform:translate(var(--dx),-110vh) scale(.3);opacity:0}}
.rvn-cele-panel{position:relative;display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center;padding:20px;max-width:920px;width:100%}
.rvn-cele-kicker{font:500 12px var(--ravenof-font-body);letter-spacing:5px;text-transform:uppercase;color:var(--ravenof-gold);opacity:0;animation:rvnFadeUp .45s ease .35s forwards}
.rvn-cele-title{font:900 clamp(26px,4.4vw,52px) var(--ravenof-font-display);letter-spacing:3px;text-transform:uppercase;color:var(--ravenof-text-primary);margin:0;line-height:1.05;text-shadow:0 0 30px rgba(242,196,90,.35),0 2px 0 rgba(0,0,0,.6);opacity:0;transform:scale(1.35);animation:rvnStamp .55s cubic-bezier(.2,1.4,.4,1) .45s forwards}
.rvn-cele-title b{color:var(--ravenof-gold-bright);font-weight:900}
@keyframes rvnStamp{to{opacity:1;transform:scale(1)}}
.rvn-cele-rule{width:220px;height:1px;background:linear-gradient(90deg,transparent,var(--ravenof-gold),transparent);opacity:0;animation:rvnFadeUp .5s ease .7s forwards}
@keyframes rvnFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.rvn-cele-tiles{display:flex;gap:20px;justify-content:center;align-items:stretch;flex-wrap:wrap;margin-top:4px}
.rvn-cele-tile{position:relative;width:168px;padding:22px 14px 18px;background:linear-gradient(158deg,rgba(27,21,34,.97),rgba(15,13,21,.98));border:1px solid rgba(212,163,59,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 0 24px rgba(0,0,0,.45),0 12px 30px rgba(0,0,0,.55);opacity:0;transform:translateY(40px) scale(.85);animation:rvnTileIn .6s cubic-bezier(.2,1.3,.4,1) forwards;animation-delay:var(--d);display:flex;flex-direction:column;align-items:center;justify-content:center}
.rvn-cele-tile.card{width:auto;padding:14px 14px 14px;border-color:var(--rc);box-shadow:inset 0 0 30px color-mix(in srgb,var(--rc) 22%,transparent),0 0 44px color-mix(in srgb,var(--rc) 35%,transparent),0 12px 30px rgba(0,0,0,.55)}
@keyframes rvnTileIn{to{opacity:1;transform:none}}
.rvn-cele-corner{position:absolute;width:12px;height:12px;border:1px solid var(--ravenof-gold);opacity:.8}
.rvn-cele-ico{position:relative;width:84px;height:84px;margin:0 auto 10px;display:grid;place-items:center}
.rvn-cele-ico img{width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 6px 14px rgba(0,0,0,.7));animation:rvnIcoPop .7s cubic-bezier(.2,1.5,.4,1) forwards;animation-delay:calc(var(--d) + .15s);transform:scale(0)}
@keyframes rvnIcoPop{60%{transform:scale(1.18)}to{transform:scale(1)}}
.rvn-cele-ring{position:absolute;inset:0;border-radius:50%;border:2px solid #F2C45A;opacity:0;animation:rvnRing .8s ease-out forwards;animation-delay:calc(var(--d) + .2s)}
.rvn-cele-ring.r2{animation-delay:calc(var(--d) + .35s);border-width:1px}
@keyframes rvnRing{0%{transform:scale(.4);opacity:.9}100%{transform:scale(2.1);opacity:0}}
.rvn-cele-spark{position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2px;border-radius:50%;background:#F2C45A;box-shadow:0 0 6px #F2C45A;opacity:0;animation:rvnSpark .75s ease-out forwards;animation-delay:calc(var(--d) + .22s)}
@keyframes rvnSpark{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--sx),var(--sy)) scale(0);opacity:0}}
.rvn-cele-amt{font:900 32px var(--ravenof-font-display);color:var(--ravenof-gold-bright);line-height:1;font-variant-numeric:tabular-nums;text-shadow:0 0 16px rgba(242,196,90,.45)}
.rvn-cele-lbl{font:500 12px var(--ravenof-font-body);letter-spacing:2.5px;text-transform:uppercase;color:var(--ravenof-text-secondary);margin-top:6px}
.rvn-cele-shine{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.rvn-cele-shine::after{content:"";position:absolute;top:-40%;bottom:-40%;width:40%;left:-60%;background:linear-gradient(105deg,transparent,rgba(255,240,200,.25),transparent);transform:skewX(-20deg);animation:rvnShine 1.1s ease forwards;animation-delay:calc(var(--d) + .7s)}
@keyframes rvnShine{to{left:160%}}
/* tikra korta */
.rvn-cele-cardwrap{position:relative;width:150px;aspect-ratio:3/4;border-radius:8px;overflow:hidden;background:#0a0810;border:1.5px solid var(--rc);box-shadow:0 10px 26px rgba(0,0,0,.7);transform:rotateY(90deg);animation:rvnCardFlip .7s cubic-bezier(.2,1.2,.4,1) forwards;animation-delay:calc(var(--d) + .15s)}
@keyframes rvnCardFlip{to{transform:rotateY(0)}}
.rvn-cele-cardwrap img{width:100%;height:100%;object-fit:cover;display:block}
.rvn-cele-cardname{font:700 15px var(--ravenof-font-display);color:var(--ravenof-text-primary);margin-top:10px;max-width:170px}
.rvn-cele-cardsub{display:flex;align-items:center;justify-content:center;gap:6px;font:500 11px var(--ravenof-font-body);letter-spacing:2px;text-transform:uppercase;color:var(--rc);margin-top:4px}
.rvn-cele-cardsub img{width:14px;height:14px;object-fit:contain}
.rvn-cele-cta{margin-top:8px;opacity:0;animation:rvnFadeUp .45s ease forwards;animation-delay:var(--cta);min-width:260px}
.rvn-cele-hint{font:400 12px var(--ravenof-font-body);color:#6b6474;opacity:0;animation:rvnFadeUp .45s ease forwards;animation-delay:calc(var(--cta) + .3s)}
.rvn-cele-fly{position:fixed;width:26px;height:26px;z-index:530;pointer-events:none;filter:drop-shadow(0 0 6px rgba(242,196,90,.8));transition:transform .75s cubic-bezier(.3,.1,.3,1),opacity .2s ease .6s}
.rvn-pill-bump{animation:rvnPillBump .5s ease}
@keyframes rvnPillBump{0%{transform:scale(1)}30%{transform:scale(1.12);box-shadow:0 0 18px rgba(242,196,90,.6)}100%{transform:scale(1)}}
/* kovos rezultatas: raudonas tonas pralaimėjus */
.rvn-cele-fx.red .rvn-cele-rays{background:repeating-conic-gradient(rgba(180,68,79,.06) 0 6deg,transparent 6deg 18deg)}
.rvn-cele-fx.red .rvn-cele-glow{background:radial-gradient(circle,rgba(180,68,79,.26),rgba(180,68,79,.07) 40%,transparent 70%)}
.rvn-cele-fx.red .rvn-cele-flash{background:radial-gradient(circle at 50% 45%,rgba(255,200,200,.35),transparent 55%)}
.rvn-cele-fx.red .rvn-cele-ember{background:#c65563;box-shadow:0 0 8px 2px rgba(198,85,99,.6)}
.rvn-cele-title.lose{color:#c65563;text-shadow:0 0 30px rgba(180,68,79,.4),0 2px 0 rgba(0,0,0,.6)}
.rvn-cele-sub{font:italic 400 15px var(--ravenof-font-body);color:var(--ravenof-text-secondary);margin:-6px 0 0;max-width:560px;opacity:0;animation:rvnFadeUp .45s ease .6s forwards}
.rvn-cele-extra{opacity:0;animation:rvnFadeUp .45s ease forwards;animation-delay:var(--cta)}
@media (max-width:640px){.rvn-cele-tiles{gap:10px}.rvn-cele-tile{width:112px;padding:14px 8px 12px}.rvn-cele-ico{width:62px;height:62px;margin-bottom:6px}.rvn-cele-ico img{width:52px;height:52px}.rvn-cele-amt{font-size:22px}.rvn-cele-lbl{font-size:10px;letter-spacing:1.5px;margin-top:4px}.rvn-cele-panel{gap:14px;padding:14px}.rvn-cele-sub{font-size:13px}}
@media (prefers-reduced-motion:reduce){.rvn-cele *,.rvn-cele-fx *{animation-duration:.01ms!important;animation-delay:0s!important}}
`

const CUR_ICON: Record<string, string> = { silver: 'cur-silver', rubies: 'cur-rubies', essence: 'cur-essence' }

/** Celebration CSS (vieną kartą per ekraną). */
export function CelebrationStyles() { return <style>{CSS}</style> }

/** Fonas: spinduliai + švytėjimas + blyksnis + žarijos. Tėvas – position:fixed/relative su overflow:hidden. */
export function CelebrationFx({ tone = 'gold' }: { tone?: 'gold' | 'red' }) {
  const embers = Array.from({ length: 24 }, (_, i) => (
    <i key={i} className="rvn-cele-ember" style={{ left: `${(i * 37) % 100}%`, ['--dx' as string]: `${((i * 53) % 120) - 60}px`, animationDuration: `${5 + (i % 6)}s`, animationDelay: `${(i % 8) * 0.5}s` }} />
  ))
  return (
    <div className={`rvn-cele-fx ${tone}`} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="rvn-cele-rays" /><div className="rvn-cele-glow" /><div className="rvn-cele-flash" />
      {embers}
    </div>
  )
}

/** Atlygio plytelės su animacija (delay nuo baseDelay, po .18 s kiekvienai). */
export function CelebrationTiles({ items, baseDelay = 0.75 }: { items: CelebrationItem[]; baseDelay?: number }) {
  return (
    <div className="rvn-cele-tiles">
      {items.map((it, i) => <Tile key={i} item={it} delay={baseDelay + i * 0.18} />)}
    </div>
  )
}
/** Kada rodyti CTA po plytelių (s, kaip CSS reikšmė). */
export function celebrationCtaDelay(n: number, baseDelay = 0.75): string { return (baseDelay + n * 0.18 + 0.55).toFixed(2) + 's' }

export function RewardCelebrationHost() {
  const t = useT()
  const [req, setReq] = useState<CelebrationRequest | null>(null)
  const [out, setOut] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const queue = useRef<CelebrationRequest[]>([])

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<CelebrationRequest>).detail
      if (req) queue.current.push(d); else { setReq(d); setOut(false); playSuccess() }
    }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [req])

  const close = () => {
    if (!req || out) return
    setOut(true)
    playUiClick()
    flyCoins(req, rootRef.current)
    window.setTimeout(() => {
      setReq(null); setOut(false)
      const next = queue.current.shift()
      if (next) window.setTimeout(() => { setReq(next); playSuccess() }, 250)
    }, 320)
  }

  useEffect(() => {
    if (!req) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req, out])

  if (!req || typeof document === 'undefined') return null
  const cta = celebrationCtaDelay(req.items.length)

  return createPortal(
    <div ref={rootRef} className={`rvn-cele ravenof-body${out ? ' out' : ''}`} role="dialog" aria-modal="true" onClick={close}>
      <CelebrationStyles />
      <CelebrationFx />
      <div className="rvn-cele-panel">
        <div className="rvn-cele-kicker">{req.kicker}</div>
        <h1 className="rvn-cele-title">{req.title}{req.titleAccent ? <> <b>{req.titleAccent}</b></> : null}</h1>
        <div className="rvn-cele-rule" />
        <CelebrationTiles items={req.items} />
        <RavenofBannerButton className="rvn-cele-cta" style={{ ['--cta' as string]: cta }} onClick={(e) => { e.stopPropagation(); close() }}>
          {t('rewards.celebrate.continue')}
        </RavenofBannerButton>
        <div className="rvn-cele-hint" style={{ ['--cta' as string]: cta }}>{t('rewards.celebrate.hint')}</div>
      </div>
    </div>,
    document.body,
  )
}

function Tile({ item, delay }: { item: CelebrationItem; delay: number }) {
  const t = useT()
  const d = `${delay.toFixed(2)}s`
  const corners = (
    <>
      <i className="rvn-cele-corner" style={{ left: 4, top: 4, borderRight: 0, borderBottom: 0 }} />
      <i className="rvn-cele-corner" style={{ right: 4, top: 4, borderLeft: 0, borderBottom: 0 }} />
      <i className="rvn-cele-corner" style={{ left: 4, bottom: 4, borderRight: 0, borderTop: 0 }} />
      <i className="rvn-cele-corner" style={{ right: 4, bottom: 4, borderLeft: 0, borderTop: 0 }} />
    </>
  )
  if (item.kind === 'card') {
    const rc = ravenofRarityColor(item.rarity)
    return (
      <div className="rvn-cele-tile card" style={{ ['--d' as string]: d, ['--rc' as string]: rc }}>
        {corners}
        <div className="rvn-cele-cardwrap">
          {item.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={item.imageUrl} alt={item.name} draggable={false} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#1a1325,#0a0810)' }} />}
        </div>
        <div className="rvn-cele-cardname">{item.name}</div>
        <div className="rvn-cele-cardsub">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ravenofRarityGem(item.rarity)} alt="" aria-hidden />
          <span>{item.sub ?? t(`progression.rarity.${item.rarity}`)}</span>
        </div>
        <div className="rvn-cele-shine" />
      </div>
    )
  }
  const sparks = Array.from({ length: 12 }, (_, j) => {
    const a = (j / 12) * Math.PI * 2, r = 54 + ((j * 7) % 30)
    return <i key={j} className="rvn-cele-spark" style={{ ['--sx' as string]: `${Math.round(Math.cos(a) * r)}px`, ['--sy' as string]: `${Math.round(Math.sin(a) * r)}px` }} />
  })
  let asset: string, label: string, amount: number | null = null
  if (item.kind === 'pack') {
    const v = resolveRewardVisualV2({ type: 'faction_booster_choice', quantity: 1 })
    asset = item.imageUrl ?? v.asset; label = item.label
    return (
      <div className="rvn-cele-tile" style={{ ['--d' as string]: d, width: 220 }} data-reward-type="pack">
        {corners}
        <div className="rvn-cele-ico" style={{ width: 150, height: 150 }}>
          <span className="rvn-cele-ring" /><span className="rvn-cele-ring r2" />{sparks}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset} alt="" aria-hidden style={{ width: 140, height: 140 }} />
        </div>
        <div className="rvn-cele-amt" style={{ fontSize: 20 }}>{item.name}</div>
        <div className="rvn-cele-lbl">{label}</div>
        <div className="rvn-cele-shine" />
      </div>
    )
  }
  if (item.kind === 'booster') {
    const v = resolveRewardVisualV2({ type: 'faction_booster_choice', quantity: item.count })
    asset = v.asset; label = item.label
  } else {
    const v = resolveRewardVisualV2(item.reward)
    asset = v.asset; label = v.name
    if ('amount' in item.reward) amount = item.reward.amount
  }
  return (
    <div className="rvn-cele-tile" style={{ ['--d' as string]: d }} data-reward-type={item.kind === 'reward' ? item.reward.type : item.kind}>
      {corners}
      <div className="rvn-cele-ico">
        <span className="rvn-cele-ring" /><span className="rvn-cele-ring r2" />{sparks}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset} alt="" aria-hidden />
      </div>
      {amount != null ? <CountUp n={amount} startMs={delay * 1000 + 250} /> : <div className="rvn-cele-amt" style={{ fontSize: 22 }}>{label}</div>}
      <div className="rvn-cele-lbl">{label}</div>
      <div className="rvn-cele-shine" />
    </div>
  )
}

function CountUp({ n, startMs }: { n: number; startMs: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now() + startMs, dur = 700
    const tick = (now: number) => {
      if (now < t0) { raf = requestAnimationFrame(tick); return }
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3)
      setV(Math.round(n * e))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [n, startMs])
  return <div className="rvn-cele-amt">+{formatNumber(v)}</div>
}

/** Monetos skrenda iš plytelių į header'io balansų piliules (jei jos matomos). */
function flyCoins(req: CelebrationRequest, root: HTMLDivElement | null) {
  if (!root) return
  req.items.forEach((it, idx) => {
    if (it.kind !== 'reward' || !('amount' in it.reward)) return
    const icon = CUR_ICON[it.reward.type]
    if (!icon) return
    const pillImg = document.querySelector<HTMLImageElement>(`.rvn-app-header .ravenof-pill img[src*="${icon}"]`)
    const tileImg = root.querySelectorAll<HTMLImageElement>('.rvn-cele-ico img')[idx - req.items.slice(0, idx).filter((x) => x.kind === 'card').length]
    if (!pillImg || !tileImg) return
    const pill = pillImg.closest('.ravenof-pill') as HTMLElement | null
    const from = tileImg.getBoundingClientRect(), to = pillImg.getBoundingClientRect()
    for (let j = 0; j < 5; j++) {
      const f = document.createElement('img')
      f.src = tileImg.src; f.className = 'rvn-cele-fly'
      f.style.left = `${from.left + from.width / 2 - 13}px`; f.style.top = `${from.top + from.height / 2 - 13}px`
      document.body.appendChild(f)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        f.style.transitionDelay = `${j * 60}ms, ${j * 60}ms`
        f.style.transform = `translate(${to.left + to.width / 2 - (from.left + from.width / 2)}px, ${to.top + to.height / 2 - (from.top + from.height / 2)}px) scale(.6)`
        f.style.opacity = '0'
      }))
      window.setTimeout(() => f.remove(), 1300 + j * 60)
    }
    if (pill) window.setTimeout(() => { pill.classList.remove('rvn-pill-bump'); void pill.offsetWidth; pill.classList.add('rvn-pill-bump') }, 700 + idx * 80)
  })
}
