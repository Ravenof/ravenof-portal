'use client'

// ── Ravenof Digital — Treniruotė prieš AI: VIENO ekrano landscape pasiruošimas ─
// 3 stulpeliai: Tavo kaladė (karuselė) · Priešininko tipas (atsitiktinė/pasirinkta frakcija/viešas deck) · Santrauka+sunkumas.
// Startas -> TutorialGame(practice) su opponentFaction ARBA opponentDeckId + difficulty.
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import type { AiDifficulty } from '@/lib/tutorial/ai'
import { ActiveDeckSummary } from '@/components/digital/ActiveDeckSelectorModal'
import { useActiveDeck, activeDeckOf } from '@/lib/digital/activeDeck'
import { useT, useContent, useGameContent } from '@/lib/i18n/react'

// i18n
const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type Deck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; missing: number }
type Faction = { id: number; name: string; icon_url: string | null; color_hex: string | null }
type PublicDeck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; factionId: number | null; author: string; score: number }
type Mode = 'random' | 'faction' | 'public'
const A = '34,197,94'
const PANEL: React.CSSProperties = { background: 'linear-gradient(160deg, rgba(14,20,16,0.96), rgba(9,7,12,0.98))', border: '1px solid rgba(34,197,94,0.22)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }
// Frakcijų aprašai — vertimai battle.factionDesc.* (raktas = DB frakcijos pavadinimas)

export function DigitalPvE() {
  const gc = useGameContent()
  const t = useT()
  const tc = useContent()
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
  }, [])

  // preload asset mygtukų — be layout shift ir mirgėjimo
  useEffect(() => {
    for (const a of ['/digital/ai/types/random-faction.png?v=1', '/digital/ai/types/selected-faction.png?v=1', '/digital/ai/types/public-deck.png?v=1', '/digital/ai/types/tutorials.png?v=1', '/digital/ai/difficulty/easy.png?v=1', '/digital/ai/difficulty/medium.png?v=1', '/digital/ai/difficulty/hard.png?v=1']) { const im = new Image(); im.src = a }
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

  const oppSummary = mode === 'random' ? t('battle.pve.types.random') : mode === 'faction' ? (selFactionObj ? `${selFactionObj.name} AI` : '—') : (selDeckObj ? selDeckObj.name : '—')

  if (started && deck) {
    return <TutorialGame deckId={deck.id} deckName={deck.name} practice
      opponentDeckId={mode === 'public' ? oppDeck : null}
      opponentFaction={mode !== 'public' && oppFaction ? Number(oppFaction) : null}
      opponentName={mode === 'public' ? (selDeckObj?.name ?? t('battle.pve.enemy')) : (selFactionObj?.name ?? t('battle.pve.enemy'))}
      difficulty={difficulty}
      onClose={() => setStarted(false)} />
  }

  if (decks === null) return <div className="h-full flex items-center justify-center"><span style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</span></div>
  if (playable.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
      <p style={{ color: 'var(--text-muted)' }}>{t('battle.pve.noDecks')}</p>
      <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#86efac', fontFamily: 'var(--rvn-font-display)' }}>{t('battle.pve.createDeck')}</Link>
    </div>
  )

  // ── Pilno asset'o mygtukai (PNG jau turi rėmą+emblemą+LT pavadinimą — jokių
  // papildomų ikonų/tekstų; vardas per aria-label). Selected = CSS glow, be layout shift.
  const TYPE_ASSETS: Record<string, { asset: string; glow: string; label: string }> = {
    random:   { asset: '/digital/ai/types/random-faction.png?v=1',   glow: 'rgba(52,211,153,0.65)', label: t('battle.pve.types.random') },
    faction:  { asset: '/digital/ai/types/selected-faction.png?v=1', glow: 'rgba(240,180,41,0.65)', label: t('battle.pve.types.faction') },
    public:   { asset: '/digital/ai/types/public-deck.png?v=1',      glow: 'rgba(96,165,250,0.65)', label: t('battle.pve.types.public') },
    tutorial: { asset: '/digital/ai/types/tutorials.png?v=1',        glow: 'rgba(139,92,246,0.65)', label: t('battle.pve.types.tutorial') },
  }
  const DIFF_ASSETS: Record<AiDifficulty, { asset: string; glow: string; label: string }> = {
    easy:   { asset: '/digital/ai/difficulty/easy.png?v=1',   glow: 'rgba(52,211,153,0.6)', label: t('battle.pve.diff.easy') },
    normal: { asset: '/digital/ai/difficulty/medium.png?v=1', glow: 'rgba(45,212,191,0.6)', label: t('battle.pve.diff.normal') },
    hard:   { asset: '/digital/ai/difficulty/hard.png?v=1',   glow: 'rgba(239,68,68,0.6)',  label: t('battle.pve.diff.hard') },
  }

  const imgBtn = (opts: { asset: string; glow: string; label: string; selected: boolean; aspect: string; onClick?: () => void; href?: string; testId?: string }) => {
    const style: React.CSSProperties = {
      aspectRatio: opts.aspect, width: '100%', minWidth: 0, border: 0, padding: 0, background: 'transparent',
      display: 'block', cursor: 'pointer',
      opacity: opts.selected ? 1 : 0.72,
      filter: opts.selected ? `saturate(1.1) brightness(1.07) drop-shadow(0 0 9px ${opts.glow})` : 'saturate(0.72) brightness(0.82)',
      transform: opts.selected ? 'translateY(-1px) scale(1.015)' : 'translateZ(0)',
      transition: 'transform 160ms ease, filter 160ms ease, opacity 160ms ease',
    }
    const img = (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={opts.asset} alt="" aria-hidden draggable={false}
        onError={(e) => { const el = e.target as HTMLImageElement; if (!el.dataset.fb) { el.dataset.fb = '1'; console.warn('[PvE] trūksta asset:', opts.asset); el.src = '/digital/icons/fi-gifts.png' } }}
        className="block w-full h-full pointer-events-none select-none" style={{ objectFit: 'contain', objectPosition: 'center' }} />
    )
    if (opts.href) return <Link key={opts.label} href={opts.href} onClick={() => playUiClick()} className="rvn-press" style={style} aria-label={opts.label} data-setup-tile={opts.testId}>{img}</Link>
    return (
      <button key={opts.label} type="button" onClick={() => { playUiClick(); opts.onClick?.() }} className="rvn-press" style={style}
        aria-label={opts.label} aria-pressed={opts.selected} data-selected={opts.selected || undefined} data-setup-tile={opts.testId}>{img}</button>
    )
  }
  const diffBtn = (d: AiDifficulty) => imgBtn({ ...DIFF_ASSETS[d], selected: difficulty === d, aspect: '4.2 / 1', onClick: () => setDifficulty(d), testId: `diff-${d}` })
  const inputStyle: React.CSSProperties = { minHeight: 36, background: 'rgba(10,8,16,0.85)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', borderRadius: 10, padding: '0 10px', fontSize: 12 }

  return (
    <div data-pve-v="446" className="h-full flex flex-col min-h-0" style={{ gap: 'clamp(4px,1vh,10px)' }}>
      <div className="text-center shrink-0">
        <div className="rvn-disp font-black uppercase leading-none" style={{ fontSize: 'clamp(17px,3.4vh,30px)', color: '#86efac', letterSpacing: '0.04em' }}>{t('battle.pve.title')}</div>
      </div>

      {/* Aktyvi kaladė — kompaktiška santrauka (globali; keitimas per modalą) */}
      <div className="shrink-0"><ActiveDeckSummary accent={A} compact /></div>

      <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: 'minmax(220px,1fr) minmax(0,1.6fr)', gridTemplateRows: 'minmax(0, 1fr)' }}>

        {/* KAIRĖ: režimo pasirinkimas + AI sunkumas (Donato layout: selektoriai dešinėje, kur daugiau vietos) */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={PANEL}>
          <div className="rvn-disp font-extrabold uppercase tracking-wide mb-2 shrink-0 text-center" style={{ fontSize: 'clamp(10px,1.5vh,13px)', color: '#86efac' }}>{t('battle.pve.opponentType')}</div>
          <div className="grid grid-cols-2 my-auto" style={{ gap: 'clamp(8px,1vw,16px)' }}>
            {imgBtn({ ...TYPE_ASSETS.random, selected: mode === 'random', aspect: '2.55 / 1', onClick: () => setMode('random'), testId: 'random' })}
            {imgBtn({ ...TYPE_ASSETS.faction, selected: mode === 'faction', aspect: '2.55 / 1', onClick: () => setMode('faction'), testId: 'faction' })}
            {imgBtn({ ...TYPE_ASSETS.public, selected: mode === 'public', aspect: '2.55 / 1', onClick: () => setMode('public'), testId: 'public' })}
            {imgBtn({ ...TYPE_ASSETS.tutorial, selected: false, aspect: '2.55 / 1', href: '/digital/tutorial', testId: 'tutorial' })}
          </div>
        </section>

        {/* DEŠINĖ: varžovo pasirinkimo turinys (visas aukštis scroll'ui) + CTA apačioje */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={PANEL}>
          <div className="shrink-0" data-testid="ai-difficulty" style={{ marginBottom: 'clamp(4px,1vh,8px)', paddingBottom: 'clamp(4px,1vh,8px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-baseline gap-2 min-w-0" style={{ marginBottom: 'clamp(3px,0.6vh,5px)' }}>
              <span className="rvn-disp font-semibold uppercase shrink-0" style={{ fontSize: 'clamp(8px,1.3vh,10px)', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{t('battle.pve.aiDifficulty')}</span>
              <span className="truncate" style={{ fontSize: 'clamp(8px,1.3vh,10px)', color: 'var(--text-muted)' }}>{t(`battle.pve.diffDesc.${difficulty}`)}</span>
            </div>
            <div className="grid grid-cols-3 mx-auto w-full" style={{ gap: 'clamp(5px,0.6vw,10px)', maxWidth: 560 }}>{diffBtn('easy')}{diffBtn('normal')}{diffBtn('hard')}</div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {mode === 'random' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 p-4">
                <img src={TYPE_ASSETS.random.asset} alt={t('battle.pve.types.random')} className="object-contain" style={{ height: 'clamp(44px,11vh,84px)', maxWidth: '85%', filter: `drop-shadow(0 0 14px ${TYPE_ASSETS.random.glow})` }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 320 }}>{t('battle.pve.randomInfo')}</p>
              </div>
            )}
            {mode === 'faction' && (
              <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-1.5 content-start" data-testid="faction-picker">
                {factions.map((f) => { const s = f.id === oppFaction; return (
                  <button key={f.id} onClick={() => { playUiClick(); setOppFaction(f.id) }} className="rvn-press flex items-center gap-2 rounded-xl px-2 py-1.5 text-left" style={{ border: s ? `1.5px solid rgba(${A},0.9)` : '1px solid rgba(255,255,255,0.08)', background: s ? `linear-gradient(135deg, rgba(${A},0.16), rgba(10,8,16,0.9))` : 'rgba(10,8,16,0.6)' }}>
                    <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (f.color_hex ? f.color_hex + '88' : 'rgba(240,180,41,0.3)') }}>{f.icon_url ? <img src={f.icon_url} alt="" width={32} height={32} className="w-full h-full object-cover" /> : <span>⚔</span>}</span>
                    <span className="min-w-0"><span className="block truncate rvn-disp font-bold" style={{ fontSize: 12, color: '#fff' }}>{tc('faction', f.id, 'name', f.name)}</span><span className="block truncate" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{(() => { const k = `battle.factionDesc.${f.name}`; const v = t(k); return v === k ? t('battle.pve.aiDeck') : v })()}</span></span>
                  </button>
                ) })}
              </div>
            )}
            {mode === 'public' && (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex gap-2 mb-2 shrink-0">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('battle.pve.searchDeckAuthor')} className="flex-1 outline-none" style={inputStyle} />
                  <select value={filterFaction ? String(filterFaction) : ''} onChange={(e) => setFilterFaction(e.target.value ? Number(e.target.value) : '')} style={{ ...inputStyle, maxWidth: 140 }}>
                    <option value="">{t('battle.pve.allFactions')}</option>{factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-1.5 content-start" data-testid="public-decks">
                  {filteredDecks.length === 0 && <p className="col-span-2 text-center py-4" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('battle.pve.noDecksFound')}</p>}
                  {filteredDecks.map((d) => { const s = d.id === oppDeck; return (
                    <button key={d.id} onClick={() => { playUiClick(); setOppDeck(d.id) }} className="rvn-press rounded-xl p-2 flex flex-col gap-1 text-left" style={{ border: s ? `1.5px solid rgba(${A},0.9)` : '1px solid rgba(255,255,255,0.08)', background: s ? `linear-gradient(135deg, rgba(${A},0.14), rgba(10,8,16,0.9))` : 'rgba(10,8,16,0.6)' }}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (d.factionColor ? d.factionColor + '88' : 'rgba(240,180,41,0.3)') }}>{d.factionIcon ? <img src={d.factionIcon} alt="" width={28} height={28} className="w-full h-full object-cover" /> : <span style={{ fontSize: 12 }}>⚔</span>}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate rvn-disp font-bold" style={{ fontSize: 12, color: '#fff' }}>{d.name}</span><span className="block truncate" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.author}</span></span>
                        {s ? <span style={{ color: '#86efac', fontSize: 13 }}>✓</span> : d.score > 0 ? <span className="shrink-0" style={{ fontSize: 9, color: '#fb923c' }}>🔥{d.score >= 1000 ? (d.score / 1000).toFixed(1) + 'K' : d.score}</span> : null}
                      </div>
                      <span className="truncate" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{gc.faction(d.faction) || '—'}</span>
                    </button>
                  ) })}
                </div>
              </div>
            )}
          </div>
          <p className="shrink-0 truncate text-center" style={{ marginTop: 'clamp(3px,0.8vh,6px)', fontSize: 'clamp(8.5px,1.4vh,11px)', color: 'var(--text-secondary)' }}>
            {t('battle.pve.you')} <b style={{ color: '#86efac' }}>{deck?.name ?? '—'}</b> · {t('battle.pve.opponent')} <b style={{ color: '#fdba74' }}>{oppSummary}</b>
          </p>
          <button disabled={!canStart} onClick={start} className="rvn-press w-full rounded-2xl font-black transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
            style={{ marginTop: 'clamp(3px,0.8vh,6px)', minHeight: 'clamp(40px,7vh,58px)', background: canStart ? `linear-gradient(135deg, rgba(${A},0.95), rgba(52,211,153,0.9))` : 'rgba(255,255,255,0.06)', color: canStart ? '#04210f' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em', fontSize: 'clamp(13px,1.9vh,17px)', boxShadow: canStart ? `0 0 20px rgba(${A},0.5)` : 'none' }}>
            ⚔ {canStart ? t('battle.pve.start') : !deck ? t('battle.pve.activeDeckInvalid') : mode === 'faction' ? t('battle.pve.pickFaction') : mode === 'public' ? t('battle.pve.pickDeck') : t('battle.pve.pickOpponent')}
          </button>
        </section>
      </div>

    </div>
  )
}
