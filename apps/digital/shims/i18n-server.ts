// @/lib/i18n/server → kliento t() (ta pati core biblioteka, locale iš localStorage/cookie).
import { t, getLocale } from '@/lib/i18n/core'
export async function getServerT() { return (key: string, params?: Record<string, string | number>) => t(key, params) }
export async function getServerLocale() { return getLocale() }
