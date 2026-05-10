'use client'

type Props = {
  enabled: boolean
  onToggle: () => void
}

export function SoundToggle({ enabled, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className="px-3 py-1.5 rounded-lg text-xs transition hover:opacity-80"
      style={{
        background: 'var(--bg-surface)',
        color: enabled ? 'var(--gold)' : 'var(--text-muted)',
        border: '1px solid ' + (enabled ? 'var(--gold)' : 'var(--bg-border)'),
      }}
      title={enabled ? 'Išjungti garsą' : 'Įjungti garsą'}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  )
}
