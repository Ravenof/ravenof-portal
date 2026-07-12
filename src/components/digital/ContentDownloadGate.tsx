'use client'

// ══════════════════════════════════════════════════════════════════════════════
// PRIVALOMAS žaidimo turinio atsisiuntimas paleidžiant /digital (kaip mobile TCG):
// • Mount'e patikrina manifestą (rvn_media_manifest) vs rvn-media-v1 cache.
// • Trūksta DAUG core failų (tier ≤ 2: kortos/garsai) → blokuojantis popup su
//   progress baru — žaisti negalima, kol neatsisiųsta.
// • Trūksta MAŽAI (< 10 failų, pvz. delta po naujų kortų) → tyliai siunčia fone.
// • Video (tier 3) neprivalomas — lieka Nustatymuose („Viskas + video").
// • Saugikliai prieš softlock: jei manifestas nepasiekiamas / Cache API nėra —
//   gate praleidžiamas; jei siuntimas stringa su klaidom — „Bandyti dar kartą"
//   + „Tęsti be atsisiuntimo" (failai bus traukiami žaidžiant per SW).
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getMediaManifest, diffMissing, downloadMedia, fmtMB, type ManifestEntry, type DlProgress, type DlHandle } from '@/lib/digital/mediaDownloader'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'

const GOLD = '240,180,41'
const SILENT_LIMIT = 10   // iki tiek trūkstamų failų — siunčiam tyliai, be popup

type Phase = 'checking' | 'silent' | 'prompt' | 'downloading' | 'done-wait' | 'hidden'

export function ContentDownloadGate() {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('checking')
  const [missing, setMissing] = useState<ManifestEntry[]>([])
  const [dl, setDl] = useState<DlProgress | null>(null)
  const dlRef = useRef<DlHandle | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (typeof caches === 'undefined') { setPhase('hidden'); return }
        // Automatizacija (Playwright/webdriver): gate praleidžiamas — e2e testai
        // neturi siųstis media paketo; failai traukiami žaidžiant per SW.
        if (typeof navigator !== 'undefined' && navigator.webdriver) { setPhase('hidden'); return }
        const manifest = await getMediaManifest()
        if (!alive) return
        if (manifest.length === 0) { setPhase('hidden'); return }   // RPC nepasiekiamas / offline — neblokuojam
        const miss = (await diffMissing(manifest)).filter((e) => e.tier <= 2)
        if (!alive) return
        if (miss.length === 0) { setPhase('hidden'); return }
        setMissing(miss)
        if (miss.length < SILENT_LIMIT) {
          // maža delta — tyliai fone, be trukdymo
          setPhase('silent')
          dlRef.current = downloadMedia(miss, () => {})
          void dlRef.current.promise.then(() => { if (alive) setPhase('hidden') })
        } else {
          setPhase('prompt')
        }
      } catch { if (alive) setPhase('hidden') }
    })()
    return () => { alive = false; dlRef.current?.cancel() }
  }, [])

  const start = () => {
    playUiClick()
    setPhase('downloading')
    dlRef.current = downloadMedia(missing, setDl)
    void dlRef.current.promise.then((p) => {
      if (p.failed === 0) { playSuccess(); setPhase('done-wait') }
      // su klaidom liekam 'downloading' — UI parodys retry
    })
  }

  const retry = async () => {
    playUiClick()
    setDl(null)
    const manifest = await getMediaManifest()
    const miss = (await diffMissing(manifest)).filter((e) => e.tier <= 2)
    if (miss.length === 0) { playSuccess(); setPhase('done-wait'); return }
    setMissing(miss)
    setPhase('downloading')
    dlRef.current = downloadMedia(miss, setDl)
    void dlRef.current.promise.then((p) => { if (p.failed === 0) { playSuccess(); setPhase('done-wait') } })
  }

  if (phase === 'checking' || phase === 'silent' || phase === 'hidden') return null
  if (typeof document === 'undefined') return null

  const totalBytes = missing.reduce((s, e) => s + e.bytes, 0)
  const finished = dl != null && !dl.running
  const hadFails = finished && (dl?.failed ?? 0) > 0
  const pct = dl ? (dl.totalBytes > 0
    ? Math.min(100, Math.round((dl.doneBytes / dl.totalBytes) * 100))
    : Math.round((dl.doneFiles / Math.max(1, dl.totalFiles)) * 100)) : 0

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.94)', backdropFilter: 'blur(6px)' }}>
      <div className="w-[min(560px,94vw)] rounded-2xl overflow-hidden" style={{ background: `rgba(${GOLD},0.35)`, padding: 2 }}>
        <div className="rounded-2xl px-5 py-5 text-center" style={{ background: `radial-gradient(120% 80% at 50% 0%, rgba(${GOLD},0.14), rgba(10,8,16,0.98) 60%), linear-gradient(160deg,#17111f,#0a0810)` }}>
          <div style={{ fontSize: 40, filter: `drop-shadow(0 0 14px rgba(${GOLD},0.5))` }}>📦</div>
          <h2 className="rvn-disp font-black uppercase mt-1" style={{ fontSize: 'clamp(15px,3vh,20px)', color: 'var(--gold)', letterSpacing: '0.06em' }}>{t('onboarding.gate.title')}</h2>

          {phase === 'prompt' && (
            <>
              <p className="mt-2" style={{ fontSize: 'clamp(11px,1.8vh,13px)', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {t('onboarding.gate.prompt')}
                <b style={{ color: '#f3ead3' }}> {t('onboarding.gate.filesBytes', { count: missing.length, size: totalBytes > 0 ? ` · ~${fmtMB(totalBytes)}` : '' })}</b>.
              </p>
              <p className="mt-1" style={{ fontSize: 'clamp(9px,1.4vh,10.5px)', color: 'var(--text-muted)' }}>{t('onboarding.gate.onceNote')}</p>
              <button onClick={start} className="rvn-press mt-4 w-full rounded-2xl font-black"
                style={{ minHeight: 'clamp(44px,8vh,56px)', fontSize: 'clamp(13px,2vh,16px)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em', background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6', boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 18px rgba(${GOLD},0.35)` }}>
                {t('onboarding.gate.downloadCta')}{totalBytes > 0 ? ` (${fmtMB(totalBytes)})` : ''}
              </button>
            </>
          )}

          {phase === 'downloading' && (
            <>
              <p className="mt-2" style={{ fontSize: 'clamp(11px,1.8vh,13px)', color: 'var(--text-secondary)' }}>
                {hadFails ? t('onboarding.gate.someFailed') : t('onboarding.gate.downloading')}
              </p>
              <div className="mt-3 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(${GOLD},0.25)` }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#ffe28c,#f3b62c)', boxShadow: `0 0 10px rgba(${GOLD},0.6)`, transition: 'width .3s' }} />
              </div>
              <p className="mt-1.5 tabular-nums" style={{ fontSize: 'clamp(9px,1.5vh,11px)', color: 'var(--text-muted)' }}>
                {dl ? `${t('onboarding.gate.progressFiles', { done: dl.doneFiles, total: dl.totalFiles })}${dl.totalBytes > 0 ? ` · ${fmtMB(dl.doneBytes)} / ${fmtMB(dl.totalBytes)}` : ''}${dl.failed > 0 ? ` · ${t('onboarding.gate.failedN', { count: dl.failed })}` : ''}` : '…'}
              </p>
              {hadFails && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <button onClick={retry} className="rvn-press w-full rounded-xl py-2.5 font-bold" style={{ fontSize: 12, fontFamily: 'var(--rvn-font-display)', background: `rgba(${GOLD},0.18)`, border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}>{t('onboarding.gate.retry')}</button>
                  <button onClick={() => { playUiClick(); setPhase('hidden') }} className="rvn-press w-full rounded-xl py-2" style={{ fontSize: 10.5, color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)' }}>{t('onboarding.gate.continueWithout')}</button>
                </div>
              )}
            </>
          )}

          {phase === 'done-wait' && (
            <>
              <p className="mt-2 font-bold" style={{ fontSize: 'clamp(12px,2vh,14px)', color: '#86efac' }}>{t('onboarding.gate.doneTitle')}</p>
              <p className="mt-0.5" style={{ fontSize: 'clamp(9px,1.4vh,10.5px)', color: 'var(--text-muted)' }}>{t('onboarding.gate.doneSub')}</p>
              <button onClick={() => { playUiClick(); setPhase('hidden') }} className="rvn-press mt-4 w-full rounded-2xl font-black"
                style={{ minHeight: 'clamp(44px,8vh,56px)', fontSize: 'clamp(13px,2vh,16px)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em', background: 'linear-gradient(135deg,#2a9a4c,#134f25)', color: '#eafff0', border: '1px solid rgba(74,222,128,0.7)', boxShadow: '0 0 22px rgba(34,197,94,0.4)' }}>
                ⚔ PRADĖTI ŽAISTI
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
