'use client'

// ── Ravenof Digital — Bendruomenės kaladės (mobile) ───────────────────────────
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Eye, Copy, Lock, X, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { rarityColor } from '@/lib/digital/rarity'

type Entry = { cardId: string; name: string; image: string | null; gold: number; rarity: string | null; qty: number; owned: number }
type CDeck = {
  id: string; name: string; author: string; faction: string | null; factionColor: string
  cardCount: number; score: number; updated: string; entries: Entry[]; total: number; have: number; missing: number
}
type Sort = 'score' | 'new' | 'cards'

export function DigitalCommunityDecks({ userId }: { userId: string }) {
  const [decks, setDecks] = useState<CDeck[] | null>(null)
  const [q, setQ] = useState('')
  const [faction, setFaction] = useState('all')
  const [sort, setSort] = useState<Sort>('score')
  const [craftableOnly, setCraftableOnly] = useState(false)
  const [detail, setDetail] = useState<CDeck | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const flash = (m: string, err = false) => { (err ? playError : playSuccess)(); setToast(m) }
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t) }, [toast])

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: deckRows } = await supabase.from('decks')
      .select('id, name, faction_id, card_count, score, user_id, updated_at, faction:factions ( name, color_hex )')
      .eq('visibility', 'public').order('score', { ascending: false }).limit(60)
    type DR = { id: string; name: string; faction_id: number | null; card_count: number; score: number; user_id: string; updated_at: string; faction: { name: string; color_hex: string } | null }
    const rows = (deckRows as unknown as DR[]) ?? []
    const ids = rows.map((d) => d.id)
    const uids = [...new Set(rows.map((d) => d.user_id))]
    const [{ data: profs }, { data: col }, { data: dcs }] = await Promise.all([
      uids.length ? supabase.from('profiles').select('id, username, display_name').in('id', uids) : Promise.resolve({ data: [] }),
      supabase.from('user_collections').select('card_id, quantity').eq('user_id', userId),
      ids.length ? supabase.from('deck_cards').select('deck_id, card_id, quantity, card:cards ( name, image_url, gold_cost, rarity:rarities ( name ) )').in('deck_id', ids) : Promise.resolve({ data: [] }),
    ])
    const nameOf: Record<string, string> = Object.fromEntries(((profs as { id: string; username: string; display_name: string | null }[]) ?? []).map((p) => [p.id, p.display_name || p.username]))
    const owned: Record<string, number> = Object.fromEntries(((col as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
    type DCR = { deck_id: string; card_id: string; quantity: number; card: { name: string; image_url: string | null; gold_cost: number; rarity: { name: string | null } | null } | null }
    const byDeck: Record<string, Entry[]> = {}
    for (const r of ((dcs as unknown as DCR[]) ?? [])) {
      if (!r.card) continue
      ;(byDeck[r.deck_id] ??= []).push({ cardId: r.card_id, name: r.card.name, image: r.card.image_url, gold: r.card.gold_cost, rarity: r.card.rarity?.name ?? null, qty: r.quantity, owned: owned[r.card_id] ?? 0 })
    }
    setDecks(rows.map((d) => {
      const entries = (byDeck[d.id] ?? []).sort((a, b) => a.gold - b.gold || a.name.localeCompare(b.name))
      const total = entries.reduce((s, e) => s + e.qty, 0)
      const have = entries.reduce((s, e) => s + Math.min(e.owned, e.qty), 0)
      return { id: d.id, name: d.name, author: nameOf[d.user_id] ?? 'Žaidėjas', faction: d.faction?.name ?? null, factionColor: d.faction?.color_hex ?? '#f0b429', cardCount: d.card_count, score: d.score ?? 0, updated: d.updated_at, entries, total, have, missing: total - have }
    }))
  }, [userId])

  useEffect(() => { load() }, [load])

  const factions = useMemo(() => Array.from(new Map((decks ?? []).filter((d) => d.faction).map((d) => [d.faction!, d.factionColor])), ([name, color]) => ({ name, color })), [decks])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = (decks ?? []).filter((d) => {
      if (craftableOnly && d.missing > 0) return false
      if (faction !== 'all' && d.faction !== faction) return false
      if (needle && !d.name.toLowerCase().includes(needle) && !d.author.toLowerCase().includes(needle)) return false
      return true
    })
    list.sort((a, b) => sort === 'new' ? +new Date(b.updated) - +new Date(a.updated) : sort === 'cards' ? b.cardCount - a.cardCount : b.score - a.score)
    return list
  }, [decks, q, faction, sort, craftableOnly])

  const copyDeck = async (d: CDeck) => {
    setBusy(true); playUiClick()
    const supabase = createClient()
    try {
      const avg = d.total ? Math.round(d.entries.reduce((s, e) => s + e.gold * e.qty, 0) / d.total) : 0
      const { data: orig } = await supabase.from('decks').select('faction_id, description').eq('id', d.id).single()
      const { data: nd, error } = await supabase.from('decks').insert({ user_id: userId, name: `${d.name} (kopija)`, description: (orig as { description: string | null } | null)?.description ?? null, faction_id: (orig as { faction_id: number | null } | null)?.faction_id ?? null, visibility: 'private', card_count: d.total, avg_gold_cost: avg }).select('id').single()
      if (error) throw error
      const rows = d.entries.map((e) => ({ deck_id: nd.id, card_id: e.cardId, quantity: e.qty }))
      if (rows.length) await supabase.from('deck_cards').insert(rows)
      flash('Kaladė nukopijuota į Mano kaladės'); setDetail(null)
    } catch { flash('Nepavyko nukopijuoti', true) } finally { setBusy(false) }
  }

  if (decks === null) return <p className="text-center text-sm py-16" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>

  const selStyle: React.CSSProperties = { background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--text-secondary)', fontSize: 12, borderRadius: 10, padding: '8px 10px', minHeight: 40 }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti kaladės ar autoriaus…" className="w-full pl-9 pr-3 rounded-xl text-sm outline-none" style={{ minHeight: 44, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--text-primary)' }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={faction} onChange={(e) => setFaction(e.target.value)} style={selStyle}>
          <option value="all">Visos frakcijos</option>
          {factions.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={selStyle}>
          <option value="score">Populiariausios</option>
          <option value="new">Naujausios</option>
          <option value="cards">Daugiausiai kortų</option>
        </select>
      </div>
      <button onClick={() => { playUiClick(); setCraftableOnly((v) => !v) }} className="inline-flex items-center gap-2 px-3 rounded-full text-xs font-semibold" style={{ minHeight: 40, background: craftableOnly ? 'rgba(34,197,94,0.18)' : 'rgba(10,8,16,0.9)', border: `1px solid ${craftableOnly ? 'rgba(34,197,94,0.6)' : 'rgba(240,180,41,0.3)'}`, color: craftableOnly ? '#86efac' : 'var(--text-muted)' }}>
        <span className="relative inline-block rounded-full" style={{ width: 30, height: 16, background: craftableOnly ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)' }}><span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 12, height: 12, left: craftableOnly ? 16 : 2 }} /></span>
        Tik kurias galiu susidėti
      </button>

      {shown.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>Kaladžių nerasta.</p>
      ) : shown.map((d) => (
        <div key={d.id} className="rounded-2xl p-3" style={{ background: 'rgba(10,8,16,0.7)', border: `1px solid ${d.factionColor}40` }}>
          <div className="h-1 rounded-full mb-2" style={{ background: d.factionColor, opacity: 0.55 }} />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold leading-tight truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{d.name}</h2>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>nuo {d.author}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] shrink-0" style={{ color: 'var(--gold)' }}><Heart className="w-3 h-3" /> {d.score}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {d.faction && <span className="px-1.5 py-0.5 rounded" style={{ background: d.factionColor + '22', color: d.factionColor }}>{d.faction}</span>}
            <span className="px-1.5 py-0.5 rounded-full font-semibold" style={{ background: d.missing === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(240,180,41,0.08)', color: d.missing === 0 ? '#86efac' : 'rgba(240,180,41,0.85)', border: `1px solid ${d.missing === 0 ? 'rgba(34,197,94,0.3)' : 'rgba(240,180,41,0.2)'}` }}>{d.missing === 0 ? '✓ Turi visas' : `Turi ${d.have}/${d.total}`}</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { playUiClick(); setDetail(d) }} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold" style={{ minHeight: 40, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--text-secondary)' }}><Eye className="w-3.5 h-3.5" /> Peržiūrėti</button>
            <button onClick={() => copyDeck(d)} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold disabled:opacity-50" style={{ minHeight: 40, background: 'rgba(240,180,41,0.16)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}><Copy className="w-3.5 h-3.5" /> Kopijuoti</button>
          </div>
        </div>
      ))}

      {detail && (
        <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setDetail(null)}>
          <div className="w-full sm:w-[min(440px,94vw)] max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden" style={{ border: `1px solid ${detail.factionColor}55`, background: 'linear-gradient(160deg,#15101f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
              <div className="min-w-0">
                <h2 className="text-sm font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{detail.name}</h2>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>nuo {detail.author} · {detail.total} kortų</p>
              </div>
              <button onClick={() => { playUiClick(); setDetail(null) }} className="flex items-center justify-center rounded-full shrink-0" style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.5)', color: '#fff' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-1.5">
              {detail.entries.map((e) => {
                const have = Math.min(e.owned, e.qty); const ok = e.owned >= e.qty; const col = rarityColor(e.rarity)
                return (
                  <div key={e.cardId} className="flex items-center gap-2.5 p-1.5 rounded-lg" style={{ background: 'rgba(10,8,16,0.6)', border: `1px solid ${ok ? col + '55' : 'rgba(120,120,140,0.25)'}` }}>
                    <span className="relative block overflow-hidden rounded-md shrink-0" style={{ width: 38, height: 38, border: `1.5px solid ${ok ? col : 'rgba(120,120,140,0.4)'}` }}>
                      {e.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={e.image} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" style={{ filter: ok ? undefined : 'grayscale(1) brightness(0.5)' }} />
                        : <span className="absolute inset-0 flex items-center justify-center text-xs" style={{ background: '#15101f' }}>🎴</span>}
                      {!ok && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.7)' }} /></span>}
                    </span>
                    <span className="flex items-center justify-center rounded-full text-[10px] font-bold shrink-0" style={{ width: 18, height: 18, background: 'rgba(240,180,41,0.9)', color: '#1a0f04' }}>{e.gold}</span>
                    <span className="flex-1 min-w-0 text-[12px] font-semibold truncate" style={{ color: ok ? '#f3ead3' : 'var(--text-muted)' }}>{e.name}</span>
                    <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: ok ? '#86efac' : '#fca5a5' }}>{have}/{e.qty}</span>
                  </div>
                )
              })}
            </div>
            <div className="px-4 py-3 shrink-0 space-y-2" style={{ borderTop: '1px solid rgba(240,180,41,0.15)' }}>
              <p className="text-xs text-center font-semibold" style={{ color: detail.missing === 0 ? '#86efac' : '#fca5a5' }}>{detail.missing === 0 ? '✓ Turi visas kortas' : `Trūksta ${detail.missing} kortų`}</p>
              <button onClick={() => copyDeck(detail)} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ minHeight: 46, background: 'rgba(240,180,41,0.92)', color: '#1a0f04', fontFamily: 'var(--rvn-font-display)' }}><Copy className="w-4 h-4" /> Kopijuoti į Mano kaladės</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 z-[170] px-4 py-2 rounded-full text-xs font-semibold" style={{ bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.96)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>{toast}</div>}
    </div>
  )
}
