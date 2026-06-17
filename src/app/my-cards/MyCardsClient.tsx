'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import type { MyOwnedCard } from '@/types'
import { updateCardQuantity, removeCard } from './actions'

const oct = (b: number) => `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`

type Props = {
  cards: MyOwnedCard[]
  ownedCount: number
  totalCards: number
  completionPct: number
  isPublic: boolean
}

// ── Pill helpers ──────────────────────────────────────────────────────────────

function Pill({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-150 whitespace-nowrap"
      style={active ? {
        background: 'linear-gradient(135deg, rgba(124,58,237,0.28) 0%, rgba(240,180,41,0.12) 100%)',
        color: 'var(--gold)',
        border: '1px solid rgba(240,180,41,0.5)',
        fontFamily: 'var(--rvn-font-display)',
        letterSpacing: '0.03em',
      } : {
        background: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
        border: '1px solid var(--bg-border)',
        fontFamily: 'var(--rvn-font-display)',
        letterSpacing: '0.03em',
      }}
    >
      {children}
    </button>
  )
}

function PillRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p
        className="text-[10px] uppercase tracking-wider font-semibold px-0.5"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}
      >
        {label}
      </p>
      <div
        className="flex gap-1.5 overflow-x-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MyCardsClient({ cards: initialCards, ownedCount, totalCards, completionPct, isPublic }: Props) {
  const [cards, setCards]               = useState<MyOwnedCard[]>(initialCards)
  const [search, setSearch]             = useState('')
  const [faction, setFaction]           = useState('')
  const [cardType, setCardType]         = useState('')
  const [rarity, setRarity]             = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [errors, setErrors]             = useState<Record<string, string>>({})
  const [isPending, startTransition]    = useTransition()
  const [filtersOpen, setFiltersOpen]   = useState(false)

  const factions = useMemo(() => {
    const map = new Map<string, string>()
    cards.forEach((c) => { if (c.faction_id && c.faction_name) map.set(String(c.faction_id), c.faction_name) })
    return Array.from(map.entries())
  }, [cards])

  const cardTypes = useMemo(() => {
    const map = new Map<string, string>()
    cards.forEach((c) => { if (c.card_type_id && c.card_type_name) map.set(String(c.card_type_id), c.card_type_name) })
    return Array.from(map.entries())
  }, [cards])

  const rarities = useMemo(() => {
    const map = new Map<string, string>()
    cards.forEach((c) => { if (c.rarity_id && c.rarity_name) map.set(String(c.rarity_id), c.rarity_name) })
    return Array.from(map.entries())
  }, [cards])

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if (faction && String(c.faction_id) !== faction) return false
      if (cardType && String(c.card_type_id) !== cardType) return false
      if (rarity && String(c.rarity_id) !== rarity) return false
      return true
    })
  }, [cards, search, faction, cardType, rarity])

  const hasFilters = !!(search || faction || cardType || rarity)
  const currentOwned = cards.length
  const currentPct = totalCards > 0 ? Math.round((currentOwned / totalCards) * 100) : 0

  function clearError(cardId: string) {
    setErrors((prev) => { const n = { ...prev }; delete n[cardId]; return n })
  }

  function clearFilters() {
    setSearch(''); setFaction(''); setCardType(''); setRarity('')
  }

  function handleDelta(cardId: string, delta: number) {
    clearError(cardId)
    setCards((prev) =>
      prev
        .map((c) => c.card_id === cardId ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    )
    startTransition(async () => {
      const res = await updateCardQuantity(cardId, delta)
      if (res.error) {
        setCards(initialCards)
        setErrors((prev) => ({ ...prev, [cardId]: res.error! }))
      }
    })
  }

  function handleRemove(cardId: string) {
    clearError(cardId)
    setConfirmRemove(null)
    setCards((prev) => prev.filter((c) => c.card_id !== cardId))
    startTransition(async () => {
      const res = await removeCard(cardId)
      if (res.error) {
        setCards(initialCards)
        setErrors((prev) => ({ ...prev, [cardId]: res.error! }))
      }
    })
  }

  const stats = useMemo(() => {
    const agg = (keyId: (c: MyOwnedCard) => number | null, keyName: (c: MyOwnedCard) => string | null, keyColor?: (c: MyOwnedCard) => string | null) => {
      const m = new Map<string, { name: string; color: string | null; qty: number; uniq: number }>()
      for (const c of cards) {
        const id = keyId(c); if (id == null) continue
        const k = String(id)
        const e = m.get(k) ?? { name: keyName(c) ?? '?', color: keyColor ? keyColor(c) : null, qty: 0, uniq: 0 }
        e.qty += c.quantity; e.uniq += 1; m.set(k, e)
      }
      return Array.from(m.values()).sort((a, b) => b.qty - a.qty)
    }
    const totalQty = cards.reduce((sum, c) => sum + c.quantity, 0)
    return {
      totalQty,
      byRarity: agg((c) => c.rarity_id, (c) => c.rarity_name, (c) => c.rarity_color),
      byFaction: agg((c) => c.faction_id, (c) => c.faction_name, (c) => c.faction_color),
      byType: agg((c) => c.card_type_id, (c) => c.card_type_name),
    }
  }, [cards])

  const FLAMES = `
    @keyframes rvnFlameRise2 { 0%{transform:translateY(0) scaleX(1)} 50%{transform:translateY(-14px) scaleX(1.06)} 100%{transform:translateY(0) scaleX(1)} }
    @keyframes rvnFlameFlick2 { 0%,100%{opacity:.28} 40%{opacity:.6} 70%{opacity:.4} }
    .rvn-flames2{ position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden;
      background: radial-gradient(120% 50% at 50% 120%, rgba(240,90,20,0.16), rgba(120,20,10,0.05) 42%, transparent 70%); }
    .rvn-flame2{ position:absolute; bottom:-70px; width:300px; height:360px; border-radius:48% 48% 50% 50%;
      filter: blur(36px); mix-blend-mode:screen;
      background: radial-gradient(circle at 50% 72%, rgba(255,175,45,0.5), rgba(240,95,20,0.34) 34%, rgba(150,25,10,0.12) 60%, transparent 72%);
      animation: rvnFlameRise2 3.6s ease-in-out infinite, rvnFlameFlick2 1.6s ease-in-out infinite; }
  `

  const Stat = ({ title, rows }: { title: string; rows: { name: string; color: string | null; qty: number; uniq: number }[] }) => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>{title}</p>
      <div className="space-y-1">
        {rows.length === 0 ? <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</p> : rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color || 'var(--text-muted)' }} />
            <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{r.name}</span>
            <span className="text-[11px] font-bold" style={{ color: 'var(--gold)' }}>{r.qty}</span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="relative">
      <style>{FLAMES}</style>
      <div className="rvn-flames2" aria-hidden>
        <div className="rvn-flame2" style={{ left: '6%', width: 260 }} />
        <div className="rvn-flame2" style={{ left: '30%', width: 320, height: 420, animationDelay: '0.6s, 0.9s' }} />
        <div className="rvn-flame2" style={{ left: '54%', width: 300, animationDelay: '1.1s, 0.4s' }} />
        <div className="rvn-flame2" style={{ left: '80%', width: 320, animationDelay: '0.3s, 1.2s' }} />
      </div>

      <div className="relative z-10 grid gap-4 lg:grid-cols-[1fr_290px]">
        <div className="space-y-4 order-2 lg:order-1">
          <div className="relative" style={{ clipPath: oct(12), background: 'rgba(240,180,41,0.4)', padding: 2 }}>
            <div className="p-3" style={{ clipPath: oct(11), background: 'linear-gradient(160deg, #15101f, #0a0810)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
                  {currentOwned} / {totalCards}<span className="ml-2 text-xs font-normal" style={{ color: 'var(--gold)' }}>{currentPct}%</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: isPublic ? 'rgba(34,197,94,0.15)' : 'rgba(100,100,120,0.2)', color: isPublic ? '#4ade80' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
                  {isPublic ? 'Vieša' : 'Privati'}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: currentPct + '%', background: 'linear-gradient(to right, var(--rvn-violet), var(--gold))' }} />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ieškoti kortų..." className="rvn-input w-full" style={{ paddingLeft: '2rem', paddingRight: search ? '2rem' : '0.75rem' }} />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: 'var(--text-muted)' }}><X className="w-3 h-3" /></button>}
            </div>
            <button onClick={() => setFiltersOpen((o) => !o)} className="flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold transition-all"
              style={{ background: (filtersOpen || (faction || cardType || rarity)) ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(240,180,41,0.1))' : 'var(--bg-elevated)', color: (filtersOpen || (faction || cardType || rarity)) ? 'var(--gold)' : 'var(--text-muted)', border: (filtersOpen || (faction || cardType || rarity)) ? '1px solid rgba(240,180,41,0.4)' : '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {(faction || cardType || rarity) && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />}
            </button>
          </div>

          {filtersOpen && (
            <div className="rounded-xl p-3 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              {factions.length > 0 && (
                <PillRow label="Frakcija">
                  <Pill active={faction === ''} onClick={() => setFaction('')}>Visos</Pill>
                  {factions.map(([id, name]) => <Pill key={id} active={faction === id} onClick={() => setFaction(faction === id ? '' : id)}>{name}</Pill>)}
                </PillRow>
              )}
              {cardTypes.length > 0 && (
                <PillRow label="Tipas">
                  <Pill active={cardType === ''} onClick={() => setCardType('')}>Visi</Pill>
                  {cardTypes.map(([id, name]) => <Pill key={id} active={cardType === id} onClick={() => setCardType(cardType === id ? '' : id)}>{name}</Pill>)}
                </PillRow>
              )}
              {rarities.length > 0 && (
                <PillRow label="Retumas">
                  <Pill active={rarity === ''} onClick={() => setRarity('')}>Visi retumai</Pill>
                  {rarities.map(([id, name]) => <Pill key={id} active={rarity === id} onClick={() => setRarity(rarity === id ? '' : id)}>{name}</Pill>)}
                </PillRow>
              )}
              {hasFilters && (faction || cardType || rarity) && (
                <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)', fontFamily: 'var(--rvn-font-display)' }}>
                  <X className="w-3 h-3" /> Išvalyti filtrus
                </button>
              )}
            </div>
          )}

          <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
            {filtered.length} kortelė(-ių){hasFilters && <span style={{ color: 'var(--gold)' }}> (filtruota)</span>}
          </p>

          {filtered.length === 0 ? (
            <p className="text-sm text-center py-12 opacity-50" style={{ color: 'var(--text-muted)' }}>Nerasta kortų</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {filtered.map((c) => {
                const href = '/cards/' + encodeURIComponent(c.card_number ?? c.card_id)
                const col = c.rarity_color || '#d4af37'
                return (
                  <div key={c.card_id} className="flex flex-col">
                    <Link href={href} className="relative block rounded-md overflow-hidden group" style={{ aspectRatio: '2.5 / 3.5', border: '2px solid ' + col, boxShadow: '0 0 9px ' + col + '44' }}>
                      {c.image_url
                        ? <img src={c.image_url} alt={c.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform" draggable={false} />
                        : <div className="absolute inset-0" style={{ background: (c.faction_color || '#222') + '30' }} />}
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: col, border: '1px solid ' + col }}>×{c.quantity}</span>
                      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.78)' }}>
                        <p className="text-[9px] leading-tight truncate" style={{ color: '#fff' }}>{c.name}</p>
                      </div>
                    </Link>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <button onClick={() => handleDelta(c.card_id, -1)} disabled={isPending} className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold disabled:opacity-40" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>−</button>
                      <button onClick={() => handleDelta(c.card_id, 1)} disabled={isPending} className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold disabled:opacity-40" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>+</button>
                      {confirmRemove === c.card_id ? (
                        <>
                          <button onClick={() => handleRemove(c.card_id)} disabled={isPending} className="w-5 h-5 rounded text-[10px] font-bold disabled:opacity-40" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}>✓</button>
                          <button onClick={() => setConfirmRemove(null)} className="w-5 h-5 rounded text-[10px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>×</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmRemove(c.card_id)} disabled={isPending} className="w-5 h-5 rounded flex items-center justify-center text-[10px] disabled:opacity-40" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }} title="Pašalinti">🗑</button>
                      )}
                    </div>
                    {errors[c.card_id] && <p className="text-[9px] mt-0.5 text-center" style={{ color: '#ef4444' }}>{errors[c.card_id]}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <aside className="order-1 lg:order-2 self-start lg:sticky lg:top-16 space-y-3">
          <div className="relative" style={{ clipPath: oct(14), background: 'rgba(96,165,250,0.45)', padding: 2.5 }}>
            <div className="p-4 space-y-3" style={{ clipPath: oct(13), background: 'radial-gradient(120% 60% at 50% 0%, rgba(96,165,250,0.12), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>
              <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#bfdbfe', letterSpacing: '0.06em' }}>📊 STATISTIKA</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{stats.totalQty}</span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>kortų ({currentOwned} unik. / {totalCards})</span>
              </div>
              <Stat title="Pagal retumą" rows={stats.byRarity} />
              <Stat title="Pagal frakciją" rows={stats.byFaction} />
              <Stat title="Pagal tipą" rows={stats.byType} />
            </div>
          </div>

          <Link href="/deck-builder" className="group relative block transition-transform hover:scale-[1.03] active:scale-[0.99]" style={{ clipPath: oct(13), background: 'rgba(34,197,94,0.5)', padding: 2.5 }}>
            <div className="px-4 py-4 flex flex-col items-center text-center gap-1" style={{ clipPath: oct(12), background: 'radial-gradient(120% 90% at 50% 0%, rgba(34,197,94,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>
              <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(34,197,94,0.5))' }}>🛠️</span>
              <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#86efac', letterSpacing: '0.06em' }}>DECK BUILDER</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Kurk kaladę su statistika ir validacija</span>
            </div>
          </Link>
        </aside>
      </div>

      {isPending && <p className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] text-xs px-3 py-1.5 rounded-full animate-pulse" style={{ color: 'var(--gold)', background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)' }}>Saugoma…</p>}
    </div>
  )
}
