'use client'

// ── Kortos EN skiltis (admin) ────────────────────────────────────────────────
// Tas pats turinys kaip LT skiltyje, tik angliškai:
//   • pagrindinė info (name / effect_text / description / flavor_text + statusas)
//   • kortos ART (EN PNG — tekstas įkeptas į vaizdą) su tokiu pačiu upload'u
//   • iškvietimo BALSAI (EN mp3) su tokiu pačiu upload'u
//
// Rašo: card_translations (tekstai), card_assets (EN vaizdas),
//       localized_audio (EN balsai, trigger='summon').

import { useEffect, useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CardImageUpload } from '../CardImageUpload'
import { VoiceLinesUpload } from '../VoiceLinesUpload'

const LOCALE = 'en'
const TR_STATUS = ['draft', 'review', 'approved'] as const

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 14,
  background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)',
}

export function CardEnglishPanel({ cardId, cardNumber, lt }: {
  cardId: string
  cardNumber: string
  lt: { name: string; description: string | null; effect_text: string | null; image_url: string | null; voiceLines: string[] }
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [effect, setEffect] = useState('')
  const [desc, setDesc] = useState('')
  const [flavor, setFlavor] = useState('')
  const [status, setStatus] = useState<string>('approved')
  const [imageUrl, setImageUrl] = useState('')
  const [voices, setVoices] = useState<string[]>([])

  useEffect(() => {
    void (async () => {
      const [t, a, v] = await Promise.all([
        supabase.from('card_translations').select('name, description, effect_text, flavor_text, status')
          .eq('card_id', cardId).eq('locale', LOCALE).maybeSingle(),
        supabase.from('card_assets').select('url')
          .eq('card_id', cardId).eq('locale', LOCALE).eq('asset_type', 'image').maybeSingle(),
        supabase.from('localized_audio').select('url, sort_order')
          .eq('owner_type', 'card').eq('owner_id', cardId).eq('locale', LOCALE).eq('trigger', 'summon')
          .order('sort_order'),
      ])
      if (t.data) {
        setName(t.data.name ?? ''); setDesc(t.data.description ?? '')
        setEffect(t.data.effect_text ?? ''); setFlavor(t.data.flavor_text ?? '')
        setStatus(t.data.status ?? 'approved')
      }
      if (a.data?.url) setImageUrl(a.data.url)
      if (v.data?.length) setVoices(v.data.map((r) => r.url))
      setLoading(false)
    })()
  }, [cardId, supabase])

  const save = async () => {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('card_translations').upsert({
      card_id: cardId, locale: LOCALE,
      name: name.trim() || null, description: desc.trim() || null,
      effect_text: effect.trim() || null, flavor_text: flavor.trim() || null,
      status,
    }, { onConflict: 'card_id,locale' })

    if (!error) {
      if (imageUrl.trim()) {
        await supabase.from('card_assets').upsert(
          { card_id: cardId, locale: LOCALE, asset_type: 'image', url: imageUrl.trim() },
          { onConflict: 'card_id,locale,asset_type' })
      } else {
        await supabase.from('card_assets').delete()
          .eq('card_id', cardId).eq('locale', LOCALE).eq('asset_type', 'image')
      }
      await supabase.from('localized_audio').delete()
        .eq('owner_type', 'card').eq('owner_id', cardId).eq('locale', LOCALE).eq('trigger', 'summon')
      if (voices.length) {
        await supabase.from('localized_audio').insert(voices.map((url, i) => ({
          owner_type: 'card', owner_id: cardId, locale: LOCALE, trigger: 'summon', url, sort_order: i,
        })))
      }
    }
    setBusy(false)
    setMsg(error ? `Klaida: ${error.message}` : '✓ EN versija išsaugota')
    window.setTimeout(() => setMsg(null), 3000)
  }

  if (loading) {
    return <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-4 h-4 animate-spin" /> Kraunama EN versija…</p>
  }

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
      {/* ── Kairė: EN tekstai ── */}
      <div className="space-y-4">
        <div className="rounded-lg p-3 text-[12px] leading-snug" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}>
          <p><b style={{ color: 'var(--text-secondary)' }}>LT (šaltinis):</b> {lt.name}</p>
          {lt.effect_text && <p className="mt-1">{lt.effect_text}</p>}
          {lt.description && <p className="mt-1 opacity-70">{lt.description}</p>}
          <p className="mt-2 opacity-70">
            Variklio efektų parseris naudoja LT tekstą — EN keičia tik tai, ką mato žaidėjas. Rodomi tik <b>approved</b> vertimai.
          </p>
        </div>

        <div>
          <label style={labelStyle}>Name (EN)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder={lt.name} />
        </div>
        <div>
          <label style={labelStyle}>Effect text (EN)</label>
          <textarea value={effect} onChange={(e) => setEffect(e.target.value)} style={{ ...inputStyle, minHeight: 90 }} placeholder={lt.effect_text ?? ''} />
        </div>
        <div>
          <label style={labelStyle}>Description (EN)</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ ...inputStyle, minHeight: 70 }} placeholder={lt.description ?? ''} />
        </div>
        <div>
          <label style={labelStyle}>Flavor text (EN)</label>
          <input value={flavor} onChange={(e) => setFlavor(e.target.value)} style={inputStyle} />
        </div>

        {/* EN balsai — toks pat upload'as kaip LT */}
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <VoiceLinesUpload
            value={voices}
            cardNumber={cardNumber}
            cardId={cardId}
            locale="en"
            label="EN iškvietimo balsai (grojami, kai balsų kalba = English)"
            onChange={setVoices}
          />
          {lt.voiceLines.length > 0 && (
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
              LT balsų: {lt.voiceLines.length}. Jei EN balsų nėra — pagal nustatymą grojamas LT arba tyla.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, width: 150 }}>
            {TR_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" onClick={save} disabled={busy}
            className="px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            {busy ? 'Išsaugoma…' : 'Išsaugoti EN versiją'}
          </button>
          {msg && (
            <span className="text-sm flex items-center gap-1" style={{ color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>
              {msg.startsWith('✓') && <Check className="w-4 h-4" />}{msg}
            </span>
          )}
        </div>
      </div>

      {/* ── Dešinė: EN kortos ART (toks pat upload'as kaip LT) ── */}
      <div className="space-y-3">
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <p style={{ ...labelStyle, marginBottom: 10 }}>EN kortos paveikslėlis</p>
          <CardImageUpload
            currentUrl={imageUrl}
            cardNumber={cardNumber}
            cardId={cardId}
            locale="en"
            onUpload={(url) => setImageUrl(url)}
          />
          <label style={{ ...labelStyle, marginTop: 12 }}>EN image URL</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={inputStyle} placeholder="https://…" />
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
            Kortos tekstas įkeptas į paveikslėlį, todėl EN reikia atskiro failo. Nėra EN vaizdo → rodomas LT.
          </p>
        </div>

        {lt.image_url && (
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <p style={{ ...labelStyle, marginBottom: 8 }}>LT paveikslėlis (palyginimui)</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lt.image_url} alt="" className="w-full rounded-lg" />
          </div>
        )}
      </div>
    </div>
  )
}
