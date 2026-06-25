'use client'

// ── Ravenof Digital — nustatymų modalas (garsumas + efektai, su DB išsaugojimu) ─
import { useEffect, useState } from 'react'
import { Volume2, VolumeX, Music, Sparkles } from 'lucide-react'
import {
  getMusicVolume, getSfxVolume, isSummonFxEnabled,
  setMusicVolume, setSfxVolume, setSummonFxEnabled,
} from '@/lib/settings'
import { saveDigitalSettings } from '@/lib/settings-sync'
import { isUiSoundEnabled, toggleUiSound, subscribeUiSound, playUiClick } from '@/lib/ui-sound'

const ACC = '240,180,41'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [music, setMusic] = useState(0.32)
  const [sfx, setSfx] = useState(1)
  const [summon, setSummon] = useState(true)
  const [soundOn, setSoundOn] = useState(true)

  useEffect(() => {
    setMusic(getMusicVolume()); setSfx(getSfxVolume()); setSummon(isSummonFxEnabled()); setSoundOn(isUiSoundEnabled())
    return subscribeUiSound(setSoundOn)
  }, [])

  const onMusic = (v: number) => { setMusic(v); setMusicVolume(v); saveDigitalSettings() }
  const onSfx = (v: number) => { setSfx(v); setSfxVolume(v); saveDigitalSettings() }
  const onSummon = (v: boolean) => { playUiClick(); setSummon(v); setSummonFxEnabled(v); saveDigitalSettings() }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div className="relative w-[min(420px,94vw)]" style={{ borderRadius: 18, background: `rgba(${ACC},0.32)`, padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="relative px-5 py-6" style={{ borderRadius: 17, background: `radial-gradient(120% 90% at 50% 0%, rgba(${ACC},0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg,#15101f,#0a0810)` }}>
          <p className="text-lg font-bold mb-5 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>⚙️ NUSTATYMAI</p>

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

          <button onClick={() => { playUiClick(); onClose() }} className="w-full mt-6 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
            Uždaryti
          </button>
        </div>
      </div>
    </div>
  )
}
