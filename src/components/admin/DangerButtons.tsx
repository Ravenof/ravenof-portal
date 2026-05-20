'use client'

import { useState } from 'react'
import { Trash2, Ban, CheckCircle } from 'lucide-react'

// ── Delete button (generic confirm) ──────────────────────────────────────────

export function DeleteButton({
  label = 'Ištrinti',
  confirmLabel = 'Ar tikrai?',
  onConfirm,
}: {
  label?: string
  confirmLabel?: string
  onConfirm: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
    } catch (e) {
      setError(String(e))
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <span className="text-xs text-red-400">{error}</span>
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-opacity hover:opacity-80"
        style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444430' }}
      >
        <Trash2 className="w-3 h-3" />
        {label}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs" style={{ color: '#ef4444' }}>{confirmLabel}</span>
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="text-xs px-2 py-0.5 rounded font-semibold"
        style={{ background: '#ef4444', color: '#fff' }}
      >
        {loading ? '...' : 'Taip'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs px-2 py-0.5 rounded"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
      >
        Ne
      </button>
    </div>
  )
}

// ── Ban toggle button ─────────────────────────────────────────────────────────

export function BanButton({
  userId,
  isBanned,
  onToggle,
}: {
  userId: string
  isBanned: boolean
  onToggle: (userId: string, ban: boolean) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async () => {
    setLoading(true)
    setError(null)
    try {
      await onToggle(userId, !isBanned)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (error) return <span className="text-xs text-red-400">{error}</span>

  if (isBanned) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-opacity hover:opacity-80"
        style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e30' }}
      >
        <CheckCircle className="w-3 h-3" />
        Atblokuoti
      </button>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs" style={{ color: '#f59e0b' }}>Blokuoti?</span>
        <button
          onClick={handleToggle}
          disabled={loading}
          className="text-xs px-2 py-0.5 rounded font-semibold"
          style={{ background: '#f59e0b', color: '#0a0a0f' }}
        >
          {loading ? '...' : 'Taip'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
        >
          Ne
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-opacity hover:opacity-80"
      style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b30' }}
    >
      <Ban className="w-3 h-3" />
      Blokuoti
    </button>
  )
}
