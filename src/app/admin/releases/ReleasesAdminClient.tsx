'use client'

// ── Admin: release kanalai (admin → tester → stable), rollback, vartai ────────
// Visi veiksmai – SECURITY DEFINER RPC su is_admin() patikra (migr. 20260918_app_releases.sql)
// ir įrašomi į app_release_log. Šis ekranas pats nieko nerašo į lenteles tiesiogiai.
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import { APP_VERSION } from '@/lib/version'

type ChannelKey = 'admin' | 'tester' | 'stable'
type BundleRef = { id: number; version: string; status: 'active' | 'revoked'; created_at?: string }
type ChannelRow = { channel: ChannelKey; mandatory: boolean; updated_at: string; updated_by: string | null; bundle: BundleRef | null; previous: BundleRef | null; players_24h: number; bugs_24h: number; rollbacks_24h: number }
type BundleRow = { id: number; version: string; git_sha: string | null; files_count: number; size_bytes: number; engine_version: number; min_shell_android: string | null; min_shell_desktop: string | null; requires_migration: string | null; notes_lt: string | null; notes_en: string | null; status: 'active' | 'revoked'; created_at: string; players_7d: number; bugs_total: number; rollbacks_total: number; applied_total: number }
type Config = { maintenance: boolean; maintenance_message_lt: string | null; maintenance_message_en: string | null; min_shell_android: string | null; min_shell_desktop: string | null; shell_url_android: string | null; shell_url_desktop: string | null; pvp_server_url: string | null; flags: Record<string, boolean> }
type LogRow = { id: number; action: string; channel: string | null; reason: string | null; at: string; from_version: string | null; to_version: string | null; actor: string | null }
type Overview = { config: Config; my_channel: ChannelKey; channels: ChannelRow[]; bundles: BundleRow[]; adoption: { platform: string; version: string; players_24h: number; players_7d: number }[]; overrides: { user_id: string; username: string; channel: ChannelKey; note: string | null }[]; log: LogRow[] }

const CH_LABEL: Record<ChannelKey, string> = { admin: 'ADMIN', tester: 'TESTER', stable: 'STABLE (visi žaidėjai)' }
const CH_COLOR: Record<ChannelKey, string> = { admin: '#c4b5fd', tester: '#93c5fd', stable: '#86efac' }
const FLAGS = ['pvp_enabled', 'ranked_enabled', 'shop_enabled', 'pack_open_enabled', 'chat_enabled'] as const

const card: CSSProperties = { background: 'rgba(10,8,16,0.6)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: '1rem' }
const btn: CSSProperties = { padding: '0.45rem 0.85rem', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const bGreen: CSSProperties = { ...btn, background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac' }
const bRed: CSSProperties = { ...btn, background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }
const bGrey: CSSProperties = { ...btn, background: 'rgba(120,120,140,0.18)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }
const input: CSSProperties = { padding: '0.4rem 0.55rem', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', fontSize: 12, width: '100%' }
const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`
const when = (s?: string | null) => (s ? new Date(s).toLocaleString('lt-LT', { dateStyle: 'short', timeStyle: 'short' }) : '—')

export function ReleasesAdminClient() {
  const supabase = createClient()
  const [ov, setOv] = useState<Overview | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [cfg, setCfg] = useState<Config | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('rvn_admin_release_overview')
    if (error) { setErr(error.message.includes('rvn_admin_release_overview') ? 'Migracija 20260918_app_releases.sql dar nepritaikyta.' : error.message); return }
    setErr(null); setOv(data as Overview); setCfg((data as Overview).config)
  }, [supabase])
  useEffect(() => { void refresh() }, [refresh])

  const run = async (label: string, fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true); setMsg(null)
    const { error } = await fn()
    setBusy(false)
    setMsg(error ? `KLAIDA: ${error.message}` : `✓ ${label}`)
    void refresh()
  }

  const promote = (to: 'tester' | 'stable', version: string) => {
    if (to === 'stable') {
      const typed = window.prompt(`Bundle'as ${version} pasieks VISUS žaidėjus.\nPatvirtinimui įvesk versijos numerį:`)
      if (typed?.trim() !== version) { if (typed !== null) setMsg('Versija nesutapo – nieko nepakeista.'); return }
    } else if (!window.confirm(`Kelti ${version} testeriams?`)) return
    const reason = window.prompt('Pastaba (kas patikrinta):', to === 'tester' ? 'Smoke checklist OK' : '24 h be kritinių klaidų') ?? ''
    void run(`${version} → ${to}`, () => supabase.rpc('rvn_admin_release_promote', { p_to: to, p_reason: reason, p_mandatory: false }))
  }
  const rollback = (ch: ChannelRow) => {
    if (!ch.previous) return
    const reason = window.prompt(`ROLLBACK kanalui „${ch.channel}": ${ch.bundle?.version} → ${ch.previous.version}.\nKlientai bus priverstinai grąžinti. Priežastis (privaloma):`)
    if (!reason || reason.trim().length < 3) { if (reason !== null) setMsg('Reikia priežasties.'); return }
    void run(`Rollback ${ch.channel} → ${ch.previous.version}`, () => supabase.rpc('rvn_admin_release_rollback', { p_channel: ch.channel, p_reason: reason }))
  }
  const assign = (b: BundleRow, channel: ChannelKey) => {
    const reason = window.prompt(`Priskirti bundle'ą ${b.version} kanalui „${channel}" (privalomas atnaujinimas). Priežastis:`)
    if (!reason || reason.trim().length < 3) return
    void run(`${channel} = ${b.version}`, () => supabase.rpc('rvn_admin_release_set', { p_channel: channel, p_bundle_id: b.id, p_mandatory: true, p_reason: reason }))
  }
  const revoke = (b: BundleRow) => {
    const reason = window.prompt(`ATŠAUKTI bundle'ą ${b.version}? Jo nebegaus niekas, o kas turi – bus priverstinai pakeistas. Priežastis:`)
    if (!reason || reason.trim().length < 3) return
    void run(`Atšauktas ${b.version}`, () => supabase.rpc('rvn_admin_release_revoke', { p_bundle_id: b.id, p_reason: reason }))
  }
  const setMyChannel = async (channel: ChannelKey) => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    // 'admin' = numatytasis pagal rolę → override nuimam
    await run(`Mano kanalas: ${channel}`, () => supabase.rpc('rvn_admin_release_override', { p_user: data.user!.id, p_channel: channel === 'admin' ? null : channel, p_note: 'self (admin UI)' }))
  }
  const saveCfg = (patch: Partial<Config> & { reason?: string }) => run('Nustatymai išsaugoti', () => supabase.rpc('rvn_admin_app_config_set', { p: patch }))

  if (err) return <div style={{ ...card, color: '#fca5a5' }}>{err}</div>
  if (!ov || !cfg) return <div style={card}><span className="text-sm" style={{ color: 'var(--text-muted)' }}>Kraunama…</span></div>

  const byCh = Object.fromEntries(ov.channels.map((c) => [c.channel, c])) as Record<ChannelKey, ChannelRow>
  const upstream: Record<'tester' | 'stable', ChannelKey> = { tester: 'admin', stable: 'tester' }

  return (
    <div className="space-y-5">
      {msg && <div style={{ ...card, padding: '0.6rem 1rem', color: msg.startsWith('KLAIDA') ? '#fca5a5' : '#86efac', fontSize: 13 }}>{msg}</div>}

      {/* Kanalai */}
      <div className="grid gap-3 md:grid-cols-3">
        {(['admin', 'tester', 'stable'] as ChannelKey[]).map((key) => {
          const ch = byCh[key]
          const up = key === 'admin' ? null : byCh[upstream[key]]
          const canPromote = !!up?.bundle && up.bundle.status === 'active' && up.bundle.id !== ch.bundle?.id
          return (
            <div key={key} style={{ ...card, borderColor: CH_COLOR[key] + '55' }}>
              <p className="text-xs font-bold tracking-wider" style={{ color: CH_COLOR[key] }}>{CH_LABEL[key]}{ov.my_channel === key && ' · tu čia'}</p>
              <p className="text-3xl font-bold my-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>{ch.bundle?.version ?? '—'}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {ch.bundle ? <>nuo {when(ch.updated_at)}{ch.updated_by && ` · ${ch.updated_by}`}{ch.mandatory && ' · privalomas'}</> : key === 'admin' ? 'Dar nieko nepublikuota (release.bat)' : 'Tuščias → gauna žemesnio kanalo bundle\'ą / installerio versiją'}
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                Žaidėjų 24 h: <b>{ch.players_24h}</b> · klaidų: <b style={{ color: ch.bugs_24h ? '#fca5a5' : undefined }}>{ch.bugs_24h}</b> · auto-rollback: <b style={{ color: ch.rollbacks_24h ? '#fca5a5' : undefined }}>{ch.rollbacks_24h}</b>
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {key !== 'admin' && (
                  <button disabled={busy || !canPromote} onClick={() => promote(key, up!.bundle!.version)} style={{ ...bGreen, opacity: canPromote ? 1 : 0.4 }}>
                    Patvirtinti{canPromote ? ` ${up!.bundle!.version}` : ''} → {key}
                  </button>
                )}
                <button disabled={busy || !ch.previous || ch.previous.status !== 'active'} onClick={() => rollback(ch)} style={{ ...bRed, opacity: ch.previous && ch.previous.status === 'active' ? 1 : 0.4 }}>
                  Rollback{ch.previous ? ` → ${ch.previous.version}` : ''}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        Mano kanalas žaidime:
        <select disabled={busy} value={ov.my_channel} onChange={(e) => void setMyChannel(e.target.value as ChannelKey)} style={{ ...input, width: 'auto' }}>
          <option value="admin">admin (numatytasis)</option><option value="tester">tester – matyti, ką mato testeriai</option><option value="stable">stable – matyti, ką mato žaidėjai</option>
        </select>
        <span style={{ color: 'var(--text-muted)' }}>Naudinga žaidėjo bug&apos;ui atkurti: žaidimas per kitą patikrinimą priverstinai persijungs į to kanalo bundle&apos;ą.</span>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Šis admin puslapis sukasi su web versija <b>{APP_VERSION}</b>. Prieš „→ tester": login, kolekcija, kova su DI, PvP partija, pirkimas, pack open. Prieš „→ stable": ≥24 h be kritinių klaidų ir be auto-rollback&apos;ų.</p>

      {/* Vartai */}
      <div style={card}>
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--gold)' }}>Vartai</p>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button disabled={busy} onClick={() => { if (cfg.maintenance || window.confirm('Įjungti techninių darbų režimą? Visi, išskyrus adminus, matys blokuojantį ekraną.')) void saveCfg({ maintenance: !cfg.maintenance, maintenance_message_lt: cfg.maintenance_message_lt, maintenance_message_en: cfg.maintenance_message_en, reason: 'maintenance toggle' }) }} style={cfg.maintenance ? bRed : bGrey}>
            Techniniai darbai: {cfg.maintenance ? 'ĮJUNGTA – išjungti' : 'išjungta'}
          </button>
          <input style={{ ...input, flex: '1 1 220px', width: 'auto' }} placeholder="Žinutė LT" value={cfg.maintenance_message_lt ?? ''} onChange={(e) => setCfg({ ...cfg, maintenance_message_lt: e.target.value })} />
          <input style={{ ...input, flex: '1 1 220px', width: 'auto' }} placeholder="Message EN" value={cfg.maintenance_message_en ?? ''} onChange={(e) => setCfg({ ...cfg, maintenance_message_en: e.target.value })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {([['min_shell_android', 'Min. APK versija (pvz. 1.0.700)'], ['shell_url_android', 'APK atsisiuntimo nuoroda'], ['min_shell_desktop', 'Min. EXE versija (pvz. 0.2.0)'], ['shell_url_desktop', 'EXE atsisiuntimo nuoroda'], ['pvp_server_url', 'PvP serverio URL (wss://…)']] as [keyof Config, string][]).map(([k, label]) => (
            <label key={k} className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}
              <input style={{ ...input, marginTop: 4 }} value={(cfg[k] as string | null) ?? ''} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {FLAGS.map((f) => {
            const on = cfg.flags?.[f] !== false
            return <button key={f} onClick={() => setCfg({ ...cfg, flags: { ...cfg.flags, [f]: !on } })} style={on ? bGrey : bRed}>{f}: {on ? 'on' : 'OFF'}</button>
          })}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Kill-switch flag&apos;ai klientui grąžinami per rvn_get_release; kad realiai išjungtų sistemą, atitinkamas ekranas / RPC turi juos tikrinti (E5 etapas).</p>
        <button disabled={busy} onClick={() => void saveCfg({ min_shell_android: cfg.min_shell_android, min_shell_desktop: cfg.min_shell_desktop, shell_url_android: cfg.shell_url_android, shell_url_desktop: cfg.shell_url_desktop, pvp_server_url: cfg.pvp_server_url, maintenance_message_lt: cfg.maintenance_message_lt, maintenance_message_en: cfg.maintenance_message_en, flags: cfg.flags, reason: 'gates edit' })} style={{ ...bGreen, marginTop: 12 }}>Išsaugoti vartus</button>
      </div>

      {/* Bundle'ai */}
      <div style={card}>
        <p className="text-sm font-bold mb-3" style={{ color: 'var(--gold)' }}>Bundle&apos;ai (nekeičiami)</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-xs" style={{ color: 'var(--text-secondary)', borderCollapse: 'collapse' }}>
            <thead><tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}><th className="py-1 pr-3">Versija</th><th className="pr-3">Data</th><th className="pr-3">Dydis</th><th className="pr-3">Engine</th><th className="pr-3">Žaid. 7 d.</th><th className="pr-3">Pritaikyta</th><th className="pr-3">Klaidos</th><th className="pr-3">Auto-rollback</th><th className="pr-3">Pastabos</th><th /></tr></thead>
            <tbody>
              {ov.bundles.map((b) => {
                const inCh = ov.channels.filter((c) => c.bundle?.id === b.id).map((c) => c.channel)
                return (
                  <tr key={b.id} style={{ borderTop: '1px solid var(--bg-border)', opacity: b.status === 'revoked' ? 0.45 : 1 }}>
                    <td className="py-2 pr-3"><b style={{ color: 'var(--text-primary)' }}>{b.version}</b>{b.git_sha && <span style={{ color: 'var(--text-muted)' }}> · {b.git_sha}</span>}{inCh.map((c) => <span key={c} style={{ marginLeft: 6, color: CH_COLOR[c], fontWeight: 700 }}>{c}</span>)}{b.status === 'revoked' && <span style={{ marginLeft: 6, color: '#fca5a5' }}>ATŠAUKTAS</span>}</td>
                    <td className="pr-3">{when(b.created_at)}</td>
                    <td className="pr-3">{mb(b.size_bytes)} · {b.files_count} f.</td>
                    <td className="pr-3">{b.engine_version}</td>
                    <td className="pr-3">{b.players_7d}</td>
                    <td className="pr-3">{b.applied_total}</td>
                    <td className="pr-3" style={{ color: b.bugs_total ? '#fca5a5' : undefined }}>{b.bugs_total}</td>
                    <td className="pr-3" style={{ color: b.rollbacks_total ? '#fca5a5' : undefined }}>{b.rollbacks_total}</td>
                    <td className="pr-3" style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.notes_lt ?? ''}>{b.notes_lt ?? ''}{(b.min_shell_android || b.min_shell_desktop) && ` [min shell: ${b.min_shell_android ?? '-'} / ${b.min_shell_desktop ?? '-'}]`}</td>
                    <td className="py-1" style={{ whiteSpace: 'nowrap' }}>
                      {b.status === 'active' && (
                        <>
                          <select defaultValue="" disabled={busy} onChange={(e) => { const v = e.target.value as ChannelKey | ''; e.target.value = ''; if (v) assign(b, v) }} style={{ ...input, width: 'auto', marginRight: 6 }}>
                            <option value="">Priskirti kanalui…</option><option value="admin">admin</option><option value="tester">tester</option><option value="stable">stable</option>
                          </select>
                          <button disabled={busy} onClick={() => revoke(b)} style={bRed}>Atšaukti</button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
              {ov.bundles.length === 0 && <tr><td colSpan={10} className="py-3" style={{ color: 'var(--text-muted)' }}>Dar nėra bundle&apos;ų. Paleisk <code>release.bat</code>.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Versijų paplitimas */}
      <div className="grid gap-3 md:grid-cols-2">
        <div style={card}>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--gold)' }}>Versijų paplitimas (7 d.)</p>
          <table className="w-full text-xs" style={{ color: 'var(--text-secondary)' }}>
            <thead><tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}><th>Platforma</th><th>Versija</th><th>24 h</th><th>7 d.</th></tr></thead>
            <tbody>{ov.adoption.map((a) => <tr key={a.platform + a.version}><td>{a.platform}</td><td>{a.version}</td><td>{a.players_24h}</td><td>{a.players_7d}</td></tr>)}</tbody>
          </table>
        </div>
        <div style={card}>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--gold)' }}>Žurnalas</p>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {ov.log.map((l) => (
              <p key={l.id} className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{when(l.at)}</span> · <b style={{ color: l.action === 'rollback' || l.action === 'revoke' ? '#fca5a5' : 'var(--text-primary)' }}>{l.action}</b>
                {l.channel && ` ${l.channel}`}{(l.from_version || l.to_version) && `: ${l.from_version ?? '—'} → ${l.to_version ?? '—'}`}{l.actor && ` · ${l.actor}`}{l.reason && ` · ${l.reason}`}
              </p>
            ))}
            {ov.log.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tuščia.</p>}
          </div>
        </div>
      </div>

      {ov.overrides.length > 0 && (
        <div style={card}>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--gold)' }}>Kanalo override&apos;ai</p>
          {ov.overrides.map((o) => (
            <p key={o.user_id} className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              <b>{o.username}</b> → {o.channel}{o.note && ` · ${o.note}`} <button onClick={() => void run('Override nuimtas', () => supabase.rpc('rvn_admin_release_override', { p_user: o.user_id, p_channel: null, p_note: null }))} style={{ ...bGrey, marginLeft: 8, padding: '0.15rem 0.5rem' }}>nuimti</button>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
