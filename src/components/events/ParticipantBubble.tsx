import Link from 'next/link'
import Image from 'next/image'
import type { ParticipantProfile } from '@/types'

type Props = {
  profile: ParticipantProfile | null
}

function getInitials(displayName: string | null, username: string | null): string {
  const name = displayName ?? username ?? '?'
  return name.slice(0, 2).toUpperCase()
}

export function ParticipantBubble({ profile }: Props) {
  if (!profile) return null

  const { username, display_name, avatar_url } = profile
  const label = display_name || username
  const initials = getInitials(display_name, username)

  const inner = (
    <span className="flex flex-col items-center gap-1.5 group select-none">
      {/* Avatar ring */}
      <span
        className="relative flex items-center justify-center rounded-full overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:shadow-[0_0_14px_rgba(240,180,41,0.35)]"
        style={{
          width:      '52px',
          height:     '52px',
          background: 'linear-gradient(135deg,#1e1b4b,#2d1b69)',
          border:     '2px solid rgba(124,58,237,0.4)',
          flexShrink: 0,
        }}
      >
        {avatar_url ? (
          <Image
            src={avatar_url}
            alt={label ?? 'dalyvis'}
            fill
            sizes="52px"
            className="object-cover rounded-full"
            unoptimized
          />
        ) : (
          <span
            className="text-sm font-bold leading-none"
            style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}
          >
            {initials}
          </span>
        )}
      </span>

      {/* Name */}
      <span
        className="text-center leading-tight transition-colors duration-200 group-hover:text-[var(--gold)]"
        style={{
          color:        'var(--text-secondary)',
          fontFamily:   'var(--rvn-font-display)',
          fontSize:     '11px',
          letterSpacing:'0.02em',
          maxWidth:     '64px',
          overflow:     'hidden',
          display:      '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {label}
      </span>
    </span>
  )

  if (!username) return <span className="flex flex-col items-center">{inner}</span>

  return (
    <Link
      href={`/users/${encodeURIComponent(username)}`}
      className="no-underline"
      title={label ?? username}
    >
      {inner}
    </Link>
  )
}
