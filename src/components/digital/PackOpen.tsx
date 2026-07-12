'use client'

// ── Pakuotės atplėšimas — tempk į šoną / spustelėk, tada kortos verčiamos po vieną ─
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'
import { openPack, type OpenedCard } from '@/lib/economy'
import { reportQuestEvent } from '@/lib/gamification/quests'
import { rarityColor, rarityLevel } from '@/lib/digital/rarity'
import { playUiClick, playSuccess, playCardFlip, playDiscovery, playCardPick } from '@/lib/ui-sound'
import { useT, useCardI18n } from '@/lib/i18n/react'

const PACK_W = 220
const PACK_H = 300
const STRIP_H = 56
const LIFT_PAD = 48
const THRESH = 0.42
// „kandžiotas" plėšimo kraštas
const JAG_OUT = 'polygon(0 0, 100% 0, 100% 70%, 94% 100%, 88% 72%, 81% 100%, 74% 70%, 67% 96%, 60% 68%, 53% 100%, 46% 72%, 39% 98%, 32% 70%, 25% 100%, 18% 72%, 11% 96%, 5% 70%, 0 88%)'
const JAG_IN  = 'polygon(0 0, 100% 0, 100% 78%, 95% 100%, 89% 76%, 82% 100%, 75% 74%, 68% 100%, 61% 72%, 54% 100%, 47% 76%, 40% 100%, 33% 74%, 26% 100%, 19% 76%, 12% 100%, 6% 74%, 0 94%)'

// ── Retumo efektų pakopos: 1 žalios dalelės · 2 mėlyni žiedai · 3 violetiniai
// dūmai · 4 raudoni dūmai + žaibai ────────────────────────────────────────────
function RarityFx({ level, col, idx }: { level: number; col: string; idx: number }) {
  const fx = useMemo(() => {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    const dots = Array.from({ length: 14 }, () => ({ x: rnd(-110, 110), y0: rnd(30, 130), y1: rnd(-140, -60), s: rnd(3, 6), dur: rnd(2, 3.4), delay: rnd(0, 2) }))
    const smoke = Array.from({ length: level >= 4 ? 9 : 6 }, () => ({ x: rnd(-95, 95), drift: rnd(-45, 45), s: rnd(60, level >= 4 ? 150 : 110), dur: rnd(2.2, 3.6), delay: rnd(0, 2.4), o: rnd(0.35, level >= 4 ? 0.6 : 0.45) }))
    const bolts = Array.from({ length: 4 }, (_, bi) => {
      const side = bi % 2 === 0 ? -1 : 1
      const sx = side * rnd(95, 130); let x = sx; let y = rnd(-170, -120)
      const pts: string[] = [`${x},${y}`]
      for (let k = 0; k < 6; k++) { x += rnd(-34, 34) + side * 6; y += rnd(38, 62); pts.push(`${x},${y}`) }
      return { pts: pts.join(' '), delay: rnd(0, 1.4), rd: rnd(0.5, 1.5) }
    })
    return { dots, smoke, bolts }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, level])

  if (level <= 0) return null
  return (
    <div className="absolute pointer-events-none" style={{ inset: -70, zIndex: 0, overflow: 'visible' }}>
      {/* 1 — dalelės, skraidančios aplink */}
      {level === 1 && fx.dots.map((d, i) => (
        <motion.span key={i} className="absolute left-1/2 top-1/2"
          initial={{ x: d.x, y: d.y0, opacity: 0, scale: 0.6 }}
          animate={{ y: [d.y0, d.y1], x: [d.x, d.x + (i % 2 ? 18 : -18)], opacity: [0, 0.9, 0], scale: [0.6, 1, 0.5] }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: 'easeOut' }}
          style={{ width: d.s, height: d.s, borderRadius: '50%', background: col, boxShadow: `0 0 8px ${col}` }} />
      ))}
      {/* 2 — nuvilnijantys žiedai */}
      {level === 2 && [0, 1, 2].map((i) => (
        <motion.span key={i} className="absolute left-1/2 top-1/2"
          initial={{ opacity: 0, scale: 0.35 }}
          animate={{ opacity: [0, 0.75, 0], scale: [0.35, 1.55] }}
          transition={{ duration: 1.7, delay: i * 0.55, repeat: Infinity, ease: 'easeOut' }}
          style={{ width: 260, height: 340, marginLeft: -130, marginTop: -170, borderRadius: 18, border: `2px solid ${col}`, boxShadow: `0 0 18px ${col}88, inset 0 0 18px ${col}55` }} />
      ))}
      {/* 3/4 — dūmai */}
      {level >= 3 && fx.smoke.map((m, i) => (
        <motion.span key={'s' + i} className="absolute left-1/2"
          initial={{ x: m.x - m.s / 2, y: 150, opacity: 0, scale: 0.7 }}
          animate={{ y: [150, -160], x: [m.x - m.s / 2, m.x - m.s / 2 + m.drift], opacity: [0, m.o, 0], scale: [0.7, 1.7] }}
          transition={{ duration: m.dur, delay: m.delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{ bottom: 0, width: m.s, height: m.s, borderRadius: '50%', filter: 'blur(16px)', background: `radial-gradient(circle, ${col}, transparent 68%)` }} />
      ))}
      {/* 4 — žaibai */}
      {level >= 4 && (
        <svg className="absolute left-1/2 top-1/2" width="380" height="480" viewBox="-190 -240 380 480" style={{ marginLeft: -190, marginTop: -240, overflow: 'visible' }}>
          {fx.bolts.map((b, i) => (
            <motion.polyline key={i} points={b.pts} fill="none" stroke="#ffe9a8" strokeWidth={2.4} strokeLinejoin="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.15, 0.9, 0] }}
              transition={{ duration: 0.34, delay: b.delay, repeat: Infinity, repeatDelay: b.rd, ease: 'linear' }}
              style={{ filter: `drop-shadow(0 0 6px ${col}) drop-shadow(0 0 14px ${col})` }} />
          ))}
        </svg>
      )}
    </div>
  )
}

// Folijos gabalo menas — pakuotės viršus (tas pats vaizdas, sulygiuotas)
function FoilArt({ packImage, bad }: { packImage?: string | null; bad: boolean }) {
  return (
    <span className="absolute inset-0 block overflow-hidden" style={{ borderTop: '2px solid rgba(240,180,41,0.5)', background: 'linear-gradient(160deg, #2a1d44, #120c1e)' }}>
      {packImage && !bad && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={packImage} alt="" draggable={false} className="absolute left-0 top-0 object-cover" style={{ width: PACK_W, height: PACK_H }} />
      )}
      <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent 60%)' }} />
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

export function PackOpen({ packId, packName, packImage, onClose, onOpened }: {
  packId: string; packName: string; packImage?: string | null; onClose: () => void; onOpened?: () => void
}) {
  const t = useT()
  const cx = useCardI18n()
  const [packImgBad, setPackImgBad] = useState(false)
  const [drag, setDrag] = useState<{ t: number; fx: number; dir: 1 | -1 }>({ t: 0, fx: 0, dir: 1 })
  const [fired, setFired] = useState(false)
  const [opening, setOpening] = useState(false)
  const [cards, setCards] = useState<OpenedCard[] | null>(null)
  const [revealIdx, setRevealIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const packRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startXRef = useRef(0)
  const firedRef = useRef(false)

  const doOpen = async () => {
    if (firedRef.current) return
    firedRef.current = true
    dragging.current = false
    setFired(true)
    setDrag((d) => ({ t: 1, fx: d.dir > 0 ? PACK_W : 0, dir: d.dir }))
    setOpening(true); playSuccess()
    const r = await openPack(packId)
    setOpening(false)
    if ('error' in r) {
      const e = r.error || ''
      setError(/no pack to open/i.test(e) ? t('collection.pack.noPack') : t('collection.pack.errorPrefix', { msg: e }))
      firedRef.current = false
      setFired(false)
      setDrag({ t: 0, fx: 0, dir: 1 })
      return
    }
    setCards([...r]); setRevealIdx(0)  // jau surūšiuota: dažnos pirma, rečiausios paskutinės
    reportQuestEvent('open_pack')
    onOpened?.()
  }

  const onDown = (e: React.PointerEvent) => {
    if (opening || firedRef.current) return
    dragging.current = true; startXRef.current = e.clientX
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId) } catch { /* */ }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current || firedRef.current) return
    const rect = packRef.current?.getBoundingClientRect()
    const dx = e.clientX - startXRef.current
    const dir: 1 | -1 = dx >= 0 ? 1 : -1
    const t = Math.min(1, Math.abs(dx) / (PACK_W * 0.7))
    const fx = rect ? Math.min(PACK_W, Math.max(0, e.clientX - rect.left)) : 0
    setDrag({ t, fx, dir })
    if (t >= 1) { dragging.current = false; doOpen() }
  }
  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false
    if (drag.t >= THRESH) doOpen()
    else setDrag((d) => ({ t: 0, fx: d.dir > 0 ? 0 : PACK_W, dir: d.dir }))
  }

  // plėšimo regionas: nuo pradžios krašto iki piršto
  const regionClip = drag.dir > 0 ? `inset(0 ${PACK_W - drag.fx}px 0 0)` : `inset(0 0 0 ${drag.fx}px)`
  const regionClipTall = regionClip

  const revealing = !!cards && revealIdx < cards.length
  const done = !!cards && revealIdx >= cards.length
  const current = cards && revealing ? cards[revealIdx] : null

  // Garsas + lygis dabartinei kortai
  useEffect(() => {
    if (!current) return
    playCardFlip()
    const L = rarityLevel(current.rarity)
    if (L === 2) playDiscovery()
    else if (L === 3) playSuccess()
    else if (L >= 4) { playSuccess(); const t = setTimeout(() => playDiscovery(), 130); return () => clearTimeout(t) }
  }, [current])

  const L = rarityLevel(current?.rarity)
  const col = rarityColor(current?.rarity)
  const sparks = useMemo(() => {
    const n = [0, 5, 12, 20, 34][L] ?? 0
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5
      const d = 70 + Math.random() * (40 + L * 40)
      return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 3 + Math.random() * (3 + L), delay: Math.random() * 0.12 }
    })
  }, [revealIdx, L]) // eslint-disable-line react-hooks/exhaustive-deps

  const advance = () => { playUiClick(); setRevealIdx((i) => i + 1) }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.93)' }}>
      <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="absolute top-4 right-4 text-base px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>✕</button>

      {/* SEALED — folija plyšta po pirštu */}
      {!cards && (
        <div className="flex flex-col items-center gap-5 select-none">
          <p className="text-sm font-bold text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
            {opening ? t('collection.pack.opening') : t('collection.pack.swipeToOpen')}
          </p>
          <div ref={packRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            className="relative cursor-grab active:cursor-grabbing" style={{ width: PACK_W, height: PACK_H, touchAction: 'none' }}>
            {/* švytėjimas iš vidaus */}
            <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 130, filter: 'blur(22px)', opacity: 0.12 + drag.t * 0.88, background: 'radial-gradient(70% 100% at 50% 0%, rgba(255,205,90,0.95), rgba(240,120,30,0.5) 50%, transparent 78%)', zIndex: 4 }} />

            {/* pakuotė */}
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px)', background: 'linear-gradient(160deg, #2a1d44, #120c1e 60%, #0a0810)', border: '2px solid rgba(240,180,41,0.45)', boxShadow: 'inset 0 0 30px rgba(240,180,41,0.12)' }}>
              {packImage && !packImgBad ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={packImage} alt={packName} onError={() => setPackImgBad(true)} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                    <span className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.14em' }}>{packName}</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 10px rgba(240,180,41,0.5))' }}>🎴</span>
                  <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.18em' }}>RAVENOF</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{packName}</span>
                </div>
              )}
              {/* plėšimo linijos užuomina */}
              <div className="absolute left-2 right-2 pointer-events-none" style={{ top: STRIP_H, borderTop: '1.5px dashed rgba(240,180,41,0.4)', opacity: Math.max(0, 1 - drag.t * 2.2) }} />
            </div>

            {/* VIDUS — atsiveria po nuplėšta folija (kandžiotas kraštas) */}
            <div className="absolute left-0 right-0 pointer-events-none overflow-hidden" style={{ top: 0, height: STRIP_H, clipPath: regionClip, zIndex: 2 }}>
              <div className="absolute inset-0" style={{ clipPath: JAG_IN, background: 'linear-gradient(180deg, #060409, #140e20 55%, #241a38)', boxShadow: 'inset 0 -8px 12px rgba(0,0,0,0.85)' }} />
              <div className="absolute inset-0" style={{ clipPath: JAG_IN, opacity: 0.25 + drag.t * 0.75, background: 'linear-gradient(180deg, rgba(255,195,85,0.35), transparent 75%)' }} />
            </div>

            {/* NUPLĖŠAMA FOLIJA — pati pakuotės viršutinė juosta, kylanti ties pirštu */}
            {!fired ? (
              <div className="absolute left-0 right-0 pointer-events-none" style={{ top: -LIFT_PAD, height: STRIP_H + LIFT_PAD, clipPath: regionClipTall, zIndex: 3 }}>
                <div className="absolute left-0 right-0 overflow-visible" style={{ top: LIFT_PAD, height: STRIP_H, clipPath: JAG_OUT,
                  transform: `translateY(${-3 - drag.t * 16}px) translateX(${drag.dir * -3 * drag.t}px) rotate(${drag.dir * -7 * drag.t}deg)`,
                  transformOrigin: drag.dir > 0 ? '100% 100%' : '0% 100%',
                  transition: dragging.current ? 'none' : 'transform 0.25s ease',
                  filter: `drop-shadow(0 ${3 + drag.t * 7}px ${4 + drag.t * 6}px rgba(0,0,0,0.6))` }}>
                  <FoilArt packImage={packImage} bad={packImgBad} />
                </div>
              </div>
            ) : (
              <motion.div initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: drag.dir * 300, y: -140, rotate: drag.dir * 32, opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="absolute left-0 right-0 pointer-events-none" style={{ top: 0, height: STRIP_H, clipPath: JAG_OUT, zIndex: 3 }}>
                <FoilArt packImage={packImage} bad={packImgBad} />
              </motion.div>
            )}
          </div>
          {!opening && <button onClick={doOpen} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-95" style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>{t('collection.pack.openCta')}</button>}
          {error && <p className="text-xs text-center max-w-[260px]" style={{ color: '#fca5a5' }}>{error}</p>}
        </div>
      )}

      {/* REVEAL one-by-one */}
      {revealing && current && (
        <div className="flex flex-col items-center gap-4" onClick={advance} style={{ cursor: 'pointer' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>{revealIdx + 1} / {cards.length}</p>
          <div className="relative" style={{ width: 210, height: 294, perspective: 900 }}>
            {/* fono švytėjimas pagal retumą */}
            {L >= 1 && <motion.div key={'glow' + revealIdx} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 0.9, L >= 2 ? 0.65 : 0.45], scale: [0.6, L >= 3 ? 1.9 : 1.4, L >= 3 ? 1.6 : 1.2] }} transition={{ duration: 0.9 }} className="absolute -inset-10" style={{ borderRadius: '50%', filter: 'blur(30px)', background: `radial-gradient(circle, ${col}cc, transparent 70%)` }} />}
            <RarityFx level={L} col={col} idx={revealIdx} />
            {/* sparkles */}
            {sparks.map((p, i) => (
              <motion.span key={'sp' + revealIdx + '-' + i} initial={{ x: 0, y: 0, opacity: 0, scale: 0 }} animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0, 1, 0.4] }} transition={{ duration: 0.7 + L * 0.15, delay: p.delay }}
                className="absolute top-1/2 left-1/2" style={{ width: p.s, height: p.s, borderRadius: '50%', background: col, boxShadow: `0 0 ${4 + L * 2}px ${col}`, marginLeft: -p.s / 2, marginTop: -p.s / 2 }} />
            ))}
            {/* korta (flip; legendarai dreba) */}
            <motion.div key={'card' + revealIdx} initial={{ rotateY: 180, opacity: 0, scale: 0.85 }}
              animate={L >= 4
                ? { rotateY: 0, opacity: 1, scale: 1, rotate: [0, -0.8, 0.9, -0.5, 0], x: [0, 1.5, -1.5, 1, 0] }
                : { rotateY: 0, opacity: 1, scale: 1 }}
              transition={L >= 4
                ? { rotateY: { type: 'spring', damping: 13 }, rotate: { duration: 0.5, repeat: Infinity, delay: 0.6 }, x: { duration: 0.5, repeat: Infinity, delay: 0.6 } }
                : { type: 'spring', damping: 13 }}
              style={{ transformStyle: 'preserve-3d', zIndex: 1 }}
              className="relative w-full h-full rounded-lg overflow-hidden" >
              <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ border: `${2 + Math.min(2, L)}px solid ${col}`, boxShadow: `0 0 ${14 + L * 10}px ${col}${L >= 2 ? 'cc' : '88'}` }}>
                <CardArt card={current} />
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-center" style={{ background: 'rgba(0,0,0,0.78)' }}>
                  <p className="text-[11px] leading-tight truncate" style={{ color: '#fff' }}>{cx.name(current.id, current.name)}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: col }}>{current.rarity ?? ''}</p>
                </div>
              </div>
            </motion.div>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{revealIdx + 1 < cards.length ? t('collection.pack.tapNext') : t('collection.pack.tapEnd')}</p>
          <button onClick={(e) => { e.stopPropagation(); playUiClick(); setRevealIdx(cards.length) }} className="text-[11px] underline" style={{ color: 'var(--text-muted)' }}>Praleisti</button>
        </div>
      )}

      {/* DONE — kortos ore, sukasi ratu */}
      {done && cards && (
        <CardCarousel cards={cards} onClose={() => { playUiClick(); onClose() }} />
      )}
    </div>,
    document.body,
  )
}


// ══ Kortų karuselė ore: kortos sukasi ratu, tempk už bet kurios (arba fono) —
// visas ratas sukasi su inercija; bakstelėjus kortą — priartinta apžiūra ═══════
const CAR_W = 108
const CAR_H = Math.round(CAR_W * 1.4)

function CarouselCard({ c, i, n, rot, radius, onTap }: {
  c: OpenedCard; i: number; n: number; rot: MotionValue<number>; radius: number; onTap: () => void
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
      <p className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>TAVO KORTOS!</p>

      {/* karuselė ore */}
      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        className="relative w-full cursor-grab active:cursor-grabbing"
        style={{ height: 'min(52vh, 400px)', touchAction: 'none', perspective: 1000 }}>
        {/* švelnus švytėjimas už rato */}
        <div aria-hidden className="absolute left-1/2 top-1/2 pointer-events-none" style={{ width: radius * 2.4, height: radius * 1.6, transform: 'translate(-50%, -50%)', background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(240,180,41,0.10), transparent 70%)', filter: 'blur(6px)' }} />
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {cards.map((c, i) => (
            <CarouselCard key={c.id + '-' + i} c={c} i={i} n={n} rot={rot} radius={radius}
              onTap={() => { if (suppressRef.current) return; playCardFlip(); setZoom(i) }} />
          ))}
        </div>
        <p className="absolute bottom-0 left-0 right-0 text-center text-[10px] pointer-events-none" style={{ color: 'rgba(240,180,41,0.55)' }}>
          {t('collection.pack.carouselHint')}
        </p>
      </div>

      <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-95" style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>{t('collection.pack.toCollection')}</button>

      {/* priartinta korta */}
      {zoom != null && cards[zoom] && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-6" style={{ background: 'rgba(4,3,8,0.88)' }} onClick={() => setZoom(null)}>
          <motion.div initial={{ scale: 0.55, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative rounded-lg overflow-hidden" style={{ width: 'min(300px, 74vw, 60vh)', aspectRatio: '2.5 / 3.5', border: `3px solid ${rarityColor(cards[zoom].rarity)}`, boxShadow: `0 0 34px ${rarityColor(cards[zoom].rarity)}aa` }}>
            <CardArt card={cards[zoom]} />
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
