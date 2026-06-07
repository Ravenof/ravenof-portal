/**
 * Lietuviškos daiktavardžių daugiskaitos parinkimas pagal skaičių.
 * forms: [vienaskaita, daugiskaita 2–9, kilmininkas 0/10–20]
 * Pvz.: pluralLt(1, ['kaladė','kaladės','kaladžių']) -> 'kaladė'
 *       pluralLt(7, ['kaladė','kaladės','kaladžių']) -> 'kaladės'
 *       pluralLt(11,['kaladė','kaladės','kaladžių']) -> 'kaladžių'
 */
export function pluralLt(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n)
  const lastTwo = abs % 100
  const last = abs % 10
  if (last === 1 && lastTwo !== 11) return forms[0]
  if (last >= 2 && last <= 9 && !(lastTwo >= 12 && lastTwo <= 19)) return forms[1]
  return forms[2]
}
