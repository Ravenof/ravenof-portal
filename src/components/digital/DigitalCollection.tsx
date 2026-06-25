'use client'

// ── Ravenof Digital — Kolekcija (mobile, 2 kortos eilėje, turimos/užrakintos) ──
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Lock, X, Grid2x2, Grid3x3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { getActivePacks, getPackInventory, type Pack } from '@/lib/economy'
import { requestOpenStore, emitWalletChanged } from '@/lib/digital/native'
import { rarityColor } from '@/lib/digital/rarity'
import { GameCard } from '@/components/ui/GameCard'
import { PackOpen } from './PackOpen'

type Col = {
  id: string; name: string; image: string | null
  faction: string | null; factionSlug: string | null
  type: string | null; rarity: string | null; copyLimit: number; raritySort: number
  gold: number; atk: number | null; hp: number | null; effect: string | null; isChampion: boolean
  owned: number
}

export function DigitalCollection() {
  const [cards, setCards] = useState<Col[] | null>(null)
  const [loggedOut, setLoggedOut] = useState(false)
  const [packList, setPackList] = useState<Pack[]>([])
  const [inv, setInv] = useState<Record<string, number>>({})
  const [chooser, setChooser] = useState(false)
  const [openingPack, setOpeningPack] = useState<Pack | null>(null)

  const [q, setQ] = useState('')
  const [faction, setFaction] = useState('all')
  const [rarity, setRarity] = useState('all')
  const [type, setType] = useState('all')
  const [ownedOnly, setOwnedOnly] = useState(false)
  const [cols, setCols] = useState<2 | 3>(2)
  const [preview, setPreview] = useState<Col | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoggedOut(true); setCards([]); return }
    const [{ data: cardRows }, { data: colRows }] = await Promise.all([
      supabase.from('cards').select(`
        id, name, image_url, gold_cost, attack, health, description, effect_text, is_champion,
        faction:factions ( name, slug ),
        card_type:card_types ( name ),
        rarity:rarities ( name, copy_limit, sort_order )
      `).eq('status', 'active').order('gold_cost').order('name'),
      supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
    ])
    type R = { id: string; name: string; image_url: string | null; gold_cost: number; attack: number | null; health: number | null; description: string | null; effect_text: string | null; is_champion: boolean; faction: { name: string; slug: string } | null; card_type: { name: string } | null; rarity: { name: string; copy_limit: number; sort_order: number } | null }
    const owned: Record<string, number> = Object.fromEntries(((colRows as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
    const list: Col[] = ((cardRows as unknown as R[]) ?? []).map((r) => ({
      id: r.id, name: r.name, image: r.image_url,
      faction: r.faction?.name ?? null, factionSlug: r.faction?.slug ?? null,
      type: r.card_type?.name ?? null, rarity: r.rarity?.name ?? null,
      copyLimit: r.rarity?.copy_limit ?? 2, raritySort: r.rarity?.sort_order ?? 0,
      gold: r.gold_cost, atk: r.attack, hp: r.health, effect: r.effect_text ?? r.description, isChampion: r.is_champion,
      owned: owned[r.id] ?? 0,
    }))
    setCards(list)
  }, [])

  const refreshInv = useCallback(() => { getPackInventory().then(setInv) }, [])
  useEffect(() => { load(); refreshInv(); getActivePacks().then(setPackList) }, [load, refreshInv])
  const ownedPacks = packList.filter((p) => (inv[p.id] ?? 0) > 0)
  const totalPacks = Object.values(inv).reduce((a, b) => a + b, 0)
  const openPacks = () => { playUiClick(); if (ownedPacks.length === 0) { requestOpenStore(); return } if (ownedPacks.length === 1) setOpeningPack(ownedPacks[0]); else setChooser(true) }

  const factions = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of cards ?? []) if (c.faction) m.set(c.factionSlug ?? c.faction, c.faction)
    return Array.from(m, ([slug, name]) => ({ slug, name }))
  }, [cards])
  const rarities = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of cards ?? []) if (c.rarity) m.set(c.rarity, c.raritySort)
    return Array.from(m, ([name, sort]) => ({ name, sort })).sort((a, b) => a.sort - b.sort)
  }, [cards])
  const types = useMemo(() => Array.from(new Set((cards ?? []).map((c) => c.type).filter(Boolean))) as string[], [cards])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (cards ?? []).filter((c) => {
      if (ownedOnly && c.owned <= 0) return false
      if (faction !== 'all' && (c.factionSlug ?? c.faction) !== faction) return false
      if (rarity !== 'all' && c.rarity !== rarity) return false
      if (type !== 'all' && c.type !== type) return false
      if (needle && !c.name.toLowerCase().includes(needle)) return false
      return true
    })
  }, [cards, q, faction, rarity, type, ownedOnly])

  const ownedCount = (cards ?? []).filter((c) => c.owned > 0).length

  if (cards === null) return <p className="text-center text-sm py-16" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>

  const selStyle: React.CSSProperties = { background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--text-secondary)', fontSize: 12, borderRadius: 10, padding: '8px 10px', minHeight: 40 }

  return (
    <div className="space-y-3" style={{ paddingBottom: 64 }}>
      {/* Antraštė */}
      <div>
        <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>Kolekcija</h1>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Tavo turimos ir atrakinamos kortos · {ownedCount}/{cards.length}</p>
      </div>

      {loggedOut ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad matytum kolekciją. <Link href="/login?next=/digital/collection" className="underline" style={{ color: 'var(--gold)' }}>Prisijungti</Link></p>
      ) : (
      <>
        {/* Paieška */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti kortos…"
            className="w-full pl-9 pr-3 rounded-xl text-sm outline-none"
            style={{ minHeight: 44, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--text-primary)' }} />
        </div>

        {/* Filtrai */}
        <div className="grid grid-cols-3 gap-2">
          <select value={faction} onChange={(e) => setFaction(e.target.value)} style={selStyle}>
            <option value="all">Visos frakcijos</option>
            {factions.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
          <select value={rarity} onChange={(e) => setRarity(e.target.value)} style={selStyle}>
            <option value="all">Visi retumai</option>
            {rarities.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} style={selStyle}>
            <option value="all">Visi tipai</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Perjungimai */}
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => { playUiClick(); setOwnedOnly((v) => !v) }}
            className="inline-flex items-center gap-2 px-3 rounded-full text-xs font-semibold transition-colors"
            style={{ minHeight: 40, background: ownedOnly ? 'rgba(34,197,94,0.18)' : 'rgba(10,8,16,0.9)', border: `1px solid ${ownedOnly ? 'rgba(34,197,94,0.6)' : 'rgba(240,180,41,0.3)'}`, color: ownedOnly ? '#86efac' : 'var(--text-muted)' }}>
            <span className="relative inline-block rounded-full" style={{ width: 30, height: 16, background: ownedOnly ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)' }}>
              <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 12, height: 12, left: ownedOnly ? 16 : 2 }} />
            </span>
            Tik turimos
          </button>
          <div className="inline-flex rounded-full overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.3)' }}>
            {([2, 3] as const).map((n) => (
              <button key={n} onClick={() => { playUiClick(); setCols(n) }} className="flex items-center justify-center" style={{ width: 40, height: 40, background: cols === n ? 'rgba(240,180,41,0.18)' : 'rgba(10,8,16,0.9)', color: cols === n ? 'var(--gold)' : 'var(--text-muted)' }} aria-label={`${n} stulpeliai`}>
                {n === 2 ? <Grid2x2 className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Tinklelis */}
        {filtered.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>{ownedOnly ? 'Neturi kortų pagal šiuos filtrus. Atplėšk pakuotę 🎁' : 'Kortų nerasta.'}</p>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {filtered.map((c) => <CardCell key={c.id} c={c} onClick={() => { playUiClick(); setPreview(c) }} />)}
          </div>
        )}
      </>
      )}

      {/* Sticky CTA */}
      <div className="fixed left-0 right-0 z-30 px-4" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={openPacks}
          className="mx-auto block w-[min(420px,100%)] px-4 py-2.5 rounded-full text-xs font-bold transition-transform active:scale-[0.98]"
          style={{ background: 'rgba(251,146,60,0.92)', color: '#1a0f04', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
          {totalPacks > 0 ? `🎁 Atplėšti pakus (${totalPacks})` : '🛒 Į parduotuvę'}
        </button>
      </div>

      {chooser && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setChooser(false)}>
          <div className="w-[min(360px,92vw)] rounded-2xl p-5" style={{ border: '1px solid rgba(251,146,60,0.5)', background: 'linear-gradient(160deg,#17111f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold mb-3 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: '#fdba74', letterSpacing: '0.06em' }}>🎁 Kurį paką atplėšti?</p>
            <div className="space-y-2">
              {ownedPacks.map((pk) => (
                <button key={pk.id} onClick={() => { playUiClick(); setChooser(false); setOpeningPack(pk) }} className="w-full text-left px-3 py-2.5 rounded-xl transition-transform active:scale-[0.98]" style={{ background: 'rgba(251,146,60,0.14)', border: '1px solid rgba(251,146,60,0.45)' }}>
                  <span className="text-sm font-bold" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>{pk.name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>×{inv[pk.id]}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { playUiClick(); setChooser(false) }} className="mt-3 w-full text-xs" style={{ color: 'var(--text-muted)' }}>Atšaukti</button>
          </div>
        </div>
      )}

      {openingPack && (
        <PackOpen packId={openingPack.id} packName={openingPack.name} packImage={openingPack.image_url}
          onClose={() => { setOpeningPack(null); refreshInv(); emitWalletChanged() }}
          onOpened={() => { refreshInv(); emitWalletChanged(); load() }} />
      )}

      {preview && <PreviewModal c={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function CardCell({ c, onClick }: { c: Col; onClick: () => void }) {
  const [bad, setBad] = useState(false)
  const owned = c.owned > 0
  const col = rarityColor(c.rarity)
  return (
    <GameCard glowColor={owned ? col + '88' : 'rgba(120,120,140,0.3)'} sounds={owned}>
      <button onClick={onClick} className="relative block w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: '2.5 / 3.5', border: `2px solid ${owned ? col : 'rgba(120,120,140,0.4)'}`, boxShadow: owned ? `0 0 10px ${col}44` : 'none' }}>
        {c.image && !bad
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.image} alt={c.name} onError={() => setBad(true)} draggable={false}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: owned ? undefined : 'grayscale(1) brightness(0.55)', opacity: owned ? 1 : 0.55 }} />
          : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center" style={{ background: 'linear-gradient(160deg,#1a1325,#0a0810)', filter: owned ? undefined : 'grayscale(1)', opacity: owned ? 1 : 0.55 }}>
              <span className="text-xl">🎴</span><span className="text-[9px] leading-tight" style={{ color: '#fff' }}>{c.name}</span>
            </div>}

        {/* Užrakta */}
        {!owned && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.7)', filter: 'drop-shadow(0 1px 3px #000)' }} />
          </span>
        )}

        {/* Turimų ženklelis */}
        {owned && (
          <span className="absolute top-1 right-1 px-1.5 rounded-full text-[10px] font-bold leading-tight"
            style={{ background: 'rgba(0,0,0,0.82)', color: col, border: `1px solid ${col}` }}>×{c.owned}</span>
        )}

        {/* Kaina */}
        <span className="absolute top-1 left-1 flex items-center justify-center rounded-full text-[10px] font-bold"
          style={{ width: 18, height: 18, background: 'rgba(240,180,41,0.92)', color: '#1a0f04', filter: owned ? undefined : 'grayscale(0.6)' }}>{c.gold}</span>

        {/* Pavadinimas */}
        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <p className="text-[9px] leading-tight truncate text-center" style={{ color: owned ? '#fff' : 'var(--text-muted)' }}>{c.name}</p>
        </div>
      </button>
    </GameCard>
  )
}

function PreviewModal({ c, onClose }: { c: Col; onClose: () => void }) {
  const [bad, setBad] = useState(false)
  const owned = c.owned > 0
  const col = rarityColor(c.rarity)
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-5" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div className="relative w-[min(360px,94vw)] rounded-2xl overflow-hidden" style={{ border: `2px solid ${col}`, background: 'linear-gradient(160deg,#15101f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { playUiClick(); onClose() }} className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.6)', color: '#fff' }} aria-label="Uždaryti"><X className="w-4 h-4" /></button>
        <div className="relative w-full" style={{ aspectRatio: '2.5 / 3.5', maxHeight: '52vh' }}>
          {c.image && !bad
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.image} alt={c.name} onError={() => setBad(true)} draggable={false} className="absolute inset-0 w-full h-full object-contain" style={{ filter: owned ? undefined : 'grayscale(1) brightness(0.6)' }} />
            : <div className="absolute inset-0 flex items-center justify-center text-5xl">🎴</div>}
          {!owned && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.75)' }} /></span>}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{c.name}</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: col, border: `1px solid ${col}` }}>{c.rarity ?? '—'}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>🪙 {c.gold}</span>
            {c.atk != null && <span>⚔️ {c.atk}</span>}
            {c.hp != null && <span>❤️ {c.hp}</span>}
            {c.faction && <span>· {c.faction}</span>}
            {c.type && <span>· {c.type}</span>}
          </div>
          {c.effect && <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{c.effect}</p>}
          <p className="text-xs font-semibold" style={{ color: owned ? '#86efac' : '#fca5a5' }}>
            {owned ? `Turima: ×${c.owned}` : 'Kortos dar neturi'}
          </p>
        </div>
      </div>
    </div>
  )
}
