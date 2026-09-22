'use client'

// ── Paskyros ištrynimo patvirtinimas (Google Play reikalavimas) ───────────────
// Dviejų žingsnių apsauga: perskaityti kas bus ištrinta + įrašyti patvirtinimo žodį.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/react'
import { deleteMyAccount } from '@/lib/digital/account'
import { playUiClick } from '@/lib/ui-sound'

export function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const router = useRouter()
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const confirmWord = t('settings.deleteAccount.word')
  const ok = word.trim().toUpperCase() === confirmWord.toUpperCase()

  const doDelete = async () => {
    if (!ok || busy) return
    playUiClick(); setBusy(true); setErr(null)
    try {
      await deleteMyAccount()
      onClose()
      router.replace('/digital/login?deleted=1')
    } catch (e) {
      const m = (e as Error).message
      setErr(m === 'admin' ? t('settings.deleteAccount.errAdmin') : t('settings.deleteAccount.errGeneric', { msg: m }))
      setBusy(false)
    }
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="ravenof-body fixed inset-0 flex items-center justify-center" style={{ zIndex: 80, background: 'rgba(0,0,0,0.78)', padding: 16 }} onClick={() => !busy && onClose()}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 96vw)', maxHeight: '92vh', overflowY: 'auto', background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-danger)', padding: '16px 18px', animation: 'ravenofIn .25s ease' }}>
        <div style={{ font: '700 14px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-danger-bright)' }}>{t('settings.deleteAccount.title')}</div>
        <p style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.5, marginTop: 8 }}>{t('settings.deleteAccount.intro')}</p>
        <ul style={{ font: '400 11.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)', lineHeight: 1.5, marginTop: 8, paddingLeft: 18 }}>
          {[1, 2, 3, 4, 5].map((i) => <li key={i}>{t(`settings.deleteAccount.item${i}`)}</li>)}
        </ul>
        <p style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.5, marginTop: 8 }}>{t('settings.deleteAccount.keep')}</p>
        <label style={{ display: 'block', font: '600 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', marginTop: 14 }}>
          {t('settings.deleteAccount.typeWord', { word: confirmWord })}
          <input value={word} onChange={(e) => setWord(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} disabled={busy}
            style={{ display: 'block', width: '100%', marginTop: 6, padding: '9px 10px', background: 'var(--ravenof-bg-base)', border: '1px solid var(--ravenof-border-hairline)', color: 'var(--ravenof-text-primary)', font: '600 13px var(--ravenof-font-body)', letterSpacing: 2, outline: 'none' }} />
        </label>
        {err && <p style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-danger-bright)', marginTop: 8 }}>{err}</p>}
        <div className="flex" style={{ gap: 8, marginTop: 14 }}>
          <button onClick={() => { playUiClick(); onClose() }} disabled={busy} className="ravenof-btn ravenof-btn-secondary flex-1" style={{ minHeight: 38, fontSize: 11 }}>{t('common.cancel')}</button>
          <button onClick={doDelete} disabled={!ok || busy} className="ravenof-btn ravenof-btn-destructive flex-1" style={{ minHeight: 38, fontSize: 11, opacity: ok ? 1 : 0.45 }}>
            {busy ? t('settings.deleteAccount.busy') : t('settings.deleteAccount.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
