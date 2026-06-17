'use client'

// ── Pakuotės atplėšimas — tempk pirštu, nuplėšk viršų, iššoka kortos ──────────
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { openPack, type OpenedCard } from '@/lib/economy'
import { playUiClick, playSuccess } from '@/lib/ui-sound'

const ZIGZAG = 'polygon(0 0, 100% 0, 100% 70%, 92% 100%, 84% 72%, 76% 100%, 68% 72%, 60% 100%, 52% 72%, 44% 100%, 36% 72%, 28% 100%, 20% 72%, 12% 100%, 4% 72%, 0 92%)'

export function PackOpen({ packId, packName, onClose, onOpened }: {
  packId: string
  packName: string
  onClose: () => void
  onOpened?: () => void
}) {
  const [tear, setTear] = useState(0)
  const [opening, setOpening] = useState(false)
  const [cards, setCards] = useState<OpenedCard[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const startRef = useRef<number | null>(null)
  const firedRef = useRef(false)

  const doOpen = async () => {
    if (firedRef.current) return
    firedRef.current = true
    setTear(1); setOpening(true); playSuccess()
    const r = await openPack(packId)
    setOpening(false)
    if ('error' in r) { setError(r.error === 'no pack to open' ? 'Nebeturi šios pakuotės.' : 'Nepavyko atplėšti.'); return }
    // rečiausios paskutinės (dramatiškiau)
    setCards([...r].reverse())
    onOpened?.()
  }

  const onMove = (e: React.PointerEvent) => {
    if (startRef.current == null) return
    const d = Math.max(0, e.clientY - startRef.current)
    const t = Math.min(1, d / 170)
    setTear(t)
    if (t >= 1) { startRef.current = null; doOpen() }
  }
  const onUp = () => {
    if (startRef.current == null) return
    startRef.current = null
    if (tear >= 0.72) doOpen(); else setTear(0)
  }

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.92)' }}>
      <button onClick={() => { playUiClick(); onClose() }} aria-label="Uždaryti"
        className="absolute top-4 right-4 text-base px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>✕</button>

      {!cards && (
        <div className="flex flex-col items-center gap-5 select-none" style={{ touchAction: 'none' }}>
          <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.1em' }}>
            {opening ? 'ATPLĖŠIAMA…' : 'TEMPK ŽEMYN IR NUPLĖŠK VIRŠŲ'}
          </p>
          <div className="relative" style={{ width: 210, height: 300, perspective: 800 }}>
            {/* švytėjimas po viršum (didėja plėšiant) */}
            <div className="absolute inset-x-0 top-0" style={{ height: 120, filter: 'blur(20px)', opacity: 0.2 + tear * 0.8,
              background: 'radial-gradient(60% 100% at 50% 0%, rgba(255,200,80,0.9), rgba(240,120,30,0.5) 50%, transparent 75%)' }} />
            {/* pakuotės korpusas */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ clipPath: 'polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px)',
                background: 'linear-gradient(160deg, #2a1d44, #120c1e 60%, #0a0810)', border: '2px solid rgba(240,180,41,0.45)',
                boxShadow: 'inset 0 0 30px rgba(240,180,41,0.12)' }}>
              <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 10px rgba(240,180,41,0.5))' }}>🎴</span>
              <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.18em' }}>RAVENOF</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{packName}</span>
            </div>
            {/* nuplėšiamas viršus */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 92,
              transform: `translateY(${-tear * 120}px) rotateX(${tear * 55}deg)`, transformOrigin: 'top center',
              opacity: 1 - tear * 0.25, transition: startRef.current == null ? 'transform 0.25s, opacity 0.25s' : 'none',
              clipPath: ZIGZAG, background: 'linear-gradient(160deg, #3a2a55, #241a38)', border: '2px solid rgba(240,180,41,0.5)', borderBottom: 'none' }}>
              <div className="h-full flex items-center justify-center">
                <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(240,180,41,0.85)', letterSpacing: '0.2em' }}>✄ — — — — —</span>
              </div>
            </div>
            {/* tempimo rankenėlė */}
            {!opening && tear < 1 && (
              <div onPointerDown={(e) => { startRef.current = e.clientY; (e.target as Element).setPointerCapture?.(e.pointerId) }}
                onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                className="absolute left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
                style={{ top: -14, width: 70, height: 34, borderRadius: 18, background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: 16, touchAction: 'none' }}>
                ⇩
              </div>
            )}
          </div>
          {error && <p className="text-xs" style={{ color: '#fca5a5' }}>{error}</p>}
        </div>
      )}

      {cards && (
        <div className="flex flex-col items-center gap-4 w-full max-w-[760px]">
          <p className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>TAVO KORTOS!</p>
          <div className="grid grid-cols-5 gap-2 sm:gap-3" style={{ perspective: 1000 }}>
            <AnimatePresence>
              {cards.map((c, i) => {
                const col = c.rarity_color || '#d4af37'
                return (
                  <motion.div key={c.id + '-' + i}
                    initial={{ rotateY: 180, opacity: 0, y: 20 }}
                    animate={{ rotateY: 0, opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.13, type: 'spring', damping: 14 }}
                    style={{ transformStyle: 'preserve-3d' }}>
                    <div className="relative rounded-md overflow-hidden" style={{ aspectRatio: '2.5 / 3.5', border: `2px solid ${col}`, boxShadow: `0 0 16px ${col}88` }}>
                      {c.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={c.image_url} alt={c.name} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                        : <div className="absolute inset-0 flex items-center justify-center text-xl" style={{ background: 'rgba(20,16,30,0.9)' }}>🎴</div>}
                      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
                        <p className="text-[8px] leading-tight truncate" style={{ color: '#fff' }}>{c.name}</p>
                        <p className="text-[7px] font-bold uppercase tracking-wide" style={{ color: col }}>{c.rarity ?? ''}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
          <button onClick={() => { playUiClick(); onClose() }}
            className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-95"
            style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
            Į kolekciją
          </button>
        </div>
      )}
    </div>
  )
}
