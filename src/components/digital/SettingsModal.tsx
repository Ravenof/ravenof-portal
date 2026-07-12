'use client'

// ── Ravenof Digital — nustatymai (landscape 3 zonos): kairė kategorijos ·
//    centras pasirinktos kategorijos nustatymai · dešinė profilis + veiksmai.
//    Viskas saugoma iškart (localStorage + DB sync per saveDigitalSettings).
import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, Music, Sparkles, Clapperboard, Bell, X, RotateCcw, Download, Trash2 } from 'lucide-react'
import { getMediaManifest, diffMissing, downloadMedia, cachedMediaInfo, clearMediaCache, fmtMB, type ManifestEntry, type DlProgress, type DlHandle } from '@/lib/digital/mediaDownloader'
import {
  getMusicVolume, getSfxVolume, isSummonFxEnabled,
  setMusicVolume, setSfxVolume, setSummonFxEnabled,
  isBgFxEnabled, setBgFxEnabled,
  isPremiumCinematicsEnabled, isSummonCinematicsEnabled, isChampionSkillCinematicsEnabled,
  setPremiumCinematicsEnabled, setSummonCinematicsEnabled, setChampionSkillCinematicsEnabled,
  DEFAULT_SUMMON_CINEMATICS, DEFAULT_SKILL_CINEMATICS,
  getVoiceLocale, setVoiceLocale, isVoiceFallbackLtEnabled, setVoiceFallbackLt, type VoiceLocaleSetting,
} from '@/lib/settings'
import { saveDigitalSettings } from '@/lib/settings-sync'
import { isUiSoundEnabled, toggleUiSound, subscribeUiSound, playUiClick } from '@/lib/ui-sound'
import { remindersEnabled, setRemindersEnabled, isNativeApp } from '@/lib/digital/native'
import { RvnIcon } from './ui/RvnIcon'
import { APP_VERSION } from '@/lib/version'
import { useEscClose } from '@/lib/useEscClose'
import { useT, useLocale, setLocale } from '@/lib/i18n/react'
import { LANGUAGE_OPTIONS } from '@/lib/i18n/config'
import { Languages } from 'lucide-react'

const ACC = '240,180,41'

type Profile = { name: string; level: number; pct: number; avatarUrl: string | null }
type Cat = 'audio' | 'visual' | 'content' | 'notif' | 'language'

function Row({ label, icon, on, onToggle, hint }: { label: string; icon?: React.ReactNode; on: boolean; onToggle: (v: boolean) => void; hint?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid var(--bg-border)' }}>
        <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}>{icon}{label}</span>
        <button onClick={() => onToggle(!on)} className="relative w-12 h-6 rounded-full transition-colors shrink-0"
          style={{ background: on ? `rgba(${ACC},0.4)` : 'rgba(255,255,255,0.12)' }}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ left: on ? '26px' : '2px', background: on ? 'var(--gold-bright)' : 'var(--text-muted)' }} />
        </button>
      </div>
      {hint && <p className="mt-1 px-1" style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.35 }}>{hint}</p>}
    </div>
  )
}

export function SettingsModal({ onClose, profile }: { onClose: () => void; profile?: Profile | null }) {
  useEscClose(onClose)
  const t = useT()
  const locale = useLocale()
  const [cat, setCat] = useState<Cat>('audio')
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
  const [voiceFb, setVoiceFb] = useState(true)

  useEffect(() => {
    setMusic(getMusicVolume()); setSfx(getSfxVolume()); setSummon(isSummonFxEnabled()); setSoundOn(isUiSoundEnabled())
    setCine(isPremiumCinematicsEnabled()); setCineSummon(isSummonCinematicsEnabled()); setCineSkill(isChampionSkillCinematicsEnabled())
    setReminders(remindersEnabled()); setNative(isNativeApp()); setBgFx(isBgFxEnabled())
    setVoiceLoc(getVoiceLocale()); setVoiceFb(isVoiceFallbackLtEnabled())
    return subscribeUiSound(setSoundOn)
  }, [])

  const onVoiceLoc = (v: VoiceLocaleSetting) => { setVoiceLoc(v); setVoiceLocale(v); saveDigitalSettings() }
  const onVoiceFb = (v: boolean) => { setVoiceFb(v); setVoiceFallbackLt(v); saveDigitalSettings() }
  const onMusic = (v: number) => { setMusic(v); setMusicVolume(v); saveDigitalSettings() }
  const onSfx = (v: number) => { setSfx(v); setSfxVolume(v); saveDigitalSettings() }
  const onSummon = (v: boolean) => { playUiClick(); setSummon(v); setSummonFxEnabled(v); saveDigitalSettings() }
  const onCine = (v: boolean) => { playUiClick(); setCine(v); setPremiumCinematicsEnabled(v); saveDigitalSettings() }
  const onCineSummon = (v: boolean) => { playUiClick(); setCineSummon(v); setSummonCinematicsEnabled(v); saveDigitalSettings() }
  const onCineSkill = (v: boolean) => { playUiClick(); setCineSkill(v); setChampionSkillCinematicsEnabled(v); saveDigitalSettings() }
  const onReminders = (v: boolean) => { playUiClick(); setReminders(v); void setRemindersEnabled(v) }
  const onBgFx = (v: boolean) => { playUiClick(); setBgFx(v); setBgFxEnabled(v) }

  const resetDefaults = () => {
    playUiClick()
    onMusic(0.32); onSfx(1)
    setSummon(true); setSummonFxEnabled(true)
    setCine(true); setPremiumCinematicsEnabled(true)
    setCineSummon(DEFAULT_SUMMON_CINEMATICS); setSummonCinematicsEnabled(DEFAULT_SUMMON_CINEMATICS)
    setCineSkill(DEFAULT_SKILL_CINEMATICS); setChampionSkillCinematicsEnabled(DEFAULT_SKILL_CINEMATICS)
    setBgFx(true); setBgFxEnabled(true)
    if (!isUiSoundEnabled()) toggleUiSound()
    saveDigitalSettings()
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
  useEffect(() => { if (cat === 'content' && missing === null) void refreshContent() }, [cat]) // eslint-disable-line react-hooks/exhaustive-deps
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

  const CATS: { key: Cat; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: 'audio',  label: t('settings.cat.audio'),   icon: <Volume2 className="w-4 h-4" />,  show: true },
    { key: 'visual', label: t('settings.cat.visual'),  icon: <Sparkles className="w-4 h-4" />, show: true },
    { key: 'content', label: t('settings.cat.content'), icon: <Download className="w-4 h-4" />, show: true },
    { key: 'language', label: t('settings.cat.language'), icon: <Languages className="w-4 h-4" />, show: true },
    { key: 'notif',  label: t('settings.cat.notif'),   icon: <Bell className="w-4 h-4" />,     show: native },
  ]

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2" style={{ background: 'rgba(4,3,8,0.9)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="relative w-[min(980px,98vw)] h-[min(560px,96vh)]" style={{ borderRadius: 18, background: `rgba(${ACC},0.32)`, padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col h-full" style={{ borderRadius: 17, background: `radial-gradient(120% 90% at 50% 0%, rgba(${ACC},0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg,#15101f,#0a0810)` }}>

          {/* ── Antraštė ── */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: `1px solid rgba(${ACC},0.16)` }}>
            <p className="font-bold" style={{ fontSize: 'clamp(14px,2.6vh,18px)', fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>⚙️ {t('settings.title')}</p>
            <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${ACC},0.4)`, color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
          </div>

          {/* ── 3 zonos ── */}
          <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(140px,0.75fr) minmax(0,2fr) minmax(210px,1fr)' }}>

            {/* KAIRĖ: kategorijos */}
            <div className="min-h-0 overflow-y-auto flex flex-col gap-1.5">
              {CATS.filter((c) => c.show).map((c) => (
                <button key={c.key} onClick={() => { playUiClick(); setCat(c.key) }}
                  className="rvn-press shrink-0 w-full text-left px-2.5 py-2.5 rounded-xl font-bold flex items-center gap-2"
                  style={{ fontSize: 11.5, background: cat === c.key ? `rgba(${ACC},0.18)` : 'rgba(10,8,16,0.8)', border: `1px solid ${cat === c.key ? `rgba(${ACC},0.6)` : 'rgba(255,255,255,0.08)'}`, color: cat === c.key ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* CENTRAS: nustatymai */}
            <div className="min-h-0 overflow-y-auto flex flex-col gap-3 pr-1">
              {cat === 'audio' && (
                <>
                  <button onClick={() => { const n = toggleUiSound(); if (n) playUiClick() }}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between"
                    style={{ background: soundOn ? `rgba(${ACC},0.14)` : 'rgba(10,8,16,0.7)', border: '1px solid ' + (soundOn ? `rgba(${ACC},0.45)` : 'var(--bg-border)'), color: soundOn ? 'var(--gold)' : 'var(--text-muted)' }}>
                    <span className="inline-flex items-center gap-2">{soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} {soundOn ? t('settings.soundOn') : t('settings.soundOff')}</span>
                    <span className="text-[10px]">{soundOn ? t('settings.turnOff') : t('settings.turnOn')}</span>
                  </button>
                  <div className={`space-y-4 transition-opacity ${soundOn ? '' : 'opacity-40 pointer-events-none'}`}>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}><Music className="w-4 h-4" />{t('settings.music')}</span>
                        <span className="text-xs tabular-nums" style={{ color: 'var(--gold)' }}>{Math.round(music * 100)}%</span>
                      </div>
                      <input type="range" min={0} max={100} value={Math.round(music * 100)} onChange={(e) => onMusic(Number(e.target.value) / 100)} className="w-full" style={{ accentColor: 'var(--gold)' }} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}><Volume2 className="w-4 h-4" />{t('settings.sfx')}</span>
                        <span className="text-xs tabular-nums" style={{ color: 'var(--gold)' }}>{Math.round(sfx * 100)}%</span>
                      </div>
                      <input type="range" min={0} max={100} value={Math.round(sfx * 100)} onChange={(e) => onSfx(Number(e.target.value) / 100)} className="w-full" style={{ accentColor: 'var(--gold)' }} />
                    </div>
                  </div>
                </>
              )}

              {cat === 'visual' && (
                <>
                  <Row label={t('settings.summonFx')} icon={<Sparkles className="w-4 h-4" />} on={summon} onToggle={onSummon}
                    hint={t('settings.summonFxHint')} />
                  <Row label={t('settings.bgFx')} icon={<span>🔥</span>} on={bgFx} onToggle={onBgFx}
                    hint={t('settings.bgFxHint')} />
                  <Row label={t('settings.cinematics')} icon={<Clapperboard className="w-4 h-4" />} on={cine} onToggle={onCine}
                    hint={t('settings.cinematicsHint')} />
                  <div className={`space-y-2 transition-opacity ${cine ? '' : 'opacity-40 pointer-events-none'}`}>
                    <label className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer" style={{ background: 'rgba(10,8,16,0.5)', border: '1px solid var(--bg-border)' }}>
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{t('settings.cineSummon')}</span>
                      <input type="checkbox" checked={cineSummon} onChange={(e) => onCineSummon(e.target.checked)} className="w-4 h-4 accent-yellow-400" />
                    </label>
                    <label className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer" style={{ background: 'rgba(10,8,16,0.5)', border: '1px solid var(--bg-border)' }}>
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{t('settings.cineSkill')}</span>
                      <input type="checkbox" checked={cineSkill} onChange={(e) => onCineSkill(e.target.checked)} className="w-4 h-4 accent-yellow-400" />
                    </label>
                  </div>
                </>
              )}

              {cat === 'content' && (
                <>
                  <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid var(--bg-border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}>{t('settings.contentTitle')}</p>
                    <p className="mt-1" style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{t('settings.contentInfo')} <b style={{ color: '#f3ead3' }}>{mediaInfo ? t('settings.filesCount', { count: mediaInfo.files }) : '…'}</b>{mediaInfo?.usageBytes ? ` · ${t('settings.usedSpace', { size: fmtMB(mediaInfo.usageBytes) })}` : ''}</p>
                  </div>

                  {missing === null ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>{t('settings.computing')}</p>
                  ) : dl?.running ? (
                    <div className="rounded-xl px-3 py-3" style={{ background: 'rgba(10,8,16,0.6)', border: `1px solid rgba(${ACC},0.4)` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{t('settings.downloading')}</span>
                        <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{dl.doneFiles}/{dl.totalFiles} · {fmtMB(dl.doneBytes)} / {fmtMB(dl.totalBytes)}</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${dl.totalBytes ? Math.min(100, Math.round(dl.doneBytes / dl.totalBytes * 100)) : Math.round(dl.doneFiles / Math.max(1, dl.totalFiles) * 100)}%`, background: 'linear-gradient(90deg,#ffe28c,#f3b62c)', boxShadow: `0 0 8px rgba(${ACC},0.6)`, transition: 'width .3s' }} />
                      </div>
                      {dl.failed > 0 && <p className="mt-1" style={{ fontSize: 9.5, color: '#fca5a5' }}>{t('settings.downloadFailed', { count: dl.failed })}</p>}
                      <button onClick={() => { playUiClick(); dlRef.current?.cancel() }} className="mt-2 w-full rounded-lg py-1.5 text-[11px] font-bold" style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>{t('settings.stop')}</button>
                    </div>
                  ) : missing.length === 0 ? (
                    <p className="text-sm text-center py-3 font-semibold" style={{ color: '#86efac' }}>{t('settings.allDownloaded')}{dl && !dl.running ? ` (${t('settings.filesCount', { count: dl.doneFiles })})` : ''}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button onClick={() => startDl(missingNoVideo)} disabled={missingNoVideo.length === 0}
                        className="rvn-press w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-40"
                        style={{ background: `rgba(${ACC},0.18)`, border: `1px solid rgba(${ACC},0.5)`, color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                        {t('settings.dlCardsSounds')} · {fmtMB(bytesNoVideo)} ({t('settings.filesCount', { count: missingNoVideo.length })})
                      </button>
                      <button onClick={() => startDl(missing)}
                        className="rvn-press w-full rounded-xl py-2.5 text-sm font-bold"
                        style={{ background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.45)', color: '#c4b5fd', fontFamily: 'var(--rvn-font-display)' }}>
                        {t('settings.dlAllVideo')} · {fmtMB(bytesAll)} ({t('settings.filesCount', { count: missing.length })})
                      </button>
                      <p style={{ fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{t('settings.videoHint')}</p>
                    </div>
                  )}

                  <button onClick={async () => { playUiClick(); await clearMediaCache(); setDl(null); await refreshContent() }}
                    disabled={dl?.running}
                    className="rvn-press w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold disabled:opacity-40"
                    style={{ background: 'rgba(10,8,16,0.8)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>
                    <Trash2 className="w-3.5 h-3.5" /> {t('settings.clearContent')}
                  </button>
                </>
              )}

              {cat === 'language' && (
                <div className="flex flex-col gap-2">
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const active = opt.locale === locale
                    return (
                      <button key={opt.locale} type="button" role="radio" aria-checked={active}
                        onClick={() => { if (!active) { playUiClick(); setLocale(opt.locale) } }}
                        className="rvn-press w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between"
                        style={{ background: active ? `rgba(${ACC},0.18)` : 'rgba(10,8,16,0.8)', border: `1px solid ${active ? `rgba(${ACC},0.6)` : 'rgba(255,255,255,0.08)'}`, color: active ? 'var(--gold)' : 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}>
                        <span>{opt.nativeName}</span>
                        <span className="text-[10px] uppercase tracking-wide" style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}>{opt.shortName}</span>
                      </button>
                    )
                  })}
                  {/* Fazė 7: balsų kalba (kortų/avatarų įgarsinimas) */}
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="px-1 mb-1.5 text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>{t('settings.voice.title')}</p>
                    <div className="flex gap-1.5">
                      {(['auto', 'lt', 'en'] as VoiceLocaleSetting[]).map((v) => (
                        <button key={v} type="button" onClick={() => { if (v !== voiceLoc) { playUiClick(); onVoiceLoc(v) } }}
                          className="rvn-press flex-1 px-2 py-2 rounded-lg text-[11px] font-bold"
                          style={{ background: v === voiceLoc ? `rgba(${ACC},0.18)` : 'rgba(10,8,16,0.8)', border: `1px solid ${v === voiceLoc ? `rgba(${ACC},0.6)` : 'rgba(255,255,255,0.08)'}`, color: v === voiceLoc ? 'var(--gold)' : 'var(--text-secondary)' }}>
                          {t(`settings.voice.${v}`)}
                        </button>
                      ))}
                    </div>
                    <label className="mt-1.5 flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer" style={{ background: 'rgba(10,8,16,0.7)' }}>
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{t('settings.voice.fallback')}</span>
                      <input type="checkbox" checked={voiceFb} onChange={(e) => onVoiceFb(e.target.checked)} className="w-4 h-4" />
                    </label>
                    <p className="mt-1 px-1" style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.35 }}>{t('settings.voice.hint')}</p>
                  </div>
                  <p className="mt-1 px-1" style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.35 }}>{t('settings.languageHint')}</p>
                </div>
              )}

              {cat === 'notif' && native && (
                <Row label={t('settings.reminders')} icon={<Bell className="w-4 h-4" />} on={reminders} onToggle={onReminders}
                  hint={t('settings.remindersHint')} />
              )}
            </div>

            {/* DEŠINĖ: profilis + veiksmai */}
            <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={{ background: 'rgba(10,8,16,0.6)', border: `1px solid rgba(${ACC},0.22)` }}>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {profile && (
                  <div className="flex flex-col items-center gap-2 text-center px-2 pt-2">
                    <span className="relative flex items-center justify-center shrink-0" style={{ width: 76, height: 76, borderRadius: '50%', border: `2px solid rgba(${ACC},0.65)`,
                      background: profile.avatarUrl ? `center/cover url(${profile.avatarUrl})` : 'radial-gradient(circle at 50% 32%, #3a2a4e, #0c0a14)', boxShadow: `0 0 16px rgba(${ACC},0.3), inset 0 0 8px rgba(0,0,0,0.6)` }}>
                      {!profile.avatarUrl && <RvnIcon name="avatar" size={72} round fallback={<span style={{ fontSize: 34 }}>🐦‍⬛</span>} />}
                      <span className="absolute flex items-center justify-center" style={{ bottom: -5, right: -5, minWidth: 22, height: 20, padding: '0 5px', borderRadius: 10, fontSize: 11, fontWeight: 800, fontFamily: 'var(--rvn-font-display)', background: 'linear-gradient(180deg,#1a1424,#0a0810)', border: `1px solid rgba(${ACC},0.8)`, color: `rgb(${ACC})` }}>{profile.level}</span>
                    </span>
                    <span className="block truncate w-full" style={{ fontSize: 15, fontWeight: 800, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{profile.name}</span>
                    <span className="block w-full" style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: 'inset 0 0 3px rgba(0,0,0,0.6)' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.max(3, Math.min(100, profile.pct))}%`, background: `linear-gradient(90deg, rgba(${ACC},0.75), rgb(${ACC}))`, boxShadow: `0 0 6px rgba(${ACC},0.6)` }} />
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{t('settings.levelProgress', { level: profile.level, pct: Math.round(profile.pct) })}</span>
                  </div>
                )}
                <p className="mt-3 px-1 text-center" style={{ fontSize: 9.5, color: 'rgba(150,160,185,0.5)', lineHeight: 1.4 }}>{t('settings.autoSaved')}</p>
                <p className="mt-1 text-center" style={{ fontSize: 9, color: 'rgba(150,160,185,0.4)' }}>Ravenof v{APP_VERSION}</p>
              </div>
              <div className="shrink-0 mt-2 flex flex-col gap-1.5">
                <button onClick={resetDefaults} className="rvn-press w-full flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold"
                  style={{ minHeight: 36, background: 'rgba(10,8,16,0.8)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}>
                  <RotateCcw className="w-3.5 h-3.5" /> {t('settings.resetDefaults')}
                </button>
                <button onClick={() => { playUiClick(); onClose() }} className="rvn-press w-full rounded-xl text-sm font-bold"
                  style={{ minHeight: 40, background: `rgba(${ACC},0.2)`, border: `1px solid rgba(${ACC},0.4)`, color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
