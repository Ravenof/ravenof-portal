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
import { getMatchRewardPreview } from '@/lib/economy'
import { ActiveDeckSelectorModal } from '@/components/digital/ActiveDeckSelectorModal'
import { useActiveDeck, activeDeckOf, deckValidity } from '@/lib/digital/activeDeck'
import { useCosmetics, preloadActiveCosmetics } from '@/lib/digital/cosmeticsStore'
import { DECK_MIN, DECK_MAX, formatDeckCount } from '@/lib/deck-validation'
import { getStarterDecks } from '@/lib/starterDecks'
import { useT, useContent, useGameContent, useLocale } from '@/lib/i18n/react'
import { RavenofBannerButton, battleModeAsset, type BattleMode } from '@/components/digital/ui/RavenofKit'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import { FormatSwitch } from '@/components/digital/ui/FormatSwitch'
import { useBattleFormat } from '@/lib/game/format'

// i18n
const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type Deck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; missing: number }
type Faction = { id: number; name: string; icon_url: string | null; color_hex: string | null }
type PublicDeck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; factionId: number | null; author: string; score: number; cardCount: number }
type Mode = 'random' | 'faction' | 'public'
type PveLevel = 'rookie' | 'veteran'
const LS_LEVEL = 'rvn.pve.level'
const LS_ROOKIE_WINS = 'rvn.pve.rookieWins'
const LS_SUGGEST_AT = 'rvn.pve.rookieSuggestAt'
/** Po tiek naujoko pergalių (neperjungus) pasiūlom pereiti į „Patyręs". */
const ROOKIE_SUGGEST_AFTER = 5

export function DigitalPvE() {
  const gc = useGameContent()
  const t = useT()
  const locale = useLocale()
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
  // Naujokas / Patyręs (2026-09-19) – NEPRIKLAUSOMAI nuo sudėtingumo (tas lemia tik boto
  // protą). Naujokas: varžovas žaidžia TIKRA starter kalade (atsitiktinė ar pasirinkta
  // frakcija). Patyręs: kaladė iš viso frakcijos kortų pool'o. Pasirinkimas ir naujoko
  // pergalių skaitiklis – localStorage.
  const [level, setLevel] = useState<PveLevel>('rookie')
  const [starters, setStarters] = useState<Record<number, string>>({})   // factionId → starter_deck_id
  const [rookieWins, setRookieWins] = useState(0)
  const [suggestDismissed, setSuggestDismissed] = useState(false)
  const [query, setQuery] = useState('')
  const [filterFaction, setFilterFaction] = useState<number | ''>('')
  const [started, setStarted] = useState(false)
  const [deckSelOpen, setDeckSelOpen] = useState(false)
  const [covers, setCovers] = useState<Record<number, string>>({})
  // „Numatomas atlygis" — iš SERVERIO konfigūracijos (economy_config.match_rewards),
  // ne iš klientinių konstantų (audit: rodyti tiesą; DI atlygis nepriklauso nuo sunkumo)
  const [rewardCfg, setRewardCfg] = useState<Awaited<ReturnType<typeof getMatchRewardPreview>>>(null)
  // Desktop išdėstymas: 3 fiksuoti stulpeliai (340 / ~520 / likutis), turinys iki 1680 px,
  // režimų 2×2 tinklelis NEtempiamas per visą aukštį – jo dydis pagal lango aukštį.
  const { desktop } = useDesktopUi()
  const centerW = desktop ? Math.max(400, Math.min(560, window.innerHeight - 260)) : 0
  useEffect(() => { getMatchRewardPreview().then((r) => setRewardCfg(r)) }, [])
  // Numatomas atlygis: pagal varžovo kaladę × sudėtingumą (bot.silver_by_level), kitaip – bazinis bot.win.silver
  const rewardSilver = rewardCfg ? (rewardCfg.bot?.silver_by_level?.[level]?.[difficulty] ?? rewardCfg.bot?.win?.silver ?? null) : null

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
    // DI varžovu gali būti TIK galiojančio dydžio (30–40 kortų) vieša kaladė —
    // netinkamos (pvz., 58/60 kortų) iš pasirinkimo pašalinamos visai.
    supabase.from('decks').select('id, name, user_id, score, card_count, faction:factions ( id, name, icon_url, color_hex )').eq('visibility', 'public')
      .gte('card_count', DECK_MIN).lte('card_count', DECK_MAX).order('score', { ascending: false }).limit(60)
      .then(async ({ data }) => {
        const rows = (data as unknown as { id: string; name: string; user_id: string; score: number | null; card_count: number | null; faction: { id: number; name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
        const uids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
        const authors: Record<string, string> = {}
        if (uids.length) { const { data: profs } = await supabase.from('profiles').select('id, username, display_name').in('id', uids); for (const pr of ((profs as { id: string; username: string | null; display_name: string | null }[]) ?? [])) authors[pr.id] = pr.display_name || pr.username || t('battle.player') }
        setPublicDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null, factionId: d.faction?.id ?? null, author: authors[d.user_id] ?? t('battle.player'), score: d.score ?? 0, cardCount: d.card_count ?? 0 })))
      })
    void useActiveDeck.getState().refresh()
    // aktyvi nugarėlė + avataras parsiunčiami PRIEŠ kovą (audit Part 6)
    void useCosmetics.getState().refresh().then(() => preloadActiveCosmetics())
    getStarterDecks().then((sd) => {
      const m: Record<number, string> = {}
      const ids: Record<number, string> = {}
      for (const st of sd ?? []) {
        if (st.factionId == null) continue
        if (st.imageUrl) m[st.factionId] = st.imageUrl
        if (!ids[st.factionId]) ids[st.factionId] = st.id
      }
      setCovers(m); setStarters(ids)
    })
    try {
      const lv = localStorage.getItem(LS_LEVEL); if (lv === 'rookie' || lv === 'veteran') setLevel(lv)
      setRookieWins(Number(localStorage.getItem(LS_ROOKIE_WINS) ?? 0) || 0)
      setSuggestDismissed(Number(localStorage.getItem(LS_SUGGEST_AT) ?? 0) >= ROOKIE_SUGGEST_AFTER)
    } catch { /* privatus režimas */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // preload kovos režimų banerių (Combat UI Asset Pack v1.6) — be layout shift
  useEffect(() => {
    const modes: BattleMode[] = ['random-faction', 'selected-faction', 'public-deck', 'training']
    for (const m of modes) { const im = new Image(); im.src = battleModeAsset(m, locale) }
  }, [locale])

  const adState = useActiveDeck()
  const fmt = useBattleFormat()   // ŽMK / Klasika
  const globalDeck = activeDeckOf(adState)
  // VIENINTELIS šaltinis — globali aktyvi kaladė. JOKIO tylaus fallback į kitą
  // kaladę (kova privalo vykti su ta, kurią žaidėjas pasirinko). Jei netinkama —
  // deck=null ir CTA aiškiai pasako. Fallback į seną vietinę TIK kol store kraunasi.
  // Kova galima tik su GALIOJANČIA aktyvia kalade (30–40 kortų + visos turimos)
  const deck = adState.loaded
    ? (globalDeck && deckValidity(globalDeck).valid ? decks?.find((d) => d.id === globalDeck.id && d.missing === 0) : undefined)
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
    if (mode === 'random' && factions.length && !oppFaction) {
      // Naujokui – tik frakcijos, turinčios starter kaladę (kad varžovas žaistų ja).
      const pool = level === 'rookie' ? factions.filter((f) => !!starters[f.id]) : []
      const src = pool.length ? pool : factions
      setOppFaction(src[Math.floor(Math.random() * src.length)].id)
    }
    setStarted(true)
  }, [canStart, mode, factions, oppFaction, level, starters])
  const pickLevel = useCallback((lv: PveLevel) => {
    setLevel(lv)
    try { localStorage.setItem(LS_LEVEL, lv) } catch { /* */ }
    if (lv === 'veteran') setSuggestDismissed(true)
  }, [])
  const onPracticeResult = useCallback((won: boolean) => {
    if (!won || level !== 'rookie') return
    setRookieWins((w) => { const n = w + 1; try { localStorage.setItem(LS_ROOKIE_WINS, String(n)) } catch { /* */ } return n })
  }, [level])
  const dismissSuggest = useCallback(() => {
    setSuggestDismissed(true)
    try { localStorage.setItem(LS_SUGGEST_AT, String(rookieWins)) } catch { /* */ }
  }, [rookieWins])
  const showSuggest = level === 'rookie' && rookieWins >= ROOKIE_SUGGEST_AFTER && !suggestDismissed

  if (started && deck) {
    return <TutorialGame deckId={deck.id} deckName={deck.name} practice format={fmt}
      opponentDeckId={mode === 'public' ? oppDeck : null}
      opponentStarterId={mode !== 'public' && level === 'rookie' && oppFaction ? (starters[Number(oppFaction)] ?? null) : null}
      opponentFaction={mode !== 'public' && oppFaction && !(level === 'rookie' && starters[Number(oppFaction)]) ? Number(oppFaction) : null}
      onPracticeResult={onPracticeResult}
      opponentDeck={level}
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
    <div className="shrink-0" style={{ font: `500 ${desktop ? 12 : 9}px var(--ravenof-font-body)`, letterSpacing: desktop ? 2 : 1.5, color: 'var(--ravenof-text-secondary)', textTransform: 'uppercase' }}>{txt}</div>
  )

  // ── Varžovo plytelė = kovos režimo baneris (Combat UI Asset Pack v1.6) ──────
  // Antraštė ĮKEPTA į paveikslėlį (LT/EN atskiri failai), todėl matomo teksto
  // NEPIEŠIAM — pridedam tik sr-only etiketę prieinamumui.
  const tile = (opts: { mode: BattleMode; label: string; selected: boolean; onClick?: () => void; href?: string; testId?: string }) => {
    const marker = opts.selected && (
      <span aria-hidden style={{ position: 'absolute', top: desktop ? 12 : 7, right: desktop ? 16 : 9, width: desktop ? 14 : 11, height: desktop ? 14 : 11, background: 'var(--ravenof-gold-bright)', transform: 'rotate(45deg)', boxShadow: '0 0 8px rgba(242,196,90,0.7)' }} />
    )
    const glow: React.CSSProperties = opts.selected
      ? { filter: 'drop-shadow(0 0 10px rgba(212,163,59,0.45)) saturate(1.06) brightness(1.05)' }
      : { filter: 'saturate(0.78) brightness(0.84)' }
    const common = {
      className: 'battle-mode-banner ravenof-press',
      'data-mode': opts.mode,
      'data-language': locale === 'en' ? 'en' : undefined,
      'data-setup-tile': opts.testId,
      style: { ...glow, transition: 'filter 160ms ease' } as React.CSSProperties,
    }
    if (opts.href) return (
      <Link key={opts.mode} href={opts.href} onClick={() => playUiClick()} {...common}>
        <span className="sr-only">{opts.label}</span>{marker}
      </Link>
    )
    return (
      <button key={opts.mode} type="button" onClick={() => { playUiClick(); opts.onClick?.() }} {...common}
        aria-pressed={opts.selected} data-selected={opts.selected || undefined}>
        <span className="sr-only">{opts.label}</span>{marker}
      </button>
    )
  }

  const inputStyle: React.CSSProperties = { minHeight: desktop ? 42 : 34, background: 'var(--ravenof-bg-elevated)', border: '1px solid var(--ravenof-border-strong)', color: 'var(--ravenof-text-primary)', padding: desktop ? '0 14px' : '0 10px', font: `400 ${desktop ? 14 : 12}px var(--ravenof-font-body)`, outline: 'none' }

  return (
    <div data-pve-v="447" className={'ravenof-body ravenof-in h-full flex flex-col min-h-0' + (desktop ? ' overflow-y-auto ravenof-scroll' : '')} style={{ padding: desktop ? '20px 32px 28px' : '12px 20px 14px max(20px, env(safe-area-inset-left, 0px))' }}>
      <div className={desktop ? 'w-full flex flex-col' : 'contents'} style={desktop ? { maxWidth: 1680, margin: '0 auto' } : undefined}>
      {/* Antraštė: atgal + pavadinimas */}
      <div className="flex items-center shrink-0" style={{ gap: desktop ? 14 : 10, paddingBottom: desktop ? 22 : 10 }}>
        <button onClick={() => { playUiClick(); router.push('/digital') }} aria-label={t('common.back')} className="ravenof-iconbtn" style={{ fontSize: desktop ? 22 : 16, ...(desktop ? { width: 40, height: 40 } : {}) }}>‹</button>
        <FormatSwitch variant="chip" />
        <div style={{ font: `700 ${desktop ? 30 : 15}px var(--ravenof-font-display)`, letterSpacing: desktop ? 2 : 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('battle.pve.screenTitle')}</div>
      </div>

      <div className={desktop ? 'flex items-start' : 'flex-1 flex min-h-0'} style={{ gap: desktop ? 28 : 14 }}>
        {/* ── KAIRĖ: kaladė + sunkumas + atlygis + CTA ── */}
        <div className="flex flex-col min-w-0" style={desktop ? { flex: '0 0 340px', gap: 12 } : { flex: 1.05, gap: 8 }}>
          {label(t('battle.pve.yourDeck'))}
          <button onClick={() => { playUiClick(); setDeckSelOpen(true) }} data-testid="active-deck-summary" className="ravenof-press flex items-center shrink-0 text-left" style={{ gap: desktop ? 14 : 10, background: 'var(--ravenof-bg-surface)', border: '1px solid #3d3345', padding: desktop ? '12px 14px' : '7px 10px', cursor: 'pointer' }}>
            <span className="shrink-0 overflow-hidden relative" style={{ width: desktop ? 52 : 34, height: desktop ? 69 : 45, borderRadius: 3, border: '1px solid var(--ravenof-border-strong)', background: globalDeck?.factionId != null && covers[globalDeck.factionId] ? `url('${covers[globalDeck.factionId]}') no-repeat top / cover` : 'linear-gradient(160deg,#1a1325,#0a0810)' }} />
            <span className="flex-1 min-w-0">
              <span className="block truncate" style={{ font: `700 ${desktop ? 19 : 12}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)' }}>{!adState.loaded ? t('common.loading') : globalDeck ? globalDeck.name : t('ranked.pickActiveDeck')}</span>
              {globalDeck && <span className="block truncate" style={{ font: `400 ${desktop ? 14 : 11}px var(--ravenof-font-body)`, color: globalDeck.factionColor ?? 'var(--ravenof-text-secondary)' }}>{globalDeck.faction ?? '—'} · {formatDeckCount(globalDeck.cardCount)}</span>}
            </span>
            <span style={{ color: 'var(--ravenof-text-secondary)', fontSize: desktop ? 22 : undefined }}>›</span>
          </button>
          {adState.loaded && globalDeck && !deck && (
            <p role="status" className="shrink-0" style={{ font: `400 ${desktop ? 14 : 10.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-danger-bright)', margin: 0 }}>{t('battle.pve.activeDeckInvalid')}</p>
          )}

          {label(t('battle.pve.difficulty'))}
          <div className="flex shrink-0" data-testid="ai-difficulty" style={{ border: '1px solid var(--ravenof-border-strong)' }}>
            {(['easy', 'normal', 'hard'] as AiDifficulty[]).map((d) => {
              const s = difficulty === d
              return (
                <button key={d} onClick={() => { playUiClick(); setDifficulty(d) }} data-setup-tile={`diff-${d}`} aria-pressed={s}
                  className="ravenof-press flex-1" title={t(`battle.pve.diffDesc.${d}`)} style={{
                    padding: desktop ? '14px 4px' : '10px 4px', border: 0, cursor: 'pointer', textTransform: 'uppercase',
                    font: `700 ${desktop ? 15 : 11}px var(--ravenof-font-display)`, letterSpacing: 1.5,
                    background: s ? 'var(--ravenof-grad-gold)' : 'transparent',
                    color: s ? 'var(--ravenof-on-gold)' : 'var(--ravenof-text-secondary)',
                  }}>{t(`battle.pve.diff.${d}`)}</button>
              )
            })}
          </div>

          {label(t('battle.pve.levelLabel'))}
          <div className="flex shrink-0" data-testid="pve-level" style={{ border: '1px solid var(--ravenof-border-strong)' }}>
            {(['rookie', 'veteran'] as PveLevel[]).map((lv) => {
              const s = level === lv
              return (
                <button key={lv} onClick={() => { playUiClick(); pickLevel(lv) }} data-setup-tile={`level-${lv}`} aria-pressed={s}
                  className="ravenof-press flex-1" title={t(`battle.pve.levelDesc.${lv}`)} style={{
                    padding: desktop ? '14px 4px' : '10px 4px', border: 0, cursor: 'pointer', textTransform: 'uppercase',
                    font: `700 ${desktop ? 15 : 11}px var(--ravenof-font-display)`, letterSpacing: 1.5,
                    background: s ? 'var(--ravenof-grad-gold)' : 'transparent',
                    color: s ? 'var(--ravenof-on-gold)' : 'var(--ravenof-text-secondary)',
                  }}>{t(`battle.pve.level.${lv}`)}</button>
              )
            })}
          </div>
          <p className="shrink-0" style={{ font: `400 ${desktop ? 13 : 10}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', margin: 0 }}>{t(`battle.pve.levelDesc.${level}`)}</p>
          {showSuggest && (
            <div role="status" className="shrink-0" style={{ border: '1px solid rgba(212,163,59,.55)', background: 'rgba(212,163,59,.10)', padding: desktop ? '12px 14px' : '9px 11px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ font: `500 ${desktop ? 14 : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{t('battle.pve.rookieSuggest', { n: rookieWins })}</span>
              <span className="flex" style={{ gap: 8 }}>
                <button onClick={() => { playUiClick(); pickLevel('veteran') }} className="ravenof-press" style={{ font: `700 ${desktop ? 12 : 10}px var(--ravenof-font-display)`, letterSpacing: 1.5, textTransform: 'uppercase', background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', border: 0, padding: desktop ? '8px 14px' : '6px 10px', cursor: 'pointer', clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>{t('battle.pve.rookieSuggestYes')}</button>
                <button onClick={() => { playUiClick(); dismissSuggest() }} className="ravenof-press" style={{ font: `600 ${desktop ? 12 : 10}px var(--ravenof-font-body)`, background: 'none', border: '1px solid var(--ravenof-border-strong)', color: 'var(--ravenof-text-secondary)', padding: desktop ? '8px 12px' : '6px 9px', cursor: 'pointer' }}>{t('battle.pve.rookieSuggestNo')}</button>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between shrink-0" style={{ background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: desktop ? '14px 16px' : '9px 12px' }}>
            <span style={{ font: `400 ${desktop ? 15 : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('battle.pve.expectedReward')}</span>
            <span style={{ font: `700 ${desktop ? 18 : 13}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{rewardSilver != null ? t('battle.pve.silverN', { n: rewardSilver }) : '…'}</span>
          </div>

          {!desktop && <div className="flex-1" />}
          <RavenofBannerButton onClick={start} disabled={!canStart} data-testid="pve-start" style={desktop ? { width: '100%', minHeight: 58, marginTop: 8, fontSize: 16, letterSpacing: 3, padding: '14px 20px' } : { width: '100%' }}>
            {canStart ? t('battle.pve.start') : !deck ? t('battle.pve.activeDeckInvalid') : mode === 'faction' ? t('battle.pve.pickFaction') : mode === 'public' ? t('battle.pve.pickDeck') : t('battle.pve.pickOpponent')}
          </RavenofBannerButton>
        </div>

        {/* ── CENTRAS: varžovo tipas 2×2 ── */}
        <div className="flex flex-col min-w-0" style={desktop ? { flex: `0 0 ${centerW}px`, gap: 12 } : { flex: 1.15, gap: 8 }}>
          {label(t('battle.pve.opponentLabel'))}
          <div className={desktop ? 'grid grid-cols-2 place-items-center' : 'flex-1 min-h-0 grid grid-cols-2 grid-rows-2 place-items-center'} style={{ gap: desktop ? 18 : 10 }}>
            {tile({ mode: 'random-faction', label: t('battle.pve.types.random'), selected: mode === 'random', onClick: () => setMode('random'), testId: 'random' })}
            {tile({ mode: 'selected-faction', label: t('battle.pve.types.faction'), selected: mode === 'faction', onClick: () => setMode('faction'), testId: 'faction' })}
            {tile({ mode: 'public-deck', label: t('battle.pve.types.public'), selected: mode === 'public', onClick: () => setMode('public'), testId: 'public' })}
            {tile({ mode: 'training', label: t('battle.pve.types.tutorial'), selected: false, href: '/digital/tutorial', testId: 'tutorial' })}
          </div>
        </div>

        {/* ── DEŠINĖ: pasirinkimo detalės ── */}
        <div className="flex flex-col min-w-0" style={desktop ? { flex: '1 1 auto', gap: 12 } : { flex: 1.25, gap: 8 }}>
          {label(t('battle.pve.opponentLabel'))}
          <div className={desktop ? 'flex flex-col overflow-hidden relative' : 'flex-1 min-h-0 flex flex-col overflow-hidden relative'} style={{ border: '1px solid var(--ravenof-border-strong)', background: 'var(--ravenof-bg-surface)', ...(desktop ? { height: centerW } : {}) }}>
            {mode === 'random' && desktop && (
              <div className="flex-1 min-h-0 flex flex-col items-center" style={{ padding: '28px 32px', gap: 18 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={battleModeAsset('random-faction', locale)} alt="" aria-hidden className="pointer-events-none select-none" style={{ width: 'min(260px, 55%)', aspectRatio: '1', objectFit: 'contain', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.6))' }} />
                <div style={{ font: '400 16px var(--ravenof-font-body)', lineHeight: 1.5, color: 'var(--ravenof-text-secondary)', textAlign: 'center', maxWidth: 520 }}>{t('battle.pve.randomOppSub')}</div>
              </div>
            )}
            {mode === 'random' && !desktop && (
              <div className="flex-1 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={battleModeAsset('random-faction', locale)} alt="" aria-hidden className="absolute inset-0 w-full h-full pointer-events-none select-none" style={{ objectFit: 'contain', objectPosition: 'center 38%', padding: '8%', opacity: 0.9, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.6))' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(7,6,10,0.94) 0%, rgba(7,6,10,0.25) 45%, transparent 70%)' }} />
                {/* Antraštė jau įkepta banerio arte — kartojam TIK paaiškinimą */}
                <div className="absolute inset-x-0 bottom-0" style={{ padding: '0 14px 12px' }}>
                  <div style={{ font: '400 11.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('battle.pve.randomOppSub')}</div>
                </div>
              </div>
            )}
            {mode === 'faction' && (
              <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll grid grid-cols-2 content-start" data-testid="faction-picker" style={{ padding: desktop ? 14 : 8, gap: desktop ? 12 : 6 }}>
                {factions.map((f) => { const s = f.id === oppFaction; return (
                  <button key={f.id} onClick={() => { playUiClick(); setOppFaction(f.id) }} className="ravenof-press flex items-center text-left" style={{ gap: desktop ? 14 : 8, padding: desktop ? '12px 14px' : '6px 8px', cursor: 'pointer', border: s ? '1.5px solid var(--ravenof-gold)' : '1px solid var(--ravenof-border-hairline)', background: s ? 'linear-gradient(135deg, rgba(212,163,59,0.14), var(--ravenof-bg-surface-2))' : 'var(--ravenof-bg-surface-2)' }}>
                    <span className="shrink-0 flex items-center justify-center overflow-hidden" style={{ width: desktop ? 52 : 32, height: desktop ? 52 : 32, background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (f.color_hex ? f.color_hex + '88' : 'var(--ravenof-border-gold)') }}>{f.icon_url ? <img src={f.icon_url} alt="" width={desktop ? 52 : 32} height={desktop ? 52 : 32} className="w-full h-full object-cover" /> : <span>⚔</span>}</span>
                    <span className="min-w-0"><span className="block truncate" style={{ font: `700 ${desktop ? 17 : 12}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)' }}>{tc('faction', f.id, 'name', f.name)}</span><span className="block truncate" style={{ font: `400 ${desktop ? 13 : 9}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{(() => { const k = `battle.factionDesc.${f.name}`; const v = t(k); return v === k ? t('battle.pve.aiDeck') : v })()}</span></span>
                  </button>
                ) })}
              </div>
            )}
            {mode === 'public' && (
              <div className="flex-1 min-h-0 flex flex-col" style={{ padding: desktop ? 14 : 8 }}>
                <div className="flex shrink-0" style={{ gap: desktop ? 12 : 8, marginBottom: desktop ? 12 : 8 }}>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('battle.pve.searchDeckAuthor')} className="flex-1" style={inputStyle} />
                  <select value={filterFaction ? String(filterFaction) : ''} onChange={(e) => setFilterFaction(e.target.value ? Number(e.target.value) : '')} style={{ ...inputStyle, maxWidth: desktop ? 200 : 130 }}>
                    <option value="">{t('battle.pve.allFactions')}</option>{factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll flex flex-col" data-testid="public-decks" style={{ gap: desktop ? 8 : 6 }}>
                  {filteredDecks.length === 0 && <p className="text-center py-4" style={{ font: `400 ${desktop ? 15 : 12}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('battle.pve.noDecksFound')}</p>}
                  {filteredDecks.map((d) => { const s = d.id === oppDeck; return (
                    <button key={d.id} onClick={() => { playUiClick(); setOppDeck(d.id) }} className="ravenof-press flex items-center text-left shrink-0" style={{ padding: desktop ? '10px 14px' : 8, gap: desktop ? 14 : 6, minHeight: desktop ? 68 : undefined, cursor: 'pointer', border: s ? '1.5px solid var(--ravenof-gold)' : '1px solid var(--ravenof-border-hairline)', background: s ? 'linear-gradient(135deg, rgba(212,163,59,0.12), var(--ravenof-bg-surface-2))' : 'var(--ravenof-bg-surface-2)' }}>
                      <span className="shrink-0 flex items-center justify-center overflow-hidden" style={{ width: desktop ? 44 : 28, height: desktop ? 44 : 28, background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (d.factionColor ? d.factionColor + '88' : 'var(--ravenof-border-gold)') }}>{d.factionIcon ? <img src={d.factionIcon} alt="" width={desktop ? 44 : 28} height={desktop ? 44 : 28} className="w-full h-full object-cover" /> : <span style={{ fontSize: 12 }}>⚔</span>}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate" style={{ font: `700 ${desktop ? 16 : 12}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)' }}>{d.name}</span><span className="block truncate" style={{ font: `400 ${desktop ? 13 : 9}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{d.author} · {gc.faction(d.faction) || '—'} · {t('decks.cardsShort', { count: d.cardCount })}</span></span>
                      {s ? <span style={{ color: 'var(--ravenof-success)', fontSize: desktop ? 18 : 13 }}>✓</span> : d.score > 0 ? <span className="shrink-0" style={{ font: `400 ${desktop ? 13 : 9}px var(--ravenof-font-body)`, color: '#fb923c' }}>🔥{d.score >= 1000 ? (d.score / 1000).toFixed(1) + 'K' : d.score}</span> : null}
                    </button>
                  ) })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {deckSelOpen && <ActiveDeckSelectorModal onClose={() => setDeckSelOpen(false)} />}
    </div>
  )
}
