'use client'
// ── Ravenof DESKTOP kovos išdėstymas (pelė, plotis ≥ 1024) ──────────────────
// Ta pati struktūra kaip mobile BattleLayout (kairė rail · lenta · dešinė rail ·
// ranka apačioje), bet geometrija valdoma pagal turinį ir aukščio biudžetą
// (useDesktopLayout.computeDesktopSizes), o ne justify-between. Rankai – realus
// rezervas po tavo padarais: ramybėje ji nedengia nei padarų, nei avataro.
// Render helper'iai (state) lieka TutorialGame'e; mobile BattleLayout NEKEIČIAMAS.
import React, { useEffect, useRef, useState } from 'react'
import type { BattleLayoutProps } from './BattleLayout'
import type { DesktopSizes } from './useDesktopLayout'
import { useT } from '@/lib/i18n/react'

export interface DesktopBattleLayoutProps extends BattleLayoutProps {
  sizes: DesktopSizes
  handCount: number
  handExpanded: boolean
  discardMode: boolean
  onToggleHand: () => void
  onBoardPointerDown?: () => void
}

function TurnRing({ deadline, size, total = 120000 }: { deadline?: number | null; size: number; total?: number }) {
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

function RailBox({ style, children, className, title }: { style: React.CSSProperties; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <div className={'rounded-xl ' + (className ?? '')} style={style}>
      {title && <div className="rvn-desk-rail-title">{title}</div>}
      {children}
    </div>
  )
}

export default function DesktopBattleLayout(props: DesktopBattleLayoutProps) {
  const t = useT()
  const {
    game, myTurn, lastMsg, railPanel, sizes,
    hpBar, goldBar, renderPile, renderUnitsRow, renderArtifactRow, renderReactionRow,
    dFieldRow, renderOppHand, renderHand, renderLog, renderEndTurn, renderDiscardGold, onEmote, turnDeadline, renderEmoteBubble,
    handCount, handExpanded, discardMode, onToggleHand, onBoardPointerDown,
  } = props
  const [emoteOpen, setEmoteOpen] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight }, [game?.log?.length])
  const EMOTES = ['👋', '😎', '🔥', '😂', '😅', '🤝']
  const s = sizes
  const pad = 12
  const railTitle = (k: string) => <span className="rvn-desk-rail-title">{k}</span>

  return (
    <div className="rvn-desk flex-1 min-h-0 w-full" style={{ ['--rvn-desk-end-turn' as string]: `${s.endTurn}px`, ['--rvn-desk-log-font' as string]: `${s.logFont}px` }}>
      <div style={{
        display: 'grid', height: '100%', position: 'relative',
        gridTemplateColumns: `${s.railL}px minmax(0,1fr) ${s.railR}px`,
        gridTemplateRows: 'minmax(0,1fr)', gap: pad, padding: pad,
      }}>

        {/* ── KAIRĖ: emote · priešo artefaktai/reakcijos · žurnalas (ribotas, skaitomas) · tavo reakcijos/artefaktai ── */}
        <aside className="flex flex-col gap-2 min-h-0 overflow-hidden">
          <RailBox style={railPanel} className="shrink-0 flex items-center justify-between px-2 py-1.5">
            <button onClick={() => setEmoteOpen((v) => !v)} title="Emote" className="combat-round-icon text-[16px]" style={{ filter: emoteOpen ? 'brightness(1.25)' : undefined }}>😊</button>
            <span className="rvn-desk-rail-title" style={{ margin: 0 }}>{t('battle.layout.log')}</span>
          </RailBox>
          <RailBox style={railPanel} className="shrink-0 flex flex-col items-center gap-1 py-2">
            {railTitle(t('battle.opponentFallback'))}
            {renderArtifactRow('ai')}{renderReactionRow('ai')}
          </RailBox>
          <div style={railPanel} className="rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
            <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 px-2.5 py-2 rvn-desk-log">{renderLog()}</div>
          </div>
          <RailBox style={railPanel} className="shrink-0 flex flex-col items-center gap-1 py-2">
            {railTitle(t('battle.player'))}
            {renderReactionRow('you')}{renderArtifactRow('you')}
          </RailBox>
        </aside>

        {/* ── CENTRAS: lenta su aiškiomis eilėmis + rankos rezervu apačioje ── */}
        <section data-fx-board className="min-h-0 rounded-2xl relative overflow-hidden" onPointerDown={onBoardPointerDown}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 55% at 50% 42%, rgba(240,180,41,0.06), rgba(0,0,0,0.38) 100%)', boxShadow: 'inset 0 0 110px rgba(0,0,0,0.75)', borderRadius: 16, border: '1px solid rgba(240,180,41,0.14)', pointerEvents: 'none' }} />
          {/* Lauko korta – dešinysis lentos kraštas, padarų eilių aukštyje (ne rankos zonoje) */}
          <div className="absolute z-[8]" style={{ right: 10, top: `calc(50% - ${s.handZoneH / 2}px)`, transform: 'translateY(-50%)' }}>{dFieldRow()}</div>

          <div className="relative h-full flex flex-col" style={{ padding: `${pad}px ${s.fieldW + 28}px ${s.handZoneH}px ${pad + 8}px`, gap: 8 }}>
            {/* Priešo grupė: užversta ranka + avataras + auksas */}
            <div data-tut="ai-area" className="relative flex items-center justify-center gap-3 shrink-0" style={{ minHeight: 72 }}>
              {renderEmoteBubble?.('ai')}
              {renderOppHand(true)}
              {hpBar('ai', s.compact ? 0.8 : 0.9)}
              {goldBar('ai')}
            </div>
            {/* Vidurinė grupė centruojama likusioje erdvėje – tarpai valdomi, ne ištempiami */}
            <div className="flex-1 min-h-0 flex flex-col justify-center" style={{ gap: 10 }}>
              <div className="shrink-0">{renderUnitsRow('ai', 'units-ai')}</div>
              <div className="combat-turn-banner gap-3 shrink-0 mx-auto overflow-hidden" data-turn={myTurn ? 'you' : 'enemy'} style={{ width: 'min(520px, 70%)', minHeight: 44 }}>
                <span className={'shrink-0 text-[12px] font-bold uppercase tracking-[0.24em] ' + (myTurn ? '' : 'animate-pulse')}
                  style={{ color: myTurn ? '#c6a14f' : '#b0757d', fontFamily: 'var(--rvn-font-display)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                  {myTurn ? t('battle.layout.yourTurn') : t('battle.layout.enemyTurn')}
                </span>
                <span className="text-[11px] truncate min-w-0" style={{ color: 'var(--text-muted)' }}>{lastMsg}</span>
              </div>
              <div className="shrink-0">{renderUnitsRow('you', 'units-you')}</div>
            </div>
          </div>

          {/* Tavo avataras – apatinis dešinys kampas, rankos zonos aukštyje, su apsaugotu plotu (ranka centre siauresnė) */}
          <div className="absolute z-[9] flex items-center gap-2" style={{ right: 12, bottom: 10 }}>
            {renderEmoteBubble?.('you')}
            {hpBar('you', s.compact ? 0.86 : 0.96)}
          </div>
          {/* Rankos zonos riba (subtili) – vizualiai atskiria padarus nuo rankos */}
          <div aria-hidden className="absolute left-6 right-6 pointer-events-none" style={{ bottom: s.handZoneH, height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,180,41,0.18), transparent)' }} />
        </section>

        {/* ── DEŠINĖ: priešo kaladės · ėjimo valdymas · tavo kaladės ── */}
        <aside className="flex flex-col gap-2 min-h-0 overflow-hidden items-stretch">
          <RailBox style={railPanel} className="px-1 py-2 flex flex-col items-center gap-1 shrink-0">
            {railTitle(t('battle.opponentFallback'))}
            <div className="flex justify-center gap-1.5 w-full">
              {renderPile(t('battle.game.deck'), game.ai.deck.length, { pileKey: 'deck-ai', back: 'plain', w: s.pileW })}
              {renderPile('Kapinynas', game.ai.discard.length, { faceUp: true, cards: game.ai.discard, pileKey: 'discard-ai', w: s.pileW })}
              {renderPile(t('battle.game.zmk'), game.ai.zmk.length, { back: 'zmk', w: s.pileW })}
            </div>
          </RailBox>
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3">
            <div className="relative flex items-center justify-center" style={{ width: s.endTurn, height: s.endTurn }}>
              <TurnRing deadline={turnDeadline} size={s.endTurn} />
              {renderEndTurn()}
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl px-3 py-2" style={railPanel}>
              {goldBar('you')}
              {renderDiscardGold()}
            </div>
          </div>
          <RailBox style={railPanel} className="px-1 py-2 flex flex-col items-center gap-1 shrink-0">
            {railTitle(t('battle.player'))}
            <div className="flex justify-center gap-1.5 w-full">
              {renderPile(t('battle.game.deck'), game.you.deck.length, { tut: 'deck', pileKey: 'deck-you', back: 'plain', w: s.pileW })}
              {renderPile('Kapinynas', game.you.discard.length, { tut: 'discard', faceUp: true, cards: game.you.discard, pileKey: 'discard-you', w: s.pileW })}
              {renderPile(t('battle.game.zmk'), game.you.zmk.length, { tut: 'zmk', back: 'zmk', w: s.pileW })}
            </div>
          </RailBox>
        </aside>

        {/* ── EMOTE ratas ── */}
        {emoteOpen && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setEmoteOpen(false)} />
            <div className="absolute z-50" style={{ left: s.railL + 24, top: 24, width: 150, height: 150 }}>
              {EMOTES.map((e, i) => {
                const ang = (-90 + i * (360 / EMOTES.length)) * Math.PI / 180
                const x = 75 + Math.cos(ang) * 58 - 22, y = 75 + Math.sin(ang) * 58 - 22
                return (
                  <button key={i} onClick={() => { onEmote?.(e); setEmoteOpen(false) }}
                    className="combat-emote-slot absolute w-11 h-11 flex items-center justify-center text-xl transition-transform hover:scale-125 active:scale-95"
                    style={{ left: x, top: y, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}>{e}</button>
                )
              })}
            </div>
          </>
        )}

        {/* ── RANKA: apatinė centro zona (rezervuotas aukštis); išskleista – auga aukštyn virš lentos ── */}
        <div className="absolute z-30 flex items-end justify-center pointer-events-none"
          style={{ left: s.railL + pad * 2 + 8, right: s.railR + pad * 2 + (s.compact ? 128 : 150), bottom: pad, height: handExpanded ? Math.round(s.handWBig * 4 / 3) + 64 : s.handZoneH }}>
          {/* Išskleidimo valdiklis – kairėje nuo vėduoklės (pakelta korta jo neuždengia); pats jokios kortos nesužaidžia */}
          <button onClick={onToggleHand} className="rvn-desk-hand-toggle pointer-events-auto absolute" style={{ left: 0, bottom: 10, zIndex: 95 }}
            data-active={handExpanded ? 'true' : undefined} data-discard={discardMode ? 'true' : undefined}>
            {discardMode ? t('battle.game.discardPick', { n: handCount }) : handExpanded ? t('battle.game.handCollapse', { n: handCount }) : t('battle.game.handExpand', { n: handCount })}
          </button>
          <div className="pointer-events-auto h-full flex items-end justify-center" style={{ width: `calc(100% - ${s.compact ? 150 : 190}px)`, marginLeft: s.compact ? 150 : 190 }}>{renderHand()}</div>
        </div>
      </div>
    </div>
  )
}
