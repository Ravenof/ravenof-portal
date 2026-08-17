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

// ── Matchmaking ratas: file-first asset (/ravenof-ui/ranked/queue-spinner.png,
// spec — README-QUEUE-SPINNER.md) sukasi greitai su „motion blur" (2 vėluojančios
// pritemdytos kopijos), skrieja kibirkštys ir kyla dūmai. Asset'o nesant —
// senas generinis ravenof-spinner (onError fallback). Reduced-motion: lėtas
// sukimasis be kibirkščių/dūmų. ──
function QueueSpinner() {
  const [assetOk, setAssetOk] = useState(true)
  const SRC = '/ravenof-ui/ranked/queue-spinner.png'
  if (!assetOk) return <span className="ravenof-spinner" style={{ width: 56, height: 56 }} />
  return (
    <div className="rvn-mmq" aria-hidden style={{ position: 'relative', width: 96, height: 96 }}>
      <style>{`
        @keyframes rvnQSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes rvnQSpark {
          0% { transform: translate(-50%, -50%) rotate(var(--a)) translateX(30px) scale(1); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(calc(var(--a) + 55deg)) translateX(72px) scale(0.2); opacity: 0; }
        }
        @keyframes rvnQSmoke {
          0% { transform: translate(-50%, -40%) scale(0.5); opacity: 0; }
          25% { opacity: 0.5; }
          100% { transform: translate(calc(-50% + var(--dx)), -150%) scale(1.6); opacity: 0; }
        }
        .rvn-mmq-img { position: absolute; inset: 10px; width: 76px; height: 76px; object-fit: contain;
          animation: rvnQSpin 0.9s linear infinite; will-change: transform; }
        .rvn-mmq-ghost1 { filter: blur(2px) brightness(1.1); opacity: 0.45; animation-delay: -0.045s; }
        .rvn-mmq-ghost2 { filter: blur(5px) brightness(1.2); opacity: 0.22; animation-delay: -0.09s; }
        .rvn-mmq-spark { position: absolute; left: 50%; top: 50%; width: 5px; height: 5px; border-radius: 50%;
          background: radial-gradient(circle, #ffe9a8 0%, #f0b429 55%, rgba(240,110,30,0) 100%);
          box-shadow: 0 0 6px #f0b429, 0 0 12px rgba(240,140,41,0.7);
          animation: rvnQSpark 1.1s ease-out infinite; }
        .rvn-mmq-smoke { position: absolute; left: 50%; top: 46%; width: 30px; height: 30px; border-radius: 50%;
          background: radial-gradient(circle, rgba(150,140,150,0.5) 0%, rgba(90,80,95,0.25) 55%, transparent 75%);
          filter: blur(6px); animation: rvnQSmoke 2.6s ease-out infinite; pointer-events: none; }
        @media (prefers-reduced-motion: reduce) {
          .rvn-mmq-img { animation-duration: 6s; }
          .rvn-mmq-ghost1, .rvn-mmq-ghost2, .rvn-mmq-spark, .rvn-mmq-smoke { display: none; }
        }
      `}</style>
      {/* dūmai (po emblema, kyla aukštyn) */}
      {[0, 1, 2].map((i) => (
        <span key={'sm' + i} className="rvn-mmq-smoke" style={{ ['--dx' as never]: `${(i - 1) * 16}px`, animationDelay: `${i * 0.85}s` } as React.CSSProperties} />
      ))}
      {/* motion blur: vėluojančios kopijos po pagrindiniu */}
      {/* eslint-disable @next/next/no-img-element */}
      <img src={SRC} alt="" draggable={false} className="rvn-mmq-img rvn-mmq-ghost2" />
      <img src={SRC} alt="" draggable={false} className="rvn-mmq-img rvn-mmq-ghost1" />
      <img src={SRC} alt="" draggable={false} className="rvn-mmq-img" onError={() => setAssetOk(false)} />
      {/* eslint-enable @next/next/no-img-element */}
      {/* kibirkštys nuo rato krašto (tangentiškai, stagger) */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span key={'sp' + i} className="rvn-mmq-spark"
          style={{ ['--a' as never]: `${i * 45}deg`, animationDelay: `${(i % 4) * 0.28 + (i > 3 ? 0.14 : 0)}s`, animationDuration: `${0.95 + (i % 3) * 0.18}s` } as React.CSSProperties} />
      ))}
    </div>
  )
}

export function RankedQueue({ deckId, onMatch, onCancel }: {
  deckId: string
  onMatch: (opp: MatchedOpponent) => void
  onCancel: () => void
}) {
  const t = useT()
  const [elapsed, setElapsed] = useState(0)
  const doneRef = useRef(false)

  // Ekranas NEužmiega kol ieškom varžovo: Screen Wake Lock API (palaikoma
  // Chrome/Android WebView/Safari 16.4+). Tab'ui grįžus iš fono — atnaujinama
  // (lock automatiškai atleidžiamas paslėpus tab'ą). Nepalaikoma → tyliai nieko.
  useEffect(() => {
    type WakeLockSentinel = { release: () => Promise<void> }
    let lock: WakeLockSentinel | null = null
    let disposed = false
    const acquire = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinel> } }).wakeLock
        if (!wl) return
        const l = await wl.request('screen')
        if (disposed) { void l.release() } else lock = l
      } catch { /* naršyklė neleido (pvz. battery saver) — nieko */ }
    }
    const onVis = () => { if (document.visibilityState === 'visible') void acquire() }
    void acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => { disposed = true; document.removeEventListener('visibilitychange', onVis); void lock?.release(); lock = null }
  }, [])

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
        <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: 96, height: 96, overflow: 'visible' }}>
          <QueueSpinner />
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
