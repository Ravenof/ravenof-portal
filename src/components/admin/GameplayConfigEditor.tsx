'use client'

// ── GameplayConfigEditor — kortos virtualaus žaidimo efektų mapping'as ───────
// Dropdown'ais sudaromi EffectMapping'ai + field pasyvai + raw JSON režimas.
// Rezultatas serializuojamas į hidden input name="gameplay" (saveCard parsina).

import { useMemo, useState } from 'react'
import {
  TARGET_TYPES, EFFECT_TYPES, TRIGGER_TYPES, PROJECTILE_TYPES,
  METRIC_SOURCES, COMPARE_OPS, TARGET_SELECTS, SUBTYPE_OPTIONS,
  type GameplayConfig, type EffectMapping, type MetricSource, type CompareOp, type TargetSelect,
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

export function GameplayConfigEditor({ initial, isField, isChampion = false, cardNames = [], hasEffectText }: {
  initial: unknown
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
  const [rawMode, setRawMode] = useState(false)
  const [rawText, setRawText] = useState('')
  const [rawError, setRawError] = useState<string | null>(null)

  const [activeSkill, setActiveSkill] = useState(0)
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
          const auraOn = !!pa && ((pa.auraAttack ?? 0) !== 0 || (pa.auraHealth ?? 0) !== 0 || !!pa.auraSilence || !!pa.auraCantAttack || (pa.auraKeywords?.length ?? 0) > 0 || (pa.auraCostReduction ?? 0) !== 0)
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
                  : { ...cfg.passiveAura, auraAttack: undefined, auraHealth: undefined, auraSilence: undefined, auraCantAttack: undefined, auraKeywords: undefined, auraCostReduction: undefined, auraScope: undefined, auraSubtype: undefined, auraIncludesSelf: undefined } })}
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
                  <label style={labelStyle}>Tik potipis</label>
                  <select value={pa?.auraSubtype ?? ''}
                    onChange={(e) => setPa({ auraSubtype: e.target.value || undefined })} style={inputStyle}>
                    {SUBTYPE_OPTIONS.map((st) => <option key={st} value={st}>{st || '(bet koks)'}</option>)}
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
            </div>)}
          </>)
        })()}
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
              const isGlobalTrigger = ['onAnySummon', 'onAnyDeath', 'onAnyAttack', 'onAnyPlay'].includes(m.trigger)
              const isSummon = ['summonFromHand', 'summonFromDeck', 'summonFromGraveyard', 'summonAdvanced', 'revive'].includes(eff)
              const isPlayerEff = ['discard', 'gainGold', 'loseGold'].includes(eff)
              const isDeckEff = ['mill', 'returnGraveyardToDeck', 'peekDiscard'].includes(eff)
              const isFixedNoTarget = ['drawCards', 'triggerZmk', 'removeZmkCard', 'triggerCurse', 'selfToEnemyHand', 'selfToOwnHand', 'revealOwnDeck', 'revealEnemyDeck'].includes(eff)
              const isTargeted = !isSummon && !isPlayerEff && !isDeckEff && !isFixedNoTarget
              const showTarget = isTargeted || isPlayerEff || isDeckEff
              const playerOnly = ['self', 'ownPlayer', 'enemyPlayer', 'anyPlayer']
              const targetOpts = isTargeted ? TARGET_TYPES : TARGET_TYPES.filter((t) => playerOnly.includes(t.value))
              const isSinglePick = ['enemyUnit', 'ownUnit', 'anyUnit', 'enemyChampion', 'ownChampion', 'anyChampion', 'enemyArtifact', 'ownArtifact', 'anyArtifact'].includes(m.target)
              const valueLabel = ({ damage: 'Žala', heal: 'Gydymas', buffAttack: '+ATK', buffHealth: '+HP', debuffAttack: '−ATK', debuffHealth: '−HP', drawCards: 'Kiek kortų', gainGold: 'Auksas +', loseGold: 'Auksas −', mill: 'Kiek kortų', discard: 'Kiek kortų' } as Record<string, string>)[eff] ?? 'Reikšmė'
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
                          🌐 Globalus trigger – efektas suveikia, kai įvykis nutinka {m.trigger === 'onAnySummon' ? 'bet kuriam iškviestam/prikeltam padarui' : m.trigger === 'onAnyDeath' ? 'bet kuriam sunaikintam padarui' : m.trigger === 'onAnyAttack' ? 'bet kuriam puolančiam padarui' : 'bet kuriai sužaistai kortai'} (ne tik šiai kortai). Filtruok žemiau.
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
                        <label style={labelStyle}>Tik potipis</label>
                        <select value={m.triggerSubtype ?? ''} onChange={(e) => setMapping(i, { triggerSubtype: e.target.value || undefined })} style={inputStyle}>
                          {SUBTYPE_OPTIONS.map((st) => <option key={st} value={st}>{st || '(bet koks)'}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Efektas</label>
                    <select value={m.effect} onChange={(e) => setMapping(i, { effect: e.target.value as EffectMapping['effect'] })} style={inputStyle}>
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
                  {effectDef?.needsValue && (
                    <div>
                      <label style={labelStyle}>{valueLabel}</label>
                      <input type="number" value={m.value ?? 1} min={0}
                        onChange={(e) => setMapping(i, { value: Number(e.target.value) })} style={inputStyle} />
                    </div>
                  )}
                  {isTargeted && (
                    <>
                      <div>
                        <label style={labelStyle}>Projectile</label>
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
                          <input type="number" min={1} value={m.hitCount ?? 1} disabled={pickMode === 'player'}
                            onChange={(e) => setMapping(i, { hitCount: Math.max(1, Number(e.target.value)) })}
                            style={{ ...inputStyle, width: 50, opacity: pickMode === 'player' ? 0.5 : 1 }}
                            title={pickMode === 'player' ? 'Žaidėjo pasirinkimui kol kas 1 taikinys' : 'Kiek atskirų taikinių paveikti'} />
                        </label>
                      </>
                    )}
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={m.optional ?? false}
                        onChange={(e) => setMapping(i, { optional: e.target.checked })} className="w-3.5 h-3.5 accent-yellow-400" />
                      Neprivalomas
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={!!m.triggersCurse}
                        onChange={(e) => setMapping(i, { triggersCurse: e.target.checked ? { count: 1, appliesTo: 'opponent' } : undefined })} className="w-3.5 h-3.5 accent-yellow-400" />
                      Aktyvuoja prakeiksmą
                    </label>
                    {m.triggersCurse && (
                      <>
                        <input type="number" min={1} max={5} value={m.triggersCurse.count}
                          onChange={(e) => setMapping(i, { triggersCurse: { ...m.triggersCurse!, count: Number(e.target.value) } })}
                          style={{ ...inputStyle, width: 50 }} title="Kiek prakeiksmų" />
                        <select value={m.triggersCurse.appliesTo}
                          onChange={(e) => setMapping(i, { triggersCurse: { ...m.triggersCurse!, appliesTo: e.target.value as 'caster' | 'opponent' | 'targetOwner' | 'chosenTarget' | 'random' } })}
                          style={{ ...inputStyle, width: 130 }}>
                          <option value="caster">Sau (caster)</option>
                          <option value="opponent">Priešininkui</option>
                          <option value="targetOwner">Taikinio savininkui</option>
                          <option value="chosenTarget">Pasirinktam</option>
                          <option value="random">Random (jei leista)</option>
                        </select>
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
                          Potipis
                          <select value={m.summonSubtype ?? ''} onChange={(e) => setMapping(i, { summonSubtype: e.target.value || undefined })} style={{ ...inputStyle, width: 120 }}>
                            {SUBTYPE_OPTIONS.map((st) => <option key={st} value={st}>{st || '(bet koks)'}</option>)}
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
                          Potipis:
                          <select value={m.targetSubtype ?? ''} onChange={(e) => setMapping(i, { targetSubtype: e.target.value || undefined })}
                            style={{ ...inputStyle, width: 120 }} title="Tik šio potipio padarai">
                            {SUBTYPE_OPTIONS.map((st) => <option key={st} value={st}>{st || '(bet koks)'}</option>)}
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
