'use client'

// ════════════════════════════════════════════════════════════════════════════
// Poligono kova — TutorialGame su `sandbox` hook'ais + „dievo režimo" pultas.
//
// Kaladė/ranka/auksas perrašomi per sandbox.applySetup; manekenai statomi per
// TŲ PAČIŲ variklio funkcijų kelią, kurį naudoja kampanijos bangos
// (spawnExternalUnit per api.mutate) — todėl elgesys identiškas tikrai kovai.
// Jokio atlygio: deckId = DEMO_DECK_ID, taigi rewards/quests praleidžiami.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
import { HubStyles } from '@/components/digital/ui/HubKit'
import { I18nBoot } from '@/lib/i18n/react'
import { forceBattleEnd, spawnExternalUnit, endTurn, beginTurn, type Side } from '@/lib/tutorial/engine'
import { DEMO_DECK_ID, type TutorialGameApi, type SandboxHooks } from '@/components/tutorial/TutorialGame'
import type { CampaignEngineEvent } from '@/lib/campaign/battleBridge'
import {
  applySandboxSetup, freshPgCard, makeDummyCard, sliceCards, PG_INFINITE_HP,
  type PgCard, type PgConfig,
} from '@/lib/playground/deck'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

const INF_GOLD = 9900

type DummyEntry = {
  key: string
  side: Side
  cardId: string
  name: string
  atk: number | null
  hp: number | null
  immortal: boolean
  respawn: boolean
}

const dummyKey = (side: Side, name: string) => `${side}|${name}`

export function PlaygroundBattle({ cards, cfg, onExit, onRestart }: {
  cards: PgCard[]
  cfg: PgConfig
  onExit: () => void
  onRestart: () => void
}) {
  const apiRef = useRef<TutorialGameApi | null>(null)
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const ordered = useMemo(() => sliceCards(cards, cfg), [cards, cfg])

  const sandbox = useMemo<SandboxHooks>(() => ({
    applySetup: (g) => applySandboxSetup(g, ordered, cfg),
    passiveAi: cfg.passiveAi,
  }), [ordered, cfg])

  // ── Manekenų registras (raktas: pusė + kortos pavadinimas) ──
  const [dummies, setDummies] = useState<DummyEntry[]>([])
  const dummiesRef = useRef<DummyEntry[]>([])
  useEffect(() => { dummiesRef.current = dummies }, [dummies])

  const spawnEntry = useCallback((e: DummyEntry) => {
    const api = apiRef.current
    if (!api) return
    const base = e.cardId === '__dummy__'
      ? makeDummyCard(e.atk ?? 1, e.hp ?? 10, e.name)
      : byId.get(e.cardId)
    if (!base) return
    const buffs: { attack?: number; health?: number } = {}
    if (e.cardId !== '__dummy__') {
      if (e.atk != null) buffs.attack = e.atk - (base.attack ?? 0)
      if (e.hp != null) buffs.health = e.hp - (base.health ?? 0)
    }
    if (e.immortal) buffs.health = PG_INFINITE_HP - (base.health ?? 0)
    api.mutate((g) => { spawnExternalUnit(g, e.side, freshPgCard(base), { buffs, summonSick: false }) })
  }, [byId])

  /** Nemirtingi manekenai — HP atstatomas po kiekvieno įvykių paketo. */
  const healImmortals = useCallback(() => {
    const keys = new Set(dummiesRef.current.filter((d) => d.immortal).map((d) => dummyKey(d.side, d.name)))
    if (!keys.size) return
    const api = apiRef.current
    if (!api) return
    api.mutate((g) => {
      for (const s of ['you', 'ai'] as const) {
        for (const u of g[s].units) {
          if (!u) continue
          if (!keys.has(dummyKey(s, u.card.name))) continue
          u.maxHp = PG_INFINITE_HP
          u.hp = PG_INFINITE_HP
        }
      }
    })
  }, [])

  const onEvent = useCallback((e: CampaignEngineEvent) => {
    const api = apiRef.current
    if (!api) return
    if (e.t === 'turnStart' && e.side === 'player' && cfg.infiniteGold) {
      api.mutate((g) => { if (g.you.gold < INF_GOLD) g.you.gold = INF_GOLD })
    }
    if (e.t === 'unitDeath') {
      const side: Side = e.side === 'player' ? 'you' : 'ai'
      const ent = dummiesRef.current.find((d) => d.respawn && d.side === side && d.name === e.cardName)
      if (ent) setTimeout(() => spawnEntry(ent), 450)
    }
    healImmortals()
  }, [cfg.infiniteGold, healImmortals, spawnEntry])

  return (
    <div className="ravenof-body fixed inset-0 z-40 flex flex-col select-none"
      style={{ background: 'var(--ravenof-bg-base)', color: 'var(--ravenof-text-primary)' }}>
      <HubStyles />
      <I18nBoot />
      <main className="relative z-10 flex-1 min-h-0">
        <TutorialGame
          deckId={DEMO_DECK_ID}
          deckName="Poligonas"
          practice
          opponentFaction={!cfg.passiveAi && cfg.oppFactionId !== '' ? Number(cfg.oppFactionId) : null}
          opponentName={cfg.passiveAi ? 'Manekenas' : 'Poligono DI'}
          difficulty={cfg.difficulty}
          sandbox={sandbox}
          onCampaignEvent={onEvent}
          onCampaignApi={(api) => { apiRef.current = api }}
          onClose={onExit}
        />
      </main>
      <GodPanel
        cards={cards}
        dummies={dummies}
        onAddDummy={(e) => { setDummies((ds) => [...ds.filter((d) => dummyKey(d.side, d.name) !== dummyKey(e.side, e.name)), e]); spawnEntry(e) }}
        onDropDummy={(key) => setDummies((ds) => ds.filter((d) => dummyKey(d.side, d.name) !== key))}
        onGold={(n) => apiRef.current?.mutate((g) => { g.you.gold += n })}
        onToHand={(c) => apiRef.current?.mutate((g) => { if (g.you.hand.length < 10) g.you.hand.push(freshPgCard(c)) })}
        onHp={(mine, hp) => apiRef.current?.mutate((g) => { const p = mine ? g.you : g.ai; p.hp = Math.max(1, Math.min(p.maxHp, hp)) })}
        onSkipTurn={() => apiRef.current?.mutate((g) => { endTurn(g); if (!g.winner) beginTurn(g) })}
        onForceEnd={(win) => apiRef.current?.mutate((g) => forceBattleEnd(g, win ? 'you' : 'ai'))}
        onRestart={onRestart}
        onExit={onExit}
      />
    </div>
  )
}

// ── „Dievo režimo" pultas ────────────────────────────────────────────────────

const pin: React.CSSProperties = { background: '#0d0a14', border: '1px solid rgba(240,180,41,0.35)', color: '#f3ead3' }
const fld: React.CSSProperties = { background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(240,180,41,0.25)', color: '#f3ead3', borderRadius: 6, padding: '3px 6px', fontSize: 11, width: '100%' }
const btn: React.CSSProperties = { background: 'rgba(240,180,41,0.16)', border: '1px solid rgba(240,180,41,0.4)', color: '#f0b429', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700 }

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid rgba(240,180,41,0.15)', paddingTop: 8, marginTop: 8 }}>
      <p style={{ fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8b8296', marginBottom: 5 }}>{title}</p>
      {children}
    </div>
  )
}

function GodPanel({ cards, dummies, onAddDummy, onDropDummy, onGold, onToHand, onHp, onSkipTurn, onForceEnd, onRestart, onExit }: {
  cards: PgCard[]
  dummies: DummyEntry[]
  onAddDummy: (e: DummyEntry) => void
  onDropDummy: (key: string) => void
  onGold: (n: number) => void
  onToHand: (c: PgCard) => void
  onHp: (mine: boolean, hp: number) => void
  onSkipTurn: () => void
  onForceEnd: (win: boolean) => void
  onRestart: () => void
  onExit: () => void
}) {
  const [open, setOpen] = useState(true)
  const [dSide, setDSide] = useState<Side>('ai')
  const [dCard, setDCard] = useState('__dummy__')
  const [dAtk, setDAtk] = useState(0)
  const [dHp, setDHp] = useState(10)
  const [dImmortal, setDImmortal] = useState(false)
  const [dRespawn, setDRespawn] = useState(false)
  const [handQ, setHandQ] = useState('')
  const [myHp, setMyHp] = useState(40)
  const [oppHp, setOppHp] = useState(40)
  const [seq, setSeq] = useState(1)

  const handHits = useMemo(() => {
    const q = handQ.trim().toLowerCase()
    if (!q) return []
    return cards.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8)
  }, [cards, handQ])

  const addDummy = () => {
    const base = dCard === '__dummy__' ? null : cards.find((c) => c.id === dCard)
    const name = base ? base.name : `Manekenas ${seq}`
    if (!base) setSeq((n) => n + 1)
    onAddDummy({
      key: `${Date.now()}`, side: dSide, cardId: dCard, name,
      atk: base ? (dAtk > 0 ? dAtk : null) : dAtk,
      hp: base ? (dHp > 0 ? dHp : null) : dHp,
      immortal: dImmortal, respawn: dRespawn,
    })
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    !open ? (
      <button onClick={() => setOpen(true)} title="Poligono pultas"
        style={{ ...pin, position: 'fixed', right: 10, top: 10, zIndex: 400, borderRadius: 10, padding: '6px 10px', fontSize: 14 }}>🧪</button>
    ) : (
      <div style={{ ...pin, position: 'fixed', right: 10, top: 10, zIndex: 400, width: 268, maxHeight: '92vh', overflowY: 'auto', borderRadius: 12, padding: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f0b429' }}>🧪 Poligonas</span>
          <button onClick={() => setOpen(false)} style={{ ...btn, padding: '2px 7px' }}>—</button>
        </div>

        <Row title="Auksas">
          <div className="flex gap-1.5">
            <button style={btn} onClick={() => onGold(1000)}>+1000</button>
            <button style={btn} onClick={() => onGold(9900)}>+9900</button>
          </div>
        </Row>

        <Row title="Kortą į ranką">
          <input style={fld} placeholder="pavadinimas…" value={handQ} onChange={(e) => setHandQ(e.target.value)} />
          {handHits.map((c) => (
            <button key={c.id} onClick={() => { onToHand(c); setHandQ('') }}
              style={{ ...btn, display: 'block', width: '100%', textAlign: 'left', marginTop: 4, background: 'rgba(255,255,255,0.05)', color: '#f3ead3', fontWeight: 400 }}>
              {c.name} <span style={{ color: '#f0b429' }}>{c.gold}</span>
            </button>
          ))}
        </Row>

        <Row title="Manekenas / padaras į lentą">
          <div className="flex gap-1.5 mb-1.5">
            <button style={{ ...btn, flex: 1, opacity: dSide === 'ai' ? 1 : 0.5 }} onClick={() => setDSide('ai')}>Priešo</button>
            <button style={{ ...btn, flex: 1, opacity: dSide === 'you' ? 1 : 0.5 }} onClick={() => setDSide('you')}>Mano</button>
          </div>
          <select style={fld} value={dCard} onChange={(e) => setDCard(e.target.value)}>
            <option value="__dummy__">Manekenas (sintetinis)</option>
            {cards.filter((c) => c.type === 'unit' || c.type === 'champion').slice(0, 400).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex gap-1.5 mt-1.5">
            <label style={{ flex: 1, fontSize: 10, color: '#8b8296' }}>ATK
              <input type="number" style={fld} value={dAtk} onChange={(e) => setDAtk(Number(e.target.value) || 0)} />
            </label>
            <label style={{ flex: 1, fontSize: 10, color: '#8b8296' }}>HP
              <input type="number" style={fld} value={dHp} onChange={(e) => setDHp(Number(e.target.value) || 0)} />
            </label>
          </div>
          <label className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: 11 }}>
            <input type="checkbox" checked={dImmortal} onChange={(e) => setDImmortal(e.target.checked)} /> ∞ HP (nemirtingas)
          </label>
          <label className="flex items-center gap-1.5" style={{ fontSize: 11 }}>
            <input type="checkbox" checked={dRespawn} onChange={(e) => setDRespawn(e.target.checked)} /> atgimsta po mirties
          </label>
          <button style={{ ...btn, width: '100%', marginTop: 6 }} onClick={addDummy}>▣ Statyti</button>
          {dummies.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {dummies.map((d) => (
                <div key={dummyKey(d.side, d.name)} className="flex items-center gap-1" style={{ fontSize: 10, color: '#c9c0d6', padding: '2px 0' }}>
                  <span style={{ color: d.side === 'ai' ? '#ef4444' : '#6ee7a8' }}>{d.side === 'ai' ? '▼' : '▲'}</span>
                  <span className="flex-1 truncate">{d.name}</span>
                  {d.immortal && <span title="∞ HP">∞</span>}
                  {d.respawn && <span title="atgimsta">↻</span>}
                  <button onClick={() => onDropDummy(dummyKey(d.side, d.name))} style={{ color: '#ef4444' }} title="Nebeprižiūrėti">✕</button>
                </div>
              ))}
            </div>
          )}
        </Row>

        <Row title="HP">
          <div className="flex gap-1.5 items-end">
            <label style={{ flex: 1, fontSize: 10, color: '#8b8296' }}>Mano
              <input type="number" style={fld} value={myHp} onChange={(e) => setMyHp(Number(e.target.value) || 0)} />
            </label>
            <button style={btn} onClick={() => onHp(true, myHp)}>OK</button>
          </div>
          <div className="flex gap-1.5 items-end mt-1.5">
            <label style={{ flex: 1, fontSize: 10, color: '#8b8296' }}>Priešo
              <input type="number" style={fld} value={oppHp} onChange={(e) => setOppHp(Number(e.target.value) || 0)} />
            </label>
            <button style={btn} onClick={() => onHp(false, oppHp)}>OK</button>
          </div>
        </Row>

        <Row title="Ėjimas">
          <div className="flex gap-1.5">
            <button style={{ ...btn, flex: 1 }} onClick={onSkipTurn}>⏭ Praleisti</button>
            <button style={btn} onClick={() => onForceEnd(true)} title="Priverstinė pergalė">🏆</button>
            <button style={btn} onClick={() => onForceEnd(false)} title="Priverstinis pralaimėjimas">💀</button>
          </div>
        </Row>

        <Row title="Sesija">
          <div className="flex gap-1.5">
            <button style={{ ...btn, flex: 1 }} onClick={onRestart}>↻ Iš naujo</button>
            <button style={{ ...btn, flex: 1 }} onClick={onExit}>⚙ Nustatymai</button>
          </div>
        </Row>
      </div>
    ), document.body)
}
