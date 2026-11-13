'use client'
// ════════════════════════════════════════════════════════════════════════════
// Valdiklio sluoksnis visam /digital: erdvinė navigacija per VISUS matomus
// interaktyvius elementus (meniu, langai, kova), fokuso rėmelis ir mygtukų
// užuominos su Xbox / PlayStation ženklais.
//
// Kovoje kortos valdomos tempimu, todėl valdiklis „neša" kortą: A paima (sintetinis
// pointerdown + move), kryptys perkelia ant taikinio, A paleidžia (pointerup), B atšaukia.
// Taip naudojama ta pati žaidimo logika kaip pelei – kovos kodo keisti nereikia.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/lib/i18n/react'
import { getPadScroll, getPadState, onPadPress, startGamepad, subscribePad, type PadBtn } from '@/lib/gamepad/core'
import { PadGlyph } from './PadGlyph'

const BATTLE_SEL = '[data-hand-card], [data-unit-uid], [data-player], [data-artifact-uid]'
const BASE_SEL = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [data-gp]'
const DROP_SEL = '[data-unit-uid], [data-player], [data-artifact-uid], [data-tut="units-you"], [data-tut="units-ai"], [data-tut="field"], [data-tut="reactions"], [data-tut="artifacts"]'
const PID = 4711

type Rect = { x: number; y: number; w: number; h: number }
type Ctx = 'menu' | 'battle' | 'carry' | 'target' | 'dialog'

const centerOf = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r } }
const inBattle = () => !!document.querySelector('[data-tut="end-turn"], [data-hand-card]')
const targeting = () => !!document.querySelector('.combat-hint-pill')
const isBattleEl = (el: Element) => el.matches(BATTLE_SEL)

function visible(el: Element, hitTest: boolean): boolean {
  const h = el as HTMLElement
  if ((h as HTMLButtonElement).disabled || h.getAttribute('aria-disabled') === 'true') return false
  const r = h.getBoundingClientRect()
  if (r.width < 6 || r.height < 6) return false
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2
  if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return false
  if (!hitTest) return true
  const top = document.elementFromPoint(cx, cy)
  return !!top && (el === top || el.contains(top))
}

function candidates(carry: boolean): HTMLElement[] {
  if (carry) return Array.from(document.querySelectorAll<HTMLElement>(DROP_SEL)).filter((el) => visible(el, false))
  const all = Array.from(document.querySelectorAll<HTMLElement>(`${BASE_SEL}, ${BATTLE_SEL}`))
  return all.filter((el) => {
    if (el.closest('[data-gp-ignore]')) return false
    const be = el.parentElement?.closest(BATTLE_SEL)
    if (be) return false                      // kortos viduje esantys elementai – valdom pačią kortą
    return visible(el, true)
  })
}

function best(from: Rect, dir: PadBtn, list: HTMLElement[], skip: Element | null): HTMLElement | null {
  // Atstumas matuojamas tarp KRAŠTŲ (ne centrų) – kitaip dideli skydeliai atrodo „toli" ir fokusas
  // nušoka įstrižai. Kandidatas privalo būti realiai toje pusėje (jo tolimasis kraštas už mūsų krašto).
  const fx = from.x + from.w / 2, fy = from.y + from.h / 2
  const fr = from.x + from.w, fb = from.y + from.h
  let win: HTMLElement | null = null; let score = Infinity
  for (const el of list) {
    if (el === skip) continue
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    let gap: number, orthGap: number, align: number, ok: boolean
    if (dir === 'left' || dir === 'right') {
      ok = dir === 'right' ? (r.right > fr + 4 && cx > fx + 6) : (r.left < from.x - 4 && cx < fx - 6)
      gap = Math.max(0, dir === 'right' ? r.left - fr : from.x - r.right)
      const overlap = r.top < fb && r.bottom > from.y
      orthGap = overlap ? 0 : Math.min(Math.abs(r.top - fb), Math.abs(from.y - r.bottom))
      align = Math.abs(cy - fy)
    } else {
      ok = dir === 'down' ? (r.bottom > fb + 4 && cy > fy + 6) : (r.top < from.y - 4 && cy < fy - 6)
      gap = Math.max(0, dir === 'down' ? r.top - fb : from.y - r.bottom)
      const overlap = r.left < fr && r.right > from.x
      orthGap = overlap ? 0 : Math.min(Math.abs(r.left - fr), Math.abs(from.x - r.right))
      align = Math.abs(cx - fx)
    }
    if (!ok) continue
    if (orthGap > gap + 160) continue               // per daug į šoną – ne ta kryptis
    const s = gap + orthGap * 2.5 + align * 0.15
    if (s < score) { score = s; win = el }
  }
  return win
}

function scrollParent(el: Element | null, dir: PadBtn): HTMLElement | null {
  let p = el?.parentElement ?? null
  while (p && p !== document.body) {
    const st = getComputedStyle(p)
    const vert = dir === 'up' || dir === 'down'
    const ov = vert ? st.overflowY : st.overflowX
    if (ov === 'auto' || ov === 'scroll') {
      if (vert ? (dir === 'down' ? p.scrollTop + p.clientHeight < p.scrollHeight - 2 : p.scrollTop > 1)
               : (dir === 'right' ? p.scrollLeft + p.clientWidth < p.scrollWidth - 2 : p.scrollLeft > 1)) return p
    }
    p = p.parentElement
  }
  return null
}

function pe(type: string, target: EventTarget, x: number, y: number) {
  const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, screenX: x, screenY: y, pointerId: PID, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1 }
  try { target.dispatchEvent(new PointerEvent(type, init)) } catch { /* sena naršyklė */ }
}
const key = (k: string) => { window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, bubbles: true, cancelable: true })) }

export function GamepadLayer() {
  const t = useT()
  const pad = useSyncExternalStore(subscribePad, getPadState, getPadState)
  const cur = useRef<HTMLElement | null>(null)
  const carry = useRef<{ src: HTMLElement } | null>(null)
  const [ring, setRing] = useState<Rect | null>(null)
  const [ctx, setCtx] = useState<Ctx>('menu')
  const zone = useRef(-1)

  useEffect(() => { startGamepad() }, [])

  // ── fokuso rėmelio sekimas + konteksto atpažinimas + dešinės svirties slinkimas ──
  useEffect(() => {
    if (!pad.active) { setRing(null); return }
    let raf = 0; let last = ''
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const el = cur.current
      if (el && !el.isConnected) cur.current = null
      const r = cur.current?.getBoundingClientRect()
      const k = r ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}` : ''
      if (k !== last) { last = k; setRing(r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null) }
      const battle = inBattle()
      const c: Ctx = carry.current ? 'carry' : battle ? (targeting() ? 'target' : 'battle') : document.querySelector('[role="dialog"], [aria-modal="true"]') ? 'dialog' : 'menu'
      setCtx((p) => (p === c ? p : c))
      const sc = getPadScroll()
      if (sc.x || sc.y) {
        const base = cur.current ?? document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
        const p = scrollParent(base, sc.y > 0 ? 'down' : sc.y < 0 ? 'up' : sc.x > 0 ? 'right' : 'left')
        if (p) p.scrollBy(sc.x * 18, sc.y * 18)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [pad.active])

  useEffect(() => {
    const focus = (el: HTMLElement | null) => {
      cur.current = el
      if (!el) return
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }) } catch { /* */ }
      if (carry.current) { const c = centerOf(el); pe('pointermove', document.body, c.x, c.y) }
    }
    const first = (): HTMLElement | null => {
      const list = candidates(false)
      if (!list.length) return null
      if (inBattle()) { const h = list.find((e) => e.matches('[data-hand-card]')); if (h) return h }
      const px = window.innerWidth * 0.4, py = window.innerHeight * 0.4
      return list.filter((e) => !e.closest('[data-gp-nav]') && !e.hasAttribute('data-gp-nav'))
        .sort((a, b) => { const A = centerOf(a), B = centerOf(b); return Math.hypot(A.x - px, A.y - py) - Math.hypot(B.x - px, B.y - py) })[0] ?? list[0]
    }
    const stepRange = (el: HTMLInputElement, dir: 1 | -1) => {
      const step = Number(el.step) || 1, min = Number(el.min || 0), max = Number(el.max || 100)
      const v = Math.min(max, Math.max(min, Number(el.value) + dir * step * Math.max(1, Math.round((max - min) / step / 20))))
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(el, String(v))
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const move = (dir: PadBtn) => {
      const el = cur.current
      if (!el || !el.isConnected) { focus(carry.current ? candidates(true)[0] ?? null : first()); return }
      if (el instanceof HTMLInputElement && el.type === 'range' && (dir === 'left' || dir === 'right')) { stepRange(el, dir === 'right' ? 1 : -1); return }
      const r = el.getBoundingClientRect()
      const from = { x: r.left, y: r.top, w: r.width, h: r.height }
      const nxt = best(from, dir, candidates(!!carry.current), el)
      if (nxt) { focus(nxt); return }
      if (carry.current) return
      const sp = scrollParent(el, dir)
      if (sp) {
        const vert = dir === 'up' || dir === 'down'
        sp.scrollBy({ top: vert ? (dir === 'down' ? 1 : -1) * sp.clientHeight * 0.6 : 0, left: vert ? 0 : (dir === 'right' ? 1 : -1) * sp.clientWidth * 0.6 })
        window.setTimeout(() => {
          const e2 = cur.current; if (!e2) return
          const r2 = e2.getBoundingClientRect()
          const n2 = best({ x: r2.left, y: r2.top, w: r2.width, h: r2.height }, dir, candidates(false), e2)
          if (n2) focus(n2)
        }, 160)
      }
    }
    const tap = (el: HTMLElement) => { const c = centerOf(el); const hit = (document.elementFromPoint(c.x, c.y) as HTMLElement | null); const tg = hit && el.contains(hit) ? hit : el; pe('pointerdown', tg, c.x, c.y); pe('pointerup', tg, c.x, c.y) }
    const startCarry = (el: HTMLElement) => {
      const c = centerOf(el)
      const hit = document.elementFromPoint(c.x, c.y) as HTMLElement | null
      pe('pointerdown', hit && el.contains(hit) ? hit : el, c.x, c.y)
      pe('pointermove', document.body, c.x, c.y - 14); pe('pointermove', document.body, c.x, c.y - 34)
      carry.current = { src: el }
      // Pradinis taikinys: kortai iš rankos – sava eilė; puolančiam padarui – artimiausias priešas
      const fromHand = el.matches('[data-hand-card]')
      const drops = candidates(true)
      let tgt: HTMLElement | null = null
      if (fromHand) tgt = drops.find((d) => d.matches('[data-tut="units-you"]')) ?? null
      else {
        const foes = drops.filter((d) => d.closest('[data-tut="units-ai"]') && d.matches('[data-unit-uid]'))
        tgt = foes.sort((a, b) => Math.abs(centerOf(a).x - c.x) - Math.abs(centerOf(b).x - c.x))[0]
          ?? drops.filter((d) => d.matches('[data-player]')).sort((a, b) => centerOf(a).y - centerOf(b).y)[0] ?? null
      }
      window.setTimeout(() => { if (carry.current) focus(tgt ?? drops[0] ?? null) }, 60)
    }
    const drop = () => {
      const el = cur.current; if (!el) return
      const c = centerOf(el)
      pe('pointermove', document.body, c.x, c.y); pe('pointerup', document.body, c.x, c.y)
      carry.current = null
      window.setTimeout(() => { if (!cur.current?.isConnected || !visible(cur.current, true)) cur.current = first() }, 350)
    }
    const cancelCarry = () => {
      const c = carry.current ? centerOf(carry.current.src) : { x: 0, y: 0 }
      pe('pointercancel', document.body, c.x, c.y)   // be Escape: kovoje jis galėtų uždaryti pačią kovą
      const src = carry.current?.src ?? null; carry.current = null
      cur.current = src && src.isConnected ? src : first()
    }
    const back = () => {
      const ae = document.activeElement as HTMLElement | null
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) { ae.blur(); return }
      if (inBattle()) {
        // SVARBU: kovoje Escape be atidarytos peržiūros / pasirinkimo UŽDARO KOVĄ – todėl jį siunčiam
        // tik kai tikrai yra ką uždaryti. Kitu atveju B kovoje nedaro nieko (iš kovos per klaidą neišeisi).
        if (document.querySelector('[data-inspect-overlay]') || targeting()) { key('Escape'); return }
        const cl = candidates(false).find((e) => /uždaryti|close|atšaukti|atsisakyti|cancel/i.test(`${e.getAttribute('aria-label') ?? ''} ${e.textContent ?? ''}`) && !isBattleEl(e) && !!e.closest('[data-tut-modal], [role="dialog"], .combat-plate'))
        if (cl) cl.click()
        return
      }
      const list = candidates(false)
      const lab = (e: HTMLElement) => `${e.getAttribute('aria-label') ?? ''} ${(e.textContent ?? '').trim().slice(0, 3)}`
      const close = list.find((e) => /uždaryti|close|atšaukti|cancel/i.test(e.getAttribute('aria-label') ?? '') || /^[✕×]$/.test((e.textContent ?? '').trim()))
      const backBtn = list.find((e) => /atgal|back/i.test(e.getAttribute('aria-label') ?? '') || /‹/.test(lab(e)))
      const hit = close ?? backBtn
      if (hit) hit.click()
      else if (document.querySelector('[role="dialog"], [aria-modal="true"]')) key('Escape')
      else if (window.location.pathname.replace(/\/$/, '') !== '/digital') window.history.back()   // ekranai be „atgal" mygtuko (kompiuteryje)
      window.setTimeout(() => { if (!cur.current?.isConnected || !visible(cur.current, true)) cur.current = null }, 200)
    }
    const activate = () => {
      // Mokymų / dialogo „Toliau" – visada po ranka
      const nx = Array.from(document.querySelectorAll<HTMLElement>('button.rvn-tut-next')).find((b) => visible(b, true))
      if (nx && !carry.current) { nx.click(); return }
      if (carry.current) { drop(); return }
      const el = cur.current && cur.current.isConnected ? cur.current : null
      if (!el) { focus(first()); return }
      if (isBattleEl(el)) {
        const mine = el.matches('[data-hand-card]') || (el.matches('[data-unit-uid]') && !!el.closest('[data-tut="units-you"]'))
        if (mine && !targeting()) startCarry(el); else tap(el)
        return
      }
      if (el instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'button', 'submit'].includes(el.type)) { el.focus(); return }
      if (el instanceof HTMLTextAreaElement) { el.focus(); return }
      if (el instanceof HTMLSelectElement) {
        el.selectedIndex = (el.selectedIndex + 1) % el.options.length
        el.dispatchEvent(new Event('change', { bubbles: true })); return
      }
      el.click()
    }
    const inspect = () => {
      if (document.querySelector('[data-inspect-overlay]')) { key('Escape'); return }
      const el = cur.current; if (!el) return
      const c = centerOf(el)
      const hit = document.elementFromPoint(c.x, c.y) as HTMLElement | null
      ;(hit && el.contains(hit) ? hit : el).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: c.x, clientY: c.y, button: 2 }))
    }
    const shoulder = (d: 1 | -1) => {
      if (carry.current) return
      if (inBattle()) {
        // LB – ranka; RB – lenta (sava eilė → priešo eilė → priešo herbas)
        if (d < 0) { zone.current = -1; const h = document.querySelector<HTMLElement>('[data-hand-card]'); if (h) focus(h); return }
        const stops = [
          document.querySelector<HTMLElement>('[data-tut="units-you"] [data-unit-uid]'),
          document.querySelector<HTMLElement>('[data-tut="units-ai"] [data-unit-uid]'),
          Array.from(document.querySelectorAll<HTMLElement>('[data-player]')).sort((a, b) => centerOf(a).y - centerOf(b).y)[0] ?? null,
        ].filter((x): x is HTMLElement => !!x && visible(x, false))
        if (stops.length) { zone.current = (zone.current + 1) % stops.length; focus(stops[zone.current]) }
        return
      }
      const nav = Array.from(document.querySelectorAll<HTMLElement>('[data-gp-nav]')).filter((e) => visible(e, true))
      if (!nav.length) return
      const i = nav.findIndex((e) => e.getAttribute('aria-current') === 'page')
      nav[(i + d + nav.length) % nav.length].click()
      cur.current = null
    }
    return onPadPress((b) => {
      switch (b) {
        case 'up': case 'down': case 'left': case 'right': move(b); break
        case 'a': activate(); break
        case 'b': if (carry.current) cancelCarry(); else back(); break
        case 'y': if (!carry.current) inspect(); break
        case 'x': {
          if (carry.current) break
          const et = document.querySelector<HTMLElement>('[data-tut="end-turn"]')
          const btn = (et?.closest('button') ?? et) as HTMLElement | null
          if (btn && visible(btn, true)) btn.click()
          break
        }
        case 'lb': shoulder(-1); break
        case 'rb': shoulder(1); break
      }
    })
  }, [])

  if (!pad.connected || !pad.active) return null
  const H = (btn: PadBtn, label: string) => (
    <span key={btn + label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      <PadGlyph btn={btn} type={pad.type} size={18} />{label}
    </span>
  )
  const hints = ctx === 'carry' ? [H('a', t('common.gp.drop')), H('b', t('common.cancel'))]
    : ctx === 'target' ? [H('a', t('common.gp.pick')), H('b', t('common.cancel')), H('y', t('common.gp.inspect'))]
    : ctx === 'battle' ? [H('a', t('common.gp.take')), H('y', t('common.gp.inspect')), H('x', t('common.gp.endTurn')), H('lb', t('common.gp.hand')), H('rb', t('common.gp.board'))]
    : ctx === 'dialog' ? [H('a', t('common.gp.select')), H('b', t('common.close'))]
    : [H('a', t('common.gp.select')), H('b', t('common.back')), H('lb', ''), H('rb', t('common.gp.tabs'))]
  // Portalas į body: kova ir langai irgi yra body portalai – layout'o viduje sluoksnis liktų PO jais.
  return createPortal(
    <div data-gp-ignore aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'none' }}>
      {ring && (
        <div style={{ position: 'fixed', left: ring.x - 4, top: ring.y - 4, width: ring.w + 8, height: ring.h + 8, borderRadius: 6,
          border: '2px solid #F2C45A', boxShadow: '0 0 0 1px rgba(0,0,0,.7), 0 0 16px rgba(242,196,90,.75), inset 0 0 10px rgba(242,196,90,.25)',
          transition: 'left 90ms ease-out, top 90ms ease-out, width 90ms ease-out, height 90ms ease-out' }} />
      )}
      <div style={{ position: 'fixed', left: '50%', bottom: 'calc(4px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 14,
        padding: '4px 12px', borderRadius: 14, background: 'rgba(8,6,12,.82)', border: '1px solid rgba(240,180,41,.3)',
        font: '600 11.5px var(--ravenof-font-body, sans-serif)', color: '#f3ead3', maxWidth: '96vw', overflow: 'hidden' }}>
        {hints}
      </div>
    </div>,
    document.body,
  )
}
