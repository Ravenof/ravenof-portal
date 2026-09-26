'use client'
// ── Turnyrai: naršyklė draugiškos kovos ekrane (4-as režimas) ─────────────────
// Kurti (4/8/16 · viešas/privatus) · jungtis kodu · atviri vieši lobby.
import { useEffect, useState } from 'react'
import { playUiClick, playError } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'
import { RavenofTextField } from '@/components/digital/ui/RavenofKit'
import type { BattleFormat } from '@/lib/game/format'
import type { TourneySize } from '@/lib/tournament/bracket'
import {
  listOpenTournaments, getRewardsConfig, tourneyCreate, tourneyJoin, tourneyJoinCode, tourneyErrKey,
  type Tournament, type TourneyRewardsConfig,
} from '@/lib/tournament/client'
import { RewardLine, sizeKey } from './shared'

export function TournamentBrowser({ deckId, format, desktop: D, onEnter }: {
  deckId: string | undefined; format: BattleFormat; desktop: boolean; onEnter: (id: string) => void
}) {
  const t = useT()
  const [size, setSize] = useState<TourneySize>(8)
  const [isPublic, setIsPublic] = useState(true)
  const [code, setCode] = useState('')
  const [list, setList] = useState<(Tournament & { entrants: number })[] | null>(null)
  const [cfg, setCfg] = useState<TourneyRewardsConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    const load = () => { void listOpenTournaments().then((l) => { if (alive) setList(l) }) }
    load()
    void getRewardsConfig().then((c) => { if (alive) setCfg(c) })
    const iv = setInterval(load, 6000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  const run = async (fn: () => Promise<{ data?: { id: string }; error?: string }>) => {
    if (!deckId) { playError(); setErr(t('battle.pvp.cta.pickValidDeck')); return }
    playUiClick(); setBusy(true); setErr('')
    const r = await fn()
    setBusy(false)
    if (r.error || !r.data) { playError(); setErr(t(tourneyErrKey(r.error))); return }
    onEnter(r.data.id)
  }

  const fs = (d: number, m: number) => (D ? d : m)
  const lbl = { font: `700 ${fs(13, 10.5)}px var(--ravenof-font-display)`, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: 'var(--ravenof-text-secondary)' }
  const chip = (on: boolean) => ({
    flex: 1, minHeight: fs(42, 34), border: '1px solid ' + (on ? 'var(--ravenof-border-gold)' : 'var(--ravenof-border-strong)'), cursor: 'pointer',
    background: on ? 'rgba(212,163,59,.14)' : 'transparent', color: on ? 'var(--ravenof-gold-bright)' : 'var(--ravenof-text-secondary)',
    font: `700 ${fs(13, 10.5)}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase' as const, padding: '4px 6px',
  })
  const places = cfg?.places?.[String(size)]

  return (
    <div className="w-full flex flex-col text-left" style={{ gap: fs(18, 12) }} data-testid="tourney-browser">
      <div className={D ? 'grid' : 'flex flex-col'} style={D ? { gridTemplateColumns: '1fr 1fr', gap: 20 } : { gap: 12 }}>
        {/* Kurti */}
        <div className="flex flex-col" style={{ gap: fs(10, 7) }}>
          <div style={lbl}>{t('battle.tournament.create')}</div>
          <div className="flex" style={{ gap: 6 }}>
            {([4, 8, 16] as TourneySize[]).map((s) => (
              <button key={s} type="button" aria-pressed={size === s} data-testid={`tourney-size-${s}`} onClick={() => { playUiClick(); setSize(s) }} className="ravenof-press" style={chip(size === s)}>
                {t(`battle.tournament.size.${sizeKey(s)}`)} · {s}
              </button>
            ))}
          </div>
          <div className="flex" style={{ gap: 6 }}>
            <button type="button" aria-pressed={isPublic} onClick={() => { playUiClick(); setIsPublic(true) }} className="ravenof-press" style={chip(isPublic)}>{t('battle.tournament.public')}</button>
            <button type="button" aria-pressed={!isPublic} onClick={() => { playUiClick(); setIsPublic(false) }} className="ravenof-press" style={chip(!isPublic)}>{t('battle.tournament.private')}</button>
          </div>
          <div style={{ font: `400 ${fs(14, 11.5)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', lineHeight: 1.45 }}>
            {t('battle.tournament.formatNote', { format: t(format === 'classic' ? 'battle.tournament.formatClassic' : 'battle.tournament.formatZmk') })}
          </div>
          {places && (
            <div style={{ font: `400 ${fs(14, 11.5)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)', lineHeight: 1.5 }}>
              <div>🥇 <RewardLine t={t} items={places['1']} /></div>
              <div>🥈 <RewardLine t={t} items={places['2']} /></div>
            </div>
          )}
          <button type="button" disabled={busy || !deckId} data-testid="tourney-create" onClick={() => void run(() => tourneyCreate(size, isPublic, format, deckId!))}
            className="ravenof-btn ravenof-btn-primary" style={{ minHeight: fs(46, 38) }}>
            {t('battle.tournament.createCta')}
          </button>
        </div>

        {/* Jungtis kodu + vieši */}
        <div className="flex flex-col" style={{ gap: fs(10, 7) }}>
          <div style={lbl}>{t('battle.tournament.joinByCode')}</div>
          <div className="flex" style={{ gap: 6 }}>
            <RavenofTextField value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder={t('battle.tournament.codePlaceholder')}
              aria-label={t('battle.tournament.codePlaceholder')} style={{ flex: 1, textAlign: 'center', letterSpacing: 6, font: '700 16px var(--ravenof-font-display)', height: fs(46, 38) }} />
            <button type="button" disabled={busy || !code.trim() || !deckId} onClick={() => void run(() => tourneyJoinCode(code.trim(), deckId!))} className="ravenof-btn ravenof-btn-secondary" style={{ minHeight: fs(46, 38) }}>
              {t('battle.tournament.join')}
            </button>
          </div>
          <div style={{ ...lbl, marginTop: 6 }}>{t('battle.tournament.openLobbies')}</div>
          <div className="flex flex-col ravenof-scroll overflow-y-auto" style={{ gap: 6, maxHeight: fs(260, 180) }}>
            {list === null && <span className="ravenof-spinner" style={{ width: 24, height: 24, alignSelf: 'center' }} />}
            {list?.length === 0 && <div style={{ font: `400 ${fs(14, 11.5)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', padding: '8px 0' }}>{t('battle.tournament.noLobbies')}</div>}
            {list?.map((l) => (
              <div key={l.id} className="flex items-center" style={{ gap: 10, border: '1px solid var(--ravenof-border-hairline)', background: 'rgba(0,0,0,.25)', padding: fs(10, 7) + 'px ' + fs(12, 9) + 'px' }}>
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ font: `700 ${fs(15, 12)}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)' }}>
                    {t(`battle.tournament.size.${sizeKey(l.size)}`)} · {l.entrants}/{l.size}
                  </span>
                  <span className="block truncate" style={{ font: `400 ${fs(13, 10.5)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>
                    {t(l.format === 'classic' ? 'battle.tournament.formatClassic' : 'battle.tournament.formatZmk')}{l.code ? ` · ${l.code}` : ''}
                  </span>
                </span>
                <button type="button" disabled={busy || !deckId || l.entrants >= l.size} onClick={() => void run(() => tourneyJoin(l.id, deckId!))}
                  className="ravenof-press" style={{ font: `700 ${fs(12.5, 10)}px var(--ravenof-font-display)`, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-gold)', background: 'none', border: '1px solid var(--ravenof-border-gold)', padding: D ? '0 14px' : '6px 10px', minHeight: fs(38, 30), cursor: 'pointer' }}>
                  {t('battle.tournament.join')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {err && <p role="status" style={{ margin: 0, font: `400 ${fs(14, 11)}px var(--ravenof-font-body)`, color: '#c65563' }}>{err}</p>}
    </div>
  )
}
