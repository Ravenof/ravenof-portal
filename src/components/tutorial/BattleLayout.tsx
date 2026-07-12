'use client'
// ── Ravenof horizontal (landscape) combat layout ──
// F1 skeleton: gridas (kairė rail · lenta · dešinė pile'ai) + placeholder'iai naujom funkcijom
// (emote ratas, preview panelė, laikmačio žiedas). VISI render helper'iai lieka TutorialGame'e ir
// perduodami čia render-funkcijomis, kad state nereiktų kilnoti. Engine/state/FX nekeičiami.
import React, { useEffect, useRef, useState } from 'react'
import type { GameState, Side, TutCard } from '@/lib/tutorial/engine'
import { useT } from '@/lib/i18n/react'

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
  renderLogStrip?: () => React.ReactNode
  renderEndTurn: () => React.ReactNode
  renderDiscardGold: () => React.ReactNode
  turnDeadline?: number | null
  renderEmoteBubble?: (side: Side) => React.ReactNode
  onEmote?: (text: string) => void
}

// Kompaktiškas šoninis blokas su antrašte
function RailCard({ style, children, className, onClick, title }: { style: React.CSSProperties; children: React.ReactNode; className?: string; onClick?: () => void; title?: string }) {
  return <div className={'rounded-xl ' + (className ?? '')} style={style} onClick={onClick} title={title}>{children}</div>
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
  const t = useT()
  const {
    game, myTurn, lastMsg, railPanel,
    hpBar, goldBar, renderPile, renderUnitsRow, renderArtifactRow, renderReactionRow,
    dFieldRow, renderOppHand, renderHand, renderLog, renderLogStrip, renderEndTurn, renderDiscardGold, onEmote, turnDeadline, renderEmoteBubble,
  } = props
  const [emoteOpen, setEmoteOpen] = useState(false)
  const [logExpanded, setLogExpanded] = useState(false)
  const logTouchX = useRef<number | null>(null)
  const logScrollRef = useRef<HTMLDivElement>(null)
  // išskleidus (ir augant įrašams) — visada rodyti naujausius (apačioje)
  useEffect(() => {
    if (!logExpanded) return
    const el = logScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logExpanded, game?.log?.length])
  const EMOTES = ['👋', '😎', '🔥', '😂', '😅', '🤝']

  return (
    <div className="flex-1 min-h-0 w-full" style={{ maxWidth: 1600, margin: '0 auto' }}>
      <div
        style={{
          display: 'grid', height: '100%',
          gridTemplateColumns: 'clamp(132px,17vw,178px) minmax(0,1fr) clamp(140px,16vw,206px)',
          gridTemplateRows: 'minmax(0,1fr)',
          gap: 'clamp(4px,0.8vw,10px)',
          paddingTop: 'max(clamp(4px,1vw,10px), env(safe-area-inset-top))',
          paddingBottom: 'max(clamp(4px,1vw,10px), env(safe-area-inset-bottom))',
          paddingLeft: 'max(clamp(4px,1vw,10px), env(safe-area-inset-left))',
          paddingRight: 'max(clamp(4px,1vw,10px), env(safe-area-inset-right))',
          position: 'relative',
        }}>

        {/* ── KAIRĖ: emote + AI/tavo artefaktai/reakcijos + suskleidžiamas žurnalas ── */}
        <aside className="flex flex-col gap-1 min-h-0 overflow-hidden">
          <RailCard style={railPanel} className="shrink-0 flex items-center justify-between p-1">
            <button onClick={() => setEmoteOpen((v) => !v)} title="Emote" className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(240,180,41,0.3)', background: emoteOpen ? 'rgba(240,180,41,0.18)' : undefined }}>😊</button>
            <button onClick={() => setLogExpanded((v) => !v)} title={t('battle.layout.log')} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(240,180,41,0.3)', color: 'var(--gold)', fontSize: 13 }}>{logExpanded ? '‹📜' : '📜'}</button>
          </RailCard>
          {/* Priešo artefaktai + reakcijos */}
          <div className="shrink-0 flex flex-col items-center gap-0.5">{renderArtifactRow('ai')}{renderReactionRow('ai')}</div>
          {/* Žurnalas — strip (mini) arba pilnas; braukiama/spaudžiama */}
          <div style={railPanel} className="rounded-xl p-1 flex-1 min-h-0 flex flex-col overflow-hidden"
            onTouchStart={(e) => { logTouchX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => { if (logTouchX.current == null) return; const dx = e.changedTouches[0].clientX - logTouchX.current; logTouchX.current = null; if (dx > 30) setLogExpanded(true); else if (dx < -30) setLogExpanded(false) }}>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-1 cursor-pointer" onClick={() => setLogExpanded(true)}>{renderLogStrip?.()}</div>
          </div>
          {/* Tavo reakcijos + artefaktai */}
          <div className="shrink-0 flex flex-col items-center gap-0.5">{renderReactionRow('you')}{renderArtifactRow('you')}</div>
        </aside>

        {/* ── Mūšio žurnalo DRAWER (platus; tap bet kur šalia — susitraukia) ── */}
        {logExpanded && (
          <>
            <div className="absolute inset-0 z-[24]" style={{ background: 'rgba(4,3,8,0.35)' }} onClick={() => setLogExpanded(false)} />
            <div className="absolute left-0 top-0 bottom-0 z-[25] flex flex-col rounded-2xl overflow-hidden"
              style={{ width: 'min(340px, 44vw)', background: 'linear-gradient(160deg, rgba(17,13,26,0.98), rgba(8,6,12,0.99))', border: '1px solid rgba(240,180,41,0.4)', boxShadow: '10px 0 34px rgba(0,0,0,0.65)' }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => { logTouchX.current = e.touches[0].clientX }}
              onTouchEnd={(e) => { if (logTouchX.current == null) return; const dx = e.changedTouches[0].clientX - logTouchX.current; logTouchX.current = null; if (dx < -30) setLogExpanded(false) }}>
              <div className="shrink-0 flex items-center justify-between px-3 pt-2 pb-1.5" style={{ borderBottom: '1px solid rgba(240,180,41,0.2)' }}>
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{t('battle.layout.log')}</span>
                <button onClick={() => setLogExpanded(false)} aria-label={t('battle.layout.close')} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.35)', color: 'var(--gold)', fontSize: 11 }}>✕</button>
              </div>
              <div ref={logScrollRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 px-2.5 py-2">{renderLog()}</div>
              <div className="shrink-0 px-3 pb-1.5 text-center" style={{ fontSize: 8.5, color: 'rgba(150,160,185,0.5)' }}>{t('battle.layout.logHint')}</div>
            </div>
          </>
        )}

        {/* ── CENTRAS: lenta ── */}
        <section data-fx-board className="min-h-0 rounded-2xl relative overflow-hidden">
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 55% at 50% 50%, rgba(240,180,41,0.05), rgba(0,0,0,0.35) 100%)', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.75)', borderRadius: 16, border: '1px solid rgba(240,180,41,0.12)', pointerEvents: 'none' }} />
          {/* lauko korta – DEŠINYSIS lentos kraštas (kad nemaišytų su kairėj esančiais artefaktais/reakcijomis) */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 z-[8]">{dFieldRow()}</div>

          <div className="relative h-full flex flex-col justify-between" style={{ gap: 'clamp(1px,0.4vh,4px)', padding: '2px clamp(56px,7vw,76px) clamp(58px,10vh,94px) clamp(8px,2.5vw,30px)' }}>
            {/* Priešo avataras — viršuje-centre (ai-area = tutorial anchor: hp-ai/deck-ai/discard-ai/enemy-area) */}
            <div data-tut="ai-area" className="relative flex items-center justify-center gap-2 flex-nowrap shrink-0">
              {renderEmoteBubble?.('ai')}
              {renderOppHand()}
              {hpBar('ai', 0.68)}
              {goldBar('ai')}
            </div>
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
                {myTurn ? t('battle.layout.yourTurn') : t('battle.layout.enemyTurn')}
              </span>
              <span className="text-[9px] truncate max-w-[36vw]" style={{ color: 'var(--text-muted)' }}>{lastMsg}</span>
            </div>
            {/* Tavo padarai */}
            <div className="shrink-0">{renderUnitsRow('you', 'units-you')}</div>
          </div>
          {/* Tavo avataras — dešinys apatinis lentos kampas (fieldo pusėj, tuščioj erdvėj prie pile'ų) */}
          <div className="absolute right-2 bottom-1 z-[9] flex items-center gap-1.5">
            {renderEmoteBubble?.('you')}
            {hpBar('you', 0.74)}
          </div>

        </section>

        {/* ── DEŠINĖ: pile'ai + apvalus BAIGTI ĖJIMĄ ── */}
        <aside className="flex flex-col gap-2 min-h-0 overflow-hidden items-stretch justify-between">
          {/* AI pile'ai (viršus) */}
          <RailCard style={railPanel} className="px-0.5 py-2 flex justify-center gap-0.5 shrink-0 w-full">
            {renderPile(t('battle.game.deck'), game.ai.deck.length, { pileKey: 'deck-ai', back: 'plain', w: 40 })}
            {renderPile('Kapinynas', game.ai.discard.length, { faceUp: true, cards: game.ai.discard, pileKey: 'discard-ai', w: 40 })}
            {renderPile(t('battle.game.zmk'), game.ai.zmk.length, { back: 'zmk', w: 42 })}
          </RailCard>
          {/* apvalus BAIGTI ĖJIMĄ (su mana + laikmačio žiedu) + discard */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative flex items-center justify-center" style={{ width: 92, height: 92 }}>
              <TurnRing deadline={turnDeadline} size={92} />
              {renderEndTurn()}
            </div>
            {/* auksas (atskirai, su monetos ikona) + parduoti kortą */}
            {goldBar('you')}
            {renderDiscardGold()}
          </div>
          {/* Tavo pile'ai (apačia) */}
          <RailCard style={railPanel} className="px-0.5 py-2 flex justify-center gap-0.5 shrink-0 w-full">
            {renderPile(t('battle.game.deck'), game.you.deck.length, { tut: 'deck', pileKey: 'deck-you', back: 'plain', w: 40 })}
            {renderPile('Kapinynas', game.you.discard.length, { tut: 'discard', faceUp: true, cards: game.you.discard, pileKey: 'discard-you', w: 40 })}
            {renderPile(t('battle.game.zmk'), game.you.zmk.length, { tut: 'zmk', back: 'zmk', w: 40 })}
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
