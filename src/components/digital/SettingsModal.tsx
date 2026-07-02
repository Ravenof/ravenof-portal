'use client'

// ── Ravenof Digital — nustatymų modalas (garsumas + efektai, su DB išsaugojimu) ─
import { useEffect, useState } from 'react'
import { Volume2, VolumeX, Music, Sparkles, Clapperboard, Bell } from 'lucide-react'
import {
  getMusicVolume, getSfxVolume, isSummonFxEnabled,
  setMusicVolume, setSfxVolume, setSummonFxEnabled,
  isPremiumCinematicsEnabled, isSummonCinematicsEnabled, isChampionSkillCinematicsEnabled,
  setPremiumCinematicsEnabled, setSummonCinematicsEnabled, setChampionSkillCinematicsEnabled,
  DEFAULT_SUMMON_CINEMATICS, DEFAULT_SKILL_CINEMATICS,
} from '@/lib/settings'
import { saveDigitalSettings } from '@/lib/settings-sync'
import { isUiSoundEnabled, toggleUiSound, subscribeUiSound, playUiClick } from '@/lib/ui-sound'
import { remindersEnabled, setRemindersEnabled, isNativeApp } from '@/lib/digital/native'
import { RvnIcon } from './ui/RvnIcon'

const ACC = '240,180,41'

type Profile = { name: string; level: number; pct: number; avatarUrl: string | null }

export function SettingsModal({ onClose, profile }: { onClose: () => void; profile?: Profile | null }) {
  const [music, setMusic] = useState(0.32)
  const [sfx, setSfx] = useState(1)
  const [summon, setSummon] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  const [cine, setCine] = useState(true)
  const [cineSummon, setCineSummon] = useState(DEFAULT_SUMMON_CINEMATICS)
  const [cineSkill, setCineSkill] = useState(DEFAULT_SKILL_CINEMATICS)
  const [reminders, setReminders] = useState(true)
  const [native, setNative] = useState(false)

  useEffect(() => {
    setMusic(getMusicVolume()); setSfx(getSfxVolume()); setSummon(isSummonFxEnabled()); setSoundOn(isUiSoundEnabled())
    setCine(isPremiumCinematicsEnabled()); setCineSummon(isSummonCinematicsEnabled()); setCineSkill(isChampionSkillCinematicsEnabled())
    setReminders(remindersEnabled()); setNative(isNativeApp())
    return subscribeUiSound(setSoundOn)
  }, [])

  const onMusic = (v: number) => { setMusic(v); setMusicVolume(v); saveDigitalSettings() }
  const onSfx = (v: number) => { setSfx(v); setSfxVolume(v); saveDigitalSettings() }
  const onSummon = (v: boolean) => { playUiClick(); setSummon(v); setSummonFxEnabled(v); saveDigitalSettings() }
  const onCine = (v: boolean) => { playUiClick(); setCine(v); setPremiumCinematicsEnabled(v); saveDigitalSettings() }
  const onCineSummon = (v: boolean) => { playUiClick(); setCineSummon(v); setSummonCinematicsEnabled(v); saveDigitalSettings() }
  const onCineSkill = (v: boolean) => { playUiClick(); setCineSkill(v); setChampionSkillCinematicsEnabled(v); saveDigitalSettings() }
  const onReminders = (v: boolean) => { playUiClick(); setReminders(v); void setRemindersEnabled(v) }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div className="relative w-[min(420px,94vw)]" style={{ borderRadius: 18, background: `rgba(${ACC},0.32)`, padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="relative px-5 py-6" style={{ borderRadius: 17, maxHeight: '86vh', overflowY: 'auto', background: `radial-gradient(120% 90% at 50% 0%, rgba(${ACC},0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg,#15101f,#0a0810)` }}>
          <p className="text-lg font-bold mb-4 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>⚙️ NUSTATYMAI</p>

          {/* Žaidėjo profilis */}
          {profile && (
            <div className="mb-5 flex items-center gap-3 px-3.5 py-3 rounded-2xl" style={{ background: `radial-gradient(120% 120% at 0% 0%, rgba(${ACC},0.16), transparent 55%), rgba(10,8,16,0.7)`, border: `1px solid rgba(${ACC},0.35)` }}>
              <span className="relative flex items-center justify-center shrink-0" style={{ width: 52, height: 52, borderRadius: '50%', border: `1.5px solid rgba(${ACC},0.65)`,
                background: profile.avatarUrl ? `center/cover url(${profile.avatarUrl})` : 'radial-gradient(circle at 50% 32%, #3a2a4e, #0c0a14)', boxShadow: `0 0 12px rgba(${ACC},0.3), inset 0 0 8px rgba(0,0,0,0.6)` }}>
                {!profile.avatarUrl && <RvnIcon name="avatar" size={50} round fallback={<span style={{ fontSize: 24 }}>🐦‍⬛</span>} />}
                <span className="absolute flex items-center justify-center" style={{ bottom: -5, right: -5, minWidth: 20, height: 18, padding: '0 4px', borderRadius: 9, fontSize: 10.5, fontWeight: 800, fontFamily: 'var(--rvn-font-display)', background: 'linear-gradient(180deg,#1a1424,#0a0810)', border: `1px solid rgba(${ACC},0.8)`, color: `rgb(${ACC})` }}>{profile.level}</span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate" style={{ fontSize: 15, fontWeight: 800, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{profile.name}</span>
                <span className="block" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Lygis {profile.level}</span>
                <span className="block mt-1.5" style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: 'inset 0 0 3px rgba(0,0,0,0.6)' }}>
                  <span style={{ display: 'block', height: '100%', width: `${Math.max(3, Math.min(100, profile.pct))}%`, background: `linear-gradient(90deg, rgba(${ACC},0.75), rgb(${ACC}))`, boxShadow: `0 0 6px rgba(${ACC},0.6)` }} />
                </span>
              </span>
            </div>
          )}

          {/* Bendras garso jungiklis */}
          <button onClick={() => { const n = toggleUiSound(); if (n) playUiClick() }}
            className="w-full mb-4 px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-all hover:scale-[1.01]"
            style={{ background: soundOn ? 'rgba(240,180,41,0.14)' : 'rgba(10,8,16,0.7)', border: '1px solid ' + (soundOn ? 'rgba(240,180,41,0.45)' : 'var(--bg-border)'), color: soundOn ? 'var(--gold)' : 'var(--text-muted)' }}>
            <span className="inline-flex items-center gap-2">{soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />} Garsas {soundOn ? 'įjungtas' : 'išjungtas'}</span>
            <span className="text-[10px]">{soundOn ? 'IŠJUNGTI' : 'ĮJUNGTI'}</span>
          </button>

          <div className={`space-y-5 transition-opacity ${soundOn ? '' : 'opacity-40 pointer-events-none'}`}>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}><Music className="w-4 h-4" />Muzika</span>
                <span className="text-xs tabular-nums" style={{ color: 'var(--gold)' }}>{Math.round(music * 100)}%</span>
              </div>
              <input type="range" min={0} max={100} value={Math.round(music * 100)} onChange={(e) => onMusic(Number(e.target.value) / 100)} className="w-full" style={{ accentColor: 'var(--gold)' }} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}><Volume2 className="w-4 h-4" />Garso efektai</span>
                <span className="text-xs tabular-nums" style={{ color: 'var(--gold)' }}>{Math.round(sfx * 100)}%</span>
              </div>
              <input type="range" min={0} max={100} value={Math.round(sfx * 100)} onChange={(e) => onSfx(Number(e.target.value) / 100)} className="w-full" style={{ accentColor: 'var(--gold)' }} />
            </div>
          </div>

          {/* Summon efektų jungiklis */}
          <div className="mt-5 flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid var(--bg-border)' }}>
            <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}><Sparkles className="w-4 h-4" />Iškvietimo efektai</span>
            <button onClick={() => onSummon(!summon)} className="relative w-12 h-6 rounded-full transition-colors"
              style={{ background: summon ? 'rgba(240,180,41,0.4)' : 'rgba(255,255,255,0.12)' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ left: summon ? '26px' : '2px', background: summon ? 'var(--gold-bright)' : 'var(--text-muted)' }} />
            </button>
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Išjungus, kovose nerodomi padarų iškvietimo vizualiniai efektai (geriau silpnesniems įrenginiams).</p>

          {/* Premium kino pop-up jungiklis */}
          <div className="mt-4 flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid var(--bg-border)' }}>
            <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}><Clapperboard className="w-4 h-4" />Kino pop-up</span>
            <button onClick={() => onCine(!cine)} className="relative w-12 h-6 rounded-full transition-colors"
              style={{ background: cine ? 'rgba(240,180,41,0.4)' : 'rgba(255,255,255,0.12)' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ left: cine ? '26px' : '2px', background: cine ? 'var(--gold-bright)' : 'var(--text-muted)' }} />
            </button>
          </div>
          <div className={`mt-2 space-y-2 transition-opacity ${cine ? '' : 'opacity-40 pointer-events-none'}`}>
            <label className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer" style={{ background: 'rgba(10,8,16,0.5)', border: '1px solid var(--bg-border)' }}>
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Iškvietimo (Legendinis / Čempionas)</span>
              <input type="checkbox" checked={cineSummon} onChange={(e) => onCineSummon(e.target.checked)} className="w-4 h-4 accent-yellow-400" />
            </label>
            <label className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer" style={{ background: 'rgba(10,8,16,0.5)', border: '1px solid var(--bg-border)' }}>
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Čempiono skill</span>
              <input type="checkbox" checked={cineSkill} onChange={(e) => onCineSkill(e.target.checked)} className="w-4 h-4 accent-yellow-400" />
            </label>
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Trumpas (2–3 s) kino pop-up iškviečiant Legendinį/Čempioną ar panaudojus Čempiono skill. Praleidžiamas bakstelėjus.</p>

          {native && (
            <>
              <div className="mt-4 flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid var(--bg-border)' }}>
                <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}><Bell className="w-4 h-4" />Priminimai</span>
                <button onClick={() => onReminders(!reminders)} className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ background: reminders ? 'rgba(240,180,41,0.4)' : 'rgba(255,255,255,0.12)' }}>
                  <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ left: reminders ? '26px' : '2px', background: reminders ? 'var(--gold-bright)' : 'var(--text-muted)' }} />
                </button>
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Kasdienis priminimas apie dienos atlygį ir kovą, kad neprarastum serijos. Notifikacijos rodomos tik telefone.</p>
            </>
          )}

          <button onClick={() => { playUiClick(); onClose() }} className="w-full mt-6 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
            Uždaryti
          </button>
        </div>
      </div>
    </div>
  )
}
