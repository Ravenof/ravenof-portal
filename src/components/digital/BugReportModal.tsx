'use client'

// ── „Pranešti apie klaidą" – globalus sluoksnis (bet kuris ekranas, taip pat kova) ──
// Atidaromas per requestOpenBugReport(); layout'e sumontuotas <BugReportLayer/>.
// Du skirtukai: nauja forma ir „Mano pranešimai" (būsenos).
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import { RavenofBannerButton, RavenofButton } from '@/components/digital/ui/RavenofKit'
import { submitBugReport, listMyBugReports, getBugGameContext, type BugCategory, type BugSeverity, type MyBug } from '@/lib/digital/bugReport'

const OPEN_EVENT = 'rvn:open-bug-report'
export function requestOpenBugReport(): void { if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_EVENT)) }

const CATS: BugCategory[] = ['battle', 'cards', 'ui', 'auth', 'shop', 'other']
const SEVS: BugSeverity[] = ['blocker', 'major', 'normal', 'minor']
const STATUS_COLOR: Record<string, string> = { new: '#93c5fd', triaged: '#c4b5fd', in_progress: '#fbbf24', fixed: '#7bd389', wontfix: '#9ca3af', duplicate: '#9ca3af' }

export function BugReportLayer() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, on)
    return () => window.removeEventListener(OPEN_EVENT, on)
  }, [])
  if (!open) return null
  return <BugReportModal onClose={() => setOpen(false)} />
}

export function BugReportModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { desktop } = useDesktopUi()
  const k = desktop ? 1.25 : 1
  const [tab, setTab] = useState<'new' | 'mine'>('new')
  const [category, setCategory] = useState<BugCategory>(getBugGameContext() ? 'battle' : 'ui')
  const [severity, setSeverity] = useState<BugSeverity>('normal')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expected, setExpected] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [mine, setMine] = useState<MyBug[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const ctx = getBugGameContext()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => { if (tab === 'mine' && mine === null) void listMyBugReports().then(setMine) }, [tab, mine])

  const send = async () => {
    if (busy) return
    if (description.trim().length < 5) { setErr(t('bug.tooShort')); return }
    setBusy(true); setErr(null)
    try {
      const id = await submitBugReport({ category, severity, title: title.trim(), description: description.trim(), expected: expected.trim() || undefined, screenshot: file })
      setDone(id); setMine(null)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const lbl: React.CSSProperties = { font: `500 ${9 * k}px var(--ravenof-font-body)`, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)', marginBottom: 4 }
  const field: React.CSSProperties = { width: '100%', background: 'var(--ravenof-bg-elevated)', border: '1px solid var(--ravenof-border-strong)', color: 'var(--ravenof-text-primary)', padding: `${7 * k}px ${10 * k}px`, font: `400 ${12 * k}px var(--ravenof-font-body)`, outline: 'none' }
  const chip = (on: boolean): React.CSSProperties => ({ font: `700 ${9.5 * k}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase', padding: `${5 * k}px ${9 * k}px`, border: `1px solid ${on ? 'var(--ravenof-gold)' : 'var(--ravenof-border-strong)'}`, background: on ? 'rgba(240,180,41,.16)' : 'transparent', color: on ? 'var(--ravenof-gold-bright)' : 'var(--ravenof-text-secondary)', cursor: 'pointer' })

  return (
    <div role="dialog" aria-modal="true" aria-label={t('bug.title')} className="ravenof-body fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(4,3,8,0.86)', padding: 12 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col ravenof-scroll" style={{ width: 'min(680px, 100%)', maxHeight: '100%', overflowY: 'auto', background: 'var(--ravenof-bg-surface)', border: '1px solid rgba(212,163,59,0.35)', boxShadow: '0 20px 60px rgba(0,0,0,.7)', padding: `${12 * k}px ${16 * k}px`, gap: 10 * k }}>
        {/* Antraštė */}
        <div className="flex items-center" style={{ gap: 10 }}>
          <div style={{ font: `700 ${15 * k}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>🐞 {t('bug.title')}</div>
          <div className="flex" style={{ gap: 6, marginLeft: 8 }}>
            <button onClick={() => { playUiClick(); setTab('new') }} style={chip(tab === 'new')}>{t('bug.tabNew')}</button>
            <button onClick={() => { playUiClick(); setTab('mine') }} style={chip(tab === 'mine')}>{t('bug.tabMine')}</button>
          </div>
          <div className="flex-1" />
          <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="ravenof-iconbtn" style={{ fontSize: 16 * k }}>✕</button>
        </div>

        {tab === 'mine' ? (
          <div className="flex flex-col" style={{ gap: 6 }}>
            {mine === null ? <div style={{ color: 'var(--ravenof-text-secondary)', font: `400 ${12 * k}px var(--ravenof-font-body)` }}>{t('common.loading')}</div>
              : mine.length === 0 ? <div style={{ color: 'var(--ravenof-text-secondary)', font: `400 ${12 * k}px var(--ravenof-font-body)` }}>{t('bug.noneYet')}</div>
              : mine.map((b) => (
                <div key={b.id} style={{ background: 'var(--ravenof-bg-elevated)', border: '1px solid var(--ravenof-border-hairline)', padding: `${7 * k}px ${10 * k}px` }}>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <span style={{ font: `700 ${11 * k}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>#{b.id}</span>
                    <span className="flex-1 truncate" style={{ font: `700 ${12 * k}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{b.title}</span>
                    <span style={{ font: `700 ${9 * k}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase', color: STATUS_COLOR[b.status] ?? '#9ca3af' }}>{t(`bug.status.${b.status}`)}</span>
                  </div>
                  <div style={{ font: `400 ${10 * k}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', marginTop: 2 }}>
                    {new Date(b.created_at).toLocaleString('lt-LT')} · {t(`bug.cat.${b.category}`)} · {t(`bug.sev.${b.severity}`)}
                    {b.admin_note && <span style={{ color: '#f3ead3' }}> · {t('bug.adminNote')}: {b.admin_note}</span>}
                  </div>
                </div>
              ))}
          </div>
        ) : done != null ? (
          <div className="flex flex-col items-center text-center" style={{ gap: 10, padding: `${20 * k}px 0` }}>
            <div style={{ font: `700 ${18 * k}px var(--ravenof-font-display)`, color: 'var(--ravenof-gold-bright)' }}>{t('bug.sentTitle', { id: done })}</div>
            <div style={{ font: `400 ${12 * k}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', maxWidth: 420 }}>{t('bug.sentBody')}</div>
            <div className="flex" style={{ gap: 10, marginTop: 6 }}>
              <RavenofButton variant="secondary" small onClick={() => { playUiClick(); setDone(null); setTitle(''); setDescription(''); setExpected(''); setFile(null) }}>{t('bug.another')}</RavenofButton>
              <RavenofButton small onClick={() => { playUiClick(); onClose() }}>{t('common.close')}</RavenofButton>
            </div>
          </div>
        ) : (
          <>
            {ctx && (
              <div style={{ font: `400 ${10.5 * k}px var(--ravenof-font-body)`, color: '#7bd389', background: 'rgba(123,211,137,.08)', border: '1px solid rgba(123,211,137,.3)', padding: `${5 * k}px ${9 * k}px` }}>
                ⚔ {t('bug.ctxAttached', { mode: ctx.mode, turn: ctx.turn ?? '?' })}
              </div>
            )}
            <div className={desktop ? 'grid grid-cols-2' : 'grid grid-cols-1'} style={{ gap: 10 * k }}>
              <div>
                <div style={lbl}>{t('bug.category')}</div>
                <div className="flex flex-wrap" style={{ gap: 5 }}>{CATS.map((c) => <button key={c} onClick={() => { playUiClick(); setCategory(c) }} style={chip(category === c)}>{t(`bug.cat.${c}`)}</button>)}</div>
              </div>
              <div>
                <div style={lbl}>{t('bug.severity')}</div>
                <div className="flex flex-wrap" style={{ gap: 5 }}>{SEVS.map((s) => <button key={s} onClick={() => { playUiClick(); setSeverity(s) }} style={chip(severity === s)}>{t(`bug.sev.${s}`)}</button>)}</div>
              </div>
            </div>
            <div>
              <div style={lbl}>{t('bug.titleField')}</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t('bug.titlePh')} style={field} />
            </div>
            <div>
              <div style={lbl}>{t('bug.description')} *</div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} rows={desktop ? 5 : 3} placeholder={t('bug.descriptionPh')} style={{ ...field, resize: 'vertical' }} />
            </div>
            <div>
              <div style={lbl}>{t('bug.expected')}</div>
              <input value={expected} onChange={(e) => setExpected(e.target.value)} maxLength={2000} placeholder={t('bug.expectedPh')} style={field} />
            </div>
            <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <RavenofButton variant="secondary" small onClick={() => { playUiClick(); fileRef.current?.click() }}>{file ? `📎 ${file.name.slice(0, 28)}` : `📎 ${t('bug.attach')}`}</RavenofButton>
              {file && <button onClick={() => setFile(null)} style={{ background: 'none', border: 0, color: 'var(--ravenof-text-secondary)', cursor: 'pointer', font: `400 ${11 * k}px var(--ravenof-font-body)` }}>✕</button>}
              <span style={{ font: `400 ${10 * k}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('bug.autoInfo')}</span>
            </div>
            {err && <div role="alert" style={{ font: `400 ${11 * k}px var(--ravenof-font-body)`, color: 'var(--ravenof-danger-bright)' }}>{err}</div>}
            <div className="flex items-center justify-end" style={{ gap: 10 }}>
              <RavenofButton variant="secondary" small onClick={() => { playUiClick(); onClose() }}>{t('common.cancel')}</RavenofButton>
              <RavenofBannerButton disabled={busy || description.trim().length < 5} onClick={() => { playUiClick(); void send() }} style={{ minWidth: 180 * k }}>{busy ? t('bug.sending') : t('bug.send')}</RavenofBannerButton>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
