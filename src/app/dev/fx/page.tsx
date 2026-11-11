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
  const [books, setBooks] = useState(false)
  const abT = useRef<number | null>(null)
  const [abTag, setAbTag] = useState('')
  const [booksReady, setBooksReady] = useState(false)
  const setPilot = (on: boolean) => { fxStage.books(on); setBooks(on) }
  // Pilotas: tas pats efektas senuoju ir nauju (flipbook) variantu iš eilės.
  const PILOT: { id: string; label: string; gap: number; play: () => void }[] = [
    { id: 'fire', label: 'Ugnies sprogimas', gap: 2200, play: () => arena.current?.effect('fireball', 'fireBurst', { hostile: true, targets: 1 }) },
    { id: 'ice', label: 'Ledo skilimas', gap: 2200, play: () => arena.current?.effect('ice', 'iceShatter', { hostile: true, targets: 1 }) },
    { id: 'holy', label: 'Šviesos nužengimas', gap: 3200, play: () => arena.current?.summon('holyDescent') },
  ]
  const ab = (x: (typeof PILOT)[number]) => {
    if (abT.current) window.clearTimeout(abT.current)
    setPilot(false); setAbTag('SENAS'); x.play()
    // Naujas variantas grojamas tik kai tekstūros tikrai įkeltos (kitaip variklis tyliai nugrotų seną).
    const go = (n: number) => { if (!fxStage.books().ready && n < 40) { abT.current = window.setTimeout(() => go(n + 1), 150); return }
      setPilot(true); setAbTag(fxStage.books().ready ? 'NAUJAS' : 'NAUJAS (tekstūros neįsikėlė!)'); x.play()
      abT.current = window.setTimeout(() => { setAbTag(''); abT.current = null }, x.gap) }
    abT.current = window.setTimeout(() => go(0), x.gap)
  }

  useEffect(() => {
    const id = window.setInterval(() => { setBooksReady(fxStage.books().ready); const s = fxStage.stats(); setHud(`dalelės ${s.particles} · scenos ${s.scenes} · ${s.running ? 'rAF aktyvus' : 'rAF miega'}${s.low ? ' · LOW' : ''}`) }, 200)
    ;(window as unknown as { __fxDev?: unknown }).__fxDev = {
      summon: (i: SummonFxId) => arena.current?.summon(i),
      effect: (p: FxProjId, m: FxImpactId | null, o?: { hostile?: boolean; targets?: 1 | 3; light?: boolean }) => arena.current?.effect(p, m, o),
      skill: (i: SkillFxId) => arena.current?.skill(i),
      stats: () => fxStage.stats(),
      books: (on?: boolean) => fxStage.books(on),
    }
    fxStage.books(false)   // išjungta, bet tekstūros pradedamos krauti iškart
    return () => { window.clearInterval(id); if (allT.current) window.clearTimeout(allT.current); if (abT.current) window.clearTimeout(abT.current); fxStage.books(false) }
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
          {abTag && <div data-testid="fx-ab-tag" style={{ position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)', fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: abTag === 'SENAS' ? '#9a90a6' : '#d8b25a', background: '#000a', padding: '4px 14px', borderRadius: 6 }}>{abTag}</div>}
          <div data-testid="fx-hud" style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 11, fontFamily: 'monospace', color: '#9a90a6', background: '#0009', padding: '2px 6px', borderRadius: 3 }}>{hud}</div>
        </div>
        <section data-testid="fx-pilot" style={{ display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid #d8b25a55', borderRadius: 6, padding: 10, background: '#17131f' }}>
          <b style={{ color: '#d8b25a' }}>Pilotas: tikros ugnies ir dūmų tekstūros (flipbook)</b>
          <span style={{ fontSize: 12, color: '#9a90a6' }}>Mygtukas nugroja efektą du kartus: pirma SENĄ, po pauzės NAUJĄ. Varnelė palieka naujus variantus įjungtus ir žemiau esantiems mygtukams. Žaidime kol kas groja senieji.</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {PILOT.map((x) => <button key={x.id} style={btn} data-testid={'ab-' + x.id} onClick={() => ab(x)}>▶ {x.label}: senas → naujas</button>)}
            <label><input type="checkbox" data-testid="fx-books" checked={books} onChange={(e) => setPilot(e.target.checked)} /> nauji variantai įjungti</label>
            <span data-testid="fx-books-ready" style={{ fontSize: 12, color: booksReady ? '#7bd88f' : '#e0a040' }}>{booksReady ? 'tekstūros įkeltos' : 'tekstūros kraunamos…'}</span>
          </div>
        </section>
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
