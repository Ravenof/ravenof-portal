'use client'

// ── Admin: campaign list + create ─────────────────────────────────────────────
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loadCampaigns } from '@/lib/campaign/missionLoader'
import { rebuildCampaign, type RebuildReport, type RebuildMode } from '@/lib/campaign/seedRebuild'
import { prazarasVarngradasCampaign } from '@/data/campaignSeeds/prazarasVarngradasCampaign'
import type { Campaign } from '@/lib/campaign/types'

const GOLD = '240,180,41'
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

export function AdminCampaignsList() {
  const router = useRouter()
  const [list, setList] = useState<Campaign[] | null>(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [seedBusy, setSeedBusy] = useState(false)
  const [report, setReport] = useState<RebuildReport | null>(null)

  useEffect(() => { loadCampaigns({ includeHidden: true }).then(setList) }, [])

  const create = async () => {
    if (!title.trim()) return
    setBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('campaigns')
      .insert({ title: title.trim(), slug: slugify(title) || ('camp-' + Date.now()), visibility: 'draft' })
      .select('id').single()
    setBusy(false)
    if (!error && data) router.push(`/admin/campaigns/${data.id}`)
    else alert('Klaida: ' + (error?.message ?? 'nepavyko sukurti'))
  }

  const runSeed = async (mode: RebuildMode) => {
    if (mode === 'reset' && !confirm('Pilnas perrašymas iš seed: PERRAŠYS visus „Prazaro kilmė" mazgus/cutscenes ir pašalins seną pavyzdinę kampaniją. Rankiniai pakeitimai bus prarasti. Tęsti?')) return
    setSeedBusy(true); setReport(null)
    const r = await rebuildCampaign(prazarasVarngradasCampaign, mode)
    setSeedBusy(false); setReport(r)
    if (r.ok) loadCampaigns({ includeHidden: true }).then(setList)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header className="sticky top-0 z-20 border-b px-4 py-3" style={{ background: 'rgba(7,7,15,0.97)', backdropFilter: 'blur(16px)', borderColor: 'rgba(240,180,41,0.1)' }}>
        <div className="max-w-screen-lg mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Admin</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em' }}>🗺️ Kampanijos</h1>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
        <div className="rounded-xl p-4 flex gap-2 items-end" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <div className="flex-1">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Naujos kampanijos pavadinimas</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pvz. Prazaro kilmė: Varngrado užrakinimas"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
          </div>
          <button onClick={create} disabled={busy || !title.trim()} className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
            style={{ background: `rgba(${GOLD},0.9)`, color: '#1a1206', fontFamily: 'var(--rvn-font-display)' }}>+ Sukurti</button>
        </div>

        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(240,180,41,0.25)' }}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>📖 Seed / Rebuild: „Prazaro kilmė: Varngrado užrakinimas“</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Kanono kampanija iš seed failo (18 mazgų, cutscenes, deck/enemy paketai). Saugus sujungimas neperrašo rankinių pakeitimų.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => runSeed('merge')} disabled={seedBusy} className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50" style={{ background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.45)', color: '#34d399' }}>{seedBusy ? '…' : '🔁 Saugus sujungimas'}</button>
              <button onClick={() => runSeed('reset')} disabled={seedBusy} className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>♻️ Pilnas perrašymas</button>
            </div>
          </div>
          {report && (
            <div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: report.ok ? 'var(--text-secondary)' : '#f87171' }}>
              {report.ok
                ? <>✓ {report.mode === 'reset' ? 'Perrašyta' : 'Sujungta'}: sukurta {report.counts.created}, atnaujinta {report.counts.updated}, praleista {report.counts.skipped}. {report.log.join(' · ')}</>
                : <>Klaida: {report.error}</>}
            </div>
          )}
        </div>

        {list === null ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
        : list.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Dar nėra kampanijų.</p>
        : (
          <div className="grid sm:grid-cols-2 gap-3">
            {list.map((c) => (
              <Link key={c.id} href={`/admin/campaigns/${c.id}`} className="rounded-xl p-4 transition-all hover:border-[rgba(240,180,41,0.3)]"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>{c.title}</h2>
                  <span className="text-[9px] px-2 py-0.5 rounded uppercase" style={{
                    background: c.visibility === 'active' ? 'rgba(52,211,153,0.15)' : c.visibility === 'draft' ? 'rgba(240,180,41,0.15)' : 'rgba(120,120,140,0.15)',
                    color: c.visibility === 'active' ? '#34d399' : c.visibility === 'draft' ? '#fcd34d' : '#9ca3af' }}>{c.visibility}</span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>/{c.slug}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
