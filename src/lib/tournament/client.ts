'use client'
// ── Turnyrai: RPC apvalkalai + realtime būsenos hook'as ──────────────────────
// Serverio logika – supabase/migrations/20261003_tournaments.sql (rvn_tourney_*).
// Tinklelio šablonas – ./bracket.ts (perduodamas startuojant).
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildBracket, type TourneySize } from './bracket'
import type { BattleFormat } from '@/lib/game/format'

export type TourneyStatus = 'lobby' | 'running' | 'finished' | 'abandoned'
export type Tournament = {
  id: string; code: string | null; size: TourneySize; format: BattleFormat; is_public: boolean
  host_id: string; status: TourneyStatus; winner_entrant: string | null
  created_at: string; started_at: string | null; finished_at: string | null
}
export type Entrant = {
  id: string; tournament_id: string; user_id: string | null; bot_slug: string | null
  name: string; avatar: string | null; deck_id: string | null; faction_id: number | null
  seed: number | null; status: 'active' | 'eliminated' | 'left'; losses: number
  final_place: number | null; reward: { items: RewardItem[]; mult: number } | null; reward_granted: boolean
}
export type RewardItem = { type: 'currency'; currency: 'silver' | 'essence' | 'rubies'; amount: number } | { type: 'item'; item_type: string; item_id: string; quantity: number }
export type TMatch = {
  id: string; tournament_id: string; key: string; bracket: 'W' | 'L' | 'GF'; round: number; idx: number
  entrant_a: string | null; entrant_b: string | null; status: 'waiting' | 'ready_check' | 'live' | 'done' | 'skipped'
  ready_a: boolean; ready_b: boolean; ready_deadline: string | null; pvp_match_id: string | null
  winner: string | null; reason: string | null; started_at: string | null; finished_at: string | null
  loser_place: number | null
}
export type TourneyRewardsConfig = { places: Record<string, Record<string, RewardItem[]>> }

/** RPC klaidos kodas → i18n raktas (battle.tournament.err.*). */
export function tourneyErrKey(msg: string | undefined | null): string {
  const m = /tourney_[a-z_]+/.exec(msg ?? '')
  return m ? `battle.tournament.err.${m[0].replace('tourney_', '')}` : 'battle.tournament.err.generic'
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const { data, error } = await createClient().rpc(fn, args)
  if (error) return { error: error.message }
  return { data: data as T }
}

export const tourneyCreate = (size: TourneySize, isPublic: boolean, format: BattleFormat, deckId: string) =>
  rpc<{ id: string; code: string }>('rvn_tourney_create', { p_size: size, p_public: isPublic, p_format: format, p_deck: deckId })
export const tourneyJoin = (id: string, deckId: string) => rpc<{ id: string }>('rvn_tourney_join', { p_id: id, p_deck: deckId })
export const tourneyJoinCode = (code: string, deckId: string) => rpc<{ id: string }>('rvn_tourney_join_code', { p_code: code, p_deck: deckId })
export const tourneyLeave = (id: string) => rpc<null>('rvn_tourney_leave', { p_id: id })
export const tourneyKick = (id: string, entrantId: string) => rpc<null>('rvn_tourney_kick', { p_id: id, p_entrant: entrantId })
export const tourneyFillBots = (id: string) => rpc<number>('rvn_tourney_fill_bots', { p_id: id })
export const tourneyStart = (id: string, size: TourneySize) => rpc<null>('rvn_tourney_start', { p_id: id, p_template: buildBracket(size) })
export const tourneyTick = (id: string) => rpc<null>('rvn_tourney_tick', { p_id: id })
export const tourneyReady = (matchId: string) => rpc<null>('rvn_tourney_ready', { p_match: matchId })
export const tourneyReport = (matchId: string, winnerEntrantId: string) => rpc<null>('rvn_tourney_report', { p_match: matchId, p_winner: winnerEntrantId })

/** Atviri viešieji lobby + mano aktyvus turnyras. */
export async function listOpenTournaments(): Promise<(Tournament & { entrants: number })[]> {
  const supabase = createClient()
  const { data } = await supabase.from('dig_tournaments').select('*, dig_tourney_entrants(count)')
    .eq('status', 'lobby').eq('is_public', true).order('created_at', { ascending: false }).limit(30)
  return ((data as unknown as (Tournament & { dig_tourney_entrants: { count: number }[] })[]) ?? [])
    .map((t) => ({ ...t, entrants: t.dig_tourney_entrants?.[0]?.count ?? 0 }))
}
export async function myActiveTournament(userId: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.from('dig_tourney_entrants').select('tournament_id, status, dig_tournaments!inner(status)')
    .eq('user_id', userId).in('dig_tournaments.status', ['lobby', 'running']).order('joined_at', { ascending: false }).limit(5)
  const rows = (data as unknown as { tournament_id: string; status: string }[]) ?? []
  // tik dar žaidžiantis (iškritęs / pasitraukęs automatiškai nebegrąžinamas)
  return rows.find((r) => r.status === 'active')?.tournament_id ?? null
}
export async function getRewardsConfig(): Promise<TourneyRewardsConfig | null> {
  const { data } = await createClient().from('economy_config').select('value').eq('key', 'tournament_rewards').maybeSingle()
  return (data as { value?: TourneyRewardsConfig } | null)?.value ?? null
}

/** Pilna turnyro būsena su Realtime atnaujinimais + periodiniu tick (terminai, botų kovos). */
export function useTournament(id: string | null) {
  const [t, setT] = useState<Tournament | null>(null)
  const [entrants, setEntrants] = useState<Entrant[]>([])
  const [matches, setMatches] = useState<TMatch[]>([])
  const [loaded, setLoaded] = useState(false)
  const reloadRef = useRef<() => void>(() => {})

  const reload = useCallback(async () => {
    if (!id) return
    const supabase = createClient()
    const [a, b, c] = await Promise.all([
      supabase.from('dig_tournaments').select('*').eq('id', id).maybeSingle(),
      supabase.from('dig_tourney_entrants').select('*').eq('tournament_id', id).order('joined_at'),
      supabase.from('dig_tourney_matches').select('*').eq('tournament_id', id),
    ])
    setT((a.data as Tournament | null) ?? null)
    setEntrants((b.data as Entrant[] | null) ?? [])
    setMatches((c.data as TMatch[] | null) ?? [])
    setLoaded(true)
  }, [id])
  reloadRef.current = () => { void reload() }

  useEffect(() => {
    if (!id) { setT(null); setEntrants([]); setMatches([]); setLoaded(false); return }
    void reload()
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null
    // Kelios eilutės keičiasi vienu metu → vienas perkrovimas (debounce)
    const bump = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => reloadRef.current(), 150) }
    const ch = supabase.channel('tourney-db-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dig_tournaments', filter: `id=eq.${id}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dig_tourney_entrants', filter: `tournament_id=eq.${id}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dig_tourney_matches', filter: `tournament_id=eq.${id}` }, bump)
      .subscribe()
    // Atsarginis perkrovimas (jei Realtime neįjungtas / nutrūko)
    const poll = setInterval(() => reloadRef.current(), 8000)
    return () => { if (timer) clearTimeout(timer); clearInterval(poll); void supabase.removeChannel(ch) }
  }, [id, reload])

  // Tick: terminai / botų kovos / pasitraukusieji – kas 4 s, kol turnyras vyksta
  const running = t?.status === 'running'
  useEffect(() => {
    if (!id || !running) return
    const iv = setInterval(() => { void tourneyTick(id) }, 4000)
    return () => clearInterval(iv)
  }, [id, running])

  return { t, entrants, matches, loaded, reload }
}
