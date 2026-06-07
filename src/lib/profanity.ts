/**
 * Lengvas necenzūrinių žodžių filtras (lietuvių + anglų).
 * Naudojamas kaladžių pavadinimams. Sąrašą galima laisvai redaguoti.
 * Konservatyvus: tik aiškiai vulgarūs kamienai, kad būtų mažiau klaidingų pataikymų.
 */
const PROFANITY_STEMS: string[] = [
  // lietuvių
  'pyzd', 'pizd', 'chuj', 'bybi', 'kurv', 'kekš', 'keksi',
  'šūdas', 'sudas', 'šudin', 'pird', 'dulkin', 'dulkik',
  'subinė', 'subin', 'striptiz',
  // anglų
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy',
]

/** Grąžina true, jei tekste aptiktas necenzūrinis kamienas. */
export function containsProfanity(text: string): boolean {
  if (!text) return false
  const normalized = text.toLowerCase().replace(/[^a-ząčęėįšųūž ]/gi, '')
  return PROFANITY_STEMS.some((stem) => normalized.includes(stem))
}
