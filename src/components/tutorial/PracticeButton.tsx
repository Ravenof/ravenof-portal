'use client'

// ── PracticeButton — praktika prieš AI: platus landscape modalas ─────────────
// 3 priešininko šaltiniai: atsitiktinė frakcija · pasirinkta frakcija · viešas deck.
// Dešinėj — santrauka (Tu / Priešininkas / Sunkumas) + AI sunkumas + PRADĖTI KOVĄ.
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { RvnIcon } from '@/components/digital/ui/RvnIcon'
import type { AiDifficulty } from '@/lib/tutorial/ai'
import { useT, useLocale, useContent } from '@/lib/i18n/react'

const TutorialGame = dynamic(() => import('./TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type PublicDeck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; factionId: number | null; author: string; score: number }
type Faction = { id: number; name: string; icon_url: string | null; color_hex: string | null }
type Mode = 'random' | 'faction' | 'public'

const ACC = '34,197,94' // žalias
// Frakcijų aprašai = DB turinys (Fazė 4); kol kas dvikalbis registras pagal LT vardą.
const FACTION_DESC: Record<string, { lt: string; en: string }> = {
  'Mirties maršas': { lt: 'Kapinės · prisikėlimas', en: 'Graveyard · resurrection' },
  'Demonų orda': { lt: 'Prakeiksmai · agresija', en: 'Curses · aggression' },
  'Inkvizicijos legionas': { lt: 'Kontrolė · disciplina', en: 'Control · discipline' },
  'Šviesos pulkas': { lt: 'Gydymas · apsauga', en: 'Healing · protection' },
  'Mistikos melodija': { lt: 'Burtai · kontrolė', en: 'Spells · control' },
  'Rytų vėjas': { lt: 'Greitis · combo', en: 'Speed · combo' },
  'Plėšikų naktis': { lt: 'Vagystė · tempas', en: 'Theft · tempo' },
  'Vryhioko gauja': { lt: 'Žvėrys · jėga', en: 'Beasts · power' },
}

export function PracticeButton({ deckId, deckName, variant = 'full', hideTrigger = false, open: openProp, onClose }: {
  deckId: string
  deckName: string
  variant?: 'full' | 'compact'
  hideTrigger?: boolean
  open?: boolean
  onClose?: () => void
}) {
  const t = useT()
  const tc = useContent()
  const locale = useLocale()
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = hideTrigger ? !!openProp : internalOpen
  const setOpen = (v: boolean) => { if (hideTrigger) { if (!v) onClose?.() } else setInternalOpen(v) }
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<Mode>('random')
  const [publicDecks, setPublicDecks] = useState<PublicDeck[]>([])
  const [factions, setFactions] = useState<Faction[]>([])
  const [oppDeck, setOppDeck] = useState<string>('')
  const [oppFaction, setOppFaction] = useState<number | ''>('')
  const [difficulty, setDifficulty] = useState<AiDifficulty>('normal')
  const [query, setQuery] = useState('')
  const [filterFaction, setFilterFaction] = useState<number | ''>('')

  useEffect(() => {
    if (!isOpen) return
    const supabase = createClient()
    supabase.from('decks').select('id, name, user_id, score, faction:factions ( id, name, icon_url, color_hex )').eq('visibility', 'public').order('score', { ascending: false }).limit(60)
      .then(async ({ data }) => {
        const rows = (data as unknown as { id: string; name: string; user_id: string; score: number | null; faction: { id: number; name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
        const uids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
        const authors: Record<string, string> = {}
        if (uids.length) {
          const { data: profs } = await supabase.from('profiles').select('id, username, display_name').in('id', uids)
          for (const pr of ((profs as { id: string; username: string | null; display_name: string | null }[]) ?? [])) authors[pr.id] = pr.display_name || pr.username || 'žaidėjas'
        }
        setPublicDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null, factionId: d.faction?.id ?? null, author: authors[d.user_id] ?? 'žaidėjas', score: d.score ?? 0 })))
      })
    supabase.from('factions').select('id, name, icon_url, color_hex').order('sort_order').limit(20)
      .then(({ data }) => setFactions(((data as Faction[]) ?? []).filter((f) => f.name !== 'Universalus')))
  }, [isOpen])

  const filteredDecks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return publicDecks.filter((d) =>
      (!filterFaction || d.factionId === filterFaction) &&
      (!q || d.name.toLowerCase().includes(q) || d.author.toLowerCase().includes(q) || (d.faction ?? '').toLowerCase().includes(q)))
  }, [publicDecks, query, filterFaction])

  const canStart = mode === 'random' ? true : mode === 'faction' ? !!oppFaction : !!oppDeck
  const selFactionObj = factions.find((f) => f.id === oppFaction)
  const selDeckObj = publicDecks.find((d) => d.id === oppDeck)
  const oppSummary = mode === 'random' ? t('battle.practice.randomTitle') : mode === 'faction' ? (selFactionObj ? `${selFactionObj.name} AI` : t('battle.practice.none')) : (selDeckObj ? selDeckObj.name : '—')

  const start = () => {
    playUiClick()
    if (mode === 'random' && factions.length) {
      // atsitiktinė frakcija klientinėj pusėj → visada validus priešininkas
      setOppFaction(factions[Math.floor(Math.random() * factions.length)].id)
    }
    setStarted(true)
  }

  const tab = (m: Mode, icon: string, label: string) => (
    <button key={m} onClick={() => { playUiClick(); setMode(m) }}
      className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold transition-all"
      style={{ minHeight: 44, fontSize: 'clamp(11px,1.5vh,14px)', background: mode === m ? `rgba(${ACC},0.2)` : 'rgba(10,8,16,0.8)', border: '1px solid ' + (mode === m ? `rgba(${ACC},0.65)` : 'rgba(255,255,255,0.08)'), color: mode === m ? '#bbf7d0' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
      <span style={{ fontSize: 16 }}>{icon}</span>{label}
    </button>
  )

  const diffBtn = (d: AiDifficulty, lbl: string) => (
    <button key={d} onClick={() => { playUiClick(); setDifficulty(d) }} className="flex-1 rounded-xl text-xs font-semibold transition-all"
      style={{ minHeight: 40, background: difficulty === d ? `rgba(${ACC},0.22)` : 'rgba(10,8,16,0.8)', border: '1px solid ' + (difficulty === d ? `rgba(${ACC},0.6)` : 'rgba(255,255,255,0.08)'), color: difficulty === d ? '#bbf7d0' : 'var(--text-muted)' }}>{lbl}</button>
  )

  const pickerStyle: React.CSSProperties = { minHeight: 38, background: 'rgba(10,8,16,0.85)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', borderRadius: 10, padding: '0 10px', fontSize: 12 }

  return (
    <>
      {!hideTrigger && (
        <button onClick={() => { playUiClick(); setOpen(true) }}
          className={variant === 'full' ? 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95' : 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95 w-full'}
          style={{ background: `linear-gradient(135deg, rgba(${ACC},0.18), rgba(${ACC},0.06))`, border: `1px solid rgba(${ACC},0.45)`, color: '#86efac', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
          {t('battle.practice.trigger')}
        </button>
      )}

      {started && (
        <TutorialGame deckId={deckId} deckName={deckName} practice
          opponentDeckId={mode === 'public' ? oppDeck : null}
          opponentFaction={mode !== 'public' && oppFaction ? Number(oppFaction) : null}
          opponentName={mode === 'public' ? (selDeckObj?.name ?? t('battle.practice.enemy')) : (selFactionObj?.name ?? t('battle.practice.enemy'))}
          difficulty={difficulty}
          onClose={() => { setStarted(false); setOpen(false) }} />
      )}

      {isOpen && !started && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setOpen(false)}>
          <div className="flex flex-col rounded-2xl overflow-hidden" style={{ width: 'min(1100px,94vw)', height: 'min(620px,92vh)', border: `1px solid rgba(${ACC},0.4)`, background: `radial-gradient(120% 60% at 50% 0%, rgba(${ACC},0.12), rgba(10,8,16,0.98) 60%), linear-gradient(160deg, #17111f, #0a0810)`, boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }} onClick={(e) => e.stopPropagation()}>

            {/* Antraštė */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <RvnIcon name="fi-pve" size={26} fallback={<span style={{ fontSize: 22 }}>🎯</span>} />
                <div className="min-w-0">
                  <div className="rvn-disp font-black uppercase leading-none" style={{ fontSize: 'clamp(16px,2.6vh,24px)', color: '#86efac', letterSpacing: '0.06em' }}>{t('battle.practice.title')}</div>
                  <div className="truncate" style={{ fontSize: 'clamp(9px,1.3vh,12px)', color: 'var(--text-muted)' }}>{t('battle.practice.yourDeck')} <span style={{ color: 'var(--text-secondary)' }}>{deckName}</span>{t('battle.practice.pickOpponent')}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Tabai */}
            <div className="flex gap-2 px-4 pb-2 shrink-0">
              {tab('random', '🎲', t('battle.practice.tabRandom'))}
              {tab('faction', '🏰', t('battle.practice.tabFaction'))}
              {tab('public', '🌐', t('battle.practice.tabPublic'))}
            </div>

            {/* Kūnas: turinys + santrauka */}
            <div className="flex-1 min-h-0 grid gap-3 px-4 pb-4" style={{ gridTemplateColumns: 'minmax(0,1fr) clamp(240px,28%,320px)' }}>

              {/* PAGRINDINIS turinys */}
              <div className="min-h-0 rounded-xl overflow-hidden flex flex-col" style={{ background: 'rgba(8,6,12,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {mode === 'random' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 p-6">
                    <span style={{ fontSize: 48 }}>🎲</span>
                    <div className="rvn-disp font-bold" style={{ fontSize: 16, color: '#bbf7d0' }}>{t('battle.practice.randomTitle')}</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 340 }}>{t('battle.practice.randomText')}</p>
                  </div>
                )}

                {mode === 'faction' && (
                  <div className="flex-1 min-h-0 overflow-y-auto p-3">
                    <p className="mb-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('battle.practice.factionHint')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {factions.map((f) => {
                        const sel = f.id === oppFaction
                        return (
                          <button key={f.id} onClick={() => { playUiClick(); setOppFaction(f.id) }}
                            className="rvn-press flex items-center gap-2 rounded-xl px-2.5 py-2 text-left"
                            style={{ border: sel ? `1.5px solid rgba(${ACC},0.9)` : '1px solid rgba(255,255,255,0.08)', background: sel ? `linear-gradient(135deg, rgba(${ACC},0.16), rgba(10,8,16,0.9))` : 'rgba(10,8,16,0.6)', boxShadow: sel ? `0 0 12px rgba(${ACC},0.3)` : 'none' }}>
                            <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (f.color_hex ? f.color_hex + '88' : 'rgba(240,180,41,0.3)') }}>
                              {f.icon_url ? <img src={f.icon_url} alt="" className="w-full h-full object-cover" /> : <span>⚔</span>}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate rvn-disp font-bold" style={{ fontSize: 13, color: '#fff' }}>{tc('faction', f.id, 'name', f.name)}</span>
                              <span className="block truncate" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{FACTION_DESC[f.name]?.[locale === 'en' ? 'en' : 'lt'] ?? t('battle.practice.aiDeck')}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {mode === 'public' && (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex gap-2 p-2.5 shrink-0">
                      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('battle.practice.searchPlaceholder')} className="flex-1 outline-none" style={pickerStyle} />
                      <select value={filterFaction ? String(filterFaction) : ''} onChange={(e) => setFilterFaction(e.target.value ? Number(e.target.value) : '')} style={{ ...pickerStyle, maxWidth: 150 }}>
                        <option value="">{t('battle.practice.allFactions')}</option>
                        {factions.map((f) => <option key={f.id} value={f.id}>{tc('faction', f.id, 'name', f.name)}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-2.5 grid grid-cols-2 gap-2 content-start">
                      {filteredDecks.length === 0 && <p className="col-span-2 text-center py-6" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('battle.practice.noDecks')}</p>}
                      {filteredDecks.map((d) => {
                        const sel = d.id === oppDeck
                        return (
                          <div key={d.id} className="rounded-xl p-2.5 flex flex-col gap-1.5" style={{ border: sel ? `1.5px solid rgba(${ACC},0.9)` : '1px solid rgba(255,255,255,0.08)', background: sel ? `linear-gradient(135deg, rgba(${ACC},0.14), rgba(10,8,16,0.9))` : 'rgba(10,8,16,0.6)' }}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (d.factionColor ? d.factionColor + '88' : 'rgba(240,180,41,0.3)') }}>
                                {d.factionIcon ? <img src={d.factionIcon} alt="" className="w-full h-full object-cover" /> : <span style={{ fontSize: 14 }}>⚔</span>}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate rvn-disp font-bold" style={{ fontSize: 13, color: '#fff' }}>{d.name}</span>
                                <span className="block truncate" style={{ fontSize: 10, color: 'var(--text-muted)' }}>autorius: {d.author}</span>
                              </span>
                              {d.score > 0 && <span className="shrink-0" style={{ fontSize: 10, color: '#fb923c' }}>🔥 {d.score >= 1000 ? (d.score / 1000).toFixed(1) + 'K' : d.score}</span>}
                            </div>
                            <span className="truncate" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{d.faction ?? '—'}</span>
                            <div className="flex gap-1.5">
                              <Link href={'/community-decks/' + d.id} target="_blank" onClick={(e) => e.stopPropagation()} className="flex-1 rounded-lg text-center py-1" style={{ fontSize: 11, border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-muted)' }}>Peržiūra</Link>
                              <button onClick={() => { playUiClick(); setOppDeck(d.id) }} className="flex-1 rounded-lg py-1 font-bold" style={{ fontSize: 11, background: sel ? `rgba(${ACC},0.85)` : `rgba(${ACC},0.16)`, color: sel ? '#04210f' : '#86efac', border: `1px solid rgba(${ACC},0.5)` }}>{sel ? '✓ Pasirinkta' : 'Pasirinkti'}</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SANTRAUKA + sunkumas + CTA */}
              <div className="min-h-0 flex flex-col gap-2 overflow-y-auto">
                <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'rgba(10,8,16,0.7)', border: `1px solid rgba(${ACC},0.25)` }}>
                  <div>
                    <div className="rvn-disp font-bold uppercase" style={{ fontSize: 10, color: '#86efac' }}>{t('battle.practice.you')}</div>
                    <div className="truncate" style={{ fontSize: 13, color: '#fff', fontFamily: 'var(--rvn-font-display)' }}>{deckName}</div>
                  </div>
                  <div className="text-center" style={{ color: 'var(--text-muted)' }}>✕</div>
                  <div>
                    <div className="rvn-disp font-bold uppercase" style={{ fontSize: 10, color: '#fca5a5' }}>{t('battle.practice.opponent')}</div>
                    <div className="truncate" style={{ fontSize: 13, color: '#fff', fontFamily: 'var(--rvn-font-display)' }}>{oppSummary}</div>
                  </div>
                  <div>
                    <div className="rvn-disp font-bold uppercase" style={{ fontSize: 10, color: 'var(--gold)' }}>{t('battle.practice.difficulty')}</div>
                    <div style={{ fontSize: 13, color: '#fff', fontFamily: 'var(--rvn-font-display)' }}>{difficulty === 'easy' ? t('battle.practice.easy') : difficulty === 'hard' ? t('battle.practice.hard') : t('battle.practice.normal')}</div>
                  </div>
                </div>

                <div className="rounded-xl p-3" style={{ background: 'rgba(10,8,16,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="rvn-disp font-semibold uppercase mb-1.5" style={{ fontSize: 10, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{t('battle.practice.aiDifficulty')}</p>
                  <div className="flex gap-1.5">{diffBtn('easy', t('battle.practice.easyBtn'))}{diffBtn('normal', t('battle.practice.normalBtn'))}{diffBtn('hard', t('battle.practice.hardBtn'))}</div>
                  <p className="mt-1.5" style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    {difficulty === 'easy' ? t('battle.practice.easyText')
                      : difficulty === 'hard' ? t('battle.practice.hardText')
                      : t('battle.practice.normalText')}
                  </p>
                </div>

                <button disabled={!canStart} onClick={start} className="rounded-xl font-bold transition-all disabled:opacity-40 active:scale-95 shrink-0"
                  style={{ minHeight: 50, background: canStart ? `rgba(${ACC},0.9)` : 'rgba(255,255,255,0.06)', color: canStart ? '#04210f' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em', fontSize: 15 }}>{t('battle.practice.start')}</button>
                <button onClick={() => setOpen(false)} className="rounded-xl text-sm shrink-0" style={{ minHeight: 40, color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)' }}>{t('battle.practice.cancel')}</button>
              </div>
            </div>
          </div>
        </div>, document.body)}
    </>
  )
}
