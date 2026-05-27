import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteAnnouncement } from './actions'
import { AnnouncementFormClient } from './AnnouncementFormClient'
import { LoreDeleteButton } from '@/components/admin/lore/LoreDeleteButton'
import { PublishButton } from './PublishButton'

export const revalidate = 0
export const metadata = { title: 'Skelbimai | Admin' }

type SearchParams = Promise<{ action?: string; id?: string; error?: string }>

type Ann = {
  id: string; title: string; slug: string; summary: string | null
  body: string | null; type: string; pinned: boolean
  published_at: string | null; expires_at: string | null
  created_at: string
}

const TYPE_ICONS: Record<string, string> = {
  news: '📰', update: '⚙️', event: '📅', warning: '⚠️',
}

const TYPE_LABELS: Record<string, string> = {
  news: 'Naujiena', update: 'Atnaujinimas', event: 'Renginys', warning: 'Įspėjimas',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('lt-LT', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isPublished(ann: Ann): boolean {
  if (!ann.published_at) return false
  const now = new Date()
  if (new Date(ann.published_at) > now) return false
  if (ann.expires_at && new Date(ann.expires_at) <= now) return false
  return true
}

export default async function AnnouncementsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')

  const { data } = await supabase
    .from('announcements')
    .select('id,title,slug,summary,body,type,pinned,published_at,expires_at,created_at')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as Ann[]
  const editAnn = params.id ? rows.find((a) => a.id === params.id) : undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>&#x2190; Admin</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            &#x1F4F0; Skelbimai
          </span>
          <div className="flex-1" />
          <Link href="/admin/announcements?action=new"
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            + Naujas skelbimas
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        {params.action === 'new' && !params.id && <AnnouncementFormClient error={params.error} />}
        {editAnn && <AnnouncementFormClient ann={editAnn} error={params.error} />}

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rows.length} skelbim&#x0173;</p>

        <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                {['Pavadinimas', 'Tipas', 'Paskelbta', 'Baigiasi', 'Statusas', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((ann, i) => {
                const pub = isPublished(ann)
                return (
                  <tr key={ann.id}
                    style={{ background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {ann.pinned && <span title="Prisegtas">&#x1F4CC;</span>}
                        <div>
                          <span className="block font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{ann.title}</span>
                          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{ann.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {TYPE_ICONS[ann.type] ?? '?'} {TYPE_LABELS[ann.type] ?? ann.type}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {fmtDate(ann.published_at)}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {fmtDate(ann.expires_at)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{
                          background: pub ? 'rgba(52,211,153,0.12)' : 'rgba(107,114,128,0.15)',
                          color: pub ? '#34d399' : '#9ca3af',
                        }}>
                        {pub ? 'Paskelbta' : 'Juodraštis'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!pub && <PublishButton id={ann.id} />}
                        <Link href={`/admin/announcements?id=${ann.id}`}
                          className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                          Redaguoti
                        </Link>
                        <LoreDeleteButton id={ann.id} onDelete={deleteAnnouncement} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Skelbim&#x0173; dar nesukurta</div>
          )}
        </div>
      </div>
    </div>
  )
}
