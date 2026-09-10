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
import { getMediaManifest, diffMissing, downloadMedia, fmtMB, estimateTotalBytes, type ManifestEntry, type DlProgress, type DlHandle } from '@/lib/digital/mediaDownloader'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'
import { RavenofBannerButton, RavenofButton, RavenofProgress } from '@/components/digital/ui/RavenofKit'

const SILENT_LIMIT = 10   // iki tiek trūkstamų failų — siunčiam tyliai, be popup

type Phase = 'checking' | 'silent' | 'prompt' | 'downloading' | 'done-wait' | 'hidden'

export function ContentDownloadGate() {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('checking')
  const [missing, setMissing] = useState<ManifestEntry[]>([])
  const [dl, setDl] = useState<DlProgress | null>(null)
  const dlRef = useRef<DlHandle | null>(null)
  // Tier 2 (kortu artai + balsai, ~58 MB) NEBEblokuoja zaidimo (QA #3):
  // siunciamas tyliai fone, o trukstami failai zaidziant traukiami per SW.
  const bgMissRef = useRef<ManifestEntry[]>([])
  const bgRef = useRef<DlHandle | null>(null)
  const [bgBytes, setBgBytes] = useState(0)
  const startBg = () => {
    if (bgRef.current || bgMissRef.current.length === 0) return
    bgRef.current = downloadMedia(bgMissRef.current, () => {})
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (typeof caches === 'undefined') { setPhase('hidden'); return }
        // Local-first app bundle (Electron / Capacitor local): visas turinys jau supakuotas
        // į įrenginį, o Cache API ant app:// schemos neveikia — gate nereikalingas.
        if ((window as unknown as { __RAVENOF_APP_BUNDLE__?: boolean }).__RAVENOF_APP_BUNDLE__) { setPhase('hidden'); return }
        // Automatizacija (Playwright/webdriver): gate praleidžiamas — e2e testai
        // neturi siųstis media paketo; failai traukiami žaidžiant per SW.
        if (typeof navigator !== 'undefined' && navigator.webdriver) { setPhase('hidden'); return }
        const manifest = await getMediaManifest()
        if (!alive) return
        if (manifest.length === 0) { setPhase('hidden'); return }   // RPC nepasiekiamas / offline — neblokuojam
        const missAll = await diffMissing(manifest)
        if (!alive) return
        // Blokuoja TIK tier 1 (core UI/kosmetika/pakai, ~5 MB). Tier 2 — fonui.
        const miss = missAll.filter((e) => e.tier === 1)
        // Fono eile pagal matomuma: kortu artai pirmiau (matomi kolekcijoj/kovoj),
        // balsai veliau (voiceManager vis tiek lazy-load'ina pagal poreiki).
        const BG_ORDER: Record<string, number> = { 'card-art': 0, 'cinematic-poster': 1, 'voice': 2, 'avatar-voice': 3 }
        bgMissRef.current = missAll.filter((e) => e.tier === 2)
          .sort((a, b) => (BG_ORDER[a.kind] ?? 9) - (BG_ORDER[b.kind] ?? 9))
        setBgBytes(estimateTotalBytes(bgMissRef.current))
        if (miss.length === 0) { startBg(); setPhase('hidden'); return }
        setMissing(miss)
        if (miss.length < SILENT_LIMIT) {
          // maža delta — tyliai fone, be trukdymo
          setPhase('silent')
          dlRef.current = downloadMedia(miss, () => {})
          void dlRef.current.promise.then(() => { if (alive) { startBg(); setPhase('hidden') } })
        } else {
          setPhase('prompt')
        }
      } catch { if (alive) setPhase('hidden') }
    })()
    return () => { alive = false; dlRef.current?.cancel(); bgRef.current?.cancel() }
  }, [])

  const start = () => {
    playUiClick()
    setPhase('downloading')
    dlRef.current = downloadMedia(missing, setDl)
    void dlRef.current.promise.then((p) => {
      if (p.failed === 0) { playSuccess(); setPhase('done-wait'); startBg() }
      // su klaidom liekam 'downloading' — UI parodys retry
    })
  }

  const retry = async () => {
    playUiClick()
    setDl(null)
    const manifest = await getMediaManifest()
    const missAll = await diffMissing(manifest)
    const miss = missAll.filter((e) => e.tier === 1)
    bgMissRef.current = missAll.filter((e) => e.tier === 2)
    if (miss.length === 0) { playSuccess(); setPhase('done-wait'); startBg(); return }
    setMissing(miss)
    setPhase('downloading')
    dlRef.current = downloadMedia(miss, setDl)
    void dlRef.current.promise.then((p) => { if (p.failed === 0) { playSuccess(); setPhase('done-wait'); startBg() } })
  }

  if (phase === 'checking' || phase === 'silent' || phase === 'hidden') return null
  if (typeof document === 'undefined') return null

  const totalBytes = estimateTotalBytes(missing)
  const finished = dl != null && !dl.running
  const hadFails = finished && (dl?.failed ?? 0) > 0
  const pct = dl ? (dl.totalBytes > 0
    ? Math.min(100, Math.round((dl.doneBytes / dl.totalBytes) * 100))
    : Math.round((dl.doneFiles / Math.max(1, dl.totalFiles)) * 100)) : 0

  const P = { font: '400 12px var(--ravenof-font-body)', lineHeight: 1.5, color: 'var(--ravenof-text-secondary)', margin: 0 } as const
  const MUTED = { font: '400 10.5px var(--ravenof-font-body)', lineHeight: 1.45, color: 'var(--ravenof-text-muted, #6b6474)', margin: 0 } as const

  return createPortal(
    <div role="dialog" aria-modal="true" className="ravenof-body fixed inset-0 z-[500] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,7,0.92)', backdropFilter: 'blur(4px)', animation: 'ravenofIn .25s ease' }}>
      <div className="ravenof-panel w-[min(480px,94vw)] relative" style={{ padding: '26px 30px 24px', animation: 'ravenofFound .3s ease' }}>
        {/* kampų akcentai – kaip prototipo panelėse */}
        {(['0 auto auto 0', '0 0 auto auto', 'auto auto 0 0', 'auto 0 0 auto'] as const).map((inset, i) => (
          <span key={i} aria-hidden className="absolute pointer-events-none" style={{ inset, width: 14, height: 14,
            borderTop: i < 2 ? '1px solid var(--ravenof-gold)' : 'none', borderBottom: i >= 2 ? '1px solid var(--ravenof-gold)' : 'none',
            borderLeft: i % 2 === 0 ? '1px solid var(--ravenof-gold)' : 'none', borderRight: i % 2 === 1 ? '1px solid var(--ravenof-gold)' : 'none', opacity: .8 }} />
        ))}

        <div className="text-center">
          <div style={{ font: '500 9.5px var(--ravenof-font-body)', letterSpacing: 4, textTransform: 'uppercase', color: 'var(--ravenof-gold)' }}>Ravenof</div>
          <h2 style={{ font: '700 18px var(--ravenof-font-display)', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)', margin: '4px 0 0' }}>{t('onboarding.gate.title')}</h2>
          <div aria-hidden className="mx-auto mt-3" style={{ width: 120, height: 1, background: 'linear-gradient(90deg, transparent, var(--ravenof-gold), transparent)' }} />
        </div>

        {phase === 'prompt' && (
          <div className="mt-4 flex flex-col" style={{ gap: 6 }}>
            <p style={P}>
              {t('onboarding.gate.prompt')}{' '}
              <b style={{ color: 'var(--ravenof-text-primary)', fontWeight: 700 }}>{t('onboarding.gate.filesBytes', { count: missing.length, size: totalBytes > 0 ? ` · ~${fmtMB(totalBytes)}` : '' })}</b>.
            </p>
            <p style={MUTED}>{t('onboarding.gate.onceNote')}</p>
            {bgBytes > 0 && <p style={MUTED}>{t('onboarding.gate.bgNote', { size: fmtMB(bgBytes) })}</p>}
            <RavenofBannerButton onClick={start} style={{ marginTop: 14, width: '100%' }}>
              {t('onboarding.gate.downloadCta')}{totalBytes > 0 ? ` (${fmtMB(totalBytes)})` : ''}
            </RavenofBannerButton>
          </div>
        )}

        {phase === 'downloading' && (
          <div className="mt-4 flex flex-col" style={{ gap: 10 }}>
            <p style={{ ...P, textAlign: 'center', color: hadFails ? 'var(--ravenof-danger-bright, #e06a78)' : P.color }}>
              {hadFails ? t('onboarding.gate.someFailed') : t('onboarding.gate.downloading')}
            </p>
            <RavenofProgress pct={pct} height={5} style={{ border: '1px solid var(--ravenof-border-strong)' }} />
            <p className="tabular-nums text-center" style={{ ...MUTED, letterSpacing: .5 }}>
              {dl ? `${t('onboarding.gate.progressFiles', { done: dl.doneFiles, total: dl.totalFiles })}${dl.totalBytes > 0 ? ` · ${fmtMB(dl.doneBytes)} / ${fmtMB(dl.totalBytes)}` : ''}${dl.failed > 0 ? ` · ${t('onboarding.gate.failedN', { count: dl.failed })}` : ''}` : '…'}
            </p>
            {hadFails && (
              <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
                <RavenofButton variant="primary" onClick={retry} style={{ width: '100%' }}>{t('onboarding.gate.retry')}</RavenofButton>
                <RavenofButton variant="secondary" onClick={() => { playUiClick(); setPhase('hidden') }} style={{ width: '100%', textTransform: 'none', letterSpacing: .3, fontFamily: 'var(--ravenof-font-body)', fontWeight: 500 }}>{t('onboarding.gate.continueWithout')}</RavenofButton>
              </div>
            )}
          </div>
        )}

        {phase === 'done-wait' && (
          <div className="mt-4 flex flex-col text-center" style={{ gap: 6 }}>
            <p style={{ font: '700 14px var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-success, #5fae6a)', margin: 0 }}>{t('onboarding.gate.doneTitle')}</p>
            <p style={MUTED}>{t('onboarding.gate.doneSub')}</p>
            {bgBytes > 0 && <p style={MUTED}>{t('onboarding.gate.bgNote', { size: fmtMB(bgBytes) })}</p>}
            <RavenofBannerButton onClick={() => { playUiClick(); setPhase('hidden') }} style={{ marginTop: 14, width: '100%' }}>
              {t('onboarding.gate.playCta')}
            </RavenofBannerButton>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
