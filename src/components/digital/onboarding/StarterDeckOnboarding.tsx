'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Starter kaladės pasirinkimas — naujoko onboarding (/digital/onboarding).
// Fizinių dėžučių karuselė ant tamsios lentynos:
//  • horizontalus scroll-snap + strėlės + klaviatūra + drag + wheel
//  • fokusuota dėžė didesnė; pasirinkimas TIK sąmoningu click/Enter (ne swipe)
//  • aktyvavus — dėžė „atsidaro" (dangtis + kylančios kortos, 0.55s; reduced
//    motion → fade), šalia lore/stiprybės/silpnybės + pilnas kortų sąrašas
//  • kortos preview modalas; patvirtinimas → rvn_claim_starter_deck
//    (idempotentiškas; kolekcija+kaladė+aktyvi+onboarding vienoje DB funkcijoje)
//  • sėkmė → „Tavo kaladė paruošta" → /digital
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { getStarterDeckCards, getFactions, type StarterCard, type FactionInfo } from '@/lib/digital/onboarding'
import { starterMetaFor, complexityLabel } from '@/lib/digital/starterMeta'
import { useT } from '@/lib/i18n/react'
import { LanguageSelector } from '@/components/digital/ui/LanguageSelector'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { SmartImg } from '@/components/ui/SmartImg'

const GOLD = '240,180,41'
const TYPE_ORDER = ['čempion', 'padar', 'būtyb', 'burt', 'kerai', 'reakcij', 'artefakt', 'lauk']

function typeRank(t: string | null, champion: boolean): number {
  if (champion) return -1
  const s = (t ?? '').toLowerCase()
  const i = TYPE_ORDER.findIndex((k) => s.includes(k))
  return i === -1 ? 99 : i
}

function useReducedMotion(): boolean {
  const [rm, setRm] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setRm(mq.matches)
    const h = () => setRm(mq.matches)
    mq.addEventListener?.('change', h)
    return () => mq.removeEventListener?.('change', h)
  }, [])
  return rm
}

// ── Kortos preview modalas ────────────────────────────────────────────────────
function CardPreview({ card, onClose }: { card: StarterCard; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const t = useT()
  return createPortal(
    <div className="fixed inset-0 z-[430] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)', backdropFilter: 'blur(3px)' }} onClick={onClose} role="dialog" aria-label={card.name}>
      <div onClick={(e) => e.stopPropagation()} className="relative flex items-center gap-4" style={{ maxWidth: '92vw' }}>
        {card.imageUrl
          ? <SmartImg src={card.imageUrl} width={480} alt={card.name} className="rounded-xl" style={{ width: 'min(300px, 40vw, 66vh)', boxShadow: '0 16px 60px rgba(0,0,0,0.8)' }} />
          : <div className="rounded-xl flex items-center justify-center" style={{ width: 'min(300px, 40vw)', aspectRatio: '3/4', background: '#16101f', border: '1px solid rgba(255,255,255,0.15)' }}><span className="text-4xl">🎴</span></div>}
        <div style={{ maxWidth: 240 }}>
          <p className="font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: card.rarityColor ?? 'var(--gold)', fontSize: 16 }}>{card.name}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{[card.type, card.rarity].filter(Boolean).join(' · ')}</p>
          <p className="mt-1 tabular-nums" style={{ fontSize: 12, color: '#f3ead3' }}>
            🪙{card.gold}{card.attack != null && <> · ⚔{card.attack}</>}{card.health != null && <> · ❤{card.health}</>} · ×{card.quantity}
          </p>
          {card.effect && <p className="mt-2" style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{card.effect}</p>}
        </div>
        <button onClick={onClose} aria-label={t('common.close')} className="absolute -top-3 -right-3 flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.95)', border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
      </div>
    </div>, document.body)
}

// ── Pagrindinis ekranas ───────────────────────────────────────────────────────
export function StarterDeckOnboarding() {
  const router = useRouter()
  const t = useT()
  const rm = useReducedMotion()
  const [starters, setStarters] = useState<StarterDeck[] | null | 'error'>(null)
  const [factions, setFactions] = useState<Record<number, FactionInfo>>({})
  const [idx, setIdx] = useState(0)
  const [opened, setOpened] = useState(false)
  const [cardsCache, setCardsCache] = useState<Record<string, StarterCard[] | 'loading' | 'error'>>({})
  const [preview, setPreview] = useState<StarterCard | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [claimErr, setClaimErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ name: string; faction: string; color: string; emblem: string | null } | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const openedOnce = useRef(false)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)

  const load = useCallback(() => {
    setStarters(null)
    getStarterDecks().then((d) => setStarters(d.length ? d : 'error')).catch(() => setStarters('error'))
    getFactions().then(setFactions)
  }, [])
  useEffect(() => { load() }, [load])

  const list = useMemo(() => (Array.isArray(starters) ? starters : []), [starters])
  const cur = list[idx] ?? null
  const curMeta = cur ? starterMetaFor(cur.factionId, cur.faction ?? cur.name) : null
  const curFac = cur?.factionId != null ? factions[cur.factionId] : undefined
  const accent = curFac?.colorHex ?? '#f0b429'

  // kortų turinys pagal poreikį (aktyvavus) + kešas palyginimams
  const ensureCards = useCallback((id: string) => {
    setCardsCache((c) => (c[id] ? c : { ...c, [id]: 'loading' }))
    getStarterDeckCards(id).then((cards) => {
      setCardsCache((c) => ({ ...c, [id]: cards ?? 'error' }))
    })
  }, [])
  useEffect(() => { if (opened && cur && !cardsCache[cur.id]) ensureCards(cur.id) }, [opened, cur, cardsCache, ensureCards])


  // kaimynų artwork preload
  useEffect(() => {
    for (const j of [idx - 1, idx + 1]) {
      const d = list[j]
      if (d?.imageUrl) { const im = new Image(); im.src = d.imageUrl }
    }
  }, [idx, list])

  // fokusas pagal scroll poziciją (nekeičia atidarytos kaladės — tik vizualinis fokusas)
  const onRailScroll = useCallback(() => {
    const el = railRef.current
    if (!el) return
    requestAnimationFrame(() => {
      const mid = el.scrollLeft + el.clientWidth / 2
      let best = 0; let bestD = Infinity
      Array.from(el.children).forEach((ch, i) => {
        const c = ch as HTMLElement
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
        if (d < bestD) { bestD = d; best = i }
      })
      setIdx((v) => (v === best ? v : best))
    })
  }, [])

  const scrollToIdx = useCallback((i: number, smooth = true) => {
    const el = railRef.current
    const ch = el?.children[i] as HTMLElement | undefined
    if (!el || !ch) return
    el.scrollTo({ left: ch.offsetLeft + ch.offsetWidth / 2 - el.clientWidth / 2, behavior: smooth && !rm ? 'smooth' : 'auto' })
  }, [rm])

  // pradinis centravimas (pirma dėžė į fokusą, be animacijos)
  useEffect(() => { if (list.length > 0) requestAnimationFrame(() => scrollToIdx(0, false)) }, [list.length, scrollToIdx])

  const focusDeck = useCallback((i: number) => { setIdx(i); scrollToIdx(i) }, [scrollToIdx])
  const openDeck = useCallback((i: number) => {
    playUiClick(); setIdx(i); setOpened(true); setClaimErr(null)
    const d = list[i]; if (d) ensureCards(d.id)
    setTimeout(() => { openedOnce.current = true }, 650) // kiti atidarymai — trumpa animacija
  }, [list, ensureCards])

  const step = useCallback((dir: -1 | 1) => {
    const n = Math.max(0, Math.min(list.length - 1, idx + dir))
    if (n === idx) return
    playUiClick(); setIdx(n)
    if (opened) { setClaimErr(null); const d = list[n]; if (d) ensureCards(d.id) }
    else scrollToIdx(n)
  }, [idx, list, opened, scrollToIdx, ensureCards])

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!opened) openDeck(idx) }
    else if (e.key === 'Escape' && opened && !preview && !confirmOpen) { setOpened(false); setTimeout(() => scrollToIdx(idx, false), 0) }
  }, [step, opened, openDeck, idx, scrollToIdx, preview, confirmOpen])

  // pelės drag karuselei (touch veikia natyviai)
  const railMouse = {
    onMouseDown: (e: React.MouseEvent) => { const el = railRef.current; if (!el) return; drag.current = { x: e.clientX, left: el.scrollLeft, moved: false } },
    onMouseMove: (e: React.MouseEvent) => {
      const el = railRef.current; const d = drag.current
      if (!el || !d || e.buttons === 0) return
      const dx = e.clientX - d.x
      if (Math.abs(dx) > 6) d.moved = true
      if (d.moved) el.scrollLeft = d.left - dx
    },
    onMouseUp: () => { setTimeout(() => { drag.current = null }, 0) },
    onWheel: (e: React.WheelEvent) => {
      const el = railRef.current; if (!el) return
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY
    },
  }

  const confirm = async () => {
    if (!cur || busy) return
    setBusy(true); setClaimErr(null)
    const res = await claimStarterDeck(cur.id)
    setBusy(false)
    if ('error' in res) {
      playError()
      setClaimErr(res.error.includes('not enough gold') ? t('onboarding.claimErrGold') : t('onboarding.claimErrSave'))
      return
    }
    playSuccess()
    setConfirmOpen(false)
    setSuccess({ name: cur.name, faction: cur.faction ?? '', color: accent, emblem: curFac?.iconUrl ?? null })
  }

  const enterGame = useCallback(() => { playUiClick(); router.replace('/digital'); router.refresh() }, [router])
  useEffect(() => {
    if (!success) return
    const t = setTimeout(enterGame, 4000)
    return () => clearTimeout(t)
  }, [success, enterGame])

  // ── Sėkmės ekranas ──
  if (success) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center px-6" style={{ animation: rm ? undefined : 'rvnObFade 0.5s ease-out' }}>
        <div className="flex items-center justify-center rounded-full" style={{ width: 84, height: 84, background: `radial-gradient(circle, ${success.color}33, transparent 70%)`, border: `2px solid ${success.color}`, boxShadow: `0 0 40px ${success.color}66` }}>
          {success.emblem
            ? <SmartImg src={success.emblem} width={96} alt="" style={{ width: 52, height: 52, objectFit: 'contain' }} />
            : <span style={{ fontSize: 40 }}>⚔</span>}
        </div>
        <p className="font-black" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 'clamp(18px, 4.5vh, 26px)', letterSpacing: '0.08em' }}>{t('onboarding.deckReady')}</p>
        <p style={{ color: '#f3ead3', fontSize: 13 }}>{success.name}</p>
        <button onClick={enterGame} className="rvn-press mt-2 px-8 rounded-xl font-extrabold"
          style={{ height: 46, fontSize: 14, fontFamily: 'var(--rvn-font-display)', background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6', boxShadow: `0 6px 24px rgba(${GOLD},0.3)` }}>
          {t('onboarding.enterRavenof')}
        </button>
        <style>{`@keyframes rvnObFade { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
      </div>
    )
  }

  // ── Kraunama / klaida ──
  if (starters === null) {
    return <div className="h-full flex flex-col items-center justify-center gap-2"><span className="text-3xl" style={{ animation: 'rvnObSpin 1.2s linear infinite' }}>🎴</span><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('onboarding.preparingDecks')}</span><style>{`@keyframes rvnObSpin { to { transform: rotate(360deg); } }`}</style></div>
  }
  if (starters === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <span className="text-3xl">🕯</span>
        <p className="font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{t('onboarding.decksFailedTitle')}</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('onboarding.decksFailedBody')}</p>
        <button onClick={() => { playUiClick(); load() }} className="rvn-press px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: `rgba(${GOLD},0.15)`, border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{t('onboarding.retry')}</button>
      </div>
    )
  }

  const curCards = cur ? cardsCache[cur.id] : undefined
  const groups: { title: string; cards: StarterCard[] }[] = []
  if (Array.isArray(curCards)) {
    const by = new Map<string, StarterCard[]>()
    for (const c of curCards) {
      const key = c.isChampion ? t('onboarding.champion') : (c.type ?? t('onboarding.other'))
      if (!by.has(key)) by.set(key, [])
      by.get(key)!.push(c)
    }
    groups.push(...[...by.entries()]
      .sort((a, b) => typeRank(a[0], a[0] === t('onboarding.champion')) - typeRank(b[0], b[0] === t('onboarding.champion')))
      .map(([title, cards]) => ({ title, cards })))
  }

  return (
    <div className="h-full w-full flex flex-col outline-none" tabIndex={0} onKeyDown={onKey}
      style={{ padding: `max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))` }}>
      <style>{`
        @keyframes rvnBoxLid { from { transform: perspective(700px) rotateX(0deg); } to { transform: perspective(700px) rotateX(-108deg); } }
        @keyframes rvnBoxCards { from { transform: translateY(26px) scale(0.92); opacity: 0; } to { transform: translateY(-10px) scale(1); opacity: 1; } }
        @keyframes rvnPanelIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
        .rvn-rail::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Antraštė + progresas ── */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-1 pb-1.5">
        <div className="min-w-0">
          <h1 className="font-black truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 'clamp(14px, 3.4vh, 20px)', letterSpacing: '0.08em' }}>{t('onboarding.pickYourDeck')}</h1>
          <p className="truncate" style={{ color: 'var(--text-muted)', fontSize: 'clamp(9px, 1.9vh, 11px)' }}>{t('onboarding.pickYourDeckSub')}</p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5" aria-label={t('auth.steps.stepOf', { step: 2, total: 3 })}>
          <LanguageSelector size="sm" />
          {[t('auth.steps.account'), t('auth.steps.deck'), t('auth.steps.toGame')].map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full font-bold" style={{ fontSize: 9, fontFamily: 'var(--rvn-font-display)',
                background: i === 1 ? `rgba(${GOLD},0.2)` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${i === 1 ? `rgba(${GOLD},0.7)` : i < 1 ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.12)'}`,
                color: i === 1 ? 'var(--gold)' : i < 1 ? '#4ade80' : 'var(--text-muted)' }}>{i < 1 ? '✓ ' : ''}{s}</span>
              {i < 2 && <span style={{ color: 'rgba(150,160,185,0.4)', fontSize: 9 }}>→</span>}
            </span>
          ))}
        </div>
      </div>

      {!opened ? (
        /* ══ KARUSELĖ (uždarytos dėžės ant lentynos) ══ */
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div ref={railRef} onScroll={onRailScroll} {...railMouse}
            className="rvn-rail flex-1 min-h-0 flex items-center gap-[3vw] overflow-x-auto"
            style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingLeft: '32vw', paddingRight: '32vw' }}
            role="listbox" aria-label={t('onboarding.starterDecksAria')} aria-activedescendant={cur ? `rvn-sd-${cur.id}` : undefined}>
            {list.map((d, i) => {
              const meta = starterMetaFor(d.factionId, d.faction ?? d.name)
              const fac = d.factionId != null ? factions[d.factionId] : undefined
              const col = fac?.colorHex ?? '#f0b429'
              const dist = Math.abs(i - idx)
              const scale = dist === 0 ? 1 : dist === 1 ? 0.85 : 0.76
              return (
                <button key={d.id} id={`rvn-sd-${d.id}`} role="option" aria-selected={i === idx}
                  onClick={() => { if (drag.current?.moved) return; if (i === idx) openDeck(i); else { playUiClick(); focusDeck(i) } }}
                  className="relative shrink-0 text-left"
                  style={{ scrollSnapAlign: 'center', width: 'clamp(148px, 34vh, 218px)', transform: `scale(${scale})`,
                    transition: rm ? undefined : 'transform 0.28s ease, opacity 0.28s ease, filter 0.28s ease',
                    opacity: dist > 1 ? 0.55 : 1, filter: dist > 0 ? 'brightness(0.72)' : 'none' }}>
                  {/* dėžutė */}
                  <span className="block relative overflow-hidden" style={{ aspectRatio: '3/4', borderRadius: 14,
                    border: `2px solid ${i === idx ? col : 'rgba(255,255,255,0.14)'}`,
                    boxShadow: i === idx ? `0 10px 34px rgba(0,0,0,0.7), 0 0 26px ${col}55` : '0 8px 22px rgba(0,0,0,0.6)',
                    background: 'linear-gradient(160deg, #1c1428, #0a0810)' }}>
                    {d.imageUrl
                      ? <SmartImg src={d.imageUrl} width={440} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      : <span className="absolute inset-0 flex items-center justify-center text-4xl" aria-hidden>🎴</span>}
                    <span className="absolute inset-x-0 bottom-0 px-2.5 pt-6 pb-2" style={{ background: 'linear-gradient(0deg, rgba(5,4,9,0.96) 45%, transparent)' }}>
                      <span className="block font-extrabold leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', fontSize: 13 }}>{d.faction ?? d.name}</span>
                      <span className="block mt-0.5" style={{ fontSize: 9.5, color: col }}>{meta.label}</span>
                      <span className="mt-1 flex items-center gap-1" aria-label={t('onboarding.complexityAria', { label: complexityLabel(meta.complexity) })}>
                        {[1, 2, 3].map((n) => <span key={n} className="rounded-full" style={{ width: 5, height: 5, background: n <= meta.complexity ? col : 'rgba(255,255,255,0.18)' }} />)}
                        <span style={{ fontSize: 8.5, color: 'var(--text-muted)', marginLeft: 3 }}>{complexityLabel(meta.complexity)}</span>
                      </span>
                    </span>
                    {fac?.iconUrl && (
                      <span className="absolute top-1.5 left-1.5 flex items-center justify-center rounded-full" style={{ width: 30, height: 30, background: 'rgba(5,4,9,0.8)', border: `1px solid ${col}88` }}>
                        <SmartImg src={fac.iconUrl} width={40} alt="" style={{ width: 19, height: 19, objectFit: 'contain' }} />
                      </span>
                    )}
                    {d.claimed && <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full font-bold" style={{ fontSize: 8.5, background: 'rgba(52,211,153,0.92)', color: '#06281c' }}>{t('shop.owned')}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {/* kraštų fade — rodo, kad yra daugiau */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-14" style={{ background: 'linear-gradient(90deg, #06040b, transparent)' }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-14" style={{ background: 'linear-gradient(-90deg, #06040b, transparent)' }} />
          {/* strėlės */}
          <button onClick={() => step(-1)} disabled={idx === 0} aria-label={t('onboarding.prevDeck')}
            className="rvn-press absolute left-1 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full disabled:opacity-30"
            style={{ width: 40, height: 40, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)', zIndex: 2 }}><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => step(1)} disabled={idx === list.length - 1} aria-label={t('onboarding.nextDeck')}
            className="rvn-press absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full disabled:opacity-30"
            style={{ width: 40, height: 40, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)', zIndex: 2 }}><ChevronRight className="w-5 h-5" /></button>
          {/* apačia: taškai + CTA */}
          <div className="shrink-0 flex items-center justify-center gap-3 pt-1 pb-0.5">
            <span className="flex items-center gap-1" aria-hidden>
              {list.map((_, i) => <span key={i} className="rounded-full" style={{ width: i === idx ? 14 : 5, height: 5, transition: 'width 0.2s', background: i === idx ? 'var(--gold)' : 'rgba(255,255,255,0.2)' }} />)}
            </span>
            <button onClick={() => openDeck(idx)} className="rvn-press px-5 rounded-xl font-extrabold"
              style={{ height: 36, fontSize: 12.5, fontFamily: 'var(--rvn-font-display)', background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6' }}>
              {t('onboarding.inspectDeck')}
            </button>
          </div>
        </div>
      ) : (
        /* ══ ATIDARYTA DĖŽĖ + informacija ══ */
        cur && curMeta && (
          <div className="flex-1 min-h-0 grid gap-2.5" style={{ gridTemplateColumns: 'minmax(190px, 0.9fr) minmax(0, 1.6fr)' }} key={cur.id}>
            {/* Kairė: atidaryta dėžė + CTA */}
            <div className="min-h-0 flex flex-col items-center justify-between py-1">
              <button onClick={() => { playUiClick(); setOpened(false); setTimeout(() => scrollToIdx(idx, false), 0) }}
                className="self-start rvn-press px-2.5 py-1 rounded-lg font-bold" style={{ fontSize: 10.5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: 'var(--text-secondary)' }}>
                {t('onboarding.allDecks')}
              </button>
              <div className="relative flex-1 min-h-0 flex items-center justify-center w-full" style={{ perspective: 800 }}>
                {/* kylančios kortos iš dėžės */}
                <div className="absolute flex items-end justify-center" style={{ bottom: '58%', animation: rm ? undefined : `rvnBoxCards ${openedOnce.current ? 0.25 : 0.55}s ease-out both`, animationDelay: rm ? undefined : openedOnce.current ? '0s' : '0.18s' }} aria-hidden>
                  {(Array.isArray(curCards) ? curCards.slice(0, 3) : [null, null, null]).map((c, i) => (
                    <span key={i} className="block overflow-hidden rounded-md" style={{ width: 'clamp(38px, 9vh, 56px)', aspectRatio: '3/4', marginLeft: i ? -14 : 0,
                      transform: `rotate(${(i - 1) * 12}deg) translateY(${Math.abs(i - 1) * 5}px)`,
                      border: `1px solid ${accent}88`, boxShadow: '0 6px 16px rgba(0,0,0,0.6)', background: '#16101f' }}>
                      {c?.imageUrl && <SmartImg src={c.imageUrl} width={120} alt="" className="w-full h-full object-cover" />}
                    </span>
                  ))}
                </div>
                {/* dėžė su atsidarančiu dangčiu */}
                <div className="relative overflow-visible" style={{ width: 'clamp(130px, 30vh, 190px)' }}>
                  <div className="relative overflow-hidden" style={{ aspectRatio: '3/3.4', borderRadius: 14, border: `2px solid ${accent}`, boxShadow: `0 12px 40px rgba(0,0,0,0.75), 0 0 30px ${accent}44`, background: 'linear-gradient(160deg, #1c1428, #0a0810)' }}>
                    {cur.imageUrl && <SmartImg src={cur.imageUrl} width={420} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 65%' }} />}
                    <span className="absolute inset-x-0 bottom-0 px-2.5 pt-5 pb-2" style={{ background: 'linear-gradient(0deg, rgba(5,4,9,0.96) 40%, transparent)' }}>
                      <span className="block font-extrabold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', fontSize: 12.5 }}>{cur.faction ?? cur.name}</span>
                      <span className="block" style={{ fontSize: 9, color: accent }}>{t('onboarding.cardsShort', { count: cur.cardCount })} · {curMeta.label}</span>
                    </span>
                  </div>
                  {/* dangtis */}
                  <div aria-hidden className="absolute inset-x-0 top-0 origin-top" style={{ height: '26%', borderRadius: '14px 14px 4px 4px',
                    background: `linear-gradient(180deg, ${accent}33, rgba(10,8,16,0.97))`, border: `2px solid ${accent}`, borderBottomWidth: 3,
                    animation: rm ? undefined : `rvnBoxLid ${openedOnce.current ? 0.25 : 0.55}s ease-in both`,
                    transform: rm ? 'perspective(700px) rotateX(-108deg)' : undefined, backfaceVisibility: 'hidden' }}>
                    {curFac?.iconUrl && <span className="absolute inset-0 flex items-center justify-center"><SmartImg src={curFac.iconUrl} width={48} alt="" style={{ width: 26, height: 26, objectFit: 'contain', opacity: 0.9 }} /></span>}
                  </div>
                </div>
                {/* strėlės — palyginti kitas kalades neuždarant */}
                <button onClick={() => step(-1)} disabled={idx === 0} aria-label={t('onboarding.prevDeck')}
                  className="rvn-press absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full disabled:opacity-25"
                  style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(255,255,255,0.2)', color: '#f3ead3' }}><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => step(1)} disabled={idx === list.length - 1} aria-label={t('onboarding.nextDeck')}
                  className="rvn-press absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full disabled:opacity-25"
                  style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(255,255,255,0.2)', color: '#f3ead3' }}><ChevronRight className="w-4 h-4" /></button>
              </div>
              <button onClick={() => { playUiClick(); setClaimErr(null); setConfirmOpen(true) }}
                className="rvn-press w-full rounded-xl font-extrabold shrink-0"
                style={{ height: 42, fontSize: 13, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em',
                  background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6', boxShadow: `0 5px 20px rgba(${GOLD},0.28)` }}>
                {cur.claimed ? t('onboarding.continueWithDeck') : t('onboarding.chooseThisDeck')}
              </button>
            </div>

            {/* Dešinė: lore + kortų sąrašas */}
            <div className="min-h-0 flex flex-col rounded-2xl overflow-hidden" style={{ border: `1px solid ${accent}55`, background: 'rgba(10,8,16,0.72)', animation: rm ? undefined : 'rvnPanelIn 0.3s ease-out both' }}>
              <div className="shrink-0 px-3.5 pt-2.5 pb-2" style={{ borderBottom: `1px solid ${accent}33` }}>
                <div className="flex items-center gap-2">
                  {curFac?.iconUrl && <SmartImg src={curFac.iconUrl} width={40} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />}
                  <p className="font-black" style={{ fontFamily: 'var(--rvn-font-display)', color: accent, fontSize: 'clamp(13px, 2.8vh, 16px)', letterSpacing: '0.05em' }}>{cur.faction ?? cur.name}</p>
                  <span className="ml-auto flex items-center gap-1" aria-label={t('onboarding.complexityAria', { label: complexityLabel(curMeta.complexity) })}>
                    {[1, 2, 3].map((n) => <span key={n} className="rounded-full" style={{ width: 6, height: 6, background: n <= curMeta.complexity ? accent : 'rgba(255,255,255,0.18)' }} />)}
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 3 }}>{complexityLabel(curMeta.complexity)}</span>
                  </span>
                </div>
                <p className="mt-1" style={{ fontSize: 'clamp(10px, 2vh, 11.5px)', color: '#e8dfc8', lineHeight: 1.45 }}>{curMeta.intro}</p>
                <p className="mt-0.5" style={{ fontSize: 'clamp(9.5px, 1.9vh, 11px)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{curMeta.playstyle}</p>
              </div>
              <div className="shrink-0 grid grid-cols-2 gap-x-3 px-3.5 py-1.5" style={{ borderBottom: `1px solid ${accent}22` }}>
                <div>
                  <p className="font-bold" style={{ fontSize: 9.5, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('onboarding.strengths')}</p>
                  {curMeta.strengths.map((s) => <p key={s} style={{ fontSize: 10, color: '#c9bfa8', lineHeight: 1.5 }}>✓ {s}</p>)}
                </div>
                <div>
                  <p className="font-bold" style={{ fontSize: 9.5, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('onboarding.weaknesses')}</p>
                  {curMeta.weaknesses.map((s) => <p key={s} style={{ fontSize: 10, color: '#c9bfa8', lineHeight: 1.5 }}>✗ {s}</p>)}
                  <p className="mt-0.5" style={{ fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>💡 {curMeta.recommendedFor}</p>
                </div>
              </div>
              {/* kortų sąrašas — vidinis scroll */}
              <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-1.5" style={{ minHeight: 60 }}>
                {curCards === 'loading' || curCards === undefined ? (
                  <p className="text-center py-6" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('onboarding.loadingCards')}</p>
                ) : curCards === 'error' ? (
                  <div className="text-center py-5">
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('onboarding.cardsLoadFailed')}</p>
                    <button onClick={() => { playUiClick(); setCardsCache((c) => { const n = { ...c }; delete n[cur.id]; return n }); ensureCards(cur.id) }}
                      className="mt-1.5 px-3 py-1 rounded-lg text-xs font-bold" style={{ background: `rgba(${GOLD},0.12)`, border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}>{t('onboarding.retryShort')}</button>
                  </div>
                ) : (
                  groups.map((gr) => (
                    <div key={gr.title} className="mb-1.5">
                      <p className="px-1 font-bold" style={{ fontSize: 9, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{gr.title} · {gr.cards.reduce((s, c) => s + c.quantity, 0)}</p>
                      {gr.cards.map((c) => (
                        <button key={c.cardId} onClick={() => { playUiClick(); setPreview(c) }}
                          className="w-full flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-white/5">
                          <span className="shrink-0 overflow-hidden rounded" style={{ width: 26, height: 35, background: '#16101f', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {c.imageUrl && <SmartImg src={c.imageUrl} width={64} alt="" className="w-full h-full object-cover" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold" style={{ fontSize: 11, color: c.rarityColor ?? '#f3ead3' }}>{c.name}</span>
                            <span className="block truncate" style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>{[c.type, c.rarity].filter(Boolean).join(' · ')}</span>
                          </span>
                          <span className="shrink-0 tabular-nums" style={{ fontSize: 10.5, color: 'var(--gold)' }}>🪙{c.gold}</span>
                          <span className="shrink-0 tabular-nums font-bold" style={{ fontSize: 10.5, color: '#c9bfa8' }}>×{c.quantity}</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* ── Patvirtinimo dialogas ── */}
      {confirmOpen && cur && createPortal(
        <div className="fixed inset-0 z-[420] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.88)', backdropFilter: 'blur(3px)' }}
          onClick={() => !busy && setConfirmOpen(false)} role="dialog" aria-modal="true" aria-label={t('onboarding.confirmDeckAria')}>
          <div onClick={(e) => e.stopPropagation()} className="w-[min(420px,94vw)] rounded-2xl p-5 text-center"
            style={{ background: `radial-gradient(120% 60% at 50% 0%, ${accent}22, transparent 55%), linear-gradient(160deg, #17111f, #0a0810)`, border: `1.5px solid ${accent}` }}>
            <p className="font-black" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 16, letterSpacing: '0.05em' }}>
              {t('onboarding.startWith', { name: cur.faction ?? cur.name })}
            </p>
            <p className="mt-2" style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t('onboarding.confirmBody')}
            </p>
            {claimErr && (
              <div role="alert" className="mt-2.5 rounded-lg px-3 py-2" style={{ fontSize: 11, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)', color: '#fca5a5' }}>{claimErr}</div>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => { playUiClick(); setConfirmOpen(false) }} disabled={busy}
                className="flex-1 rounded-xl font-bold" style={{ height: 40, fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)', color: '#c9bfa8' }}>
                {t('onboarding.keepLooking')}
              </button>
              <button onClick={confirm} disabled={busy}
                className="flex-1 rounded-xl font-extrabold disabled:opacity-60" style={{ height: 40, fontSize: 12.5, fontFamily: 'var(--rvn-font-display)',
                  background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6' }}>
                {busy ? t('onboarding.saving') : claimErr ? t('onboarding.retry') : t('onboarding.confirmDeck')}
              </button>
            </div>
          </div>
        </div>, document.body)}

      {preview && <CardPreview card={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
