'use client'

// ═══════════════════════════════════════════════════════════
// FxArena — mini kovos laukas FX peržiūrai (admin kortos redaktorius + /dev/fx).
// Groja TĄ PATĮ fxStage kodą kaip kova, tik ant manekenų: ką matai čia, tą
// matys žaidėjas. Kortos turi tą pačią DOM struktūrą ([data-unit-uid] > [data-lunge]).
// ═══════════════════════════════════════════════════════════
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { fxStage, type FxHooks } from '@/lib/game/fxStage'
import type { FxProjId, FxImpactId, SummonFxId } from '@/lib/game/fxCatalog'

export type FxArenaHandle = {
  summon: (id: SummonFxId) => void
  effect: (proj: FxProjId, impact: FxImpactId | null, o?: { hostile?: boolean; targets?: 1 | 3; light?: boolean; color?: string }) => void
}

type Dummy = { id: string; name: string; hue: number; atk: number; hp: number }
const ENEMY: Dummy[] = [
  { id: 'e0', name: 'Kaulų sargas', hue: 150, atk: 2, hp: 5 },
  { id: 'e1', name: 'Pragaro šuo', hue: 5, atk: 3, hp: 4 },
  { id: 'e2', name: 'Tamsos žynys', hue: 275, atk: 2, hp: 3 },
]
const SRC: Dummy = { id: 'a0', name: 'Ugnies magė', hue: 22, atk: 3, hp: 4 }
const ALLY1: Dummy = { id: 'a1', name: 'Skydnešys', hue: 212, atk: 1, hp: 6 }
const ALLY2: Dummy = { id: 'a2', name: 'Lankininkė', hue: 120, atk: 2, hp: 3 }

function Card({ d, w, image }: { d: Dummy; w: number; image?: string | null }) {
  const h = Math.round(w * 4 / 3)
  return (
    <div data-unit-uid={'fxa-' + d.id} style={{ width: w, height: h, flex: '0 0 auto' }}>
      <div data-lunge style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden', border: '1.5px solid rgba(216,178,90,0.75)', background: `linear-gradient(160deg, hsl(${d.hue},50%,30%), hsl(${d.hue + 40},55%,11%))`, boxShadow: '0 6px 14px rgba(0,0,0,0.55)' }}>
          {image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ position: 'absolute', inset: '14% 22% 34%', border: `1.5px solid hsla(${d.hue},80%,78%,0.5)`, borderRadius: '50%' }} />}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: Math.round(w * 0.2), textAlign: 'center', fontSize: Math.max(8, Math.round(w * 0.11)), color: '#e9e2d3', textShadow: '0 1px 2px #000', padding: '0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
          <div style={{ position: 'absolute', left: 3, right: 3, bottom: 3, display: 'flex', justifyContent: 'space-between', fontSize: Math.max(9, Math.round(w * 0.13)), fontWeight: 700 }}>
            <span style={{ background: '#b4472e', color: '#fff', borderRadius: 99, minWidth: '1.5em', textAlign: 'center' }}>{d.atk}</span>
            <span style={{ background: '#2f7a57', color: '#fff', borderRadius: 99, minWidth: '1.5em', textAlign: 'center' }}>{d.hp}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const FxArena = forwardRef<FxArenaHandle, { cardW?: number; cardName?: string; cardImage?: string | null; height?: number }>(function FxArena({ cardW = 72, cardName, cardImage, height }, ref) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const q = useCallback((id: string) => rootRef.current?.querySelector<HTMLElement>(`[data-unit-uid="fxa-${id}"]`) ?? null, [])
  const hooks = useCallback((): FxHooks => ({
    shake: (m) => { const b = boardRef.current; if (!b || m < 2.5) return; const k = Math.min(10, m * 0.5); try { b.animate([{ translate: '0 0' }, { translate: `${k}px ${-k * 0.6}px` }, { translate: `${-k * 0.8}px ${k * 0.5}px` }, { translate: `${k * 0.4}px ${k * 0.3}px` }, { translate: '0 0' }], { duration: 260, easing: 'ease-out' }) } catch { /* */ } },
  }), [])
  const center = (el: HTMLElement | null) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }

  useImperativeHandle(ref, () => ({
    summon(id) {
      const el = q('s'); if (!el) return
      fxStage.stop()
      fxStage.summon(id, el, { root: rootRef.current, hooks: hooks() })
    },
    effect(proj, impact, o = {}) {
      fxStage.stop()
      const hostile = o.hostile ?? true
      const src = q('a0'); const from = center(src); if (!src || !from) return
      const tg = hostile ? (o.targets === 3 ? ['e0', 'e1', 'e2'] : ['e1']) : (o.targets === 3 ? ['a1', 's', 'a2'] : ['a2'])
      tg.forEach((id, i) => {
        const el = q(id), to = center(el); if (!el || !to) return
        window.setTimeout(() => fxStage.fly(proj, { x: from.x, y: from.y - (hostile ? 20 : 0) }, to, { cast: i === 0, sourceEl: src, targetEl: el, impact, light: o.light, color: o.color, root: rootRef.current, hooks: hooks() }), i * 90)
      })
    },
  }), [q, hooks])

  useEffect(() => () => { fxStage.stop() }, [])

  const row: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: Math.round(cardW * 0.42) }
  return (
    <div ref={rootRef} style={{ position: 'relative', overflow: 'hidden', borderRadius: 8, background: 'radial-gradient(ellipse at center, #2a2330 0%, #0b0910 100%)', border: '1px solid rgba(216,178,90,0.25)', height: height ?? Math.round(cardW * 4 / 3 * 2 + cardW * 1.9), padding: `${Math.round(cardW * 0.45)}px 12px` }}>
      <div ref={boardRef} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
        <div style={row}>{ENEMY.map((d) => <Card key={d.id} d={d} w={cardW} />)}</div>
        <div style={row}>
          <Card d={SRC} w={cardW} /><Card d={ALLY1} w={cardW} />
          <Card d={{ id: 's', name: cardName || 'Varngrado riteris', hue: 42, atk: 5, hp: 5 }} w={cardW} image={cardImage} />
          <Card d={ALLY2} w={cardW} />
        </div>
      </div>
    </div>
  )
})
