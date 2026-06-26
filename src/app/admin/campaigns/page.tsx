import { AdminCampaignsList } from '@/components/admin/campaign/AdminCampaignsList'
export const metadata = { title: 'Kampanijos | Admin' }
export const revalidate = 0
export default function Page() { return <AdminCampaignsList /> }
