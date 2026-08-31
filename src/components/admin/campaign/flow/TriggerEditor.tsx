'use client'

// ── Trigerio (scenario taisyklės) FORMOS editorius — be JSON ─────────────────
// Redaguoja vieną node.scenario.rules[idx]: kada suveikia (ėjimas / korta /
// HP slenkstis / žūtis / pergalė...) ir ką daro (pilna cutscene arba trumpas
// in-battle dialogas). Advanced JSON kelias NodeEditor'yje lieka pilnai galiai.

import type { Cutscene, ScenarioRule, ScenarioTrigger } from '@/lib/campaign/types'

const inp: React.CSSProperties = { background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }

const TRIGGERS: { value: ScenarioTrigger; label: string }[] = [
  { value: 'onBattleStart', label: 'Kovos pradžioje' },
  { value: 'onTurnStart', label: 'Ėjimo N pradžioje' },
  { value: 'onTurnEnd', label: 'Ėjimo N pabaigoje' },
  { value: 'onCardPlayed', label: 'Sulošus kortą' },
  { value: 'onUnitDeath', label: 'Žuvus padarui' },
  { value: 'onCondition', label: 'HP slenkstis' },
  { value: 'onVictory', label: 'Laimėjus' },
  { value: 'onDefeat', label: 'Pralaimėjus' },
]

export function TriggerEditor({ rule, cutscenes, onChange, onDelete }: {
  rule: ScenarioRule
  cutscenes: Cutscene[]
  onChange: (r: ScenarioRule) => void
  onDelete: () => void
}) {
  const dialogue = (rule.actions ?? []).find((a) => a.type === 'dialogue') ?? null
  const cutsceneId = dialogue?.['cutsceneId'] ? String(dialogue['cutsceneId']) : ''
  const text = dialogue?.['text'] ? String(dialogue['text']) : ''
  const speaker = dialogue?.['characterName'] ? String(dialogue['characterName']) : ''
  const cond = rule.conditions?.[0] ?? null

  const patchDialogue = (p: Record<string, unknown>) => {
    const actions = [...(rule.actions ?? [])]
    const di = actions.findIndex((a) => a.type === 'dialogue')
    const base = di >= 0 ? { ...actions[di] } : { type: 'dialogue' as const }
    const next = { ...base, ...p }
    for (const k of Object.keys(next)) { if (next[k] === '' || next[k] === undefined) delete next[k] }
    if (di >= 0) actions[di] = next; else actions.push(next)
    onChange({ ...rule, actions })
  }

  const setTrigger = (t: ScenarioTrigger) => {
    const r: ScenarioRule = { ...rule, trigger: t }
    delete r.turn; delete r.cardId; delete r.cardName; delete r.side; delete r.conditions
    if (t === 'onTurnStart' || t === 'onTurnEnd') r.turn = 2
    if (t === 'onCondition') r.conditions = [{ lhs: 'playerHp', op: '<=', rhs: 10 }]
    onChange(r)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: '#a78bfa' }}>⚡ Trigeris</p>
        <button onClick={onDelete} className="px-2 py-1 rounded text-[10px] font-bold"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}>Trinti</button>
      </div>

      <L label="Kada suveikia">
        <select value={rule.trigger} onChange={(e) => setTrigger(e.target.value as ScenarioTrigger)} className="w-full px-2 py-1.5 rounded text-sm" style={inp}>
          {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          {!TRIGGERS.some((t) => t.value === rule.trigger) && <option value={rule.trigger}>{rule.trigger}</option>}
        </select>
      </L>

      {(rule.trigger === 'onTurnStart' || rule.trigger === 'onTurnEnd') && (
        <L label="Ėjimo numeris">
          <input type="number" min={1} value={rule.turn ?? 2} onChange={(e) => onChange({ ...rule, turn: Math.max(1, Number(e.target.value)) })}
            className="w-24 px-2 py-1.5 rounded text-sm" style={inp} />
        </L>
      )}

      {(rule.trigger === 'onCardPlayed' || rule.trigger === 'onUnitDeath') && (
        <>
          <L label="Kortos pavadinimas (tikslus)">
            <input value={rule.cardName ?? ''} onChange={(e) => onChange({ ...rule, cardName: e.target.value || undefined })}
              placeholder="pvz. Belzatoras" className="w-full px-2 py-1.5 rounded text-sm" style={inp} />
          </L>
          <L label="Pusė">
            <select value={rule.side ?? ''} onChange={(e) => onChange({ ...rule, side: (e.target.value || undefined) as ScenarioRule['side'] })}
              className="w-full px-2 py-1.5 rounded text-sm" style={inp}>
              <option value="">Bet kuri</option><option value="player">Žaidėjo</option><option value="enemy">Priešo</option>
            </select>
          </L>
        </>
      )}

      {rule.trigger === 'onCondition' && (
        <L label="HP sąlyga">
          <div className="flex gap-1.5">
            <select value={cond?.lhs ?? 'playerHp'} onChange={(e) => onChange({ ...rule, conditions: [{ lhs: e.target.value, op: cond?.op ?? '<=', rhs: cond?.rhs ?? 10 }] })}
              className="flex-1 px-2 py-1.5 rounded text-sm" style={inp}>
              <option value="playerHp">Tavo HP</option><option value="enemyHp">Priešo HP</option>
            </select>
            <select value={cond?.op ?? '<='} onChange={(e) => onChange({ ...rule, conditions: [{ lhs: cond?.lhs ?? 'playerHp', op: e.target.value as NonNullable<ScenarioRule['conditions']>[0]['op'], rhs: cond?.rhs ?? 10 }] })}
              className="w-16 px-2 py-1.5 rounded text-sm" style={inp}>
              {['<=', '<', '>=', '>', '==', '!='].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <input type="number" value={Number(cond?.rhs ?? 10)} onChange={(e) => onChange({ ...rule, conditions: [{ lhs: cond?.lhs ?? 'playerHp', op: cond?.op ?? '<=', rhs: Number(e.target.value) }] })}
              className="w-20 px-2 py-1.5 rounded text-sm" style={inp} />
          </div>
        </L>
      )}

      <label className="text-[11px] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <input type="checkbox" checked={rule.once !== false} onChange={(e) => onChange({ ...rule, once: e.target.checked })} />
        Suveikia tik kartą per kovą
      </label>

      <div className="pt-1 border-t" style={{ borderColor: 'var(--bg-border)' }}>
        <L label="Veiksmas: groti cutscene">
          <select value={cutsceneId} onChange={(e) => patchDialogue({ cutsceneId: e.target.value || undefined })}
            className="w-full px-2 py-1.5 rounded text-sm" style={inp}>
            <option value="">— (naudoti tekstą žemiau)</option>
            {cutscenes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </L>
        {!cutsceneId && (
          <>
            <L label="Arba trumpas dialogas kovoje">
              <textarea value={text} onChange={(e) => patchDialogue({ text: e.target.value })} rows={2}
                placeholder="pvz. Laikykis! Jie laužiasi pro vartus!" className="w-full px-2 py-1.5 rounded text-sm" style={inp} />
            </L>
            <L label="Kalbėtojas (nebūtina)">
              <input value={speaker} onChange={(e) => patchDialogue({ characterName: e.target.value })}
                placeholder="pvz. Vadas Regnaras" className="w-full px-2 py-1.5 rounded text-sm" style={inp} />
            </L>
          </>
        )}
      </div>
    </div>
  )
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>{children}</div>
}
