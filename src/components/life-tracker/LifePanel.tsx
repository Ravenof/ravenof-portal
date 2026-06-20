'use client'

import type { ActionType } from '@/types/life-tracker'
import { HPControls } from './HPControls'

type Props = {
  sideIdx: 0 | 1
  name: string
  hp: number
  maxHp: number
  isActive: boolean
  flashType: ActionType | null
  flashKey: number
  onHpChange: (sideIdx: 0 | 1, delta: number) => void
  onNameChange: (sideIdx: 0 | 1, name: string) => void
}

export function LifePanel({
  sideIdx,
  name,
  hp,
  maxHp,
  isActive,
  flashType,
  flashKey,
  onHpChange,
  onNameChange,
}: Props) {
  const isDanger   = hp > 0 && hp <= 10
  const isCritical = hp <= 0

  const hpColor = isCritical ? '#ef4444' : isDanger ? '#f97316' : '#d4af37'

  // Vial: užpildymas ir spalva pagal HP/max (hue 120°žalia → 0°raudona palaipsniui)
  const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)))
  const hue = ratio * 120
  const liqTop = `hsl(${hue}, 84%, 54%)`
  const liqBot = `hsl(${hue}, 84%, 36%)`
  const crit = hp > 0 && hp <= 10

  // Border — bevel-ish: top brighter, bottom darker
  const bTop  = isActive ? '#e8c84a' : isCritical ? 'rgba(239,68,68,.35)' : 'rgba(255,255,255,.10)'
  const bSide = isActive ? '#a07820' : isCritical ? 'rgba(239,68,68,.20)' : 'rgba(255,255,255,.05)'
  const bBot  = isActive ? '#5a3e08' : isCritical ? 'rgba(239,68,68,.12)' : 'rgba(0,0,0,.5)'

  const panelBg = isActive
    ? 'linear-gradient(180deg,#1e1608 0%,#110e05 50%,#0a0800 100%)'
    : 'linear-gradient(180deg,#13131e 0%,#0c0c14 50%,#080810 100%)'

  const boxShadow = isActive
    ? '0 4px 20px rgba(0,0,0,.7), 0 0 28px rgba(212,175,55,.18), inset 0 1px 0 rgba(232,200,74,.10), inset 0 -2px 8px rgba(0,0,0,.6)'
    : isCritical
    ? '0 4px 16px rgba(0,0,0,.65), 0 0 16px rgba(239,68,68,.12), inset 0 1px 0 rgba(255,255,255,.04), inset 0 -2px 8px rgba(0,0,0,.5)'
    : '0 4px 12px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.04), inset 0 -2px 8px rgba(0,0,0,.45)'

  return (
    <div
      className={'relative rounded-2xl overflow-hidden' + (isActive ? ' lt-active-glow' : '')}
      style={{
        background: panelBg,
        borderTop: `2.5px solid ${bTop}`,
        borderRight: `2.5px solid ${bSide}`,
        borderBottom: `2.5px solid ${bBot}`,
        borderLeft: `2.5px solid ${bSide}`,
        boxShadow,
        minHeight: '300px',
        transition: 'border-color .25s ease, box-shadow .25s ease',
      }}
    >
      <style>{LT_VIAL_CSS}</style>
      {/* Flash overlay */}
      <div
        key={flashKey}
        className={flashType === 'damage' ? 'lt-flash-dmg' : flashType === 'heal' ? 'lt-flash-heal' : ''}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}
      />

      {/* Corner ornaments — always shown, brighter when active */}
      {(['tl','tr','bl','br'] as const).map((corner) => {
        const isTop    = corner.startsWith('t')
        const isLeft   = corner.endsWith('l')
        const color    = isActive ? 'rgba(212,175,55,0.65)' : 'rgba(255,255,255,0.12)'
        const base: React.CSSProperties = {
          position: 'absolute',
          width: 18, height: 18,
          pointerEvents: 'none', zIndex: 2,
          [isTop  ? 'top'    : 'bottom']: 7,
          [isLeft ? 'left'   : 'right' ]: 7,
          borderTop:    isTop  ? `2px solid ${color}` : undefined,
          borderBottom: !isTop ? `2px solid ${color}` : undefined,
          borderLeft:   isLeft ? `2px solid ${color}` : undefined,
          borderRight:  !isLeft ? `2px solid ${color}` : undefined,
          borderRadius: `${isTop && isLeft ? '3px 0 0 0' : isTop && !isLeft ? '0 3px 0 0' : !isTop && isLeft ? '0 0 0 3px' : '0 0 3px 0'}`,
        }
        return <span key={corner} style={base} />
      })}

      <div className="relative z-10 flex flex-col items-center p-5 gap-3 h-full">
        {/* Name input */}
        <input
          value={name}
          onChange={(e) => onNameChange(sideIdx, e.target.value)}
          className="text-center text-sm font-semibold bg-transparent border-b w-full max-w-[220px] outline-none pb-1 tracking-wide"
          style={{
            color: isActive ? '#d4af37' : 'var(--text-primary)',
            borderColor: isActive ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.10)',
            fontFamily: 'Cinzel, Georgia, serif',
            transition: 'color .25s ease, border-color .25s ease',
            textShadow: isActive ? '0 0 8px rgba(212,175,55,.3)' : 'none',
          }}
        />

        {/* HP vial */}
        <div className="relative my-1" style={{ width: 120, height: 196 }}>
          <div className={'lt-vial' + (crit ? ' lt-vial-crit' : '')}
            style={{ borderColor: isActive ? 'rgba(212,175,55,0.5)' : crit ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.14)' }}>
            <div className="lt-vial-liquid" style={{ height: `${ratio * 100}%`, background: `linear-gradient(180deg, ${liqTop}, ${liqBot})`, boxShadow: `0 0 26px ${liqTop}` }}>
              <div className="lt-vial-wave" style={{ background: liqTop }} />
              <div className="lt-vial-wave lt-vial-wave2" style={{ background: liqBot }} />
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="lt-bubble" style={{ left: `${16 + i * 22}%`, animationDelay: `${i * 0.85}s`, animationDuration: `${3.2 + (i % 3) * 0.9}s` }} />
              ))}
            </div>
            <div className="lt-vial-shine" />
          </div>
          <span className="lt-vial-hp" style={{ color: '#fff', textShadow: `0 0 16px ${liqTop}, 0 2px 5px rgba(0,0,0,0.85)` }}>{hp}</span>
        </div>

        {/* Status badge */}
        {isCritical && (
          <span
            className="text-xs font-bold px-3 py-0.5 rounded-full uppercase"
            style={{
              background: 'rgba(239,68,68,.15)',
              color: '#ef4444',
              borderTop: '1px solid rgba(248,113,113,.5)',
              borderRight: '1px solid rgba(239,68,68,.3)',
              borderBottom: '1px solid rgba(127,29,29,.5)',
              borderLeft: '1px solid rgba(239,68,68,.3)',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.14em',
              boxShadow: '0 0 10px rgba(239,68,68,.22)',
              textShadow: '0 0 6px rgba(239,68,68,.5)',
            }}
          >
            PRALAIMĖJO
          </span>
        )}
        {isDanger && !isCritical && (
          <span
            className="text-xs font-bold px-3 py-0.5 rounded-full uppercase"
            style={{
              background: 'rgba(249,115,22,.15)',
              color: '#f97316',
              borderTop: '1px solid rgba(253,186,116,.5)',
              borderRight: '1px solid rgba(249,115,22,.3)',
              borderBottom: '1px solid rgba(124,45,18,.5)',
              borderLeft: '1px solid rgba(249,115,22,.3)',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.14em',
              boxShadow: '0 0 10px rgba(249,115,22,.22)',
              textShadow: '0 0 6px rgba(249,115,22,.5)',
            }}
          >
            KRITINIS
          </span>
        )}

        {/* HP Controls */}
        <HPControls sideIdx={sideIdx} onHpChange={onHpChange} />
      </div>
    </div>
  )
}


const LT_VIAL_CSS = `
.lt-vial { position:absolute; inset:0; border-radius:18px 18px 32px 32px; overflow:hidden; border:2.5px solid rgba(255,255,255,0.14); background:linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.01)); box-shadow: inset 0 2px 12px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.05), 0 6px 20px rgba(0,0,0,0.5); transition:border-color .25s ease; }
.lt-vial-crit { animation: ltCrit 0.85s ease-in-out infinite; }
@keyframes ltCrit { 0%,100%{ box-shadow: inset 0 2px 12px rgba(0,0,0,0.55), 0 0 8px rgba(239,68,68,0.35); } 50%{ box-shadow: inset 0 2px 12px rgba(0,0,0,0.55), 0 0 28px rgba(239,68,68,0.95); } }
.lt-vial-liquid { position:absolute; left:0; right:0; bottom:0; transition: height .6s cubic-bezier(.3,.8,.3,1), background .6s ease; will-change:height; }
.lt-vial-wave { position:absolute; left:50%; top:-26px; width:240%; height:54px; transform:translateX(-50%); border-radius:43% 47% 44% 46%; opacity:.9; animation: ltSpin 6.5s linear infinite; }
.lt-vial-wave2 { top:-22px; width:240%; height:50px; opacity:.55; animation-duration: 9s; animation-direction: reverse; }
@keyframes ltSpin { from{ transform:translateX(-50%) rotate(0deg); } to{ transform:translateX(-50%) rotate(360deg); } }
.lt-bubble { position:absolute; bottom:6px; width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,0.55); animation: ltBubble linear infinite; }
@keyframes ltBubble { 0%{ transform:translateY(0) scale(0.6); opacity:0; } 15%{ opacity:.85; } 100%{ transform:translateY(-150px) scale(1); opacity:0; } }
.lt-vial-shine { position:absolute; top:8px; left:12px; width:16px; height:60%; border-radius:40%; background:linear-gradient(180deg, rgba(255,255,255,0.28), transparent); pointer-events:none; z-index:2; }
.lt-vial-hp { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-family:Cinzel, Georgia, serif; font-weight:800; font-size:clamp(2.6rem,7vw,3.5rem); letter-spacing:-0.02em; pointer-events:none; z-index:3; }
@media (prefers-reduced-motion: reduce){ .lt-vial-wave, .lt-bubble, .lt-vial-crit { animation:none !important; } }
`
