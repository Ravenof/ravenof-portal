'use client'

// ── Ravenof Digital — „Daugiau" (landscape): 3 sekcijų stulpeliai su didelėmis
//    kortelėmis (Žaidimas / Bendruomenė / Paskyra) — viskas telpa be scroll.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, ClipboardList, Award, Users, Store, LogOut, Power, ChevronRight } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'
import { createClient } from '@/lib/supabase/client'
import { exitNativeApp } from '@/lib/digital/native'
import { SettingsModal } from './SettingsModal'
import { QuestsModal } from './QuestsModal'
import { SeasonPassModal } from './SeasonPassModal'
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

  const accountRows: Row[] = [
    { key: 'logout', label: 'Atsijungti', sub: 'Baigti paskyros sesiją', icon: LogOut, accent: '96,165,250', onClick: doLogout },
    { key: 'exit', label: 'Išeiti', sub: 'Uždaryti programą', icon: Power, accent: '239,68,68', onClick: () => { playUiClick(); setConfirmExit(true) } },
  ]

  const tile = (r: Row, danger = false) => {
    const Icon = r.icon
    return (
      <button key={r.key} onClick={r.onClick}
        className="rvn-press w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left"
        style={{ minHeight: 62, background: `linear-gradient(150deg, rgba(${r.accent},0.1), rgba(10,8,16,0.9))`, border: `1px solid rgba(${r.accent},0.4)` }}>
        <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 40, height: 40, background: `rgba(${r.accent},0.14)`, border: `1px solid rgba(${r.accent},0.45)` }}>
          {r.img ? <RvnIcon name={r.img} size={28} fallback={<Icon className="w-5 h-5" style={{ color: `rgb(${r.accent})` }} />} /> : <Icon className="w-5 h-5" style={{ color: `rgb(${r.accent})` }} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold truncate" style={{ color: danger ? '#fca5a5' : '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{r.label}</span>
          {r.sub && <span className="block text-[10.5px] truncate" style={{ color: 'var(--text-muted)' }}>{r.sub}</span>}
        </span>
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
      </button>
    )
  }

  const PANEL: React.CSSProperties = { background: 'linear-gradient(160deg, rgba(20,16,28,0.96), rgba(9,7,12,0.98))', border: '1px solid rgba(240,180,41,0.22)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }

  return (
    <div className="h-full flex flex-col min-h-0" style={{ gap: 'clamp(4px,1vh,10px)' }}>
      <div className="text-center shrink-0">
        <div className="rvn-disp font-black uppercase leading-none" style={{ fontSize: 'clamp(16px,3.2vh,28px)', color: 'var(--gold)', letterSpacing: '0.04em' }}>Daugiau</div>
        <div style={{ fontSize: 'clamp(9px,1.4vh,12px)', color: 'var(--text-muted)' }}>Nustatymai, bendruomenė ir paskyra</div>
      </div>

      <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        {[...sections, { title: 'Paskyra', rows: accountRows }].map((sec) => (
          <section key={sec.title} className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={PANEL}>
            <p className="shrink-0 rvn-disp font-extrabold uppercase tracking-wide mb-2" style={{ fontSize: 'clamp(10px,1.5vh,13px)', color: 'var(--gold)' }}>{sec.title}</p>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5">
              {sec.rows.map((r) => tile(r, sec.title === 'Paskyra' && r.key === 'exit'))}
            </div>
          </section>
        ))}
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
