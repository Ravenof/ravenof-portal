'use client'

import Link from 'next/link'
import { saveAnnouncement } from './actions'

type Ann = {
  id: string; title: string; slug: string; summary: string | null
  body: string | null; type: string; pinned: boolean
  published_at: string | null; expires_at: string | null
}

const TYPE_OPTIONS = [
  { value: 'news',    label: '📰 Naujiena'  },
  { value: 'update',  label: '⚙️ Atnaujinimas' },
  { value: 'event',   label: '📅 Renginys'  },
  { value: 'warning', label: '⚠️ Įspėjimas' },
]

function fmtLocal(iso: string | null): string {
  if (!iso) return ''
  // Convert ISO → datetime-local input value
  return iso.slice(0, 16)
}

export function AnnouncementFormClient({ ann, error }: { ann?: Ann; error?: string }) {
  return (
    <form action={saveAnnouncement} className="space-y-4 p-5 rounded-xl"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.2)' }}>
      <input type="hidden" name="_id" value={ann?.id ?? ''} />

      <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
        {ann ? 'Redaguoti skelbimy' : 'Naujas skelbimas'}
      </p>
      {error && (
        <p className="text-xs px-3 py-2 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{error}</p>
      )}

      {/* Title + Slug */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pavadinimas *</label>
          <input name="title" required defaultValue={ann?.title ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Slug *</label>
          <input name="slug" required defaultValue={ann?.slug ?? ''}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      {/* Type + Pinned */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tipas</label>
          <select name="type" defaultValue={ann?.type ?? 'news'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Prisegtas viršuje</label>
          <select name="pinned" defaultValue={ann?.pinned ? 'true' : 'false'}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
            <option value="false">Ne</option>
            <option value="true">Taip</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Trumpas aprašymas (rodomas namų puslapyje)</label>
        <input name="summary" defaultValue={ann?.summary ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>

      {/* Body */}
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pilnas tekstas</label>
        <textarea name="body" rows={5} defaultValue={ann?.body ?? ''}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Paskelbti nuo (palikite tuščią = juodraštis)</label>
          <input name="published_at" type="datetime-local" defaultValue={fmtLocal(ann?.published_at ?? null)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Pasibaigimo data (nebūtina)</label>
          <input name="expires_at" type="datetime-local" defaultValue={fmtLocal(ann?.expires_at ?? null)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {ann ? 'Išsaugoti' : 'Sukurti'}
        </button>
        <Link href="/admin/announcements"
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-block' }}>
          Atšaukti
        </Link>
      </div>
    </form>
  )
}
