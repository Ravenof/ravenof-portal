import { getServerT } from '@/lib/i18n/server'
import { CampaignMapScreen } from '@/components/digital/campaign/CampaignMapScreen'
export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('navigation.campaign')} | Ravenof Digital` }
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <CampaignMapScreen slug={slug} />
}
