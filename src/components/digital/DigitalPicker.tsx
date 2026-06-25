'use client'

// ── Ravenof Digital — bendras pasirinkimo komponentas (vietoj native <select>) ─
// Trigeris + apatinis lakštas (bottom-sheet) per portalą, kad neapkarpytų layout'as
// ir atrodytų kaip žaidimo UI (frakcijos ikona + pavadinimas).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'

export type PickerItem = { value: string; label: string; sub?: string; iconUrl?: string | null; emoji?: string; color?: string }

function ItemIcon({ it, size = 22 }: { it: PickerItem; size?: number }) {
  const [bad, setBad] = useState(false)
  if (it.iconUrl && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={it.iconUrl} alt="" onError={() => setBad(true)} draggable={false} style={{ width: size, height: size, objectFit: 'contain' }} />
  }
  if (it.emoji) return <span style={{ fontSize: size * 0.8 }}>{it.emoji}</span>
  return <span className="rounded-full" style={{ width: size * 0.5, height: size * 0.5, background: it.color ?? 'var(--gold)' }} />
}

export function DigitalPicker({ value, onChange, items, placeholder = '— Pasirink —', accent = '240,180,41', label, disabled }: {
  value: string; onChange: (v: string) => void; items: PickerItem[]
  placeholder?: string; accent?: string; label?: string; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const sel = items.find((i) => i.value === value) ?? null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {label && <label className="text-[10px] font-bold block mb-1.5 uppercase tracking-widest" style={{ color: `rgb(${accent})`, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.12em' }}>{label}</label>}
      <button type="button" disabled={disabled} onClick={() => { playUiClick(); setOpen(true) }}
        className="w-full flex items-center gap-2.5 px-3 rounded-xl text-left transition-colors disabled:opacity-40"
        style={{ minHeight: 48, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${accent},0.4)` }}>
        {sel ? (
          <>
            <span className="flex items-center justify-center shrink-0" style={{ width: 24 }}><ItemIcon it={sel} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{sel.label}</span>
              {sel.sub && <span className="block text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{sel.sub}</span>}
            </span>
          </>
        ) : <span className="flex-1 text-sm" style={{ color: 'var(--text-muted)' }}>{placeholder}</span>}
        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: `rgb(${accent})` }} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center" style={{ background: 'rgba(4,3,8,0.85)' }} onClick={() => setOpen(false)}>
          <div className="w-full sm:w-[min(440px,94vw)] max-h-[70vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ border: `1px solid rgba(${accent},0.45)`, background: 'linear-gradient(160deg,#17111f,#0a0810)', boxShadow: '0 -8px 40px rgba(0,0,0,0.7)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={(e) => e.stopPropagation()}>
            {label && <div className="px-4 py-3 shrink-0 text-center text-[11px] font-bold uppercase tracking-widest" style={{ color: `rgb(${accent})`, borderBottom: `1px solid rgba(${accent},0.18)`, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.14em' }}>{label}</div>}
            <div className="flex-1 min-h-0 overflow-y-auto py-1">
              {items.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Nėra pasirinkimų</p>}
              {items.map((it) => {
                const active = it.value === value
                return (
                  <button key={it.value} onClick={() => { playUiClick(); onChange(it.value); setOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
                    style={{ background: active ? `rgba(${accent},0.12)` : 'transparent' }}>
                    <span className="flex items-center justify-center shrink-0" style={{ width: 26 }}><ItemIcon it={it} size={24} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{it.label}</span>
                      {it.sub && <span className="block text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{it.sub}</span>}
                    </span>
                    {active && <Check className="w-4 h-4 shrink-0" style={{ color: `rgb(${accent})` }} />}
                  </button>
                )
              })}
            </div>
            <button onClick={() => { playUiClick(); setOpen(false) }} className="shrink-0 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)', borderTop: `1px solid rgba(${accent},0.15)` }}>Uždaryti</button>
          </div>
        </div>, document.body)}
    </>
  )
}
