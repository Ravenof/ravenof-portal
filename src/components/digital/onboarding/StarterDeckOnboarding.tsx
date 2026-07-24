'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Starter onboarding — patvirtintas UI (Fazė 3: onboarding-step1-deck.png +
// onboarding-step2-avatar.png). Dviejų žingsnių srautas:
//  1) RINKIS PRADINĘ KALADĘ — centre fokusuota karuselė (scroll-snap + strėlės +
//     klaviatūra + drag), caption po kortele, „Apžiūrėti kaladę" detalės modalas
//     (lore + stiprybės/silpnybės + pilnas kortų sąrašas + kortos preview).
//     TOLIAU → rvn_claim_starter_deck (idempotentiškas) → 2 žingsnis.
//  2) RINKIS AVATARĄ — apvalių avatarų karuselė (kind=avatar kosmetika;
//     neturimi užrakinti). Į MOKOMĄJĄ KOVĄ → rvn_equip_cosmetic (jei pasirinkta)
//     → /digital/tutorial (vedama mokymų kova).
// Apačia: ‹ ATGAL · žingsnių taškai · raudonas banner CTA.
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { getStarterDeckCards, getFactions, type StarterCard, type FactionInfo } from '@/lib/digital/onboarding'
import { getCosmetics, equipCosmetic, type Cosmetic, type CosmeticsState } from '@/lib/cosmetics'
import { starterMetaFor, complexityLabel } from '@/lib/digital/starterMeta'
import { useT } from '@/lib/i18n/react'
import { useLocale, setLocale } from '@/lib/i18n/react'
import { LANGUAGE_OPTIONS } from '@/lib/i18n/config'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { SmartImg } from '@/components/ui/SmartImg'
import { RavenofBannerButton, RAVENOF_ASSET } from '@/components/digital/ui/RavenofKit'

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
    <div className="ravenof-body fixed inset-0 z-[430] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)', backdropFilter: 'blur(3px)' }} onClick={onClose} role="dialog" aria-label={card.name}>
      <div onClick={(e) => e.stopPropagation()} className="relative flex items-center gap-4" style={{ maxWidth: '92vw' }}>
        {card.imageUrl
          ? <SmartImg src={card.imageUrl} width={480} alt={card.name} style={{ width: 'min(300px, 40vw, 66vh)', boxShadow: '0 16px 60px rgba(0,0,0,0.8)' }} />
          : <div className="flex items-center justify-center" style={{ width: 'min(300px, 40vw)', aspectRatio: '3/4', background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-strong)' }}><span className="text-4xl">🎴</span></div>}
        <div style={{ maxWidth: 240 }}>
          <p style={{ font: '700 16px var(--ravenof-font-display)', color: card.rarityColor ?? 'var(--ravenof-gold)' }}>{card.name}</p>
          <p style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{[card.type, card.rarity].filter(Boolean).join(' · ')}</p>
          <p className="mt-1 tabular-nums" style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>
            🪙{card.gold}{card.attack != null && <> · ⚔{card.attack}</>}{card.health != null && <> · ❤{card.health}</>} · ×{card.quantity}
          </p>
          {card.effect && <p className="mt-2" style={{ font: '400 11.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.45 }}>{card.effect}</p>}
        </div>
        <button onClick={onClose} aria-label={t('common.close')} className="absolute -top-3 -right-3 flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.95)', border: '1px solid var(--ravenof-border-gold)', color: 'var(--ravenof-gold)', cursor: 'pointer' }}><X className="w-4 h-4" /></button>
      </div>
    </div>, document.body)
}

// ── Karuselės strėlė (kvadratas su plonu rėmeliu — prototipo obArrow) ─────────
function ObArrow({ dir, onClick, disabled, label }: { dir: -1 | 1; onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="ravenof-press absolute top-1/2 -translate-y-1/2 flex items-center justify-center disabled:opacity-25"
      style={{ [dir === -1 ? 'left' : 'right']: 'max(10px, 2vw)', width: 38, height: 38, zIndex: 2,
        background: 'rgba(11,9,16,0.72)', border: '1px solid var(--ravenof-border-strong)',
        color: 'var(--ravenof-text-primary)', font: '700 15px var(--ravenof-font-display)', cursor: disabled ? 'default' : 'pointer' }}>
      {dir === -1 ? '‹' : '›'}
    </button>
  )
}

// ── Pagrindinis ekranas ───────────────────────────────────────────────────────
export function StarterDeckOnboarding() {
  const router = useRouter()
  const t = useT()
  const rm = useReducedMotion()
  const locale = useLocale()
  const toggleLang = () => { playUiClick(); const other = LANGUAGE_OPTIONS.find((o) => o.locale !== locale) ?? LANGUAGE_OPTIONS[0]; void setLocale(other.locale) }
  const [step, setStep] = useState<'deck' | 'avatar'>('deck')
  const [starters, setStarters] = useState<StarterDeck[] | null | 'error'>(null)
  const [factions, setFactions] = useState<Record<number, FactionInfo>>({})
  const [cos, setCos] = useState<CosmeticsState | null>(null)
  const [idx, setIdx] = useState(0)
  const [avIdx, setAvIdx] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const [cardsCache, setCardsCache] = useState<Record<string, StarterCard[] | 'loading' | 'error'>>({})
  const [preview, setPreview] = useState<StarterCard | null>(null)
  const [busy, setBusy] = useState(false)
  const [claimErr, setClaimErr] = useState<string | null>(null)
  const [claimedId, setClaimedId] = useState<string | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)

  const load = useCallback(() => {
    setStarters(null)
    getStarterDecks().then((d) => setStarters(d.length ? d : 'error')).catch(() => setStarters('error'))
    getFactions().then(setFactions)
    getCosmetics().then(setCos)
  }, [])
  useEffect(() => { load() }, [load])

  const list = useMemo(() => (Array.isArray(starters) ? starters : []), [starters])
  const avatars = useMemo<Cosmetic[]>(() => (cos?.items ?? []).filter((c) => c.kind === 'avatar'), [cos])
  const avatarOwned = useCallback((c: Cosmetic) => (cos?.owned ?? []).includes(c.id) || !!c.ownedByDefault, [cos])

  const onDeck = step === 'deck'
  const items = onDeck ? list.length : avatars.length
  const curIdx = onDeck ? idx : avIdx
  const setCurIdx = onDeck ? setIdx : setAvIdx

  const cur = list[idx] ?? null
  const curMeta = cur ? starterMetaFor(cur.factionId, cur.faction ?? cur.name) : null
  const curFac = cur?.factionId != null ? factions[cur.factionId] : undefined
  const accent = curFac?.colorHex ?? 'var(--ravenof-gold)'
  const curAv = avatars[avIdx] ?? null

  // kortų turinys pagal poreikį (detalės modalui)
  const ensureCards = useCallback((id: string) => {
    setCardsCache((c) => (c[id] ? c : { ...c, [id]: 'loading' }))
    getStarterDeckCards(id).then((cards) => {
      setCardsCache((c) => ({ ...c, [id]: cards ?? 'error' }))
    })
  }, [])
  useEffect(() => { if (detailOpen && cur && !cardsCache[cur.id]) ensureCards(cur.id) }, [detailOpen, cur, cardsCache, ensureCards])

  // kaimynų artwork preload
  useEffect(() => {
    if (!onDeck) return
    for (const j of [idx - 1, idx + 1]) {
      const d = list[j]
      if (d?.imageUrl) { const im = new Image(); im.src = d.imageUrl }
    }
  }, [idx, list, onDeck])

  // fokusas pagal scroll poziciją
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
      setCurIdx((v) => (v === best ? v : best))
    })
  }, [setCurIdx])

  const scrollToIdx = useCallback((i: number, smooth = true) => {
    const el = railRef.current
    const ch = el?.children[i] as HTMLElement | undefined
    if (!el || !ch) return
    el.scrollTo({ left: ch.offsetLeft + ch.offsetWidth / 2 - el.clientWidth / 2, behavior: smooth && !rm ? 'smooth' : 'auto' })
  }, [rm])

  // pradinis centravimas žingsnio pradžioje
  useEffect(() => { if (items > 0) requestAnimationFrame(() => scrollToIdx(curIdx, false)) }, [items, step]) // eslint-disable-line react-hooks/exhaustive-deps

  const stepIdxBy = useCallback((dir: -1 | 1) => {
    const n = Math.max(0, Math.min(items - 1, curIdx + dir))
    if (n === curIdx) return
    playUiClick(); setCurIdx(n); scrollToIdx(n)
  }, [items, curIdx, setCurIdx, scrollToIdx])

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepIdxBy(-1) }
    else if (e.key === 'ArrowRight') { e.preventDefault(); stepIdxBy(1) }
    else if (e.key === 'Escape' && detailOpen && !preview) setDetailOpen(false)
  }, [stepIdxBy, detailOpen, preview])

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

  // TOLIAU (1 žingsnis): claim (idempotentiškas) → avatarų žingsnis
  const nextFromDeck = async () => {
    if (!cur || busy) return
    setClaimErr(null)
    if (cur.claimed || claimedId === cur.id) { playUiClick(); setStep('avatar'); return }
    setBusy(true)
    const res = await claimStarterDeck(cur.id)
    setBusy(false)
    if ('error' in res) {
      playError()
      setClaimErr(res.error.includes('already claimed') ? t('onboarding.starter.alreadyClaimed')
        : res.error.includes('not enough gold') ? t('onboarding.claimErrGold') : t('onboarding.claimErrSave'))
      return
    }
    playSuccess()
    setClaimedId(cur.id)
    setStep('avatar')
  }

  // Į MOKOMĄJĄ KOVĄ (2 žingsnis): equip (jei turimas) → mokymų kova
  const finish = async () => {
    if (busy) return
    if (curAv && avatarOwned(curAv)) {
      setBusy(true)
      await equipCosmetic('avatar', curAv.id)
      setBusy(false)
      playSuccess()
    } else playUiClick()
    router.replace('/digital/tutorial')
    router.refresh()
  }

  // ── Kraunama / klaida ──
  if (starters === null) {
    return <div className="ravenof-body h-full flex flex-col items-center justify-center gap-2" style={{ background: 'var(--ravenof-bg-base)' }}><span className="ravenof-spinner" style={{ width: 40, height: 40 }} /><span style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.preparingDecks')}</span></div>
  }
  if (starters === 'error') {
    return (
      <div className="ravenof-body h-full flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: 'var(--ravenof-bg-base)' }}>
        <span className="text-3xl">🕯</span>
        <p style={{ font: '700 15px var(--ravenof-font-display)', color: 'var(--ravenof-gold)' }}>{t('onboarding.decksFailedTitle')}</p>
        <p style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.decksFailedBody')}</p>
        <button onClick={() => { playUiClick(); load() }} className="ravenof-btn ravenof-btn-secondary">{t('onboarding.retry')}</button>
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
    <div className="ravenof-body ravenof-in h-full w-full flex flex-col outline-none relative overflow-hidden" tabIndex={0} onKeyDown={onKey}
      style={{ background: 'var(--ravenof-bg-base)' }}>
      {/* fonas — pritemdytos katedros griuvėsiai */}
      <div aria-hidden className="absolute inset-0" style={{ background: `url('${RAVENOF_ASSET}/backgrounds/background-cathedral-ruins.webp') center / cover no-repeat`, opacity: 0.22 }} />
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 45%, transparent 30%, rgba(7,6,10,0.88) 100%), linear-gradient(0deg, rgba(7,6,10,0.55), rgba(7,6,10,0.35))' }} />
      <style>{`.rvn-rail::-webkit-scrollbar { display: none; }`}</style>

      {/* ── Antraštė: wordmark + žingsnis ── */}
      <div className="relative shrink-0 flex items-center justify-between" style={{ padding: `calc(env(safe-area-inset-top, 0px) + 12px) max(20px, env(safe-area-inset-right, 0px)) 0 max(20px, env(safe-area-inset-left, 0px))`, zIndex: 3 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${RAVENOF_ASSET}/logos/ravenof-wordmark.png`} alt="Ravenof" style={{ width: 92, height: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.6))' }} />
        <div className="flex items-center gap-3">
          <button onClick={toggleLang} aria-label="Kalba / Language" className="ravenof-press" style={{ font: '700 10px var(--ravenof-font-display)', color: 'var(--ravenof-text-secondary)', border: '1px solid var(--ravenof-border-strong)', background: 'rgba(7,6,10,0.5)', padding: '5px 7px', borderRadius: 3, cursor: 'pointer' }}>{locale.toUpperCase()}</button>
          <span style={{ font: '700 12px var(--ravenof-font-display)', letterSpacing: 2, color: 'var(--ravenof-text-secondary)', textTransform: 'uppercase' }}>{t('onboarding.ob.stepOf', { step: onDeck ? 1 : 2, total: 2 })}</span>
        </div>
      </div>

      {/* ── Pavadinimas ── */}
      <div className="relative shrink-0 text-center" style={{ marginTop: 2, zIndex: 3 }}>
        <h1 style={{ font: '700 clamp(19px, 4.6vh, 26px) var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-text-primary)', margin: 0 }}>
          {onDeck ? t('onboarding.ob.deckTitle') : t('onboarding.ob.avatarTitle')}
        </h1>
        <p style={{ font: '400 clamp(10px, 2vh, 12.5px) var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: '2px 0 0' }}>
          {onDeck ? t('onboarding.ob.deckSub') : t('onboarding.ob.avatarSub')}
        </p>
        {claimErr && <p role="alert" style={{ font: '500 11px var(--ravenof-font-body)', color: '#c65563', margin: '3px 0 0' }}>{claimErr}</p>}
      </div>

      {/* ── Karuselė ── */}
      <div className="relative flex-1 min-h-0" style={{ zIndex: 3 }}>
        <div ref={railRef} onScroll={onRailScroll} {...railMouse} key={step}
          className="rvn-rail h-full flex items-center overflow-x-auto"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', gap: onDeck ? '4vw' : '5vw', paddingLeft: '38vw', paddingRight: '38vw' }}
          role="listbox" aria-label={onDeck ? t('onboarding.starterDecksAria') : t('onboarding.ob.avatarsAria')}>
          {onDeck ? list.map((d, i) => {
            const fac = d.factionId != null ? factions[d.factionId] : undefined
            const col = fac?.colorHex ?? '#D4A33B'
            const dist = Math.abs(i - idx)
            return (
              <button key={d.id} role="option" aria-selected={i === idx}
                onClick={() => { if (drag.current?.moved) return; if (i === idx) { playUiClick(); setDetailOpen(true) } else { playUiClick(); setIdx(i); scrollToIdx(i) } }}
                className="relative shrink-0 text-left ravenof-press"
                style={{ scrollSnapAlign: 'center', width: 'clamp(128px, 30vh, 168px)', border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                  transform: `scale(${dist === 0 ? 1 : 0.82})`,
                  transition: rm ? undefined : 'transform 0.28s ease, opacity 0.28s ease, filter 0.28s ease',
                  opacity: dist > 1 ? 0.45 : 1, filter: dist > 0 ? 'brightness(0.45)' : 'none' }}>
                <span className="block relative overflow-hidden" style={{ aspectRatio: '3/4',
                  border: dist === 0 ? `2px solid ${col}` : '1px solid var(--ravenof-border-strong)',
                  boxShadow: dist === 0 ? `0 10px 34px rgba(0,0,0,0.7), 0 0 26px ${col}44` : '0 8px 22px rgba(0,0,0,0.6)',
                  background: 'var(--ravenof-bg-surface)' }}>
                  {d.imageUrl
                    ? <SmartImg src={d.imageUrl} width={440} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    : <span className="absolute inset-0 flex items-center justify-center text-4xl" aria-hidden>🎴</span>}
                  {d.claimed && <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 font-bold" style={{ fontSize: 8.5, background: 'rgba(79,158,82,0.92)', color: '#07130a', borderRadius: 2 }}>{t('shop.owned')}</span>}
                </span>
              </button>
            )
          }) : avatars.map((c, i) => {
            const owned = avatarOwned(c)
            const dist = Math.abs(i - avIdx)
            return (
              <button key={c.id} role="option" aria-selected={i === avIdx}
                onClick={() => { if (drag.current?.moved) return; if (i !== avIdx) { playUiClick(); setAvIdx(i); scrollToIdx(i) } }}
                className="relative shrink-0 ravenof-press"
                style={{ scrollSnapAlign: 'center', width: 'clamp(96px, 24vh, 132px)', border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                  transform: `scale(${dist === 0 ? 1 : 0.8})`,
                  transition: rm ? undefined : 'transform 0.28s ease, opacity 0.28s ease, filter 0.28s ease',
                  opacity: dist > 1 ? 0.4 : 1, filter: dist > 0 ? 'brightness(0.45)' : 'none' }}>
                <span className="block relative overflow-hidden rounded-full" style={{ aspectRatio: '1',
                  border: dist === 0 ? '3px solid var(--ravenof-gold)' : '1px solid var(--ravenof-border-strong)',
                  boxShadow: dist === 0 ? '0 10px 30px rgba(0,0,0,0.7), 0 0 26px rgba(212,163,59,0.35)' : '0 8px 20px rgba(0,0,0,0.6)',
                  background: 'var(--ravenof-bg-surface)' }}>
                  {c.imageUrl
                    ? <SmartImg src={c.imageUrl} width={280} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: owned ? undefined : 'grayscale(1) brightness(0.5)' }} />
                    : <span className="absolute inset-0 flex items-center justify-center text-4xl" style={{ background: c.css ?? 'var(--ravenof-bg-surface)', filter: owned ? undefined : 'grayscale(1) brightness(0.6)' }}>{c.emoji ?? '👤'}</span>}
                  {!owned && <span className="absolute inset-0 flex items-center justify-center text-xl" aria-label={t('onboarding.ob.locked')}>🔒</span>}
                </span>
              </button>
            )
          })}
        </div>
        <ObArrow dir={-1} onClick={() => stepIdxBy(-1)} disabled={curIdx === 0} label={t('onboarding.prevDeck')} />
        <ObArrow dir={1} onClick={() => stepIdxBy(1)} disabled={curIdx >= items - 1} label={t('onboarding.nextDeck')} />
        {!onDeck && cos && avatars.length === 0 && (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center" style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.starter.noAvatars')}</p>
        )}
      </div>

      {/* ── Caption po karusele ── */}
      <div className="relative shrink-0 text-center" style={{ minHeight: 44, zIndex: 3 }}>
        {onDeck && cur ? (
          <>
            <div style={{ font: '700 clamp(15px, 3.4vh, 20px) var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-text-primary)' }}>{cur.name}</div>
            <div style={{ font: '400 clamp(10px, 2vh, 12.5px) var(--ravenof-font-body)', color: accent }}>
              {cur.faction ?? ''} · {t('onboarding.cardsShort', { count: cur.cardCount })}
              {' — '}
              <button onClick={() => { playUiClick(); setDetailOpen(true) }} className="ravenof-press" style={{ font: 'inherit', color: 'var(--ravenof-gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>{t('onboarding.inspectDeck')}</button>
            </div>
          </>
        ) : !onDeck && curAv ? (
          <div style={{ font: '700 clamp(15px, 3.4vh, 20px) var(--ravenof-font-display)', letterSpacing: 1.5, color: 'var(--ravenof-text-primary)', textTransform: 'uppercase' }}>
            {curAv.name}{!avatarOwned(curAv) && <span style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', textTransform: 'none' }}> · {t('onboarding.ob.locked')}</span>}
          </div>
        ) : null}
      </div>

      {/* ── Apačia: ATGAL · taškai · CTA ── */}
      <div className="relative shrink-0 flex items-center justify-between" style={{ padding: `6px max(20px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 12px) max(20px, env(safe-area-inset-left, 0px))`, zIndex: 3 }}>
        <button onClick={() => { playUiClick(); setStep('deck') }} disabled={onDeck}
          className="ravenof-press" style={{ font: '700 13px var(--ravenof-font-display)', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)', background: 'none', border: 'none', cursor: onDeck ? 'default' : 'pointer', visibility: onDeck ? 'hidden' : 'visible' }}>
          ‹ {t('onboarding.ob.back')}
        </button>
        <span className="flex items-center gap-1.5" aria-label={t('onboarding.ob.stepOf', { step: onDeck ? 1 : 2, total: 2 })}>
          {[0, 1].map((i) => (
            <span key={i} className="rounded-full" style={{ width: (onDeck ? i === 0 : i === 1) ? 26 : 8, height: 8, transition: 'width 0.2s', background: (onDeck ? i === 0 : i === 1) ? 'var(--ravenof-gold-bright)' : 'rgba(255,255,255,0.22)' }} />
          ))}
        </span>
        {onDeck ? (
          <RavenofBannerButton onClick={nextFromDeck} disabled={!cur || busy} style={{ width: 'clamp(180px, 24vw, 252px)', padding: '12px 16px' }}>
            {busy ? t('onboarding.saving') : t('onboarding.ob.next')}
          </RavenofBannerButton>
        ) : (
          <RavenofBannerButton onClick={finish} disabled={busy} style={{ width: 'clamp(200px, 26vw, 268px)', padding: '12px 16px' }}>
            {busy ? t('onboarding.saving') : t('onboarding.ob.toTutorial')}
          </RavenofBannerButton>
        )}
      </div>

      {/* ── Kaladės detalės modalas (lore + kortų sąrašas) ── */}
      {detailOpen && cur && curMeta && createPortal(
        <div className="ravenof-body fixed inset-0 z-[420] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.88)', backdropFilter: 'blur(3px)' }}
          onClick={() => setDetailOpen(false)} role="dialog" aria-modal="true" aria-label={cur.name}>
          <div onClick={(e) => e.stopPropagation()} className="w-[min(620px,96vw)] flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100dvh - 40px)', background: 'var(--ravenof-bg-surface)', border: `1px solid ${accent}`, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
            <div className="shrink-0 px-4 pt-3 pb-2.5" style={{ borderBottom: `1px solid ${accent}44` }}>
              <div className="flex items-center gap-2">
                {curFac?.iconUrl && <SmartImg src={curFac.iconUrl} width={40} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />}
                <p style={{ font: '700 15px var(--ravenof-font-display)', color: accent, letterSpacing: 1, margin: 0 }}>{cur.faction ?? cur.name}</p>
                <span className="ml-auto flex items-center gap-1" aria-label={t('onboarding.complexityAria', { label: complexityLabel(curMeta.complexity) })}>
                  {[1, 2, 3].map((n) => <span key={n} className="rounded-full" style={{ width: 6, height: 6, background: n <= curMeta.complexity ? accent : 'rgba(255,255,255,0.18)' }} />)}
                  <span style={{ font: '400 9px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', marginLeft: 3 }}>{complexityLabel(curMeta.complexity)}</span>
                </span>
                <button onClick={() => setDetailOpen(false)} aria-label={t('common.close')} className="ravenof-iconbtn" style={{ width: 28, height: 28 }}><X className="w-4 h-4" /></button>
              </div>
              <p className="mt-1" style={{ font: '400 11.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)', lineHeight: 1.45, margin: '4px 0 0' }}>{curMeta.intro}</p>
              <p style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.4, margin: '2px 0 0' }}>{curMeta.playstyle}</p>
            </div>
            <div className="shrink-0 grid grid-cols-2 gap-x-3 px-4 py-2" style={{ borderBottom: `1px solid ${accent}22` }}>
              <div>
                <p className="font-bold" style={{ font: '700 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-success)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{t('onboarding.strengths')}</p>
                {curMeta.strengths.map((s) => <p key={s} style={{ font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.5, margin: 0 }}>✓ {s}</p>)}
              </div>
              <div>
                <p className="font-bold" style={{ font: '700 9.5px var(--ravenof-font-body)', color: '#c65563', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{t('onboarding.weaknesses')}</p>
                {curMeta.weaknesses.map((s) => <p key={s} style={{ font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.5, margin: 0 }}>✗ {s}</p>)}
                <p style={{ font: '400 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.4, margin: '2px 0 0' }}>💡 {curMeta.recommendedFor}</p>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll px-3 py-1.5" style={{ minHeight: 80 }}>
              {curCards === 'loading' || curCards === undefined ? (
                <p className="text-center py-6" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.loadingCards')}</p>
              ) : curCards === 'error' ? (
                <div className="text-center py-5">
                  <p style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.cardsLoadFailed')}</p>
                  <button onClick={() => { playUiClick(); setCardsCache((c) => { const n = { ...c }; delete n[cur.id]; return n }); ensureCards(cur.id) }}
                    className="ravenof-btn ravenof-btn-secondary mt-1.5" style={{ fontSize: 11, padding: '6px 12px', minHeight: 30 }}>{t('onboarding.retryShort')}</button>
                </div>
              ) : (
                groups.map((gr) => (
                  <div key={gr.title} className="mb-1.5">
                    <p className="px-1 font-bold" style={{ font: '700 9px var(--ravenof-font-body)', color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{gr.title} · {gr.cards.reduce((s, c) => s + c.quantity, 0)}</p>
                    {gr.cards.map((c) => (
                      <button key={c.cardId} onClick={() => { playUiClick(); setPreview(c) }}
                        className="w-full flex items-center gap-2 px-1.5 py-1 text-left transition-colors hover:bg-white/5" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span className="shrink-0 overflow-hidden" style={{ width: 26, height: 35, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)' }}>
                          {c.imageUrl && <SmartImg src={c.imageUrl} width={64} alt="" className="w-full h-full object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold" style={{ font: '700 11px var(--ravenof-font-body)', color: c.rarityColor ?? 'var(--ravenof-text-primary)' }}>{c.name}</span>
                          <span className="block truncate" style={{ font: '400 8.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{[c.type, c.rarity].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="shrink-0 tabular-nums" style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-gold)' }}>🪙{c.gold}</span>
                        <span className="shrink-0 tabular-nums font-bold" style={{ font: '700 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>×{c.quantity}</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>, document.body)}

      {preview && <CardPreview card={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
