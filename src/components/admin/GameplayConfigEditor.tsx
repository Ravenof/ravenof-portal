'use client'

// ── GameplayConfigEditor — kortos virtualaus žaidimo efektų mapping'as ───────
// Dropdown'ais sudaromi EffectMapping'ai + field pasyvai + raw JSON režimas.
// Rezultatas serializuojamas į hidden input name="gameplay" (saveCard parsina).

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { SummonBurst } from '@/components/tutorial/SummonBurst'
import { createClient } from '@/lib/supabase/client'
import { VoiceLinesUpload } from './VoiceLinesUpload'
import {
  TARGET_TYPES, EFFECT_TYPES, TRIGGER_TYPES, PROJECTILE_TYPES,
  METRIC_SOURCES, COMPARE_OPS, TARGET_SELECTS, SPELL_TYPES, ATTACK_RESTRICTIONS,
  type GameplayConfig, type EffectMapping, type MetricSource, type CompareOp, type TargetSelect, type SpellType, type AttackRestriction,
  SUMMON_EFFECTS, type SummonEffectType,
} from '@/lib/game/types'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.4rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.75rem',
  background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em',
}

const SOUND_OPTIONS = ['', 'attack', 'spellCast', 'impact', 'draw', 'curse', 'field', 'heal', 'freeze', 'death', 'summon', 'zmkFlip', 'championSkill']

const EMPTY_MAPPING: EffectMapping = { trigger: 'onPlay', effect: 'damage', target: 'enemyUnit', value: 1, requiresSelection: true }

export function GameplayConfigEditor({ initial, isField, isChampion = false, cardNames = [], hasEffectText, cardId = null, cardNumber = '' }: {
  initial: unknown
  cardId?: string | null
  cardNumber?: string
  isField: boolean
  isChampion?: boolean
  cardNames?: string[]
  hasEffectText: boolean
}) {
  const initialCfg = useMemo<GameplayConfig>(() => {
    if (initial && typeof initial === 'object') return initial as GameplayConfig
    return {}
  }, [initial])

  const [cfg, setCfg] = useState<GameplayConfig>(initialCfg)
  const [fxPreview, setFxPreview] = useState<{ type: SummonEffectType; x: number; y: number; key: number } | null>(null)
  const [rawMode, setRawMode] = useState(false)
  const [rawText, setRawText] = useState('')
  const [rawError, setRawError] = useState<string | null>(null)

  const [activeSkill, setActiveSkill] = useState(0)
  const [factions, setFactions] = useState<{ id: number; name: string }[]>([])
  useEffect(() => {
    const supabase = createClient()
    supabase.from('factions').select('id, name').order('sort_order').then(({ data }) => {
      setFactions(((data as { id: number; name: string }[]) ?? []))
    })
  }, [])
  const update = (next: GameplayConfig) => setCfg(next)

  const champSkills = cfg.championSkillConfig?.skills ?? []
  const mappings = isChampion ? (champSkills[activeSkill]?.mappings ?? []) : (cfg.effectMappings ?? [])
  const needsMapping = !isChampion && mappings.length === 0 && hasEffectText

  const writeMappings = (arr: EffectMapping[]) => {
    if (isChampion) {
      const skills = [0, 1, 2].map((idx) => ({
        name: champSkills[idx]?.name ?? '',
        mappings: idx === activeSkill ? arr : (champSkills[idx]?.mappings ?? []),
      }))
      update({ ...cfg, championSkillConfig: { skills } })
    } else {
      update({ ...cfg, effectMappings: arr })
    }
  }
  const setSkillName = (idx: number, name: string) => {
    const skills = [0, 1, 2].map((j) => ({
      name: j === idx ? name : (champSkills[j]?.name ?? ''),
      mappings: champSkills[j]?.mappings ?? [],
    }))
    update({ ...cfg, championSkillConfig: { skills } })
  }
  const setMapping = (i: number, m: Partial<EffectMapping>) => {
    const arr = [...mappings]
    arr[i] = { ...arr[i], ...m }
    writeMappings(arr)
  }

  const serialized = useMemo(() => {
    const out: GameplayConfig = { ...cfg, needsEffectMapping: needsMapping }
    if (!out.effectMappings?.length) delete out.effectMappings
    if (isChampion && out.championSkillConfig?.skills) {
      out.championSkillConfig = { skills: out.championSkillConfig.skills.map((sk) => ({ name: sk.name, mappings: sk.mappings ?? [] })) }
    }
    return JSON.stringify(out)
  }, [cfg, needsMapping])

  const applyRaw = () => {
    try {
      const parsed = JSON.parse(rawText) as GameplayConfig
      setCfg(parsed)
      setRawError(null)
      setRawMode(false)
    } catch (e) {
      setRawError('Netinkamas JSON: ' + (e as Error).message)
    }
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
      <input type="hidden" name="gameplay" value={serialized} />

      {/* Iškvietimo balsai — keli garso failai, summon metu grojamas atsitiktinis */}
      <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
        <VoiceLinesUpload
          value={cfg.voiceLines ?? []}
          cardId={cardId}
          cardNumber={cardNumber}
          onChange={(urls) => update({ ...cfg, voiceLines: urls.length ? urls : undefined })}
        />
      </div>

      {/* Pilno lauko summon efektas */}
      <div>
        <label style={labelStyle}>Iškvietimo efektas (pilnas laukas, iki 5 s)</label>
        <div className="flex gap-2">
          <select
            value={cfg.summonEffect ?? ''}
            onChange={(e) => update({ ...cfg, summonEffect: (e.target.value || undefined) as SummonEffectType | undefined })}
            style={{ ...inputStyle, flex: 1 }}
          >
            <option value="">(nėra)</option>
            {SUMMON_EFFECTS.map((fx) => <option key={fx.value} value={fx.value}>{fx.icon} {fx.label}</option>)}
          </select>
          <button
            type="button"
            disabled={!cfg.summonEffect}
            onClick={() => { if (cfg.summonEffect) setFxPreview({ type: cfg.summonEffect, x: window.innerWidth / 2, y: window.innerHeight / 2, key: Date.now() }) }}
            className="px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--gold)', color: '#0a0a0f', cursor: cfg.summonEffect ? 'pointer' : 'not-allowed' }}
          >▶ Peržiūra</button>
        </div>
      </div>

      {fxPreview && typeof document !== 'undefined' && createPortal(
        <>
          <div onClick={() => setFxPreview(null)} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(2,1,6,0.92)', cursor: 'pointer' }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 122, width: 92, height: 128, borderRadius: 10, border: '1.5px solid rgba(240,180,41,0.7)', background: 'rgba(240,180,41,0.08)', boxShadow: '0 0 24px rgba(240,180,41,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: 0.9, pointerEvents: 'none' }}>🜏</div>
          <SummonBurst type={fxPreview.type} x={fxPreview.x} y={fxPreview.y} effectKey={fxPreview.key} onDone={() => { /* lieka kol uždaroma */ }} />
          <div style={{ position: 'fixed', bottom: 28, left: 0, right: 0, zIndex: 130, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button type="button" onClick={() => setFxPreview((p) => p ? { ...p, key: Date.now() } : p)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--gold)', color: '#0a0a0f' }}>↻ Dar kartą</button>
            <button type="button" onClick={() => setFxPreview(null)} className="px-4 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>✕ Uždaryti</button>
          </div>
        </>,
        document.body,
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p style={{ ...labelStyle, marginBottom: 0, fontSize: '0.7rem' }}>🎮 Virtualaus žaidimo efektai</p>
        <div className="flex items-center gap-2">
          {needsMapping && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.4)' }}>
              ⚠ needsEffectMapping – efektas veiks tik iš teksto parserio
            </span>
          )}
          <button type="button" onClick={() => { setRawText(JSON.stringify(cfg, null, 2)); setRawMode(!rawMode) }}
            className="text-[10px] underline" style={{ color: 'var(--text-muted)' }}>
            {rawMode ? 'Dropdown režimas' : 'JSON režimas'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="virtualEnabled" checked={cfg.virtualEnabled !== false}
          onChange={(e) => update({ ...cfg, virtualEnabled: e.target.checked })}
          className="w-4 h-4 accent-yellow-400" />
        <label htmlFor="virtualEnabled" className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Korta naudojama virtualiame žaidime
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div>
          <label style={labelStyle}>Burto tipas (ugnis/ledas/žaibas/...)</label>
          <select value={cfg.spellType ?? ''}
            onChange={(e) => update({ ...cfg, spellType: (e.target.value || undefined) as SpellType | undefined })} style={inputStyle}>
            <option value="">(nėra / nesvarbu)</option>
            {SPELL_TYPES.map((st) => <option key={st.value} value={st.value}>{st.icon} {st.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="auraEnemyDmgHeal"
          checked={cfg.passiveAura?.enemyUnitDamageHealsOwner ?? false}
          onChange={(e) => update({ ...cfg, passiveAura: { ...cfg.passiveAura, enemyUnitDamageHealsOwner: e.target.checked || undefined } })}
          className="w-4 h-4 accent-yellow-400" />
        <label htmlFor="auraEnemyDmgHeal" className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          🩸 Pasyvas: visa žala priešo padarams pridedama prie tavo HP
        </label>
      </div>

      <div className="rounded-lg p-3" style={{ background: 'rgba(120,200,120,0.06)', border: '1px solid rgba(120,200,120,0.3)' }}>
        {(() => {
          const pa = cfg.passiveAura
          const auraOn = !!pa && ((pa.auraAttack ?? 0) !== 0 || (pa.auraHealth ?? 0) !== 0 || !!pa.auraSilence || !!pa.auraCantAttack || (pa.auraKeywords?.length ?? 0) > 0 || (pa.auraCostReduction ?? 0) !== 0 || !!pa.auraImmortal)
          const setPa = (patch: Partial<NonNullable<typeof pa>>) => update({ ...cfg, passiveAura: { ...cfg.passiveAura, ...patch } })
          const toggleKw = (kw: 'taunt' | 'shield' | 'stealth' | 'sprint') => {
            const cur = pa?.auraKeywords ?? []
            const next = cur.includes(kw) ? cur.filter((k) => k !== kw) : [...cur, kw]
            setPa({ auraKeywords: next.length ? next : undefined })
          }
          return (<>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" id="auraStatsOn" checked={auraOn}
                onChange={(e) => update({ ...cfg, passiveAura: e.target.checked
                  ? { ...cfg.passiveAura, auraAttack: cfg.passiveAura?.auraAttack || 1, auraScope: cfg.passiveAura?.auraScope || 'friendly' }
                  : { ...cfg.passiveAura, auraAttack: undefined, auraHealth: undefined, auraSilence: undefined, auraCantAttack: undefined, auraKeywords: undefined, auraCostReduction: undefined, auraScope: undefined, auraSubtype: undefined, auraIncludesSelf: undefined, auraImmortal: undefined } })}
                className="w-4 h-4 accent-green-400" />
              <label htmlFor="auraStatsOn" className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                ✨ Pasyvi aura (galioja kol korta kovos lauke; dingsta kai žūsta/nutildoma)
              </label>
            </div>
            {auraOn && (<div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label style={labelStyle}>+ATK</label>
                  <input type="number" value={pa?.auraAttack ?? 0}
                    onChange={(e) => setPa({ auraAttack: Number(e.target.value) || undefined })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>+HP</label>
                  <input type="number" value={pa?.auraHealth ?? 0}
                    onChange={(e) => setPa({ auraHealth: Number(e.target.value) || undefined })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kainos −</label>
                  <input type="number" min={0} value={pa?.auraCostReduction ?? 0}
                    onChange={(e) => setPa({ auraCostReduction: Number(e.target.value) || undefined })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kam galioja</label>
                  <select value={pa?.auraScope ?? 'friendly'}
                    onChange={(e) => setPa({ auraScope: e.target.value as 'friendly' | 'enemy' | 'all' })} style={inputStyle}>
                    <option value="friendly">Savo</option>
                    <option value="enemy">Priešo</option>
                    <option value="all">Visiems</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Tik frakcija</label>
                  <select value={pa?.auraFaction ?? ''}
                    onChange={(e) => setPa({ auraFaction: e.target.value ? Number(e.target.value) : undefined })} style={inputStyle}>
                    <option value="">(bet kuri frakcija)</option>
                    {factions.map((fc) => <option key={fc.id} value={fc.id}>{fc.name}</option>)}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={!!pa?.auraIncludesSelf}
                      onChange={(e) => setPa({ auraIncludesSelf: e.target.checked || undefined })}
                      className="w-3.5 h-3.5 accent-green-400" />
                    Veikia ir pačią kortą
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={!!pa?.auraSilence}
                    onChange={(e) => setPa({ auraSilence: e.target.checked || undefined })} className="w-3.5 h-3.5 accent-green-400" />
                  🔇 Nutildo paveiktus
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={!!pa?.auraCantAttack}
                    onChange={(e) => setPa({ auraCantAttack: e.target.checked || undefined })} className="w-3.5 h-3.5 accent-green-400" />
                  🔗 Negali atakuoti
                </label>
                <span className="opacity-60">|</span>
                <span>Suteikia:</span>
                {([['taunt', '⊙ Taunt'], ['shield', '✦ Skydas'], ['stealth', '◑ Sėlinimas'], ['sprint', '▶ Sprintas']] as const).map(([kw, lbl]) => (
                  <label key={kw} className="flex items-center gap-1">
                    <input type="checkbox" checked={!!pa?.auraKeywords?.includes(kw)}
                      onChange={() => toggleKw(kw)} className="w-3.5 h-3.5 accent-green-400" />
                    {lbl}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-1 text-[11px] mt-2" style={{ color: '#fca5a5' }}
                title="Paveikti padarai nežūsta – HP nukrenta tik iki 1. Laukai Kam galioja / Veikia ir pačią kortą / Tik frakcija nustato, kam tai galioja (pvz. visiems kitiems ne sau, arba konkrečios frakcijos).">
                <input type="checkbox" checked={!!pa?.auraImmortal}
                  onChange={(e) => setPa({ auraImmortal: e.target.checked || undefined })} className="w-3.5 h-3.5 accent-red-400" />
                ♾ Kiti negali mirti (nemirtingumas – lieka 1 HP)
              </label>
            </div>)}
          </>)
        })()}
      </div>

      <div className="rounded-lg p-3" style={{ background: 'rgba(160,140,220,0.06)', border: '1px solid rgba(160,140,220,0.3)' }}>
        <p style={{ ...labelStyle, marginBottom: 6 }}>⚖ Pranašumas / nepalankumas + 🩸 burtų vampyrizmas (pasyvi aura)</p>
        {(() => {
          const pa = cfg.passiveAura
          const setPa = (patch: Partial<NonNullable<typeof pa>>) => update({ ...cfg, passiveAura: { ...cfg.passiveAura, ...patch } })
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label style={labelStyle}>Atakų ŽMK</label>
                <select value={pa?.advAttack ?? ''} onChange={(e) => setPa({ advAttack: (e.target.value || undefined) as 'advantage' | 'disadvantage' | undefined })} style={inputStyle}>
                  <option value="">(normalu)</option>
                  <option value="advantage">Pranašumas (2 traukia, geresnė)</option>
                  <option value="disadvantage">Nepalankumas (2 traukia, blogesnė)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Burtų ŽMK</label>
                <select value={pa?.advSpell ?? ''} onChange={(e) => setPa({ advSpell: (e.target.value || undefined) as 'advantage' | 'disadvantage' | undefined })} style={inputStyle}>
                  <option value="">(normalu)</option>
                  <option value="advantage">Pranašumas</option>
                  <option value="disadvantage">Nepalankumas</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Burtų ŽMK tik tipui</label>
                <select value={pa?.advSpellType ?? ''} onChange={(e) => setPa({ advSpellType: (e.target.value || undefined) as SpellType | undefined })} style={inputStyle}>
                  <option value="">(visi burtai)</option>
                  {SPELL_TYPES.map((st) => <option key={st.value} value={st.value}>{st.icon} {st.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>🩸 Burtų vampyrizmas</label>
                <select value={pa?.spellLifestealScope ?? ''} onChange={(e) => setPa({ spellLifestealScope: (e.target.value || undefined) as 'friendly' | 'enemy' | 'all' | undefined })} style={inputStyle}>
                  <option value="">(išjungta)</option>
                  <option value="friendly">Savo burtų žala → +HP savininkui</option>
                  <option value="enemy">Priešo burtų žala → +HP savininkui</option>
                  <option value="all">Bet kurio burto žala → +HP savininkui</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>🏰 Sužaistą burtą → kaladė (Alchemikų fortas)</label>
                <select value={pa?.returnCastSpellScope ?? ''} onChange={(e) => setPa({ returnCastSpellScope: (e.target.value || undefined) as 'friendly' | 'enemy' | 'all' | undefined })} style={inputStyle}>
                  <option value="">(išjungta)</option>
                  <option value="friendly">Savo burtus grąžinti į kaladę</option>
                  <option value="enemy">Priešo burtus grąžinti į jo kaladę</option>
                  <option value="all">Bet kurį burtą grąžinti</option>
                </select>
              </div>
            </div>
          )
        })()}
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>„Kam galioja" (Savo/Priešo/Visiems) imama iš aukščiau esančios auros nustatymo (auraScope).</p>
      </div>

      <div className="rounded-lg p-3" style={{ background: 'rgba(90,160,220,0.06)', border: '1px solid rgba(90,160,220,0.3)' }}>
        <p style={{ ...labelStyle, marginBottom: 6 }}>🛡 Apsauginės / burtų auros (pasyvi aura; „Kam galioja" = auraScope viršuje)</p>
        {(() => {
          const pa = cfg.passiveAura
          const setPa = (patch: Partial<NonNullable<typeof pa>>) => update({ ...cfg, passiveAura: { ...cfg.passiveAura, ...patch } })
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label style={labelStyle}>Žala −% (0–90)</label>
                <input type="number" min={0} max={90} value={pa?.auraDamageReductionPct ?? 0}
                  onChange={(e) => setPa({ auraDamageReductionPct: Math.min(90, Math.max(0, Number(e.target.value))) || undefined })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Burtų žala +X</label>
                <input type="number" min={0} value={pa?.auraSpellDamage ?? 0}
                  onChange={(e) => setPa({ auraSpellDamage: Number(e.target.value) || undefined })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Burtų žala +X tik tipui</label>
                <select value={pa?.auraSpellType ?? ''} onChange={(e) => setPa({ auraSpellType: (e.target.value || undefined) as SpellType | undefined })} style={inputStyle}>
                  <option value="">(visi burtai)</option>
                  {SPELL_TYPES.map((st) => <option key={st.value} value={st.value}>{st.icon} {st.label}</option>)}
                </select>
              </div>
            </div>
          )
        })()}
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Žala −% ir „Negali žūti" veikia auraScope nurodytus padarus (potipio filtras taikomas). Burtų žala +X – tos pusės (auraScope) burtams.</p>
      </div>

      <div>
        <label style={labelStyle}>⚔ Atakos taikinio apribojimas (šis padaras gali pulti tik…)</label>
        <select value={cfg.attackRestriction ?? ''}
          onChange={(e) => update({ ...cfg, attackRestriction: (e.target.value || undefined) as AttackRestriction | undefined })} style={inputStyle}>
          <option value="">(be apribojimo – bet ką)</option>
          {ATTACK_RESTRICTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div>
        <p style={{ ...labelStyle, marginBottom: 4 }}>Padaro raktažodžiai (statiniai)</p>
        <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          {([['sprint', '▶ Sprintas'], ['taunt', '⊙ Pasišaipymas'], ['shield', '✦★ Magiškasis skydas'], ['stealth', '◑ Sėlinimas']] as const).map(([kw, lbl]) => {
            const cur = cfg.keywords ?? []
            const on = cur.includes(kw)
            return (
              <label key={kw} className="flex items-center gap-1">
                <input type="checkbox" checked={on} className="w-3.5 h-3.5 accent-yellow-400"
                  onChange={(e) => update({ ...cfg, keywords: e.target.checked ? [...cur, kw] : cur.filter((x) => x !== kw) })} />
                {lbl}
              </label>
            )
          })}
        </div>
      </div>

      {rawMode ? (
        <div className="space-y-2">
          <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={12}
            spellCheck={false} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.7rem' }} />
          {rawError && <p className="text-[11px]" style={{ color: '#ef4444' }}>{rawError}</p>}
          <button type="button" onClick={applyRaw} className="px-3 py-1 rounded text-[11px] font-semibold"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>Pritaikyti JSON</button>
        </div>
      ) : (
        <>
          {isChampion && (
            <div className="rounded-lg p-2" style={{ background: 'rgba(240,180,41,0.06)', border: '1px solid rgba(240,180,41,0.3)' }}>
              <p style={{ ...labelStyle, marginBottom: 6 }}>⚜ Čempiono 3 skills (atrakinami pagal fazę)</p>
              <div className="flex gap-1 mb-2">
                {[0, 1, 2].map((i) => (
                  <button type="button" key={i} onClick={() => setActiveSkill(i)}
                    className="px-2 py-1 rounded text-[11px] font-semibold"
                    style={{ background: activeSkill === i ? 'var(--gold)' : 'var(--bg-elevated)', color: activeSkill === i ? '#0a0a0f' : 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
                    Skill {i + 1} (fazė {i + 1})
                  </button>
                ))}
              </div>
              <input type="text" placeholder={`Skill ${activeSkill + 1} pavadinimas`} value={champSkills[activeSkill]?.name ?? ''}
                onChange={(e) => setSkillName(activeSkill, e.target.value)} style={inputStyle} />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Žemiau – šio skill efektai. Trigger paprastai „Čempiono gebėjimas".</p>
            </div>
          )}

          {/* Effect mappings */}
          <div className="space-y-2">
            {mappings.map((m, i) => {
              const effectDef = EFFECT_TYPES.find((e) => e.value === m.effect)
              const eff = m.effect
              const isGlobalTrigger = m.trigger.startsWith('onAny')
              const isSummon = ['summonFromHand', 'summonFromDeck', 'summonFromGraveyard', 'summonAdvanced', 'revive'].includes(eff)
              const isPlayerEff = ['discard', 'gainGold', 'loseGold', 'loseGoldNextTurn'].includes(eff)
              const isDeckEff = ['mill', 'returnGraveyardToDeck', 'peekDiscard'].includes(eff)
              const isFixedNoTarget = ['drawCards', 'triggerZmk', 'removeZmkCard', 'triggerCurse', 'selfToEnemyHand', 'selfToOwnHand', 'revealOwnDeck', 'revealEnemyDeck'].includes(eff)
              const isTargeted = !isSummon && !isPlayerEff && !isDeckEff && !isFixedNoTarget
              const showTarget = isTargeted || isPlayerEff || isDeckEff
              const playerOnly = ['self', 'ownPlayer', 'enemyPlayer', 'anyPlayer']
              const targetOpts = isTargeted ? TARGET_TYPES : TARGET_TYPES.filter((t) => playerOnly.includes(t.value))
              const isSinglePick = ['enemyUnit', 'ownUnit', 'anyUnit', 'enemyChampion', 'ownChampion', 'anyChampion', 'enemyArtifact', 'ownArtifact', 'anyArtifact'].includes(m.target)
              const valueLabel = ({ damage: 'Žala', heal: 'Gydymas', buffAttack: '+ATK', buffHealth: '+HP', debuffAttack: '−ATK', debuffHealth: '−HP', drawCards: 'Kiek kortų', gainGold: 'Auksas +', loseGold: 'Auksas −', loseGoldNextTurn: 'Auksas − (kitą ėjimą)', mill: 'Kiek kortų', discard: 'Kiek kortų' } as Record<string, string>)[eff] ?? 'Reikšmė'
              // dabartinė parinkimo reikšmė vienam dropdownui
              const pickMode = m.requiresSelection ? 'player' : m.allowRandomTarget ? 'random' : (m.targetSelect ?? 'auto')
              const setPickMode = (v: string) => {
                if (v === 'player') setMapping(i, { requiresSelection: true, allowRandomTarget: undefined, targetSelect: undefined })
                else if (v === 'random') setMapping(i, { requiresSelection: false, allowRandomTarget: true, targetSelect: undefined })
                else if (v === 'auto') setMapping(i, { requiresSelection: false, allowRandomTarget: undefined, targetSelect: undefined })
                else setMapping(i, { requiresSelection: false, allowRandomTarget: undefined, targetSelect: v as TargetSelect })
              }
              return (
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-lg"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
                  <div>
                    <label style={labelStyle}>Trigger</label>
                    <select value={m.trigger} onChange={(e) => setMapping(i, { trigger: e.target.value as EffectMapping['trigger'] })} style={inputStyle}>
                      {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {isGlobalTrigger && (
                    <div className="col-span-2 md:col-span-4 grid grid-cols-2 gap-2 p-2 rounded"
                      style={{ background: 'rgba(120,160,255,0.06)', border: '1px solid rgba(120,160,255,0.3)' }}>
                      <div className="col-span-2">
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          🌐 Globalus „šakos" trigger – efektas suveikia KAS KARTĄ kai įvyksta pasirinktas įvykis (ne tik šiai kortai), per savo IR priešo ėjimą. Filtruok žemiau: kieno įvykis + (jei nori) sąlyga. Schema: sąlyga {'>'} kas triggers {'>'} efektas.
                        </p>
                      </div>
                      <div>
                        <label style={labelStyle}>Kieno įvykis</label>
                        <select value={m.triggerSide ?? 'any'} onChange={(e) => setMapping(i, { triggerSide: e.target.value as 'own' | 'enemy' | 'any' })} style={inputStyle}>
                          <option value="any">Bet kurio (savo ir priešo)</option>
                          <option value="own">Tik savo</option>
                          <option value="enemy">Tik priešo</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Tik frakcija</label>
                        <select value={m.triggerFaction ?? ''} onChange={(e) => setMapping(i, { triggerFaction: e.target.value ? Number(e.target.value) : undefined })} style={inputStyle}>
                          <option value="">(bet kuri frakcija)</option>
                          {factions.map((fc) => <option key={fc.id} value={fc.id}>{fc.name}</option>)}
                        </select>
                      </div>
                      {m.trigger === 'onAnyCast' && (
                        <div>
                          <label style={labelStyle}>Tik burto tipas</label>
                          <select value={m.triggerSpellType ?? ''} onChange={(e) => setMapping(i, { triggerSpellType: (e.target.value || undefined) as SpellType | undefined })} style={inputStyle}>
                            <option value="">(bet kuris burtas)</option>
                            {SPELL_TYPES.map((st) => <option key={st.value} value={st.value}>{st.icon} {st.label}</option>)}
                          </select>
                        </div>
                      )}
                      {m.trigger === 'onAnySummon' && (
                        <div className="col-span-2">
                          <label style={labelStyle}>Iškvietimo šaltinis</label>
                          <select value={m.triggerSummonSource ?? 'any'} onChange={(e) => setMapping(i, { triggerSummonSource: e.target.value === 'any' ? undefined : e.target.value as 'graveyard' | 'deck' | 'hand' | 'play' })} style={inputStyle}>
                            <option value="any">Bet koks (iškvietimas/prikėlimas)</option>
                            <option value="graveyard">🪦 Tik prikeltas iš kapinyno</option>
                            <option value="deck">Tik iškviestas iš kaladės</option>
                            <option value="hand">Tik sužaistas iš rankos (efektu)</option>
                            <option value="play">Tik įprastai sužaistas (iš rankos už auksą)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Efektas</label>
                    <select value={m.effect} onChange={(e) => { const ev = e.target.value as EffectMapping['effect']; setMapping(i, ev === 'reflectToAttacker' ? { effect: ev, useAttackTarget: true } : { effect: ev }) }} style={inputStyle}>
                      {EFFECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {showTarget && (
                    <div>
                      <label style={labelStyle}>{isPlayerEff || isDeckEff ? 'Kam / kieno' : 'Taikinys'}</label>
                      <select value={m.target} onChange={(e) => setMapping(i, { target: e.target.value as EffectMapping['target'] })} style={inputStyle}>
                        {targetOpts.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  )}
                  {showTarget && (m.targetTypes?.length ?? 0) > 0 && (
                    <div className="col-span-2 md:col-span-4">
                      <label style={labelStyle}>Pažymėtų tipų režimas</label>
                      <div className="flex gap-2 text-[11px]">
                        <button type="button" onClick={() => setMapping(i, { applyToAllTypes: undefined, requiresSelection: true, hitCount: undefined })}
                          className="px-2.5 py-1 rounded" style={{ background: !m.applyToAllTypes ? 'rgba(240,180,41,0.22)' : 'rgba(10,8,16,0.7)', border: '1px solid ' + (!m.applyToAllTypes ? 'rgba(240,180,41,0.55)' : 'rgba(255,255,255,0.1)'), color: !m.applyToAllTypes ? 'var(--gold)' : 'var(--text-muted)' }}>
                          🎯 ARBA – žaidėjas renkasi 1
                        </button>
                        <button type="button" onClick={() => setMapping(i, { applyToAllTypes: true, requiresSelection: false })}
                          className="px-2.5 py-1 rounded" style={{ background: m.applyToAllTypes ? 'rgba(239,68,68,0.22)' : 'rgba(10,8,16,0.7)', border: '1px solid ' + (m.applyToAllTypes ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.1)'), color: m.applyToAllTypes ? '#fca5a5' : 'var(--text-muted)' }}>
                          💥 VISIEMS pažymėtiems (AoE)
                        </button>
                      </div>
                    </div>
                  )}
                  {showTarget && (
                    <div className="col-span-2 md:col-span-4">
                      <label style={labelStyle}>Keli taikinių tipai (varnelės) – „ARBA" režime žaidėjas renkasi 1 iš pažymėtų (padaras / artefaktas / žaidėjas / čempionas)</label>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        <button type="button"
                          onClick={() => setMapping(i, { targetTypes: ['anyUnit', 'anyArtifact', 'anyPlayer'], requiresSelection: true })}
                          className="px-2 py-0.5 rounded" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>
                          ⚡ padaras / artefaktas / žaidėjas
                        </button>
                        {TARGET_TYPES.filter((t) => !['self', 'selfUnit', 'activeField', 'allOwnUnits', 'allEnemyUnits', 'allUnits', 'allEnemyTargets', 'allOwnTargets'].includes(t.value)).map((t) => {
                          const on = (m.targetTypes ?? []).includes(t.value)
                          return (
                            <label key={t.value} className="flex items-center gap-1">
                              <input type="checkbox" checked={on}
                                onChange={() => {
                                  const cur = m.targetTypes ?? []
                                  const next = cur.includes(t.value) ? cur.filter((x) => x !== t.value) : [...cur, t.value]
                                  setMapping(i, { targetTypes: next.length ? next : undefined })
                                }} className="w-3.5 h-3.5 accent-yellow-400" />
                              {t.label}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {effectDef?.needsValue && (
                    <div>
                      <label style={labelStyle}>{valueLabel}</label>
                      <input type="number" value={m.value ?? 1} min={0}
                        onChange={(e) => setMapping(i, { value: Number(e.target.value) })} style={inputStyle} />
                    </div>
                  )}
                  {(m.effect === 'damage' || m.effect === 'burn') && (
                    <div className="col-span-2 md:col-span-4">
                      <label className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}
                        title="Jei žala viršija taikinio HP, perteklius pereina to padaro žaidėjui (pvz. 6 žala į 4 HP padarą → 2 žaidėjui).">
                        <input type="checkbox" checked={!!m.overflowToPlayer}
                          onChange={(e) => setMapping(i, { overflowToPlayer: e.target.checked || undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                        💥 Perteklinę žalą perduoti taikinio žaidėjui
                      </label>
                    </div>
                  )}
                  {m.effect === 'reflectToAttacker' && (
                    <div className="col-span-2 md:col-span-4 text-[11px]" style={{ color: '#fca5a5' }}>
                      ℹ Naudok su trigeriu <b>onAttacked</b>: sunaikina puolantį padarą ir atspindi jo ATK į puolėjo žaidėją. „Efektas į atakuotoją" įjungiamas automatiškai.
                    </div>
                  )}
                  {isTargeted && (
                    <>
                      <div>
                        <label style={labelStyle} title="Elemento animacija (ugnis/žaibas/ledas/nuodai…). Naudojama ir AoE bei čempionų efektams – nuspalvina bangą, projektilą ir žalos skaičių.">Animacijos elementas (AoE/žala)</label>
                        <select value={m.projectile ?? 'none'} onChange={(e) => setMapping(i, { projectile: e.target.value as EffectMapping['projectile'] })} style={inputStyle}>
                          {PROJECTILE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Garsas</label>
                        <select value={m.sound ?? ''} onChange={(e) => setMapping(i, { sound: (e.target.value || undefined) as EffectMapping['sound'] })} style={inputStyle}>
                          {SOUND_OPTIONS.map((sd) => <option key={sd} value={sd}>{sd || '(auto)'}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                  <div className="col-span-2 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {isTargeted && isSinglePick && (
                      <>
                        <label className="flex items-center gap-1">
                          Parinkimas:
                          <select value={pickMode} onChange={(e) => setPickMode(e.target.value)} style={{ ...inputStyle, width: 150 }}>
                            <option value="player">Žaidėjas renkasi</option>
                            <option value="auto">Auto: silpniausias</option>
                            {TARGET_SELECTS.map((ts) => <option key={ts.value} value={ts.value}>Auto: {ts.label}</option>)}
                            <option value="random">Atsitiktinis</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-1">
                          Taikinių sk.
                          <input type="number" min={1} value={m.hitCount ?? 1}
                            onChange={(e) => setMapping(i, { hitCount: Math.max(1, Number(e.target.value)) })}
                            style={{ ...inputStyle, width: 50 }}
                            title={pickMode === 'player' ? 'Žaidėjas rankiniu būdu parenka tiek taikinių (rodoma 1/N)' : 'Kiek atskirų taikinių paveikti'} />
                        </label>
                      </>
                    )}
                    {m.effect === 'tutorToHand' && (
                      <>
                        <label className="flex items-center gap-1">Zona
                          <select value={m.tutorZone ?? 'both'} onChange={(e) => setMapping(i, { tutorZone: e.target.value as 'deck' | 'discard' | 'both' })} style={{ ...inputStyle, width: 130 }}>
                            <option value="both">Kaladė + kapinynas</option>
                            <option value="deck">Kaladė</option>
                            <option value="discard">Kapinynas</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-1">Tik tipas
                          <select value={m.tutorSpellType ?? ''} onChange={(e) => setMapping(i, { tutorSpellType: (e.target.value || undefined) as SpellType | undefined })} style={{ ...inputStyle, width: 130 }}>
                            <option value="">(bet kuri korta)</option>
                            {SPELL_TYPES.map((st) => <option key={st.value} value={st.value}>{st.icon} {st.label}</option>)}
                          </select>
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={!!m.tutorChoose} onChange={(e) => setMapping(i, { tutorChoose: e.target.checked || undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                          Žaidėjas renkasi
                        </label>
                      </>
                    )}
                    {m.effect === 'chooseEffect' && (
                      <>
                        <label className="flex items-center gap-1">Kas renkasi
                          <select value={m.chooseBy ?? 'caster'} onChange={(e) => setMapping(i, { chooseBy: (e.target.value as 'caster' | 'opponent') })} style={{ ...inputStyle, width: 150 }}>
                            <option value="caster">Kerėtojas (tu)</option>
                            <option value="opponent">Priešininkas / auka</option>
                          </select>
                        </label>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          „Pasirink 1 iš…" variantus (chooseOne) suvesk JSON režimu. Prakeiksmui rink „Priešininkas / auka", kad rinktųsi auka.
                        </span>
                      </>
                    )}
                    {m.effect === 'coinFlip' && (
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        🪙 Monetos metimas: ŽALIOS pusės efektus (coinGreen[]) ir RAUDONOS (coinRed[]) suvesk JSON režimu
                      </span>
                    )}
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={m.optional ?? false}
                        onChange={(e) => setMapping(i, { optional: e.target.checked })} className="w-3.5 h-3.5 accent-yellow-400" />
                      Neprivalomas
                    </label>
                    {(m.trigger === 'onAttack' || m.trigger === 'onAttacked') && (
                      <label className="flex items-center gap-1" title={m.trigger === 'onAttack' ? 'Efektas taikomas į atakuotą taikinį (tą patį, kurį puolė)' : 'Efektas taikomas į atakuotoją'}>
                        <input type="checkbox" checked={!!m.useAttackTarget}
                          onChange={(e) => setMapping(i, { useAttackTarget: e.target.checked || undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                        🎯 Taikinys = kovos taikinys {m.trigger === 'onAttack' ? '(atakuotas)' : '(atakuotojas)'}
                      </label>
                    )}
                    <label className="flex items-center gap-1" title="Įmaišo prakeiksmų kortų iš side deck'o į kaladę. Aktyvuojasi, kai jas ištraukia.">
                      <input type="checkbox" checked={!!m.triggersCurse}
                        onChange={(e) => setMapping(i, { triggersCurse: e.target.checked ? { count: 1, appliesTo: 'opponent' } : undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                      🕸 Įmaišo prakeiksmų į kaladę
                    </label>
                    {m.triggersCurse && (
                      <>
                        <label className="flex items-center gap-1">Kiek
                          <input type="number" min={1} max={5} value={m.triggersCurse.count}
                            onChange={(e) => setMapping(i, { triggersCurse: { ...m.triggersCurse!, count: Number(e.target.value) } })}
                            style={{ ...inputStyle, width: 50 }} title="Kiek prakeiksmų kortų įmaišyti" />
                        </label>
                        <label className="flex items-center gap-1">Į kieno kaladę
                          <select value={m.triggersCurse.appliesTo}
                            onChange={(e) => setMapping(i, { triggersCurse: { ...m.triggersCurse!, appliesTo: e.target.value as 'caster' | 'opponent' | 'targetOwner' | 'chosenTarget' | 'random' } })}
                            style={{ ...inputStyle, width: 160 }}>
                            <option value="opponent">Priešo kaladę</option>
                            <option value="caster">Savo kaladę</option>
                            <option value="targetOwner">Taikinio savininko</option>
                            <option value="chosenTarget">Pasirinkto</option>
                            <option value="random">Atsitiktinai (jei leista)</option>
                          </select>
                        </label>
                        <span className="text-[10px] w-full" style={{ color: 'var(--text-muted)' }}>🕸 Prakeiksmai įmaišomi į kaladę ir aktyvuojasi tik kai juos ištraukia. (Reikia, kad kortai būtų priskirtas prakeiksmų side deck.)</span>
                      </>
                    )}
                    {m.effect === 'removeZmkCard' && (
                      <>
                        <label className="flex items-center gap-1">
                          ŽMK reikšmė:
                          <select value={m.zmkValue ?? '-2'}
                            onChange={(e) => setMapping(i, { zmkValue: e.target.value as EffectMapping['zmkValue'] })}
                            style={{ ...inputStyle, width: 70 }} title="Kuri ŽMK korta šalinama">
                            {['+0', '+1', '-1', '+2', '-2', 'x2', 'x0'].map((z) => <option key={z} value={z}>{z}</option>)}
                          </select>
                        </label>
                        <label className="flex items-center gap-1">
                          Kieno:
                          <select value={m.zmkAppliesTo ?? 'caster'}
                            onChange={(e) => setMapping(i, { zmkAppliesTo: e.target.value as 'caster' | 'opponent' })}
                            style={{ ...inputStyle, width: 120 }}>
                            <option value="caster">Sava kaladė</option>
                            <option value="opponent">Priešo kaladė</option>
                          </select>
                        </label>
                      </>
                    )}
                    {/* Summon parametrai */}
                    {(m.effect === 'summonFromHand' || m.effect === 'summonFromDeck' || m.effect === 'summonFromGraveyard' || m.effect === 'revive' || m.effect === 'summonAdvanced') && (
                      <>
                        {m.effect === 'summonAdvanced' && (
                          <>
                            {(['hand', 'deck', 'discard'] as const).map((z) => {
                              const zl = z === 'hand' ? 'Ranka' : z === 'deck' ? 'Kaladė' : 'Kapinynas'
                              const cur = m.summonZones ?? ['hand', 'deck', 'discard']
                              const on = cur.includes(z)
                              return (
                                <label key={z} className="flex items-center gap-1">
                                  <input type="checkbox" checked={on} className="w-3.5 h-3.5 accent-yellow-400"
                                    onChange={(e) => {
                                      const next = e.target.checked ? [...cur, z] : cur.filter((x) => x !== z)
                                      setMapping(i, { summonZones: next })
                                    }} />
                                  {zl}
                                </label>
                              )
                            })}
                            <label className="flex items-center gap-1">
                              Kaina ≥
                              <input type="number" value={m.summonCostMin ?? ''} placeholder="—"
                                onChange={(e) => setMapping(i, { summonCostMin: e.target.value === '' ? undefined : Number(e.target.value) })}
                                style={{ ...inputStyle, width: 64 }} />
                            </label>
                          </>
                        )}
                        <label className="flex items-center gap-1">
                          Kaina ≤
                          <input type="number" value={m.summonCostMax ?? ''} placeholder="—"
                            onChange={(e) => setMapping(i, { summonCostMax: e.target.value === '' ? undefined : Number(e.target.value) })}
                            style={{ ...inputStyle, width: 64 }} title="Tik kortos su kaina <= reikšmė" />
                        </label>
                        <label className="flex items-center gap-1">
                          Frakcija
                          <select value={m.summonFaction ?? ''} onChange={(e) => setMapping(i, { summonFaction: e.target.value ? Number(e.target.value) : undefined })} style={{ ...inputStyle, width: 140 }}>
                            <option value="">(bet kuri frakcija)</option>
                            {factions.map((fc) => <option key={fc.id} value={fc.id}>{fc.name}</option>)}
                          </select>
                        </label>
                        <label className="flex items-center gap-1">
                          Kiek
                          <input type="number" min={1} value={m.summonCount ?? 1}
                            onChange={(e) => setMapping(i, { summonCount: Number(e.target.value) })}
                            style={{ ...inputStyle, width: 50 }} />
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={m.summonChoose ?? false}
                            onChange={(e) => setMapping(i, { summonChoose: e.target.checked || undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                          Žaidėjas pasirenka kortą (popup)
                        </label>
                        <div className="flex flex-col gap-1" style={{ minWidth: 220 }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tik konkrečios kortos (nebūt.)</span>
                          {cardNames.length > 0 ? (
                            <>
                              <select value="" onChange={(e) => {
                                const v = e.target.value; if (!v) return
                                const cur = (m.summonNames ?? '').split(',').map((x) => x.trim()).filter(Boolean)
                                if (!cur.includes(v)) setMapping(i, { summonNames: [...cur, v].join(', ') })
                              }} style={inputStyle}>
                                <option value="">+ pridėti kortą…</option>
                                {cardNames.filter((n) => !(m.summonNames ?? '').split(',').map((x) => x.trim()).includes(n)).map((n) => <option key={n} value={n}>{n}</option>)}
                              </select>
                              <div className="flex flex-wrap gap-1">
                                {(m.summonNames ?? '').split(',').map((x) => x.trim()).filter(Boolean).map((n) => (
                                  <span key={n} className="px-1.5 py-0.5 rounded text-[10px] cursor-pointer"
                                    style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}
                                    onClick={() => {
                                      const cur = (m.summonNames ?? '').split(',').map((x) => x.trim()).filter(Boolean).filter((x) => x !== n)
                                      setMapping(i, { summonNames: cur.length ? cur.join(', ') : undefined })
                                    }}>
                                    {n} ✕
                                  </span>
                                ))}
                              </div>
                            </>
                          ) : (
                            <input type="text" value={m.summonNames ?? ''} placeholder="pvz. Zombis, Skeletas"
                              onChange={(e) => setMapping(i, { summonNames: e.target.value || undefined })}
                              style={{ ...inputStyle, width: 200 }} />
                          )}
                        </div>
                      </>
                    )}
                    {m.effect === 'peekDiscard' && (
                      <label className="flex items-center gap-1">
                        Peržiūrėti N
                        <input type="number" min={1} value={m.peekCount ?? ''} placeholder="6"
                          onChange={(e) => setMapping(i, { peekCount: e.target.value === '' ? undefined : Number(e.target.value) })}
                          style={{ ...inputStyle, width: 56 }} title="Kiek kortų peržiūrėti (Reikšmė = kiek išmesti)" />
                      </label>
                    )}
                    {/* Selektorius + sužeisti (tik combat/target efektams) */}
                    {isTargeted && (
                      <>
                        <label className="flex items-center gap-1">
                          Frakcija:
                          <select value={m.targetFaction ?? ''} onChange={(e) => setMapping(i, { targetFaction: e.target.value ? Number(e.target.value) : undefined })}
                            style={{ ...inputStyle, width: 140 }} title="Tik šios frakcijos padarai">
                            <option value="">(bet kuri frakcija)</option>
                            {factions.map((fc) => <option key={fc.id} value={fc.id}>{fc.name}</option>)}
                          </select>
                        </label>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={m.targetWoundedOnly ?? false}
                            onChange={(e) => setMapping(i, { targetWoundedOnly: e.target.checked || undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                          Tik sužeisti
                        </label>
                      </>
                    )}
                    {/* Sąlyga */}
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={!!m.condition}
                        onChange={(e) => setMapping(i, { condition: e.target.checked ? { source: 'enemyUnits', op: 'gte', value: 1 } : undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                      Sąlyga
                    </label>
                    {m.condition && (
                      <>
                        <select value={m.condition.source}
                          onChange={(e) => setMapping(i, { condition: { ...m.condition!, source: e.target.value as MetricSource } })}
                          style={{ ...inputStyle, width: 150 }}>
                          {METRIC_SOURCES.map((ms) => <option key={ms.value} value={ms.value}>{ms.label}</option>)}
                        </select>
                        <select value={m.condition.op}
                          onChange={(e) => setMapping(i, { condition: { ...m.condition!, op: e.target.value as CompareOp } })}
                          style={{ ...inputStyle, width: 50 }}>
                          {COMPARE_OPS.map((co) => <option key={co.value} value={co.value}>{co.label}</option>)}
                        </select>
                        <input type="number" value={m.condition.value}
                          onChange={(e) => setMapping(i, { condition: { ...m.condition!, value: Number(e.target.value) } })}
                          style={{ ...inputStyle, width: 56 }} />
                      </>
                    )}
                    {/* Dinaminė reikšmė */}
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={!!m.dynamicValue}
                        onChange={(e) => setMapping(i, { dynamicValue: e.target.checked ? { base: 0, perEach: 1, source: 'ownUnits' } : undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                      Dinaminė reikšmė
                    </label>
                    {m.dynamicValue && (
                      <>
                        <span style={{ fontSize: '10px' }}>bazė</span>
                        <input type="number" value={m.dynamicValue.base}
                          onChange={(e) => setMapping(i, { dynamicValue: { ...m.dynamicValue!, base: Number(e.target.value) } })}
                          style={{ ...inputStyle, width: 50 }} />
                        <span style={{ fontSize: '10px' }}>+ už kiekv.</span>
                        <input type="number" value={m.dynamicValue.perEach}
                          onChange={(e) => setMapping(i, { dynamicValue: { ...m.dynamicValue!, perEach: Number(e.target.value) } })}
                          style={{ ...inputStyle, width: 50 }} />
                        <select value={m.dynamicValue.source}
                          onChange={(e) => setMapping(i, { dynamicValue: { ...m.dynamicValue!, source: e.target.value as MetricSource } })}
                          style={{ ...inputStyle, width: 150 }}>
                          {METRIC_SOURCES.map((ms) => <option key={ms.value} value={ms.value}>{ms.label}</option>)}
                        </select>
                      </>
                    )}
                    <button type="button" onClick={() => writeMappings(mappings.filter((_, j) => j !== i))}
                      className="ml-auto text-[11px]" style={{ color: '#ef4444' }}>✕ Šalinti</button>
                  </div>
                  {/* Follow-up grandinė: „tada padaryk ir…" */}
                  <div className="col-span-2 md:col-span-4 mt-1 pl-2" style={{ borderLeft: '2px solid rgba(240,180,41,0.4)' }}>
                    {(m.then ?? []).map((fm, fi) => {
                      const setThen = (patch: Partial<EffectMapping>) => {
                        const arr = [...(m.then ?? [])]; arr[fi] = { ...arr[fi], ...patch }; setMapping(i, { then: arr })
                      }
                      const fEffDef = EFFECT_TYPES.find((e) => e.value === fm.effect)
                      const fPlayerOnly = ['discard', 'gainGold', 'loseGold'].includes(fm.effect)
                      const fNoTarget = ['drawCards', 'triggerZmk', 'removeZmkCard', 'triggerCurse', 'summonFromHand', 'summonFromDeck', 'summonFromGraveyard', 'summonAdvanced', 'revive', 'mill', 'returnGraveyardToDeck', 'peekDiscard', 'revealOwnDeck', 'revealEnemyDeck', 'selfToEnemyHand', 'selfToOwnHand'].includes(fm.effect)
                      return (
                        <div key={fi} className="flex flex-wrap items-end gap-2 mb-1">
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--gold)' }}>↳ tada</span>
                          <div>
                            <label style={labelStyle}>Efektas</label>
                            <select value={fm.effect} onChange={(e) => setThen({ effect: e.target.value as EffectMapping['effect'] })} style={{ ...inputStyle, width: 150 }}>
                              {EFFECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          {!fNoTarget && (
                            <div>
                              <label style={labelStyle}>Taikinys</label>
                              <select value={fm.target} onChange={(e) => setThen({ target: e.target.value as EffectMapping['target'] })} style={{ ...inputStyle, width: 150 }}>
                                {(fPlayerOnly ? TARGET_TYPES.filter((t) => ['self', 'ownPlayer', 'enemyPlayer', 'anyPlayer'].includes(t.value)) : TARGET_TYPES).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                          )}
                          {!fNoTarget && !fPlayerOnly && (fm.targetTypes?.length ?? 0) > 0 && (
                            <div className="w-full mb-1">
                              <div className="flex gap-2 text-[11px]">
                                <button type="button" onClick={() => setThen({ applyToAllTypes: undefined, requiresSelection: true })}
                                  className="px-2 py-0.5 rounded" style={{ background: !fm.applyToAllTypes ? 'rgba(240,180,41,0.22)' : 'rgba(10,8,16,0.7)', border: '1px solid ' + (!fm.applyToAllTypes ? 'rgba(240,180,41,0.55)' : 'rgba(255,255,255,0.1)'), color: !fm.applyToAllTypes ? 'var(--gold)' : 'var(--text-muted)' }}>
                                  🎯 ARBA (1)
                                </button>
                                <button type="button" onClick={() => setThen({ applyToAllTypes: true, requiresSelection: false })}
                                  className="px-2 py-0.5 rounded" style={{ background: fm.applyToAllTypes ? 'rgba(239,68,68,0.22)' : 'rgba(10,8,16,0.7)', border: '1px solid ' + (fm.applyToAllTypes ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.1)'), color: fm.applyToAllTypes ? '#fca5a5' : 'var(--text-muted)' }}>
                                  💥 VISIEMS (AoE)
                                </button>
                              </div>
                            </div>
                          )}
                          {!fNoTarget && !fPlayerOnly && (
                            <div className="w-full">
                              <label style={labelStyle}>Keli taikinių tipai (varnelės) – „ARBA" režime žaidėjas renkasi 1 iš pažymėtų</label>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                                <button type="button"
                                  onClick={() => setThen({ targetTypes: ['anyUnit', 'anyArtifact', 'anyPlayer'], requiresSelection: true })}
                                  className="px-2 py-0.5 rounded" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>
                                  ⚡ padaras / artefaktas / žaidėjas
                                </button>
                                {TARGET_TYPES.filter((t) => !['self', 'selfUnit', 'activeField', 'allOwnUnits', 'allEnemyUnits', 'allUnits', 'allEnemyTargets', 'allOwnTargets', 'castSpell'].includes(t.value)).map((t) => {
                                  const on = (fm.targetTypes ?? []).includes(t.value)
                                  return (
                                    <label key={t.value} className="flex items-center gap-1">
                                      <input type="checkbox" checked={on}
                                        onChange={() => {
                                          const cur = fm.targetTypes ?? []
                                          const next = cur.includes(t.value) ? cur.filter((x) => x !== t.value) : [...cur, t.value]
                                          setThen({ targetTypes: next.length ? next : undefined })
                                        }} className="w-3.5 h-3.5 accent-yellow-400" />
                                      {t.label}
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {fEffDef?.needsValue && (
                            <div>
                              <label style={labelStyle}>Reikšmė</label>
                              <input type="number" value={fm.value ?? 1} min={0} onChange={(e) => setThen({ value: Number(e.target.value) })} style={{ ...inputStyle, width: 64 }} />
                            </div>
                          )}
                          <label className="flex items-center gap-1 text-[11px] pb-1" style={{ color: 'var(--text-secondary)' }}>
                            <input type="checkbox" checked={fm.requiresSelection === true}
                              onChange={(e) => setThen({ requiresSelection: e.target.checked ? true : false })} className="w-3.5 h-3.5 accent-yellow-400" />
                            Renkasi
                          </label>
                          <label className="flex items-center gap-1 text-[11px] pb-1" style={{ color: 'var(--text-secondary)' }} title="Naudoti tą patį taikinį kaip pagrindinis efektas">
                            <input type="checkbox" checked={!!fm.sameTarget}
                              onChange={(e) => setThen({ sameTarget: e.target.checked || undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                            Tas pats taikinys
                          </label>
                          <label className="flex items-center gap-1 text-[11px] pb-1" style={{ color: 'var(--text-secondary)' }} title="Vykdyti tik jei pagrindinio efekto taikinys žuvo (pvz. Kamuolinis žaibas)">
                            <input type="checkbox" checked={!!fm.onlyIfTargetDied}
                              onChange={(e) => setThen({ onlyIfTargetDied: e.target.checked || undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                            Tik jei taikinys žuvo
                          </label>
                          <button type="button" onClick={() => { const arr = (m.then ?? []).filter((_, j) => j !== fi); setMapping(i, { then: arr.length ? arr : undefined }) }}
                            className="text-[11px] pb-1" style={{ color: '#ef4444' }}>✕</button>
                        </div>
                      )
                    })}
                    <button type="button"
                      onClick={() => setMapping(i, { then: [...(m.then ?? []), { trigger: m.trigger, effect: 'heal', target: 'selfUnit', value: 2, requiresSelection: false } as EffectMapping] })}
                      className="text-[11px] font-semibold" style={{ color: 'var(--gold)' }}>
                      + Tada padaryk dar…
                    </button>
                  </div>
                </div>
              )
            })}
            <button type="button" onClick={() => writeMappings([...mappings, { ...EMPTY_MAPPING }])}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{ background: 'rgba(240,180,41,0.12)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>
              + Pridėti efekto mapping'ą
            </button>
          </div>

          {/* Field pasyvai */}
          {isField && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-lg"
              style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(96,165,250,0.3)' }}>
              <p className="col-span-2 md:col-span-3" style={{ ...labelStyle, color: '#60a5fa' }}>🌍 Lauko pasyvai (veikia abu žaidėjus)</p>
              {([
                ['spellCostDelta', 'Burtų kaina +X aukso'],
                ['unitCostDelta', 'Padarų kaina +X aukso'],
                ['atkDelta', 'Visų padarų ATK +/−X'],
                ['attackLimitPerTurn', 'Maks. atakų per ėjimą'],
                ['firstDamageReduction', 'Pirma žala per ėjimą −X'],
                ['goldBonusPerTurn', 'Auksas ėjimo pradžioje +X'],
                ['creatureCap', 'Padarų zonos limitas (Platusis laukas: 10)'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type="number" value={cfg.fieldEffectConfig?.passive?.[key] ?? ''}
                    placeholder="—"
                    onChange={(e) => update({
                      ...cfg,
                      fieldEffectConfig: {
                        ...cfg.fieldEffectConfig,
                        passive: { ...cfg.fieldEffectConfig?.passive, [key]: e.target.value === '' ? undefined : Number(e.target.value) },
                      },
                    })}
                    style={inputStyle} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Be mapping'ų korta veikia fallback režimu (efektas spėjamas iš teksto). Čempiono gebėjimui naudok trigger
        „Čempiono gebėjimas", artefakto pasyvui – „Ėjimo pradžioje". Nesumapinti efektai žaidime praleidžiami su įrašu žurnale.
      </p>
    </div>
  )
}
