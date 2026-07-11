'use client'

// ══════════════════════════════════════════════════════════════════════════════
// DEV: Status VFX peržiūra — kiekvieną statusą galima uždėti (idle), iššauti
// apply/trigger/remove/destroy, kombinuoti kelis, keisti kortos dydį ir kokybę.
// Viešas dev route (be žaidimo guard'ų) — naudojamas ir Playwright testų.
// ══════════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'
import { CardStatusVfxLayer } from '@/components/tutorial/CardStatusVfxLayer'
import {
  STATUS_VFX_REGISTRY, STATUS_VFX_IDS, publishStatusVfx, __resetStatusVfxSeen,
  setVfxQuality, getVfxQuality, type VfxStatusId, type StatusVfxEventType, type VfxQuality,
} from '@/lib/game/statusVfx'

let seq = 1

function MockCard({ w, active }: { w: number; active: VfxStatusId[] }) {
  const h = Math.round(w * 4 / 3)
  return (
    <div className="relative rounded-lg select-none" data-testid="vfx-card" style={{ width: w, height: h }}>
      <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ background: 'linear-gradient(160deg, #2a2138, #14101e)', border: '1.5px solid rgba(240,180,41,0.5)' }}>
        <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-40">🜏</div>
        <div className="absolute bottom-0 inset-x-0 flex justify-between px-0.5 pb-0.5" style={{ zIndex: 10 }}>
          <span className="px-1 rounded text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: '#f87171' }}>3</span>
          <span className="px-1 rounded text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: '#4ade80' }}>5</span>
        </div>
      </div>
      <CardStatusVfxLayer uid="dev-card" active={active} />
    </div>
  )
}

export default function StatusVfxDevPage() {
  const [active, setActive] = useState<VfxStatusId[]>([])
  const [w, setW] = useState(96)
  const [q, setQ] = useState<VfxQuality>(typeof window !== 'undefined' ? getVfxQuality() : 'high')
  const [sel, setSel] = useState<VfxStatusId>('shield')
  const def = STATUS_VFX_REGISTRY[sel]

  const fire = (type: StatusVfxEventType) => {
    __resetStatusVfxSeen()
    publishStatusVfx({ seq: seq++, type, cardId: 'dev-card', statusId: sel })
    if (type === 'apply') setActive((a) => (a.includes(sel) ? a : [...a, sel]))
    if (type === 'remove' || type === 'destroy') setActive((a) => a.filter((x) => x !== sel))
  }

  const allActive = useMemo(() => STATUS_VFX_IDS.filter((s) => active.includes(s)), [active])

  return (
    <div className="min-h-screen p-4 text-sm" style={{ background: '#06040b', color: '#e8dfc8' }}>
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--gold, #f0b429)', fontFamily: 'Cinzel, serif' }}>STATUS VFX PERŽIŪRA</h1>
      <p className="text-xs mb-3" style={{ color: '#8b93a8' }}>Dev įrankis: statusų animacijų testavimas be kovos. Registre: {STATUS_VFX_IDS.length} statusai.</p>

      <div className="flex flex-wrap gap-6 items-start">
        {/* korta */}
        <div className="flex flex-col items-center gap-3 pt-6">
          <MockCard w={w} active={allActive} />
          <label className="text-[11px] flex items-center gap-2">Dydis
            <input type="range" min={64} max={220} value={w} onChange={(e) => setW(+e.target.value)} />
            {w}px
          </label>
          <div className="text-[10px]" style={{ color: '#8b93a8' }} data-testid="active-list">Aktyvūs: {allActive.join(', ') || '—'}</div>
        </div>

        {/* valdymas */}
        <div className="flex flex-col gap-2" style={{ minWidth: 300 }}>
          <div className="flex flex-wrap gap-1">
            {STATUS_VFX_IDS.map((s) => (
              <button key={s} data-testid={`pick-${s}`} onClick={() => setSel(s)}
                className="px-2 py-1 rounded-lg text-[11px] font-bold"
                style={{ background: sel === s ? STATUS_VFX_REGISTRY[s].tint + '33' : 'rgba(255,255,255,0.05)', border: `1px solid ${sel === s ? STATUS_VFX_REGISTRY[s].tint : 'rgba(255,255,255,0.12)'}`, color: sel === s ? STATUS_VFX_REGISTRY[s].tint : '#c9bfa8' }}>
                {STATUS_VFX_REGISTRY[s].name}
              </button>
            ))}
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${def.tint}55` }}>
            <p className="font-bold" style={{ color: def.tint }}>{def.name} <span className="text-[10px] opacity-60">({def.statusId}, prioritetas {def.priority})</span></p>
            <p className="text-[11px] mt-1" style={{ color: '#c9bfa8' }}>{def.tooltip}</p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {(['apply', 'trigger', 'remove', 'destroy'] as const).map((t) => (
                <button key={t} data-testid={`fire-${t}`} onClick={() => fire(t)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{ background: `${def.tint}22`, border: `1px solid ${def.tint}`, color: def.tint }}>
                  {t === 'apply' ? 'Uždėti' : t === 'trigger' ? 'Suveikti' : t === 'remove' ? 'Nuimti' : 'Sunaikinti'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            Kokybė:
            {(['low', 'medium', 'high'] as const).map((x) => (
              <button key={x} onClick={() => { setVfxQuality(x); setQ(x); location.reload() }}
                className="px-2 py-1 rounded" style={{ background: q === x ? 'rgba(240,180,41,0.25)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,180,41,0.4)' }}>{x}</button>
            ))}
          </div>
          <button data-testid="apply-all" onClick={() => { __resetStatusVfxSeen(); setActive([...STATUS_VFX_IDS]); STATUS_VFX_IDS.forEach((s) => publishStatusVfx({ seq: seq++, type: 'apply', cardId: 'dev-card', statusId: s })) }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold self-start" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.5)', color: '#f0b429' }}>
            Uždėti VISUS (chaoso testas — idle limitas 2)
          </button>
          <button data-testid="clear-all" onClick={() => setActive([])} className="px-3 py-1.5 rounded-lg text-[11px] self-start" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#c9bfa8' }}>Išvalyti</button>
        </div>
      </div>
    </div>
  )
}
