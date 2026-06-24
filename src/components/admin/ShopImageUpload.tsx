'use client'

// ── Universalus parduotuvės elementų paveikslėlių įkėlimas (card-images/shop) ──
import { useRef, useState } from 'react'
import { Upload, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']

function safeName(f: string) {
  return f.toLowerCase().replace(/[^a-z0-9.]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function ShopImageUpload({ currentUrl, folder, onUpload }: {
  currentUrl: string | null
  folder: string            // pvz. 'cosmetics' | 'packs' | 'starter'
  onUpload: (url: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const displayUrl = preview ?? currentUrl

  async function handleFile(file: File) {
    setError(null)
    if (!ALLOWED.includes(file.type)) { setError('Tik PNG / JPG / WEBP'); return }
    if (file.size === 0 || file.size > MAX_SIZE) { setError('Maks. 5 MB'); return }
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    try {
      const supabase = createClient()
      const path = `shop/${folder}/${Date.now()}-${safeName(file.name)}`
      const { error: upErr } = await supabase.storage.from('card-images').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { setError(upErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('card-images').getPublicUrl(path)
      onUpload(publicUrl)
    } catch (e) { setError(String(e)) } finally { setLoading(false) }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
        {displayUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={displayUrl} alt="" className="w-full h-full object-cover" />
          : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Nėra</span>}
        {displayUrl && (
          <button type="button" onClick={() => { setPreview(null); onUpload(''); if (fileRef.current) fileRef.current.value = '' }}
            className="absolute top-0.5 right-0.5 rounded-full p-0.5" style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <div>
        <input ref={fileRef} type="file" accept={ALLOWED.join(',')} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Keliama…</> : <><Upload className="w-3.5 h-3.5" /> Įkelti</>}
        </button>
        {error && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{error}</p>}
      </div>
    </div>
  )
}
