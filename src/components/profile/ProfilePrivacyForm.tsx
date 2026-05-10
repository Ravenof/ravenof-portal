'use client'

import { useState, useTransition } from 'react'
import { updatePrivacySettings } from '@/app/profile/settings/actions'

type Props = {
  profile: {
    show_level: boolean
    show_badges: boolean
    show_attended_events: boolean
    show_public_decks: boolean
    show_profile_details: boolean
    show_owned_cards: boolean
    xp_total: number
    level: number
    rank_key: string
  }
}

type ToggleKey =
  | 'show_level'
  | 'show_badges'
  | 'show_attended_events'
  | 'show_public_decks'
  | 'show_profile_details'
  | 'show_owned_cards'

const TOGGLES: { key: ToggleKey; label: string; desc: string }[] = [
  {
    key: 'show_level',
    label: 'Rodyti lygi ir ranga',
    desc: 'Viesame profilyje matomas XP, lygis ir rangas.',
  },
  {
    key: 'show_badges',
    label: 'Rodyti zenklelius',
    desc: 'Kiti gali matyti tavo gautus zenklelius.',
  },
  {
    key: 'show_attended_events',
    label: 'Rodyti renginiu dalyvavima',
    desc: 'Rodomas lankytų renginiu skaicius profilyje.',
  },
  {
    key: 'show_public_decks',
    label: 'Rodyti viesasias kalades',
    desc: 'Tavo viesios kalades matomos profilyje ir bendruomeneje.',
  },
  {
    key: 'show_profile_details',
    label: 'Rodyti profilio detales',
    desc: 'Rodomas aprasymas ir kita profilio informacija.',
  },
  {
    key: 'show_owned_cards',
    label: 'Rodyti turimas korteles',
    desc: 'Kiti gales matyti tavo korteliu kolekcija (pagal numatyma: isjungta).',
  },
]

export function ProfilePrivacyForm({ profile }: Props) {
  const [settings, setSettings] = useState<Record<ToggleKey, boolean>>({
    show_level: profile.show_level,
    show_badges: profile.show_badges,
    show_attended_events: profile.show_attended_events,
    show_public_decks: profile.show_public_decks,
    show_profile_details: profile.show_profile_details,
    show_owned_cards: profile.show_owned_cards,
  })
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(key: ToggleKey) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function handleSave() {
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const result = await updatePrivacySettings(settings)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div
        className="p-4 rounded-xl text-sm"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
      >
        <p style={{ color: 'var(--text-muted)' }}>
          Lygis{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{profile.level}</strong>
          {' '}&middot;{' '}
          <strong style={{ color: 'var(--gold)' }}>{profile.xp_total.toLocaleString()} XP</strong>
          {' '}&middot;{' '}
          Rangas: <strong style={{ color: 'var(--text-primary)' }}>{profile.rank_key}</strong>
        </p>
      </div>

      <div
        className="rounded-xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
      >
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--bg-border)' }}>
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            Privatumo nustatymai
          </h2>
        </div>

        {TOGGLES.map(({ key, label, desc }, idx) => (
          <div
            key={key}
            className="flex items-center justify-between px-5 py-4 gap-4"
            style={idx < TOGGLES.length - 1 ? { borderBottom: '1px solid var(--bg-border)' } : {}}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {desc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle(key)}
              aria-pressed={settings[key]}
              className="relative flex-shrink-0 w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none"
              style={{
                background: settings[key] ? 'var(--gold)' : 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
                style={{ transform: settings[key] ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--gold)', color: '#000' }}
        >
          {isPending ? 'Saugoma...' : 'Issaugoti'}
        </button>
        {saved && (
          <span className="text-sm" style={{ color: '#22c55e' }}>
            Issaugota
          </span>
        )}
        {error && (
          <span className="text-sm" style={{ color: '#ef4444' }}>
            Klaida: {error}
          </span>
        )}
      </div>
    </div>
  )
}
