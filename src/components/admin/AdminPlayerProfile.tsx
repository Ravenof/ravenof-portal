'use client'

// ── Admin: žaidėjo profilis su skiltimis (Apžvalga · Kovos · Kolekcija · Kaladės · Ekonomika · Klaidos) ──
import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { UserRoleForm } from '@/components/admin/UserRoleForm'
import { AdminGrantPanel, type GrantOptions, type GrantLogRow } from '@/components/admin/AdminGrantPanel'
import { UserDangerButtons } from '@/components/admin/UserDangerButtons'
import { getLevelTitleForXp } from '@/lib/gamification/levels'
import { formatRank } from '@/lib/ranked/rank'

export type PlayerOverview = {
  profile: {
    id: string; username: string; display_name: string | null; avatar_url: string | null; role: string
    created_at: string; last_seen_at: string | null; digital_onboarded_at: string | null
    xp_total: number; level: number; rank_key: string | null; gold: number; rubies: number; essence: number
    email: string | null; auth_last_sign_in_at: string | null; auth_providers: string[]; email_confirmed_at: string | null
    last_platform: string | null; last_app_version: string | null; preferred_locale: string | null; player_id: string | null
    active_deck_id: string | null; ranked_win_streak: number; equipped_avatar: string | null; equipped_card_back: string | null
  }
  matches: {
    total: number; wins: number; losses: number; by_mode: Record<string, number>; wins_by_mode: Record<string, number>
    vs_human: number; vs_bot: number; first_at: string | null; last_at: string | null; active_days: number
    avg_duration_s: number | null; avg_turns: number | null; total_duration_s: number
    silver_earned: number; xp_earned: number; season_xp_earned: number; last_7d: number; last_30d: number
    per_day: { d: string; n: number }[]
    factions: { faction: string; color: string | null; n: number; wins: number }[]
    top_opponents: { id: string; name: string | null; username: string | null; n: number; wins: number }[]
  }
  ranked: { total: number; wins: number; vs_real: number; last_at: string | null; best_step: number | null; current_step: number | null; ups: number; downs: number }
  collection: {
    distinct: number; copies: number; total_cards: number
    by_faction: { faction: string; color: string | null; owned: number; copies: number; total: number }[]
    by_rarity: { rarity: string; color: string | null; owned: number; copies: number; total: number }[]
  }
  packs: { name: string; qty: number; image: string | null }[]
  decks: { id: string; name: string; faction: string | null; color: string | null; cards: number; visibility: string; updated_at: string; is_active: boolean }[]
  streak: { current_streak: number; longest_streak: number; last_checkin: string | null; total_checkins: number } | null
  monthly_login: { this_month: number; total: number }
  friends: number
  achievements: { completed: number; total: number }
  season_pass: { xp: number; has_season_pass: boolean; claimed_tiers: number[] } | null
  grants: { at: string; source: string; type: string; amount: number | null; card: string | null }[]
  quests_done: number
  bugs: number
}
export type PlayerMatch = {
  id: string; created_at: string; mode: string; result: string; opponent_type: string; opponent_id: string | null
  opponent_name: string | null; opponent_username: string | null; duration_seconds: number | null; turns_played: number | null
  faction: string | null; faction_color: string | null; silver_reward: number | null; account_xp_reward: number | null; season_xp_reward: number | null
  valid_for_rewards: boolean | null; creatures_played: number | null; spells_played: number | null; damage_dealt: number | null; face_damage: number | null
  creatures_killed: number | null; cards_drawn: number | null; heal_done: number | null; hp_remaining: number | null; hp_lost: number | null
  gold_spent: number | null; curses_activated: number | null; champion_abilities: number | null; player_actions_count: number | null; opponent_actions_count: number | null
}
export type PlayerCard = { id: string; card_number: string | null; name: string; faction: string | null; faction_color: string | null; rarity: string | null; rarity_color: string | null; is_champion: boolean; qty: number }
type Bug = { id: number; created_at: string; category: string; severity: string; title: string; status: string; platform: string | null; app_version: string | null }
type Agg = { n: number; wins: number; seconds: number; avg_s: number | null; last_at?: string | null; vs_human?: number; vs_bot?: number }
export type PlayerStats = {
  total: { n: number; wins: number; losses: number; seconds: number; avg_s: number | null; max_s: number | null; avg_turns: number | null; first_at: string | null; last_at: string | null; active_days: number }
  by_format: Record<string, Agg>
  by_mode: Record<string, Agg>
  matrix: { format: string; mode: string; n: number; wins: number; seconds: number }[]
  weekly: { week: string; n: number; seconds: number }[]
  by_difficulty: Record<string, { n: number; wins: number }>
  ranked: Record<string, { season: string; rank_step: number; best_step: number; wins: number; losses: number; streak: number; vs_real: number }>
}
const FORMAT_LABEL: Record<string, string> = { zmk: 'ŽMK kovos', classic: 'Klasika (be ŽMK)' }

const TABS = ['Apžvalga', 'Kovos', 'Kolekcija', 'Kaladės', 'Ekonomika', 'Klaidos'] as const
const MODE_LABEL: Record<string, string> = { bot: 'Kova su DI', ranked: 'Reitingas', unranked: 'Draugiška', coop: '2v2' }
const ROLE_COLORS: Record<string, string> = { admin: '#ef4444', tester: '#7bd389', event_moderator: '#a78bfa', user: '#6b7280', banned: '#ef4444' }

const fmtDT = (d: string | null | undefined) => d ? new Date(d).toLocaleString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtD = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('lt-LT') : '—'
const ago = (d: string | null | undefined) => {
  if (!d) return '—'
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'ką tik'; if (m < 60) return `prieš ${m} min.`
  const h = Math.round(m / 60); if (h < 48) return `prieš ${h} val.`
  return `prieš ${Math.round(h / 24)} d.`
}
const dur = (s: number | null | undefined) => s == null ? '—' : s >= 3600 ? `${Math.floor(s / 3600)} val. ${Math.round((s % 3600) / 60)} min.` : `${Math.round(s / 60)} min.`
const pct = (a: number, b: number) => b > 0 ? `${Math.round((a / b) * 100)} %` : '—'
const n = (v: number | null | undefined) => (v ?? 0).toLocaleString('lt-LT')

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-4 ${className}`} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
      {title && <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>{title}</div>}
      {children}
    </div>
  )
}
function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  )
}
function Bar({ a, b, color }: { a: number; b: number; color?: string | null }) {
  return <div className="h-1.5 rounded overflow-hidden" style={{ background: 'var(--bg-elevated)' }}><div style={{ width: `${b > 0 ? Math.min(100, (a / b) * 100) : 0}%`, height: '100%', background: color ?? 'var(--gold)' }} /></div>
}

export function AdminPlayerProfile({ overview: o, matches, collection, bugs, isSelf, stats, grantOptions, grantLog }: { overview: PlayerOverview; matches: PlayerMatch[]; collection: PlayerCard[]; bugs: Bug[]; isSelf: boolean; stats?: PlayerStats | null; grantOptions?: GrantOptions | null; grantLog?: GrantLogRow[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Apžvalga')
  const p = o.profile, m = o.matches
  const daysSinceReg = Math.max(1, Math.round((Date.now() - new Date(p.created_at).getTime()) / 86400000))
  const weeks = Math.max(1, daysSinceReg / 7)

  return (
    <div className="flex flex-col gap-4">
      {/* ── Antraštė ── */}
      <Card>
        <div className="flex flex-wrap items-start gap-5">
          <div className="w-16 h-16 rounded-full shrink-0" style={{ border: '2px solid var(--gold)', background: p.avatar_url ? `center/cover url(${p.avatar_url})` : 'var(--bg-elevated)' }} />
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>{p.display_name ?? p.username}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>@{p.username}</span>
              <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: (ROLE_COLORS[p.role] ?? '#6b7280') + '20', color: ROLE_COLORS[p.role] ?? '#6b7280' }}>{p.role}</span>
              {p.player_id && <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.player_id}</span>}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {p.email ?? '—'} · {p.auth_providers?.length ? p.auth_providers.join(', ') : 'el. paštas'} {p.email_confirmed_at ? '' : '· nepatvirtintas'}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mt-3 text-xs">
              <div><span style={{ color: 'var(--text-muted)' }}>Registravosi</span><br />{fmtDT(p.created_at)} <span style={{ color: 'var(--text-muted)' }}>({daysSinceReg} d.)</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Paskutinį kartą matytas</span><br />{fmtDT(p.last_seen_at)} <span style={{ color: 'var(--text-muted)' }}>({ago(p.last_seen_at)})</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Paskutinė kova</span><br />{fmtDT(m.last_at)} <span style={{ color: 'var(--text-muted)' }}>({ago(m.last_at)})</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Platforma / versija</span><br />{p.last_platform ?? '—'} · v{p.last_app_version ?? '—'} · {p.preferred_locale ?? 'lt'}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Onboarding</span><br />{fmtDT(p.digital_onboarded_at)}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Paskutinis prisijungimas (auth)</span><br />{fmtDT(p.auth_last_sign_in_at)}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Lygis</span><br />Lv{p.level} · {n(p.xp_total)} XP · {getLevelTitleForXp(p.xp_total)}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Rangas</span><br />{o.ranked.current_step != null ? formatRank(o.ranked.current_step) : '—'} {o.ranked.best_step != null && <span style={{ color: 'var(--text-muted)' }}>(geriausias: {formatRank(o.ranked.best_step)})</span>}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="flex gap-3 text-sm font-bold">
              <span title="Sidabras" style={{ color: 'var(--gold)' }}>🪙 {n(p.gold)}</span>
              <span title="Rubinai" style={{ color: '#fca5a5' }}>◆ {n(p.rubies)}</span>
              <span title="Esencija" style={{ color: '#c4b5fd' }}>✦ {n(p.essence)}</span>
            </div>
            {!isSelf && <UserRoleForm userId={p.id} currentRole={p.role} />}
            {!isSelf && <UserDangerButtons userId={p.id} isBanned={p.role === 'banned'} />}
          </div>
        </div>
      </Card>

      {/* ── Skiltys ── */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: tab === t ? 'var(--gold)' : 'var(--bg-elevated)', color: tab === t ? '#0a0a0f' : 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
            {t}{t === 'Kovos' ? ` (${m.total})` : t === 'Klaidos' ? ` (${o.bugs})` : t === 'Kaladės' ? ` (${o.decks.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'Apžvalga' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stats && (
            <Card title="Žaidimo laikas ir formatai" className="md:col-span-2 xl:col-span-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <Stat label="Iš viso žaista" value={dur(stats.total.seconds)} sub={`${n(stats.total.n)} kovos · vid. ${dur(stats.total.avg_s)} · ilgiausia ${dur(stats.total.max_s)}`} />
                <Stat label="ŽMK kovos" value={n(stats.by_format.zmk?.n ?? 0)} sub={`${pct(stats.by_format.zmk?.wins ?? 0, stats.by_format.zmk?.n ?? 0)} perg. · ${dur(stats.by_format.zmk?.seconds ?? 0)}`} />
                <Stat label="Klasika (be ŽMK)" value={n(stats.by_format.classic?.n ?? 0)} sub={`${pct(stats.by_format.classic?.wins ?? 0, stats.by_format.classic?.n ?? 0)} perg. · ${dur(stats.by_format.classic?.seconds ?? 0)}`} />
                <Stat label="Vid. ėjimų / kova" value={stats.total.avg_turns ?? '—'} sub={`${n(stats.total.active_days)} aktyvios d.`} />
              </div>
              <table className="w-full text-xs">
                <thead><tr style={{ color: 'var(--text-muted)' }}><th className="text-left font-normal pb-1">Režimas</th><th className="text-right font-normal">Kovos</th><th className="text-right font-normal">Perg.</th><th className="text-right font-normal">Žmonės / DI</th><th className="text-right font-normal">Laikas</th><th className="text-right font-normal">Vid.</th><th className="text-right font-normal">ŽMK / Klasika</th><th className="text-right font-normal">Paskutinė</th></tr></thead>
                <tbody>
                  {Object.entries(stats.by_mode).sort((a, b) => b[1].n - a[1].n).map(([mode, a]) => {
                    const z = stats.matrix.find((x) => x.mode === mode && x.format === 'zmk')?.n ?? 0
                    const c = stats.matrix.find((x) => x.mode === mode && x.format === 'classic')?.n ?? 0
                    return (
                      <tr key={mode} style={{ borderTop: '1px solid var(--bg-border)' }}>
                        <td className="py-1">{MODE_LABEL[mode] ?? mode}</td>
                        <td className="text-right">{n(a.n)}</td>
                        <td className="text-right">{n(a.wins)} <span style={{ color: 'var(--text-muted)' }}>({pct(a.wins, a.n)})</span></td>
                        <td className="text-right">{n(a.vs_human)} / {n(a.vs_bot)}</td>
                        <td className="text-right">{dur(a.seconds)}</td>
                        <td className="text-right">{dur(a.avg_s)}</td>
                        <td className="text-right">{n(z)} / {n(c)}</td>
                        <td className="text-right" style={{ color: 'var(--text-muted)' }}>{fmtD(a.last_at)}</td>
                      </tr>
                    )
                  })}
                  {Object.keys(stats.by_mode).length === 0 && <tr><td colSpan={8} className="py-2 text-center" style={{ color: 'var(--text-muted)' }}>Kovų dar nėra</td></tr>}
                </tbody>
              </table>
              <div className="grid md:grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Reitingas pagal formatą</div>
                  {Object.keys(stats.ranked).length === 0 ? <div className="text-xs" style={{ color: 'var(--text-muted)' }}>—</div> : Object.entries(stats.ranked).map(([f, r]) => (
                    <div key={f} className="text-xs flex justify-between" style={{ borderTop: '1px solid var(--bg-border)', padding: '3px 0' }}>
                      <span>{FORMAT_LABEL[f] ?? f} <span style={{ color: 'var(--text-muted)' }}>· {r.season}</span></span>
                      <span>{formatRank(r.rank_step)} <span style={{ color: 'var(--text-muted)' }}>(geriausias {formatRank(r.best_step)}) · {r.wins}P/{r.losses}Pr · serija {r.streak}</span></span>
                    </div>
                  ))}
                  {Object.keys(stats.by_difficulty).length > 0 && (
                    <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>DI sudėtingumas: {Object.entries(stats.by_difficulty).map(([d, x]) => `${d} ${x.wins}/${x.n}`).join(' · ')}</div>
                  )}
                </div>
                <div>
                  <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Žaidimo laikas per savaitę (12 sav.)</div>
                  <div className="flex items-end gap-1" style={{ height: 56 }}>
                    {stats.weekly.length === 0 ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span> : (() => { const mx = Math.max(1, ...stats.weekly.map((w) => w.seconds)); return stats.weekly.map((w) => (
                      <div key={w.week} title={`${w.week}: ${w.n} kovos · ${dur(w.seconds)}`} className="flex-1 rounded-t" style={{ height: `${Math.max(3, Math.round((w.seconds / mx) * 100))}%`, background: 'var(--gold)', opacity: 0.85 }} />
                    )) })()}
                  </div>
                </div>
              </div>
            </Card>
          )}
          <Card title="Kovos">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Iš viso" value={n(m.total)} sub={`${n(m.wins)} perg. · ${n(m.losses)} pral. · ${pct(m.wins, m.total)}`} />
              <Stat label="Su žmonėmis / DI" value={`${n(m.vs_human)} / ${n(m.vs_bot)}`} />
              <Stat label="Pirma kova" value={fmtD(m.first_at)} />
              <Stat label="Paskutinė kova" value={fmtD(m.last_at)} sub={ago(m.last_at)} />
              <Stat label="Per 7 d. / 30 d." value={`${n(m.last_7d)} / ${n(m.last_30d)}`} />
              <Stat label="Aktyvių dienų" value={n(m.active_days)} sub={`iš ${daysSinceReg} nuo registracijos`} />
              <Stat label="Vid. kovų / aktyvią dieną" value={m.active_days ? (m.total / m.active_days).toFixed(1) : '—'} />
              <Stat label="Vid. kovų / savaitę" value={(m.total / weeks).toFixed(1)} />
              <Stat label="Vid. trukmė" value={dur(m.avg_duration_s)} sub={`iš viso ${dur(m.total_duration_s)}`} />
              <Stat label="Vid. ėjimų" value={m.avg_turns ?? '—'} />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {Object.entries(m.by_mode ?? {}).sort((a, b) => b[1] - a[1]).map(([mode, cnt]) => (
                <div key={mode} className="text-xs">
                  <div className="flex justify-between"><span>{MODE_LABEL[mode] ?? mode}</span><span style={{ color: 'var(--text-secondary)' }}>{cnt} · perg. {pct(m.wins_by_mode?.[mode] ?? 0, cnt)}</span></div>
                  <Bar a={cnt} b={m.total} />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Aktyvumas (60 d.)">
            <div className="flex items-end gap-[2px] h-20">
              {(() => {
                const days: { d: string; n: number }[] = []
                const map = new Map(m.per_day.map((x) => [x.d, x.n]))
                for (let i = 59; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); days.push({ d, n: map.get(d) ?? 0 }) }
                const max = Math.max(1, ...days.map((x) => x.n))
                return days.map((x) => <div key={x.d} title={`${x.d}: ${x.n}`} className="flex-1 rounded-sm" style={{ height: `${Math.max(2, (x.n / max) * 100)}%`, background: x.n ? 'var(--gold)' : 'var(--bg-elevated)' }} />)
              })()}
            </div>
            <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}><span>prieš 60 d.</span><span>šiandien</span></div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Stat label="Prisijungimo serija" value={o.streak ? `${o.streak.current_streak} d.` : '—'} sub={o.streak ? `ilgiausia ${o.streak.longest_streak} · iš viso ${o.streak.total_checkins} · paskutinis ${fmtD(o.streak.last_checkin)}` : undefined} />
              <Stat label="Mėnesio atlygiai" value={`${o.monthly_login.this_month} šį mėn.`} sub={`iš viso ${o.monthly_login.total}`} />
              <Stat label="Užduotys atliktos" value={n(o.quests_done)} />
              <Stat label="Pasiekimai" value={`${o.achievements.completed} / ${o.achievements.total}`} />
              <Stat label="Draugai" value={n(o.friends)} />
              <Stat label="Sezono kelias" value={o.season_pass ? `${n(o.season_pass.xp)} XP` : '—'} sub={o.season_pass ? `${o.season_pass.has_season_pass ? 'su bilietu' : 'be bilieto'} · paimta ${o.season_pass.claimed_tiers?.length ?? 0} lygių` : undefined} />
            </div>
          </Card>

          <Card title="Reitingas">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Reitingo kovų" value={n(o.ranked.total)} sub={`${n(o.ranked.wins)} perg. · ${pct(o.ranked.wins, o.ranked.total)}`} />
              <Stat label="Su tikrais žaidėjais" value={n(o.ranked.vs_real)} />
              <Stat label="Pakilimai / kritimai" value={`${o.ranked.ups} / ${o.ranked.downs}`} />
              <Stat label="Pergalių serija dabar" value={n(p.ranked_win_streak)} />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--text-muted)' }}>Dažniausi priešininkai</div>
            {m.top_opponents.length === 0 ? <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Su žmonėmis dar nežaidė</div> : m.top_opponents.map((x) => (
              <div key={x.id} className="flex justify-between text-xs py-1" style={{ borderTop: '1px solid var(--bg-border)' }}>
                <Link href={`/admin/users/${x.id}`} className="hover:underline" style={{ color: 'var(--text-primary)' }}>{x.name ?? x.username ?? x.id.slice(0, 8)}</Link>
                <span style={{ color: 'var(--text-secondary)' }}>{x.n} kovos · laimėjo {x.wins}</span>
              </div>
            ))}
          </Card>

          <Card title="Frakcijos kovose">
            {m.factions.length === 0 ? <div className="text-xs" style={{ color: 'var(--text-muted)' }}>—</div> : m.factions.map((f) => (
              <div key={f.faction} className="text-xs mb-2">
                <div className="flex justify-between"><span style={{ color: f.color ?? undefined }}>{f.faction}</span><span style={{ color: 'var(--text-secondary)' }}>{f.n} · perg. {pct(f.wins, f.n)}</span></div>
                <Bar a={f.n} b={m.total} color={f.color} />
              </div>
            ))}
          </Card>

          <Card title="Kolekcija">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Stat label="Skirtingų kortų" value={`${n(o.collection.distinct)} / ${n(o.collection.total_cards)}`} sub={pct(o.collection.distinct, o.collection.total_cards)} />
              <Stat label="Kopijų iš viso" value={n(o.collection.copies)} />
            </div>
            {o.collection.by_rarity.map((r) => (
              <div key={r.rarity} className="text-xs mb-2">
                <div className="flex justify-between"><span style={{ color: r.color ?? undefined }}>{r.rarity}</span><span style={{ color: 'var(--text-secondary)' }}>{r.owned} / {r.total} · {r.copies} kop.</span></div>
                <Bar a={r.owned} b={r.total} color={r.color} />
              </div>
            ))}
          </Card>

          <Card title="Uždirbta kovose">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Sidabras" value={n(m.silver_earned)} />
              <Stat label="Paskyros XP" value={n(m.xp_earned)} />
              <Stat label="Sezono XP" value={n(m.season_xp_earned)} />
              <Stat label="Pakuotės inventoriuje" value={n(o.packs.reduce((s, x) => s + x.qty, 0))} sub={o.packs.map((x) => `${x.name} ×${x.qty}`).join(', ') || undefined} />
            </div>
          </Card>
        </div>
      )}

      {tab === 'Kovos' && <MatchesTab matches={matches} />}

      {tab === 'Kolekcija' && <CollectionTab cards={collection} byFaction={o.collection.by_faction} />}

      {tab === 'Kaladės' && (
        <Card title="Kaladės">
          {o.decks.length === 0 ? <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Kaladžių nėra</div> : (
            <table className="w-full text-xs">
              <thead><tr style={{ color: 'var(--text-muted)' }}><th className="text-left py-1">Pavadinimas</th><th className="text-left">Frakcija</th><th className="text-left">Kortų</th><th className="text-left">Matomumas</th><th className="text-left">Atnaujinta</th></tr></thead>
              <tbody>{o.decks.map((d) => (
                <tr key={d.id} style={{ borderTop: '1px solid var(--bg-border)' }}>
                  <td className="py-1.5">{d.name} {d.is_active && <span className="ml-1 px-1.5 rounded text-[10px]" style={{ background: 'rgba(240,180,41,.18)', color: 'var(--gold)' }}>aktyvi</span>}</td>
                  <td style={{ color: d.color ?? undefined }}>{d.faction ?? '—'}</td>
                  <td>{d.cards}</td><td>{d.visibility}</td><td style={{ color: 'var(--text-muted)' }}>{fmtDT(d.updated_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'Ekonomika' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Balansai ir grantai" className="md:col-span-2 xl:col-span-1">
            <div className="flex gap-4 text-sm font-bold mb-3">
              <span style={{ color: 'var(--gold)' }}>🪙 {n(p.gold)}</span><span style={{ color: '#fca5a5' }}>◆ {n(p.rubies)}</span><span style={{ color: '#c4b5fd' }}>✦ {n(p.essence)}</span>
            </div>
            <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Pakuotės: {o.packs.length ? o.packs.map((x) => `${x.name} ×${x.qty}`).join(', ') : 'nėra'}</div>
            <AdminGrantPanel userId={p.id} options={grantOptions ?? null} log={grantLog ?? []}
              balances={{ silver: p.gold, rubies: p.rubies, essence: p.essence }}
              cards={collection.map((c) => ({ id: c.id, name: c.name, card_number: c.card_number, faction: c.faction, rarity: c.rarity, owned: c.qty }))} />
          </Card>
          <Card title="Paskutiniai atlygiai (60)">
            <div className="max-h-[480px] overflow-y-auto">
              {o.grants.length === 0 ? <div className="text-xs" style={{ color: 'var(--text-muted)' }}>—</div> : (
                <table className="w-full text-xs">
                  <tbody>{o.grants.map((g, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--bg-border)' }}>
                      <td className="py-1" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDT(g.at)}</td>
                      <td>{g.source}</td><td>{g.type}{g.card ? ` · ${g.card}` : ''}</td><td className="text-right">{g.amount ?? ''}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'Klaidos' && (
        <Card title="Klaidų pranešimai">
          {bugs.length === 0 ? <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Pranešimų nėra</div> : (
            <table className="w-full text-xs">
              <thead><tr style={{ color: 'var(--text-muted)' }}><th className="text-left py-1">#</th><th className="text-left">Data</th><th className="text-left">Kategorija</th><th className="text-left">Rimtumas</th><th className="text-left">Pavadinimas</th><th className="text-left">Platforma</th><th className="text-left">Būsena</th></tr></thead>
              <tbody>{bugs.map((b) => (
                <tr key={b.id} style={{ borderTop: '1px solid var(--bg-border)' }}>
                  <td className="py-1.5"><Link href={`/admin/bugs?id=${b.id}`} className="hover:underline" style={{ color: 'var(--gold)' }}>#{b.id}</Link></td>
                  <td style={{ color: 'var(--text-muted)' }}>{fmtDT(b.created_at)}</td><td>{b.category}</td><td>{b.severity}</td><td>{b.title}</td>
                  <td>{b.platform ?? '—'} v{b.app_version ?? '—'}</td><td>{b.status}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  )
}

function MatchesTab({ matches }: { matches: PlayerMatch[] }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <Card title={`Paskutinės kovos (${matches.length})`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr style={{ color: 'var(--text-muted)' }}>
            {['Data', 'Režimas', 'Priešininkas', 'Rezultatas', 'Trukmė', 'Ėjimai', 'Frakcija', 'Atlygis'].map((h) => <th key={h} className="text-left py-1 pr-3 whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>{matches.map((x) => (
            <Fragment key={x.id}>
              <tr onClick={() => setOpen(open === x.id ? null : x.id)} className="cursor-pointer hover:opacity-80" style={{ borderTop: '1px solid var(--bg-border)' }}>
                <td className="py-1.5 pr-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{fmtDT(x.created_at)}</td>
                <td className="pr-3">{MODE_LABEL[x.mode] ?? x.mode}</td>
                <td className="pr-3">{x.opponent_type === 'bot' ? <span style={{ color: 'var(--text-muted)' }}>DI</span> : x.opponent_id ? <Link href={`/admin/users/${x.opponent_id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{x.opponent_name ?? x.opponent_username ?? '?'}</Link> : '—'}</td>
                <td className="pr-3 font-bold" style={{ color: x.result === 'win' ? '#7bd389' : '#c65563' }}>{x.result === 'win' ? 'Pergalė' : 'Pralaimėjimas'}</td>
                <td className="pr-3">{dur(x.duration_seconds)}</td>
                <td className="pr-3">{x.turns_played ?? '—'}</td>
                <td className="pr-3" style={{ color: x.faction_color ?? undefined }}>{x.faction ?? '—'}</td>
                <td className="pr-3 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{x.valid_for_rewards === false ? 'be atlygio' : `🪙${x.silver_reward ?? 0} · ${x.account_xp_reward ?? 0} XP · ${x.season_xp_reward ?? 0} sez.`}</td>
              </tr>
              {open === x.id && (
                <tr><td colSpan={8} className="py-2 px-3" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {([['Padarai', x.creatures_played], ['Burtai', x.spells_played], ['Žala', x.damage_dealt], ['Žala veidui', x.face_damage], ['Nužudyta', x.creatures_killed], ['Ištraukta kortų', x.cards_drawn], ['Gydymas', x.heal_done], ['Liko HP', x.hp_remaining], ['Prarasta HP', x.hp_lost], ['Išleista aukso', x.gold_spent], ['Prakeiksmai', x.curses_activated], ['Čempiono geb.', x.champion_abilities], ['Veiksmai', x.player_actions_count], ['Priešo veiksmai', x.opponent_actions_count]] as [string, number | null][]).map(([l, v]) => (
                      <div key={l}><span style={{ color: 'var(--text-muted)' }}>{l}:</span> {v ?? '—'}</div>
                    ))}
                  </div>
                </td></tr>
              )}
            </Fragment>
          ))}</tbody>
        </table>
        {matches.length === 0 && <div className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Kovų nėra</div>}
      </div>
    </Card>
  )
}

function CollectionTab({ cards, byFaction }: { cards: PlayerCard[]; byFaction: PlayerOverview['collection']['by_faction'] }) {
  const [q, setQ] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [faction, setFaction] = useState('')
  const list = useMemo(() => cards.filter((c) => (!onlyMissing || c.qty === 0) && (!faction || c.faction === faction) && (!q || c.name.toLowerCase().includes(q.toLowerCase()))), [cards, q, onlyMissing, faction])
  const owned = cards.filter((c) => c.qty > 0).length
  return (
    <div className="flex flex-col gap-4">
      <Card title="Pagal frakciją">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {byFaction.map((f) => (
            <div key={f.faction} className="text-xs">
              <div className="flex justify-between"><span style={{ color: f.color ?? undefined }}>{f.faction}</span><span style={{ color: 'var(--text-secondary)' }}>{f.owned}/{f.total}</span></div>
              <Bar a={f.owned} b={f.total} color={f.color} />
            </div>
          ))}
        </div>
      </Card>
      <Card title={`Kortos (${owned} / ${cards.length} turima)`}>
        <div className="flex gap-2 mb-3 flex-wrap items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti kortos…" className="text-xs px-3 py-1.5 rounded-lg outline-none" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', width: 220 }} />
          <select value={faction} onChange={(e) => setFaction(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
            <option value="">Visos frakcijos</option>
            {byFaction.map((f) => <option key={f.faction} value={f.faction}>{f.faction}</option>)}
          </select>
          <label className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}><input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> tik trūkstamos</label>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{list.length} kortų</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4">
          {list.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-xs py-1" style={{ borderTop: '1px solid var(--bg-border)', opacity: c.qty ? 1 : 0.45 }}>
              <span className="truncate"><span style={{ color: c.rarity_color ?? undefined }}>●</span> {c.card_number ? <span style={{ color: 'var(--text-muted)' }}>{c.card_number} </span> : null}{c.name}{c.is_champion ? ' ★' : ''}</span>
              <span className="shrink-0 ml-2" style={{ color: c.faction_color ?? 'var(--text-muted)' }}>{c.faction} · <b style={{ color: 'var(--text-primary)' }}>×{c.qty}</b></span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
