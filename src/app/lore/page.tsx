import { fetchLoreAtlasData } from '@/lib/loreFetcher'
import { LoreAtlasClient }   from '@/components/lore/LoreAtlasClient'

export const revalidate = 60  // ISR: refresh every 60s
export const metadata   = { title: 'Atlasas' }

export default async function LorePage() {
  const data = await fetchLoreAtlasData()
  return <LoreAtlasClient {...data} />
}
