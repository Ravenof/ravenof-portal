import type { Metadata } from 'next'
import { RulesPageClient } from '@/components/rules/RulesPageClient'

export const metadata: Metadata = {
  title: 'Taisyklės',
  description: 'Interaktyvi Ravenof: Antrasis leidimas taisyklių knyga su paieška, kortų tipais, statusais, Damage Modifier Deck ir čempionų taisyklėmis.',
}

export default function RulesPage() {
  return <RulesPageClient />
}
