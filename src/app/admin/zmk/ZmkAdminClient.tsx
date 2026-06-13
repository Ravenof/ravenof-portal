'use client'

// ── Admin ŽMK kortų valdymas: sąrašas + inline forma ────────────────────────

import { useState, useTransition } from 'react'
import { saveZmkCard, deleteZmkCard, type ZmkFormState } from './actions'
import type { ZmkCardDef } from '@/lib/game/types'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.8rem',
  background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em',
}

type ZmkRow = ZmkCardDef & { effect_note?: string | null }

export function ZmkAdminClient({ cards }: { cards: ZmkRow[] }) {
  const [editing, setEditing] = useState<ZmkRow | null | 'new'>(null)
  const [state, setState] = useState<ZmkFormState>({})
  const [pending, startTransition] = useTransition()

  const total = cards.filter((c) => c.active).reduce((sum, c) => sum + c.count, 0)

  const submit = (id: string | null) => (formData: FormData) => {
    startTransition(async () => {
      const r = await saveZmkCard(id, {}, formData)
      setState(r)
      if (r.success) setEditing(null)
    })
  }

  const form = (card: ZmkRow | null) => (
    <form action={submit(card?.id ?? null)} className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl mb-4"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--gold)' }}>
      <div className="col-span-2">
        <label style={labelStyle}>Pavadinimas *</label>
        <input name="name" defaultValue={card?.name ?? ''} required style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Reikšmė *</label>
        <select name="value" defaultValue={card?.value ?? '+0'} style={inputStyle}>
          {['+0', '+1', '-1', '+2', '-2', 'x2', 'x0'].map((v) => <option key={v} value={v}>{v.replace('x', '×')}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Kiekis kaladėje</label>
        <input name="count" type="number" min={1} max={20} defaultValue={card?.count ?? 1} style={inputStyle} />
      </div>
      <div className="col-span-2">
        <label style={labelStyle}>Aprašymas</label>
        <input name="description" defaultValue={card?.description ?? ''} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Režimas</label>
        <select name="mode" defaultValue={card?.mode ?? 'auto'} style={inputStyle}>
          <option value="auto">Auto (automatinis)</option>
          <option value="draw">Draw (žaidėjas atverčia)</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Rikiavimas</label>
        <input name="sort_order" type="number" defaultValue={card?.sort_order ?? 0} style={inputStyle} />
      </div>
      <div className="col-span-2">
        <label style={labelStyle}>Trigger / efekto pastaba</label>
        <input name="effect_note" defaultValue={card?.effect_note ?? ''} placeholder="pvz. permaišoma ištraukus" style={inputStyle} />
      </div>
      <div className="col-span-2">
        <label style={labelStyle}>Paveikslėlio URL</label>
        <input name="image_url" defaultValue={card?.image_url ?? ''} placeholder="https://..." style={inputStyle} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="active" id={'act' + (card?.id ?? 'new')} defaultChecked={card?.active ?? true} className="w-4 h-4 accent-yellow-400" />
        <label htmlFor={'act' + (card?.id ?? 'new')} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Aktyvi</label>
      </div>
      <div className="col-span-2 md:col-span-4 flex gap-2">
        <button type="submit" disabled={pending} className="px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {pending ? 'Saugoma…' : 'Išsaugoti'}
        </button>
        <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg text-xs"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
          Atšaukti
        </button>
      </div>
    </form>
  )

  return (
    <div>
      {state.error && (
        <div className="p-3 rounded-lg text-sm mb-4" style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
          {state.error}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Aktyvių kortų kaladėje: <b style={{ color: total === 20 ? '#4ade80' : 'var(--gold)' }}>{total}</b> / 20 (pagal taisykles ŽMK – 20 kortų)
        </p>
        <button onClick={() => setEditing('new')} className="px-4 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          + Nauja ŽMK korta
        </button>
      </div>
      {editing === 'new' && form(null)}
      <div className="space-y-2">
        {cards.map((c) => (
          <div key={c.id}>
            {editing !== 'new' && editing?.id === c.id ? form(c) : (
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', opacity: c.active ? 1 : 0.5 }}>
                <span className="text-lg font-black w-10 text-center" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                  {c.value.replace('x', '×')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name} <span className="text-xs opacity-60">×{c.count}</span></p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: c.mode === 'draw' ? 'rgba(139,92,246,0.15)' : 'rgba(240,180,41,0.1)', color: c.mode === 'draw' ? '#a78bfa' : 'var(--gold)' }}>
                  {c.mode}
                </span>
                <button onClick={() => { setState({}); setEditing(c) }} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--gold)' }}>Redaguoti</button>
                <button onClick={() => startTransition(async () => { const r = await deleteZmkCard(c.id); setState(r) })}
                  className="text-xs px-2 py-1 rounded" style={{ color: '#ef4444' }}>Ištrinti</button>
              </div>
            )}
          </div>
        ))}
        {cards.length === 0 && (
          <p className="text-sm p-4" style={{ color: 'var(--text-muted)' }}>
            Lentelė tuščia – paleisk supabase/gameplay_v1.sql migraciją (ji įterps oficialią 20 kortų sudėtį) arba pridėk kortas ranka.
          </p>
        )}
      </div>
    </div>
  )
}
