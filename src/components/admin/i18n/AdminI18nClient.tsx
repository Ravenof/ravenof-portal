'use client'

// ── Admin vertimų panelė (Fazė 8) ────────────────────────────────────────────
// 3 tab'ai:
//   • Kortos   — EN name/description/effect_text/flavor_text + status, EN vaizdas, EN balsai
//   • Turinys  — content_translations (užduotys, parduotuvė, kosmetika, pasiekimai, frakcijos…)
//   • Ataskaita — pilnumo suvestinė
//
// Rašymas tiesiai per supabase klientą (RLS: rašo tik profiles.role='admin').

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Card = { id: string; card_number: string | null; name: string; description: string | null; effect_text: string | null; image_url: string | null; status: string }
type CardTr = { card_id: string; locale: string; name: string | null; description: string | null; effect_text: string | null; flavor_text: string | null; status: string }
type CardAsset = { card_id: string; locale: string; asset_type: string; url: string }
type Audio = { id: string; owner_type: string; owner_id: string; locale: string; trigger: string; url: string; transcript: string | null; weight: number }
type Content = { owner_type: string; owner_id: string; locale: string; field: string; value: string }

type Tab = 'cards' | 'content' | 'report'
type Filter = 'all' | 'missing' | 'partial' | 'done'

const TR_STATUS = ['draft', 'review', 'approved'] as const
const LOCALE = 'en'   // kol kas vienintelė antra kalba

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 8, fontSize: 12,
  background: 'rgba(10,8,16,0.85)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)',
}

export function AdminI18nClient({ cards, cardTranslations, cardAssets, audio, content }: {
  cards: Card[]; cardTranslations: CardTr[]; cardAssets: CardAsset[]; audio: Audio[]; content: Content[]
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('cards')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('missing')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // ── būsena: EN vertimai kortoms ────────────────────────────────────────────
  const [trMap, setTrMap] = useState<Record<string, CardTr>>(() =>
    Object.fromEntries(cardTranslations.filter((t) => t.locale === LOCALE).map((t) => [t.card_id, t])))
  const [imgMap, setImgMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(cardAssets.filter((a) => a.locale === LOCALE).map((a) => [a.card_id, a.url])))
  const [voiceMap, setVoiceMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const a of audio) {
      if (a.owner_type !== 'card' || a.locale !== LOCALE) continue
      m[a.owner_id] = m[a.owner_id] ? `${m[a.owner_id]}\n${a.url}` : a.url
    }
    return m
  })
  const [contentMap, setContentMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(content.filter((c) => c.locale === LOCALE).map((c) => [`${c.owner_type}:${c.owner_id}:${c.field}`, c.value])))

  const ltContent = useMemo(() => content.filter((c) => c.locale === 'lt'), [content])

  const state = (c: Card): Filter => {
    const t = trMap[c.id]
    if (!t || (!t.name && !t.effect_text)) return 'missing'
    if (!t.name || !t.effect_text) return 'partial'
    return 'done'
  }

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return cards.filter((c) => {
      if (filter !== 'all' && state(c) !== filter) return false
      if (!needle) return true
      return c.name.toLowerCase().includes(needle) || (c.card_number ?? '').toLowerCase().includes(needle)
    })
  }, [cards, q, filter, trMap])

  const stats = useMemo(() => {
    const total = cards.length
    let done = 0, partial = 0
    for (const c of cards) { const s = state(c); if (s === 'done') done++; else if (s === 'partial') partial++ }
    const withImg = Object.keys(imgMap).length
    const withVoice = Object.keys(voiceMap).length
    const contentEn = Object.keys(contentMap).length
    const contentLt = ltContent.length
    return { total, done, partial, missing: total - done - partial, withImg, withVoice, contentEn, contentLt }
  }, [cards, trMap, imgMap, voiceMap, contentMap, ltContent])

  // ── išsaugojimai ───────────────────────────────────────────────────────────
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(null), 2500) }

  const saveCard = async (cardId: string) => {
    const t = trMap[cardId]
    if (!t) return
    setBusy(cardId)
    const { error } = await supabase.from('card_translations').upsert({
      card_id: cardId, locale: LOCALE,
      name: t.name || null, description: t.description || null,
      effect_text: t.effect_text || null, flavor_text: t.flavor_text || null,
      status: t.status || 'approved',
    }, { onConflict: 'card_id,locale' })

    const img = (imgMap[cardId] ?? '').trim()
    if (!error && img) {
      await supabase.from('card_assets').upsert(
        { card_id: cardId, locale: LOCALE, asset_type: 'image', url: img },
        { onConflict: 'card_id,locale,asset_type' })
    }

    // balsai: teksto laukas = po vieną URL eilutėje (perrašom visą rinkinį)
    const urls = (voiceMap[cardId] ?? '').split('\n').map((u) => u.trim()).filter(Boolean)
    await supabase.from('localized_audio').delete()
      .eq('owner_type', 'card').eq('owner_id', cardId).eq('locale', LOCALE).eq('trigger', 'summon')
    if (urls.length) {
      await supabase.from('localized_audio').insert(urls.map((url, i) => ({
        owner_type: 'card', owner_id: cardId, locale: LOCALE, trigger: 'summon', url, sort_order: i,
      })))
    }
    setBusy(null)
    flash(error ? `Klaida: ${error.message}` : '✓ Išsaugota')
  }

  const saveContent = async (ownerType: string, ownerId: string, field: string) => {
    const key = `${ownerType}:${ownerId}:${field}`
    const value = (contentMap[key] ?? '').trim()
    setBusy(key)
    if (!value) {
      await supabase.from('content_translations').delete()
        .eq('owner_type', ownerType).eq('owner_id', ownerId).eq('locale', LOCALE).eq('field', field)
    } else {
      const { error } = await supabase.from('content_translations').upsert(
        { owner_type: ownerType, owner_id: ownerId, locale: LOCALE, field, value },
        { onConflict: 'owner_type,owner_id,locale,field' })
      if (error) { setBusy(null); flash(`Klaida: ${error.message}`); return }
    }
    setBusy(null)
    flash('✓ Išsaugota')
  }

  const EMPTY_TR = (id: string): CardTr => ({
    card_id: id, locale: LOCALE, name: null, description: null, effect_text: null, flavor_text: null, status: 'approved',
  })
  const upd = (id: string, patch: Partial<CardTr>) =>
    setTrMap((m) => ({ ...m, [id]: { ...(m[id] ?? EMPTY_TR(id)), ...patch } }))

  // ── UI ─────────────────────────────────────────────────────────────────────
  const pct = (n: number) => stats.total ? Math.round((n / stats.total) * 100) : 0

  return (
    <div className="p-4 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(['cards', 'content', 'report'] as Tab[]).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: tab === tb ? 'rgba(240,180,41,0.14)' : 'transparent', border: '1px solid ' + (tab === tb ? 'rgba(240,180,41,0.5)' : 'var(--bg-border)'), color: tab === tb ? 'var(--gold)' : 'var(--text-muted)' }}>
            {tb === 'cards' ? '🃏 Kortos (EN)' : tb === 'content' ? '🧩 Turinys (EN)' : '📈 Ataskaita'}
          </button>
        ))}
        {msg && <span className="text-xs" style={{ color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{msg}</span>}
      </div>

      {tab === 'cards' && (
        <>
          <div className="flex gap-2 mb-3 flex-wrap">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti pagal vardą / numerį…"
              style={{ ...inputStyle, width: 260 }} />
            {(['missing', 'partial', 'done', 'all'] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                style={{ background: filter === f ? 'rgba(240,180,41,0.14)' : 'transparent', border: '1px solid ' + (filter === f ? 'rgba(240,180,41,0.5)' : 'var(--bg-border)'), color: filter === f ? 'var(--gold)' : 'var(--text-muted)' }}>
                {f === 'missing' ? `Trūksta (${stats.missing})` : f === 'partial' ? `Daliniai (${stats.partial})` : f === 'done' ? `Sutvarkyta (${stats.done})` : `Visos (${stats.total})`}
              </button>
            ))}
            <span className="text-[11px] self-center" style={{ color: 'var(--text-muted)' }}>
              Rodoma: {shown.length}. Masiniam suvedimui: <code>npm run cards:i18n -- export --locale en --only-missing</code>
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {shown.slice(0, 200).map((c) => {
              const t = trMap[c.id]
              const st = state(c)
              return (
                <div key={c.id} className="rounded-xl p-3" style={{ background: 'rgba(10,8,16,0.65)', border: '1px solid var(--bg-border)' }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                      {c.card_number} · {c.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: st === 'done' ? 'rgba(74,222,128,0.15)' : st === 'partial' ? 'rgba(240,180,41,0.15)' : 'rgba(248,113,113,0.15)', color: st === 'done' ? '#4ade80' : st === 'partial' ? '#f0b429' : '#f87171' }}>
                      {st === 'done' ? 'EN OK' : st === 'partial' ? 'dalinis' : 'trūksta'}
                    </span>
                  </div>

                  <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                      <p><b style={{ color: 'var(--text-secondary)' }}>LT:</b> {c.name}</p>
                      {c.effect_text && <p className="mt-1">{c.effect_text}</p>}
                      {c.description && <p className="mt-1 opacity-70">{c.description}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <input style={inputStyle} placeholder="EN name" value={t?.name ?? ''} onChange={(e) => upd(c.id, { name: e.target.value })} />
                      <textarea style={{ ...inputStyle, minHeight: 52 }} placeholder="EN effect_text" value={t?.effect_text ?? ''} onChange={(e) => upd(c.id, { effect_text: e.target.value })} />
                      <textarea style={{ ...inputStyle, minHeight: 40 }} placeholder="EN description" value={t?.description ?? ''} onChange={(e) => upd(c.id, { description: e.target.value })} />
                      <input style={inputStyle} placeholder="EN flavor_text" value={t?.flavor_text ?? ''} onChange={(e) => upd(c.id, { flavor_text: e.target.value })} />
                      <input style={inputStyle} placeholder="EN kortos vaizdo URL (card_assets)" value={imgMap[c.id] ?? ''} onChange={(e) => setImgMap((m) => ({ ...m, [c.id]: e.target.value }))} />
                      <textarea style={{ ...inputStyle, minHeight: 40 }} placeholder="EN balsų URL (po vieną eilutėje)" value={voiceMap[c.id] ?? ''} onChange={(e) => setVoiceMap((m) => ({ ...m, [c.id]: e.target.value }))} />
                      <div className="flex items-center gap-2">
                        <select style={{ ...inputStyle, width: 120 }} value={t?.status ?? 'approved'} onChange={(e) => upd(c.id, { status: e.target.value })}>
                          {TR_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => saveCard(c.id)} disabled={busy === c.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background: 'rgba(240,180,41,0.16)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
                          {busy === c.id ? '…' : 'Išsaugoti'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {shown.length > 200 && (
              <p className="text-[11px] text-center py-2" style={{ color: 'var(--text-muted)' }}>
                Rodomos pirmos 200. Susiaurink paiešką arba naudok CLI įrankį masiniam vertimui.
              </p>
            )}
          </div>
        </>
      )}

      {tab === 'content' && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>
            DB turinys (content_translations). Kairėje – LT reikšmė, dešinėje – EN. Tuščias laukas = vertimas ištrinamas (rodoma LT).
          </p>
          {ltContent
            .filter((c) => !q.trim() || c.value.toLowerCase().includes(q.trim().toLowerCase()) || c.owner_type.includes(q.trim().toLowerCase()))
            .slice(0, 400)
            .map((c) => {
              const key = `${c.owner_type}:${c.owner_id}:${c.field}`
              return (
                <div key={key} className="rounded-lg p-2 grid gap-2 items-center" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid var(--bg-border)', gridTemplateColumns: '150px 1fr 1fr 90px' }}>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.owner_type}<br />{c.field}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{c.value}</span>
                  <input style={inputStyle} value={contentMap[key] ?? ''} placeholder="EN…"
                    onChange={(e) => setContentMap((m) => ({ ...m, [key]: e.target.value }))} />
                  <button onClick={() => saveContent(c.owner_type, c.owner_id, c.field)} disabled={busy === key}
                    className="px-2 py-1.5 rounded-lg text-[11px] font-bold"
                    style={{ background: 'rgba(240,180,41,0.14)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>
                    {busy === key ? '…' : 'Įrašyti'}
                  </button>
                </div>
              )
            })}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtruoti…" style={{ ...inputStyle, width: 260, position: 'sticky', bottom: 8 }} />
        </div>
      )}

      {tab === 'report' && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          {[
            { l: 'Kortos (aktyvios)', v: stats.total, s: '' },
            { l: 'EN vertimai pilni', v: `${stats.done} (${pct(stats.done)}%)`, s: 'name + effect_text' },
            { l: 'EN daliniai', v: stats.partial, s: 'trūksta vieno lauko' },
            { l: 'EN trūksta', v: stats.missing, s: 'rodoma LT' },
            { l: 'EN kortų vaizdai', v: `${stats.withImg} (${pct(stats.withImg)}%)`, s: 'card_assets' },
            { l: 'EN kortų balsai', v: `${stats.withVoice} (${pct(stats.withVoice)}%)`, s: 'localized_audio' },
            { l: 'Turinio EN įrašai', v: stats.contentEn, s: `iš ${stats.contentLt} LT` },
          ].map((x) => (
            <div key={x.l} className="rounded-xl p-3" style={{ background: 'rgba(10,8,16,0.65)', border: '1px solid var(--bg-border)' }}>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{x.l}</p>
              <p className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{x.v}</p>
              {x.s && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{x.s}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
