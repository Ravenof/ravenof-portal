'use client'

import { useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toWebp } from '@/lib/img-optimize'
import { updateAvatarUrl } from '@/app/profile/settings/actions'

type Props = {
  userId: string
  currentAvatarUrl: string | null
  displayName: string
}

const MAX_SIZE_MB = 2
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function AvatarUpload({ userId, currentAvatarUrl, displayName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [, startTransition] = useTransition()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(false)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Leidžiami tik JPEG, PNG, WebP ir GIF formatai')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Failas per didelis. Maksimalus dydis: ${MAX_SIZE_MB} MB`)
      return
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)

    try {
      const supabase = createClient()

      // File path: avatars/{userId}/{timestamp}.{ext}
      // GIF paliekam kaip yra (animacija); kitus konvertuojam į WebP
      const opt = file.type === 'image/gif' ? null : await toWebp(file, { maxW: 640 })
      const body = opt?.blob ?? file
      const ext = opt?.converted ? 'webp' : (file.name.split('.').pop() ?? 'jpg')
      const contentType = opt?.contentType ?? file.type
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, body, { upsert: true, contentType, cacheControl: '31536000' })

      if (uploadError) {
        setError('Įkėlimo klaida: ' + uploadError.message)
        setPreview(currentAvatarUrl)
        setUploading(false)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      // Update profile via server action
      startTransition(async () => {
        const result = await updateAvatarUrl(publicUrl)
        if (result.error) {
          setError(result.error)
          setPreview(currentAvatarUrl)
        } else {
          setSuccess(true)
          setPreview(publicUrl)
        }
        setUploading(false)
      })
    } catch (err) {
      setError('Netikėta klaida. Bandykite dar kartą.')
      setPreview(currentAvatarUrl)
      setUploading(false)
    }

    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  const initials = (displayName ?? '?').slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-5">
      {/* Avatar preview */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative flex-shrink-0 w-20 h-20 rounded-full overflow-hidden group cursor-pointer"
        style={{
          border: '2px solid rgba(124,58,237,0.45)',
          background: 'linear-gradient(135deg, #1e1b4b, #2d1b69)',
          boxShadow: '0 0 16px rgba(124,58,237,0.2)',
        }}
        title="Keisti nuotrauką"
        aria-label="Keisti profilio nuotrauką"
      >
        {preview ? (
          <img
            src={preview}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="w-full h-full flex items-center justify-center text-2xl font-bold"
            style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            {initials}
          </span>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          {uploading ? (
            <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3-3-3h4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--bg-border)',
          }}
        >
          {uploading ? 'Įkeliama…' : 'Keisti nuotrauką'}
        </button>
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
          JPEG, PNG, WebP ar GIF · max {MAX_SIZE_MB} MB
        </p>
        {error && (
          <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{error}</p>
        )}
        {success && (
          <p className="text-xs mt-1" style={{ color: '#22c55e' }}>✓ Nuotrauka atnaujinta</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
    </div>
  )
}
