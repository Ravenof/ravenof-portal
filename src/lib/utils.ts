import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGold(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) return '--'
  return String(cost)
}

export function getFactionColor(colorHex: string | null | undefined): string {
  return colorHex ?? '#9ca3af'
}

export function getRarityColor(rarityName: string | null | undefined): string {
  const colors: Record<string, string> = {
    Paprastas:  '#9ca3af',
    Magiskas:   '#22c55e',
    Unikalus:   '#3b82f6',
    Episkas:    '#a855f7',
    Legendinis: '#ef4444',
  }
  if (!rarityName) return '#9ca3af'
  const normalized = rarityName
    .replace(/š/g, 's')
    .replace(/Š/g, 'S')
    .replace(/ž/g, 'z')
    .replace(/Ž/g, 'Z')
    .replace(/č/g, 'c')
    .replace(/Č/g, 'C')
    .replace(/į/g, 'i')
    .replace(/Į/g, 'I')
    .replace(/ų/g, 'u')
    .replace(/Ų/g, 'U')
    .replace(/ą/g, 'a')
    .replace(/Ą/g, 'A')
    .replace(/ę/g, 'e')
    .replace(/Ę/g, 'E')
  return colors[normalized] ?? colors[rarityName] ?? '#9ca3af'
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
