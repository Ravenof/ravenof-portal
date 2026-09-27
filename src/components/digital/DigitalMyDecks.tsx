'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — MANO KALADĖS „ALTORIUS" (v2, 2026-09-27):
// booster'io atplėšimo / onboarding v2 lygio scena vietoj lentynos.
// • Kairėje — 3D coverflow karuselė: pasirinkta kaladė didelė centre ant
//   švytinčio frakcijos spalvos altoriaus (runų žiedai, žarijos, atspindys),
//   kaimyninės pasuktos į gylį ir pritemdytos; virš pasirinktos plūduriuoja
//   iki 5 raktinių kortų vėduokle. Paskutinė vieta — „+ Nauja kaladė".
// • Dešinėje (portrete – apačioje) — info panelis: vardas, frakcija / tinkamumo /
//   aktyvumo žymos, statistika (count-up), aukso kreivė, raktinės kortos, didelis
//   AKTYVINTI + Redaguoti / Kortos / Kopija / Trinti.
// • Momentai: įėjimas (dėžutės atskrenda iš gylio), AKTYVINTI (antspaudas,
//   blyksnis, banga, kibirkštys, drebėjimas, kaspinas peršoka), netinkama —
//   dėžutė papurto, TRINTI — dėžutė sudega į žarijas.
// • Pilnas kortų sąrašas (tap → detali peržiūra) ir „Išbandyti" — šoniniame
//   meniu (drawer), atidaromame mygtuku KORTOS.
// Dalelės — vienas sprite canvas (kaip PackOpen / onboarding), reduced-motion =
// be dalelių ir be plūduriavimo. Valdymas: tap/click, rodyklės, ratukas, swipe.
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Edit2, Trash2, Copy, Lock, Globe, X, List } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LoadingOrRetry } from './ui/LoadingOrRetry'
import { playUiClick, playSuccess, playError, playCardFlip, playImpact, playCardPick } from '@/lib/ui-sound'
import { PlaytestButton } from '@/components/decks/PlaytestButton'
import { isDeckSizeValid, formatDeckCount, formatDeckCountShort } from '@/lib/deck-validation'
import { costCurve, COST_CURVE_LABELS, displayAvgCost } from '@/lib/cards/cost'
import { getStarterDecks } from '@/lib/starterDecks'
import { rarityColor } from '@/lib/digital/rarity'
import { SmartImg } from '@/components/ui/SmartImg'
import { useT, useGameContent } from '@/lib/i18n/react'
import { cardImage, cardText, ensureCardTranslations } from '@/lib/cards/i18n'
import { useActiveDeck } from '@/lib/digital/activeDeck'
import { useDesktopUi } from './ui/useDesktopUi'
import { DT } from './ui/deskTokens'
import { DeskDialog, useDialogFocus } from './ui/DeskKit'
import { ravenofFactionIcon } from './ui/RavenofKit'

const GOLD = '240,180,41'
const GOLD_HEX = '#d4a33b'
const MAX_KEYS = 5

type Deck = {
  id: string; name: string; faction: string | null; factionId: number | null; factionSlug: string | null; factionColor: string
  visibility: string; cardCount: number; avgGold: number; missing: number | null
  keys: string[]; curve: number[]; champions: number
}

type DeckCard = {
  id: string; name: string; image: string | null; gold: number
  atk: number | null; hp: number | null; effect: string | null
  rarity: string | null; type: string | null; isChampion: boolean
  qty: number; side: boolean
}

// ── Reduced motion ────────────────────────────────────────────────────────────
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

// ── Dalelių canvas: kibirkštys (sprogimai) + žarijos (nuolat kyla nuo altoriaus) ──
type Spark = { x: number; y: number; vx: number; vy: number; l: number; d: number; r: number; g: number; c: string }
const spriteCache = new Map<string, HTMLCanvasElement>()
function sprite(c: string): HTMLCanvasElement {
  let s = spriteCache.get(c)
  if (s) return s
  s = document.createElement('canvas'); s.width = s.height = 64
  const g = s.getContext('2d')!
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, c); gr.addColorStop(0.35, c); gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64)
  spriteCache.set(c, s)
  return s
}
function useParticles(disabled: boolean, emberAt: () => { x: number; y: number; w: number; c: string } | null) {
  const cv = useRef<HTMLCanvasElement>(null)
  const parts = useRef<Spark[]>([])
  const raf = useRef(0)
  const emberRef = useRef(emberAt); emberRef.current = emberAt
  const disabledRef = useRef(disabled); disabledRef.current = disabled
  const loop = useCallback(() => {
    const c = cv.current; const ctx = c?.getContext('2d')
    if (!c || !ctx) { raf.current = 0; return }
    if (c.width !== c.clientWidth || c.height !== c.clientHeight) { c.width = c.clientWidth; c.height = c.clientHeight }
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.globalCompositeOperation = 'lighter'
    const ps = parts.current
    // žarijos — nuolatinis, retas srautas nuo altoriaus (tik kai tab'as matomas)
    if (!disabledRef.current && !document.hidden && Math.random() < 0.3 && ps.length < 90) {
      const e = emberRef.current()
      if (e) ps.push({ x: e.x + (Math.random() - 0.5) * e.w, y: e.y, vx: (Math.random() - 0.5) * 0.4, vy: -0.6 - Math.random() * 0.9, l: 1, d: 0.004 + Math.random() * 0.004, r: 1 + Math.random() * 1.6, g: 0, c: e.c })
    }
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.l -= p.d
      if (p.l <= 0) { ps.splice(i, 1); continue }
      ctx.globalAlpha = p.l
      const r = p.r * 3 * Math.min(1, p.l * 1.5)
      ctx.drawImage(sprite(p.c), p.x - r, p.y - r, r * 2, r * 2)
    }
    ctx.globalAlpha = 1
    raf.current = requestAnimationFrame(loop)
  }, [])
  const burst = useCallback((x: number, y: number, col: string, n: number, pw = 1) => {
    if (disabledRef.current) return
    const cap = Math.max(0, 320 - parts.current.length)
    for (let i = 0; i < Math.min(n, cap); i++) {
      const a = Math.random() * Math.PI * 2, sp = (2 + Math.random() * 8) * pw
      parts.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, l: 1, d: 0.012 + Math.random() * 0.02, r: 2 + Math.random() * 4, g: 0.22, c: Math.random() < 0.4 ? '#fff6d6' : col })
    }
  }, [])
  useEffect(() => {
    if (disabled) return
    raf.current = requestAnimationFrame(loop)
    return () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = 0 }
  }, [disabled, loop])
  return { cv, burst }
}

// ── Skaičiaus „count-up" ──────────────────────────────────────────────────────
function useCountUp(to: number, dec: number, rm: boolean): string {
  const [v, setV] = useState(to)
  const from = useRef(to)
  useEffect(() => {
    if (rm) { setV(to); from.current = to; return }
    const f0 = from.current, t0 = performance.now()
    let id = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 500)
      const x = f0 + (to - f0) * (1 - Math.pow(1 - k, 3))
      setV(x)
      if (k < 1) id = requestAnimationFrame(step); else from.current = to
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [to, rm])
  return dec ? v.toFixed(dec) : String(Math.round(v))
}

const CSS = `
.rvn-dk{--mc:${GOLD_HEX};position:relative;isolation:isolate;overflow:hidden}
.rvn-dk-mood{position:absolute;inset:0;background:radial-gradient(55% 60% at 32% 62%,var(--mc) 0%,transparent 70%);opacity:.16;mix-blend-mode:screen;transition:background .7s;z-index:0;pointer-events:none}
.rvn-dk[data-port="1"] .rvn-dk-mood{background:radial-gradient(70% 45% at 50% 32%,var(--mc) 0%,transparent 70%)}
.rvn-dk-stage{position:relative;z-index:1;overflow:hidden;perspective:1400px;flex:1 1 auto;min-width:0;min-height:0;touch-action:pan-y}
.rvn-dk-floor{position:absolute;left:50%;top:var(--fy);width:calc(var(--bw)*1.6);height:calc(var(--bw)*.45);transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;z-index:0}
.rvn-dk-sig{position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse,color-mix(in srgb,var(--mc) 55%,transparent) 0%,color-mix(in srgb,var(--mc) 18%,transparent) 40%,transparent 70%);filter:blur(4px);transition:background .7s;animation:rvn-dk-sigb 3.2s ease-in-out infinite}
@keyframes rvn-dk-sigb{50%{opacity:.7;transform:scale(.96)}}
.rvn-dk-rune{position:absolute;inset:8% 4%;border-radius:50%;border:1px solid color-mix(in srgb,var(--mc) 70%,transparent);box-shadow:0 0 14px color-mix(in srgb,var(--mc) 50%,transparent),inset 0 0 20px color-mix(in srgb,var(--mc) 25%,transparent);transition:border-color .7s}
.rvn-dk-rune2{position:absolute;inset:22% 18%;border-radius:50%;border:1px dashed color-mix(in srgb,var(--mc) 60%,transparent);animation:rvn-dk-spin 18s linear infinite;transition:border-color .7s}
@keyframes rvn-dk-spin{to{transform:rotate(360deg)}}
.rvn-dk-floor.flare .rvn-dk-sig{animation:rvn-dk-flare .8s ease-out}
@keyframes rvn-dk-flare{0%{filter:blur(4px) brightness(3);transform:scale(1.25)}}
.rvn-dk-rail{position:absolute;left:50%;top:var(--fy);width:0;height:0;transform-style:preserve-3d;z-index:2}
.rvn-dk-box{position:absolute;left:0;top:0;width:var(--bw);height:calc(var(--bw)*1.36);margin-left:calc(var(--bw)*-.5);margin-top:calc(var(--bw)*-1.36);cursor:pointer;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.2,.8,.2,1),filter .55s,opacity .55s;transform:translate3d(var(--tx),0,var(--tz)) rotateY(var(--ry)) scale(var(--sc));filter:brightness(var(--br)) saturate(var(--sat));will-change:transform}
.rvn-dk-box.enter{animation:rvn-dk-enter .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--ed)}
@keyframes rvn-dk-enter{from{transform:translate3d(0,-40vh,-900px) scale(.3);opacity:0}}
.rvn-dk-b3d{position:absolute;inset:0;transform-style:preserve-3d}
.rvn-dk-box.foc .rvn-dk-b3d{animation:rvn-dk-float 3.4s ease-in-out infinite}
@keyframes rvn-dk-float{0%,100%{transform:translateY(-2%) rotateY(-10deg) rotateX(3deg)}50%{transform:translateY(-4.5%) rotateY(-10deg) rotateX(3deg)}}
.rvn-dk-front{position:absolute;inset:0;border-radius:6px;overflow:hidden;border:2px solid rgba(212,163,59,.5);background:#0d0a14;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),0 24px 46px rgba(0,0,0,.75),8px 8px 0 -2px #1c130b,14px 14px 0 -4px #120c08;transition:border-color .4s,box-shadow .4s}
.rvn-dk-front .rvn-dk-cov{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 18%}
.rvn-dk-front:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.88)),linear-gradient(120deg,rgba(255,255,255,.12),transparent 40%);pointer-events:none}
.rvn-dk-box.foc .rvn-dk-front{border-color:var(--c);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 30px 60px rgba(0,0,0,.8),0 0 46px color-mix(in srgb,var(--c) 55%,transparent),8px 8px 0 -2px #1c130b,14px 14px 0 -4px #120c08}
.rvn-dk-box.active .rvn-dk-front{border-color:${GOLD_HEX}}
.rvn-dk-box.active.foc .rvn-dk-front{box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 30px 60px rgba(0,0,0,.8),0 0 50px rgba(212,163,59,.6),8px 8px 0 -2px #1c130b,14px 14px 0 -4px #120c08}
.rvn-dk-fac{position:absolute;left:50%;bottom:calc(var(--bw)*.16);transform:translateX(-50%);width:calc(var(--bw)*.24);height:calc(var(--bw)*.24);border-radius:50%;background:radial-gradient(circle,#1a1325,#0a0810);border:2px solid var(--c);box-shadow:0 0 16px var(--c);display:grid;place-items:center;z-index:2}
.rvn-dk-fac img{width:70%;height:70%;object-fit:contain}
.rvn-dk-nm{position:absolute;left:6px;right:6px;bottom:calc(var(--bw)*.05);text-align:center;font:700 calc(var(--bw)*.075) var(--ravenof-font-display);letter-spacing:.06em;color:#f3ead3;text-shadow:0 2px 6px #000;z-index:2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rvn-dk-ribbon{position:absolute;top:-9px;left:50%;transform:translateX(-50%) translateZ(20px);font:800 calc(var(--bw)*.055) var(--ravenof-font-body);letter-spacing:.16em;padding:3px 10px;background:linear-gradient(180deg,#ffe08a,#d4a33b);color:#1a0f04;clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%);box-shadow:0 4px 12px rgba(0,0,0,.6);z-index:4;animation:rvn-dk-rpulse 2.4s ease-in-out infinite;white-space:nowrap}
@keyframes rvn-dk-rpulse{50%{filter:brightness(1.2) drop-shadow(0 0 10px rgba(212,163,59,.8))}}
.rvn-dk-ribbon.pop{animation:rvn-dk-rpop .6s cubic-bezier(.2,1.4,.3,1) both}
@keyframes rvn-dk-rpop{0%{transform:translateX(-50%) translateZ(20px) scale(2.2) rotate(-15deg);opacity:0}100%{transform:translateX(-50%) translateZ(20px) scale(1);opacity:1}}
.rvn-dk-warn{position:absolute;top:8px;left:50%;transform:translateX(-50%);font:800 calc(var(--bw)*.05) var(--ravenof-font-body);letter-spacing:.08em;padding:2px 7px;background:rgba(120,20,30,.92);border:1px solid #c65563;color:#ffb0b8;border-radius:3px;z-index:4;white-space:nowrap}
.rvn-dk-box.bad .rvn-dk-cov{filter:saturate(.45) brightness(.6)}
.rvn-dk-box.bad.foc .rvn-dk-cov{filter:saturate(.7) brightness(.8)}
.rvn-dk-refl{position:absolute;left:0;top:100%;width:100%;height:60%;overflow:hidden;opacity:.22;transform:scaleY(-1);mask-image:linear-gradient(0deg,rgba(0,0,0,.9),transparent);-webkit-mask-image:linear-gradient(0deg,rgba(0,0,0,.9),transparent);pointer-events:none;filter:blur(1px)}
.rvn-dk-refl img{width:100%;height:166%;object-fit:cover;object-position:50% 18%;border-radius:6px}
.rvn-dk-halo{position:absolute;left:50%;top:0;width:0;height:0;z-index:-1;pointer-events:none}
.rvn-dk-hc{position:absolute;width:calc(var(--bw)*.36);aspect-ratio:1044/1416;border-radius:4px;border:1px solid rgba(212,163,59,.7);box-shadow:0 10px 26px #000,0 0 14px color-mix(in srgb,var(--c) 45%,transparent);left:calc(var(--bw)*-.18);top:calc(var(--bw)*.34);opacity:0;transform:translate(0,0) rotate(0) scale(.5);transition:transform .6s cubic-bezier(.2,.8,.2,1),opacity .4s;transition-delay:var(--hd,0s);background:#0d0a14;overflow:hidden}
.rvn-dk-hc img{width:100%;height:100%;object-fit:cover;display:block}
.rvn-dk-box.foc .rvn-dk-hc{opacity:1;transform:translate(var(--hx),var(--hy)) rotate(var(--hr)) scale(1);animation:rvn-dk-hfloat 4s ease-in-out infinite;animation-delay:var(--hd)}
.rvn-dk-box.foc .rvn-dk-hc:nth-child(1){--hx:calc(var(--bw)*-.92);--hy:calc(var(--bw)*-.18);--hr:-26deg;--hd:.05s}
.rvn-dk-box.foc .rvn-dk-hc:nth-child(2){--hx:calc(var(--bw)*-.52);--hy:calc(var(--bw)*-.46);--hr:-13deg;--hd:.12s}
.rvn-dk-box.foc .rvn-dk-hc:nth-child(3){--hx:0px;--hy:calc(var(--bw)*-.58);--hr:0deg;--hd:.19s}
.rvn-dk-box.foc .rvn-dk-hc:nth-child(4){--hx:calc(var(--bw)*.52);--hy:calc(var(--bw)*-.46);--hr:13deg;--hd:.26s}
.rvn-dk-box.foc .rvn-dk-hc:nth-child(5){--hx:calc(var(--bw)*.92);--hy:calc(var(--bw)*-.18);--hr:26deg;--hd:.33s}
@keyframes rvn-dk-hfloat{50%{translate:0 -6px}}
.rvn-dk-ghost{border:2px dashed rgba(212,163,59,.45);background:rgba(7,6,10,.55);box-shadow:none;display:grid;place-items:center;align-content:center;gap:4px}
.rvn-dk-ghost:after{display:none}
.rvn-dk-ghost .rvn-dk-plus{font:300 calc(var(--bw)*.6) var(--ravenof-font-body);color:${GOLD_HEX};text-shadow:0 0 22px rgba(212,163,59,.7);animation:rvn-dk-rpulse 2.2s ease-in-out infinite;line-height:1}
.rvn-dk-ghost .rvn-dk-nm{position:static;color:var(--ravenof-text-secondary);font-size:calc(var(--bw)*.065)}
.rvn-dk-box.new.foc .rvn-dk-ghost{border-color:${GOLD_HEX};box-shadow:0 0 40px rgba(212,163,59,.4)}
.rvn-dk-arr{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:56px;background:rgba(11,9,16,.7);border:1px solid rgba(212,163,59,.35);color:#f3ead3;font:700 22px var(--ravenof-font-display);display:grid;place-items:center;cursor:pointer;z-index:6;border-radius:4px;transition:background .2s,opacity .2s}
.rvn-dk-arr:hover{background:rgba(212,163,59,.25)}.rvn-dk-arr:disabled{opacity:.25;cursor:default}
.rvn-dk-arr.l{left:10px}.rvn-dk-arr.r{right:10px}
.rvn-dk[data-port="1"] .rvn-dk-arr{width:34px;height:46px}
.rvn-dk-dots{position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:6px;z-index:6;pointer-events:none}
.rvn-dk-dots i{height:6px;width:6px;border-radius:99px;background:rgba(255,255,255,.2);transition:.3s}.rvn-dk-dots i.on{width:22px;background:${GOLD_HEX}}
.rvn-dk-canvas{position:absolute;inset:0;pointer-events:none;z-index:7}
.rvn-dk-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:8}
.rvn-dk-ring{position:absolute;width:20px;height:20px;border-radius:50%;border:3px solid ${GOLD_HEX};transform:translate(-50%,-50%);opacity:0;z-index:7;pointer-events:none}
.rvn-dk-ring.go{animation:rvn-dk-ring .75s ease-out forwards}
@keyframes rvn-dk-ring{0%{opacity:.95;width:20px;height:20px}100%{opacity:0;width:70vmin;height:70vmin;border-width:1px}}
.rvn-dk-stamp{position:absolute;width:150px;height:150px;margin:-75px 0 0 -75px;border:5px solid ${GOLD_HEX};border-radius:50%;display:grid;place-items:center;font:900 20px var(--ravenof-font-display);letter-spacing:.1em;color:#ffe08a;text-shadow:0 0 12px rgba(212,163,59,.8);box-shadow:0 0 30px rgba(212,163,59,.5),inset 0 0 30px rgba(212,163,59,.3);opacity:0;z-index:8;pointer-events:none;transform:scale(2.6) rotate(-25deg)}
.rvn-dk-stamp.go{animation:rvn-dk-stamp .8s cubic-bezier(.2,.9,.2,1) forwards}
@keyframes rvn-dk-stamp{35%{opacity:1;transform:scale(1) rotate(-12deg)}70%{opacity:1;transform:scale(1) rotate(-12deg)}100%{opacity:0;transform:scale(1.15) rotate(-12deg)}}
.rvn-dk-box.burn{animation:rvn-dk-burn 1s ease-in forwards;pointer-events:none}
@keyframes rvn-dk-burn{30%{filter:brightness(2.5) saturate(0)}100%{filter:brightness(0);opacity:0;transform:translate3d(var(--tx),30px,var(--tz)) scale(.7)}}
.rvn-dk-box.shake{animation:rvn-dk-shk .3s linear}
@keyframes rvn-dk-shk{20%{transform:translate3d(calc(var(--tx) - 8px),0,var(--tz)) rotateY(var(--ry)) scale(var(--sc))}40%{transform:translate3d(calc(var(--tx) + 8px),0,var(--tz)) rotateY(var(--ry)) scale(var(--sc))}60%{transform:translate3d(calc(var(--tx) - 6px),0,var(--tz)) rotateY(var(--ry)) scale(var(--sc))}80%{transform:translate3d(calc(var(--tx) + 4px),0,var(--tz)) rotateY(var(--ry)) scale(var(--sc))}}
.rvn-dk.quake{animation:rvn-dk-quake .28s linear}
@keyframes rvn-dk-quake{20%{transform:translate(-4px,3px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-3px,-3px)}80%{transform:translate(2px,2px)}}
/* panelis */
.rvn-dk-panel{position:relative;z-index:5;display:flex;flex-direction:column;gap:10px;padding:14px 16px 12px;flex:0 0 clamp(300px,36%,440px);background:linear-gradient(180deg,rgba(23,16,33,.92),rgba(13,10,20,.94) 60%,rgba(10,8,16,.96));border-left:1px solid rgba(212,163,59,.3);box-shadow:-20px 0 60px rgba(0,0,0,.6);overflow:hidden}
.rvn-dk-panel>*{opacity:0;transform:translateY(14px);transition:opacity .45s,transform .45s}
.rvn-dk-panel.show>*{opacity:1;transform:none}
.rvn-dk-panel.show>*:nth-child(1){transition-delay:.05s}.rvn-dk-panel.show>*:nth-child(2){transition-delay:.12s}.rvn-dk-panel.show>*:nth-child(3){transition-delay:.19s}.rvn-dk-panel.show>*:nth-child(4){transition-delay:.26s}.rvn-dk-panel.show>*:nth-child(5){transition-delay:.33s}.rvn-dk-panel.show>*:nth-child(6){transition-delay:.4s}
.rvn-dk[data-port="1"]{flex-direction:column}
.rvn-dk[data-port="1"] .rvn-dk-panel{flex:0 0 auto;border-left:0;border-top:1px solid rgba(212,163,59,.3);box-shadow:0 -20px 50px rgba(0,0,0,.6);padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));gap:8px}
.rvn-dk-pn{font:700 24px var(--ravenof-font-display);letter-spacing:1px;color:#f3ead3;text-shadow:0 2px 10px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rvn-dk[data-port="1"] .rvn-dk-pn,.rvn-dk[data-compact="1"] .rvn-dk-pn{font-size:18px}
.rvn-dk-chips{display:flex;flex-wrap:wrap;gap:6px}
.rvn-dk-chip{display:inline-flex;align-items:center;gap:4px;font:800 9px var(--ravenof-font-body);letter-spacing:.14em;text-transform:uppercase;padding:4px 9px;border:1px solid var(--cc);color:var(--cc);background:rgba(0,0,0,.5);clip-path:polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)}
.rvn-dk-chip.ok{--cc:#8fd45a}.rvn-dk-chip.no{--cc:#ff8a96;background:rgba(120,20,30,.5)}.rvn-dk-chip.act{--cc:#ffe08a;background:linear-gradient(180deg,rgba(212,163,59,.35),rgba(212,163,59,.15))}.rvn-dk-chip.mut{--cc:var(--ravenof-text-secondary)}
.rvn-dk-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.rvn-dk-st{background:rgba(0,0,0,.45);border:1px solid rgba(212,163,59,.25);padding:8px 6px;text-align:center;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
.rvn-dk-st b{display:block;font:800 22px var(--ravenof-font-display);color:#ffe08a;font-variant-numeric:tabular-nums;line-height:1.1}
.rvn-dk-st small{font:800 8.5px var(--ravenof-font-body);letter-spacing:.14em;color:var(--ravenof-text-secondary);text-transform:uppercase}
.rvn-dk[data-port="1"] .rvn-dk-st b,.rvn-dk[data-compact="1"] .rvn-dk-st b{font-size:17px}
.rvn-dk[data-port="1"] .rvn-dk-st,.rvn-dk[data-compact="1"] .rvn-dk-st{padding:5px 4px}
.rvn-dk-lbl{font:800 9px var(--ravenof-font-body);letter-spacing:.2em;color:var(--ravenof-text-secondary);margin-bottom:5px;text-transform:uppercase}
.rvn-dk-curvewrap{margin-bottom:12px}
.rvn-dk-curve{display:flex;gap:4px;align-items:flex-end;height:44px}
.rvn-dk-curve i{flex:1;position:relative;background:linear-gradient(180deg,#ffe28c,var(--c) 40%,color-mix(in srgb,var(--c) 40%,transparent));border-radius:2px 2px 0 0;transform:scaleY(0);transform-origin:bottom;transition:transform .5s cubic-bezier(.2,.8,.2,1),background .5s}
.rvn-dk-panel.show .rvn-dk-curve i{transform:scaleY(1)}
.rvn-dk-curve i:after{content:attr(data-c);position:absolute;top:100%;left:0;right:0;text-align:center;font:700 8px var(--ravenof-font-body);color:var(--ravenof-text-secondary);margin-top:3px}
.rvn-dk-keys{display:flex;gap:6px}
.rvn-dk-keys button{flex:1;min-width:0;aspect-ratio:1044/1416;border-radius:4px;border:1px solid rgba(212,163,59,.5);box-shadow:0 6px 14px #000;overflow:hidden;padding:0;background:#0d0a14;cursor:pointer;transition:transform .25s}
.rvn-dk-keys button:hover{transform:translateY(-4px) scale(1.05)}
.rvn-dk-keys img{width:100%;height:100%;object-fit:cover;display:block}
.rvn-dk-spacer{flex:1 1 auto}
.rvn-dk[data-port="1"] .rvn-dk-keyswrap,.rvn-dk[data-port="1"] .rvn-dk-spacer,.rvn-dk[data-port="1"] .rvn-dk-curvewrap,.rvn-dk[data-compact="1"] .rvn-dk-keyswrap{display:none}
.rvn-dk[data-compact="1"] .rvn-dk-curve{height:30px}
.rvn-dk-cta{width:100%;height:48px;background:linear-gradient(180deg,#ffe08a,#d4a33b 55%,#a97c22);border:1px solid #6b4a12;border-radius:5px;color:#1a0f04;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 0 22px rgba(212,163,59,.35);font:800 13px var(--ravenof-font-display);letter-spacing:2px;text-transform:uppercase;cursor:pointer;animation:rvn-dk-cbreathe 2.8s ease-in-out infinite}
@keyframes rvn-dk-cbreathe{50%{box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 0 34px rgba(212,163,59,.6)}}
.rvn-dk-cta:active{transform:translateY(1px)}
.rvn-dk-cta.done{background:linear-gradient(180deg,#2a2418,#171208);color:#ffe08a;border-color:rgba(212,163,59,.5);animation:none;box-shadow:none;cursor:default}
.rvn-dk-cta.no{background:linear-gradient(180deg,#3a2a2e,#1a1214);color:#ff8a96;border-color:#7a3a44;animation:none;box-shadow:none}
.rvn-dk[data-port="1"] .rvn-dk-cta,.rvn-dk[data-compact="1"] .rvn-dk-cta{height:42px;font-size:12px}
.rvn-dk-acts{display:flex;gap:6px}
.rvn-dk-acts button{flex:1;min-width:0;height:36px;display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid rgba(212,163,59,.35);background:rgba(0,0,0,.45);color:#f3ead3;font:800 10px var(--ravenof-font-body);letter-spacing:.08em;text-transform:uppercase;cursor:pointer;clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%);transition:background .2s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px}
.rvn-dk-acts button:hover{background:rgba(212,163,59,.18)}.rvn-dk-acts button.del:hover{background:rgba(160,30,40,.35);color:#ffb0b8}.rvn-dk-acts button:disabled{opacity:.4;cursor:default}
.rvn-dk[data-compact="1"] .rvn-dk-acts button{height:30px}
@media (prefers-reduced-motion: reduce){.rvn-dk-box.foc .rvn-dk-b3d,.rvn-dk-box.foc .rvn-dk-hc,.rvn-dk-sig,.rvn-dk-rune2,.rvn-dk-ribbon,.rvn-dk-cta,.rvn-dk-ghost .rvn-dk-plus{animation:none!important}.rvn-dk-box.enter{animation:none}}
`

export function DigitalMyDecks({ userId, onEdit, onCreate }: { userId: string; onEdit: (id: string) => void; onCreate: () => void }) {
  const t = useT()
  const gc = useGameContent()
  const { desktop } = useDesktopUi()
  const rm = useReducedMotion()
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [covers, setCovers] = useState<Record<number, string>>({})
  const [openDeck, setOpenDeck] = useState<Deck | null>(null)
  const [deckCards, setDeckCards] = useState<DeckCard[] | null>(null)
  const [cardView, setCardView] = useState<DeckCard | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const flash = (m: string, err = false) => { (err ? playError : playSuccess)(); setToast(m) }
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2000); return () => clearTimeout(t) }, [toast])

  const [loadSlow, setLoadSlow] = useState(false)
  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: deckRows }, { data: colRows }] = await Promise.all([
      supabase.from('decks').select('id, name, faction_id, visibility, card_count, avg_gold_cost, faction:factions ( name, slug, color_hex )').eq('user_id', userId).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
      supabase.from('user_collections').select('card_id, quantity').eq('user_id', userId),
      ensureCardTranslations(),
    ])
    type DR = { id: string; name: string; faction_id: number | null; visibility: string; card_count: number; avg_gold_cost: number; faction: { name: string; slug: string | null; color_hex: string } | null }
    const rows = (deckRows as unknown as DR[]) ?? []
    const owned: Record<string, number> = Object.fromEntries(((colRows as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
    const ids = rows.map((d) => d.id)
    const missingMap: Record<string, number> = {}
    // Kortos VISOMS kaladėms vienu užklausimu: trūkstamos + raktinės (halo) + kreivė + čempionai
    type DCRow = { deck_id: string; card_id: string; quantity: number; is_side_deck: boolean | null; card: { id: string; image_url: string | null; gold_cost: number; is_champion: boolean } | null }
    const byDeck: Record<string, DCRow[]> = {}
    if (ids.length) {
      const { data: dc } = await supabase.from('deck_cards').select('deck_id, card_id, quantity, is_side_deck, card:cards ( id, image_url, gold_cost, is_champion )').in('deck_id', ids)
      for (const r of ((dc as unknown as DCRow[]) ?? [])) {
        const have = owned[r.card_id] ?? 0
        if (have < r.quantity) missingMap[r.deck_id] = (missingMap[r.deck_id] ?? 0) + (r.quantity - have)
        ;(byDeck[r.deck_id] ??= []).push(r)
      }
    }
    setDecks(rows.map((d) => {
      const main = (byDeck[d.id] ?? []).filter((r) => r.card && !r.is_side_deck)
      const keys = [...main].sort((a, b) => Number(b.card!.is_champion) - Number(a.card!.is_champion) || b.card!.gold_cost - a.card!.gold_cost)
        .map((r) => cardImage(r.card!.id, r.card!.image_url)).filter((s): s is string => !!s).slice(0, MAX_KEYS)
      return {
        id: d.id, name: d.name, faction: d.faction?.name ?? null, factionId: d.faction_id, factionSlug: d.faction?.slug ?? null, factionColor: d.faction?.color_hex ?? '#f0b429',
        visibility: d.visibility, cardCount: d.card_count, avgGold: d.avg_gold_cost, missing: ids.includes(d.id) ? (missingMap[d.id] ?? 0) : 0,
        keys, curve: costCurve(main.map((r) => ({ gold: r.card!.gold_cost, qty: r.quantity }))), champions: main.filter((r) => r.card!.is_champion).reduce((a, r) => a + r.quantity, 0),
      }
    }))
  }, [userId])

  useEffect(() => { load(); void useActiveDeck.getState().refresh() }, [load])
  const adState = useActiveDeck()
  // Starter kaladžių viršeliai pagal frakciją (iš parduotuvės).
  // sessionStorage cache — viršeliai matomi iškart, be RPC laukimo.
  useEffect(() => {
    try { const c = sessionStorage.getItem('rvn-deck-covers'); if (c) setCovers(JSON.parse(c)) } catch { /* */ }
    getStarterDecks().then((sd) => {
      const m: Record<number, string> = {}
      for (const s of sd ?? []) if (s.factionId != null && s.imageUrl) m[s.factionId] = s.imageUrl
      setCovers(m)
      try { sessionStorage.setItem('rvn-deck-covers', JSON.stringify(m)) } catch { /* */ }
    })
  }, [])

  // ── Drawer: pilnas kortų sąrašas ──────────────────────────────────────────
  const openDrawer = useCallback(async (d: Deck) => {
    playCardFlip(); setOpenDeck(d); setDeckCards(null)
    const supabase = createClient()
    await ensureCardTranslations()
    const { data } = await supabase.from('deck_cards')
      .select('quantity, is_side_deck, card:cards ( id, name, image_url, gold_cost, attack, health, effect_text, description, is_champion, rarity:rarities ( name ), card_type:card_types ( name ) )')
      .eq('deck_id', d.id)
    type Row = { quantity: number; is_side_deck: boolean | null; card: { id: string; name: string; image_url: string | null; gold_cost: number; attack: number | null; health: number | null; effect_text: string | null; description: string | null; is_champion: boolean; rarity: { name: string } | null; card_type: { name: string } | null } | null }
    const list: DeckCard[] = ((data as unknown as Row[]) ?? []).filter((r) => r.card).map((r) => ({
      id: r.card!.id, name: cardText(r.card!.id, 'name', r.card!.name), image: cardImage(r.card!.id, r.card!.image_url), gold: r.card!.gold_cost,
      atk: r.card!.attack, hp: r.card!.health,
      effect: cardText(r.card!.id, 'effect_text', r.card!.effect_text) || cardText(r.card!.id, 'description', r.card!.description),
      rarity: r.card!.rarity?.name ?? null, type: r.card!.card_type?.name ?? null, isChampion: r.card!.is_champion,
      qty: r.quantity, side: !!r.is_side_deck,
    }))
    list.sort((a, b) => a.gold - b.gold || a.name.localeCompare(b.name))
    setDeckCards(list)
  }, [])

  const closeDrawer = () => { playUiClick(); setOpenDeck(null); setDeckCards(null); setCardView(null) }
  // Desktop: Escape + fokuso gaudyklė šoniniam meniu (kai atidaryta kortos peržiūra ar trynimo patvirtinimas — jie patys valdo fokusą)
  const drawerRef = useDialogFocus<HTMLElement>(closeDrawer, desktop && !!openDeck && !cardView && !confirmDel)

  const duplicate = async (id: string) => {
    setBusy(id); playUiClick()
    const supabase = createClient()
    try {
      const { data: orig, error: oErr } = await supabase.from('decks').select('name, description, faction_id, card_count, avg_gold_cost').eq('id', id).single()
      if (oErr || !orig) throw oErr ?? new Error('no deck')
      const o = orig as { name: string; description: string | null; faction_id: number | null; card_count: number; avg_gold_cost: number }
      const { data: nd, error } = await supabase.from('decks').insert({ user_id: userId, name: t('decks.my.copyPrefix', { name: o.name }), description: o.description, faction_id: o.faction_id, visibility: 'private', card_count: o.card_count, avg_gold_cost: o.avg_gold_cost }).select('id').single()
      if (error) throw error
      const { data: cards } = await supabase.from('deck_cards').select('card_id, quantity, is_side_deck').eq('deck_id', id)
      const rows = ((cards as { card_id: string; quantity: number; is_side_deck: boolean | null }[]) ?? []).map((c) => ({ deck_id: nd.id, card_id: c.card_id, quantity: c.quantity, is_side_deck: c.is_side_deck ?? false }))
      if (rows.length) await supabase.from('deck_cards').insert(rows)
      flash(t('decks.my.copied')); if (openDeck) closeDrawer(); load()
    } catch { flash(t('decks.my.copyFailed'), true) } finally { setBusy(null) }
  }

  // ── Karuselė ───────────────────────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const floorRef = useRef<HTMLDivElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const stampRef = useRef<HTMLDivElement | null>(null)
  const flashRef = useRef<HTMLDivElement | null>(null)
  const [bw, setBw] = useState(160)
  const [portrait, setPortrait] = useState(false)
  const [compact, setCompact] = useState(false)
  const [cur, setCur] = useState<number | null>(null)
  const [entered, setEntered] = useState(false)
  const [popId, setPopId] = useState<string | null>(null)
  const [burning, setBurning] = useState<string | null>(null)
  const [shakeId, setShakeId] = useState<string | null>(null)
  const [panelShow, setPanelShow] = useState(false)

  const slots = useMemo(() => decks ?? [], [decks])
  const total = slots.length + 1 // + „nauja kaladė"
  // pradinė pozicija — aktyvi kaladė (arba pirma)
  useEffect(() => {
    if (cur != null || !decks || !decks.length) return
    const ai = decks.findIndex((d) => d.id === adState.activeDeckId)
    setCur(ai >= 0 ? ai : 0)
  }, [decks, adState.activeDeckId, cur])
  useEffect(() => { if (cur != null && cur > total - 1) setCur(Math.max(0, total - 1)) }, [total, cur])

  // dėžutės plotis iš REALAUS scenos dydžio (portretas / landscape)
  useEffect(() => {
    const st = stageRef.current, root = rootRef.current
    if (!st || !root || !decks) return
    const f = () => {
      const port = root.clientWidth < 640
      setPortrait(port)
      const w = st.clientWidth, h = st.clientHeight
      setCompact(!port && h < 330)
      const fitH = (h - (port ? 36 : 64)) / 1.92    // dėžutė (1.36) + kortų halo virš jos (~.56)
      const fitW = w / (port ? 2.15 : 2.9)          // fokusas + kaimynų kraštai (+ strėlės)
      setBw(Math.round(Math.max(96, Math.min(fitH, fitW, 330))))
    }
    f()
    const ro = new ResizeObserver(f); ro.observe(st); ro.observe(root)
    return () => ro.disconnect()
  }, [decks])

  // įėjimo animacija — vieną kartą, kai dėžutės jau yra
  useEffect(() => {
    if (entered || cur == null) return
    const id = window.setTimeout(() => {
      setEntered(true); setPanelShow(true)
      if (!rm) { floorRef.current?.classList.add('flare'); window.setTimeout(() => floorRef.current?.classList.remove('flare'), 900) }
    }, rm ? 0 : 520)
    return () => window.clearTimeout(id)
  }, [entered, cur, rm])

  // panelio turinys „perrašomas" su trumpu užtemdymu keičiant kaladę
  const shownCur = useRef<number | null>(null)
  useEffect(() => {
    if (cur == null || !entered) return
    if (shownCur.current === null) { shownCur.current = cur; return }
    if (shownCur.current === cur) return
    shownCur.current = cur
    setPanelShow(false)
    const id = window.setTimeout(() => setPanelShow(true), 120)
    return () => window.clearTimeout(id)
  }, [cur, entered])

  const go = useCallback((n: number) => {
    setCur((c) => {
      if (c == null) return c
      const nx = Math.max(0, Math.min(total - 1, c + n))
      if (nx !== c) playCardPick()
      return nx
    })
  }, [total])
  // klaviatūra + ratukas + swipe
  useEffect(() => {
    const st = stageRef.current
    if (!st) return
    const key = (e: KeyboardEvent) => {
      if (openDeck || cardView || confirmDel) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    }
    let wheelLock = 0
    const wheel = (e: WheelEvent) => {
      const now = Date.now(); if (now - wheelLock < 350) return
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (Math.abs(d) < 8) return
      wheelLock = now; go(Math.sign(d))
    }
    let sx: number | null = null
    const down = (e: PointerEvent) => { sx = e.clientX }
    const up = (e: PointerEvent) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1) }
    window.addEventListener('keydown', key)
    st.addEventListener('wheel', wheel, { passive: true })
    st.addEventListener('pointerdown', down); st.addEventListener('pointerup', up)
    return () => { window.removeEventListener('keydown', key); st.removeEventListener('wheel', wheel); st.removeEventListener('pointerdown', down); st.removeEventListener('pointerup', up) }
  }, [go, openDeck, cardView, confirmDel])

  const curDeck: Deck | null = cur != null && cur < slots.length ? slots[cur] : null
  const isNewSlot = cur != null && cur === slots.length
  const moodColor = curDeck ? curDeck.factionColor : GOLD_HEX
  const { cv, burst } = useParticles(rm, () => {
    const fl = floorRef.current, st = stageRef.current
    if (!fl || !st) return null
    const r = fl.getBoundingClientRect(), s = st.getBoundingClientRect()
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * 0.5, w: r.width, c: moodColor }
  })

  const isValid = (d: Deck) => d.faction !== null && isDeckSizeValid(d.cardCount) && (d.missing ?? 0) === 0
  const centerOf = (id: string): [number, number] | null => {
    const st = stageRef.current; const el = railRef.current?.querySelector<HTMLElement>(`[data-deck="${id}"] .rvn-dk-front`)
    if (!st || !el) return null
    const r = el.getBoundingClientRect(), s = st.getBoundingClientRect()
    return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2]
  }
  const shakeBox = (id: string) => { setShakeId(id); window.setTimeout(() => setShakeId((x) => (x === id ? null : x)), 320) }

  // ── AKTYVINTI: antspaudas → blyksnis + banga + kibirkštys + drebėjimas → kaspinas ──
  const [activating, setActivating] = useState(false)
  const activate = async () => {
    const d = curDeck
    if (!d || activating) return
    if (adState.activeDeckId === d.id) return
    if (!isValid(d)) { playError(); shakeBox(d.id); setToast(t('decks.invalidSizeHint')); return }
    setActivating(true)
    const c = centerOf(d.id)
    if (c && !rm) {
      const st = stampRef.current!
      st.style.left = `${c[0]}px`; st.style.top = `${c[1]}px`; st.classList.remove('go'); void st.offsetWidth; st.classList.add('go')
      playImpact()
      window.setTimeout(() => {
        const fl = flashRef.current!; fl.style.transition = 'none'; fl.style.opacity = '0.3'
        requestAnimationFrame(() => { fl.style.transition = 'opacity .5s'; fl.style.opacity = '0' })
        const rg = ringRef.current!; rg.style.left = `${c[0]}px`; rg.style.top = `${c[1]}px`; rg.classList.remove('go'); void rg.offsetWidth; rg.classList.add('go')
        burst(c[0], c[1], GOLD_HEX, 140, 1.2)
        floorRef.current?.classList.add('flare'); window.setTimeout(() => floorRef.current?.classList.remove('flare'), 900)
        const root = rootRef.current; if (root) { root.classList.remove('quake'); void root.offsetWidth; root.classList.add('quake'); window.setTimeout(() => root.classList.remove('quake'), 320) }
      }, 280)
    }
    const r = await useActiveDeck.getState().setActive(d.id)
    if (!r.ok) { flash(t('decks.invalidSizeHint'), true); setActivating(false); return }
    window.setTimeout(() => { playSuccess(); setPopId(d.id); setActivating(false); setPanelShow(false); window.setTimeout(() => setPanelShow(true), 60) }, rm ? 0 : 300)
  }

  // ── TRINTI: dėžutė sudega → DB ─────────────────────────────────────────────
  const del = async (id: string) => {
    setBusy(id); playUiClick(); setConfirmDel(null)
    if (openDeck) closeDrawer()
    if (!rm) {
      const c = centerOf(id)
      setBurning(id)
      if (c) burst(c[0], c[1], '#ff7a3c', 70, 0.6)
      await new Promise<void>((res) => window.setTimeout(() => res(), 900))
    }
    const supabase = createClient()
    try {
      await supabase.from('deck_cards').delete().eq('deck_id', id)
      const { error } = await supabase.from('decks').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
      flash(t('decks.my.deleted')); await load()
    } catch { flash(t('decks.my.deleteFailed'), true) } finally { setBusy(null); setBurning(null) }
  }

  useEffect(() => {
    if (decks !== null) { setLoadSlow(false); return }
    const t = setTimeout(() => setLoadSlow(true), 10_000)
    return () => clearTimeout(t)
  }, [decks])

  if (decks === null) return <LoadingOrRetry timedOut={loadSlow} onRetry={() => { setLoadSlow(false); void load() }} />

  if (decks.length === 0) {
    return (
      <div className="ravenof-body h-full flex flex-col items-center justify-center text-center" style={{ gap: 13 }}>
        <div className="relative" style={{ width: 66, height: 84 }}>
          <div className="absolute inset-0" style={{ border: '1px dashed #3d3345', borderRadius: 6, transform: 'rotate(-9deg)', background: 'var(--ravenof-bg-surface-2)' }} />
          <div className="absolute inset-0" style={{ border: '1px dashed #4a4552', borderRadius: 6, transform: 'rotate(7deg)', background: 'var(--ravenof-bg-surface-2)' }} />
          <div className="absolute inset-0 flex items-center justify-center" style={{ border: '1px solid var(--ravenof-border-strong)', borderRadius: 6, background: 'var(--ravenof-bg-surface)', font: '300 30px var(--ravenof-font-body)', color: 'var(--ravenof-gold)' }}>+</div>
        </div>
        <div>
          <p style={{ font: `700 ${desktop ? DT.fs.h2 : 15}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)' }}>{t('decks.my.emptyTitle')}</p>
          <p style={{ font: `400 ${desktop ? DT.fs.body : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', marginTop: desktop ? 6 : 3 }}>{t('decks.my.emptySub')}</p>
        </div>
        <button onClick={() => { playUiClick(); onCreate() }} className={desktop ? 'rvn-d-btn rvn-d-btn-primary' : 'ravenof-btn ravenof-btn-primary'} style={desktop ? undefined : { fontSize: 12, padding: '11px 26px', minHeight: 0 }}>{t('decks.my.createCta')}</button>
      </div>
    )
  }

  const c0 = cur ?? 0
  const curActive = !!curDeck && adState.activeDeckId === curDeck.id
  const curValid = !!curDeck && isValid(curDeck)
  const fy = portrait ? '80%' : '76%'

  return (
    <div ref={rootRef} className="rvn-dk ravenof-body h-full flex min-h-0" data-port={portrait ? '1' : '0'} data-compact={compact ? '1' : '0'} style={{ ['--mc' as string]: moodColor }}>
      <style>{CSS}</style>
      <div className="rvn-dk-mood" />

      {/* ── SCENA ── */}
      <div ref={stageRef} className="rvn-dk-stage" style={{ ['--bw' as string]: `${bw}px`, ['--fy' as string]: fy }} data-testid="my-decks-stage">
        <div ref={floorRef} className="rvn-dk-floor"><div className="rvn-dk-sig" /><div className="rvn-dk-rune" /><div className="rvn-dk-rune2" /></div>
        <div ref={railRef} className="rvn-dk-rail">
          {slots.map((d, i) => {
            const o = i - c0, a = Math.abs(o)
            const isActive = adState.activeDeckId === d.id
            const valid = isValid(d)
            const cover = d.factionId != null ? covers[d.factionId] ?? null : null
            const cls = 'rvn-dk-box' + (o === 0 ? ' foc' : '') + (isActive ? ' active' : '') + (valid ? '' : ' bad') + (!entered ? ' enter' : '') + (burning === d.id ? ' burn' : '') + (shakeId === d.id ? ' shake' : '')
            const vars: React.CSSProperties = {
              ['--c' as string]: d.factionColor,
              ['--tx' as string]: `${Math.sign(o) * (bw * 0.95 + (a - 1) * bw * 0.62)}px`,
              ['--tz' as string]: `${o === 0 ? 0 : -140 - a * 110}px`,
              ['--ry' as string]: `${o === 0 ? 0 : -Math.sign(o) * 30}deg`,
              ['--sc' as string]: o === 0 ? 1 : Math.max(0.55, 0.82 - (a - 1) * 0.14),
              ['--br' as string]: o === 0 ? 1 : Math.max(0.25, 0.55 - (a - 1) * 0.15),
              ['--sat' as string]: o === 0 ? 1 : 0.6,
              ['--ed' as string]: `${80 + a * 90}ms`,
              zIndex: 10 - a, opacity: a > 3 ? 0 : undefined, pointerEvents: a > 3 ? 'none' : undefined,
            }
            return (
              <div key={d.id} data-deck={d.id} className={cls} style={vars} onClick={() => { if (o !== 0) { playCardPick(); setCur(i) } else openDrawer(d) }} role="button" aria-label={d.name} aria-current={o === 0 ? 'true' : undefined}>
                <div className="rvn-dk-halo">
                  {d.keys.map((src, k) => <span key={k} className="rvn-dk-hc"><SmartImg src={src} width={160} loading={o === 0 ? 'eager' : 'lazy'} alt="" /></span>)}
                </div>
                <div className="rvn-dk-b3d">
                  <div className="rvn-dk-front" style={{ background: cover ? undefined : `radial-gradient(120% 90% at 50% 25%, ${d.factionColor}55, rgba(10,8,16,0.98) 72%), linear-gradient(160deg,#1a1325,#0a0810)` }}>
                    {cover && <SmartImg src={cover} width={440} loading="eager" className="rvn-dk-cov" alt="" />}
                    <span className="rvn-dk-fac">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ravenofFactionIcon(d.factionSlug)} alt="" draggable={false} />
                    </span>
                    <span className="rvn-dk-nm">{d.name}</span>
                  </div>
                  {isActive && <span className={'rvn-dk-ribbon' + (popId === d.id ? ' pop' : '')}>★ {t('decks.my.activeBadge')}</span>}
                  {!valid && <span className="rvn-dk-warn">⚠ {(d.missing ?? 0) > 0 ? t('decks.my.missingShort', { count: d.missing ?? 0 }) : t('decks.my.invalidBadge')}</span>}
                </div>
                {cover && <div className="rvn-dk-refl"><SmartImg src={cover} width={220} alt="" /></div>}
              </div>
            )
          })}
          {/* + NAUJA KALADĖ */}
          {(() => {
            const i = slots.length, o = i - c0, a = Math.abs(o)
            const vars: React.CSSProperties = {
              ['--c' as string]: GOLD_HEX,
              ['--tx' as string]: `${Math.sign(o) * (bw * 0.95 + (a - 1) * bw * 0.62)}px`,
              ['--tz' as string]: `${o === 0 ? 0 : -140 - a * 110}px`,
              ['--ry' as string]: `${o === 0 ? 0 : -Math.sign(o) * 30}deg`,
              ['--sc' as string]: o === 0 ? 1 : Math.max(0.55, 0.82 - (a - 1) * 0.14),
              ['--br' as string]: o === 0 ? 1 : Math.max(0.25, 0.55 - (a - 1) * 0.15),
              ['--sat' as string]: 1, ['--ed' as string]: `${80 + a * 90}ms`,
              zIndex: 10 - a, opacity: a > 3 ? 0 : undefined, pointerEvents: a > 3 ? 'none' : undefined,
            }
            return (
              <div className={'rvn-dk-box new' + (o === 0 ? ' foc' : '') + (!entered ? ' enter' : '')} style={vars} onClick={() => { if (o !== 0) { playCardPick(); setCur(i) } else { playUiClick(); onCreate() } }} role="button" aria-label={t('decks.my.newDeck')}>
                <div className="rvn-dk-b3d"><div className="rvn-dk-front rvn-dk-ghost"><span className="rvn-dk-plus">+</span><span className="rvn-dk-nm">{t('decks.my.newDeck')}</span></div></div>
              </div>
            )
          })()}
        </div>
        <button type="button" className="rvn-dk-arr l" onClick={() => go(-1)} disabled={c0 <= 0} aria-label="‹">‹</button>
        <button type="button" className="rvn-dk-arr r" onClick={() => go(1)} disabled={c0 >= total - 1} aria-label="›">›</button>
        <div className="rvn-dk-dots">{Array.from({ length: total }, (_, i) => <i key={i} className={i === c0 ? 'on' : ''} />)}</div>
        <div ref={ringRef} className="rvn-dk-ring" /><div ref={stampRef} className="rvn-dk-stamp">{t('decks.my.activeBadge')}</div>
        <div ref={flashRef} className="rvn-dk-flash" />
        <canvas ref={cv} className="rvn-dk-canvas" />
      </div>

      {/* ── PANELIS ── */}
      <div className={'rvn-dk-panel' + (panelShow ? ' show' : '')} style={{ ['--c' as string]: moodColor }}>
        <div className="rvn-dk-pn" title={curDeck?.name}>{isNewSlot ? t('decks.my.newDeck') : curDeck?.name ?? ''}</div>
        <div className="rvn-dk-chips">
          {isNewSlot ? <span className="rvn-dk-chip mut">{t('decks.my.newDeckSub')}</span> : curDeck && <>
            <span className="rvn-dk-chip" style={{ ['--cc' as string]: curDeck.factionColor }}>{gc.faction(curDeck.faction) || t('decks.my.noFaction')}</span>
            {curValid
              ? <span className="rvn-dk-chip ok">{t('decks.my.validChip')} · {formatDeckCountShort(curDeck.cardCount)}</span>
              : (curDeck.missing ?? 0) > 0
                ? <span className="rvn-dk-chip no">{t('decks.my.missingShort', { count: curDeck.missing ?? 0 })}</span>
                : <span className="rvn-dk-chip no">{t('decks.my.invalidBadge')} · {formatDeckCount(curDeck.cardCount)}</span>}
            {curActive && <span className="rvn-dk-chip act">★ {t('decks.my.activeBadge')}</span>}
            <span className="rvn-dk-chip mut">{curDeck.visibility === 'public' ? <><Globe size={10} /> {t('decks.my.public')}</> : <><Lock size={10} /> {t('decks.my.private')}</>}</span>
          </>}
        </div>
        <div className="rvn-dk-stats">
          <div className="rvn-dk-st"><b><Num v={isNewSlot ? 0 : curDeck?.cardCount ?? 0} rm={rm} /></b><small>{t('decks.my.statCards')}</small></div>
          <div className="rvn-dk-st"><b><Num v={isNewSlot ? 0 : displayAvgCost(curDeck?.avgGold)} dec={1} rm={rm} /></b><small>{t('decks.my.statAvgGold')}</small></div>
          <div className="rvn-dk-st"><b><Num v={isNewSlot ? 0 : curDeck?.champions ?? 0} rm={rm} /></b><small>{t('decks.my.statChampions')}</small></div>
        </div>
        <div className="rvn-dk-curvewrap">
          <div className="rvn-dk-lbl">{t('decks.my.goldCurve')}</div>
          <div className="rvn-dk-curve">
            {(() => { const cv2 = curDeck?.curve ?? []; const mx = Math.max(1, ...cv2); return COST_CURVE_LABELS.map((l, j) => <i key={l} data-c={l} style={{ height: `${Math.max(4, ((cv2[j] ?? 0) / mx) * 100)}%`, transitionDelay: `${0.15 + j * 0.05}s` }} />) })()}
          </div>
        </div>
        <div className="rvn-dk-keyswrap">
          <div className="rvn-dk-lbl">{t('decks.my.keyCards')}</div>
          <div className="rvn-dk-keys">
            {(curDeck?.keys ?? []).slice(0, 4).map((src, k) => <button key={k} type="button" onClick={() => curDeck && openDrawer(curDeck)} aria-label={t('decks.my.cardsList')}><SmartImg src={src} width={160} alt="" /></button>)}
          </div>
        </div>
        <div className="rvn-dk-spacer" />
        {isNewSlot
          ? <button type="button" className="rvn-dk-cta" onClick={() => { playUiClick(); onCreate() }}>+ {t('decks.my.createCta')}</button>
          : <button type="button" className={'rvn-dk-cta' + (curActive ? ' done' : !curValid ? ' no' : '')} onClick={activate} disabled={activating || curActive} aria-disabled={curActive}>
              {curActive ? `✓ ${t('decks.my.activeCta')}` : !curValid ? `⚠ ${t('decks.my.invalidCta')}` : `★ ${t('decks.my.setActive')}`}
            </button>}
        {!isNewSlot && curDeck && (
          <div className="rvn-dk-acts">
            <button type="button" onClick={() => { playUiClick(); onEdit(curDeck.id) }}><Edit2 size={13} /> {t('decks.my.edit')}</button>
            <button type="button" onClick={() => openDrawer(curDeck)}><List size={13} /> {t('decks.my.cardsList')}</button>
            <button type="button" onClick={() => duplicate(curDeck.id)} disabled={busy === curDeck.id}><Copy size={13} /> {t('decks.my.copyShort')}</button>
            <button type="button" className="del" onClick={() => { playUiClick(); setConfirmDel(curDeck.id) }} disabled={busy === curDeck.id}><Trash2 size={13} /> {t('decks.my.deleteShort')}</button>
          </div>
        )}
      </div>

      {/* ── ŠONINIS MENIU (drawer): pilnas kortų sąrašas + išbandyti ── */}
      <AnimatePresence>
        {openDeck && (
          <>
            <motion.div className="fixed inset-0 z-[150]" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDrawer} />
            <motion.aside ref={drawerRef} role="dialog" aria-modal="true" aria-label={openDeck.name} tabIndex={-1} className="fixed top-0 right-0 bottom-0 z-[155] flex flex-col outline-none"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.28, ease: [0.3, 0.7, 0.3, 1] }}
              style={{ width: desktop ? 'min(480px, 40vw)' : 'min(410px, 94vw)', background: 'linear-gradient(200deg, #171021, #0a0810)', borderLeft: `1px solid rgba(${GOLD},0.4)`, boxShadow: '-16px 0 50px rgba(0,0,0,0.75)' }}>

              {/* Antraštė */}
              <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)', borderBottom: `1px solid rgba(${GOLD},0.2)` }}>
                <CoverThumb cover={openDeck.factionId != null ? covers[openDeck.factionId] ?? null : null} color={openDeck.factionColor} size={desktop ? 56 : 46} />
                <div className="flex-1 min-w-0">
                  <h2 className={desktop ? 'font-bold leading-tight rvn-clamp2' : 'text-[15px] font-bold leading-tight truncate'} style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', fontSize: desktop ? DT.fs.h2 : undefined }}>{openDeck.name}</h2>
                  <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 ${desktop ? '' : 'text-[10.5px]'}`} style={{ color: 'var(--text-muted)', fontSize: desktop ? DT.fs.help : undefined }}>
                    <span className="px-1.5 rounded" style={{ background: openDeck.factionColor + '22', color: openDeck.factionColor }}>{openDeck.faction ?? t('decks.my.noFaction')}</span>
                    <span className="inline-flex items-center gap-0.5">{openDeck.visibility === 'public' ? <><Globe className="w-3 h-3" /> {t('decks.my.public')}</> : <><Lock className="w-3 h-3" /> {t('decks.my.private')}</>}</span>
                  </div>
                </div>
                <button onClick={closeDrawer} aria-label={t('common.close')} data-dlg-close="1" className="flex items-center justify-center rounded-full shrink-0" style={{ width: desktop ? DT.ctl : 34, height: desktop ? DT.ctl : 34, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
              </div>

              {/* Turinys */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
                <DrawerBody desktop={desktop} deck={openDeck} cards={deckCards} onCard={(c) => { playUiClick(); setCardView(c) }} />

                {/* Veiksmai */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => { playUiClick(); onEdit(openDeck.id) }} className="rvn-press inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold" style={{ minHeight: 44, background: `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.45)`, color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}><Edit2 className="w-3.5 h-3.5" /> {t('decks.my.edit')}</button>
                  <PlaytestButton deckId={openDeck.id} deckName={openDeck.name} variant="compact" />
                  <button onClick={() => duplicate(openDeck.id)} disabled={busy === openDeck.id} className="rvn-press inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold disabled:opacity-40" style={{ minHeight: 44, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-secondary)' }}><Copy className="w-3.5 h-3.5" /> {t('decks.my.copy')}</button>
                  <button onClick={() => setConfirmDel(openDeck.id)} className="rvn-press inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold" style={{ minHeight: 44, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}><Trash2 className="w-3.5 h-3.5" /> {t('decks.my.delete')}</button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Kortos detali peržiūra */}
      {cardView && <CardDetail desktop={desktop} c={cardView} onClose={() => setCardView(null)} />}

      {confirmDel && desktop && (
        <DeskDialog onClose={() => setConfirmDel(null)} title={t('decks.my.confirmDeleteTitle')} width={DT.modal.sm} zIndex={170} closeLabel={t('common.close')}
          footer={<>
            <button onClick={() => { playUiClick(); setConfirmDel(null) }} className="rvn-d-btn rvn-d-btn-ghost">{t('common.cancel')}</button>
            <button onClick={() => del(confirmDel)} disabled={busy === confirmDel} className="rvn-d-btn rvn-d-btn-danger"><Trash2 size={16} /> {t('decks.my.delete')}</button>
          </>}>
          <p className="rvn-d-body" style={{ color: 'var(--ravenof-text-secondary)', margin: 0 }}>
            <b style={{ color: 'var(--ravenof-text-primary)' }}>{decks.find((x) => x.id === confirmDel)?.name}</b> — {t('decks.my.confirmDeleteBody')}
          </p>
        </DeskDialog>
      )}
      {confirmDel && !desktop && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-6" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setConfirmDel(null)}>
          <div className="w-[min(330px,92vw)] rounded-2xl p-5 text-center" style={{ border: '1px solid rgba(239,68,68,0.4)', background: 'linear-gradient(160deg,#17111f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#fca5a5' }}>{t('decks.my.confirmDeleteTitle')}</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t('decks.my.confirmDeleteBody')}</p>
            <div className="flex gap-2">
              <button onClick={() => { playUiClick(); setConfirmDel(null) }} className="flex-1 rounded-xl text-sm font-bold" style={{ minHeight: 44, background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-secondary)' }}>{t('common.cancel')}</button>
              <button onClick={() => del(confirmDel)} disabled={busy === confirmDel} className="flex-1 rounded-xl text-sm font-bold disabled:opacity-50" style={{ minHeight: 44, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.6)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>{t('decks.my.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 z-[180] px-4 py-2 rounded-full text-xs font-semibold" style={{ fontSize: desktop ? 14 : undefined, bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.96)', border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}>{toast}</div>}
    </div>
  )
}

function Num({ v, dec = 0, rm }: { v: number; dec?: number; rm: boolean }) {
  return <>{useCountUp(v, dec, rm)}</>
}

function CoverThumb({ cover, color, size }: { cover: string | null; color: string; size: number }) {
  return (
    <span className="relative block overflow-hidden shrink-0" style={{ width: size, height: size * 1.33, borderRadius: 8, border: `1px solid ${color}66` }}>
      {cover
        ? <SmartImg src={cover} width={120} className="absolute inset-0 w-full h-full object-cover" />
        : <span className="absolute inset-0 flex items-center justify-center text-lg" style={{ background: `linear-gradient(160deg, ${color}33, #0a0810)` }}>🎴</span>}
    </span>
  )
}

// ── Drawer turinys: statistika + kortų sąrašas ────────────────────────────────
function DrawerBody({ deck, cards, onCard, desktop = false }: { deck: Deck; cards: DeckCard[] | null; onCard: (c: DeckCard) => void; desktop?: boolean }) {
  const t = useT()
  const stats = useMemo(() => {
    if (!cards) return null
    const main = cards.filter((c) => !c.side)
    const side = cards.filter((c) => c.side)
    const total = main.reduce((a, c) => a + c.qty, 0)
    const golds = main.flatMap((c) => Array(c.qty).fill(c.gold) as number[])
    const avg = golds.length ? golds.reduce((a, b) => a + b, 0) / golds.length : 0
    // KANONINĖ kainos kreivė — DB reikšmės šimtais (200–700) → 1..8+ stulpeliai
    const curve = costCurve(main.map((c) => ({ gold: c.gold, qty: c.qty })))
    const types = new Map<string, number>()
    const rars = new Map<string, number>()
    for (const c of main) {
      types.set(c.type ?? 'Kita', (types.get(c.type ?? 'Kita') ?? 0) + c.qty)
      rars.set(c.rarity ?? '—', (rars.get(c.rarity ?? '—') ?? 0) + c.qty)
    }
    const champions = main.filter((c) => c.isChampion).reduce((a, c) => a + c.qty, 0)
    return { main, side, total, avg, curve, types: Array.from(types), rars: Array.from(rars), champions }
  }, [cards])

  if (!cards || !stats) return <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>

  const curveMax = Math.max(1, ...stats.curve)
  const valid = deck.faction !== null && isDeckSizeValid(stats.total)

  return (
    <>
      {/* Suvestinė */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox desktop={desktop} label={t('decks.my.statCards')} value={String(stats.total)} accent={valid ? '74,222,128' : '252,165,165'} />
        <StatBox desktop={desktop} label={t('decks.my.statAvgGold')} value={displayAvgCost(stats.avg).toFixed(1)} accent={GOLD} />
        <StatBox desktop={desktop} label={t('decks.my.statChampions')} value={String(stats.champions)} accent="139,92,246" />
      </div>
      <p className={`${desktop ? '' : 'text-[11px] '}px-3 py-1.5 rounded-lg`} style={{ fontSize: desktop ? DT.fs.help : undefined, background: valid ? 'rgba(74,222,128,0.06)' : 'rgba(252,165,165,0.08)', color: valid ? 'rgba(74,222,128,0.9)' : '#fca5a5', border: `1px solid ${valid ? 'rgba(74,222,128,0.2)' : 'rgba(252,165,165,0.3)'}` }}>
        {formatDeckCount(stats.total)}{!valid && !isDeckSizeValid(stats.total) ? ` · ${t('decks.invalidBadge')}` : ''}
      </p>
      {deck.missing != null && deck.missing > 0 && (
        <p className={`${desktop ? '' : 'text-[11px] '}px-3 py-2 rounded-lg`} style={{ fontSize: desktop ? DT.fs.help : undefined, background: 'rgba(240,180,41,0.08)', color: 'rgba(240,180,41,0.9)', border: '1px solid rgba(240,180,41,0.25)' }}>
          {t('decks.my.missingCards', { count: deck.missing })}
        </p>
      )}

      {/* Aukso kreivė */}
      <div>
        <SectionLabel desktop={desktop}>{t('decks.my.goldCurve')}</SectionLabel>
        <div className="flex items-end gap-1" style={{ height: desktop ? 104 : 84 }}>
          {stats.curve.map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" style={{ height: '100%' }}>
              <span className={`${desktop ? '' : 'text-[9px] '}tabular-nums`} style={{ fontSize: desktop ? DT.fs.label : undefined, color: n > 0 ? 'var(--gold)' : 'rgba(150,160,185,0.35)' }}>{n > 0 ? n : ''}</span>
              <div className="w-full rounded-t" style={{ height: `${Math.max(n > 0 ? 8 : 2, (n / curveMax) * 58)}px`,
                background: n > 0 ? `linear-gradient(180deg, rgb(${GOLD}), rgba(${GOLD},0.45))` : 'rgba(255,255,255,0.06)',
                boxShadow: n > 0 ? `0 0 6px rgba(${GOLD},0.35)` : 'none' }} />
              <span className={`${desktop ? '' : 'text-[9px] '}tabular-nums`} style={{ fontSize: desktop ? DT.fs.label : undefined, color: 'var(--text-muted)' }}>{COST_CURVE_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tipai + retumai */}
      <div className="flex flex-wrap gap-1.5">
        {stats.types.map(([t, n]) => (
          <span key={t} className={`${desktop ? '' : 'text-[10px] '}px-2 py-0.5 rounded-full`} style={{ fontSize: desktop ? DT.fs.label : undefined, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}>{t} <b style={{ color: '#f3ead3' }}>{n}</b></span>
        ))}
        {stats.rars.map(([r, n]) => (
          <span key={r} className={`${desktop ? '' : 'text-[10px] '}px-2 py-0.5 rounded-full`} style={{ fontSize: desktop ? DT.fs.label : undefined, background: rarityColor(r) + '14', border: `1px solid ${rarityColor(r)}55`, color: rarityColor(r) }}>{r} <b>{n}</b></span>
        ))}
      </div>

      {/* Kortų sąrašas */}
      <div>
        <SectionLabel desktop={desktop}>Pagrindinė kaladė · {stats.total}</SectionLabel>
        <div className="space-y-1">
          {stats.main.map((c) => <CardRow desktop={desktop} key={c.id} c={c} onClick={() => onCard(c)} />)}
        </div>
      </div>
      {stats.side.length > 0 && (
        <div>
          <SectionLabel desktop={desktop}>Šalutinė kaladė · {stats.side.reduce((a, c) => a + c.qty, 0)}</SectionLabel>
          <div className="space-y-1">
            {stats.side.map((c) => <CardRow desktop={desktop} key={c.id} c={c} onClick={() => onCard(c)} />)}
          </div>
        </div>
      )}
    </>
  )
}

function StatBox({ label, value, accent, desktop = false }: { label: string; value: string; accent: string; desktop?: boolean }) {
  return (
    <div className="rounded-xl px-2 py-2 text-center" style={{ background: `rgba(${accent},0.08)`, border: `1px solid rgba(${accent},0.3)` }}>
      <p className="rvn-disp tabular-nums" style={{ fontSize: desktop ? DT.fs.stat : 15, fontWeight: 800, color: `rgb(${accent})`, lineHeight: 1.1 }}>{value}</p>
      <p className={desktop ? 'mt-0.5' : 'text-[9px] mt-0.5'} style={{ fontSize: desktop ? DT.fs.label : undefined, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
    </div>
  )
}

function SectionLabel({ children, desktop = false }: { children: React.ReactNode; desktop?: boolean }) {
  return <p className={desktop ? 'font-bold uppercase mb-2' : 'text-[10px] font-bold uppercase mb-1.5'} style={{ fontSize: desktop ? DT.fs.label : undefined, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>{children}</p>
}

function CardRow({ c, onClick, desktop = false }: { c: DeckCard; onClick: () => void; desktop?: boolean }) {
  const col = rarityColor(c.rarity)
  if (desktop) return (
    <button onClick={onClick} className="rvn-press w-full flex items-center gap-2.5 px-2.5 rounded-lg text-left"
      style={{ minHeight: 44, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderLeftWidth: 3, borderLeftColor: col }}>
      <span className="flex items-center justify-center rounded-full shrink-0 tabular-nums" style={{ width: 26, height: 26, fontSize: 12, fontWeight: 800, background: `rgba(${GOLD},0.9)`, color: '#1a0f04' }}>{c.gold}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold truncate" style={{ fontSize: 14, color: '#f3ead3' }} title={c.name}>{c.isChampion ? '★ ' : ''}{c.name}</span>
        <span className="block truncate" style={{ fontSize: DT.fs.label, color: 'var(--text-muted)' }}>{[c.type, c.rarity].filter(Boolean).join(' · ')}</span>
      </span>
      {(c.atk != null || c.hp != null) && <span className="tabular-nums shrink-0" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.atk ?? '—'}/{c.hp ?? '—'}</span>}
      <span className="font-bold tabular-nums shrink-0" style={{ fontSize: 14, color: col }}>×{c.qty}</span>
    </button>
  )
  return (
    <button onClick={onClick} className="rvn-press w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
      style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${col}`, border: '1px solid rgba(255,255,255,0.06)', borderLeftWidth: 3, borderLeftColor: col }}>
      <span className="flex items-center justify-center rounded-full shrink-0 tabular-nums" style={{ width: 20, height: 20, fontSize: 10, fontWeight: 800, background: `rgba(${GOLD},0.9)`, color: '#1a0f04' }}>{c.gold}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-semibold truncate" style={{ color: '#f3ead3' }}>{c.isChampion ? '★ ' : ''}{c.name}</span>
        <span className="block text-[9.5px] truncate" style={{ color: 'var(--text-muted)' }}>{[c.type, c.rarity].filter(Boolean).join(' · ')}</span>
      </span>
      {(c.atk != null || c.hp != null) && <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>{c.atk ?? '—'}/{c.hp ?? '—'}</span>}
      <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: col }}>×{c.qty}</span>
    </button>
  )
}

function CardDetail({ c, onClose, desktop = false }: { c: DeckCard; onClose: () => void; desktop?: boolean }) {
  const t = useT()
  const [bad, setBad] = useState(false)
  const col = rarityColor(c.rarity)
  const ref = useDialogFocus<HTMLDivElement>(onClose, desktop)
  return (
    <div className="fixed inset-0 z-[165] flex items-center justify-center p-5" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div ref={ref} role={desktop ? 'dialog' : undefined} aria-modal={desktop ? true : undefined} aria-label={desktop ? c.name : undefined} tabIndex={desktop ? -1 : undefined}
        className={`relative ${desktop ? 'w-[min(420px,92vw)] outline-none' : 'w-[min(340px,92vw)]'} rounded-2xl overflow-hidden`} style={{ border: `2px solid ${col}`, background: 'linear-gradient(160deg,#15101f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { playUiClick(); onClose() }} className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full" style={{ width: desktop ? 40 : 32, height: desktop ? 40 : 32, background: 'rgba(0,0,0,0.6)', color: '#fff' }} aria-label={t('common.close')}><X className="w-4 h-4" /></button>
        <div className="relative w-full" style={{ aspectRatio: '2.5 / 3.5', maxHeight: desktop ? '56vh' : '50vh' }}>
          {c.image && !bad
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.image} alt={c.name} onError={() => setBad(true)} draggable={false} className="absolute inset-0 w-full h-full object-contain" />
            : <div className="absolute inset-0 flex items-center justify-center text-5xl">🎴</div>}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className={desktop ? 'font-bold' : 'text-base font-bold'} style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', fontSize: desktop ? DT.fs.h2 : undefined }}>{c.isChampion ? '★ ' : ''}{c.name}</h3>
            <span className={desktop ? 'font-bold px-2 py-0.5 rounded-full shrink-0' : 'text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0'} style={{ fontSize: desktop ? DT.fs.label : undefined, color: col, border: `1px solid ${col}` }}>{c.rarity ?? '—'}</span>
          </div>
          <div className={desktop ? 'flex flex-wrap gap-x-3 gap-y-0.5' : 'flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]'} style={{ fontSize: desktop ? DT.fs.help : undefined, color: 'var(--text-muted)' }}>
            <span>🪙 {c.gold}</span>
            {c.atk != null && <span>⚔️ {c.atk}</span>}
            {c.hp != null && <span>❤️ {c.hp}</span>}
            {c.type && <span>· {c.type}</span>}
            <span>· kaladėje ×{c.qty}</span>
          </div>
          {c.effect && <p className={desktop ? 'leading-snug' : 'text-xs leading-snug'} style={{ fontSize: desktop ? DT.fs.body : undefined, color: 'var(--text-secondary)' }}>{c.effect}</p>}
        </div>
      </div>
    </div>
  )
}
