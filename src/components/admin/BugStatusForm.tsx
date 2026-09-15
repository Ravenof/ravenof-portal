'use client'

import { useState, useTransition } from 'react'
import { updateBugStatus } from '@/app/admin/bugs/actions'

const STATUSES: [string, string][] = [['new', 'Nauja'], ['triaged', 'Peržiūrėta'], ['in_progress', 'Taisoma'], ['fixed', 'Pataisyta'], ['wontfix', 'Netaisysim'], ['duplicate', 'Dublikatas']]

export function BugStatusForm({ id, status, adminNote, duplicateOf }: { id: number; status: string; adminNote: string | null; duplicateOf: number | null }) {
  const [st, setSt] = useState(status)
  const [note, setNote] = useState(adminNote ?? '')
  const [dup, setDup] = useState(duplicateOf ? String(duplicateOf) : '')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const inp = 'text-xs px-2 py-1 rounded outline-none' as const
  const style = { background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' } as React.CSSProperties
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center flex-wrap">
        <select value={st} onChange={(e) => setSt(e.target.value)} className={inp} style={style}>
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {st === 'duplicate' && <input value={dup} onChange={(e) => setDup(e.target.value)} placeholder="# dublikato nr." className={inp} style={{ ...style, width: 120 }} />}
        <button type="button" disabled={pending}
          onClick={() => start(async () => { const r = await updateBugStatus(id, st, note, dup ? Number(dup) : null); setMsg(r.error ?? 'Išsaugota') })}
          className="text-xs px-3 py-1 rounded disabled:opacity-40" style={{ background: 'rgba(240,180,41,0.18)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>
          Išsaugoti
        </button>
        {msg && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{msg}</span>}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Pastaba žaidėjui (matoma jo skiltyje Mano pranešimai)" className={inp} style={{ ...style, width: '100%', resize: 'vertical' }} />
    </div>
  )
}
