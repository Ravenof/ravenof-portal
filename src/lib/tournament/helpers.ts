// ── TASK 7: Tournament LT label helpers ────────────────────────────────────

export type TournamentMatchStatusDB =
  | 'pending'
  | 'active'
  | 'reported_by_one'
  | 'confirmed'
  | 'disputed'
  | 'admin_resolved'
  | 'completed'

export function formatMatchStatus(status: string): string {
  const map: Record<string, string> = {
    pending:          'Laukiama rezultato',
    active:           'Vyksta',
    reported_by_one:  'Rezultatas pateiktas',
    confirmed:        'Rezultatas patvirtintas',
    disputed:         'Ginčas dėl rezultato',
    admin_resolved:   'Patvirtinta admino',
    completed:        'Baigta',
  }
  return map[status] ?? 'Nežinoma būsena'
}

export function formatBracket(bracket: string): string {
  const map: Record<string, string> = {
    winners:     'Laimėtojų šaka',
    losers:      'Pralaimėjusiųjų šaka',
    grand_final: 'Didysis finalas',
  }
  return map[bracket] ?? bracket
}

export function matchStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending:         '#6b7280',
    active:          '#f59e0b',
    reported_by_one: '#3b82f6',
    confirmed:       '#22c55e',
    disputed:        '#ef4444',
    admin_resolved:  '#a78bfa',
    completed:       '#22c55e',
  }
  return map[status] ?? '#6b7280'
}

// TASK 8 placeholder — v3
// export async function advanceTournamentAfterConfirmedMatch(matchId: string): Promise<void> {
//   // TODO: v3 — winners advancement, losers bracket movement, final placement
//   throw new Error('Not implemented — v3')
// }
