'use client'

// ── Matchmaking eilė — laipsniškai plečia paiešką; po 60 s krenta į botą. ────
// 0–20 s: ±3 žingsniai · 20–40 s: ±10 · 40–60 s: bet koks · >60 s: botas.
import { useEffect, useRef, useState } from 'react'
import { queueJoin, queueLeave, queuePoll, pickBot, getOpponentSummary, getRankedPvpMatch } from '@/lib/ranked/client'
import { playRanked } from '@/lib/ranked/sound'
import { useT } from '@/lib/i18n/react'

export type MatchedOpponent = {
  kind: 'bot' | 'real'
  id: string | null            // bot slug arba real user id
  name: string
  avatar: string
  faction: string
  factionSlug: string | null
  rankStep: number
  difficulty: 'easy' | 'normal' | 'hard'
  /** Realaus žaidėjo kovai – realtime PvP sync info (kitaip kova prieš botą per AI). */
  net?: { isHost: boolean; mySide: 'you' | 'ai'; matchId: string; opponentId: string }
  opponentDeckId?: string | null
}

const BOT_FALLBACK_SEC = 60

export function RankedQueue({ deckId, onMatch, onCancel }: {
  deckId: string
  onMatch: (opp: MatchedOpponent) => void
  onCancel: () => void
}) {
  const t = useT()
  const [elapsed, setElapsed] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    playRanked('ranked_queue_start')
    let alive = true
    queueJoin(deckId)
    const startedAt = Date.now()

    const tick = setInterval(() => { if (alive) setElapsed(Math.floor((Date.now() - startedAt) / 1000)) }, 250)

    const poll = setInterval(async () => {
      if (doneRef.current) return
      const sec = (Date.now() - startedAt) / 1000
      const range = sec < 20 ? 3 : sec < 40 ? 10 : 999
      // Realių žaidėjų paieška
      const r = await queuePoll(range)
      if (doneRef.current) return
      if (r.status === 'matched' && r.opponent && r.matchId) {
        doneRef.current = true
        const [summ, pm] = await Promise.all([getOpponentSummary(r.opponent), getRankedPvpMatch(r.matchId)])
        await queueLeave()
        const isHost = !!r.isHost
        onMatch({
          kind: 'real', id: r.opponent,
          name: summ?.name ?? t('battle.player'), avatar: '🛡️',
          faction: summ?.faction ?? t('ranked.queue.unknown'), factionSlug: null,
          rankStep: summ?.rankStep ?? 0, difficulty: 'normal',
          net: { isHost, mySide: isHost ? 'you' : 'ai', matchId: r.matchId, opponentId: r.opponent },
          // host'as įkrauna svečio kaladę; svečias gauna būseną per sync
          opponentDeckId: isHost ? (pm?.guest_deck_id ?? null) : null,
        })
        return
      }
      // Bot fallback po 60 s
      if (sec >= BOT_FALLBACK_SEC) {
        doneRef.current = true
        const bot = await pickBot()
        await queueLeave()
        if (bot) {
          onMatch({
            kind: 'bot', id: bot.slug, name: bot.name, avatar: bot.avatar || '🎴',
            faction: bot.faction, factionSlug: bot.faction_slug,
            rankStep: bot.rank_step, difficulty: bot.difficulty,
          })
        } else {
          onCancel()
        }
      }
    }, 2500)

    return () => { alive = false; clearInterval(tick); clearInterval(poll); if (!doneRef.current) queueLeave() }
  }, [deckId, onMatch, onCancel])

  const status = elapsed < 20 ? t('ranked.queue.similar')
    : elapsed < 40 ? t('ranked.queue.widening')
    : elapsed < BOT_FALLBACK_SEC ? t('ranked.queue.any')
    : t('ranked.queue.found')

  const cancel = () => { doneRef.current = true; playRanked('ranked_queue_cancel'); queueLeave(); onCancel() }

  return (
    <div className="ravenof-body fixed inset-0 z-[160] flex items-center justify-center p-4 overflow-hidden" style={{ background: 'radial-gradient(120% 100% at 50% 45%, #100c14 0%, #07060A 70%)' }}>
      <div className="relative w-[min(420px,94vw)] px-6 py-9 text-center" style={{ background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-strong)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
        <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: 72, height: 72 }}>
          <span className="ravenof-spinner" style={{ width: 56, height: 56 }} />
        </div>
        <p style={{ font: '700 14px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)', margin: '0 0 3px' }}>{status}</p>
        <p className="tabular-nums" style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: '0 0 22px' }}>{t('ranked.queue.waitingFor', { sec: elapsed })}</p>
        <button onClick={cancel} className="ravenof-btn ravenof-btn-secondary mx-auto" style={{ minHeight: 40, minWidth: 150 }}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
