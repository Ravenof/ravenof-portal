'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — Bendruomenės kaladės:
// • TOP pagal balsus: vienas useris = vienas balsas (▲ +1 / ▼ -1 / atšaukti),
//   decks.score palaikomas DB trigeriu.
// • Kopijavimas per RPC — VISADA pilna kaladė (su side deck), net jei kortų
//   neturi; trūkstamas matysi „Mano kaladėse" ir žaisti negalėsi, kol neturėsi.
// • Komentarai: rašyk, balsuok ▲▼ (po vieną), praneškite (report);
//   adminas gali pašalinti.
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Eye, Copy, Lock, X, ChevronUp, ChevronDown, Flag, Trash2, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { rarityColor } from '@/lib/digital/rarity'

const GOLD = '240,180,41'

type Entry = { cardId: string; name: string; image: string | null; gold: number; rarity: string | null; qty: number; owned: number }
type CDeck = {
  id: string; name: string; author: string; faction: string | null; factionColor: string
  cardCount: number; score: number; updated: string; entries: Entry[]; total: number; have: number; missing: number
}
type Sort = 'score' | 'new' | 'cards'
type Comment = {
  id: string; userId: string; author: string; body: string; created: string
  votes: number; myVote: number; removed: boolean
}

function timeAgo(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'ką tik'
  if (s < 3600) return `prieš ${Math.floor(s / 60)} min.`
  if (s < 86400) return `prieš ${Math.floor(s / 3600)} val.`
  return `prieš ${Math.floor(s / 86400)} d.`
}

export function DigitalCommunityDecks({ userId }: { userId: string }) {
  const [decks, setDecks] = useState<CDeck[] | null>(null)
  const [myVotes, setMyVotes] = useState<Record<string, number>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [q, setQ] = useState('')
  const [faction, setFaction] = useState('all')
  const [sort, setSort] = useState<Sort>('score')
  const [craftableOnly, setCraftableOnly] = useState(false)
  const [detail, setDetail] = useState<CDeck | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const flash = (m: string, err = false) => { (err ? playError : playSuccess)(); setToast(m) }
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t) }, [toast])

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: deckRows } = await supabase.from('decks')
      .select('id, name, faction_id, card_count, score, user_id, updated_at, faction:factions ( name, color_hex )')
      .eq('visibility', 'public').order('score', { ascending: false }).limit(60)
    type DR = { id: string; name: string; faction_id: number | null; card_count: number; score: number; user_id: string; updated_at: string; faction: { name: string; color_hex: string } | null }
    const rows = (deckRows as unknown as DR[]) ?? []
    const ids = rows.map((d) => d.id)
    const uids = [...new Set(rows.map((d) => d.user_id))]
    const [{ data: profs }, { data: col }, { data: dcs }, { data: votes }, { data: me }] = await Promise.all([
      uids.length ? supabase.from('profiles').select('id, username, display_name').in('id', uids) : Promise.resolve({ data: [] }),
      supabase.from('user_collections').select('card_id, quantity').eq('user_id', userId),
      ids.length ? supabase.from('deck_cards').select('deck_id, card_id, quantity, card:cards ( name, image_url, gold_cost, rarity:rarities ( name ) )').in('deck_id', ids) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('deck_votes').select('deck_id, vote').eq('user_id', userId).in('deck_id', ids) : Promise.resolve({ data: [] }),
      supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    ])
    setIsAdmin(((me as { role?: string } | null)?.role) === 'admin')
    setMyVotes(Object.fromEntries(((votes as { deck_id: string; vote: number }[]) ?? []).map((v) => [v.deck_id, v.vote])))
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

  // ── Balsavimas už kaladę (vienas balsas: -1 / 0 / +1) ─────────────────────
  const vote = async (d: CDeck, v: 1 | -1) => {
    playUiClick()
    const cur = myVotes[d.id] ?? 0
    const next = cur === v ? 0 : v
    const delta = next - cur
    // optimistinis atnaujinimas
    setMyVotes((m) => ({ ...m, [d.id]: next }))
    setDecks((ds) => (ds ?? []).map((x) => x.id === d.id ? { ...x, score: x.score + delta } : x))
    if (detail?.id === d.id) setDetail((x) => x ? { ...x, score: x.score + delta } : x)
    const supabase = createClient()
    const res = next === 0
      ? await supabase.from('deck_votes').delete().eq('deck_id', d.id).eq('user_id', userId)
      : cur === 0
        ? await supabase.from('deck_votes').insert({ deck_id: d.id, user_id: userId, vote: next })
        : await supabase.from('deck_votes').update({ vote: next, updated_at: new Date().toISOString() }).eq('deck_id', d.id).eq('user_id', userId)
    if (res.error) {
      setMyVotes((m) => ({ ...m, [d.id]: cur }))
      setDecks((ds) => (ds ?? []).map((x) => x.id === d.id ? { ...x, score: x.score - delta } : x))
      flash('Nepavyko balsuoti', true)
    }
  }

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

  // ── PILNAS kopijavimas per RPC ─────────────────────────────────────────────
  const copyDeck = async (d: CDeck) => {
    setBusy(true); playUiClick()
    const supabase = createClient()
    const { error } = await supabase.rpc('rvn_copy_community_deck', { p_deck_id: d.id })
    setBusy(false)
    if (error) { flash('Nepavyko nukopijuoti', true); return }
    flash(d.missing > 0
      ? `Nukopijuota visa kaladė — trūksta ${d.missing} kortų, žaisti galėsi jas įsigijęs`
      : 'Kaladė nukopijuota į Mano kaladės')
    setDetail(null)
  }

  if (decks === null) return <p className="text-center text-sm py-16" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>

  const selStyle: React.CSSProperties = { background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-secondary)', fontSize: 12, borderRadius: 10, padding: '8px 10px', minHeight: 40 }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti kaladės ar autoriaus…" className="w-full pl-9 pr-3 rounded-xl text-sm outline-none" style={{ minHeight: 44, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-primary)' }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={faction} onChange={(e) => setFaction(e.target.value)} style={selStyle}>
          <option value="all">Visos frakcijos</option>
          {factions.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={selStyle}>
          <option value="score">TOP pagal balsus</option>
          <option value="new">Naujausios</option>
          <option value="cards">Daugiausiai kortų</option>
        </select>
      </div>
      <button onClick={() => { playUiClick(); setCraftableOnly((v) => !v) }} className="inline-flex items-center gap-2 px-3 rounded-full text-xs font-semibold" style={{ minHeight: 40, background: craftableOnly ? 'rgba(34,197,94,0.18)' : 'rgba(10,8,16,0.9)', border: `1px solid ${craftableOnly ? 'rgba(34,197,94,0.6)' : `rgba(${GOLD},0.3)`}`, color: craftableOnly ? '#86efac' : 'var(--text-muted)' }}>
        <span className="relative inline-block rounded-full" style={{ width: 30, height: 16, background: craftableOnly ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)' }}><span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 12, height: 12, left: craftableOnly ? 16 : 2 }} /></span>
        Tik kurias galiu susidėti
      </button>

      {shown.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>Kaladžių nerasta.</p>
      ) : shown.map((d, idx) => (
        <div key={d.id} className="rounded-2xl p-3" style={{ background: 'rgba(10,8,16,0.7)', border: `1px solid ${d.factionColor}40` }}>
          <div className="h-1 rounded-full mb-2" style={{ background: d.factionColor, opacity: 0.55 }} />
          <div className="flex items-start gap-2.5">
            {/* Balsavimo blokas */}
            <VoteBox score={d.score} my={myVotes[d.id] ?? 0} onUp={() => vote(d, 1)} onDown={() => vote(d, -1)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-bold leading-tight truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>
                  {sort === 'score' && idx < 3 && <span style={{ marginRight: 4 }}>{['🥇', '🥈', '🥉'][idx]}</span>}{d.name}
                </h2>
              </div>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>nuo {d.author}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {d.faction && <span className="px-1.5 py-0.5 rounded" style={{ background: d.factionColor + '22', color: d.factionColor }}>{d.faction}</span>}
                <span className="px-1.5 py-0.5 rounded-full font-semibold" style={{ background: d.missing === 0 ? 'rgba(34,197,94,0.12)' : `rgba(${GOLD},0.08)`, color: d.missing === 0 ? '#86efac' : `rgba(${GOLD},0.85)`, border: `1px solid ${d.missing === 0 ? 'rgba(34,197,94,0.3)' : `rgba(${GOLD},0.2)`}` }}>{d.missing === 0 ? '✓ Turi visas' : `Turi ${d.have}/${d.total}`}</span>
              </div>
              <div className="flex gap-2 mt-2.5">
                <button onClick={() => { playUiClick(); setDetail(d) }} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold" style={{ minHeight: 40, background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-secondary)' }}><Eye className="w-3.5 h-3.5" /> Peržiūra</button>
                <button onClick={() => copyDeck(d)} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold disabled:opacity-50" style={{ minHeight: 40, background: `rgba(${GOLD},0.16)`, border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}><Copy className="w-3.5 h-3.5" /> Kopijuoti</button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {detail && (
        <DeckDetail d={detail} userId={userId} isAdmin={isAdmin} busy={busy}
          myVote={myVotes[detail.id] ?? 0}
          onVote={(v) => vote(detail, v)}
          onCopy={() => copyDeck(detail)}
          onClose={() => setDetail(null)}
          flash={flash} />
      )}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 z-[170] px-4 py-2 rounded-full text-xs font-semibold w-max max-w-[92vw] text-center" style={{ bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.96)', border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}>{toast}</div>}
    </div>
  )
}

function VoteBox({ score, my, onUp, onDown }: { score: number; my: number; onUp: () => void; onDown: () => void }) {
  return (
    <div className="flex flex-col items-center shrink-0 rounded-xl overflow-hidden" style={{ border: `1px solid rgba(${GOLD},0.25)`, background: 'rgba(0,0,0,0.35)' }}>
      <button onClick={onUp} aria-label="Už" className="rvn-press flex items-center justify-center" style={{ width: 34, height: 30, color: my === 1 ? '#4ade80' : 'var(--text-muted)', background: my === 1 ? 'rgba(34,197,94,0.16)' : 'transparent' }}><ChevronUp className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /></button>
      <span className="tabular-nums rvn-disp" style={{ fontSize: 13, fontWeight: 800, color: score > 0 ? 'var(--gold)' : score < 0 ? '#fca5a5' : 'var(--text-muted)', padding: '1px 4px' }}>{score}</span>
      <button onClick={onDown} aria-label="Prieš" className="rvn-press flex items-center justify-center" style={{ width: 34, height: 30, color: my === -1 ? '#fca5a5' : 'var(--text-muted)', background: my === -1 ? 'rgba(239,68,68,0.14)' : 'transparent' }}><ChevronDown className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /></button>
    </div>
  )
}

// ── Detali peržiūra: kortos + komentarai ─────────────────────────────────────
function DeckDetail({ d, userId, isAdmin, busy, myVote, onVote, onCopy, onClose, flash }: {
  d: CDeck; userId: string; isAdmin: boolean; busy: boolean; myVote: number
  onVote: (v: 1 | -1) => void; onCopy: () => void; onClose: () => void
  flash: (m: string, err?: boolean) => void
}) {
  const [tab, setTab] = useState<'cards' | 'comments'>('cards')
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const loadComments = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('deck_comments')
      .select('id, user_id, body, created_at, status, profile:profiles ( username, display_name )')
      .eq('deck_id', d.id).eq('status', 'active').order('created_at', { ascending: false }).limit(60)
    type CR = { id: string; user_id: string; body: string; created_at: string; status: string; profile: { username: string; display_name: string | null } | null }
    const rows = ((data as unknown as CR[]) ?? [])
    const ids = rows.map((r) => r.id)
    const sums: Record<string, number> = {}
    const mine: Record<string, number> = {}
    if (ids.length) {
      const { data: cv } = await supabase.from('deck_comment_votes').select('comment_id, user_id, value').in('comment_id', ids)
      for (const v of ((cv as { comment_id: string; user_id: string; value: number }[]) ?? [])) {
        sums[v.comment_id] = (sums[v.comment_id] ?? 0) + v.value
        if (v.user_id === userId) mine[v.comment_id] = v.value
      }
    }
    setComments(rows.map((r) => ({ id: r.id, userId: r.user_id, author: r.profile?.display_name || r.profile?.username || 'Žaidėjas', body: r.body, created: r.created_at, votes: sums[r.id] ?? 0, myVote: mine[r.id] ?? 0, removed: false })))
  }, [d.id, userId])

  useEffect(() => { loadComments() }, [loadComments])

  const send = async () => {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true); playUiClick()
    const supabase = createClient()
    const { error } = await supabase.from('deck_comments').insert({ deck_id: d.id, user_id: userId, body })
    setSending(false)
    if (error) { flash('Nepavyko išsiųsti', true); return }
    setDraft(''); playSuccess(); loadComments()
  }

  const voteComment = async (c: Comment, v: 1 | -1) => {
    playUiClick()
    const next = c.myVote === v ? 0 : v
    const delta = next - c.myVote
    setComments((cs) => (cs ?? []).map((x) => x.id === c.id ? { ...x, votes: x.votes + delta, myVote: next } : x))
    const supabase = createClient()
    const res = next === 0
      ? await supabase.from('deck_comment_votes').delete().eq('comment_id', c.id).eq('user_id', userId)
      : await supabase.from('deck_comment_votes').upsert({ comment_id: c.id, user_id: userId, value: next })
    if (res.error) {
      setComments((cs) => (cs ?? []).map((x) => x.id === c.id ? { ...x, votes: x.votes - delta, myVote: c.myVote } : x))
      flash('Nepavyko balsuoti', true)
    }
  }

  const reportComment = async (c: Comment) => {
    playUiClick()
    const supabase = createClient()
    const { error } = await supabase.from('deck_comment_reports').upsert({ comment_id: c.id, user_id: userId })
    if (error) flash('Nepavyko pranešti', true)
    else flash('Pranešta — komentarą peržiūrės administratorius')
  }

  const removeComment = async (c: Comment) => {
    playUiClick()
    const supabase = createClient()
    const newStatus = isAdmin && c.userId !== userId ? 'hidden' : 'deleted'
    const { error } = await supabase.from('deck_comments').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', c.id)
    if (error) { flash('Nepavyko pašalinti', true); return }
    setComments((cs) => (cs ?? []).filter((x) => x.id !== c.id))
    flash('Komentaras pašalintas')
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div className="w-full sm:w-[min(460px,94vw)] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden" style={{ maxHeight: '88vh', border: `1px solid ${d.factionColor}55`, background: 'linear-gradient(160deg,#15101f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 py-3 shrink-0" style={{ borderBottom: `1px solid rgba(${GOLD},0.15)` }}>
          <VoteBox score={d.score} my={myVote} onUp={() => onVote(1)} onDown={() => onVote(-1)} />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{d.name}</h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>nuo {d.author} · {d.total} kortų</p>
          </div>
          <button onClick={() => { playUiClick(); onClose() }} className="flex items-center justify-center rounded-full shrink-0" style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.5)', color: '#fff' }} aria-label="Uždaryti"><X className="w-4 h-4" /></button>
        </div>

        {/* Tabai */}
        <div className="flex px-4 pt-2 gap-1 shrink-0">
          {([['cards', `Kortos · ${d.total}`], ['comments', `Komentarai${comments ? ` · ${comments.length}` : ''}`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => { playUiClick(); setTab(k) }} className="flex-1 rounded-t-xl text-[12px] font-bold py-2" style={{ background: tab === k ? `rgba(${GOLD},0.14)` : 'transparent', color: tab === k ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', borderBottom: tab === k ? `2px solid rgba(${GOLD},0.7)` : '2px solid transparent' }}>{label}</button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-1.5">
          {tab === 'cards' ? (
            d.entries.map((e) => {
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
                  <span className="flex items-center justify-center rounded-full text-[10px] font-bold shrink-0" style={{ width: 18, height: 18, background: `rgba(${GOLD},0.9)`, color: '#1a0f04' }}>{e.gold}</span>
                  <span className="flex-1 min-w-0 text-[12px] font-semibold truncate" style={{ color: ok ? '#f3ead3' : 'var(--text-muted)' }}>{e.name}</span>
                  <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: ok ? '#86efac' : '#fca5a5' }}>{have}/{e.qty}</span>
                </div>
              )
            })
          ) : (
            <>
              {comments === null && <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
              {comments?.length === 0 && <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Komentarų dar nėra — būk pirmas!</p>}
              {comments?.map((c) => (
                <div key={c.id} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-bold truncate" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{c.author}</span>
                    <span className="text-[9.5px] shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.created)}</span>
                    <span className="flex-1" />
                    {(isAdmin || c.userId === userId) && <button onClick={() => removeComment(c)} aria-label="Pašalinti" className="rvn-press flex items-center justify-center rounded shrink-0" style={{ width: 26, height: 26, color: '#fca5a5' }}><Trash2 className="w-3.5 h-3.5" /></button>}
                    {c.userId !== userId && <button onClick={() => reportComment(c)} aria-label="Pranešti" className="rvn-press flex items-center justify-center rounded shrink-0" style={{ width: 26, height: 26, color: 'var(--text-muted)' }}><Flag className="w-3.5 h-3.5" /></button>}
                  </div>
                  <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{c.body}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <button onClick={() => voteComment(c, 1)} className="rvn-press flex items-center justify-center rounded" style={{ width: 26, height: 24, color: c.myVote === 1 ? '#4ade80' : 'var(--text-muted)', background: c.myVote === 1 ? 'rgba(34,197,94,0.14)' : 'transparent' }} aria-label="Už"><ChevronUp className="w-4 h-4" /></button>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: c.votes > 0 ? '#86efac' : c.votes < 0 ? '#fca5a5' : 'var(--text-muted)', minWidth: 16, textAlign: 'center' }}>{c.votes}</span>
                    <button onClick={() => voteComment(c, -1)} className="rvn-press flex items-center justify-center rounded" style={{ width: 26, height: 24, color: c.myVote === -1 ? '#fca5a5' : 'var(--text-muted)', background: c.myVote === -1 ? 'rgba(239,68,68,0.12)' : 'transparent' }} aria-label="Prieš"><ChevronDown className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="px-4 py-3 shrink-0 space-y-2" style={{ borderTop: `1px solid rgba(${GOLD},0.15)`, paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          {tab === 'comments' ? (
            <div className="flex items-end gap-2">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 1000))} placeholder="Parašyk komentarą…" rows={1}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-primary)', minHeight: 44, maxHeight: 96 }} />
              <button onClick={send} disabled={!draft.trim() || sending} aria-label="Siųsti" className="rvn-press flex items-center justify-center rounded-xl shrink-0 disabled:opacity-40" style={{ width: 44, height: 44, background: `rgba(${GOLD},0.92)`, color: '#1a0f04' }}><Send className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /></button>
            </div>
          ) : (
            <>
              <p className="text-xs text-center font-semibold" style={{ color: d.missing === 0 ? '#86efac' : '#fca5a5' }}>{d.missing === 0 ? '✓ Turi visas kortas' : `Trūksta ${d.missing} kortų — nukopijuota kaladė bus pilna, bet žaisti galėsi tik jas įsigijęs`}</p>
              <button onClick={onCopy} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ minHeight: 46, background: `rgba(${GOLD},0.92)`, color: '#1a0f04', fontFamily: 'var(--rvn-font-display)' }}><Copy className="w-4 h-4" /> Kopijuoti pilną kaladę</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
