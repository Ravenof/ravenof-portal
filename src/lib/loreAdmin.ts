/**
 * Lore Atlas admin helpers
 */

/** Convert comma-separated string → trimmed string[] (ignoring blanks) */
export function parseCsvArray(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Convert string[] → comma-separated string for form inputs */
export function formatCsvArray(values: string[]): string {
  return values.join(', ')
}

/**
 * Slugify a string with Lithuanian letter support.
 * Lowercases, replaces Lithuanian chars, strips non-alphanumeric, collapses dashes.
 */
export function slugifyLt(input: string): string {
  const map: Record<string, string> = {
    ą: 'a', č: 'c', ę: 'e', ė: 'e', į: 'i', š: 's',
    ų: 'u', ū: 'u', ž: 'z',
    Ą: 'a', Č: 'c', Ę: 'e', Ė: 'e', Į: 'i', Š: 's',
    Ų: 'u', Ū: 'u', Ž: 'z',
  }
  return input
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Status badge color map reused across lore entity pages */
export const LORE_STATUS_COLORS: Record<string, string> = {
  published: '#22c55e',
  draft:     '#6b7280',
  archived:  '#a78bfa',
}
