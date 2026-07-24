'use client'

// ── Ravenof Digital — Kova su DI: patvirtintas UI (Fazė 3, pve-default.png) ───
// Full-bleed (be rail): ‹ atgal + KOVA SU DI. 3 stulpeliai:
//  KAIRĖ — TAVO KALADĖ eilutė (→ ActiveDeckSelectorModal), SUDĖTINGUMAS
//  segmented, Numatomas atlygis, raudonas PRADĖTI KOVĄ banner.
//  CENTRAS — VARŽOVAS 2×2 plytelės (atsitiktinė/pasirinkta frakcija/viešas
//  deck/mokymai; esami asset mygtukai — portretinio arto handoff'e nėra).
//  DEŠINĖ — pasirinkimo detalės: random santrauka / frakcijų grid / viešų
//  kaladžių paieška. Startas → TutorialGame(practice) — logika nekeista.
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import type { AiDifficulty } from '@/lib/tutorial/ai'
import { PVE_REWARD } from '@/lib/economy'
import { ActiveDeckSelectorModal } from '@/components/digital/ActiveDeckSelectorModal'
import { useActiveDeck, activeDeckOf } from '@/lib/digital/activeDeck'
import { getStarterDecks } from '@/lib/starterDecks'
import { useT, useContent, useGameContent } from '@/lib/i18n/react'
import { RavenofBannerButton } from '@/components/digital/ui/RavenofKit'

// i18n
const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type Deck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; missing: number }
type Faction = { id: number; name: string; icon_url: string | null; color_hex: string | null }
type PublicDeck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; factionId: number | null; author: string; score: number }
type Mode = 'random' | 'faction' | 'public'

// Plytelės kampų nuopjovos (prototipo aiType tile)
const TILE_CLIP = 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'

export function DigitalPvE() {
  const gc = useGameContent()
  const t = useT()
  const tc = useContent()
  const router = useRouter()
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [sel, setSel] = useState('')
  const [factions, setFactions] = useState<Faction[]>([])
  const [publicDecks, setPublicDecks] = useState<PublicDeck[]>([])
  const [mode, setMode] = useState<Mode>('random')
  const [oppFaction, setOppFaction] = useState<number | ''>('')
  const [oppDeck, setOppDeck] = useState('')
  const [difficulty, setDifficulty] = useState<AiDifficulty>('normal')
  const [query, setQuery] = useState('')
  const [filterFaction, setFilterFaction] = useState<number | ''>('')
  const [started, setStarted] = useState(false)
  const [deckSelOpen, setDeckSelOpen] = useState(false)
  const [covers, setCovers] = useState<Record<number, string>>({})

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setDecks([]); return }
      const [{ data }, { data: colRows }, { data: prof }] = await Promise.all([
        supabase.from('decks').select('id, name, faction:factions ( name, icon_url, color_hex )').eq('user_id', user.id).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
        supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      ])
      const tester = ['tester', 'admin'].includes((prof as { role?: string } | null)?.role ?? '')
      const rows = (data as unknown as { id: string; name: string; faction: { name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
      const owned: Record<string, number> = Object.fromEntries(((colRows as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
      const ids = rows.map((d) => d.id)
      const missingMap: Record<string, number> = {}
      if (ids.length) {
        const { data: dc } = await supabase.from('deck_cards').select('deck_id, card_id, quantity').in('deck_id', ids)
        for (const r of ((dc as { deck_id: string; card_id: string; quantity: number }[]) ?? [])) { const have = owned[r.card_id] ?? 0; if (have < r.quantity) missingMap[r.deck_id] = (missingMap[r.deck_id] ?? 0) + (r.quantity - have) }
      }
      const ds = rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null, missing: tester ? 0 : (missingMap[d.id] ?? 0) }))
      setDecks(ds)
      const first = ds.find((d) => d.missing === 0); if (first) setSel(first.id)
    })
    supabase.from('factions').select('id, name, icon_url, color_hex').order('sort_order').limit(20).then(({ data }) => setFactions(((data as Faction[]) ?? []).filter((f) => f.name !== 'Universalus')))
    supabase.from('decks').select('id, name, user_id, score, faction:factions ( id, name, icon_url, color_hex )').eq('visibility', 'public').order('score', { ascending: false }).limit(60)
      .then(async ({ data }) => {
        const rows = (data as unknown as { id: string; name: string; user_id: string; score: number | null; faction: { id: number; name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
        const uids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
        const authors: Record<string, string> = {}
        if (uids.length) { const { data: profs } = await supabase.from('profiles').select('id, username, display_name').in('id', uids); for (const pr of ((profs as { id: string; username: string | null; display_name: string | null }[]) ?? [])) authors[pr.id] = pr.display_name || pr.username || t('battle.player') }
        setPublicDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null, factionId: d.faction?.id ?? null, author: authors[d.user_id] ?? t('battle.player'), score: d.score ?? 0 })))
      })
    void useActiveDeck.getState().refresh()
    getStarterDecks().then((sd) => {
      const m: Record<number, string> = {}
      for (const st of sd ?? []) if (st.factionId != null && st.imageUrl) m[st.factionId] = st.imageUrl
      setCovers(m)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // preload asset mygtukų — be layout shift ir mirgėjimo
  useEffect(() => {
    for (const a of ['/digital/ai/types/random-faction.png?v=1', '/digital/ai/types/selected-faction.png?v=1', '/digital/ai/types/public-deck.png?v=1', '/digital/ai/types/tutorials.png?v=1']) { const im = new Image(); im.src = a }
  }, [])

  const adState = useActiveDeck()
  const globalDeck = activeDeckOf(adState)
  // VIENINTELIS šaltinis — globali aktyvi kaladė. JOKIO tylaus fallback į kitą
  // kaladę (kova privalo vykti su ta, kurią žaidėjas pasirinko). Jei netinkama —
  // deck=null ir CTA aiškiai pasako. Fallback į seną vietinę TIK kol store kraunasi.
  const deck = adState.loaded
    ? (globalDeck ? decks?.find((d) => d.id === globalDeck.id && d.missing === 0) : undefined)
    : decks?.find((d) => d.id === sel && d.missing === 0)
  const playable = (decks ?? []).filter((d) => d.missing === 0)
  const selFactionObj = factions.find((f) => f.id === oppFaction)
  const selDeckObj = publicDecks.find((d) => d.id === oppDeck)
  const filteredDecks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return publicDecks.filter((d) => (!filterFaction || d.factionId === filterFaction) && (!q || d.name.toLowerCase().includes(q) || d.author.toLowerCase().includes(q) || (d.faction ?? '').toLowerCase().includes(q)))
  }, [publicDecks, query, filterFaction])

  const canStart = !!deck && (mode === 'random' || (mode === 'faction' && !!oppFaction) || (mode === 'public' && !!oppDeck))
  const start = useCallback(() => {
    if (!canStart) return
    playUiClick()
    if (mode === 'random' && factions.length && !oppFaction) setOppFaction(factions[Math.floor(Math.random() * factions.length)].id)
    setStarted(true)
  }, [canStart, mode, factions, oppFaction])

  if (started && deck) {
    return <TutorialGame deckId={deck.id} deckName={deck.name} practice
      opponentDeckId={mode === 'public' ? oppDeck : null}
      opponentFaction={mode !== 'public' && oppFaction ? Number(oppFaction) : null}
      opponentName={mode === 'public' ? (selDeckObj?.name ?? t('battle.pve.enemy')) : (selFactionObj?.name ?? t('battle.pve.enemy'))}
      difficulty={difficulty}
      onClose={() => setStarted(false)} />
  }

  if (decks === null) return <div className="ravenof-body h-full flex items-center justify-center"><span className="ravenof-spinner" style={{ width: 40, height: 40 }} /></div>
  if (playable.length === 0) return (
    <div className="ravenof-body h-full flex flex-col items-center justify-center gap-3 text-center px-6">
      <p style={{ font: '400 13px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('battle.pve.noDecks')}</p>
      <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="ravenof-btn ravenof-btn-secondary">{t('battle.pve.createDeck')}</Link>
    </div>
  )

  const label = (txt: string) => (
    <div className="shrink-0" style={{ font: '500 9px var(--ravenof-font-body)', letterSpacing: 1.5, color: 'var(--ravenof-text-secondary)', textTransform: 'uppercase' }}>{txt}</div>
  )

  // ── Varžovo plytelė (esamas PNG asset — rėmas+emblema+LT pavadinimas jau arte) ──
  const tile = (opts: { asset: string; label: string; selected: boolean; onClick?: () => void; href?: string; testId?: string }) => {
    const frame: React.CSSProperties = {
      position: 'relative', clipPath: TILE_CLIP, padding: 0, cursor: 'pointer', overflow: 'hidden',
      border: 0, background: opts.selected ? 'linear-gradient(160deg, rgba(212,163,59,0.16), var(--ravenof-bg-surface))' : 'var(--ravenof-bg-surface)',
      boxShadow: opts.selected ? 'inset 0 0 0 1.5px var(--ravenof-gold)' : 'inset 0 0 0 1px var(--ravenof-border-strong)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }
    const img = (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={opts.asset} alt="" aria-hidden draggable={false}
        onError={(e) => { const el = e.target as HTMLImageElement; if (!el.dataset.fb) { el.dataset.fb = '1'; console.warn('[PvE] trūksta asset:', opts.asset); el.src = '/digital/icons/fi-gifts.png' } }}
        className="block pointer-events-none select-none" style={{ width: '92%', height: '86%', objectFit: 'contain', objectPosition: 'center', opacity: opts.selected ? 1 : 0.66, filter: opts.selected ? 'saturate(1.08) brightness(1.05)' : 'saturate(0.72) brightness(0.8)', transition: 'filter 160ms ease, opacity 160ms ease' }} />
    )
    const marker = opts.selected && (
      <span aria-hidden style={{ position: 'absolute', top: 7, right: 9, width: 11, height: 11, background: 'var(--ravenof-gold-bright)', transform: 'rotate(45deg)', boxShadow: '0 0 8px rgba(242,196,90,0.7)' }} />
    )
    if (opts.href) return <Link key={opts.label} href={opts.href} onClick={() => playUiClick()} className="ravenof-press" style={frame} aria-label={opts.label} data-setup-tile={opts.testId}>{img}{marker}</Link>
    return (
      <button key={opts.label} type="button" onClick={() => { playUiClick(); opts.onClick?.() }} className="ravenof-press" style={frame}
        aria-label={opts.label} aria-pressed={opts.selected} data-selected={opts.selected || undefined} data-setup-tile={opts.testId}>{img}{marker}</button>
    )
  }

  const inputStyle: React.CSSProperties = { minHeight: 34, background: 'var(--ravenof-bg-elevated)', border: '1px solid var(--ravenof-border-strong)', color: 'var(--ravenof-text-primary)', padding: '0 10px', font: '400 12px var(--ravenof-font-body)', outline: 'none' }

  return (
    <div data-pve-v="447" className="ravenof-body ravenof-in h-full flex flex-col min-h-0" style={{ padding: '12px 20px 14px max(20px, env(safe-area-inset-left, 0px))' }}>
      {/* Antraštė: atgal + pavadinimas */}
      <div className="flex items-center shrink-0" style={{ gap: 10, paddingBottom: 10 }}>
        <button onClick={() => { playUiClick(); router.push('/digital') }} aria-label={t('common.back')} className="ravenof-iconbtn" style={{ fontSize: 16 }}>‹</button>
        <div style={{ font: '700 15px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('battle.pve.screenTitle')}</div>
      </div>

      <div className="flex-1 flex min-h-0" style={{ gap: 14 }}>
        {/* ── KAIRĖ: kaladė + sunkumas + atlygis + CTA ── */}
        <div className="flex flex-col min-w-0" style={{ flex: 1.05, gap: 8 }}>
          {label(t('battle.pve.yourDeck'))}
          <button onClick={() => { playUiClick(); setDeckSelOpen(true) }} data-testid="active-deck-summary" className="ravenof-press flex items-center shrink-0 text-left" style={{ gap: 10, background: 'var(--ravenof-bg-surface)', border: '1px solid #3d3345', padding: '7px 10px', cursor: 'pointer' }}>
            <span className="shrink-0 overflow-hidden relative" style={{ width: 34, height: 45, borderRadius: 3, border: '1px solid var(--ravenof-border-strong)', background: globalDeck?.factionId != null && covers[globalDeck.factionId] ? `url('${covers[globalDeck.factionId]}') no-repeat top / cover` : 'linear-gradient(160deg,#1a1325,#0a0810)' }} />
            <span className="flex-1 min-w-0">
              <span className="block truncate" style={{ font: '700 12px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{!adState.loaded ? t('common.loading') : globalDeck ? globalDeck.name : t('ranked.pickActiveDeck')}</span>
              {globalDeck && <span className="block truncate" style={{ font: '400 11px var(--ravenof-font-body)', color: globalDeck.factionColor ?? 'var(--ravenof-text-secondary)' }}>{globalDeck.faction ?? '—'} · {t('decks.cardsShort', { count: globalDeck.cardCount })}</span>}
            </span>
            <span style={{ color: 'var(--ravenof-text-secondary)' }}>›</span>
          </button>
          {adState.loaded && globalDeck && !deck && (
            <p role="status" className="shrink-0" style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-danger-bright)', margin: 0 }}>{t('battle.pve.activeDeckInvalid')}</p>
          )}

          {label(t('battle.pve.difficulty'))}
          <div className="flex shrink-0" data-testid="ai-difficulty" style={{ border: '1px solid var(--ravenof-border-strong)' }}>
            {(['easy', 'normal', 'hard'] as AiDifficulty[]).map((d) => {
              const s = difficulty === d
              return (
                <button key={d} onClick={() => { playUiClick(); setDifficulty(d) }} data-setup-tile={`diff-${d}`} aria-pressed={s}
                  className="ravenof-press flex-1" title={t(`battle.pve.diffDesc.${d}`)} style={{
                    padding: '10px 4px', border: 0, cursor: 'pointer', textTransform: 'uppercase',
                    font: '700 11px var(--ravenof-font-display)', letterSpacing: 1.5,
                    background: s ? 'var(--ravenof-grad-gold)' : 'transparent',
                    color: s ? 'var(--ravenof-on-gold)' : 'var(--ravenof-text-secondary)',
                  }}>{t(`battle.pve.diff.${d}`)}</button>
              )
            })}
          </div>

          <div className="flex items-center justify-between shrink-0" style={{ background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '9px 12px' }}>
            <span style={{ font: '400 11.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('battle.pve.expectedReward')}</span>
            <span style={{ font: '700 13px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>{t('battle.pve.silverN', { n: PVE_REWARD[difficulty] })}</span>
          </div>

          <div className="flex-1" />
          <RavenofBannerButton onClick={start} disabled={!canStart} data-testid="pve-start" style={{ width: '100%' }}>
            {canStart ? t('battle.pve.start') : !deck ? t('battle.pve.activeDeckInvalid') : mode === 'faction' ? t('battle.pve.pickFaction') : mode === 'public' ? t('battle.pve.pickDeck') : t('battle.pve.pickOpponent')}
          </RavenofBannerButton>
        </div>

        {/* ── CENTRAS: varžovo tipas 2×2 ── */}
        <div className="flex flex-col min-w-0" style={{ flex: 1.15, gap: 8 }}>
          {label(t('battle.pve.opponentLabel'))}
          <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2" style={{ gap: 10 }}>
            {tile({ asset: '/digital/ai/types/random-faction.png?v=1', label: t('battle.pve.types.random'), selected: mode === 'random', onClick: () => setMode('random'), testId: 'random' })}
            {tile({ asset: '/digital/ai/types/selected-faction.png?v=1', label: t('battle.pve.types.faction'), selected: mode === 'faction', onClick: () => setMode('faction'), testId: 'faction' })}
            {tile({ asset: '/digital/ai/types/public-deck.png?v=1', label: t('battle.pve.types.public'), selected: mode === 'public', onClick: () => setMode('public'), testId: 'public' })}
            {tile({ asset: '/digital/ai/types/tutorials.png?v=1', label: t('battle.pve.types.tutorial'), selected: false, href: '/digital/tutorial', testId: 'tutorial' })}
          </div>
        </div>

        {/* ── DEŠINĖ: pasirinkimo detalės ── */}
        <div className="flex flex-col min-w-0" style={{ flex: 1.25, gap: 8 }}>
          {label(t('battle.pve.opponentLabel'))}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative" style={{ border: '1px solid var(--ravenof-border-strong)', background: 'var(--ravenof-bg-surface)' }}>
            {mode === 'random' && (
              <div className="flex-1 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/digital/ai/types/random-faction.png?v=1" alt="" aria-hidden className="absolute inset-0 w-full h-full pointer-events-none select-none" style={{ objectFit: 'contain', objectPosition: 'center 38%', padding: '8%', opacity: 0.9, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.6))' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(7,6,10,0.94) 0%, rgba(7,6,10,0.25) 45%, transparent 70%)' }} />
                <div className="absolute inset-x-0 bottom-0" style={{ padding: '0 14px 12px' }}>
                  <div style={{ font: '700 15px var(--ravenof-font-display)', color: 'var(--ravenof-gold-bright)', letterSpacing: 1, textTransform: 'uppercase' }}>{t('battle.pve.randomOpp')}</div>
                  <div style={{ font: '400 11.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', marginTop: 2 }}>{t('battle.pve.randomOppSub')}</div>
                </div>
              </div>
            )}
            {mode === 'faction' && (
              <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll grid grid-cols-2 gap-1.5 content-start" data-testid="faction-picker" style={{ padding: 8 }}>
                {factions.map((f) => { const s = f.id === oppFaction; return (
                  <button key={f.id} onClick={() => { playUiClick(); setOppFaction(f.id) }} className="ravenof-press flex items-center gap-2 px-2 py-1.5 text-left" style={{ cursor: 'pointer', border: s ? '1.5px solid var(--ravenof-gold)' : '1px solid var(--ravenof-border-hairline)', background: s ? 'linear-gradient(135deg, rgba(212,163,59,0.14), var(--ravenof-bg-surface-2))' : 'var(--ravenof-bg-surface-2)' }}>
                    <span className="shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (f.color_hex ? f.color_hex + '88' : 'var(--ravenof-border-gold)') }}>{f.icon_url ? <img src={f.icon_url} alt="" width={32} height={32} className="w-full h-full object-cover" /> : <span>⚔</span>}</span>
                    <span className="min-w-0"><span className="block truncate" style={{ font: '700 12px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{tc('faction', f.id, 'name', f.name)}</span><span className="block truncate" style={{ font: '400 9px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{(() => { const k = `battle.factionDesc.${f.name}`; const v = t(k); return v === k ? t('battle.pve.aiDeck') : v })()}</span></span>
                  </button>
                ) })}
              </div>
            )}
            {mode === 'public' && (
              <div className="flex-1 min-h-0 flex flex-col" style={{ padding: 8 }}>
                <div className="flex gap-2 mb-2 shrink-0">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('battle.pve.searchDeckAuthor')} className="flex-1" style={inputStyle} />
                  <select value={filterFaction ? String(filterFaction) : ''} onChange={(e) => setFilterFaction(e.target.value ? Number(e.target.value) : '')} style={{ ...inputStyle, maxWidth: 130 }}>
                    <option value="">{t('battle.pve.allFactions')}</option>{factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll flex flex-col gap-1.5" data-testid="public-decks">
                  {filteredDecks.length === 0 && <p className="text-center py-4" style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('battle.pve.noDecksFound')}</p>}
                  {filteredDecks.map((d) => { const s = d.id === oppDeck; return (
                    <button key={d.id} onClick={() => { playUiClick(); setOppDeck(d.id) }} className="ravenof-press p-2 flex items-center gap-1.5 text-left shrink-0" style={{ cursor: 'pointer', border: s ? '1.5px solid var(--ravenof-gold)' : '1px solid var(--ravenof-border-hairline)', background: s ? 'linear-gradient(135deg, rgba(212,163,59,0.12), var(--ravenof-bg-surface-2))' : 'var(--ravenof-bg-surface-2)' }}>
                      <span className="shrink-0 w-7 h-7 flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (d.factionColor ? d.factionColor + '88' : 'var(--ravenof-border-gold)') }}>{d.factionIcon ? <img src={d.factionIcon} alt="" width={28} height={28} className="w-full h-full object-cover" /> : <span style={{ fontSize: 12 }}>⚔</span>}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate" style={{ font: '700 12px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{d.name}</span><span className="block truncate" style={{ font: '400 9px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{d.author} · {gc.faction(d.faction) || '—'}</span></span>
                      {s ? <span style={{ color: 'var(--ravenof-success)', fontSize: 13 }}>✓</span> : d.score > 0 ? <span className="shrink-0" style={{ font: '400 9px var(--ravenof-font-body)', color: '#fb923c' }}>🔥{d.score >= 1000 ? (d.score / 1000).toFixed(1) + 'K' : d.score}</span> : null}
                    </button>
                  ) })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {deckSelOpen && <ActiveDeckSelectorModal onClose={() => setDeckSelOpen(false)} />}
    </div>
  )
}
