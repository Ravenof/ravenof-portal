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
    available: 'Yra atnaujinimas', availableSub: 'Bus įdiegtas kitą kartą paleidus žaidimą.',
    whatsNew: 'Kas naujo',
  },
  en: {
    maintenance: 'Maintenance in progress', maintenanceSub: 'The game will be back shortly. Thanks for your patience!',
    shell: 'A new game version is required', shellSub: 'This installed version is no longer supported. Download and install the new one – your account and progress are kept.',
    download: 'Download', retry: 'Try again',
    updating: 'Updating…', applying: 'Installing…', updatingSub: 'Only changed files are downloaded. Please keep the game open.',
    failed: 'Update failed', failedSub: 'Check your internet connection and try again.',
    ready: 'Update ready', readySub: 'It will apply the next time you start the game.', now: 'Update now', later: 'Later',
    available: 'Update available', availableSub: 'It will be installed the next time you start the game.',
    whatsNew: "What's new",
  },
} as const

// Linksmos „ruošimosi" eilutės atnaujinimo metu – kad ekranas neatrodytų sustingęs.
const FLAVOR = {
  lt: [
    'Nuvalomi stalai po vakarykščio turnyro…',
    'Korvas tikrina, ar visos kortos savo vietose…',
    'Žarijų kalvis kala naujus kortų kampus…',
    'Sutarčių ragana skaito smulkų šriftą…',
    'Šešėlių kišenvagis grąžina pavogtas kortas. Ne visas.',
    'Kapitonė perskaičiuoja rubinus skrynioje…',
    'Nekronautas žadina užsnūdusius skeletus…',
    'Pelkių žiniuonė maišo naujų efektų virą…',
    'Varpinės gydytoja lopo sudaužytus skydus…',
    'Maišoma žalos modifikatorių kaladė…',
    'Gaujos vadas bando suprasti, kas pasikeitė…',
    'Arenos čempionas šluoja areną…',
    'Varnų pranašė jau žino, kas laimės kitą kovą…',
    'Maršo būgnininkas derina būgną…',
    'Uždegamos žvakės pilies koridoriuose…',
    'Tylos mokinys… tyli.',
    'Vyriausiasis teisėjas peržiūri naujas taisykles…',
    'Geležinė sesuo šveičia šarvus…',
  ],
  en: [
    'Wiping the tables after last night\'s tournament…',
    'Korvas is checking every card is in its place…',
    'The Ember Smith is forging new card corners…',
    'The Pact Witch is reading the fine print…',
    'The Shadow Pickpocket returns the stolen cards. Most of them.',
    'The Captain is recounting the rubies in the chest…',
    'The Necronaut is waking the sleepy skeletons…',
    'The Bog Seer is stirring a fresh pot of effects…',
    'The Bell Healer is patching up broken shields…',
    'Shuffling the Damage Modifier Deck…',
    'The Pack Boss is trying to figure out what changed…',
    'The Arena Champion is sweeping the arena…',
    'The Raven Oracle already knows who wins the next battle…',
    'The March Drummer is tuning the drum…',
    'Lighting the candles in the castle halls…',
    'The Disciple of Silence is… silent.',
    'The High Judge is reviewing the new rules…',
    'The Iron Sister is polishing her armor…',
  ],
} as const

function FlavorLine({ lang }: { lang: 'lt' | 'en' }) {
  const list = FLAVOR[lang]
  const [i, setI] = useState(() => Math.floor(Math.random() * list.length))
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length), 2800)
    return () => window.clearInterval(t)
  }, [list.length])
  return (
    <p key={i} style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.45, color: '#cfc4ae', fontStyle: 'italic', margin: '0 auto 16px', minHeight: 42, maxWidth: 420, animation: 'rvnUpdLine 2.8s ease both' }}>
      {list[i]}
    </p>
  )
}

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
        <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/ravenof-logo.png" alt="Ravenof" draggable={false} style={{ display: 'block', width: 'min(46vw, 300px)', maxHeight: '26vh', objectFit: 'contain', margin: '0 auto 18px', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,.8))', animation: s.phase === 'downloading' || s.phase === 'applying' ? 'rvnUpdLogo 2.4s ease-in-out infinite' : undefined }} />
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 24, color: gold, margin: '0 0 10px' }}>{title}</h1>
          <style>{'@keyframes rvnUpdLine{0%{opacity:0;transform:translateY(6px)}12%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0}}@keyframes rvnUpdShine{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}@keyframes rvnUpdLogo{0%,100%{filter:drop-shadow(0 10px 30px rgba(0,0,0,.8)) drop-shadow(0 0 0 rgba(212,163,59,0))}50%{filter:drop-shadow(0 10px 30px rgba(0,0,0,.8)) drop-shadow(0 0 18px rgba(212,163,59,.35))}}'}</style>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, lineHeight: 1.5, color: '#b9ad98', margin: progress ? '0 0 14px' : '0 0 20px' }}>{sub}</p>
          {progress && <FlavorLine lang={lang} />}
          {progress && (
            <div aria-label={`${Math.round(s.percent)}%`} style={{ height: 10, borderRadius: 6, background: '#1c1712', border: '1px solid #4a3c22', overflow: 'hidden', margin: '0 auto 8px', width: '100%', maxWidth: 360 }}>
              <div style={{ position: 'relative', overflow: 'hidden', height: '100%', width: `${s.phase === 'applying' ? 100 : Math.max(3, s.percent)}%`, background: `linear-gradient(90deg, #7a5a1c, ${gold})`, transition: 'width .3s ease' }}>
                <span style={{ position: 'absolute', inset: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,240,200,.55), transparent)', animation: 'rvnUpdShine 1.4s linear infinite' }} />
              </div>
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
        <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, color: gold, fontSize: 15 }}>{s.readyId ? t.ready : t.available} · {s.target.version}</div>
        <div style={{ fontSize: 13, color: '#b9ad98', margin: '4px 0 10px' }}>{s.readyId ? t.readySub : t.availableSub}</div>
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
