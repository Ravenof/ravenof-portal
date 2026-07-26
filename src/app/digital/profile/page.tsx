import { getServerT } from '@/lib/i18n/server'
import { ProfileOverviewScreen } from '@/components/digital/profile/ProfileOverviewScreen'
export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('profile.overview.title')} | Ravenof Digital` }
}
export default function Page() { return <ProfileOverviewScreen /> }
