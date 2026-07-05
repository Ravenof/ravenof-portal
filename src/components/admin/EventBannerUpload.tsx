'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, Loader2, X, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toWebp, LONG_CACHE } from '@/lib/img-optimize'

type Props = {
  currentUrl: string
  onUpload: (publicUrl: string) => void
}

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ALLOWED_LABEL = 'PNG, JPG arba WEBP'

function safeName(filename: string): string {
  return filename.toLowerCase().replace(/[^a-z0-9.]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function EventBannerUpload({ currentUrl, onUpload }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const displayUrl = preview ?? currentUrl ?? null

  function handleFileChange(file: File) {
    setError(null); setSuccess(null)
    if (!ALLOWED_TYPES.includes(file.type)) { setError(`Leidžiami tik ${ALLOWED_LABEL}`); return }
    if (file.size === 0) { setError('Failas tuščias'); return }
    if (file.size > MAX_SIZE) { setError(`Failas per didelis (maks. 5 MB)`); return }
    setPreview(URL.createObjectURL(file))
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setError(null); setSuccess(null); setLoading(true)
    try {
      const supabase = createClient()
      const { blob, ext, contentType } = await toWebp(file)
      const path = `events/${Date.now()}-${safeName(file.name).replace(/\.[^.]+$/, '')}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('card-images')
        .upload(path, blob, { upsert: true, contentType, cacheControl: LONG_CACHE })
      if (upErr) { setError(upErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('card-images').getPublicUrl(path)
      setSuccess('Baneris įkeltas!')
      onUpload(publicUrl)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function clearBanner() {
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    onUpload('')
    setSuccess(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden flex items-center justify-center"
        style={{ width: '100%', aspectRatio: '16/6', maxWidth: '480px', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
        {displayUrl ? (
          <>
            <Image src={displayUrl} alt="Renginio baneris" fill className="object-cover"
              sizes="480px" unoptimized={displayUrl.startsWith('blob:')} />
            <button type="button" onClick={clearBanner}
              className="absolute top-1 right-1 rounded-full p-0.5" style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-40">
            <ImageIcon className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Nėra banerio</span>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept={ALLOWED_TYPES.join(',')} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f) }} />

      <div className="flex gap-2">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
          <Upload className="w-3.5 h-3.5" /> Pasirinkti
        </button>
        {preview && (
          <button type="button" onClick={handleUpload} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--gold)', color: '#0a0a0f', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Keliama...</> : <><Upload className="w-3.5 h-3.5" /> Įkelti</>}
          </button>
        )}
      </div>

      {error   && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      {success && <p className="text-xs" style={{ color: '#22c55e' }}>{success}</p>}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ALLOWED_LABEL} · maks. 5 MB · rekomenduojama plati (16:6)</p>
    </div>
  )
}
