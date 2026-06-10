import Link from 'next/link'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EventForm } from '@/components/admin/EventForm'

export default async function NewEventPage() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'event_moderator'].includes(profile.role)) redirect('/')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/admin/events" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            ← Renginiai
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Naujas renginys
          </span>
          {profile!.role === 'event_moderator'
            ? <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#a78bfa20', color: '#a78bfa' }}>MODERATORIUS</span>
            : <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>ADMIN</span>
          }
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
          Naujas renginys
        </h1>
        <EventForm eventId={null} />
      </div>
    </div>
  )
}
