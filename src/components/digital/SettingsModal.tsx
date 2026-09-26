'use client'

// ── Ravenof Digital — nustatymai (patvirtintas UI, Fazė 2 — settings-default.png):
//    pilno ekrano overlay (rail lieka matomas), ‹ atgal + NUSTATYMAI antraštė,
//    dvi kolonos: garsas/vaizdas · kalba/paskyra/turinys + Atsijungti.
//    Visa esama logika išsaugota (localStorage + DB sync per saveDigitalSettings).
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { getMediaManifest, diffMissing, downloadMedia, cachedMediaInfo, clearMediaCache, fmtMB, type ManifestEntry, type DlProgress, type DlHandle } from '@/lib/digital/mediaDownloader'
import {
  getMusicVolume, getSfxVolume, isSummonFxEnabled, isSceneFxEnabled, setSceneFxEnabled,
  setMusicVolume, setSfxVolume, setSummonFxEnabled,
  isBgFxEnabled, setBgFxEnabled,
  isPremiumCinematicsEnabled, isSummonCinematicsEnabled, isChampionSkillCinematicsEnabled,
  setPremiumCinematicsEnabled, setSummonCinematicsEnabled, setChampionSkillCinematicsEnabled,
  DEFAULT_SUMMON_CINEMATICS, DEFAULT_SKILL_CINEMATICS,
  getVoiceLocale, setVoiceLocale, isVoiceFallbackLtEnabled, setVoiceFallbackLt, type VoiceLocaleSetting,
  getSettings, setReducedMotionEnabled, getUiScale, setUiScale,
} from '@/lib/settings'
import { saveDigitalSettings } from '@/lib/settings-sync'
import { isUiSoundEnabled, toggleUiSound, subscribeUiSound, playUiClick } from '@/lib/ui-sound'
import { remindersEnabled, setRemindersEnabled, isNativeApp } from '@/lib/digital/native'
import { createClient } from '@/lib/supabase/client'
import { APP_VERSION } from '@/lib/version'
import { requestOpenBugReport } from '@/components/digital/BugReportModal'
import { DeleteAccountModal } from '@/components/digital/DeleteAccountModal'
import { useEscClose } from '@/lib/useEscClose'
import { useT, useLocale, setLocale } from '@/lib/i18n/react'
import { LANGUAGE_OPTIONS } from '@/lib/i18n/config'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import { DT } from '@/components/digital/ui/deskTokens'
import { useDialogFocus } from '@/components/digital/ui/DeskKit'

type Profile = { name: string; level: number; pct: number; avatarUrl: string | null }


// ── Patvirtinti UI elementai ─────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  const { desktop } = useDesktopUi()
  if (desktop) return <h2 className="rvn-d-label shrink-0" style={{ margin: `${DT.sp.sm}px 0 ${DT.sp.xs}px` }}>{children}</h2>
  return <div className="shrink-0" style={{ font: '500 9px var(--ravenof-font-body)', letterSpacing: 1.5, color: 'var(--ravenof-text-secondary)', textTransform: 'uppercase' }}>{children}</div>
}

function ToggleRow({ label, on, onToggle, hint }: { label: string; on: boolean; onToggle: (v: boolean) => void; hint?: string }) {
  const { desktop } = useDesktopUi()
  if (desktop) return (
    <div className="shrink-0">
      <button onClick={() => onToggle(!on)} className="w-full flex items-center text-left" role="switch" aria-checked={on}
        style={{ gap: DT.sp.md, minHeight: 52, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: `${DT.sp.sm}px ${DT.sp.lg}px`, cursor: 'pointer' }}>
        <span className="flex-1 min-w-0" style={{ font: `500 ${DT.fs.body}px/1.35 var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{label}</span>
        <span className="shrink-0 relative" style={{ width: 46, height: 24, borderRadius: 12, background: on ? 'var(--ravenof-success)' : 'var(--ravenof-border-strong)', transition: 'background .2s' }}>
          <span style={{ position: 'absolute', top: 3, left: on ? 25 : 3, width: 18, height: 18, borderRadius: '50%', background: 'var(--ravenof-text-primary)', transition: 'left .2s' }} />
        </span>
      </button>
      {hint && <p className="rvn-d-help" style={{ margin: `${DT.sp.xs}px 2px 0` }}>{hint}</p>}
    </div>
  )
  return (
    <div className="shrink-0">
      <button onClick={() => onToggle(!on)} className="w-full flex items-center text-left" role="switch" aria-checked={on}
        style={{ gap: 10, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '10px 12px', cursor: 'pointer' }}>
        <span className="flex-1" style={{ font: '500 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>{label}</span>
        <span className="shrink-0 relative" style={{ width: 34, height: 18, borderRadius: 9, background: on ? 'var(--ravenof-success)' : 'var(--ravenof-border-strong)', transition: 'background .2s' }}>
          <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--ravenof-text-primary)', transition: 'left .2s' }} />
        </span>
      </button>
      {hint && <p style={{ font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.35, margin: '4px 2px 0' }}>{hint}</p>}
    </div>
  )
}

function Segmented<T extends string>({ options, value, onPick, big }: { options: { key: T; label: string }[]; value: T; onPick: (v: T) => void; big?: boolean }) {
  const { desktop } = useDesktopUi()
  if (desktop) return (
    <div className="flex shrink-0" role="radiogroup" style={{ border: '1px solid var(--ravenof-border-strong)' }}>
      {options.map((o) => {
        const active = o.key === value
        return (
          <button key={o.key} role="radio" aria-checked={active} onClick={() => { if (!active) { playUiClick(); onPick(o.key) } }}
            style={{ flex: 1, minWidth: 0, textAlign: 'center', minHeight: DT.ctl, padding: '0 8px', font: `700 13px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase',
              color: active ? 'var(--ravenof-on-gold)' : 'var(--ravenof-text-secondary)', background: active ? 'var(--ravenof-grad-gold)' : 'transparent',
              borderRight: '1px solid var(--ravenof-border-strong)', cursor: active ? 'default' : 'pointer' }}>{o.label}</button>
        )
      })}
    </div>
  )
  return (
    <div className="flex shrink-0" style={{ border: '1px solid var(--ravenof-border-strong)' }}>
      {options.map((o) => {
        const active = o.key === value
        return (
          <button key={o.key} onClick={() => { if (!active) { playUiClick(); onPick(o.key) } }}
            style={{ flex: 1, textAlign: 'center', padding: big ? '12px 2px' : '9px 2px', font: `700 ${big ? 12 : 10}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase',
              color: active ? 'var(--ravenof-on-gold)' : 'var(--ravenof-text-secondary)', background: active ? 'var(--ravenof-grad-gold)' : 'transparent',
              borderRight: '1px solid var(--ravenof-border-strong)', cursor: 'pointer' }}>{o.label}</button>
        )
      })}
    </div>
  )
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { desktop } = useDesktopUi()
  if (desktop) return (
    <label className="shrink-0 flex items-center" style={{ gap: DT.sp.lg, minHeight: 52, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: `${DT.sp.sm}px ${DT.sp.lg}px`, cursor: 'pointer' }}>
      <span className="flex-1 min-w-0" style={{ font: `500 ${DT.fs.body}px/1.35 var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{label}</span>
      <input type="range" min={0} max={100} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)} aria-label={label}
        style={{ accentColor: 'var(--ravenof-gold)', width: 'min(280px, 40%)', height: 24, cursor: 'pointer' }} />
      <span className="shrink-0 tabular-nums" style={{ font: `700 ${DT.fs.body}px var(--ravenof-font-body)`, color: 'var(--ravenof-gold)', width: 48, textAlign: 'right' }}>{Math.round(value * 100)}%</span>
    </label>
  )
  return (
    <div className="shrink-0 flex items-center" style={{ gap: 10, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '10px 12px' }}>
      <span className="flex-1" style={{ font: '500 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>{label}</span>
      <input type="range" min={0} max={100} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)} style={{ accentColor: 'var(--ravenof-gold)', width: 110 }} />
      <span className="shrink-0 tabular-nums" style={{ font: '700 11px var(--ravenof-font-body)', color: 'var(--ravenof-gold)', width: 34, textAlign: 'right' }}>{Math.round(value * 100)}%</span>
    </div>
  )
}

export function SettingsModal({ onClose, profile }: { onClose: () => void; profile?: Profile | null }) {
  useEscClose(onClose)
  const { desktop } = useDesktopUi()
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const [music, setMusic] = useState(0.32)
  const [sfx, setSfx] = useState(1)
  const [summon, setSummon] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [cine, setCine] = useState(true)
  const [cineSummon, setCineSummon] = useState(DEFAULT_SUMMON_CINEMATICS)
  const [cineSkill, setCineSkill] = useState(DEFAULT_SKILL_CINEMATICS)
  const [reminders, setReminders] = useState(true)
  const [native, setNative] = useState(false)
  const [bgFx, setBgFx] = useState(true)
  const [voiceLoc, setVoiceLoc] = useState<VoiceLocaleSetting>('auto')
  const [redMotion, setRedMotion] = useState(false)
  const [scale, setScale] = useState(1)
  const [voiceFb, setVoiceFb] = useState(true)
  const [sceneFx, setSceneFx] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)

  useEffect(() => {
    setMusic(getMusicVolume()); setSfx(getSfxVolume()); setSummon(isSummonFxEnabled()); setSoundOn(isUiSoundEnabled())
    setCine(isPremiumCinematicsEnabled()); setCineSummon(isSummonCinematicsEnabled()); setCineSkill(isChampionSkillCinematicsEnabled())
    setReminders(remindersEnabled()); setNative(isNativeApp()); setBgFx(isBgFxEnabled())
    setVoiceLoc(getVoiceLocale()); setVoiceFb(isVoiceFallbackLtEnabled())
    setRedMotion(getSettings().reducedMotion); setScale(getUiScale()); setSceneFx(isSceneFxEnabled())
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setEmailVerified(!!data.user?.email_confirmed_at)
    })
    return subscribeUiSound(setSoundOn)
  }, [])

  const onVoiceLoc = (v: VoiceLocaleSetting) => { setVoiceLoc(v); setVoiceLocale(v); saveDigitalSettings() }
  const onVoiceFb = (v: boolean) => { setVoiceFb(v); setVoiceFallbackLt(v); saveDigitalSettings() }
  const onMusic = (v: number) => { setMusic(v); setMusicVolume(v); saveDigitalSettings() }
  const onSfx = (v: number) => { setSfx(v); setSfxVolume(v); saveDigitalSettings() }
  const onSummon = (v: boolean) => { playUiClick(); setSummon(v); setSummonFxEnabled(v); saveDigitalSettings() }
  const onSceneFx = (v: boolean) => { playUiClick(); setSceneFx(v); setSceneFxEnabled(v); saveDigitalSettings() }
  const onCine = (v: boolean) => { playUiClick(); setCine(v); setPremiumCinematicsEnabled(v); saveDigitalSettings() }
  const onCineSummon = (v: boolean) => { playUiClick(); setCineSummon(v); setSummonCinematicsEnabled(v); saveDigitalSettings() }
  const onCineSkill = (v: boolean) => { playUiClick(); setCineSkill(v); setChampionSkillCinematicsEnabled(v); saveDigitalSettings() }
  const onReminders = (v: boolean) => { playUiClick(); setReminders(v); void setRemindersEnabled(v) }
  const onBgFx = (v: boolean) => { playUiClick(); setBgFx(v); setBgFxEnabled(v) }
  const onRedMotion = (v: boolean) => { playUiClick(); setRedMotion(v); setReducedMotionEnabled(v); saveDigitalSettings() }
  const onScale = (v: number) => { playUiClick(); setScale(v); setUiScale(v); saveDigitalSettings() }

  const resetDefaults = () => {
    playUiClick()
    onMusic(0.32); onSfx(1)
    setSummon(true); setSummonFxEnabled(true)
    setSceneFx(true); setSceneFxEnabled(true)
    setCine(true); setPremiumCinematicsEnabled(true)
    setCineSummon(DEFAULT_SUMMON_CINEMATICS); setSummonCinematicsEnabled(DEFAULT_SUMMON_CINEMATICS)
    setCineSkill(DEFAULT_SKILL_CINEMATICS); setChampionSkillCinematicsEnabled(DEFAULT_SKILL_CINEMATICS)
    setBgFx(true); setBgFxEnabled(true)
    if (!isUiSoundEnabled()) toggleUiSound()
    saveDigitalSettings()
  }

  const [delOpen, setDelOpen] = useState(false)
  // Desktop: fokuso gaudyklė + Escape (išjungta, kol atidarytas paskyros trynimo langas)
  const deskRef = useDialogFocus<HTMLDivElement>(onClose, desktop && !delOpen)
  const doLogout = async () => {
    playUiClick()
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    onClose()
    router.push('/digital/login')
  }

  // ── Žaidimo turinys (offline media) ──
  const [missing, setMissing] = useState<ManifestEntry[] | null>(null)
  const [mediaInfo, setMediaInfo] = useState<{ files: number; usageBytes: number | null } | null>(null)
  const [dl, setDl] = useState<DlProgress | null>(null)
  const dlRef = useRef<DlHandle | null>(null)
  const refreshContent = async () => {
    const [man, info] = await Promise.all([getMediaManifest(), cachedMediaInfo()])
    setMediaInfo(info)
    setMissing(await diffMissing(man))
  }
  useEffect(() => { void refreshContent() }, [])
  useEffect(() => () => { dlRef.current?.cancel() }, [])
  const startDl = (list: ManifestEntry[]) => {
    if (dl?.running || list.length === 0) return
    playUiClick()
    dlRef.current = downloadMedia(list, setDl)
    void dlRef.current.promise.then(() => refreshContent())
  }
  const missingNoVideo = (missing ?? []).filter((e) => e.tier <= 2)
  const bytesAll = (missing ?? []).reduce((s2, e) => s2 + e.bytes, 0)
  const bytesNoVideo = missingNoVideo.reduce((s2, e) => s2 + e.bytes, 0)

  const fz = (m: number, d: number) => (desktop ? d : m)
  const contentBlock = (
      <div className="shrink-0" style={{ background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: desktop ? `${DT.sp.md}px ${DT.sp.lg}px` : '10px 12px' }}>
        <p style={{ font: `400 ${fz(10.5, DT.fs.help)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', lineHeight: desktop ? 1.45 : 1.4, margin: 0 }}>{t('settings.contentInfo')} <b style={{ color: 'var(--ravenof-text-primary)' }}>{mediaInfo ? t('settings.filesCount', { count: mediaInfo.files }) : '…'}</b>{mediaInfo?.usageBytes ? ` · ${t('settings.usedSpace', { size: fmtMB(mediaInfo.usageBytes) })}` : ''}</p>
        {missing === null ? (
          <p style={{ font: `400 ${fz(10, DT.fs.help)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', marginTop: 6 }}>{t('settings.computing')}</p>
        ) : dl?.running ? (
          <div style={{ marginTop: 8 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
              <span style={{ font: `700 ${fz(10, DT.fs.label)}px var(--ravenof-font-display)`, color: 'var(--ravenof-gold)', textTransform: 'uppercase', letterSpacing: 1 }}>{t('settings.downloading')}</span>
              <span className="tabular-nums" style={{ font: `400 ${fz(9.5, DT.fs.help)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{dl.doneFiles}/{dl.totalFiles} · {fmtMB(dl.doneBytes)} / {fmtMB(dl.totalBytes)}</span>
            </div>
            <div className="ravenof-progress" style={{ height: desktop ? 6 : 4 }}>
              <span style={{ width: `${dl.totalBytes ? Math.min(100, Math.round(dl.doneBytes / dl.totalBytes * 100)) : Math.round(dl.doneFiles / Math.max(1, dl.totalFiles) * 100)}%`, background: 'var(--ravenof-grad-gold)', transition: 'width .3s' }} />
            </div>
            {dl.failed > 0 && <p style={{ font: `400 ${fz(9.5, DT.fs.help)}px var(--ravenof-font-body)`, color: 'var(--ravenof-danger-bright)', marginTop: 4 }}>{t('settings.downloadFailed', { count: dl.failed })}</p>}
            <button onClick={() => { playUiClick(); dlRef.current?.cancel() }} className="ravenof-btn ravenof-btn-destructive w-full" style={desktop ? { marginTop: 8 } : { marginTop: 8, minHeight: 32, fontSize: 10, padding: '7px 10px' }}>{t('settings.stop')}</button>
          </div>
        ) : missing.length === 0 ? (
          <p style={{ font: `600 ${fz(11, DT.fs.body)}px var(--ravenof-font-body)`, color: 'var(--ravenof-success-bright)', marginTop: 6 }}>{t('settings.allDownloaded')}{dl && !dl.running ? ` (${t('settings.filesCount', { count: dl.doneFiles })})` : ''}</p>
        ) : (
          <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
            <button onClick={() => startDl(missingNoVideo)} disabled={missingNoVideo.length === 0} className="ravenof-btn ravenof-btn-primary w-full" style={desktop ? { letterSpacing: 1 } : { minHeight: 34, fontSize: 10, letterSpacing: 1, padding: '8px 10px' }}>
              {t('settings.dlCardsSounds')} · {t('settings.remainingDl', { size: fmtMB(bytesNoVideo) })}
            </button>
            <button onClick={() => startDl(missing)} className="ravenof-btn ravenof-btn-secondary w-full" style={desktop ? undefined : { minHeight: 32, fontSize: 10, padding: '7px 10px' }}>
              {t('settings.dlAllVideo')} · {t('settings.remainingDl', { size: fmtMB(bytesAll) })}
            </button>
          </div>
        )}
        <button onClick={async () => { playUiClick(); await clearMediaCache(); setDl(null); await refreshContent() }} disabled={dl?.running}
          className="w-full ravenof-press" style={{ marginTop: 8, font: `600 ${fz(10, 13)}px var(--ravenof-font-body)`, color: 'var(--ravenof-danger-bright)', background: 'none', border: '1px solid #8D2D3855', padding: '7px 10px', minHeight: desktop ? DT.ctl : undefined, cursor: 'pointer' }}>
          {t('settings.clearContent')}
        </button>
      </div>
  )

  if (typeof document === 'undefined') return null

  // ── Desktop: overlay dešiniau rail'o, vienas centruotas skaitomas stulpelis (~820 px),
  //    sekcijos viena po kitos, valdikliai 42–52 px, etiketės 15 px, pagalba 13.5 px.
  if (desktop) {
    const panel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: DT.sp.sm }
    return createPortal(
      <div ref={deskRef} role="dialog" aria-modal="true" aria-label={t('settings.title')} tabIndex={-1} className="ravenof-body rvn-menu-bg flex flex-col"
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--rvn-rail-w)', zIndex: 60, animation: 'ravenofIn .3s ease', borderLeft: '1px solid rgba(212,163,59,0.18)', outline: 'none' }}>
        {/* Antraštė */}
        <div className="shrink-0" style={{ borderBottom: '1px solid var(--ravenof-border-hairline)', padding: `${DT.sp.lg}px var(--rvn-page-px)` }}>
          <div className="flex items-center" style={{ maxWidth: 820, margin: '0 auto', gap: DT.sp.lg }}>
            <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} data-dlg-close="1" className="rvn-dlg-close ravenof-press" style={{ width: DT.ctl, height: DT.ctl, fontSize: 22 }}>‹</button>
            <h1 className="rvn-d-h1 flex-1 min-w-0" style={{ textTransform: 'uppercase' }}>{t('settings.title')}</h1>
            <span className="rvn-d-help" style={{ color: 'rgba(150,160,185,0.7)' }}>Ravenof v{APP_VERSION}{profile ? ` · ${profile.name}` : ''}</span>
          </div>
        </div>
        {/* Turinys */}
        <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll" style={{ padding: `${DT.sp.xl}px var(--rvn-page-px) ${DT.sp.xxl}px` }}>
          <div className="flex flex-col" style={{ maxWidth: 820, margin: '0 auto', gap: DT.sp.xl }}>
            <section style={panel}>
              <SectionLabel>{t('settings.cat.audio')}</SectionLabel>
              <ToggleRow label={t('settings.soundOn')} on={soundOn} onToggle={() => { const n = toggleUiSound(); if (n) playUiClick() }} />
              <div className={soundOn ? 'flex flex-col' : 'flex flex-col opacity-40 pointer-events-none'} style={{ gap: DT.sp.sm }}>
                <SliderRow label={t('settings.music')} value={music} onChange={onMusic} />
                <SliderRow label={t('settings.sfx')} value={sfx} onChange={onSfx} />
              </div>
              {native && <ToggleRow label={t('settings.reminders')} on={reminders} onToggle={onReminders} hint={t('settings.remindersHint')} />}
            </section>

            <section style={panel}>
              <SectionLabel>{t('settings.cat.visual')}</SectionLabel>
              <ToggleRow label={t('settings.summonFx')} on={summon} onToggle={onSummon} />
              <ToggleRow label={t('settings.sceneFx')} on={sceneFx} onToggle={onSceneFx} hint={t('settings.sceneFxHint')} />
              <ToggleRow label={t('settings.bgFx')} on={bgFx} onToggle={onBgFx} />
              <ToggleRow label={t('settings.cinematics')} on={cine} onToggle={onCine} hint={t('settings.cinematicsHint')} />
              <div className={cine ? 'flex flex-col' : 'flex flex-col opacity-40 pointer-events-none'} style={{ gap: DT.sp.sm, paddingLeft: DT.sp.xl }}>
                <ToggleRow label={t('settings.cineSummon')} on={cineSummon} onToggle={onCineSummon} />
                <ToggleRow label={t('settings.cineSkill')} on={cineSkill} onToggle={onCineSkill} />
              </div>
            </section>

            <section style={panel}>
              <SectionLabel>{t('settings.cat.accessibility')}</SectionLabel>
              <ToggleRow label={t('settings.reducedMotion')} on={redMotion} onToggle={onRedMotion} hint={t('settings.reducedMotionHint')} />
              <div className="grid items-center" style={{ gridTemplateColumns: 'minmax(160px, 220px) minmax(0,1fr)', gap: DT.sp.lg, marginTop: DT.sp.xs }}>
                <span style={{ font: `500 ${DT.fs.body}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{t('settings.uiScale')}</span>
                <Segmented options={[{ key: '1', label: '100%' }, { key: '1.1', label: '110%' }, { key: '1.25', label: '125%' }]} value={String(scale)} onPick={(k) => onScale(parseFloat(k))} />
              </div>
              <div><button onClick={resetDefaults} className="rvn-d-btn rvn-d-btn-ghost" style={{ marginTop: DT.sp.sm }}>{t('settings.resetDefaults')}</button></div>
            </section>

            <section style={panel}>
              <SectionLabel>{t('settings.cat.language')}</SectionLabel>
              <Segmented big options={LANGUAGE_OPTIONS.map((o) => ({ key: o.locale, label: o.nativeName }))} value={locale} onPick={(l) => setLocale(l)} />
              <div className="grid items-center" style={{ gridTemplateColumns: 'minmax(160px, 220px) minmax(0,1fr)', gap: DT.sp.lg, marginTop: DT.sp.xs }}>
                <span style={{ font: `500 ${DT.fs.body}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{t('settings.voice.title')}</span>
                <Segmented options={(['auto', 'lt', 'en'] as VoiceLocaleSetting[]).map((v) => ({ key: v, label: t(`settings.voice.${v}`) }))} value={voiceLoc} onPick={onVoiceLoc} />
              </div>
              <ToggleRow label={t('settings.voice.fallback')} on={voiceFb} onToggle={onVoiceFb} />
            </section>

            <section style={panel}>
              <SectionLabel>{t('settings.account')}</SectionLabel>
              <div className="flex items-center" style={{ gap: DT.sp.md, minHeight: 52, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: `${DT.sp.sm}px ${DT.sp.lg}px` }}>
                <span className="flex-1 min-w-0 truncate" style={{ font: `500 ${DT.fs.body}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{email ?? (profile?.name || '—')}</span>
                {emailVerified && <span className="shrink-0" style={{ font: `600 ${DT.fs.help}px var(--ravenof-font-body)`, color: 'var(--ravenof-success)' }}>{t('settings.verified')}</span>}
              </div>
              <div className="flex items-center flex-wrap" style={{ gap: DT.sp.md, marginTop: DT.sp.xs }}>
                <button onClick={doLogout} className="rvn-d-btn rvn-d-btn-ghost">{t('more.logout')}</button>
                <button onClick={() => { playUiClick(); setDelOpen(true) }} className="rvn-d-btn rvn-d-btn-danger">{t('settings.deleteAccount.button')}</button>
              </div>
              <p className="rvn-d-help" style={{ margin: 0 }}>{t('settings.deleteAccount.buttonHint')}</p>
              {delOpen && <DeleteAccountModal onClose={() => setDelOpen(false)} />}
            </section>

            <section style={panel}>
              <SectionLabel>{t('settings.cat.content')}</SectionLabel>
              {contentBlock}
            </section>

            <div className="flex items-center flex-wrap" style={{ gap: DT.sp.md, justifyContent: 'space-between', borderTop: '1px solid var(--ravenof-border-hairline)', paddingTop: DT.sp.lg }}>
              <p className="rvn-d-help" style={{ margin: 0 }}>{t('settings.autoSaved')}</p>
              <button onClick={() => { playUiClick(); requestOpenBugReport() }} className="rvn-d-btn rvn-d-btn-ghost" style={{ color: '#7bd389', borderColor: 'rgba(123,211,137,.4)' }}>🐞 {t('bug.menuLabel')}</button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div className="ravenof-body rvn-menu-bg flex flex-col" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--rvn-rail-w)', zIndex: 60, padding: '10px 20px 12px 16px', paddingRight: 'max(20px, env(safe-area-inset-right, 0px))', animation: 'ravenofIn .3s ease', borderLeft: '1px solid rgba(212,163,59,0.18)' }}>
      {/* ── Antraštė ── */}
      <div className="flex items-center shrink-0" style={{ gap: 10, paddingBottom: 8, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="ravenof-iconbtn" style={{ fontSize: 16 }}>‹</button>
        <div style={{ font: '700 15px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('settings.title')}</div>
        <div className="flex-1" />
        <div style={{ font: '400 9px var(--ravenof-font-body)', color: 'rgba(150,160,185,0.4)' }}>Ravenof v{APP_VERSION}{profile ? ` · ${profile.name}` : ''}</div>
      </div>

      <div className="flex-1 flex min-h-0" style={{ gap: 12 }}>
        {/* ── KAIRĖ: garsas + vaizdas ── */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto ravenof-scroll flex flex-col" style={{ gap: 6, paddingRight: 2 }}>
          <SectionLabel>{t('settings.cat.audio')}</SectionLabel>
          <ToggleRow label={t('settings.soundOn')} on={soundOn} onToggle={() => { const n = toggleUiSound(); if (n) playUiClick() }} />
          <div className={soundOn ? 'flex flex-col' : 'flex flex-col opacity-40 pointer-events-none'} style={{ gap: 6 }}>
            <SliderRow label={t('settings.music')} value={music} onChange={onMusic} />
            <SliderRow label={t('settings.sfx')} value={sfx} onChange={onSfx} />
          </div>
          {native && <ToggleRow label={t('settings.reminders')} on={reminders} onToggle={onReminders} hint={t('settings.remindersHint')} />}

          <div style={{ height: 4 }} />
          <SectionLabel>{t('settings.cat.visual')}</SectionLabel>
          <ToggleRow label={t('settings.summonFx')} on={summon} onToggle={onSummon} />
          <ToggleRow label={t('settings.sceneFx')} on={sceneFx} onToggle={onSceneFx} hint={t('settings.sceneFxHint')} />
          <ToggleRow label={t('settings.bgFx')} on={bgFx} onToggle={onBgFx} />
          <ToggleRow label={t('settings.cinematics')} on={cine} onToggle={onCine} hint={t('settings.cinematicsHint')} />
          <div className={cine ? 'flex flex-col' : 'flex flex-col opacity-40 pointer-events-none'} style={{ gap: 6 }}>
            <ToggleRow label={t('settings.cineSummon')} on={cineSummon} onToggle={onCineSummon} />
            <ToggleRow label={t('settings.cineSkill')} on={cineSkill} onToggle={onCineSkill} />
          </div>
          <div style={{ height: 4 }} />
          {/* ── Prieinamumas (audit #27) ── */}
          <SectionLabel>{t('settings.cat.accessibility')}</SectionLabel>
          <ToggleRow label={t('settings.reducedMotion')} on={redMotion} onToggle={onRedMotion} hint={t('settings.reducedMotionHint')} />
          <div className="flex items-center shrink-0" style={{ gap: 8 }}>
            <span style={{ font: '500 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', whiteSpace: 'nowrap' }}>{t('settings.uiScale')}</span>
            <div className="flex-1"><Segmented options={[{ key: '1', label: '100%' }, { key: '1.1', label: '110%' }, { key: '1.25', label: '125%' }]} value={String(scale)} onPick={(k) => onScale(parseFloat(k))} /></div>
          </div>

          <button onClick={resetDefaults} className="ravenof-btn ravenof-btn-secondary shrink-0" style={{ marginTop: 4, minHeight: 36, fontSize: 10 }}>{t('settings.resetDefaults')}</button>
        </div>

        {/* ── DEŠINĖ: kalba + paskyra + turinys + atsijungti ── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col" style={{ gap: 6 }}>
          <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll flex flex-col" style={{ gap: 6, paddingRight: 2 }}>
            <SectionLabel>{t('settings.cat.language')}</SectionLabel>
            <Segmented big options={LANGUAGE_OPTIONS.map((o) => ({ key: o.locale, label: o.nativeName }))} value={locale} onPick={(l) => setLocale(l)} />
            <div className="flex items-center shrink-0" style={{ gap: 8 }}>
              <span style={{ font: '500 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', whiteSpace: 'nowrap' }}>{t('settings.voice.title')}</span>
              <div className="flex-1"><Segmented options={(['auto', 'lt', 'en'] as VoiceLocaleSetting[]).map((v) => ({ key: v, label: t(`settings.voice.${v}`) }))} value={voiceLoc} onPick={onVoiceLoc} /></div>
            </div>
            <ToggleRow label={t('settings.voice.fallback')} on={voiceFb} onToggle={onVoiceFb} />

            <div style={{ height: 4 }} />
            <SectionLabel>{t('settings.account')}</SectionLabel>
            <div className="flex items-center shrink-0" style={{ gap: 10, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '10px 12px' }}>
              <span className="flex-1 truncate" style={{ font: '500 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>{email ?? (profile?.name || '—')}</span>
              {emailVerified && <span className="shrink-0" style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-success)' }}>{t('settings.verified')}</span>}
            </div>
            {/* Paskyros ištrynimas – Google Play „Account deletion" reikalavimas */}
            <button onClick={() => { playUiClick(); setDelOpen(true) }} className="ravenof-btn ravenof-btn-destructive shrink-0" style={{ marginTop: 6, minHeight: 34, fontSize: 10, padding: '7px 10px', alignSelf: 'flex-start' }}>{t('settings.deleteAccount.button')}</button>
            <p style={{ font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', marginTop: 2 }}>{t('settings.deleteAccount.buttonHint')}</p>
            {delOpen && <DeleteAccountModal onClose={() => setDelOpen(false)} />}

            <div style={{ height: 4 }} />
            <SectionLabel>{t('settings.cat.content')}</SectionLabel>
            {contentBlock}
            <p className="shrink-0" style={{ font: '400 9.5px var(--ravenof-font-body)', color: 'rgba(150,160,185,0.5)', lineHeight: 1.4, textAlign: 'center' }}>{t('settings.autoSaved')}</p>
          </div>
          <button onClick={() => { playUiClick(); requestOpenBugReport() }} className="ravenof-press shrink-0 w-full" style={{ textAlign: 'center', font: '700 11px var(--ravenof-font-display)', letterSpacing: 1.5, color: '#7bd389', border: '1px solid rgba(123,211,137,.4)', background: 'none', padding: 11, cursor: 'pointer', textTransform: 'uppercase', marginBottom: 6 }}>🐞 {t('bug.menuLabel')}</button>
          <button onClick={doLogout} className="ravenof-press shrink-0 w-full" style={{ textAlign: 'center', font: '700 11px var(--ravenof-font-display)', letterSpacing: 1.5, color: 'var(--ravenof-danger)', border: '1px solid #8D2D3855', background: 'none', padding: 11, cursor: 'pointer', textTransform: 'uppercase' }}>{t('more.logout')}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
