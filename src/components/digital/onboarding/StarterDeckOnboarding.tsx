'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Starter onboarding v2 (2026-09-25) — booster'io atplėšimo lygio prezentacija.
// Dviejų žingsnių srautas (tie patys RPC: claim → equip):
//  1) PASIRINK PRADINĘ KALADĘ — 3D dėžutės ant altoriaus (frakcijos spalvos
//     nuotaika, švytintis diskas, plūduriavimas), po dėžute frakcija / vardas /
//     stiprybių žymos / sudėtingumas, dešinėje 3 raktinės kortos vėduokle.
//     PASIRINKTI → rvn_claim_starter_deck → ATIDARYMO SCENA (dėžutė sudreba,
//     dangtis nulekia, blyksnis + banga + kibirkštys frakcijos spalva, 5 kortos
//     iššauna vėduokle ir susirenka į kaladę) → 2 žingsnis.
//  2) PASIRINK SAVO VEIDĄ — rodomi TIK atrakinti avatarai (iki 2), dideli
//     medalionai su kovos HUD rėmu, vardu ir lore; vienas iš anksto pasirinktas.
//     Į MOKOMĄJĄ KOVĄ → avataras nuskrenda į HUD vietą → equip → /digital/tutorial.
// Dalelės — vienas sprite canvas (tas pats principas kaip PackOpen: be shadowBlur,
// RAF tik kol yra dalelių, reduced-motion = be dalelių).
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
import { playUiClick, playSuccess, playError, playCardPick, playImpact, playDiscovery } from '@/lib/ui-sound'
import { SmartImg } from '@/components/ui/SmartImg'
import { RavenofBannerButton, RAVENOF_ASSET, ravenofFactionIcon } from '@/components/digital/ui/RavenofKit'

const TYPE_ORDER = ['čempion', 'padar', 'būtyb', 'burt', 'kerai', 'reakcij', 'artefakt', 'lauk']
const GOLD = '#D4A33B'
const BOX_GAP = 30
const AVATAR_FRAME = `${RAVENOF_ASSET}/combat/avatars/frame-avatar-player.png`
const MAX_PICKABLE_AVATARS = 2

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

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

// ── Kibirkščių canvas (sprite, be shadowBlur) ─────────────────────────────────
type Spark = { x: number; y: number; vx: number; vy: number; l: number; d: number; r: number; c: string }
const spriteCache = new Map<string, HTMLCanvasElement>()
function sprite(c: string): HTMLCanvasElement {
  let s = spriteCache.get(c)
  if (s) return s
  s = document.createElement('canvas'); s.width = s.height = 64
  const g = s.getContext('2d')!
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64)
  spriteCache.set(c, s)
  return s
}
function useSparks(disabled: boolean) {
  const cv = useRef<HTMLCanvasElement>(null)
  const parts = useRef<Spark[]>([])
  const raf = useRef(0)
  const loop = useCallback(() => {
    const c = cv.current; const ctx = c?.getContext('2d')
    if (!c || !ctx) { raf.current = 0; return }
    if (c.width !== c.clientWidth || c.height !== c.clientHeight) { c.width = c.clientWidth; c.height = c.clientHeight }
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.globalCompositeOperation = 'lighter'
    const ps = parts.current
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.vx *= 0.98; p.l -= p.d
      if (p.l <= 0) { ps.splice(i, 1); continue }
      ctx.globalAlpha = p.l
      const r = p.r * 3 * p.l
      ctx.drawImage(sprite(p.c), p.x - r, p.y - r, r * 2, r * 2)
    }
    ctx.globalAlpha = 1
    raf.current = ps.length ? requestAnimationFrame(loop) : 0
    if (!ps.length) ctx.clearRect(0, 0, c.width, c.height)
  }, [])
  const burst = useCallback((x: number, y: number, col: string, n: number) => {
    if (disabled) return
    const cap = Math.max(0, 260 - parts.current.length)
    for (let i = 0; i < Math.min(n, cap); i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 9
      parts.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, l: 1, d: 0.012 + Math.random() * 0.02, r: 2 + Math.random() * 4, c: Math.random() < 0.4 ? '#fff6d6' : col })
    }
    if (!raf.current) raf.current = requestAnimationFrame(loop)
  }, [disabled, loop])
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])
  return { cv, burst }
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
          : <div className="flex items-center justify-center" style={{ width: 'min(300px, 40vw)', aspectRatio: '3/4', background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-strong)' }}><span className="text-5xl">🎴</span></div>}
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

// ── Karuselės strėlė ──────────────────────────────────────────────────────────
function ObArrow({ dir, onClick, disabled, label }: { dir: -1 | 1; onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="ravenof-press absolute top-1/2 -translate-y-1/2 flex items-center justify-center disabled:opacity-25"
      style={{ [dir === -1 ? 'left' : 'right']: 'max(10px, 2vw)', width: 38, height: 38, zIndex: 6,
        background: 'rgba(11,9,16,0.72)', border: '1px solid var(--ravenof-border-strong)',
        color: 'var(--ravenof-text-primary)', font: '700 15px var(--ravenof-font-display)', cursor: disabled ? 'default' : 'pointer' }}>
      {dir === -1 ? '‹' : '›'}
    </button>
  )
}

// Komponento CSS (scoped .rvn-ob) — 3D dėžutė, plūduriavimas, dangčio nulėkimas, medalionas.
const CSS = `
.rvn-ob .ob-box{position:absolute;bottom:0;cursor:pointer;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.2,.8,.2,1),filter .45s,opacity .45s;will-change:transform}
.rvn-ob .ob-b3d{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.rvn-ob .ob-front{position:absolute;inset:0;border-radius:6px;overflow:hidden;border:2px solid rgba(212,163,59,.55);background:#0d0a14;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),0 20px 40px rgba(0,0,0,.7);transform:translateZ(15px)}
.rvn-ob .ob-front:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 70%,rgba(0,0,0,.7))}
.rvn-ob .ob-side{position:absolute;right:0;top:0;width:30px;height:100%;background:linear-gradient(90deg,#3a2818,#150e08);border:1px solid rgba(212,163,59,.35);transform:rotateY(90deg) translateZ(calc(var(--bw) - 15px)) translateX(15px);border-radius:0 4px 4px 0}
.rvn-ob .ob-top{position:absolute;left:0;top:0;width:100%;height:30px;background:linear-gradient(180deg,#4a3620,#1a120a);border:1px solid rgba(212,163,59,.45);transform:rotateX(90deg) translateZ(15px) translateY(-15px)}
.rvn-ob .ob-lid{position:absolute;inset:0;border-radius:6px;overflow:hidden;opacity:0;transform:translateZ(16px);pointer-events:none}
.rvn-ob .ob-disc{position:absolute;left:-30px;right:-30px;bottom:-22px;height:44px;border-radius:50%;background:radial-gradient(ellipse,var(--c) 0%,transparent 70%);opacity:0;filter:blur(6px);transition:opacity .45s}
.rvn-ob .ob-box.foc{z-index:3;animation:ob-float 3.2s ease-in-out infinite}
.rvn-ob .ob-box.foc .ob-b3d{transform:rotateY(-16deg) rotateX(4deg)}
.rvn-ob .ob-box.foc .ob-front{border-color:var(--c);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 30px 50px rgba(0,0,0,.75),0 0 40px color-mix(in srgb,var(--c) 55%,transparent)}
.rvn-ob .ob-box.foc .ob-disc{opacity:.9}
.rvn-ob .ob-box.n1{filter:brightness(.55)}
.rvn-ob .ob-box.n2{filter:brightness(.3);opacity:.7}
.rvn-ob .ob-box.shake{animation:ob-shake .35s linear 2}
.rvn-ob .ob-box.burst .ob-lid{opacity:1;animation:ob-lid .7s cubic-bezier(.2,.7,.2,1) forwards}
.rvn-ob .ob-box.burst .ob-front img{filter:brightness(2.2)}
@keyframes ob-float{0%,100%{transform:translate(var(--tx),-26px) scale(1.14)}50%{transform:translate(var(--tx),-32px) scale(1.14)}}
@keyframes ob-shake{0%,100%{transform:translate(var(--tx),-26px) scale(1.14) rotate(0)}25%{transform:translate(var(--tx),-26px) scale(1.14) rotate(-2deg)}75%{transform:translate(var(--tx),-26px) scale(1.14) rotate(2deg)}}
@keyframes ob-lid{to{transform:translateZ(60px) translateY(-260px) rotateX(70deg);opacity:0}}
@keyframes ob-ring{0%{opacity:.9;width:20px;height:20px}100%{opacity:0;width:560px;height:560px;border-width:1px}}
.rvn-ob .ob-ring{position:absolute;border-radius:50%;border:3px solid var(--c);transform:translate(-50%,-50%);opacity:0;pointer-events:none;z-index:7;animation:ob-ring .7s ease-out forwards}
.rvn-ob .ob-fly{position:absolute;aspect-ratio:1044/1416;border-radius:5px;overflow:hidden;border:1.5px solid rgba(212,163,59,.8);box-shadow:0 12px 30px #000,0 0 18px color-mix(in srgb,var(--c) 50%,transparent);opacity:0;z-index:7;pointer-events:none;background:#0d0a14}
.rvn-ob .ob-fly.champ{border-color:#ffe28c;box-shadow:0 12px 30px #000,0 0 28px rgba(212,163,59,.7)}
.rvn-ob .ob-fly img{width:100%;height:100%;object-fit:contain;display:block}
.rvn-ob .ob-av{position:relative;text-align:center;cursor:pointer;transition:transform .4s,filter .4s,opacity .4s;background:none;border:0;padding:0;color:inherit}
.rvn-ob .ob-av .ob-halo{position:absolute;inset:-10px;border-radius:50%;background:radial-gradient(circle,rgba(212,163,59,.55),transparent 65%);opacity:0;transition:opacity .4s;filter:blur(6px)}
.rvn-ob .ob-av.sel{transform:scale(1.08) translateY(-4px)}
.rvn-ob .ob-av.sel .ob-halo{opacity:1;animation:ob-pulse 2.4s ease-in-out infinite}
.rvn-ob .ob-av.dim{filter:brightness(.45) saturate(.5);transform:scale(.9)}
@keyframes ob-pulse{50%{opacity:.6}}
.rvn-ob .ob-vs:before,.rvn-ob .ob-vs:after{content:'';position:absolute;left:50%;width:1px;height:60px;background:linear-gradient(180deg,transparent,rgba(212,163,59,.6),transparent)}
.rvn-ob .ob-vs:before{top:-70px}.rvn-ob .ob-vs:after{bottom:-70px}
.rvn-ob .ob-avfly{position:absolute;border-radius:50%;overflow:hidden;z-index:9;border:3px solid #d4a33b;box-shadow:0 0 30px rgba(212,163,59,.7);transition:all .8s cubic-bezier(.3,.9,.3,1);pointer-events:none}
.rvn-ob .ob-avfly img{width:100%;height:100%;object-fit:cover}
@media (prefers-reduced-motion: reduce){.rvn-ob .ob-box.foc,.rvn-ob .ob-box.shake,.rvn-ob .ob-av.sel .ob-halo{animation:none}}
`

const HEX_CLIP = 'polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)'

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
  const [avSel, setAvSel] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [cardsCache, setCardsCache] = useState<Record<string, StarterCard[] | 'loading' | 'error'>>({})
  const [preview, setPreview] = useState<StarterCard | null>(null)
  const [busy, setBusy] = useState(false)
  const [opening, setOpening] = useState(false)
  const [claimErr, setClaimErr] = useState<string | null>(null)
  const [claimedId, setClaimedId] = useState<string | null>(null)
  const [dragDx, setDragDx] = useState(0)
  const [boxW, setBoxW] = useState(150)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const flyRef = useRef<HTMLDivElement | null>(null)
  const flashRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  const { cv, burst } = useSparks(rm)

  const load = useCallback(() => {
    setStarters(null)
    getStarterDecks().then((d) => setStarters(d.length ? d : 'error')).catch(() => setStarters('error'))
    getFactions().then(setFactions)
    getCosmetics().then(setCos)
  }, [])
  useEffect(() => { load() }, [load])

  // Dėžutės plotis iš REALAUS karuselės konteinerio aukščio: fokusuota dėžutė
  // (×1.14 + pakilimas) turi tilpti tarp antraštės ir info bloko, kad nenusikirptų viršus.
  const areaRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const f = () => {
      const h = el.clientHeight
      const fit = (h - 70) / (1.14 * 1.53)          // 70 px: pakilimas + diskas + tarpas
      setBoxW(Math.round(Math.max(92, Math.min(170, fit))))
    }
    f()
    const ro = new ResizeObserver(f); ro.observe(el)
    return () => ro.disconnect()
  }, [step])

  const list = useMemo(() => (Array.isArray(starters) ? starters : []), [starters])
  const avatarOwned = useCallback((c: Cosmetic) => (cos?.owned ?? []).includes(c.id) || !!c.ownedByDefault, [cos])
  // Tik ATRAKINTI avatarai (iki 2) — užrakintų naujokui nerodom.
  const pickable = useMemo<Cosmetic[]>(() => (cos?.items ?? []).filter((c) => c.kind === 'avatar' && avatarOwned(c)).slice(0, MAX_PICKABLE_AVATARS), [cos, avatarOwned])
  useEffect(() => { if (avSel == null && pickable.length) setAvSel(pickable[0].id) }, [pickable, avSel])

  const onDeck = step === 'deck'
  const cur = list[idx] ?? null
  const curMeta = cur ? starterMetaFor(cur.factionId, cur.faction ?? cur.name) : null
  const curFac = cur?.factionId != null ? factions[cur.factionId] : undefined
  const accent = curFac?.colorHex ?? GOLD

  // kortų turinys (raktinės kortos + detalių modalas)
  const ensureCards = useCallback((id: string) => {
    setCardsCache((c) => (c[id] ? c : { ...c, [id]: 'loading' }))
    getStarterDeckCards(id).then((cards) => { setCardsCache((c) => ({ ...c, [id]: cards ?? 'error' })) })
  }, [])
  useEffect(() => { if (cur && !cardsCache[cur.id]) ensureCards(cur.id) }, [cur, cardsCache, ensureCards])

  const curCards = cur ? cardsCache[cur.id] : undefined
  // Raktinės kortos: čempionas + 2 rečiausios (arba brangiausios) — vėduoklei ir atidarymo scenai.
  const keyCards = useMemo<StarterCard[]>(() => {
    if (!Array.isArray(curCards)) return []
    const champ = curCards.find((c) => c.isChampion)
    const rest = curCards.filter((c) => !c.isChampion).sort((a, b) => (b.raritySort - a.raritySort) || (b.gold - a.gold))
    return [...(champ ? [champ] : []), ...rest].slice(0, 5)
  }, [curCards])

  // kaimynų artwork preload
  useEffect(() => {
    for (const j of [idx - 1, idx + 1]) { const d = list[j]; if (d?.imageUrl) { const im = new Image(); im.src = d.imageUrl } }
  }, [idx, list])

  const goIdx = useCallback((n: number) => {
    const i = Math.max(0, Math.min(list.length - 1, n))
    if (i === idx) return
    playUiClick(); setIdx(i); setDetailOpen(false)
  }, [idx, list.length])

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (opening) return
    if (onDeck && e.key === 'ArrowLeft') { e.preventDefault(); goIdx(idx - 1) }
    else if (onDeck && e.key === 'ArrowRight') { e.preventDefault(); goIdx(idx + 1) }
    else if (e.key === 'Escape' && detailOpen && !preview) setDetailOpen(false)
  }, [goIdx, idx, onDeck, opening, detailOpen, preview])

  // Drag / swipe karuselei (pointer events — veikia ir pele, ir lietimu)
  const railPointer = {
    onPointerDown: (e: React.PointerEvent) => { if (opening) return; drag.current = { x: e.clientX, moved: false }; setDragDx(0) },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current; if (!d) return
      const dx = e.clientX - d.x
      if (Math.abs(dx) > 6) d.moved = true
      if (d.moved) setDragDx(dx)
    },
    onPointerUp: (e: React.PointerEvent) => {
      const d = drag.current; if (!d) return
      const dx = e.clientX - d.x
      const stepW = boxW + BOX_GAP
      if (d.moved) { const n = Math.round(-dx / stepW); if (n !== 0) goIdx(idx + n) }
      setDragDx(0)
      window.setTimeout(() => { drag.current = null }, 0)
    },
    onPointerCancel: () => { drag.current = null; setDragDx(0) },
  }

  // ── ATIDARYMO SCENA: dėžutė sudreba → dangtis → blyksnis/banga/kibirkštys → kortų vėduoklė → kaladė ──
  const playOpen = useCallback(async () => {
    const stage = stageRef.current, rail = railRef.current, fly = flyRef.current
    const box = rail?.children[idx] as HTMLElement | undefined
    if (!stage || !box || !fly || rm) return
    const col = accent
    box.classList.add('shake'); playCardPick()
    await wait(700)
    box.classList.remove('shake'); box.classList.add('burst')
    const s = stage.getBoundingClientRect(), r = box.getBoundingClientRect()
    const x = r.left - s.left + r.width / 2, y = r.top - s.top + r.height * 0.35
    // blyksnis
    const fl = flashRef.current
    if (fl) { fl.style.transition = 'none'; fl.style.opacity = '0.35'; requestAnimationFrame(() => { fl.style.transition = 'opacity .5s'; fl.style.opacity = '0' }) }
    // banga
    const ring = document.createElement('div'); ring.className = 'ob-ring'; ring.style.setProperty('--c', col); ring.style.left = `${x}px`; ring.style.top = `${y + 20}px`
    fly.appendChild(ring); window.setTimeout(() => ring.remove(), 800)
    burst(x, y, col, 120); playImpact()
    stage.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-5px,3px)' }, { transform: 'translate(4px,-4px)' }, { transform: 'translate(0,0)' }], { duration: 260 })
    await wait(250)
    // kortų vėduoklė (čempionas centre); jei kortų dar nėra — dėžutės paveikslas
    const arts = keyCards.length ? keyCards : []
    const order = arts.length >= 5 ? [arts[1], arts[3], arts[0], arts[4], arts[2]] : arts.length >= 3 ? [arts[1], arts[2], arts[0], arts[1], arts[2]] : [null, null, arts[0] ?? null, null, null]
    const cw = Math.round(boxW * 0.64)
    const els: HTMLElement[] = []
    order.forEach((c, i) => {
      const el = document.createElement('div')
      el.className = 'ob-fly' + (i === 2 ? ' champ' : '')
      el.style.setProperty('--c', col); el.style.width = `${cw}px`; el.style.left = `${x - cw / 2}px`; el.style.top = `${y}px`
      const src = c?.imageUrl ?? cur?.imageUrl ?? null
      if (src) { const im = document.createElement('img'); im.src = src; im.alt = ''; el.appendChild(im) }
      fly.appendChild(el); els.push(el)
      const ang = (i - 2) * 16, dx = (i - 2) * (cw * 1.25)
      el.animate([
        { opacity: 0, transform: 'translate(0,60px) scale(.4) rotate(0deg)' },
        { opacity: 1, transform: `translate(${dx}px,-120px) scale(1.15) rotate(${ang}deg)`, offset: 0.5 },
        { opacity: 1, transform: `translate(${dx}px,-110px) scale(1) rotate(${ang}deg)` },
      ], { duration: 900, delay: i * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' })
      window.setTimeout(() => { const cr = el.getBoundingClientRect(); burst(cr.left - s.left + cr.width / 2, cr.top - s.top + cr.height / 2, i === 2 ? '#ffe28c' : col, i === 2 ? 40 : 14); if (i === 2) playDiscovery() }, 450 + i * 70)
    })
    await wait(1700)
    playSuccess()
    els.forEach((el, i) => el.animate([
      { transform: getComputedStyle(el).transform, opacity: 1 },
      { transform: 'translate(0,-60px) scale(.6) rotate(0deg)', opacity: 0.9 },
      { transform: `translate(${s.width * 0.34}px,${s.height * 0.25}px) scale(.3)`, opacity: 0 },
    ], { duration: 800, delay: i * 40, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }))
    await wait(900)
    els.forEach((el) => el.remove()); box.classList.remove('burst')
  }, [idx, rm, accent, burst, keyCards, boxW, cur])

  // PASIRINKTI (1 žingsnis): claim (idempotentiškas) → atidarymo scena → avatarų žingsnis
  const nextFromDeck = async () => {
    if (!cur || busy || opening) return
    setClaimErr(null)
    if (!(cur.claimed || claimedId === cur.id)) {
      setBusy(true)
      const res = await claimStarterDeck(cur.id)
      setBusy(false)
      if ('error' in res) {
        playError()
        setClaimErr(res.error.includes('already claimed') ? t('onboarding.starter.alreadyClaimed')
          : res.error.includes('not enough gold') ? t('onboarding.claimErrGold') : t('onboarding.claimErrSave'))
        return
      }
      setClaimedId(cur.id)
    }
    setOpening(true); setDetailOpen(false)
    try { await playOpen() } finally { setOpening(false) }
    setStep('avatar')
  }

  // Į MOKOMĄJĄ KOVĄ (2 žingsnis): avataras nuskrenda į HUD vietą → equip → mokymų kova
  const finish = async () => {
    if (busy) return
    const chosen = pickable.find((c) => c.id === avSel) ?? null
    setBusy(true)
    if (!rm && chosen && stageRef.current) {
      const stage = stageRef.current
      const por = stage.querySelector<HTMLElement>(`[data-av="${chosen.id}"] .ob-por`)
      const hud = stage.querySelector<HTMLElement>('.ob-hud')
      const img = por?.querySelector('img')
      if (por && hud && img) {
        const s = stage.getBoundingClientRect(), r = por.getBoundingClientRect(), h = hud.getBoundingClientRect()
        const f = document.createElement('div'); f.className = 'ob-avfly'
        f.style.cssText = `left:${r.left - s.left}px;top:${r.top - s.top}px;width:${r.width}px;height:${r.height}px`
        const im = document.createElement('img'); im.src = img.src; im.alt = ''; im.style.objectPosition = img.style.objectPosition; f.appendChild(im)
        stage.appendChild(f)
        playCardPick()
        await new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())))
        f.style.left = `${h.left - s.left}px`; f.style.top = `${h.top - s.top}px`; f.style.width = `${h.width}px`; f.style.height = `${h.height}px`
        await wait(850)
        burst(h.left - s.left + h.width / 2, h.top - s.top + h.height / 2, GOLD, 50)
        await wait(500)
      }
    }
    if (chosen) await equipCosmetic('avatar', chosen.id)
    playSuccess()
    setBusy(false)
    router.replace('/digital/tutorial')
    router.refresh()
  }

  // ── Kraunama / klaida ──
  if (starters === null) {
    return <div className="ravenof-body h-full flex flex-col items-center justify-center gap-2" style={{ background: 'var(--ravenof-bg-base)' }}><span className="ravenof-spinner" style={{ width: 40, height: 40 }} /><p style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.preparingDecks')}</p></div>
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

  const boxH = Math.round(boxW * 1.53)
  const stepW = boxW + BOX_GAP
  const chips = curMeta ? curMeta.strengths.filter((s) => s.length <= 22).slice(0, 3) : []
  const chosenAv = pickable.find((c) => c.id === avSel) ?? null

  return (
    <div ref={stageRef} className="rvn-ob ravenof-body ravenof-in h-full w-full flex flex-col outline-none relative overflow-hidden" tabIndex={0} onKeyDown={onKey}
      style={{ background: 'var(--ravenof-bg-base)' }}>
      <style>{CSS}</style>
      {/* fonas — katedros griuvėsiai + frakcijos nuotaika */}
      <div aria-hidden className="absolute inset-0" style={{ background: `url('${RAVENOF_ASSET}/backgrounds/background-cathedral-ruins.webp') center / cover no-repeat`, opacity: 0.22 }} />
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 45%, transparent 30%, rgba(7,6,10,0.88) 100%), linear-gradient(0deg, rgba(7,6,10,0.55), rgba(7,6,10,0.2) 40%, rgba(7,6,10,0.5))' }} />
      <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 60%, ${onDeck ? accent : GOLD} 0%, transparent 70%)`, opacity: 0.2, mixBlendMode: 'screen', transition: 'background .6s' }} />
      <div ref={flashRef} aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: '#fff', opacity: 0, zIndex: 8 }} />
      <canvas ref={cv} aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 7 }} />
      <div ref={flyRef} aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 7 }} />

      {/* ── Antraštė: wordmark + kalba + žingsnis ── */}
      <div className="relative shrink-0 flex items-center justify-between" style={{ padding: `calc(env(safe-area-inset-top, 0px) + 12px) max(20px, env(safe-area-inset-right, 0px)) 0 max(20px, env(safe-area-inset-left, 0px))`, zIndex: 5 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${RAVENOF_ASSET}/logos/ravenof-wordmark.png`} alt="Ravenof" style={{ width: 92, height: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.6))' }} />
        <div className="flex items-center gap-3">
          <button onClick={toggleLang} aria-label="Kalba / Language" className="ravenof-press" style={{ font: '700 10px var(--ravenof-font-display)', color: 'var(--ravenof-text-secondary)', border: '1px solid var(--ravenof-border-strong)', background: 'rgba(11,9,16,0.6)', padding: '3px 8px', cursor: 'pointer', letterSpacing: 1 }}>{locale.toUpperCase()}</button>
          <span style={{ font: '700 12px var(--ravenof-font-display)', letterSpacing: 2, color: 'var(--ravenof-text-secondary)', textTransform: 'uppercase' }}>{t('onboarding.ob.stepOf', { step: onDeck ? 1 : 2, total: 2 })}</span>
        </div>
      </div>

      {/* ── Pavadinimas ── */}
      <div className="relative shrink-0 text-center" style={{ marginTop: 2, zIndex: 5 }}>
        <h1 style={{ font: '700 clamp(19px, 4.6vh, 26px) var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-text-primary)', margin: 0, textShadow: '0 2px 12px #000' }}>
          {onDeck ? t('onboarding.ob.deckTitle') : t('onboarding.ob.avatarTitle2')}
        </h1>
        <p style={{ font: '400 clamp(10px, 2vh, 12.5px) var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: '2px 0 0' }}>
          {onDeck ? t('onboarding.ob.deckSub2') : t('onboarding.ob.avatarSub2')}
        </p>
        {claimErr && <p role="alert" style={{ font: '500 11px var(--ravenof-font-body)', color: '#c65563', margin: '3px 0 0' }}>{claimErr}</p>}
      </div>

      {onDeck ? (
        <>
          {/* ── Dėžučių karuselė (3D) ── */}
          <div ref={areaRef} className="relative flex-1 min-h-0" style={{ zIndex: 3, touchAction: 'pan-y' }} {...railPointer}>
            <div ref={railRef} className="absolute" role="listbox" aria-label={t('onboarding.starterDecksAria')}
              style={{ left: '50%', bottom: 26, height: boxH, width: 0, perspective: 1100,
                transform: `translateX(${-(idx * stepW + boxW / 2) + dragDx}px)`, transition: drag.current?.moved ? 'none' : 'transform .45s cubic-bezier(.2,.8,.2,1)' }}>
              {list.map((d, i) => {
                const fac = d.factionId != null ? factions[d.factionId] : undefined
                const col = fac?.colorHex ?? GOLD
                const dist = Math.abs(i - idx)
                const cls = 'ob-box' + (dist === 0 ? ' foc' : dist === 1 ? ' n1' : ' n2')
                const tx = `${i * stepW}px`
                const base = dist === 0 ? `translate(${tx},-26px) scale(1.14)` : `translate(${tx},0) scale(${dist === 1 ? 0.92 : 0.8})`
                return (
                  <div key={d.id} role="option" aria-selected={i === idx} className={cls}
                    onClick={() => { if (drag.current?.moved || opening) return; if (i === idx) { playUiClick(); setDetailOpen(true) } else goIdx(i) }}
                    style={{ width: boxW, height: boxH, ['--c' as string]: col, ['--bw' as string]: `${boxW}px`, ['--tx' as string]: tx, transform: base }}>
                    <div className="ob-b3d" style={dist !== 0 ? { transform: `rotateY(${i < idx ? 28 : -28}deg)` } : undefined}>
                      <div className="ob-front">
                        {d.imageUrl
                          ? <SmartImg src={d.imageUrl} width={440} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 20%' }} />
                          : <span className="absolute inset-0 flex items-center justify-center text-4xl" aria-hidden>🎴</span>}
                        <span className="absolute flex items-center justify-center rounded-full" style={{ left: '50%', bottom: 12, transform: 'translateX(-50%)', width: 44, height: 44, zIndex: 2, background: 'radial-gradient(circle,#1a1325,#0a0810)', border: `2px solid ${col}`, boxShadow: `0 0 16px ${col}` }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={fac?.slug ? ravenofFactionIcon(fac.slug) : (fac?.iconUrl ?? ravenofFactionIcon(null))} alt="" draggable={false} style={{ width: 34, height: 34, objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(0,0,0,.8))' }} />
                        </span>
                        {(d.claimed || claimedId === d.id) && <span className="absolute left-0 right-0 text-center" style={{ bottom: 10, zIndex: 2, font: '800 8px var(--ravenof-font-body)', letterSpacing: '0.2em', color: '#7bd389' }}>{t('shop.owned')}</span>}
                      </div>
                      <div className="ob-side" /><div className="ob-top" />
                      <div className="ob-lid">{d.imageUrl && <SmartImg src={d.imageUrl} width={440} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 20%' }} />}</div>
                    </div>
                    <div className="ob-disc" />
                  </div>
                )
              })}
            </div>
            <ObArrow dir={-1} onClick={() => goIdx(idx - 1)} disabled={idx === 0 || opening} label={t('onboarding.prevDeck')} />
            <ObArrow dir={1} onClick={() => goIdx(idx + 1)} disabled={idx >= list.length - 1 || opening} label={t('onboarding.nextDeck')} />

            {/* Raktinės kortos (vėduoklė) — dešinėje apačioje */}
            {keyCards.length >= 3 && !opening && (
              <div className="absolute" style={{ right: 'max(24px, 3vw)', bottom: 'max(8px, 2vh)', width: 150, height: 96, zIndex: 4 }} aria-label={t('onboarding.ob.keyCards')}>
                <span className="absolute left-0 right-0 text-center" style={{ top: -14, font: '700 9px var(--ravenof-font-body)', letterSpacing: '0.2em', color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.ob.keyCards')}</span>
                {[keyCards[1], keyCards[0], keyCards[2]].map((c, j) => (
                  <button key={c.cardId} onClick={() => { playUiClick(); setPreview(c) }} className="ravenof-press absolute" aria-label={c.name}
                    style={{ left: j * 42, bottom: 0, width: 56, aspectRatio: '1044 / 1416', padding: 0, border: `1px solid ${j === 1 ? 'rgba(255,226,140,0.9)' : 'rgba(212,163,59,0.5)'}`, borderRadius: 4, overflow: 'hidden', background: '#0d0a14', cursor: 'pointer',
                      boxShadow: '0 8px 20px #000', zIndex: j === 1 ? 2 : 1, transform: j === 0 ? 'rotate(-14deg) translateY(8px)' : j === 2 ? 'rotate(14deg) translateY(8px)' : 'translateY(-4px)' }}>
                    {c.imageUrl && <SmartImg src={c.imageUrl} width={120} alt="" className="w-full h-full" style={{ objectFit: 'contain' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info po dėžute ── */}
          <div className="relative shrink-0 text-center" style={{ minHeight: 64, zIndex: 5, padding: '0 16px' }}>
            {cur && curMeta && (
              <>
                <div style={{ font: '700 11px var(--ravenof-font-body)', letterSpacing: 3, textTransform: 'uppercase', color: accent }}>{cur.faction ?? ''}</div>
                <div style={{ font: '700 clamp(15px, 3.4vh, 20px) var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-text-primary)', textShadow: '0 2px 10px #000' }}>{cur.name}</div>
                <div className="flex items-center justify-center flex-wrap gap-1.5" style={{ margin: '4px 0 2px' }}>
                  {chips.map((s) => <span key={s} style={{ font: '700 9px var(--ravenof-font-body)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, border: `1px solid ${accent}`, color: accent, background: 'rgba(0,0,0,0.5)' }}>{s}</span>)}
                  <span className="inline-flex items-center gap-1" style={{ font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', marginLeft: 6 }} aria-label={t('onboarding.complexityAria', { label: complexityLabel(curMeta.complexity) })}>
                    {[1, 2, 3].map((n) => <i key={n} className="rounded-full" style={{ width: 6, height: 6, display: 'inline-block', background: n <= curMeta.complexity ? accent : 'rgba(255,255,255,0.18)' }} />)}
                    <span style={{ marginLeft: 3 }}>{complexityLabel(curMeta.complexity)}</span>
                  </span>
                  <span style={{ font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>· {t('onboarding.cardsShort', { count: cur.cardCount })}</span>
                </div>
                <p style={{ font: '400 clamp(10px, 2vh, 12px) var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: 0, maxWidth: 560, marginInline: 'auto' }}>
                  {curMeta.intro}{' '}
                  <button onClick={() => { playUiClick(); setDetailOpen(true) }} className="ravenof-press" style={{ font: 'inherit', color: 'var(--ravenof-gold)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>{t('onboarding.inspectDeck')}</button>
                </p>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          {/* ── Avatarai: tik atrakinti (iki 2), dvikovos išdėstymas ── */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center" style={{ zIndex: 5 }}>
            {pickable.length === 0 ? (
              <p className="text-center px-6" style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.starter.noAvatars')}</p>
            ) : (
              <div className="relative flex items-start justify-center" style={{ gap: 'clamp(40px, 8vw, 110px)' }}>
                {pickable.length === 2 && <span className="ob-vs absolute" style={{ left: '50%', top: 'calc(clamp(150px, 34vh, 220px) / 2 - 8px)', transform: 'translateX(-50%)', font: '800 11px var(--ravenof-font-body)', letterSpacing: '0.3em', color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.ob.or')}</span>}
                {pickable.map((c) => {
                  const sel = c.id === avSel
                  const fit = c.portraitFit ?? { x: 50, y: 30, zoom: 100 }
                  return (
                    <button key={c.id} data-av={c.id} className={'ob-av' + (sel ? ' sel' : pickable.length > 1 ? ' dim' : '')} aria-pressed={sel}
                      onClick={() => { if (sel || busy) return; playUiClick(); setAvSel(c.id); const st = stageRef.current; const el = st?.querySelector<HTMLElement>(`[data-av="${c.id}"] .ob-med`); if (st && el) { const s = st.getBoundingClientRect(), r = el.getBoundingClientRect(); burst(r.left - s.left + r.width / 2, r.top - s.top + r.height / 2, GOLD, 60) } }}
                      style={{ width: 'clamp(150px, 34vh, 220px)' }}>
                      <span className="ob-med relative block" style={{ width: 'clamp(150px, 34vh, 220px)', height: 'clamp(150px, 34vh, 220px)' }}>
                        <span className="ob-halo" />
                        <span className="ob-por absolute block overflow-hidden" style={{ left: '19%', top: '9%', width: '62%', height: '62%', background: '#0d0a14', clipPath: HEX_CLIP }}>
                          {c.imageUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={c.imageUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fit.x}% ${fit.y}%`, transform: `scale(${Math.max(0.5, fit.zoom / 100)})`, transformOrigin: 'center' }} />
                            : <span className="absolute inset-0 flex items-center justify-center text-4xl" style={{ background: c.css ?? 'var(--ravenof-bg-surface)' }}>{c.emoji ?? '🙂'}</span>}
                        </span>
                        <span className="absolute inset-0 pointer-events-none" style={{ background: `url('${AVATAR_FRAME}') center / contain no-repeat` }} />
                      </span>
                      <span className="block" style={{ font: '700 clamp(15px, 3.2vh, 20px) var(--ravenof-font-display)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 6, color: 'var(--ravenof-text-primary)', textShadow: '0 2px 8px #000' }}>{c.name}</span>
                      {c.description && <span className="block" style={{ font: '400 clamp(10px, 2vh, 11.5px) var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', marginTop: 4, lineHeight: 1.4 }}>{c.description}</span>}
                    </button>
                  )
                })}
              </div>
            )}
            {/* HUD vieta — kur avataras bus kovoje (skrydžio taikinys) */}
            <span className="ob-hud absolute rounded-full" aria-hidden style={{ left: 24, bottom: 8, width: 64, height: 64, border: '1px dashed rgba(212,163,59,0.4)', opacity: 0.55 }}>
              <span className="absolute inset-0 flex items-center justify-center" style={{ font: '700 8px var(--ravenof-font-body)', letterSpacing: '0.2em', color: 'var(--ravenof-text-secondary)' }}>HUD</span>
            </span>
          </div>
          <p className="relative shrink-0 text-center" style={{ zIndex: 5, font: '400 clamp(10px, 2vh, 11.5px) var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: '0 0 4px' }}>{t('onboarding.ob.moreAvatars')}</p>
        </>
      )}

      {/* ── Apačia: ATGAL · taškai · CTA ── */}
      <div className="relative shrink-0 flex items-center justify-between" style={{ padding: `6px max(20px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 10px) max(20px, env(safe-area-inset-left, 0px))`, zIndex: 6 }}>
        <button onClick={() => { playUiClick(); setStep('deck') }} disabled={onDeck || busy}
          className="ravenof-press" style={{ font: '700 13px var(--ravenof-font-display)', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)', background: 'none', border: 'none', cursor: onDeck ? 'default' : 'pointer', opacity: onDeck ? 0.3 : 1 }}>
          ‹ {t('onboarding.ob.back')}
        </button>
        <span className="flex items-center gap-1.5" aria-label={t('onboarding.ob.stepOf', { step: onDeck ? 1 : 2, total: 2 })}>
          {[0, 1].map((i) => (
            <span key={i} className="rounded-full" style={{ width: (onDeck ? i === 0 : i === 1) ? 26 : 8, height: 8, transition: 'width 0.2s', background: (onDeck ? i === 0 : i === 1) ? 'var(--ravenof-gold)' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </span>
        {onDeck ? (
          <RavenofBannerButton onClick={nextFromDeck} disabled={!cur || busy || opening} style={{ width: 'clamp(180px, 24vw, 252px)', padding: '12px 16px' }}>
            {busy ? t('onboarding.saving') : opening ? '…' : t('onboarding.ob.pickDeck')}
          </RavenofBannerButton>
        ) : (
          <RavenofBannerButton onClick={finish} disabled={busy || (pickable.length > 0 && !chosenAv)} style={{ width: 'clamp(200px, 26vw, 268px)', padding: '12px 16px' }}>
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
