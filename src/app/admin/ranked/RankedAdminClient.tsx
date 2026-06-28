'use client'

// ── Admin: Reitingo kovos valdymas + debug įrankiai ──────────────────────────
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getActiveSeason, ensureProfile } from '@/lib/ranked/client'
import { formatRank, stepFromRank, rankNumberFromStep, medalTierFromStep } from '@/lib/ranked/rank'
import type { RankedSeason } from '@/lib/ranked/types'
import { Leaderboard } from '@/components/digital/ranked/Leaderboard'

type BotRow = { id: string; slug: string; name: string; faction: string | null; rank_step: number; active: boolean; wins: number; losses: number; difficulty: string }

export function RankedAdminClient() {
  const supabase = createClient()
  const [season, setSeason] = useState<RankedSeason | null>(null)
  const [bots, setBots] = useState<BotRow[]>([])
  const [counts, setCounts] = useState({ profiles: 0, matches: 0, queue: 0 })
  const [myStep, setMyStep] = useState(0)
  const [jump, setJump] = useState(0)
  const [log, setLog] = useState<string[]>([])

  const say = (m: string) => setLog((l) => [`${new Date().toLocaleTimeString()} · ${m}`, ...l].slice(0, 12))

  const refresh = useCallback(async () => {
    const s = await getActiveSeason(); setSeason(s)
    const p = await ensureProfile(); if (p) { setMyStep(p.rank_step); setJump(p.rank_step) }
    const { data: b } = await supabase.from('ranked_bots').select('id, slug, name, faction, rank_step, active, wins, losses, difficulty').order('rank_step', { ascending: false })
    setBots((b as BotRow[]) ?? [])
    const [pc, mc, qc] = await Promise.all([
      supabase.from('ranked_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('ranked_matches').select('*', { count: 'exact', head: true }),
      supabase.from('ranked_queue').select('*', { count: 'exact', head: true }),
    ])
    setCounts({ profiles: pc.count ?? 0, matches: mc.count ?? 0, queue: qc.count ?? 0 })
  }, [supabase])

  useEffect(() => { refresh() }, [refresh])

  const simulate = async (result: 'win' | 'loss') => {
    const { error } = await supabase.rpc('rvn_report_ranked_match', { p_payload: {
      opponentKind: 'bot', opponentId: 'debug', opponentName: 'Debug', opponentRankStep: myStep,
      result, playerFaction: null, opponentFaction: null, durationSeconds: 60, turnsPlayed: 5,
      stats: { creaturesKilled: 3, creaturesLost: 2, championsKilled: 0, championsLost: 0, totalKills: 3, totalDeaths: 2, damageDealtToEnemyPlayer: 40, damageTaken: 25, cardsPlayed: 8, spellsPlayed: 2, effectsTriggered: 1, hpRemaining: 15, hpLowest: 8 },
      clientMatchId: `debug-${Date.now()}-${Math.random()}`,
    } })
    say(error ? `Simulate ${result} KLAIDA: ${error.message}` : `Simuliuota: ${result}`)
    refresh()
  }

  const doJump = async () => {
    const { error } = await supabase.rpc('rvn_admin_set_rank', { p_user: (await supabase.auth.getUser()).data.user?.id, p_step: jump, p_reason: 'debug_jump' })
    say(error ? `Jump KLAIDA: ${error.message}` : `Peršokta į ${formatRank(jump)}`)
    refresh()
  }

  const endSeason = async () => {
    if (!confirm('Užbaigti aktyvų sezoną ir resetinti? Veiksmas negrįžtamas.')) return
    const { error } = await supabase.rpc('rvn_admin_end_season', { p_new_name: null })
    say(error ? `End season KLAIDA: ${error.message}` : 'Sezonas užbaigtas, naujas sukurtas.')
    refresh()
  }

  const simMatches = async () => {
    const { data, error } = await supabase.rpc('rvn_admin_simulate_bot_matches', { p_rounds: 1 })
    say(error ? `Bot kovos KLAIDA: ${error.message}` : `Botų tarpusavio kovos sužaistos (${data}).`)
    refresh()
  }
  const simLadder = async () => {
    const { data, error } = await supabase.rpc('rvn_simulate_bot_ladder', { p_rounds: 10 })
    say(error ? `Bot ladder KLAIDA: ${error.message}` : `Botų laiptai pajudinti (${data} kovų).`)
    refresh()
  }

  const toggleBot = async (b: BotRow) => {
    const { error } = await supabase.from('ranked_bots').update({ active: !b.active }).eq('id', b.id)
    if (!error) refresh()
  }
  const setBotStep = async (b: BotRow, step: number) => {
    const { error } = await supabase.from('ranked_bots').update({ rank_step: Math.max(0, Math.min(149, step)) }).eq('id', b.id)
    if (!error) refresh()
  }

  const card = { background: 'rgba(10,8,16,0.6)', border: '1px solid var(--bg-border)', borderRadius: 12, padding: '1rem' } as React.CSSProperties
  const btn = { padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties

  return (
    <div className="space-y-5">
      {/* Sezonas + skaitliukai */}
      <div style={card}>
        <p className="text-sm font-bold mb-2" style={{ color: 'var(--gold)' }}>Sezonas</p>
        {season ? (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{season.name} · iki {new Date(season.end_date).toLocaleDateString()} · profilių: {counts.profiles} · kovų: {counts.matches} · eilėje: {counts.queue}</p>
        ) : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nėra aktyvaus sezono.</p>}
        <button onClick={endSeason} style={{ ...btn, marginTop: 10, background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }}>Užbaigti sezoną + reset</button>
        <button onClick={simLadder} style={{ ...btn, marginTop: 10, marginLeft: 8, background: 'rgba(96,165,250,0.16)', border: '1px solid rgba(96,165,250,0.5)', color: '#93c5fd' }}>Simuliuoti botų laiptus (10 raundų)</button>
        <button onClick={simMatches} style={{ ...btn, marginTop: 10, marginLeft: 8, background: 'rgba(168,85,247,0.16)', border: '1px solid rgba(168,85,247,0.5)', color: '#c4b5fd' }}>Simuliuoti botų kovas (K/D)</button>
      </div>

      {/* Debug įrankiai */}
      <div style={card}>
        <p className="text-sm font-bold mb-1" style={{ color: 'var(--gold)' }}>Debug įrankiai</p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Tavo rangas: <b style={{ color: 'var(--text-primary)' }}>{formatRank(myStep)}</b> (step {myStep})</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => simulate('win')} style={{ ...btn, background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac' }}>Simulate Win</button>
          <button onClick={() => simulate('loss')} style={{ ...btn, background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }}>Simulate Loss</button>
          <span className="inline-flex items-center gap-1">
            <input type="number" min={0} max={149} value={jump} onChange={(e) => setJump(Number(e.target.value))} style={{ width: 70, padding: '0.35rem', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', fontSize: 12 }} />
            <button onClick={doJump} style={{ ...btn, background: 'rgba(240,180,41,0.18)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>Jump → {jump >= 0 && jump <= 149 ? `${rankNumberFromStep(jump)} ${medalTierFromStep(jump)}` : '?'}</button>
          </span>
          <button onClick={() => { setJump(stepFromRank(50, 'bronze')); }} style={{ ...btn, background: 'rgba(120,120,140,0.18)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}>50 Bronza</button>
          <button onClick={() => { setJump(stepFromRank(1, 'gold')); }} style={{ ...btn, background: 'rgba(120,120,140,0.18)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}>1 Auksas</button>
        </div>
        {log.length > 0 && (
          <div className="mt-3 text-[11px] space-y-0.5" style={{ color: 'var(--text-muted)' }}>{log.map((l, i) => <p key={i}>{l}</p>)}</div>
        )}
      </div>

      {/* Botai (tapatybė matoma tik admin) */}
      <div style={card}>
        <p className="text-sm font-bold mb-2" style={{ color: 'var(--gold)' }}>Botai ({bots.length})</p>
        <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
          {bots.map((b) => (
            <div key={b.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.25)', opacity: b.active ? 1 : 0.5 }}>
              <span className="flex-1 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name} <span style={{ color: 'var(--text-muted)' }}>· {b.faction ?? '—'} · {b.difficulty} · {b.wins}/{b.losses}</span></span>
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--gold)' }}>{formatRank(b.rank_step)}</span>
              <button onClick={() => setBotStep(b, b.rank_step + 3)} style={{ ...btn, padding: '0.2rem 0.5rem', background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.4)' }}>▲</button>
              <button onClick={() => setBotStep(b, b.rank_step - 3)} style={{ ...btn, padding: '0.2rem 0.5rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>▼</button>
              <button onClick={() => toggleBot(b)} style={{ ...btn, padding: '0.2rem 0.5rem', background: 'rgba(120,120,140,0.15)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.12)' }}>{b.active ? 'Išj.' : 'Įj.'}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard su botų atskleidimu */}
      <div style={card}>
        <p className="text-sm font-bold mb-2" style={{ color: 'var(--gold)' }}>Topas (botai atskleisti)</p>
        <Leaderboard revealBots />
      </div>
    </div>
  )
}
