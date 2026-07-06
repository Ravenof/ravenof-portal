'use client'
// ── Ravenof horizontal (landscape) combat layout ──
// F1 skeleton: gridas (kairė rail · lenta · dešinė pile'ai) + placeholder'iai naujom funkcijom
// (emote ratas, preview panelė, laikmačio žiedas). VISI render helper'iai lieka TutorialGame'e ir
// perduodami čia render-funkcijomis, kad state nereiktų kilnoti. Engine/state/FX nekeičiami.
import React, { useEffect, useState } from 'react'
import type { GameState, Side, TutCard } from '@/lib/tutorial/engine'

export interface BattleLayoutProps {
  game: GameState
  isTouch: boolean
  myTurn: boolean
  lastMsg: string
  railPanel: React.CSSProperties
  // esami helper'iai (lieka TutorialGame'e):
  hpBar: (side: Side, scale?: number) => React.ReactNode
  goldBar: (side: Side) => React.ReactNode
  renderPile: (label: string, count: number, opts?: { tut?: string; faceUp?: boolean; cards?: TutCard[]; pileKey?: string; back?: 'plain' | 'curse' | 'zmk'; big?: boolean; w?: number }) => React.ReactNode
  renderUnitsRow: (side: Side, tut: string) => React.ReactNode
  renderArtifactRow: (side: Side) => React.ReactNode
  renderReactionRow: (side: Side) => React.ReactNode
  dFieldRow: () => React.ReactNode
  renderOppHand: (big?: boolean) => React.ReactNode
  renderHand: () => React.ReactNode
  renderLog: () => React.ReactNode
  renderEndTurn: () => React.ReactNode
  renderDiscardGold: () => React.ReactNode
  turnDeadline?: number | null
  renderEmoteBubble?: (side: Side) => React.ReactNode
  onEmote?: (text: string) => void
}

// Kompaktiškas šoninis blokas su antrašte
function RailCard({ style, children, className }: { style: React.CSSProperties; children: React.ReactNode; className?: string }) {
  return <div className={'rounded-xl ' + (className ?? '')} style={style}>{children}</div>
}

// Ėjimo laikmačio žiedas aplink apvalų BAIGTI ĖJIMĄ (tik kai yra deadline: PvP/ranked; kitur null -> nerodom).
function TurnRing({ deadline, size = 92, total = 120000 }: { deadline?: number | null; size?: number; total?: number }) {
  const [frac, setFrac] = useState(1)
  useEffect(() => {
    if (deadline == null) { setFrac(1); return }
    const tick = () => setFrac(Math.max(0, Math.min(1, (deadline - Date.now()) / total)))
    tick()
    const iv = setInterval(tick, 250)
    return () => clearInterval(iv)
  }, [deadline, total])
  if (deadline == null) return null
  const r = size / 2 - 3
  const circ = 2 * Math.PI * r
  const danger = frac <= 20000 / total
  return (
    <svg width={size} height={size} className="absolute inset-0 pointer-events-none" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={danger ? '#ef4444' : '#f0b429'} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)}
        style={{ transition: 'stroke-dashoffset 0.25s linear', filter: danger ? 'drop-shadow(0 0 5px rgba(239,68,68,0.8))' : 'drop-shadow(0 0 4px rgba(240,180,41,0.6))' }} />
    </svg>
  )
}

export default function BattleLayout(props: BattleLayoutProps) {
  const {
    game, myTurn, lastMsg, railPanel,
    hpBar, goldBar, renderPile, renderUnitsRow, renderArtifactRow, renderReactionRow,
    dFieldRow, renderOppHand, renderHand, renderLog, renderEndTurn, renderDiscardGold, onEmote, turnDeadline, renderEmoteBubble,
  } = props
  const [emoteOpen, setEmoteOpen] = useState(false)
  const EMOTES = ['👋', '😎', '🔥', '😂', '😅', '🤝']

  return (
    <div className="flex-1 min-h-0 w-full" style={{ maxWidth: 1600, margin: '0 auto' }}>
      <div
        style={{
          display: 'grid', height: '100%',
          gridTemplateColumns: 'clamp(150px,16vw,232px) minmax(0,1fr) clamp(140px,16vw,206px)',
          gridTemplateRows: 'minmax(0,1fr)',
          gap: 'clamp(4px,0.8vw,10px)',
          paddingTop: 'max(clamp(4px,1vw,10px), env(safe-area-inset-top))',
          paddingBottom: 'max(clamp(4px,1vw,10px), env(safe-area-inset-bottom))',
          paddingLeft: 'max(clamp(4px,1vw,10px), env(safe-area-inset-left))',
          paddingRight: 'max(clamp(4px,1vw,10px), env(safe-area-inset-right))',
          position: 'relative',
        }}>

        {/* ── KAIRĖ: ikonų rail + preview panelė + mūšio žurnalas ── */}
        <aside className="flex flex-col gap-2 min-h-0 overflow-hidden">
          {/* ikonų rail (emote – placeholder F5) */}
          <RailCard style={railPanel} className="p-1.5 flex items-center gap-1.5 shrink-0">
            <button onClick={() => setEmoteOpen((v) => !v)} title="Emote"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors hover:bg-white/5"
              style={{ border: '1px solid rgba(240,180,41,0.3)', background: emoteOpen ? 'rgba(240,180,41,0.18)' : undefined }}>😊</button>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Emote</span>
          </RailCard>
          {/* mūšio žurnalas (preview panelė pašalinta – long-press jau atidaro kortos detales) */}
          <RailCard style={railPanel} className="p-2 flex-1 min-h-0 flex flex-col" >
            <span className="text-[10px] uppercase tracking-widest mb-1 shrink-0" style={{ color: 'var(--gold)' }}>Mūšio žurnalas</span>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5 pr-1">{renderLog()}</div>
          </RailCard>
        </aside>

        {/* ── CENTRAS: lenta ── */}
        <section data-fx-board className="min-h-0 rounded-2xl relative overflow-hidden">
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 55% at 50% 50%, rgba(240,180,41,0.05), rgba(0,0,0,0.35) 100%)', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.75)', borderRadius: 16, border: '1px solid rgba(240,180,41,0.12)', pointerEvents: 'none' }} />
          {/* lauko korta – kairysis lentos kraštas (kompaktiškas vertikalus slotas) */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 z-[8]">{dFieldRow()}</div>

          <div className="relative h-full flex flex-col justify-between" style={{ gap: 'clamp(1px,0.4vh,4px)', padding: '2px clamp(8px,2.5vw,30px) clamp(58px,10vh,94px) clamp(56px,7vw,76px)' }}>
            {/* Priešo avataras — viršuje-centre (ai-area = tutorial anchor: hp-ai/deck-ai/discard-ai/enemy-area) */}
            <div data-tut="ai-area" className="relative flex items-center justify-center gap-2 flex-nowrap shrink-0">
              {renderEmoteBubble?.('ai')}
              {renderOppHand()}
              {hpBar('ai', 0.68)}
              {goldBar('ai')}
            </div>
            {/* Priešo artefaktai + reakcijos — viena eilė */}
            <div className="shrink-0 flex items-center justify-center gap-2 flex-nowrap">{renderArtifactRow('ai')}{renderReactionRow('ai')}</div>
            {/* Priešo padarai */}
            <div className="shrink-0">{renderUnitsRow('ai', 'units-ai')}</div>
            {/* TAVO ĖJIMAS divideris (keičiasi + pulse priešo ėjime) */}
            <div className="flex items-center justify-center gap-2 py-0.5 rounded-full shrink-0"
              style={{
                background: myTurn ? 'linear-gradient(90deg, rgba(240,180,41,0) 0%, rgba(240,180,41,0.12) 50%, rgba(240,180,41,0) 100%)' : 'linear-gradient(90deg, rgba(139,92,246,0) 0%, rgba(139,92,246,0.14) 50%, rgba(139,92,246,0) 100%)',
                borderTop: '1px solid ' + (myTurn ? 'rgba(240,180,41,0.18)' : 'rgba(139,92,246,0.22)'),
                borderBottom: '1px solid ' + (myTurn ? 'rgba(240,180,41,0.18)' : 'rgba(139,92,246,0.22)'),
              }}>
              <span className={'text-[10px] font-bold uppercase tracking-[0.24em] ' + (myTurn ? '' : 'animate-pulse')}
                style={{ color: myTurn ? 'var(--gold)' : '#a78bfa', fontFamily: 'var(--rvn-font-display)', textShadow: myTurn ? '0 0 10px rgba(240,180,41,0.4)' : '0 0 10px rgba(139,92,246,0.4)' }}>
                {myTurn ? '◆ Tavo ėjimas ◆' : '◆ Priešo ėjimas ◆'}
              </span>
              <span className="text-[9px] truncate max-w-[36vw]" style={{ color: 'var(--text-muted)' }}>{lastMsg}</span>
            </div>
            {/* Tavo padarai */}
            <div className="shrink-0">{renderUnitsRow('you', 'units-you')}</div>
            {/* Tavo artefaktai + reakcijos — viena eilė */}
            <div className="shrink-0 flex items-center justify-center gap-2 flex-nowrap">{renderArtifactRow('you')}{renderReactionRow('you')}</div>
            {/* Tavo avataras — apačioje-centre (virš rankos) */}
            <div className="relative flex items-center justify-center gap-2 flex-nowrap shrink-0">
              {renderEmoteBubble?.('you')}
              {hpBar('you', 0.68)}
              {goldBar('you')}
            </div>
          </div>

        </section>

        {/* ── DEŠINĖ: pile'ai + apvalus BAIGTI ĖJIMĄ ── */}
        <aside className="flex flex-col gap-2 min-h-0 overflow-hidden items-stretch justify-between">
          {/* AI pile'ai (viršus) */}
          <RailCard style={railPanel} className="px-0.5 py-2 flex justify-center gap-0.5 shrink-0 w-full">
            {renderPile('Kaladė', game.ai.deck.length, { pileKey: 'deck-ai', back: 'plain', w: 40 })}
            {renderPile('Kapinynas', game.ai.discard.length, { faceUp: true, cards: game.ai.discard, pileKey: 'discard-ai', w: 40 })}
            {renderPile('ŽMK', game.ai.zmk.length, { back: 'zmk', w: 42 })}
          </RailCard>
          {/* apvalus BAIGTI ĖJIMĄ (su mana + laikmačio žiedu) + discard */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex items-center justify-center" style={{ width: 92, height: 92 }}>
              <TurnRing deadline={turnDeadline} size={92} />
              {renderEndTurn()}
            </div>
            {renderDiscardGold()}
          </div>
          {/* Tavo pile'ai (apačia) */}
          <RailCard style={railPanel} className="px-0.5 py-2 flex justify-center gap-0.5 shrink-0 w-full">
            {renderPile('Kaladė', game.you.deck.length, { tut: 'deck', pileKey: 'deck-you', back: 'plain', w: 40 })}
            {renderPile('Kapinynas', game.you.discard.length, { tut: 'discard', faceUp: true, cards: game.you.discard, pileKey: 'discard-you', w: 40 })}
            {renderPile('ŽMK', game.you.zmk.length, { tut: 'zmk', back: 'zmk', w: 40 })}
          </RailCard>
        </aside>

        {/* ── EMOTE ratas (radialinis) – ne rail'o viduj, kad nekarpytu overflow ── */}
        {emoteOpen && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setEmoteOpen(false)} />
            <div className="absolute z-50" style={{ left: 'clamp(60px,8vw,120px)', bottom: 'clamp(120px,26vh,220px)', width: 150, height: 150 }}>
              {EMOTES.map((e, i) => {
                const ang = (-90 + i * (360 / EMOTES.length)) * Math.PI / 180
                const rad = 58
                const x = 75 + Math.cos(ang) * rad - 22
                const y = 75 + Math.sin(ang) * rad - 22
                return (
                  <button key={i}
                    onClick={() => { onEmote?.(e); setEmoteOpen(false) }}
                    className="absolute w-11 h-11 rounded-full flex items-center justify-center text-xl transition-transform hover:scale-125 active:scale-95"
                    style={{ left: x, top: y, background: 'rgba(20,14,30,0.96)', border: '1px solid rgba(240,180,41,0.5)', boxShadow: '0 4px 14px rgba(0,0,0,0.7)' }}>
                    {e}
                  </button>
                )
              })}
              <div className="absolute w-9 h-9 rounded-full flex items-center justify-center text-base pointer-events-none"
                style={{ left: 75 - 18, top: 75 - 18, background: 'rgba(240,180,41,0.16)', border: '1px solid rgba(240,180,41,0.4)' }}>😊</div>
            </div>
          </>
        )}

        {/* ── RANKA: apatinis overlay (kompaktiška; tap atidaro didelę handExpanded kortų peržiūrą – Hearthstone stiliaus). ── */}
        <div className="absolute left-0 right-0 bottom-0 z-30 flex items-end justify-center pointer-events-none"
          style={{ height: 'clamp(52px,9vh,88px)' }}>
          <div className="pointer-events-auto w-full h-full flex items-end justify-center">{renderHand()}</div>
        </div>
      </div>
    </div>
  )
}
