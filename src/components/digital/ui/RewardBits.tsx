'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Bendri atlygių UI blokai — VISI puslapiai atlygius rodo per juos.
//  • SafeRewardImage — rezervuoti matmenys, klaida → aiškus fallback (be broken
//    image ikonos ir be begalinio ciklo), object-fit contain.
//  • RewardChip — kompaktiškas [ikona +kiekis] lustelis (sąrašams/santraukoms).
//  • RewardDisplay — atlygis su būsenom (locked/claimed IŠSAUGO tikrą asset'ą:
//    tik desaturacija + ženkliukas, niekada nekeičia turinio į varnelę).
//  • RewardSlot — pilnas slot'as su payload (iki 3 vizualų + „+N").
// Jokių emoji — tik kanoniniai registro asset'ai.
// ══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Lock, Check } from 'lucide-react'
import { resolveRewardVisual, REWARD_MISSING_ASSET, type RewardPayloadItem } from '@/lib/rewards/rewardVisuals'
import { t as tGlobal } from '@/lib/i18n/core'

export function SafeRewardImage({ src, size, opticalScale = 1, alt = '', dimmed }: {
  src: string; size: number; opticalScale?: number; alt?: string; dimmed?: boolean
}) {
  const [err, setErr] = useState(false)
  const finalSrc = err ? REWARD_MISSING_ASSET : src
  return (
    <span className="inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }} aria-hidden={alt === ''}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={finalSrc} alt={alt} width={size} height={size} loading="lazy"
        onError={() => { if (!err) setErr(true) }}
        style={{ width: '100%', height: '100%', objectFit: 'contain', transform: opticalScale !== 1 ? `scale(${opticalScale})` : undefined, filter: dimmed ? 'grayscale(0.6) brightness(0.75)' : undefined }} />
    </span>
  )
}

/** Kompaktiškas lustelis: [ikona] +100 — visiems payload sąrašams. */
export function RewardChip({ it, size = 16, textSize = 10.5, color = '#e8dcc0' }: {
  it: RewardPayloadItem; size?: number; textSize?: number; color?: string
}) {
  const v = resolveRewardVisual(it)
  return (
    <span className="inline-flex items-center gap-1 align-middle" title={`${v.name}${v.label ? ` · ${v.label}` : ''} — ${v.desc}`} data-reward={v.key}>
      <SafeRewardImage src={v.asset} size={size} opticalScale={v.opticalScale} />
      {v.label && <b style={{ fontSize: textSize, color, lineHeight: 1 }}>{v.label}</b>}
    </span>
  )
}

export type RewardState = 'locked' | 'available' | 'claimable' | 'claimed' | 'preview'

/** Atlygis su būsena — asset'as IŠLIEKA visose būsenose. */
export function RewardDisplay({ it, size = 34, state = 'preview', showName }: {
  it: RewardPayloadItem; size?: number; state?: RewardState; showName?: boolean
}) {
  const v = resolveRewardVisual(it)
  const dim = state === 'locked' || state === 'claimed'
  return (
    <span className="relative inline-flex flex-col items-center gap-0.5" title={`${v.name}${v.label ? ` · ${v.label}` : ''} — ${v.desc}${state === 'claimed' ? tGlobal('common.rewardState.claimed') : state === 'locked' ? tGlobal('common.rewardState.locked') : ''}`}
      aria-label={`${v.name} ${v.label}`} data-reward={v.key} data-reward-state={state}>
      <span className="relative">
        <SafeRewardImage src={v.asset} size={size} opticalScale={v.opticalScale} dimmed={dim} />
        {state === 'locked' && (
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full" style={{ width: Math.max(14, size * 0.4), height: Math.max(14, size * 0.4), background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <Lock style={{ width: '60%', height: '60%', color: '#94a3b8' }} />
          </span>
        )}
        {state === 'claimed' && (
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full" style={{ width: Math.max(14, size * 0.4), height: Math.max(14, size * 0.4), background: 'rgba(22,101,52,0.95)', border: '1px solid rgba(74,222,128,0.7)' }}>
            <Check style={{ width: '65%', height: '65%', color: '#bbf7d0' }} />
          </span>
        )}
      </span>
      {v.label && <b style={{ fontSize: Math.max(9, size * 0.28), color: dim ? 'var(--text-muted)' : '#f3ead3', lineHeight: 1 }}>{v.label}</b>}
      {showName && <span style={{ fontSize: Math.max(8, size * 0.24), color: 'var(--text-muted)' }}>{v.name}</span>}
    </span>
  )
}

/** Pilnas slot'as: iki 3 atlygių + „+N"; būsena bendra visiems. */
export function RewardSlot({ payload, state = 'preview', size = 30, max = 3 }: {
  payload: RewardPayloadItem[]; state?: RewardState; size?: number; max?: number
}) {
  const shown = payload.slice(0, max)
  const extra = payload.length - shown.length
  return (
    <span className="inline-flex items-center gap-1.5" data-reward-slot data-reward-state={state}>
      {shown.map((it, i) => <RewardDisplay key={i} it={it} size={size} state={state} />)}
      {extra > 0 && <span className="font-bold" style={{ fontSize: size * 0.35, color: 'var(--text-muted)' }}>+{extra}</span>}
      {payload.length === 0 && <RewardDisplay it={{ type: 'item', item_type: '__nežinomas__' }} size={size} state={state} />}
    </span>
  )
}
