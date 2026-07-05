'use client'

// ── Admin: Ekonomikos config redaktorius (economy_config jsonb raktai) ────────
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Row = { key: string; value: unknown }

const KEY_LABEL: Record<string, string> = {
  match_rewards: 'Kovos atlygiai (bot/unranked/ranked, dienos cap)',
  match_validity: 'Kovos validumas (min trukmė / ėjimai / veiksmai)',
  win_streak_bonus: 'Pergalių serijos bonusas (ranked)',
  level_rewards: 'Lygio atlygiai (kas lvl / 5 / 10 / milestones)',
  daily_chest: 'Dienos skrynios atlygis',
  daily_chest_pack_chance: 'Dienos skrynios pako šansas',
  daily_reroll: 'Dienos užduočių perrinkimas (free/max/kaina)',
  season_path: 'Sezono kelias (20 lygių free+pass)',
  craft: 'Craft (disenchant/craft/max_copies pagal rarity)',
}

export function EconomyConfigClient() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Record<string, string>>({})

  const load = useCallback(() => {
    const supabase = createClient()
    supabase.from('economy_config').select('key, value').order('key').then(({ data }) => {
      const rs = (data as Row[]) ?? []
      setRows(rs)
      setDrafts(Object.fromEntries(rs.map((r) => [r.key, JSON.stringify(r.value, null, 2)])))
    })
  }, [])
  useEffect(() => { load() }, [load])

  const save = useCallback(async (key: string) => {
    let parsed: unknown
    try { parsed = JSON.parse(drafts[key]) } catch { setStatus((s) => ({ ...s, [key]: '❌ Netaisyklingas JSON' })); return }
    setStatus((s) => ({ ...s, [key]: 'Saugoma…' }))
    const supabase = createClient()
    const { error } = await supabase.from('economy_config').update({ value: parsed, updated_at: new Date().toISOString() }).eq('key', key)
    setStatus((s) => ({ ...s, [key]: error ? '❌ ' + error.message : '✓ Išsaugota' }))
  }, [drafts])

  if (!rows) return <p style={{ color: 'var(--text-muted)' }}>Kraunama…</p>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 text-xs">
        <Link href="/admin/shop" className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.35)', color: 'var(--gold)' }}>🛒 Parduotuvės prekės</Link>
        <span className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}>Dienos užduočių / login / cosmetics lentelės — redaguojamos DB (daily_task_templates, monthly_login_rewards, cosmetics)</span>
      </div>

      {rows.map((r) => (
        <div key={r.key} className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{KEY_LABEL[r.key] ?? r.key}</div>
              <code className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.key}</code>
            </div>
            <div className="flex items-center gap-2">
              {status[r.key] && <span className="text-[11px]" style={{ color: status[r.key].startsWith('✓') ? '#34d399' : status[r.key].startsWith('❌') ? '#f87171' : 'var(--text-muted)' }}>{status[r.key]}</span>}
              <button onClick={() => save(r.key)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'var(--gold)', color: '#0a0a0f' }}>Išsaugoti</button>
            </div>
          </div>
          <textarea value={drafts[r.key] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [r.key]: e.target.value }))} spellCheck={false}
            className="w-full mt-1 rounded-lg p-2.5 font-mono text-[11px]" rows={Math.min(20, (drafts[r.key]?.split('\n').length ?? 4) + 1)}
            style={{ background: '#0a0810', border: '1px solid var(--bg-border)', color: '#cfe0ff', resize: 'vertical' }} />
        </div>
      ))}
    </div>
  )
}
