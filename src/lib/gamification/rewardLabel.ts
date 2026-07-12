import { t } from '@/lib/i18n/core'
// ── Atlygio payload → žmogui skaitomi ženkliukai ──────────────────────────────

/** rarity raktas → i18n raktas (LOGIKOS raktai lieka angliški). */
const CARD_MIN_KEY: Record<string, string> = {
  magic: 'ranked.rarity.magic', unique: 'ranked.rarity.unique', epic: 'ranked.rarity.epic', legendary: 'ranked.rarity.legendary',
}

/** Grąžina atlygio dalis kaip masyvą trumpų etikečių (su emoji). */
export function rewardParts(payload: Record<string, unknown> | null | undefined): string[] {
  if (!payload) return []
  const out: string[] = []
  const gold = Number(payload.gold ?? 0)
  const exp = Number(payload.exp ?? 0)
  const passXp = Number(payload.passXp ?? 0)
  const boosters = Number(payload.boosters ?? 0)
  const cardMin = typeof payload.cardMin === 'string' ? payload.cardMin : null
  if (gold > 0) out.push(`🪙 ${gold}`)
  if (boosters > 0) out.push(`🎁 ${t('rewards.label.packs', { count: boosters })}`)
  if (cardMin) out.push(`🃏 ${t('rewards.label.cardMin', { rarity: CARD_MIN_KEY[cardMin] ? t(CARD_MIN_KEY[cardMin]) : cardMin })}`)
  if (exp > 0) out.push(`⭐ ${exp} XP`)
  if (passXp > 0) out.push(`🎖️ ${t('rewards.label.pathXp', { xp: passXp })}`)
  return out
}

export function rewardLabel(payload: Record<string, unknown> | null | undefined): string {
  const parts = rewardParts(payload)
  return parts.length ? parts.join(' · ') : '—'
}
