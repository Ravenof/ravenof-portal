'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { saveEvent, type EventFormState } from '@/app/admin/events/actions'
import type { RavenEvent } from '@/types'

type Props = {
  eventId: string | null
  initialData?: Partial<RavenEvent>
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--bg-border)',
  color: 'var(--text-primary)',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600 as const,
  color: 'var(--text-muted)',
  marginBottom: '0.375rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  // "2025-06-15T14:00:00+00:00" → "2025-06-15T14:00"
  return iso.slice(0, 16)
}

export function EventForm({ eventId, initialData }: Props) {
  const router = useRouter()
  const boundSave = saveEvent.bind(null, eventId)
  const [state, formAction, isPending] = useActionState<EventFormState, FormData>(boundSave, {})

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {state.error && (
        <div className="p-3 rounded-lg text-sm"
          style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label style={labelStyle}>Pavadinimas *</label>
          <input name="title" required defaultValue={initialData?.title ?? ''}
            placeholder="Renginio pavadinimas"
            style={{ ...inputStyle, border: '1px solid var(--gold)40' }} />
        </div>

        {/* Starts at */}
        <div>
          <label style={labelStyle}>Pradžia *</label>
          <input name="starts_at" type="datetime-local" required
            defaultValue={toDatetimeLocal(initialData?.starts_at)}
            style={inputStyle} />
        </div>

        {/* Ends at */}
        <div>
          <label style={labelStyle}>Pabaiga (nebut.)</label>
          <input name="ends_at" type="datetime-local"
            defaultValue={toDatetimeLocal(initialData?.ends_at)}
            style={inputStyle} />
        </div>

        {/* Location */}
        <div>
          <label style={labelStyle}>Vieta (nebut.)</label>
          <input name="location" defaultValue={initialData?.location ?? ''}
            placeholder="pvz. Vilnius, Laisvalaikio sale"
            style={inputStyle} />
        </div>

        {/* Capacity */}
        <div>
          <label style={labelStyle}>Talpa (nebut.)</label>
          <input name="capacity" type="number" min="1"
            defaultValue={initialData?.capacity ?? ''}
            placeholder="pvz. 32 (tuščia = neribota)"
            style={inputStyle} />
        </div>

        {/* Status */}
        <div>
          <label style={labelStyle}>Statusas *</label>
          <select name="status" defaultValue={initialData?.status ?? 'draft'} style={inputStyle}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Aprašymas (nebut.)</label>
        <textarea name="description" defaultValue={initialData?.description ?? ''}
          rows={5} placeholder="Renginio aprašymas..."
          style={{ ...inputStyle, resize: 'vertical' as const }} />
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="px-6 py-2 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50 hover:opacity-90"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
          {isPending ? 'Saugoma...' : (eventId ? 'Išsaugoti pakeitimus' : 'Sukurti renginį')}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
          Atšaukti
        </button>
      </div>
    </form>
  )
}
