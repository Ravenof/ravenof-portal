'use client'

// ── Matchmaking eilė — laipsniškai plečia paiešką; po 60 s krenta į botą. ────
// 0–20 s: ±3 žingsniai · 20–40 s: ±10 · 40–60 s: bet koks · >60 s: botas.
import { useEffect, useRef, useState } from 'react'
import { oct } from './_ui'
import { queueJoin, queueLeave, queuePoll, pickBot, getOpponentSummary } from '@/lib/ranked/client'
import { playRanked } from '@/lib/ranked/sound'

export type MatchedOpponent = {
  kind: 'bot' | 'real'
  id: string | null            // bot slug arba real user id
  name: string
  avatar: string
  faction: string
  factionSlug: string | null
  rankStep: number
  difficulty: 'easy' | 'normal' | 'hard'
}

const BOT_FALLBACK_SEC = 60

export function RankedQueue({ deckId, onMatch, onCancel }: {
  deckId: string
  onMatch: (opp: MatchedOpponent) => void
  onCancel: () => void
}) {
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
      if (r.status === 'matched' && r.opponent) {
        doneRef.current = true
        const summ = await getOpponentSummary(r.opponent)
        await queueLeave()
        onMatch({
          kind: 'real', id: r.opponent,
          name: summ?.name ?? 'Žaidėjas', avatar: '🛡️',
          faction: summ?.faction ?? 'Nežinoma', factionSlug: null,
          rankStep: summ?.rankStep ?? 0, difficulty: 'normal',
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

  const status = elapsed < 20 ? 'Ieškoma panašaus rango priešininko…'
    : elapsed < 40 ? 'Plečiama paieška…'
    : elapsed < BOT_FALLBACK_SEC ? 'Ieškoma bet kokio reitingo priešininko…'
    : 'Rastas priešininkas.'

  const cancel = () => { doneRef.current = true; playRanked('ranked_queue_cancel'); queueLeave(); onCancel() }

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.93)' }}>
      <div className="relative w-[min(420px,94vw)]" style={{ clipPath: oct(18), background: 'rgba(239,68,68,0.5)', padding: 2.5 }}>
        <div className="px-6 py-9 text-center" style={{ clipPath: oct(17), background: 'radial-gradient(120% 90% at 50% 0%, rgba(239,68,68,0.14), rgba(10,8,16,0.98) 62%), linear-gradient(160deg,#15101f,#0a0810)' }}>
          {/* sukasi runų žiedas */}
          <div className="relative mx-auto mb-5" style={{ width: 92, height: 92 }}>
            <div className="absolute inset-0 rounded-full" style={{ border: '2px solid rgba(239,68,68,0.25)' }} />
            <div className="absolute inset-0 rounded-full animate-spin" style={{ borderTop: '2px solid var(--gold)', borderRight: '2px solid transparent', borderBottom: '2px solid transparent', borderLeft: '2px solid transparent', animationDuration: '1.4s' }} />
            <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">⚔️</div>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>{status}</p>
          <p className="text-xs mb-6 tabular-nums" style={{ color: 'var(--text-muted)' }}>Laukiama: {elapsed}s</p>
          <button onClick={cancel} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.45)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>
            Atšaukti
          </button>
        </div>
      </div>
    </div>
  )
}
