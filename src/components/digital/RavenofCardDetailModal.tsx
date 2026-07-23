'use client'

// ════════════════════════════════════════════════════════════════════════════
// RavenofCardDetailModal — kortos detalių modalas (patvirtintas UI, Fazė 1).
// Vizualas: ravenof-ui-handoff card-detail-modal.png + prototipo CARD DETAIL
// OVERLAY. Logika (craft/disenchant/essence/limitai) — esama, nekeičiama.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { getCraftConfig, disenchantCard, craftCard, type CraftConfig } from '@/lib/gamification/craft'
import { useT, useGameContent } from '@/lib/i18n/react'
import {
  ravenofFactionColor, ravenofFactionIcon, ravenofRarityColor, ravenofRarityGem,
  ravenofCardTypeIcon, RavenofStatTile,
} from './ui/RavenofKit'

export type RavenofCardDetail = {
  id: string; name: string; image: string | null
  faction: string | null; factionSlug: string | null
  type: string | null; rarity: string | null; copyLimit: number; raritySort: number
  gold: number; atk: number | null; hp: number | null; effect: string | null; isChampion: boolean
  owned: number
}

export function RavenofCardDetailModal({ c, onClose, onPrev, onNext, onChanged }: {
  c: RavenofCardDetail
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  onChanged?: () => void
}) {
  const t = useT()
  const gc = useGameContent()
  const [bad, setBad] = useState(false)
  const [cfg, setCfg] = useState<CraftConfig | null>(null)
  const [essence, setEssence] = useState(0)
  const [ownedNow, setOwnedNow] = useState(c.owned)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => { setOwnedNow(c.owned); setMsg(null); setBad(false) }, [c.id, c.owned])
  useEffect(() => { getCraftConfig().then((r) => { if (r) { setCfg(r.config); setEssence(r.essence) } }) }, [])

  // Esc uždaro; ←/→ naršo (turi atitikti esamą klaviatūros elgseną + patvirtintas rodykles)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onPrev?.()
      else if (e.key === 'ArrowRight') onNext?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  // Esama craft/disenchant logika (nekeičiama)
  const tier = String((c.type && /champion|čempion/i.test(c.type)) ? 6 : Math.min(6, Math.max(1, c.raritySort || 1)))
  const dustVal = cfg ? (cfg.disenchant[tier] ?? 0) : 0
  const craftCost = cfg ? (cfg.craft[tier] ?? 0) : 0
  const canDust = ownedNow > c.copyLimit
  const canCraft = ownedNow < c.copyLimit && essence >= craftCost && !!cfg
  const doDust = async () => { if (busy || !canDust) return; setBusy(true); playUiClick(); const r = await disenchantCard(c.id, 1); if (r && 'ok' in r) { playSuccess(); setOwnedNow((n) => n - 1); setEssence(r.essence ?? essence); onChanged?.() } else if (r && 'error' in r) setMsg(t(`collection.craftErr.${r.error}`) === `collection.craftErr.${r.error}` ? t('collection.failed') : t(`collection.craftErr.${r.error}`)); setBusy(false) }
  const doCraft = async () => { if (busy || !canCraft) return; setBusy(true); playUiClick(); const r = await craftCard(c.id); if (r && 'ok' in r) { playSuccess(); setOwnedNow((n) => n + 1); setEssence(r.essence ?? essence); onChanged?.() } else if (r && 'error' in r) setMsg(t(`collection.craftErr.${r.error}`) === `collection.craftErr.${r.error}` ? t('collection.failed') : t(`collection.craftErr.${r.error}`)); setBusy(false) }

  const facColor = ravenofFactionColor(c.factionSlug)
  const rarColor = ravenofRarityColor(c.rarity)
  const typeIcon = ravenofCardTypeIcon(c.type)
  const hasStats = c.atk != null && c.hp != null

  if (typeof document === 'undefined') return null
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={c.name} className="ravenof-body fixed inset-0 flex" style={{ zIndex: 91, background: 'rgba(4,3,7,.92)', backdropFilter: 'blur(4px)', animation: 'ravenofIn .25s ease' }} onClick={onClose}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 30% 50%, ${facColor}26, transparent 65%)` }} />

      {/* ← ankstesnė */}
      <button onClick={(e) => { e.stopPropagation(); playUiClick(); onPrev?.() }} aria-label={t('collection.prevCard')} className="relative flex items-center justify-center shrink-0 ravenof-press" style={{ width: 52, background: 'none', border: 0, color: 'var(--ravenof-text-secondary)', fontSize: 26, cursor: 'pointer', paddingLeft: 'env(safe-area-inset-left, 0px)' }}>‹</button>

      {/* Kortos vaizdas */}
      <div className="relative flex items-center shrink-0" style={{ padding: '14px 0' }} onClick={(e) => e.stopPropagation()}>
        <div role="img" aria-label={c.name} style={{ height: 'min(340px, calc(100dvh - 50px))', aspectRatio: '1044 / 1416', background: c.image && !bad ? `url('${c.image}') no-repeat center / contain` : 'linear-gradient(160deg,#1a1325,#0a0810)', borderRadius: 8, border: '1px solid var(--ravenof-border-strong)', boxShadow: '0 20px 60px rgba(0,0,0,.7)' }}>
          {c.image && !bad && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.image} alt="" onError={() => setBad(true)} style={{ display: 'none' }} />
          )}
        </div>
      </div>

      {/* Detalės */}
      <div className="relative flex-1 flex flex-col min-w-0" style={{ padding: '18px 16px 14px 18px', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start shrink-0" style={{ gap: 8 }}>
          <div className="flex-1 min-w-0">
            <div style={{ font: '700 17px var(--ravenof-font-display)', letterSpacing: '.5px', color: 'var(--ravenof-text-primary)' }}>{c.name}</div>
            <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 3 }}>
              {c.faction && (
                <span className="flex items-center" style={{ gap: 5, font: '600 10.5px var(--ravenof-font-body)', color: facColor }}>
                  <span aria-hidden style={{ width: 14, height: 14, background: facColor, WebkitMask: `url('${ravenofFactionIcon(c.factionSlug)}') center / contain no-repeat`, mask: `url('${ravenofFactionIcon(c.factionSlug)}') center / contain no-repeat`, display: 'inline-block' }} />
                  {gc.faction(c.faction)}
                </span>
              )}
              {c.type && (
                <span className="flex items-center" style={{ gap: 5, font: '600 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>
                  {typeIcon && <span aria-hidden style={{ width: 13, height: 13, background: 'var(--ravenof-text-secondary)', WebkitMask: `url('${typeIcon}') center / contain no-repeat`, mask: `url('${typeIcon}') center / contain no-repeat`, display: 'inline-block' }} />}
                  {gc.cardType(c.type)}
                </span>
              )}
              {c.rarity && (
                <span className="flex items-center" style={{ gap: 5, font: '700 10.5px var(--ravenof-font-body)', color: rarColor, border: `1px solid ${rarColor}55`, padding: '1px 7px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ravenofRarityGem(c.rarity)} alt="" style={{ width: 11, height: 14, objectFit: 'contain' }} />
                  {gc.rarity(c.rarity)}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="ravenof-iconbtn shrink-0">✕</button>
        </div>

        <div className="flex shrink-0" style={{ gap: 8, marginTop: 10 }}>
          <RavenofStatTile value={c.gold} label={t('collection.goldCost')} color="var(--ravenof-gold)" />
          {hasStats && <RavenofStatTile value={c.atk ?? 0} label={t('collection.attack')} />}
          {hasStats && <RavenofStatTile value={c.hp ?? 0} label={t('collection.health')} color="var(--ravenof-danger-bright)" />}
          <RavenofStatTile value={ownedNow} suffix={<span style={{ font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}> / {c.copyLimit}</span>} label={t('collection.ownedStat')} />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll" style={{ background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '10px 12px', marginTop: 8, font: '400 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)', lineHeight: 1.45 }}>
          {c.effect || <span style={{ color: 'var(--ravenof-text-secondary)' }}>—</span>}
          {msg && <p style={{ marginTop: 8, font: '500 11px var(--ravenof-font-body)', color: 'var(--ravenof-danger-bright)' }}>{msg}</p>}
        </div>

        <div className="flex items-center shrink-0" style={{ gap: 8, marginTop: 10 }}>
          <button onClick={doCraft} disabled={busy || !canCraft} style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, color: canCraft ? '#07060A' : '#5e5868', background: canCraft ? 'linear-gradient(180deg,#a98ad6,#7650A4)' : 'var(--ravenof-bg-elevated)', padding: '11px 6px', border: 0, cursor: canCraft ? 'pointer' : 'default', clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)', textTransform: 'uppercase' }}>
            {t('collection.craftCta')} · {craftCost} ◈
          </button>
          <button onClick={doDust} disabled={busy || !canDust} style={{ flex: 1, textAlign: 'center', font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, color: canDust ? 'var(--ravenof-text-secondary)' : '#4a4552', background: 'none', border: `1px solid ${canDust ? 'var(--ravenof-border-strong)' : '#221e29'}`, padding: '10px 6px', cursor: canDust ? 'pointer' : 'default', textTransform: 'uppercase' }}>
            {t('collection.disenchantCta')} · +{dustVal} ◈
          </button>
          <span className="shrink-0" style={{ font: '600 11px var(--ravenof-font-body)', color: 'var(--ravenof-essence)' }}>◈ {essence}</span>
        </div>
      </div>

      {/* → kita */}
      <button onClick={(e) => { e.stopPropagation(); playUiClick(); onNext?.() }} aria-label={t('collection.nextCard')} className="relative flex items-center justify-center shrink-0 ravenof-press" style={{ width: 52, background: 'none', border: 0, color: 'var(--ravenof-text-secondary)', fontSize: 26, cursor: 'pointer', paddingRight: 'env(safe-area-inset-right, 0px)' }}>›</button>
    </div>,
    document.body
  )
}
