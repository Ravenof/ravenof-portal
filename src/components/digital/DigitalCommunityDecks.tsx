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
import { Search, Eye, Copy, Lock, X, ChevronUp, ChevronDown, Flag, Trash2, Send, LayoutGrid, List as ListIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { ravenofRarityColor } from '@/components/digital/ui/RavenofKit'
import { SmartImg } from '@/components/ui/SmartImg'
import { useT, useGameContent, useCardI18n } from '@/lib/i18n/react'
import { t as tGlobal } from '@/lib/i18n/core'
import { isDeckSizeValid, formatDeckCount } from '@/lib/deck-validation'
import { useDesktopUi } from './ui/useDesktopUi'
import { DT } from './ui/deskTokens'
import { useDialogFocus } from './ui/DeskKit'
import { DECKS_VISIBLE_OR } from '@/lib/game/hiddenFactions'
import { ravenofFactionIcon } from '@/components/digital/ui/RavenofKit'
import { useCosmetics, cosmeticVisual, DEFAULT_AVATAR_ID } from '@/lib/digital/cosmeticsStore'
import { useStarterBoxes } from '@/lib/digital/useStarterBoxes'

type Entry = { cardId: string; name: string; image: string | null; gold: number; rarity: string | null; qty: number; owned: number; champ: boolean }
type CDeck = {
  id: string; name: string; author: string; faction: string | null; factionColor: string
  factionId: number | null; factionSlug: string | null; avatarId: string | null; avatarUrl: string | null
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
// Desktop: 42px valdikliai, 15px tekstas
const FIELD_D: React.CSSProperties = { ...FIELD, minHeight: DT.ctl, padding: '0 12px', font: `400 ${DT.fs.body}px var(--ravenof-font-body)` }

export function DigitalCommunityDecks({ userId }: { userId: string }) {
  const gc = useGameContent()
  const boxes = useStarterBoxes()
  const cosItems = useCosmetics((s) => s.items)
  useEffect(() => { void useCosmetics.getState().refresh() }, [])
  // Kūrėjo dabar (ar paskutinį kartą) pasirinktas žaidėjo avataras
  const avatarOf = useCallback((d: CDeck) => cosmeticVisual({ items: cosItems }, d.avatarId ?? DEFAULT_AVATAR_ID, 'avatar').url ?? d.avatarUrl ?? null, [cosItems])
  const t = useT()
  const { desktop: D } = useDesktopUi()
  const F = D ? FIELD_D : FIELD
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
      .select('id, name, faction_id, card_count, score, user_id, updated_at, faction:factions ( name, color_hex, slug )')
      .eq('visibility', 'public').or(DECKS_VISIBLE_OR).order('score', { ascending: false }).limit(60)
    type DR = { id: string; name: string; faction_id: number | null; card_count: number; score: number; user_id: string; updated_at: string; faction: { name: string; color_hex: string; slug: string | null } | null }
    const rows = (deckRows as unknown as DR[]) ?? []
    const ids = rows.map((d) => d.id)
    const uids = [...new Set(rows.map((d) => d.user_id))]
    const [{ data: profs }, { data: col }, { data: dcs }, { data: votes }, { data: me }] = await Promise.all([
      uids.length ? supabase.from('profiles').select('id, username, display_name, equipped_avatar, avatar_url').in('id', uids) : Promise.resolve({ data: [] }),
      supabase.from('user_collections').select('card_id, quantity').eq('user_id', userId),
      ids.length ? supabase.from('deck_cards').select('deck_id, card_id, quantity, card:cards ( name, image_url, gold_cost, is_champion, rarity:rarities ( name ) )').in('deck_id', ids) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('deck_votes').select('deck_id, vote').eq('user_id', userId).in('deck_id', ids) : Promise.resolve({ data: [] }),
      supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    ])
    setIsAdmin(((me as { role?: string } | null)?.role) === 'admin')
    setMyVotes(Object.fromEntries(((votes as { deck_id: string; vote: number }[]) ?? []).map((v) => [v.deck_id, v.vote])))
    type PR = { id: string; username: string; display_name: string | null; equipped_avatar: string | null; avatar_url: string | null }
    const profRows = (profs as PR[]) ?? []
    const nameOf: Record<string, string> = Object.fromEntries(profRows.map((p) => [p.id, p.display_name || p.username]))
    const profOf: Record<string, PR> = Object.fromEntries(profRows.map((p) => [p.id, p]))
    const owned: Record<string, number> = Object.fromEntries(((col as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
    type DCR = { deck_id: string; card_id: string; quantity: number; card: { name: string; image_url: string | null; gold_cost: number; is_champion: boolean | null; rarity: { name: string | null } | null } | null }
    const byDeck: Record<string, Entry[]> = {}
    for (const r of ((dcs as unknown as DCR[]) ?? [])) {
      if (!r.card) continue
      ;(byDeck[r.deck_id] ??= []).push({ cardId: r.card_id, name: r.card.name, image: r.card.image_url, gold: r.card.gold_cost, rarity: r.card.rarity?.name ?? null, qty: r.quantity, owned: owned[r.card_id] ?? 0, champ: !!r.card.is_champion })
    }
    setDecks(rows.map((d) => {
      const entries = (byDeck[d.id] ?? []).sort((a, b) => a.gold - b.gold || a.name.localeCompare(b.name))
      const total = entries.reduce((s, e) => s + e.qty, 0)
      const have = entries.reduce((s, e) => s + Math.min(e.owned, e.qty), 0)
      return { id: d.id, name: d.name, author: nameOf[d.user_id] ?? tGlobal('battle.player'), faction: d.faction?.name ?? null, factionColor: d.faction?.color_hex ?? '#D4A33B',
        factionId: d.faction_id, factionSlug: d.faction?.slug ?? null, avatarId: profOf[d.user_id]?.equipped_avatar ?? null, avatarUrl: profOf[d.user_id]?.avatar_url ?? null, cardCount: d.card_count, score: d.score ?? 0, updated: d.updated_at, entries, total, have, missing: total - have }
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
    // Netinkamo dydžio (ne 30–40) kalados kopijuoti negalima — serveris irgi atmes
    if (!isDeckSizeValid(d.total)) { flash(t('decks.invalidSizeHint'), true); return }
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
    <div className="ravenof-body ravenof-in flex flex-col" style={{ gap: D ? DT.sp.lg : 8, paddingBottom: D ? DT.sp.xl : undefined }}>
      <style>{CD_CSS}</style>
      {/* ── Įrankių juosta ── */}
      <div className="flex items-center flex-wrap" style={{ gap: D ? DT.sp.sm : 6 }}>
        <div className="relative flex-1" style={{ minWidth: D ? 260 : 160 }}>
          <Search className={`absolute top-1/2 -translate-y-1/2 ${D ? 'left-3' : 'left-2.5'}`} style={{ width: D ? 17 : 13, height: D ? 17 : 13, color: 'var(--ravenof-text-secondary)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('decks.community.searchPlaceholder')} aria-label={t('decks.community.searchPlaceholder')} className="w-full" style={{ ...F, paddingLeft: D ? 38 : 28 }} />
        </div>
        <select value={faction} onChange={(e) => setFaction(e.target.value)} style={{ ...F, maxWidth: D ? 240 : 160 }}>
          <option value="all">{t('decks.community.allFactions')}</option>
          {factions.map((f) => <option key={f.name} value={f.name}>{gc.faction(f.name)}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ ...F, maxWidth: D ? 240 : 140 }}>
          <option value="score">{t('decks.community.sortTop')}</option>
          <option value="new">{t('decks.community.sortNew')}</option>
          <option value="cards">{t('decks.community.sortCards')}</option>
        </select>
        <button onClick={() => { playUiClick(); setCraftableOnly((v) => !v) }} aria-pressed={craftableOnly} className={`ravenof-press inline-flex items-center gap-2 ${D ? 'px-4' : 'px-3'}`}
          style={{ minHeight: D ? DT.ctl : 34, cursor: 'pointer', font: `700 ${D ? 12.5 : 10.5}px var(--ravenof-font-body)`, textTransform: 'uppercase', letterSpacing: 1,
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
        <p className="text-center py-12" style={{ font: `400 ${D ? DT.fs.body : 13}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('decks.community.noneFound')}</p>
      ) : (
        <div className="grid" style={D
          /* Desktop: adaptyvūs stulpeliai su min/max (kortelės neauga be ribos) */
          ? { gap: DT.sp.lg, gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', alignContent: 'start' }
          : { gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {shown.map((d, idx) => (
            <CommunityDeckCard key={d.id} d={d} desktop={D} rank={sort === 'score' && idx < 3 ? idx + 1 : 0}
              box={d.factionId != null ? boxes[d.factionId] ?? null : null} avatar={avatarOf(d)}
              myVote={myVotes[d.id] ?? 0} onVote={(v) => vote(d, v)} busy={busy}
              onPreview={() => { playUiClick(); setDetail(d) }} onCopy={() => copyDeck(d)} />
          ))}
        </div>
      )}

      {detail && (
        <DeckDetail desktop={D} d={detail} userId={userId} isAdmin={isAdmin} busy={busy}
          box={detail.factionId != null ? boxes[detail.factionId] ?? null : null} avatar={avatarOf(detail)}
          myVote={myVotes[detail.id] ?? 0}
          onVote={(v) => vote(detail, v)}
          onCopy={() => copyDeck(detail)}
          onClose={() => setDetail(null)}
          flash={flash} />
      )}

      {toast && <div className="ravenof-toast" role="status" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))', zIndex: 170 }}>{toast}</div>}
    </div>
  )
}

/** TOP-3 ženklinimas romėnišku numeriu (patvirtinta kalba — be emoji medalių). */
function toRomanRank(n: number): string { return ['I', 'II', 'III'][n - 1] ?? String(n) }

const CD_CSS = `
.rvn-cd{position:relative;display:flex;gap:14px;min-width:0;border-radius:8px;cursor:pointer;
  background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,var(--c) 20%,transparent) 0%,transparent 55%),linear-gradient(180deg,rgba(24,18,34,.94),rgba(12,9,18,.96));
  border:1px solid color-mix(in srgb,var(--c) 28%,rgba(255,255,255,.06));box-shadow:0 10px 28px rgba(0,0,0,.45);
  transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .25s,box-shadow .25s}
.rvn-cd:hover,.rvn-cd:focus-within{transform:translateY(-3px);border-color:color-mix(in srgb,var(--c) 65%,transparent);box-shadow:0 16px 36px rgba(0,0,0,.6),0 0 28px color-mix(in srgb,var(--c) 22%,transparent)}
.rvn-cd-box{position:relative;flex:0 0 auto;aspect-ratio:1/1.53;align-self:center}
.rvn-cd-art{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 12px 14px rgba(0,0,0,.75)) drop-shadow(0 0 10px color-mix(in srgb,var(--c) 35%,transparent));transition:transform .3s cubic-bezier(.2,.8,.2,1),filter .3s;z-index:1}
.rvn-cd:hover .rvn-cd-art{transform:translateY(-5px) scale(1.04);filter:drop-shadow(0 18px 20px rgba(0,0,0,.8)) drop-shadow(0 0 18px color-mix(in srgb,var(--c) 70%,transparent))}
.rvn-cd-disc{position:absolute;left:-15%;right:-15%;bottom:-8%;height:20%;border-radius:50%;background:radial-gradient(ellipse,var(--c) 0%,transparent 70%);opacity:.35;filter:blur(6px);transition:opacity .3s}
.rvn-cd:hover .rvn-cd-disc{opacity:.8}
.rvn-cd-tile{position:absolute;inset:0;border-radius:5px;display:grid;place-items:center;border:1.5px solid color-mix(in srgb,var(--c) 60%,transparent);background:radial-gradient(120% 90% at 50% 25%,color-mix(in srgb,var(--c) 30%,transparent),rgba(10,8,16,.98) 72%);z-index:1}
.rvn-cd-med{position:absolute;left:50%;bottom:5%;width:32%;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,#1a1325,#0a0810);border:1.5px solid var(--c);box-shadow:0 0 10px var(--c);display:grid;place-items:center;z-index:2;transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.rvn-cd:hover .rvn-cd-med{transform:translateX(-50%) translateY(-5px)}
.rvn-cd-med img{width:70%;height:70%;object-fit:contain}
.rvn-cd-rank{position:absolute;top:-1px;left:14px;z-index:3;font:800 12px var(--ravenof-font-display);letter-spacing:.08em;padding:3px 9px 4px;color:#1a0f04;clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%);box-shadow:0 4px 10px rgba(0,0,0,.5)}
.rvn-cd-chip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:2px 9px;white-space:nowrap}
.rvn-cd-av{border-radius:50%;overflow:hidden;flex:0 0 auto;border:1.5px solid rgba(212,163,59,.75);background:radial-gradient(circle,#2a2035,#0e0a16);box-shadow:0 0 0 2px rgba(0,0,0,.45)}
.rvn-cd-av img{width:100%;height:100%;object-fit:cover;display:block}
.rvn-cd-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:6px;cursor:pointer;text-transform:uppercase;letter-spacing:1.2px;transition:background .2s,border-color .2s,color .2s}
.rvn-cd-btn.ghost{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:var(--ravenof-text-primary)}
.rvn-cd-btn.ghost:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.25)}
.rvn-cd-btn.gold{background:linear-gradient(180deg,rgba(212,163,59,.22),rgba(212,163,59,.1));border:1px solid rgba(212,163,59,.55);color:var(--ravenof-gold-bright)}
.rvn-cd-btn.gold:hover:not(:disabled){background:linear-gradient(180deg,rgba(212,163,59,.34),rgba(212,163,59,.16));border-color:var(--ravenof-gold-bright)}
.rvn-cd-btn:disabled{opacity:.4;cursor:default}
.rvn-vp{display:inline-flex;align-items:center;border-radius:999px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1);overflow:hidden}
.rvn-vp button{display:flex;align-items:center;justify-content:center;background:none;border:0;cursor:pointer;color:var(--ravenof-text-secondary);transition:background .15s,color .15s}
.rvn-vp button:hover{background:rgba(255,255,255,.07)}
.rvn-vp button.up.on{color:var(--ravenof-success);background:rgba(79,158,82,.16)}
.rvn-vp button.down.on{color:#e0707e;background:rgba(180,68,79,.16)}
.rvn-dv-grid{display:grid;align-content:start}
.rvn-dv-card{position:relative;aspect-ratio:1044/1416;border-radius:7px;overflow:visible;cursor:zoom-in;background:none;border:0;padding:0;transition:transform .2s cubic-bezier(.2,.8,.2,1)}
.rvn-dv-card:hover{transform:translateY(-4px) scale(1.03);z-index:2}
.rvn-dv-card img.rvn-dv-img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 8px 14px rgba(0,0,0,.65))}
.rvn-dv-qty{position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);font:800 12px var(--ravenof-font-display);padding:1px 9px;border-radius:999px;background:var(--ravenof-grad-gold);color:var(--ravenof-on-gold);box-shadow:0 3px 8px rgba(0,0,0,.6);z-index:3}
.rvn-dv-miss{position:absolute;top:6px;right:6px;font:800 10.5px var(--ravenof-font-body);padding:1px 6px;border-radius:4px;background:rgba(120,20,30,.92);border:1px solid #c65563;color:#ffb0b8;z-index:3}
.rvn-dv-row{display:flex;align-items:center;min-width:0;border-radius:7px;cursor:zoom-in;text-align:left;transition:filter .15s}
.rvn-dv-row:hover{filter:brightness(1.18)}
.rvn-dv-seg{display:inline-flex;border:1px solid rgba(255,255,255,.12);border-radius:8px;overflow:hidden}
.rvn-dv-seg button{display:flex;align-items:center;justify-content:center;background:none;border:0;cursor:pointer;color:var(--ravenof-text-secondary)}
.rvn-dv-seg button[aria-pressed="true"]{background:rgba(212,163,59,.18);color:var(--ravenof-gold-bright)}
@media (prefers-reduced-motion: reduce){.rvn-cd,.rvn-cd-art,.rvn-cd-med,.rvn-dv-card{transition:none}}
`

function VotePill({ score, my, onUp, onDown, desktop = false }: { score: number; my: number; onUp: () => void; onDown: () => void; desktop?: boolean }) {
  const fl = useT()
  const bw = desktop ? 32 : 26, bh = desktop ? 30 : 26, ic = desktop ? 17 : 14
  return (
    <span className="rvn-vp" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onUp} aria-label={fl('decks.community.voteUp')} aria-pressed={my === 1} className={'up' + (my === 1 ? ' on' : '')} style={{ width: bw, height: bh }}><ChevronUp style={{ width: ic, height: ic }} /></button>
      <span className="tabular-nums text-center" style={{ minWidth: desktop ? 26 : 20, font: `800 ${desktop ? 14 : 12}px var(--ravenof-font-display)`, color: score > 0 ? 'var(--ravenof-gold-bright)' : score < 0 ? '#e0707e' : 'var(--ravenof-text-secondary)' }}>{score}</span>
      <button type="button" onClick={onDown} aria-label={fl('decks.community.voteDown')} aria-pressed={my === -1} className={'down' + (my === -1 ? ' on' : '')} style={{ width: bw, height: bh }}><ChevronDown style={{ width: ic, height: ic }} /></button>
    </span>
  )
}

function DeckBox({ box, slug, width }: { box: string | null; slug: string | null; width: number }) {
  const [bad, setBad] = useState(false)
  return (
    <span className="rvn-cd-box" style={{ width }}>
      <span className="rvn-cd-disc" />
      {box && !bad
        ? <><SmartImg src={box} width={260} alt="" className="rvn-cd-art" onFail={() => setBad(true)} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="rvn-cd-med"><img src={ravenofFactionIcon(slug)} alt="" draggable={false} /></span></>
        // eslint-disable-next-line @next/next/no-img-element
        : <span className="rvn-cd-tile"><img src={ravenofFactionIcon(slug)} alt="" draggable={false} style={{ width: '46%', height: '46%', objectFit: 'contain' }} /></span>}
    </span>
  )
}

function AuthorChip({ name, avatar, desktop }: { name: string; avatar: string | null; desktop: boolean }) {
  const [bad, setBad] = useState(false)
  const sz = desktop ? 26 : 22
  return (
    <span className="flex items-center min-w-0" style={{ gap: 7 }}>
      <span className="rvn-cd-av" style={{ width: sz, height: sz }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {avatar && !bad ? <img src={avatar} alt="" draggable={false} onError={() => setBad(true)} /> : <span className="flex items-center justify-center w-full h-full" style={{ fontSize: sz * 0.5, color: 'var(--ravenof-gold)' }}>{name.slice(0, 1).toUpperCase()}</span>}
      </span>
      <span className="truncate" style={{ font: `600 ${desktop ? 13.5 : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{name}</span>
    </span>
  )
}

function CommunityDeckCard({ d, desktop: D, rank, box, avatar, myVote, onVote, busy, onPreview, onCopy }: {
  d: CDeck; desktop: boolean; rank: number; box: string | null; avatar: string | null; myVote: number
  onVote: (v: 1 | -1) => void; busy: boolean; onPreview: () => void; onCopy: () => void
}) {
  const t = useT()
  const gc = useGameContent()
  const sizeOk = isDeckSizeValid(d.total)
  const fs = D ? 11.5 : 10
  return (
    <div className="rvn-cd" style={{ ['--c' as string]: d.factionColor, padding: D ? '16px 16px 14px 14px' : '12px 12px 10px 10px', gap: D ? 16 : 12 }}
      onClick={onPreview} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onPreview() }} aria-label={d.name}>
      {rank > 0 && <span className="rvn-cd-rank" style={{ background: ['linear-gradient(180deg,#ffe28c,#d4a33b)', 'linear-gradient(180deg,#eef2f6,#9aa6b4)', 'linear-gradient(180deg,#e7a96a,#9c5f2c)'][rank - 1] }}>{toRomanRank(rank)}</span>}
      <DeckBox box={box} slug={d.factionSlug} width={D ? 92 : 70} />
      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: D ? 8 : 6 }}>
        <h2 className="rvn-clamp2" title={d.name} style={{ font: `700 ${D ? 17 : 14}px/1.2 var(--ravenof-font-display)`, letterSpacing: 0.4, color: 'var(--ravenof-text-primary)', margin: 0 }}>{d.name}</h2>
        <AuthorChip name={d.author} avatar={avatar} desktop={D} />
        <div className="flex flex-wrap items-center" style={{ gap: 5 }}>
          {d.faction && <span className="rvn-cd-chip" style={{ font: `600 ${fs}px var(--ravenof-font-body)`, color: d.factionColor, background: `color-mix(in srgb, ${d.factionColor} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${d.factionColor} 40%, transparent)` }}>{gc.faction(d.faction)}</span>}
          <span className="rvn-cd-chip" title={sizeOk ? undefined : t('decks.invalidSizeHint')} style={{ font: `700 ${fs}px var(--ravenof-font-body)`, color: sizeOk ? 'var(--ravenof-text-secondary)' : 'var(--ravenof-danger-bright)', background: 'rgba(255,255,255,.04)', border: `1px solid ${sizeOk ? 'rgba(255,255,255,.1)' : '#8D2D38'}` }}>
            {formatDeckCount(d.total)}{sizeOk ? '' : ` · ${t('decks.invalidBadge')}`}
          </span>
          <span className="rvn-cd-chip" style={{ font: `700 ${fs}px var(--ravenof-font-body)`, color: d.missing === 0 ? 'var(--ravenof-success)' : 'var(--ravenof-gold)', background: d.missing === 0 ? 'rgba(79,158,82,.12)' : 'rgba(212,163,59,.08)', border: `1px solid ${d.missing === 0 ? '#4F9E5266' : 'rgba(212,163,59,.35)'}` }}>
            {d.missing === 0 ? `✓ ${t('decks.community.haveAllShort')}` : t('decks.community.haveOf', { have: d.have, total: d.total })}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 8, marginTop: 'auto', paddingTop: 2 }}>
          <VotePill desktop={D} score={d.score} my={myVote} onUp={() => onVote(1)} onDown={() => onVote(-1)} />
          <span className="flex-1" />
          <button type="button" onClick={(e) => { e.stopPropagation(); onPreview() }} className="rvn-cd-btn ghost" aria-label={t('decks.community.preview')}
            style={{ height: D ? 34 : 30, padding: D ? '0 12px' : '0 9px', font: `700 ${D ? 11.5 : 10}px var(--ravenof-font-display)` }}>
            <Eye className="w-3.5 h-3.5" />{D && t('decks.community.preview')}
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onCopy() }} disabled={busy || !sizeOk} title={sizeOk ? undefined : t('decks.invalidSizeHint')} className="rvn-cd-btn gold"
            style={{ height: D ? 34 : 30, padding: D ? '0 14px' : '0 10px', font: `700 ${D ? 11.5 : 10}px var(--ravenof-font-display)` }}>
            <Copy className="w-3.5 h-3.5" /> {t('decks.community.copy')}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeckDetail({ d, userId, isAdmin, busy, myVote, onVote, onCopy, onClose, flash, box, avatar, desktop: D = false }: {
  desktop?: boolean; box: string | null; avatar: string | null
  d: CDeck; userId: string; isAdmin: boolean; busy: boolean; myVote: number
  onVote: (v: 1 | -1) => void; onCopy: () => void; onClose: () => void
  flash: (m: string, err?: boolean) => void
}) {
  const fl = useT()
  const [tab, setTab] = useState<'cards' | 'comments'>('cards')
  const gc = useGameContent()
  const ci = useCardI18n()
  // Kortų vaizdas: grid (pilnos kortos) arba sąrašas (kaip builderyje); prisimenam pasirinkimą
  const [view, setView] = useState<'grid' | 'list'>(() => { try { return localStorage.getItem('rvn-cd-view') === 'list' ? 'list' : 'grid' } catch { return 'grid' } })
  const pickView = (v: 'grid' | 'list') => { playUiClick(); setView(v); try { localStorage.setItem('rvn-cd-view', v) } catch { /* */ } }
  const [zoom, setZoom] = useState<Entry | null>(null)
  useEffect(() => {
    if (!zoom) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); setZoom(null) } }
    window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true)
  }, [zoom])
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  // Desktop: Escape + fokuso gaudyklė + fokuso grąžinimas
  const dlgRef = useDialogFocus<HTMLDivElement>(onClose, D)

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
      <div ref={dlgRef} role={D ? 'dialog' : undefined} aria-modal={D ? true : undefined} aria-label={D ? d.name : undefined} tabIndex={D ? -1 : undefined}
        className={`w-full flex flex-col overflow-hidden ${D ? 'sm:w-[min(1080px,94vw)] outline-none' : 'sm:w-[min(640px,96vw)]'}`} style={{ height: D ? 'min(88vh, 920px)' : '92vh', maxHeight: '92vh', borderRadius: D ? 10 : 0, border: `1px solid color-mix(in srgb, ${d.factionColor} 55%, transparent)`, background: `radial-gradient(90% 60% at 0% 0%, color-mix(in srgb, ${d.factionColor} 18%, transparent) 0%, transparent 60%), linear-gradient(180deg, #17111f, #0c0912)`, boxShadow: `0 24px 70px rgba(0,0,0,0.85), 0 0 40px color-mix(in srgb, ${d.factionColor} 18%, transparent)`, ['--c' as string]: d.factionColor }} onClick={(e) => e.stopPropagation()}>
        <style>{CD_CSS}</style>
        <div className={`flex items-center shrink-0 ${D ? 'gap-4 px-6 pt-5 pb-4' : 'gap-3 px-4 py-3'}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="rvn-cd" style={{ background: 'none', border: 0, boxShadow: 'none', cursor: 'default', transform: 'none' }}><DeckBox box={box} slug={d.factionSlug} width={D ? 74 : 52} /></span>
          <div className="min-w-0 flex-1 flex flex-col" style={{ gap: D ? 7 : 4 }}>
            <h2 className={D ? 'rvn-clamp2' : 'truncate'} style={{ font: D ? '700 22px/1.2 var(--ravenof-font-display)' : '700 15px var(--ravenof-font-display)', color: 'var(--ravenof-gold-bright)', margin: 0 }}>{d.name}</h2>
            <div className="flex items-center flex-wrap" style={{ gap: D ? 10 : 6 }}>
              <AuthorChip name={d.author} avatar={avatar} desktop={D} />
              {d.faction && <span className="rvn-cd-chip" style={{ font: `600 ${D ? 11.5 : 10}px var(--ravenof-font-body)`, color: d.factionColor, background: `color-mix(in srgb, ${d.factionColor} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${d.factionColor} 40%, transparent)` }}>{gc.faction(d.faction)}</span>}
              <span className="rvn-cd-chip" style={{ font: `700 ${D ? 11.5 : 10}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}>{formatDeckCount(d.total)}</span>
            </div>
          </div>
          <VotePill desktop={D} score={d.score} my={myVote} onUp={() => onVote(1)} onDown={() => onVote(-1)} />
          <button onClick={() => { playUiClick(); onClose() }} data-dlg-close="1" className="ravenof-iconbtn shrink-0" style={{ width: D ? DT.ctl : 32, height: D ? DT.ctl : 32 }} aria-label={fl('common.close')}><X className={D ? 'w-5 h-5' : 'w-4 h-4'} /></button>
        </div>

        {/* Tabai */}
        <div className="flex items-stretch shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {([['cards', `${fl('decks.community.tabCards')} · ${d.total}`], ['comments', `${fl('decks.community.tabComments')}${comments ? ` · ${comments.length}` : ''}`]] as const).map(([k, label]) => (
            <button key={k} onClick={() => { playUiClick(); setTab(k) }} aria-pressed={tab === k} className="ravenof-press flex-1" style={{ cursor: 'pointer', font: `700 ${D ? 13 : 11}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase', padding: '10px 4px', minHeight: D ? DT.ctl : undefined, border: 0,
              background: tab === k ? 'var(--ravenof-bg-surface-2)' : 'transparent',
              color: tab === k ? 'var(--ravenof-gold)' : 'var(--ravenof-text-secondary)',
              boxShadow: tab === k ? 'inset 0 -2px 0 var(--ravenof-gold)' : 'none' }}>{label}</button>
          ))}
          {tab === 'cards' && (
            <span className="flex items-center shrink-0" style={{ padding: D ? '0 16px' : '0 10px' }}>
              <span className="rvn-dv-seg" role="group">
                <button type="button" aria-pressed={view === 'grid'} aria-label={fl('decks.community.viewGrid')} title={fl('decks.community.viewGrid')} onClick={() => pickView('grid')} style={{ width: D ? 38 : 32, height: D ? 32 : 28 }}><LayoutGrid style={{ width: 16, height: 16 }} /></button>
                <button type="button" aria-pressed={view === 'list'} aria-label={fl('decks.community.viewList')} title={fl('decks.community.viewList')} onClick={() => pickView('list')} style={{ width: D ? 38 : 32, height: D ? 32 : 28 }}><ListIcon style={{ width: 16, height: 16 }} /></button>
              </span>
            </span>
          )}
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto ravenof-scroll ${D ? 'px-6 py-5' : 'px-3 py-3'}`} style={tab === 'cards'
          ? (view === 'grid'
            ? { display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${D ? 150 : 96}px, 1fr))`, gap: D ? '20px 14px' : '14px 8px', alignContent: 'start' }
            : { display: 'grid', gridTemplateColumns: D ? 'repeat(2, minmax(0,1fr))' : 'minmax(0,1fr)', gap: D ? 6 : 4, alignContent: 'start' })
          : (D ? { display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 8, alignContent: 'start' } : { display: 'flex', flexDirection: 'column', gap: 6 })}>
          {tab === 'cards' ? (
            d.entries.map((e) => {
              const ok = e.owned >= e.qty; const col = ravenofRarityColor(e.rarity)
              const nm = ci.name(e.cardId, e.name); const img = ci.image(e.cardId, e.image)
              if (view === 'grid') return (
                <button key={e.cardId} type="button" className="rvn-dv-card" onClick={() => { playUiClick(); setZoom(e) }} aria-label={nm} title={nm}>
                  {img
                    ? <SmartImg src={img} width={D ? 320 : 220} alt={nm} className="rvn-dv-img" style={{ filter: ok ? undefined : 'grayscale(1) brightness(0.45) drop-shadow(0 8px 14px rgba(0,0,0,.65))' }} />
                    : <span className="absolute inset-0 flex items-center justify-center text-center" style={{ padding: 8, borderRadius: 7, border: `1px solid ${col}`, background: '#120d1a', font: `700 ${D ? 13 : 10}px var(--ravenof-font-display)`, color: col }}>{nm}</span>}
                  {!ok && <span className="absolute inset-0 flex items-center justify-center pointer-events-none"><Lock style={{ width: D ? 22 : 16, height: D ? 22 : 16, color: 'rgba(255,255,255,0.8)', filter: 'drop-shadow(0 2px 4px #000)' }} /></span>}
                  {!ok && <span className="rvn-dv-miss">{Math.min(e.owned, e.qty)}/{e.qty}</span>}
                  {e.qty > 1 && <span className="rvn-dv-qty">×{e.qty}</span>}
                </button>
              )
              return (
                <button key={e.cardId} type="button" className="rvn-dv-row" onClick={() => { playUiClick(); setZoom(e) }}
                  style={{ gap: D ? 10 : 8, padding: D ? '6px 10px 6px 8px' : '5px 8px 5px 6px', background: `linear-gradient(90deg, ${col}2b 0%, rgba(10,8,16,0.85) 58%)`, border: `1px solid ${col}44`, borderLeft: `3px solid ${col}`, opacity: ok ? 1 : 0.72 }}>
                  <span className="flex items-center justify-center rounded-full shrink-0 tabular-nums" style={{ width: D ? 30 : 24, height: D ? 30 : 24, font: `800 ${D ? 11 : 9.5}px var(--ravenof-font-body)`, background: 'rgba(212,163,59,0.92)', color: '#1a0f04' }}>{e.gold}</span>
                  <span className="flex-1 min-w-0 truncate" title={D ? nm : undefined} style={{ font: `600 ${D ? 14 : 12.5}px var(--ravenof-font-body)`, color: ok ? 'var(--ravenof-text-primary)' : 'var(--ravenof-text-secondary)' }}>{e.champ ? <span style={{ color: col }}>★ </span> : null}{nm}</span>
                  {!ok && <span className="tabular-nums shrink-0 inline-flex items-center gap-1" style={{ font: `700 ${D ? 12 : 10.5}px var(--ravenof-font-body)`, color: '#e0707e' }}><Lock style={{ width: 11, height: 11 }} />{Math.min(e.owned, e.qty)}/{e.qty}</span>}
                  <span className="font-bold tabular-nums text-center shrink-0" style={{ minWidth: D ? 28 : 22, font: `800 ${D ? 14 : 12}px var(--ravenof-font-display)`, color: 'var(--ravenof-gold-bright)' }}>×{e.qty}</span>
                </button>
              )
            })
          ) : (
            <>
              {comments === null && <p className="text-center py-8" style={{ font: `400 ${D ? DT.fs.body : 12}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{fl('common.loading')}</p>}
              {comments?.length === 0 && <p className="text-center py-8" style={{ font: `400 ${D ? DT.fs.body : 12}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{fl('decks.community.noComments')}</p>}
              {comments?.map((c) => (
                <div key={c.id} className="shrink-0" style={{ padding: D ? '12px 14px' : '9px 11px', background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)' }}>
                  <div className="flex items-center gap-2">
                    <span className="truncate" style={{ font: `700 ${D ? 14 : 11.5}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)' }}>{c.author}</span>
                    <span className="shrink-0" style={{ font: `400 ${D ? DT.fs.label : 9.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{timeAgo(c.created)}</span>
                    <span className="flex-1" />
                    {(isAdmin || c.userId === userId) && <button onClick={() => removeComment(c)} aria-label={fl('decks.community.remove')} className="ravenof-press flex items-center justify-center shrink-0" style={{ width: D ? 36 : 26, height: D ? 36 : 26, cursor: 'pointer', background: 'none', border: 0, color: '#c65563' }}><Trash2 className="w-3.5 h-3.5" /></button>}
                    {c.userId !== userId && <button onClick={() => reportComment(c)} aria-label={fl('decks.community.report')} className="ravenof-press flex items-center justify-center shrink-0" style={{ width: D ? 36 : 26, height: D ? 36 : 26, cursor: 'pointer', background: 'none', border: 0, color: 'var(--ravenof-text-secondary)' }}><Flag className="w-3.5 h-3.5" /></button>}
                  </div>
                  <p style={{ font: `400 ${D ? DT.fs.body : 12}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)', wordBreak: 'break-word', margin: '4px 0 0', lineHeight: 1.4 }}>{c.body}</p>
                  <div className="flex items-center gap-1" style={{ marginTop: 6 }}>
                    <button onClick={() => voteComment(c, 1)} className="ravenof-press flex items-center justify-center" style={{ width: D ? 36 : 26, height: D ? 32 : 24, cursor: 'pointer', background: 'none', border: 0, color: c.myVote === 1 ? 'var(--ravenof-success)' : 'var(--ravenof-text-secondary)' }} aria-label={fl('decks.community.voteUp')}><ChevronUp className="w-4 h-4" /></button>
                    <span className="tabular-nums" style={{ font: `700 ${D ? 13 : 11}px var(--ravenof-font-body)`, color: c.votes > 0 ? 'var(--ravenof-success)' : c.votes < 0 ? '#c65563' : 'var(--ravenof-text-secondary)', minWidth: 16, textAlign: 'center' }}>{c.votes}</span>
                    <button onClick={() => voteComment(c, -1)} className="ravenof-press flex items-center justify-center" style={{ width: D ? 36 : 26, height: D ? 32 : 24, cursor: 'pointer', background: 'none', border: 0, color: c.myVote === -1 ? '#c65563' : 'var(--ravenof-text-secondary)' }} aria-label={fl('decks.community.voteDown')}><ChevronDown className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className={`shrink-0 ${D ? 'px-5 py-4' : 'px-4 py-3'}`} style={{ borderTop: '1px solid var(--ravenof-border-hairline)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          {tab === 'comments' ? (
            <div className="flex items-end gap-2">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 1000))} placeholder={fl('decks.community.commentPlaceholder')} rows={1}
                className="ravenof-field flex-1 resize-none" style={{ minHeight: 40, maxHeight: 96 }} />
              <button onClick={send} disabled={!draft.trim() || sending} aria-label={fl('decks.community.send')} className="ravenof-press flex items-center justify-center shrink-0 disabled:opacity-40"
                style={{ width: 42, height: 42, cursor: 'pointer', background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', border: 0, clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)' }}><Send style={{ width: 17, height: 17 }} /></button>
            </div>
          ) : (
            <>
              <p className="text-center" style={{ font: `600 ${D ? DT.fs.help : 11}px var(--ravenof-font-body)`, color: d.missing === 0 ? 'var(--ravenof-success)' : '#c65563', margin: '0 0 8px' }}>{d.missing === 0 ? fl('decks.community.haveAll') : fl('decks.community.missingInfo', { count: d.missing })}</p>
              {!isDeckSizeValid(d.total) && <p className="text-center" style={{ font: `600 ${D ? DT.fs.help : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-danger-bright)', margin: '0 0 8px' }}>{fl('decks.invalidSizeHint')}</p>}
              <button onClick={onCopy} disabled={busy || !isDeckSizeValid(d.total)} className="ravenof-press w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ minHeight: D ? DT.cta : 44, cursor: 'pointer', font: `800 ${D ? 14 : 13}px var(--ravenof-font-display)`, letterSpacing: 2, textTransform: 'uppercase', background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', border: 0, clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)', boxShadow: 'var(--ravenof-shadow-gold-btn)' }}>
                <Copy className="w-4 h-4" /> {fl('decks.community.copyFull')}
              </button>
            </>
          )}
        </div>
      </div>
      {zoom && (
        <div className="fixed inset-0 z-[190] flex flex-col items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.88)', cursor: 'zoom-out' }} onClick={(e) => { e.stopPropagation(); setZoom(null) }}>
          {ci.image(zoom.cardId, zoom.image)
            ? <SmartImg src={ci.image(zoom.cardId, zoom.image) as string} width={720} alt={ci.name(zoom.cardId, zoom.name)} style={{ height: 'min(80vh, 760px)', width: 'auto', maxWidth: '92vw', objectFit: 'contain', filter: `drop-shadow(0 20px 40px rgba(0,0,0,.8)) drop-shadow(0 0 26px ${ravenofRarityColor(zoom.rarity)}55)` }} />
            : null}
          <p style={{ marginTop: 12, font: '700 15px var(--ravenof-font-display)', color: ravenofRarityColor(zoom.rarity) }}>{ci.name(zoom.cardId, zoom.name)} · ×{zoom.qty}</p>
        </div>
      )}
    </div>
  )
}
