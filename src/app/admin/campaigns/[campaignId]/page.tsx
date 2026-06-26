import { AdminCampaignEditor } from '@/components/admin/campaign/AdminCampaignEditor'
export const metadata = { title: 'Kampanijos redaktorius | Admin' }
export const revalidate = 0
export default async function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params
  return <AdminCampaignEditor campaignId={campaignId} />
}
