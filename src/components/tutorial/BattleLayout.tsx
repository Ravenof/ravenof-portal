'use client'
// ── Ravenof horizontal (landscape) combat layout ──
// F1 skeleton: gridas (kairė rail · lenta · dešinė pile'ai) + placeholder'iai naujom funkcijom
// (emote ratas, preview panelė, laikmačio žiedas). VISI render helper'iai lieka TutorialGame'e ir
// perduodami čia render-funkcijomis, kad state nereiktų kilnoti. Engine/state/FX nekeičiami.
import React from 'react'
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
  // placeholder callback'ai (pilnas turinys – vėlesnės fazės):
  onEmote?: () => void
}

// Kompaktiškas šoninis blokas su antrašte
function RailCard({ style, children, className }: { style: React.CSSProperties; children: React.ReactNode; className?: string }) {
  return <div className={'rounded-xl ' + (className ?? '')} style={style}>{children}</div>
}

export default function BattleLayout(props: BattleLayoutProps) {
  const {
    game, myTurn, lastMsg, railPanel,
    hpBar, goldBar, renderPile, renderUnitsRow, renderArtifactRow, renderReactionRow,
    dFieldRow, renderOppHand, renderHand, renderLog, renderEndTurn, renderDiscardGold, onEmote,
  } = props

  return (
    <div className="flex-1 min-h-0 w-full" style={{ maxWidth: 1600, margin: '0 auto' }}>
      <div
        style={{
          display: 'grid', height: '100%',
          gridTemplateColumns: 'clamp(150px,16vw,232px) minmax(0,1fr) clamp(120px,13vw,166px)',
          gridTemplateRows: 'minmax(0,1fr)',
          gap: 'clamp(4px,0.8vw,10px)', padding: 'clamp(4px,1vw,10px)',
        }}>

        {/* ── KAIRĖ: ikonų rail + preview panelė + mūšio žurnalas ── */}
        <aside className="flex flex-col gap-2 min-h-0 overflow-hidden">
          {/* ikonų rail (emote – placeholder F5) */}
          <RailCard style={railPanel} className="p-1.5 flex items-center gap-1.5 shrink-0">
            <button onClick={onEmote} title="Emote (F5)"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors hover:bg-white/5"
              style={{ border: '1px solid rgba(240,180,41,0.3)' }}>😊</button>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Emote</span>
          </RailCard>
          {/* preview panelė (hoverCard – F5) */}
          <RailCard style={railPanel} className="p-2 flex-1 min-h-0 flex items-center justify-center">
            <span className="text-[9px] uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>
              Kortos peržiūra<br />· F5 ·
            </span>
          </RailCard>
          {/* mūšio žurnalas */}
          <RailCard style={railPanel} className="p-2 flex flex-col shrink-0" >
            <span className="text-[10px] uppercase tracking-widest mb-1 shrink-0" style={{ color: 'var(--gold)' }}>Mūšio žurnalas</span>
            <div className="max-h-[22vh] overflow-y-auto flex flex-col gap-0.5 pr-1">{renderLog()}</div>
          </RailCard>
        </aside>

        {/* ── CENTRAS: lenta ── */}
        <section className="min-h-0 rounded-2xl relative overflow-hidden">
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 55% at 50% 50%, rgba(240,180,41,0.05), rgba(0,0,0,0.35) 100%)', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.75)', borderRadius: 16, border: '1px solid rgba(240,180,41,0.12)', pointerEvents: 'none' }} />
          {/* lauko korta – kairysis lentos kraštas (vertikalus slotas) */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 z-[8]">{dFieldRow()}</div>

          <div className="relative h-full flex flex-col justify-center" style={{ display: 'grid', gridTemplateRows: 'auto auto auto auto auto auto auto', gap: 'clamp(2px,0.5vh,6px)', alignContent: 'center', padding: '6px clamp(8px,3vw,40px)' }}>
            {/* AI: avataras + mana + priešo ranka */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {renderOppHand()}
              {hpBar('ai')}
              {goldBar('ai')}
            </div>
            {/* AI artefaktai/reakcijos */}
            <div className="flex items-center justify-center gap-2">{renderArtifactRow('ai')}{renderReactionRow('ai')}</div>
            {/* AI padarai */}
            {renderUnitsRow('ai', 'units-ai')}
            {/* TAVO ĖJIMAS divideris */}
            <div className="flex items-center justify-center gap-2 py-0.5" style={{ borderTop: '1px solid rgba(240,180,41,0.12)', borderBottom: '1px solid rgba(240,180,41,0.12)' }}>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: myTurn ? 'var(--gold)' : '#a78bfa', fontFamily: 'var(--rvn-font-display)' }}>
                {myTurn ? 'Tavo ėjimas' : 'Priešo ėjimas'}
              </span>
              <span className="text-[9px] truncate max-w-[40vw]" style={{ color: 'var(--text-muted)' }}>{lastMsg}</span>
            </div>
            {/* Tavo padarai */}
            {renderUnitsRow('you', 'units-you')}
            {/* Tavo artefaktai/reakcijos */}
            <div className="flex items-center justify-center gap-2">{renderArtifactRow('you')}{renderReactionRow('you')}</div>
            {/* Tavo avataras + mana */}
            <div className="flex items-center justify-center gap-3">{hpBar('you')}{goldBar('you')}</div>
          </div>

          {/* ranka – centro apačia (overlay) */}
          <div className="absolute left-0 right-0 bottom-0 z-[10] flex items-end justify-center pointer-events-none">
            <div className="pointer-events-auto w-full">{renderHand()}</div>
          </div>
        </section>

        {/* ── DEŠINĖ: pile'ai + apvalus BAIGTI ĖJIMĄ ── */}
        <aside className="flex flex-col gap-2 min-h-0 overflow-hidden items-center justify-between">
          {/* AI pile'ai (viršus) */}
          <RailCard style={railPanel} className="px-1.5 py-2 flex justify-center gap-1 shrink-0 w-full">
            {renderPile('Kaladė', game.ai.deck.length, { pileKey: 'deck-ai', back: 'plain', w: 42 })}
            {renderPile('Kapinynas', game.ai.discard.length, { faceUp: true, cards: game.ai.discard, pileKey: 'discard-ai', w: 42 })}
            {renderPile('ŽMK', game.ai.zmk.length, { back: 'zmk', w: 42 })}
          </RailCard>
          {/* apvalus BAIGTI ĖJIMĄ + discard */}
          <div className="flex flex-col items-center gap-2">
            {renderEndTurn()}
            {renderDiscardGold()}
          </div>
          {/* Tavo pile'ai (apačia) */}
          <RailCard style={railPanel} className="px-1.5 py-2 flex justify-center gap-1 shrink-0 w-full">
            {renderPile('Kaladė', game.you.deck.length, { tut: 'deck', pileKey: 'deck-you', back: 'plain', w: 42 })}
            {renderPile('Kapinynas', game.you.discard.length, { tut: 'discard', faceUp: true, cards: game.you.discard, pileKey: 'discard-you', w: 42 })}
            {renderPile('ŽMK', game.you.zmk.length, { tut: 'zmk', back: 'zmk', w: 42 })}
          </RailCard>
        </aside>
      </div>
    </div>
  )
}
