'use client'

// ── Pakuotės atplėšimas — tempk į šoną / spustelėk, tada kortos verčiamos po vieną ─
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { openPack, type OpenedCard } from '@/lib/economy'
import { rarityColor, rarityLevel } from '@/lib/digital/rarity'
import { playUiClick, playSuccess, playCardFlip, playDiscovery } from '@/lib/ui-sound'

const MAX_TEAR = 150
const THRESH = 0.42

function CardArt({ card }: { card: OpenedCard }) {
  const [bad, setBad] = useState(false)
  const col = rarityColor(card.rarity)
  if (card.image_url && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={card.image_url} alt={card.name} onError={() => setBad(true)} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center" style={{ background: 'linear-gradient(160deg, #1a1325, #0a0810)' }}>
      <span className="text-2xl">🎴</span>
      <span className="text-[11px] font-bold leading-tight" style={{ color: '#fff' }}>{card.name}</span>
      <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: col }}>{card.rarity ?? ''}</span>
    </div>
  )
}

export function PackOpen({ packId, packName, onClose, onOpened }: {
  packId: string; packName: string; onClose: () => void; onOpened?: () => void
}) {
  const [tear, setTear] = useState(0)
  const [dir, setDir] = useState(1)
  const [opening, setOpening] = useState(false)
  const [cards, setCards] = useState<OpenedCard[] | null>(null)
  const [revealIdx, setRevealIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const startRef = useRef<{ x: number; moved: boolean } | null>(null)
  const firedRef = useRef(false)

  const doOpen = async () => {
    if (firedRef.current) return
    firedRef.current = true
    setTear(1); setOpening(true); playSuccess()
    const r = await openPack(packId)
    setOpening(false)
    if ('error' in r) {
      const e = r.error || ''
      setError(/no pack to open/i.test(e) ? 'Nebeturi šios pakuotės.' : ('Klaida: ' + e))
      firedRef.current = false
      return
    }
    setCards([...r]); setRevealIdx(0)  // jau surūšiuota: dažnos pirma, rečiausios paskutinės
    onOpened?.()
  }

  const onDown = (e: React.PointerEvent) => { if (opening || firedRef.current) return; startRef.current = { x: e.clientX, moved: false }; try { (e.target as Element).setPointerCapture?.(e.pointerId) } catch { /* */ } }
  const onMove = (e: React.PointerEvent) => {
    const st = startRef.current; if (!st) return
    const dx = e.clientX - st.x; if (Math.abs(dx) > 5) st.moved = true
    setDir(dx >= 0 ? 1 : -1); const t = Math.min(1, Math.abs(dx) / MAX_TEAR); setTear(t)
    if (t >= 1) { startRef.current = null; doOpen() }
  }
  const onUp = () => { const st = startRef.current; startRef.current = null; if (!st) return; if (tear >= THRESH || !st.moved) doOpen(); else setTear(0) }

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

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.93)' }}>
      <button onClick={() => { playUiClick(); onClose() }} aria-label="Uždaryti" className="absolute top-4 right-4 text-base px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>✕</button>

      {/* SEALED */}
      {!cards && (
        <div className="flex flex-col items-center gap-5 select-none">
          <p className="text-sm font-bold text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
            {opening ? 'ATPLĖŠIAMA…' : 'TEMPK Į ŠONĄ ARBA SPUSTELĖK'}
          </p>
          <div className="relative" style={{ width: 220, height: 300, touchAction: 'none' }}>
            <div className="absolute inset-x-0 top-0" style={{ height: 130, filter: 'blur(22px)', opacity: 0.15 + tear * 0.85, background: 'radial-gradient(70% 100% at 50% 0%, rgba(255,205,90,0.95), rgba(240,120,30,0.5) 50%, transparent 78%)' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ clipPath: 'polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px)', background: 'linear-gradient(160deg, #2a1d44, #120c1e 60%, #0a0810)', border: '2px solid rgba(240,180,41,0.45)', boxShadow: 'inset 0 0 30px rgba(240,180,41,0.12)' }}>
              <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 10px rgba(240,180,41,0.5))' }}>🎴</span>
              <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.18em' }}>RAVENOF</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{packName}</span>
            </div>
            <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} className="absolute left-0 right-0 top-0 cursor-grab active:cursor-grabbing flex items-center justify-center"
              style={{ height: 64, touchAction: 'none', transform: `translateX(${dir * tear * 230}px) rotate(${dir * tear * 10}deg)`, opacity: 1 - tear * 0.9, transition: startRef.current ? 'none' : 'transform 0.22s, opacity 0.22s', clipPath: 'polygon(0 0,100% 0,100% 64%,93% 100%,86% 66%,79% 100%,72% 66%,65% 100%,58% 66%,51% 100%,44% 66%,37% 100%,30% 66%,23% 100%,16% 66%,9% 100%,0 80%)', background: 'linear-gradient(160deg, #3a2a55, #241a38)', borderTop: '2px solid rgba(240,180,41,0.55)', borderLeft: '2px solid rgba(240,180,41,0.4)', borderRight: '2px solid rgba(240,180,41,0.4)' }}>
              <span className="text-[11px] font-bold tracking-widest pointer-events-none" style={{ color: 'rgba(240,180,41,0.95)', letterSpacing: '0.18em' }}>↤ ✄ PLĖŠK ✄ ↦</span>
            </div>
          </div>
          {!opening && <button onClick={doOpen} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-95" style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>🎁 Atplėšti pakuotę</button>}
          {error && <p className="text-xs text-center max-w-[260px]" style={{ color: '#fca5a5' }}>{error}</p>}
        </div>
      )}

      {/* REVEAL one-by-one */}
      {revealing && current && (
        <div className="flex flex-col items-center gap-4" onClick={advance} style={{ cursor: 'pointer' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>{revealIdx + 1} / {cards.length}</p>
          <div className="relative" style={{ width: 210, height: 294, perspective: 900 }}>
            {/* fono švytėjimas pagal retumą */}
            {L >= 1 && <motion.div key={'glow' + revealIdx} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 0.9, 0.5], scale: [0.6, 1.4, 1.2] }} transition={{ duration: 0.9 }} className="absolute -inset-10" style={{ borderRadius: '50%', filter: 'blur(30px)', background: `radial-gradient(circle, ${col}cc, transparent 70%)` }} />}
            {/* sparkles */}
            {sparks.map((p, i) => (
              <motion.span key={'sp' + revealIdx + '-' + i} initial={{ x: 0, y: 0, opacity: 0, scale: 0 }} animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0, 1, 0.4] }} transition={{ duration: 0.7 + L * 0.15, delay: p.delay }}
                className="absolute top-1/2 left-1/2" style={{ width: p.s, height: p.s, borderRadius: '50%', background: col, boxShadow: `0 0 ${4 + L * 2}px ${col}`, marginLeft: -p.s / 2, marginTop: -p.s / 2 }} />
            ))}
            {/* korta (flip) */}
            <motion.div key={'card' + revealIdx} initial={{ rotateY: 180, opacity: 0, scale: 0.85 }} animate={{ rotateY: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 13 }} style={{ transformStyle: 'preserve-3d' }}
              className="relative w-full h-full rounded-lg overflow-hidden" >
              <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ border: `${2 + Math.min(2, L)}px solid ${col}`, boxShadow: `0 0 ${14 + L * 10}px ${col}${L >= 2 ? 'cc' : '88'}` }}>
                <CardArt card={current} />
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-center" style={{ background: 'rgba(0,0,0,0.78)' }}>
                  <p className="text-[11px] leading-tight truncate" style={{ color: '#fff' }}>{current.name}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: col }}>{current.rarity ?? ''}</p>
                </div>
              </div>
            </motion.div>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{revealIdx + 1 < cards.length ? 'Spustelėk – kita korta' : 'Spustelėk – pabaiga'}</p>
          <button onClick={(e) => { e.stopPropagation(); playUiClick(); setRevealIdx(cards.length) }} className="text-[11px] underline" style={{ color: 'var(--text-muted)' }}>Praleisti</button>
        </div>
      )}

      {/* DONE — visos kortos */}
      {done && cards && (
        <div className="flex flex-col items-center gap-4 w-full max-w-[760px]">
          <p className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>TAVO KORTOS!</p>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {cards.map((c, i) => {
              const cc = rarityColor(c.rarity)
              return (
                <div key={c.id + '-' + i} className="relative rounded-md overflow-hidden" style={{ aspectRatio: '2.5 / 3.5', border: `2px solid ${cc}`, boxShadow: `0 0 12px ${cc}77` }}>
                  <CardArt card={c} />
                  <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
                    <p className="text-[8px] leading-tight truncate" style={{ color: '#fff' }}>{c.name}</p>
                    <p className="text-[7px] font-bold uppercase" style={{ color: cc }}>{c.rarity ?? ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => { playUiClick(); onClose() }} className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-95" style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>Į kolekciją</button>
        </div>
      )}
    </div>
  )
}
