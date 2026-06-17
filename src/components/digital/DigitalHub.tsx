'use client'

// ── Ravenof Digital hub — pagrindinis meniu (liepsnų fonas, raižyti blokai) ───
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { DEMO_DECK_TUTORIAL } from '@/components/tutorial/TutorialButton'
import { PracticeButton } from '@/components/tutorial/PracticeButton'
import { PvPLobby } from './PvPLobby'
import { getWallet, buyPack, getActivePack, type Wallet } from '@/lib/economy'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type Deck = { id: string; name: string; faction: string | null }

/** Aštrūs „išraižyti" kampai (oktagonas su nupjautais kampais). */
const oct = (b: number) =>
  `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`

type TileCfg = {
  key: string
  icon: string
  title: string
  subtitle: string
  accent: string            // 'r,g,b'
  href?: string
  onClick?: () => void
  comingSoon?: boolean
}

export function DigitalHub({ loggedIn }: { loggedIn: boolean }) {
  const [decks, setDecks] = useState<Deck[]>([])
  const [selDeck, setSelDeck] = useState<string>('')
  const [pvpOpen, setPvpOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [wallet, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [storeOpen, setStoreOpen] = useState(false)
  const [pack, setPack] = useState<{ id: string; name: string; price_gold: number } | null>(null)
  const [buying, setBuying] = useState(false)
  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) setWallet(w) }) }, [])

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

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!loggedIn) return
    refreshWallet()
    getActivePack().then(setPack)
  }, [loggedIn, refreshWallet])

  const doBuy = async () => {
    if (!pack || buying) return
    setBuying(true); playUiClick()
    const r = await buyPack(pack.id)
    setBuying(false)
    if ('error' in r) { setToast(r.error === 'not enough gold' ? 'Per mažai aukso.' : 'Nepavyko nupirkti pakuotės.'); return }
    refreshWallet(); setToast('Pakuotė nupirkta! 🎁')
  }

  const sel = decks.find((d) => d.id === selDeck)
  const flash = (msg: string) => { playUiClick(); setToast(msg) }
  const needDeck = (fn: () => void) => () => { playUiClick(); if (!sel) { setToast('Pirma pasirink kaladę viršuje.'); return } fn() }

  if (!loggedIn) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad galėtum žaisti skaitmenines kovas.</p>
        <Link href="/login?next=/digital" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>
          Prisijungti
        </Link>
      </div>
    )
  }

  const tiles: TileCfg[] = [
    { key: 'tutorial', icon: '🎓', title: 'MOKYMASIS', subtitle: 'Išmok pagrindus žingsnis po žingsnio', accent: '139,92,246', onClick: () => { playUiClick(); setTutorialOpen(true) } },
    { key: 'ai', icon: '🎯', title: 'KOVA PRIEŠ AI', subtitle: 'Treniruokis prieš botą (lengvas / vidutinis / sunkus)', accent: '34,197,94', onClick: needDeck(() => setAiOpen(true)) },
    { key: 'campaign', icon: '🗺️', title: 'KAMPANIJA', subtitle: 'Siužetinė vienžaidėjo kampanija', accent: '240,180,41', comingSoon: true },
    { key: 'ranked', icon: '🏆', title: 'PVP — RANGINĖ', subtitle: 'Reitinguojamos kovos dėl vietos lentelėje', accent: '239,68,68', comingSoon: true },
    { key: 'free', icon: '⚔️', title: 'PVP — LAISVA', subtitle: 'Kaukis prieš žaidėją (kodas arba atsitiktinis)', accent: '251,146,60', onClick: needDeck(() => setPvpOpen(true)) },
    { key: 'mycards', icon: '🃏', title: 'VIRTUALIOS KORTOS', subtitle: 'Tavo kortų kolekcija (albumas)', accent: '96,165,250', href: '/my-cards' },
    { key: 'store', icon: '🛒', title: 'PARDUOTUVĖ', subtitle: 'Pirk pakuotes už auksą', accent: '240,180,41', onClick: () => { playUiClick(); setStoreOpen(true) } },
  ]

  const renderTile = (t: TileCfg) => {
    const a = t.accent
    const inner = (
      <div className="relative h-full" style={{ clipPath: oct(15), background: `rgba(${a},0.5)`, padding: 2.5 }}>
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4 py-7 gap-2"
          style={{
            clipPath: oct(14),
            background: `radial-gradient(120% 90% at 50% 0%, rgba(${a},0.16), rgba(10,8,16,0.96) 60%), linear-gradient(160deg, #15101f, #0a0810)`,
            boxShadow: `inset 0 0 24px rgba(${a},0.12), inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}>
          {/* kampų ornamentai */}
          {[['top-1.5 left-1.5'], ['top-1.5 right-1.5'], ['bottom-1.5 left-1.5'], ['bottom-1.5 right-1.5']].map(([pos], i) => (
            <span key={i} className={`absolute ${pos} text-[10px] leading-none`} style={{ color: `rgba(${a},0.85)`, textShadow: `0 0 6px rgba(${a},0.6)` }}>❖</span>
          ))}
          <span className="text-4xl" style={{ filter: `drop-shadow(0 0 10px rgba(${a},0.55))` }}>{t.icon}</span>
          <h2 className="text-base font-bold tracking-wide" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', letterSpacing: '0.08em', textShadow: `0 0 12px rgba(${a},0.4)` }}>{t.title}</h2>
          <p className="text-[11px] leading-snug max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{t.subtitle}</p>
          {t.comingSoon && (
            <span className="mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest"
              style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid rgba(${a},0.6)`, color: `rgba(${a},1)`, letterSpacing: '0.18em' }}>NETRUKUS</span>
          )}
        </div>
      </div>
    )

    const common = `group relative block h-[170px] transition-all duration-150 ${t.comingSoon ? 'opacity-70' : 'hover:scale-[1.035] active:scale-[0.99]'} focus:outline-none`
    const glow = { filter: t.comingSoon ? 'saturate(0.7)' : undefined } as React.CSSProperties

    if (t.href && !t.comingSoon) {
      return <Link key={t.key} href={t.href} onClick={() => playUiClick()} className={common} style={glow}>{inner}</Link>
    }
    return (
      <button key={t.key} type="button" onClick={t.comingSoon ? () => flash('Netrukus! Šis režimas dar kuriamas.') : t.onClick} className={common} style={glow}>
        {inner}
      </button>
    )
  }

  return (
    <div className="relative">
      <div className="relative z-10 space-y-6">
        {/* Aukso balansas + pakuotės */}
        <div className="flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
            style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.55)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
            🪙 {wallet.gold.toLocaleString()}
          </span>
          <button onClick={() => { playUiClick(); setStoreOpen(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-transform hover:scale-105"
            style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(251,146,60,0.55)', color: '#fdba74', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}
            title="Atidaryti parduotuvę">
            🎁 {wallet.packs} pak.
          </button>
        </div>

        {/* Kaladės pasirinkimas (kovoms prieš AI / PvP) */}
        <div className="relative mx-auto max-w-md" style={{ clipPath: oct(12), background: 'rgba(240,180,41,0.4)', padding: 2 }}>
          <div className="px-4 py-3" style={{ clipPath: oct(11), background: 'linear-gradient(160deg, #15101f, #0a0810)' }}>
            <label className="text-[10px] font-semibold block mb-1.5 text-center" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
              ⚔ KOVOS KALADĖ
            </label>
            {decks.length === 0 ? (
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Neturi kaladžių. <Link href="/deck-builder" className="underline" style={{ color: 'var(--gold)' }}>Sukurk kaladę</Link>.
              </p>
            ) : (
              <select value={selDeck} onChange={(e) => setSelDeck(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.85rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none', textAlign: 'center' }}>
                {decks.map((d) => <option key={d.id} value={d.id}>{d.name}{d.faction ? ` (${d.faction})` : ''}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map(renderTile)}
        </div>
      </div>

      {/* Paleidimai */}
      {tutorialOpen && (
        <TutorialGame deckId={DEMO_DECK_TUTORIAL} deckName="Demo kaladė" onClose={() => { setTutorialOpen(false); refreshWallet() }} />
      )}
      {sel && (
        <PracticeButton deckId={sel.id} deckName={sel.name} hideTrigger open={aiOpen} onClose={() => { setAiOpen(false); refreshWallet() }} />
      )}
      {pvpOpen && sel && (
        <PvPLobby deckId={sel.id} deckName={sel.name} onClose={() => { setPvpOpen(false); refreshWallet() }} />
      )}

      {storeOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setStoreOpen(false)}>
          <div className="relative w-[min(420px,94vw)]" style={{ clipPath: oct(16), background: 'rgba(240,180,41,0.5)', padding: 2.5 }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-6 text-center" style={{ clipPath: oct(15), background: 'radial-gradient(120% 90% at 50% 0%, rgba(240,180,41,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>
              <p className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>🛒 PARDUOTUVĖ</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Turi 🪙 {wallet.gold.toLocaleString()} aukso · 🎁 {wallet.packs} pakuotės</p>
              <div className="mx-auto mb-4" style={{ width: 96, height: 128, clipPath: oct(10), background: 'linear-gradient(160deg, #3a2a55, #15101f)', border: '2px solid rgba(240,180,41,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🎴</div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{pack?.name ?? 'Standartinė pakuotė'}</p>
              <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>10 kortų · retumai pagal tikimybę</p>
              <button onClick={doBuy} disabled={buying || !pack || wallet.gold < (pack?.price_gold ?? 200)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-95"
                style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
                {buying ? 'Perkama…' : `Pirkti už 🪙 ${pack?.price_gold ?? 200}`}
              </button>
              {wallet.packs > 0 && (
                <Link href="/digital/album" onClick={() => { playUiClick(); setStoreOpen(false) }}
                  className="block w-full mt-2 px-4 py-2.5 rounded-xl text-sm font-bold text-center transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: 'rgba(251,146,60,0.2)', border: '1px solid rgba(251,146,60,0.6)', color: '#fdba74', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
                  🎁 Atplėšti albume (turi {wallet.packs})
                </Link>
              )}
              <button onClick={() => { playUiClick(); setStoreOpen(false) }} className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>Uždaryti</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[160] px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
