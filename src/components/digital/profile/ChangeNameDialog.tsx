'use client'
// ── Vardo keitimas: kartą per 30 d., ankstesnis vardas rodomas 60 d. ─────────
// Visos taisyklės tikrinamos serveryje (rvn_change_name); čia – tik UI.
import { useState } from 'react'
import { useT, useLocale } from '@/lib/i18n/react'
import { playUiClick, playError } from '@/lib/ui-sound'
import { DeskDialog } from '../ui/DeskKit'
import { RavenofTextField } from '../ui/RavenofKit'
import { changeName, NAME_RE, type NameInfo } from '@/lib/profile/client'
import { useAccount } from '@/lib/digital/accountStore'

export function ChangeNameDialog({ info, onClose, onChanged }: { info: NameInfo | null; onClose: () => void; onChanged: () => void }) {
  const t = useT()
  const locale = useLocale()
  const [name, setName] = useState(info?.name ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'lt-LT', { year: 'numeric', month: 'long', day: 'numeric' })
  const locked = !!info?.nextChangeAt && new Date(info.nextChangeAt).getTime() > Date.now()
  const trimmed = name.trim()
  const valid = NAME_RE.test(trimmed) && trimmed !== (info?.name ?? '')

  const submit = async () => {
    if (!valid || busy || locked) return
    if (!confirm) { playUiClick(); setConfirm(true); return }
    setBusy(true); setErr('')
    const r = await changeName(trimmed)
    setBusy(false)
    if ('err' in r) {
      playError(); setConfirm(false)
      setErr(r.err === 'cooldown' && r.until ? t('profile.name.err.cooldown', { date: fmtDate(r.until) }) : t(`profile.name.err.${r.err}`))
      return
    }
    playUiClick()
    void useAccount.getState().refresh({ force: true })
    onChanged()
  }

  return (
    <DeskDialog title={t('profile.name.title')} onClose={onClose} closeLabel={t('common.close')} width="min(94vw, 480px)" zIndex={120}
      footer={<>
        <button type="button" className="ravenof-btn ravenof-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
        <button type="button" className="ravenof-btn ravenof-btn-primary" data-testid="name-save" disabled={!valid || busy || locked} onClick={() => void submit()}>
          {confirm ? t('profile.name.confirm') : t('profile.name.save')}
        </button>
      </>}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <p style={{ margin: 0, font: '400 14px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.5 }}>{t('profile.name.rules')}</p>
        {locked && info?.nextChangeAt ? (
          <p role="status" style={{ margin: 0, font: '600 14px var(--ravenof-font-body)', color: 'var(--ravenof-gold)' }}>{t('profile.name.lockedUntil', { date: fmtDate(info.nextChangeAt) })}</p>
        ) : (
          <>
            <RavenofTextField value={name} maxLength={20} autoFocus data-testid="name-input" aria-label={t('profile.name.label')} placeholder={t('profile.name.label')}
              onChange={(e) => { setName(e.target.value.replace(/\s/g, '')); setConfirm(false); setErr('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
              aria-invalid={trimmed.length > 0 && !NAME_RE.test(trimmed)}
              style={{ height: 46, font: '700 17px var(--ravenof-font-display)', letterSpacing: 1 }} />
            <p style={{ margin: 0, font: '400 12.5px var(--ravenof-font-body)', color: trimmed.length > 0 && !NAME_RE.test(trimmed) ? '#c65563' : 'var(--ravenof-text-secondary)' }}>{t('profile.name.format')}</p>
            {confirm && valid && (
              <p role="status" style={{ margin: 0, font: '600 13.5px var(--ravenof-font-body)', color: 'var(--ravenof-gold)', lineHeight: 1.45 }}>
                {t('profile.name.confirmText', { old: info?.name ?? '', name: trimmed })}
              </p>
            )}
          </>
        )}
        {info?.previousName && (
          <p style={{ margin: 0, font: '400 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>
            {t('profile.name.previousShown', { name: info.previousName, date: info.previousUntil ? fmtDate(info.previousUntil) : '—' })}
          </p>
        )}
        {err && <p role="alert" style={{ margin: 0, font: '600 13.5px var(--ravenof-font-body)', color: '#c65563' }}>{err}</p>}
      </div>
    </DeskDialog>
  )
}
