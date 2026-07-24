'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — Bendruomenės kaladės (Fazė 4: RavenofKit vizualinė kalba;
// raw reference nėra — laikomasi patvirtintos sistemos tokenų):
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
import { ravenofRarityColor } from '@/components/digital/ui/RavenofKit'
import { SmartImg } from '@/components/ui/SmartImg'
import { useT, useGameContent } from '@/lib/i18n/react'
import { t as tGlobal } from '@/lib/i18n/core'

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
  if (s < 60) return tGlobal('common.notif.justNow')
  if (s < 3600) return tGlobal('common.notif.minAgo', { count: Math.floor(s / 60) })
  if (s < 86400) return tGlobal('common.notif.hoursAgo', { count: Math.floor(s / 3600) })
  return tGlobal('common.notif.daysAgo', { count: Math.floor(s / 86400) })
}

const FIELD: React.CSSProperties = { minHeight: 34, background: 'var(--ravenof-bg-elevated)', border: '1px solid var(--ravenof-border-strong)', color: 'var(--ravenof-text-primary)', padding: '0 10px', font: '400 12px var(--ravenof-font-body)', outline: 'none' }

export function DigitalCommunityDecks({ userId }: { userId: string }) {
  const gc = useGameContent()
  const t = useT()
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
      return { id: d.id, name: d.name, author: nameOf[d.user_id] ?? tGlobal('battle.player'), faction: d.faction?.name ?? null, factionColor: d.faction?.color_hex ?? '#D4A33B', cardCount: d.card_count, score: d.score ?? 0, updated: d.updated_at, entries, total, have, missing: total - have }
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
      flash(t('decks.community.voteFailed'), true)
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
    if (error) { flash(t('decks.community.copyFailed'), true); return }
    flash(d.missing > 0
      ? t('decks.community.copiedMissing', { count: d.missing })
      : t('decks.community.copied'))
    setDetail(null)
  }

  if (decks === null) return <div className="ravenof-body flex items-center justify-center py-16"><span className="ravenof-spinner" style={{ width: 40, height: 40 }} /></div>

  return (
    <div className="ravenof-body ravenof-in flex flex-col" style={{ gap: 8 }}>
      {/* ── Įrankių juosta ── */}
      <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
        <div className="relative flex-1" style={{ minWidth: 160 }}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ width: 13, height: 13, color: 'var(--ravenof-text-secondary)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('decks.community.searchPlaceholder')} className="w-full" style={{ ...FIELD, paddingLeft: 28 }} />
        </div>
        <select value={faction} onChange={(e) => setFaction(e.target.value)} style={{ ...FIELD, maxWidth: 160 }}>
          <option value="all">{t('decks.community.allFactions')}</option>
          {factions.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ ...FIELD, maxWidth: 140 }}>
          <option value="score">{t('decks.community.sortTop')}</option>
          <option value="new">{t('decks.community.sortNew')}</option>
          <option value="cards">{t('decks.community.sortCards')}</option>
        </select>
        <button onClick={() => { playUiClick(); setCraftableOnly((v) => !v) }} className="ravenof-press inline-flex items-center gap-2 px-3"
          style={{ minHeight: 34, cursor: 'pointer', font: '700 10.5px var(--ravenof-font-body)', textTransform: 'uppercase', letterSpacing: 1,
            background: craftableOnly ? 'rgba(79,158,82,0.14)' : 'var(--ravenof-bg-elevated)',
            border: `1px solid ${craftableOnly ? 'var(--ravenof-success)' : 'var(--ravenof-border-strong)'}`,
            color: craftableOnly ? 'var(--ravenof-success)' : 'var(--ravenof-text-secondary)' }}>
          <span className="relative inline-block rounded-full" style={{ width: 26, height: 14, background: craftableOnly ? 'var(--ravenof-success)' : 'rgba(255,255,255,0.14)', transition: 'background .15s' }}>
            <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 10, height: 10, left: craftableOnly ? 14 : 2 }} />
          </span>
          {t('decks.community.craftableOnly')}
        </button>
      </div>

      {/* ── Kaladžių grid ── */}
      {shown.length === 0 ? (
        <p className="text-center py-12" style={{ font: '400 13px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('decks.community.noneFound')}</p>
      ) : (
        <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
          {shown.map((d, idx) => (
            <div key={d.id} className="relative flex flex-col" style={{ background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-strong)', borderTop: `2px solid ${d.factionColor}` }}>
              <div className="flex items-start" style={{ gap: 10, padding: '10px 12px 0' }}>
                <VoteBox score={d.score} my={myVotes[d.id] ?? 0} onUp={() => vote(d, 1)} onDown={() => vote(d, -1)} />
                <div className="flex-1 min-w-0">
                  <h2 className="truncate" style={{ font: '700 13.5px var(--ravenof-font-display)', letterSpacing: 0.5, color: 'var(--ravenof-text-primary)', margin: 0 }}>
                    {sort === 'score' && idx < 3 && <span style={{ color: ['#F2C45A', '#c7d0db', '#b3793f'][idx], marginRight: 4 }}>{toRomanRank(idx + 1)}</span>}{d.name}
                  </h2>
                  <p className="truncate" style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: '1px 0 0' }}>{t('decks.community.byAuthor', { name: d.author })}</p>
                  <div className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 6 }}>
                    {d.faction && <span style={{ font: '400 10px var(--ravenof-font-body)', color: d.factionColor, border: `1px solid ${d.factionColor}55`, padding: '2px 7px' }}>{gc.faction(d.faction)}</span>}
                    <span style={{ font: '700 10px var(--ravenof-font-body)', padding: '2px 7px',
                      color: d.missing === 0 ? 'var(--ravenof-success)' : 'var(--ravenof-gold)',
                      border: `1px solid ${d.missing === 0 ? '#4F9E5255' : 'var(--ravenof-border-gold)'}` }}>
                      {d.missing === 0 ? `✓ ${t('decks.community.haveAllShort')}` : t('decks.community.haveOf', { have: d.have, total: d.total })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex" style={{ gap: 8, padding: '10px 12px 12px' }}>
                <button onClick={() => { playUiClick(); setDetail(d) }} className="ravenof-press flex-1 inline-flex items-center justify-center gap-1.5"
                  style={{ minHeight: 34, cursor: 'pointer', font: '700 10.5px var(--ravenof-font-display)', letterSpacing: 1.5, textTransform: 'uppercase', background: 'none', border: '1px solid var(--ravenof-border-strong)', color: 'var(--ravenof-text-primary)' }}>
                  <Eye className="w-3.5 h-3.5" /> {t('decks.community.preview')}
                </button>
                <button onClick={() => copyDeck(d)} disabled={busy} className="ravenof-press flex-1 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ minHeight: 34, cursor: 'pointer', font: '700 10.5px var(--ravenof-font-display)', letterSpacing: 1.5, textTransform: 'uppercase', background: 'none', border: '1px solid var(--ravenof-border-gold)', color: 'var(--ravenof-gold)' }}>
                  <Copy className="w-3.5 h-3.5" /> {t('decks.community.copy')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <DeckDetail d={detail} userId={userId} isAdmin={isAdmin} busy={busy}
          myVote={myVotes[detail.id] ?? 0}
          onVote={(v) => vote(detail, v)}
          onCopy={() => copyDeck(detail)}
          onClose={() => setDetail(null)}
          flash={flash} />
      )}

      {toast && <div className="ravenof-toast" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))', zIndex: 170 }}>{toast}</div>}
    </div>
  )
}

/** TOP-3 ženklinimas romėnišku numeriu (patvirtinta kalba — be emoji medalių). */
function toRomanRank(n: number): string { return ['I', 'II', 'III'][n - 1] ?? String(n) }

function VoteBox({ score, my, onUp, onDown }: { score: number; my: number; onUp: () => void; onDown: () => void }) {
  const fl = useT()
  return (
    <div className="flex flex-col items-center shrink-0 overflow-hidden" style={{ border: '1px solid var(--ravenof-border-strong)', background: 'var(--ravenof-bg-elevated)' }}>
      <button onClick={onUp} aria-label={fl('decks.community.voteUp')} className="ravenof-press flex items-center justify-center" style={{ width: 32, height: 26, cursor: 'pointer', background: my === 1 ? 'rgba(79,158,82,0.16)' : 'none', border: 0, color: my === 1 ? 'var(--ravenof-success)' : 'var(--ravenof-text-secondary)' }}><ChevronUp style={{ width: 16, height: 16 }} /></button>
      <span className="tabular-nums" style={{ font: '700 12px var(--ravenof-font-display)', color: score > 0 ? 'var(--ravenof-gold)' : score < 0 ? '#c65563' : 'var(--ravenof-text-secondary)', padding: '1px 4px' }}>{score}</span>
      <button onClick={onDown} aria-label={fl('decks.community.voteDown')} className="ravenof-press flex items-center justify-center" style={{ width: 32, height: 26, cursor: 'pointer', background: my === -1 ? 'rgba(180,68,79,0.14)' : 'none', border: 0, color: my === -1 ? '#c65563' : 'var(--ravenof-text-secondary)' }}><ChevronDown style={{ width: 16, height: 16 }} /></button>
    </div>
  )
}

// ── Detali peržiūra: kortos + komentarai ─────────────────────────────────────
function DeckDetail({ d, userId, isAdmin, busy, myVote, onVote, onCopy, onClose, flash }: {
  d: CDeck; userId: string; isAdmin: boolean; busy: boolean; myVote: number
  onVote: (v: 1 | -1) => void; onCopy: () => void; onClose: () => void
  flash: (m: string, err?: boolean) => void
}) {
  const fl = useT()
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
    setComments(rows.map((r) => ({ id: r.id, userId: r.user_id, author: r.profile?.display_name || r.profile?.username || tGlobal('battle.player'), body: r.body, created: r.created_at, votes: sums[r.id] ?? 0, myVote: mine[r.id] ?? 0, removed: false })))
  }, [d.id, userId])

  useEffect(() => { loadComments() }, [loadComments])

  const send = async () => {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true); playUiClick()
    const supabase = createClient()
    const { error } = await supabase.from('deck_comments').insert({ deck_id: d.id, user_id: userId, body })
    setSending(false)
    if (error) { flash(fl('decks.community.sendFailed'), true); return }
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
      flash(fl('decks.community.voteFailed'), true)
    }
  }

  const reportComment = async (c: Comment) => {
    playUiClick()
    const supabase = createClient()
    const { error } = await supabase.from('deck_comment_reports').upsert({ comment_id: c.id, user_id: userId })
    if (error) flash(fl('decks.community.reportFailed'), true)
    else flash(fl('decks.community.reported'))
  }

  const removeComment = async (c: Comment) => {
    playUiClick()
    const supabase = createClient()
    const newStatus = isAdmin && c.userId !== userId ? 'hidden' : 'deleted'
    const { error } = await supabase.from('deck_comments').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', c.id)
    if (error) { flash(fl('decks.community.removeFailed'), true); return }
    setComments((cs) => (cs ?? []).filter((x) => x.id !== c.id))
    flash(fl('decks.community.removed'))
  }

  return (
    <div className="ravenof-body fixed inset-0 z-[160] flex items-end sm:items-center justify-center" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div className="w-full sm:w-[min(480px,94vw)] flex flex-col overflow-hidden" style={{ maxHeight: '90vh', border: `1px solid ${d.factionColor}`, background: 'var(--ravenof-bg-surface)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--ravenof-border-hairline)' }}>
          <VoteBox score={d.score} my={myVote} onUp={() => onVote(1)} onDown={() => onVote(-1)} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate" style={{ font: '700 14px var(--ravenof-font-display)', color: 'var(--ravenof-gold)', margin: 0 }}>{d.name}</h2>
            <p style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: 0 }}>{fl('decks.community.byAuthor', { name: d.author })} · {fl('decks.cardsShort', { count: d.total })}</p>
          </div>
          <button onClick={() => { playUiClick(); onClose() }} className="ravenof-iconbtn shrink-0" style={{ width: 30, height: 30 }} aria-label={fl('common.close')}><X className="w-4 h-4" /></button>
        </div>

        {/* Tabai */}
        <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--ravenof-border-hairline)' }}>
          {([['cards', `${fl('decks.community.tabCards')} · ${d.total}`], ['comments', `${fl('decks.community.tabComments')}${comments ? ` · ${comments.length}` : ''}`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => { playUiClick(); setTab(k) }} className="ravenof-press flex-1" style={{ cursor: 'pointer', font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', padding: '10px 4px', border: 0,
              background: tab === k ? 'var(--ravenof-bg-surface-2)' : 'transparent',
              color: tab === k ? 'var(--ravenof-gold)' : 'var(--ravenof-text-secondary)',
              boxShadow: tab === k ? 'inset 0 -2px 0 var(--ravenof-gold)' : 'none' }}>{label}</button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll px-4 py-3" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tab === 'cards' ? (
            d.entries.map((e) => {
              const have = Math.min(e.owned, e.qty); const ok = e.owned >= e.qty; const col = ravenofRarityColor(e.rarity)
              return (
                <div key={e.cardId} className="flex items-center gap-2.5 shrink-0" style={{ padding: 6, background: 'var(--ravenof-bg-surface-2)', border: `1px solid ${ok ? col + '55' : 'var(--ravenof-border-hairline)'}`, borderLeft: `3px solid ${ok ? col : '#3d3345'}` }}>
                  <span className="relative block overflow-hidden shrink-0" style={{ width: 34, height: 34, border: `1px solid ${ok ? col : 'var(--ravenof-border-strong)'}` }}>
                    {e.image
                      ? <SmartImg src={e.image} width={96} className="absolute inset-0 w-full h-full object-cover" style={{ filter: ok ? undefined : 'grayscale(1) brightness(0.5)' }} />
                      : <span className="absolute inset-0 flex items-center justify-center text-xs" style={{ background: 'var(--ravenof-bg-elevated)' }}>🎴</span>}
                    {!ok && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.7)' }} /></span>}
                  </span>
                  <span className="flex items-center justify-center shrink-0 tabular-nums" style={{ width: 20, height: 20, font: '800 9.5px var(--ravenof-font-body)', background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }}>{e.gold}</span>
                  <span className="flex-1 min-w-0 truncate" style={{ font: '600 12px var(--ravenof-font-body)', color: ok ? 'var(--ravenof-text-primary)' : 'var(--ravenof-text-secondary)' }}>{e.name}</span>
                  <span className="tabular-nums shrink-0" style={{ font: '700 11px var(--ravenof-font-body)', color: ok ? 'var(--ravenof-success)' : '#c65563' }}>{have}/{e.qty}</span>
                </div>
              )
            })
          ) : (
            <>
              {comments === null && <p className="text-center py-8" style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{fl('common.loading')}</p>}
              {comments?.length === 0 && <p className="text-center py-8" style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{fl('decks.community.noComments')}</p>}
              {comments?.map((c) => (
                <div key={c.id} className="shrink-0" style={{ padding: '9px 11px', background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)' }}>
                  <div className="flex items-center gap-2">
                    <span className="truncate" style={{ font: '700 11.5px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{c.author}</span>
                    <span className="shrink-0" style={{ font: '400 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{timeAgo(c.created)}</span>
                    <span className="flex-1" />
                    {(isAdmin || c.userId === userId) && <button onClick={() => removeComment(c)} aria-label={fl('decks.community.remove')} className="ravenof-press flex items-center justify-center shrink-0" style={{ width: 26, height: 26, cursor: 'pointer', background: 'none', border: 0, color: '#c65563' }}><Trash2 className="w-3.5 h-3.5" /></button>}
                    {c.userId !== userId && <button onClick={() => reportComment(c)} aria-label={fl('decks.community.report')} className="ravenof-press flex items-center justify-center shrink-0" style={{ width: 26, height: 26, cursor: 'pointer', background: 'none', border: 0, color: 'var(--ravenof-text-secondary)' }}><Flag className="w-3.5 h-3.5" /></button>}
                  </div>
                  <p style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)', wordBreak: 'break-word', margin: '4px 0 0', lineHeight: 1.4 }}>{c.body}</p>
                  <div className="flex items-center gap-1" style={{ marginTop: 6 }}>
                    <button onClick={() => voteComment(c, 1)} className="ravenof-press flex items-center justify-center" style={{ width: 26, height: 24, cursor: 'pointer', background: 'none', border: 0, color: c.myVote === 1 ? 'var(--ravenof-success)' : 'var(--ravenof-text-secondary)' }} aria-label={fl('decks.community.voteUp')}><ChevronUp className="w-4 h-4" /></button>
                    <span className="tabular-nums" style={{ font: '700 11px var(--ravenof-font-body)', color: c.votes > 0 ? 'var(--ravenof-success)' : c.votes < 0 ? '#c65563' : 'var(--ravenof-text-secondary)', minWidth: 16, textAlign: 'center' }}>{c.votes}</span>
                    <button onClick={() => voteComment(c, -1)} className="ravenof-press flex items-center justify-center" style={{ width: 26, height: 24, cursor: 'pointer', background: 'none', border: 0, color: c.myVote === -1 ? '#c65563' : 'var(--ravenof-text-secondary)' }} aria-label={fl('decks.community.voteDown')}><ChevronDown className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid var(--ravenof-border-hairline)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          {tab === 'comments' ? (
            <div className="flex items-end gap-2">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 1000))} placeholder={fl('decks.community.commentPlaceholder')} rows={1}
                className="ravenof-field flex-1 resize-none" style={{ minHeight: 40, maxHeight: 96 }} />
              <button onClick={send} disabled={!draft.trim() || sending} aria-label={fl('decks.community.send')} className="ravenof-press flex items-center justify-center shrink-0 disabled:opacity-40"
                style={{ width: 42, height: 42, cursor: 'pointer', background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', border: 0, clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)' }}><Send style={{ width: 17, height: 17 }} /></button>
            </div>
          ) : (
            <>
              <p className="text-center" style={{ font: '600 11px var(--ravenof-font-body)', color: d.missing === 0 ? 'var(--ravenof-success)' : '#c65563', margin: '0 0 8px' }}>{d.missing === 0 ? fl('decks.community.haveAll') : fl('decks.community.missingInfo', { count: d.missing })}</p>
              <button onClick={onCopy} disabled={busy} className="ravenof-press w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ minHeight: 44, cursor: 'pointer', font: '800 13px var(--ravenof-font-display)', letterSpacing: 2, textTransform: 'uppercase', background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', border: 0, clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)', boxShadow: 'var(--ravenof-shadow-gold-btn)' }}>
                <Copy className="w-4 h-4" /> {fl('decks.community.copyFull')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
