'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { addComment, deleteComment } from '@/app/community-decks/[deckId]/actions'
import type { DeckComment } from '@/types'

type Props = {
  deckId: string
  initialComments: DeckComment[]
  userId: string | null
  isAdmin: boolean
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('lt-LT', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function CommentSection({ deckId, initialComments, userId, isAdmin }: Props) {
  const [comments, setComments] = useState<DeckComment[]>(initialComments)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitPending, startSubmit] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const MAX = 1000

  function handleSubmit() {
    setError(null)
    const trimmed = body.trim()
    if (!trimmed) { setError('Komentaras negali būti tuščias'); return }
    if (trimmed.length > MAX) { setError(`Per ilgas (max ${MAX} simbolių)`); return }

    startSubmit(async () => {
      const res = await addComment(deckId, trimmed)
      if (res.error) {
        setError(res.error)
      } else {
        setBody('')
        // Server will revalidate and refresh — optimistic not needed since revalidatePath triggers RSC refresh
      }
    })
  }

  function handleDelete(commentId: string) {
    setDeletingId(commentId)
    startSubmit(async () => {
      const res = await deleteComment(commentId, deckId)
      if (res.error) {
        setError(res.error)
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      }
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <h2
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, Georgia, serif' }}
      >
        Komentarai ({comments.length})
      </h2>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm py-4 text-center opacity-40" style={{ color: 'var(--text-muted)' }}>
          Kol kas komentarų nėra. Būk pirmas!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const author = comment.author
            const displayName = author?.display_name ?? author?.username ?? 'Nežinomas'
            const canDelete = userId === comment.user_id || isAdmin

            return (
              <div
                key={comment.id}
                className="rounded-xl px-4 py-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {author ? (
                        <Link
                          href={`/users/${author.username}`}
                          className="text-xs font-semibold hover:underline"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {displayName}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {comment.body}
                    </p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id || submitPending}
                      className="flex-shrink-0 text-xs px-2 py-1 rounded hover:opacity-80 disabled:opacity-30 transition"
                      style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                      title="Ištrinti komentarą"
                    >
                      {isAdmin && userId !== comment.user_id ? 'Slėpti' : 'Trinti'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add comment */}
      {userId ? (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => { setBody(e.target.value); setError(null) }}
            placeholder="Rašyk komentarą..."
            rows={3}
            maxLength={MAX}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--bg-border)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={submitPending || !body.trim()}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--gold)', color: '#000' }}
              >
                {submitPending ? 'Siunčiama...' : 'Komentuoti'}
              </button>
              {error && (
                <span className="text-xs" style={{ color: '#ef4444' }}>{error}</span>
              )}
            </div>
            <span className="text-xs" style={{ color: body.length > MAX * 0.9 ? '#f59e0b' : 'var(--text-muted)' }}>
              {body.length}/{MAX}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            <Link href="/login" className="hover:opacity-80" style={{ color: 'var(--gold)' }}>
              Prisijunk
            </Link>
            {' '}norėdamas komentuoti
          </p>
        </div>
      )}
    </div>
  )
}
