import { getServerT } from '@/lib/i18n/server'
import { AchievementsScreen } from '@/components/digital/profile/AchievementsScreen'
export async function generateMetadata() {
  const t = await getServerT()
  return { title: `${t('profile.ach.screenTitle')} | Ravenof Digital` }
}
export default function Page() { return <AchievementsScreen /> }
