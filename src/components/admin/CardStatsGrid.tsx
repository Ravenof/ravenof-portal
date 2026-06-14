'use client'

import { useState } from 'react'
import { quickUpdateCardStats } from '@/app/admin/cards/actions'

type Row = {
  id: string
  card_number: string | null
  name: string
  image_url: string | null
  gold_cost: number | null
  attack: number | null
  health: number | null
  rarity_id: number | null
  card_type_id: number | null
  faction_name: string | null
}
type Opt = { id: number; name: string }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.3rem 0.4rem', borderRadius: '0.4rem', fontSize: '0.8rem',
  background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none',
}
const labelStyle: React.CSSProperties = { fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }

function CardCard({ row, rarities, cardTypes }: { row: Row; rarities: Opt[]; cardTypes: Opt[] }) {
  const [v, setV] = useState({
    gold_cost: row.gold_cost, rarity_id: row.rarity_id, attack: row.attack, health: row.health, card_type_id: row.card_type_id,
  })
  const [state, setState] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle')
  const [err, setErr] = useState('')

  const save = async (patch: Partial<typeof v>) => {
    const next = { ...v, ...patch }
    setV(next)
    setState('saving')
    const res = await quickUpdateCardStats(row.id, patch)
    if (res.error) { setState('err'); setErr(res.error) }
    else { setState('ok'); setTimeout(() => setState('idle'), 1200) }
  }

  const num = (s: string): number | null => (s.trim() === '' ? null : Number(s))

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
      <div className="relative" style={{ aspectRatio: '2.5 / 3.5', background: '#0a0a14' }}>
        {row.image_url
          ? <img src={row.image_url} alt={row.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>nėra paveikslo</div>}
        <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            background: state === 'ok' ? '#22c55e' : state === 'saving' ? '#f59e0b' : state === 'err' ? '#ef4444' : 'rgba(0,0,0,0.6)',
            color: state === 'idle' ? 'var(--text-muted)' : '#0a0a0f', fontWeight: 700,
          }}>
          {state === 'ok' ? '✓' : state === 'saving' ? '…' : state === 'err' ? '!' : ''}
        </span>
      </div>
      <div className="p-2 space-y-1.5">
        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }} title={row.name}>{row.name}</p>
        <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{row.faction_name} · {row.card_number}</p>
        <div className="grid grid-cols-2 gap-1.5">
          <label>
            <span style={labelStyle}>Kaina</span>
            <input type="number" defaultValue={v.gold_cost ?? ''} step={100} min={0} placeholder="—" style={inputStyle}
              onBlur={(e) => { const n = num(e.target.value); if (n !== v.gold_cost) save({ gold_cost: n }) }} />
          </label>
          <label>
            <span style={labelStyle}>Retumas</span>
            <select defaultValue={v.rarity_id ?? ''} style={inputStyle}
              onChange={(e) => save({ rarity_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">—</option>
              {rarities.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label>
            <span style={labelStyle}>ATK</span>
            <input type="number" defaultValue={v.attack ?? ''} placeholder="—" style={inputStyle}
              onBlur={(e) => { const n = num(e.target.value); if (n !== v.attack) save({ attack: n }) }} />
          </label>
          <label>
            <span style={labelStyle}>HP</span>
            <input type="number" defaultValue={v.health ?? ''} placeholder="—" style={inputStyle}
              onBlur={(e) => { const n = num(e.target.value); if (n !== v.health) save({ health: n }) }} />
          </label>
          <label className="col-span-2">
            <span style={labelStyle}>Tipas</span>
            <select defaultValue={v.card_type_id ?? ''} style={inputStyle}
              onChange={(e) => save({ card_type_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">—</option>
              {cardTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>
        {state === 'err' && <p className="text-[10px]" style={{ color: '#ef4444' }}>{err}</p>}
      </div>
    </div>
  )
}

export function CardStatsGrid({ rows, rarities, cardTypes }: { rows: Row[]; rarities: Opt[]; cardTypes: Opt[] }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
      {rows.map((r) => <CardCard key={r.id} row={r} rarities={rarities} cardTypes={cardTypes} />)}
    </div>
  )
}
