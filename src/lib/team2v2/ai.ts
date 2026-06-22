// ── 2v2 botų AI (paprastas, naudoja TIKRĄ variklį) ──────────────────────────
// Žaidžia bet kuriam seat'ui (ally/ai/foe2) per realias playCard/attack funkcijas,
// tad ŽMK/efektai/battlecry suveikia kaip 1v1. 1v1 AI (ai/aiEngine) NEpaliestas.
// Kviesti su g.active === seat (UI taip nustato prieš veiksmą).

import {
  type GameState, type Side, type BoardUnit, type TargetRef,
  P, canAfford, playCard, attack, canUnitAttack, legalTargets, effectiveAtk,
} from '@/lib/tutorial/engine'

/** Vienas boto veiksmas duotam seat'ui. Grąžina true jei veikė; false – nieko naudingo. */
export function aiActFor(g: GameState, seat: Side): boolean {
  if (g.winner || g.active !== seat) return false
  const p = P(g, seat)

  // 1) Iškviesti įperkamą kortą (brangiausią pirma; be prakeiksmų rankoje).
  const playable = p.hand
    .filter((c) => c.type !== 'curse' && canAfford(g, seat, c))
    .sort((a, b) => b.gold - a.gold)
  for (const c of playable) {
    const r = playCard(g, seat, c.uid) // be opts → efektai auto-parenka taikinius (komandiškai)
    if (r.ok) return true
  }

  // 2) Atakuoti paruoštu kūriniu.
  const foe: Side[] = []
  for (const u of p.units) {
    if (!u) continue
    if (!canUnitAttack(g, seat, u).ok) continue
    const legal = legalTargets(g, seat, u)
    if (legal.length === 0) continue
    const target = pickAttackTarget(g, u, legal)
    if (!target) continue
    const r = attack(g, seat, u.uid, target)
    if (r.ok) return true
  }
  void foe
  return false
}

function pickAttackTarget(g: GameState, attacker: BoardUnit, legal: TargetRef[]): TargetRef | null {
  const atk = effectiveAtk(g, attacker)
  const unitTargets = legal.filter((t) => t.kind === 'unit')
  // a) nužudomas priešo kūrinys (didžiausios grėsmės)
  let bestKill: { t: TargetRef; threat: number } | null = null
  for (const t of unitTargets) {
    if (t.kind !== 'unit') continue
    const def = P(g, t.side).units.find((u) => u?.uid === t.uid)
    if (!def) continue
    if (atk >= def.hp) { const threat = def.atk + def.hp; if (!bestKill || threat > bestKill.threat) bestKill = { t, threat } }
  }
  if (bestKill) return bestKill.t
  // b) jei yra taunt (legalTargets jau riboja) – pulk pirmą leistiną kūrinį
  const face = legal.find((t) => t.kind === 'player')
  if (face) return face
  return unitTargets[0] ?? legal[0] ?? null
}
