'use client'
// Tournament reward / win notice — shown once per completion via sessionStorage guard.
// Plays applause sound for 1st place. Dark fantasy style, closeable.

import { useEffect, useState } from 'react'
import { playWinSound } from '@/lib/life-tracker-sound'

type Props = {
  eventId:          string
  userId:           string
  finalPlacement:   number | null
  tournamentStatus: string
}

type PlacementInfo = {
  emoji:   string
  title:   string
  xpText:  string
  color:   string
  bg:      string
  border:  string
  playSound: boolean
}

function getPlacementInfo(placement: number): PlacementInfo {
  switch (placement) {
    case 1:
      return {
        emoji:     '🏆',
        title:     'Turnyro Čempionas!',
        xpText:    '+1 500',
        color:     '#fbbf24',
        bg:        'linear-gradient(135deg,rgba(251,191,36,.15),rgba(45,27,105,.25))',
        border:    'rgba(251,191,36,.4)',
        playSound: true,
      }
    case 2:
      return {
        emoji:     '🥈',
        title:     'Antra vieta!',
        xpText:    '+1 000',
        color:     '#a78bfa',
        bg:        'linear-gradient(135deg,rgba(167,139,250,.12),rgba(15,9,48,.25))',
        border:    'rgba(167,139,250,.4)',
        playSound: false,
      }
    case 3:
      return {
        emoji:     '🥉',
        title:     'Trečia vieta!',
        xpText:    '+700',
        color:     '#f97316',
        bg:        'linear-gradient(135deg,rgba(249,115,22,.1),rgba(15,9,48,.25))',
        border:    'rgba(249,115,22,.35)',
        playSound: false,
      }
    default:
      return {
        emoji:     '⚔',
        title:     'Turnyras baigtas',
        xpText:    '+400',
        color:     '#9ca3af',
        bg:        'linear-gradient(135deg,rgba(107,114,128,.1),rgba(15,9,48,.2))',
        border:    'rgba(107,114,128,.3)',
        playSound: false,
      }
  }
}

export function TournamentRewardNotice({ eventId, userId, finalPlacement, tournamentStatus }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (tournamentStatus !== 'completed') return
    // Show for placements 1-3 only
    if (!finalPlacement || finalPlacement > 3) return

    const key = `trn-reward:${eventId}:${userId}:p${finalPlacement}`
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return

    try { sessionStorage.setItem(key, '1') } catch { /* ignore */ }
    setVisible(true)

    if (finalPlacement === 1) {
      // Small delay so the page renders first
      const t = setTimeout(() => {
        try { playWinSound() } catch { /* ignore */ }
      }, 400)
      return () => clearTimeout(t)
    }
  }, [eventId, userId, finalPlacement, tournamentStatus])

  if (!visible || !finalPlacement || finalPlacement > 3) return null

  const info = getPlacementInfo(finalPlacement)

  return (
    <div
      className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
      style={{
        background: info.bg,
        border: '1px solid ' + info.border,
        boxShadow: finalPlacement === 1
          ? '0 0 40px rgba(251,191,36,.2), 0 0 80px rgba(251,191,36,.06)'
          : '0 0 20px rgba(0,0,0,.3)',
      }}>
      {/* Close button */}
      <button
        onClick={() => setVisible(false)}
        className="absolute top-3 right-3 text-xs px-2 py-1 rounded transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)', background: 'var(--bg-elevated)' }}>
        Uždaryti
      </button>

      {/* Header label */}
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: info.color, opacity: 0.8 }}>
        Apdovanojimas
      </p>

      {/* Main title */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{info.emoji}</span>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: info.color }}>
          {info.title}
        </h2>
      </div>

      {/* XP reward line */}
      <div className="rounded-xl px-4 py-3 inline-flex items-center gap-2"
        style={{
          background: 'rgba(0,0,0,.25)',
          border: '1px solid ' + info.border,
        }}>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>XP gauta:</span>
        <span className="text-base font-bold" style={{ color: info.color, fontFamily: 'Cinzel, Georgia, serif' }}>
          {info.xpText} XP
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+ 400 XP dalyvavimas</span>
      </div>

      {/* Participation note */}
      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
        XP jau pridėta prie jūsų profilio.
      </p>
    </div>
  )
}
