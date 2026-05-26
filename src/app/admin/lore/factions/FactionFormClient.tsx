'use client'

import Link from 'next/link'
import { saveFaction } from '../actions'

type Faction = {
  id: string; name: string; slug: string; color: string
  description: string | null; sort_order: number; status: string
}

const PRESET_COLORS = [
  '#d4af37','#ef4444','#8b5cf6','#3b82f6','#22c55e',
  '#f59e0b','#0ea5e9','#ec4899','#6b7280','#14b8a6',
]

export function FactionFormClient({ f, error }: { f?: Faction; error?: string }) {
  return (
    <form action={saveFaction} className="space-y-4 p-5 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.2)' }}>
      <input type="hidden" name="_id" value={f?.id ?? ''} />

      <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
        {f ? 'Redaguoti frakciją' : 'Nauja frakcija'}
      </p>
      {error && <p className="text-xs px-3 py-2 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{error}</p>}

      {/* Name + slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pavadinimas *</label>
          <input name="name" required defaultValue={f?.name ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Slug *</label>
          <input name="slug" required defaultValue={f?.slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Spalva</label>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <input type="color" name="color" defaultValue={f?.color ?? '#d4af37'}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0.5"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>hex</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={(e) => {
                  const form = e.currentTarget.closest('form') as HTMLFormElement
                  const colorInput = form.querySelector<HTMLInputElement>('input[type="color"]')
                  if (colorInput) colorInput.value = c
                }}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: f?.color === c ? '#fff' : 'transparent' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Aprašymas</label>
        <textarea name="description" rows={3} defaultValue={f?.description ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>

      {/* Status + sort */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Statusas</label>
          <select name="status" defaultValue={f?.status ?? 'draft'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Rikiavimas</label>
          <input name="sort_order" type="number" defaultValue={f?.sort_order ?? 0}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {f ? 'Išsaugoti' : 'Sukurti'}
        </button>
        <Link href="/admin/lore/factions"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block' }}>
          Atšaukti
        </Link>
      </div>
    </form>
  )
}
