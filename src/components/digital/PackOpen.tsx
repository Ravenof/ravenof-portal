'use client'

// ── Pakuotės atplėšimas — tempk į ŠONĄ (arba spustelėk), iššoka kortos ────────
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { openPack, type OpenedCard } from '@/lib/economy'
import { playUiClick, playSuccess } from '@/lib/ui-sound'

const MAX_TEAR = 150  // px horizontaliai iki pilno nuplėšimo
const THRESH = 0.42   // tiek pakanka, kad atsiplėštų

export function PackOpen({ packId, packName, onClose, onOpened }: {
  packId: string
  packName: string
  onClose: () => void
  onOpened?: () => void
}) {
  const [tear, setTear] = useState(0)        // 0..1
  const [dir, setDir] = useState(1)          // +1 dešinė / -1 kairė
  const [opening, setOpening] = useState(false)
  const [cards, setCards] = useState<OpenedCard[] | null>(null)
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
      setError(/no pack to open/i.test(e) ? 'Nebeturi šios pakuotės.'
        : /rvn_open_pack|function|schema cache|404|not exist|does not exist/i.test(e) ? 'DB funkcija „rvn_open_pack" nerasta – paleisk Phase 2 migraciją Supabase SQL editoriuje.'
        : ('Klaida: ' + e))
      firedRef.current = false
      return
    }
    setCards([...r].reverse())  // rečiausios paskutinės
    onOpened?.()
  }

  const onDown = (e: React.PointerEvent) => {
    if (opening || firedRef.current) return
    startRef.current = { x: e.clientX, moved: false }
    try { (e.target as Element).setPointerCapture?.(e.pointerId) } catch { /* */ }
  }
  const onMove = (e: React.PointerEvent) => {
    const st = startRef.current; if (!st) return
    const dx = e.clientX - st.x
    if (Math.abs(dx) > 5) st.moved = true
    setDir(dx >= 0 ? 1 : -1)
    const t = Math.min(1, Math.abs(dx) / MAX_TEAR)
    setTear(t)
    if (t >= 1) { startRef.current = null; doOpen() }
  }
  const onUp = () => {
    const st = startRef.current; startRef.current = null
    if (!st) return
    // Forgiving: pusės plėšimo arba paprasto bakstelėjimo pakanka.
    if (tear >= THRESH || !st.moved) doOpen()
    else setTear(0)
  }

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.92)' }}>
      <button onClick={() => { playUiClick(); onClose() }} aria-label="Uždaryti"
        className="absolute top-4 right-4 text-base px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>✕</button>

      {!cards && (
        <div className="flex flex-col items-center gap-5 select-none">
          <p className="text-sm font-bold text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
            {opening ? 'ATPLĖŠIAMA…' : 'TEMPK Į ŠONĄ ARBA SPUSTELĖK'}
          </p>

          <div className="relative" style={{ width: 220, height: 300, touchAction: 'none' }}>
            {/* švytėjimas (didėja plėšiant) */}
            <div className="absolute inset-x-0 top-0" style={{ height: 130, filter: 'blur(22px)', opacity: 0.15 + tear * 0.85,
              background: 'radial-gradient(70% 100% at 50% 0%, rgba(255,205,90,0.95), rgba(240,120,30,0.5) 50%, transparent 78%)' }} />

            {/* pakuotės korpusas */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ clipPath: 'polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px)',
                background: 'linear-gradient(160deg, #2a1d44, #120c1e 60%, #0a0810)', border: '2px solid rgba(240,180,41,0.45)',
                boxShadow: 'inset 0 0 30px rgba(240,180,41,0.12)' }}>
              <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 10px rgba(240,180,41,0.5))' }}>🎴</span>
              <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.18em' }}>RAVENOF</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{packName}</span>
            </div>

            {/* nuplėšiama viršutinė juosta (slysta į šoną) */}
            <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              className="absolute left-0 right-0 top-0 cursor-grab active:cursor-grabbing flex items-center justify-center"
              style={{ height: 64, touchAction: 'none',
                transform: `translateX(${dir * tear * 230}px) rotate(${dir * tear * 10}deg)`,
                opacity: 1 - tear * 0.9, transition: startRef.current ? 'none' : 'transform 0.22s, opacity 0.22s',
                clipPath: 'polygon(0 0,100% 0,100% 64%,93% 100%,86% 66%,79% 100%,72% 66%,65% 100%,58% 66%,51% 100%,44% 66%,37% 100%,30% 66%,23% 100%,16% 66%,9% 100%,0 80%)',
                background: 'linear-gradient(160deg, #3a2a55, #241a38)', borderTop: '2px solid rgba(240,180,41,0.55)', borderLeft: '2px solid rgba(240,180,41,0.4)', borderRight: '2px solid rgba(240,180,41,0.4)' }}>
              <span className="text-[11px] font-bold tracking-widest pointer-events-none" style={{ color: 'rgba(240,180,41,0.95)', letterSpacing: '0.18em' }}>↤ ✄ PLĖŠK ✄ ↦</span>
            </div>
          </div>

          {!opening && (
            <button onClick={doOpen}
              className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
              🎁 Atplėšti pakuotę
            </button>
          )}
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
                    transition={{ delay: i * 0.12, type: 'spring', damping: 14 }}
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
