'use client'
// ── Admin: kas dabar prisijungęs (pagrindinio meniu viršuje) ─────────────────
// Rodoma TIK profiles.role='admin'. Šaltinis – rvn_admin_online_players (RPC tikrina
// is_admin(), tad ne adminui grąžina {error}). Atsinaujina kas 30 s. Paspaudus –
// išsiskleidžia sąrašas: vardas, platforma, app versija, kada paskutinį kartą matytas.
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAccount } from '@/lib/digital/accountStore'
import { playUiClick } from '@/lib/ui-sound'

type OnlinePlayer = {
  id: string; username: string | null; displayName: string | null; avatar: string | null; role: string | null
  platform: string | null; version: string | null; presence: string | null; secondsAgo: number
}

const PLATFORM_ICON: Record<string, string> = { web: '🌐', desktop: '🖥', android: '📱', ios: '📱' }
const ago = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)} min`)

export function AdminOnlineBar() {
  const role = useAccount((s) => s.profile?.role)
  const [count, setCount] = useState<number | null>(null)
  const [players, setPlayers] = useState<OnlinePlayer[]>([])
  const [open, setOpen] = useState(false)
  const isAdmin = role === 'admin'

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await createClient().rpc('rvn_admin_online_players', { p_minutes: 3 })
      if (error || !data || (data as { error?: string }).error) return
      const d = data as { count: number; players: OnlinePlayer[] }
      setCount(d.count ?? 0); setPlayers(d.players ?? [])
    } catch { /* tinklas – tyliai */ }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    void refresh()
    const i = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 30_000)
    return () => window.clearInterval(i)
  }, [isAdmin, refresh])

  if (!isAdmin || count === null) return null
  return (
    <div className="ravenof-body" style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pointerEvents: 'none' }}>
      <button type="button" onClick={() => { playUiClick(); setOpen((v) => !v); void refresh() }} title="Prisijungę žaidėjai (admin)"
        className="ravenof-press rvn-admin-online" style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '4px 12px', border: '1px solid rgba(123,211,137,.55)', background: 'rgba(7,6,10,.82)', color: '#cfe9d4', font: '700 10.5px var(--ravenof-font-body)', letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(4px)', clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
        <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: '#7bd389', boxShadow: '0 0 8px #7bd389' }} />
        Online: <b style={{ color: '#fff' }}>{count}</b>
        <span aria-hidden style={{ opacity: .7 }}>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div role="list" style={{ pointerEvents: 'auto', width: 'min(420px, 92vw)', maxHeight: '48vh', overflowY: 'auto', background: 'rgba(7,6,10,.94)', border: '1px solid rgba(212,163,59,.35)', boxShadow: '0 14px 40px rgba(0,0,0,.6)', padding: 6 }} className="ravenof-scroll">
          {players.length === 0 && <div style={{ padding: 10, font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>Šiuo metu niekas neprisijungęs.</div>}
          {players.map((p) => (
            <div key={p.id} role="listitem" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
              <span style={{ width: 26, height: 26, flex: '0 0 26px', borderRadius: '50%', overflow: 'hidden', background: '#1a1325', border: '1px solid rgba(212,163,59,.35)', display: 'grid', placeItems: 'center', fontSize: 13 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.avatar ? <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span aria-hidden>{PLATFORM_ICON[p.platform ?? ''] ?? '•'}</span>}
              </span>
              <span style={{ flex: 1, minWidth: 0, font: '600 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.displayName || p.username || p.id.slice(0, 8)}
                {p.role && p.role !== 'user' && <span style={{ marginLeft: 6, font: '700 8.5px var(--ravenof-font-body)', letterSpacing: 1, textTransform: 'uppercase', color: '#7bd389' }}>{p.role}</span>}
              </span>
              <span style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', whiteSpace: 'nowrap' }}>
                {PLATFORM_ICON[p.platform ?? ''] ?? ''} {p.platform ?? '—'} · v{p.version ?? '—'} · {ago(p.secondsAgo)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
