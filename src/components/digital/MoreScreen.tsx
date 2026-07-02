'use client'

// ── Ravenof Digital — „Daugiau" ekranas (nustatymai, socialinė, atsijungti, išeiti) ──
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, ClipboardList, Award, Users, Store, LogOut, Power, ChevronRight } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'
import { createClient } from '@/lib/supabase/client'
import { exitNativeApp } from '@/lib/digital/native'
import { SettingsModal } from './SettingsModal'
import { QuestsModal } from './QuestsModal'
import { SeasonPassModal } from './SeasonPassModal'
import { PageHero } from './ui/HubKit'
import { RvnIcon } from './ui/RvnIcon'

type Row = { key: string; label: string; sub?: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; img?: string; accent: string; onClick: () => void }

export function MoreScreen() {
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [questsOpen, setQuestsOpen] = useState(false)
  const [seasonOpen, setSeasonOpen] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [exitMsg, setExitMsg] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const doLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true); playUiClick()
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    router.push('/login?next=/digital')
  }

  const doExit = async () => {
    playUiClick()
    const ok = await exitNativeApp()
    if (!ok) { setConfirmExit(false); setExitMsg('Programos uždaryti automatiškai nepavyko. Uždarykite ją telefono navigacija.') }
  }

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Žaidimas',
      rows: [
        { key: 'settings', label: 'Nustatymai', sub: 'Garsas, muzika, efektai', icon: Settings, img: 'fi-settings', accent: '240,180,41', onClick: () => { playUiClick(); setSettingsOpen(true) } },
        { key: 'quests', label: 'Užduotys', sub: 'Dienos užduotys ir serija', icon: ClipboardList, img: 'fi-quests', accent: '139,92,246', onClick: () => { playUiClick(); setQuestsOpen(true) } },
        { key: 'season', label: 'Sezono kelias', sub: 'Pakopos ir apdovanojimai', icon: Award, img: 'fi-season', accent: '240,180,41', onClick: () => { playUiClick(); setSeasonOpen(true) } },
      ],
    },
    {
      title: 'Bendruomenė',
      rows: [
        { key: 'friends', label: 'Draugai', sub: 'Žinutės, mainai, kvietimai', icon: Users, accent: '96,165,250', onClick: () => { playUiClick(); router.push('/digital/friends') } },
        { key: 'market', label: 'Aukcionas', sub: 'Pirk ir parduok kortas', icon: Store, img: 'fi-shop', accent: '146,84,40', onClick: () => { playUiClick(); router.push('/market') } },
      ],
    },
  ]

  return (
    <div className="space-y-5">
      <PageHero compact iconName="nav-more" icon={<span style={{ fontSize: 26 }}>☰</span>} title="DAUGIAU" sub="Nustatymai, bendruomenė ir paskyra" />

      {sections.map((sec) => (
        <div key={sec.title} className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.16em' }}>{sec.title}</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.18)', background: 'rgba(10,8,16,0.7)' }}>
            {sec.rows.map((r, i) => {
              const Icon = r.icon
              return (
                <button key={r.key} onClick={r.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(240,180,41,0.1)' }}>
                  <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 36, height: 36, background: `rgba(${r.accent},0.14)`, border: `1px solid rgba(${r.accent},0.4)` }}>
                    {r.img ? <RvnIcon name={r.img} size={26} fallback={<Icon className="w-5 h-5" style={{ color: `rgb(${r.accent})` }} />} /> : <Icon className="w-5 h-5" style={{ color: `rgb(${r.accent})` }} />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{r.label}</span>
                    {r.sub && <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>{r.sub}</span>}
                  </span>
                  <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Paskyra */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.16em' }}>Paskyra</p>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.18)', background: 'rgba(10,8,16,0.7)' }}>
          {/* Atsijungti */}
          <button onClick={doLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5">
            <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 36, height: 36, background: 'rgba(96,165,250,0.14)', border: '1px solid rgba(96,165,250,0.4)' }}>
              <LogOut className="w-5 h-5" style={{ color: '#60a5fa' }} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>Atsijungti</span>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Baigti paskyros sesiją</span>
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
          {/* Išeiti */}
          <button onClick={() => { playUiClick(); setConfirmExit(true) }} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5" style={{ borderTop: '1px solid rgba(240,180,41,0.1)' }}>
            <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.45)' }}>
              <Power className="w-5 h-5" style={{ color: '#fca5a5' }} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold" style={{ color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>Išeiti</span>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Uždaryti programą</span>
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Patvirtinimas: Išeiti */}
      {confirmExit && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setConfirmExit(false)}>
          <div className="w-[min(340px,92vw)] rounded-2xl p-5 text-center" style={{ border: '1px solid rgba(239,68,68,0.4)', background: 'linear-gradient(160deg,#17111f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#fca5a5' }}>Ar tikrai nori išeiti?</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Programa bus uždaryta.</p>
            <div className="flex gap-2">
              <button onClick={() => { playUiClick(); setConfirmExit(false) }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--text-secondary)' }}>Atšaukti</button>
              <button onClick={doExit} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.6)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>Išeiti</button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback žinutė (jei uždaryti nepavyko) */}
      {exitMsg && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setExitMsg(null)}>
          <div className="w-[min(340px,92vw)] rounded-2xl p-5 text-center" style={{ border: '1px solid rgba(240,180,41,0.4)', background: 'linear-gradient(160deg,#17111f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{exitMsg}</p>
            <button onClick={() => { playUiClick(); setExitMsg(null) }} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.45)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Supratau</button>
          </div>
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {questsOpen && <QuestsModal onClose={() => setQuestsOpen(false)} />}
      {seasonOpen && <SeasonPassModal onClose={() => setSeasonOpen(false)} />}
    </div>
  )
}
