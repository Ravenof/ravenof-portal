'use client'
// ════════════════════════════════════════════════════════════════════════════
// DeskKit — bendri DESKTOP komponentai (meniu ekranai). Stiliai: desktop-ui.css.
//   • DeskDialog      – header/body/footer, uždarymas ×, Escape, fokuso gaudyklė,
//                       fokuso grąžinimas, portalas į document.body.
//   • DeskPageHeader  – puslapio antraštė (grįžimas · pavadinimas · aprašas · veiksmai).
// Tik prezentacija — jokios žaidimo logikos.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft } from 'lucide-react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Fokuso gaudyklė + Escape + fokuso grąžinimas. Grąžina ref, kurį uždėti ant dialogo šaknies. */
export function useDialogFocus<T extends HTMLElement>(onClose?: () => void, enabled = true) {
  const ref = useRef<T | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!enabled) return
    const prev = document.activeElement as HTMLElement | null
    const el = ref.current
    // pirmas fokusuojamas elementas – ne uždarymo mygtukas, jei yra kitų
    const t = window.setTimeout(() => {
      if (!el) return
      const list = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
      const first = list.find((n) => !n.dataset.dlgClose) ?? list[0]
      ;(first ?? el).focus({ preventScroll: true })
    }, 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeRef.current) { e.stopPropagation(); closeRef.current(); return }
      if (e.key !== 'Tab' || !el) return
      const list = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
      if (list.length === 0) { e.preventDefault(); return }
      const first = list[0], last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey, true)
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus({ preventScroll: true })
    }
  }, [enabled])
  return ref
}

export function DeskDialog({ open = true, onClose, title, subtitle, headerExtra, footer, children, width = 760, height, zIndex = 95, closeLabel = 'Close', bodyStyle, ariaLabel, portal = true }: {
  open?: boolean
  onClose?: () => void
  title?: ReactNode
  subtitle?: ReactNode
  headerExtra?: ReactNode
  footer?: ReactNode
  children: ReactNode
  width?: number | string
  height?: number | string
  zIndex?: number
  closeLabel?: string
  bodyStyle?: CSSProperties
  ariaLabel?: string
  portal?: boolean
}) {
  const ref = useDialogFocus<HTMLDivElement>(onClose, open)
  if (!open || typeof document === 'undefined') return null
  const node = (
    <div className="ravenof-body" style={{ position: 'fixed', inset: 0, zIndex }}>
      <div className="rvn-dlg-backdrop" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)} tabIndex={-1}
        className="rvn-dlg" style={{ width, height }}>
        {(title || onClose || headerExtra) && (
          <div className="rvn-dlg-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && <h2 className="rvn-dlg-title">{title}</h2>}
              {subtitle && <div className="rvn-dlg-sub">{subtitle}</div>}
            </div>
            {headerExtra}
            {onClose && (
              <button type="button" data-dlg-close="1" className="rvn-dlg-close" onClick={onClose} aria-label={closeLabel}><X size={20} /></button>
            )}
          </div>
        )}
        <div className="rvn-dlg-body ravenof-scroll" style={bodyStyle}>{children}</div>
        {footer && <div className="rvn-dlg-foot">{footer}</div>}
      </div>
    </div>
  )
  return portal ? createPortal(node, document.body) : node
}

/** Desktop puslapio antraštė: ‹ grįžimas · pavadinimas (+ aprašas) · veiksmai dešinėje. */
export function DeskPageHeader({ title, subtitle, onBack, backLabel = 'Back', actions, style }: {
  title: ReactNode; subtitle?: ReactNode; onBack?: () => void; backLabel?: string; actions?: ReactNode; style?: CSSProperties
}) {
  return (
    <div className="flex items-center" style={{ gap: 16, minHeight: 48, marginBottom: 20, ...style }}>
      {onBack && (
        <button type="button" onClick={onBack} aria-label={backLabel} className="rvn-dlg-close ravenof-press" style={{ width: 42, height: 42 }}>
          <ChevronLeft size={22} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className="rvn-d-h1" style={{ textTransform: 'uppercase' }}>{title}</h1>
        {subtitle && <div className="rvn-d-help" style={{ marginTop: 4 }}>{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center flex-wrap" style={{ gap: 10, justifyContent: 'flex-end' }}>{actions}</div>}
    </div>
  )
}
