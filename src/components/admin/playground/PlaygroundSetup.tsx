'use client'

// ── Poligono nustatymai: iš ko sudaroma kaladė + koks priešas ────────────────

import { useMemo, useState } from 'react'
import type { TutCardType, TutKeyword } from '@/lib/tutorial/engine'
import type { AiDifficulty } from '@/lib/tutorial/ai'
import { matchesFilters, sliceCards, type PgCard, type PgConfig, type PgSlice, type PgSort } from '@/lib/playground/deck'
import type { PgMeta } from '@/lib/playground/cards'

const TYPE_LABEL: Record<TutCardType, string> = {
  unit: 'Padaras', spell: 'Burtas', artifact: 'Artefaktas', reaction: 'Reakcija',
  field: 'Laukas', champion: 'Čempionas', curse: 'Prakeiksmas',
}
const KEYWORDS: TutKeyword[] = ['sprint', 'taunt', 'shield', 'stealth', 'battlecry', 'lastwish']
const KEYWORD_LABEL: Record<TutKeyword, string> = {
  sprint: 'Sprintas', taunt: 'Pasišaipymas', shield: 'Magiškasis skydas',
  stealth: 'Sėlinimas', battlecry: 'Kovos šūksnis', lastwish: 'Paskutinis noras',
}
const SLICES: { key: PgSlice; label: string; hint: string }[] = [
  { key: 'manual', label: '🎯 Rankinis', hint: 'Pasirenki kortas ir jų traukimo tvarką' },
  { key: 'faction', label: '⚔️ Frakcija iš eilės', hint: 'Visos frakcijos kortos viena po kitos' },
  { key: 'filter', label: '🔍 Filtrai', hint: 'Tipas / retumas / raktažodis / subtype / paieška' },
  { key: 'needsMapping', label: '⚠️ Be mappings', hint: 'Kortos su tekstu, bet be admin efektų mapping’ų' },
]
const SORTS: { key: PgSort; label: string }[] = [
  { key: 'costAsc', label: 'Kaina ↑' }, { key: 'costDesc', label: 'Kaina ↓' },
  { key: 'name', label: 'Pavadinimas' }, { key: 'random', label: 'Atsitiktinai' },
]

const box: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }
const inputCls = 'w-full px-2.5 py-1.5 rounded-lg text-sm outline-none'
const inputStyle: React.CSSProperties = { background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{children}</p>
}

export function PlaygroundSetup({ cards, meta, cfg, onChange, onStart }: {
  cards: PgCard[]
  meta: PgMeta
  cfg: PgConfig
  onChange: (c: PgConfig) => void
  onStart: () => void
}) {
  const [pickQuery, setPickQuery] = useState('')
  const set = <K extends keyof PgConfig>(k: K, v: PgConfig[K]) => onChange({ ...cfg, [k]: v })
  const setF = <K extends keyof PgConfig['filters']>(k: K, v: PgConfig['filters'][K]) => onChange({ ...cfg, filters: { ...cfg.filters, [k]: v } })

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const pickResults = useMemo(() => {
    const q = pickQuery.trim().toLowerCase()
    const base = cards.filter((c) => matchesFilters(c, { ...cfg.filters, query: '' }))
    const hit = q ? base.filter((c) => c.name.toLowerCase().includes(q) || (c.effectText ?? '').toLowerCase().includes(q)) : base
    return hit.slice(0, 80)
  }, [cards, cfg.filters, pickQuery])

  const deck = useMemo(() => sliceCards(cards, cfg), [cards, cfg])
  const limited = cfg.deckLimit > 0 ? deck.slice(0, cfg.deckLimit) : deck

  const addManual = (id: string) => set('manual', [...cfg.manual, id])
  const removeManual = (i: number) => set('manual', cfg.manual.filter((_, k) => k !== i))
  const moveManual = (i: number, d: -1 | 1) => {
    const next = [...cfg.manual]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    set('manual', next)
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)' }}>
      {/* ── KAIRĖ: pjūvis ── */}
      <div className="rounded-xl p-4" style={box}>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SLICES.map((s) => (
            <button key={s.key} onClick={() => set('slice', s.key)} title={s.hint}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: cfg.slice === s.key ? 'var(--gold)' : 'var(--bg-base)', color: cfg.slice === s.key ? '#100c06' : 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>{SLICES.find((s) => s.key === cfg.slice)?.hint}</p>

        {/* Bendri filtrai (naudojami visuose pjūviuose kaip pool'o siaurinimas) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          <div>
            <Label>Frakcija</Label>
            <select className={inputCls} style={inputStyle} value={cfg.filters.factionId}
              onChange={(e) => setF('factionId', e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">— visos —</option>
              {meta.factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Tipas</Label>
            <select className={inputCls} style={inputStyle} value={cfg.filters.type}
              onChange={(e) => setF('type', e.target.value as TutCardType | '')}>
              <option value="">— visi —</option>
              {(Object.keys(TYPE_LABEL) as TutCardType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <Label>Retumas</Label>
            <select className={inputCls} style={inputStyle} value={cfg.filters.rarity} onChange={(e) => setF('rarity', e.target.value)}>
              <option value="">— visi —</option>
              {meta.rarities.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <Label>Raktažodis</Label>
            <select className={inputCls} style={inputStyle} value={cfg.filters.keyword}
              onChange={(e) => setF('keyword', e.target.value as TutKeyword | '')}>
              <option value="">— bet koks —</option>
              {KEYWORDS.map((k) => <option key={k} value={k}>{KEYWORD_LABEL[k]}</option>)}
            </select>
          </div>
          <div>
            <Label>Subtype</Label>
            <select className={inputCls} style={inputStyle} value={cfg.filters.subtype} onChange={(e) => setF('subtype', e.target.value)}>
              <option value="">— bet koks —</option>
              {meta.subtypes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>Rikiavimas</Label>
            <select className={inputCls} style={inputStyle} value={cfg.sort} onChange={(e) => set('sort', e.target.value as PgSort)}
              disabled={cfg.slice === 'manual'}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Rankinis pasirinkimas */}
        {cfg.slice === 'manual' && (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
            <div>
              <Label>Kortų paieška ({pickResults.length})</Label>
              <input className={inputCls} style={inputStyle} placeholder="Ieškok pagal pavadinimą ar tekstą…"
                value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} />
              <div className="mt-2 overflow-y-auto rounded-lg" style={{ maxHeight: 320, border: '1px solid var(--bg-border)' }}>
                {pickResults.map((c) => (
                  <button key={c.id} onClick={() => addManual(c.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:opacity-80"
                    style={{ borderBottom: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
                    <span className="w-10 shrink-0 text-right" style={{ color: 'var(--gold)' }}>{c.gold}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.needsMapping && <span title="Be effect mappings">⚠️</span>}
                    <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>{TYPE_LABEL[c.type]}</span>
                  </button>
                ))}
                {pickResults.length === 0 && <p className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>Nieko nerasta.</p>}
              </div>
            </div>
            <div>
              <Label>Traukimo tvarka ({cfg.manual.length})</Label>
              <div className="flex gap-1.5 mb-2">
                <button onClick={() => set('manual', [])} className="px-2 py-1 rounded-lg text-[11px]" style={{ ...inputStyle, color: 'var(--text-secondary)' }}>Išvalyti</button>
                <button onClick={() => set('manual', [...cfg.manual, ...cfg.manual])} disabled={!cfg.manual.length}
                  className="px-2 py-1 rounded-lg text-[11px]" style={{ ...inputStyle, color: 'var(--text-secondary)', opacity: cfg.manual.length ? 1 : 0.4 }}>Dubliuoti ×2</button>
              </div>
              <div className="overflow-y-auto rounded-lg" style={{ maxHeight: 320, border: '1px solid var(--bg-border)' }}>
                {cfg.manual.map((id, i) => {
                  const c = byId.get(id)
                  return (
                    <div key={`${id}-${i}`} className="flex items-center gap-1.5 px-2 py-1 text-xs" style={{ borderBottom: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
                      <span className="w-5 shrink-0" style={{ color: i < cfg.handSize ? 'var(--gold)' : 'var(--text-muted)' }}>{i + 1}</span>
                      <span className="flex-1 truncate">{c?.name ?? '—'}</span>
                      <button onClick={() => moveManual(i, -1)} title="Aukštyn" style={{ color: 'var(--text-muted)' }}>↑</button>
                      <button onClick={() => moveManual(i, 1)} title="Žemyn" style={{ color: 'var(--text-muted)' }}>↓</button>
                      <button onClick={() => removeManual(i)} title="Pašalinti" style={{ color: '#ef4444' }}>✕</button>
                    </div>
                  )
                })}
                {cfg.manual.length === 0 && <p className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>Spausk kortas kairėje — jos atsiras čia ta tvarka, kuria trauksi.</p>}
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Pirmos {cfg.handSize} kortos (auksinės) = startinė ranka.</p>
            </div>
          </div>
        )}

        {cfg.slice !== 'manual' && (
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Pjūvyje: <b style={{ color: 'var(--gold)' }}>{deck.length}</b> kortų
              {cfg.deckLimit > 0 && deck.length > cfg.deckLimit && <span style={{ color: 'var(--text-muted)' }}> (imamos pirmos {cfg.deckLimit})</span>}
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {cfg.slice === 'needsMapping' ? 'Rodomos tik kortos, kurioms admin’e dar nesuvesti efektų mapping’ai.' : 'Kortos traukiamos būtent šia tvarka.'}
            </p>
          </div>
        )}
      </div>

      {/* ── DEŠINĖ: kova ── */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl p-4" style={box}>
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Kova</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Kaladės riba</Label>
              <input type="number" min={0} max={200} className={inputCls} style={inputStyle} value={cfg.deckLimit}
                onChange={(e) => set('deckLimit', Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div>
              <Label>Startinė ranka</Label>
              <input type="number" min={0} max={10} className={inputCls} style={inputStyle} value={cfg.handSize}
                onChange={(e) => set('handSize', Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
            </div>
            <div>
              <Label>Kopijų ×N</Label>
              <input type="number" min={1} max={10} className={inputCls} style={inputStyle} value={cfg.copies}
                disabled={cfg.slice === 'manual'}
                onChange={(e) => set('copies', Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
            </div>
            <div>
              <Label>Startinis auksas</Label>
              <input type="number" min={0} max={9999} step={100} className={inputCls} style={inputStyle} value={cfg.startGold}
                onChange={(e) => set('startGold', Math.max(0, Number(e.target.value) || 0))} />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={cfg.infiniteGold} onChange={(e) => set('infiniteGold', e.target.checked)} />
            Begalinis auksas (kiekvieną ėjimą prikraunama iki 9900)
          </label>
        </div>

        <div className="rounded-xl p-4" style={box}>
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Priešas</p>
          <div className="flex gap-1.5 mb-3">
            <button onClick={() => set('passiveAi', true)} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: cfg.passiveAi ? 'var(--gold)' : 'var(--bg-base)', color: cfg.passiveAi ? '#100c06' : 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>😴 Pasyvus</button>
            <button onClick={() => set('passiveAi', false)} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: !cfg.passiveAi ? 'var(--gold)' : 'var(--bg-base)', color: !cfg.passiveAi ? '#100c06' : 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>🤖 DI</button>
          </div>
          {cfg.passiveAi
            ? <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Priešas tik baigia ėjimą — testuoji ramiai, be netikėtumų.</p>
            : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Sudėtingumas</Label>
                  <select className={inputCls} style={inputStyle} value={cfg.difficulty} onChange={(e) => set('difficulty', e.target.value as AiDifficulty)}>
                    <option value="easy">Lengvas</option><option value="normal">Vidutinis</option><option value="hard">Sunkus</option>
                  </select>
                </div>
                <div>
                  <Label>Priešo frakcija</Label>
                  <select className={inputCls} style={inputStyle} value={cfg.oppFactionId}
                    onChange={(e) => set('oppFactionId', e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">— atsitiktinė demo —</option>
                    {meta.factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
            )}
        </div>

        <div className="rounded-xl p-4" style={box}>
          <Label>Kaladė ({limited.length} kortų)</Label>
          <div className="overflow-y-auto rounded-lg mt-1" style={{ maxHeight: 180, border: '1px solid var(--bg-border)' }}>
            {limited.slice(0, 60).map((c, i) => (
              <div key={`${c.id}-${i}`} className="flex items-center gap-2 px-2 py-1 text-[11px]" style={{ borderBottom: '1px solid var(--bg-border)', color: i < cfg.handSize ? 'var(--gold)' : 'var(--text-secondary)' }}>
                <span className="w-5 shrink-0">{i + 1}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{c.gold}</span>
              </div>
            ))}
            {limited.length === 0 && <p className="p-3 text-xs" style={{ color: 'var(--text-muted)' }}>Kaladė tuščia — pasirink kortas.</p>}
          </div>
          <button onClick={onStart} disabled={limited.length === 0}
            className="w-full mt-3 px-4 py-2.5 rounded-lg text-sm font-bold"
            style={{ background: limited.length ? 'var(--gold)' : 'var(--bg-base)', color: limited.length ? '#100c06' : 'var(--text-muted)', border: '1px solid var(--bg-border)', cursor: limited.length ? 'pointer' : 'not-allowed' }}>
            ▶ Pradėti poligoną
          </button>
        </div>
      </div>
    </div>
  )
}
