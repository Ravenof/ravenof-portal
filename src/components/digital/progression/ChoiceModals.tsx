'use client'
// ════════════════════════════════════════════════════════════════════════════
//  Atlygio pasirinkimo langai — frakcijos boosteris ir kortos pasirinkimas.
//  Naudojami iš Prisijungimo dovanų, Sezono kelio ir „Atsiimti viską" eilės.
//  Serveris NIEKADA neparenka automatiškai: kiekvienas pasirinkimas patvirtinamas.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { useT, useLocale } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import {
  cardOptions, packOptions, resolveCardChoice, resolvePackChoice,
  type CardChoiceOption, type PackOption, type PendingRewardChoice,
} from '@/lib/progression'
import { celebrateRewards } from './RewardCelebration'
import { ravenofFactionIcon } from '@/components/digital/ui/RavenofKit'
import { BODY, C, Cta, DISPLAY, ProgressionModal, RewardIcon } from './kit'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import { DT } from '@/components/digital/ui/deskTokens'

// ── Boosterio pasirinkimas = viena iš AKTYVIŲ parduotuvės pakuočių ─────────
// Serveris grąžina gyvą card_packs sąrašą (šiuo metu 2: Gėrio gynėjai / Tamsos
// aliansas). Patvirtinus pakuotė dedama į inventorių – atidaroma Kolekcijoje.
export function FactionBoosterChoiceModal({ choice, queue, onDone, onCancel }: {
  choice: PendingRewardChoice
  queue?: { index: number; total: number }
  onDone: () => void
  onCancel: () => void
}) {
  const t = useT()
  const { desktop: D } = useDesktopUi()
  const [selected, setSelected] = useState<PackOption | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const options = useMemo(() => packOptions(choice), [choice])

  useEffect(() => { setSelected(null); setErr(null) }, [choice.choiceId])

  const confirm = async () => {
    if (!selected || busy) return
    setBusy(true); setErr(null); playUiClick()
    const r = await resolvePackChoice(choice.choiceId, selected.packId)
    setBusy(false)
    if (!r || 'error' in r) { setErr(t('progression.choice.failed')); return }
    celebrateRewards({
      kicker: t('rewards.celebrate.kickerPack', { name: selected.name }),
      title: t('rewards.celebrate.boosterPack'), titleAccent: t('rewards.celebrate.boosterPackAccent'),
      items: [{ kind: 'pack', name: selected.name, imageUrl: selected.imageUrl, label: t('rewards.celebrate.packLabel') }],
    })
    onDone()
  }

  const tile = (p: PackOption) => {
    const on = selected?.packId === p.packId
    const accent = p.alignment === 'dark' ? C.burgundyFg : C.goldHi
    return (
      <button key={p.packId} type="button" onClick={() => { playUiClick(); setSelected(p) }}
        aria-pressed={on}
        className="rvn-prog-clip"
        style={{
          flex: 1, minWidth: 0, padding: 0, cursor: 'pointer', textAlign: 'left',
          border: `1px solid ${on ? C.gold : C.lineIn}`,
          background: on ? 'linear-gradient(180deg, rgba(198,161,79,.14), rgba(21,17,28,.95))' : C.raised,
          display: 'flex', flexDirection: 'column',
          boxShadow: on ? '0 0 0 1px rgba(226,185,88,.35), 0 12px 30px rgba(0,0,0,.5)' : 'none',
        }}>
        <div style={{ position: 'relative', height: 230, display: 'grid', placeItems: 'center', overflow: 'hidden', borderBottom: `1px solid ${on ? C.gold : C.lineIn}`, background: 'radial-gradient(80% 70% at 50% 60%, rgba(226,185,88,.10), transparent 70%), #0a0810' }}>
          {p.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.imageUrl} alt="" aria-hidden style={{ maxWidth: '78%', maxHeight: '90%', objectFit: 'contain', filter: `drop-shadow(0 14px 30px rgba(0,0,0,.75))${on ? '' : ' saturate(.8) brightness(.85)'}`, transition: 'transform 200ms ease, filter 200ms ease', transform: on ? 'scale(1.06)' : 'none' }} />
            : <RewardIcon reward={{ type: 'faction_booster_choice', quantity: 1 }} size={96} />}
          <span style={{ position: 'absolute', left: 12, top: 10, font: `${D ? 600 : 500} ${D ? DT.fs.label : 9}px ${BODY}`, letterSpacing: 2, textTransform: 'uppercase', color: accent }}>
            {t(`progression.choice.${p.alignment === 'dark' ? 'dark' : 'light'}`)}
          </span>
          <span style={{ position: 'absolute', right: 12, top: 10, font: `${D ? 600 : 500} ${D ? DT.fs.label : 9}px ${BODY}`, letterSpacing: 1.5, color: C.label }}>{t('progression.choice.packCards', { count: p.cardsPerPack })}</span>
        </div>
        <div style={{ padding: D ? '14px 16px 16px' : '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: D ? 10 : 8 }}>
          <div style={{ font: `700 ${D ? 19 : 17}px ${DISPLAY}`, color: on ? C.bone : C.muted }}>{p.name}</div>
          <div style={{ font: `${D ? 600 : 500} ${D ? DT.fs.label : 9}px ${BODY}`, letterSpacing: 1.8, textTransform: 'uppercase', color: C.label }}>{t('progression.choice.packFactions')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {p.factions.map((f) => (
              <span key={f.factionId} style={{ display: 'inline-flex', alignItems: 'center', gap: D ? 7 : 5, padding: D ? '5px 10px' : '4px 8px', border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.5)', font: `500 ${D ? 13.5 : 10}px ${BODY}`, color: C.muted }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ravenofFactionIcon(f.slug)} alt="" aria-hidden style={{ width: D ? 18 : 14, height: D ? 18 : 14, objectFit: 'contain' }} />
                {f.name}
              </span>
            ))}
          </div>
        </div>
      </button>
    )
  }

  return (
    <ProgressionModal open onClose={onCancel} width={D ? 780 : 720}
      closeLabel={t('common.close')}
      kicker={queue ? t('progression.choice.queue', { index: queue.index, total: queue.total }) : t('progression.choice.packKicker')}
      title={t('progression.choice.packTitle')}
      footer={
        <div style={{ display: 'flex', gap: D ? 16 : 10, alignItems: 'center' }}>
          <div style={{ flex: 1, font: `400 ${D ? DT.fs.help : 10.5}px ${BODY}`, color: C.muted }}>
            {selected ? t('progression.choice.packSelected') : t('progression.choice.packHint')}
          </div>
          <div style={{ width: D ? 240 : 220 }}>
            <Cta onClick={confirm} disabled={!selected} busy={busy}>{t('progression.choice.confirm')}</Cta>
          </div>
        </div>
      }>
      {err && <div role="alert" style={{ font: `600 ${D ? 14 : 11}px ${DISPLAY}`, color: '#e0707c', marginBottom: 10 }}>{err}</div>}
      <div style={{ display: 'flex', gap: D ? 16 : 14 }}>{options.map(tile)}</div>
    </ProgressionModal>
  )
}

// ── Kortos pasirinkimas ─────────────────────────────────────────────────────
export function CardChoiceModal({ choice, queue, onDone, onCancel }: {
  choice: PendingRewardChoice
  queue?: { index: number; total: number }
  onDone: () => void
  onCancel: () => void
}) {
  const t = useT()
  const locale = useLocale()
  const { desktop: D } = useDesktopUi()
  const [selected, setSelected] = useState<CardChoiceOption | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const options = useMemo(() => cardOptions(choice), [choice])
  const allCapped = options.length > 0 && options.every((o) => o.disabled)

  useEffect(() => { setSelected(null); setErr(null) }, [choice.choiceId])

  const confirm = async () => {
    if (!selected || busy) return
    setBusy(true); setErr(null); playUiClick()
    const r = await resolveCardChoice(choice.choiceId, selected.cardId)
    setBusy(false)
    if (!r || 'error' in r) { setErr(t('progression.choice.failed')); return }
    // TIKRA korta celebration'e; jei copy limit'as – esencijos kompensacija
    celebrateRewards({
      kicker: t('rewards.celebrate.kickerCard'), title: t('rewards.celebrate.card'), titleAccent: t('rewards.celebrate.cardAccent'),
      items: r.compensated && r.essence
        ? [{ kind: 'reward', reward: { type: 'essence', amount: r.essence } }]
        : [{ kind: 'card', name: locale === 'en' ? selected.nameEn : selected.nameLt, imageUrl: selected.imageUrl, rarity: selected.rarity, sub: `${t(`progression.rarity.${selected.rarity}`)} · ${selected.factionName}` }],
    })
    onDone()
  }

  const card = (o: CardChoiceOption) => {
    const on = selected?.cardId === o.cardId
    const name = locale === 'en' ? o.nameEn : o.nameLt
    const effect = locale === 'en' ? o.effectTextEn : o.effectTextLt
    return (
      <button key={o.cardId} type="button" onClick={() => { playUiClick(); setSelected(o) }}
        aria-pressed={on}
        className="rvn-prog-clip"
        style={{
          flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer', padding: 0,
          border: `1px solid ${on ? C.gold : C.lineIn}`,
          background: on ? 'linear-gradient(180deg, rgba(198,161,79,.14), rgba(21,17,28,.95))' : C.raised,
          display: 'flex', flexDirection: 'column', opacity: o.disabled ? 0.62 : 1,
        }}>
        <div style={{ position: 'relative', height: D ? 280 : 168, overflow: 'hidden', borderBottom: `1px solid ${on ? C.gold : C.lineIn}`, background: '#0a0810' }}>
          {o.imageUrl
            // Desktop: visa korta matoma (contain), ne nukirpta juosta
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={o.imageUrl} alt="" aria-hidden style={D
              ? { position: 'absolute', inset: '34px 10px 10px', width: 'calc(100% - 20px)', height: 'calc(100% - 44px)', objectFit: 'contain', filter: 'drop-shadow(0 10px 22px rgba(0,0,0,.7))' }
              : { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 22%' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#1a1325,#0a0810)' }} />}
          {!D && <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,6,10,.1), rgba(7,6,10,.9))' }} />}
          <div style={{ position: 'absolute', left: 10, top: 9, display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ravenofFactionIcon(o.factionSlug)} alt="" aria-hidden title={o.factionName} style={{ width: D ? 20 : 16, height: D ? 20 : 16, objectFit: 'contain', opacity: 0.85 }} />
            <span style={{ font: `${D ? 600 : 500} ${D ? DT.fs.label : 8.5}px ${BODY}`, letterSpacing: 1.8, color: o.alignment === 'light' ? C.goldHi : C.burgundyFg, textTransform: 'uppercase' }}>
              {t(`progression.choice.${o.alignment}`)}
            </span>
          </div>
          {!D && <div style={{ position: 'absolute', left: 10, right: 10, bottom: 8, font: `700 15px ${DISPLAY}`, color: C.bone, textShadow: '0 2px 10px #000' }}>{name}</div>}
        </div>
        <div style={{ padding: D ? 14 : 11, display: 'flex', flexDirection: 'column', gap: D ? 10 : 8, flex: D ? 1 : undefined }}>
          {D && <div className="rvn-clamp2" style={{ font: `700 ${DT.fs.h3}px/1.25 ${DISPLAY}`, color: C.bone }}>{name}</div>}
          <div style={{ font: `400 ${D ? DT.fs.help : 10.5}px ${BODY}`, color: C.muted, lineHeight: 1.45, minHeight: 30, flex: D ? 1 : undefined }}>{effect}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: D ? 'wrap' : undefined, font: `400 ${D ? DT.fs.label : 9.5}px ${BODY}`, color: C.label }}>
            <span>{t('progression.choice.owned', { owned: o.ownedCount, limit: o.copyLimit })}</span>
            {o.disabled && <span style={{ color: C.violetFg, fontWeight: 700 }}>{t('progression.choice.compensated', { essence: o.duplicateEssence })}</span>}
          </div>
        </div>
      </button>
    )
  }

  return (
    <ProgressionModal open onClose={onCancel} width={D ? 900 : 760}
      closeLabel={t('common.close')}
      kicker={queue ? t('progression.choice.queue', { index: queue.index, total: queue.total }) : t('progression.choice.cardKicker')}
      title={t('progression.choice.cardTitle', { rarity: t(`progression.rarity.${choice.rarity ?? 'rare'}`) })}
      footer={
        <div style={{ display: 'flex', gap: D ? 16 : 10, alignItems: 'center' }}>
          <div style={{ flex: 1, font: `400 ${D ? DT.fs.help : 10.5}px ${BODY}`, color: C.muted }}>
            {allCapped ? t('progression.choice.allCapped') : t('progression.choice.cardHint')}
          </div>
          <div style={{ width: D ? 240 : 220 }}>
            <Cta onClick={confirm} disabled={!selected} busy={busy}>{t('progression.choice.confirm')}</Cta>
          </div>
        </div>
      }>
      {err && <div role="alert" style={{ font: `600 ${D ? 14 : 11}px ${DISPLAY}`, color: '#e0707c', marginBottom: 10 }}>{err}</div>}
      <div style={{ display: 'flex', gap: D ? 16 : 12, alignItems: D ? 'stretch' : undefined }}>{options.map(card)}</div>
    </ProgressionModal>
  )
}

// ── Pasirinkimų eilė (Claim All / kelių boosterių atvejai) ──────────────────
export function ChoiceQueue({ choices, onResolved, onClose }: {
  choices: PendingRewardChoice[]
  onResolved: () => void
  onClose: () => void
}) {
  if (!choices.length) return null
  const current = choices[0]
  const queue = choices.length > 1 ? { index: 1, total: choices.length } : undefined
  return current.choiceType === 'card'
    ? <CardChoiceModal choice={current} queue={queue} onDone={onResolved} onCancel={onClose} />
    : <FactionBoosterChoiceModal choice={current} queue={queue} onDone={onResolved} onCancel={onClose} />
}

// ── Perrinkimo patvirtinimas ────────────────────────────────────────────────
export function RerollConfirmModal({ open, costSilver, silverBalance, progress, target, busy, onConfirm, onCancel }: {
  open: boolean; costSilver: number; silverBalance: number
  progress: number; target: number; busy: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  const t = useT()
  const { desktop: D } = useDesktopUi()
  const notEnough = costSilver > 0 && silverBalance < costSilver
  return (
    <ProgressionModal open={open} onClose={onCancel} width={D ? 520 : 460}
      closeLabel={t('common.close')}
      kicker={t('progression.quests.rerollKicker')}
      title={t('progression.quests.rerollTitle')}
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: D ? 'flex-end' : undefined }}>
          <div style={{ flex: D ? '0 1 180px' : 1 }}><Cta onClick={onCancel} tone="ghost">{t('common.cancel')}</Cta></div>
          <div style={{ flex: D ? '0 1 240px' : 1 }}>
            <Cta onClick={onConfirm} busy={busy} disabled={notEnough}>{t('progression.quests.rerollConfirm')}</Cta>
          </div>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: D ? 12 : 10, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: D ? 14 : 11 }}>
          <RewardIcon reward={{ type: 'silver', amount: costSilver }} size={D ? 28 : 20} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `700 ${D ? 16 : 13}px ${DISPLAY}`, color: C.bone }}>
              {costSilver > 0 ? t('progression.quests.rerollCost', { cost: costSilver }) : t('progression.quests.rerollFree')}
            </div>
            <div style={{ font: `400 ${D ? DT.fs.help : 9.5}px ${BODY}`, color: C.label, marginTop: D ? 2 : undefined }}>
              {t('progression.quests.silverBalance', { balance: silverBalance })}
            </div>
          </div>
        </div>
        {progress > 0 && (
          <div role="alert" style={{ border: `1px solid rgba(141,45,56,.5)`, background: 'rgba(141,45,56,.12)', padding: D ? 14 : 11, font: `400 ${D ? 14 : 10.5}px ${BODY}`, color: C.burgundyFg, lineHeight: 1.5 }}>
            {t('progression.quests.rerollProgressWarning', { progress, target })}
          </div>
        )}
        {notEnough && (
          <div role="alert" style={{ font: `600 ${D ? 14 : 10.5}px ${DISPLAY}`, color: '#e0707c' }}>{t('progression.quests.notEnoughSilver')}</div>
        )}
        <div style={{ font: `400 ${D ? DT.fs.help : 10.5}px ${BODY}`, color: C.muted, lineHeight: 1.55 }}>{t('progression.quests.rerollNote')}</div>
      </div>
    </ProgressionModal>
  )
}
