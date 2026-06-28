'use client'

// ════════════════════════════════════════════════════════════════════════════
// AdminTutorial — data-driven lesson management + analytics dashboard.
//  • Seed/rebuild lessons from code (merge/reset).
//  • Inline edit every lesson (title/subtitle/order/status/reward + full config
//    JSON) so new lessons, reorder, rewards, dialogue, scripted decks/enemy can
//    be authored WITHOUT code.
//  • Analytics: per-lesson funnel (start/complete/skip/quit/wrong) + per-step
//    avg time and wrong-action counts (drop-off insight).
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rebuildTutorial } from '@/lib/tutorial2/seedRebuild'
import { tutorialLessonSeeds } from '@/data/tutorialLessons/lessonSeeds'

interface Row {
  id: string; seed_key: string | null; slug: string; sort_order: number; title: string
  subtitle: string | null; description: string | null; icon: string | null; est_minutes: number | null
  config: unknown; reward_payload: unknown; status: string
}
interface PerLesson { lesson_slug: string; starts: number; completes: number; skips: number; quits: number; wrong_actions: number }
interface PerStep { lesson_slug: string; step_id: string; completes: number; avg_ms: number | null; wrong: number }

export function AdminTutorial() {
  const [rows, setRows] = useState<Row[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [analytics, setAnalytics] = useState<{ perLesson: PerLesson[]; perStep: PerStep[] } | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('tutorial_lessons').select('*').order('sort_order')
    setRows((data as Row[]) ?? [])
    const { data: an } = await supabase.rpc('rvn_tutorial_analytics')
    if (an?.ok) setAnalytics({ perLesson: an.perLesson ?? [], perStep: an.perStep ?? [] })
  }, [])

  useEffect(() => { load() }, [load])

  const seed = async (mode: 'merge' | 'reset') => {
    setBusy(true); setMsg('')
    const r = await rebuildTutorial(tutorialLessonSeeds, mode)
    setMsg(r.ok ? `✓ ${mode}: +${r.created} ~${r.updated} =${r.skipped}` : `Klaida: ${r.error}`)
    await load(); setBusy(false)
  }

  const save = async (row: Row) => {
    setBusy(true); setMsg('')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('tutorial_lessons').update({
        title: row.title, subtitle: row.subtitle, description: row.description, icon: row.icon,
        sort_order: row.sort_order, est_minutes: row.est_minutes, status: row.status,
        reward_payload: row.reward_payload, config: row.config,
      }).eq('id', row.id)
      if (error) throw error
      setMsg('✓ Išsaugota: ' + row.title)
    } catch (e) { setMsg('Klaida: ' + (e as Error).message) }
    setBusy(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-4 text-[#f3ead3]">
      <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>🎓 Mokymai</h1>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Pamokos yra data-driven (config JSONB). Čia gali kurti/keisti/perrikiuoti pamokas, atlygius ir scenarijus be kodo.</p>

      <div className="flex gap-2 mb-3 items-center flex-wrap">
        <button onClick={() => seed('merge')} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: 'rgba(240,180,41,0.16)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>Įkelti / sujungti iš kodo</button>
        <button onClick={() => seed('reset')} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }}>Perrašyti iš kodo (reset)</button>
        <button onClick={load} disabled={busy} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}>↻ Atnaujinti</button>
        {msg && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{msg}</span>}
      </div>

      {/* Analytics */}
      {analytics && analytics.perLesson.length > 0 && (
        <div className="mb-5 rounded-xl p-3" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-sm font-bold mb-2" style={{ color: 'var(--gold)' }}>📊 Analytics</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left py-1">Pamoka</th><th>Pradėjo</th><th>Baigė</th><th>Completion</th><th>Praleido</th><th>Metė</th><th>Klaidų</th>
              </tr></thead>
              <tbody>
                {analytics.perLesson.map((l) => {
                  const rate = l.starts ? Math.round((l.completes / l.starts) * 100) : 0
                  return (
                    <tr key={l.lesson_slug} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <td className="py-1 text-left">{l.lesson_slug}</td>
                      <td className="text-center">{l.starts}</td>
                      <td className="text-center">{l.completes}</td>
                      <td className="text-center" style={{ color: rate >= 60 ? '#34d399' : rate >= 30 ? '#fbbf24' : '#f87171' }}>{rate}%</td>
                      <td className="text-center">{l.skips}</td>
                      <td className="text-center">{l.quits}</td>
                      <td className="text-center">{l.wrong_actions}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {analytics.perStep.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Žingsnių detalės (laikas / klaidos)</summary>
              <div className="overflow-x-auto mt-1">
                <table className="w-full text-[11px]">
                  <thead><tr style={{ color: 'var(--text-muted)' }}><th className="text-left">Pamoka</th><th className="text-left">Žingsnis</th><th>Vid. laikas</th><th>Klaidų</th></tr></thead>
                  <tbody>
                    {analytics.perStep.map((st, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td className="text-left">{st.lesson_slug}</td><td className="text-left">{st.step_id}</td>
                        <td className="text-center">{st.avg_ms != null ? (st.avg_ms / 1000).toFixed(1) + 's' : '—'}</td>
                        <td className="text-center" style={{ color: st.wrong > 0 ? '#f87171' : undefined }}>{st.wrong}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}

      {/* Lessons */}
      <div className="flex flex-col gap-3">
        {rows.map((row, idx) => (
          <LessonEditor key={row.id} row={row} busy={busy}
            onChange={(r) => setRows((rs) => rs.map((x, i) => (i === idx ? r : x)))}
            onSave={() => save(row)} />
        ))}
        {rows.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pamokų nėra. Spausk „Įkelti iš kodo".</p>}
      </div>
    </div>
  )
}

function LessonEditor({ row, busy, onChange, onSave }: { row: Row; busy: boolean; onChange: (r: Row) => void; onSave: () => void }) {
  const [configText, setConfigText] = useState(() => JSON.stringify(row.config, null, 2))
  const [rewardText, setRewardText] = useState(() => JSON.stringify(row.reward_payload, null, 2))
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)

  const commitJson = () => {
    try {
      const cfg = JSON.parse(configText); const rew = JSON.parse(rewardText)
      onChange({ ...row, config: cfg, reward_payload: rew }); setErr('')
      return true
    } catch (e) { setErr('JSON klaida: ' + (e as Error).message); return false }
  }

  const inp = 'px-2 py-1 rounded text-sm bg-black/30 border border-white/15 text-[#f3ead3]'
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(240,180,41,0.25)' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <input className={inp} style={{ width: 60 }} type="number" value={row.sort_order} onChange={(e) => onChange({ ...row, sort_order: +e.target.value })} />
        <input className={inp + ' flex-1'} value={row.title} onChange={(e) => onChange({ ...row, title: e.target.value })} />
        <select className={inp} value={row.status} onChange={(e) => onChange({ ...row, status: e.target.value })}>
          <option value="active">active</option><option value="draft">draft</option><option value="hidden">hidden</option>
        </select>
        <button onClick={() => setOpen((o) => !o)} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>{open ? 'Sutraukti' : 'Redaguoti'}</button>
        <button onClick={() => { if (commitJson()) onSave() }} disabled={busy} className="text-xs px-3 py-1 rounded font-bold" style={{ background: 'rgba(240,180,41,0.18)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>Išsaugoti</button>
      </div>
      <input className={inp + ' w-full mt-2'} placeholder="Paantraštė" value={row.subtitle ?? ''} onChange={(e) => onChange({ ...row, subtitle: e.target.value })} />
      {open && (
        <div className="mt-2 grid gap-2">
          <div className="flex gap-2">
            <input className={inp} style={{ width: 70 }} placeholder="ikona" value={row.icon ?? ''} onChange={(e) => onChange({ ...row, icon: e.target.value })} />
            <input className={inp} style={{ width: 90 }} type="number" placeholder="min" value={row.est_minutes ?? 4} onChange={(e) => onChange({ ...row, est_minutes: +e.target.value })} />
          </div>
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Atlygis (JSON)</label>
          <textarea className={inp + ' font-mono'} rows={4} value={rewardText} onChange={(e) => setRewardText(e.target.value)} onBlur={commitJson} />
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Config / scenarijus (JSON)</label>
          <textarea className={inp + ' font-mono'} rows={16} value={configText} onChange={(e) => setConfigText(e.target.value)} onBlur={commitJson} />
          {err && <span className="text-xs" style={{ color: '#f87171' }}>{err}</span>}
        </div>
      )}
    </div>
  )
}
