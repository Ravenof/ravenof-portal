'use client'

// ── Ravenof Digital hub — Tutorial / Praktika prieš AI / PvP ──────────────────
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { TutorialButton, DEMO_DECK_TUTORIAL } from '@/components/tutorial/TutorialButton'
import { PracticeButton } from '@/components/tutorial/PracticeButton'
import { PvPLobby } from './PvPLobby'

type Deck = { id: string; name: string; faction: string | null }

export function DigitalHub({ loggedIn }: { loggedIn: boolean }) {
  const [decks, setDecks] = useState<Deck[]>([])
  const [selDeck, setSelDeck] = useState<string>('')
  const [pvpOpen, setPvpOpen] = useState(false)

  useEffect(() => {
    if (!loggedIn) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('decks').select('id, name, faction:factions ( name )').eq('user_id', user.id).order('updated_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data as unknown as { id: string; name: string; faction: { name: string } | null }[]) ?? []
          const ds = rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null }))
          setDecks(ds)
          if (ds.length && !selDeck) setSelDeck(ds[0].id)
        })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn])

  const sel = decks.find((d) => d.id === selDeck)
  const selStyle = { width: '100%', padding: '0.5rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.85rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none' } as React.CSSProperties
  const cardStyle = (border: string) => ({ background: 'var(--bg-surface)', border: '1px solid ' + border }) as React.CSSProperties

  if (!loggedIn) {
    return (
      <div className="rounded-2xl p-6 text-center" style={cardStyle('var(--bg-border)')}>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad galėtum žaisti skaitmenines kovas.</p>
        <Link href="/login?next=/digital" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>
          Prisijungti
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Deck selektorius bendras AI/PvP */}
      <div className="rounded-2xl p-4" style={cardStyle('rgba(240,180,41,0.2)')}>
        <label className="text-xs font-semibold block mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
          ⚔️ TAVO KALADĖ (kovoms prieš AI ir PvP)
        </label>
        {decks.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Neturi kaladžių. <Link href="/deck-builder" className="underline" style={{ color: 'var(--gold)' }}>Sukurk kaladę</Link>, kad galėtum kautis.
          </p>
        ) : (
          <select value={selDeck} onChange={(e) => setSelDeck(e.target.value)} style={selStyle}>
            {decks.map((d) => <option key={d.id} value={d.id}>{d.name}{d.faction ? ` (${d.faction})` : ''}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tutorial */}
        <div className="rounded-2xl p-6 flex flex-col gap-3" style={cardStyle('rgba(139,92,246,0.3)')}>
          <div className="text-3xl">🎓</div>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>Mokymasis</h2>
          <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>Žingsnis po žingsnio: kovos laukas, auksas, ŽMK, žetonai. Su demo kalade.</p>
          <TutorialButton deckId={DEMO_DECK_TUTORIAL} deckName="Demo kaladė" />
        </div>

        {/* Praktika prieš AI */}
        <div className="rounded-2xl p-6 flex flex-col gap-3" style={cardStyle('rgba(34,197,94,0.3)')}>
          <div className="text-3xl">🎯</div>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>Praktika prieš AI</h2>
          <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>Kovok su savo kalade prieš viešą arba atsitiktinę frakcijos kaladę.</p>
          {sel ? (
            <PracticeButton deckId={sel.id} deckName={sel.name} />
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Pasirink kaladę viršuje.</span>
          )}
        </div>

        {/* PvP */}
        <div className="rounded-2xl p-6 flex flex-col gap-3" style={cardStyle('rgba(239,68,68,0.35)')}>
          <div className="text-3xl">⚔️</div>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>PvP — žaidėjas prieš žaidėją</h2>
          <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>Kaukis realiu laiku prieš kitą žaidėją: privatus kambarys su kodu arba atsitiktinis varžovas.</p>
          {sel ? (
            <button onClick={() => { playUiClick(); setPvpOpen(true) }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.06))', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
              ⚔️ Į areną
            </button>
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Pasirink kaladę viršuje.</span>
          )}
        </div>
      </div>

      {pvpOpen && sel && (
        <PvPLobby deckId={sel.id} deckName={sel.name} onClose={() => setPvpOpen(false)} />
      )}
    </div>
  )
}
