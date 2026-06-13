'use client'

// ── GameplayConfigEditor — kortos virtualaus žaidimo efektų mapping'as ───────
// Dropdown'ais sudaromi EffectMapping'ai + field pasyvai + raw JSON režimas.
// Rezultatas serializuojamas į hidden input name="gameplay" (saveCard parsina).

import { useMemo, useState } from 'react'
import {
  TARGET_TYPES, EFFECT_TYPES, TRIGGER_TYPES, PROJECTILE_TYPES,
  type GameplayConfig, type EffectMapping,
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

export function GameplayConfigEditor({ initial, isField, hasEffectText }: {
  initial: unknown
  isField: boolean
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

  const mappings = cfg.effectMappings ?? []
  const needsMapping = mappings.length === 0 && hasEffectText

  const update = (next: GameplayConfig) => setCfg(next)
  const setMapping = (i: number, m: Partial<EffectMapping>) => {
    const arr = [...mappings]
    arr[i] = { ...arr[i], ...m }
    update({ ...cfg, effectMappings: arr })
  }

  const serialized = useMemo(() => {
    const out: GameplayConfig = { ...cfg, needsEffectMapping: needsMapping }
    if (!out.effectMappings?.length) delete out.effectMappings
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
          {/* Effect mappings */}
          <div className="space-y-2">
            {mappings.map((m, i) => {
              const effectDef = EFFECT_TYPES.find((e) => e.value === m.effect)
              return (
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-lg"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
                  <div>
                    <label style={labelStyle}>Trigger</label>
                    <select value={m.trigger} onChange={(e) => setMapping(i, { trigger: e.target.value as EffectMapping['trigger'] })} style={inputStyle}>
                      {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Efektas</label>
                    <select value={m.effect} onChange={(e) => setMapping(i, { effect: e.target.value as EffectMapping['effect'] })} style={inputStyle}>
                      {EFFECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Taikinys</label>
                    <select value={m.target} onChange={(e) => setMapping(i, { target: e.target.value as EffectMapping['target'] })} style={inputStyle}>
                      {TARGET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {effectDef?.needsValue && (
                    <div>
                      <label style={labelStyle}>Reikšmė</label>
                      <input type="number" value={m.value ?? 1} min={0}
                        onChange={(e) => setMapping(i, { value: Number(e.target.value) })} style={inputStyle} />
                    </div>
                  )}
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
                  <div className="col-span-2 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={m.requiresSelection ?? false}
                        onChange={(e) => setMapping(i, { requiresSelection: e.target.checked })} className="w-3.5 h-3.5 accent-yellow-400" />
                      Žaidėjas renkasi taikinį
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={m.optional ?? false}
                        onChange={(e) => setMapping(i, { optional: e.target.checked })} className="w-3.5 h-3.5 accent-yellow-400" />
                      Neprivalomas
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={m.allowRandomTarget ?? false}
                        onChange={(e) => setMapping(i, { allowRandomTarget: e.target.checked })} className="w-3.5 h-3.5 accent-yellow-400" />
                      allowRandomTarget
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
                    <button type="button" onClick={() => update({ ...cfg, effectMappings: mappings.filter((_, j) => j !== i) })}
                      className="ml-auto text-[11px]" style={{ color: '#ef4444' }}>✕ Šalinti</button>
                  </div>
                </div>
              )
            })}
            <button type="button" onClick={() => update({ ...cfg, effectMappings: [...mappings, { ...EMPTY_MAPPING }] })}
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
