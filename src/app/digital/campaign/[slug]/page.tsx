import { CampaignMapScreen } from '@/components/digital/campaign/CampaignMapScreen'
export const metadata = { title: 'Kampanijos žemėlapis | Ravenof Digital' }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <CampaignMapScreen slug={slug} />
}
