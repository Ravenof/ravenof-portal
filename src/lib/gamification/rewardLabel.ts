// ── Atlygio payload → žmogui skaitomi ženkliukai ──────────────────────────────

const CARD_MIN_LT: Record<string, string> = {
  magic: 'Magiškas+', unique: 'Unikalus+', epic: 'Epiškas+', legendary: 'Legendinis+',
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
  if (boosters > 0) out.push(`🎁 ${boosters} pak.`)
  if (cardMin) out.push(`🃏 ${CARD_MIN_LT[cardMin] ?? cardMin} korta`)
  if (exp > 0) out.push(`⭐ ${exp} XP`)
  if (passXp > 0) out.push(`🎖️ ${passXp} kelio XP`)
  return out
}

export function rewardLabel(payload: Record<string, unknown> | null | undefined): string {
  const parts = rewardParts(payload)
  return parts.length ? parts.join(' · ') : '—'
}
