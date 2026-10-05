'use client'

// ═══════════════════════════════════════════════════════════
// DEV: kovos FX peržiūra — visi skrydžiai, smūgiai ir 30 iškvietimo
// choreografijų ant manekenų. Viešas dev route (kaip /dev/status-vfx),
// naudojamas ir Playwright patikrų (window.__fxDev).
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { FxArena, type FxArenaHandle } from '@/components/tutorial/FxArena'
import { fxStage } from '@/lib/game/fxStage'
import { FX_PROJECTILES, FX_IMPACTS, SUMMON_FX, SKILL_FX, type FxProjId, type FxImpactId, type SummonFxId, type SkillFxId } from '@/lib/game/fxCatalog'

export default function FxDevPage() {
  const arena = useRef<FxArenaHandle>(null)
  const [proj, setProj] = useState<FxProjId>('fireball')
  const [imp, setImp] = useState<FxImpactId>('fireBurst')
  const [hostile, setHostile] = useState(true)
  const [targets, setTargets] = useState<1 | 3>(1)
  const [light, setLight] = useState(false)
  const [cur, setCur] = useState<SummonFxId | null>(null)
  const [hud, setHud] = useState('')
  const allT = useRef<number | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => { const s = fxStage.stats(); setHud(`dalelės ${s.particles} · scenos ${s.scenes} · ${s.running ? 'rAF aktyvus' : 'rAF miega'}${s.low ? ' · LOW' : ''}`) }, 200)
    ;(window as unknown as { __fxDev?: unknown }).__fxDev = {
      summon: (i: SummonFxId) => arena.current?.summon(i),
      effect: (p: FxProjId, m: FxImpactId | null, o?: { hostile?: boolean; targets?: 1 | 3; light?: boolean }) => arena.current?.effect(p, m, o),
      skill: (i: SkillFxId) => arena.current?.skill(i),
      stats: () => fxStage.stats(),
    }
    return () => { window.clearInterval(id); if (allT.current) window.clearTimeout(allT.current) }
  }, [])

  const playAll = () => {
    if (allT.current) { window.clearTimeout(allT.current); allT.current = null; return }
    let i = 0
    const nx = () => { if (i >= SUMMON_FX.length) { allT.current = null; return } const s = SUMMON_FX[i++]; setCur(s.value); arena.current?.summon(s.value); allT.current = window.setTimeout(nx, 3000) }
    nx()
  }
  const sel: React.CSSProperties = { background: '#1e1a28', color: '#e9e2d3', border: '1px solid #2e2839', borderRadius: 4, padding: '6px 8px' }
  const btn: React.CSSProperties = { background: '#d8b25a', color: '#14100a', border: 0, borderRadius: 4, padding: '7px 12px', fontWeight: 700, cursor: 'pointer' }

  return (
    <main style={{ minHeight: '100vh', background: '#0d0b12', color: '#e9e2d3', padding: '16px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ fontSize: 20, margin: 0, color: '#d8b25a' }}>Kovos FX peržiūra</h1>
        <div style={{ position: 'relative' }}>
          <FxArena ref={arena} cardW={84} />
          <div data-testid="fx-hud" style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 11, fontFamily: 'monospace', color: '#9a90a6', background: '#0009', padding: '2px 6px', borderRadius: 3 }}>{hud}</div>
        </div>
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <select aria-label="Skrydis" style={sel} value={proj} onChange={(e) => setProj(e.target.value as FxProjId)}>{FX_PROJECTILES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
          <select aria-label="Smūgis" style={sel} value={imp} onChange={(e) => setImp(e.target.value as FxImpactId)}>{FX_IMPACTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
          <label><input type="checkbox" checked={hostile} onChange={(e) => setHostile(e.target.checked)} /> į priešą</label>
          <label><input type="checkbox" checked={targets === 3} onChange={(e) => setTargets(e.target.checked ? 3 : 1)} /> 3 taikiniai</label>
          <label><input type="checkbox" checked={light} onChange={(e) => setLight(e.target.checked)} /> statuso (trumpas) smūgis</label>
          <button style={btn} data-testid="fx-play" onClick={() => arena.current?.effect(proj, imp, { hostile, targets, light })}>▶ Efektas</button>
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <b style={{ color: '#d8b25a' }}>Čempionų gebėjimai</b>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 }}>
            {SKILL_FX.map((s) => (
              <button key={s.value} data-testid={'sk-' + s.value} onClick={() => arena.current?.skill(s.value)}
                style={{ textAlign: 'left', background: '#1e1a28', color: '#e9e2d3', border: '1px solid #2e2839', borderRadius: 4, padding: '8px 10px', cursor: 'pointer' }}>
                <b>{s.label}</b><br /><span style={{ fontSize: 11, color: '#d8b25a', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.champion} · {s.value.slice(-1)}</span>
              </button>
            ))}
          </div>
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><button style={{ ...btn, background: 'transparent', color: '#e9e2d3', border: '1px solid #2e2839' }} onClick={playAll}>▶ Groti visus {SUMMON_FX.length} iškvietimus iš eilės</button></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 }}>
            {SUMMON_FX.map((s) => (
              <button key={s.value} data-testid={'sm-' + s.value} onClick={() => { setCur(s.value); arena.current?.summon(s.value) }}
                style={{ textAlign: 'left', background: '#1e1a28', color: '#e9e2d3', border: '1px solid ' + (cur === s.value ? '#d8b25a' : '#2e2839'), borderRadius: 4, padding: '8px 10px', cursor: 'pointer' }}>
                <b>{s.label}</b> <span style={{ fontSize: 11, color: '#d8b25a', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.group}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
