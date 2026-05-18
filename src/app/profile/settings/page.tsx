import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProfilePrivacyForm } from '@/components/profile/ProfilePrivacyForm'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { UsernameChangeForm } from '@/components/profile/UsernameChangeForm'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id, username, display_name, avatar_url, bio, is_public,
      xp_total, level, rank_key,
      show_level, show_badges, show_attended_events,
      show_public_decks, show_profile_details, show_owned_cards, show_on_leaderboards,
      username_changed_at, previous_username, previous_username_visible_until
    `)
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link
            href={`/users/${profile.username}`}
            className="text-xs hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            ← Mano profilis
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-10">
        <h1
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}
        >
          Profilio nustatymai
        </h1>

        <div
          className="mb-8 pb-8"
          style={{ borderBottom: '1px solid var(--bg-border)' }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Profilio nuotrauka
          </h2>
          <AvatarUpload
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url ?? null}
            displayName={profile.display_name ?? profile.username}
          />
        </div>

        <ProfilePrivacyForm profile={profile} />

        {/* Username change */}
        <div className="mt-8">
          <UsernameChangeForm
            currentUsername={profile.username}
            usernameChangedAt={(profile as unknown as { username_changed_at: string | null }).username_changed_at ?? null}
          />
        </div>

        <div
          className="mt-8 pt-6"
          style={{ borderTop: '1px solid var(--bg-border)' }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            Saugumas
          </h2>
          <Link
            href="/profile/change-password"
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}
          >
            Keisti slaptažodį →
          </Link>
        </div>
      </div>
    </div>
  )
}
