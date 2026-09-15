import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { BugStatusForm } from '@/components/admin/BugStatusForm'

// ── Admin: klaidų pranešimai (sąrašas + detalė ?id=) ─────────────────────────
type SP = Promise<{ status?: string; category?: string; severity?: string; platform?: string; id?: string; q?: string }>

type Bug = {
  id: number; user_id: string | null; category: string; severity: string; title: string; description: string; expected: string | null
  route: string | null; platform: string | null; app_version: string | null; device: Record<string, unknown>; game_context: Record<string, unknown> | null
  screenshot_path: string | null; status: string; admin_note: string | null; duplicate_of: number | null; created_at: string; updated_at: string
  profiles: { username: string; display_name: string | null } | null
}

const STATUS_LABEL: Record<string, string> = { new: 'Nauja', triaged: 'Peržiūrėta', in_progress: 'Taisoma', fixed: 'Pataisyta', wontfix: 'Netaisysim', duplicate: 'Dublikatas' }
const STATUS_COLOR: Record<string, string> = { new: '#93c5fd', triaged: '#c4b5fd', in_progress: '#fbbf24', fixed: '#7bd389', wontfix: '#9ca3af', duplicate: '#9ca3af' }
const SEV_COLOR: Record<string, string> = { blocker: '#ef4444', major: '#f97316', normal: '#9ca3af', minor: '#6b7280' }
const CAT_LABEL: Record<string, string> = { battle: 'Kova', cards: 'Kortos', ui: 'UI', auth: 'Prisijungimas', shop: 'Parduotuvė', other: 'Kita' }
const fmt = (d: string) => new Date(d).toLocaleString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

export default async function AdminBugsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/admin/events')

  let q = supabase.from('bug_reports').select('*, profiles:user_id(username, display_name)').order('created_at', { ascending: false }).limit(300)
  if (sp.status) q = q.eq('status', sp.status)
  if (sp.category) q = q.eq('category', sp.category)
  if (sp.severity) q = q.eq('severity', sp.severity)
  if (sp.platform) q = q.eq('platform', sp.platform)
  if (sp.q) q = q.or(`title.ilike.%${sp.q}%,description.ilike.%${sp.q}%`)
  const { data, error } = await q
  const rows = (data ?? []) as unknown as Bug[]
  const { data: countsRaw } = await supabase.from('bug_reports').select('status')
  const counts: Record<string, number> = {}
  for (const r of (countsRaw ?? []) as { status: string }[]) counts[r.status] = (counts[r.status] ?? 0) + 1

  const openId = sp.id ? Number(sp.id) : null
  let detail: Bug | null = rows.find((r) => r.id === openId) ?? null
  if (openId && !detail) {
    const { data: d } = await supabase.from('bug_reports').select('*, profiles:user_id(username, display_name)').eq('id', openId).maybeSingle()
    detail = (d as unknown as Bug | null) ?? null
  }
  let shot: string | null = null
  if (detail?.screenshot_path) {
    const { data: s } = await supabase.storage.from('bug-reports').createSignedUrl(detail.screenshot_path, 3600)
    shot = s?.signedUrl ?? null
  }
  const withParams = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v)
    const s = p.toString(); return `/admin/bugs${s ? `?${s}` : ''}`
  }
  const chip = (on: boolean) => ({ background: on ? 'var(--gold)' : 'var(--bg-elevated)', color: on ? '#0a0a0f' : 'var(--text-secondary)', border: '1px solid var(--bg-border)' })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3" style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-2xl mx-auto flex items-center gap-4">
          <Link href="/admin/users" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Vartotojai</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>🐞 Klaidų pranešimai</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Object.values(counts).reduce((a, b) => a + b, 0)} iš viso · {counts.new ?? 0} naujų · {counts.in_progress ?? 0} taisoma</span>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 grid gap-6" style={{ gridTemplateColumns: detail ? 'minmax(0,1fr) minmax(360px,520px)' : '1fr' }}>
        <div>
          {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#ef444420', color: '#ef4444' }}>Klaida: {error.message}</div>}
          <div className="flex gap-2 mb-2 flex-wrap items-center">
            <form method="GET" className="flex gap-2">
              {Object.entries(sp).filter(([k, v]) => k !== 'q' && k !== 'id' && v).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
              <input name="q" defaultValue={sp.q ?? ''} placeholder="Ieškoti tekste…" className="text-sm px-3 py-1.5 rounded-lg outline-none" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', width: 220 }} />
              <button type="submit" className="text-xs px-3 py-1.5 rounded-lg" style={chip(false)}>Ieškoti</button>
            </form>
            <div className="flex gap-1.5 flex-wrap">
              <Link href={withParams({ status: undefined, id: undefined })} className="text-xs px-3 py-1.5 rounded-lg" style={chip(!sp.status)}>Visos</Link>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <Link key={v} href={withParams({ status: v, id: undefined })} className="text-xs px-3 py-1.5 rounded-lg" style={chip(sp.status === v)}>{l} {counts[v] ? `(${counts[v]})` : ''}</Link>)}
            </div>
          </div>
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {['blocker', 'major', 'normal', 'minor'].map((v) => <Link key={v} href={withParams({ severity: sp.severity === v ? undefined : v, id: undefined })} className="text-xs px-2.5 py-1 rounded-lg" style={chip(sp.severity === v)}>{v}</Link>)}
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            {Object.entries(CAT_LABEL).map(([v, l]) => <Link key={v} href={withParams({ category: sp.category === v ? undefined : v, id: undefined })} className="text-xs px-2.5 py-1 rounded-lg" style={chip(sp.category === v)}>{l}</Link>)}
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            {['android', 'desktop', 'web', 'ios'].map((v) => <Link key={v} href={withParams({ platform: sp.platform === v ? undefined : v, id: undefined })} className="text-xs px-2.5 py-1 rounded-lg" style={chip(sp.platform === v)}>{v}</Link>)}
          </div>

          <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
            <table className="w-full text-sm">
              <thead><tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['#', 'Data', 'Rimtumas', 'Kategorija', 'Pavadinimas', 'Žaidėjas', 'Platforma', 'Būsena'].map((h) => <th key={h} className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
              </tr></thead>
              <tbody>{rows.map((b, i) => (
                <tr key={b.id} style={{ background: b.id === openId ? 'rgba(240,180,41,0.08)' : i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                  <td className="px-3 py-2 text-xs"><Link href={withParams({ id: String(b.id) })} className="hover:underline" style={{ color: 'var(--gold)' }}>#{b.id}</Link></td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{fmt(b.created_at)}</td>
                  <td className="px-3 py-2 text-xs font-bold" style={{ color: SEV_COLOR[b.severity] }}>{b.severity}</td>
                  <td className="px-3 py-2 text-xs">{CAT_LABEL[b.category] ?? b.category}</td>
                  <td className="px-3 py-2 text-xs"><Link href={withParams({ id: String(b.id) })} className="hover:underline">{b.title}</Link></td>
                  <td className="px-3 py-2 text-xs">{b.user_id ? <Link href={`/admin/users/${b.user_id}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>{b.profiles?.display_name ?? b.profiles?.username ?? '?'}</Link> : '—'}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{b.platform ?? '—'} v{b.app_version ?? '—'}</td>
                  <td className="px-3 py-2 text-xs font-medium" style={{ color: STATUS_COLOR[b.status] }}>{STATUS_LABEL[b.status] ?? b.status}</td>
                </tr>
              ))}</tbody>
            </table>
            {rows.length === 0 && <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>Pranešimų nėra</div>}
          </div>
        </div>

        {detail && (
          <div className="rounded-xl p-4 flex flex-col gap-3 self-start sticky top-16" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold" style={{ color: 'var(--gold)' }}>#{detail.id}</span>
              <span className="text-xs font-bold" style={{ color: SEV_COLOR[detail.severity] }}>{detail.severity}</span>
              <span className="text-xs">{CAT_LABEL[detail.category] ?? detail.category}</span>
              <span className="text-xs font-medium ml-auto" style={{ color: STATUS_COLOR[detail.status] }}>{STATUS_LABEL[detail.status]}</span>
              <Link href={withParams({ id: undefined })} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</Link>
            </div>
            <div className="font-bold">{detail.title}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {fmt(detail.created_at)} · {detail.user_id ? <Link href={`/admin/users/${detail.user_id}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>{detail.profiles?.display_name ?? detail.profiles?.username}</Link> : 'anonimas'} · {detail.platform ?? '—'} v{detail.app_version ?? '—'} · {detail.route ?? ''}
            </div>
            <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{detail.description}</div>
            {detail.expected && <div className="text-xs whitespace-pre-wrap"><span style={{ color: 'var(--text-muted)' }}>Tikėjosi: </span>{detail.expected}</div>}
            {shot && (
              // eslint-disable-next-line @next/next/no-img-element
              <a href={shot} target="_blank" rel="noreferrer"><img src={shot} alt="" className="rounded-lg w-full" style={{ border: '1px solid var(--bg-border)' }} /></a>
            )}
            <BugStatusForm id={detail.id} status={detail.status} adminNote={detail.admin_note} duplicateOf={detail.duplicate_of} />
            {detail.game_context && (
              <details className="text-xs">
                <summary className="cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Kovos kontekstas</summary>
                <div className="mt-1" style={{ color: 'var(--text-muted)' }}>
                  {String((detail.game_context as { mode?: string }).mode ?? '')} · ėjimas {String((detail.game_context as { turn?: number }).turn ?? '?')} · priešininkas {String((detail.game_context as { opponent?: string }).opponent ?? '—')} · match {String((detail.game_context as { matchId?: string }).matchId ?? '—')}
                </div>
                {Array.isArray((detail.game_context as { log?: string[] }).log) && (
                  <pre className="mt-2 p-2 rounded text-[10px] whitespace-pre-wrap" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', maxHeight: 260, overflowY: 'auto' }}>{((detail.game_context as { log: string[] }).log).join('\n')}</pre>
                )}
                <pre className="mt-2 p-2 rounded text-[10px] whitespace-pre-wrap" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{JSON.stringify((detail.game_context as { extra?: unknown }).extra ?? {}, null, 1)}</pre>
              </details>
            )}
            <details className="text-xs">
              <summary className="cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Įrenginys ir konsolė</summary>
              <pre className="mt-2 p-2 rounded text-[10px] whitespace-pre-wrap" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', maxHeight: 300, overflowY: 'auto' }}>{JSON.stringify(detail.device, null, 1)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}
