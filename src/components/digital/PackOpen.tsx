'use client'

// ── Pakuotės atplėšimas v2 (2026-09-20, playtest): folija riečiasi 3D ir byra
// kibirkštimis, atplėšus – blyksnis, smūginės bangos, ekrano drebėjimas, pakuotė
// skyla į dvi puses, kortos iššauna vėduokle ir susirenka į kaladę; verčiant –
// spinduliai/dalelės pagal retumą. Pabaigoje – ta pati karuselė ore.
// Dalelės – vienas canvas (be DOM node'ų kiekvienai kibirkščiai).
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'
import { openPack, type OpenedCard } from '@/lib/economy'
import { reportQuestEvent } from '@/lib/gamification/quests'
import { rarityColor, rarityLevel } from '@/lib/digital/rarity'
import { playUiClick, playSuccess, playCardFlip, playDiscovery, playCardPick, playImpact } from '@/lib/ui-sound'
import { useT, useCardI18n } from '@/lib/i18n/react'
import { isReducedMotionEnabled, isSummonFxEnabled } from '@/lib/settings'
import { cachedBattleSkins, getEquippedBattleSkins, type SkinVisual } from '@/lib/cosmetics'

const PACK_W = 220
const PACK_H = 300
const STRIP_H = 58
const LIFT_PAD = 70
const THRESH = 0.42
const CARD_W = 150
const CARD_H = 210
const EJECT_MS = 1600
// „kandžiotas" plėšimo kraštas
const JAG_OUT = 'polygon(0 0, 100% 0, 100% 72%, 94% 100%, 88% 74%, 81% 100%, 74% 72%, 67% 96%, 60% 70%, 53% 100%, 46% 74%, 39% 98%, 32% 72%, 25% 100%, 18% 74%, 11% 96%, 5% 72%, 0 88%)'
const JAG_IN  = 'polygon(0 0, 100% 0, 100% 78%, 95% 100%, 89% 76%, 82% 100%, 75% 74%, 68% 100%, 61% 72%, 54% 100%, 47% 76%, 40% 100%, 33% 74%, 26% 100%, 19% 76%, 12% 100%, 6% 74%, 0 94%)'
const OCT = 'polygon(9px 0,calc(100% - 9px) 0,100% 9px,100% calc(100% - 9px),calc(100% - 9px) 100%,9px 100%,0 calc(100% - 9px),0 9px)'
const HALF_L = 'polygon(0 0,52% 0,47% 30%,54% 55%,46% 80%,50% 100%,0 100%)'
const HALF_R = 'polygon(52% 0,100% 0,100% 100%,50% 100%,46% 80%,54% 55%,47% 30%)'

const CSS = `
@keyframes rvnPackFloat{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-8px) rotate(1deg)}}
@keyframes rvnPackShimmer{0%{transform:translateX(-45%)}55%,100%{transform:translateX(45%)}}
@keyframes rvnPackSeam{0%,100%{opacity:.25}50%{opacity:.95}}
@keyframes rvnPackShake{10%,90%{transform:translate(-2px,1px)}20%,80%{transform:translate(4px,-2px)}30%,50%,70%{transform:translate(-7px,3px)}40%,60%{transform:translate(7px,-3px)}}
@keyframes rvnPackSpin{to{transform:rotate(360deg)}}
@keyframes rvnPackArrow{0%,100%{transform:translateX(0);opacity:.4}50%{transform:translateX(10px);opacity:1}}
.rvn-pack-shake{animation:rvnPackShake .45s cubic-bezier(.36,.07,.19,.97)}
`

// ── Dalelių canvas ────────────────────────────────────────────────────────────
//  Našumas (2026-09-20): jokio ctx.shadowBlur (buvo pagrindinė telefonų stabdymo
//  priežastis), dalelė = iš anksto paruoštas sprite'as, RAF sukasi TIK kol yra
//  dalelių, dalelių kiekis ir dpr ribojami pagal įrenginį / reduced-motion.
type Particle = { x: number; y: number; vx: number; vy: number; life: number; dec: number; s: number; c: string; g: number; tw: boolean; streak: boolean }
type EmitOpts = { a0?: number; spread?: number; sp?: number; up?: number; dec?: number; s?: number; c?: string; g?: number; tw?: boolean; streak?: boolean }
type Emitter = (x: number, y: number, n: number, o: EmitOpts) => void

const MAX_PARTS = 240

/** FX biudžetas: 0 = išjungta (reduced motion), 1 = pilnas. */
function fxBudget(): number {
  if (typeof window === 'undefined') return 0
  try { if (isReducedMotionEnabled()) return 0 } catch { /* */ }
  try { if (!isSummonFxEnabled()) return 0.3 } catch { /* */ }
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const mem = nav.deviceMemory ?? 4
  if (cores <= 4 || mem <= 3) return 0.4
  if (cores <= 6) return 0.65
  return 1
}

/** #rgb / #rrggbb → rgba(...) su alfa (gradientui, kad neitų per juodą). */
function withAlpha(c: string, a: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return c
  const h = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1]
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

function useParticles() {
  const ref = useRef<HTMLCanvasElement>(null)
  const parts = useRef<Particle[]>([])
  const budget = useRef(0)
  const rafRef = useRef(0)
  const tickRef = useRef<(() => void) | null>(null)

  const emit = useCallback<Emitter>((x, y, n, o) => {
    const bud = budget.current
    if (bud <= 0) return
    const count = Math.max(1, Math.round(n * bud))
    for (let i = 0; i < count; i++) {
      const a = (o.a0 ?? 0) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2)
      const sp = (o.sp ?? 2) * (0.4 + Math.random())
      parts.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up ?? 0), life: 1, dec: (o.dec ?? 0.02) * (0.6 + Math.random() * 0.8), s: (o.s ?? 3) * (0.5 + Math.random()), c: o.c ?? '#ffd97a', g: o.g ?? 0.03, tw: !!o.tw, streak: !!o.streak })
    }
    if (parts.current.length > MAX_PARTS) parts.current.splice(0, parts.current.length - MAX_PARTS)
    if (!rafRef.current && tickRef.current) rafRef.current = requestAnimationFrame(tickRef.current)
  }, [])

  useEffect(() => {
    budget.current = fxBudget()
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d', { alpha: true })
    if (!ctx) return
    let vw = window.innerWidth, vh = window.innerHeight
    const resize = () => {
      vw = window.innerWidth; vh = window.innerHeight
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize(); window.addEventListener('resize', resize)

    // sprite'ai pagal spalvą (jų mažai – 5–8)
    const sprites = new Map<string, HTMLCanvasElement>()
    const spriteFor = (c: string) => {
      let sp = sprites.get(c)
      if (!sp) {
        sp = document.createElement('canvas'); sp.width = sp.height = 24
        const sc = sp.getContext('2d')
        if (sc) {
          const g = sc.createRadialGradient(12, 12, 0, 12, 12, 12)
          g.addColorStop(0, withAlpha(c, 1)); g.addColorStop(0.35, withAlpha(c, 0.75)); g.addColorStop(1, withAlpha(c, 0))
          sc.fillStyle = g; sc.fillRect(0, 0, 24, 24)
        }
        sprites.set(c, sp)
      }
      return sp
    }

    const tick = () => {
      const P = parts.current
      ctx.clearRect(0, 0, vw, vh)
      if (P.length === 0) { rafRef.current = 0; return }   // sustojam, kol kas nors emit'ins
      rafRef.current = requestAnimationFrame(tick)
      ctx.globalCompositeOperation = 'lighter'
      let w = 0
      for (let i = 0; i < P.length; i++) {
        const p = P[i]
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.life -= p.dec
        if (p.life <= 0) continue
        if (p.x < -60 || p.x > vw + 60 || p.y > vh + 60) continue
        P[w++] = p
        const al = p.tw ? p.life * (0.5 + 0.5 * Math.sin(p.life * 40)) : p.life
        ctx.globalAlpha = Math.max(0, Math.min(1, al))
        if (p.streak) {
          ctx.strokeStyle = p.c; ctx.lineWidth = Math.max(0.6, p.s * 0.7)
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4); ctx.stroke()
        } else {
          const r = Math.max(1, p.s * p.life * 2.2)
          ctx.drawImage(spriteFor(p.c), p.x - r, p.y - r, r * 2, r * 2)
        }
      }
      P.length = w
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
    }
    tickRef.current = tick

    const P = parts.current
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0; tickRef.current = null; P.length = 0
      window.removeEventListener('resize', resize)
    }
  }, [])
  return { ref, emit }
}

// ── Pakuotės menas (viršus/apačia dalinasi tuo pačiu vaizdu) ─────────────────
function PackArt({ packImage, packName, bad, onBad, offsetY = 0, showName, shimmer }: { packImage?: string | null; packName: string; bad: boolean; onBad?: () => void; offsetY?: number; showName?: boolean; shimmer?: boolean }) {
  return (
    <span className="absolute inset-0 block overflow-hidden" style={{ background: 'radial-gradient(60% 40% at 50% 38%, rgba(240,180,41,.3), transparent 70%), linear-gradient(160deg,#3a2560 0%,#1b1230 45%,#0d0915 100%)' }}>
      {packImage && !bad ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={packImage} alt={packName} onError={onBad} draggable={false} className="absolute left-0 object-cover" style={{ top: offsetY, width: PACK_W, height: PACK_H }} />
      ) : (
        <span className="absolute left-0 flex flex-col items-center justify-center gap-2" style={{ top: offsetY, width: PACK_W, height: PACK_H }}>
          <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 10px rgba(240,180,41,0.5))' }}>🎴</span>
          <span style={{ font: '900 15px var(--ravenof-font-display)', letterSpacing: 5, color: '#ffd97a', textShadow: '0 0 12px rgba(240,180,41,.6)' }}>RAVENOF</span>
        </span>
      )}
      {showName && (
        <span className="absolute left-0 right-0 bottom-0 px-2 py-1.5 text-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
          <span style={{ font: '700 10px var(--ravenof-font-display)', color: 'var(--ravenof-gold)', letterSpacing: '0.14em' }}>{packName}</span>
        </span>
      )}
      {/* folijos blizgesys – TIK pagrindiniam korpusui (kopijose kainuoja per daug) */}
      {shimmer && <span aria-hidden className="absolute pointer-events-none" style={{ inset: '-40%', mixBlendMode: 'screen', willChange: 'transform', background: 'linear-gradient(115deg,transparent 40%,rgba(255,255,255,.2) 48%,rgba(255,240,200,.42) 50%,rgba(255,255,255,.2) 52%,transparent 60%)', animation: 'rvnPackShimmer 4.2s ease-in-out infinite' }} />}
      <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 55%)' }} />
    </span>
  )
}

function CardArt({ card }: { card: OpenedCard }) {
  const [bad, setBad] = useState(false)
  const cx = useCardI18n()
  const col = rarityColor(card.rarity)
  const cardImg = cx.image(card.id, card.image_url)
  const cardName = cx.name(card.id, card.name)
  if (cardImg && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cardImg} alt={cardName} onError={() => setBad(true)} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center" style={{ background: 'linear-gradient(160deg, #1a1325, #0a0810)' }}>
      <span className="text-2xl">🎴</span>
      <span className="text-[11px] font-bold leading-tight" style={{ color: '#fff' }}>{cardName}</span>
      <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: col }}>{card.rarity ?? ''}</span>
    </div>
  )
}

/** „NAUJA" ženklas – korta, kurios žaidėjas dar neturėjo. */
function NewBadge({ label, small }: { label: string; small?: boolean }) {
  return (
    <span className="absolute pointer-events-none" style={{
      top: small ? 4 : 6, left: small ? 4 : 6, zIndex: 4,
      font: `800 ${small ? 8 : 10}px var(--ravenof-font-display)`, letterSpacing: small ? 0.8 : 1.4,
      color: '#1a1206', background: 'linear-gradient(135deg,#ffe9a8,#f0b429)',
      padding: small ? '2px 5px' : '3px 8px', borderRadius: 3,
      boxShadow: '0 2px 8px rgba(240,180,41,.6), 0 0 0 1px rgba(255,255,255,.35) inset',
      textTransform: 'uppercase',
    }}>{label}</span>
  )
}

// Užsidėta (equipped) nugarėlė — modulio kintamasis, kad visi <CardBack/>
// egzemplioriai piešiniuose gautų ją be prop drilling'o per animacijų medį.
let PACK_BACK: SkinVisual | null = null

/** Kortos nugarėlė (kol neatversta) — TAVO užsidėta kosmetika, fallback: generinė. */
function CardBack({ w = CARD_W, h = CARD_H }: { w?: number; h?: number }) {
  const [bad, setBad] = useState(false)
  const skin = bad ? null : PACK_BACK
  if (skin?.url) {
    return (
      <div className="absolute inset-0 rounded-[10px] overflow-hidden" style={{ width: w, height: h, border: '2px solid rgba(240,180,41,.55)', boxShadow: '0 12px 30px rgba(0,0,0,.7)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={skin.url} alt="" draggable={false} onError={() => setBad(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    )
  }
  if (skin?.css) {
    return <div className="absolute inset-0 rounded-[10px] overflow-hidden" style={{ width: w, height: h, background: skin.css, border: '2px solid rgba(240,180,41,.55)', boxShadow: '0 12px 30px rgba(0,0,0,.7)' }} />
  }
  return (
    <div className="absolute inset-0 rounded-[10px] overflow-hidden" style={{ width: w, height: h, background: 'linear-gradient(160deg,#241a3a,#0d0915)', border: '2px solid rgba(240,180,41,.55)', boxShadow: '0 12px 30px rgba(0,0,0,.7)' }}>
      <div className="absolute rounded-md" style={{ inset: 8, border: '1px solid rgba(240,180,41,.35)', background: 'repeating-linear-gradient(45deg,transparent 0 6px,rgba(240,180,41,.06) 6px 7px),repeating-linear-gradient(-45deg,transparent 0 6px,rgba(240,180,41,.06) 6px 7px)' }} />
      <span className="absolute left-1/2 top-1/2 text-4xl" style={{ transform: 'translate(-50%,-50%)', color: 'var(--ravenof-gold)', filter: 'drop-shadow(0 0 8px rgba(240,180,41,.7))' }}>🐦‍⬛</span>
    </div>
  )
}

type Phase = 'sealed' | 'opening' | 'eject' | 'reveal' | 'done'

export function PackOpen({ packId, packName, packImage, onClose, onOpened }: {
  packId: string; packName: string; packImage?: string | null; onClose: () => void; onOpened?: () => void
}) {
  const t = useT()
  const cx = useCardI18n()
  // Užsidėta nugarėlė: iškart iš sessionStorage kešo, po to patikslinama RPC.
  const [, setBackTick] = useState(0)
  useEffect(() => {
    const apply = (sk: { cardBack: SkinVisual | null } | null) => {
      if (!sk?.cardBack) return
      PACK_BACK = sk.cardBack
      setBackTick((v) => v + 1)
    }
    apply(cachedBattleSkins())
    getEquippedBattleSkins().then(apply).catch(() => {})
  }, [])
  const [packImgBad, setPackImgBad] = useState(false)
  const [drag, setDrag] = useState<{ t: number; fx: number; dir: 1 | -1 }>({ t: 0, fx: 0, dir: 1 })
  const [phase, setPhase] = useState<Phase>('sealed')
  const [burst, setBurst] = useState(false)      // blyksnis/skilimas jau įvyko
  const [cards, setCards] = useState<OpenedCard[] | null>(null)
  const [revealIdx, setRevealIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [flash, setFlash] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const packRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startXRef = useRef(0)
  const firedRef = useRef(false)
  const lastSparkRef = useRef(0)
  const seqRef = useRef(false)
  const timersRef = useRef<number[]>([])
  const openedRef = useRef(false)
  const gotCardsRef = useRef(false)
  const dragRafRef = useRef(0)
  const dragNextRef = useRef<{ t: number; fx: number; dir: 1 | -1 } | null>(null)
  const { ref: fxRef, emit } = useParticles()

  const packCenter = () => { const r = packRef.current?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, left: r.left } : { x: window.innerWidth / 2, y: window.innerHeight / 2, top: window.innerHeight / 2 - PACK_H / 2, left: window.innerWidth / 2 - PACK_W / 2 } }
  const doShake = () => { try { if (isReducedMotionEnabled()) return } catch { /* */ } setShake((s) => s + 1) }

  const doOpen = async () => {
    if (firedRef.current) return
    firedRef.current = true
    dragging.current = false
    setPhase('opening')
    setDrag((d) => ({ t: 1, fx: d.dir > 0 ? PACK_W : 0, dir: d.dir }))
    playSuccess()
    const c = packCenter()
    emit(c.x, c.top + STRIP_H, 40, { a0: -Math.PI / 2, spread: 2.4, sp: 5, s: 3, dec: 0.02, c: '#ffd97a', g: 0.06, streak: true })
    // blyksnis + skilimas po 420 ms (nepriklausomai nuo RPC)
    const burstTm = window.setTimeout(() => {
      const cc = packCenter()
      setFlash((f) => f + 1); doShake(); playImpact()
      emit(cc.x, cc.y, 90, { sp: 7, s: 3, dec: 0.012, c: '#ffb347', g: 0.05, streak: true })
      emit(cc.x, cc.y, 60, { sp: 3, s: 4, dec: 0.008, c: '#ffe9a8', g: -0.01, tw: true })
      emit(cc.x, cc.y, 30, { sp: 9, s: 2, dec: 0.02, c: '#fff', g: 0.02, streak: true })
      setBurst(true)
    }, 420)
    timersRef.current.push(burstTm)
    const r = await openPack(packId)
    if ('error' in r) {
      const e = r.error || ''
      setError(/no pack to open/i.test(e) ? t('collection.pack.noPack') : t('collection.pack.errorPrefix', { msg: e }))
      window.clearTimeout(burstTm)   // kad po klaidos pakuotė „nesuskiltų" tuščiai
      firedRef.current = false
      setPhase('sealed'); setBurst(false); setFlash(0)
      setDrag({ t: 0, fx: 0, dir: 1 })
      return
    }
    gotCardsRef.current = true
    setCards([...r]); setRevealIdx(0)  // jau surūšiuota: dažnos pirma, rečiausios paskutinės
    reportQuestEvent('open_pack')
    // onOpened (inventoriaus + kolekcijos perkrovimas) NEkviečiamas čia —
    // jis sunkus ir vidury animacijos ją stabdydavo. Iškviečiam pabaigoje.
  }

  // Inventorių/kolekciją atnaujinam, kai animacija baigta (arba išeinant)
  const onOpenedRef = useRef(onOpened)
  onOpenedRef.current = onOpened
  const fireOpened = useCallback(() => {
    if (openedRef.current || !gotCardsRef.current) return
    openedRef.current = true
    onOpenedRef.current?.()
  }, [])
  useEffect(() => { if (phase === 'done') fireOpened() }, [phase, fireOpened])
  useEffect(() => () => { fireOpened() }, [fireOpened])

  // Kortos iššauna, kai ir sprogimas įvyko, ir RPC grąžino kortas.
  // SVARBU: laikmačiai paleidžiami VIENĄ kartą ir NEVALOMI keičiantis fazei —
  // anksčiau `setPhase('eject')` pats nutraukdavo savo „reveal" laikmatį ir
  // atplėšimas užstrigdavo ties nugarėlėmis (kortos nebeapsiversdavo).
  useEffect(() => {
    if (phase !== 'opening' || !burst || !cards || seqRef.current) return
    seqRef.current = true
    timersRef.current.push(
      window.setTimeout(() => setPhase('eject'), 120),
      window.setTimeout(() => { playCardPick(); setPhase('reveal') }, 120 + EJECT_MS),
    )
  }, [phase, burst, cards])

  // Saugiklis: jei dėl bet kokios priežasties užstrigtume ties „eject",
  // po EJECT_MS + 1.2 s vis tiek pereinam į vertimą.
  useEffect(() => {
    if (phase !== 'eject') return
    const tm = window.setTimeout(() => setPhase((f) => (f === 'eject' ? 'reveal' : f)), EJECT_MS + 1200)
    return () => window.clearTimeout(tm)
  }, [phase])

  // Visų laikmačių valymas išmontuojant
  useEffect(() => () => { timersRef.current.forEach((id) => window.clearTimeout(id)); timersRef.current = [] }, [])

  const onDown = (e: React.PointerEvent) => {
    if (firedRef.current) return
    dragging.current = true; startXRef.current = e.clientX
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId) } catch { /* */ }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current || firedRef.current) return
    const rect = packRef.current?.getBoundingClientRect()
    const dx = e.clientX - startXRef.current
    const dir: 1 | -1 = dx >= 0 ? 1 : -1
    const tt = Math.min(1, Math.abs(dx) / (PACK_W * 0.7))
    const fx = rect ? Math.min(PACK_W, Math.max(0, e.clientX - rect.left)) : 0
    // vienas setState per kadrą (pointermove ateina kur kas dažniau nei 60 Hz)
    dragNextRef.current = { t: tt, fx, dir }
    if (!dragRafRef.current) {
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = 0
        if (dragNextRef.current) setDrag(dragNextRef.current)
      })
    }
    const now = performance.now()
    if (rect && tt > 0.02 && now - lastSparkRef.current > 28) {
      lastSparkRef.current = now
      emit(rect.left + fx, rect.top + STRIP_H, 3, { a0: -Math.PI / 2, spread: 1.6, sp: 2.2, s: 2.2, dec: 0.05, c: Math.random() < 0.5 ? '#ffd97a' : '#ff9a3c', g: 0.08, streak: true })
    }
    if (tt >= 1) { dragging.current = false; doOpen() }
  }
  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false
    if (dragRafRef.current) { cancelAnimationFrame(dragRafRef.current); dragRafRef.current = 0 }
    dragNextRef.current = null
    if (drag.t >= THRESH) doOpen()
    else setDrag((d) => ({ t: 0, fx: d.dir > 0 ? 0 : PACK_W, dir: d.dir }))
  }

  const regionClip = drag.dir > 0 ? `inset(0 ${PACK_W - drag.fx}px 0 0)` : `inset(0 0 0 ${drag.fx}px)`
  const fired = phase !== 'sealed'
  const revealing = phase === 'reveal' && !!cards && revealIdx < cards.length
  const current = cards && revealing ? cards[revealIdx] : null

  // Garsas + dalelės dabartinei kortai
  useEffect(() => {
    if (!current) return
    playCardFlip()
    const L = rarityLevel(current.rarity)
    const col = rarityColor(current.rarity)
    if (L === 2) playDiscovery()
    else if (L === 3) playSuccess()
    else if (L >= 4) { playSuccess(); window.setTimeout(() => playDiscovery(), 130) }
    const tm = window.setTimeout(() => {
      const r = cardsRef.current?.getBoundingClientRect()
      const x = r ? r.left + r.width / 2 : window.innerWidth / 2, y = r ? r.top + r.height / 2 : window.innerHeight / 2
      const n = [0, 10, 26, 46, 80][L] ?? 0
      if (n) emit(x, y, n, { sp: 4 + L, s: 3, dec: 0.015, c: col, g: 0.02, tw: L >= 3 })
      if (L >= 4) { doShake(); emit(x, y, 40, { sp: 9, s: 2, dec: 0.02, c: '#fff', streak: true }) }
    }, 350)
    return () => window.clearTimeout(tm)
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ekrano drebėjimas (klasė pridedama iš naujo kiekvienam smūgiui)
  useEffect(() => {
    if (!shake || !rootRef.current) return
    const el = rootRef.current
    el.classList.remove('rvn-pack-shake'); void el.offsetWidth; el.classList.add('rvn-pack-shake')
    const tm = window.setTimeout(() => el.classList.remove('rvn-pack-shake'), 500)
    return () => window.clearTimeout(tm)
  }, [shake])

  const L = rarityLevel(current?.rarity)
  const col = rarityColor(current?.rarity)
  const advance = () => { playUiClick(); setRevealIdx((i) => i + 1) }
  useEffect(() => { if (cards && revealIdx >= cards.length && phase === 'reveal') setPhase('done') }, [revealIdx, cards, phase])

  const jit = drag.t > 0.6 && !fired ? (Math.random() - 0.5) * drag.t * 3 : 0

  if (typeof document === 'undefined') return null
  return createPortal(
    <div ref={rootRef} className="ravenof-body fixed inset-0 z-[170] flex items-center justify-center p-4" style={{ background: 'radial-gradient(80% 60% at 50% 45%, #171026 0%, #0a0711 55%, #06050a 100%)' }}>
      <style>{CSS}</style>
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 60% at 50% 50%, transparent 40%, rgba(0,0,0,.7))' }} />
      <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="ravenof-iconbtn absolute top-4 right-4 z-[5]" style={{ width: 34, height: 34, fontSize: 15 }}>✕</button>

      {/* ── SEALED / OPENING – pakuotė ── */}
      {(phase === 'sealed' || phase === 'opening') && (
        <div className="flex flex-col items-center gap-2.5 select-none">
          <p className="text-center" style={{ font: '700 12px var(--ravenof-font-display)', color: 'var(--ravenof-gold)', letterSpacing: 2, textTransform: 'uppercase', margin: 0, opacity: drag.t > 0.05 || fired ? 0 : 1, transition: 'opacity .3s' }}>
            {t('collection.pack.swipeToOpen')} <span aria-hidden style={{ display: 'inline-block', marginLeft: 6, animation: 'rvnPackArrow 1.2s ease-in-out infinite' }}>➜</span>
          </p>
          <div ref={packRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            className="relative cursor-grab active:cursor-grabbing" style={{ width: PACK_W, height: PACK_H, touchAction: 'none', perspective: 900, animation: drag.t === 0 && !fired ? 'rvnPackFloat 3.6s ease-in-out infinite' : 'none' }}>
            {/* švytėjimas iš vidaus virš pakuotės */}
            <div className="absolute pointer-events-none" style={{ left: -30, right: -30, top: -50, height: 150, filter: 'blur(18px)', opacity: burst ? 0 : (fired ? 1 : drag.t * 0.9), transition: 'opacity .35s', background: 'radial-gradient(60% 70% at 50% 45%, rgba(255,215,110,1), rgba(240,120,30,.55) 50%, transparent 75%)' }} />

            <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transition: fired ? 'transform .35s cubic-bezier(.3,1.6,.6,1)' : 'transform .12s ease-out', transform: fired ? 'scale(1.06)' : `rotateZ(${drag.dir * drag.t * 4}deg) rotateY(${drag.dir * drag.t * 10}deg) translateX(${jit}px)` }}>
              {/* pakuotės korpusas */}
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: OCT, opacity: burst ? 0 : 1, boxShadow: '0 22px 50px rgba(0,0,0,.75)' }}>
                <PackArt packImage={packImage} packName={packName} bad={packImgBad} onBad={() => setPackImgBad(true)} showName shimmer />
                {/* siūlė */}
                <div className="absolute pointer-events-none" style={{ left: 10, right: 10, top: STRIP_H, height: 2, background: 'linear-gradient(90deg,transparent,rgba(240,180,41,.9),transparent)', boxShadow: '0 0 10px rgba(240,180,41,.8)', animation: 'rvnPackSeam 1.6s ease-in-out infinite', opacity: Math.max(0, 1 - drag.t * 2.2) }} />
              </div>

              {/* VIDUS – atsiveria po nuplėšta folija */}
              <div className="absolute left-0 right-0 pointer-events-none overflow-hidden" style={{ top: 0, height: STRIP_H, clipPath: regionClip, zIndex: 2, opacity: burst ? 0 : 1 }}>
                <div className="absolute inset-0" style={{ clipPath: JAG_IN, background: 'linear-gradient(180deg,#040308,#120c1c 60%,#22183a)', boxShadow: 'inset 0 -8px 12px rgba(0,0,0,0.85)' }} />
                <div className="absolute inset-0" style={{ clipPath: JAG_IN, opacity: 0.2 + drag.t * 0.8, background: 'radial-gradient(70% 100% at 50% 100%, rgba(255,205,90,.9), rgba(240,120,30,.35) 55%, transparent 80%)' }} />
              </div>

              {/* NUPLĖŠAMA FOLIJA – kyla, riečiasi 3D ir sukasi nuo plėšimo krašto */}
              {!fired ? (
                <div className="absolute left-0 right-0 pointer-events-none" style={{ top: -LIFT_PAD, height: STRIP_H + LIFT_PAD, clipPath: regionClip, zIndex: 3 }}>
                  <div className="absolute left-0 right-0" style={{ top: LIFT_PAD, height: STRIP_H, clipPath: JAG_OUT, transformStyle: 'preserve-3d',
                    transformOrigin: drag.dir > 0 ? '100% 100%' : '0% 100%',
                    transform: `translateY(${-4 - drag.t * 22}px) rotateX(${-drag.t * 55}deg) rotateZ(${drag.dir * -9 * drag.t}deg) translateX(${drag.dir * -4 * drag.t}px)`,
                    transition: dragging.current ? 'none' : 'transform 0.25s ease',
                    filter: `drop-shadow(0 ${3 + drag.t * 7}px ${4 + drag.t * 6}px rgba(0,0,0,0.6))` }}>
                    <PackArt packImage={packImage} packName={packName} bad={packImgBad} />
                  </div>
                </div>
              ) : (
                <motion.div initial={{ x: 0, y: 0, rotateX: 0, rotateZ: 0, opacity: 1 }}
                  animate={{ x: drag.dir * 320, y: -220, rotateX: -70, rotateZ: drag.dir * 60, opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.2, 0.7, 0.3, 1] }}
                  className="absolute left-0 right-0 pointer-events-none" style={{ top: 0, height: STRIP_H, clipPath: JAG_OUT, zIndex: 3 }}>
                  <PackArt packImage={packImage} packName={packName} bad={packImgBad} />
                </motion.div>
              )}

              {/* PUSĖS po sprogimo */}
              {burst && ([[HALF_L, -1], [HALF_R, 1]] as const).map(([clip, s]) => (
                <motion.div key={s} initial={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
                  animate={{ x: s * 150, y: 140, rotate: s * 38, scale: 0.9, opacity: 0 }}
                  transition={{ x: { duration: 0.9, ease: [0.2, 0.6, 0.3, 1] }, y: { duration: 0.9, ease: [0.2, 0.6, 0.3, 1] }, rotate: { duration: 0.9 }, scale: { duration: 0.9 }, opacity: { duration: 0.6, delay: 0.35 } }}
                  className="absolute inset-0 overflow-hidden pointer-events-none" style={{ clipPath: clip }}>
                  <div className="absolute inset-0" style={{ clipPath: OCT }}><PackArt packImage={packImage} packName={packName} bad={packImgBad} /></div>
                </motion.div>
              ))}
            </div>

            {/* smūginės bangos */}
            {burst && [0, 0.12].map((d, i) => (
              <motion.div key={i} initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.7, delay: d, ease: [0.1, 0.8, 0.2, 1] }}
                className="absolute pointer-events-none" style={{ left: '50%', top: '50%', width: 240, height: 320, marginLeft: -120, marginTop: -160, borderRadius: 24, border: '3px solid #ffd97a', boxShadow: '0 0 30px rgba(240,180,41,.9), inset 0 0 30px rgba(240,180,41,.6)' }} />
            ))}
          </div>
          {!fired && <button onClick={doOpen} className="ravenof-press px-7 py-3" style={{ font: '800 13px var(--ravenof-font-display)', letterSpacing: 2, textTransform: 'uppercase', background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', border: 0, clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)' }}>{t('collection.pack.openCta')}</button>}
          {fired && <p style={{ font: '700 12px var(--ravenof-font-display)', color: 'var(--ravenof-gold)', letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>{t('collection.pack.opening')}</p>}
          {error && <p className="text-xs text-center max-w-[260px]" style={{ color: '#fca5a5' }}>{error}</p>}
        </div>
      )}

      {/* ── EJECT – kortos iššauna vėduokle ir susirenka į kaladę ── */}
      {phase === 'eject' && cards && (
        <div className="relative pointer-events-none" style={{ width: 0, height: 0 }}>
          {cards.map((c, i) => {
            const k = i - (cards.length - 1) / 2
            return (
              <motion.div key={c.id + '-' + i} className="absolute" style={{ left: -CARD_W / 2, top: -CARD_H / 2, width: CARD_W, height: CARD_H, zIndex: 10 - i }}
                initial={{ x: 0, y: 40, scale: 0.3, rotate: 0, opacity: 0 }}
                animate={{ x: [0, k * 62, k * 1.5], y: [40, -40, i * -2], scale: [0.3, 0.8, 1], rotate: [0, k * 16, k * 1.2], opacity: [0, 1, 1, 1] }}
                transition={{ duration: 1.45, times: [0, 0.38, 1], delay: 0.06 + i * 0.045, ease: ['easeOut', 'easeInOut'] }}>
                <CardBack />
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── REVEAL – po vieną ── */}
      {revealing && current && cards && (
        <div className="flex flex-col items-center gap-4 relative" onClick={advance} style={{ cursor: 'pointer' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--ravenof-text-secondary)', fontFamily: 'var(--ravenof-font-display)', letterSpacing: '0.1em' }}>{revealIdx + 1} / {cards.length}</p>
          <div ref={cardsRef} className="relative" style={{ width: CARD_W * 1.25, height: CARD_H * 1.25, perspective: 900 }}>
            {/* spinduliai + švytėjimas pagal retumą */}
            {L >= 2 && <motion.div key={'rays' + revealIdx} initial={{ opacity: 0 }} animate={{ opacity: L >= 4 ? 0.55 : 0.32 }} transition={{ duration: 0.5 }}
              className="absolute pointer-events-none" style={{ left: '50%', top: '50%', width: 460, height: 460, marginLeft: -230, marginTop: -230, animation: 'rvnPackSpin 16s linear infinite', willChange: 'transform',
                background: `repeating-conic-gradient(from 0deg, ${col} 0deg 6deg, transparent 6deg 18deg)`,
                WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,.9) 0, rgba(0,0,0,.35) 30%, transparent 62%)', maskImage: 'radial-gradient(circle, rgba(0,0,0,.9) 0, rgba(0,0,0,.35) 30%, transparent 62%)' }} />}
            <motion.div key={'glow' + revealIdx} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: L >= 1 ? 0.5 + L * 0.1 : 0.15, scale: 1 }} transition={{ duration: 0.6 }}
              className="absolute pointer-events-none" style={{ left: '50%', top: '50%', width: 300, height: 340, marginLeft: -150, marginTop: -170, borderRadius: '50%', filter: 'blur(26px)', background: `radial-gradient(circle, ${col}, transparent 70%)` }} />

            {/* likusi kaladė už kortos */}
            {cards.slice(revealIdx + 1).slice(0, 4).map((_, j) => (
              <div key={'bk' + j} className="absolute" style={{ left: '50%', top: '50%', width: CARD_W, height: CARD_H, marginLeft: -CARD_W / 2 + (j + 1) * 1.5, marginTop: -CARD_H / 2 + (j + 1) * -2, transform: `rotate(${(j + 1) * 1.2}deg)`, zIndex: 0 }}><CardBack /></div>
            ))}
            {/* atverstos – krūvelė kairėje */}
            {cards.slice(0, revealIdx).slice(-3).map((c, j) => (
              <motion.div key={'pv' + c.id + j} initial={{ x: 0, y: 0, scale: 1.25, opacity: 1 }} animate={{ x: -260 - j * 8, y: 0, scale: 0.55, opacity: 0.55 }} transition={{ duration: 0.45 }}
                className="absolute rounded-lg overflow-hidden" style={{ left: '50%', top: '50%', width: CARD_W, height: CARD_H, marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2, border: `2px solid ${rarityColor(c.rarity)}`, zIndex: 0 }}>
                <CardArt card={c} />
              </motion.div>
            ))}

            {/* dabartinė korta – verčiasi ir padidėja; legendarai dreba */}
            <motion.div key={'card' + revealIdx} initial={{ rotateY: 180, scale: 1 }}
              animate={L >= 4
                ? { rotateY: 0, scale: 1.25, rotate: [0, -0.9, 0.9, -0.5, 0], x: [0, 1.5, -1.5, 1, 0] }
                : { rotateY: 0, scale: 1.25 }}
              transition={L >= 4
                ? { rotateY: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }, scale: { duration: 0.7 }, rotate: { duration: 0.5, repeat: 4, delay: 0.7 }, x: { duration: 0.5, repeat: 4, delay: 0.7 } }
                : { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute" style={{ left: '50%', top: '50%', width: CARD_W, height: CARD_H, marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2, transformStyle: 'preserve-3d', zIndex: 2 }}>
              {/* nugarėlė */}
              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}><CardBack /></div>
              {/* veidas */}
              <div className="absolute inset-0 rounded-[10px] overflow-hidden" style={{ backfaceVisibility: 'hidden', border: `${2 + Math.min(2, L)}px solid ${col}`, boxShadow: `0 0 ${18 + L * 10}px ${col}${L >= 2 ? 'cc' : '88'}` }}>
                <CardArt card={current} />
                {current.isNew && <NewBadge label={t('collection.pack.newBadge')} />}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.92), rgba(0,0,0,.4) 70%, transparent)' }}>
                  <p className="text-[12px] font-bold leading-tight truncate" style={{ color: '#fff' }}>{cx.name(current.id, current.name)}</p>
                  <p className="text-[8.5px] font-bold uppercase" style={{ color: col, letterSpacing: 2 }}>{current.rarity ?? ''}</p>
                </div>
              </div>
            </motion.div>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--ravenof-text-secondary)' }}>{revealIdx + 1 < cards.length ? t('collection.pack.tapNext') : t('collection.pack.tapEnd')}</p>
          <button onClick={(e) => { e.stopPropagation(); playUiClick(); setRevealIdx(cards.length) }} className="text-[11px] underline" style={{ color: 'var(--ravenof-text-secondary)' }}>{t('collection.pack.skip')}</button>
        </div>
      )}

      {/* ── DONE – kortos ore, sukasi ratu ── */}
      {phase === 'done' && cards && (
        <CardCarousel cards={cards} onClose={() => { playUiClick(); onClose() }} />
      )}

      {/* dalelės + blyksnis (virš visko) */}
      <canvas ref={fxRef} className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 4 }} />
      {flash > 0 && <motion.div key={'fl' + flash} initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="absolute inset-0 pointer-events-none" style={{ background: '#fff3d6', zIndex: 6 }} />}
    </div>,
    document.body,
  )
}


// ══ Kortų karuselė ore: kortos sukasi ratu, tempk už bet kurios (arba fono) —
// visas ratas sukasi su inercija; bakstelėjus kortą — priartinta apžiūra ═══════
const CAR_W = 108
const CAR_H = Math.round(CAR_W * 1.4)

function CarouselCard({ c, i, n, rot, radius, onTap, newLabel }: {
  c: OpenedCard; i: number; n: number; rot: MotionValue<number>; radius: number; onTap: () => void; newLabel: string
}) {
  const ang = useTransform(rot, (r) => ((r + (i * 360) / n) * Math.PI) / 180)
  const x = useTransform(ang, (v) => Math.sin(v) * radius)
  const depth = useTransform(ang, (v) => Math.cos(v)) // 1 = priekyje, -1 = gale
  const y = useTransform(depth, (d) => (1 - d) * 14)
  const scale = useTransform(depth, (d) => 0.58 + 0.42 * (d + 1) / 2)
  const opacity = useTransform(depth, (d) => 0.42 + 0.58 * (d + 1) / 2)
  const zIndex = useTransform(depth, (d) => Math.round((d + 1) * 50))
  const rotateY = useTransform(ang, (v) => Math.sin(v) * -16)
  const cc = rarityColor(c.rarity)
  return (
    <motion.div className="absolute left-1/2 top-1/2" style={{ x, y, scale, opacity, zIndex, rotateY, width: CAR_W, marginLeft: -CAR_W / 2, marginTop: -CAR_H / 2 }}>
      <button onClick={onTap} className="relative block w-full rounded-md overflow-hidden"
        style={{ aspectRatio: '2.5 / 3.5', border: `2px solid ${cc}`, boxShadow: `0 10px 26px rgba(0,0,0,0.6), 0 0 14px ${cc}55` }}>
        <CardArt card={c} />
        {c.isNew && <NewBadge label={newLabel} small />}
      </button>
    </motion.div>
  )
}

function CardCarousel({ cards, onClose }: { cards: OpenedCard[]; onClose: () => void }) {
  const cx = useCardI18n()
  const t = useT()
  const rot = useMotionValue(0)
  const [zoom, setZoom] = useState<number | null>(null)
  const dragRef = useRef<{ x: number; t: number; v: number; moved: boolean } | null>(null)
  const suppressRef = useRef(false)
  const n = cards.length
  const newCount = cards.filter((c) => c.isNew).length
  const radius = Math.max(120, Math.min(190, n * 24))

  const onDown = (e: React.PointerEvent) => {
    rot.stop()
    dragRef.current = { x: e.clientX, t: performance.now(), v: 0, moved: false }
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId) } catch { /* */ }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const now = performance.now()
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 6 && !d.moved) { d.moved = true; playCardPick(); suppressRef.current = true }
    if (!d.moved) return
    const deg = dx * 0.45
    rot.set(rot.get() + deg)
    const dt = Math.max(1, now - d.t)
    d.v = deg / dt * 1000 // deg/s
    d.x = e.clientX; d.t = now
  }
  const onUp = () => {
    const d = dragRef.current
    dragRef.current = null
    if (d?.moved) {
      // inercija: švelniai prislysta
      animate(rot, rot.get() + d.v * 0.35, { duration: 0.9, ease: [0.12, 0.6, 0.25, 1] })
    }
    setTimeout(() => { suppressRef.current = false }, 120)
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[560px] select-none">
      <div className="text-center">
        <div className="ravenof-ornament" aria-hidden><i /></div>
        <p style={{ font: '700 17px var(--ravenof-font-display)', color: 'var(--ravenof-gold-bright)', letterSpacing: 3, textTransform: 'uppercase', margin: '6px 0 0' }}>{t('collection.pack.yourCards')}</p>
        {newCount > 0 && <p style={{ font: '700 11px var(--ravenof-font-display)', color: 'var(--ravenof-gold)', letterSpacing: 1.5, margin: '4px 0 0' }}>{t('collection.pack.newCount', { count: newCount })}</p>}
      </div>

      {/* karuselė ore */}
      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        className="relative w-full cursor-grab active:cursor-grabbing"
        style={{ height: 'min(52vh, 400px)', touchAction: 'none', perspective: 1000 }}>
        {/* švelnus švytėjimas už rato */}
        <div aria-hidden className="absolute left-1/2 top-1/2 pointer-events-none" style={{ width: radius * 2.4, height: radius * 1.6, transform: 'translate(-50%, -50%)', background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(240,180,41,0.10), transparent 70%)', filter: 'blur(6px)' }} />
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {cards.map((c, i) => (
            <CarouselCard key={c.id + '-' + i} c={c} i={i} n={n} rot={rot} radius={radius} newLabel={t('collection.pack.newBadge')}
              onTap={() => { if (suppressRef.current) return; playCardFlip(); setZoom(i) }} />
          ))}
        </div>
        <p className="absolute bottom-0 left-0 right-0 text-center text-[10px] pointer-events-none" style={{ color: 'rgba(240,180,41,0.55)' }}>
          {t('collection.pack.carouselHint')}
        </p>
      </div>

      <button onClick={onClose} className="ravenof-press px-7 py-3" style={{ font: '800 13px var(--ravenof-font-display)', letterSpacing: 2, textTransform: 'uppercase', background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', border: 0, cursor: 'pointer', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)', boxShadow: 'var(--ravenof-shadow-gold-btn)' }}>{t('collection.pack.toCollection')}</button>

      {/* priartinta korta */}
      {zoom != null && cards[zoom] && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-6" style={{ background: 'rgba(4,3,8,0.88)' }} onClick={() => setZoom(null)}>
          <motion.div initial={{ scale: 0.55, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative rounded-lg overflow-hidden" style={{ width: 'min(300px, 74vw, 60vh)', aspectRatio: '2.5 / 3.5', border: `3px solid ${rarityColor(cards[zoom].rarity)}`, boxShadow: `0 0 34px ${rarityColor(cards[zoom].rarity)}aa` }}>
            <CardArt card={cards[zoom]} />
            {cards[zoom].isNew && <NewBadge label={t('collection.pack.newBadge')} />}
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
              <p className="text-[13px] leading-tight" style={{ color: '#fff' }}>{cx.name(cards[zoom].id, cards[zoom].name)}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: rarityColor(cards[zoom].rarity) }}>{cards[zoom].rarity ?? ''}</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
