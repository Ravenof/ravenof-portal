// ── Atnaujinimų sluoksnis (tik app bundle: Android / Desktop) ────────────────
// Montuojamas ŠALIA <App/> (ne jo viduje), kad veiktų net jei žaidimo medis nulūžo.
// Rodo: techninių darbų ekraną, „reikia naujos versijos", privalomo atnaujinimo progresą,
// ir mažą pranešimą „Atnaujinimas paruoštas" su mygtuku „Atnaujinti dabar" (ne partijoje).
// Sąmoningai be žaidimo i18n/UI importų – updater'is turi likti gyvas, kad ir kas sulūžtų.
import { useEffect, useState, type CSSProperties } from 'react'
import { APP_VERSION } from '@/lib/version'
import { applyReadyUpdateNow, checkForUpdate, startUpdater, useUpdater } from '@/lib/updater/core'

const TXT = {
  lt: {
    maintenance: 'Vyksta techniniai darbai', maintenanceSub: 'Žaidimas netrukus vėl veiks. Ačiū už kantrybę!',
    shell: 'Reikia naujos žaidimo versijos', shellSub: 'Ši įdiegta versija nebepalaikoma. Parsisiųsk ir įdiek naują – tavo paskyra ir progresas išliks.',
    download: 'Parsisiųsti', retry: 'Bandyti dar kartą',
    updating: 'Atnaujinama…', applying: 'Diegiama…', updatingSub: 'Siunčiami tik pasikeitę failai. Neuždaryk žaidimo.',
    failed: 'Atnaujinti nepavyko', failedSub: 'Patikrink interneto ryšį ir bandyk dar kartą.',
    ready: 'Atnaujinimas paruoštas', readySub: 'Įsigalios kitą kartą paleidus žaidimą.', now: 'Atnaujinti dabar', later: 'Vėliau',
    whatsNew: 'Kas naujo',
  },
  en: {
    maintenance: 'Maintenance in progress', maintenanceSub: 'The game will be back shortly. Thanks for your patience!',
    shell: 'A new game version is required', shellSub: 'This installed version is no longer supported. Download and install the new one – your account and progress are kept.',
    download: 'Download', retry: 'Try again',
    updating: 'Updating…', applying: 'Installing…', updatingSub: 'Only changed files are downloaded. Please keep the game open.',
    failed: 'Update failed', failedSub: 'Check your internet connection and try again.',
    ready: 'Update ready', readySub: 'It will apply the next time you start the game.', now: 'Update now', later: 'Later',
    whatsNew: "What's new",
  },
} as const

const BATTLE_PATH = /^\/digital\/(pve|pvp|ranked|tutorial)(\/|$)/
const gold = '#d4a33b'
const btn: CSSProperties = { padding: '10px 22px', borderRadius: 8, border: `1px solid ${gold}`, background: 'linear-gradient(#3a2c14,#241a0c)', color: '#f3dfae', fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
const btnGhost: CSSProperties = { ...btn, border: '1px solid #4a4238', background: 'transparent', color: '#b9ad98', fontWeight: 500 }

function openExternal(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (window as any).ravenofDesktop
  if (d?.openExternal) void d.openExternal(url)
  else window.open(url, '_blank', 'noopener')
}

export function UpdateLayer() {
  const s = useUpdater()
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [, tick] = useState(0)
  useEffect(() => { startUpdater() }, [])
  // kelias keičiasi be mūsų žinios (react-router) – retkarčiais persipiešiam, kad „ready" pranešimas dingtų partijoje
  useEffect(() => { const i = window.setInterval(() => tick((n) => n + 1), 2000); return () => window.clearInterval(i) }, [])

  const lang = (typeof document !== 'undefined' && document.documentElement.lang?.startsWith('en')) ? 'en' : 'lt'
  const t = TXT[lang]
  const rel = s.release

  if (s.blocking) {
    let title = '', sub = '', action: { label: string; run: () => void } | null = null, progress = false
    if (s.phase === 'maintenance') { title = t.maintenance; sub = (lang === 'en' ? rel?.maintenance_message_en : rel?.maintenance_message_lt) || t.maintenanceSub; action = { label: t.retry, run: () => void checkForUpdate() } }
    else if (s.phase === 'shell_outdated') { title = t.shell; sub = t.shellSub; if (rel?.shell_download_url) action = { label: t.download, run: () => openExternal(rel.shell_download_url!) } }
    else if (s.phase === 'error') { title = t.failed; sub = t.failedSub; action = { label: t.retry, run: () => void checkForUpdate() } }
    else { title = s.phase === 'applying' ? t.applying : t.updating; sub = t.updatingSub; progress = true }
    return (
      <div role="alertdialog" aria-modal style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(70% 60% at 50% 45%, #221a2c 0%, #0a0a0f 72%)', color: '#e9dfcb', textAlign: 'center' }}>
        <div style={{ maxWidth: 520 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/ravenof-logo.png" alt="Ravenof" draggable={false} style={{ width: 'min(46vw, 300px)', maxHeight: '26vh', objectFit: 'contain', marginBottom: 18, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,.8))' }} />
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 24, color: gold, margin: '0 0 10px' }}>{title}</h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, lineHeight: 1.5, color: '#b9ad98', margin: '0 0 20px' }}>{sub}</p>
          {progress && (
            <div aria-label={`${Math.round(s.percent)}%`} style={{ height: 10, borderRadius: 6, background: '#1c1712', border: '1px solid #4a3c22', overflow: 'hidden', margin: '0 auto 8px', maxWidth: 360 }}>
              <div style={{ height: '100%', width: `${s.phase === 'applying' ? 100 : Math.max(3, s.percent)}%`, background: `linear-gradient(90deg, #7a5a1c, ${gold})`, transition: 'width .3s ease' }} />
            </div>
          )}
          {progress && s.target && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#7d7466' }}>{APP_VERSION} → {s.target.version}</div>}
          {action && <button type="button" onClick={action.run} style={btn}>{action.label}</button>}
          {s.phase === 'shell_outdated' && rel?.min_shell_version && <div style={{ marginTop: 14, fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#7d7466' }}>min. {rel.min_shell_version}</div>}
        </div>
      </div>
    )
  }

  // Neblokuojantis pranešimas: tik ne partijoje ir tik kol nepaspausta „Vėliau" šiai versijai.
  if (s.phase === 'ready' && s.target && dismissed !== s.target.version && !BATTLE_PATH.test(location.pathname)) {
    const notes = lang === 'en' ? (s.target.notes_en || s.target.notes_lt) : (s.target.notes_lt || s.target.notes_en)
    return (
      <div role="status" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9000, width: 'min(360px, calc(100vw - 32px))', padding: '14px 16px', borderRadius: 12, background: 'rgba(20,16,12,.96)', border: `1px solid ${gold}`, boxShadow: '0 12px 40px rgba(0,0,0,.6)', color: '#e9dfcb', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, color: gold, fontSize: 15 }}>{t.ready} · {s.target.version}</div>
        <div style={{ fontSize: 13, color: '#b9ad98', margin: '4px 0 10px' }}>{t.readySub}</div>
        {notes && <div style={{ fontSize: 12.5, color: '#cfc4ae', margin: '0 0 10px', maxHeight: 96, overflow: 'auto', whiteSpace: 'pre-wrap' }}><b style={{ color: '#e9dfcb' }}>{t.whatsNew}:</b> {notes}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => setDismissed(s.target!.version)} style={{ ...btnGhost, padding: '7px 14px', fontSize: 13 }}>{t.later}</button>
          <button type="button" onClick={() => void applyReadyUpdateNow()} style={{ ...btn, padding: '7px 14px', fontSize: 13 }}>{t.now}</button>
        </div>
      </div>
    )
  }
  return null
}
