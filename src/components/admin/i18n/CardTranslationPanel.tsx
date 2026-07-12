'use client'

// ── Kortos vertimų blokas (Fazė 8) ───────────────────────────────────────────
// Rodoma kortos redagavimo puslapyje po CardForm: EN tekstai, EN kortos vaizdas
// (LT tekstas įkeptas į PNG) ir EN iškvietimo balsai. Rašo tiesiai per RLS
// (profiles.role='admin').

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const LOCALE = 'en'
const TR_STATUS = ['draft', 'review', 'approved'] as const

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
  background: 'rgba(10,8,16,0.85)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)',
}

type Tr = { name: string; description: string; effect_text: string; flavor_text: string; status: string }

export function CardTranslationPanel({ cardId, lt }: {
  cardId: string
  lt: { name: string; description: string | null; effect_text: string | null }
}) {
  const supabase = createClient()
  const [tr, setTr] = useState<Tr>({ name: '', description: '', effect_text: '', flavor_text: '', status: 'approved' })
  const [img, setImg] = useState('')
  const [voices, setVoices] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const [t, a, v] = await Promise.all([
        supabase.from('card_translations').select('name, description, effect_text, flavor_text, status').eq('card_id', cardId).eq('locale', LOCALE).maybeSingle(),
        supabase.from('card_assets').select('url').eq('card_id', cardId).eq('locale', LOCALE).eq('asset_type', 'image').maybeSingle(),
        supabase.from('localized_audio').select('url, sort_order').eq('owner_type', 'card').eq('owner_id', cardId).eq('locale', LOCALE).eq('trigger', 'summon').order('sort_order'),
      ])
      if (t.data) setTr({
        name: t.data.name ?? '', description: t.data.description ?? '',
        effect_text: t.data.effect_text ?? '', flavor_text: t.data.flavor_text ?? '',
        status: t.data.status ?? 'approved',
      })
      if (a.data?.url) setImg(a.data.url)
      if (v.data?.length) setVoices(v.data.map((r) => r.url).join('\n'))
    })()
  }, [cardId, supabase])

  const save = async () => {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('card_translations').upsert({
      card_id: cardId, locale: LOCALE,
      name: tr.name.trim() || null, description: tr.description.trim() || null,
      effect_text: tr.effect_text.trim() || null, flavor_text: tr.flavor_text.trim() || null,
      status: tr.status,
    }, { onConflict: 'card_id,locale' })

    if (!error && img.trim()) {
      await supabase.from('card_assets').upsert(
        { card_id: cardId, locale: LOCALE, asset_type: 'image', url: img.trim() },
        { onConflict: 'card_id,locale,asset_type' })
    }
    if (!error && !img.trim()) {
      await supabase.from('card_assets').delete().eq('card_id', cardId).eq('locale', LOCALE).eq('asset_type', 'image')
    }

    const urls = voices.split('\n').map((u) => u.trim()).filter(Boolean)
    await supabase.from('localized_audio').delete()
      .eq('owner_type', 'card').eq('owner_id', cardId).eq('locale', LOCALE).eq('trigger', 'summon')
    if (urls.length) {
      await supabase.from('localized_audio').insert(urls.map((url, i) => ({
        owner_type: 'card', owner_id: cardId, locale: LOCALE, trigger: 'summon', url, sort_order: i,
      })))
    }
    setBusy(false)
    setMsg(error ? `Klaida: ${error.message}` : '✓ Vertimas išsaugotas')
  }

  return (
    <section className="rounded-2xl p-5" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid var(--bg-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>🌍 EN vertimas</h2>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Tuščias laukas → rodoma LT reikšmė</span>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="text-[12px] leading-snug space-y-1" style={{ color: 'var(--text-muted)' }}>
          <p><b style={{ color: 'var(--text-secondary)' }}>LT vardas:</b> {lt.name}</p>
          {lt.effect_text && <p><b style={{ color: 'var(--text-secondary)' }}>Efektas:</b> {lt.effect_text}</p>}
          {lt.description && <p><b style={{ color: 'var(--text-secondary)' }}>Aprašymas:</b> {lt.description}</p>}
          <p className="pt-2 opacity-70">
            SVARBU: variklio efektų parseris naudoja LT tekstą — EN vertimas keičia tik rodomą tekstą, žaidimo logikos nekeičia.
          </p>
        </div>

        <div className="space-y-2">
          <input style={inputStyle} placeholder="EN name" value={tr.name} onChange={(e) => setTr({ ...tr, name: e.target.value })} />
          <textarea style={{ ...inputStyle, minHeight: 64 }} placeholder="EN effect_text" value={tr.effect_text} onChange={(e) => setTr({ ...tr, effect_text: e.target.value })} />
          <textarea style={{ ...inputStyle, minHeight: 52 }} placeholder="EN description" value={tr.description} onChange={(e) => setTr({ ...tr, description: e.target.value })} />
          <input style={inputStyle} placeholder="EN flavor_text" value={tr.flavor_text} onChange={(e) => setTr({ ...tr, flavor_text: e.target.value })} />
          <input style={inputStyle} placeholder="EN kortos vaizdo URL (tekstas įkeptas į PNG)" value={img} onChange={(e) => setImg(e.target.value)} />
          <textarea style={{ ...inputStyle, minHeight: 52 }} placeholder="EN iškvietimo balsų URL (po vieną eilutėje)" value={voices} onChange={(e) => setVoices(e.target.value)} />
          <div className="flex items-center gap-2">
            <select style={{ ...inputStyle, width: 130 }} value={tr.status} onChange={(e) => setTr({ ...tr, status: e.target.value })}>
              {TR_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={save} disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: 'rgba(240,180,41,0.16)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
              {busy ? 'Saugoma…' : 'Išsaugoti vertimą'}
            </button>
            {msg && <span className="text-xs" style={{ color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{msg}</span>}
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Tik `approved` vertimai rodomi žaidėjams. Masiniam darbui: <code>npm run cards:i18n</code>.
          </p>
        </div>
      </div>
    </section>
  )
}
