'use client'

// ── Ravenof Digital — interaktyvi kaladžių karuselė kovų sub-meniu ────────────
// Horizontali snap karuselė: kaladės kaip fizinės plokštelės su frakcijos ikona,
// spyruokliniu paspaudimu ir švytinčiu pasirinkimu. Prisimena paskutinę naudotą
// kaladę (per režimą) ir leidžia PORUOTI avatarą su kalade — pasirinkus kaladę
// jos avataras užsidedamas automatiškai.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Check, UserRound } from 'lucide-react'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { getCosmetics, equipCosmetic, type Cosmetic } from '@/lib/cosmetics'
import { getLastDeck, setLastDeck, getDeckAvatar, setDeckAvatar, type BattleMode } from '@/lib/deck-prefs'

export type SelectDeck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null }

function FactionIcon({ d, size = 26 }: { d: SelectDeck; size?: number }) {
  const [bad, setBad] = useState(false)
  if (d.factionIcon && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={d.factionIcon} alt="" onError={() => setBad(true)} draggable={false} style={{ width: size, height: size, objectFit: 'contain' }} />
  }
  return <span className="rounded-full inline-block" style={{ width: size * 0.55, height: size * 0.55, background: d.factionColor ?? 'var(--gold)' }} />
}

export function DeckSelect({ mode, decks, value, onChange, accent = '240,180,41', label = '⚔ Tavo kaladė' }: {
  mode: BattleMode; decks: SelectDeck[]; value: string; onChange: (id: string) => void
  accent?: string; label?: string
}) {
  const [avatars, setAvatars] = useState<Cosmetic[]>([])
  const [pairFor, setPairFor] = useState<SelectDeck | null>(null)
  const [pairVer, setPairVer] = useState(0) // perpiešti chip'us po poravimo keitimo
  const restored = useRef(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Avatarai poravimui — tik turimi
  useEffect(() => {
    getCosmetics().then((cos) => {
      if (!cos) return
      const ownedSet = new Set(cos.owned)
      setAvatars(cos.items.filter((c) => c.kind === 'avatar' && (c.ownedByDefault || ownedSet.has(c.id))))
    })
  }, [])

  // Pasirinkimas + atmintis + suporuoto avataro uždėjimas
  const pick = (id: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) playUiClick()
    onChange(id)
    setLastDeck(mode, id)
    const av = getDeckAvatar(id)
    if (av) void equipCosmetic('avatar', av)
  }

  // Paskutinės naudotos kaladės atstatymas (kai kaladės užsikrauna)
  useEffect(() => {
    if (restored.current || decks.length === 0) return
    restored.current = true
    // Prioritetas: jau nustatyta reikšmė (pvz., ranked locked_deck_id) > paskutinė naudota > pirma
    const last = getLastDeck(mode)
    const target = (value && decks.some((d) => d.id === value)) ? value
      : (last && decks.some((d) => d.id === last)) ? last : decks[0].id
    if (target !== value) pick(target, { silent: true })
    else { setLastDeck(mode, target); const av = getDeckAvatar(target); if (av) void equipCosmetic('avatar', av) }
    // pasirinktą kaladę atsukam į matomą zoną
    window.setTimeout(() => {
      const el = scrollRef.current?.querySelector('[data-sel="1"]') as HTMLElement | null
      el?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, inline: 'center', block: 'nearest' })
    }, 30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decks])

  const pairedOf = (deckId: string): Cosmetic | null => {
    const id = getDeckAvatar(deckId)
    return id ? (avatars.find((a) => a.id === id) ?? null) : null
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[10px] font-bold uppercase" style={{ color: `rgb(${accent})`, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.14em' }}>{label}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>👤 = avataro poravimas</span>
      </div>
      <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1"
        style={{ scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {decks.map((d, i) => {
          const sel = d.id === value
          const paired = pairedOf(d.id)
          void pairVer
          return (
            <motion.div key={d.id} data-sel={sel ? '1' : undefined}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, scale: sel ? 1 : 0.96 }}
              transition={{ delay: Math.min(i * 0.045, 0.35), type: 'spring', stiffness: 380, damping: 26 }}
              whileTap={{ scale: 0.93 }}
              className="relative shrink-0" style={{ scrollSnapAlign: 'center', width: 128 }}>
              <button onClick={() => pick(d.id)} className="w-full text-left rounded-2xl overflow-hidden relative"
                style={{
                  height: 86,
                  background: `radial-gradient(120% 150% at 20% 0%, ${d.factionColor ? d.factionColor + '55' : `rgba(${accent},0.30)`}, transparent 60%), linear-gradient(155deg, #1b1426, #0b0812)`,
                  border: sel ? `1.5px solid rgba(${accent},0.95)` : '1px solid rgba(255,255,255,0.10)',
                  boxShadow: sel ? `0 0 18px rgba(${accent},0.35), 0 6px 14px rgba(0,0,0,0.5)` : '0 4px 10px rgba(0,0,0,0.45)',
                  transition: 'border-color .2s, box-shadow .25s',
                }}>
                <span className="absolute -right-1.5 -bottom-2 opacity-25" style={{ filter: 'saturate(0.8)' }}><FactionIcon d={d} size={54} /></span>
                <span className="block px-2.5 pt-2">
                  <span className="block text-[12.5px] font-bold leading-tight" style={{ color: sel ? '#fff' : '#e8dcc0', fontFamily: 'var(--rvn-font-display)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.name}</span>
                  {d.faction && <span className="block text-[9.5px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{d.faction}</span>}
                </span>
                {sel && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full"
                    style={{ width: 18, height: 18, background: `rgba(${accent},0.95)` }}>
                    <Check className="w-3 h-3" style={{ color: '#120d04' }} strokeWidth={3.5} />
                  </motion.span>
                )}
              </button>
              {/* avataro poravimo chip'as */}
              <button onClick={(e) => { e.stopPropagation(); playUiClick(); setPairFor(d) }}
                aria-label="Poruoti avatarą"
                className="absolute flex items-center justify-center rounded-full overflow-hidden"
                style={{ left: 6, bottom: -6, width: 30, height: 30, background: '#0c0913',
                  border: paired ? `1.5px solid rgba(${accent},0.9)` : '1.5px dashed rgba(255,255,255,0.30)', zIndex: 2 }}>
                {paired?.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={paired.imageUrl} alt="" draggable={false} className="w-full h-full object-cover" />
                  : paired?.emoji ? <span style={{ fontSize: 15 }}>{paired.emoji}</span>
                  : <UserRound className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.45)' }} />}
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* avataro poravimo lakštas */}
      {pairFor && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center" style={{ background: 'rgba(4,3,8,0.85)' }} onClick={() => setPairFor(null)}>
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="w-full sm:w-[min(440px,94vw)] max-h-[72vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ border: `1px solid rgba(${accent},0.45)`, background: 'linear-gradient(160deg,#17111f,#0a0810)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 shrink-0 text-center" style={{ borderBottom: `1px solid rgba(${accent},0.18)` }}>
              <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: `rgb(${accent})`, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.14em' }}>Avataras kaladei</div>
              <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{pairFor.name} — pasirinkus šią kaladę, avataras užsidės automatiškai</div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-3 gap-2.5">
              <button onClick={() => { playUiClick(); setDeckAvatar(pairFor.id, null); setPairVer((v) => v + 1); setPairFor(null) }}
                className="flex flex-col items-center gap-1.5 rounded-xl py-3 active:scale-95 transition-transform"
                style={{ background: 'rgba(255,255,255,0.04)', border: getDeckAvatar(pairFor.id) === null ? `1.5px solid rgba(${accent},0.8)` : '1px dashed rgba(255,255,255,0.22)' }}>
                <span className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.06)' }}>
                  <UserRound className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />
                </span>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Be poravimo</span>
              </button>
              {avatars.map((a) => {
                const cur = getDeckAvatar(pairFor.id) === a.id
                return (
                  <button key={a.id}
                    onClick={() => {
                      playSuccess(); setDeckAvatar(pairFor.id, a.id); setPairVer((v) => v + 1)
                      if (pairFor.id === value) void equipCosmetic('avatar', a.id)
                      setPairFor(null)
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl py-3 active:scale-95 transition-transform"
                    style={{ background: cur ? `rgba(${accent},0.12)` : 'rgba(255,255,255,0.04)', border: cur ? `1.5px solid rgba(${accent},0.9)` : '1px solid rgba(255,255,255,0.10)' }}>
                    <span className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 52, height: 52, background: '#0c0913', border: '1px solid rgba(255,255,255,0.14)' }}>
                      {a.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={a.imageUrl} alt="" draggable={false} className="w-full h-full object-cover" />
                        : <span style={{ fontSize: 24 }}>{a.emoji ?? '👤'}</span>}
                    </span>
                    <span className="text-[10px] font-semibold text-center leading-tight px-1" style={{ color: '#e8dcc0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.name}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => { playUiClick(); setPairFor(null) }} className="shrink-0 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)', borderTop: `1px solid rgba(${accent},0.15)` }}>Uždaryti</button>
          </motion.div>
        </div>, document.body)}
    </div>
  )
}
